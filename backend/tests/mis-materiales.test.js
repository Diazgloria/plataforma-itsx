const { preparar, sembrar } = require('./ayudas');

async function conSesion(rol = 'estudiante') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.misMateriales = {
    listarDelAutor: jest.fn().mockResolvedValue([
      { id_material: 1, titulo: 'Validado', estado: 'validado' },
      { id_material: 2, titulo: 'Rechazado', estado: 'rechazado' },
    ]),
    obtenerDelAutor: jest.fn().mockResolvedValue({ id_material: 2, estado: 'rechazado' }),
    actualizarDatos: jest.fn().mockResolvedValue(),
    eliminarLogico: jest.fn().mockResolvedValue(),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.put = (ruta, datos) => c.agente.put(ruta).set('x-csrf-token', c.csrf).send(datos);
  c.eliminar = (ruta) => c.agente.delete(ruta).set('x-csrf-token', c.csrf);
  c.usuario = usuario;
  return c;
}

describe('acceso', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    expect((await c.agente.get('/api/mis-materiales')).status).toBe(401);
  });

  test('un docente no puede usar la pantalla de materiales del estudiante (403)', async () => {
    const c = await conSesion('docente');
    expect((await c.get('/api/mis-materiales')).status).toBe(403);
  });
});

describe('listar', () => {
  test('marca qué materiales se pueden editar y eliminar según su estado', async () => {
    const c = await conSesion();
    const r = await c.get('/api/mis-materiales');
    expect(r.status).toBe(200);
    expect(c.repos.misMateriales.listarDelAutor).toHaveBeenCalledWith(c.usuario.id_usuario);
    const [validado, rechazado] = r.body.materiales;
    expect(validado).toMatchObject({ puede_editar: false, puede_eliminar: true });
    expect(rechazado).toMatchObject({ puede_editar: true, puede_eliminar: true });
  });
});

describe('editar', () => {
  test('guarda los datos de un material rechazado', async () => {
    const c = await conSesion();
    const r = await c.put('/api/mis-materiales/2', { titulo: 'Nuevo título', descripcion: 'Texto' });
    expect(r.status).toBe(200);
    expect(c.repos.misMateriales.actualizarDatos).toHaveBeenCalledWith(
      expect.objectContaining({ idMaterial: 2, idAutor: c.usuario.id_usuario, titulo: 'Nuevo título' })
    );
  });

  test('un título vacío da 400 y no guarda', async () => {
    const c = await conSesion();
    const r = await c.put('/api/mis-materiales/2', { titulo: ' ' });
    expect(r.status).toBe(400);
    expect(c.repos.misMateriales.actualizarDatos).not.toHaveBeenCalled();
  });

  test('un material validado no se puede editar (409)', async () => {
    const c = await conSesion();
    c.repos.misMateriales.obtenerDelAutor.mockResolvedValue({ id_material: 1, estado: 'validado' });
    const r = await c.put('/api/mis-materiales/1', { titulo: 'Otro' });
    expect(r.status).toBe(409);
    expect(c.repos.misMateriales.actualizarDatos).not.toHaveBeenCalled();
  });

  test('un material ajeno o inexistente da 404', async () => {
    const c = await conSesion();
    c.repos.misMateriales.obtenerDelAutor.mockResolvedValue(null);
    expect((await c.put('/api/mis-materiales/99', { titulo: 'Otro' })).status).toBe(404);
  });

  test('un identificador inválido da 400', async () => {
    const c = await conSesion();
    expect((await c.put('/api/mis-materiales/abc', { titulo: 'Otro' })).status).toBe(400);
  });
});

describe('eliminar (lógico)', () => {
  test('elimina un material propio', async () => {
    const c = await conSesion();
    const r = await c.eliminar('/api/mis-materiales/2');
    expect(r.status).toBe(200);
    expect(c.repos.misMateriales.eliminarLogico).toHaveBeenCalledWith(2, c.usuario.id_usuario);
  });

  test('un material ajeno o ya eliminado da 404', async () => {
    const c = await conSesion();
    c.repos.misMateriales.obtenerDelAutor.mockResolvedValue(null);
    const r = await c.eliminar('/api/mis-materiales/2');
    expect(r.status).toBe(404);
    expect(c.repos.misMateriales.eliminarLogico).not.toHaveBeenCalled();
  });

  test('un material retirado no se puede eliminar (409)', async () => {
    const c = await conSesion();
    c.repos.misMateriales.obtenerDelAutor.mockResolvedValue({ id_material: 2, estado: 'retirado' });
    expect((await c.eliminar('/api/mis-materiales/2')).status).toBe(409);
  });
});
