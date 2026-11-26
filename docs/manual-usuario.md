# Manual de usuario (resumen)

Guía rápida paso a paso de la Plataforma ITSX. Se entra desde el navegador a la dirección donde esté instalada (en pruebas locales, `http://localhost:3000`).

## Para todos los roles

**Iniciar sesión.** Escribe tu correo institucional y tu contraseña en la pantalla inicial y pulsa *Iniciar Sesión*. Tras 5 intentos fallidos la cuenta se bloquea unos minutos.

**Recuperar contraseña.** En la pantalla inicial pulsa *¿Olvidaste tu contraseña?*, escribe tu correo y abre el enlace que llega por correo. Elige una contraseña nueva (mínimo 8 caracteres, con mayúscula y número).

**Mi perfil.** Permite revisar tus datos y cambiar tu contraseña.

**Notificaciones.** La campana 🔔 del encabezado muestra los avisos sin leer (material validado, rechazado, suspendido...). Se pueden marcar como leídos.

**Cerrar sesión.** Última opción del menú lateral.

## Estudiante

1. **Registrarte.** En *Registrarse* captura nombre, apellidos, matrícula, semestre, correo institucional (`@itsx.edu.mx`) y contraseña. Abre el enlace de verificación que llega a tu correo y después inicia sesión.
2. **Buscar y descargar.** En *Buscar / Catálogo* escribe una palabra y filtra por materia, semestre o tipo. Pulsa *Ver detalle* para ver el código de validación y la huella SHA-256, y *Descargar* para bajar el archivo. Solo se muestran materiales validados.
3. **Subir un material.** En *Subir Material* elige la materia, escribe título y descripción, selecciona el archivo (PDF, DOCX, PPTX, XLSX, JPG o PNG, hasta 20 MB), marca la declaración de originalidad y pulsa *Subir Archivo*. Queda pendiente de validación.
4. **Seguir tus materiales.** En *Mis Materiales* ves el estado de cada uno (pendiente, validado, rechazado). Los pendientes y rechazados se pueden editar; si fue rechazado, se muestra el comentario del docente. Al validarse recibes el código de validación.
5. **Favoritos.** En el detalle de un material pulsa *Marcar como favorito*; los encuentras en *Mis Favoritos*.
6. **Mis materias y semestres.** Navegación por tus materias y por semestre.

## Docente

1. **Mis Materias Asignadas.** Muestra las materias que te asignó el administrador y cuántos materiales hay pendientes en cada una.
2. **Validar Materiales.** Lista los materiales pendientes de tus materias. Pulsa *Revisar* para ver los datos y descargar el archivo.
3. **Aprobar.** Pulsa *Aprobar*: el sistema emite el código de validación y avisa al autor.
4. **Rechazar.** Escribe un comentario obligatorio y pulsa *Rechazar*: el autor recibe el aviso con tu comentario.

## Administrador

- **Gestión de Usuarios:** consultar estudiantes, docentes y administradores; registrar docentes y administradores (con contraseña temporal), asignar materias a docentes, suspender, reactivar o eliminar cuentas (no se eliminan las que tienen actividad).
- **Catálogo de Materias:** agregar, editar, desactivar o eliminar materias.
- **Tipos de Material:** administrar los tipos (Apuntes, Resumen, Práctica, etc.).
- **Moderación de Contenidos:** suspender (con motivo), reactivar, retirar o eliminar materiales; supervisar validaciones.
- **Parámetros del Sistema:** tamaño máximo de archivo, intentos de inicio de sesión, minutos de bloqueo y tiempo de inactividad de la sesión.
- **Bitácora de Auditoría:** consultar con filtros las acciones del sistema y exportarlas a CSV.
- **Estadísticas y Reportes:** indicadores y gráficas por semestre y periodo; *Descargar reporte (PDF)* usa la impresión del navegador.
