const formulario = document.getElementById('formRegistro');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('btnRegistrar');

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario));

  if (datos.contrasena !== document.getElementById('confirmar').value) {
    mostrarMensaje(mensaje, 'error', 'Las contraseñas no coinciden.');
    return;
  }

  datos.semestre = Number(datos.semestre);
  boton.disabled = true;
  try {
    const respuesta = await api('/auth/registro', { metodo: 'POST', cuerpo: datos });
    mostrarMensaje(mensaje, 'ok', respuesta.mensaje);
    formulario.reset();
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message, error.detalles);
  } finally {
    boton.disabled = false;
  }
});