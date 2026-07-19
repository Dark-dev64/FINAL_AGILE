import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";

export async function GET(request, { params }) {
  const { culqiOrderId } = await params;

  // Si la orden temporal YA NO existe, es porque el webhook la procesó y creó la solicitud
  const { data: ordenTemp } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("id_orden_temp")
    .eq("culqi_order_id", culqiOrderId)
    .maybeSingle();

  return ok({ estado_pago: ordenTemp ? "pendiente" : "pagado" });
}