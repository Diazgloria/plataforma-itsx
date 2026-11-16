const express = require('express');
const { requiereRol } = require('../middleware/seguridad');

module.exports = function ({ repos }) {
  const router = express.Router();

  // Todas las rutas de este archivo son solo para administradores (RF-AUT-07)
  router.use(requiereRol('administrador'));

  router.get('/resumen', async (req, res) => {
    const usuariosPorRol = await repos.usuarios.contarPorRol();
    res.json({ usuariosPorRol });
  });

  return router;
};