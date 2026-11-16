const { crearToken, verificarToken, huellaContrasena } = require('../src/servicios/tokens');

const SECRETO = 'secreto-de-pruebas';
const crear = (extra = {}) => crearToken({ proposito: 'verificacion', idUsuario: 7, vigenciaMs: 1000, secreto: SECRETO, ...extra });

describe('tokens firmados', () => {
  test('un token recién creado es válido y devuelve el id del usuario', () => {
    expect(verificarToken(crear(), SECRETO, 'verificacion')).toMatchObject({ valido: true, idUsuario: 7 });
  });

  test('un token alterado se rechaza por su firma', () => {
    const alterado = crear().replace('.7.', '.8.');
    expect(verificarToken(alterado, SECRETO, 'verificacion')).toEqual({ valido: false, motivo: 'firma' });
  });

  test('un token de verificación no sirve para recuperar la contraseña', () => {
    expect(verificarToken(crear(), SECRETO, 'recuperacion')).toEqual({ valido: false, motivo: 'proposito' });
  });

  test('un token vencido se rechaza', () => {
    expect(verificarToken(crear(), SECRETO, 'verificacion', Date.now() + 5000)).toEqual({ valido: false, motivo: 'expirado' });
  });

  test('la huella cambia cuando cambia la contraseña', () => {
    expect(huellaContrasena('hash-1')).toBe(huellaContrasena('hash-1'));
    expect(huellaContrasena('hash-1')).not.toBe(huellaContrasena('hash-2'));
  });
});