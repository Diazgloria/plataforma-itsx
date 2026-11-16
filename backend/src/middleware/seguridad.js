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
// Exige una sesión iniciada
function requiereSesion(req, res, next) {
  if (!req.session.usuario) return res.status(401).json({ error: 'Debes iniciar sesión.' });
  next();
}

// Exige una sesión iniciada con alguno de los roles indicados (RF-AUT-07)
function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'Debes iniciar sesión.' });
    if (!roles.includes(req.session.usuario.rol)) {
      return res.status(403).json({ error: 'No tienes permiso para realizar esta acción.' });
    }
    next();
  };
}
module.exports = { csrf, obtenerTokenCsrf, requiereSesion, requiereRol };