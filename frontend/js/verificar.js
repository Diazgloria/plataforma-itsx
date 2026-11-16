const mensaje = document.getElementById('mensaje');
const token = new URLSearchParams(window.location.search).get('token');

(async () => {
  if (!token) {
    mostrarMensaje(mensaje, 'error', 'Falta el token de verificación en el enlace.');
    return;
  }
  try {
    const respuesta = await api('/auth/verificar', { metodo: 'POST', cuerpo: { token } });
    mostrarMensaje(mensaje, 'ok', respuesta.mensaje);
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message);
  }
})();