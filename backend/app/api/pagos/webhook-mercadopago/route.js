import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { paymentClient } from "../../../../lib/mercadopagoClient";
import { enviarComprobantePago } from "../../../../utils/comprobantePago";

function validarFirmaWebhook(request, dataId) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xSignature || !xRequestId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.trim().split("=").map((s) => s.trim()))
  );

  if (!parts.ts || !parts.v1) return false;

  // Manifest según la doc oficial de Mercado Pago (id en minúsculas)
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${parts.ts};`;

  const hmac = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  return hmac === parts.v1;
}

export async function POST(request) {
  const url = new URL(request.url);
  // Mercado Pago también manda data.id como query param en algunas notificaciones
  const dataIdQuery = url.searchParams.get("data.id");

  const evento = await request.json();
  console.log("🔔 Webhook Mercado Pago recibido:", JSON.stringify(evento, null, 2));

  const paymentId = evento?.data?.id || dataIdQuery || evento?.resource;
  const topic = evento?.type || evento?.topic;

  if (!validarFirmaWebhook(request, paymentId)) {
    console.error("❌ Firma de webhook inválida.");
    return fail("Firma inválida.", 401);
  }

  if (topic !== "payment" || !paymentId) {
    console.log("⚠️ Evento ignorado, type:", topic);
    return ok({ recibido: true });
  }

  let pago;
  try {
    pago = await paymentClient.get({ id: paymentId });
  } catch (err) {
    console.error("❌ No se pudo consultar el pago en Mercado Pago:", err.message);
    return fail("No se pudo verificar el pago.", 500);
  }

  if (pago.status !== "approved") {
    console.log(`📦 Pago ${paymentId}, estado: ${pago.status} (no aprobado aún)`);
    return ok({ recibido: true });
  }

  const externalReference = pago.external_reference;

  const { data: ordenTemp, error: errorOrden } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("*")
    .eq("external_reference", externalReference)
    .single();

  if (errorOrden || !ordenTemp) {
    console.error("❌ No se encontró la orden pendiente:", externalReference, errorOrden);
    return fail("No se encontró la orden pendiente correspondiente.", 404);
  }

  const form = ordenTemp.datos_solicitud;

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
    p_metodo_pago: "mercadopago",
    p_monto_base: ordenTemp.monto,
    p_fecha_pago: new Date().toISOString(),
    p_fecha_vencimiento: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    console.error("❌ Error en RPC fn_registrar_solicitud_con_pago:", error.message);
    return fail(error.message, 500);
  }

  await supabaseAdmin.from("ordenes_pago_pendientes").delete().eq("id_orden_temp", ordenTemp.id_orden_temp);

  enviarComprobantePago({
    nombreCompleto: form.nombre_completo,
    dni: form.dni,
    correo: form.correo || null,
    telefono: form.telefono || null,
    metodoPago: "mercadopago",
    monto: ordenTemp.monto,
    orderNumber: String(paymentId),
  }).catch((err) => console.error("❌ Error inesperado enviando comprobante:", err.message));

  console.log("✅ Solicitud creada:", resultado[0]);
  return ok({ solicitud_creada: resultado[0] });
}