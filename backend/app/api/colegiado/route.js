import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dni = searchParams.get("dni");

  if (!dni || !/^\d{8}$/.test(dni)) {
    return fail("Ingresa un DNI válido de 8 dígitos.", 400);
  }

  const { data: solicitud, error } = await supabaseAdmin
    .from("solicitudes")
    .select("id_usuario_colegiado, nombre_completo, dni, correo, telefono")
    .eq("dni", dni)
    .eq("estado_solicitud", "aprobada")
    .maybeSingle();

  if (error) return fail(error.message, 500);

  if (!solicitud || !solicitud.id_usuario_colegiado) {
    return fail("No se encontró un colegiado registrado con ese DNI.", 404);
  }

  return ok({
    id_usuario: solicitud.id_usuario_colegiado,
    nombre_completo: solicitud.nombre_completo,
    dni: solicitud.dni,
    correo: solicitud.correo,
    telefono: solicitud.telefono,
  });
}
