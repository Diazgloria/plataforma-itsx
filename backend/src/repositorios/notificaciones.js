// Acceso a los avisos (tabla notificacion) de cada usuario.
function crearRepoNotificaciones(pool) {
  return {
    async listar(idUsuario, soloNoLeidas = false) {
      const [filas] = await pool.query(
        `SELECT id_notificacion, id_material, tipo, mensaje, fecha, leida
           FROM notificacion
          WHERE id_usuario = ? AND (? = FALSE OR leida = FALSE)
          ORDER BY fecha DESC, id_notificacion DESC
          LIMIT 100`,
        [idUsuario, soloNoLeidas]
      );
      return filas.map((f) => ({ ...f, leida: Boolean(f.leida) }));
    },

    async contarNoLeidas(idUsuario) {
      const [filas] = await pool.query(
        'SELECT COUNT(*) AS total FROM notificacion WHERE id_usuario = ? AND leida = FALSE',
        [idUsuario]
      );
      return Number(filas[0].total);
    },

    async marcarTodasLeidas(idUsuario) {
      await pool.query('UPDATE notificacion SET leida = TRUE WHERE id_usuario = ? AND leida = FALSE', [idUsuario]);
    },

    // Solo marca un aviso si pertenece al usuario
    async marcarLeida(idUsuario, idNotificacion) {
      await pool.query(
        'UPDATE notificacion SET leida = TRUE WHERE id_notificacion = ? AND id_usuario = ?',
        [idNotificacion, idUsuario]
      );
    },
  };
}

module.exports = { crearRepoNotificaciones };
