const crypto = require('crypto');

// Devuelve el token CSRF de la sesión; lo crea si todavía no existe
function obtenerTokenCsrf(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  return req.session.csrf;
}

// RNF-SEG-06: toda petición que modifica datos debe traer el token en la cabecera x-csrf-token
function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const enviado = req.get('x-csrf-token');
  if (!enviado || !req.session.csrf || enviado !== req.session.csrf) {
    return res.status(403).json({ error: 'Petición no autorizada (token CSRF inválido)' });
  }
  next();
}

module.exports = { csrf, obtenerTokenCsrf };