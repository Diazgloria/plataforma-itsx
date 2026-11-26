// Cierra todas las sesiones abiertas de un usuario (si el almacén de sesiones lo permite).
// Se usa al suspender o eliminar una cuenta para que deje de tener acceso de inmediato.
function cerrarSesionesDe(req, idUsuario) {
  const almacen = req.sessionStore;
  if (!almacen || typeof almacen.all !== 'function') return Promise.resolve();
  return new Promise((resolver) => {
    almacen.all((err, sesiones) => {
      if (err || !sesiones) return resolver();
      Object.entries(sesiones).forEach(([sid, datos]) => {
        if (datos.usuario && datos.usuario.id === idUsuario) almacen.destroy(sid, () => {});
      });
      resolver();
    });
  });
}

module.exports = { cerrarSesionesDe };
