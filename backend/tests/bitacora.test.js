const { preparar, sembrar, CLAVE } = require('./ayudas');
const { REGLAS } = require('../src/middleware/auditoria');
const { crearRepoBitacora } = require('../src/repositorios/bitacora');

const esperar = () => new Promise((r) => setImmediate(r));

function repoBitacora() {
  return {
    registrar: jest.fn().mockResolvedValue(undefined),
    listar: jest.fn().mockResolvedValue({ registros: [], total: 0 }),
    acciones: jest.fn().mockResolvedValue(['inicio_sesion']),
  };
}
const registros = (c) => c.repos.bitacora.registrar.mock.calls.map(([r]) => r);

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  c.repos.bitacora = repoBitacora();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  await c.iniciarSesion(usuario.correo_institucional);
  await esperar();
  c.usuario = usuario;
  return c;
}

describe('registro automático en la bitácora', () => {
  test('un inicio de sesión correcto queda registrado con el usuario', async () => {
    const c = await conSesion();
    expect(registros(c)).toEqual([{ idUsuario: c.usuario.id_usuario, accion: 'inicio_sesion', detalle: 'Correo: administrador@itsx.edu.mx' }]);
  });

  test('un inicio fallido se registra sin usuario y sin guardar la contraseña', async () => {
    const c = await preparar();
    c.repos.bitacora = repoBitacora();
    sembrar(c.repos, { correo: 'ana@itsx.edu.mx' });
    await c.iniciarSesion('ana@itsx.edu.mx', 'ClaveEquivocada9');
    await esperar();
    const [r] = registros(c);
    expect(r).toEqual({ idUsuario: null, accion: 'inicio_sesion_fallido', detalle: 'Correo: ana@itsx.edu.mx' });
    expect(JSON.stringify(c.repos.bitacora.registrar.mock.calls)).not.toContain('ClaveEquivocada9');
  });

  test('una cuenta suspendida que intenta entrar queda como inicio rechazado', async () => {
    const c = await preparar();
    c.repos.bitacora = repoBitacora();
    sembrar(c.repos, { correo: 'bloq@itsx.edu.mx', estado: 'suspendida' });
    await c.iniciarSesion('bloq@itsx.edu.mx');
    await esperar();
    expect(registros(c)[0].accion).toBe('inicio_sesion_rechazado');
  });

  test('el cierre de sesión conserva al usuario aunque la sesión se destruya', async () => {
    const c = await conSesion('docente');
    await c.post('/api/auth/logout', {});
    await esperar();
    expect(registros(c).at(-1)).toMatchObject({ idUsuario: c.usuario.id_usuario, accion: 'cierre_sesion' });
  });

  test('las acciones de administración se registran con su detalle', async () => {
    const c = await conSesion();
    c.repos.catalogo = { crear: jest.fn().mockResolvedValue(9) };
    await c.post('/api/catalogo', { clave: 'abc123', nombre: 'Física', semestre: 1 });
    await esperar();
    expect(registros(c).at(-1)).toEqual({ idUsuario: c.usuario.id_usuario, accion: 'materia_creada', detalle: 'Clave: ABC123' });
  });

  test('las acciones de moderación incluyen el motivo', async () => {
    const c = await conSesion();
    c.repos.moderacion = { aplicarAccion: jest.fn().mockResolvedValue({ resultado: 'ok', titulo: 'T' }) };
    await c.post('/api/moderacion/7/accion', { accion: 'suspender', motivo: 'Contenido dudoso' });
    await esperar();
    expect(registros(c).at(-1)).toMatchObject({ accion: 'moderacion_suspender', detalle: 'Material 7. Motivo: Contenido dudoso' });
  });

  test('una solicitud rechazada (400) no se registra', async () => {
    const c = await conSesion();
    c.repos.catalogo = { crear: jest.fn() };
    const antes = registros(c).length;
    expect((await c.post('/api/catalogo', { clave: '', nombre: '', semestre: 0 })).status).toBe(400);
    await esperar();
    expect(registros(c)).toHaveLength(antes);
  });

  test('las consultas (GET) no se registran', async () => {
    const c = await conSesion();
    c.repos.bitacora.listar.mockResolvedValue({ registros: [], total: 0 });
    const antes = registros(c).length;
    await c.agente.get('/api/bitacora');
    await esperar();
    expect(registros(c)).toHaveLength(antes);
  });

  test('si la bitácora falla, la respuesta al usuario no se ve afectada', async () => {
    const c = await preparar();
    c.repos.bitacora = { registrar: jest.fn().mockRejectedValue(new Error('base caída')) };
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    sembrar(c.repos, { correo: 'ana@itsx.edu.mx' });
    const r = await c.iniciarSesion('ana@itsx.edu.mx');
    await esperar();
    expect(r.status).toBe(200);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  test('sin repositorio de bitácora la aplicación funciona igual', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'ana@itsx.edu.mx' });
    expect((await c.iniciarSesion('ana@itsx.edu.mx')).status).toBe(200);
  });

  test('ninguna regla guarda contraseñas ni tokens en el detalle', () => {
    const req = { body: { correo: 'a@x', contrasena: 'Secreta1', token: 'abc', contrasenaNueva: 'Otra1234' } };
    REGLAS.forEach((r) => expect(r.detalle(req, ['', '1'])).not.toMatch(/Secreta1|abc|Otra1234/));
  });
});

