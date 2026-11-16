// Validación y almacenamiento de los archivos que sube el estudiante.
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

// Extensión permitida -> valor del ENUM de la columna version_material.formato
const FORMATOS = { pdf: 'PDF', docx: 'DOCX', pptx: 'PPTX', xlsx: 'XLSX', jpg: 'JPG', jpeg: 'JPG', png: 'PNG' };

// Firmas (primeros bytes) para comprobar que el contenido corresponde a la extensión
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // los formatos de Office son archivos ZIP
const FIRMAS = {
  PDF: [Buffer.from('%PDF')],
  PNG: [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  JPG: [Buffer.from([0xff, 0xd8, 0xff])],
  DOCX: [ZIP], PPTX: [ZIP], XLSX: [ZIP],
};

function formatoDeNombre(nombre) {
  const extension = path.extname(nombre || '').replace('.', '').toLowerCase();
  return FORMATOS[extension] || null;
}

function coincideFirma(buffer, formato) {
  return (FIRMAS[formato] || []).some((firma) => buffer.subarray(0, firma.length).equals(firma));
}

// Huella SHA-256: detecta duplicados y permite comprobar la integridad
function huellaSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// multer entrega los nombres en latin1; se convierten a UTF-8 para conservar los acentos
function nombreOriginal(nombre) {
  return Buffer.from(nombre || '', 'latin1').toString('utf8');
}

// Los archivos se guardan fuera de la carpeta pública y con nombre numérico,
// nunca con el nombre que escribió el usuario.
function crearAlmacen(carpeta) {
  const base = path.resolve(carpeta);
  return {
    rutaDe(idMaterial, numero, formato) {
      return path.join(base, `${idMaterial}_${numero}.${formato.toLowerCase()}`);
    },
    async guardar(idMaterial, numero, formato, buffer) {
      await fs.mkdir(base, { recursive: true });
      await fs.writeFile(this.rutaDe(idMaterial, numero, formato), buffer);
    },
  };
}

module.exports = { formatoDeNombre, coincideFirma, huellaSha256, nombreOriginal, crearAlmacen };