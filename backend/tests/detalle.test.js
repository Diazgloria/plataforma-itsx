const { preparar, sembrar } = require('./ayudas');

const base = {
  id_material: 2, id_autor: 4, titulo: 'Resumen de matrices', estado: 'validado',
  materia: 'Álgebra Lineal', materia_clave: 'ACF0903', semestre: 1, tipo: null,
  version: 1, formato: 'PDF', huella_sha256: 'a'.repeat(64), codigo_validacion: 'ITSX-AAAA-BBBB-01',
  descargas: 5, es_favorito: false,
};

async function conSesion(rol = 'estudiante', material = base) {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.detalleMaterial = { obtener: jest.fn().mockResolvedValue(material), registrarDescarga: jest.fn() };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.usuario = usuario;
  return c;
}

describe('detalle del material', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    expect((await c.agente.get('/api/detalle/2')).status).toBe(401);
  });

  test('un identificador no válido da 400', async () => {
    const c = await conSesion();
    expect((await c.get('/api/detalle/abc')).status).toBe(400);
  });

  test('un material inexistente da 404', async () => {
    const c = await conSesion();
    c.repos.detalleMaterial.obtener.mockResolvedValue(null);
    expect((await c.get('/api/detalle/99')).status).toBe(404);
  });

  test('un estudiante ve un material validado con su huella y su código', async () => {
    const c = await conSesion();
    const r = await c.get('/api/detalle/2');
    expect(r.status).toBe(200);
    expect(r.body.material.codigo_validacion).toBe('ITSX-AAAA-BBBB-01');
    expect(r.body.material.huella_sha256).toHaveLength(64);
    expect(c.repos.detalleMaterial.obtener).toHaveBeenCalledWith(2, c.usuario.id_usuario);
  });

  test('un material sin tipo se muestra como "Sin clasificar"', async () => {
    const c = await conSesion();
    expect((await c.get('/api/detalle/2')).body.material.tipo).toBe('Sin clasificar');
  });

  test('un estudiante puede marcar como favorito un material validado', async () => {
    const c = await conSesion();
    expect((await c.get('/api/detalle/2')).body.material.puede_favorito).toBe(true);
  });

  test('un docente ve el material pero no puede marcarlo como favorito', async () => {
    const c = await conSesion('docente');
    expect((await c.get('/api/detalle/2')).body.material.puede_favorito).toBe(false);
  });

  test('otro estudiante no puede ver un material pendiente (404)', async () => {
    const c = await conSesion('estudiante', { ...base, estado: 'pendiente_validacion' });
    expect((await c.get('/api/detalle/2')).status).toBe(404);
  });

  test('un docente sí ve un material pendiente', async () => {
    const c = await conSesion('docente', { ...base, estado: 'pendiente_validacion' });
    expect((await c.get('/api/detalle/2')).status).toBe(200);
  });

  test('el autor ve su material rechazado', async () => {
    const c = await preparar();
    const usuario = sembrar(c.repos, { correo: 'autor@itsx.edu.mx', rol: 'estudiante' });
    c.repos.detalleMaterial = { obtener: jest.fn().mockResolvedValue({ ...base, estado: 'rechazado', id_autor: usuario.id_usuario }) };
    await c.iniciarSesion(usuario.correo_institucional);
    expect((await c.agente.get('/api/detalle/2')).status).toBe(200);
  });

  test('un material eliminado no se ve ni siquiera para el administrador', async () => {
    const c = await conSesion('administrador', { ...base, estado: 'eliminado' });
    expect((await c.get('/api/detalle/2')).status).toBe(404);
  });
});