describe('API de la bitácora (PT-21)', () => {
  test('sin sesión 401; estudiante y docente 403', async () => {
    expect((await (await preparar()).agente.get('/api/bitacora')).status).toBe(401);
    for (const rol of ['estudiante', 'docente']) {
      const c = await conSesion(rol);
      expect((await c.agente.get('/api/bitacora')).status).toBe(403);
      expect((await c.agente.get('/api/bitacora/exportar')).status).toBe(403);
    }
  });

  test('consulta paginada con filtros', async () => {
    const c = await conSesion();
    c.repos.bitacora.listar.mockResolvedValue({ registros: [{ id_bitacora: 1 }], total: 45 });
    const r = await c.agente.get('/api/bitacora?q=ana&accion=inicio_sesion&desde=2026-11-01&hasta=2026-11-30&pagina=3');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 45, pagina: 3, paginas: 3 });
    expect(c.repos.bitacora.listar).toHaveBeenCalledWith(
      { texto: 'ana', accion: 'inicio_sesion', desde: '2026-11-01', hasta: '2026-11-30' },
      { limite: 20, desplazamiento: 40 }
    );
  });

  test('sin registros devuelve una lista vacía y una sola página', async () => {
    const c = await conSesion();
    const r = await c.agente.get('/api/bitacora');
    expect(r.body).toMatchObject({ registros: [], total: 0, pagina: 1, paginas: 1 });
  });

  test.each(['desde=2026-13-45', 'desde=ayer', 'hasta=2026/11/01', 'desde=2026-12-01&hasta=2026-11-01'])('fechas inválidas (%s) → 400', async (q) => {
    const c = await conSesion();
    expect((await c.agente.get(`/api/bitacora?${q}`)).status).toBe(400);
    expect(c.repos.bitacora.listar).not.toHaveBeenCalled();
  });

  test('lista las acciones para el filtro', async () => {
    const c = await conSesion();
    expect((await c.agente.get('/api/bitacora/acciones')).body.acciones).toEqual(['inicio_sesion']);
  });

  test('exporta CSV con encabezado, acentos y protección contra fórmulas', async () => {
    const c = await conSesion();
    c.repos.bitacora.listar.mockResolvedValue({ registros: [
      { fecha: '2026-11-25T10:00:00', usuario: 'Ana Pérez', correo: 'ana@itsx.edu.mx', accion: 'material_subido', detalle: 'Título: "Cálculo", unidad 1' },
      { fecha: '2026-11-25T11:00:00', usuario: null, correo: null, accion: 'inicio_sesion_fallido', detalle: '=HYPERLINK("http://x")' },
    ], total: 2 });
    const r = await c.agente.get('/api/bitacora/exportar?accion=material_subido');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.headers['content-disposition']).toContain('bitacora.csv');
    expect(r.text).toContain('"Fecha","Usuario","Correo","Acción","Detalle"');
    expect(r.text).toContain('"Título: ""Cálculo"", unidad 1"');
    expect(r.text).toContain('"\'=HYPERLINK(');
    expect(r.text).toContain('Sistema / anónimo');
    expect(c.repos.bitacora.listar).toHaveBeenLastCalledWith(expect.objectContaining({ accion: 'material_subido' }), { limite: 5000, desplazamiento: 0 });
  });
});

describe('repositorio de la bitácora', () => {
  test('registrar inserta con parámetros', async () => {
    const pool = { query: jest.fn().mockResolvedValue([{}]) };
    await crearRepoBitacora(pool).registrar({ idUsuario: 3, accion: 'inicio_sesion', detalle: 'x' });
    expect(pool.query.mock.calls[0][1]).toEqual([3, 'inicio_sesion', 'x']);
  });

  test('listar aplica filtros y escapa los comodines de la búsqueda', async () => {
    const pool = { query: jest.fn()
      .mockResolvedValueOnce([[{ id_bitacora: 1 }]])
      .mockResolvedValueOnce([[{ total: '7' }]]) };
    const r = await crearRepoBitacora(pool).listar({ texto: '50%', accion: 'a', desde: '2026-11-01', hasta: null }, { limite: 20, desplazamiento: 40 });
    expect(r).toEqual({ registros: [{ id_bitacora: 1 }], total: 7 });
    const p = pool.query.mock.calls[0][1];
    expect(p[1]).toBe('%50\\%%');
    expect(p.slice(-2)).toEqual([20, 40]);
    expect(pool.query.mock.calls[0][0]).toContain('LIMIT ? OFFSET ?');
  });

  test('acciones devuelve solo los nombres', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ accion: 'a' }, { accion: 'b' }]]) };
    expect(await crearRepoBitacora(pool).acciones()).toEqual(['a', 'b']);
  });
});
