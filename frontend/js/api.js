let tokenCsrf = null;

async function obtenerCsrf() {
  if (!tokenCsrf) {
    const respuesta = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    tokenCsrf = (await respuesta.json()).token;
  }
  return tokenCsrf;
}

// Se llama después de iniciar sesión, porque la sesión nueva trae otro token
function reiniciarCsrf() { tokenCsrf = null; }

// Llama a la API y devuelve el JSON; si hay error lanza una excepción con el mensaje del servidor
async function api(ruta, opciones = {}) {
  const metodo = opciones.metodo || 'GET';
  const peticion = { method: metodo, headers: {}, credentials: 'same-origin' };
  if (metodo !== 'GET') peticion.headers['x-csrf-token'] = await obtenerCsrf();
  if (opciones.cuerpo) {
    peticion.headers['Content-Type'] = 'application/json';
    peticion.body = JSON.stringify(opciones.cuerpo);
  }
  const respuesta = await fetch('/api' + ruta, peticion);
  let datos = null;
  try { datos = await respuesta.json(); } catch (e) { /* respuesta sin cuerpo */ }
  if (!respuesta.ok) {
    if (respuesta.status === 403) reiniciarCsrf();
    const error = new Error((datos && datos.error) || 'No se pudo conectar con el servidor');
    error.estado = respuesta.status;
    error.detalles = (datos && datos.detalles) || [];
    throw error;
  }
  return datos;
}

// Muestra un mensaje (tipo: 'ok' o 'error') con una lista opcional de detalles
function mostrarMensaje(elemento, tipo, texto, detalles = []) {
  elemento.className = 'mensaje ' + tipo;
  elemento.textContent = texto;
  if (detalles.length > 0) {
    const lista = document.createElement('ul');
    detalles.forEach((d) => { const li = document.createElement('li'); li.textContent = d; lista.appendChild(li); });
    elemento.appendChild(lista);
  }
}