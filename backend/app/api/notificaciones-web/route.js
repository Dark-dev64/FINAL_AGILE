import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const idUsuario = searchParams.get("id_usuario");

  if (!idUsuario) return fail("Falta el id_usuario.", 400);

  const { data, error } = await supabaseAdmin
    .from("notificaciones_web")
    .select("*")
    .eq("id_usuario", idUsuario)
    .order("created_at", { ascending: false });

  if (error) return fail(error.message, 500);
  return ok(data);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const idUsuario = searchParams.get("id_usuario");

  if (!idUsuario) return fail("Falta el id_usuario.", 400);

  const { error } = await supabaseAdmin
    .from("notificaciones_web")
    .delete()
    .eq("id_usuario", idUsuario);

  if (error) return fail(error.message, 500);
  return ok({ eliminadas: true });
}
