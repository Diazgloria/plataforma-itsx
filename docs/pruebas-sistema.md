# Pruebas de sistema de punta a punta (PRY07 · Hito 3)

Guía para ejecutar y documentar las pruebas del sistema completo. Cada escenario indica la cuenta, los pasos, los datos exactos y el resultado esperado. Los de **fallo** y **restricción** comprueban que la plataforma rechaza lo que debe rechazar.

## 1. Preparación

1. Clona el repositorio y entra a la carpeta: `git clone https://github.com/Diazgloria/plataforma-itsx.git`.
2. En `backend/` copia `.env.example` como `.env` y escribe la contraseña de tu MySQL en `DB_PASSWORD`.
3. En MySQL Workbench ejecuta, en orden, los cuatro scripts de `database/` (ver `database/README.md`).
4. En `backend/` ejecuta `npm install` y luego `npm start`. Debe decir «Conexión a MySQL correcta» y «Servidor escuchando en http://localhost:3000».
5. Abre `http://localhost:3000` en el navegador.

**Importante:** todas las direcciones de esta guía son de `http://localhost:3000` (no uses Live Server ni abras los archivos con doble clic). Los correos son simulados: los enlaces de verificación y recuperación aparecen en la **consola del servidor**.

## 2. Cuentas y archivos de prueba

| Rol | Correo | Contraseña | Notas |
|---|---|---|---|
| Administrador | `admin@itsx.example` | `Prueba.123` | |
| Docente 1 | `docente1@itsx.example` | `Prueba.123` | Cálculo Integral y Álgebra Lineal |
| Docente 2 | `docente2@itsx.example` | `Prueba.123` | Álgebra Lineal y Ecuaciones Diferenciales |
| Estudiante 1 | `estudiante1@itsx.example` | `Prueba.123` | |
| Estudiante 2 | `estudiante2@itsx.example` | `Prueba.123` | |

Los archivos para subir están en `docs/archivos-prueba/` (ver su `README.md`).

## 3. Cómo documentar la evidencia

- Toma una captura por cada escenario (o varias si el escenario tiene varios pasos) y guárdalas con el id: `E01.png`, `E02.png`, `E11a.png`, `E11b.png`...
- La captura debe mostrar la pantalla completa, con la barra de direcciones y el mensaje.
- Si un resultado no es el esperado, **no lo corrijas en silencio**: anótalo como incidencia (qué pasó, causa y ajuste) para el reporte.
- Sigue el orden de la guía: varios escenarios usan datos creados en los anteriores.

## 4. Matriz de pruebas

