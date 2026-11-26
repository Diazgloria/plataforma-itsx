// Bitácora de auditoría: registro de las acciones importantes de la plataforma.
const FILTRO = `
  WHERE (? = '' OR CONCAT(u.nombre, ' ', u.apellidos) LIKE ? OR u.correo_institucional LIKE ? OR b.detalle LIKE ?)
    AND (? IS NULL OR b.accion = ?)
    AND (? IS NULL OR b.fecha >= ?)
    AND (? IS NULL OR b.fecha < DATE_ADD(?, INTERVAL 1 DAY))`;

function parametrosFiltro({ texto = '', accion = null, desde = null, hasta = null }) {
  const patron = `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
  return [texto, patron, patron, patron, accion, accion, desde, desde, hasta, hasta];
}

function crearRepoBitacora(pool) {
  return {
    async registrar({ idUsuario = null, accion, detalle = null }) {
      await pool.query('INSERT INTO bitacora (id_usuario, accion, detalle) VALUES (?, ?, ?)', [idUsuario, accion, detalle]);
    },

    // Registros más recientes primero, con los filtros opcionales
    async listar(filtros, { limite = 20, desplazamiento = 0 } = {}) {
      const base = parametrosFiltro(filtros);
      const [filas] = await pool.query(
        `SELECT b.id_bitacora, b.fecha, b.accion, b.detalle, b.id_usuario,
                CONCAT(u.nombre, ' ', u.apellidos) AS usuario, u.correo_institucional AS correo
           FROM bitacora b LEFT JOIN usuario u ON u.id_usuario = b.id_usuario
           ${FILTRO}
          ORDER BY b.fecha DESC, b.id_bitacora DESC
          LIMIT ? OFFSET ?`,
        [...base, limite, desplazamiento]
      );
      const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM bitacora b LEFT JOIN usuario u ON u.id_usuario = b.id_usuario ${FILTRO}`,
        base
      );
      return { registros: filas, total: Number(total) };
    },

    async acciones() {
      const [filas] = await pool.query('SELECT DISTINCT accion FROM bitacora ORDER BY accion');
      return filas.map((f) => f.accion);
    },
  };
}

module.exports = { crearRepoBitacora };
