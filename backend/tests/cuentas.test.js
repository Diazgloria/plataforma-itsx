const { preparar, sembrar } = require('./ayudas');
const { validarAlta, validarEdicion, normalizarIds } = require('../src/servicios/cuentas');
const { cerrarSesionesDe } = require('../src/servicios/sesiones');
const { crearRepoCuentas } = require('../src/repositorios/cuentas');

const DOMINIO = 'itsx.edu.mx';

// Repositorio en memoria de las cuentas
function repoFalso() {
  const cuentas = [
    { id: 5, nombre: 'Ana', apellidos: 'Pérez', correo: 'ana@itsx.edu.mx', rol: 'estudiante', estado: 'activa', materiales: 2, materias: 0 },
    { id: 6, nombre: 'Luis', apellidos: 'Gómez', correo: 'luis@itsx.edu.mx', rol: 'docente', estado: 'activa', departamento: 'Calculo', materiales: 0, materias: 1 },
    { id: 7, nombre: 'Eva', apellidos: 'Ruiz', correo: 'eva@itsx.edu.mx', rol: 'estudiante', estado: 'suspendida', materiales: 0, materias: 0 },
    { id: 8, nombre: 'Ivo', apellidos: 'Sol', correo: 'ivo@itsx.edu.mx', rol: 'estudiante', estado: 'pendiente_verificacion', materiales: 0, materias: 0 },
  ];
  return {
    listar: jest.fn(async ({ rol }) => cuentas.filter((c) => c.rol === rol)),
    obtener: jest.fn(async (id) => cuentas.find((c) => c.id === id) || null),
    crear: jest.fn(async () => 40),
    actualizar: jest.fn(async () => {}),
    cambiarEstado: jest.fn(async () => {}),
    materiasDe: jest.fn(async () => [1, 2]),
    asignarMaterias: jest.fn(async (id, ids) => ids.length),
    eliminar: jest.fn(async (id) => (id === 5 ? 'en_uso' : 'ok')),
  };
}

async function conSesion(rol = 'administrador') {
  const c = await preparar();
  const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
  c.repos.cuentas = repoFalso();
  await c.iniciarSesion(usuario.correo_institucional);
  c.put = (ruta, datos) => c.agente.put(ruta).set('x-csrf-token', c.csrf).send(datos);
  c.del = (ruta) => c.agente.delete(ruta).set('x-csrf-token', c.csrf);
  c.usuario = usuario;
  return c;
}

const docenteNuevo = {
  rol: 'docente', nombre: 'Rosa', apellidos: 'Mena', correo: 'rosa@itsx.edu.mx', departamento: 'Sistemas', contrasena: 'Temporal1',
};

describe('reglas de las cuentas', () => {
  test('validarAlta acepta un docente completo y normaliza el correo', () => {
    const { errores, datos } = validarAlta({ ...docenteNuevo, correo: ' ROSA@ITSX.EDU.MX ' }, DOMINIO);
    expect(errores).toEqual([]);
    expect(datos.correo).toBe('rosa@itsx.edu.mx');
  });

  test.each([
    [{ rol: 'estudiante' }, 'docentes o administradores'],
    [{ correo: 'rosa@gmail.com' }, 'institucional'],
    [{ correo: 'no-es-correo' }, 'válido'],
    [{ departamento: '' }, 'departamento'],
    [{ contrasena: 'corta' }, 'contraseña'],
    [{ nombre: '' }, 'nombre'],
  ])('validarAlta rechaza %j', (cambio, texto) => {
    const { errores } = validarAlta({ ...docenteNuevo, ...cambio }, DOMINIO);
    expect(errores.join(' ')).toContain(texto);
  });

  test('un administrador no necesita departamento', () => {
    const { errores } = validarAlta({ ...docenteNuevo, rol: 'administrador', departamento: '' }, DOMINIO);
    expect(errores).toEqual([]);
  });

  test('validarEdicion exige departamento solo en docentes', () => {
    expect(validarEdicion({ nombre: 'A', apellidos: 'B' }, 'estudiante').errores).toEqual([]);
    expect(validarEdicion({ nombre: 'A', apellidos: 'B' }, 'docente').errores.join()).toContain('departamento');
  });

  test('normalizarIds quita repetidos y rechaza valores inválidos', () => {
    expect(normalizarIds([1, '2', 2])).toEqual([1, 2]);
    expect(normalizarIds([1, 'x'])).toBeNull();
    expect(normalizarIds([0])).toBeNull();
    expect(normalizarIds('1')).toBeNull();
    expect(normalizarIds([])).toEqual([]);
  });
});

describe('cerrarSesionesDe', () => {
  test('destruye solo las sesiones del usuario indicado', async () => {
    const destruidas = [];
    const sessionStore = {
      all: (cb) => cb(null, { a: { usuario: { id: 6 } }, b: { usuario: { id: 9 } }, c: {} }),
      destroy: (sid, cb) => { destruidas.push(sid); cb(); },
    };
    await cerrarSesionesDe({ sessionStore }, 6);
    expect(destruidas).toEqual(['a']);
  });

  test('no falla si el almacén no permite listar sesiones', async () => {
    await expect(cerrarSesionesDe({ sessionStore: {} }, 1)).resolves.toBeUndefined();
  });
});

