// Reglas para dar de alta o editar cuentas desde la gestión de usuarios (PT-17).
const { validarContrasena } = require('./validaciones');

const ROLES = ['estudiante', 'docente', 'administrador'];
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const limpiar = (v) => (typeof v === 'string' ? v.trim() : '');

function validarNombre(datos, errores) {
  if (!datos.nombre) errores.push('El nombre es obligatorio.');
  if (datos.nombre.length > 80) errores.push('El nombre no puede tener más de 80 caracteres.');
  if (!datos.apellidos) errores.push('Los apellidos son obligatorios.');
  if (datos.apellidos.length > 100) errores.push('Los apellidos no pueden tener más de 100 caracteres.');
}

// Alta de un docente o administrador (los estudiantes se registran solos)
function validarAlta(cuerpo = {}, dominio) {
  const errores = [];
  const datos = {
    rol: limpiar(cuerpo.rol),
    nombre: limpiar(cuerpo.nombre),
    apellidos: limpiar(cuerpo.apellidos),
    correo: limpiar(cuerpo.correo).toLowerCase(),
    departamento: limpiar(cuerpo.departamento),
    contrasena: typeof cuerpo.contrasena === 'string' ? cuerpo.contrasena : '',
  };
  if (!['docente', 'administrador'].includes(datos.rol)) {
    errores.push('Solo se pueden registrar docentes o administradores.');
  }
  validarNombre(datos, errores);
  if (!REGEX_CORREO.test(datos.correo)) {
    errores.push('Escribe un correo electrónico válido.');
  } else if (!datos.correo.endsWith('@' + dominio)) {
    errores.push(`El correo debe ser institucional (termina en @${dominio}).`);
  }
  if (datos.rol === 'docente' && !datos.departamento) errores.push('El departamento es obligatorio para un docente.');
  if (datos.departamento.length > 80) errores.push('El departamento no puede tener más de 80 caracteres.');
  const faltantes = validarContrasena(datos.contrasena);
  if (faltantes.length) errores.push('La contraseña temporal debe tener: ' + faltantes.join(', ') + '.');
  return { errores, datos };
}

// Edición de nombre, apellidos y (en docentes) departamento
function validarEdicion(cuerpo = {}, rol) {
  const errores = [];
  const datos = {
    nombre: limpiar(cuerpo.nombre),
    apellidos: limpiar(cuerpo.apellidos),
    departamento: limpiar(cuerpo.departamento),
  };
  validarNombre(datos, errores);
  if (rol === 'docente' && !datos.departamento) errores.push('El departamento es obligatorio para un docente.');
  if (datos.departamento.length > 80) errores.push('El departamento no puede tener más de 80 caracteres.');
  return { errores, datos };
}

// Convierte la lista recibida en ids enteros únicos; devuelve null si algún valor no es válido
function normalizarIds(lista) {
  if (!Array.isArray(lista)) return null;
  const ids = lista.map(Number);
  if (ids.some((n) => !Number.isInteger(n) || n < 1)) return null;
  return [...new Set(ids)];
}

module.exports = { ROLES, validarAlta, validarEdicion, normalizarIds };
