const path = require('path');
const express = require('express');
const { montarRutas } = require('./rutas');

function crearApp({ config, repos, correo }) {
  const app = express();
  app.use(express.json());

  app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

  montarRutas(app, { config, repos, correo });

  app.use(express.static(path.join(__dirname, '../../frontend')));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejo general de errores: nunca se muestra el detalle interno al cliente
  app.use((err, req, res, next) => {
    const estado = err.status || 500;
    if (estado === 500) console.error(err);
    res.status(estado).json({ error: estado === 500 ? 'Error interno del servidor' : 'Solicitud inválida' });
  });

  return app;
}

module.exports = { crearApp };