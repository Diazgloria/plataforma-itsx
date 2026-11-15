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
| Hito 1 (TAR05) | Base de datos y stack tecnológico | En desarrollo |

## Stack tecnológico (preliminar, se justifica en el Hito 1)

- Frontend: HTML, CSS y JavaScript
- Backend: Node.js
- Base de datos: MySQL 8

## Estructura del repositorio

```
plataforma-itsx/
├── backend/     Servidor y lógica de negocio
├── frontend/    Interfaz web
├── database/    Script SQL y migraciones de la base de datos
├── docs/        Documentación del proyecto
├── CONTRIBUTING.md
└── README.md
```

## Flujo de trabajo (Feature Branching)

Se usan ramas por módulo que se integran a `develop` mediante Pull Request, y `develop` pasa a `main` cuando una entrega queda estable. Las reglas completas están en [CONTRIBUTING.md](CONTRIBUTING.md).
