const mensaje = document.getElementById('mensaje');

(async () => {
  try {
    const { usuario } = await api('/auth/yo');
    document.getElementById('nombreUsuario').textContent = `${usuario.nombre} ${usuario.apellidos}`;
    document.getElementById('correoUsuario').textContent = usuario.correo;
    document.getElementById('rolUsuario').textContent = usuario.rol;
  } catch (error) {
    // Sin sesión: se regresa al inicio de sesión
    window.location.href = 'index.html';
  }
})();

document.getElementById('btnSalir').addEventListener('click', async () => {
  try {
    await api('/auth/logout', { metodo: 'POST' });
  } catch (error) { /* aunque falle, se vuelve al inicio */ }
  reiniciarCsrf();
  window.location.href = 'index.html';
});