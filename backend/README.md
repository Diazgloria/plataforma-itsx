# Plataforma ITSX

Plataforma digital para la organización y validación de materiales académicos de tronco común de la carrera de Ingeniería en Sistemas Computacionales del Instituto Tecnológico Superior de Xalapa (ITSX).

> Proyecto de la materia **Ingeniería de Software** · Autora: Gloria Domínguez Díaz (Equipo 7) · Docente: M.C. María Angélica Cerdán

## ¿Qué hace la plataforma?

- Los **estudiantes** suben apuntes, prácticas y presentaciones de las materias de tronco común.
- Los **docentes** validan cada material (no existe validación automática): lo aprueban, con lo que se emite un código de validación, o lo rechazan con un comentario.
- Los demás estudiantes **buscan y descargan** únicamente materiales validados, con comprobación de integridad (huella SHA-256).
- El **administrador** supervisa la plataforma y modera los reportes.

## Estado del proyecto

| Hito | Contenido | Estado |
|---|---|---|
| Documentación PRY01–PRY04 | Requisitos, análisis y diseño del software | Entregada |
| Hito 1 (TAR05) | Base de datos y stack tecnológico | Entregado |
| Hito 2 (PRY06) | Prototipo funcional: 22 pantallas con su API | Entregado |
| Hito 3 (PRY07) | Pruebas del sistema, despliegue e implantación | Documentación en `docs/` |

## Inicio rápido

Requisitos: Node.js 24 (o 20 LTS+), MySQL 8.x y Git. Detalle en [docs/despliegue.md](docs/despliegue.md).

```
git clone https://github.com/Diazgloria/plataforma-itsx.git
cd plataforma-itsx
# 1) En MySQL Workbench ejecuta, en orden, los scripts de database/ (01 a 04)
cd backend
copy .env.example .env      # en Linux/macOS: cp .env.example .env  (y escribe tu contraseña de MySQL)
npm install
npm start
```

Abre `http://localhost:3000` e inicia sesión con una cuenta de prueba (contraseña `Prueba.123`):

| Rol | Correo |
|---|---|
| Administrador | `admin@itsx.example` |
| Docente | `docente1@itsx.example`, `docente2@itsx.example` |
| Estudiante | `estudiante1@itsx.example`, `estudiante2@itsx.example` |

El envío de correos es **simulado**: los enlaces de verificación y de recuperación de contraseña se imprimen en la consola del servidor.

Pruebas automatizadas (sin base de datos): `cd backend && npm test`.

## Stack tecnológico

- Frontend: HTML, CSS y JavaScript (sin framework), servido por el mismo servidor
- Backend: Node.js 24 + Express 5 (sesiones, bcrypt, multer)
- Base de datos: MySQL 8.4
- Pruebas: Jest y Supertest

## Documentación

| Documento | Contenido |
|---|---|
| [docs/manual-usuario.md](docs/manual-usuario.md) | Manual de usuario resumido, por rol |
| [docs/despliegue.md](docs/despliegue.md) | Requisitos de ejecución y despliegue |
| [docs/pruebas-sistema.md](docs/pruebas-sistema.md) | Matriz y guía de pruebas de sistema |
| [docs/stack-tecnologico.md](docs/stack-tecnologico.md) | Justificación del stack |
| [database/README.md](database/README.md) | Scripts de la base de datos |

## Estructura del repositorio

```
plataforma-itsx/
├── backend/     Servidor Express: rutas, servicios, repositorios, pruebas
├── frontend/    Interfaz web (22 pantallas)
├── database/    Scripts SQL (esquema, datos de prueba, tablas del Hito 3)
├── docs/        Documentación y archivos de prueba
├── CONTRIBUTING.md
└── README.md
```

## Flujo de trabajo (Feature Branching)

Se usan ramas por módulo que se integran a `develop` mediante Pull Request, y `develop` pasa a `main` cuando una entrega queda estable. Las reglas completas están en [CONTRIBUTING.md](CONTRIBUTING.md).
