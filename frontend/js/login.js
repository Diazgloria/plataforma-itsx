const formulario = document.getElementById('formLogin');
const mensaje = document.getElementById('mensaje');
const boton = document.getElementById('btnEntrar');

// Si ya hay una sesión activa, se va directo al panel
api('/auth/yo').then(() => { window.location.href = 'panel.html'; }).catch(() => {});

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario));
  boton.disabled = true;
  try {
    await api('/auth/login', { metodo: 'POST', cuerpo: datos });
    reiniciarCsrf(); // la sesión nueva trae otro token CSRF
    window.location.href = 'panel.html';
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message);
  } finally {
    boton.disabled = false;
  }
});