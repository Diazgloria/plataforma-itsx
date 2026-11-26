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
    async crear({ idAutor, idMateria, idTipo = null, titulo, descripcion, palabrasClave, archivo }, guardarArchivo) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        const [material] = await conexion.query(
          `INSERT INTO material (id_autor, id_materia, id_tipo, titulo, descripcion, palabras_clave, declaracion_originalidad)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [idAutor, idMateria, idTipo, titulo, descripcion, palabrasClave]
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
        // Catálogo: solo materiales validados, con filtro opcional por materia y por texto
    async buscarValidados({ texto = '', idMateria = null, idTipo = null }) {
      const patron = texto ? `%${texto.replace(/[\\%_]/g, '\\$&')}%` : null;
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.descripcion, m.fecha_carga,
                ma.nombre AS materia, ma.clave AS materia_clave, t.nombre AS tipo,
                CONCAT(u.nombre, ' ', u.apellidos) AS autor,
                v.formato, v.tamano_bytes,
                c.codigo AS codigo_validacion
           FROM material m
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN usuario u ON u.id_usuario = m.id_autor
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
           LEFT JOIN codigo_validacion c ON c.id_material = m.id_material
           LEFT JOIN tipo_material t ON t.id_tipo = m.id_tipo
          WHERE m.estado = 'validado'
            AND (? IS NULL OR m.id_materia = ?)
            AND (? IS NULL OR m.id_tipo = ?)
            AND (? IS NULL OR m.titulo LIKE ? OR m.palabras_clave LIKE ? OR m.descripcion LIKE ?)
          ORDER BY m.fecha_carga DESC, m.id_material DESC`,
        [idMateria, idMateria, idTipo, idTipo, patron, patron, patron, patron]
      );
      return filas;
    },

    // Datos para entregar el archivo de la versión vigente
    async obtenerArchivoVigente(idMaterial) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.id_autor, m.estado, v.numero, v.formato, v.nombre_archivo
           FROM material m
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
          WHERE m.id_material = ?`,
        [idMaterial]
      );
      return filas[0] || null;
    },
  };
}

module.exports = { crearRepoMateriales };