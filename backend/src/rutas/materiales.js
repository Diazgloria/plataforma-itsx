const express = require('express');
const multer = require('multer');
const { requiereRol } = require('../middleware/seguridad');
const { formatoDeNombre, coincideFirma, huellaSha256, nombreOriginal, crearAlmacen } = require('../servicios/archivos');

module.exports = function ({ config, repos }) {
  const router = express.Router();
  const almacen = crearAlmacen(config.carpetaArchivos);

  // El archivo llega en memoria (máximo 20 MB) para calcular su huella antes de guardarlo
  const subida = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.tamanoMaximoBytes, files: 1 } });

  // Un estudiante sube un material; queda pendiente de validación por un docente
  router.post('/', requiereRol('estudiante'), subida.single('archivo'), async (req, res) => {
    const cuerpo = req.body || {};
    const titulo = String(cuerpo.titulo || '').trim();
    const descripcion = String(cuerpo.descripcion || '').trim();
    const palabrasClave = String(cuerpo.palabrasClave || '').trim();
    const idMateria = Number(cuerpo.idMateria);
    const declaracion = cuerpo.declaracion === 'true' || cuerpo.declaracion === 'on';

    const faltantes = [];
    if (!titulo) faltantes.push('el título');
    if (!Number.isInteger(idMateria) || idMateria < 1) faltantes.push('la materia');
    if (!req.file) faltantes.push('el archivo');
    if (faltantes.length) return res.status(400).json({ error: `Falta completar: ${faltantes.join(', ')}.` });

    if (titulo.length > 150) return res.status(400).json({ error: 'El título no puede tener más de 150 caracteres.' });
    if (descripcion.length > 500) return res.status(400).json({ error: 'La descripción no puede tener más de 500 caracteres.' });
    if (palabrasClave.length > 200) return res.status(400).json({ error: 'Las palabras clave no pueden tener más de 200 caracteres.' });
    if (!declaracion) {
      return res.status(400).json({ error: 'Debes aceptar la declaración de originalidad y de respeto a los derechos de autor.' });
    }

    const nombre = nombreOriginal(req.file.originalname).slice(0, 200);
    const formato = formatoDeNombre(nombre);
    if (!formato) return res.status(400).json({ error: 'Formato no permitido. Usa PDF, DOCX, PPTX, XLSX, JPG o PNG.' });
    if (req.file.size === 0) return res.status(400).json({ error: 'El archivo está vacío.' });
    if (!coincideFirma(req.file.buffer, formato)) {
      return res.status(400).json({ error: 'El contenido del archivo no corresponde a su extensión.' });
    }

    const materia = await repos.materias.buscarActivaPorId(idMateria);
    if (!materia) return res.status(400).json({ error: 'La materia seleccionada no existe o está inactiva.' });

    const huella = huellaSha256(req.file.buffer);
    if (await repos.materiales.existeHuellaVigente(huella)) {
      return res.status(409).json({ error: 'Ya existe un material con el mismo archivo en la plataforma.' });
    }

    let idMaterial;
    try {
      idMaterial = await repos.materiales.crear(
        {
          idAutor: req.session.usuario.id, idMateria, titulo,
          descripcion: descripcion || null, palabrasClave: palabrasClave || null,
          archivo: { nombre, formato, tamano: req.file.size, huella },
        },
        (id, numero) => almacen.guardar(id, numero, formato, req.file.buffer)
      );
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya existe un material con el mismo archivo en la plataforma.' });
      }
      throw err;
    }

    res.status(201).json({
      mensaje: 'Material enviado. Quedó pendiente de validación por un docente.',
      material: { id: idMaterial, titulo, estado: 'pendiente_validacion', formato },
    });
  });

  return router;
};