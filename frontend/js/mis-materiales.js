(async () => {
  const pagina = await cargarLayout('mis-materiales');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Mis Materiales'));
  contenido.appendChild(elemento('p', 'intro',
    'Consulta el estado de los materiales que subiste, edita sus datos o elimínalos.'));
  const aviso = elemento('div');
  const lista = elemento('div');
  contenido.append(aviso, lista);

  const ETIQUETAS = {
    pendiente_validacion: 'Pendiente', validado: 'Validado', rechazado: 'Rechazado',
    suspendido: 'Suspendido', retirado: 'Retirado',
  };

  function boton(texto, clase, accion) {
    const b = elemento('button', clase, texto);
    b.type = 'button';
    b.addEventListener('click', accion);
    return b;
  }

  async function cargar() {
    try {
      const { materiales } = await api('/mis-materiales');
      lista.replaceChildren();
      if (materiales.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'Todavía no has subido materiales.'));
        return;
      }
      materiales.forEach((m) => lista.appendChild(crearTarjeta(m)));
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  function crearTarjeta(m) {
    const tarjeta = elemento('div', 'material');
    const encabezado = elemento('div', 'encabezado');
    encabezado.appendChild(elemento('h3', '', m.titulo));
    encabezado.appendChild(elemento('span', `insignia ${m.estado}`, ETIQUETAS[m.estado] || m.estado));
    tarjeta.appendChild(encabezado);

    tarjeta.appendChild(elemento('div', '', `Materia: ${m.materia} | Formato: ${m.formato}`));
    if (m.descripcion) tarjeta.appendChild(elemento('div', '', m.descripcion));
    tarjeta.appendChild(elemento('div', 'pequeno',
      `Subido el ${new Date(m.fecha_carga).toLocaleDateString('es-MX')}`));
    if (m.estado === 'validado' && m.codigo_validacion) {
      tarjeta.appendChild(elemento('div', 'pequeno', `Código de validación: ${m.codigo_validacion}`));
    }
    if (m.estado === 'rechazado' && m.comentario_docente) {
      tarjeta.appendChild(elemento('div', 'pequeno', `Comentario del docente: ${m.comentario_docente}`));
    }

    const acciones = elemento('div');
    if (m.puede_editar) {
      acciones.append(boton('Editar', 'auto', () => tarjeta.replaceWith(crearEdicion(m))), ' ');
    }
    if (m.puede_eliminar) {
      acciones.appendChild(boton('Eliminar', 'secundario auto', () => confirmarEliminar(m, tarjeta, acciones)));
    }
    tarjeta.appendChild(acciones);
    return tarjeta;
  }

  // Confirmación en la propia tarjeta, sin ventanas emergentes
  function confirmarEliminar(m, tarjeta, acciones) {
    acciones.replaceChildren();
    acciones.appendChild(elemento('div', 'pequeno', '¿Seguro que quieres eliminar este material?'));
    acciones.append(
      boton('Sí, eliminar', 'auto', async () => {
        try {
          const r = await api(`/mis-materiales/${m.id_material}`, { metodo: 'DELETE' });
          mostrarMensaje(aviso, 'ok', r.mensaje);
          await cargar();
        } catch (error) {
          mostrarMensaje(aviso, 'error', error.message);
        }
      }),
      ' ',
      boton('Cancelar', 'secundario auto', () => tarjeta.replaceWith(crearTarjeta(m)))
    );
  }

  function crearEdicion(m) {
    const caja = elemento('div', 'material');
    const formulario = elemento('form');

    const titulo = elemento('input');
    titulo.type = 'text';
    titulo.maxLength = 150;
    titulo.value = m.titulo;
    const descripcion = elemento('textarea');
    descripcion.rows = 3;
    descripcion.maxLength = 500;
    descripcion.value = m.descripcion || '';
    const claves = elemento('input');
    claves.type = 'text';
    claves.maxLength = 200;
    claves.value = m.palabras_clave || '';

    function campo(etiqueta, control) {
      const l = elemento('label', '', etiqueta);
      l.appendChild(control);
      return l;
    }

    const mensaje = elemento('div');
    const guardar = elemento('button', 'auto', 'Guardar cambios');
    guardar.type = 'submit';
    const cancelar = boton('Cancelar', 'secundario auto', () => caja.replaceWith(crearTarjeta(m)));

    formulario.append(
      campo('Título', titulo), campo('Descripción', descripcion), campo('Palabras clave', claves),
      mensaje, guardar, ' ', cancelar
    );
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      try {
        const r = await api(`/mis-materiales/${m.id_material}`, {
          metodo: 'PUT',
          cuerpo: { titulo: titulo.value, descripcion: descripcion.value, palabrasClave: claves.value },
        });
        mostrarMensaje(aviso, 'ok', r.mensaje);
        await cargar();
      } catch (error) {
        mostrarMensaje(mensaje, 'error', error.message);
      }
    });

    caja.appendChild(formulario);
    return caja;
  }

  cargar();
})();