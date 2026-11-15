-- =====================================================================
USE BD_plataforma_itsx;

-- ---------------------------------------------------------------------
-- A. Verificación de la estructura (estas consultas deben dar resultado)
-- ---------------------------------------------------------------------
-- A1. Las 8 tablas existen y usan InnoDB
SELECT TABLE_NAME, ENGINE
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'plataforma_itsx' ORDER BY TABLE_NAME;

-- A2. Llaves primarias de cada tabla
SELECT TABLE_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS llave_primaria
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'plataforma_itsx' AND CONSTRAINT_NAME = 'PRIMARY'
GROUP BY TABLE_NAME ORDER BY TABLE_NAME;

-- A3. Llaves foráneas: tabla, columna, tabla y columna referenciadas
SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'plataforma_itsx' AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- A4. Acciones referenciales (deben ser RESTRICT)
SELECT CONSTRAINT_NAME, UPDATE_RULE, DELETE_RULE
FROM information_schema.REFERENTIAL_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = 'plataforma_itsx' ORDER BY CONSTRAINT_NAME;

-- A5. Restricciones CHECK y UNIQUE
SELECT TABLE_NAME, CONSTRAINT_NAME, CONSTRAINT_TYPE
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = 'plataforma_itsx' AND CONSTRAINT_TYPE IN ('CHECK','UNIQUE')
ORDER BY TABLE_NAME, CONSTRAINT_TYPE;

-- A6. Los datos de prueba se relacionan correctamente (JOIN de 5 tablas)
SELECT m.id_material, m.titulo, ma.nombre AS materia,
       CONCAT(u.nombre, ' ', u.apellidos) AS autor,
       m.estado, v.numero AS version_vigente, c.codigo
FROM material m
JOIN materia ma        ON ma.id_materia = m.id_materia
JOIN usuario u         ON u.id_usuario = m.id_autor
JOIN version_material v ON v.id_material = m.id_material AND v.vigente = TRUE
LEFT JOIN codigo_validacion c ON c.id_material = m.id_material
ORDER BY m.id_material;

-- ---------------------------------------------------------------------
-- B. Pruebas que deben FALLAR
-- P1. Llave foránea: material con autor inexistente.
--     Esperado: ERROR 1452 (fk_material_autor)
INSERT INTO material (id_autor, id_materia, titulo, declaracion_originalidad)
VALUES (999, 1, 'Material con autor inexistente', TRUE);

-- P2. Llave foránea: material con materia inexistente.
--     Esperado: ERROR 1452 (fk_material_materia)
INSERT INTO material (id_autor, id_materia, titulo, declaracion_originalidad)
VALUES (4, 999, 'Material con materia inexistente', TRUE);

-- P3. Integridad referencial al borrar: usuario que ya tiene materiales.
--     Esperado: ERROR 1451 (RESTRICT)
DELETE FROM usuario WHERE id_usuario = 4;

-- P4. Integridad referencial al borrar: material que ya tiene versiones.
--     Esperado: ERROR 1451 (RESTRICT)
DELETE FROM material WHERE id_material = 1;

-- P5. Llave primaria: versión repetida del mismo material.
--     Esperado: ERROR 1062 (PRIMARY)
INSERT INTO version_material (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente)
VALUES (1, 1, 'otra.pdf', 'PDF', 1000, REPEAT('e', 64), FALSE);

-- P6. Unicidad (RD-01): correo institucional repetido.
--     Esperado: ERROR 1062 (uq_usuario_correo)
INSERT INTO usuario (nombre, apellidos, correo_institucional, contrasena_hash, rol, numero_control, semestre)
VALUES ('Repetido', 'Prueba', 'estudiante1@itsx.example', 'x', 'estudiante', 'TEST00099', 1);

-- P7. Regla RD-05: segunda versión vigente para el mismo material.
--     Esperado: ERROR 1062 (uq_version_una_vigente)
INSERT INTO version_material (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente)
VALUES (2, 3, 'otra_vigente.pdf', 'PDF', 1000, REPEAT('f', 64), TRUE);

-- P8. Regla RD-04: segundo código para un material que ya tiene uno.
--     Esperado: ERROR 1062 (uq_codigo_material)
INSERT INTO validacion_docente (id_validacion, id_material, id_docente, decision) VALUES (3, 2, 3, 'aprobado');
INSERT INTO codigo_validacion (id_validacion, id_material, codigo, fecha_emision)
VALUES (3, 2, 'ITSX-ZZ99-YY88-02', '2026-11-15');

-- P9. Regla RD-07: rechazo sin comentario.
--     Esperado: ERROR 3819 (ck_validacion_comentario)
INSERT INTO validacion_docente (id_material, id_docente, decision, comentario)
VALUES (1, 2, 'rechazado', NULL);

-- P10. Tamaño máximo de 20 MB.
--      Esperado: ERROR 3819 (ck_version_tamano)
INSERT INTO version_material (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente)
VALUES (3, 2, 'enorme.pdf', 'PDF', 20971521, REPEAT('9', 64), FALSE);

-- P11. Regla RD-10: estudiante sin número de control.
--      Esperado: ERROR 3819 (ck_usuario_datos_por_rol)
INSERT INTO usuario (nombre, apellidos, correo_institucional, contrasena_hash, rol, semestre)
VALUES ('Sin', 'Control', 'sincontrol@itsx.example', 'x', 'estudiante', 1);

-- P12. Semestre fuera de rango (1 a 8) y declaración de originalidad en falso.
--      Esperado: ERROR 3819 en ambas sentencias (ejecútalas por separado)
INSERT INTO materia (clave, nombre, semestre) VALUES ('TC-009', 'Materia inválida', 9);
INSERT INTO material (id_autor, id_materia, titulo, declaracion_originalidad)
VALUES (4, 1, 'Sin declaración', FALSE);

-- ---------------------------------------------------------------------
-- C. Pruebas que deben FUNCIONAR (casos válidos)
-- ---------------------------------------------------------------------
-- C1. Varias versiones NO vigentes del mismo material sí se permiten.
INSERT INTO version_material (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente)
VALUES (3, 2, 'ejercicios_v2.docx', 'DOCX', 95000, REPEAT('8', 64), FALSE);

-- C2. Un docente puede aprobar y se registra el código en una transacción.
START TRANSACTION;
INSERT INTO validacion_docente (id_validacion, id_material, id_docente, decision) VALUES (10, 1, 2, 'aprobado');
INSERT INTO codigo_validacion (id_validacion, id_material, codigo, fecha_emision)
VALUES (10, 1, 'ITSX-MN56-OP78-03', '2026-11-15');
UPDATE material SET estado = 'validado' WHERE id_material = 1;
COMMIT;

-- C3. Resultado final: el material 1 quedó validado con su código.
SELECT m.id_material, m.estado, c.codigo
FROM material m JOIN codigo_validacion c ON c.id_material = m.id_material
WHERE m.id_material = 1;
