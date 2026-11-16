// Conexión a MySQL mediante un pool de conexiones (mysql2 con promesas).
const mysql = require('mysql2/promise');

function crearPool(db) {
  return mysql.createPool({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
  });
}

module.exports = { crearPool };