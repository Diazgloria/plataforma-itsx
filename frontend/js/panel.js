const mensaje = document.getElementById('mensaje');

(async () => {
  try {
    const { usuario } = await api('/auth/yo');
    document.getElementById('nombreUsuario').textContent = `${usuario.nombre} ${usuario.apellidos}`;
    document.getElementById('correoUsuario').textContent = usuario.correo;
    document.getElementById('rolUsuario').textContent = usuario.rol;
    if (usuario.rol === 'administrador') cargarResumen();
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

// Sección visible solo para administradores; el servidor además la protege con requiereRol
async function cargarResumen() {
  try {
    const { usuariosPorRol } = await api('/admin/resumen');
    const lista = document.getElementById('listaResumen');
    usuariosPorRol.forEach((fila) => {
      const li = document.createElement('li');
      li.textContent = `${fila.rol}: ${fila.total}`;
      lista.appendChild(li);
    });
    document.getElementById('seccionAdmin').hidden = false;
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message);
  }
}