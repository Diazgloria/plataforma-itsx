const { Router } = require('express');
const { requiereSesion } = require('../middleware/seguridad');
const { puedeVerMaterial } = require('../servicios/accesoMaterial');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereSesion);

  // Información completa de un material
  router.get('/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'Identificador no válido.' });

    const usuario = req.session.usuario;
    const material = await repos.detalleMaterial.obtener(id, usuario.id);
    if (!puedeVerMaterial(material, usuario)) {
      return res.status(404).json({ error: 'El material no existe o no está disponible.' });
    }

    res.json({
      material: {
        ...material,
        tipo: material.tipo || 'Sin clasificar',
        // Solo un estudiante puede marcar como favorito un material validado
        puede_favorito: usuario.rol === 'estudiante' && material.estado === 'validado',
      },
    });
  });

  return router;
};
