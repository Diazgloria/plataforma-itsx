// Consultas propias del docente.
function crearRepoDocentes(pool) {
  return {
    // Materias que imparte el docente, con sus materiales pendientes y validados
    async materiasAsignadas(idDocente, semestre = null) {
      const [filas] = await pool.query(
        `SELECT ma.id_materia, ma.clave, ma.nombre, ma.semestre,
                COALESCE(SUM(m.estado = 'pendiente_validacion'), 0) AS pendientes,
                COALESCE(SUM(m.estado = 'validado'), 0) AS validados
           FROM docente_materia dm
           JOIN materia ma ON ma.id_materia = dm.id_materia AND ma.activa = TRUE
           LEFT JOIN material m ON m.id_materia = ma.id_materia
          WHERE dm.id_docente = ? AND (? IS NULL OR ma.semestre = ?)
          GROUP BY ma.id_materia, ma.clave, ma.nombre, ma.semestre
          ORDER BY ma.semestre, ma.nombre`,
        [idDocente, semestre, semestre]
      );
      return filas.map((f) => ({ ...f, pendientes: Number(f.pendientes), validados: Number(f.validados) }));
    },
  };
}

module.exports = { crearRepoDocentes };
