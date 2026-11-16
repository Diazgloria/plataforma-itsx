(async () => {
  const pagina = await cargarLayout('inicio');
  if (!pagina) return;
  const { usuario, contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Panel principal'));
  contenido.appendChild(elemento('p', 'intro',
    `Bienvenido(a), ${usuario.nombre} ${usuario.apellidos}. Tu rol en la plataforma es: ${usuario.rol}.`));

  // Solo el administrador ve el resumen; el servidor además lo protege con requiereRol
  if (usuario.rol === 'administrador') {
    contenido.appendChild(elemento('h2', '', 'Resumen de usuarios'));
    const lista = elemento('ul');
    contenido.appendChild(lista);
    try {
      const { usuariosPorRol } = await api('/admin/resumen');
      usuariosPorRol.forEach((fila) => lista.appendChild(elemento('li', '', `${fila.rol}: ${fila.total}`)));
    } catch (error) {
      contenido.appendChild(elemento('div', 'mensaje error', error.message));
    }
  }
})();