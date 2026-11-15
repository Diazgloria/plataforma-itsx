# Guía de trabajo del repositorio

## Ramas

| Rama | Uso |
|---|---|
| `main` | Versión estable y entregable. Solo recibe Pull Requests desde `develop`. |
| `develop` | Integración de los módulos terminados. |
| `feature/<módulo>` | Una rama por módulo o tarea. Se crea desde `develop`. |

Ramas de módulo previstas:

- `feature/base-datos` – script SQL, migraciones y datos de prueba
- `feature/docs-stack` – documentación del stack tecnológico
- `feature/auth` – registro, inicio de sesión y roles
- `feature/materiales` – carga, consulta y descarga de materiales
- `feature/validacion` – validación docente y código de validación

## Flujo

1. Actualizar `develop` y crear la rama del módulo: `git checkout develop && git pull && git checkout -b feature/<módulo>`.
2. Hacer commits pequeños y con un solo propósito.
3. Subir la rama y abrir un Pull Request hacia `develop`.
4. Revisar el Pull Request, integrarlo y borrar la rama de módulo si ya terminó.

## Mensajes de commit

Se usa el formato `tipo: descripción corta en minúsculas`.

| Tipo | Cuándo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de un error |
| `docs` | Documentación |
| `db` | Esquema, migraciones o datos de la base de datos |
| `chore` | Configuración y tareas de mantenimiento |
| `test` | Pruebas |

Ejemplo: `db: crea tablas usuario y materia con sus llaves`.
