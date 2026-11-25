const { Router } = require('express');
const { requiereSesion } = require('../middleware/seguridad');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereSesion); // cada usuario ve solo sus avisos

  // Lista de avisos; ?filtro=no_leidas muestra solo los pendientes de leer
  router.get('/', async (req, res) => {
    const soloNoLeidas = req.query.filtro === 'no_leidas';
    const notificaciones = await repos.notificaciones.listar(req.session.usuario.id, soloNoLeidas);
    res.json({ notificaciones });
  });

  // Número de avisos sin leer (lo usa la campana del encabezado)
  router.get('/contador', async (req, res) => {
    res.json({ total: await repos.notificaciones.contarNoLeidas(req.session.usuario.id) });
  });

  router.post('/leer-todas', async (req, res) => {
    await repos.notificaciones.marcarTodasLeidas(req.session.usuario.id);
    res.json({ mensaje: 'Todas las notificaciones se marcaron como leídas.' });
  });

  router.post('/:id/leer', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador no válido.' });
    await repos.notificaciones.marcarLeida(req.session.usuario.id, id);
    res.json({ mensaje: 'Notificación leída.' });
  });

  return router;
};
