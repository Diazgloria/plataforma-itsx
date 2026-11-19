const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');
const { puedeEditar, puedeEliminar, validarEdicion } = require('../servicios/misMateriales');

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

  // Listar mis materiales
  router.get('/', async (req, res) => {
    const filas = await repos.misMateriales.listarDelAutor(req.session.usuario.id);
    const materiales = filas.map((m) => ({
      ...m,
      puede_editar: puedeEditar(m.estado),
      puede_eliminar: puedeEliminar(m.estado),
    }));
    res.json({ materiales });
  });

  // Editar título, descripción y palabras clave
  router.put('/:id', async (req, res) => {
    const id = leerId(req, res);
    if (!id) return;

    const material = await repos.misMateriales.obtenerDelAutor(id, req.session.usuario.id);
    if (!material) return res.status(404).json({ error: 'El material no existe o no es tuyo.' });
    if (!puedeEditar(material.estado)) {
      return res.status(409).json({ error: 'Solo puedes editar materiales pendientes o rechazados.' });
    }

    const { errores, datos } = validarEdicion(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });

    await repos.misMateriales.actualizarDatos({ idMaterial: id, idAutor: req.session.usuario.id, ...datos });
    res.json({ mensaje: 'Material actualizado.' });
  });

  // Eliminación lógica
  router.delete('/:id', async (req, res) => {
    const id = leerId(req, res);
    if (!id) return;

    const material = await repos.misMateriales.obtenerDelAutor(id, req.session.usuario.id);
    if (!material) return res.status(404).json({ error: 'El material no existe o no es tuyo.' });
    if (!puedeEliminar(material.estado)) {
      return res.status(409).json({ error: 'Este material no se puede eliminar en su estado actual.' });
    }

    await repos.misMateriales.eliminarLogico(id, req.session.usuario.id);
    res.json({ mensaje: 'Material eliminado.' });
  });

  return router;
};