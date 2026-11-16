const { formatoDeNombre, coincideFirma, huellaSha256 } = require('../src/servicios/archivos');

describe('validación de archivos', () => {
  test('reconoce los formatos permitidos sin importar mayúsculas', () => {
    expect(formatoDeNombre('Apuntes.PDF')).toBe('PDF');
    expect(formatoDeNombre('foto.jpeg')).toBe('JPG');
  });

  test('rechaza extensiones no permitidas', () => {
    expect(formatoDeNombre('virus.exe')).toBeNull();
    expect(formatoDeNombre('sin_extension')).toBeNull();
  });

  test('comprueba que el contenido corresponda a la extensión', () => {
    expect(coincideFirma(Buffer.from('%PDF-1.4'), 'PDF')).toBe(true);
    expect(coincideFirma(Buffer.from('texto plano'), 'PDF')).toBe(false);
  });

  test('la huella SHA-256 es estable y detecta duplicados', () => {
    const a = huellaSha256(Buffer.from('contenido'));
    expect(a).toHaveLength(64);
    expect(a).toBe(huellaSha256(Buffer.from('contenido')));
    expect(a).not.toBe(huellaSha256(Buffer.from('otro contenido')));
  });
});