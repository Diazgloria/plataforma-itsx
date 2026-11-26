// Consultas de la gestión de usuarios (solo administrador).
function aCuenta(f) {
  return {
    id: f.id_usuario, nombre: f.nombre, apellidos: f.apellidos, correo: f.correo_institucional,
    rol: f.rol, estado: f.estado_cuenta, matricula: f.numero_control, semestre: f.semestre,
    departamento: f.departamento, fecha_registro: f.fecha_registro,
    materiales: Number(f.materiales || 0), materias: Number(f.materias || 0),
  };
}

const COLUMNAS = `u.id_usuario, u.nombre, u.apellidos, u.correo_institucional, u.rol, u.estado_cuenta,
       u.numero_control, u.semestre, u.departamento, u.fecha_registro,
       (SELECT COUNT(*) FROM material m WHERE m.id_autor = u.id_usuario AND m.estado <> 'eliminado') AS materiales,
       (SELECT COUNT(*) FROM docente_materia dm WHERE dm.id_docente = u.id_usuario) AS materias`;

function crearRepoCuentas(pool) {
  return {
    // Cuentas de un rol; "texto" busca en nombre, apellidos, correo o matrícula
    async listar({ rol, texto = '' }) {
      const patron = `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
      const [filas] = await pool.query(
        `SELECT ${COLUMNAS}
           FROM usuario u
          WHERE u.rol = ?
            AND (? = '' OR u.nombre LIKE ? OR u.apellidos LIKE ? OR u.correo_institucional LIKE ?
                 OR u.numero_control LIKE ? OR CONCAT(u.nombre, ' ', u.apellidos) LIKE ?)
          ORDER BY u.apellidos, u.nombre
          LIMIT 200`,
        [rol, texto, patron, patron, patron, patron, patron]
      );
      return filas.map(aCuenta);
    },

    async obtener(id) {
      const [filas] = await pool.query(`SELECT ${COLUMNAS} FROM usuario u WHERE u.id_usuario = ?`, [id]);
      return filas[0] ? aCuenta(filas[0]) : null;
    },

    // Crea un docente o administrador con la cuenta ya activa. Lanza ER_DUP_ENTRY si el correo existe.
    async crear({ nombre, apellidos, correo, hash, rol, departamento }) {
      const [r] = await pool.query(
        `INSERT INTO usuario (nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta, departamento)
         VALUES (?, ?, ?, ?, ?, 'activa', ?)`,
        [nombre, apellidos, correo, hash, rol, rol === 'docente' ? departamento : null]
      );
      return r.insertId;
    },

    async actualizar(id, { nombre, apellidos, departamento }) {
      await pool.query(
        'UPDATE usuario SET nombre = ?, apellidos = ?, departamento = COALESCE(?, departamento) WHERE id_usuario = ?',
        [nombre, apellidos, departamento || null, id]
      );
    },

    async cambiarEstado(id, estado) {
      await pool.query('UPDATE usuario SET estado_cuenta = ? WHERE id_usuario = ?', [estado, id]);
    },

    async materiasDe(idDocente) {
      const [filas] = await pool.query('SELECT id_materia FROM docente_materia WHERE id_docente = ?', [idDocente]);
      return filas.map((f) => f.id_materia);
    },

    // Reemplaza las materias activas asignadas al docente por la lista recibida (en una transacción)
    async asignarMaterias(idDocente, ids) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        await conexion.query(
          `DELETE dm FROM docente_materia dm
             JOIN materia ma ON ma.id_materia = dm.id_materia
            WHERE dm.id_docente = ? AND ma.activa = TRUE`,
          [idDocente]
        );
        let asignadas = 0;
        if (ids.length > 0) {
          const [r] = await conexion.query(
            `INSERT INTO docente_materia (id_docente, id_materia)
             SELECT ?, id_materia FROM materia WHERE id_materia IN (?) AND activa = TRUE`,
            [idDocente, ids]
          );
          asignadas = r.affectedRows;
        }
        await conexion.commit();
        return asignadas;
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },

    // Elimina la cuenta solo si no dejó rastro académico (materiales, validaciones o descargas).
    // Devuelve 'ok' o 'en_uso'.
    async eliminar(id) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        const [[uso]] = await conexion.query(
          `SELECT (SELECT COUNT(*) FROM material WHERE id_autor = ?) AS materiales,
                  (SELECT COUNT(*) FROM validacion_docente WHERE id_docente = ?) AS validaciones,
                  (SELECT COUNT(*) FROM descarga WHERE id_usuario = ?) AS descargas`,
          [id, id, id]
        );
        if (Number(uso.materiales) + Number(uso.validaciones) + Number(uso.descargas) > 0) {
          await conexion.rollback();
          return 'en_uso';
        }
        await conexion.query('DELETE FROM notificacion WHERE id_usuario = ?', [id]);
        await conexion.query('DELETE FROM favorito WHERE id_usuario = ?', [id]);
        await conexion.query('DELETE FROM docente_materia WHERE id_docente = ?', [id]);
        await conexion.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
        await conexion.commit();
        return 'ok';
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },
  };
}

module.exports = { crearRepoCuentas };
