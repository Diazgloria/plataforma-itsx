# Requisitos de ejecución y despliegue

## Requisitos

| Componente | Versión | Para qué |
|---|---|---|
| Node.js | 24 (o 20 LTS en adelante) | Ejecuta el servidor (Express) |
| npm | el que trae Node | Instala dependencias |
| MySQL Server | 8.4 (8.x) | Base de datos `BD_plataforma_itsx` |
| MySQL Workbench | cualquiera reciente | Ejecutar los scripts SQL (opcional; sirve también el cliente `mysql`) |
| Git | cualquiera reciente | Clonar el repositorio |
| Navegador | Chrome, Edge o Firefox actuales | Usar la plataforma |

Sistema operativo probado: Windows 11. Funciona igual en Linux y macOS.

## Instalación paso a paso

1. **Clonar**
   ```
   git clone https://github.com/Diazgloria/plataforma-itsx.git
   cd plataforma-itsx
   ```
2. **Base de datos.** En MySQL Workbench abre y ejecuta en este orden los scripts de `database/`: `01_schema.sql`, `02_datos_prueba.sql`, `03_nuevas_tablas.sql`, `04_contrasenas_demo.sql`. Resultado: 13 tablas y 5 cuentas de prueba.
3. **Configuración.** En `backend/` copia `.env.example` como `.env` y edítalo:

   | Variable | Significado |
   |---|---|
   | `PORT` | Puerto del servidor (3000) |
   | `DB_HOST`, `DB_PORT` | Servidor MySQL (`localhost`, `3306`) |
   | `DB_USER`, `DB_PASSWORD` | Usuario y contraseña de MySQL |
   | `DB_NAME` | `BD_plataforma_itsx` |
   | `SECRETO_APP` | Texto largo y secreto para firmar la sesión |

4. **Dependencias y arranque**
   ```
   cd backend
   npm install
   npm start
   ```
   Debe mostrar «Conexión a MySQL correcta» y «Servidor escuchando en http://localhost:3000».
5. **Usar.** Abre `http://localhost:3000`. El servidor entrega también la interfaz (carpeta `frontend/`), por lo que no hace falta otro servidor web.

## Verificación

- Pruebas automatizadas (no requieren base de datos): `cd backend && npm test`.
- Cuentas de prueba (contraseña `Prueba.123`): `admin@itsx.example`, `docente1@itsx.example`, `docente2@itsx.example`, `estudiante1@itsx.example`, `estudiante2@itsx.example`.
- Los archivos subidos se guardan en `backend/storage/` (se crea sola; carpeta configurable con `STORAGE_DIR`).

## Notas de despliegue

- **Correo simulado:** el sistema no envía correos reales; imprime en la consola del servidor el bloque `CORREO SIMULADO` con el enlace de verificación o recuperación. En producción se sustituiría por un servicio SMTP.
- **Sesiones en memoria:** al reiniciar el servidor se cierran las sesiones y se libera cualquier bloqueo por intentos fallidos. Para varios servidores habría que usar un almacén externo (por ejemplo Redis o MySQL).
- **Producción:** usar `NODE_ENV=production`, HTTPS (por ejemplo con un proxy inverso como Nginx), un `SECRETO_APP` largo y aleatorio, un usuario de MySQL con permisos mínimos y copias de seguridad periódicas de la base de datos y de `backend/storage/`.
- **Errores comunes:** «Unexpected token '<'» al iniciar sesión = la página no se abrió desde `http://localhost:3000`; «Access denied» = revisar `DB_USER`/`DB_PASSWORD`; puerto ocupado = cerrar el proceso anterior de Node o cambiar `PORT`.
