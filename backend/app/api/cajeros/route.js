import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET() {
  const { data: roleCajero } = await supabaseAdmin
    .from("roles")
    .select("id_rol")
    .eq("nombre", "cajero")
    .single();

  if (!roleCajero) {
    return fail("Rol cajero no encontrado.", 404);
  }

  const { data: cajeros, error } = await supabaseAdmin
    .from("usuarios")
    .select("id_usuario, username, id_sede, sedes(nombre, ciudad)")
    .eq("id_rol", roleCajero.id_rol)
    .order("username");

  if (error) return fail(error.message, 500);

  return ok(cajeros);
}
