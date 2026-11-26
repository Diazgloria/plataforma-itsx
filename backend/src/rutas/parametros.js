const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');
const { PARAMETROS, validarValores, valoresPorDefecto, aplicarAConfig } = require('../servicios/parametros');

module.exports = function ({ config, repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-29

  const requiereReinicio = (valores) => Object.keys(valores).some((k) => PARAMETROS[k].reinicio);

  // Parámetros con su valor actual, rango y valor por defecto
  router.get('/', async (req, res) => {
    const guardados = {};
    (await repos.parametros.listar()).forEach((f) => { guardados[f.clave] = Number(f.valor); });
    const parametros = Object.entries(PARAMETROS).map(([clave, d]) => ({
      clave, etiqueta: d.etiqueta, unidad: d.unidad, min: d.min, max: d.max, defecto: d.defecto,
      ayuda: d.ayuda, reinicio: Boolean(d.reinicio),
      valor: Number.isFinite(guardados[clave]) ? guardados[clave] : d.defecto,
    }));
    res.json({ parametros });
  });

  // Guarda los valores enviados: { valores: { clave: número } }
  router.put('/', async (req, res) => {
    const { errores, datos } = validarValores((req.body || {}).valores);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    await repos.parametros.guardar(datos);
    aplicarAConfig(config, datos);
    res.json({ mensaje: 'Parámetros guardados.', requiere_reinicio: requiereReinicio(datos) });
  });

  // Vuelve a los valores por defecto
  router.post('/restablecer', async (req, res) => {
    const datos = valoresPorDefecto();
    await repos.parametros.guardar(datos);
    aplicarAConfig(config, datos);
    res.json({ mensaje: 'Se restablecieron los valores por defecto.', requiere_reinicio: true });
  });

  return router;
};
