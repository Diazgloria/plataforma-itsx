const config = require('./config');
const { crearPool } = require('./db');
const { crearApp } = require('./app');
const { crearRepoUsuarios } = require('./repositorios/usuarios');
const { crearServicioCorreo } = require('./servicios/correo');
const { crearRepoMaterias } = require('./repositorios/materias');
const { crearRepoMateriales } = require('./repositorios/materiales');
const { crearRepoValidaciones } = require('./repositorios/validaciones');
const { crearRepoMisMateriales } = require('./repositorios/misMateriales');

async function iniciar() {
  const pool = crearPool(config.db);
  try {
    await pool.query('SELECT 1');
    console.log(`Conexión a MySQL correcta (base de datos: ${config.db.database})`);
  } catch (err) {
    console.error('No se pudo conectar a MySQL:', err.code, err.message);
    process.exit(1);
  }

  const app = crearApp({
    config,
    repos: { usuarios: crearRepoUsuarios(pool), materias: crearRepoMaterias(pool),  materiales: crearRepoMateriales(pool), validaciones: crearRepoValidaciones(pool), misMateriales: crearRepoMisMateriales(pool),},
    correo: crearServicioCorreo(),
  });

  app.listen(config.puerto, () => {
    console.log(`Servidor escuchando en http://localhost:${config.puerto}`);
  });
  
}

iniciar();