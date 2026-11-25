// Información completa de un material y registro de sus descargas.
function crearRepoDetalleMaterial(pool) {
  return {
    async obtener(idMaterial, idUsuario) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.id_autor, m.titulo, m.descripcion, m.palabras_clave, m.estado, m.fecha_carga,
                ma.nombre AS materia, ma.clave AS materia_clave, ma.semestre,
                t.nombre AS tipo,
                CONCAT(u.nombre, ' ', u.apellidos) AS autor,
                v.numero AS version, v.formato, v.tamano_bytes, v.nombre_archivo, v.huella_sha256,
                c.codigo AS codigo_validacion,
                (SELECT COUNT(*) FROM descarga d WHERE d.id_material = m.id_material) AS descargas,
                EXISTS (SELECT 1 FROM favorito f
                         WHERE f.id_material = m.id_material AND f.id_usuario = ?) AS es_favorito
           FROM material m
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN usuario u ON u.id_usuario = m.id_autor
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
           LEFT JOIN tipo_material t ON t.id_tipo = m.id_tipo
           LEFT JOIN codigo_validacion c ON c.id_material = m.id_material
          WHERE m.id_material = ?`,
        [idUsuario, idMaterial]
      );
      if (filas.length === 0) return null;
      const f = filas[0];
      return { ...f, descargas: Number(f.descargas), es_favorito: Boolean(f.es_favorito) };
    },

    async registrarDescarga(idMaterial, idUsuario) {
      await pool.query('INSERT INTO descarga (id_material, id_usuario) VALUES (?, ?)', [idMaterial, idUsuario]);
    },
  };
}

module.exports = { crearRepoDetalleMaterial };
