const ROLES = { estudiante: 'Estudiante', docente: 'Docente', administrador: 'Administrador' };
const ESTADOS = { activa: 'Activo', pendiente_verificacion: 'Pendiente de verificación', suspendida: 'Suspendido' };

(async () => {
  const pagina = await cargarLayout('perfil');
  if (!pagina) return;
  const { contenido } = pagina;

  contenido.appendChild(document.getElementById('plantilla').content.cloneNode(true));
  activarVerContrasena(contenido);

  const mensajeDatos = document.getElementById('mensajeDatos');
  const mensajeClave = document.getElementById('mensajeClave');

  // ----- Datos personales -----
  let perfil;
  try {
    ({ perfil } = await api('/perfil'));
  } catch (error) {
    mostrarMensaje(mensajeDatos, 'error', error.message);
    return;
  }
  document.getElementById('nombre').value = perfil.nombre;
  document.getElementById('apellidos').value = perfil.apellidos;
  if (perfil.rol === 'estudiante') {
    document.getElementById('bloqueSemestre').hidden = false;
    document.getElementById('semestre').value = String(perfil.semestre);
  }

  const lectura = [
    ['Correo institucional', perfil.correo],
    ['Matrícula', perfil.matricula || '—'],
    ['Rol / Estado', `${ROLES[perfil.rol]} · ${ESTADOS[perfil.estado]}`],
    ['Fecha de registro', new Date(perfil.fechaRegistro).toLocaleDateString('es-MX')],
  ];
  if (perfil.departamento) lectura.splice(2, 0, ['Departamento', perfil.departamento]);
  lectura.forEach(([etiqueta, valor]) => {
    const fila = elemento('div', 'solo-lectura');
    fila.appendChild(elemento('b', '', etiqueta));
    fila.appendChild(elemento('span', '', valor));
    document.getElementById('datosLectura').appendChild(fila);
  });

  document.getElementById('formDatos').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const boton = document.getElementById('btnDatos');
    boton.disabled = true;
    try {
      const respuesta = await api('/perfil', {
        metodo: 'PUT',
        cuerpo: {
          nombre: document.getElementById('nombre').value,
          apellidos: document.getElementById('apellidos').value,
          semestre: document.getElementById('semestre').value,
        },
      });
      mostrarMensaje(mensajeDatos, 'ok', respuesta.mensaje);
    } catch (error) {
      mostrarMensaje(mensajeDatos, 'error', error.message, error.detalles);
    } finally {
      boton.disabled = false;
    }
  });

  // ----- Cambio de contraseña -----
  document.getElementById('formClave').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const nueva = document.getElementById('nueva').value;
    if (nueva !== document.getElementById('confirmar').value) {
      mostrarMensaje(mensajeClave, 'error', 'Las contraseñas nuevas no coinciden.');
      return;
    }
    const boton = document.getElementById('btnClave');
    boton.disabled = true;
    try {
      const respuesta = await api('/perfil/contrasena', {
        metodo: 'POST',
        cuerpo: { actual: document.getElementById('actual').value, nueva },
      });
      mostrarMensaje(mensajeClave, 'ok', respuesta.mensaje);
      document.getElementById('formClave').reset();
    } catch (error) {
      mostrarMensaje(mensajeClave, 'error', error.message, error.detalles);
    } finally {
      boton.disabled = false;
    }
  });
})();