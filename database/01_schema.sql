-- Plataforma ITSX 
-- Script de creación de la base de datos 
-- Motor: MySQL 8.4 LTS (InnoDB) 

CREATE DATABASE BD_plataforma_itsx
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE BD_plataforma_itsx;

-- ---------------------------------------------------------------------
-- 1. usuario: estudiantes, docentes y administradores 
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
  id_usuario           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre               VARCHAR(80)  NOT NULL,
  apellidos            VARCHAR(100) NOT NULL,
  correo_institucional VARCHAR(120) NOT NULL,
  contrasena_hash      VARCHAR(255) NOT NULL,
  rol                  ENUM('estudiante','docente','administrador') NOT NULL,
  estado_cuenta        ENUM('pendiente_verificacion','activa','suspendida')
                       NOT NULL DEFAULT 'pendiente_verificacion',
  fecha_registro       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  numero_control       VARCHAR(20)  NULL,
  semestre             TINYINT UNSIGNED NULL,
  departamento         VARCHAR(80)  NULL,
  CONSTRAINT pk_usuario PRIMARY KEY (id_usuario),
  CONSTRAINT uq_usuario_correo UNIQUE (correo_institucional),            -- RD-01
  CONSTRAINT uq_usuario_numero_control UNIQUE (numero_control),          -- RD-01
  CONSTRAINT ck_usuario_datos_por_rol CHECK (                            -- RD-10
        (rol = 'estudiante' AND numero_control IS NOT NULL
                            AND semestre IS NOT NULL AND semestre > 0)
     OR (rol = 'docente'    AND departamento IS NOT NULL)
     OR (rol = 'administrador')
  )
) ENGINE=InnoDB;

-- 2. materia: catálogo de materias de tronco común
CREATE TABLE materia (
  id_materia  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave       VARCHAR(15)  NOT NULL,
  nombre      VARCHAR(120) NOT NULL,
  semestre    TINYINT UNSIGNED NOT NULL,
  descripcion VARCHAR(300) NULL,
  activa      BOOLEAN      NOT NULL DEFAULT TRUE,                        
  CONSTRAINT pk_materia PRIMARY KEY (id_materia),
  CONSTRAINT uq_materia_clave UNIQUE (clave),                           
  CONSTRAINT ck_materia_semestre CHECK (semestre BETWEEN 1 AND 8)
) ENGINE=InnoDB;

-- 3. docente_materia: materias que puede validar cada docente (N:M)
CREATE TABLE docente_materia (
  id_docente INT UNSIGNED NOT NULL,
  id_materia INT UNSIGNED NOT NULL,
  CONSTRAINT pk_docente_materia PRIMARY KEY (id_docente, id_materia),
  CONSTRAINT fk_dm_docente FOREIGN KEY (id_docente) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_dm_materia FOREIGN KEY (id_materia) REFERENCES materia (id_materia)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. material: material académico y su estado en el proceso de validación
CREATE TABLE material (
  id_material              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_autor                 INT UNSIGNED NOT NULL,
  id_materia               INT UNSIGNED NOT NULL,
  titulo                   VARCHAR(150) NOT NULL,
  descripcion              VARCHAR(500) NULL,
  palabras_clave           VARCHAR(200) NULL,
  fecha_carga              DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  estado                   ENUM('pendiente_validacion','validado','rechazado',
                                'suspendido','retirado','eliminado')
                           NOT NULL DEFAULT 'pendiente_validacion',      -- RD-08, RD-11
  declaracion_originalidad BOOLEAN      NOT NULL,
  CONSTRAINT pk_material PRIMARY KEY (id_material),
  CONSTRAINT fk_material_autor FOREIGN KEY (id_autor) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_material_materia FOREIGN KEY (id_materia) REFERENCES materia (id_materia)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT ck_material_declaracion CHECK (declaracion_originalidad = TRUE),
  INDEX ix_material_estado_materia (estado, id_materia)
) ENGINE=InnoDB;

-- 5. version_material: archivo de cada versión del material
CREATE TABLE version_material (
  id_material    INT UNSIGNED NOT NULL,
  numero         INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(200) NOT NULL,
  formato        ENUM('PDF','DOCX','PPTX','XLSX','JPG','PNG') NOT NULL,
  tamano_bytes   BIGINT UNSIGNED NOT NULL,
  huella_sha256  CHAR(64)     NOT NULL,
  fecha_carga    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vigente        BOOLEAN      NOT NULL DEFAULT TRUE,
  -- Columna calculada: vale id_material solo en la versión vigente (NULL en las demás).
  -- Con el índice único siguiente, un material solo puede tener UNA versión vigente (RD-05).
  vigente_unica  INT UNSIGNED GENERATED ALWAYS AS (IF(vigente, id_material, NULL)) STORED,
  CONSTRAINT pk_version_material PRIMARY KEY (id_material, numero),
  CONSTRAINT fk_version_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT uq_version_una_vigente UNIQUE (vigente_unica),              -- RD-05
  CONSTRAINT ck_version_tamano CHECK (tamano_bytes > 0 AND tamano_bytes <= 20971520), -- 20 MB
  INDEX ix_version_huella (huella_sha256)                                -- RD-06 (búsqueda de duplicados)
) ENGINE=InnoDB;

-- 6. validacion_docente: decisión de un docente sobre un material
CREATE TABLE validacion_docente (
  id_validacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_material   INT UNSIGNED NOT NULL,
  id_docente    INT UNSIGNED NOT NULL,
  fecha         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decision      ENUM('aprobado','rechazado') NOT NULL,
  comentario    VARCHAR(500) NULL,
  CONSTRAINT pk_validacion_docente PRIMARY KEY (id_validacion),
  CONSTRAINT fk_validacion_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_validacion_docente FOREIGN KEY (id_docente) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT ck_validacion_comentario CHECK (                            -- RD-07
        decision = 'aprobado' OR (comentario IS NOT NULL AND comentario <> ''))
) ENGINE=InnoDB;

-- 7. codigo_validacion: código emitido al aprobar un material
CREATE TABLE codigo_validacion (
  id_codigo     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_validacion INT UNSIGNED NOT NULL,
  id_material   INT UNSIGNED NOT NULL,
  codigo        CHAR(17)     NOT NULL,                                   -- ITSX-XXXX-XXXX-NN
  fecha_emision DATE         NOT NULL,
  CONSTRAINT pk_codigo_validacion PRIMARY KEY (id_codigo),
  CONSTRAINT uq_codigo_validacion UNIQUE (id_validacion),
  CONSTRAINT uq_codigo_material UNIQUE (id_material),                    -- RD-04: un código por material
  CONSTRAINT uq_codigo_codigo UNIQUE (codigo),                           -- RD-04: código único
  CONSTRAINT fk_codigo_validacion FOREIGN KEY (id_validacion) REFERENCES validacion_docente (id_validacion)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_codigo_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 8. notificacion: avisos para los usuarios
CREATE TABLE notificacion (
  id_notificacion INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario      INT UNSIGNED NOT NULL,
  id_material     INT UNSIGNED NULL,
  tipo            VARCHAR(40)  NOT NULL,
  mensaje         VARCHAR(300) NOT NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  leida           BOOLEAN      NOT NULL DEFAULT FALSE,
  CONSTRAINT pk_notificacion PRIMARY KEY (id_notificacion),
  CONSTRAINT fk_notif_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_notif_material FOREIGN KEY (id_material) REFERENCES material (id_material)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE=InnoDB;
