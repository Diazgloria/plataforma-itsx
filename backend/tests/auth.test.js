const { CLAVE, preparar, sembrar, tokenDelCorreo } = require('./ayudas');

const registroValido = {
  nombre: 'Gloria', apellidos: 'Dominguez Diaz', correo: 'gloria@itsx.edu.mx',
  numeroControl: 'PRUEBA0001', semestre: 1, contrasena: CLAVE,
};

describe('protección CSRF', () => {
  test('rechaza una petición que modifica datos sin token', async () => {
    const { agente } = await preparar();
    const r = await agente.post('/api/auth/registro').send(registroValido);
    expect(r.status).toBe(403);
  });
});

describe('registro de estudiantes', () => {
  test('crea la cuenta pendiente de verificación y guarda solo el hash de la contraseña', async () => {
    const c = await preparar();
    const r = await c.post('/api/auth/registro', registroValido);
    expect(r.status).toBe(201);
    const usuario = c.repos.datos[0];
    expect(usuario.estado_cuenta).toBe('pendiente_verificacion');
    expect(usuario.contrasena_hash).not.toBe(CLAVE);
    expect(usuario.contrasena_hash).toMatch(/^\$2[aby]\$/);
    expect(c.correo.enviar).toHaveBeenCalledTimes(1);
  });

  test('rechaza un correo que no es institucional', async () => {
    const c = await preparar();
    const r = await c.post('/api/auth/registro', { ...registroValido, correo: 'gloria@gmail.com' });
    expect(r.status).toBe(400);
  });

  test('rechaza una contraseña débil', async () => {
    const c = await preparar();
    const r = await c.post('/api/auth/registro', { ...registroValido, contrasena: 'abc' });
    expect(r.status).toBe(400);
    expect(c.repos.datos).toHaveLength(0);
  });

  test('rechaza un registro duplicado', async () => {
    const c = await preparar();
    await c.post('/api/auth/registro', registroValido);
    const r = await c.post('/api/auth/registro', registroValido);
    expect(r.status).toBe(409);
    expect(c.repos.datos).toHaveLength(1);
  });
});

describe('verificación de cuenta', () => {
  test('activa la cuenta con el enlace del correo y después permite entrar', async () => {
    const c = await preparar();
    await c.post('/api/auth/registro', registroValido);

    const antes = await c.iniciarSesion(registroValido.correo);
    expect(antes.status).toBe(403); // todavía pendiente

    const r = await c.post('/api/auth/verificar', { token: tokenDelCorreo(c.correo) });
    expect(r.status).toBe(200);
    expect(c.repos.datos[0].estado_cuenta).toBe('activa');

    const despues = await c.iniciarSesion(registroValido.correo);
    expect(despues.status).toBe(200);
  });

  test('rechaza un token alterado', async () => {
    const c = await preparar();
    await c.post('/api/auth/registro', registroValido);
    const alterado = tokenDelCorreo(c.correo).replace('verificacion.1.', 'verificacion.2.');
    const r = await c.post('/api/auth/verificar', { token: alterado });
    expect(r.status).toBe(400);
    expect(c.repos.datos[0].estado_cuenta).toBe('pendiente_verificacion');
  });
});

describe('inicio y cierre de sesión', () => {
  test('inicia sesión, consulta sus datos y cierra sesión', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno1@itsx.edu.mx' });

    expect((await c.agente.get('/api/auth/yo')).status).toBe(401);

    const login = await c.iniciarSesion('alumno1@itsx.edu.mx');
    expect(login.status).toBe(200);
    expect(login.body.usuario.rol).toBe('estudiante');

    const yo = await c.agente.get('/api/auth/yo');
    expect(yo.status).toBe(200);
    expect(yo.body.usuario.correo).toBe('alumno1@itsx.edu.mx');

    expect((await c.post('/api/auth/logout', {})).status).toBe(200);
    expect((await c.agente.get('/api/auth/yo')).status).toBe(401);
  });

  test('da el mismo mensaje con contraseña incorrecta y con correo inexistente', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno2@itsx.edu.mx' });
    const mala = await c.iniciarSesion('alumno2@itsx.edu.mx', 'Equivocada1');
    const inexistente = await c.iniciarSesion('nadie@itsx.edu.mx', 'Equivocada1');
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.body.error).toBe(inexistente.body.error);
  });

  test('bloquea la cuenta tras 5 intentos fallidos, aunque después llegue la contraseña correcta', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno3@itsx.edu.mx' });
    for (let i = 0; i < 5; i++) {
      expect((await c.iniciarSesion('alumno3@itsx.edu.mx', 'Equivocada1')).status).toBe(401);
    }
    const bloqueada = await c.iniciarSesion('alumno3@itsx.edu.mx', CLAVE);
    expect(bloqueada.status).toBe(429);
  });
});

describe('control de acceso por rol', () => {
  test('la ruta de administrador exige sesión y rol correcto', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno4@itsx.edu.mx' });
    sembrar(c.repos, { correo: 'admin@itsx.edu.mx', rol: 'administrador' });

    expect((await c.agente.get('/api/admin/resumen')).status).toBe(401);

    await c.iniciarSesion('alumno4@itsx.edu.mx');
    expect((await c.agente.get('/api/admin/resumen')).status).toBe(403);

    await c.post('/api/auth/logout', {});
    const { body } = await c.agente.get('/api/auth/csrf');
    c.csrf = body.token;
    await c.iniciarSesion('admin@itsx.edu.mx');
    expect((await c.agente.get('/api/admin/resumen')).status).toBe(200);
  });
});

describe('recuperación de contraseña', () => {
  test('responde igual exista o no el correo, y solo envía correo si existe', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno5@itsx.edu.mx' });
    const existe = await c.post('/api/auth/recuperar', { correo: 'alumno5@itsx.edu.mx' });
    const noExiste = await c.post('/api/auth/recuperar', { correo: 'nadie@itsx.edu.mx' });
    expect(existe.status).toBe(200);
    expect(existe.body.mensaje).toBe(noExiste.body.mensaje);
    expect(c.correo.enviar).toHaveBeenCalledTimes(1);
  });

  test('el enlace cambia la contraseña y solo sirve una vez', async () => {
    const c = await preparar();
    sembrar(c.repos, { correo: 'alumno6@itsx.edu.mx' });
    await c.post('/api/auth/recuperar', { correo: 'alumno6@itsx.edu.mx' });
    const token = tokenDelCorreo(c.correo);

    const debil = await c.post('/api/auth/restablecer', { token, contrasena: 'abc' });
    expect(debil.status).toBe(400);

    const ok = await c.post('/api/auth/restablecer', { token, contrasena: 'Nueva123*' });
    expect(ok.status).toBe(200);

    const repetido = await c.post('/api/auth/restablecer', { token, contrasena: 'Otra123456*' });
    expect(repetido.status).toBe(400);

    expect((await c.iniciarSesion('alumno6@itsx.edu.mx', CLAVE)).status).toBe(401);
    expect((await c.iniciarSesion('alumno6@itsx.edu.mx', 'Nueva123*')).status).toBe(200);
  });
});