const { generarCodigo, validarDecision } = require('../src/servicios/validacionDocente');

describe('generarCodigo', () => {
  test('tiene el formato ITSX-XXXX-XXXX-NN y 17 caracteres', () => {
    const codigo = generarCodigo(1);
    expect(codigo).toMatch(/^ITSX-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-\d{2}$/);
    expect(codigo).toHaveLength(17);
  });

  test('nunca usa los caracteres que se confunden (I, O, 0, 1) en los bloques aleatorios', () => {
    for (let i = 0; i < 500; i++) {
      const [, a, b] = generarCodigo(1).split('-');
      expect(a + b).not.toMatch(/[IO01]/);
    }
  });

  test('con un generador fijo produce un código predecible', () => {
    expect(generarCodigo(1, () => 0)).toBe('ITSX-AAAA-AAAA-01');
  });

  test('el último bloque es el número de versión con dos dígitos', () => {
    expect(generarCodigo(3, () => 0).endsWith('-03')).toBe(true);
    expect(generarCodigo(12, () => 0).endsWith('-12')).toBe(true);
  });

  test('si la versión llega a 100 el número vuelve a dos dígitos (módulo 100)', () => {
    expect(generarCodigo(100, () => 0).endsWith('-00')).toBe(true);
  });

  test('dos códigos seguidos son distintos', () => {
    expect(generarCodigo(1)).not.toBe(generarCodigo(1));
  });
});

describe('validarDecision', () => {
  test('aprobar no exige comentario', () => {
    const r = validarDecision({ decision: 'aprobado' });
    expect(r.errores).toEqual([]);
    expect(r.datos).toEqual({ decision: 'aprobado', comentario: '' });
  });

  test('rechazar sin comentario es un error', () => {
    expect(validarDecision({ decision: 'rechazado' }).errores)
      .toContain('Para rechazar un material debes escribir un comentario.');
  });

  test('un comentario de solo espacios cuenta como vacío', () => {
    expect(validarDecision({ decision: 'rechazado', comentario: '   ' }).errores).toHaveLength(1);
  });

  test('rechazar con comentario es válido y se quitan los espacios sobrantes', () => {
    const r = validarDecision({ decision: 'rechazado', comentario: '  Falta la bibliografía  ' });
    expect(r.errores).toEqual([]);
    expect(r.datos.comentario).toBe('Falta la bibliografía');
  });

  test('una decisión distinta de aprobado o rechazado es un error', () => {
    expect(validarDecision({ decision: 'otra' }).errores)
      .toContain('La decisión debe ser "aprobado" o "rechazado".');
  });

  test('sin datos no falla y reporta la decisión faltante', () => {
    expect(validarDecision().errores).toHaveLength(1);
    expect(validarDecision({}).errores).toHaveLength(1);
  });

  test('el comentario acepta 500 caracteres y rechaza 501', () => {
    expect(validarDecision({ decision: 'aprobado', comentario: 'a'.repeat(500) }).errores).toEqual([]);
    expect(validarDecision({ decision: 'aprobado', comentario: 'a'.repeat(501) }).errores)
      .toContain('El comentario no puede tener más de 500 caracteres.');
  });
});
