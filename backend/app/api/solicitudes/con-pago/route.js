import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail, mensajeErrorDuplicado } from "../../../../utils/apiResponse";
import { crearNotificacionParaRol } from "../../../../lib/notificacionesWeb";
import { enviarComprobantePago } from "../../../../utils/comprobantePago";

// Hardcodeado en el backend, no confiamos en el monto del cliente.
const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0;
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET; // 4.0

export async function POST(request) {
  const body = await request.json();

  const camposRequeridos = [
    "id_usuario_cajero", "id_sede", "id_especialidad",
    "apellido_paterno", "apellido_materno", "nombre_completo", "dni",
    "correo", "metodo_pago", "fecha_pago", "fecha_vencimiento",
  ];

  for (const campo of camposRequeridos) {
    if (!body[campo]) {
      return fail(`El campo "${campo}" es requerido.`);
    }
  }

  if (!["efectivo", "yape", "plin"].includes(body.metodo_pago)) {
    return fail("Método de pago inválido.");
  }

  const telefonoLimpio = body.telefono ? body.telefono.replace(/\D/g, "") : null;

  const { data, error } = await supabaseAdmin.rpc("fn_registrar_solicitud_con_pago", {
    p_id_usuario_cajero: body.id_usuario_cajero,
    p_id_sede: body.id_sede,
    p_id_especialidad: body.id_especialidad,
    p_apellido_paterno: body.apellido_paterno,
    p_apellido_materno: body.apellido_materno,
    p_nombre_completo: body.nombre_completo,
    p_dni: body.dni,
    p_telefono: body.telefono || null,
    p_correo: body.correo || null,
    p_foto_key: body.foto_key || null,
    p_foto_content_type: body.foto_content_type || null,
    p_foto_size_bytes: body.foto_size_bytes || null,
    p_foto_ancho_px: body.foto_ancho_px || null,
    p_foto_alto_px: body.foto_alto_px || null,
    p_titulo_key: body.titulo_key || null,
    p_titulo_content_type: body.titulo_content_type || null,
    p_titulo_size_bytes: body.titulo_size_bytes || null,
    p_metodo_pago: body.metodo_pago,
    p_monto_base: MONTO_MATRICULA,
    p_fecha_pago: body.fecha_pago,
    p_fecha_vencimiento: body.fecha_vencimiento,
  });

  if (error) return fail(mensajeErrorDuplicado(error) || error.message, 500);

  const idSolicitudCreada = data?.[0]?.id_solicitud;

  enviarComprobantePago({
    nombreCompleto: body.nombre_completo,
    dni: body.dni,
    correo: body.correo || null,
    telefono: body.telefono || null,
    metodoPago: body.metodo_pago,
    monto: MONTO_MATRICULA,
    orderNumber: idSolicitudCreada ? `MATRICULA-${idSolicitudCreada}` : `MATRICULA-${body.dni}`,
  }).catch((err) => console.error("❌ Error inesperado enviando comprobante:", err.message));

  crearNotificacionParaRol({
    rol: "admin",
    tipo: "solicitud_nueva",
    titulo: "Nueva solicitud de colegiatura",
    mensaje: `${body.nombre_completo} (DNI ${body.dni}) registró una nueva solicitud, pendiente de revisión.`,
  }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

  return ok(data[0], 201);
}