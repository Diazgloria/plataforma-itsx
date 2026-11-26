const { preparar, sembrar } = require('./ayudas');
const { validarAccion, puedeAplicar, mensajeAutor, ACCIONES, ESTADOS } = require('../src/servicios/moderacion');
const { crearRepoModeracion } = require('../src/repositorios/moderacion');

describe('reglas de moderación', () => {
  test('cada acción solo se permite desde los estados previstos', () => {
    expect(puedeAplicar('aprobar', 'pendiente_validacion')).toBe(true);
    expect(puedeAplicar('aprobar', 'validado')).toBe(false);
    expect(puedeAplicar('suspender', 'validado')).toBe(true);
    expect(puedeAplicar('suspender', 'rechazado')).toBe(false);
    expect(puedeAplicar('reactivar', 'suspendido')).toBe(true);
    expect(puedeAplicar('reactivar', 'retirado')).toBe(false);
    expect(puedeAplicar('retirar', 'suspendido')).toBe(true);
    expect(puedeAplicar('inventada', 'validado')).toBe(false);
  });

  test('un material eliminado no admite ninguna acción', () => {
    Object.keys(ACCIONES).forEach((a) => expect(puedeAplicar(a, 'eliminado')).toBe(false));
  });

  test('toda acción lleva a un estado válido del material', () => {
    Object.values(ACCIONES).forEach((a) => expect(ESTADOS).toContain(a.hacia));
  });

  test('rechazar, suspender, retirar y eliminar exigen motivo; aprobar y reactivar no', () => {
    ['rechazar', 'suspender', 'retirar', 'eliminar'].forEach((accion) => {
      expect(validarAccion({ accion, motivo: '  ' }).errores[0]).toMatch(/motivo/);
      expect(validarAccion({ accion, motivo: 'Incumple' }).errores).toEqual([]);
    });
    ['aprobar', 'reactivar'].forEach((accion) => expect(validarAccion({ accion }).errores).toEqual([]));
  });

  test('rechaza acciones desconocidas y motivos demasiado largos', () => {
    expect(validarAccion({ accion: 'borrar' }).errores[0]).toMatch(/acción/);
    expect(validarAccion({ accion: 'eliminar', motivo: 'x'.repeat(201) }).errores.join()).toMatch(/200/);
  });

  test('el aviso al autor incluye el motivo y no pasa de 300 caracteres', () => {
    expect(mensajeAutor('suspender', 'Apuntes', 'Contenido dudoso')).toContain('Motivo: Contenido dudoso');
    expect(mensajeAutor('retirar', 'T'.repeat(250), 'M'.repeat(200)).length).toBeLessThanOrEqual(300);
  });
});

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.moderacion = {
    listar: jest.fn().mockResolvedValue([{ id_material: 1, titulo: 'Apuntes', estado: 'validado' }]),
    aplicarAccion: jest.fn().mockResolvedValue({ resultado: 'ok', titulo: 'Apuntes', codigo: null }),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.usuario = usuario;
  return c;
}

describe('API de moderación (PT-16)', () => {
  test('sin sesión 401; estudiante y docente 403', async () => {
    expect((await (await preparar()).agente.get('/api/moderacion')).status).toBe(401);
    for (const rol of ['estudiante', 'docente']) {
      const c = await conSesion(rol);
      expect((await c.agente.get('/api/moderacion')).status).toBe(403);
      expect((await c.post('/api/moderacion/1/accion', { accion: 'eliminar', motivo: 'x' })).status).toBe(403);
    }
  });

  test('lista con filtros combinados', async () => {
    const c = await conSesion();
    const r = await c.agente.get('/api/moderacion?semestre=2&estado=validado&materia=3');
    expect(r.status).toBe(200);
    expect(c.repos.moderacion.listar).toHaveBeenCalledWith({ semestre: 2, estado: 'validado', idMateria: 3 });
    await c.agente.get('/api/moderacion');
    expect(c.repos.moderacion.listar).toHaveBeenLastCalledWith({ semestre: null, estado: null, idMateria: null });
  });

  test.each(['semestre=9', 'semestre=x', 'estado=otro', 'materia=0', 'materia=abc'])('filtro inválido %s → 400', async (q) => {
    const c = await conSesion();
    expect((await c.agente.get(`/api/moderacion?${q}`)).status).toBe(400);
    expect(c.repos.moderacion.listar).not.toHaveBeenCalled();
  });

  test('aplica una acción con el id del administrador y devuelve el código al aprobar', async () => {
    const c = await conSesion();
    c.repos.moderacion.aplicarAccion.mockResolvedValue({ resultado: 'ok', titulo: 'Apuntes', codigo: 'ITSX-AAAA-BBBB-01' });
    const r = await c.post('/api/moderacion/7/accion', { accion: 'aprobar' });
    expect(r.status).toBe(200);
    expect(r.body.codigo).toBe('ITSX-AAAA-BBBB-01');
    expect(c.repos.moderacion.aplicarAccion).toHaveBeenCalledWith(expect.objectContaining({
      idMaterial: 7, idAdmin: c.usuario.id_usuario, accion: 'aprobar', motivo: '',
    }));
  });

  test('suspender sin motivo responde 400 y no toca la base', async () => {
    const c = await conSesion();
    const r = await c.post('/api/moderacion/7/accion', { accion: 'suspender' });
    expect(r.status).toBe(400);
    expect(c.repos.moderacion.aplicarAccion).not.toHaveBeenCalled();
  });

  test('404 si el material no existe y 409 si su estado no permite la acción', async () => {
    const c = await conSesion();
    c.repos.moderacion.aplicarAccion.mockResolvedValueOnce({ resultado: 'no_existe' });
    expect((await c.post('/api/moderacion/99/accion', { accion: 'aprobar' })).status).toBe(404);
    c.repos.moderacion.aplicarAccion.mockResolvedValueOnce({ resultado: 'estado_invalido', estado: 'validado' });
    const r = await c.post('/api/moderacion/7/accion', { accion: 'aprobar' });
    expect(r.status).toBe(409);
    expect(r.body.error).toContain('validado');
    expect((await c.post('/api/moderacion/abc/accion', { accion: 'aprobar' })).status).toBe(400);
  });
});

