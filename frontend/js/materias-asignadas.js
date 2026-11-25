(async () => {
  const pagina = await cargarLayout('materias-asignadas');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(elemento('h1', '', 'Mis Materias Asignadas'));
  contenido.appendChild(elemento('p', 'intro', 'Materias de tronco común cuyos materiales validas.'));

  const semestre = elemento('select');
  const todos = elemento('option', '', 'Todos los semestres');
  todos.value = '';
  semestre.appendChild(todos);
  for (let n = 1; n <= 8; n++) {
    const opcion = elemento('option', '', `Semestre ${n}`);
    opcion.value = n;
    semestre.appendChild(opcion);
  }
  const filtros = elemento('div', 'filtros');
  filtros.appendChild(semestre);
  contenido.appendChild(filtros);

  const aviso = elemento('div');
  const rejilla = elemento('div', 'rejilla-materias');
  contenido.append(aviso, rejilla);

  async function cargar() {
    try {
      const consulta = semestre.value ? `?semestre=${semestre.value}` : '';
      const { materias } = await api('/docente/materias' + consulta);
      rejilla.replaceChildren();
      if (materias.length === 0) {
        rejilla.appendChild(elemento('p', 'vacio', 'Solicita al Administrador que te asigne materias'));
        return;
      }
      materias.forEach((m) => {
        const tarjeta = elemento('div', 'materia');
        tarjeta.appendChild(elemento('h3', '', m.nombre));
        tarjeta.appendChild(elemento('div', 'clave', `${String(m.clave).trim()} · Semestre ${m.semestre}`));
        tarjeta.appendChild(elemento('div', 'cantidad', `Pendientes: ${m.pendientes}`));
        tarjeta.appendChild(elemento('div', 'cantidad', `Validados: ${m.validados}`));
        const ver = elemento('a', '', 'Ver materiales');
        ver.href = `validar.html?clave=${encodeURIComponent(String(m.clave).trim())}`;
        tarjeta.appendChild(ver);
        rejilla.appendChild(tarjeta);
      });
    } catch (error) {
      mostrarMensaje(aviso, 'error', error.message);
    }
  }

  semestre.addEventListener('change', cargar);
  cargar();
})();
