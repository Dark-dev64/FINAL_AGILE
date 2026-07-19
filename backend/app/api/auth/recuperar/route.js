import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { notificarCambioPassword } from "../../../../lib/notificarCambioPassword"; // ← esta línea faltaba

export async function POST(request) {
  const { username, codigo_recuperacion, password_nueva } = await request.json();

  if (!username || !codigo_recuperacion || !password_nueva) {
    return fail("Todos los campos son requeridos.");
  }

  const { data: usuario, error } = await supabaseAdmin
    .from("usuarios")
    .select("id_usuario, codigo_recuperacion")
    .eq("username", username)
    .single();

  if (error || !usuario) {
    return fail("Usuario no encontrado.", 404);
  }

  if (usuario.codigo_recuperacion !== codigo_recuperacion) {
    return fail("Código de recuperación incorrecto.", 401);
  }

  const { data: resultado, error: errorCambio } = await supabaseAdmin.rpc("cambiar_password_usuario", {
    p_id_usuario: usuario.id_usuario,
    p_password_nueva: password_nueva,
  });

  if (errorCambio) return fail(errorCambio.message, 500);

  await notificarCambioPassword(usuario.id_usuario, resultado[0].codigo_nuevo);

  return ok({ message: "Contraseña restablecida correctamente." });
}