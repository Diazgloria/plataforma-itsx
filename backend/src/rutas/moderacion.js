const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');
const { generarCodigo } = require('../servicios/validacionDocente');
const { ESTADOS, ACCIONES, validarAccion } = require('../servicios/moderacion');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-28: solo el administrador modera

  // Materiales de toda la plataforma: ?semestre=N&estado=...&materia=id
  router.get('/', async (req, res) => {
    const filtros = { semestre: null, estado: null, idMateria: null };
    if (req.query.semestre) {
      filtros.semestre = Number(req.query.semestre);
      if (!Number.isInteger(filtros.semestre) || filtros.semestre < 1 || filtros.semestre > 8) {
        return res.status(400).json({ error: 'Semestre inválido.' });
      }
    }
    if (req.query.estado) {
      if (!ESTADOS.includes(req.query.estado)) return res.status(400).json({ error: 'Estado inválido.' });
      filtros.estado = req.query.estado;
    }
    if (req.query.materia) {
      filtros.idMateria = Number(req.query.materia);
      if (!Number.isInteger(filtros.idMateria) || filtros.idMateria < 1) {
        return res.status(400).json({ error: 'Materia inválida.' });
      }
    }
    res.json({ materiales: await repos.moderacion.listar(filtros) });
  });

  // Aprobar, rechazar, suspender, reactivar, retirar o eliminar un material
  router.post('/:id/accion', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador no válido.' });

    const { errores, datos } = validarAccion(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });

    const r = await repos.moderacion.aplicarAccion({
      idMaterial: id, idAdmin: req.session.usuario.id, accion: datos.accion, motivo: datos.motivo, generarCodigo,
    });
    if (r.resultado === 'no_existe') return res.status(404).json({ error: 'El material no existe.' });
    if (r.resultado === 'estado_invalido') {
      return res.status(409).json({ error: `No se puede ${datos.accion} un material que está en estado "${r.estado}".` });
    }
    res.json({ mensaje: ACCIONES[datos.accion].ok, codigo: r.codigo });
  });

  return router;
};
