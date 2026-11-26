const { preparar, sembrar } = require('./ayudas');
const { crearRepoMateriales } = require('../src/repositorios/materiales');

const PDF = Buffer.from('%PDF-1.4\ncontenido de prueba');

async function estudianteConRepos() {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: 'est@itsx.edu.mx', rol: 'estudiante' });
  c.repos.materias = { buscarActivaPorId: jest.fn().mockResolvedValue({ id_materia: 1 }) };
  c.repos.materiales = {
    existeHuellaVigente: jest.fn().mockResolvedValue(false),
    crear: jest.fn().mockResolvedValue(77),
    buscarValidados: jest.fn().mockResolvedValue([{ id_material: 1, titulo: 'Apuntes', tipo: 'Resumen' }]),
  };
  c.repos.tipos = {
    obtener: jest.fn(async (id) => ({ 1: { id_tipo: 1, nombre: 'Apuntes', activo: true }, 2: { id_tipo: 2, nombre: 'Viejo', activo: false } }[id] || null)),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.subir = (campos = {}) => {
    const r = c.agente.post('/api/materiales').set('x-csrf-token', c.csrf)
      .field('titulo', 'Apuntes').field('idMateria', '1').field('declaracion', 'true');
    Object.entries(campos).forEach(([k, v]) => r.field(k, v));
    return r.attach('archivo', PDF, { filename: 'apuntes.pdf', contentType: 'application/pdf' });
  };
  return c;
}

describe('subida de material con tipo (PT-09)', () => {
  test('sin tipo la subida sigue funcionando y guarda el tipo como nulo', async () => {
    const c = await estudianteConRepos();
    const r = await c.subir();
    expect(r.status).toBe(201);
    expect(c.repos.materiales.crear.mock.calls[0][0]).toMatchObject({ idMateria: 1, idTipo: null, titulo: 'Apuntes' });
  });

  test('con un tipo activo lo guarda en el material', async () => {
    const c = await estudianteConRepos();
    const r = await c.subir({ idTipo: '1' });
    expect(r.status).toBe(201);
    expect(c.repos.materiales.crear.mock.calls[0][0].idTipo).toBe(1);
  });

  test.each([['99', 'no existe'], ['2', 'inactivo'], ['abc', 'no existe']])('tipo %s inválido → 400 y no guarda nada', async (idTipo) => {
    const c = await estudianteConRepos();
    const r = await c.subir({ idTipo });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/tipo de material/);
    expect(c.repos.materiales.crear).not.toHaveBeenCalled();
  });

  test('un docente no puede subir material (403)', async () => {
    const c = await preparar();
    const d = sembrar(c.repos, { correo: 'doc@itsx.edu.mx', rol: 'docente' });
    await c.iniciarSesion(d.correo_institucional);
    const r = await c.agente.post('/api/materiales').set('x-csrf-token', c.csrf).field('titulo', 'x');
    expect(r.status).toBe(403);
  });

  test('faltan datos obligatorios → 400', async () => {
    const c = await estudianteConRepos();
    const r = await c.agente.post('/api/materiales').set('x-csrf-token', c.csrf).field('titulo', 'Solo título');
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/materia/);
  });

  test('un archivo cuyo contenido no corresponde a su extensión se rechaza', async () => {
    const c = await estudianteConRepos();
    const r = await c.agente.post('/api/materiales').set('x-csrf-token', c.csrf)
      .field('titulo', 'T').field('idMateria', '1').field('declaracion', 'true')
      .attach('archivo', Buffer.from('esto no es un pdf'), { filename: 'falso.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/no corresponde/);
  });

  test('un archivo repetido responde 409', async () => {
    const c = await estudianteConRepos();
    c.repos.materiales.existeHuellaVigente.mockResolvedValue(true);
    expect((await c.subir()).status).toBe(409);
  });
});

describe('catálogo filtrado por tipo (PT-07)', () => {
  test('el filtro de tipo llega al repositorio junto con los demás', async () => {
    const c = await estudianteConRepos();
    const r = await c.agente.get('/api/materiales?q=ap&materia=1&tipo=3');
    expect(r.status).toBe(200);
    expect(r.body.materiales[0].tipo).toBe('Resumen');
    expect(c.repos.materiales.buscarValidados).toHaveBeenCalledWith({ texto: 'ap', idMateria: 1, idTipo: 3 });
  });

  test('sin filtros pide todo', async () => {
    const c = await estudianteConRepos();
    await c.agente.get('/api/materiales');
    expect(c.repos.materiales.buscarValidados).toHaveBeenCalledWith({ texto: '', idMateria: null, idTipo: null });
  });

  test.each(['tipo=0', 'tipo=abc', 'materia=x'])('filtro inválido %s → 400', async (q) => {
    const c = await estudianteConRepos();
    expect((await c.agente.get(`/api/materiales?${q}`)).status).toBe(400);
  });
});

describe('repositorio de materiales con tipo', () => {
  test('crear guarda el id del tipo en el material', async () => {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn().mockResolvedValue([{ insertId: 5 }]),
    };
    const repo = crearRepoMateriales({ getConnection: jest.fn().mockResolvedValue(conexion) });
    await repo.crear({
      idAutor: 1, idMateria: 2, idTipo: 3, titulo: 'T', descripcion: null, palabrasClave: null,
      archivo: { nombre: 'a.pdf', formato: 'pdf', tamano: 10, huella: 'h' },
    }, async () => {});
    const [sql, params] = conexion.query.mock.calls[0];
    expect(sql).toContain('id_tipo');
    expect(params).toEqual([1, 2, 3, 'T', null, null]);
    expect(conexion.commit).toHaveBeenCalledTimes(1);
  });

  test('buscarValidados filtra por tipo y devuelve su nombre', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ id_material: 1, tipo: 'Resumen' }]]) };
    await crearRepoMateriales(pool).buscarValidados({ texto: '', idMateria: null, idTipo: 4 });
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('t.nombre AS tipo');
    expect(sql).toContain('m.id_tipo = ?');
    expect(params).toEqual([null, null, 4, 4, null, null, null, null]);
  });
});
