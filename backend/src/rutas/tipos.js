const { Router } = require('express');
const { requiereSesion, requiereRol } = require('../middleware/seguridad');
const { validarTipo } = require('../servicios/tipos');

module.exports = function ({ repos }) {
  const router = Router();
  const soloAdmin = requiereRol('administrador'); // CU-08
  const idDe = (req) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  };
  const nombreRepetido = (res) => res.status(409).json({ error: 'Ya existe un tipo de material con ese nombre.' });

  // Tipos activos, para el selector de quien sube un material y el filtro del catálogo
  router.get('/', requiereSesion, async (req, res) => {
    res.json({ tipos: await repos.tipos.listarActivos() });
  });

  // Todos los tipos con su número de materiales (solo administrador)
  router.get('/admin', soloAdmin, async (req, res) => {
    res.json({ tipos: await repos.tipos.listarTodos() });
  });

  router.post('/', soloAdmin, async (req, res) => {
    const { errores, datos } = validarTipo(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    try {
      const id = await repos.tipos.crear(datos.nombre);
      res.status(201).json({ mensaje: 'Tipo de material guardado.', id });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return nombreRepetido(res);
      throw err;
    }
  });

  router.put('/:id', soloAdmin, async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (!(await repos.tipos.obtener(id))) return res.status(404).json({ error: 'El tipo de material no existe.' });

    const { errores, datos } = validarTipo(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    try {
      await repos.tipos.renombrar(id, datos.nombre);
      res.json({ mensaje: 'Tipo de material guardado.' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return nombreRepetido(res);
      throw err;
    }
  });

  // Desactivar o activar: un tipo inactivo ya no se ofrece al subir material, pero conserva los materiales que ya lo usan
  router.post('/:id/estado', soloAdmin, async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (typeof (req.body || {}).activo !== 'boolean') {
      return res.status(400).json({ error: 'Indica si el tipo queda activo (true) o inactivo (false).' });
    }
    if (!(await repos.tipos.obtener(id))) return res.status(404).json({ error: 'El tipo de material no existe.' });
    await repos.tipos.cambiarActivo(id, req.body.activo);
    res.json({ mensaje: req.body.activo ? 'Tipo activado.' : 'Tipo desactivado.' });
  });

  return router;
};
