import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";

export async function POST(request) {
  const evento = await request.json();
  console.log("🔔 Webhook Culqi recibido:", JSON.stringify(evento, null, 2));

  if (evento.type !== "order.status.changed") {
    console.log("⚠️ Evento ignorado, type:", evento.type);
    return ok({ recibido: true });
  }

  // 👇 evento.data viene como STRING, hay que parsearlo
  const data = JSON.parse(evento.data);

  const orderId = data.id;
  const estadoCulqi = data.state;
  console.log(`📦 Orden ${orderId}, estado: ${estadoCulqi}`);

  if (estadoCulqi !== "paid") {
    return ok({ recibido: true });
  }

  if (orderId.startsWith("link_")) {
    await fetch(`https://api.culqi.com/v2/links/${orderId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${process.env.CULQI_SECRET_KEY}`,
        "x-culqi-product": "link",
      },
    }).catch((err) => console.error("No se pudo eliminar el link usado:", err.message));
  }

  const { data: ordenTemp, error: errorOrden } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("*")
    .eq("culqi_order_id", orderId)
    .single();

  if (errorOrden || !ordenTemp) {
    console.error("❌ No se encontró la orden pendiente:", orderId, errorOrden);
    return fail("No se encontró la orden pendiente correspondiente.", 404);
  }

  const form = ordenTemp.datos_solicitud;
  const metodoDetectado = data.payment_method === "yape" ? "yape" : "plin";

  const { data: resultado, error } = await supabaseAdmin.rpc("fn_registrar_solicitud_con_pago", {
    p_id_usuario_cajero: form.id_usuario_cajero,
    p_id_sede: form.id_sede,
    p_id_especialidad: form.id_especialidad,
    p_apellido_paterno: form.apellido_paterno,
    p_apellido_materno: form.apellido_materno,
    p_nombre_completo: form.nombre_completo,
    p_dni: form.dni,
    p_telefono: form.telefono || null,
    p_correo: form.correo || null,
    p_foto_key: form.foto_key || null,
    p_foto_content_type: form.foto_content_type || null,
    p_foto_size_bytes: form.foto_size_bytes || null,
    p_foto_ancho_px: form.foto_ancho_px || null,
    p_foto_alto_px: form.foto_alto_px || null,
    p_titulo_key: form.titulo_key || null,
    p_titulo_content_type: form.titulo_content_type || null,
    p_titulo_size_bytes: form.titulo_size_bytes || null,
    p_metodo_pago: metodoDetectado,
    p_monto_base: ordenTemp.monto,
    p_fecha_pago: new Date().toISOString(),
    p_fecha_vencimiento: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    console.error("❌ Error en RPC fn_registrar_solicitud_con_pago:", error.message);
    return fail(error.message, 500);
  }

  await supabaseAdmin.from("ordenes_pago_pendientes").delete().eq("id_orden_temp", ordenTemp.id_orden_temp);

  console.log("✅ Solicitud creada:", resultado[0]);
  return ok({ solicitud_creada: resultado[0] });
}