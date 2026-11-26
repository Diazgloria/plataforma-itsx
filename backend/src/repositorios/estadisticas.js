// Indicadores generales de uso de la plataforma (solo administrador).
function crearRepoEstadisticas(pool) {
  return {
    // semestre: 1-8 o null; dias: cuántos días hacia atrás contar o null para todo el historial
    async resumen({ semestre = null, dias = null }) {
      const [porEstado] = await pool.query(
        `SELECT m.estado, COUNT(*) AS total
           FROM material m JOIN materia ma ON ma.id_materia = m.id_materia
          WHERE m.estado <> 'eliminado'
            AND (? IS NULL OR ma.semestre = ?)
            AND (? IS NULL OR m.fecha_carga >= DATE_SUB(NOW(), INTERVAL ? DAY))
          GROUP BY m.estado`,
        [semestre, semestre, dias, dias]
      );
      const [porMateria] = await pool.query(
        `SELECT ma.nombre AS materia, ma.semestre, COUNT(m.id_material) AS total
           FROM materia ma
           LEFT JOIN material m ON m.id_materia = ma.id_materia AND m.estado = 'validado'
                AND (? IS NULL OR m.fecha_carga >= DATE_SUB(NOW(), INTERVAL ? DAY))
          WHERE ma.activa = TRUE AND (? IS NULL OR ma.semestre = ?)
          GROUP BY ma.id_materia, ma.nombre, ma.semestre
          ORDER BY total DESC, ma.nombre
          LIMIT 15`,
        [dias, dias, semestre, semestre]
      );
      const [[personas]] = await pool.query(
        `SELECT (SELECT COUNT(*) FROM usuario WHERE rol = 'estudiante' AND estado_cuenta = 'activa') AS estudiantes,
                (SELECT COUNT(*) FROM usuario WHERE rol = 'docente' AND estado_cuenta = 'activa') AS docentes`
      );
      const [[descargas]] = await pool.query(
        `SELECT COUNT(*) AS total
           FROM descarga d
           JOIN material m ON m.id_material = d.id_material
           JOIN materia ma ON ma.id_materia = m.id_materia
          WHERE (? IS NULL OR ma.semestre = ?)
            AND (? IS NULL OR d.fecha >= DATE_SUB(NOW(), INTERVAL ? DAY))`,
        [semestre, semestre, dias, dias]
      );
      return {
        porEstado: porEstado.map((f) => ({ estado: f.estado, total: Number(f.total) })),
        porMateria: porMateria.map((f) => ({ materia: f.materia, semestre: f.semestre, total: Number(f.total) })),
        estudiantes: Number(personas.estudiantes),
        docentes: Number(personas.docentes),
        descargas: Number(descargas.total),
      };
    },
  };
}

module.exports = { crearRepoEstadisticas };
