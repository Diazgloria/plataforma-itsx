// Acceso a las tablas material y version_material.
function crearRepoMateriales(pool) {
  return {
    // La huella SHA-256 no puede repetirse entre versiones vigentes de materiales activos
    async existeHuellaVigente(huella) {
      const [filas] = await pool.query(
        `SELECT 1
           FROM version_material v
           JOIN material m ON m.id_material = v.id_material
          WHERE v.huella_sha256 = ? AND v.vigente = TRUE
            AND m.estado NOT IN ('eliminado', 'retirado')
          LIMIT 1`,
        [huella]
      );
      return filas.length > 0;
    },

    // Registra el material y su primera versión en una sola transacción.
    // guardarArchivo escribe el archivo en disco antes de confirmar; si falla, se revierte todo.
    async crear({ idAutor, idMateria, titulo, descripcion, palabrasClave, archivo }, guardarArchivo) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        const [material] = await conexion.query(
          `INSERT INTO material (id_autor, id_materia, titulo, descripcion, palabras_clave, declaracion_originalidad)
           VALUES (?, ?, ?, ?, ?, TRUE)`,
          [idAutor, idMateria, titulo, descripcion, palabrasClave]
        );
        const idMaterial = material.insertId;
        await conexion.query(
          `INSERT INTO version_material
             (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente)
           VALUES (?, 1, ?, ?, ?, ?, TRUE)`,
          [idMaterial, archivo.nombre, archivo.formato, archivo.tamano, archivo.huella]
        );
        await guardarArchivo(idMaterial, 1);
        await conexion.commit();
        return idMaterial;
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },
  };
}

module.exports = { crearRepoMateriales };