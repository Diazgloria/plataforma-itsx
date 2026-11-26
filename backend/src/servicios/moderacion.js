// Reglas de la moderación de contenidos (PT-16): qué acción se permite según el estado del material.
const ESTADOS = ['pendiente_validacion', 'validado', 'rechazado', 'suspendido', 'retirado', 'eliminado'];

const ACCIONES = {
  aprobar:   { ok: 'Material aprobado y validado. Se emitió su código.', desde: ['pendiente_validacion'], hacia: 'validado', motivo: false, tipo: 'material_validado' },
  rechazar:  { ok: 'Material rechazado.', desde: ['pendiente_validacion'], hacia: 'rechazado', motivo: true, tipo: 'material_rechazado' },
  suspender: { ok: 'Material suspendido.', desde: ['validado'], hacia: 'suspendido', motivo: true, tipo: 'material_suspendido' },
  reactivar: { ok: 'Material reactivado.', desde: ['suspendido'], hacia: 'validado', motivo: false, tipo: 'material_reactivado' },
  retirar:   { ok: 'Material retirado.', desde: ['validado', 'suspendido'], hacia: 'retirado', motivo: true, tipo: 'material_retirado' },
  eliminar:  { ok: 'Material eliminado.', desde: ['pendiente_validacion', 'validado', 'rechazado', 'suspendido', 'retirado'], hacia: 'eliminado', motivo: true, tipo: 'material_eliminado' },
};

function validarAccion(cuerpo = {}) {
  const errores = [];
  const accion = String(cuerpo.accion || '');
  const motivo = String(cuerpo.motivo || '').trim();
  if (!ACCIONES[accion]) errores.push('La acción no es válida.');
  else if (ACCIONES[accion].motivo && !motivo) errores.push('Escribe el motivo de esta acción.');
  if (motivo.length > 200) errores.push('El motivo no puede tener más de 200 caracteres.');
  return { errores, datos: { accion, motivo } };
}

function puedeAplicar(accion, estado) {
  return Boolean(ACCIONES[accion] && ACCIONES[accion].desde.includes(estado));
}

// Texto del aviso que recibe el autor del material
function mensajeAutor(accion, titulo, motivo) {
  const base = {
    aprobar: `Tu material "${titulo}" fue validado por la administración.`,
    rechazar: `Tu material "${titulo}" fue rechazado por la administración.`,
    suspender: `Tu material "${titulo}" fue suspendido temporalmente por la administración.`,
    reactivar: `Tu material "${titulo}" fue reactivado y vuelve a estar disponible.`,
    retirar: `Tu material "${titulo}" fue retirado de la plataforma por la administración.`,
    eliminar: `Tu material "${titulo}" fue eliminado por la administración.`,
  }[accion];
  const texto = motivo ? `${base} Motivo: ${motivo}` : base;
  return texto.length > 300 ? texto.slice(0, 297) + '...' : texto;
}

module.exports = { ESTADOS, ACCIONES, validarAccion, puedeAplicar, mensajeAutor };
