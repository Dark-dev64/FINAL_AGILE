import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function POST(request) {
  const { id_usuario } = await request.json();

  if (!id_usuario) return fail("Falta el id_usuario.", 400);

  const { error } = await supabaseAdmin
    .from("notificaciones_web")
    .update({ leida: true })
    .eq("id_usuario", id_usuario)
    .eq("leida", false);

  if (error) return fail(error.message, 500);
  return ok({ marcadas: true });
}
