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
        // Primero notificar rechazo
        await notificarRechazoPago(ordenRechazada, pago.status_detail).catch((err) =>
          console.error("❌ Error inesperado notificando rechazo:", err.message)
        );

        // Si es flujo de matrícula, borrar solicitud y su orden pendiente asociada
        if (ordenRechazada.id_solicitud) {
          const { error: errorDelSol } = await supabaseAdmin
            .from("solicitudes")
            .delete()
            .eq("id_solicitud", ordenRechazada.id_solicitud);
          if (errorDelSol) {
            console.error("❌ Error eliminando solicitud rechazada:", errorDelSol.message);
          }

          const { error: errorDelOrden } = await supabaseAdmin
            .from("ordenes_pago_pendientes")
            .delete()
            .eq("id_orden_temp", ordenRechazada.id_orden_temp);
          if (errorDelOrden) {
            console.error("❌ Error eliminando orden rechazada:", errorDelOrden.message);
          }
        }
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

  if (ordenTemp.id_solicitud) {
    return procesarPagoMatricula(ordenTemp, paymentId);
  }

  return procesarPagoExistente(ordenTemp, paymentId);
}

async function procesarPagoMatricula(ordenTemp, paymentId) {
  // 1. Actualizar estado de solicitud a 'pendiente' y traer datos del colegiado
  const { data: solicitud, error: errorSol } = await supabaseAdmin
    .from("solicitudes")
    .update({ estado_solicitud: "pendiente" })
    .eq("id_solicitud", ordenTemp.id_solicitud)
    .select("id_usuario_colegiado, nombre_completo, dni, correo, telefono")
    .single();

  if (errorSol || !solicitud) {
    console.error("❌ Error actualizando estado de solicitud en webhook:", errorSol?.message);
    return fail(errorSol?.message || "Solicitud no encontrada", 500);
  }

  // 2. Insertar pago matrícula
  const { error: errorPago } = await supabaseAdmin
    .from("pagos")
    .insert({
      id_solicitud: ordenTemp.id_solicitud,
      id_usuario_colegiado: solicitud.id_usuario_colegiado || null,
      id_usuario_cajero: ordenTemp.id_usuario_cajero || null,
      tipo_pago: "inscripcion",
      metodo_pago: "mercadopago",
      monto_base: ordenTemp.monto,
      porcentaje_recargo: 0,
      fecha_vencimiento: new Date().toISOString().slice(0, 10),
      fecha_pago: new Date().toISOString(),
      estado_pago: "pagado",
      mercadopago_payment_id: String(paymentId)
    });

  if (errorPago) {
    console.error("❌ Error registrando el pago de matrícula en webhook:", errorPago.message);
    return fail(errorPago.message, 500);
  }

  // 3. Borrar orden de pago pendiente
  await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .delete()
    .eq("id_orden_temp", ordenTemp.id_orden_temp);

  // 4. Enviar comprobante
  enviarComprobantePago({
    nombreCompleto: solicitud.nombre_completo,
    dni: solicitud.dni,
    correo: solicitud.correo || null,
    telefono: solicitud.telefono || null,
    metodoPago: "mercadopago",
    monto: ordenTemp.monto,
    orderNumber: String(paymentId),
  }).catch((err) => console.error("❌ Error inesperado enviando comprobante:", err.message));

  // 5. Notificar al administrador
  crearNotificacionParaRol({
    rol: "admin",
    tipo: "solicitud_nueva",
    titulo: "Nueva solicitud de colegiatura",
    mensaje: `${solicitud.nombre_completo} (DNI ${solicitud.dni}) registró una nueva solicitud, pendiente de revisión.`,
  }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

  console.log("✅ Pago de matrícula confirmado para solicitud:", ordenTemp.id_solicitud);
  return ok({ solicitud_confirmada: ordenTemp.id_solicitud });
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

  // Flujo de registro de colegiado nuevo
  if (ordenTemp.id_solicitud) {
    const { data: solicitud, error: errorSol } = await supabaseAdmin
      .from("solicitudes")
      .select("nombre_completo, dni, id_usuario_cajero")
      .eq("id_solicitud", ordenTemp.id_solicitud)
      .single();

    if (solicitud) {
      await crearNotificacionWeb({
        id_usuario: solicitud.id_usuario_cajero,
        tipo: "pago_rechazado",
        titulo: "Pago rechazado",
        mensaje: `El pago de matrícula de ${solicitud.nombre_completo} (DNI ${solicitud.dni}) fue rechazado: ${motivo}`,
      });
    }
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