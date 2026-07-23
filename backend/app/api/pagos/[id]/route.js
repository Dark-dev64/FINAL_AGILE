import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { crearNotificacionWeb } from "../../../../lib/notificacionesWeb";
import { enviarComprobantePago } from "../../../../utils/comprobantePago";

const TIPO_PAGO_LABELS = {
  inscripcion: "matrícula",
  mensualidad: "mensualidad",
  otro: "pago",
};

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const { data, error } = await supabaseAdmin
    .from("pagos")
    .update({
      estado_pago: "pagado",
      fecha_pago: new Date().toISOString(),
      ...(body.metodo_pago ? { metodo_pago: body.metodo_pago } : {}),
      ...(body.id_usuario_cajero ? { id_usuario_cajero: body.id_usuario_cajero } : {}),
    })
    .eq("id_pago", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);

  const concepto = TIPO_PAGO_LABELS[data.tipo_pago] ?? data.tipo_pago;

  // Enviar comprobante de pago por correo (Gmail) y/o WhatsApp
  let consultaSolicitud = null;
  if (data.id_solicitud) {
    consultaSolicitud = supabaseAdmin
      .from("solicitudes")
      .select("nombre_completo, dni, correo, telefono, numero_registro")
      .eq("id_solicitud", data.id_solicitud)
      .maybeSingle();
  } else if (data.id_usuario_colegiado) {
    consultaSolicitud = supabaseAdmin
      .from("solicitudes")
      .select("nombre_completo, dni, correo, telefono, numero_registro")
      .eq("id_usuario_colegiado", data.id_usuario_colegiado)
      .maybeSingle();
  }

  if (consultaSolicitud) {
    consultaSolicitud.then(({ data: solicitud }) => {
      if (solicitud) {
        enviarComprobantePago({
          nombreCompleto: solicitud.nombre_completo,
          dni: solicitud.dni,
          correo: solicitud.correo || null,
          telefono: solicitud.telefono || null,
          metodoPago: data.metodo_pago || "efectivo",
          monto: data.monto_total,
          numeroRegistro: solicitud.numero_registro || null,
          orderNumber: `PAGO-${data.id_pago}`,
        }).catch((err) => console.error("❌ Error inesperado enviando comprobante de pago:", err.message));
      }
    }).catch((err) => console.error("❌ Error consultando colegiado para comprobante:", err.message));
  }

  crearNotificacionWeb({
    id_usuario: data.id_usuario_colegiado,
    tipo: "pago_confirmado",
    titulo: "Pago confirmado",
    mensaje: `Tu pago de S/ ${Number(data.monto_total).toFixed(2)} (${concepto}) fue registrado correctamente.`,
  }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

  if (body.id_usuario_cajero) {
    crearNotificacionWeb({
      id_usuario: body.id_usuario_cajero,
      tipo: "pago_cobrado",
      titulo: "Cobro exitoso",
      mensaje: `Cobraste S/ ${Number(data.monto_total).toFixed(2)} (${concepto}) en efectivo correctamente.`,
    }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));
  }

  return ok(data);
}