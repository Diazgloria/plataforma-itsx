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
  // Dominio de correo institucional permitido para el registro de estudiantes (RF-AUT-02)
  dominioCorreo: (process.env.DOMINIO_CORREO || 'itsx.edu.mx').toLowerCase(),
    // Clave para firmar los tokens (verificación, recuperación). En producción debe ser larga y secreta.
  secreto: process.env.SECRETO_APP || 'secreto-solo-para-desarrollo',
  // Vigencia del enlace de verificación de cuenta: 24 horas (RF-AUT-03)
  vigenciaVerificacionMs: 24 * 60 * 60 * 1000,
    // Vigencia del enlace de recuperación de contraseña: 1 hora
  vigenciaRecuperacionMs: 60 * 60 * 1000,
    // Sesión: expira tras 30 minutos sin actividad (RNF-SEG-05)
  sesion: { inactividadMs: 30 * 60 * 1000 },
  // Bloqueo por intentos fallidos de inicio de sesión (RF-AUT-05)
  bloqueo: { maxIntentos: 5, duracionMs: 15 * 60 * 1000 },
    // Límite de tamaño por archivo: 20 MB
  tamanoMaximoBytes: 20 * 1024 * 1024,
  // Carpeta donde se guardan los archivos subidos (fuera de la carpeta pública)
  carpetaArchivos: process.env.STORAGE_DIR || './storage',
};

module.exports = config;