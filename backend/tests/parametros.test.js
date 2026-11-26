const { preparar, sembrar } = require('./ayudas');
const configGlobal = require('../src/config');
const {
  PARAMETROS, validarValores, valoresPorDefecto, aplicarAConfig, cargarParametros,
} = require('../src/servicios/parametros');
const { crearRepoParametros } = require('../src/repositorios/parametros');

const copiaConfig = () => ({ tamanoMaximoBytes: 0, bloqueo: { maxIntentos: 0, duracionMs: 0 }, sesion: { inactividadMs: 0 } });

describe('reglas de los parámetros', () => {
  test('acepta enteros dentro de rango, incluso escritos como texto', () => {
    const { errores, datos } = validarValores({ tamano_maximo_mb: '10', intentos_login: 4 });
    expect(errores).toEqual([]);
    expect(datos).toEqual({ tamano_maximo_mb: 10, intentos_login: 4 });
  });

  test.each([
    [{ tamano_maximo_mb: 0 }, 'entre 1 y 50'],
    [{ tamano_maximo_mb: 51 }, 'entre 1 y 50'],
    [{ intentos_login: 2 }, 'entre 3 y 10'],
    [{ bloqueo_minutos: 1.5 }, 'entero'],
    [{ sesion_inactividad_min: 'abc' }, 'entre 5 y 240'],
    [{ inventado: 3 }, 'no existe'],
    [{}, 'ningún parámetro'],
    [null, 'ningún parámetro'],
  ])('rechaza %j', (valores, texto) => {
    expect(validarValores(valores).errores.join(' ')).toContain(texto);
  });

  test('los valores por defecto están dentro de su propio rango', () => {
    const { errores } = validarValores(valoresPorDefecto());
    expect(errores).toEqual([]);
    expect(valoresPorDefecto().tamano_maximo_mb).toBe(20);
  });

  test('aplicarAConfig convierte las unidades', () => {
    const config = copiaConfig();
    aplicarAConfig(config, { tamano_maximo_mb: 5, intentos_login: 4, bloqueo_minutos: 10, sesion_inactividad_min: 20 });
    expect(config.tamanoMaximoBytes).toBe(5 * 1024 * 1024);
    expect(config.bloqueo).toEqual({ maxIntentos: 4, duracionMs: 600000 });
    expect(config.sesion.inactividadMs).toBe(1200000);
  });

  test('cargarParametros aplica lo guardado e ignora claves desconocidas o fuera de rango', async () => {
    const config = copiaConfig();
    const repo = { listar: async () => [
      { clave: 'intentos_login', valor: '7' }, { clave: 'bloqueo_minutos', valor: '999' }, { clave: 'otra', valor: '1' },
    ] };
    const aplicados = await cargarParametros(repo, config);
    expect(aplicados).toEqual({ intentos_login: 7 });
    expect(config.bloqueo.maxIntentos).toBe(7);
    expect(config.bloqueo.duracionMs).toBe(0); // 999 está fuera de rango: no se aplicó
  });

  test('si la tabla no existe se conserva la configuración y no se detiene el arranque', async () => {
    const config = copiaConfig();
    const registro = { warn: jest.fn() };
    const r = await cargarParametros({ listar: async () => { throw new Error("Table doesn't exist"); } }, config, registro);
    expect(r).toEqual({});
    expect(registro.warn).toHaveBeenCalled();
  });
});