| ID | Tipo | Escenario | Resultado esperado (resumen) | Resultado obtenido | Evidencia |
|---|---|---|---|---|---|
| E01 | Éxito | Registro de un estudiante nuevo | Mensaje «Cuenta creada. Revisa tu correo institucional para activarla.» En Workbench la cuenta queda `pendiente_verificacion`. |  | E01 |
| E02 | Fallo | Registro con correo que no es institucional | Se rechaza: «El correo debe ser institucional (termina en @itsx.edu.mx).» No se crea la cuenta. |  | E02 |
| E03 | Fallo | Registro con contraseña débil | Se rechaza indicando lo que falta: mínimo 8 caracteres, mayúscula y número. |  | E03 |
| E04 | Fallo | Inicio de sesión sin verificar el correo | Se rechaza: «Debes verificar tu correo antes de iniciar sesión.» |  | E04 |
| E05 | Éxito | Verificación de la cuenta e inicio de sesión | La verificación confirma la cuenta y el inicio de sesión lleva al panel del estudiante (menú con Subir Material, Mis Materiales, Mis Favoritos...). |  | E05 |
| E06 | Fallo | Inicio de sesión con contraseña incorrecta | Se rechaza con un mensaje genérico: «Correo o contraseña incorrectos.» (no revela si el correo existe). |  | E06 |
| E07 | Restricción | Bloqueo por intentos fallidos | Después de 5 fallos aparece «Cuenta bloqueada por intentos fallidos. Intenta de nuevo en N minuto(s).» y ni la contraseña correcta entra. |  | E07 |
| E08 | Éxito | Recuperación de contraseña | Mensaje «Si el correo está registrado, recibirás un enlace...»; con el enlace se cambia la contraseña y el inicio de sesión funciona con la nueva. |  | E08 |
| E09 | Restricción | Acceso sin sesión a páginas y datos | La página redirige a `index.html`. La dirección de la API responde error de falta de sesión (401) y no entrega datos. |  | E09 |
| E10 | Restricción | Un estudiante intenta usar funciones de administrador | La API responde «sin permiso» (403). La pantalla de moderación abre vacía o con error y no muestra datos de administración. |  | E10 |
| E11 | Éxito | Subida correcta de un material | Mensaje «Material enviado. Quedó pendiente de validación por un docente.» En Mis Materiales aparece con estado Pendiente. |  | E11 |
| E12 | Fallo | Subida sin la declaración de originalidad ni campos obligatorios | Se rechaza con «Falta completar: ...» en el primer caso y «Debes aceptar la declaración de originalidad...» en el segundo. |  | E12 |
| E13 | Fallo | Subida de un formato no permitido | Se rechaza: «Formato no permitido. Usa PDF, DOCX, PPTX, XLSX, JPG o PNG.» |  | E13 |
| E14 | Fallo | Subida de un archivo cuyo contenido no corresponde a su extensión | Se rechaza: «El contenido del archivo no corresponde a su extensión.» |  | E14 |
| E15 | Fallo | Subida de un archivo repetido (misma huella SHA-256) | Se rechaza (409): «Ya existe un material con el mismo archivo en la plataforma.» |  | E15 |
| E16 | Restricción | Un material pendiente no es visible ni descargable para otros estudiantes | El catálogo no lo muestra y la descarga directa responde «El material no existe o no está disponible.» |  | E16 |
| E17 | Restricción | Un docente solo ve los materiales de sus materias | La lista no incluye «Apuntes de prueba 1», que es de Cálculo Integral (materia que no tiene asignada). |  | E17 |
| E18 | Éxito | Validación de un material por el docente | Mensaje «Material validado.» con el código de validación (formato `ITSX-XXXX-XXXX-NN`). El material pasa a Validado. |  | E18 |
| E19 | Fallo | Rechazo de un material: sin comentario y con comentario | Sin comentario: «Para rechazar un material debes escribir un comentario.» Con comentario: «Material rechazado.» |  | E19 |
| E20 | Éxito | Notificaciones y resultado visibles para el autor | Hay un aviso de material validado y otro de rechazado; el contador baja a cero al marcarlos; Mis Materiales muestra el código y el comentario. |  | E20 |
| E21 | Éxito | Consulta, descarga e integridad de un material validado | La huella del archivo descargado es igual a la mostrada; el contador de descargas sube en 1 y `SELECT * FROM descarga;` tiene el registro. |  | E21 |
| E22 | Éxito | Favoritos | Aparece en Mis Favoritos y desaparece al quitarlo. |  | E22 |
| E23 | Éxito | Mis materiales: editar y eliminar según el estado | La edición se guarda; el material validado no se puede editar; el rechazado se elimina de la lista (eliminación lógica). |  | E23 |
| E24 | Éxito | Moderación: suspender y reactivar con motivo | Sin motivo: «Escribe el motivo de esta acción.» Con motivo queda Suspendido, deja de aparecer en el catálogo y el autor recibe el aviso con el motivo; al reactivar vuelve a aparecer. |  | E24 |
| E25 | Éxito | Alta de un docente y asignación de materias | «Cuenta registrada...», la asignación se guarda y el docente ve Cálculo Integral con sus contadores. |  | E25 |
| E26 | Restricción | Suspensión de una cuenta | El inicio de sesión se rechaza: «La cuenta está suspendida. Contacta al administrador.» Tras reactivar, entra normalmente. |  | E26 |
| E27 | Fallo | Eliminación de una cuenta con actividad | Se rechaza (409): «No se puede eliminar: la cuenta tiene materiales, validaciones o descargas. Suspéndela en su lugar.» La cuenta sigue existiendo. |  | E27 |
| E28 | Fallo | Catálogo de materias: alta, clave repetida y eliminación con materiales | Alta correcta; clave repetida: «Ya existe una materia con esa clave.»; «Cálculo Integral» no se elimina (409, «Desactívala en su lugar»); la materia inactiva no se ofrece al subir; `TEST701` se elimina porque no tiene dependencias. |  | E28 |
| E29 | Fallo | Tipos de material: alta y nombre repetido | Alta correcta; el repetido se rechaza: «Ya existe un tipo de material con ese nombre.»; el desactivado deja de ofrecerse al subir material. |  | E29 |
| E30 | Restricción | Parámetros del sistema: tamaño máximo de archivo | El archivo de 2 MB se rechaza: «El archivo supera el tamaño máximo de 1 MB.» El valor 500 se rechaza por estar fuera del rango (1 a 50). Al restablecer vuelve a 20 MB. |  | E30 |
| E31 | Éxito | Tipo de material al subir y filtro en el catálogo | La tarjeta muestra «Tipo: Resumen» y el filtro deja solo los materiales de ese tipo. |  | E31 |
| E32 | Éxito | Bitácora de auditoría | Aparecen las acciones con fecha, usuario y detalle, sin contraseñas; los filtros funcionan y el CSV descarga el mismo contenido. |  | E32 |
| E33 | Éxito | Estadísticas y reporte | Los indicadores coinciden con la base de datos, las gráficas cambian con los filtros y se genera el PDF sin el menú lateral. |  | E33 |

