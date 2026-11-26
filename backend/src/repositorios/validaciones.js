// Acceso a los datos del proceso de validación docente.

// Inserta el código de validación; si por casualidad ya existe, genera otro (hasta 5 intentos)
async function insertarCodigo(conexion, idValidacion, idMaterial, numeroVersion, generarCodigo) {
  for (let intento = 0; intento < 5; intento++) {
    const codigo = generarCodigo(numeroVersion);
    try {
      await conexion.query(
        `INSERT INTO codigo_validacion (id_validacion, id_material, codigo, fecha_emision)
         VALUES (?, ?, ?, CURDATE())`,
        [idValidacion, idMaterial, codigo]
      );
      return codigo;
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
    }
  }
  throw new Error('No se pudo generar un código de validación único.');
}

function crearRepoValidaciones(pool) {
  return {
    // Materiales pendientes de las materias que imparte el docente (los más antiguos primero)
    async listarPendientes(idDocente) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.descripcion, m.fecha_carga,
                ma.nombre AS materia, ma.clave AS materia_clave,
                CONCAT(u.nombre, ' ', u.apellidos) AS autor,
                v.formato, v.tamano_bytes
           FROM material m
           JOIN docente_materia dm ON dm.id_materia = m.id_materia AND dm.id_docente = ?
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN usuario u ON u.id_usuario = m.id_autor
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
          WHERE m.estado = 'pendiente_validacion'
          ORDER BY m.fecha_carga ASC, m.id_material ASC`,
        [idDocente]
      );
      return filas;
    },

    // Un material pendiente, solo si el docente imparte su materia
    async obtenerPendiente(idMaterial, idDocente) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.descripcion, m.palabras_clave, m.fecha_carga,
                ma.nombre AS materia, ma.clave AS materia_clave,
                CONCAT(u.nombre, ' ', u.apellidos) AS autor,
                v.numero AS version, v.nombre_archivo, v.formato, v.tamano_bytes
           FROM material m
           JOIN docente_materia dm ON dm.id_materia = m.id_materia AND dm.id_docente = ?
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN usuario u ON u.id_usuario = m.id_autor
           JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
          WHERE m.id_material = ? AND m.estado = 'pendiente_validacion'`,
        [idDocente, idMaterial]
      );
      return filas[0] || null;
    },

    // Registra la decisión en una sola transacción: validación, código (si se aprueba),
    // nuevo estado del material y notificación al autor. Devuelve null si el material
    // ya no está pendiente o el docente no imparte esa materia.
    async registrarDecision({ idMaterial, idDocente, decision, comentario, generarCodigo }) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();

        // FOR UPDATE: bloquea el material para que dos docentes no lo validen a la vez
        const [filas] = await conexion.query(
          `SELECT m.id_material, m.id_autor, m.titulo, v.numero
             FROM material m
             JOIN docente_materia dm ON dm.id_materia = m.id_materia AND dm.id_docente = ?
             JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
            WHERE m.id_material = ? AND m.estado = 'pendiente_validacion'
              FOR UPDATE OF m`,
          [idDocente, idMaterial]
        );
        if (filas.length === 0) {
          await conexion.rollback();
          return null;
        }
        const material = filas[0];

        const [validacion] = await conexion.query(
          'INSERT INTO validacion_docente (id_material, id_docente, decision, comentario) VALUES (?, ?, ?, ?)',
          [idMaterial, idDocente, decision, comentario || null]
        );

        let codigo = null;
        if (decision === 'aprobado') {
          codigo = await insertarCodigo(conexion, validacion.insertId, idMaterial, material.numero, generarCodigo);
        }

        await conexion.query('UPDATE material SET estado = ? WHERE id_material = ?', [
          decision === 'aprobado' ? 'validado' : 'rechazado',
          idMaterial,
        ]);

        const mensaje = decision === 'aprobado'
          ? `Tu material "${material.titulo}" fue validado.`
          : `Tu material "${material.titulo}" fue rechazado. Revisa el comentario del docente.`;
        await conexion.query(
          'INSERT INTO notificacion (id_usuario, id_material, tipo, mensaje) VALUES (?, ?, ?, ?)',
          [material.id_autor, idMaterial, decision === 'aprobado' ? 'material_validado' : 'material_rechazado', mensaje]
        );

        await conexion.commit();
        return { codigo, titulo: material.titulo };
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },
  };
}

module.exports = { crearRepoValidaciones, insertarCodigo };