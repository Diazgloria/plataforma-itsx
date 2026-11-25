const { preparar, sembrar } = require('./ayudas');

async function conSesion(rol = 'estudiante') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.notificaciones = {
    listar: jest.fn().mockResolvedValue([
      { id_notificacion: 1, id_material: 7, tipo: 'material_validado', mensaje: 'Tu material fue validado.', leida: false },
    ]),
    contarNoLeidas: jest.fn().mockResolvedValue(3),
    marcarTodasLeidas: jest.fn().mockResolvedValue(),
    marcarLeida: jest.fn().mockResolvedValue(),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.usuario = usuario;
  return c;
}

describe('notificaciones', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    expect((await c.agente.get('/api/notificaciones')).status).toBe(401);
    expect((await c.agente.get('/api/notificaciones/contador')).status).toBe(401);
  });

  test.each(['estudiante', 'docente', 'administrador'])('el rol %s ve sus propios avisos', async (rol) => {
    const c = await conSesion(rol);
    const r = await c.get('/api/notificaciones');
    expect(r.status).toBe(200);
    expect(r.body.notificaciones).toHaveLength(1);
    expect(c.repos.notificaciones.listar).toHaveBeenCalledWith(c.usuario.id_usuario, false);
  });

  test('el filtro no_leidas pide solo los avisos sin leer', async () => {
    const c = await conSesion();
    await c.get('/api/notificaciones?filtro=no_leidas');
    expect(c.repos.notificaciones.listar).toHaveBeenCalledWith(c.usuario.id_usuario, true);
  });

  test('el contador devuelve cuántos avisos hay sin leer', async () => {
    const c = await conSesion();
    const r = await c.get('/api/notificaciones/contador');
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(3);
  });

  test('marcar todas como leídas actúa sobre el usuario de la sesión', async () => {
    const c = await conSesion();
    const r = await c.post('/api/notificaciones/leer-todas', {});
    expect(r.status).toBe(200);
    expect(c.repos.notificaciones.marcarTodasLeidas).toHaveBeenCalledWith(c.usuario.id_usuario);
  });

  test('marcar un aviso como leído usa el usuario de la sesión', async () => {
    const c = await conSesion();
    const r = await c.post('/api/notificaciones/1/leer', {});
    expect(r.status).toBe(200);
    expect(c.repos.notificaciones.marcarLeida).toHaveBeenCalledWith(c.usuario.id_usuario, 1);
  });

  test('un identificador no válido da 400 y no marca nada', async () => {
    const c = await conSesion();
    const r = await c.post('/api/notificaciones/abc/leer', {});
    expect(r.status).toBe(400);
    expect(c.repos.notificaciones.marcarLeida).not.toHaveBeenCalled();
  });

  test('marcar como leídas sin token CSRF se rechaza', async () => {
    const c = await conSesion();
    expect((await c.agente.post('/api/notificaciones/leer-todas')).status).toBe(403);
  });
});
