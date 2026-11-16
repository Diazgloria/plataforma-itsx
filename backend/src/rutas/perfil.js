const express = require('express');
const bcrypt = require('bcrypt');
const { requiereSesion } = require('../middleware/seguridad');
const { validarContrasena } = require('../servicios/validaciones');

const COSTO_BCRYPT = 10;

module.exports = function ({ repos }) {
  const router = express.Router();
  router.use(requiereSesion); // todo el perfil exige sesión iniciada

  // Datos del perfil del usuario que inició sesión
  router.get('/', async (req, res) => {
    const p = await repos.usuarios.obtenerPerfil(req.session.usuario.id);
    if (!p) return res.status(404).json({ error: 'Usuario no encontrado.' });
    res.json({
      perfil: {
        nombre: p.nombre, apellidos: p.apellidos, correo: p.correo_institucional,
        rol: p.rol, estado: p.estado_cuenta, matricula: p.numero_control,
        semestre: p.semestre, departamento: p.departamento, fechaRegistro: p.fecha_registro,
      },
    });
  });

  // Edición de datos personales permitidos (correo, matrícula y rol no se modifican aquí)
  router.put('/', async (req, res) => {
    const cuerpo = req.body || {};
    const nombre = String(cuerpo.nombre || '').trim();
    const apellidos = String(cuerpo.apellidos || '').trim();
    const errores = [];
    if (!nombre || nombre.length > 80) errores.push('El nombre es obligatorio (máximo 80 caracteres).');
    if (!apellidos || apellidos.length > 100) errores.push('Los apellidos son obligatorios (máximo 100 caracteres).');

    let semestre = null;
    if (req.session.usuario.rol === 'estudiante') {
      semestre = Number(cuerpo.semestre);
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 8) errores.push('Elige un semestre válido.');
    }
    if (errores.length > 0) return res.status(400).json({ error: 'Datos inválidos', detalles: errores });

    await repos.usuarios.actualizarDatosPersonales(req.session.usuario.id, { nombre, apellidos, semestre });
    // La sesión conserva los datos actualizados
    req.session.usuario.nombre = nombre;
    req.session.usuario.apellidos = apellidos;
    if (semestre) req.session.usuario.semestre = semestre;
    res.json({ mensaje: 'Datos actualizados correctamente.' });
  });

  // Cambio de contraseña: exige la contraseña actual
  router.post('/contrasena', async (req, res) => {
    const { actual, nueva } = req.body || {};
    const usuario = await repos.usuarios.buscarPorId(req.session.usuario.id);
    if (!usuario || !(await bcrypt.compare(String(actual || ''), usuario.contrasena_hash))) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta.' });
    }
    const faltantes = validarContrasena(nueva);
    if (faltantes.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: [`La contraseña debe tener: ${faltantes.join(', ')}.`] });
    }
    if (actual === nueva) {
      return res.status(400).json({ error: 'La nueva contraseña debe ser distinta a la actual.' });
    }
    await repos.usuarios.actualizarContrasena(usuario.id_usuario, await bcrypt.hash(nueva, COSTO_BCRYPT));
    res.json({ mensaje: 'Contraseña actualizada correctamente.' });
  });

  return router;
};