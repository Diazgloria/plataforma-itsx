(async () => {
  const pagina = await cargarLayout('subir-material');
  if (!pagina) return;
  const { usuario, contenido } = pagina;

  if (usuario.rol !== 'estudiante') {
    contenido.appendChild(elemento('h1', '', 'Subir Material Académico'));
    contenido.appendChild(elemento('p', 'intro', 'Solo los estudiantes pueden subir materiales.'));
    return;
  }

  contenido.appendChild(document.getElementById('plantilla').content.cloneNode(true));
  const formulario = document.getElementById('formMaterial');
  const mensaje = document.getElementById('mensaje');
  const boton = document.getElementById('btnSubir');
  const selector = document.getElementById('idMateria');

  // La lista de materias viene de la base de datos
  try {
    const { materias } = await api('/materias');
    materias.forEach((materia) => {
      const opcion = elemento('option', '', `${materia.nombre} (${materia.clave})`);
      opcion.value = materia.id_materia;
      selector.appendChild(opcion);
    });
  } catch (error) {
    mostrarMensaje(mensaje, 'error', error.message);
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    boton.disabled = true;
    try {
      const respuesta = await api('/materiales', { metodo: 'POST', formulario: new FormData(formulario) });
      mostrarMensaje(mensaje, 'ok', respuesta.mensaje);
      formulario.reset();
    } catch (error) {
      mostrarMensaje(mensaje, 'error', error.message);
    } finally {
      boton.disabled = false;
    }
  });
})();