(async () => {
  const pagina = await cargarLayout('tipos');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Tipos de Material'));
  contenido.appendChild(elemento('p', 'intro',
    'Clasificaciones que el estudiante elige al subir un archivo. Un tipo desactivado ya no se ofrece, pero los materiales que lo usan lo conservan.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  // Formulario de alta o edición
  const panel = elemento('div', 'panel');
  const titulo = elemento('h2', '', 'Agregar tipo de material');
  const form = elemento('form');
  form.noValidate = true;
  const etiqueta = elemento('label', '', 'Nombre del tipo');
  const nombre = elemento('input');
  nombre.type = 'text';
  nombre.maxLength = 60;
  nombre.placeholder = 'Ej. Laboratorio';
  etiqueta.appendChild(nombre);
  const barra = elemento('div', 'acciones');
  const guardar = elemento('button', '', 'Guardar');
  guardar.type = 'submit';
  const cancelar = elemento('button', 'secundario', 'Cancelar');
  cancelar.type = 'button';
  cancelar.hidden = true;
  barra.append(guardar, cancelar);
  form.append(etiqueta, barra);
  panel.append(titulo, form);

  const lista = elemento('div');
  contenido.append(panel, lista);

  let editando = null; // id del tipo en edición

  function modoAlta() {
    editando = null;
    form.reset();
    titulo.textContent = 'Agregar tipo de material';
    cancelar.hidden = true;
  }

  function modoEdicion(t) {
    editando = t.id_tipo;
    nombre.value = t.nombre;
    titulo.textContent = `Editar tipo "${t.nombre}"`;
    cancelar.hidden = false;
    nombre.focus();
  }

  async function cargar() {
    try {
      const { tipos } = await api('/tipos/admin');
      lista.replaceChildren();
      if (tipos.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'Aún no hay tipos de material.'));
        return;
      }
      tipos.forEach((t) => {
        const tarjeta = elemento('div', 'material');
        const encabezado = elemento('div', 'encabezado');
        encabezado.appendChild(elemento('h3', '', t.nombre));
        encabezado.appendChild(elemento('span', `insignia ${t.activo ? 'activo' : 'inactivo'}`, t.activo ? 'Activo' : 'Inactivo'));
        tarjeta.appendChild(encabezado);
        tarjeta.appendChild(elemento('div', 'pequeno', `Materiales de este tipo: ${t.materiales}`));

        const acciones = elemento('div', 'acciones');
        const editar = elemento('button', 'secundario', 'Editar');
        editar.type = 'button';
        editar.addEventListener('click', () => modoEdicion(t));
        const estado = elemento('button', 'secundario', t.activo ? 'Desactivar' : 'Activar');
        estado.type = 'button';
        estado.addEventListener('click', async () => {
          try {
            const r = await api(`/tipos/${t.id_tipo}/estado`, { metodo: 'POST', cuerpo: { activo: !t.activo } });
            mostrarMensaje(aviso, 'ok', r.mensaje);
            await cargar();
          } catch (error) {
            mostrarMensaje(aviso, 'error', error.message);
          }
        });
        acciones.append(editar, estado);
        tarjeta.appendChild(acciones);
        lista.appendChild(tarjeta);
      });
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    guardar.disabled = true;
    try {
      const cuerpo = { nombre: nombre.value };
      const r = editando
        ? await api(`/tipos/${editando}`, { metodo: 'PUT', cuerpo })
        : await api('/tipos', { metodo: 'POST', cuerpo });
      mostrarMensaje(aviso, 'ok', r.mensaje);
      modoAlta();
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    } finally {
      guardar.disabled = false;
    }
  });
  cancelar.addEventListener('click', modoAlta);
  cargar();
})();
