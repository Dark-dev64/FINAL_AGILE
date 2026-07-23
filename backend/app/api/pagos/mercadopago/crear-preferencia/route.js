import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { preferenceClient } from "../../../../../lib/mercadopagoClient";
import { enviarLinkPagoCorreo } from "../../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../../lib/whatsappClient";

const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0;
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET;

export async function POST(request) {
  const { id_solicitud, id_usuario_cajero, enviar_link_canal } = await request.json();

  if (!id_solicitud) {
    return fail("El id_solicitud es obligatorio.", 400);
  }

  const { data: solicitud, error: errorSolicitud } = await supabaseAdmin
    .from("solicitudes")
    .select("*")
    .eq("id_solicitud", id_solicitud)
    .single();

  if (errorSolicitud || !solicitud) {
    return fail("No se encontró la solicitud de matrícula.", 404);
  }

  if (solicitud.estado_solicitud !== "pendiente_pago") {
    return fail("Esta solicitud ya no está pendiente de pago.", 400);
  }

  if (!solicitud.correo) {
    return fail("El correo del colegiado es obligatorio para generar el pago.", 400);
  }

  const externalReference = `SOL-${solicitud.dni}-${Date.now()}`;
  const FRONTEND_URL = process.env.FRONTEND_URL.replace(/\/$/, "");

  console.log("FRONTEND_URL:", FRONTEND_URL);
  console.log("APP_URL:", process.env.APP_URL);
  console.log("success URL:", `${FRONTEND_URL}/pago-colegiado/${externalReference}`);

  let preferencia;
  try {
    preferencia = await preferenceClient.create({
      body: {
        items: [
          {
            title: `Mensualidad CIP - DNI ${solicitud.dni}`,
            quantity: 1,
            unit_price: MONTO_MENSUALIDAD,
            currency_id: "PEN",
          },
          {
            title: `Emisión de carnet - DNI ${solicitud.dni}`,
            quantity: 1,
            unit_price: MONTO_CARNET,
            currency_id: "PEN",
          },
        ],
        payer: {
          name: solicitud.nombre_completo,
          surname: `${solicitud.apellido_paterno} ${solicitud.apellido_materno}`,
          email: solicitud.correo || undefined,
        },
        external_reference: externalReference,
        back_urls: {
          success: `${FRONTEND_URL}/pago-colegiado/${externalReference}`,
          pending: `${FRONTEND_URL}/pago-colegiado/${externalReference}`,
          failure: `${FRONTEND_URL}/pago-colegiado/${externalReference}`,
        },
        auto_return: "approved",
        notification_url: `${process.env.APP_URL}/api/pagos/webhook-mercadopago`,
      },
    });
  } catch (err) {
    console.error("Error creando preferencia de Mercado Pago:", err.message);
    return fail("No se pudo generar la preferencia de pago.", 500);
  }

  const { error } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .insert({
      mercadopago_preference_id: preferencia.id,
      external_reference: externalReference,
      id_solicitud: id_solicitud,
      id_usuario_cajero: id_usuario_cajero || null,
      monto: MONTO_MATRICULA,
    });

  if (error) return fail(error.message, 500);

  // Si el cajero eligió explícitamente "enviar link" (equivalente al Link de Culqi)
  if (enviar_link_canal) {
    const mensajeWhatsApp = `Hola ${solicitud.nombre_completo}, completa el pago de tu matrícula CIP aquí: ${preferencia.init_point}`;

    try {
      if (enviar_link_canal === "correo" && solicitud.correo) {
        await enviarLinkPagoCorreo(solicitud.correo, {
          nombreCompleto: solicitud.nombre_completo,
          dni: solicitud.dni,
          monto: MONTO_MATRICULA,
          linkPago: preferencia.init_point,
        });
      } else if (enviar_link_canal === "whatsapp" && solicitud.telefono) {
        await enviarWhatsApp(solicitud.telefono, mensajeWhatsApp);
      }
    } catch (errNotificacion) {
      console.error("Error enviando notificación de pago:", errNotificacion.message);
    }
  }

  return ok({
    preferencia: {
      id: preferencia.id,
      init_point: preferencia.init_point,
      external_reference: externalReference,
    },
  });
}

