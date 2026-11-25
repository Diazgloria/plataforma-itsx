(async () => {
  const pagina = await cargarLayout('buscar');
  if (!pagina) return;
  const { contenido } = pagina;

  const id = Number(new URLSearchParams(window.location.search).get('id'));
  const aviso = elemento('div');

  function tamano(bytes) {
    return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const ETIQUETAS = {
    pendiente_validacion: 'Pendiente', validado: 'Validado', rechazado: 'Rechazado',
    suspendido: 'Suspendido', retirado: 'Retirado',
  };

  let material;
  try {
    if (!Number.isInteger(id) || id < 1) throw new Error('Material no válido.');
    material = (await api(`/detalle/${id}`)).material;
  } catch (error) {
    contenido.appendChild(elemento('h1', '', 'Detalle del material'));
    const caja = elemento('div');
    mostrarMensaje(caja, 'error', error.message);
    contenido.appendChild(caja);
    return;
  }

  const volver = elemento('a', '', '← Volver a resultados');
  volver.href = 'buscar.html';
  contenido.appendChild(volver);

  const titulo = elemento('div', 'encabezado');
  titulo.appendChild(elemento('h1', '', material.titulo));
  titulo.appendChild(elemento('span', `insignia ${material.estado}`, ETIQUETAS[material.estado] || material.estado));
  contenido.appendChild(titulo);

  const ficha = elemento('div', 'detalle');
  function fila(etiqueta, valor) {
    const f = elemento('div', 'fila');
    f.appendChild(elemento('b', '', etiqueta));
    f.appendChild(elemento('span', '', valor));
    ficha.appendChild(f);
  }
  fila('Materia', `${material.materia} (${String(material.materia_clave).trim()})`);
  fila('Semestre', String(material.semestre));
  fila('Tipo', material.tipo);
  fila('Autor', material.autor);
  fila('Fecha de subida', new Date(material.fecha_carga).toLocaleDateString('es-MX'));
  fila('Versión vigente', String(material.version));
  fila('Archivo', `${material.nombre_archivo} (${material.formato}, ${tamano(material.tamano_bytes)})`);
  if (material.descripcion) fila('Descripción', material.descripcion);
  if (material.palabras_clave) fila('Palabras clave', material.palabras_clave);
  fila('Huella digital (SHA-256)', material.huella_sha256);
  fila('Código de validación', material.codigo_validacion || 'Sin código (no está validado)');
  fila('Descargas', String(material.descargas));
  contenido.appendChild(ficha);

  const acciones = elemento('div', 'acciones');
  const descargar = elemento('a', '', '⬇ Descargar');
  descargar.href = `/api/materiales/${material.id_material}/archivo`;
  acciones.appendChild(descargar);

  if (material.puede_favorito) {
    let esFavorito = material.es_favorito;
    const boton = elemento('button', 'secundario');
    boton.type = 'button';
    const pintar = () => { boton.textContent = esFavorito ? '★ Quitar de favoritos' : '☆ Marcar como favorito'; };
    pintar();
    boton.addEventListener('click', async () => {
      try {
        const r = await api(`/favoritos/${material.id_material}`, { metodo: esFavorito ? 'DELETE' : 'POST' });
        esFavorito = !esFavorito;
        pintar();
        mostrarMensaje(aviso, 'ok', r.mensaje);
      } catch (error) {
        mostrarMensaje(aviso, 'error', error.message);
      }
    });
    acciones.appendChild(boton);
  }
  contenido.append(acciones, aviso);
})();
