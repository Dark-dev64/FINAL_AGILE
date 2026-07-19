import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

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

  // Generar URLs firmadas temporales para ver la foto y el título (buckets privados)
  let fotoUrl = null;
  let tituloUrl = null;

  if (solicitud.foto_key) {
    const { data } = await supabaseAdmin.storage
      .from("fotos-carnet")
      .createSignedUrl(solicitud.foto_key, 60 * 5); // 5 minutos
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
  const { estado_solicitud } = await request.json();

  if (!["aprobada", "rechazada"].includes(estado_solicitud)) {
    return fail("Estado inválido. Usa 'aprobada' o 'rechazada'.");
  }

  const { data, error } = await supabaseAdmin
    .from("solicitudes")
    .update({ estado_solicitud })
    .eq("id_solicitud", id)
    .select()
    .single();

  if (error) return fail(error.message, 500);

  // Si se aprobó, procesamos el envío de credenciales inmediatamente
  if (estado_solicitud === "aprobada") {
    await fetch(`${process.env.APP_URL || "http://localhost:3000"}/api/credenciales/procesar`, {
      method: "POST",
    });
  }

  return ok(data);
}