describe('API de parámetros del sistema (PT-20)', () => {
  const respaldo = { ...configGlobal.bloqueo };
  afterEach(() => { Object.assign(configGlobal.bloqueo, respaldo); });

  async function conSesion(rol = 'administrador') {
    const c = await preparar();
    const usuario = sembrar(c.repos, { correo: `${rol}@itsx.edu.mx`, rol });
    c.repos.parametros = {
      listar: jest.fn().mockResolvedValue([{ clave: 'tamano_maximo_mb', valor: '10' }]),
      guardar: jest.fn().mockResolvedValue(undefined),
    };
    await c.iniciarSesion(usuario.correo_institucional);
    c.put = (ruta, datos) => c.agente.put(ruta).set('x-csrf-token', c.csrf).send(datos);
    return c;
  }

  test('sin sesión 401; estudiante y docente 403', async () => {
    expect((await (await preparar()).agente.get('/api/parametros')).status).toBe(401);
    for (const rol of ['estudiante', 'docente']) {
      const c = await conSesion(rol);
      expect((await c.agente.get('/api/parametros')).status).toBe(403);
      expect((await c.put('/api/parametros', { valores: { intentos_login: 4 } })).status).toBe(403);
      expect((await c.post('/api/parametros/restablecer', {})).status).toBe(403);
    }
  });

  test('lista los cuatro parámetros: el guardado y los demás con su valor por defecto', async () => {
    const c = await conSesion();
    const r = await c.agente.get('/api/parametros');
    expect(r.status).toBe(200);
    expect(r.body.parametros.map((p) => p.clave)).toEqual(Object.keys(PARAMETROS));
    const porClave = Object.fromEntries(r.body.parametros.map((p) => [p.clave, p]));
    expect(porClave.tamano_maximo_mb.valor).toBe(10);
    expect(porClave.intentos_login.valor).toBe(5);
    expect(porClave.sesion_inactividad_min.reinicio).toBe(true);
  });

  test('guarda y aplica de inmediato los intentos de inicio de sesión', async () => {
    const c = await conSesion();
    const r = await c.put('/api/parametros', { valores: { intentos_login: 3, bloqueo_minutos: 2 } });
    expect(r.status).toBe(200);
    expect(r.body.requiere_reinicio).toBe(false);
    expect(c.repos.parametros.guardar).toHaveBeenCalledWith({ intentos_login: 3, bloqueo_minutos: 2 });
    expect(configGlobal.bloqueo.maxIntentos).toBe(3);
    expect(configGlobal.bloqueo.duracionMs).toBe(120000);
  });

  test('cambiar la inactividad de sesión avisa que requiere reinicio', async () => {
    const c = await conSesion();
    const r = await c.put('/api/parametros', { valores: { sesion_inactividad_min: 45 } });
    expect(r.body.requiere_reinicio).toBe(true);
  });

  test('un valor fuera de rango responde 400 y no guarda nada', async () => {
    const c = await conSesion();
    const r = await c.put('/api/parametros', { valores: { tamano_maximo_mb: 500 } });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/entre 1 y 50/);
    expect(c.repos.parametros.guardar).not.toHaveBeenCalled();
  });

  test('restablecer guarda los valores por defecto', async () => {
    const c = await conSesion();
    const r = await c.post('/api/parametros/restablecer', {});
    expect(r.status).toBe(200);
    expect(c.repos.parametros.guardar).toHaveBeenCalledWith(valoresPorDefecto());
  });

  test('el nuevo tamaño máximo se aplica a la siguiente subida sin reiniciar', async () => {
    const admin = await conSesion();
    expect((await admin.put('/api/parametros', { valores: { tamano_maximo_mb: 1 } })).status).toBe(200);

    const e = await preparar();
    const estudiante = sembrar(e.repos, { correo: 'est@itsx.edu.mx', rol: 'estudiante' });
    await e.iniciarSesion(estudiante.correo_institucional);
    const r = await e.agente.post('/api/materiales').set('x-csrf-token', e.csrf)
      .field('titulo', 'Grande').field('idMateria', '1')
      .attach('archivo', Buffer.alloc(1.5 * 1024 * 1024, 1), { filename: 'grande.pdf', contentType: 'application/pdf' });
    expect(r.status).toBe(413);
    expect(r.body.error).toMatch(/1 MB/);

    await admin.put('/api/parametros', { valores: { tamano_maximo_mb: 20 } }); // restaura para las demás pruebas
  });
});

describe('repositorio de parámetros', () => {
  function pool(afectadas) {
    const conexion = {
      beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn(),
      query: jest.fn(async (sql) => (sql.startsWith('UPDATE') ? [{ affectedRows: afectadas }] : [{}])),
    };
    return { conexion, getConnection: jest.fn().mockResolvedValue(conexion) };
  }

  test('guardar actualiza cada clave en una transacción', async () => {
    const p = pool(1);
    await crearRepoParametros(p).guardar({ intentos_login: 4, bloqueo_minutos: 10 });
    expect(p.conexion.query.mock.calls.map(([, v]) => v)).toEqual([['4', 'intentos_login'], ['10', 'bloqueo_minutos']]);
    expect(p.conexion.commit).toHaveBeenCalledTimes(1);
    expect(p.conexion.release).toHaveBeenCalledTimes(1);
  });

  test('guardar crea la fila si la clave no existía', async () => {
    const p = pool(0);
    await crearRepoParametros(p).guardar({ intentos_login: 4 });
    expect(p.conexion.query.mock.calls[1][0]).toContain('INSERT INTO parametro_sistema');
  });

  test('si algo falla se deshace todo', async () => {
    const p = pool(1);
    p.conexion.query.mockRejectedValue(new Error('fallo'));
    await expect(crearRepoParametros(p).guardar({ intentos_login: 4 })).rejects.toThrow('fallo');
    expect(p.conexion.rollback).toHaveBeenCalledTimes(1);
    expect(p.conexion.commit).not.toHaveBeenCalled();
  });
});
