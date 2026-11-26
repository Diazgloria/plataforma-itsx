(async () => {
  const pagina = await cargarLayout('buscar');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Buscar Materiales Académicos'));

  const texto = elemento('input');
  texto.type = 'text';
  texto.placeholder = 'Buscar por título o palabra clave...';
  const materia = elemento('select');
  const todas = elemento('option', '', 'Todas las Materias');
  todas.value = '';
  materia.appendChild(todas);
  const tipo = elemento('select');
  const todosTipos = elemento('option', '', 'Todos los Tipos');
  todosTipos.value = '';
  tipo.appendChild(todosTipos);
  const filtros = elemento('div', 'filtros');
  filtros.append(texto, materia, tipo);
  contenido.appendChild(filtros);

  const limpiar = elemento('button', 'secundario auto', '🧹 Limpiar Filtros');
  limpiar.type = 'button';
  contenido.appendChild(limpiar);

  contenido.appendChild(elemento('h2', '', 'Materiales Validados Disponibles'));
  const lista = elemento('div');
  contenido.appendChild(lista);

  function dibujar(materiales) {
    lista.replaceChildren();
    if (materiales.length === 0) {
      lista.appendChild(elemento('p', 'vacio', 'No se encontraron materiales con esos criterios.'));
      return;
    }
    materiales.forEach((m) => {
      const tarjeta = elemento('div', 'material');
      const encabezado = elemento('div', 'encabezado');
      encabezado.appendChild(elemento('h3', '', m.titulo));
      encabezado.appendChild(elemento('span', 'insignia validado', 'Validado'));
      tarjeta.appendChild(encabezado);
      tarjeta.appendChild(elemento('div', '', `Materia: ${m.materia} | Tipo: ${m.tipo || 'Sin clasificar'} | Formato: ${m.formato}`));
      if (m.descripcion) tarjeta.appendChild(elemento('div', '', m.descripcion));
      tarjeta.appendChild(elemento('div', 'pequeno',
        `Subido por: ${m.autor} el ${new Date(m.fecha_carga).toLocaleDateString('es-MX')}`));
      if (m.codigo_validacion) {
        tarjeta.appendChild(elemento('div', 'pequeno', `Código de validación: ${m.codigo_validacion}`));
      }
      const enlace = elemento('a', '', 'Descargar Documento');
      enlace.href = `/api/materiales/${m.id_material}/archivo`;
      const detalle = elemento('a', '', 'Ver detalle');
      detalle.href = `detalle.html?id=${m.id_material}`;
      tarjeta.append(enlace, ' · ', detalle);
      lista.appendChild(tarjeta);
    });
  }

  async function buscar() {
    const parametros = new URLSearchParams();
    if (texto.value.trim()) parametros.set('q', texto.value.trim());
    if (materia.value) parametros.set('materia', materia.value);
    if (tipo.value) parametros.set('tipo', tipo.value);
    const consulta = parametros.toString();
    try {
      const { materiales } = await api('/materiales' + (consulta ? `?${consulta}` : ''));
      dibujar(materiales);
    } catch (error) {
      lista.replaceChildren(elemento('div', 'mensaje error', error.message));
    }
  }

  try {
    const { materias } = await api('/materias');
    materias.forEach((m) => {
      const opcion = elemento('option', '', m.nombre);
      opcion.value = m.id_materia;
      materia.appendChild(opcion);
    });
  } catch (error) { /* el catálogo funciona aunque falle la lista de materias */ }

  try {
    const { tipos } = await api('/tipos');
    tipos.forEach((t) => {
      const opcion = elemento('option', '', t.nombre);
      opcion.value = t.id_tipo;
      tipo.appendChild(opcion);
    });
  } catch (error) { /* el catálogo funciona aunque falle la lista de tipos */ }

  let espera;
  texto.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(buscar, 300); });
  materia.addEventListener('change', buscar);
  tipo.addEventListener('change', buscar);
  limpiar.addEventListener('click', () => { texto.value = ''; materia.value = ''; tipo.value = ''; buscar(); });
  buscar();
})();