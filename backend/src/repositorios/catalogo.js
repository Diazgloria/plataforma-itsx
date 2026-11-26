// Mantenimiento del catálogo de materias (solo administrador).
function crearRepoCatalogo(pool) {
  return {
    // Todas las materias (activas e inactivas) con su número de materiales y de docentes asignados
    async listar(semestre = null) {
      const [filas] = await pool.query(
        `SELECT ma.id_materia, ma.clave, ma.nombre, ma.semestre, ma.descripcion, ma.activa,
                (SELECT COUNT(*) FROM material m
                  WHERE m.id_materia = ma.id_materia AND m.estado <> 'eliminado') AS materiales,
                (SELECT COUNT(*) FROM docente_materia dm WHERE dm.id_materia = ma.id_materia) AS docentes
           FROM materia ma
          WHERE (? IS NULL OR ma.semestre = ?)
          ORDER BY ma.semestre, ma.nombre`,
        [semestre, semestre]
      );
      return filas.map((f) => ({
        ...f, clave: String(f.clave).trim(), activa: Boolean(f.activa),
        materiales: Number(f.materiales), docentes: Number(f.docentes),
      }));
    },

    async obtener(id) {
      const [filas] = await pool.query(
        'SELECT id_materia, clave, nombre, semestre, descripcion, activa FROM materia WHERE id_materia = ?',
        [id]
      );
      return filas[0] || null;
    },

    // Lanza ER_DUP_ENTRY si la clave ya existe
    async crear({ clave, nombre, semestre, descripcion }) {
      const [r] = await pool.query(
        'INSERT INTO materia (clave, nombre, semestre, descripcion) VALUES (?, ?, ?, ?)',
        [clave, nombre, semestre, descripcion || null]
      );
      return r.insertId;
    },

    async actualizar(id, { clave, nombre, semestre, descripcion }) {
      await pool.query(
        'UPDATE materia SET clave = ?, nombre = ?, semestre = ?, descripcion = ? WHERE id_materia = ?',
        [clave, nombre, semestre, descripcion || null, id]
      );
    },

    async cambiarActiva(id, activa) {
      await pool.query('UPDATE materia SET activa = ? WHERE id_materia = ?', [activa, id]);
    },

    // Cuántos materiales (de cualquier estado) y docentes dependen de la materia
    async dependencias(id) {
      const [[fila]] = await pool.query(
        `SELECT (SELECT COUNT(*) FROM material WHERE id_materia = ?) AS materiales,
                (SELECT COUNT(*) FROM docente_materia WHERE id_materia = ?) AS docentes`,
        [id, id]
      );
      return { materiales: Number(fila.materiales), docentes: Number(fila.docentes) };
    },

    async eliminar(id) {
      await pool.query('DELETE FROM materia WHERE id_materia = ?', [id]);
    },
  };
}

module.exports = { crearRepoCatalogo };
