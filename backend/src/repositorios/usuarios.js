// Acceso a la tabla usuario con consultas parametrizadas (previene inyección SQL, RNF-SEG-04).
function crearRepoUsuarios(pool) {
  return {
    async buscarPorCorreo(correo) {
      const [filas] = await pool.query(
        `SELECT id_usuario, nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta
           FROM usuario WHERE correo_institucional = ?`,
        [correo]
      );
      return filas[0] || null;
    },

    async existeNumeroControl(numeroControl) {
      const [filas] = await pool.query('SELECT 1 FROM usuario WHERE numero_control = ? LIMIT 1', [numeroControl]);
      return filas.length > 0;
    },

    // Crea una cuenta de estudiante pendiente de verificación (RF-AUT-01). Devuelve el id nuevo.
    async crearEstudiante({ nombre, apellidos, correo, hash, numeroControl, semestre }) {
      const [resultado] = await pool.query(
        `INSERT INTO usuario
           (nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta, numero_control, semestre)
         VALUES (?, ?, ?, ?, 'estudiante', 'pendiente_verificacion', ?, ?)`,
        [nombre, apellidos, correo, hash, numeroControl, semestre]
      );
      return resultado.insertId;
    },
  };
}

module.exports = { crearRepoUsuarios };