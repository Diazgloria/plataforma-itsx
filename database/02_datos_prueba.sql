-- =====================================================================
-- Datos de prueba para comprobar el esquema.
-- Contraseña de todos los usuarios de prueba: Prueba123* 
-- =====================================================================
USE BD_plataforma_itsx;
select *from docente_materia;
INSERT INTO usuario (id_usuario, nombre, apellidos, correo_institucional, contrasena_hash, rol, estado_cuenta, numero_control, semestre, departamento) VALUES
(1, 'Admin',      'Demo',   'admin@itsx.example',       '$2b$10$SBvqWOvBXSalxPvUlWxz0eHg.HfO//DWo4XrzsjKjvV47yQL3M.02', 'administrador', 'activa', NULL,        NULL, NULL),
(2, 'Docente',    'Uno',    'docente1@itsx.example',    '$2b$10$SBvqWOvBXSalxPvUlWxz0eHg.HfO//DWo4XrzsjKjvV47yQL3M.02', 'docente',       'activa', NULL,        NULL, 'Programacion'),
(3, 'Docente',    'Dos',    'docente2@itsx.example',    '$2b$10$SBvqWOvBXSalxPvUlWxz0eHg.HfO//DWo4XrzsjKjvV47yQL3M.02', 'docente',       'activa', NULL,        NULL, 'Calculo'),
(4, 'Estudiante', 'Uno',    'estudiante1@itsx.example', '$2b$10$SBvqWOvBXSalxPvUlWxz0eHg.HfO//DWo4XrzsjKjvV47yQL3M.02', 'estudiante',    'activa', 'TEST00001', 1,    NULL),
(5, 'Estudiante', 'Dos',    'estudiante2@itsx.example', '$2b$10$SBvqWOvBXSalxPvUlWxz0eHg.HfO//DWo4XrzsjKjvV47yQL3M.02', 'estudiante',    'activa', 'TEST00002', 2,    NULL);

INSERT INTO materia (id_materia, clave, nombre, semestre, descripcion) VALUES
(1, '	ACF0902', 'Cálculo Integral',          2, 'Materia de tronco común '),
(2, 'ACF0903', 'Álgebra Lineal',               1, 'Materia de tronco común'),
(3, 'ACF0905', 'Ecuaciones Diferenciales',   3, 'Materia de tronco común');

INSERT INTO docente_materia (id_docente, id_materia) VALUES
(2, 1), (2, 2), (3, 2), (3, 3);

INSERT INTO material (id_material, id_autor, id_materia, titulo, descripcion, palabras_clave, estado, declaracion_originalidad) VALUES
(1, 4, 1, 'Apuntes Unidad 1 - Cálculo', 'Límites y continuidad', 'límites, continuidad', 'pendiente_validacion', TRUE),
(2, 5, 2, 'Resumen de matrices',        'Operaciones con matrices', 'matrices',          'validado',             TRUE),
(3, 4, 3, 'Ejercicios de probabilidad', 'Ejercicios resueltos',     'probabilidad',      'rechazado',            TRUE);

INSERT INTO version_material (id_material, numero, nombre_archivo, formato, tamano_bytes, huella_sha256, vigente) VALUES
(1, 1, 'apuntes_unidad1.pdf',  'PDF',  482304,  REPEAT('a', 64), TRUE),
(2, 1, 'resumen_matrices.pdf', 'PDF',  1048576, REPEAT('b', 64), FALSE),
(2, 2, 'resumen_matrices_v2.pdf', 'PDF', 1100000, REPEAT('c', 64), TRUE),
(3, 1, 'ejercicios_prob.docx', 'DOCX', 90112,   REPEAT('d', 64), TRUE);

INSERT INTO validacion_docente (id_validacion, id_material, id_docente, decision, comentario) VALUES
(1, 2, 2, 'aprobado',  NULL),
(2, 3, 3, 'rechazado', 'El archivo está incompleto.');

INSERT INTO codigo_validacion (id_codigo, id_validacion, id_material, codigo, fecha_emision) VALUES
(1, 1, 2, 'ITSX-AB12-CD34-01', '2026-11-15');

INSERT INTO notificacion (id_usuario, id_material, tipo, mensaje) VALUES
(2, 1, 'material_pendiente',  'Hay un material nuevo pendiente de validación.'),
(5, 2, 'material_validado',   'Tu material fue validado.'),
(4, 3, 'material_rechazado',  'Tu material fue rechazado. Revisa el comentario del docente.');
