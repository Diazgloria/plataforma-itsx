const config = require('./config');
const { crearPool } = require('./db');
const { crearApp } = require('./app');
const { crearRepoUsuarios } = require('./repositorios/usuarios');
const { crearServicioCorreo } = require('./servicios/correo');
const { crearRepoMaterias } = require('./repositorios/materias');
const { crearRepoMateriales } = require('./repositorios/materiales');
const { crearRepoValidaciones } = require('./repositorios/validaciones');
const { crearRepoMisMateriales } = require('./repositorios/misMateriales');
const { crearRepoNotificaciones } = require('./repositorios/notificaciones');
const { crearRepoDetalleMaterial } = require('./repositorios/detalleMaterial');
const { crearRepoFavoritos } = require('./repositorios/favoritos');
const { crearRepoDocentes } = require('./repositorios/docentes');
const { crearRepoCatalogo } = require('./repositorios/catalogo');
const { crearRepoCuentas } = require('./repositorios/cuentas');
const { crearRepoModeracion } = require('./repositorios/moderacion');
const { crearRepoTipos } = require('./repositorios/tipos');
const { crearRepoParametros } = require('./repositorios/parametros');
const { cargarParametros } = require('./servicios/parametros');

async function iniciar() {
  const pool = crearPool(config.db);
  try {
    await pool.query('SELECT 1');
    console.log(`Conexión a MySQL correcta (base de datos: ${config.db.database})`);
  } catch (err) {
    console.error('No se pudo conectar a MySQL:', err.code, err.message);
    process.exit(1);
  }

  const repos = {
    usuarios: crearRepoUsuarios(pool),
    materias: crearRepoMaterias(pool),
    materiales: crearRepoMateriales(pool),
    validaciones: crearRepoValidaciones(pool),
    misMateriales: crearRepoMisMateriales(pool),
    notificaciones: crearRepoNotificaciones(pool),
    detalleMaterial: crearRepoDetalleMaterial(pool),
    favoritos: crearRepoFavoritos(pool),
    docentes: crearRepoDocentes(pool),
    catalogo: crearRepoCatalogo(pool),
    cuentas: crearRepoCuentas(pool),
    moderacion: crearRepoModeracion(pool),
    tipos: crearRepoTipos(pool),
    parametros: crearRepoParametros(pool),
  };

  // Los parámetros guardados por el administrador tienen prioridad sobre los valores de config.js
  await cargarParametros(repos.parametros, config);

  const app = crearApp({ config, repos, correo: crearServicioCorreo() });

  app.listen(config.puerto, () => {
    console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
  });
  
}

iniciar();