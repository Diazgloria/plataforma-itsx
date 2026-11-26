// Reglas de los datos de una materia del catálogo (PT-18).
function validarMateria(cuerpo = {}) {
  const datos = {
    clave: String(cuerpo.clave || '').trim().toUpperCase(),
    nombre: String(cuerpo.nombre || '').trim(),
    semestre: Number(cuerpo.semestre),
    descripcion: String(cuerpo.descripcion || '').trim(),
  };
  const errores = [];
  if (!/^[A-Z0-9-]{3,15}$/.test(datos.clave)) errores.push('La clave debe tener de 3 a 15 letras, números o guiones.');
  if (!datos.nombre) errores.push('El nombre de la materia es obligatorio.');
  if (datos.nombre.length > 120) errores.push('El nombre no puede tener más de 120 caracteres.');
  if (!Number.isInteger(datos.semestre) || datos.semestre < 1 || datos.semestre > 8) {
    errores.push('El semestre debe ser un número del 1 al 8.');
  }
  if (datos.descripcion.length > 300) errores.push('La descripción no puede tener más de 300 caracteres.');
  return { errores, datos };
}

module.exports = { validarMateria };
