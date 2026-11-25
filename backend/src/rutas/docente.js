const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('docente'));

  // Materias asignadas al docente; ?semestre=N filtra por semestre
  router.get('/materias', async (req, res) => {
    let semestre = null;
    if (req.query.semestre) {
      semestre = Number(req.query.semestre);
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 8) {
        return res.status(400).json({ error: 'Semestre inválido.' });
      }
    }
    res.json({ materias: await repos.docentes.materiasAsignadas(req.session.usuario.id, semestre) });
  });

  return router;
};
