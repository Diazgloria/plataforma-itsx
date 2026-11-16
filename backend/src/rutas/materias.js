const express = require('express');
const { requiereSesion, requiereRol } = require('../middleware/seguridad');

module.exports = function ({ repos }) {
  const router = express.Router();
  router.use(requiereSesion); // el catálogo solo se consulta con sesión iniciada

  // Materias del semestre del estudiante que inició sesión
  router.get('/mias', requiereRol('estudiante'), async (req, res) => {
    const semestre = req.session.usuario.semestre;
    if (!semestre) return res.status(400).json({ error: 'Tu cuenta no tiene semestre registrado.' });
    res.json({ materias: await repos.materias.listar(semestre) });
  });

  // Todas las materias, o las de un semestre con ?semestre=N
  router.get('/', async (req, res) => {
    let semestre = null;
    if (req.query.semestre !== undefined) {
      semestre = Number(req.query.semestre);
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 8) {
        return res.status(400).json({ error: 'Semestre inválido.' });
      }
    }
    res.json({ materias: await repos.materias.listar(semestre) });
  });

  return router;
};