## 5. Escenarios

### 1. Acceso y cuentas

#### E01 · Registro de un estudiante nuevo (Éxito)

**Cuenta:** Sin sesión

1. Abre `http://localhost:3000/registro.html`.
2. Captura: Nombre `Ana`, Apellidos `Prueba Sistema`, Matrícula `PRY07001`, Semestre `1`, Correo `pry07.ana@itsx.edu.mx`, Contraseña y confirmación `Prueba.123`.
3. Pulsa **Registrarse**.
4. En la consola del servidor aparece el bloque `CORREO SIMULADO` con el enlace `verificar.html?token=...` (déjalo copiado).

**Resultado esperado:** Mensaje «Cuenta creada. Revisa tu correo institucional para activarla.» En Workbench la cuenta queda `pendiente_verificacion`.

**Evidencia:** Pantalla con el mensaje, consola con el enlace y consulta `SELECT correo_institucional, estado_cuenta FROM usuario ORDER BY id_usuario DESC LIMIT 1;`

#### E02 · Registro con correo que no es institucional (Fallo)

**Cuenta:** Sin sesión

1. En `registro.html` captura los mismos datos pero con matrícula `PRY07002` y correo `pry07.ana@gmail.com`.
2. Pulsa **Registrarse**.

**Resultado esperado:** Se rechaza: «El correo debe ser institucional (termina en @itsx.edu.mx).» No se crea la cuenta.

**Evidencia:** Pantalla con el error.

#### E03 · Registro con contraseña débil (Fallo)

**Cuenta:** Sin sesión

1. En `registro.html` usa matrícula `PRY07003`, correo `pry07.beto@itsx.edu.mx` y contraseña `abc` (en ambos campos).
2. Pulsa **Registrarse**.

**Resultado esperado:** Se rechaza indicando lo que falta: mínimo 8 caracteres, mayúscula y número.

**Evidencia:** Pantalla con el error.

#### E04 · Inicio de sesión sin verificar el correo (Fallo)

**Cuenta:** pry07.ana@itsx.edu.mx

1. En `index.html` escribe el correo de Ana y la contraseña `Prueba.123`.
2. Pulsa **Iniciar Sesión**.

**Resultado esperado:** Se rechaza: «Debes verificar tu correo antes de iniciar sesión.»

**Evidencia:** Pantalla con el error.

#### E05 · Verificación de la cuenta e inicio de sesión (Éxito)

**Cuenta:** pry07.ana@itsx.edu.mx

1. Pega en el navegador el enlace `verificar.html?token=...` copiado en E01.
2. Vuelve a `index.html` e inicia sesión con Ana.

**Resultado esperado:** La verificación confirma la cuenta y el inicio de sesión lleva al panel del estudiante (menú con Subir Material, Mis Materiales, Mis Favoritos...).

**Evidencia:** Pantalla de verificación y panel del estudiante.

#### E06 · Inicio de sesión con contraseña incorrecta (Fallo)

**Cuenta:** estudiante2@itsx.example

1. En `index.html` escribe `estudiante2@itsx.example` con la contraseña `Equivocada1`.

