// Opciones del menú lateral por rol. Cada rama nueva agrega sus pantallas aquí.
const MENU = {
  estudiante: [
    { id: 'inicio', texto: '🏠 Inicio', href: 'panel.html' },
    { id: 'buscar', texto: '🔍 Buscar / Catálogo', href: 'buscar.html' },
    { id: 'subir-material', texto: '📤 Subir Material', href: 'subir-material.html' },
    { id: 'mis-materiales', texto: '📁 Mis Materiales', href: 'mis-materiales.html' },
    { id: 'favoritos', texto: '⭐ Mis Favoritos', href: 'favoritos.html' },
    { id: 'mis-materias', texto: '📚 Mis Materias', href: 'mis-materias.html' },
    { id: 'semestres', texto: '📅 Semestres', href: 'semestres.html' },
    { id: 'perfil', texto: '👤 Mi perfil', href: 'perfil.html' },
  ],
  docente: [
    { id: 'inicio', texto: '🏠 Inicio', href: 'panel.html' },
    { id: 'buscar', texto: '🔍 Buscar / Catálogo', href: 'buscar.html' },
    { id: 'validar', texto: '✅ Validar Materiales', href: 'validar.html' },
    { id: 'materias-asignadas', texto: '📚 Mis Materias Asignadas', href: 'materias-asignadas.html' },
    { id: 'semestres', texto: '📅 Semestres', href: 'semestres.html' },
    { id: 'perfil', texto: '👤 Mi perfil', href: 'perfil.html' },
  ],
  administrador: [
    { id: 'inicio', texto: '🏠 Inicio', href: 'panel.html' },
    { id: 'buscar', texto: '🔍 Buscar / Catálogo', href: 'buscar.html' },
    { id: 'moderacion', texto: '🛡️ Moderación de Contenidos', href: 'moderacion.html' },
    { id: 'cuentas', texto: '👥 Gestión de Usuarios', href: 'cuentas.html' },
    { id: 'catalogo', texto: '🗂️ Catálogo de Materias', href: 'catalogo.html' },
    { id: 'tipos', texto: '🏷️ Tipos de Material', href: 'tipos.html' },
    { id: 'semestres', texto: '📅 Semestres', href: 'semestres.html' },
    { id: 'perfil', texto: '👤 Mi perfil', href: 'perfil.html' },
  ],
};

// Crea un elemento con clase y texto (el texto se inserta como texto, nunca como HTML)
function elemento(etiqueta, clase, texto) {
  const e = document.createElement(etiqueta);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

// Dibuja el menú lateral y devuelve { usuario, contenido }. Sin sesión, regresa al inicio de sesión.
async function cargarLayout(paginaActiva) {
  let usuario;
  try {
    usuario = (await api('/auth/yo')).usuario;
  } catch (error) {
    window.location.href = 'index.html';
    return null;
  }

  const raiz = document.getElementById('app');
  raiz.className = 'app';

  const lateral = elemento('aside', 'lateral');
  lateral.appendChild(elemento('div', 'marca', 'Plataforma ITSX'));
  lateral.appendChild(elemento('div', 'usuario', `${usuario.nombre} ${usuario.apellidos}`));
  if (usuario.rol === 'administrador') lateral.appendChild(elemento('span', 'perfil', 'Perfil: Administrador'));
  if (usuario.rol === 'docente') lateral.appendChild(elemento('span', 'perfil', 'Perfil: Docente'));

  const nav = elemento('nav');
  (MENU[usuario.rol] || []).forEach((opcion) => {
    const enlace = elemento('a', opcion.id === paginaActiva ? 'activo' : '', opcion.texto);
    enlace.href = opcion.href;
    nav.appendChild(enlace);
  });
  lateral.appendChild(nav);

  const salir = elemento('button', 'btn-salir', 'Cerrar Sesión');
  salir.type = 'button';
  salir.addEventListener('click', async () => {
    try { await api('/auth/logout', { metodo: 'POST' }); } catch (e) { /* se vuelve al inicio igual */ }
    reiniciarCsrf();
    window.location.href = 'index.html';
  });
  lateral.appendChild(salir);

  const contenido = elemento('main', 'contenido');
  raiz.append(lateral, contenido);

  // Campana de notificaciones con el número de avisos sin leer (visible para los tres roles)
  const barra = elemento('div', 'barra');
  const campana = elemento('a', 'campana', '🔔');
  campana.href = 'notificaciones.html';
  campana.title = 'Notificaciones';
  const contador = elemento('span', 'contador');
  contador.hidden = true;
  campana.appendChild(contador);
  barra.appendChild(campana);
  contenido.appendChild(barra);
  api('/notificaciones/contador').then(({ total }) => {
    if (total > 0) {
      contador.textContent = total > 99 ? '99+' : String(total);
      contador.hidden = false;
    }
  }).catch(() => { /* la campana es opcional: si falla, la página funciona igual */ });

  return { usuario, contenido };
}