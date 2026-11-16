const fs = require('fs');
const path = require('path');

// Monta cada archivo de esta carpeta en /api/<nombre-del-archivo>
function montarRutas(app, deps) {
  for (const archivo of fs.readdirSync(__dirname)) {
    if (archivo === 'index.js' || !archivo.endsWith('.js')) continue;
    const nombre = path.basename(archivo, '.js');
    app.use(`/api/${nombre}`, require(path.join(__dirname, archivo))(deps));
  }
}

module.exports = { montarRutas };