import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { enviarNotificacionRechazo } from "../../../../utils/notificacionRechazo";

export async function GET(request, { params }) {
  const { id } = await params;

  const { data: solicitud, error } = await supabaseAdmin
    .from("solicitudes")
    .select(`
      *,
      sedes ( nombre, ciudad ),
      especialidades ( nombre_especialidad ),
      pagos ( id_pago, monto_base, monto_total, metodo_pago, fecha_pago, fecha_vencimiento, estado_pago )
    `)
    .eq("id_solicitud", id)
    .single();

  if (error || !solicitud) return fail("Solicitud no encontrada.", 404);

  let fotoUrl = null;
  let tituloUrl = null;

  if (solicitud.foto_key) {
    const { data } = await supabaseAdmin.storage
      .from("fotos-carnet")
      .createSignedUrl(solicitud.foto_key, 60 * 5);
    fotoUrl = data?.signedUrl ?? null;
  }

  if (solicitud.titulo_key) {
    const { data } = await supabaseAdmin.storage
      .from("titulos")
      .createSignedUrl(solicitud.titulo_key, 60 * 5);
    tituloUrl = data?.signedUrl ?? null;
  }

  return ok({ ...solicitud, foto_url_temporal: fotoUrl, titulo_url_temporal: tituloUrl });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { estado_solicitud, observacion, id_usuario_admin } = await request.json();

  if (!["aprobada", "rechazada"].includes(estado_solicitud)) {
    return fail("Estado inválido. Usa 'aprobada' o 'rechazada'.");
  }

  // La observación es obligatoria únicamente al rechazar
  if (estado_solicitud === "rechazada" && !observacion?.trim()) {
    return fail("Debes indicar una observación para rechazar la solicitud.");
  }

  const { data, error } = await supabaseAdmin
    .from("solicitudes")
    .update({ estado_solicitud })
    .eq("id_solicitud", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);

  if (estado_solicitud === "aprobada") {
    await fetch(`${process.env.APP_URL || "http://localhost:3000"}/api/credenciales/procesar`, {
      method: "POST",
    });
  }

  if (estado_solicitud === "rechazada") {
    const observacionLimpia = observacion.trim();

    const { error: errorObservacion } = await supabaseAdmin
      .from("observaciones")
      .insert({
        id_solicitud: id,
        id_usuario_admin: id_usuario_admin || null,
        observacion: observacionLimpia,
      });

    if (errorObservacion) {
      console.error("❌ No se pudo guardar la observación:", errorObservacion.message);
    }

    enviarNotificacionRechazo({
      nombreCompleto: data.nombre_completo,
      dni: data.dni,
      correo: data.correo || null,
      telefono: data.telefono || null,
      motivo: observacionLimpia,
    }).catch((err) => console.error("❌ Error inesperado notificando rechazo:", err.message));
  }

  return ok(data);
}