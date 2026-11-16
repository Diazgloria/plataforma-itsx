const crypto = require('crypto');

function firmar(texto, secreto) {
  return crypto.createHmac('sha256', secreto).update(texto).digest('base64url');
}

// Token con formato: proposito.idUsuario.vencimiento.firma
function crearToken({ proposito, idUsuario, vigenciaMs, secreto, ahora = Date.now() }) {
  const carga = `${proposito}.${idUsuario}.${ahora + vigenciaMs}`;
  return `${carga}.${firmar(carga, secreto)}`;
}

function verificarToken(token, secreto, proposito, ahora = Date.now()) {
  if (typeof token !== 'string') return { valido: false, motivo: 'formato' };
  const partes = token.split('.');
  if (partes.length !== 4) return { valido: false, motivo: 'formato' };

  const [propositoToken, id, vencimiento, firma] = partes;
  const esperada = firmar(`${propositoToken}.${id}.${vencimiento}`, secreto);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  // Comparación en tiempo constante para no filtrar información de la firma
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valido: false, motivo: 'firma' };
  if (propositoToken !== proposito) return { valido: false, motivo: 'proposito' };
  if (Number(vencimiento) < ahora) return { valido: false, motivo: 'expirado' };

  return { valido: true, idUsuario: Number(id) };
}

module.exports = { crearToken, verificarToken };