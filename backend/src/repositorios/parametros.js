// Parámetros del sistema guardados en la base de datos.
function crearRepoParametros(pool) {
  return {
    async listar() {
      const [filas] = await pool.query('SELECT clave, valor, descripcion FROM parametro_sistema ORDER BY clave');
      return filas;
    },

    // Guarda varios valores en una transacción (actualiza la fila o la crea si no existía)
    async guardar(valores) {
      const conexion = await pool.getConnection();
      try {
        await conexion.beginTransaction();
        for (const [clave, valor] of Object.entries(valores)) {
          const [r] = await conexion.query('UPDATE parametro_sistema SET valor = ? WHERE clave = ?', [String(valor), clave]);
          if (r.affectedRows === 0) {
            await conexion.query('INSERT INTO parametro_sistema (clave, valor) VALUES (?, ?)', [clave, String(valor)]);
          }
        }
        await conexion.commit();
      } catch (err) {
        await conexion.rollback();
        throw err;
      } finally {
        conexion.release();
      }
    },
  };
}

module.exports = { crearRepoParametros };
