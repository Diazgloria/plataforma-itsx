(async () => {
  const pagina = await cargarLayout('validar');
  if (!pagina) return;
  const { contenido } = pagina;

  const titulo = elemento('h1', '', 'Validar Materiales');
  const vista = elemento('div');
  contenido.append(titulo, vista);

  // PT-14: cola de materiales pendientes
  async function mostrarCola(aviso) {
    titulo.textContent = 'Validar Materiales';
    vista.replaceChildren();
    if (aviso) {
      const caja = elemento('div');
      mostrarMensaje(caja, 'ok', aviso);
      vista.appendChild(caja);
    }
    vista.appendChild(elemento('h2', '', 'Materiales pendientes de revisión'));

    try {
      const { materiales } = await api('/validacion/pendientes');
      if (materiales.length === 0) {
        vista.appendChild(elemento('p', 'vacio', 'No hay materiales pendientes de validar en tus materias.'));
        return;
      }
      materiales.forEach((m) => {
        const tarjeta = elemento('div', 'material');
        const encabezado = elemento('div', 'encabezado');
        encabezado.appendChild(elemento('h3', '', m.titulo));
        encabezado.appendChild(elemento('span', 'insignia pendiente_validacion', 'Pendiente'));
        tarjeta.appendChild(encabezado);
        tarjeta.appendChild(elemento('div', '', `Materia: ${m.materia} | Formato: ${m.formato}`));
        tarjeta.appendChild(elemento('div', 'pequeno',
          `Subido por: ${m.autor} el ${new Date(m.fecha_carga).toLocaleDateString('es-MX')}`));
        const revisar = elemento('button', 'auto', 'Revisar');
        revisar.type = 'button';
        revisar.addEventListener('click', () => mostrarRevision(m.id_material));
        tarjeta.appendChild(revisar);
        vista.appendChild(tarjeta);
      });
    } catch (error) {
      const caja = elemento('div');
      mostrarMensaje(caja, 'error', error.message);
      vista.appendChild(caja);
    }
  }

  // PT-15: revisión de un material y decisión
  async function mostrarRevision(id) {
    vista.replaceChildren();
    titulo.textContent = 'Revisar material';

    let m;
    try {
      m = (await api(`/validacion/${id}`)).material;
    } catch (error) {
      await mostrarCola();
      const caja = elemento('div');
      mostrarMensaje(caja, 'error', error.message);
      vista.prepend(caja);
      return;
    }

    const tarjeta = elemento('div', 'material');
    tarjeta.appendChild(elemento('h3', '', m.titulo));
    tarjeta.appendChild(elemento('div', '', `Materia: ${m.materia} (${m.materia_clave.trim()})`));
    tarjeta.appendChild(elemento('div', '', `Autor: ${m.autor}`));
    tarjeta.appendChild(elemento('div', '', `Archivo: ${m.nombre_archivo} (${m.formato}), versión ${m.version}`));
    if (m.descripcion) tarjeta.appendChild(elemento('div', '', `Descripción: ${m.descripcion}`));
    if (m.palabras_clave) tarjeta.appendChild(elemento('div', '', `Palabras clave: ${m.palabras_clave}`));
    const descarga = elemento('a', '', 'Descargar documento para revisarlo');
    descarga.href = `/api/materiales/${m.id_material}/archivo`;
    descarga.target = '_blank';
    tarjeta.appendChild(descarga);
    vista.appendChild(tarjeta);

    const etiqueta = elemento('label', '', 'Comentario para el autor (obligatorio si rechazas)');
    const comentario = elemento('textarea');
    comentario.rows = 4;
    comentario.maxLength = 500;
    etiqueta.appendChild(comentario);
    vista.appendChild(etiqueta);

    const aviso = elemento('div');
    vista.appendChild(aviso);

    const aprobar = elemento('button', 'auto', '✅ Aprobar');
    const rechazar = elemento('button', 'secundario auto', '❌ Rechazar');
    const volver = elemento('button', 'secundario auto', 'Volver a la lista');
    [aprobar, rechazar, volver].forEach((b) => { b.type = 'button'; });
    const fila = elemento('div');
    fila.append(aprobar, ' ', rechazar, ' ', volver);
    vista.appendChild(fila);

    async function decidir(decision) {
      if (decision === 'rechazado' && !comentario.value.trim()) {
        mostrarMensaje(aviso, 'error', 'Para rechazar un material debes escribir un comentario.');
        return;
      }
      aprobar.disabled = true;
      rechazar.disabled = true;
      try {
        const r = await api(`/validacion/${id}/decision`, {
          metodo: 'POST',
          cuerpo: { decision, comentario: comentario.value },
        });
        await mostrarCola(decision === 'aprobado'
          ? `Material validado. Código de validación: ${r.codigo}`
          : 'Material rechazado. Se notificó al autor.');
      } catch (error) {
        mostrarMensaje(aviso, 'error', error.message);
        aprobar.disabled = false;
        rechazar.disabled = false;
      }
    }

    aprobar.addEventListener('click', () => decidir('aprobado'));
    rechazar.addEventListener('click', () => decidir('rechazado'));
    volver.addEventListener('click', () => mostrarCola());
  }

  mostrarCola();
})();