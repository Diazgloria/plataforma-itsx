// Tipos de material (apuntes, resumen, etc.).
function crearRepoTipos(pool) {
  return {
    // Tipos activos: los que el estudiante puede elegir al subir un material
    async listarActivos() {
      const [filas] = await pool.query('SELECT id_tipo, nombre FROM tipo_material WHERE activo = TRUE ORDER BY nombre');
      return filas;
    },

    // Todos los tipos con el número de materiales que tiene cada uno (vista del administrador)
    async listarTodos() {
      const [filas] = await pool.query(
        `SELECT t.id_tipo, t.nombre, t.activo,
                (SELECT COUNT(*) FROM material m WHERE m.id_tipo = t.id_tipo AND m.estado <> 'eliminado') AS materiales
           FROM tipo_material t
          ORDER BY t.nombre`
      );
      return filas.map((f) => ({ ...f, activo: Boolean(f.activo), materiales: Number(f.materiales) }));
    },

    async obtener(id) {
      const [filas] = await pool.query('SELECT id_tipo, nombre, activo FROM tipo_material WHERE id_tipo = ?', [id]);
      return filas[0] || null;
    },

    // Lanza ER_DUP_ENTRY si el nombre ya existe
    async crear(nombre) {
      const [r] = await pool.query('INSERT INTO tipo_material (nombre) VALUES (?)', [nombre]);
      return r.insertId;
    },

    async renombrar(id, nombre) {
      await pool.query('UPDATE tipo_material SET nombre = ? WHERE id_tipo = ?', [nombre, id]);
    },

    async cambiarActivo(id, activo) {
      await pool.query('UPDATE tipo_material SET activo = ? WHERE id_tipo = ?', [activo, id]);
    },
  };
}

module.exports = { crearRepoTipos };
