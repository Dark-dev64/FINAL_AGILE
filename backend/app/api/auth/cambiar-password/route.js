import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function POST(request) {
  const { id_usuario, password_nueva } = await request.json();

  if (!id_usuario || !password_nueva || password_nueva.length < 6) {
    return fail("La nueva contraseña debe tener al menos 6 caracteres.");
  }

  const { data, error } = await supabaseAdmin.rpc("cambiar_password_usuario", {
    p_id_usuario: id_usuario,
    p_password_nueva: password_nueva,
  });

  if (error) return fail(error.message, 500);
  return ok({ message: "Contraseña actualizada correctamente." });
}