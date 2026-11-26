const { preparar, sembrar } = require('./ayudas');
const { crearRepoEstadisticas } = require('../src/repositorios/estadisticas');

const resumen = {
  porEstado: [{ estado: 'validado', total: 12 }, { estado: 'pendiente_validacion', total: 3 }, { estado: 'rechazado', total: 1 }],
  porMateria: [{ materia: 'Cálculo', semestre: 2, total: 7 }, { materia: 'Álgebra', semestre: 1, total: 5 }],
  estudiantes: 40, docentes: 6, descargas: 25,
};

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.estadisticas = { resumen: jest.fn().mockResolvedValue(resumen) };
  await c.iniciarSesion(usuario.correo_institucional);
  return c;
}

describe('API de estadísticas (PT-22)', () => {
  test('sin sesión 401; estudiante y docente 403', async () => {
    expect((await (await preparar()).agente.get('/api/estadisticas')).status).toBe(401);
    for (const rol of ['estudiante', 'docente']) {
      expect((await (await conSesion(rol)).agente.get('/api/estadisticas')).status).toBe(403);
    }
  });

  test('devuelve los indicadores y los datos de las gráficas', async () => {
    const c = await conSesion();
    const r = await c.agente.get('/api/estadisticas');
    expect(r.status).toBe(200);
    expect(r.body.indicadores).toEqual({
      publicados: 12, pendientes: 3, estudiantes_activos: 40, docentes_activos: 6, descargas: 25,
    });
    expect(r.body.por_materia).toHaveLength(2);
    expect(r.body.por_estado).toHaveLength(3);
    expect(c.repos.estadisticas.resumen).toHaveBeenCalledWith({ semestre: null, dias: null });
  });

  test('los filtros de semestre y periodo llegan al repositorio', async () => {
    const c = await conSesion();
    await c.agente.get('/api/estadisticas?semestre=3&dias=90');
    expect(c.repos.estadisticas.resumen).toHaveBeenCalledWith({ semestre: 3, dias: 90 });
  });

  test('sin materiales los indicadores salen en cero', async () => {
    const c = await conSesion();
    c.repos.estadisticas.resumen.mockResolvedValue({ porEstado: [], porMateria: [], estudiantes: 0, docentes: 0, descargas: 0 });
    const r = await c.agente.get('/api/estadisticas');
    expect(r.body.indicadores).toMatchObject({ publicados: 0, pendientes: 0 });
  });

  test.each(['semestre=0', 'semestre=9', 'semestre=x', 'dias=7', 'dias=abc'])('filtro inválido %s → 400', async (q) => {
    const c = await conSesion();
    expect((await c.agente.get(`/api/estadisticas?${q}`)).status).toBe(400);
    expect(c.repos.estadisticas.resumen).not.toHaveBeenCalled();
  });
});

describe('repositorio de estadísticas', () => {
  test('convierte los totales a número y manda los filtros como parámetros', async () => {
    const pool = { query: jest.fn()
      .mockResolvedValueOnce([[{ estado: 'validado', total: '4' }]])
      .mockResolvedValueOnce([[{ materia: 'Cálculo', semestre: 2, total: '4' }]])
      .mockResolvedValueOnce([[{ estudiantes: '10', docentes: '2' }]])
      .mockResolvedValueOnce([[{ total: '9' }]]) };
    const r = await crearRepoEstadisticas(pool).resumen({ semestre: 2, dias: 30 });
    expect(r).toEqual({
      porEstado: [{ estado: 'validado', total: 4 }],
      porMateria: [{ materia: 'Cálculo', semestre: 2, total: 4 }],
      estudiantes: 10, docentes: 2, descargas: 9,
    });
    expect(pool.query.mock.calls[0][1]).toEqual([2, 2, 30, 30]);
    expect(pool.query.mock.calls[1][1]).toEqual([30, 30, 2, 2]);
    expect(pool.query.mock.calls[0][0]).toContain("m.estado <> 'eliminado'");
  });
});
