// Regla del nombre de un tipo de material (PT-19).
function validarTipo(cuerpo = {}) {
  const nombre = String(cuerpo.nombre || '').replace(/\s+/g, ' ').trim();
  const errores = [];
  if (!nombre) errores.push('El nombre del tipo es obligatorio.');
  if (nombre.length > 60) errores.push('El nombre no puede tener más de 60 caracteres.');
  return { errores, datos: { nombre } };
}

module.exports = { validarTipo };