**Resultado esperado:** Se rechaza con un mensaje genérico: «Correo o contraseña incorrectos.» (no revela si el correo existe).

**Evidencia:** Pantalla con el error.

#### E07 · Bloqueo por intentos fallidos (Restricción)

**Cuenta:** estudiante2@itsx.example

1. Repite 5 veces el intento fallido de E06 con `estudiante2@itsx.example`.
2. Al sexto intento escribe incluso la contraseña correcta `Prueba.123`.
3. Al terminar, reinicia el servidor (Ctrl+C y `npm start`): el bloqueo vive en memoria y así se libera.

**Resultado esperado:** Después de 5 fallos aparece «Cuenta bloqueada por intentos fallidos. Intenta de nuevo en N minuto(s).» y ni la contraseña correcta entra.

**Evidencia:** Pantalla con el bloqueo.

#### E08 · Recuperación de contraseña (Éxito)

**Cuenta:** pry07.ana@itsx.edu.mx

1. En `index.html` pulsa **¿Olvidaste tu contraseña?** y escribe el correo de Ana.
2. Copia el enlace `restablecer.html?token=...` de la consola del servidor.
3. Ábrelo y escribe la contraseña nueva `Nueva.12345` (dos veces).
4. Inicia sesión con Ana y la contraseña nueva.

**Resultado esperado:** Mensaje «Si el correo está registrado, recibirás un enlace...»; con el enlace se cambia la contraseña y el inicio de sesión funciona con la nueva.

**Evidencia:** Pantalla de recuperación, consola con el enlace y panel tras iniciar sesión.

#### E09 · Acceso sin sesión a páginas y datos (Restricción)

**Cuenta:** Sin sesión (ventana de incógnito)

1. Abre `http://localhost:3000/panel.html`.
2. Abre `http://localhost:3000/api/materiales`.

**Resultado esperado:** La página redirige a `index.html`. La dirección de la API responde error de falta de sesión (401) y no entrega datos.

**Evidencia:** Las dos pantallas.

#### E10 · Un estudiante intenta usar funciones de administrador (Restricción)

**Cuenta:** estudiante1@itsx.example

1. Inicia sesión con `estudiante1@itsx.example`. Observa que el menú no tiene opciones de administración.
2. Abre `http://localhost:3000/api/cuentas`.
3. Abre también `http://localhost:3000/moderacion.html`.

**Resultado esperado:** La API responde «sin permiso» (403). La pantalla de moderación abre vacía o con error y no muestra datos de administración.

**Evidencia:** Menú del estudiante y respuesta 403.

### 2. Subida, validación y consulta de materiales

#### E11 · Subida correcta de un material (Éxito)

**Cuenta:** estudiante1@itsx.example

1. Entra a **Subir Material**.
2. Título `Apuntes de prueba 1`, Materia `Cálculo Integral`, Descripción y palabras clave a elección.
3. Archivo `docs/archivos-prueba/apuntes-prueba-1.pdf`. Marca la declaración de originalidad.
4. Pulsa **Subir Archivo**.

**Resultado esperado:** Mensaje «Material enviado. Quedó pendiente de validación por un docente.» En Mis Materiales aparece con estado Pendiente.

**Evidencia:** Pantalla con el mensaje y consulta `SELECT id_material, titulo, estado FROM material ORDER BY id_material DESC LIMIT 1;`

#### E12 · Subida sin la declaración de originalidad ni campos obligatorios (Fallo)

**Cuenta:** estudiante1@itsx.example

1. En **Subir Material** intenta subir con el título vacío.
2. Luego captura título, materia y archivo, pero deja sin marcar la declaración.

**Resultado esperado:** Se rechaza con «Falta completar: ...» en el primer caso y «Debes aceptar la declaración de originalidad...» en el segundo.

**Evidencia:** Las dos pantallas.

#### E13 · Subida de un formato no permitido (Fallo)

**Cuenta:** estudiante1@itsx.example

1. En **Subir Material** captura título y materia y selecciona `docs/archivos-prueba/notas.txt` (si el selector filtra, cambia a «Todos los archivos»).
2. Marca la declaración y sube.

**Resultado esperado:** Se rechaza: «Formato no permitido. Usa PDF, DOCX, PPTX, XLSX, JPG o PNG.»

**Evidencia:** Pantalla con el error.

