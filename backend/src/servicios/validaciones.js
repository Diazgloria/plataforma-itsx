// Validaciones de los datos de registro (RF-AUT-01 a RF-AUT-04).

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// RF-AUT-04: mínimo 8 caracteres, con mayúscula, minúscula y número.
function validarContrasena(contrasena) {
  const faltantes = [];
  if (typeof contrasena !== 'string' || contrasena.length < 8) faltantes.push('mínimo 8 caracteres');
  if (!/[A-ZÁÉÍÓÚÑ]/.test(contrasena || '')) faltantes.push('al menos una mayúscula');
  if (!/[a-záéíóúñ]/.test(contrasena || '')) faltantes.push('al menos una minúscula');
  if (!/[0-9]/.test(contrasena || '')) faltantes.push('al menos un número');
  return faltantes;
}

function limpiar(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Devuelve { errores: [...], datos: {...} }
function validarRegistro(body, dominioPermitido) {
  const errores = [];
  const datos = {
    nombre: limpiar(body.nombre),
    apellidos: limpiar(body.apellidos),
    correo: limpiar(body.correo).toLowerCase(),
    numeroControl: limpiar(body.numeroControl).toUpperCase(),
    semestre: Number(body.semestre),
    contrasena: typeof body.contrasena === 'string' ? body.contrasena : '',
  };

  if (!datos.nombre) errores.push('El nombre es obligatorio.');
  if (datos.nombre.length > 80) errores.push('El nombre no puede tener más de 80 caracteres.');
  if (!datos.apellidos) errores.push('Los apellidos son obligatorios.');
  if (datos.apellidos.length > 100) errores.push('Los apellidos no pueden tener más de 100 caracteres.');

  if (!REGEX_CORREO.test(datos.correo)) {
    errores.push('Escribe un correo electrónico válido.');
  } else if (!datos.correo.endsWith('@' + dominioPermitido)) {
    // RF-AUT-02: solo correos del dominio institucional
    errores.push(`El correo debe ser institucional (termina en @${dominioPermitido}).`);
  }

  if (!/^[A-Z0-9]{5,20}$/.test(datos.numeroControl)) {
    errores.push('El número de control debe tener entre 5 y 20 letras o números.');
  }

  if (!Number.isInteger(datos.semestre) || datos.semestre < 1 || datos.semestre > 12) {
    errores.push('El semestre debe ser un número entre 1 y 12.');
  }

  const faltantes = validarContrasena(datos.contrasena);
  if (faltantes.length) errores.push('La contraseña debe tener: ' + faltantes.join(', ') + '.');

  return { errores, datos };
}

module.exports = { validarRegistro, validarContrasena };