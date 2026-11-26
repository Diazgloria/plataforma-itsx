// Bitácora de auditoría (PT-21): registra las acciones importantes sin tocar cada ruta.
// Se ejecuta al terminar la respuesta, así solo queda registrado lo que realmente ocurrió.
// Nunca guarda contraseñas ni tokens: cada regla elige qué datos seguros incluir en el detalle.
const texto = (v) => String(v === undefined || v === null ? '' : v).trim();
const exito = (res) => res.statusCode < 400;

// Regla: método, ruta (sin "/api"), acción (o null si no se registra) y detalle
const regla = (metodo, ruta, accion, detalle = () => '') => ({ metodo, ruta, accion, detalle });
const siExito = (nombre) => (req, res) => (exito(res) ? nombre : null);

const REGLAS = [
  // Cuentas y sesión
  regla('POST', /^\/auth\/login$/, (req, res) => ({ 200: 'inicio_sesion', 401: 'inicio_sesion_fallido', 403: 'inicio_sesion_rechazado', 429: 'cuenta_bloqueada' }[res.statusCode] || null),
    (req) => `Correo: ${texto(req.body && req.body.correo).toLowerCase()}`),
  regla('POST', /^\/auth\/logout$/, siExito('cierre_sesion')),
  regla('POST', /^\/auth\/registro$/, siExito('registro_estudiante'), (req) => `Correo: ${texto(req.body && req.body.correo).toLowerCase()}`),
  regla('POST', /^\/auth\/verificar$/, siExito('verificacion_cuenta')),
  regla('POST', /^\/auth\/recuperar$/, siExito('solicitud_recuperacion'), (req) => `Correo: ${texto(req.body && req.body.correo).toLowerCase()}`),
  regla('POST', /^\/auth\/restablecer$/, siExito('contrasena_restablecida')),
  regla('POST', /^\/perfil\/contrasena$/, siExito('cambio_contrasena')),
  regla('PUT', /^\/perfil$/, siExito('perfil_actualizado')),

  // Materiales
  regla('POST', /^\/materiales$/, siExito('material_subido'), (req) => `Título: ${texto(req.body && req.body.titulo)}`),
  regla('PUT', /^\/mis-materiales\/(\d+)$/, siExito('material_editado'), (req, m) => `Material ${m[1]}`),
  regla('DELETE', /^\/mis-materiales\/(\d+)$/, siExito('material_eliminado_por_autor'), (req, m) => `Material ${m[1]}`),
  regla('POST', /^\/validacion\/(\d+)\/decision$/, (req, res) => (exito(res) ? `validacion_${texto(req.body && req.body.decision)}` : null),
    (req, m) => `Material ${m[1]}${req.body && req.body.comentario ? `. Comentario: ${texto(req.body.comentario)}` : ''}`),
  regla('POST', /^\/moderacion\/(\d+)\/accion$/, (req, res) => (exito(res) ? `moderacion_${texto(req.body && req.body.accion)}` : null),
    (req, m) => `Material ${m[1]}${req.body && req.body.motivo ? `. Motivo: ${texto(req.body.motivo)}` : ''}`),

  // Administración
  regla('POST', /^\/catalogo$/, siExito('materia_creada'), (req) => `Clave: ${texto(req.body && req.body.clave).toUpperCase()}`),
  regla('PUT', /^\/catalogo\/(\d+)$/, siExito('materia_editada'), (req, m) => `Materia ${m[1]}`),
  regla('POST', /^\/catalogo\/(\d+)\/estado$/, (req, res) => (exito(res) ? (req.body && req.body.activa ? 'materia_activada' : 'materia_desactivada') : null), (req, m) => `Materia ${m[1]}`),
  regla('DELETE', /^\/catalogo\/(\d+)$/, siExito('materia_eliminada'), (req, m) => `Materia ${m[1]}`),
  regla('POST', /^\/tipos$/, siExito('tipo_creado'), (req) => `Tipo: ${texto(req.body && req.body.nombre)}`),
  regla('PUT', /^\/tipos\/(\d+)$/, siExito('tipo_editado'), (req, m) => `Tipo ${m[1]}`),
  regla('POST', /^\/tipos\/(\d+)\/estado$/, (req, res) => (exito(res) ? (req.body && req.body.activo ? 'tipo_activado' : 'tipo_desactivado') : null), (req, m) => `Tipo ${m[1]}`),
  regla('POST', /^\/cuentas$/, siExito('cuenta_creada'), (req) => `Rol: ${texto(req.body && req.body.rol)}. Correo: ${texto(req.body && req.body.correo).toLowerCase()}`),
  regla('PUT', /^\/cuentas\/(\d+)$/, siExito('cuenta_editada'), (req, m) => `Usuario ${m[1]}`),
  regla('POST', /^\/cuentas\/(\d+)\/estado$/, (req, res) => (exito(res) ? (req.body && req.body.estado === 'suspendida' ? 'cuenta_suspendida' : 'cuenta_reactivada') : null), (req, m) => `Usuario ${m[1]}`),
  regla('PUT', /^\/cuentas\/(\d+)\/materias$/, siExito('docente_materias_asignadas'), (req, m) => `Docente ${m[1]}`),
  regla('DELETE', /^\/cuentas\/(\d+)$/, siExito('cuenta_eliminada'), (req, m) => `Usuario ${m[1]}`),
  regla('PUT', /^\/parametros$/, siExito('parametros_modificados'), (req) => `Parámetros: ${Object.keys((req.body && req.body.valores) || {}).join(', ')}`),
  regla('POST', /^\/parametros\/restablecer$/, siExito('parametros_restablecidos')),
];

function crearAuditoria(repos) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();
    const ruta = req.path; // ruta relativa a /api; se guarda ahora porque Express cambia req.url al avanzar
    const antes = req.session && req.session.usuario ? req.session.usuario.id : null; // el logout destruye la sesión

    res.on('finish', () => {
      try {
        if (!repos.bitacora) return;
        for (const r of REGLAS) {
          if (r.metodo !== req.method) continue;
          const m = ruta.match(r.ruta);
          if (!m) continue;
          const accion = r.accion(req, res, m);
          if (!accion) return;
          const idUsuario = (req.session && req.session.usuario && req.session.usuario.id) || antes;
          const detalle = r.detalle(req, m).slice(0, 300);
          // Registrar nunca debe afectar la respuesta que ya se envió
          Promise.resolve(repos.bitacora.registrar({ idUsuario, accion, detalle: detalle || null }))
            .catch((err) => console.error('No se pudo registrar en la bitácora:', err.message));
          return;
        }
      } catch (err) {
        console.error('Error en la bitácora:', err.message);
      }
    });
    next();
  };
}

module.exports = { crearAuditoria, REGLAS };
