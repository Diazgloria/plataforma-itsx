const { puedeEditar, puedeEliminar, validarEdicion } = require('../src/servicios/misMateriales');

describe('puedeEditar', () => {
  test.each([
    ['pendiente_validacion', true],
    ['rechazado', true],
    ['validado', false],
    ['suspendido', false],
    ['retirado', false],
    ['eliminado', false],
  ])('estado %s -> %s', (estado, esperado) => {
    expect(puedeEditar(estado)).toBe(esperado);
  });
});

describe('puedeEliminar', () => {
  test.each([
    ['pendiente_validacion', true],
    ['rechazado', true],
    ['validado', true],
    ['suspendido', false],
    ['retirado', false],
    ['eliminado', false],
  ])('estado %s -> %s', (estado, esperado) => {
    expect(puedeEliminar(estado)).toBe(esperado);
  });
});

describe('validarEdicion', () => {
  test('acepta datos correctos y normaliza los campos vacíos a null', () => {
    const r = validarEdicion({ titulo: ' Mi tema ', descripcion: '  ', palabrasClave: '' });
    expect(r.errores).toEqual([]);
    expect(r.datos).toEqual({ titulo: 'Mi tema', descripcion: null, palabrasClave: null });
  });

  test('el título es obligatorio', () => {
    expect(validarEdicion({ titulo: '   ' }).errores).toContain('El título es obligatorio.');
    expect(validarEdicion().errores).toContain('El título es obligatorio.');
  });

  test('respeta los límites de longitud', () => {
    expect(validarEdicion({ titulo: 'a'.repeat(150) }).errores).toEqual([]);
    expect(validarEdicion({ titulo: 'a'.repeat(151) }).errores).toHaveLength(1);
    expect(validarEdicion({ titulo: 'x', descripcion: 'a'.repeat(501) }).errores).toHaveLength(1);
    expect(validarEdicion({ titulo: 'x', palabrasClave: 'a'.repeat(201) }).errores).toHaveLength(1);
  });
});
