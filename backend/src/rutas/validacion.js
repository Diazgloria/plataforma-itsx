//archivo validacion.js en rutas 
const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');
const { generarCodigo, validarDecision } = require('../servicios/validacionDocente');

module.exports = function ({ repos }) {
  const router = Router();

  // Todas las rutas de este módulo son solo para docentes
  router.use(requiereRol('docente'));

  // Cola de materiales pendientes de las materias que imparte el docente
  router.get('/pendientes', async (req, res) => {
    const materiales = await repos.validaciones.listarPendientes(req.session.usuario.id);
    res.json({ materiales });
  });

  // Detalle de un material pendiente
  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador no válido.' });

    const material = await repos.validaciones.obtenerPendiente(id, req.session.usuario.id);
    if (!material) return res.status(404).json({ error: 'El material no está pendiente o no pertenece a tus materias.' });
    res.json({ material });
  });

  // Aprobar o rechazar
  router.post('/:id/decision', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador no válido.' });

    const { errores, datos } = validarDecision(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });

    const resultado = await repos.validaciones.registrarDecision({
      idMaterial: id,
      idDocente: req.session.usuario.id,
      decision: datos.decision,
      comentario: datos.comentario,
      generarCodigo,
    });
    if (!resultado) return res.status(404).json({ error: 'El material no está pendiente o no pertenece a tus materias.' });

    res.json({
      mensaje: datos.decision === 'aprobado' ? 'Material validado.' : 'Material rechazado.',
      codigo: resultado.codigo,
    });
  });

  return router;
};