import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function PATCH(request, { params }) {
  const { id } = await params; 

  const { data, error } = await supabaseAdmin
    .from("pagos")
    .update({ estado_pago: "pagado", fecha_pago: new Date().toISOString() })
    .eq("id_pago", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(data);
}