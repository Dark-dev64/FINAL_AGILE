import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function POST(request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return fail("Usuario y contraseña son requeridos.");
  }

  const { data: usuario, error } = await supabaseAdmin
    .from("usuarios")
    .select("id_usuario, username, password_hash, id_sede, id_estado, requiere_cambio_password, roles(nombre)")
    .eq("username", username)
    .single();

  if (error || !usuario) {
    return fail("Usuario o contraseña incorrectos.", 401);
  }

  const { data: passwordValida } = await supabaseAdmin.rpc("verificar_password", {
    p_password: password,
    p_hash: usuario.password_hash,
  });

  if (!passwordValida) {
    return fail("Usuario o contraseña incorrectos.", 401);
  }

  return ok({
    id_usuario: usuario.id_usuario,
    username: usuario.username,
    id_sede: usuario.id_sede,
    id_estado: usuario.id_estado,
    rol: usuario.roles.nombre,
    requiere_cambio_password: usuario.requiere_cambio_password,
  });
}