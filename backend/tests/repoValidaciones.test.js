const { crearRepoValidaciones } = require('../src/repositorios/validaciones');

// Conexión simulada: responde según el SQL y registra cada llamada
function crearConexion({ pendiente = true, falla = null, codigoRepetido = 0 } = {}) {
  let duplicados = codigoRepetido;
  const material = { id_material: 7, id_autor: 5, titulo: 'Apuntes de cálculo', numero: 3 };
  return {
    beginTransaction: jest.fn().mockResolvedValue(),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    release: jest.fn(),
    query: jest.fn(async (sql) => {
      if (sql.includes('FOR UPDATE')) return [pendiente ? [material] : []];
      if (sql.includes('INSERT INTO validacion_docente')) return [{ insertId: 10 }];
      if (sql.includes('INSERT INTO codigo_validacion')) {
        if (duplicados > 0) { duplicados--; throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }); }
        return [{}];
      }
      if (falla && sql.includes(falla)) throw new Error('fallo simulado');
      return [{}];
    }),
  };
}

function crearRepo(conexion) {
  return crearRepoValidaciones({ getConnection: jest.fn().mockResolvedValue(conexion) });
}

const llamadaCon = (conexion, texto) => conexion.query.mock.calls.find(([sql]) => sql.includes(texto));
const datos = { idMaterial: 7, idDocente: 2, comentario: '' };

describe('registrarDecision', () => {
  test('al aprobar emite el código, valida el material, notifica al autor y confirma la transacción', async () => {
    const conexion = crearConexion();
    const generarCodigo = jest.fn().mockReturnValue('ITSX-AAAA-BBBB-03');
    const r = await crearRepo(conexion).registrarDecision({ ...datos, decision: 'aprobado', generarCodigo });

    expect(r).toEqual({ codigo: 'ITSX-AAAA-BBBB-03', titulo: 'Apuntes de cálculo' });
    expect(generarCodigo).toHaveBeenCalledWith(3); // usa el número de versión vigente
    expect(llamadaCon(conexion, 'INSERT INTO codigo_validacion')[1]).toEqual([10, 7, 'ITSX-AAAA-BBBB-03']);
    expect(llamadaCon(conexion, 'UPDATE material')[1][0]).toBe('validado');
    const notificacion = llamadaCon(conexion, 'INSERT INTO notificacion')[1];
    expect(notificacion[0]).toBe(5); // el autor del material
    expect(notificacion[2]).toBe('material_validado');
    expect(conexion.commit).toHaveBeenCalledTimes(1);
    expect(conexion.rollback).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test('al rechazar no emite código y guarda el comentario del docente', async () => {
    const conexion = crearConexion();
    const generarCodigo = jest.fn();
    const r = await crearRepo(conexion).registrarDecision({
      ...datos, decision: 'rechazado', comentario: 'Falta bibliografía', generarCodigo,
    });

    expect(r.codigo).toBeNull();
    expect(generarCodigo).not.toHaveBeenCalled();
    expect(llamadaCon(conexion, 'INSERT INTO codigo_validacion')).toBeUndefined();
    expect(llamadaCon(conexion, 'INSERT INTO validacion_docente')[1]).toEqual([7, 2, 'rechazado', 'Falta bibliografía']);
    expect(llamadaCon(conexion, 'UPDATE material')[1][0]).toBe('rechazado');
    expect(llamadaCon(conexion, 'INSERT INTO notificacion')[1][2]).toBe('material_rechazado');
    expect(conexion.commit).toHaveBeenCalledTimes(1);
  });

  test('si el material ya no está pendiente o el docente no lo imparte devuelve null y no cambia nada', async () => {
    const conexion = crearConexion({ pendiente: false });
    const r = await crearRepo(conexion).registrarDecision({ ...datos, decision: 'aprobado', generarCodigo: jest.fn() });

    expect(r).toBeNull();
    expect(llamadaCon(conexion, 'INSERT INTO validacion_docente')).toBeUndefined();
    expect(llamadaCon(conexion, 'UPDATE material')).toBeUndefined();
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test('si falla un paso revierte la transacción, libera la conexión y propaga el error', async () => {
    const conexion = crearConexion({ falla: 'UPDATE material' });
    await expect(
      crearRepo(conexion).registrarDecision({ ...datos, decision: 'aprobado', generarCodigo: () => 'ITSX-AAAA-AAAA-01' })
    ).rejects.toThrow('fallo simulado');

    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
    expect(conexion.release).toHaveBeenCalledTimes(1);
  });

  test('si el código generado ya existe genera otro', async () => {
    const conexion = crearConexion({ codigoRepetido: 1 });
    const generarCodigo = jest.fn().mockReturnValueOnce('ITSX-REPE-TIDO-03').mockReturnValueOnce('ITSX-NUEV-OOOK-03');
    const r = await crearRepo(conexion).registrarDecision({ ...datos, decision: 'aprobado', generarCodigo });

    expect(generarCodigo).toHaveBeenCalledTimes(2);
    expect(r.codigo).toBe('ITSX-NUEV-OOOK-03');
    expect(conexion.commit).toHaveBeenCalledTimes(1);
  });

  test('si el código se repite 5 veces seguidas falla y revierte todo', async () => {
    const conexion = crearConexion({ codigoRepetido: 5 });
    await expect(
      crearRepo(conexion).registrarDecision({ ...datos, decision: 'aprobado', generarCodigo: () => 'ITSX-AAAA-AAAA-03' })
    ).rejects.toThrow('No se pudo generar un código de validación único.');
    expect(conexion.rollback).toHaveBeenCalledTimes(1);
    expect(conexion.commit).not.toHaveBeenCalled();
  });
});

describe('consultas de pendientes', () => {
  test('listarPendientes filtra por las materias del docente', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[{ id_material: 1 }, { id_material: 8 }]]) };
    const filas = await crearRepoValidaciones(pool).listarPendientes(2);
    expect(filas).toHaveLength(2);
    expect(pool.query.mock.calls[0][1]).toEqual([2]);
    expect(pool.query.mock.calls[0][0]).toContain("m.estado = 'pendiente_validacion'");
  });

  test('obtenerPendiente devuelve null si no hay resultado', async () => {
    const pool = { query: jest.fn().mockResolvedValue([[]]) };
    expect(await crearRepoValidaciones(pool).obtenerPendiente(99, 2)).toBeNull();
  });
});
