const express = require('express');
const bcrypt = require('bcrypt');
const { validarRegistro } = require('../servicios/validaciones');

const COSTO_BCRYPT = 10;

module.exports = function ({ config, repos }) {
  const router = express.Router();

  // RF-AUT-01: registro de estudiantes con correo institucional
  router.post('/registro', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body, config.dominioCorreo);
    if (errores.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    if ((await repos.usuarios.buscarPorCorreo(datos.correo)) ||
        (await repos.usuarios.existeNumeroControl(datos.numeroControl))) {
      return res.status(409).json({ error: 'El correo o el número de control ya están registrados' });
    }

    // La contraseña nunca se guarda en texto claro (RNF-SEG-01)
    const hash = await bcrypt.hash(datos.contrasena, COSTO_BCRYPT);
    try {
      const idUsuario = await repos.usuarios.crearEstudiante({
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        correo: datos.correo,
        hash,
        numeroControl: datos.numeroControl,
        semestre: datos.semestre,
      });
      return res.status(201).json({
        mensaje: 'Cuenta creada. Falta verificar el correo para activarla.',
        idUsuario,
      });
    } catch (err) {
      // Dos registros simultáneos con los mismos datos
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El correo o el número de control ya están registrados' });
      }
      throw err;
    }
  });

  return router;
};