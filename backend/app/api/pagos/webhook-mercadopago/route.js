import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail, mensajeErrorDuplicado } from "../../../../utils/apiResponse";
import { paymentClient } from "../../../../lib/mercadopagoClient";
import { enviarComprobantePago } from "../../../../utils/comprobantePago";
import { crearNotificacionWeb, crearNotificacionParaRol } from "../../../../lib/notificacionesWeb";
import { motivoRechazoLegible } from "../../../../lib/motivosRechazoMP";

const TIPO_PAGO_LABELS = {
  inscripcion: "matrícula",
  mensualidad: "mensualidad",
  otro: "pago",
};

function validarFirmaWebhook(request, dataId) {
  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");

  if (!xSignature || !xRequestId) return false;

  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error("❌ MERCADOPAGO_WEBHOOK_SECRET no está configurado.");
    return false;
  }

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.trim().split("=").map((s) => s.trim()))
  );

  if (!parts.ts || !parts.v1) return false;

  // Manifest según la doc oficial de Mercado Pago (id en minúsculas)
  const manifest = `id:${String(dataId).toLowerCase()};request-id:${xRequestId};ts:${parts.ts};`;

  const hmacEsperado = crypto
    .createHmac("sha256", process.env.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  // Comparación en tiempo constante para evitar timing attacks
  const bufferEsperado = Buffer.from(hmacEsperado, "hex");
  const bufferRecibido = Buffer.from(parts.v1, "hex");

  if (bufferEsperado.length !== bufferRecibido.length) return false;
  return crypto.timingSafeEqual(bufferEsperado, bufferRecibido);
}

export async function POST(request) {
  try {
    return await manejarWebhook(request);
  } catch (err) {
    // Cualquier excepción no controlada acá (variable de entorno faltante,
    // error inesperado de la librería de Mercado Pago, etc.) antes hacía que
    // la función se cayera sin responder nada -> Mercado Pago lo ve como
    // "502 Falla en entrega". Con esto siempre devolvemos una respuesta.
    console.error("❌ Error inesperado en el webhook de Mercado Pago:", err);
    return fail("Error interno procesando el webhook.", 500);
  }
}

