// Configuración de la aplicación a partir de variables de entorno (archivo .env).
require('dotenv').config();

const config = {
  entorno: process.env.NODE_ENV || 'development',
  puerto: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'BD_plataforma_itsx',
  },
};

module.exports = config;