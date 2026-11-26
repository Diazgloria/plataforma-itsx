// Parámetros de configuración que el administrador puede cambiar (PT-20).
const PARAMETROS = {
  tamano_maximo_mb: {
    etiqueta: 'Tamaño máximo de archivo', unidad: 'MB', min: 1, max: 50, defecto: 20,
    ayuda: 'Se aplica de inmediato a las nuevas subidas.',
  },
  intentos_login: {
    etiqueta: 'Intentos de inicio de sesión antes del bloqueo', unidad: 'intentos', min: 3, max: 10, defecto: 5,
    ayuda: 'Se aplica de inmediato.',
  },
  bloqueo_minutos: {
    etiqueta: 'Duración del bloqueo por intentos fallidos', unidad: 'minutos', min: 1, max: 120, defecto: 15,
    ayuda: 'Se aplica de inmediato.',
  },
  sesion_inactividad_min: {
    etiqueta: 'Cierre de sesión por inactividad', unidad: 'minutos', min: 5, max: 240, defecto: 30, reinicio: true,
    ayuda: 'Se aplica al reiniciar el servidor.',
  },
};

// Valida un objeto { clave: valor }; todos deben ser enteros dentro del rango de su parámetro
function validarValores(valores) {
  const errores = [];
  const datos = {};
  if (!valores || typeof valores !== 'object' || Array.isArray(valores) || Object.keys(valores).length === 0) {
    return { errores: ['No se recibió ningún parámetro.'], datos };
  }
  Object.entries(valores).forEach(([clave, bruto]) => {
    const def = PARAMETROS[clave];
    if (!def) { errores.push(`El parámetro "${clave}" no existe.`); return; }
    const n = typeof bruto === 'string' && bruto.trim() !== '' ? Number(bruto) : bruto;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < def.min || n > def.max) {
      errores.push(`${def.etiqueta}: escribe un número entero entre ${def.min} y ${def.max}.`);
    } else {
      datos[clave] = n;
    }
  });
  return { errores, datos };
}

function valoresPorDefecto() {
  return Object.fromEntries(Object.entries(PARAMETROS).map(([clave, d]) => [clave, d.defecto]));
}

// Copia los valores a la configuración que usa el servidor
function aplicarAConfig(config, valores) {
  if (valores.tamano_maximo_mb !== undefined) config.tamanoMaximoBytes = valores.tamano_maximo_mb * 1024 * 1024;
  if (valores.intentos_login !== undefined) config.bloqueo.maxIntentos = valores.intentos_login;
  if (valores.bloqueo_minutos !== undefined) config.bloqueo.duracionMs = valores.bloqueo_minutos * 60 * 1000;
  if (valores.sesion_inactividad_min !== undefined) config.sesion.inactividadMs = valores.sesion_inactividad_min * 60 * 1000;
}

// Al iniciar el servidor: lee los valores guardados y los aplica. Si la tabla aún no existe, usa los de config.js.
async function cargarParametros(repo, config, registro = console) {
  try {
    const guardados = {};
    (await repo.listar()).forEach((f) => { guardados[f.clave] = Number(f.valor); });
    const { datos } = validarValores(Object.fromEntries(Object.entries(guardados).filter(([k]) => PARAMETROS[k])));
    aplicarAConfig(config, datos);
    return datos;
  } catch (err) {
    registro.warn('No se pudieron cargar los parámetros del sistema; se usan los valores por defecto:', err.message);
    return {};
  }
}

module.exports = { PARAMETROS, validarValores, valoresPorDefecto, aplicarAConfig, cargarParametros };
