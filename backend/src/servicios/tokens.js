const crypto = require('crypto');

function firmar(texto, secreto) {
  return crypto.createHmac('sha256', secreto).update(texto).digest('base64url');
}

// Token con formato: proposito.idUsuario.vencimiento.extra.firma  (extra es opcional)
function crearToken({ proposito, idUsuario, vigenciaMs, secreto, extra = '', ahora = Date.now() }) {
  const carga = `${proposito}.${idUsuario}.${ahora + vigenciaMs}.${extra}`;
  return `${carga}.${firmar(carga, secreto)}`;
}

function verificarToken(token, secreto, proposito, ahora = Date.now()) {
  if (typeof token !== 'string') return { valido: false, motivo: 'formato' };
  const partes = token.split('.');
  if (partes.length !== 5) return { valido: false, motivo: 'formato' };

  const [propositoToken, id, vencimiento, extra, firma] = partes;
  const esperada = firmar(`${propositoToken}.${id}.${vencimiento}.${extra}`, secreto);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  // Comparación en tiempo constante para no filtrar información de la firma
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valido: false, motivo: 'firma' };
  if (propositoToken !== proposito) return { valido: false, motivo: 'proposito' };
  if (Number(vencimiento) < ahora) return { valido: false, motivo: 'expirado' };

  return { valido: true, idUsuario: Number(id), extra };
}

// Huella corta del hash de la contraseña: hace que el enlace de recuperación sirva una sola vez
function huellaContrasena(hash) {
  return crypto.createHash('sha256').update(hash).digest('hex').slice(0, 16);
}

module.exports = { crearToken, verificarToken, huellaContrasena };