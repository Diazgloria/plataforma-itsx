# Base de datos

Scripts SQL de la base de datos MySQL 8.4 (`BD_plataforma_itsx`). Ejecútalos **en este orden** desde MySQL Workbench (o con el cliente `mysql`):

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `01_schema.sql` | Crea la base de datos y las 8 tablas principales (usuario, materia, docente_materia, material, version_material, validacion_docente, codigo_validacion, notificacion). |
| 2 | `02_datos_prueba.sql` | Carga 5 cuentas de prueba, 3 materias y materiales de ejemplo. |
| 3 | `03_nuevas_tablas.sql` | Agrega las 5 tablas del Hito 3: tipo_material, favorito, descarga, parametro_sistema y bitacora, con sus datos iniciales. |
| 4 | `04_contrasenas_demo.sql` | Deja la contraseña `Prueba.123` en las 5 cuentas de prueba. |

`03_pruebas_integridad.sql` es opcional: reúne consultas para comprobar llaves, restricciones y reglas de datos.

Comprobación rápida (debe dar 13 tablas y 6 tipos de material):

```sql
USE BD_plataforma_itsx;
SHOW TABLES;
SELECT * FROM tipo_material;
```
