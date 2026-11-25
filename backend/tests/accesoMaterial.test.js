const { puedeVerMaterial } = require('../src/servicios/accesoMaterial');

const autor = { id: 4, rol: 'estudiante' };
const otro = { id: 5, rol: 'estudiante' };
const docente = { id: 2, rol: 'docente' };
const admin = { id: 1, rol: 'administrador' };
const material = (estado) => ({ id_autor: 4, estado });

describe('puedeVerMaterial', () => {
  test('un material validado lo ve cualquier usuario con sesión', () => {
    [autor, otro, docente, admin].forEach((u) => expect(puedeVerMaterial(material('validado'), u)).toBe(true));
  });

  test.each(['pendiente_validacion', 'rechazado', 'suspendido', 'retirado'])(
    'un material %s lo ven su autor, los docentes y los administradores',
    (estado) => {
      expect(puedeVerMaterial(material(estado), autor)).toBe(true);
      expect(puedeVerMaterial(material(estado), docente)).toBe(true);
      expect(puedeVerMaterial(material(estado), admin)).toBe(true);
    }
  );

  test.each(['pendiente_validacion', 'rechazado', 'suspendido', 'retirado'])(
    'un material %s no lo ve otro estudiante',
    (estado) => {
      expect(puedeVerMaterial(material(estado), otro)).toBe(false);
    }
  );

  test('un material eliminado no lo ve nadie, ni su autor', () => {
    [autor, otro, docente, admin].forEach((u) => expect(puedeVerMaterial(material('eliminado'), u)).toBe(false));
  });

  test('sin material o sin usuario no hay acceso', () => {
    expect(puedeVerMaterial(null, autor)).toBe(false);
    expect(puedeVerMaterial(material('validado'), null)).toBe(false);
  });
});
