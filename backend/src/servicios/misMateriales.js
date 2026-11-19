// Reglas del estudiante sobre sus propios materiales.
const ESTADOS_EDITABLES = ['pendiente_validacion', 'rechazado'];
const ESTADOS_ELIMINABLES = ['pendiente_validacion', 'rechazado', 'validado'];

function puedeEditar(estado) {
  return ESTADOS_EDITABLES.includes(estado);
}

function puedeEliminar(estado) {
  return ESTADOS_ELIMINABLES.includes(estado);
}

// Valida los datos que el estudiante puede modificar de su material
function validarEdicion(cuerpo = {}) {
  const errores = [];
  const titulo = String(cuerpo.titulo || '').trim();
  const descripcion = String(cuerpo.descripcion || '').trim();
  const palabrasClave = String(cuerpo.palabrasClave || '').trim();

  if (!titulo) errores.push('El título es obligatorio.');
  if (titulo.length > 150) errores.push('El título no puede tener más de 150 caracteres.');
  if (descripcion.length > 500) errores.push('La descripción no puede tener más de 500 caracteres.');
  if (palabrasClave.length > 200) errores.push('Las palabras clave no pueden tener más de 200 caracteres.');

  return {
    errores,
    datos: { titulo, descripcion: descripcion || null, palabrasClave: palabrasClave || null },
  };
}

module.exports = { puedeEditar, puedeEliminar, validarEdicion };