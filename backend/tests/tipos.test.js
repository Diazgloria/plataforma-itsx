const { preparar, sembrar } = require('./ayudas');
const { validarTipo } = require('../src/servicios/tipos');
const { crearRepoTipos } = require('../src/repositorios/tipos');

function repoFalso() {
  const tipos = [
    { id_tipo: 1, nombre: 'Apuntes', activo: true },
    { id_tipo: 2, nombre: 'Resumen', activo: false },
  ];
  return {
    listarActivos: jest.fn(async () => tipos.filter((t) => t.activo).map(({ id_tipo, nombre }) => ({ id_tipo, nombre }))),
    listarTodos: jest.fn(async () => tipos.map((t) => ({ ...t, materiales: 0 }))),
    obtener: jest.fn(async (id) => tipos.find((t) => t.id_tipo === id) || null),
    crear: jest.fn(async (nombre) => {
      if (tipos.some((t) => t.nombre.toLowerCase() === nombre.toLowerCase())) {
        throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      }
      return 30;
    }),
    renombrar: jest.fn(async () => {}),
    cambiarActivo: jest.fn(async () => {}),
  };
}

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.tipos = repoFalso();
  await c.iniciarSesion(usuario.correo_institucional);
  c.put = (ruta, datos) => c.agente.put(ruta).set('x-csrf-token', c.csrf).send(datos);
  return c;
}

describe('validarTipo', () => {
  test('recorta y junta los espacios', () => {
    expect(validarTipo({ nombre: '  Guía   de  estudio ' }).datos.nombre).toBe('Guía de estudio');
  });
  test('rechaza nombre vacío o de más de 60 caracteres', () => {
    expect(validarTipo({ nombre: '   ' }).errores[0]).toMatch(/obligatorio/);
    expect(validarTipo({ nombre: 'x'.repeat(61) }).errores[0]).toMatch(/60/);
    expect(validarTipo({}).errores).toHaveLength(1);
  });
});

describe('API de tipos de material (PT-19)', () => {
  test('sin sesión 401; los tipos activos los ve cualquier rol con sesión', async () => {
    expect((await (await preparar()).agente.get('/api/tipos')).status).toBe(401);
    const e = await conSesion('estudiante');
    const r = await e.agente.get('/api/tipos');
    expect(r.status).toBe(200);
    expect(r.body.tipos).toEqual([{ id_tipo: 1, nombre: 'Apuntes' }]); // el inactivo no se ofrece
  });

  test('la vista de administración, el alta y los cambios son solo para el administrador', async () => {
    for (const rol of ['estudiante', 'docente']) {
      const c = await conSesion(rol);
      expect((await c.agente.get('/api/tipos/admin')).status).toBe(403);
      expect((await c.post('/api/tipos', { nombre: 'Nuevo' })).status).toBe(403);
      expect((await c.put('/api/tipos/1', { nombre: 'X' })).status).toBe(403);
      expect((await c.post('/api/tipos/1/estado', { activo: false })).status).toBe(403);
    }
  });

  test('el administrador ve todos los tipos con su número de materiales', async () => {
    const c = await conSesion();
    const r = await c.agente.get('/api/tipos/admin');
    expect(r.status).toBe(200);
    expect(r.body.tipos).toHaveLength(2);
    expect(r.body.tipos[0]).toHaveProperty('materiales');
  });

  test('crea un tipo (201) y rechaza el nombre repetido sin importar mayúsculas (409)', async () => {
    const c = await conSesion();
    expect((await c.post('/api/tipos', { nombre: ' Laboratorio ' })).status).toBe(201);
    expect(c.repos.tipos.crear).toHaveBeenCalledWith('Laboratorio');
    const repetido = await c.post('/api/tipos', { nombre: 'apuntes' });
    expect(repetido.status).toBe(409);
    expect(repetido.body.error).toMatch(/nombre/);
    expect((await c.post('/api/tipos', { nombre: '' })).status).toBe(400);
  });

  test('edita un tipo; 404 si no existe; 409 si el nombre choca', async () => {
    const c = await conSesion();
    expect((await c.put('/api/tipos/1', { nombre: 'Apuntes de clase' })).status).toBe(200);
    expect(c.repos.tipos.renombrar).toHaveBeenCalledWith(1, 'Apuntes de clase');
    expect((await c.put('/api/tipos/99', { nombre: 'X' })).status).toBe(404);
    c.repos.tipos.renombrar.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    expect((await c.put('/api/tipos/1', { nombre: 'Resumen' })).status).toBe(409);
    expect((await c.put('/api/tipos/abc', { nombre: 'X' })).status).toBe(400);
  });

  test('desactiva y activa un tipo', async () => {
    const c = await conSesion();
    expect((await c.post('/api/tipos/1/estado', { activo: false })).status).toBe(200);
    expect(c.repos.tipos.cambiarActivo).toHaveBeenLastCalledWith(1, false);
    await c.post('/api/tipos/2/estado', { activo: true });
    expect(c.repos.tipos.cambiarActivo).toHaveBeenLastCalledWith(2, true);
    expect((await c.post('/api/tipos/1/estado', { activo: 'no' })).status).toBe(400);
    expect((await c.post('/api/tipos/99/estado', { activo: true })).status).toBe(404);
  });
});

describe('repositorio de tipos', () => {
  test('listarTodos convierte la bandera y el contador', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ id_tipo: 1, nombre: 'A', activo: 1, materiales: '4' }]]) };
    expect(await crearRepoTipos(pool).listarTodos()).toEqual([{ id_tipo: 1, nombre: 'A', activo: true, materiales: 4 }]);
  });

  test('listarActivos solo pide los activos', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[]]) };
    await crearRepoTipos(pool).listarActivos();
    expect(pool.query.mock.calls[0][0]).toContain('activo = TRUE');
  });

  test('crear usa consulta parametrizada', async () => {
    const pool = { query: jest.fn().mockResolvedValue([{ insertId: 9 }]) };
    expect(await crearRepoTipos(pool).crear('Nuevo')).toBe(9);
    expect(pool.query.mock.calls[0][1]).toEqual(['Nuevo']);
  });
});
