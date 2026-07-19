import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("sedes").select("*").order("nombre");
  if (error) return fail(error.message, 500);
  return ok(data);
}