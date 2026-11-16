const path = require('path');
const express = require('express');

function crearApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  // Ruta de salud: sirve para comprobar que el servidor responde
  app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

  // Páginas estáticas del frontend (HTML, CSS y JavaScript)
  app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

  // Rutas de la API que no existen
  app.use('/api', (req, res) => res.status(404).json({ error: 'Recurso no encontrado.' }));

  // Manejador de errores: mensaje claro y sin detalles técnicos para el usuario
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
  });

  return app;
}

module.exports = { crearApp };