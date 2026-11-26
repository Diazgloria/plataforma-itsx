const { Router } = require('express');
const bcrypt = require('bcrypt');
const { requiereRol } = require('../middleware/seguridad');
const { ROLES, validarAlta, validarEdicion, normalizarIds } = require('../servicios/cuentas');
const { cerrarSesionesDe } = require('../servicios/sesiones');

const COSTO_BCRYPT = 10;

module.exports = function ({ config, repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-26 y CU-27: solo el administrador gestiona cuentas

  const idDe = (req) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  };
  const esUnoMismo = (req, id) => req.session.usuario.id === id;

  // Cuentas por rol: ?rol=estudiante|docente|administrador&q=texto
  router.get('/', async (req, res) => {
    const rol = String(req.query.rol || 'estudiante');
    if (!ROLES.includes(rol)) return res.status(400).json({ error: 'Rol inválido.' });
    const texto = String(req.query.q || '').trim().slice(0, 80);
    res.json({ cuentas: await repos.cuentas.listar({ rol, texto }) });
  });

  // Registrar un docente o administrador
  router.post('/', async (req, res) => {
    const { errores, datos } = validarAlta(req.body, config.dominioCorreo);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    if (await repos.usuarios.buscarPorCorreo(datos.correo)) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }
    const hash = await bcrypt.hash(datos.contrasena, COSTO_BCRYPT);
    try {
      const id = await repos.cuentas.crear({ ...datos, hash });
      res.status(201).json({ mensaje: 'Cuenta registrada. Entrega la contraseña temporal a la persona usuaria.', id });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
      throw err;
    }
  });

  // Editar nombre, apellidos y departamento
  router.put('/:id', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    const cuenta = await repos.cuentas.obtener(id);
    if (!cuenta) return res.status(404).json({ error: 'La cuenta no existe.' });

    const { errores, datos } = validarEdicion(req.body, cuenta.rol);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    await repos.cuentas.actualizar(id, { ...datos, departamento: cuenta.rol === 'docente' ? datos.departamento : null });
    res.json({ mensaje: 'Datos actualizados.' });
  });

  // Suspender (activa → suspendida) o reactivar (suspendida → activa)
  router.post('/:id/estado', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    const estado = (req.body || {}).estado;
    if (!['activa', 'suspendida'].includes(estado)) {
      return res.status(400).json({ error: 'El estado debe ser "activa" o "suspendida".' });
    }
    if (esUnoMismo(req, id)) return res.status(400).json({ error: 'No puedes suspender tu propia cuenta.' });

    const cuenta = await repos.cuentas.obtener(id);
    if (!cuenta) return res.status(404).json({ error: 'La cuenta no existe.' });
    const origen = estado === 'suspendida' ? 'activa' : 'suspendida';
    if (cuenta.estado !== origen) {
      return res.status(409).json({
        error: estado === 'suspendida'
          ? 'Solo se puede suspender una cuenta activa.'
          : 'Solo se puede reactivar una cuenta suspendida.',
      });
    }
    await repos.cuentas.cambiarEstado(id, estado);
    if (estado === 'suspendida') await cerrarSesionesDe(req, id); // pierde el acceso de inmediato
    res.json({ mensaje: estado === 'suspendida' ? 'Cuenta suspendida.' : 'Cuenta reactivada.' });
  });

  // Materias asignadas a un docente
  router.get('/:id/materias', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    const cuenta = await repos.cuentas.obtener(id);
    if (!cuenta) return res.status(404).json({ error: 'La cuenta no existe.' });
    if (cuenta.rol !== 'docente') return res.status(409).json({ error: 'Solo los docentes tienen materias asignadas.' });
    res.json({ materias: await repos.cuentas.materiasDe(id) });
  });

  router.put('/:id/materias', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    const cuenta = await repos.cuentas.obtener(id);
    if (!cuenta) return res.status(404).json({ error: 'La cuenta no existe.' });
    if (cuenta.rol !== 'docente') return res.status(409).json({ error: 'Solo se pueden asignar materias a docentes.' });

    const ids = normalizarIds((req.body || {}).materias);
    if (!ids) return res.status(400).json({ error: 'La lista de materias no es válida.' });
    const asignadas = await repos.cuentas.asignarMaterias(id, ids);
    res.json({ mensaje: 'Materias asignadas actualizadas.', asignadas });
  });

  // Eliminar: solo cuentas sin materiales, validaciones ni descargas (si no, conviene suspenderlas)
  router.delete('/:id', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (esUnoMismo(req, id)) return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta.' });
    if (!(await repos.cuentas.obtener(id))) return res.status(404).json({ error: 'La cuenta no existe.' });

    const resultado = await repos.cuentas.eliminar(id);
    if (resultado === 'en_uso') {
      return res.status(409).json({
        error: 'No se puede eliminar: la cuenta tiene materiales, validaciones o descargas. Suspéndela en su lugar.',
      });
    }
    await cerrarSesionesDe(req, id);
    res.json({ mensaje: 'Cuenta eliminada.' });
  });

  return router;
};
