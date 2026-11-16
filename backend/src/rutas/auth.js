const express = require('express');
const bcrypt = require('bcrypt');
const { validarRegistro, validarContrasena } = require('../servicios/validaciones');
const { crearToken, verificarToken, huellaContrasena } = require('../servicios/tokens');
const { obtenerTokenCsrf } = require('../middleware/seguridad');

const COSTO_BCRYPT = 10;
// Hash de relleno: se compara aunque el correo no exista, para que la respuesta tarde igual
const HASH_FALSO = bcrypt.hashSync('contrasena-de-relleno', COSTO_BCRYPT);

// Intentos fallidos por correo (en memoria): { cuenta, hasta }
const intentos = new Map();

// Cierra todas las sesiones activas de un usuario (si el almacén de sesiones lo permite)
function cerrarSesionesDe(req, idUsuario) {
  const almacen = req.sessionStore;
  if (!almacen || typeof almacen.all !== 'function') return Promise.resolve();
  return new Promise((resolver) => {
    almacen.all((err, sesiones) => {
      if (err || !sesiones) return resolver();
      Object.entries(sesiones).forEach(([sid, datos]) => {
        if (datos.usuario && datos.usuario.id === idUsuario) almacen.destroy(sid, () => {});
      });
      resolver();
    });
  });
}

