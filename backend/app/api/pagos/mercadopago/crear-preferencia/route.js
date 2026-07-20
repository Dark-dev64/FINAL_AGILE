import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { preferenceClient } from "../../../../../lib/mercadopagoClient";
import { enviarLinkPagoCorreo } from "../../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../../lib/whatsappClient";

const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0;
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET;

export async function POST(request) {
  const datosFormulario = await request.json();

  if (!datosFormulario.correo) {
    return fail("El correo del colegiado es obligatorio para generar el pago.", 400);
  }

  const externalReference = `SOL-${datosFormulario.dni}-${Date.now()}`;

  console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
  console.log("APP_URL:", process.env.APP_URL);
  console.log("success URL:", `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`);

  let preferencia;
  try {
    preferencia = await preferenceClient.create({
      body: {
        items: [
          {
            title: `Mensualidad CIP - DNI ${datosFormulario.dni}`,
            quantity: 1,
            unit_price: MONTO_MENSUALIDAD,
            currency_id: "PEN",
          },
          {
            title: `Emisión de carnet - DNI ${datosFormulario.dni}`,
            quantity: 1,
            unit_price: MONTO_CARNET,
            currency_id: "PEN",
          },
        ],
        payer: {
          name: datosFormulario.nombre_completo,
          surname: `${datosFormulario.apellido_paterno} ${datosFormulario.apellido_materno}`,
          email: datosFormulario.correo || undefined,
        },
        external_reference: externalReference,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
          pending: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
          failure: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
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
      datos_solicitud: datosFormulario,
      monto: MONTO_MATRICULA,
    });

  if (error) return fail(error.message, 500);

  // Si el cajero eligió explícitamente "enviar link" (equivalente al Link de Culqi)
  if (datosFormulario.enviar_link_canal) {
    const mensajeWhatsApp = `Hola ${datosFormulario.nombre_completo}, completa el pago de tu matrícula CIP aquí: ${preferencia.init_point}`;

    try {
      if (datosFormulario.enviar_link_canal === "correo" && datosFormulario.correo) {
        await enviarLinkPagoCorreo(datosFormulario.correo, {
          nombreCompleto: datosFormulario.nombre_completo,
          dni: datosFormulario.dni,
          monto: MONTO_MATRICULA,
          linkPago: preferencia.init_point,
        });
      } else if (datosFormulario.enviar_link_canal === "whatsapp" && datosFormulario.telefono) {
        await enviarWhatsApp(datosFormulario.telefono, mensajeWhatsApp);
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