describe('API de gestión de usuarios (PT-17)', () => {
  test('sin sesión 401; estudiante y docente 403', async () => {
    expect((await (await preparar()).agente.get('/api/cuentas')).status).toBe(401);
    for (const rol of ['estudiante', 'docente']) {
      const c = await conSesion(rol);
      expect((await c.agente.get('/api/cuentas')).status).toBe(403);
      expect((await c.post('/api/cuentas', docenteNuevo)).status).toBe(403);
    }
  });

  test('lista por rol (estudiantes por defecto) y valida el rol', async () => {
    const c = await conSesion();
    const est = await c.agente.get('/api/cuentas');
    expect(est.status).toBe(200);
    expect(est.body.cuentas.map((x) => x.id)).toEqual([5, 7, 8]);
    await c.agente.get('/api/cuentas?rol=docente&q=%20Luis%20');
    expect(c.repos.cuentas.listar).toHaveBeenLastCalledWith({ rol: 'docente', texto: 'Luis' });
    expect((await c.agente.get('/api/cuentas?rol=otro')).status).toBe(400);
  });

  test('registra un docente: guarda el hash, no la contraseña', async () => {
    const c = await conSesion();
    const r = await c.post('/api/cuentas', docenteNuevo);
    expect(r.status).toBe(201);
    const enviado = c.repos.cuentas.crear.mock.calls[0][0];
    expect(enviado.hash).toMatch(/^\$2[aby]\$/);
    expect(enviado.hash).not.toContain('Temporal1');
    expect(enviado).toMatchObject({ rol: 'docente', departamento: 'Sistemas' });
  });

  test('rechaza datos inválidos (400) y correo repetido (409)', async () => {
    const c = await conSesion();
    expect((await c.post('/api/cuentas', { ...docenteNuevo, contrasena: '123' })).status).toBe(400);
    expect(c.repos.cuentas.crear).not.toHaveBeenCalled();

    sembrar(c.repos, { correo: 'rosa@itsx.edu.mx', rol: 'docente' });
    expect((await c.post('/api/cuentas', docenteNuevo)).status).toBe(409);

    // el índice único de la base también se traduce a 409
    c.repos.cuentas.crear.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));
    expect((await c.post('/api/cuentas', { ...docenteNuevo, correo: 'otra@itsx.edu.mx' })).status).toBe(409);
  });

  test('edita una cuenta; 404 si no existe', async () => {
    const c = await conSesion();
    expect((await c.put('/api/cuentas/6', { nombre: 'Luis A.', apellidos: 'Gómez', departamento: 'Física' })).status).toBe(200);
    expect(c.repos.cuentas.actualizar).toHaveBeenCalledWith(6, { nombre: 'Luis A.', apellidos: 'Gómez', departamento: 'Física' });
    expect((await c.put('/api/cuentas/99', { nombre: 'X', apellidos: 'Y' })).status).toBe(404);
    expect((await c.put('/api/cuentas/6', { nombre: '', apellidos: 'Y', departamento: 'F' })).status).toBe(400);
  });

  test('suspende una cuenta activa y reactiva una suspendida', async () => {
    const c = await conSesion();
    expect((await c.post('/api/cuentas/5/estado', { estado: 'suspendida' })).status).toBe(200);
    expect(c.repos.cuentas.cambiarEstado).toHaveBeenLastCalledWith(5, 'suspendida');
    expect((await c.post('/api/cuentas/7/estado', { estado: 'activa' })).status).toBe(200);
    expect(c.repos.cuentas.cambiarEstado).toHaveBeenLastCalledWith(7, 'activa');
  });

  test('no suspende una cuenta ya suspendida, una pendiente ni reactiva una activa (409)', async () => {
    const c = await conSesion();
    expect((await c.post('/api/cuentas/7/estado', { estado: 'suspendida' })).status).toBe(409);
    expect((await c.post('/api/cuentas/8/estado', { estado: 'suspendida' })).status).toBe(409);
    expect((await c.post('/api/cuentas/5/estado', { estado: 'activa' })).status).toBe(409);
    expect((await c.post('/api/cuentas/5/estado', { estado: 'borrada' })).status).toBe(400);
    expect(c.repos.cuentas.cambiarEstado).not.toHaveBeenCalled();
  });

  test('el administrador no puede suspender ni eliminar su propia cuenta', async () => {
    const c = await conSesion();
    c.repos.cuentas.obtener.mockResolvedValue({ id: c.usuario.id_usuario, rol: 'administrador', estado: 'activa' });
    const s = await c.post(`/api/cuentas/${c.usuario.id_usuario}/estado`, { estado: 'suspendida' });
    expect(s.status).toBe(400);
    expect(s.body.error).toMatch(/propia/);
    expect((await c.del(`/api/cuentas/${c.usuario.id_usuario}`)).status).toBe(400);
    expect(c.repos.cuentas.cambiarEstado).not.toHaveBeenCalled();
    expect(c.repos.cuentas.eliminar).not.toHaveBeenCalled();
  });

  test('una cuenta suspendida no puede iniciar sesión', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'bloqueada@itsx.edu.mx', rol: 'docente', estado: 'suspendida' });
    const r = await c.iniciarSesion('bloqueada@itsx.edu.mx');
    expect(r.status).toBe(403);
    expect(r.body.error).toMatch(/suspendida/);
  });

  test('asigna materias a un docente y consulta las asignadas', async () => {
    const c = await conSesion();
    const g = await c.agente.get('/api/cuentas/6/materias');
    expect(g.body.materias).toEqual([1, 2]);
    const r = await c.put('/api/cuentas/6/materias', { materias: [1, '3', 3] });
    expect(r.status).toBe(200);
    expect(c.repos.cuentas.asignarMaterias).toHaveBeenCalledWith(6, [1, 3]);
    expect(r.body.asignadas).toBe(2);
  });

  test('las materias solo se asignan a docentes y con ids válidos', async () => {
    const c = await conSesion();
    expect((await c.put('/api/cuentas/5/materias', { materias: [1] })).status).toBe(409);
    expect((await c.agente.get('/api/cuentas/5/materias')).status).toBe(409);
    expect((await c.put('/api/cuentas/6/materias', { materias: ['x'] })).status).toBe(400);
    expect((await c.put('/api/cuentas/6/materias', {})).status).toBe(400);
    expect((await c.put('/api/cuentas/99/materias', { materias: [] })).status).toBe(404);
    expect(c.repos.cuentas.asignarMaterias).not.toHaveBeenCalled();
  });

  test('no elimina cuentas con actividad (409) pero sí las vacías', async () => {
    const c = await conSesion();
    const uso = await c.del('/api/cuentas/5');
    expect(uso.status).toBe(409);
    expect(uso.body.error).toMatch(/Suspéndela/);
    expect((await c.del('/api/cuentas/6')).status).toBe(200);
    expect(c.repos.cuentas.eliminar).toHaveBeenLastCalledWith(6);
    expect((await c.del('/api/cuentas/99')).status).toBe(404);
  });
});

