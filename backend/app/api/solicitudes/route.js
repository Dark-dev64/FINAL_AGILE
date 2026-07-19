import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail } from "../../../utils/apiResponse";
import { isNotEmpty, isValidDNI } from "../../../utils/validators";

export async function GET() {
  const { error: errorNotificaciones } = await supabaseAdmin.rpc(
    "fn_procesar_notificaciones_wrapper"
  );

  if (errorNotificaciones) {
    console.error("Error procesando notificaciones:", errorNotificaciones.message);
  }

  const { data, error } = await supabaseAdmin
    .from("solicitudes")
    .select(`
      id_solicitud,
      dni,
      apellido_paterno,
      apellido_materno,
      nombre_completo,
      estado_solicitud,
      fecha_registro,
      numero_registro,
      sedes ( nombre, ciudad ),
      especialidades ( nombre_especialidad ),
      pagos ( monto_total, metodo_pago, fecha_pago )
    `)
    .order("fecha_registro", { ascending: false });

  if (error) return fail(error.message, 500);
  return ok(data);
}
export async function POST(request) {
  const body = await request.json();

  const camposRequeridos = [
    "id_usuario_cajero",
    "id_sede",
    "id_especialidad",
    "apellido_paterno",
    "apellido_materno",
    "nombre_completo",
    "dni",
  ];

  for (const campo of camposRequeridos) {
    if (!isNotEmpty(String(body[campo] ?? ""))) {
      return fail(`El campo "${campo}" es requerido.`);
    }
  }

  if (!isValidDNI(body.dni)) {
    return fail("El DNI debe tener 8 dígitos.");
  }

  if (!body.correo?.trim() && !body.telefono?.trim()) {
    return fail("Debes registrar al menos un correo o un teléfono de contacto.");
  }

  const { data, error } = await supabaseAdmin
    .from("solicitudes")
    .insert({
      id_usuario_cajero: body.id_usuario_cajero,
      id_sede: body.id_sede,
      id_especialidad: body.id_especialidad,
      apellido_paterno: body.apellido_paterno,
      apellido_materno: body.apellido_materno,
      nombre_completo: body.nombre_completo,
      dni: body.dni,
      telefono: body.telefono || null,
      correo: body.correo || null,
      foto_key: body.foto_key || null,
      foto_content_type: body.foto_content_type || null,
      foto_size_bytes: body.foto_size_bytes || null,
      foto_ancho_px: body.foto_ancho_px || null,
      foto_alto_px: body.foto_alto_px || null,
      titulo_key: body.titulo_key || null,
      titulo_content_type: body.titulo_content_type || null,
      titulo_size_bytes: body.titulo_size_bytes || null,
    })
    .select()
    .single();

  if (error) return fail(error.message, 500);
  return ok(data, 201);
} 