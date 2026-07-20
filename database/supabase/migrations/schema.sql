-- ==========================================
-- SCHEMA: Sistema CIP Estudiantil
-- Proyecto universitario - Base de datos Supabase (PostgreSQL)
-- ==========================================

-- ==========================================
-- EXTENSIONES
-- pgcrypto: para hashear contraseñas (crypt/gen_salt)
-- pg_cron: para ejecutar el procedimiento de notificaciones a diario
--          (en Supabase se habilita desde Database > Extensions)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ==========================================
-- TABLA: roles
-- ==========================================
CREATE TABLE roles (
    id_rol SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLA: sedes
-- ==========================================
CREATE TABLE sedes (
    id_sede SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLA: estados
-- ==========================================
CREATE TABLE estados (
    id_estado SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE,
    color VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLA: usuarios
-- ==========================================
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    id_rol INTEGER NOT NULL REFERENCES roles(id_rol),
    id_sede INTEGER REFERENCES sedes(id_sede),
    id_estado INTEGER REFERENCES estados(id_estado),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLA: solicitudes
-- ==========================================
CREATE TABLE solicitudes (
    id_solicitud SERIAL PRIMARY KEY,
    id_usuario_cajero INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_usuario_colegiado INTEGER REFERENCES usuarios(id_usuario),
    id_sede INTEGER NOT NULL REFERENCES sedes(id_sede),

    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    especialidad VARCHAR(100) NOT NULL,
    dni VARCHAR(15) NOT NULL UNIQUE,
    numero_registro VARCHAR(20) UNIQUE,
    foto_url TEXT,
    telefono VARCHAR(20),
    correo VARCHAR(150),

    estado_solicitud VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_solicitud IN ('pendiente', 'aprobada', 'rechazada')),

    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_aprobacion TIMESTAMPTZ
);

-- ==========================================
-- TABLA: pagos
-- ==========================================
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_usuario_colegiado INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_usuario_cajero INTEGER NOT NULL REFERENCES usuarios(id_usuario),

    tipo_pago VARCHAR(50) NOT NULL
        CHECK (tipo_pago IN ('inscripcion', 'mensualidad', 'otro')),

    monto_base NUMERIC(10,2) NOT NULL,
    porcentaje_recargo NUMERIC(5,2) NOT NULL DEFAULT 0,
    monto_total NUMERIC(10,2), -- se calcula automáticamente con trigger, no lo llenes a mano

    fecha_vencimiento DATE NOT NULL,
    fecha_pago TIMESTAMPTZ,

    estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_pago IN ('pendiente', 'pagado', 'atrasado')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- TABLA: notificaciones
-- ==========================================
CREATE TABLE notificaciones (
    id_notificacion SERIAL PRIMARY KEY,
    id_usuario_colegiado INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_pago INTEGER NOT NULL REFERENCES pagos(id_pago),

    tipo_notificacion VARCHAR(30) NOT NULL
        CHECK (tipo_notificacion IN (
            'recordatorio_5_dias',
            'recordatorio_3_dias',
            'recordatorio_1_dia',
            'vencimiento',
            'vencido_diario'
        )),

    canal VARCHAR(20) NOT NULL
        CHECK (canal IN ('correo', 'sms', 'whatsapp')),

    destinatario VARCHAR(150) NOT NULL,
    incluye_aviso_deuda BOOLEAN NOT NULL DEFAULT false,
    mensaje TEXT NOT NULL,

    fecha_programada TIMESTAMPTZ NOT NULL,
    fecha_enviada TIMESTAMPTZ,

    estado_envio VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_envio IN ('pendiente', 'enviado', 'fallido')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- ÍNDICES
-- ==========================================
CREATE INDEX idx_usuarios_id_rol ON usuarios(id_rol);
CREATE INDEX idx_usuarios_id_sede ON usuarios(id_sede);
CREATE INDEX idx_usuarios_id_estado ON usuarios(id_estado);

CREATE INDEX idx_solicitudes_id_sede ON solicitudes(id_sede);
CREATE INDEX idx_solicitudes_id_usuario_cajero ON solicitudes(id_usuario_cajero);
CREATE INDEX idx_solicitudes_estado_solicitud ON solicitudes(estado_solicitud);

CREATE INDEX idx_pagos_id_usuario_colegiado ON pagos(id_usuario_colegiado);
CREATE INDEX idx_pagos_id_usuario_cajero ON pagos(id_usuario_cajero);
CREATE INDEX idx_pagos_estado_pago ON pagos(estado_pago);
CREATE INDEX idx_pagos_fecha_vencimiento ON pagos(fecha_vencimiento);

CREATE INDEX idx_notificaciones_id_usuario_colegiado ON notificaciones(id_usuario_colegiado);
CREATE INDEX idx_notificaciones_id_pago ON notificaciones(id_pago);
CREATE INDEX idx_notificaciones_estado_envio ON notificaciones(estado_envio);
CREATE INDEX idx_notificaciones_fecha_programada ON notificaciones(fecha_programada);


-- ==========================================================
-- FUNCIONES Y TRIGGERS
-- ==========================================================

-- ----------------------------------------------------------
-- 1) Mantener updated_at al día en "usuarios"
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_set_updated_at();


-- ----------------------------------------------------------
-- 2) Calcular monto_total automáticamente en "pagos"
--    monto_total = monto_base + (monto_base * porcentaje_recargo / 100)
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_calcular_monto_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.monto_total := NEW.monto_base + (NEW.monto_base * NEW.porcentaje_recargo / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pagos_calcular_monto
BEFORE INSERT OR UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION fn_calcular_monto_total();


-- ----------------------------------------------------------
-- 3) Al aprobar una solicitud (estado_solicitud -> 'aprobada'):
--    - Asigna numero_registro correlativo POR SEDE
--    - Crea la cuenta de usuario del colegiado (username = dni)
--    - Contraseña inicial = su propio DNI, hasheada (debe cambiarla luego)
--    - Enlaza id_usuario_colegiado en la solicitud
--    - Marca fecha_aprobacion
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_aprobar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_id_rol_colegiado INTEGER;
    v_id_estado_habilitado INTEGER;
    v_id_usuario_nuevo INTEGER;
    v_correlativo INTEGER;
BEGIN
    -- Solo actuar cuando el estado CAMBIA a 'aprobada'
    IF NEW.estado_solicitud = 'aprobada' AND OLD.estado_solicitud IS DISTINCT FROM 'aprobada' THEN

        SELECT id_rol INTO v_id_rol_colegiado FROM roles WHERE nombre = 'colegiado';
        SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

        -- Correlativo dentro de la misma sede
        SELECT COALESCE(COUNT(*), 0) + 1 INTO v_correlativo
        FROM solicitudes
        WHERE id_sede = NEW.id_sede AND estado_solicitud = 'aprobada';

        NEW.numero_registro := NEW.id_sede || '-' || LPAD(v_correlativo::TEXT, 5, '0');
        NEW.fecha_aprobacion := now();

        -- Crear la cuenta de acceso del colegiado
        INSERT INTO usuarios (username, password_hash, id_rol, id_sede, id_estado)
        VALUES (
            NEW.dni,
            crypt(NEW.dni, gen_salt('bf')),
            v_id_rol_colegiado,
            NEW.id_sede,
            v_id_estado_habilitado
        )
        RETURNING id_usuario INTO v_id_usuario_nuevo;

        NEW.id_usuario_colegiado := v_id_usuario_nuevo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_solicitudes_aprobar
BEFORE UPDATE ON solicitudes
FOR EACH ROW
EXECUTE FUNCTION fn_aprobar_solicitud();


-- ----------------------------------------------------------
-- 4) Al registrar el pago de una colegiatura (estado_pago -> 'pagado'):
--    Si el colegiado ya no tiene otros pagos atrasados, vuelve a "habilitado"
-- ----------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_estado_tras_pago()
RETURNS TRIGGER AS $$
DECLARE
    v_tiene_otros_atrasados BOOLEAN;
    v_id_estado_habilitado INTEGER;
