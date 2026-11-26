const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');

const PERIODOS = { 30: 30, 90: 90, 365: 365 }; // días permitidos; sin valor = todo el historial

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-31

  // Indicadores y datos de las gráficas: ?semestre=1-8&dias=30|90|365
  router.get('/', async (req, res) => {
    let semestre = null;
    if (req.query.semestre) {
      semestre = Number(req.query.semestre);
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 8) {
        return res.status(400).json({ error: 'Semestre inválido.' });
      }
    }
    let dias = null;
    if (req.query.dias) {
      dias = PERIODOS[req.query.dias];
      if (!dias) return res.status(400).json({ error: 'Periodo inválido. Usa 30, 90 o 365 días.' });
    }

    const r = await repos.estadisticas.resumen({ semestre, dias });
    const de = (estado) => (r.porEstado.find((e) => e.estado === estado) || { total: 0 }).total;
    res.json({
      filtros: { semestre, dias },
      indicadores: {
        publicados: de('validado'),
        pendientes: de('pendiente_validacion'),
        estudiantes_activos: r.estudiantes,
        docentes_activos: r.docentes,
        descargas: r.descargas,
      },
      por_materia: r.porMateria,
      por_estado: r.porEstado,
      generado: new Date().toISOString(),
    });
  });

  return router;
};