#### E14 · Subida de un archivo cuyo contenido no corresponde a su extensión (Fallo)

**Cuenta:** estudiante1@itsx.example

1. Repite la subida con `docs/archivos-prueba/falso.pdf` (es texto con extensión .pdf).

**Resultado esperado:** Se rechaza: «El contenido del archivo no corresponde a su extensión.»

**Evidencia:** Pantalla con el error.

#### E15 · Subida de un archivo repetido (misma huella SHA-256) (Fallo)

**Cuenta:** estudiante1@itsx.example

1. Sube de nuevo `apuntes-prueba-1.pdf` con otro título.

**Resultado esperado:** Se rechaza (409): «Ya existe un material con el mismo archivo en la plataforma.»

**Evidencia:** Pantalla con el error.

#### E16 · Un material pendiente no es visible ni descargable para otros estudiantes (Restricción)

**Cuenta:** estudiante2@itsx.example

1. Inicia sesión con `estudiante2@itsx.example` (reinicia el servidor antes si sigue bloqueado por E07).
2. En **Buscar / Catálogo** busca `Apuntes de prueba 1`.
3. Anota el id del material (Workbench: `SELECT id_material FROM material ORDER BY id_material DESC LIMIT 1;`) y abre `http://localhost:3000/api/materiales/ID/archivo`.

**Resultado esperado:** El catálogo no lo muestra y la descarga directa responde «El material no existe o no está disponible.»

**Evidencia:** Catálogo sin el material y respuesta de la descarga.

#### E17 · Un docente solo ve los materiales de sus materias (Restricción)

**Cuenta:** docente2@itsx.example

1. Inicia sesión con `docente2@itsx.example` (materias Álgebra Lineal y Ecuaciones Diferenciales).
2. Entra a **Validar Materiales**.

**Resultado esperado:** La lista no incluye «Apuntes de prueba 1», que es de Cálculo Integral (materia que no tiene asignada).

**Evidencia:** Lista de pendientes del docente 2.

#### E18 · Validación de un material por el docente (Éxito)

**Cuenta:** docente1@itsx.example

1. Inicia sesión con `docente1@itsx.example` (materias Cálculo Integral y Álgebra Lineal).
2. En **Validar Materiales** pulsa **Revisar** en «Apuntes de prueba 1».
3. Pulsa **✅ Aprobar**.

**Resultado esperado:** Mensaje «Material validado.» con el código de validación (formato `ITSX-XXXX-XXXX-NN`). El material pasa a Validado.

**Evidencia:** Pantalla con el código y consulta `SELECT m.estado, c.codigo FROM material m JOIN codigo_validacion c ON c.id_material = m.id_material ORDER BY m.id_material DESC LIMIT 1;`

#### E19 · Rechazo de un material: sin comentario y con comentario (Fallo)

**Cuenta:** docente1@itsx.example

1. Con `estudiante1` sube `apuntes-prueba-2.pdf` (título `Apuntes de prueba 2`, materia `Álgebra Lineal`).
2. Con `docente1` abre **Revisar** en ese material y pulsa **❌ Rechazar** sin escribir comentario.
3. Escribe el comentario `Falta la bibliografía` y vuelve a rechazar.

**Resultado esperado:** Sin comentario: «Para rechazar un material debes escribir un comentario.» Con comentario: «Material rechazado.»

**Evidencia:** Las dos pantallas.

#### E20 · Notificaciones y resultado visibles para el autor (Éxito)

**Cuenta:** estudiante1@itsx.example

1. Inicia sesión con `estudiante1`. Observa el contador de la campana 🔔.
2. Abre **Notificaciones** y pulsa **Marcar todas como leídas**.
3. En **Mis Materiales** revisa el código de validación y el comentario del docente.

**Resultado esperado:** Hay un aviso de material validado y otro de rechazado; el contador baja a cero al marcarlos; Mis Materiales muestra el código y el comentario.

**Evidencia:** Notificaciones y Mis Materiales.

#### E21 · Consulta, descarga e integridad de un material validado (Éxito)

**Cuenta:** estudiante2@itsx.example