async function manejarWebhook(request) {
  const url = new URL(request.url);
  // Mercado Pago también manda data.id como query param en algunas notificaciones
  const dataIdQuery = url.searchParams.get("data.id");

  let evento;
  try {
    evento = await request.json();
  } catch (err) {
    console.error("❌ Body del webhook no es JSON válido:", err.message);
    return fail("Body inválido.", 400);
  }

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
    console.log(`📦 Pago ${paymentId}, estado: ${pago.status} (no aprobado aún), detalle: ${pago.status_detail}`);

    // "rejected" es un estado final: el pago no se va a aprobar solo.
    // "pending"/"in_process"/etc. sí pueden resolverse más tarde, así que
    // esos los dejamos como "pendiente" (comportamiento actual, sin cambios).
    if (pago.status === "rejected" && pago.external_reference) {
      const { data: ordenRechazada, error: errorRechazo } = await supabaseAdmin
        .from("ordenes_pago_pendientes")
        .update({ estado: "rechazado", motivo_rechazo: pago.status_detail || "rejected" })
        .eq("external_reference", pago.external_reference)
        .select()
        .maybeSingle();

      if (errorRechazo) {
        console.error("❌ Error registrando el rechazo del pago:", errorRechazo.message);
      } else if (ordenRechazada) {
        notificarRechazoPago(ordenRechazada, pago.status_detail).catch((err) =>
          console.error("❌ Error inesperado notificando rechazo:", err.message)
        );
      }
    }

    return ok({ recibido: true });
  }

  const externalReference = pago.external_reference;

  if (!externalReference) {
    console.error("❌ El pago aprobado no trae external_reference:", paymentId);
    return fail("Pago sin referencia externa.", 400);
  }

  const { data: ordenTemp, error: errorOrden } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("*")
    .eq("external_reference", externalReference)
    .maybeSingle();

  if (errorOrden) {
    console.error("❌ Error consultando la orden pendiente:", errorOrden.message);
    return fail("Error consultando la orden pendiente.", 500);
  }

  if (!ordenTemp) {
    // Reintento del webhook para un pago que ya se procesó y cuya orden
    // ya fue borrada. No es un error, solo confirmamos recepción.
    console.log(`ℹ️ Sin orden pendiente para ${externalReference}; probablemente ya procesada.`);
    return ok({ recibido: true, ya_procesado: true });
  }

  if (!ordenTemp.datos_solicitud) {
    return procesarPagoExistente(ordenTemp, paymentId);
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
    return fail(mensajeErrorDuplicado(error) || error.message, 500);
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

  crearNotificacionParaRol({
    rol: "admin",
    tipo: "solicitud_nueva",
    titulo: "Nueva solicitud de colegiatura",
    mensaje: `${form.nombre_completo} (DNI ${form.dni}) registró una nueva solicitud, pendiente de revisión.`,
  }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

  console.log("✅ Solicitud creada:", resultado[0]);
  return ok({ solicitud_creada: resultado[0] });
}

async function procesarPagoExistente(ordenTemp, paymentId) {
  const { data: pagosActualizados, error } = await supabaseAdmin
    .from("pagos")
    .update({
      estado_pago: "pagado",
      fecha_pago: new Date().toISOString(),
      metodo_pago: "mercadopago",
      // Si fue un pago self-service (el colegiado pagó desde su propio panel),
      // no hay cajero: no pisar el id_usuario_cajero existente (columna NOT NULL).
      ...(ordenTemp.id_usuario_cajero ? { id_usuario_cajero: ordenTemp.id_usuario_cajero } : {}),
    })
    .in("id_pago", ordenTemp.ids_pago)
    .select("id_usuario_colegiado, tipo_pago");

  if (error) {
    console.error("❌ Error marcando pagos existentes como pagados:", error.message);
    return fail(error.message, 500);
  }

  await supabaseAdmin.from("ordenes_pago_pendientes").delete().eq("id_orden_temp", ordenTemp.id_orden_temp);

  const idColegiado = pagosActualizados?.[0]?.id_usuario_colegiado;
  if (idColegiado) {
    const { data: solicitud } = await supabaseAdmin
      .from("solicitudes")
      .select("nombre_completo, dni, correo, telefono")
      .eq("id_usuario_colegiado", idColegiado)
      .eq("estado_solicitud", "aprobada")
      .single();

    if (solicitud) {
      enviarComprobantePago({
        nombreCompleto: solicitud.nombre_completo,
        dni: solicitud.dni,
        correo: solicitud.correo || null,
        telefono: solicitud.telefono || null,
        metodoPago: "mercadopago",
        monto: ordenTemp.monto,
        orderNumber: String(paymentId),
      }).catch((err) => console.error("❌ Error inesperado enviando comprobante:", err.message));
    }

    const esUnSoloTipo = pagosActualizados.every((p) => p.tipo_pago === pagosActualizados[0].tipo_pago);
    const concepto = esUnSoloTipo ? TIPO_PAGO_LABELS[pagosActualizados[0].tipo_pago] ?? "pago" : "pago";

    crearNotificacionWeb({
      id_usuario: idColegiado,
      tipo: "pago_confirmado",
      titulo: "Pago confirmado",
      mensaje: `Tu pago de S/ ${Number(ordenTemp.monto).toFixed(2)} (${concepto}) fue registrado correctamente.`,
    }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

    if (ordenTemp.id_usuario_cajero) {
      crearNotificacionWeb({
        id_usuario: ordenTemp.id_usuario_cajero,
        tipo: "pago_cobrado",
        titulo: "Cobro exitoso",
        mensaje: `El cobro de S/ ${Number(ordenTemp.monto).toFixed(2)} (${concepto}) que generaste fue confirmado por Mercado Pago.`,
      }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));
    }
  }

  console.log("✅ Pagos existentes marcados como pagados:", ordenTemp.ids_pago);
  return ok({ pagos_actualizados: ordenTemp.ids_pago });
}

async function notificarRechazoPago(ordenTemp, statusDetail) {
  const motivo = motivoRechazoLegible(statusDetail);

  // Flujo de registro de colegiado nuevo: todavía no existe cuenta de
  // usuario para el solicitante, solo para el cajero que lo registró.
  if (ordenTemp.datos_solicitud) {
    const form = ordenTemp.datos_solicitud;
    await crearNotificacionWeb({
      id_usuario: form.id_usuario_cajero,
      tipo: "pago_rechazado",
      titulo: "Pago rechazado",
      mensaje: `El pago de matrícula de ${form.nombre_completo} (DNI ${form.dni}) fue rechazado: ${motivo}`,
    });
    return;
  }

  // Flujo de cobro de un pago ya existente (mensualidad/deuda).
  if (ordenTemp.id_usuario_cajero) {
    await crearNotificacionWeb({
      id_usuario: ordenTemp.id_usuario_cajero,
      tipo: "pago_rechazado",
      titulo: "Pago rechazado",
      mensaje: `El cobro de S/ ${Number(ordenTemp.monto).toFixed(2)} que generaste fue rechazado: ${motivo}`,
    });
    return;
  }

  // Pago self-service (el propio colegiado pagando desde su panel).
  if (ordenTemp.ids_pago?.length) {
    const { data: pagoRef } = await supabaseAdmin
      .from("pagos")
      .select("id_usuario_colegiado")
      .in("id_pago", ordenTemp.ids_pago)
      .limit(1)
      .maybeSingle();

    if (pagoRef?.id_usuario_colegiado) {
      await crearNotificacionWeb({
        id_usuario: pagoRef.id_usuario_colegiado,
        tipo: "pago_rechazado",
        titulo: "Pago rechazado",
        mensaje: `Tu pago de S/ ${Number(ordenTemp.monto).toFixed(2)} fue rechazado: ${motivo} Puedes intentar de nuevo.`,
      });
    }
  }
}