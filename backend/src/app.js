const path = require('path');
const express = require('express');
const { montarRutas } = require('./rutas');
const session = require('express-session');
const { csrf } = require('./middleware/seguridad');
const { crearAuditoria } = require('./middleware/auditoria');

function crearApp({ config, repos, correo }) {
  const app = express();
  app.use(express.json());
    // Sesión en memoria (suficiente para desarrollo); cookie httpOnly que se renueva con la actividad
  app.use(session({
    name: 'sid',
    secret: config.secreto,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.entorno === 'production',
      maxAge: config.sesion.inactividadMs,
    },
  }));
  app.use('/api', csrf);
  app.use('/api', crearAuditoria(repos)); // bitácora de auditoría (PT-21)

  app.get('/api/salud', (req, res) => res.json({ estado: 'ok' }));

  montarRutas(app, { config, repos, correo });

  app.use(express.static(path.join(__dirname, '../../frontend')));

  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

  // Manejo general de errores: nunca se muestra el detalle interno al cliente
  app.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(config.tamanoMaximoBytes / (1024 * 1024));
      return res.status(413).json({ error: `El archivo supera el tamaño máximo de ${mb} MB.` });
    }
    const estado = err.status || 500;
    if (estado === 500) console.error(err);
    res.status(estado).json({ error: estado === 500 ? 'Error interno del servidor' : 'Solicitud inválida' });
  });

  return app;
}

module.exports = { crearApp };