1. Con `estudiante2` entra a **Buscar / Catálogo** y busca `Apuntes de prueba 1`.
2. Pulsa **Ver detalle** y anota la huella SHA-256 y las descargas.
3. Pulsa **⬇ Descargar**.
4. En PowerShell: `Get-FileHash $env:USERPROFILE\Downloads\apuntes-prueba-1.pdf -Algorithm SHA256` (ajusta la ruta).
5. Recarga el detalle.

**Resultado esperado:** La huella del archivo descargado es igual a la mostrada; el contador de descargas sube en 1 y `SELECT * FROM descarga;` tiene el registro.

**Evidencia:** Detalle, resultado de PowerShell y consulta.

#### E22 · Favoritos (Éxito)

**Cuenta:** estudiante2@itsx.example

1. En el detalle del material pulsa **☆ Marcar como favorito**.
2. Abre **Mis Favoritos**.
3. Pulsa **★ Quitar de favoritos**.

**Resultado esperado:** Aparece en Mis Favoritos y desaparece al quitarlo.

**Evidencia:** Mis Favoritos con el material.

#### E23 · Mis materiales: editar y eliminar según el estado (Éxito)

**Cuenta:** estudiante1@itsx.example

1. En **Mis Materiales** pulsa **Editar** en el material rechazado, cambia el título a `Apuntes de prueba 2 (corregido)` y guarda.
2. Observa que el material validado no tiene botón **Editar**.
3. Pulsa **Eliminar** en el material rechazado y confirma.

**Resultado esperado:** La edición se guarda; el material validado no se puede editar; el rechazado se elimina de la lista (eliminación lógica).

**Evidencia:** Mis Materiales antes y después.

### 3. Administración

#### E24 · Moderación: suspender y reactivar con motivo (Éxito)

**Cuenta:** admin@itsx.example

1. Inicia sesión con `admin@itsx.example` y entra a **Moderación de Contenidos**.
2. En «Apuntes de prueba 1» pulsa **Suspender**, deja el motivo vacío y confirma.
3. Escribe el motivo `Prueba de moderación` y confirma.
4. Con `estudiante2` busca el material en el catálogo; con `estudiante1` revisa Notificaciones.
5. Con el administrador pulsa **Reactivar**.

**Resultado esperado:** Sin motivo: «Escribe el motivo de esta acción.» Con motivo queda Suspendido, deja de aparecer en el catálogo y el autor recibe el aviso con el motivo; al reactivar vuelve a aparecer.

**Evidencia:** Moderación, catálogo sin el material y aviso.

#### E25 · Alta de un docente y asignación de materias (Éxito)

**Cuenta:** admin@itsx.example

1. En **Gestión de Usuarios** abre la pestaña **Docentes** y pulsa **Registrar docente**.
2. Nombre `Rosa`, Apellidos `Mena`, correo `pry07.docente@itsx.edu.mx`, departamento `Sistemas`, contraseña temporal `Temporal1`.
3. En la tarjeta del docente pulsa **Materias**, marca `Cálculo Integral` y guarda.
4. Cierra sesión e inicia con el docente nuevo; abre **Mis Materias Asignadas**.

**Resultado esperado:** «Cuenta registrada...», la asignación se guarda y el docente ve Cálculo Integral con sus contadores.

**Evidencia:** Alta, asignación y pantalla del docente.

#### E26 · Suspensión de una cuenta (Restricción)

**Cuenta:** admin@itsx.example

1. En **Gestión de Usuarios** (Estudiantes) pulsa **Suspender** en `estudiante2`.
2. En una ventana de incógnito intenta iniciar sesión con esa cuenta.
3. Regresa y pulsa **Reactivar**.

**Resultado esperado:** El inicio de sesión se rechaza: «La cuenta está suspendida. Contacta al administrador.» Tras reactivar, entra normalmente.

**Evidencia:** Gestión de usuarios y mensaje de rechazo.

#### E27 · Eliminación de una cuenta con actividad (Fallo)

**Cuenta:** admin@itsx.example

1. En **Gestión de Usuarios** pulsa **Eliminar** en `estudiante1` y confirma.

**Resultado esperado:** Se rechaza (409): «No se puede eliminar: la cuenta tiene materiales, validaciones o descargas. Suspéndela en su lugar.» La cuenta sigue existiendo.

**Evidencia:** Pantalla con el error.

#### E28 · Catálogo de materias: alta, clave repetida y eliminación con materiales (Fallo)

