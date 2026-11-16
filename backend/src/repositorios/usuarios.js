// Acceso a la tabla usuario con consultas parametrizadas (previene inyección SQL, RNF-SEG-04).
function crearRepoUsuarios(pool) {
  return {
    async buscarPorCorreo(correo) {
      const [filas] = await pool.query(
        `SELECT id_usuario, nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta, semestre
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
            async buscarPorId(idUsuario) {
         const [filas] = await pool.query(
           `SELECT id_usuario, nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta
              FROM usuario WHERE id_usuario = ?`,
           [idUsuario]
         );
         return filas[0] || null;
       },

       // Activa la cuenta solo si seguía pendiente de verificación
       async activarCuenta(idUsuario) {
         const [resultado] = await pool.query(
           `UPDATE usuario SET estado_cuenta = 'activa'
             WHERE id_usuario = ? AND estado_cuenta = 'pendiente_verificacion'`,
           [idUsuario]
         );
         return resultado.affectedRows > 0;
       },
              async contarPorRol() {
         const [filas] = await pool.query('SELECT rol, COUNT(*) AS total FROM usuario GROUP BY rol');
         return filas;
       },
        async actualizarContrasena(idUsuario, hash) {
         const [resultado] = await pool.query(
           'UPDATE usuario SET contrasena_hash = ? WHERE id_usuario = ?',
           [hash, idUsuario]
         );
         return resultado.affectedRows > 0;
       },
              async obtenerPerfil(idUsuario) {
         const [filas] = await pool.query(
           `SELECT id_usuario, nombre, apellidos, correo_institucional, rol, estado_cuenta,
                   numero_control, semestre, departamento, fecha_registro
              FROM usuario WHERE id_usuario = ?`,
           [idUsuario]
         );
         return filas[0] || null;
       },

       // El semestre solo se modifica si llega un valor (los docentes y administradores no tienen)
       async actualizarDatosPersonales(idUsuario, { nombre, apellidos, semestre }) {
         await pool.query(
           'UPDATE usuario SET nombre = ?, apellidos = ?, semestre = COALESCE(?, semestre) WHERE id_usuario = ?',
           [nombre, apellidos, semestre, idUsuario]
         );
       },
  };
}

module.exports = { crearRepoUsuarios };