import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok } from "../../../../../utils/apiResponse";

export async function GET(request, { params }) {
  const { externalReference } = await params;

  const { data: ordenTemp } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("id_orden_temp")
    .eq("external_reference", externalReference)
    .maybeSingle();

  return ok({ estado_pago: ordenTemp ? "pendiente" : "pagado" });
}