**Cuenta:** admin@itsx.example

1. En **Catálogo de Materias** agrega `TEST701`, `Materia de prueba 7`, semestre 1.
2. Repite la misma clave.
3. Pulsa **Eliminar** en «Cálculo Integral».
4. Desactiva `TEST701` y, con `estudiante1`, revisa que ya no aparece en **Subir Material**. Después elimínala.

**Resultado esperado:** Alta correcta; clave repetida: «Ya existe una materia con esa clave.»; «Cálculo Integral» no se elimina (409, «Desactívala en su lugar»); la materia inactiva no se ofrece al subir; `TEST701` se elimina porque no tiene dependencias.

**Evidencia:** Las pantallas de cada paso.

#### E29 · Tipos de material: alta y nombre repetido (Fallo)

**Cuenta:** admin@itsx.example

1. En **Tipos de Material** agrega `Laboratorio`.
2. Intenta agregar `laboratorio` en minúsculas.
3. Desactiva `Laboratorio`.

**Resultado esperado:** Alta correcta; el repetido se rechaza: «Ya existe un tipo de material con ese nombre.»; el desactivado deja de ofrecerse al subir material.

**Evidencia:** Pantallas de alta y error.

### 4. Funciones administrativas del bloque final

#### E30 · Parámetros del sistema: tamaño máximo de archivo (Restricción)

**Cuenta:** admin@itsx.example

1. En **Parámetros del Sistema** cambia «Tamaño máximo de archivo» a `1` y guarda.
2. Con `estudiante1` intenta subir `docs/archivos-prueba/grande-2mb.pdf`.
3. Con el administrador escribe `500` en el tamaño y guarda.
4. Pulsa **Restablecer valores**.

**Resultado esperado:** El archivo de 2 MB se rechaza: «El archivo supera el tamaño máximo de 1 MB.» El valor 500 se rechaza por estar fuera del rango (1 a 50). Al restablecer vuelve a 20 MB.

**Evidencia:** Parámetros, rechazo de la subida y error de rango.

#### E31 · Tipo de material al subir y filtro en el catálogo (Éxito)

**Cuenta:** estudiante1@itsx.example

1. Sube `apuntes-prueba-3.pdf` (título `Apuntes de prueba 3`, materia `Cálculo Integral`) eligiendo el tipo `Resumen`.
2. Con `docente1` apruébalo.
3. Con `estudiante2` entra a **Buscar / Catálogo** y filtra por el tipo `Resumen`.

**Resultado esperado:** La tarjeta muestra «Tipo: Resumen» y el filtro deja solo los materiales de ese tipo.

**Evidencia:** Subida con tipo y catálogo filtrado.

#### E32 · Bitácora de auditoría (Éxito)

**Cuenta:** admin@itsx.example

1. Entra a **Bitácora de Auditoría** y revisa los registros de las pruebas anteriores (inicios de sesión, fallidos, subida, validación, moderación, cuentas).
2. Filtra por la acción `inicio_sesion_fallido` y por una fecha.
3. Pulsa **Exportar bitácora (CSV)** y ábrelo.

**Resultado esperado:** Aparecen las acciones con fecha, usuario y detalle, sin contraseñas; los filtros funcionan y el CSV descarga el mismo contenido.

**Evidencia:** Bitácora filtrada y CSV.

#### E33 · Estadísticas y reporte (Éxito)

**Cuenta:** admin@itsx.example

1. Entra a **Estadísticas y Reportes** y anota los cinco indicadores.
2. Compara con Workbench: `SELECT estado, COUNT(*) FROM material GROUP BY estado;`.
3. Cambia el semestre y el periodo.
4. Pulsa **Descargar reporte (PDF)** y elige «Guardar como PDF».

**Resultado esperado:** Los indicadores coinciden con la base de datos, las gráficas cambian con los filtros y se genera el PDF sin el menú lateral.

**Evidencia:** Estadísticas, consulta y PDF.

## 6. Pruebas automatizadas

Además de la matriz manual, el sistema tiene pruebas automatizadas de la API y de las reglas de negocio (Jest y Supertest). Se ejecutan sin base de datos:

```
cd backend
npm test
```

Deben pasar todas (más de 280). Sus pruebas cubren los mismos casos de éxito, fallo y restricción en cada módulo.
