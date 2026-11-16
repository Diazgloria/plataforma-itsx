// Utilidades compartidas por las pruebas de la API: repositorios en memoria (sin base de datos).
const request = require('supertest');
const bcrypt = require('bcrypt');
const { crearApp } = require('../src/app');
const configBase = require('../src/config');

const CLAVE = 'Prueba123*';
const HASH = bcrypt.hashSync(CLAVE, 4); // costo bajo para que las pruebas sean rápidas

const config = { ...configBase, entorno: 'test', secreto: 'secreto-de-pruebas', dominioCorreo: 'itsx.edu.mx' };

function crearRepos() {
  const usuarios = [];
  let siguiente = 1;
  return {
    datos: usuarios,
    usuarios: {
      async buscarPorCorreo(correo) { return usuarios.find((u) => u.correo_institucional === correo) || null; },
      async buscarPorId(id) { return usuarios.find((u) => u.id_usuario === id) || null; },
      async existeNumeroControl(nc) { return usuarios.some((u) => u.numero_control === nc); },
      async crearEstudiante({ nombre, apellidos, correo, hash, numeroControl, semestre }) {
        const usuario = {
          id_usuario: siguiente++, nombre, apellidos, correo_institucional: correo, contrasena_hash: hash,
          rol: 'estudiante', estado_cuenta: 'pendiente_verificacion', numero_control: numeroControl, semestre,
        };
        usuarios.push(usuario);
        return usuario.id_usuario;
      },
      async activarCuenta(id) {
        const u = usuarios.find((x) => x.id_usuario === id);
        if (u && u.estado_cuenta === 'pendiente_verificacion') { u.estado_cuenta = 'activa'; return true; }
        return false;
      },
      async actualizarContrasena(id, hash) {
        const u = usuarios.find((x) => x.id_usuario === id);
        if (u) u.contrasena_hash = hash;
        return Boolean(u);
      },
      async contarPorRol() { return [{ rol: 'administrador', total: 1 }]; },
    },
  };
}

// Agrega un usuario ya activo con la contraseña de pruebas
function sembrar(repos, { correo, rol = 'estudiante', estado = 'activa' }) {
  const usuario = {
    id_usuario: repos.datos.length + 100, nombre: 'Prueba', apellidos: 'Usuario', correo_institucional: correo,
    contrasena_hash: HASH, rol, estado_cuenta: estado, numero_control: null, semestre: rol === 'estudiante' ? 1 : null,
  };
  repos.datos.push(usuario);
  return usuario;
}

// App nueva, con un cliente que conserva la cookie de sesión y el token CSRF
async function preparar() {
  const repos = crearRepos();
  const correo = { enviar: jest.fn().mockResolvedValue(undefined) };
  const agente = request.agent(crearApp({ config, repos, correo }));
  const { body } = await agente.get('/api/auth/csrf');
  const cliente = {
    repos, correo, agente, csrf: body.token,
    post: (ruta, datos) => agente.post(ruta).set('x-csrf-token', cliente.csrf).send(datos),
    async iniciarSesion(correoUsuario, contrasena = CLAVE) {
      const r = await cliente.post('/api/auth/login', { correo: correoUsuario, contrasena });
      if (r.body.csrf) cliente.csrf = r.body.csrf; // la sesión nueva trae otro token
      return r;
    },
  };
  return cliente;
}

// Extrae el token de un enlace enviado por el correo simulado
function tokenDelCorreo(correo, numeroLlamada = 0) {
  const texto = correo.enviar.mock.calls[numeroLlamada][0].texto;
  return decodeURIComponent(texto.match(/token=(\S+)/)[1]);
}

module.exports = { CLAVE, preparar, sembrar, tokenDelCorreo };