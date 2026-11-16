(async () => {
  const pagina = await cargarLayout('semestres');
  if (!pagina) return;
  const { usuario, contenido } = pagina;

  const titulo = elemento('h1', '', 'Materias por semestre');
  contenido.appendChild(titulo);
  contenido.appendChild(elemento('p', 'intro', 'Selecciona un semestre para ver sus asignaturas y recursos.'));

  const selector = elemento('select');
  NOMBRES_SEMESTRE.forEach((nombre, i) => {
    const opcion = elemento('option', '', `${nombre} semestre`);
    opcion.value = String(i + 1);
    selector.appendChild(opcion);
  });
  const filtros = elemento('div', 'filtros');
  filtros.appendChild(selector);
  contenido.appendChild(filtros);

  const rejilla = elemento('div', 'rejilla-materias');
  contenido.appendChild(rejilla);

  async function cargar() {
    const semestre = Number(selector.value);
    titulo.textContent = `Materias del ${semestre}° Semestre`;
    try {
      const { materias } = await api(`/materias?semestre=${semestre}`);
      dibujarMaterias(rejilla, materias);
    } catch (error) {
      rejilla.replaceChildren(elemento('div', 'mensaje error', error.message));
    }
  }

  selector.addEventListener('change', cargar);
  selector.value = String(usuario.semestre || 1);
  cargar();
})();