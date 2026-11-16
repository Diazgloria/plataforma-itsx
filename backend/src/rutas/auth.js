const express = require('express');
const bcrypt = require('bcrypt');
const { validarRegistro } = require('../servicios/validaciones');
const { crearToken } = require('../servicios/tokens');

const COSTO_BCRYPT = 10;

module.exports = function ({ config, repos, correo }) {
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
            // RF-AUT-03: enlace de verificación con vigencia de 24 horas
      const token = crearToken({
        proposito: 'verificacion',
        idUsuario,
        vigenciaMs: config.vigenciaVerificacionMs,
        secreto: config.secreto,
      });
      const enlace = `http://localhost:${config.puerto}/verificar.html?token=${encodeURIComponent(token)}`;
      await correo.enviar({
        para: datos.correo,
        asunto: 'Verifica tu cuenta en la Plataforma ITSX',
        texto: `Hola ${datos.nombre}, activa tu cuenta (vigencia de 24 horas) en: ${enlace}`,
      });

      const respuesta = {
        mensaje: 'Cuenta creada. Revisa tu correo institucional para activarla.',
        idUsuario,
      };
      // Solo en desarrollo se devuelve el enlace, porque el correo es simulado
      if (config.entorno !== 'production') respuesta.enlaceVerificacion = enlace;
      return res.status(201).json(respuesta);

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