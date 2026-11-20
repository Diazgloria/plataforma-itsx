// Acceso a los datos de los materiales propios del estudiante.
function crearRepoMisMateriales(pool) {
  return {
    // Materiales del autor (sin los eliminados), con el código y el último comentario del docente
    async listarDelAutor(idAutor) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.descripcion, m.palabras_clave, m.estado, m.fecha_carga,
                ma.nombre AS materia, v.formato, v.tamano_bytes,
                c.codigo AS codigo_validacion,
                (SELECT vd.comentario
                   FROM validacion_docente vd
                  WHERE vd.id_material = m.id_material
                  ORDER BY vd.fecha DESC, vd.id_validacion DESC
                  LIMIT 1) AS comentario_docente
           FROM material m
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
           LEFT JOIN codigo_validacion c ON c.id_material = m.id_material
          WHERE m.id_autor = ? AND m.estado <> 'eliminado'
          ORDER BY m.fecha_carga DESC, m.id_material DESC`,
        [idAutor]
      );
      return filas;
    },

    // Un material, solo si pertenece al autor y no está eliminado
    async obtenerDelAutor(idMaterial, idAutor) {
      const [filas] = await pool.query(
        `SELECT id_material, estado FROM material
          WHERE id_material = ? AND id_autor = ? AND estado <> 'eliminado'`,
        [idMaterial, idAutor]
      );
      return filas[0] || null;
    },

    async actualizarDatos({ idMaterial, idAutor, titulo, descripcion, palabrasClave }) {
      await pool.query(
        `UPDATE material SET titulo = ?, descripcion = ?, palabras_clave = ?
          WHERE id_material = ? AND id_autor = ?`,
        [titulo, descripcion, palabrasClave, idMaterial, idAutor]
      );
    },

    // Eliminación lógica: el material y su archivo se conservan, solo cambia el estado
    async eliminarLogico(idMaterial, idAutor) {
      await pool.query(
        "UPDATE material SET estado = 'eliminado' WHERE id_material = ? AND id_autor = ?",
        [idMaterial, idAutor]
      );
    },
  };
}

module.exports = { crearRepoMisMateriales };