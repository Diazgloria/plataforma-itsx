const { validarRegistro, validarContrasena } = require('../src/servicios/validaciones');

describe('validarContrasena', () => {
  test('acepta una contraseña que cumple la política', () => {
    expect(validarContrasena('Prueba123*')).toEqual([]);
  });

  test('indica los requisitos que faltan', () => {
    const faltantes = validarContrasena('abc');
    expect(faltantes).toContain('mínimo 8 caracteres');
    expect(faltantes).toContain('al menos una mayúscula');
    expect(faltantes).toContain('al menos un número');
  });
});

describe('validarRegistro', () => {
  const valido = {
    nombre: 'Gloria', apellidos: 'Domínguez Díaz', correo: 'Gloria@ITSX.edu.mx',
    numeroControl: '227o02597', semestre: 1, contrasena: 'Prueba123*',
  };

  test('limpia y normaliza los datos válidos', () => {
    const { errores, datos } = validarRegistro(valido, 'itsx.edu.mx');
    expect(errores).toEqual([]);
    expect(datos.correo).toBe('gloria@itsx.edu.mx');
    expect(datos.numeroControl).toBe('227O02597');
  });

  test('rechaza un correo que no es institucional', () => {
    const { errores } = validarRegistro({ ...valido, correo: 'gloria@gmail.com' }, 'itsx.edu.mx');
    expect(errores.join(' ')).toMatch(/institucional/);
  });

  test('rechaza un semestre fuera de rango', () => {
    const { errores } = validarRegistro({ ...valido, semestre: 40 }, 'itsx.edu.mx');
    expect(errores.join(' ')).toMatch(/semestre/i);
  });
});