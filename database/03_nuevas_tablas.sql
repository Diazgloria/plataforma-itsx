-- =====================================================================
-- Ampliación del modelo de datos (Hito 3).
-- Agrega las tablas de tipos de material, favoritos, descargas,
-- parámetros del sistema y bitácora.
-- Ejecutar UNA sola vez, después de 01_schema.sql y 02_datos_prueba.sql.
-- =====================================================================
USE BD_plataforma_itsx;

-- 9. tipo_material: clasificación de los materiales (apuntes, resumen, etc.)
CREATE TABLE tipo_material (
  id_tipo INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre  VARCHAR(60)  NOT NULL,
  activo  BOOLEAN      NOT NULL DEFAULT TRUE,
  CONSTRAINT pk_tipo_material PRIMARY KEY (id_tipo),
  CONSTRAINT uq_tipo_material_nombre UNIQUE (nombre)
) ENGINE=InnoDB;

-- El tipo es opcional para no afectar a los materiales que ya existen
ALTER TABLE material
  ADD COLUMN id_tipo INT UNSIGNED NULL AFTER id_materia,
  ADD CONSTRAINT fk_material_tipo FOREIGN KEY (id_tipo) REFERENCES tipo_material (id_tipo)
    ON UPDATE RESTRICT ON DELETE RESTRICT;

-- 10. favorito: materiales que el estudiante marcó para consultarlos después
CREATE TABLE favorito (
  id_usuario  INT UNSIGNED NOT NULL,
  id_material INT UNSIGNED NOT NULL,
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_favorito PRIMARY KEY (id_usuario, id_material),
  CONSTRAINT fk_favorito_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE CASCADE,
  CONSTRAINT fk_favorito_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE=InnoDB;

-- 11. descarga: registro de cada descarga de un material validado
CREATE TABLE descarga (
  id_descarga INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_material INT UNSIGNED NOT NULL,
  id_usuario  INT UNSIGNED NOT NULL,
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_descarga PRIMARY KEY (id_descarga),
  CONSTRAINT fk_descarga_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_descarga_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  INDEX ix_descarga_material (id_material)
) ENGINE=InnoDB;

-- 12. parametro_sistema: valores configurables por el administrador
CREATE TABLE parametro_sistema (
  clave       VARCHAR(60)  NOT NULL,
  valor       VARCHAR(200) NOT NULL,
  descripcion VARCHAR(200) NULL,
  CONSTRAINT pk_parametro_sistema PRIMARY KEY (clave)
) ENGINE=InnoDB;

-- 13. bitacora: registro de las acciones importantes (auditoría)
CREATE TABLE bitacora (
  id_bitacora INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario  INT UNSIGNED NULL,
  accion      VARCHAR(60)  NOT NULL,
  detalle     VARCHAR(300) NULL,
  fecha       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_bitacora PRIMARY KEY (id_bitacora),
  CONSTRAINT fk_bitacora_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE SET NULL,
  INDEX ix_bitacora_fecha (fecha)
) ENGINE=InnoDB;

-- Datos iniciales
INSERT INTO tipo_material (nombre) VALUES
  ('Apuntes'), ('Resumen'), ('Ejercicios resueltos'), ('Presentación'), ('Guía de estudio'), ('Formulario');

INSERT INTO parametro_sistema (clave, valor, descripcion) VALUES
  ('tamano_maximo_mb',       '20', 'Tamaño máximo de un archivo, en MB'),
  ('intentos_login',         '5',  'Intentos fallidos de inicio de sesión antes del bloqueo'),
  ('bloqueo_minutos',        '15', 'Minutos que dura el bloqueo por intentos fallidos'),
  ('sesion_inactividad_min', '30', 'Minutos de inactividad antes de cerrar la sesión');
