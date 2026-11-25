const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('estudiante'));

  function leerId(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: 'Identificador no válido.' });
      return null;
    }
    return id;
  }

  // Mis favoritos; ?materia=id filtra por materia
  router.get('/', async (req, res) => {
    let idMateria = null;
    if (req.query.materia) {
      idMateria = Number(req.query.materia);
      if (!Number.isInteger(idMateria) || idMateria < 1) return res.status(400).json({ error: 'Materia inválida.' });
    }
    res.json({ favoritos: await repos.favoritos.listar(req.session.usuario.id, idMateria) });
  });

  router.post('/:id', async (req, res) => {
    const id = leerId(req, res);
    if (!id) return;
    if (!(await repos.favoritos.materialValidado(id))) {
      return res.status(404).json({ error: 'Solo puedes marcar como favoritos los materiales validados.' });
    }
    await repos.favoritos.agregar(req.session.usuario.id, id);
    res.status(201).json({ mensaje: 'Material agregado a tus favoritos.' });
  });

  router.delete('/:id', async (req, res) => {
    const id = leerId(req, res);
    if (!id) return;
    await repos.favoritos.quitar(req.session.usuario.id, id);
    res.json({ mensaje: 'Material quitado de tus favoritos.' });
  });

  return router;
};
