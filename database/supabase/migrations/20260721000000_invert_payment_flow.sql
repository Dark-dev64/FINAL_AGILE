ALTER TABLE solicitudes DROP CONSTRAINT IF EXISTS solicitudes_estado_solicitud_check;
ALTER TABLE solicitudes ADD CONSTRAINT solicitudes_estado_solicitud_check
  CHECK (estado_solicitud IN ('pendiente_pago', 'pendiente', 'aprobada', 'rechazada'));

ALTER TABLE ordenes_pago_pendientes
  ADD COLUMN IF NOT EXISTS id_solicitud bigint REFERENCES solicitudes(id_solicitud);

ALTER TABLE solicitudes
  ADD COLUMN IF NOT EXISTS creada_en timestamptz NOT NULL DEFAULT now();