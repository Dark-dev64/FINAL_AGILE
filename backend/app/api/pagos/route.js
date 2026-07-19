import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const idUsuarioColegiado = searchParams.get("id_usuario_colegiado");

  let query = supabaseAdmin.from("pagos").select("*").order("fecha_vencimiento", { ascending: true });

  if (idUsuarioColegiado) {
    query = query.eq("id_usuario_colegiado", idUsuarioColegiado);
  }

  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  return ok(data);
}

export async function POST(request) {
  const evento = await request.json();
  console.log("🔔 Webhook Culqi recibido:", JSON.stringify(evento, null, 2));
  const body = await request.json();

  const { data, error } = await supabaseAdmin
    .from("pagos")
    .insert({
      id_usuario_colegiado: body.id_usuario_colegiado,
      id_usuario_cajero: body.id_usuario_cajero,
      tipo_pago: body.tipo_pago,
      monto_base: body.monto_base,
      porcentaje_recargo: body.porcentaje_recargo ?? 0,
      fecha_vencimiento: body.fecha_vencimiento,
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(data, 201);
}