module.exports = function ({ config, repos, correo }) {
  const router = express.Router();

  // RF-AUT-01: registro de estudiantes con correo institucional
  router.post('/registro', async (req, res) => {
    const { errores, datos } = validarRegistro(req.body, config.dominioCorreo);
    if (errores.length > 0) {
      return res.status(400).json({ error: 'Datos inválidos', detalles: errores });
    }

    if ((await repos.usuarios.buscarPorCorreo(datos.correo)) ||
        (await repos.usuarios.existeNumeroControl(datos.numeroControl))) {
      return res.status(409).json({ error: 'El correo o el número de control ya están registrados' });
    }

    // La contraseña nunca se guarda en texto claro (RNF-SEG-01)
    const hash = await bcrypt.hash(datos.contrasena, COSTO_BCRYPT);
    try {
      const idUsuario = await repos.usuarios.crearEstudiante({
        nombre: datos.nombre,
        apellidos: datos.apellidos,
        correo: datos.correo,
        hash,
        numeroControl: datos.numeroControl,
        semestre: datos.semestre,
      });
            // RF-AUT-03: enlace de verificación con vigencia de 24 horas
      const token = crearToken({
        proposito: 'verificacion',
        idUsuario,
        vigenciaMs: config.vigenciaVerificacionMs,
        secreto: config.secreto,
      });
      const enlace = `http://localhost:${config.puerto}/verificar.html?token=${encodeURIComponent(token)}`;
      await correo.enviar({
        para: datos.correo,
        asunto: 'Verifica tu cuenta en la Plataforma ITSX',
        texto: `Hola ${datos.nombre}, activa tu cuenta (vigencia de 24 horas) en: ${enlace}`,
      });

      const respuesta = {
        mensaje: 'Cuenta creada. Revisa tu correo institucional para activarla.',
        idUsuario,
      };
      // Solo en desarrollo se devuelve el enlace, porque el correo es simulado
      if (config.entorno !== 'production') respuesta.enlaceVerificacion = enlace;
      return res.status(201).json(respuesta);

    } catch (err) {
      // Dos registros simultáneos con los mismos datos
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El correo o el número de control ya están registrados' });
      }
      throw err;
    }
  });

    // RF-AUT-03: activación de la cuenta con el enlace enviado por correo
  router.post('/verificar', async (req, res) => {
    const resultado = verificarToken((req.body || {}).token, config.secreto, 'verificacion');
    if (!resultado.valido) {
      const texto = resultado.motivo === 'expirado'
        ? 'El enlace de verificación expiró (vigencia de 24 horas).'
        : 'El enlace de verificación no es válido.';
      return res.status(400).json({ error: texto });
    }

    const usuario = await repos.usuarios.buscarPorId(resultado.idUsuario);
    if (!usuario) return res.status(400).json({ error: 'El enlace de verificación no es válido.' });
    if (usuario.estado_cuenta === 'suspendida') {
      return res.status(403).json({ error: 'La cuenta está suspendida. Contacta al administrador.' });
    }
    if (usuario.estado_cuenta === 'activa') {
      return res.json({ mensaje: 'Tu cuenta ya estaba activa. Ya puedes iniciar sesión.' });
    }

    await repos.usuarios.activarCuenta(usuario.id_usuario);
    return res.json({ mensaje: 'Cuenta activada correctamente. Ya puedes iniciar sesión.' });
  });

    // El frontend pide este token antes de enviar formularios
  router.get('/csrf', (req, res) => {
    res.json({ token: obtenerTokenCsrf(req) });
  });

    // RF-AUT-04 y RF-AUT-05: inicio de sesión con bloqueo tras intentos fallidos
  router.post('/login', async (req, res) => {
    const cuerpo = req.body || {};
    const correo = String(cuerpo.correo || '').trim().toLowerCase();
    const contrasena = String(cuerpo.contrasena || '');
    if (!correo || !contrasena) {
      return res.status(400).json({ error: 'Ingresa tu correo y tu contraseña.' });
    }

    const registro = intentos.get(correo);
    if (registro && registro.hasta) {
      if (registro.hasta > Date.now()) {
        const minutos = Math.ceil((registro.hasta - Date.now()) / 60000);
        return res.status(429).json({
          error: `Cuenta bloqueada por intentos fallidos. Intenta de nuevo en ${minutos} minuto(s).`,
        });
      }
      intentos.delete(correo); // el bloqueo ya venció
    }

    const usuario = await repos.usuarios.buscarPorCorreo(correo);
    const coincide = await bcrypt.compare(contrasena, usuario ? usuario.contrasena_hash : HASH_FALSO);

    if (!usuario || !coincide) {
      const actual = intentos.get(correo) || { cuenta: 0, hasta: 0 };
      actual.cuenta += 1;
      if (actual.cuenta >= config.bloqueo.maxIntentos) {
        actual.hasta = Date.now() + config.bloqueo.duracionMs;
        actual.cuenta = 0;
      }
      intentos.set(correo, actual);
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    if (usuario.estado_cuenta === 'pendiente_verificacion') {
      return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión.' });
    }
    if (usuario.estado_cuenta === 'suspendida') {
      return res.status(403).json({ error: 'La cuenta está suspendida. Contacta al administrador.' });
    }

    intentos.delete(correo);
    // Sesión nueva al autenticarse (evita fijación de sesión)
    await new Promise((ok, fallo) => req.session.regenerate((e) => (e ? fallo(e) : ok())));
    req.session.usuario = {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      correo: usuario.correo_institucional,
      rol: usuario.rol,
      semestre: usuario.semestre,
    };
    return res.json({ usuario: req.session.usuario, csrf: obtenerTokenCsrf(req) });
  });

  // Cierre de sesión (RF-AUT-06)
  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.json({ mensaje: 'Sesión cerrada.' });
    });
  });

  // Datos del usuario con sesión activa
  router.get('/yo', (req, res) => {
    if (!req.session.usuario) return res.status(401).json({ error: 'No has iniciado sesión.' });
    return res.json({ usuario: req.session.usuario });
  });

    // Solicitud de recuperación: la respuesta es la misma exista o no el correo,
  // para no revelar qué cuentas están registradas
  router.post('/recuperar', async (req, res) => {
    const direccion = String((req.body || {}).correo || '').trim().toLowerCase();
    if (!direccion) return res.status(400).json({ error: 'Escribe tu correo institucional.' });

    const respuesta = { mensaje: 'Si el correo está registrado, recibirás un enlace con vigencia de 1 hora.' };
    const usuario = await repos.usuarios.buscarPorCorreo(direccion);
    if (usuario && usuario.estado_cuenta === 'activa') {
      const token = crearToken({
        proposito: 'recuperacion',
        idUsuario: usuario.id_usuario,
        vigenciaMs: config.vigenciaRecuperacionMs,
        secreto: config.secreto,
        extra: huellaContrasena(usuario.contrasena_hash),
      });
      const enlace = `http://localhost:${config.puerto}/restablecer.html?token=${encodeURIComponent(token)}`;
      await correo.enviar({
        para: usuario.correo_institucional,
        asunto: 'Recupera tu contraseña en la Plataforma ITSX',
        texto: `Para restablecer tu contraseña (vigencia de 1 hora) entra a: ${enlace}`,
      });
      if (config.entorno !== 'production') respuesta.enlaceRecuperacion = enlace;
    }
    return res.json(respuesta);
  });

  // Establece la nueva contraseña con el enlace recibido
  router.post('/restablecer', async (req, res) => {
    const cuerpo = req.body || {};
    const invalido = () => res.status(400).json({
      error: 'El enlace no es válido, ya fue utilizado o expiró (vigencia de 1 hora).',
    });

    const resultado = verificarToken(cuerpo.token, config.secreto, 'recuperacion');
    if (!resultado.valido) return invalido();

    const usuario = await repos.usuarios.buscarPorId(resultado.idUsuario);
    // El enlace sirve una sola vez: deja de valer en cuanto cambia la contraseña
    if (!usuario || usuario.estado_cuenta !== 'activa' ||
        resultado.extra !== huellaContrasena(usuario.contrasena_hash)) {
      return invalido();
    }

    const faltantes = validarContrasena(cuerpo.contrasena);
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: 'Datos inválidos',
        detalles: [`La contraseña debe tener: ${faltantes.join(', ')}.`],
      });
    }

    const hash = await bcrypt.hash(cuerpo.contrasena, COSTO_BCRYPT);
    await repos.usuarios.actualizarContrasena(usuario.id_usuario, hash);
    intentos.delete(usuario.correo_institucional.toLowerCase()); // se quita un bloqueo previo
    await cerrarSesionesDe(req, usuario.id_usuario);              // se cierran las sesiones abiertas
    return res.json({ mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.' });
  });
  return router;
};