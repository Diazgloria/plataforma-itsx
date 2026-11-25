(async () => {
  const pagina = await cargarLayout('favoritos');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Mis Favoritos'));
  contenido.appendChild(elemento('p', 'intro', 'Materiales validados que marcaste para consultarlos después.'));

  const materia = elemento('select');
  const todas = elemento('option', '', 'Todas las materias');
  todas.value = '';
  materia.appendChild(todas);
  const filtros = elemento('div', 'filtros');
  filtros.appendChild(materia);
  contenido.appendChild(filtros);

  const aviso = elemento('div');
  const lista = elemento('div');
  contenido.append(aviso, lista);

  let materiasCargadas = false;

  async function cargar() {
    try {
      const consulta = materia.value ? `?materia=${materia.value}` : '';
      const { favoritos } = await api('/favoritos' + consulta);

      // Las materias del filtro salen de los propios favoritos (se llenan la primera vez)
      if (!materiasCargadas) {
        const vistas = new Map();
        favoritos.forEach((f) => vistas.set(f.id_materia, f.materia));
        vistas.forEach((nombre, idMateria) => {
          const opcion = elemento('option', '', nombre);
          opcion.value = idMateria;
          materia.appendChild(opcion);
        });
        materiasCargadas = true;
      }

      lista.replaceChildren();
      if (favoritos.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'Aún no tienes materiales favoritos'));
        return;
      }
      favoritos.forEach((f) => lista.appendChild(crearTarjeta(f)));
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  function crearTarjeta(f) {
    const tarjeta = elemento('div', 'material');
    const encabezado = elemento('div', 'encabezado');
    encabezado.appendChild(elemento('h3', '', f.titulo));
    encabezado.appendChild(elemento('span', 'insignia validado', 'Validado'));
    tarjeta.appendChild(encabezado);
    tarjeta.appendChild(elemento('div', '', `Materia: ${f.materia} | Tipo: ${f.tipo || 'Sin clasificar'} | Formato: ${f.formato}`));
    tarjeta.appendChild(elemento('div', 'pequeno', `Descargas: ${f.descargas}`));

    const detalle = elemento('a', '', 'Ver detalle');
    detalle.href = `detalle.html?id=${f.id_material}`;
    const descargar = elemento('a', '', 'Descargar');
    descargar.href = `/api/materiales/${f.id_material}/archivo`;
    const quitar = elemento('button', 'secundario auto', '★ Quitar de favoritos');
    quitar.type = 'button';
    quitar.addEventListener('click', async () => {
      try {
        const r = await api(`/favoritos/${f.id_material}`, { metodo: 'DELETE' });
        mostrarMensaje(aviso, 'ok', r.mensaje);
        cargar();
      } catch (error) {
        mostrarMensaje(aviso, 'error', error.message);
      }
    });
    const fila = elemento('div');
    fila.append(detalle, ' · ', descargar);
    tarjeta.append(fila, quitar);
    return tarjeta;
  }

  materia.addEventListener('change', cargar);
  cargar();
})();
