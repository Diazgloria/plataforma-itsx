const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');

const POR_PAGINA = 20;
const LIMITE_EXPORTAR = 5000;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Evita que una celda se interprete como fórmula al abrir el CSV en Excel
function celda(valor) {
  let t = valor === null || valor === undefined ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-30: la bitácora es de solo lectura y solo para el administrador

  // Lee y valida los filtros comunes (?q, ?accion, ?desde, ?hasta); devuelve null si alguno es inválido
  function leerFiltros(req, res) {
    const filtros = {
      texto: String(req.query.q || '').trim().slice(0, 80),
      accion: req.query.accion ? String(req.query.accion).slice(0, 60) : null,
      desde: req.query.desde ? String(req.query.desde) : null,
      hasta: req.query.hasta ? String(req.query.hasta) : null,
    };
    for (const campo of ['desde', 'hasta']) {
      if (filtros[campo] && (!FECHA.test(filtros[campo]) || Number.isNaN(Date.parse(filtros[campo])))) {
        res.status(400).json({ error: `La fecha "${campo}" no es válida (usa AAAA-MM-DD).` });
        return null;
      }
    }
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      res.status(400).json({ error: 'La fecha inicial no puede ser posterior a la final.' });
      return null;
    }
    return filtros;
  }

  router.get('/acciones', async (req, res) => {
    res.json({ acciones: await repos.bitacora.acciones() });
  });

  // Descarga de la bitácora filtrada en CSV
  router.get('/exportar', async (req, res) => {
    const filtros = leerFiltros(req, res);
    if (!filtros) return;
    const { registros } = await repos.bitacora.listar(filtros, { limite: LIMITE_EXPORTAR, desplazamiento: 0 });
    const lineas = [['Fecha', 'Usuario', 'Correo', 'Acción', 'Detalle'].map(celda).join(',')];
    registros.forEach((r) => lineas.push([
      new Date(r.fecha).toLocaleString('es-MX', { hour12: false }), r.usuario || 'Sistema / anónimo', r.correo, r.accion, r.detalle,
    ].map(celda).join(',')));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bitacora.csv"');
    res.send('﻿' + lineas.join('\r\n')); // BOM para que Excel respete los acentos
  });

  // Consulta paginada: ?pagina=N
  router.get('/', async (req, res) => {
    const filtros = leerFiltros(req, res);
    if (!filtros) return;
    const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
    const { registros, total } = await repos.bitacora.listar(filtros, {
      limite: POR_PAGINA, desplazamiento: (pagina - 1) * POR_PAGINA,
    });
    res.json({ registros, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) });
  });

  return router;
};
