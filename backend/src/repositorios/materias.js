// Acceso al catálogo de materias.
function crearRepoMaterias(pool) {
  return {
    // Materias activas con la cantidad de materiales validados de cada una.
    // Si semestre es null devuelve todas las materias.
    async listar(semestre = null) {
      const [filas] = await pool.query(
        `SELECT m.id_materia, m.clave, m.nombre, m.semestre, COUNT(mt.id_material) AS archivos
           FROM materia m
           LEFT JOIN material mt ON mt.id_materia = m.id_materia AND mt.estado = 'validado'
          WHERE m.activa = TRUE AND (? IS NULL OR m.semestre = ?)
          GROUP BY m.id_materia, m.clave, m.nombre, m.semestre
          ORDER BY m.semestre, m.nombre`,
        [semestre, semestre]
      );
      return filas;
    },
    async buscarActivaPorId(id) {
      const [filas] = await pool.query(
        'SELECT id_materia, clave, nombre, semestre FROM materia WHERE id_materia = ? AND activa = TRUE',
        [id]
      );
      return filas[0] || null;
    },
  };
}

module.exports = { crearRepoMaterias };