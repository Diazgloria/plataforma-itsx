const { preparar, sembrar } = require('./ayudas');

async function conSesion(rol = 'estudiante') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.favoritos = {
    listar: jest.fn().mockResolvedValue([{ id_material: 2, titulo: 'Resumen de matrices', id_materia: 2 }]),
    materialValidado: jest.fn().mockResolvedValue(true),
    agregar: jest.fn().mockResolvedValue(),
    quitar: jest.fn().mockResolvedValue(),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.eliminar = (ruta) => c.agente.delete(ruta).set('x-csrf-token', c.csrf);
  c.usuario = usuario;
  return c;
}

describe('favoritos', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    expect((await c.agente.get('/api/favoritos')).status).toBe(401);
  });

  test('un docente no tiene favoritos (403)', async () => {
    const c = await conSesion('docente');
    expect((await c.get('/api/favoritos')).status).toBe(403);
  });

  test('el estudiante lista sus favoritos', async () => {
    const c = await conSesion();
    const r = await c.get('/api/favoritos');
    expect(r.status).toBe(200);
    expect(r.body.favoritos).toHaveLength(1);
    expect(c.repos.favoritos.listar).toHaveBeenCalledWith(c.usuario.id_usuario, null);
  });

  test('puede filtrar por materia', async () => {
    const c = await conSesion();
    await c.get('/api/favoritos?materia=2');
    expect(c.repos.favoritos.listar).toHaveBeenCalledWith(c.usuario.id_usuario, 2);
  });

  test('una materia inválida da 400', async () => {
    const c = await conSesion();
    expect((await c.get('/api/favoritos?materia=abc')).status).toBe(400);
  });

  test('marca como favorito un material validado', async () => {
    const c = await conSesion();
    const r = await c.post('/api/favoritos/2', {});
    expect(r.status).toBe(201);
    expect(c.repos.favoritos.agregar).toHaveBeenCalledWith(c.usuario.id_usuario, 2);
  });

  test('no permite marcar un material que no está validado (404)', async () => {
    const c = await conSesion();
    c.repos.favoritos.materialValidado.mockResolvedValue(false);
    const r = await c.post('/api/favoritos/9', {});
    expect(r.status).toBe(404);
    expect(c.repos.favoritos.agregar).not.toHaveBeenCalled();
  });

  test('un identificador no válido da 400', async () => {
    const c = await conSesion();
    expect((await c.post('/api/favoritos/abc', {})).status).toBe(400);
  });

  test('quita un favorito del usuario de la sesión', async () => {
    const c = await conSesion();
    const r = await c.eliminar('/api/favoritos/2');
    expect(r.status).toBe(200);
    expect(c.repos.favoritos.quitar).toHaveBeenCalledWith(c.usuario.id_usuario, 2);
  });
});
