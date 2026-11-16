const formulario = document.getElementById('formRecuperar');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('btnEnviar');

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario));
  boton.disabled = true;
  try {
    const respuesta = await api('/auth/recuperar', { metodo: 'POST', cuerpo: datos });
    mostrarMensaje(mensaje, 'ok', respuesta.mensaje);
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message);
  } finally {
    boton.disabled = false;
  }
});