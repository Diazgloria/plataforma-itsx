(async () => {
  const pagina = await cargarLayout('moderacion');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Moderación de Contenidos'));
  contenido.appendChild(elemento('p', 'intro',
    'Supervisa los materiales de la plataforma. La validación académica corresponde al docente; aquí puedes aprobar o rechazar como supervisor y suspender, retirar o eliminar lo que incumpla las políticas.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  const ESTADOS = {
    pendiente_validacion: 'Pendiente',
    validado: 'Validado',
    rechazado: 'Rechazado',
    suspendido: 'Suspendido',
    retirado: 'Retirado',
    eliminado: 'Eliminado',
  };
  // Acciones disponibles según el estado (el servidor vuelve a validarlas); "motivo" pide una explicación
  const ACCIONES = {
    pendiente_validacion: [['aprobar', 'Aprobar', false], ['rechazar', 'Rechazar', true], ['eliminar', 'Eliminar', true]],
    validado: [['suspender', 'Suspender', true], ['retirar', 'Retirar', true], ['eliminar', 'Eliminar', true]],
    suspendido: [['reactivar', 'Reactivar', false], ['retirar', 'Retirar', true], ['eliminar', 'Eliminar', true]],
    rechazado: [['eliminar', 'Eliminar', true]],
    retirado: [['eliminar', 'Eliminar', true]],
    eliminado: [],
  };

  // Filtros: semestre, estado y materia
  const semestre = elemento('select');
  const estado = elemento('select');
  const materia = elemento('select');
  const opcion = (sel, valor, texto) => {
    const o = elemento('option', '', texto);
    o.value = valor;
    sel.appendChild(o);
  };
  opcion(semestre, '', 'Todos los semestres');
  for (let n = 1; n <= 8; n++) opcion(semestre, n, `Semestre ${n}`);
  opcion(estado, '', 'Todos los estados');
  Object.entries(ESTADOS).forEach(([valor, texto]) => opcion(estado, valor, texto));
  opcion(materia, '', 'Todas las materias');
  const filtros = elemento('div', 'filtros');
  filtros.append(semestre, estado, materia);
  const lista = elemento('div');
  contenido.append(filtros, lista);

  try {
    const { materias } = await api('/materias');
    materias.forEach((m) => opcion(materia, m.id_materia, `${String(m.clave).trim()} · ${m.nombre}`));
  } catch (error) { /* el filtro de materia es opcional */ }

  async function aplicar(m, accion, motivo) {
    try {
      const r = await api(`/moderacion/${m.id_material}/accion`, { metodo: 'POST', cuerpo: { accion, motivo } });
      mostrarMensaje(aviso, 'ok', r.codigo ? `${r.mensaje} Código: ${r.codigo}` : r.mensaje);
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  function tarjeta(m) {
    const t = elemento('div', 'material');
    const encabezado = elemento('div', 'encabezado');
    encabezado.appendChild(elemento('h3', '', m.titulo));
    encabezado.appendChild(elemento('span', `insignia ${m.estado}`, ESTADOS[m.estado] || m.estado));
    t.appendChild(encabezado);
    t.appendChild(elemento('div', '', `Materia: ${m.materia} (semestre ${m.semestre}) | Autor: ${m.autor}`));
    t.appendChild(elemento('div', 'pequeno',
      `Subido el ${new Date(m.fecha_carga).toLocaleDateString('es-MX')} · Versión ${m.version || '—'} · Formato ${m.formato || '—'}`));
    t.appendChild(elemento('div', 'pequeno', `Huella digital (SHA-256): ${m.huella || '—'}`));

    const barra = elemento('div', 'acciones');
    if (m.estado !== 'eliminado') {
      const ver = elemento('a', '', 'Ver detalle');
      ver.href = `detalle.html?id=${m.id_material}`;
      const descargar = elemento('a', '', 'Descargar');
      descargar.href = `/api/materiales/${m.id_material}/archivo`;
      barra.append(ver, descargar);
    }
    const zonaMotivo = elemento('div');
    (ACCIONES[m.estado] || []).forEach(([accion, texto, pideMotivo]) => {
      const b = elemento('button', accion === 'eliminar' || accion === 'rechazar' ? 'peligro' : 'secundario', texto);
      b.type = 'button';
      b.addEventListener('click', () => {
        if (!pideMotivo) { aplicar(m, accion, ''); return; }
        // Las acciones que afectan al autor piden un motivo, que se le muestra en su aviso
        zonaMotivo.replaceChildren();
        const caja = elemento('textarea');
        caja.rows = 2;
        caja.maxLength = 200;
        caja.placeholder = `Motivo para ${texto.toLowerCase()} (obligatorio)`;
        const confirmar = elemento('button', 'auto', `Confirmar: ${texto}`);
        confirmar.type = 'button';
        confirmar.addEventListener('click', () => {
          if (!caja.value.trim()) { mostrarMensaje(aviso, 'error', 'Escribe el motivo de esta acción.'); return; }
          aplicar(m, accion, caja.value.trim());
        });
        const cancelar = elemento('button', 'auto secundario', 'Cancelar');
        cancelar.type = 'button';
        cancelar.addEventListener('click', () => zonaMotivo.replaceChildren());
        zonaMotivo.append(caja, confirmar, cancelar);
        caja.focus();
      });
      barra.appendChild(b);
    });
    t.append(barra, zonaMotivo);
    return t;
  }

  async function cargar() {
    try {
      const consulta = new URLSearchParams();
      if (semestre.value) consulta.set('semestre', semestre.value);
      if (estado.value) consulta.set('estado', estado.value);
      if (materia.value) consulta.set('materia', materia.value);
      const texto = consulta.toString();
      const { materiales } = await api('/moderacion' + (texto ? `?${texto}` : ''));
      lista.replaceChildren();
      if (materiales.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'No hay materiales con esos filtros.'));
        return;
      }
      materiales.forEach((m) => lista.appendChild(tarjeta(m)));
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  [semestre, estado, materia].forEach((s) => s.addEventListener('change', cargar));
  cargar();
})();
