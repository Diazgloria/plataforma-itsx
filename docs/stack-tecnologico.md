# Stack tecnológico

Proyecto: Plataforma ITSX · Hito 1 (TAR05) · Autora: Gloria Domínguez Díaz

## 1. Resumen

El proyecto usa **JavaScript en todas las capas** (cliente y servidor) y una **base de datos relacional MySQL**. Esta decisión es coherente con el protocolo de Taller de Investigación II, que declara HTML, CSS, JavaScript, Node.js y MySQL, y con el diseño relacional estricto de la sección 3.3 del documento PRY04.

| Capa | Tecnología | Versión | Función en el proyecto |
|---|---|---|---|
| Cliente | HTML5, CSS3 y JavaScript | Estándares vigentes | Pantallas del prototipo (login, subir material, validación, catálogo, moderación). |
| Servidor | Node.js | 24 LTS | Ejecuta la lógica de negocio y atiende las peticiones. |
| Framework web | Express | 5.x | Rutas, middleware de autenticación, validación y manejo de errores. |
| Base de datos | MySQL (InnoDB) | 8.4 LTS | Almacena usuarios, materias, materiales, versiones, validaciones, códigos y notificaciones. |
| Acceso a datos | mysql2 | Última estable | Consultas parametrizadas y transacciones. |
| Autenticación | express-session y bcrypt | Última estable | Sesiones en el servidor y contraseñas cifradas. |
| Archivos | multer y el módulo `crypto` de Node.js | Última estable | Carga de archivos y cálculo de la huella SHA-256. |
| Pruebas | Jest y Supertest | Última estable | Pruebas unitarias y de integración de la API. |
| Control de versiones | Git y GitHub | — | Feature Branching y Pull Requests. |

Las versiones de las librerías de npm se fijan en el archivo `package.json` al instalarlas.

## 2. Justificación técnica

### Cliente: HTML5, CSS3 y JavaScript sin framework
- El prototipo (sección 2.2 del PRY03) tiene 22 pantallas basadas en formularios, tablas y listas. No requieren una aplicación de una sola página.
- No necesita paso de compilación: los archivos se sirven directamente y se depuran en el navegador.
- Reduce la curva de aprendizaje para una sola desarrolladora y mantiene el código simple de explicar y mantener.
- **Alternativas descartadas:** React y Angular. Añaden herramientas de compilación y conceptos (componentes, estado, enrutamiento) que exceden el alcance del prototipo.

### Servidor: Node.js 24 LTS
- Permite usar un solo lenguaje, JavaScript, en cliente y servidor.
- Su modelo de entrada y salida asíncrona es adecuado para una plataforma que carga y descarga archivos.
- Se eligió la versión LTS (soporte a largo plazo) por estabilidad. Node.js 24 recibe soporte hasta abril de 2028.
- **Alternativas descartadas:** PHP, Python y Java. Son opciones válidas, pero ya se tiene declarado un lenguaje. 

### Framework: Express 5
- Es mínimo: aporta rutas y middleware sin imponer una arquitectura.
- Express 5 es la versión predeterminada en npm desde marzo de 2025 y requiere Node.js 18 o superior.
- Pasa automáticamente los errores de funciones asíncronas al manejador de errores, lo que simplifica los controladores del diagrama de secuencia.
- **Alternativas descartadas:** Fastify (menos documentación en español) y NestJS (arquitectura más pesada).

### Base de datos: MySQL 8.4 LTS (InnoDB)
- El modelo de la sección 3.3 es relacional y exige integridad referencial. InnoDB soporta llaves foráneas y transacciones ACID, necesarias para la aprobación de un material (SEC-02).
- Soporta restricciones CHECK, tipos ENUM y columnas generadas, que se usan para las reglas RD-05, RD-07 y RD-10.
- MySQL 8.0 llegó al fin de su vida en abril de 2026; por eso se usa la línea 8.4 LTS. El script es compatible también con 9.x.
- **Alternativas descartadas:** PostgreSQL (equivalente técnico) y MongoDB (no relacional; contradice el diseño).

### Acceso a datos: mysql2 con consultas parametrizadas
- Las consultas parametrizadas evitan la inyección SQL.
- Soporta promesas y transacciones, necesarias para registrar la validación, el código y el estado en una sola operación.
- Mantiene visible el SQL, que es justo lo que pide el Hito 1.
- **Alternativa descartada:** un ORM (Sequelize o Prisma). Añade una capa que oculta el SQL y complica la explicación del esquema.

### Autenticación: sesiones con bcrypt
- Las sesiones del lado del servidor permiten cerrar una sesión o suspender una cuenta de forma inmediata.
- bcrypt guarda solo el resumen cifrado de la contraseña (requisito RNF-SEG-01).
- **Alternativa descartada:** JWT. Su ventaja de no guardar estado no se necesita en una sola aplicación, y dificulta revocar el acceso.

### Archivos y huella digital
- multer procesa los archivos que sube el estudiante (límite de 20 MB y formatos permitidos).
- El módulo `crypto` de Node.js calcula la huella SHA-256 que detecta duplicados (RD-06) y comprueba la integridad al descargar.

### Pruebas automatizadas
Las recomendaciones de la docente dependen del lenguaje (PHP, Python o Java). El proyecto usa Node.js, por lo que se aplican las herramientas equivalentes:

| Recomendación de la docente | Equivalente en este proyecto |
|---|---|
| PHPUnit, Pytest, JUnit 5 | Jest |
| Test Client de Flask, Pest | Supertest (peticiones simuladas a la API sin levantar un servidor) |
| Base de datos de prueba o transacciones con ROLLBACK | Base de datos `plataforma_itsx_test` y transacciones con ROLLBACK al terminar cada prueba |
| Mockito, Testcontainers | No se usan; la base de prueba local cumple la misma función |

### Control de versiones
- Git con GitHub y **Feature Branching**: una rama por módulo que se integra a `develop` mediante Pull Request.
- Convención de mensajes: `tipo: descripción` (`feat`, `fix`, `docs`, `db`, `chore`, `test`).

## 3. Herramientas de apoyo
Visual Studio Code (editor), MySQL Workbench (administración de la base de datos), npm (gestor de paquetes) y dotenv (variables de entorno).

## Fuentes
- Node.js Release Working Group: https://github.com/nodejs/release
- endoflife.date, Node.js y MySQL: https://endoflife.date/nodejs · https://endoflife.date/mysql
- Documentación de MySQL, versiones LTS: https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html
- Express, versión 5 como predeterminada en npm: https://expressjs.com/2025/03/31/v5-1-latest-release.html
