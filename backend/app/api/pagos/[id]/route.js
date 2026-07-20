import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { crearNotificacionWeb } from "../../../../lib/notificacionesWeb";

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