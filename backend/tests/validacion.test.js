const { preparar, sembrar } = require('./ayudas');

// Cliente con un docente (o el rol indicado) con sesión iniciada y repositorios de validación simulados
async function conSesion(rol) {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.validaciones = {
    listarPendientes: jest.fn().mockResolvedValue([{ id_material: 1, titulo: 'Apuntes' }]),
    obtenerPendiente: jest.fn().mockResolvedValue({ id_material: 1, titulo: 'Apuntes' }),
    registrarDecision: jest.fn().mockResolvedValue({ codigo: 'ITSX-AAAA-BBBB-01', titulo: 'Apuntes' }),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.usuario = usuario;
  return c;
}

describe('acceso a la validación', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    c.repos.validaciones = { listarPendientes: jest.fn() };
    const r = await c.agente.get('/api/validacion/pendientes');
    expect(r.status).toBe(401);
  });

  test('un estudiante no puede ver la cola ni decidir (403)', async () => {
    const c = await conSesion('estudiante');
    expect((await c.get('/api/validacion/pendientes')).status).toBe(403);
    expect((await c.post('/api/validacion/1/decision', { decision: 'aprobado' })).status).toBe(403);
    expect(c.repos.validaciones.registrarDecision).not.toHaveBeenCalled();
  });

  test('decidir sin token CSRF se rechaza', async () => {
    const c = await conSesion('docente');
    const r = await c.agente.post('/api/validacion/1/decision').send({ decision: 'aprobado' });
    expect(r.status).toBe(403);
  });
});

describe('cola y detalle del docente', () => {
  test('lista los pendientes del docente que inició sesión', async () => {
    const c = await conSesion('docente');
    const r = await c.get('/api/validacion/pendientes');
    expect(r.status).toBe(200);
    expect(r.body.materiales).toHaveLength(1);
    expect(c.repos.validaciones.listarPendientes).toHaveBeenCalledWith(c.usuario.id_usuario);
  });

  test('un identificador no numérico da 400', async () => {
    const c = await conSesion('docente');
    expect((await c.get('/api/validacion/abc')).status).toBe(400);
  });

  test('si el material no está pendiente o no es de sus materias da 404', async () => {
    const c = await conSesion('docente');
    c.repos.validaciones.obtenerPendiente.mockResolvedValue(null);
    expect((await c.get('/api/validacion/5')).status).toBe(404);
  });

  test('devuelve el detalle de un material pendiente', async () => {
    const c = await conSesion('docente');
    const r = await c.get('/api/validacion/1');
    expect(r.status).toBe(200);
    expect(r.body.material.titulo).toBe('Apuntes');
  });
});

describe('decisión del docente', () => {
  test('aprobar devuelve el código de validación', async () => {
    const c = await conSesion('docente');
    const r = await c.post('/api/validacion/1/decision', { decision: 'aprobado' });
    expect(r.status).toBe(200);
    expect(r.body.codigo).toBe('ITSX-AAAA-BBBB-01');
    expect(c.repos.validaciones.registrarDecision).toHaveBeenCalledWith(
      expect.objectContaining({ idMaterial: 1, idDocente: c.usuario.id_usuario, decision: 'aprobado' })
    );
  });

  test('rechazar sin comentario da 400 y no registra nada', async () => {
    const c = await conSesion('docente');
    const r = await c.post('/api/validacion/1/decision', { decision: 'rechazado', comentario: '  ' });
    expect(r.status).toBe(400);
    expect(c.repos.validaciones.registrarDecision).not.toHaveBeenCalled();
  });

  test('rechazar con comentario no devuelve código', async () => {
    const c = await conSesion('docente');
    c.repos.validaciones.registrarDecision.mockResolvedValue({ codigo: null, titulo: 'Apuntes' });
    const r = await c.post('/api/validacion/1/decision', { decision: 'rechazado', comentario: 'Falta bibliografía' });
    expect(r.status).toBe(200);
    expect(r.body.codigo).toBeNull();
  });

  test('una decisión inválida da 400', async () => {
    const c = await conSesion('docente');
    expect((await c.post('/api/validacion/1/decision', { decision: 'quizas' })).status).toBe(400);
  });

  test('si el material ya no está pendiente da 404', async () => {
    const c = await conSesion('docente');
    c.repos.validaciones.registrarDecision.mockResolvedValue(null);
    expect((await c.post('/api/validacion/1/decision', { decision: 'aprobado' })).status).toBe(404);
  });
});
