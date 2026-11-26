-- =====================================================================
-- Contraseña de las cuentas de demostración: Prueba.123
-- Úsalo después de 02_datos_prueba.sql para que las 5 cuentas de prueba
-- (admin, 2 docentes y 2 estudiantes) entren con la misma contraseña.
-- El hash es de bcrypt (nunca se guarda la contraseña en texto claro).
-- =====================================================================
USE BD_plataforma_itsx;

UPDATE usuario
SET contrasena_hash = '$2b$10$wZzlN/FaynrgeXdTV6skfOYoM2U2eyP.o8c4x2PWOLYZTJeGQdABa'
WHERE id_usuario BETWEEN 1 AND 5;

SELECT id_usuario, correo_institucional, rol, estado_cuenta FROM usuario WHERE id_usuario BETWEEN 1 AND 5;