describe('repositorio de cuentas', () => {
  test('listar escapa los comodines de la búsqueda y traduce las columnas', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{
      id_usuario: 5, nombre: 'Ana', apellidos: 'P', correo_institucional: 'a@x', rol: 'estudiante',
      estado_cuenta: 'activa', numero_control: '227O1', semestre: 3, materiales: '2', materias: '0',
    }]]) };
    const [c] = await crearRepoCuentas(pool).listar({ rol: 'estudiante', texto: '50%_a' });
    expect(c).toMatchObject({ id: 5, correo: 'a@x', estado: 'activa', matricula: '227O1', materiales: 2 });
    const params = pool.query.mock.calls[0][1];
    expect(params[0]).toBe('estudiante');
    expect(params[2]).toBe('%50\\%\\_a%');
  });

  test('asignarMaterias borra las activas, inserta las nuevas y confirma', async () => {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async (sql) => (sql.includes('INSERT') ? [{ affectedRows: 2 }] : [{}])),
    };
    const repo = crearRepoCuentas({ getConnection: jest.fn().mockResolvedValue(conexion) });
    expect(await repo.asignarMaterias(6, [1, 2])).toBe(2);
    expect(conexion.query.mock.calls[0][0]).toContain('DELETE dm');
    expect(conexion.query.mock.calls[1][1]).toEqual([6, [1, 2]]);
    expect(conexion.commit).toHaveBeenCalledTimes(1);
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test('asignarMaterias deshace todo si falla', async () => {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async (sql) => { if (sql.includes('INSERT')) throw new Error('fallo'); return [{}]; }),
    };
    const repo = crearRepoCuentas({ getConnection: jest.fn().mockResolvedValue(conexion) });
    await expect(repo.asignarMaterias(6, [1])).rejects.toThrow('fallo');
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test('eliminar con actividad previa devuelve en_uso y no borra nada', async () => {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async () => [[{ materiales: '1', validaciones: '0', descargas: '0' }]]),
    };
    const repo = crearRepoCuentas({ getConnection: jest.fn().mockResolvedValue(conexion) });
    expect(await repo.eliminar(5)).toBe('en_uso');
    expect(conexion.query).toHaveBeenCalledTimes(1);
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
  });

  test('eliminar sin actividad borra los datos dependientes y la cuenta', async () => {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async (sql) => (sql.includes('SELECT') ? [[{ materiales: '0', validaciones: '0', descargas: '0' }]] : [{}])),
    };
    const repo = crearRepoCuentas({ getConnection: jest.fn().mockResolvedValue(conexion) });
    expect(await repo.eliminar(9)).toBe('ok');
    const sqls = conexion.query.mock.calls.map(([s]) => s);
    expect(sqls.at(-1)).toContain('DELETE FROM usuario');
    expect(conexion.commit).toHaveBeenCalledTimes(1);
  });
});
