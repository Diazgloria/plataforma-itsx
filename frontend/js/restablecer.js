const formulario = document.getElementById('formRestablecer');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('btnGuardar');
const token = new URLSearchParams(window.location.search).get('token');

if (!token) {
  mostrarMensaje(mensaje, 'error', 'Falta el token en el enlace. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".');
  boton.disabled = true;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const contrasena = document.getElementById('contrasena').value;
  if (contrasena !== document.getElementById('confirmar').value) {
    mostrarMensaje(mensaje, 'error', 'Las contraseñas no coinciden.');
    return;
  }
  boton.disabled = true;
  try {
    const respuesta = await api('/auth/restablecer', { metodo: 'POST', cuerpo: { token, contrasena } });
    mostrarMensaje(mensaje, 'ok', respuesta.mensaje);
    formulario.reset();
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message, error.detalles);
    boton.disabled = false;
  }
});