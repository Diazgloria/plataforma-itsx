const { preparar, sembrar } = require('./ayudas');

async function conSesion(rol = 'docente') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.docentes = {
    materiasAsignadas: jest.fn().mockResolvedValue([
      { id_materia: 1, clave: 'ACF0902', nombre: 'Cálculo Integral', semestre: 2, pendientes: 1, validados: 0 },
    ]),
  };
  await c.iniciarSesion(usuario.correo_institucional);
  c.get = (ruta) => c.agente.get(ruta);
  c.usuario = usuario;
  return c;
}

describe('materias asignadas del docente', () => {
  test('sin sesión responde 401', async () => {
    const c = await preparar();
    expect((await c.agente.get('/api/docente/materias')).status).toBe(401);
  });

  test('un estudiante no puede consultarlas (403)', async () => {
    const c = await conSesion('estudiante');
    expect((await c.get('/api/docente/materias')).status).toBe(403);
  });

  test('el docente ve sus materias con los contadores de pendientes y validados', async () => {
    const c = await conSesion();
    const r = await c.get('/api/docente/materias');
    expect(r.status).toBe(200);
    expect(r.body.materias[0]).toMatchObject({ clave: 'ACF0902', pendientes: 1, validados: 0 });
    expect(c.repos.docentes.materiasAsignadas).toHaveBeenCalledWith(c.usuario.id_usuario, null);
  });

  test('filtra por semestre', async () => {
    const c = await conSesion();
    await c.get('/api/docente/materias?semestre=2');
    expect(c.repos.docentes.materiasAsignadas).toHaveBeenCalledWith(c.usuario.id_usuario, 2);
  });

  test.each(['0', '9', 'abc', '1.5'])('el semestre %s es inválido (400)', async (valor) => {
    const c = await conSesion();
    expect((await c.get(`/api/docente/materias?semestre=${valor}`)).status).toBe(400);
  });
});