BEGIN
    IF NEW.estado_pago = 'pagado' AND OLD.estado_pago IS DISTINCT FROM 'pagado' THEN

        SELECT EXISTS (
            SELECT 1 FROM pagos
            WHERE id_usuario_colegiado = NEW.id_usuario_colegiado
              AND estado_pago = 'atrasado'
              AND id_pago <> NEW.id_pago
        ) INTO v_tiene_otros_atrasados;

        IF NOT v_tiene_otros_atrasados THEN
            SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

            UPDATE usuarios
            SET id_estado = v_id_estado_habilitado
            WHERE id_usuario = NEW.id_usuario_colegiado;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pagos_actualizar_estado
AFTER UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_estado_tras_pago();


-- ==========================================================
-- PROCEDIMIENTO ALMACENADO: sp_procesar_notificaciones
-- Se ejecuta UNA VEZ AL DÍA (vía pg_cron).
-- Revisa todos los pagos pendientes y:
--   - crea recordatorios a 5, 3 y 1 día antes del vencimiento
--   - crea la notificación de "vencimiento" el mismo día
--   - marca como 'atrasado' los pagos ya vencidos
--   - actualiza el estado del colegiado a 'con_deuda'
--   - crea notificación diaria "vencido_diario" mientras siga atrasado
-- ==========================================================
CREATE OR REPLACE PROCEDURE sp_procesar_notificaciones()
LANGUAGE plpgsql AS $$
DECLARE
    r_pago RECORD;
    v_dias_restantes INTEGER;
    v_tipo VARCHAR(30);
    v_canal VARCHAR(20);
    v_destinatario VARCHAR(150);
    v_mensaje TEXT;
    v_incluye_deuda BOOLEAN;
    v_id_estado_con_deuda INTEGER;
BEGIN
    SELECT id_estado INTO v_id_estado_con_deuda FROM estados WHERE nombre = 'con_deuda';

    FOR r_pago IN
        SELECT p.id_pago, p.id_usuario_colegiado, p.fecha_vencimiento, p.estado_pago,
               s.correo, s.telefono, s.nombre_completo
        FROM pagos p
        JOIN solicitudes s ON s.id_usuario_colegiado = p.id_usuario_colegiado
        WHERE p.estado_pago IN ('pendiente', 'atrasado')
    LOOP
        v_dias_restantes := r_pago.fecha_vencimiento - CURRENT_DATE;

        -- Determinar canal según lo que el colegiado dejó registrado
        IF r_pago.correo IS NOT NULL THEN
            v_canal := 'correo';
            v_destinatario := r_pago.correo;
        ELSE
            v_canal := 'sms';
            v_destinatario := r_pago.telefono;
        END IF;

        v_incluye_deuda := false;
        v_tipo := NULL;

        IF v_dias_restantes = 5 THEN
            v_tipo := 'recordatorio_5_dias';
            v_mensaje := 'Tu colegiatura vence en 5 días (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 3 THEN
            v_tipo := 'recordatorio_3_dias';
            v_mensaje := 'Tu colegiatura vence en 3 días (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 1 THEN
            v_tipo := 'recordatorio_1_dia';
            v_mensaje := 'Tu colegiatura vence mañana (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 0 THEN
            v_tipo := 'vencimiento';
            v_mensaje := 'Tu colegiatura vence hoy. Realiza tu pago para evitar recargos.';

        ELSIF v_dias_restantes < 0 THEN
            v_tipo := 'vencido_diario';
            v_incluye_deuda := true;
            v_mensaje := 'Tu colegiatura está vencida desde el ' || r_pago.fecha_vencimiento ||
                         '. Tienes una deuda pendiente, regulariza tu pago para evitar la inhabilitación de tu carnet.';

            -- Marcar el pago como atrasado y al colegiado como con_deuda
            IF r_pago.estado_pago <> 'atrasado' THEN
                UPDATE pagos SET estado_pago = 'atrasado' WHERE id_pago = r_pago.id_pago;
            END IF;

            UPDATE usuarios
            SET id_estado = v_id_estado_con_deuda
            WHERE id_usuario = r_pago.id_usuario_colegiado;
        END IF;

        -- Solo insertar si corresponde un tipo hoy, y evitar duplicados el mismo día
        IF v_tipo IS NOT NULL AND v_destinatario IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM notificaciones
                WHERE id_pago = r_pago.id_pago
                  AND tipo_notificacion = v_tipo
                  AND DATE(fecha_programada) = CURRENT_DATE
            ) THEN
                INSERT INTO notificaciones (
                    id_usuario_colegiado, id_pago, tipo_notificacion, canal,
                    destinatario, incluye_aviso_deuda, mensaje,
                    fecha_programada, estado_envio
                ) VALUES (
                    r_pago.id_usuario_colegiado, r_pago.id_pago, v_tipo, v_canal,
                    v_destinatario, v_incluye_deuda, v_mensaje,
                    now(), 'pendiente'
                );
            END IF;
        END IF;

    END LOOP;
