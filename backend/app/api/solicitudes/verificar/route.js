import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

/**
 * Verifica si un DNI, correo o teléfono ya están registrados en alguna
 * solicitud (nueva o existente), para bloquear duplicados ANTES de llegar
 * a la pantalla de pago (donde recién se enteraría por un error de la BD).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dni = searchParams.get("dni");
  const correo = searchParams.get("correo");
  const telefono = searchParams.get("telefono");

  if (!dni && !correo && !telefono) {
    return fail("Debes indicar al menos dni, correo o telefono.", 400);
  }

  const resultado = { dni: null, correo: null, telefono: null };

  if (dni) {
    const { data, error } = await supabaseAdmin
      .from("solicitudes")
      .select("estado_solicitud")
      .eq("dni", dni)
      .limit(1);

    if (error) return fail(error.message, 500);
    if (data.length > 0) resultado.dni = { existe: true, estado: data[0].estado_solicitud };
  }

  if (correo) {
    const { data, error } = await supabaseAdmin
      .from("solicitudes")
      .select("id_solicitud")
      .eq("correo", correo)
      .limit(1);

    if (error) return fail(error.message, 500);
    if (data.length > 0) resultado.correo = { existe: true };
  }

  if (telefono) {
    const { data, error } = await supabaseAdmin
      .from("solicitudes")
      .select("id_solicitud")
      .eq("telefono", telefono)
      .limit(1);

    if (error) return fail(error.message, 500);
    if (data.length > 0) resultado.telefono = { existe: true };
  }

  return ok(resultado);
}
