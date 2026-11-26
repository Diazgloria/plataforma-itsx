// Consultas y acciones de la moderación de contenidos (solo administrador).
const { insertarCodigo } = require('./validaciones');
const { ACCIONES, puedeAplicar, mensajeAutor } = require('../servicios/moderacion');

function crearRepoModeracion(pool) {
  return {
    // Todos los materiales con filtros opcionales. Sin filtro de estado no se listan los eliminados.
    async listar({ semestre = null, estado = null, idMateria = null }) {
      const [filas] = await pool.query(
        `SELECT m.id_material, m.titulo, m.estado, m.fecha_carga,
                ma.id_materia, ma.nombre AS materia, ma.clave AS materia_clave, ma.semestre,
                CONCAT(u.nombre, ' ', u.apellidos) AS autor,
                v.numero AS version, v.formato, v.huella_sha256 AS huella
           FROM material m
           JOIN materia ma ON ma.id_materia = m.id_materia
           JOIN usuario u ON u.id_usuario = m.id_autor
           LEFT JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
          WHERE (? IS NULL OR ma.semestre = ?)
            AND (? IS NULL OR ma.id_materia = ?)
            AND ((? IS NULL AND m.estado <> 'eliminado') OR m.estado = ?)
          ORDER BY m.fecha_carga DESC, m.id_material DESC
          LIMIT 200`,
        [semestre, semestre, idMateria, idMateria, estado, estado]
      );
      return filas;
    },

    // Aplica una acción en una sola transacción: cambio de estado, decisión y código (si se aprueba)
    // y aviso al autor. Devuelve { resultado: 'ok' | 'no_existe' | 'estado_invalido', ... }.
    async aplicarAccion({ idMaterial, idAdmin, accion, motivo, generarCodigo }) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();

        // FOR UPDATE: evita que un docente y el administrador decidan sobre el mismo material a la vez
        const [filas] = await conexion.query(
          `SELECT m.id_material, m.id_autor, m.titulo, m.estado, v.numero
             FROM material m
             LEFT JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
            WHERE m.id_material = ?
              FOR UPDATE OF m`,
          [idMaterial]
        );
        if (filas.length === 0) {
          await conexion.rollback();
          return { resultado: 'no_existe' };
        }
        const material = filas[0];
        if (!puedeAplicar(accion, material.estado)) {
          await conexion.rollback();
          return { resultado: 'estado_invalido', estado: material.estado };
        }

        // Aprobar o rechazar como supervisor deja la misma huella que la validación docente
        let codigo = null;
        if (accion === 'aprobar' || accion === 'rechazar') {
          const [validacion] = await conexion.query(
            'INSERT INTO validacion_docente (id_material, id_docente, decision, comentario) VALUES (?, ?, ?, ?)',
            [idMaterial, idAdmin, accion === 'aprobar' ? 'aprobado' : 'rechazado', motivo || null]
          );
          if (accion === 'aprobar') {
            codigo = await insertarCodigo(conexion, validacion.insertId, idMaterial, material.numero || 1, generarCodigo);
          }
        }

        await conexion.query('UPDATE material SET estado = ? WHERE id_material = ?', [ACCIONES[accion].hacia, idMaterial]);
        await conexion.query(
          'INSERT INTO notificacion (id_usuario, id_material, tipo, mensaje) VALUES (?, ?, ?, ?)',
          [material.id_autor, idMaterial, ACCIONES[accion].tipo, mensajeAutor(accion, material.titulo, motivo)]
        );

        await conexion.commit();
        return { resultado: 'ok', titulo: material.titulo, codigo };
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },
  };
}

module.exports = { crearRepoModeracion };
