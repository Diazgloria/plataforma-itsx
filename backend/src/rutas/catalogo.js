const { Router } = require('express');
const { requiereRol } = require('../middleware/seguridad');
const { validarMateria } = require('../servicios/catalogo');

module.exports = function ({ repos }) {
  const router = Router();
  router.use(requiereRol('administrador')); // CU-07: solo el administrador mantiene el catálogo

  const idDe = (req) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
  };
  const claveRepetida = (res) => res.status(409).json({ error: 'Ya existe una materia con esa clave.' });

  // Lista todas las materias; ?semestre=N filtra por semestre
  router.get('/', async (req, res) => {
    let semestre = null;
    if (req.query.semestre) {
      semestre = Number(req.query.semestre);
      if (!Number.isInteger(semestre) || semestre < 1 || semestre > 8) {
        return res.status(400).json({ error: 'Semestre inválido.' });
      }
    }
    res.json({ materias: await repos.catalogo.listar(semestre) });
  });

  // Agregar materia
  router.post('/', async (req, res) => {
    const { errores, datos } = validarMateria(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    try {
      const id = await repos.catalogo.crear(datos);
      res.status(201).json({ mensaje: 'Materia agregada.', id });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return claveRepetida(res);
      throw err;
    }
  });

  // Editar clave, nombre, semestre o descripción
  router.put('/:id', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (!(await repos.catalogo.obtener(id))) return res.status(404).json({ error: 'La materia no existe.' });

    const { errores, datos } = validarMateria(req.body);
    if (errores.length > 0) return res.status(400).json({ error: errores[0], errores });
    try {
      await repos.catalogo.actualizar(id, datos);
      res.json({ mensaje: 'Materia actualizada.' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return claveRepetida(res);
      throw err;
    }
  });

  // Desactivar o activar: una materia inactiva ya no se ofrece al subir material, pero conserva sus materiales
  router.post('/:id/estado', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (typeof (req.body || {}).activa !== 'boolean') {
      return res.status(400).json({ error: 'Indica si la materia queda activa (true) o inactiva (false).' });
    }
    if (!(await repos.catalogo.obtener(id))) return res.status(404).json({ error: 'La materia no existe.' });
    await repos.catalogo.cambiarActiva(id, req.body.activa);
    res.json({ mensaje: req.body.activa ? 'Materia activada.' : 'Materia desactivada.' });
  });

  // Eliminar: solo si no tiene materiales ni docentes asignados (si los tiene, conviene desactivarla)
  router.delete('/:id', async (req, res) => {
    const id = idDe(req);
    if (!id) return res.status(400).json({ error: 'Identificador no válido.' });
    if (!(await repos.catalogo.obtener(id))) return res.status(404).json({ error: 'La materia no existe.' });

    const { materiales, docentes } = await repos.catalogo.dependencias(id);
    if (materiales > 0 || docentes > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: tiene ${materiales} material(es) y ${docentes} docente(s) asignado(s). Desactívala en su lugar.`,
      });
    }
    await repos.catalogo.eliminar(id);
    res.json({ mensaje: 'Materia eliminada.' });
  });

  return router;
};