// Conexión simulada para el repositorio
function crearConexion(estado = 'validado') {
  const material = { id_material: 7, id_autor: 5, titulo: 'Apuntes', estado, numero: 2 };
  return {
    beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
    query: jest.fn(async (sql) => {
      if (sql.includes('FOR UPDATE')) return [estado === 'inexistente' ? [] : [material]];
      if (sql.includes('INSERT INTO validacion_docente')) return [{ insertId: 11 }];
      return [{}];
    }),
  };
}
const repoCon = (conexion) => crearRepoModeracion({ getConnection: jest.fn().mockResolvedValue(conexion) });
const llamada = (c, texto) => c.query.mock.calls.find(([sql]) => sql.includes(texto));

describe('repositorio de moderación', () => {
  test('suspender cambia el estado, avisa al autor y confirma', async () => {
    const c = crearConexion('validado');
    const r = await repoCon(c).aplicarAccion({ idMaterial: 7, idAdmin: 1, accion: 'suspender', motivo: 'Dudoso' });
    expect(r).toEqual({ resultado: 'ok', titulo: 'Apuntes', codigo: null });
    expect(llamada(c, 'UPDATE material')[1]).toEqual(['suspendido', 7]);
    const aviso = llamada(c, 'INSERT INTO notificacion')[1];
    expect(aviso[0]).toBe(5);
    expect(aviso[2]).toBe('material_suspendido');
    expect(aviso[3]).toContain('Dudoso');
    expect(llamada(c, 'INSERT INTO validacion_docente')).toBeUndefined();
    expect(c.commit).toHaveBeenCalledTimes(1);
    expect(c.release).toHaveBeenCalledTimes(1);
  });

  test('aprobar un pendiente registra la decisión, emite el código y valida', async () => {
    const c = crearConexion('pendiente_validacion');
    const generarCodigo = jest.fn().mockReturnValue('ITSX-AAAA-BBBB-02');
    const r = await repoCon(c).aplicarAccion({ idMaterial: 7, idAdmin: 1, accion: 'aprobar', motivo: '', generarCodigo });
    expect(r.codigo).toBe('ITSX-AAAA-BBBB-02');
    expect(generarCodigo).toHaveBeenCalledWith(2);
    expect(llamada(c, 'INSERT INTO validacion_docente')[1]).toEqual([7, 1, 'aprobado', null]);
    expect(llamada(c, 'INSERT INTO codigo_validacion')[1]).toEqual([11, 7, 'ITSX-AAAA-BBBB-02']);
    expect(llamada(c, 'UPDATE material')[1]).toEqual(['validado', 7]);
  });

  test('rechazar un pendiente guarda el motivo como comentario', async () => {
    const c = crearConexion('pendiente_validacion');
    await repoCon(c).aplicarAccion({ idMaterial: 7, idAdmin: 1, accion: 'rechazar', motivo: 'Sin bibliografía' });
    expect(llamada(c, 'INSERT INTO validacion_docente')[1]).toEqual([7, 1, 'rechazado', 'Sin bibliografía']);
    expect(llamada(c, 'INSERT INTO codigo_validacion')).toBeUndefined();
  });

  test('un estado que no permite la acción deshace la transacción sin cambios', async () => {
    const c = crearConexion('rechazado');
    const r = await repoCon(c).aplicarAccion({ idMaterial: 7, idAdmin: 1, accion: 'suspender', motivo: 'x' });
    expect(r).toEqual({ resultado: 'estado_invalido', estado: 'rechazado' });
    expect(llamada(c, 'UPDATE material')).toBeUndefined();
    expect(c.rollback).toHaveBeenCalledTimes(1);
    expect(c.commit).not.toHaveBeenCalled();
  });

  test('un material inexistente devuelve no_existe', async () => {
    const c = crearConexion('inexistente');
    expect((await repoCon(c).aplicarAccion({ idMaterial: 99, idAdmin: 1, accion: 'eliminar', motivo: 'x' })).resultado).toBe('no_existe');
    expect(c.rollback).toHaveBeenCalledTimes(1);
  });

  test('si falla una consulta se deshace todo y se libera la conexión', async () => {
    const c = crearConexion('validado');
    c.query.mockImplementation(async (sql) => {
      if (sql.includes('FOR UPDATE')) return [[{ id_material: 7, id_autor: 5, titulo: 'T', estado: 'validado', numero: 1 }]];
      if (sql.includes('INSERT INTO notificacion')) throw new Error('fallo simulado');
      return [{}];
    });
    await expect(repoCon(c).aplicarAccion({ idMaterial: 7, idAdmin: 1, accion: 'retirar', motivo: 'x' })).rejects.toThrow('fallo simulado');
    expect(c.rollback).toHaveBeenCalledTimes(1);
    expect(c.commit).not.toHaveBeenCalled();
    expect(c.release).toHaveBeenCalledTimes(1);
  });

  test('listar manda los filtros como parámetros', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ id_material: 1 }]]) };
    await crearRepoModeracion(pool).listar({ semestre: 2, estado: 'validado', idMateria: 3 });
    expect(pool.query.mock.calls[0][1]).toEqual([2, 2, 3, 3, 'validado', 'validado']);
    expect(pool.query.mock.calls[0][0]).toContain("m.estado <> 'eliminado'");
  });
});
