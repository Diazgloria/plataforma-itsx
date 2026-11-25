(async () => {
  const pagina = await cargarLayout('notificaciones');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Notificaciones'));
  contenido.appendChild(elemento('p', 'intro', 'Avisos sobre tus materiales y tu cuenta.'));

  const pestanas = elemento('div', 'pestanas');
  const btnTodas = elemento('button', 'activa', 'Todas');
  const btnNoLeidas = elemento('button', '', 'No leídas');
  const btnLeerTodas = elemento('button', '', 'Marcar todas como leídas');
  [btnTodas, btnNoLeidas, btnLeerTodas].forEach((b) => { b.type = 'button'; });
  pestanas.append(btnTodas, btnNoLeidas, btnLeerTodas);
  contenido.appendChild(pestanas);

  const aviso = elemento('div');
  const lista = elemento('div');
  contenido.append(aviso, lista);

  let filtro = 'todas';

  async function cargar() {
    try {
      const consulta = filtro === 'no_leidas' ? '?filtro=no_leidas' : '';
      const { notificaciones } = await api('/notificaciones' + consulta);
      lista.replaceChildren();
      if (notificaciones.length === 0) {
        lista.appendChild(elemento('p', 'vacio', 'No tienes notificaciones'));
        return;
      }
      notificaciones.forEach((n) => lista.appendChild(crearAviso(n)));
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  function crearAviso(n) {
    const caja = elemento('div', n.leida ? 'aviso' : 'aviso no-leido');
    caja.appendChild(elemento('div', 'texto', (n.leida ? '' : '● ') + n.mensaje));
    caja.appendChild(elemento('div', 'pequeno', new Date(n.fecha).toLocaleString('es-MX')));
    if (n.id_material) {
      const ver = elemento('button', 'secundario', 'Ver material');
      ver.type = 'button';
      ver.addEventListener('click', async () => {
        try { await api(`/notificaciones/${n.id_notificacion}/leer`, { metodo: 'POST' }); } catch (e) { /* se abre igual */ }
        window.location.href = `detalle.html?id=${n.id_material}`;
      });
      caja.appendChild(ver);
    }
    return caja;
  }

  function elegir(nuevo) {
    filtro = nuevo;
    btnTodas.className = nuevo === 'todas' ? 'activa' : '';
    btnNoLeidas.className = nuevo === 'no_leidas' ? 'activa' : '';
    cargar();
  }

  btnTodas.addEventListener('click', () => elegir('todas'));
  btnNoLeidas.addEventListener('click', () => elegir('no_leidas'));
  btnLeerTodas.addEventListener('click', async () => {
    try {
      const r = await api('/notificaciones/leer-todas', { metodo: 'POST' });
      mostrarMensaje(aviso, 'ok', r.mensaje);
      cargar();
      const contador = document.querySelector('.contador');
      if (contador) contador.hidden = true;
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  });

  cargar();
})();
