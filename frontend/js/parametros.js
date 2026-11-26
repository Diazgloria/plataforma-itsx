(async () => {
  const pagina = await cargarLayout('parametros');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Parámetros del Sistema'));
  contenido.appendChild(elemento('p', 'intro',
    'Valores de configuración que aplican a toda la plataforma. Cada campo indica su rango permitido.'));

  const aviso = elemento('div');
  contenido.appendChild(aviso);

  const panel = elemento('div', 'panel');
  const form = elemento('form');
  form.noValidate = true;
  panel.appendChild(form);
  contenido.appendChild(panel);

  let campos = {}; // clave → input
  let iniciales = {}; // clave → valor mostrado al cargar

  async function cargar() {
    try {
      const { parametros } = await api('/parametros');
      form.replaceChildren();
      campos = {};
      iniciales = {};
      parametros.forEach((p) => {
        const etiqueta = elemento('label', '', `${p.etiqueta} (${p.unidad})`);
        const entrada = elemento('input');
        entrada.type = 'number';
        entrada.min = p.min;
        entrada.max = p.max;
        entrada.step = 1;
        entrada.value = p.valor;
        etiqueta.appendChild(entrada);
        etiqueta.appendChild(elemento('p', 'ayuda', `Entre ${p.min} y ${p.max} ${p.unidad}. Por defecto: ${p.defecto}. ${p.ayuda}`));
        form.appendChild(etiqueta);
        campos[p.clave] = entrada;
        iniciales[p.clave] = String(p.valor);
      });
      const barra = elemento('div', 'acciones');
      const guardar = elemento('button', '', 'Guardar parámetros');
      guardar.type = 'submit';
      const restablecer = elemento('button', 'secundario', 'Restablecer valores');
      restablecer.type = 'button';
      restablecer.addEventListener('click', async () => {
        if (!window.confirm('¿Restablecer todos los parámetros a sus valores por defecto?')) return;
        try {
          const r = await api('/parametros/restablecer', { metodo: 'POST', cuerpo: {} });
          mostrarMensaje(aviso, 'ok', `${r.mensaje} El cierre de sesión por inactividad se aplica al reiniciar el servidor.`);
          await cargar();
        } catch (error) {
          mostrarMensaje(aviso, 'error', error.message);
        }
      });
      barra.append(guardar, restablecer);
      form.appendChild(barra);
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const valores = {};
    // Solo se envían los valores que cambiaron
    Object.entries(campos).forEach(([clave, entrada]) => {
      if (entrada.value !== iniciales[clave]) valores[clave] = entrada.value;
    });
    if (Object.keys(valores).length === 0) { mostrarMensaje(aviso, 'error', 'No hay cambios que guardar.'); return; }
    try {
      const r = await api('/parametros', { metodo: 'PUT', cuerpo: { valores } });
      mostrarMensaje(aviso, 'ok', r.requiere_reinicio
        ? `${r.mensaje} El cierre de sesión por inactividad se aplicará al reiniciar el servidor.`
        : r.mensaje);
      await cargar();
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message, error.detalles);
    }
  });

  cargar();
})();
