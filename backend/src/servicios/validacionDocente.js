const crypto = require('crypto');

// Sin I, O, 0 ni 1 para que el código no se preste a confusiones al leerlo
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DECISIONES = ['aprobado', 'rechazado'];

function bloque(longitud, aleatorio) {
  let texto = '';
  for (let i = 0; i < longitud; i++) texto += ALFABETO[aleatorio(ALFABETO.length)];
  return texto;
}

// Código de validación con formato ITSX-XXXX-XXXX-NN (17 caracteres).
// NN es el número de versión del material; "aleatorio" se puede sustituir en las pruebas.
function generarCodigo(numeroVersion = 1, aleatorio = (n) => crypto.randomInt(n)) {
  const nn = String(numeroVersion % 100).padStart(2, '0');
  return `ITSX-${bloque(4, aleatorio)}-${bloque(4, aleatorio)}-${nn}`;
}

// Regla de la decisión del docente: rechazar exige comentario (RD-07)
function validarDecision(cuerpo = {}) {
  const errores = [];
  const decision = String(cuerpo.decision || '');
  const comentario = String(cuerpo.comentario || '').trim();

  if (!DECISIONES.includes(decision)) errores.push('La decisión debe ser "aprobado" o "rechazado".');
  if (decision === 'rechazado' && !comentario) errores.push('Para rechazar un material debes escribir un comentario.');
  if (comentario.length > 500) errores.push('El comentario no puede tener más de 500 caracteres.');

  return { errores, datos: { decision, comentario } };
}

module.exports = { generarCodigo, validarDecision };