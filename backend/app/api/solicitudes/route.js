import { supabaseAdmin } from "../../../lib/supabaseClient";
import { ok, fail, mensajeErrorDuplicado } from "../../../utils/apiResponse";
import { isNotEmpty, isValidDNI } from "../../../utils/validators";
import { crearNotificacionParaRol } from "../../../lib/notificacionesWeb";

export async function GET(request) {
  const { error: errorNotificaciones } = await supabaseAdmin.rpc(
    "fn_procesar_notificaciones_wrapper"
  );

  if (errorNotificaciones) {
    console.error("Error procesando notificaciones:", errorNotificaciones.message);
  }

  const { searchParams } = new URL(request.url);
  const idSedeParam = searchParams.get("id_sede");
  const idUsuarioParam = searchParams.get("id_usuario");

  let idSede = idSedeParam ? Number(idSedeParam) : null;

  if (!idSede && idUsuarioParam) {
    const { data: usuario } = await supabaseAdmin
      .from("usuarios")
      .select("id_sede, roles(nombre)")
      .eq("id_usuario", idUsuarioParam)
      .single();

    if (usuario && usuario.roles?.nombre === "cajero" && usuario.id_sede) {
      idSede = usuario.id_sede;
    }
  }

  let query = supabaseAdmin
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

  if (idSede) {
    query = query.eq("id_sede", idSede);
  }

  const { data, error } = await query;

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
    "correo"
  ];

  for (const campo of camposRequeridos) {
    if (!isNotEmpty(String(body[campo] ?? ""))) {
      return fail(`El campo "${campo}" es requerido.`);
    }
  }

  if (!isValidDNI(body.dni)) {
    return fail("El DNI debe tener 8 dígitos.");
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
      estado_solicitud: "pendiente_pago"
    })
    .select("id_solicitud")
    .single();

  if (error) return fail(mensajeErrorDuplicado(error) || error.message, 500);

  return ok({ id_solicitud: data.id_solicitud }, 201);
} 