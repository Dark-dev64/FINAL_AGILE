import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok } from "../../../../../utils/apiResponse";
import { motivoRechazoLegible } from "../../../../../lib/motivosRechazoMP";

export async function GET(request, { params }) {
  const { externalReference } = await params;

  const { data: ordenTemp } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("estado, motivo_rechazo")
    .eq("external_reference", externalReference)
    .maybeSingle();

  if (!ordenTemp) {
    return ok({ estado_pago: "pagado" });
  }

  if (ordenTemp.estado === "rechazado") {
    return ok({
      estado_pago: "rechazado",
      motivo: motivoRechazoLegible(ordenTemp.motivo_rechazo),
      motivo_codigo: ordenTemp.motivo_rechazo,
    });
  }

  return ok({ estado_pago: "pendiente" });
}
