// Materiales favoritos del estudiante.
function crearRepoFavoritos(pool) {
  return {
    // Solo los materiales validados pueden marcarse como favoritos
    async materialValidado(idMaterial) {
      const [filas] = await pool.query(
        "SELECT id_material FROM material WHERE id_material = ? AND estado = 'validado'",
        [idMaterial]
      );
      return filas.length > 0;
    },

    async agregar(idUsuario, idMaterial) {
      await pool.query('INSERT IGNORE INTO favorito (id_usuario, id_material) VALUES (?, ?)', [idUsuario, idMaterial]);
    },

    async quitar(idUsuario, idMaterial) {
      await pool.query('DELETE FROM favorito WHERE id_usuario = ? AND id_material = ?', [idUsuario, idMaterial]);
    },

    // Favoritos que siguen validados, con filtro opcional por materia
    async listar(idUsuario, idMateria = null) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.descripcion,
                ma.id_materia, ma.nombre AS materia, t.nombre AS tipo,
                v.formato,
                (SELECT COUNT(*) FROM descarga d WHERE d.id_material = m.id_material) AS descargas
           FROM favorito f
           JOIN material m ON m.id_material = f.id_material AND m.estado = 'validado'
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
           LEFT JOIN tipo_material t ON t.id_tipo = m.id_tipo
          WHERE f.id_usuario = ? AND (? IS NULL OR m.id_materia = ?)
          ORDER BY f.fecha DESC`,
        [idUsuario, idMateria, idMateria]
      );
      return filas.map((f) => ({ ...f, descargas: Number(f.descargas) }));
    },
  };
}

module.exports = { crearRepoFavoritos };
