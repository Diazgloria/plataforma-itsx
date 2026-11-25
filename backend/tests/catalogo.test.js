const { preparar, sembrar } = require('./ayudas');
const { validarMateria } = require('../src/servicios/catalogo');
const { crearRepoCatalogo } = require('../src/repositorios/catalogo');

// Repositorio en memoria del catálogo
function repoFalso() {
  const materias = [
    { id_materia: 1, clave: 'ACF0902', nombre: 'Cálculo Integral', semestre: 2, descripcion: null, activa: true },
    { id_materia: 2, clave: 'SCC1010', nombre: 'Programación', semestre: 1, descripcion: null, activa: true },
  ];
  const deps = { 1: { materiales: 2, docentes: 1 }, 2: { materiales: 0, docentes: 0 } };
  return {
    materias,
    listar: jest.fn(async (s) => materias.filter((m) => !s || m.semestre === s)
      .map((m) => ({ ...m, materiales: 0, docentes: 0 }))),
    obtener: jest.fn(async (id) => materias.find((m) => m.id_materia === id) || null),
    crear: jest.fn(async (d) => {
      if (materias.some((m) => m.clave === d.clave)) throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      materias.push({ id_materia: 50, ...d, activa: true });
      return 50;
    }),
    actualizar: jest.fn(async () => {}),
    cambiarActiva: jest.fn(async () => {}),
    dependencias: jest.fn(async (id) => deps[id] || { materiales: 0, docentes: 0 }),
    eliminar: jest.fn(async () => {}),
  };
}

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.catalogo = repoFalso();
  await c.iniciarSesion(usuario.correo_institucional);
  c.put = (ruta, datos) => c.agente.put(ruta).set('x-csrf-token', c.csrf).send(datos);
  c.del = (ruta) => c.agente.delete(ruta).set('x-csrf-token', c.csrf);
  return c;
}

const nueva = { clave: 'ACD1234', nombre: 'Álgebra Lineal', semestre: 2 };

describe('validarMateria', () => {
  test('acepta datos correctos y normaliza la clave a mayúsculas', () => {
    const { errores, datos } = validarMateria({ clave: ' acd-123 ', nombre: ' Álgebra ', semestre: '2' });
    expect(errores).toEqual([]);
    expect(datos).toMatchObject({ clave: 'ACD-123', nombre: 'Álgebra', semestre: 2 });
  });

  test.each([
    [{ clave: 'AB', nombre: 'X', semestre: 1 }, 'clave'],
    [{ clave: 'AB CD1', nombre: 'X', semestre: 1 }, 'clave'],
    [{ clave: 'ACD1234', nombre: '  ', semestre: 1 }, 'nombre'],
    [{ clave: 'ACD1234', nombre: 'x'.repeat(121), semestre: 1 }, 'nombre'],
    [{ clave: 'ACD1234', nombre: 'X', semestre: 9 }, 'semestre'],
    [{ clave: 'ACD1234', nombre: 'X', semestre: 'dos' }, 'semestre'],
    [{ clave: 'ACD1234', nombre: 'X', semestre: 1, descripcion: 'x'.repeat(301) }, 'descripción'],
  ])('rechaza %j (%s)', (cuerpo, campo) => {
    const { errores } = validarMateria(cuerpo);
    expect(errores.join(' ')).toContain(campo);
  });
});

