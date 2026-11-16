(async () => {
  const pagina = await cargarLayout('mis-materias');
  if (!pagina) return;
  const { usuario, contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Mis Materias'));
  contenido.appendChild(elemento('p', 'intro',
    `Asignaturas del tronco común correspondientes a tu ${usuario.semestre}° semestre.`));
  const rejilla = elemento('div', 'rejilla-materias');
  contenido.appendChild(rejilla);

  try {
    const { materias } = await api('/materias/mias');
    dibujarMaterias(rejilla, materias);
  } catch (error) {
    contenido.appendChild(elemento('div', 'mensaje error', error.message));
  }
})();