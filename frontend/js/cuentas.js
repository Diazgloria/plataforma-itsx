(async () => {
  const pagina = await cargarLayout('cuentas');
  if (!pagina) return;
  const { usuario, contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Gestión de Usuarios'));
  contenido.appendChild(elemento('p', 'intro',
    'Administra las cuentas de estudiantes, docentes y administradores.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  const ROLES = [
    { id: 'estudiante', texto: 'Estudiantes' },
    { id: 'docente', texto: 'Docentes' },
    { id: 'administrador', texto: 'Administradores' },
  ];
  const ESTADOS = {
    activa: { clase: 'activa', texto: 'Activa' },
    suspendida: { clase: 'suspendida', texto: 'Suspendida' },
    pendiente_verificacion: { clase: 'pendiente', texto: 'Pendiente de verificar' },
  };
  let rolActual = 'estudiante';

  // Pestañas por tipo de usuario
  const pestanas = elemento('div', 'pestanas');
  const botonesRol = {};
  ROLES.forEach((r) => {
    const b = elemento('button', '', r.texto);
    b.type = 'button';
    b.addEventListener('click', () => { rolActual = r.id; cerrarPaneles(); marcarPestana(); cargar(); });
    botonesRol[r.id] = b;
    pestanas.appendChild(b);
  });
  function marcarPestana() {
    Object.entries(botonesRol).forEach(([id, b]) => b.classList.toggle('activa', id === rolActual));
    nuevo.hidden = rolActual === 'estudiante'; // los estudiantes se registran solos
    nuevo.textContent = rolActual === 'docente' ? 'Registrar docente' : 'Registrar administrador';
  }

  // Búsqueda y botón de alta
  const buscar = elemento('input');
  buscar.type = 'search';
  buscar.placeholder = 'Buscar por nombre, correo o matrícula';
  buscar.maxLength = 80;
  const nuevo = elemento('button', 'auto', 'Registrar docente');
  nuevo.type = 'button';
  const filtros = elemento('div', 'filtros');
  filtros.append(buscar);
  contenido.append(pestanas, filtros, nuevo);

  // Formulario de alta / edición
  const panelForm = elemento('div', 'panel');
  panelForm.hidden = true;
  const tituloForm = elemento('h2', '', '');
  const form = elemento('form');
  form.noValidate = true;
  const campo = (etiqueta, tipo, extra = {}) => {
    const l = elemento('label', '', etiqueta);
    const i = elemento('input');
    i.type = tipo;
    Object.assign(i, extra);
    l.appendChild(i);
    form.appendChild(l);
    return { l, i };
  };
  const cNombre = campo('Nombre', 'text', { maxLength: 80 });
  const cApellidos = campo('Apellidos', 'text', { maxLength: 100 });
  const cCorreo = campo('Correo institucional', 'email', { maxLength: 120 });
  const cDepto = campo('Departamento', 'text', { maxLength: 80 });
  const cClave = campo('Contraseña temporal', 'text', { maxLength: 60, autocomplete: 'off' });
  const ayudaClave = elemento('p', 'ayuda',
    'Mínimo 8 caracteres con mayúscula, minúscula y número. Entrégala a la persona usuaria; podrá cambiarla con "¿Olvidaste tu contraseña?".');
  cClave.l.appendChild(ayudaClave);
  const barraForm = elemento('div', 'acciones');
  const guardar = elemento('button', '', 'Guardar');
  guardar.type = 'submit';
  const cancelar = elemento('button', 'secundario', 'Cancelar');
  cancelar.type = 'button';
  barraForm.append(guardar, cancelar);
  form.appendChild(barraForm);
  panelForm.append(tituloForm, form);

  // Panel para asignar materias a un docente
  const panelMaterias = elemento('div', 'panel');
  panelMaterias.hidden = true;
  contenido.append(panelForm, panelMaterias);

  const lista = elemento('div');
  contenido.appendChild(lista);

  let editando = null; // cuenta en edición (null = alta)

  function cerrarPaneles() {
    panelForm.hidden = true;
    panelMaterias.hidden = true;
    editando = null;
  }

  function abrirForm(cuenta) {
    cerrarPaneles();
    editando = cuenta || null;
    form.reset();
    const esDocente = cuenta ? cuenta.rol === 'docente' : rolActual === 'docente';
    tituloForm.textContent = cuenta
      ? `Editar a ${cuenta.nombre} ${cuenta.apellidos}`
      : (rolActual === 'docente' ? 'Registrar docente' : 'Registrar administrador');
    cNombre.i.value = cuenta ? cuenta.nombre : '';
    cApellidos.i.value = cuenta ? cuenta.apellidos : '';
    cCorreo.i.value = cuenta ? cuenta.correo : '';
    cCorreo.i.disabled = Boolean(cuenta); // el correo es el acceso: no se cambia desde aquí
    cDepto.i.value = cuenta && cuenta.departamento ? cuenta.departamento : '';
    cDepto.l.hidden = !esDocente;
    cClave.l.hidden = Boolean(cuenta);
    panelForm.hidden = false;
    panelForm.scrollIntoView({ behavior: 'smooth' });
  }

  async function abrirMaterias(cuenta) {
    cerrarPaneles();
    panelMaterias.replaceChildren(elemento('h2', '', `Materias de ${cuenta.nombre} ${cuenta.apellidos}`));
    panelMaterias.hidden = false;
    try {
      const [{ materias }, { materias: asignadas }] = await Promise.all([
        api('/materias'), api(`/cuentas/${cuenta.id}/materias`),
      ]);
      if (materias.length === 0) {
        panelMaterias.appendChild(elemento('p', 'vacio', 'No hay materias activas en el catálogo.'));
        return;
      }
      const marcadas = new Set(asignadas);
      const cajas = [];
      materias.forEach((m) => {
        const l = elemento('label', 'casilla');
        const c = elemento('input');
        c.type = 'checkbox';
        c.value = m.id_materia;
        c.checked = marcadas.has(m.id_materia);
        cajas.push(c);
        l.append(c, document.createTextNode(` ${String(m.clave).trim()} · ${m.nombre} (semestre ${m.semestre})`));
        panelMaterias.appendChild(l);
      });
      const barra = elemento('div', 'acciones');
      const ok = elemento('button', '', 'Guardar asignación');
      ok.type = 'button';
      ok.addEventListener('click', async () => {
        try {
          const r = await api(`/cuentas/${cuenta.id}/materias`, {
            metodo: 'PUT', cuerpo: { materias: cajas.filter((c) => c.checked).map((c) => Number(c.value)) },
          });
          mostrarMensaje(aviso, 'ok', r.mensaje);
          cerrarPaneles();
          await cargar();
        } catch (error) {
          mostrarMensaje(aviso, 'error', error.message);
        }
      });
      const no = elemento('button', 'secundario', 'Cancelar');
      no.type = 'button';
      no.addEventListener('click', cerrarPaneles);
      barra.append(ok, no);
      panelMaterias.appendChild(barra);
      panelMaterias.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  async function ejecutar(accion) {
    try {
      const r = await accion();
      mostrarMensaje(aviso, 'ok', r.mensaje);
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    }
  }

  function tarjeta(c) {
    const t = elemento('div', 'material');
    const encabezado = elemento('div', 'encabezado');
    encabezado.appendChild(elemento('h3', '', `${c.nombre} ${c.apellidos}`));
    const estado = ESTADOS[c.estado] || { clase: 'retirado', texto: c.estado };
    encabezado.appendChild(elemento('span', `insignia ${estado.clase}`, estado.texto));
    t.appendChild(encabezado);

    t.appendChild(elemento('div', '', c.correo));
    const detalle = [];
    if (c.rol === 'estudiante') detalle.push(`Matrícula: ${c.matricula || '—'}`, `Semestre: ${c.semestre || '—'}`);
    if (c.rol === 'docente') detalle.push(`Departamento: ${c.departamento || '—'}`);
    detalle.push(`ID: ${c.id}`, `Registro: ${new Date(c.fecha_registro).toLocaleDateString('es-MX')}`);
    t.appendChild(elemento('div', 'pequeno', detalle.join(' · ')));
    if (c.rol === 'estudiante') t.appendChild(elemento('div', 'pequeno', `Materiales subidos: ${c.materiales}`));
    if (c.rol === 'docente') t.appendChild(elemento('div', 'pequeno', `Materias asignadas: ${c.materias}`));

    const barra = elemento('div', 'acciones');
    const boton = (texto, clase, accion) => {
      const b = elemento('button', clase, texto);
      b.type = 'button';
      b.addEventListener('click', accion);
      barra.appendChild(b);
    };
    boton('Editar', 'secundario', () => abrirForm(c));
    if (c.rol === 'docente') boton('Materias', 'secundario', () => abrirMaterias(c));
    if (c.id !== usuario.id) { // el administrador no puede suspender ni eliminar su propia cuenta
      if (c.estado === 'activa') {
        boton('Suspender', 'secundario', () => ejecutar(
          () => api(`/cuentas/${c.id}/estado`, { metodo: 'POST', cuerpo: { estado: 'suspendida' } })));
      }
      if (c.estado === 'suspendida') {
        boton('Reactivar', 'secundario', () => ejecutar(
          () => api(`/cuentas/${c.id}/estado`, { metodo: 'POST', cuerpo: { estado: 'activa' } })));
      }
      boton('Eliminar', 'peligro', () => {
        if (!window.confirm(`¿Eliminar la cuenta de ${c.nombre} ${c.apellidos}? Esta acción no se puede deshacer.`)) return;
        ejecutar(() => api(`/cuentas/${c.id}`, { metodo: 'DELETE' }));
      });
    }
    t.appendChild(barra);
    return t;
  }

  async function cargar() {
    try {
      const q = encodeURIComponent(buscar.value.trim());
      const { cuentas } = await api(`/cuentas?rol=${rolActual}&q=${q}`);
      lista.replaceChildren();
      if (cuentas.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'No se encontraron cuentas.'));
        return;
      }
      cuentas.forEach((c) => lista.appendChild(tarjeta(c)));
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    guardar.disabled = true;
    try {
      const cuerpo = { nombre: cNombre.i.value, apellidos: cApellidos.i.value, departamento: cDepto.i.value };
      let r;
      if (editando) {
        r = await api(`/cuentas/${editando.id}`, { metodo: 'PUT', cuerpo });
      } else {
        r = await api('/cuentas', {
          metodo: 'POST',
          cuerpo: { ...cuerpo, rol: rolActual, correo: cCorreo.i.value, contrasena: cClave.i.value },
        });
      }
      mostrarMensaje(aviso, 'ok', r.mensaje);
      cerrarPaneles();
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    } finally {
      guardar.disabled = false;
    }
  });
  cancelar.addEventListener('click', cerrarPaneles);
  nuevo.addEventListener('click', () => abrirForm(null));
  let espera;
  buscar.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });

  marcarPestana();
  cargar();
})();
