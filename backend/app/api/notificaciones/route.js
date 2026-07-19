import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const idUsuarioColegiado = searchParams.get("id_usuario_colegiado");

  let query = supabaseAdmin
    .from("notificaciones")
    .select("*")
    .order("fecha_programada", { ascending: false });

  if (idUsuarioColegiado) {
    query = query.eq("id_usuario_colegiado", idUsuarioColegiado);
  }

  const { data, error } = await query;
  if (error) return fail(error.message, 500);
  return ok(data);
}