END;
$$;

-- ----------------------------------------------------------
-- Programar ejecución diaria automática (pg_cron)
-- Corre todos los días a las 08:00 am
-- ----------------------------------------------------------
SELECT cron.schedule(
    'procesar-notificaciones-diarias',
    '0 8 * * *',
    $$CALL sp_procesar_notificaciones()$$
);


-- ==========================================================
-- DATOS INICIALES (seed básico)
-- ==========================================================
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin', 'Administrador del sistema, aprueba solicitudes por sede'),
    ('colegiado', 'Ingeniero colegiado, ve su carnet y pago de inscripción'),
    ('cajero', 'Registra pagos y registra nuevos colegiados mediante solicitudes');

INSERT INTO estados (nombre, color) VALUES
    ('habilitado', 'green'),
    ('inhabilitado', 'red'),
    ('con_deuda', 'yellow');


-- ==========================================================
-- FUNCIONES AGREGADAS DESPUES DEL ESQUEMA PRINCIPAL
-- ==========================================================
CREATE OR REPLACE FUNCTION verificar_password(p_password TEXT, p_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN crypt(p_password, p_hash) = p_hash;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE solicitudes
ADD CONSTRAINT chk_contacto_requerido
CHECK (telefono IS NOT NULL OR correo IS NOT NULL);

-- ==========================================
-- TABLA: especialidades
-- Catálogo de carreras de ingeniería reconocidas por el CIP
-- ==========================================
CREATE TABLE especialidades (
    id_especialidad SERIAL PRIMARY KEY,
    nombre_especialidad VARCHAR(100) NOT NULL UNIQUE,
    descripcion_especialidad TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed de especialidades comunes
INSERT INTO especialidades (nombre_especialidad, descripcion_especialidad) VALUES
    ('Ing. Civil', 'Diseño, construcción y mantenimiento de infraestructura.'),
    ('Ing. de Sistemas', 'Desarrollo de software y sistemas de información.'),
    ('Ing. Industrial', 'Optimización de procesos productivos y de gestión.'),
    ('Ing. Electrónica', 'Diseño de sistemas electrónicos y de telecomunicaciones.'),
    ('Ing. Mecánica', 'Diseño y mantenimiento de sistemas mecánicos.'),
    ('Ing. Ambiental', 'Gestión y conservación de recursos ambientales.'),
    ('Ing. Química', 'Procesos químicos industriales.'),
    ('Ing. de Minas', 'Explotación y gestión de recursos minerales.');

-- Agregar la relación a especialidades
ALTER TABLE solicitudes
    ADD COLUMN id_especialidad INTEGER REFERENCES especialidades(id_especialidad);

-- Ya no se necesita el texto libre, la especialidad ahora es una FK
ALTER TABLE solicitudes
    DROP COLUMN especialidad;

-- Hacerla obligatoria una vez migrados los datos existentes
ALTER TABLE solicitudes
    ALTER COLUMN id_especialidad SET NOT NULL;

-- Renombramos el campo para que sea claro que es una key de bucket, no una URL externa
ALTER TABLE solicitudes
    RENAME COLUMN foto_url TO foto_key;

-- Metadatos de la foto tipo carnet
ALTER TABLE solicitudes
    ADD COLUMN foto_content_type VARCHAR(50),   -- ej: 'image/jpeg', 'image/png'
    ADD COLUMN foto_size_bytes INTEGER,          -- tamaño real del archivo subido
    ADD COLUMN foto_ancho_px INTEGER,             -- ancho en píxeles (para validar proporción carnet)
    ADD COLUMN foto_alto_px INTEGER;              -- alto en píxeles

-- Restricciones a nivel de base de datos: tamaño máximo (ej. 2 MB) y formatos permitidos
ALTER TABLE solicitudes
    ADD CONSTRAINT chk_foto_size CHECK (foto_size_bytes IS NULL OR foto_size_bytes <= 2097152), -- 2 MB máx
    ADD CONSTRAINT chk_foto_content_type CHECK (foto_content_type IS NULL OR foto_content_type IN ('image/jpeg', 'image/png'));

ALTER TABLE solicitudes
    ADD COLUMN titulo_key VARCHAR(255),          -- ruta del archivo del título en su propio bucket
    ADD COLUMN titulo_content_type VARCHAR(50),   -- ej: 'application/pdf', 'image/jpeg'
    ADD COLUMN titulo_size_bytes INTEGER;

ALTER TABLE solicitudes
    ADD CONSTRAINT chk_titulo_size CHECK (titulo_size_bytes IS NULL OR titulo_size_bytes <= 5242880), -- 5 MB máx
    ADD CONSTRAINT chk_titulo_content_type CHECK (titulo_content_type IS NULL OR titulo_content_type IN ('application/pdf', 'image/jpeg', 'image/png'));

CREATE INDEX idx_solicitudes_id_especialidad ON solicitudes(id_especialidad);

ALTER TABLE pagos
    ADD COLUMN id_solicitud INTEGER REFERENCES solicitudes(id_solicitud),
    ADD COLUMN metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('efectivo', 'yape', 'plin'));

-- Ahora es opcional, porque al momento de pagar la matrícula el colegiado
-- todavía no tiene cuenta de usuario (eso se crea recién cuando el admin aprueba)
ALTER TABLE pagos
    ALTER COLUMN id_usuario_colegiado DROP NOT NULL;

-- Pero siempre debe estar enlazado a algo: o a la solicitud, o al usuario ya aprobado
ALTER TABLE pagos
    ADD CONSTRAINT chk_pago_enlazado CHECK (
        id_usuario_colegiado IS NOT NULL OR id_solicitud IS NOT NULL
    );

CREATE INDEX idx_pagos_id_solicitud ON pagos(id_solicitud);

CREATE OR REPLACE FUNCTION fn_registrar_solicitud_con_pago(
    p_id_usuario_cajero INTEGER,
    p_id_sede INTEGER,
    p_id_especialidad INTEGER,
    p_apellido_paterno VARCHAR,
    p_apellido_materno VARCHAR,
    p_nombre_completo VARCHAR,
    p_dni VARCHAR,
    p_telefono VARCHAR,
    p_correo VARCHAR,
    p_foto_key TEXT,
    p_foto_content_type VARCHAR,
    p_foto_size_bytes INTEGER,
    p_foto_ancho_px INTEGER,
    p_foto_alto_px INTEGER,
    p_titulo_key TEXT,
    p_titulo_content_type VARCHAR,
    p_titulo_size_bytes INTEGER,
    p_metodo_pago VARCHAR,
    p_monto_base NUMERIC,
    p_fecha_pago TIMESTAMPTZ,
    p_fecha_vencimiento DATE
)
RETURNS TABLE(id_solicitud INTEGER, id_pago INTEGER) AS $$
DECLARE
    v_id_solicitud INTEGER;
    v_id_pago INTEGER;
BEGIN
    -- Si algo falla en cualquiera de los dos INSERT, TODO se revierte
    -- (una función de Postgres ya es una transacción implícita)
    INSERT INTO solicitudes (
        id_usuario_cajero, id_sede, id_especialidad,
        apellido_paterno, apellido_materno, nombre_completo, dni,
        telefono, correo,
        foto_key, foto_content_type, foto_size_bytes, foto_ancho_px, foto_alto_px,
        titulo_key, titulo_content_type, titulo_size_bytes,
        estado_solicitud
    ) VALUES (
        p_id_usuario_cajero, p_id_sede, p_id_especialidad,
        p_apellido_paterno, p_apellido_materno, p_nombre_completo, p_dni,
        p_telefono, p_correo,
        p_foto_key, p_foto_content_type, p_foto_size_bytes, p_foto_ancho_px, p_foto_alto_px,
        p_titulo_key, p_titulo_content_type, p_titulo_size_bytes,
        'pendiente'
    )
    RETURNING solicitudes.id_solicitud INTO v_id_solicitud;

    INSERT INTO pagos (
        id_solicitud, id_usuario_cajero, tipo_pago, metodo_pago,
        monto_base, porcentaje_recargo, fecha_vencimiento, fecha_pago, estado_pago
    ) VALUES (
        v_id_solicitud, p_id_usuario_cajero, 'inscripcion', p_metodo_pago,
        p_monto_base, 0, p_fecha_vencimiento, p_fecha_pago, 'pagado'
    )
    RETURNING pagos.id_pago INTO v_id_pago;

    RETURN QUERY SELECT v_id_solicitud, v_id_pago;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE usuarios
    ADD COLUMN codigo_recuperacion VARCHAR(10),
    ADD COLUMN codigo_recuperacion_expira TIMESTAMPTZ,
    ADD COLUMN requiere_cambio_password BOOLEAN NOT NULL DEFAULT true; -- fuerza cambiar la contraseña autogenerada en el primer login

CREATE TABLE credenciales_envio (
    id_envio SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_solicitud INTEGER NOT NULL REFERENCES solicitudes(id_solicitud),

    canal VARCHAR(20) NOT NULL CHECK (canal IN ('correo', 'sms')),
    destinatario VARCHAR(150) NOT NULL,

    -- Guardamos el mensaje ya armado (username + password + código), nunca la contraseña en texto plano en otro lado
    mensaje TEXT NOT NULL,

    estado_envio VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado_envio IN ('pendiente', 'enviado', 'fallido')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_enviado TIMESTAMPTZ
);

CREATE INDEX idx_credenciales_envio_estado ON credenciales_envio(estado_envio);

CREATE OR REPLACE FUNCTION fn_aprobar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_id_rol_colegiado INTEGER;
    v_id_estado_habilitado INTEGER;
    v_id_usuario_nuevo INTEGER;
    v_correlativo INTEGER;
    v_password_generada TEXT;
    v_codigo_recuperacion TEXT;
    v_canal VARCHAR(20);
    v_destinatario VARCHAR(150);
    v_mensaje TEXT;
BEGIN
    IF NEW.estado_solicitud = 'aprobada' AND OLD.estado_solicitud IS DISTINCT FROM 'aprobada' THEN

        SELECT id_rol INTO v_id_rol_colegiado FROM roles WHERE nombre = 'colegiado';
        SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

        SELECT COALESCE(COUNT(*), 0) + 1 INTO v_correlativo
        FROM solicitudes
        WHERE id_sede = NEW.id_sede AND estado_solicitud = 'aprobada';

        NEW.numero_registro := NEW.id_sede || '-' || LPAD(v_correlativo::TEXT, 5, '0');
        NEW.fecha_aprobacion := now();

        -- Generar contraseña aleatoria de 8 caracteres y código de recuperación de 6 dígitos
        v_password_generada := substr(md5(random()::text), 1, 8);
        v_codigo_recuperacion := lpad(floor(random() * 1000000)::text, 6, '0');

        INSERT INTO usuarios (
            username, password_hash, id_rol, id_sede, id_estado,
            codigo_recuperacion, codigo_recuperacion_expira, requiere_cambio_password
        )
        VALUES (
            NEW.dni,
            crypt(v_password_generada, gen_salt('bf')),
            v_id_rol_colegiado,
            NEW.id_sede,
            v_id_estado_habilitado,
            v_codigo_recuperacion,
            now() + interval '7 days',
            true
        )
        RETURNING id_usuario INTO v_id_usuario_nuevo;

        NEW.id_usuario_colegiado := v_id_usuario_nuevo;

        UPDATE pagos
        SET id_usuario_colegiado = v_id_usuario_nuevo
        WHERE id_solicitud = NEW.id_solicitud;

        -- Determinar canal: prioridad al correo, si no hay, usar teléfono
        IF NEW.correo IS NOT NULL THEN
            v_canal := 'correo';
            v_destinatario := NEW.correo;
        ELSE
            v_canal := 'sms';
            v_destinatario := NEW.telefono;
        END IF;

        v_mensaje := 'Bienvenido al CIP, ' || NEW.nombre_completo || '. ' ||
                     'Tu usuario es tu DNI: ' || NEW.dni || '. ' ||
                     'Tu contraseña temporal es: ' || v_password_generada || '. ' ||
                     'Código de recuperación (guárdalo): ' || v_codigo_recuperacion || '. ' ||
                     'Deberás cambiar tu contraseña al ingresar por primera vez.';

        INSERT INTO credenciales_envio (id_usuario, id_solicitud, canal, destinatario, mensaje)
        VALUES (v_id_usuario_nuevo, NEW.id_solicitud, v_canal, v_destinatario, v_mensaje);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cambiar_password_usuario(p_id_usuario INTEGER, p_password_nueva TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE usuarios
    SET password_hash = crypt(p_password_nueva, gen_salt('bf')),
        requiere_cambio_password = false
    WHERE id_usuario = p_id_usuario;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_generar_siguiente_mensualidad()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tipo_pago = 'mensualidad'
       AND NEW.estado_pago = 'pagado'
       AND OLD.estado_pago IS DISTINCT FROM 'pagado' THEN

        INSERT INTO pagos (
            id_usuario_colegiado, id_usuario_cajero, tipo_pago, metodo_pago,
            monto_base, porcentaje_recargo, fecha_vencimiento, estado_pago
        ) VALUES (
            NEW.id_usuario_colegiado,
            NEW.id_usuario_cajero,
            'mensualidad',
            NULL,
            NEW.monto_base, -- mantiene el mismo monto base que la anterior
            0,
            (NEW.fecha_vencimiento + INTERVAL '1 month')::DATE,
            'pendiente'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pagos_siguiente_mensualidad
AFTER UPDATE ON pagos
FOR EACH ROW
EXECUTE FUNCTION fn_generar_siguiente_mensualidad();

CREATE OR REPLACE FUNCTION fn_procesar_notificaciones_wrapper()
RETURNS VOID AS $$
BEGIN
    CALL sp_procesar_notificaciones();
END;
$$ LANGUAGE plpgsql;

ALTER TABLE pagos
    ADD COLUMN culqi_order_id VARCHAR(50);

CREATE INDEX idx_pagos_culqi_order_id ON pagos(culqi_order_id);

CREATE TABLE ordenes_pago_pendientes (
    id_orden_temp SERIAL PRIMARY KEY,
    culqi_order_id VARCHAR(50) NOT NULL UNIQUE,
    datos_solicitud JSONB NOT NULL, -- todos los campos del formulario, guardados tal cual
    monto NUMERIC(10,2) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION fn_aprobar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_id_rol_colegiado INTEGER;
    v_id_estado_habilitado INTEGER;
    v_id_usuario_nuevo INTEGER;
    v_correlativo INTEGER;
    v_password_generada TEXT;
    v_codigo_recuperacion TEXT;
    v_mensaje TEXT;
BEGIN
    IF NEW.estado_solicitud = 'aprobada' AND OLD.estado_solicitud IS DISTINCT FROM 'aprobada' THEN

        SELECT id_rol INTO v_id_rol_colegiado FROM roles WHERE nombre = 'colegiado';
        SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

        SELECT COALESCE(COUNT(*), 0) + 1 INTO v_correlativo
        FROM solicitudes
        WHERE id_sede = NEW.id_sede AND estado_solicitud = 'aprobada';

        NEW.numero_registro := NEW.id_sede || '-' || LPAD(v_correlativo::TEXT, 5, '0');
        NEW.fecha_aprobacion := now();

        -- Generar contraseña aleatoria de 8 caracteres y código de recuperación de 6 dígitos
        v_password_generada := substr(md5(random()::text), 1, 8);
        v_codigo_recuperacion := lpad(floor(random() * 1000000)::text, 6, '0');

        INSERT INTO usuarios (
            username, password_hash, id_rol, id_sede, id_estado,
            codigo_recuperacion, codigo_recuperacion_expira, requiere_cambio_password
        )
        VALUES (
            NEW.dni,
            crypt(v_password_generada, gen_salt('bf')),
            v_id_rol_colegiado,
            NEW.id_sede,
            v_id_estado_habilitado,
            v_codigo_recuperacion,
            now() + interval '7 days',
            true
        )
        RETURNING id_usuario INTO v_id_usuario_nuevo;

        NEW.id_usuario_colegiado := v_id_usuario_nuevo;

        -- Enlazar el pago histórico (matrícula) al usuario recién creado
        UPDATE pagos
        SET id_usuario_colegiado = v_id_usuario_nuevo
        WHERE id_solicitud = NEW.id_solicitud;

        -- Generar automáticamente la primera mensualidad, pendiente de pago
        INSERT INTO pagos (
            id_usuario_colegiado, id_usuario_cajero, tipo_pago, metodo_pago,
            monto_base, porcentaje_recargo, fecha_vencimiento, estado_pago
        ) VALUES (
            v_id_usuario_nuevo,
            NEW.id_usuario_cajero,
            'mensualidad',
            NULL, -- aún no se ha pagado, no hay método todavía
            3.00, -- TODO: ajustar al monto real de la mensualidad
            0,
            (CURRENT_DATE + INTERVAL '1 month')::DATE,
            'pendiente'
        );

        v_mensaje := 'Bienvenido al CIP, ' || NEW.nombre_completo || '. ' ||
                     'Tu usuario es tu DNI: ' || NEW.dni || '. ' ||
                     'Tu contraseña temporal es: ' || v_password_generada || '. ' ||
                     'Código de recuperación (guárdalo): ' || v_codigo_recuperacion || '. ' ||
                     'Deberás cambiar tu contraseña al ingresar por primera vez.';

        -- Enviar por CADA canal que tenga dato registrado (correo y/o teléfono).
        -- Si el colegiado dejó ambos, se insertan dos filas -> se envía por los dos.
        -- Si solo dejó uno, se inserta una sola fila -> se envía solo por ese.
        IF NEW.correo IS NOT NULL THEN
            INSERT INTO credenciales_envio (id_usuario, id_solicitud, canal, destinatario, mensaje)
            VALUES (v_id_usuario_nuevo, NEW.id_solicitud, 'correo', NEW.correo, v_mensaje);
        END IF;

        IF NEW.telefono IS NOT NULL THEN
            INSERT INTO credenciales_envio (id_usuario, id_solicitud, canal, destinatario, mensaje)
            VALUES (v_id_usuario_nuevo, NEW.id_solicitud, 'sms', NEW.telefono, v_mensaje);
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================================
-- TABLA: observaciones
-- Registra el motivo por el cual el administrador rechazó
-- una solicitud de colegiatura. Es obligatoria al rechazar.
-- ==========================================================
CREATE TABLE observaciones (
    id_observacion SERIAL PRIMARY KEY,
    id_solicitud INTEGER NOT NULL REFERENCES solicitudes(id_solicitud),
    id_usuario_admin INTEGER REFERENCES usuarios(id_usuario), -- quién la registró (si se conoce)
    observacion TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_observaciones_id_solicitud ON observaciones(id_solicitud);

ALTER TABLE usuarios
    DROP COLUMN codigo_recuperacion_expira;

CREATE OR REPLACE FUNCTION cambiar_password_usuario(p_id_usuario INTEGER, p_password_nueva TEXT)
RETURNS TABLE(username VARCHAR, codigo_nuevo VARCHAR) AS $$
DECLARE
    v_codigo_nuevo TEXT;
BEGIN
    v_codigo_nuevo := lpad(floor(random() * 1000000)::text, 6, '0');

    UPDATE usuarios
    SET password_hash = crypt(p_password_nueva, gen_salt('bf')),
        requiere_cambio_password = false,
        codigo_recuperacion = v_codigo_nuevo
    WHERE id_usuario = p_id_usuario;

    RETURN QUERY
    SELECT usuarios.username, v_codigo_nuevo
    FROM usuarios
    WHERE id_usuario = p_id_usuario;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE PROCEDURE sp_procesar_notificaciones()
LANGUAGE plpgsql AS $$
DECLARE
    r_pago RECORD;
    v_dias_restantes INTEGER;
    v_tipo VARCHAR(30);
    v_mensaje TEXT;
    v_incluye_deuda BOOLEAN;
    v_id_estado_con_deuda INTEGER;
BEGIN
    SELECT id_estado INTO v_id_estado_con_deuda FROM estados WHERE nombre = 'con_deuda';

    FOR r_pago IN
        SELECT p.id_pago, p.id_usuario_colegiado, p.fecha_vencimiento, p.estado_pago,
               s.correo, s.telefono, s.nombre_completo
        FROM pagos p
        JOIN solicitudes s ON s.id_usuario_colegiado = p.id_usuario_colegiado
        WHERE p.estado_pago IN ('pendiente', 'atrasado')
    LOOP
        v_dias_restantes := r_pago.fecha_vencimiento - CURRENT_DATE;

        v_incluye_deuda := false;
        v_tipo := NULL;

        IF v_dias_restantes = 5 THEN
            v_tipo := 'recordatorio_5_dias';
            v_mensaje := 'Tu colegiatura vence en 5 días (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 3 THEN
            v_tipo := 'recordatorio_3_dias';
            v_mensaje := 'Tu colegiatura vence en 3 días (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 1 THEN
            v_tipo := 'recordatorio_1_dia';
            v_mensaje := 'Tu colegiatura vence mañana (' || r_pago.fecha_vencimiento || ').';

        ELSIF v_dias_restantes = 0 THEN
            v_tipo := 'vencimiento';
            v_mensaje := 'Tu colegiatura vence hoy. Realiza tu pago para evitar recargos.';

        ELSIF v_dias_restantes < 0 THEN
            v_tipo := 'vencido_diario';
            v_incluye_deuda := true;
            v_mensaje := 'Tu colegiatura está vencida desde el ' || r_pago.fecha_vencimiento ||
                         '. Tienes una deuda pendiente, regulariza tu pago.';

            IF r_pago.estado_pago <> 'atrasado' THEN
                UPDATE pagos SET estado_pago = 'atrasado' WHERE id_pago = r_pago.id_pago;
            END IF;

            UPDATE usuarios
            SET id_estado = v_id_estado_con_deuda
            WHERE id_usuario = r_pago.id_usuario_colegiado;
        END IF;

        -- Si corresponde un tipo hoy, insertamos UNA fila POR CADA canal disponible
        IF v_tipo IS NOT NULL THEN

            IF r_pago.correo IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM notificaciones
                WHERE id_pago = r_pago.id_pago
                  AND tipo_notificacion = v_tipo
                  AND canal = 'correo'
                  AND DATE(fecha_programada) = CURRENT_DATE
            ) THEN
                INSERT INTO notificaciones (
                    id_usuario_colegiado, id_pago, tipo_notificacion, canal,
                    destinatario, incluye_aviso_deuda, mensaje,
                    fecha_programada, estado_envio
                ) VALUES (
                    r_pago.id_usuario_colegiado, r_pago.id_pago, v_tipo, 'correo',
                    r_pago.correo, v_incluye_deuda, v_mensaje, now(), 'pendiente'
                );
            END IF;

            IF r_pago.telefono IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM notificaciones
                WHERE id_pago = r_pago.id_pago
                  AND tipo_notificacion = v_tipo
                  AND canal = 'sms'
                  AND DATE(fecha_programada) = CURRENT_DATE
            ) THEN
                INSERT INTO notificaciones (
                    id_usuario_colegiado, id_pago, tipo_notificacion, canal,
                    destinatario, incluye_aviso_deuda, mensaje,
                    fecha_programada, estado_envio
                ) VALUES (
                    r_pago.id_usuario_colegiado, r_pago.id_pago, v_tipo, 'sms',
                    r_pago.telefono, v_incluye_deuda, v_mensaje, now(), 'pendiente'
                );
            END IF;

        END IF;

    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_aprobar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_id_rol_colegiado INTEGER;
    v_id_estado_habilitado INTEGER;
    v_id_usuario_nuevo INTEGER;
    v_correlativo INTEGER;
    v_password_generada TEXT;
    v_codigo_recuperacion TEXT;
    v_canal VARCHAR(20);
    v_destinatario VARCHAR(150);
    v_mensaje TEXT;
BEGIN
    IF NEW.estado_solicitud = 'aprobada' AND OLD.estado_solicitud IS DISTINCT FROM 'aprobada' THEN

        SELECT id_rol INTO v_id_rol_colegiado FROM roles WHERE nombre = 'colegiado';
        SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

        SELECT COALESCE(COUNT(*), 0) + 1 INTO v_correlativo
        FROM solicitudes
        WHERE id_sede = NEW.id_sede AND estado_solicitud = 'aprobada';

        NEW.numero_registro := NEW.id_sede || '-' || LPAD(v_correlativo::TEXT, 5, '0');
        NEW.fecha_aprobacion := now();

        v_password_generada := substr(md5(random()::text), 1, 8);
        v_codigo_recuperacion := lpad(floor(random() * 1000000)::text, 6, '0');

        INSERT INTO usuarios (
            username, password_hash, id_rol, id_sede, id_estado,
            codigo_recuperacion, requiere_cambio_password
        )
        VALUES (
            NEW.dni,
            crypt(v_password_generada, gen_salt('bf')),
            v_id_rol_colegiado,
            NEW.id_sede,
            v_id_estado_habilitado,
            v_codigo_recuperacion,
            true
        )
        RETURNING id_usuario INTO v_id_usuario_nuevo;

        NEW.id_usuario_colegiado := v_id_usuario_nuevo;

        UPDATE pagos
        SET id_usuario_colegiado = v_id_usuario_nuevo
        WHERE id_solicitud = NEW.id_solicitud;

        -- Generar automáticamente la primera mensualidad, pendiente de pago
        INSERT INTO pagos (
            id_usuario_colegiado, id_usuario_cajero, tipo_pago, metodo_pago,
            monto_base, porcentaje_recargo, fecha_vencimiento, estado_pago
        ) VALUES (
            v_id_usuario_nuevo,
            NEW.id_usuario_cajero,
            'mensualidad',
            NULL,
            10.00,
            0,
            (CURRENT_DATE + INTERVAL '1 month')::DATE,
            'pendiente'
        );

        IF NEW.correo IS NOT NULL THEN
            v_canal := 'correo';
            v_destinatario := NEW.correo;
        ELSE
            v_canal := 'sms';
            v_destinatario := NEW.telefono;
        END IF;

        v_mensaje := 'Bienvenido al CIP, ' || NEW.nombre_completo || '. ' ||
                     'Tu usuario es tu DNI: ' || NEW.dni || '. ' ||
                     'Tu contraseña temporal es: ' || v_password_generada || '. ' ||
                     'Código de recuperación (guárdalo): ' || v_codigo_recuperacion || '. ' ||
                     'Deberás cambiar tu contraseña al ingresar por primera vez.';

        INSERT INTO credenciales_envio (id_usuario, id_solicitud, canal, destinatario, mensaje)
        VALUES (v_id_usuario_nuevo, NEW.id_solicitud, v_canal, v_destinatario, v_mensaje);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE ordenes_pago_pendientes
    RENAME COLUMN culqi_order_id TO mercadopago_preference_id;

ALTER TABLE ordenes_pago_pendientes
    ADD COLUMN external_reference VARCHAR(100);

CREATE UNIQUE INDEX idx_ordenes_pago_external_reference ON ordenes_pago_pendientes(external_reference);

ALTER TABLE pagos
    RENAME COLUMN culqi_order_id TO mercadopago_payment_id;

ALTER TABLE pagos
    DROP CONSTRAINT IF EXISTS pagos_metodo_pago_check;

-- ==========================================================
-- Soporte para cobrar pagos YA EXISTENTES (matrícula o deudas
-- de un colegiado ya registrado), sin pasar por el flujo de
-- registro de solicitud. Reutiliza ordenes_pago_pendientes:
-- si datos_solicitud viene lleno -> flujo de registro (como hoy);
-- si viene null pero ids_pago sí -> flujo de cobro de pagos existentes.
-- ==========================================================
ALTER TABLE ordenes_pago_pendientes
    ALTER COLUMN datos_solicitud DROP NOT NULL,
    ADD COLUMN ids_pago INTEGER[],
    ADD COLUMN id_usuario_cajero INTEGER REFERENCES usuarios(id_usuario);

-- ==========================================================
-- Corrige el monto de la primera mensualidad autogenerada al aprobar
-- una solicitud: por error quedó hardcodeada en S/ 10.00; debe ser
-- S/ 3.00 (mensualidad fija). fn_generar_siguiente_mensualidad hereda
-- el monto_base de la mensualidad anterior, así que corregir aquí
-- también corrige la cadena de mensualidades futuras de cada colegiado.
-- ==========================================================
CREATE OR REPLACE FUNCTION fn_aprobar_solicitud()
RETURNS TRIGGER AS $$
DECLARE
    v_id_rol_colegiado INTEGER;
    v_id_estado_habilitado INTEGER;
    v_id_usuario_nuevo INTEGER;
    v_correlativo INTEGER;
    v_password_generada TEXT;
    v_codigo_recuperacion TEXT;
    v_canal VARCHAR(20);
    v_destinatario VARCHAR(150);
    v_mensaje TEXT;
BEGIN
    IF NEW.estado_solicitud = 'aprobada' AND OLD.estado_solicitud IS DISTINCT FROM 'aprobada' THEN

        SELECT id_rol INTO v_id_rol_colegiado FROM roles WHERE nombre = 'colegiado';
        SELECT id_estado INTO v_id_estado_habilitado FROM estados WHERE nombre = 'habilitado';

        SELECT COALESCE(COUNT(*), 0) + 1 INTO v_correlativo
        FROM solicitudes
        WHERE id_sede = NEW.id_sede AND estado_solicitud = 'aprobada';

        NEW.numero_registro := NEW.id_sede || '-' || LPAD(v_correlativo::TEXT, 5, '0');
        NEW.fecha_aprobacion := now();

        v_password_generada := substr(md5(random()::text), 1, 8);
        v_codigo_recuperacion := lpad(floor(random() * 1000000)::text, 6, '0');

        INSERT INTO usuarios (
            username, password_hash, id_rol, id_sede, id_estado,
            codigo_recuperacion, requiere_cambio_password
        )
        VALUES (
            NEW.dni,
            crypt(v_password_generada, gen_salt('bf')),
            v_id_rol_colegiado,
            NEW.id_sede,
            v_id_estado_habilitado,
            v_codigo_recuperacion,
            true
        )
        RETURNING id_usuario INTO v_id_usuario_nuevo;

        NEW.id_usuario_colegiado := v_id_usuario_nuevo;

        UPDATE pagos
        SET id_usuario_colegiado = v_id_usuario_nuevo
        WHERE id_solicitud = NEW.id_solicitud;

        -- Generar automáticamente la primera mensualidad, pendiente de pago
        INSERT INTO pagos (
            id_usuario_colegiado, id_usuario_cajero, tipo_pago, metodo_pago,
            monto_base, porcentaje_recargo, fecha_vencimiento, estado_pago
        ) VALUES (
            v_id_usuario_nuevo,
            NEW.id_usuario_cajero,
            'mensualidad',
            NULL,
            3.00,
            0,
            (CURRENT_DATE + INTERVAL '1 month')::DATE,
            'pendiente'
        );

        IF NEW.correo IS NOT NULL THEN
            v_canal := 'correo';
            v_destinatario := NEW.correo;
        ELSE
            v_canal := 'sms';
            v_destinatario := NEW.telefono;
        END IF;

        v_mensaje := 'Bienvenido al CIP, ' || NEW.nombre_completo || '. ' ||
                     'Tu usuario es tu DNI: ' || NEW.dni || '. ' ||
                     'Tu contraseña temporal es: ' || v_password_generada || '. ' ||
                     'Código de recuperación (guárdalo): ' || v_codigo_recuperacion || '. ' ||
                     'Deberás cambiar tu contraseña al ingresar por primera vez.';

        INSERT INTO credenciales_envio (id_usuario, id_solicitud, canal, destinatario, mensaje)
        VALUES (v_id_usuario_nuevo, NEW.id_solicitud, v_canal, v_destinatario, v_mensaje);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==========================================================
-- TABLA: notificaciones_web
-- Sistema de notificaciones dentro de la propia web (campanita),
-- independiente de los recordatorios de pago por correo/WhatsApp
-- (tabla "notificaciones", que sigue funcionando igual).
-- Regla: el "mensaje" de estas notificaciones NUNCA debe incluir
-- contraseñas, códigos de recuperación ni otros datos críticos.
-- Se eliminan únicamente cuando el usuario lo decide (no expiran solas).
-- ==========================================================
CREATE TABLE notificaciones_web (
    id_notificacion_web SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    mensaje TEXT NOT NULL,
    leida BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificaciones_web_id_usuario ON notificaciones_web(id_usuario);
CREATE INDEX idx_notificaciones_web_leida ON notificaciones_web(leida);