describe('API del catálogo (PT-18)', () => {
  test('sin sesión responde 401 y un estudiante 403', async () => {
    expect((await (await preparar()).agente.get('/api/catalogo')).status).toBe(401);
    const e = await conSesion('estudiante');
    expect((await e.agente.get('/api/catalogo')).status).toBe(403);
    expect((await e.post('/api/catalogo', nueva)).status).toBe(403);
  });

  test('el administrador lista y filtra por semestre', async () => {
    const c = await conSesion();
    const todas = await c.agente.get('/api/catalogo');
    expect(todas.status).toBe(200);
    expect(todas.body.materias).toHaveLength(2);
    await c.agente.get('/api/catalogo?semestre=2');
    expect(c.repos.catalogo.listar).toHaveBeenLastCalledWith(2);
    expect((await c.agente.get('/api/catalogo?semestre=9')).status).toBe(400);
  });

  test('agrega una materia (201) y rechaza una clave repetida (409)', async () => {
    const c = await conSesion();
    const r = await c.post('/api/catalogo', nueva);
    expect(r.status).toBe(201);
    expect(c.repos.catalogo.crear).toHaveBeenCalledWith(expect.objectContaining({ clave: 'ACD1234' }));
    const repetida = await c.post('/api/catalogo', { ...nueva, nombre: 'Otra' });
    expect(repetida.status).toBe(409);
    expect(repetida.body.error).toMatch(/clave/);
  });

  test('datos inválidos responden 400 sin tocar la base', async () => {
    const c = await conSesion();
    const r = await c.post('/api/catalogo', { clave: '', nombre: '', semestre: 0 });
    expect(r.status).toBe(400);
    expect(r.body.errores.length).toBeGreaterThanOrEqual(3);
    expect(c.repos.catalogo.crear).not.toHaveBeenCalled();
  });

  test('edita una materia, 404 si no existe y 409 si la clave choca', async () => {
    const c = await conSesion();
    expect((await c.put('/api/catalogo/1', nueva)).status).toBe(200);
    expect(c.repos.catalogo.actualizar).toHaveBeenCalledWith(1, expect.objectContaining({ nombre: 'Álgebra Lineal' }));
    expect((await c.put('/api/catalogo/99', nueva)).status).toBe(404);
    c.repos.catalogo.actualizar.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    expect((await c.put('/api/catalogo/1', nueva)).status).toBe(409);
    expect((await c.put('/api/catalogo/abc', nueva)).status).toBe(400);
  });

  test('desactiva y activa una materia', async () => {
    const c = await conSesion();
    const off = await c.post('/api/catalogo/1/estado', { activa: false });
    expect(off.status).toBe(200);
    expect(c.repos.catalogo.cambiarActiva).toHaveBeenLastCalledWith(1, false);
    await c.post('/api/catalogo/1/estado', { activa: true });
    expect(c.repos.catalogo.cambiarActiva).toHaveBeenLastCalledWith(1, true);
    expect((await c.post('/api/catalogo/1/estado', { activa: 'si' })).status).toBe(400);
    expect((await c.post('/api/catalogo/99/estado', { activa: true })).status).toBe(404);
  });

  test('no elimina una materia con materiales o docentes (409) pero sí una vacía', async () => {
    const c = await conSesion();
    const enUso = await c.del('/api/catalogo/1');
    expect(enUso.status).toBe(409);
    expect(enUso.body.error).toMatch(/Desactívala/);
    expect(c.repos.catalogo.eliminar).not.toHaveBeenCalled();

    expect((await c.del('/api/catalogo/2')).status).toBe(200);
    expect(c.repos.catalogo.eliminar).toHaveBeenCalledWith(2);
    expect((await c.del('/api/catalogo/99')).status).toBe(404);
  });
});

describe('repositorio del catálogo', () => {
  test('listar convierte los contadores y la bandera activa', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[
      { id_materia: 1, clave: 'ACF0902 ', nombre: 'Cálculo', semestre: 2, activa: 1, materiales: '3', docentes: '1' },
    ]]) };
    const [m] = await crearRepoCatalogo(pool).listar(2);
    expect(m).toMatchObject({ clave: 'ACF0902', activa: true, materiales: 3, docentes: 1 });
    expect(pool.query.mock.calls[0][1]).toEqual([2, 2]);
  });

  test('dependencias cuenta materiales de cualquier estado y docentes', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ materiales: '2', docentes: '0' }]]) };
    expect(await crearRepoCatalogo(pool).dependencias(5)).toEqual({ materiales: 2, docentes: 0 });
    expect(pool.query.mock.calls[0][1]).toEqual([5, 5]);
  });

  test('crear usa consulta parametrizada y devuelve el id nuevo', async () => {
    const pool = { query: jest.fn().mockResolvedValue([{ insertId: 77 }]) };
    const id = await crearRepoCatalogo(pool).crear({ clave: 'X1X', nombre: 'N', semestre: 1, descripcion: '' });
    expect(id).toBe(77);
    expect(pool.query.mock.calls[0][1]).toEqual(['X1X', 'N', 1, null]);
  });
});
