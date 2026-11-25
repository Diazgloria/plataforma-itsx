// Quién puede ver o descargar un material según su estado.
// Un material eliminado no lo ve nadie; uno validado lo ve cualquier usuario con sesión;
// los demás estados solo los ven su autor, los docentes y los administradores.
function puedeVerMaterial(material, usuario) {
  if (!material || !usuario) return false;
  if (material.estado === 'eliminado') return false;
  if (material.estado === 'validado') return true;
  return material.id_autor === usuario.id || usuario.rol === 'docente' || usuario.rol === 'administrador';
}

module.exports = { puedeVerMaterial };
