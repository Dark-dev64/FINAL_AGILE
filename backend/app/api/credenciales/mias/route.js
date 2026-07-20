import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const idUsuario = searchParams.get("id_usuario");

  if (!idUsuario) return fail("Falta el id_usuario.", 400);

  const { data: usuario, error: errorUsuario } = await supabaseAdmin
    .from("usuarios")
    .select("requiere_cambio_password")
    .eq("id_usuario", idUsuario)
    .single();

  if (errorUsuario || !usuario) return fail("Usuario no encontrado.", 404);

  // Ya cambió su contraseña temporal: no se debe poder recuperar el
  // mensaje con la contraseña anterior.
  if (!usuario.requiere_cambio_password) {
    return fail("Ya no hay credenciales pendientes de mostrar.", 403);
  }

  const { data: envio, error: errorEnvio } = await supabaseAdmin
    .from("credenciales_envio")
    .select("mensaje, canal, destinatario, fecha_enviado, created_at")
    .eq("id_usuario", idUsuario)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorEnvio) return fail(errorEnvio.message, 500);
  if (!envio) return fail("No se encontraron credenciales enviadas para este usuario.", 404);

  return ok(envio);
}
