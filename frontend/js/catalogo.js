(async () => {
  const pagina = await cargarLayout('catalogo');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Catálogo de Materias'));
  contenido.appendChild(elemento('p', 'intro',
    'Mantén la retícula de tronco común por semestre. Una materia desactivada ya no se ofrece al subir material.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  // Formulario para agregar o editar (el mismo, según el modo)
  const panel = elemento('div', 'panel');
  const titulo = elemento('h2', '', 'Agregar materia');
  const form = elemento('form');
  form.noValidate = true;
  const campo = (etiqueta, tipo, extra = {}) => {
    const l = elemento('label', '', etiqueta);
    const i = elemento(tipo === 'select' ? 'select' : 'input');
    if (tipo !== 'select') i.type = tipo;
    Object.assign(i, extra);
    l.appendChild(i);
    form.appendChild(l);
    return i;
  };
  const clave = campo('Clave', 'text', { maxLength: 15, placeholder: 'Ej. ACF0902' });
  const nombre = campo('Nombre', 'text', { maxLength: 120 });
  const semestreForm = campo('Semestre', 'select');
  for (let n = 1; n <= 8; n++) {
    const o = elemento('option', '', `Semestre ${n}`);
    o.value = n;
    semestreForm.appendChild(o);
  }
  const descripcion = campo('Descripción (opcional)', 'text', { maxLength: 300 });
  const acciones = elemento('div', 'acciones');
  const guardar = elemento('button', '', 'Agregar materia');
  guardar.type = 'submit';
  const cancelar = elemento('button', 'secundario', 'Cancelar edición');
  cancelar.type = 'button';
  cancelar.hidden = true;
  acciones.append(guardar, cancelar);
  form.appendChild(acciones);
  panel.append(titulo, form);
  contenido.appendChild(panel);

  // Filtro y lista
  const semestre = elemento('select');
  const todos = elemento('option', '', 'Todos los semestres');
  todos.value = '';
  semestre.appendChild(todos);
  for (let n = 1; n <= 8; n++) {
    const o = elemento('option', '', `Semestre ${n}`);
    o.value = n;
    semestre.appendChild(o);
  }
  const filtros = elemento('div', 'filtros');
  filtros.appendChild(semestre);
  const lista = elemento('div');
  contenido.append(filtros, lista);

  let editando = null; // id de la materia en edición

  function modoAgregar() {
    editando = null;
    form.reset();
    titulo.textContent = 'Agregar materia';
    guardar.textContent = 'Agregar materia';
    cancelar.hidden = true;
  }

  function modoEditar(m) {
    editando = m.id_materia;
    clave.value = m.clave;
    nombre.value = m.nombre;
    semestreForm.value = m.semestre;
    descripcion.value = m.descripcion || '';
    titulo.textContent = `Editar materia ${m.clave}`;
    guardar.textContent = 'Guardar cambios';
    cancelar.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth' });
  }

  async function ejecutar(accion, textoOk) {
    try {
      const r = await accion();
      mostrarMensaje(aviso, 'ok', r.mensaje || textoOk);
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    }
  }

  async function cargar() {
    try {
      const consulta = semestre.value ? `?semestre=${semestre.value}` : '';
      const { materias } = await api('/catalogo' + consulta);
      lista.replaceChildren();
      if (materias.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'No hay materias en este semestre.'));
        return;
      }
      materias.forEach((m) => {
        const tarjeta = elemento('div', 'material');
        const encabezado = elemento('div', 'encabezado');
        encabezado.appendChild(elemento('h3', '', `${m.clave} · ${m.nombre}`));
        encabezado.appendChild(elemento('span', `insignia ${m.activa ? 'validado' : 'retirado'}`,
          m.activa ? 'Activa' : 'Inactiva'));
        tarjeta.appendChild(encabezado);
        tarjeta.appendChild(elemento('div', 'pequeno',
          `Semestre ${m.semestre} · Materiales: ${m.materiales} · Docentes asignados: ${m.docentes}`));
        if (m.descripcion) tarjeta.appendChild(elemento('div', 'pequeno', m.descripcion));

        const barra = elemento('div', 'acciones');
        const editar = elemento('button', 'secundario', 'Editar');
        editar.type = 'button';
        editar.addEventListener('click', () => modoEditar(m));
        const estado = elemento('button', 'secundario', m.activa ? 'Desactivar' : 'Activar');
        estado.type = 'button';
        estado.addEventListener('click', () => ejecutar(
          () => api(`/catalogo/${m.id_materia}/estado`, { metodo: 'POST', cuerpo: { activa: !m.activa } })));
        const eliminar = elemento('button', 'peligro', 'Eliminar');
        eliminar.type = 'button';
        eliminar.addEventListener('click', () => {
          if (!window.confirm(`¿Eliminar la materia ${m.clave}? Esta acción no se puede deshacer.`)) return;
          ejecutar(() => api(`/catalogo/${m.id_materia}`, { metodo: 'DELETE' }));
        });
        barra.append(editar, estado, eliminar);
        tarjeta.appendChild(barra);
        lista.appendChild(tarjeta);
      });
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cuerpo = {
      clave: clave.value, nombre: nombre.value, semestre: semestreForm.value, descripcion: descripcion.value,
    };
    guardar.disabled = true;
    try {
      const r = editando
        ? await api(`/catalogo/${editando}`, { metodo: 'PUT', cuerpo })
        : await api('/catalogo', { metodo: 'POST', cuerpo });
      mostrarMensaje(aviso, 'ok', r.mensaje);
      modoAgregar();
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    } finally {
      guardar.disabled = false;
    }
  });
  cancelar.addEventListener('click', modoAgregar);
  semestre.addEventListener('change', cargar);
  cargar();
})();
