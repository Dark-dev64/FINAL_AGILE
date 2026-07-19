import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("especialidades")
    .select("*")
    .order("nombre_especialidad");

  if (error) return fail(error.message, 500);
  return ok(data);
}