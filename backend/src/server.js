// Punto de entrada: comprueba la conexión con MySQL y levanta el servidor.
const config = require('./config');
const { crearPool } = require('./db');
const { crearApp } = require('./app');

async function iniciar() {
  const pool = crearPool(config.db);

  try {
    await pool.query('SELECT 1');
    console.log(`Conexión a MySQL correcta (base de datos: ${config.db.database}).`);
  } catch (err) {
    console.error('\nNo se pudo conectar con MySQL. Revisa el archivo .env (puerto, usuario, contraseña y nombre de la base).');
    console.error(`Detalle: ${err.code || ''} ${err.message}\n`);
    process.exit(1);
  }

  const app = crearApp();
  app.listen(config.puerto, () => {
    console.log(`Plataforma ITSX en ejecución: http://localhost:${config.puerto}`);
  });
}

iniciar();