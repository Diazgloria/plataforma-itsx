(async () => {
  const pagina = await cargarLayout('estadisticas');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Estadísticas y Reportes'));
  contenido.appendChild(elemento('p', 'intro', 'Indicadores generales de uso de la plataforma.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  const ESTADOS = {
    pendiente_validacion: 'Pendiente', validado: 'Validado', rechazado: 'Rechazado',
    suspendido: 'Suspendido', retirado: 'Retirado',
  };

  // Filtros de semestre y periodo
  const semestre = elemento('select');
  const periodo = elemento('select');
  const opcion = (sel, valor, texto) => {
    const o = elemento('option', '', texto);
    o.value = valor;
    sel.appendChild(o);
  };
  opcion(semestre, '', 'Todos los semestres');
  for (let n = 1; n <= 8; n++) opcion(semestre, n, `Semestre ${n}`);
  [['', 'Todo el historial'], ['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['365', 'Último año']]
    .forEach(([v, t]) => opcion(periodo, v, t));
  const descargar = elemento('button', 'auto', 'Descargar reporte (PDF)');
  descargar.type = 'button';
  const filtros = elemento('div', 'filtros');
  filtros.append(semestre, periodo, descargar);

  const encabezadoImpresion = elemento('p', 'solo-impresion');
  const tarjetas = elemento('div', 'indicadores');
  const graficaMateria = elemento('div', 'grafica');
  const graficaEstado = elemento('div', 'grafica');
  contenido.append(filtros, encabezadoImpresion, tarjetas, graficaMateria, graficaEstado);

  function dibujarBarras(contenedor, titulo, filas, vacio) {
    contenedor.replaceChildren(elemento('h2', '', titulo));
    if (filas.length === 0 || filas.every((f) => f.total === 0)) {
      contenedor.appendChild(elemento('p', 'vacio', vacio));
      return;
    }
    const maximo = Math.max(...filas.map((f) => f.total), 1);
    filas.forEach((f) => {
      const fila = elemento('div', 'fila');
      fila.appendChild(elemento('span', 'nombre', f.nombre));
      const pista = elemento('div', 'pista');
      const relleno = elemento('div', 'relleno');
      relleno.style.width = `${Math.round((f.total / maximo) * 100)}%`;
      pista.appendChild(relleno);
      fila.append(pista, elemento('span', 'valor', String(f.total)));
      contenedor.appendChild(fila);
    });
  }

  async function cargar() {
    try {
      const q = new URLSearchParams();
      if (semestre.value) q.set('semestre', semestre.value);
      if (periodo.value) q.set('dias', periodo.value);
      const d = await api('/estadisticas' + (q.toString() ? `?${q}` : ''));

      tarjetas.replaceChildren();
      [
        ['Materiales publicados', d.indicadores.publicados],
        ['Pendientes de validación', d.indicadores.pendientes],
        ['Estudiantes activos', d.indicadores.estudiantes_activos],
        ['Docentes activos', d.indicadores.docentes_activos],
        ['Descargas', d.indicadores.descargas],
      ].forEach(([etiqueta, valor]) => {
        const t = elemento('div', 'indicador');
        t.append(elemento('span', 'numero', String(valor)), elemento('span', 'etiqueta', etiqueta));
        tarjetas.appendChild(t);
      });

      dibujarBarras(graficaMateria, 'Materiales publicados por materia',
        d.por_materia.map((m) => ({ nombre: `${m.materia} (S${m.semestre})`, total: m.total })),
        'Aún no hay materiales publicados con estos filtros.');
      dibujarBarras(graficaEstado, 'Materiales por estado',
        d.por_estado.map((e) => ({ nombre: ESTADOS[e.estado] || e.estado, total: e.total })),
        'Aún no hay materiales con estos filtros.');

      encabezadoImpresion.textContent =
        `Reporte generado el ${new Date(d.generado).toLocaleString('es-MX')} · ${semestre.options[semestre.selectedIndex].text} · ${periodo.options[periodo.selectedIndex].text}`;
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  // El PDF se genera con el diálogo de impresión del navegador (opción "Guardar como PDF")
  descargar.addEventListener('click', () => window.print());
  semestre.addEventListener('change', cargar);
  periodo.addEventListener('change', cargar);
  cargar();
})();
