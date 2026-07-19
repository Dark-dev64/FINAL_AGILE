import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function GET(request, { params }) {
  const { idUsuario } = await params;

  // Recalcula el estado (vencimientos, deuda) EN VIVO antes de leer los datos.
  // Así, para la demo, no dependemos de esperar al cron diario.
  await supabaseAdmin.rpc("fn_procesar_notificaciones_wrapper");

  fetch(`${process.env.APP_URL || "http://localhost:3000"}/api/notificaciones/procesar`, {
    method: "POST",
  }).catch((err) =>
    console.error("Error disparando envío de notificaciones:", err.message)
  );

  const { data: usuario, error: errorUsuario } = await supabaseAdmin
    .from("usuarios")
    .select("id_usuario, estados ( nombre, color )")
    .eq("id_usuario", idUsuario)
    .single();

  if (errorUsuario || !usuario) {
    return fail("No se encontró el usuario.", 404);
  }

  const { data: solicitud, error: errorSolicitud } = await supabaseAdmin
    .from("solicitudes")
    .select(`
      apellido_paterno,
      apellido_materno,
      nombre_completo,
      dni,
      numero_registro,
      foto_key,
      especialidades ( nombre_especialidad ),
      sedes ( nombre, ciudad )
    `)
    .eq("id_usuario_colegiado", idUsuario)
    .eq("estado_solicitud", "aprobada")
    .single();

  if (errorSolicitud || !solicitud) {
    return fail("No se encontró la solicitud aprobada de este colegiado.", 404);
  }

  let fotoUrl = null;
  if (solicitud.foto_key) {
    const { data } = await supabaseAdmin.storage
      .from("fotos-carnet")
      .createSignedUrl(solicitud.foto_key, 60 * 10);
    fotoUrl = data?.signedUrl ?? null;
  }

  return ok({
    apellidoPaterno: solicitud.apellido_paterno,
    apellidoMaterno: solicitud.apellido_materno,
    nombreCompleto: solicitud.nombre_completo,
    especialidad: solicitud.especialidades?.nombre_especialidad ?? "—",
    dni: solicitud.dni,
    numeroRegistro: solicitud.numero_registro,
    fotoUrl,
    estado: usuario.estados?.nombre ?? "inhabilitado",
    sede: solicitud.sedes?.nombre ?? "—",
  });
}
