(async () => {
  const pagina = await cargarLayout('bitacora');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Bitácora de Auditoría'));
  contenido.appendChild(elemento('p', 'intro',
    'Registro de solo lectura de las acciones importantes de la plataforma. No incluye contraseñas.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  // Filtros: usuario o texto, acción y rango de fechas
  const buscar = elemento('input');
  buscar.type = 'search';
  buscar.placeholder = 'Buscar por usuario, correo o detalle';
  buscar.maxLength = 80;
  const accion = elemento('select');
  const todas = elemento('option', '', 'Todas las acciones');
  todas.value = '';
  accion.appendChild(todas);
  const desde = elemento('input');
  desde.type = 'date';
  desde.title = 'Fecha desde';
  const hasta = elemento('input');
  hasta.type = 'date';
  hasta.title = 'Fecha hasta';
  const filtrar = elemento('button', 'auto', 'Filtrar');
  filtrar.type = 'button';
  const exportar = elemento('a', '', 'Exportar bitácora (CSV)');
  const filtros = elemento('div', 'filtros');
  filtros.append(buscar, accion, desde, hasta, filtrar, exportar);

  const contenedor = elemento('div', 'tabla-scroll');
  const navegacion = elemento('div', 'paginacion');
  contenido.append(filtros, contenedor, navegacion);

  try {
    const { acciones } = await api('/bitacora/acciones');
    acciones.forEach((a) => {
      const o = elemento('option', '', a);
      o.value = a;
      accion.appendChild(o);
    });
  } catch (error) { /* el filtro por acción es opcional */ }

  let numero = 1;

  function consulta(extra = {}) {
    const q = new URLSearchParams();
    if (buscar.value.trim()) q.set('q', buscar.value.trim());
    if (accion.value) q.set('accion', accion.value);
    if (desde.value) q.set('desde', desde.value);
    if (hasta.value) q.set('hasta', hasta.value);
    Object.entries(extra).forEach(([k, v]) => q.set(k, v));
    return q.toString();
  }

  async function cargar() {
    try {
      const r = await api(`/bitacora?${consulta({ pagina: numero })}`);
      exportar.href = `/api/bitacora/exportar?${consulta()}`;
      contenedor.replaceChildren();
      navegacion.replaceChildren();
      if (r.registros.length === 0) {
        contenedor.appendChild(elemento('p', 'vacio', 'No hay registros para los filtros elegidos.'));
        return;
      }
      const tabla = elemento('table', 'tabla');
      const cabecera = elemento('tr');
      ['Fecha y hora', 'Usuario', 'Acción', 'Detalle'].forEach((t) => cabecera.appendChild(elemento('th', '', t)));
      tabla.appendChild(cabecera);
      r.registros.forEach((f) => {
        const fila = elemento('tr');
        fila.appendChild(elemento('td', '', new Date(f.fecha).toLocaleString('es-MX', { hour12: false })));
        fila.appendChild(elemento('td', '', f.usuario ? `${f.usuario} (${f.correo})` : 'Sistema / anónimo'));
        fila.appendChild(elemento('td', '', f.accion));
        fila.appendChild(elemento('td', '', f.detalle || ''));
        tabla.appendChild(fila);
      });
      contenedor.appendChild(tabla);

      const anterior = elemento('button', 'secundario', 'Anterior');
      anterior.type = 'button';
      anterior.disabled = r.pagina <= 1;
      anterior.addEventListener('click', () => { numero -= 1; cargar(); });
      const siguiente = elemento('button', 'secundario', 'Siguiente');
      siguiente.type = 'button';
      siguiente.disabled = r.pagina >= r.paginas;
      siguiente.addEventListener('click', () => { numero += 1; cargar(); });
      navegacion.append(anterior, elemento('span', '', `Página ${r.pagina} de ${r.paginas} (${r.total} registros)`), siguiente);
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  filtrar.addEventListener('click', () => { numero = 1; cargar(); });
  buscar.addEventListener('keydown', (e) => { if (e.key === 'Enter') { numero = 1; cargar(); } });
  cargar();
})();
