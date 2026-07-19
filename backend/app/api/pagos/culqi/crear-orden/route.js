import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../../lib/whatsappClient";

const MONTO_MATRICULA = 6.0;

export async function POST(request) {
  const datosFormulario = await request.json();

  const response = await fetch("https://api.culqi.com/v2/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CULQI_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount: Math.round(MONTO_MATRICULA * 100),
      currency_code: "PEN",
      description: `Matrícula CIP - DNI ${datosFormulario.dni}`,
      order_number: `SOL-${datosFormulario.dni}-${Date.now()}`,
      client_details: {
        first_name: datosFormulario.nombre_completo,
        last_name: `${datosFormulario.apellido_paterno} ${datosFormulario.apellido_materno}`,
        email: datosFormulario.correo || "sin-correo@ciptest.pe",
        phone_number: "999999999",
      },
      expiration_date: Math.floor(Date.now() / 1000) + 60 * 15,
      confirm: false,
    }),
  });

  const data = await response.json();
  console.log("Respuesta completa de Culqi:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    return fail(data.user_message || "No se pudo generar la orden de pago.", response.status);
  }

  const { error } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .insert({
      culqi_order_id: data.id,
      datos_solicitud: datosFormulario,
      monto: MONTO_MATRICULA,
    });

  if (error) return fail(error.message, 500);

  // Notificar al colegiado con el link para completar su pago
  const linkPago = `https://tu-frontend.com/pago-colegiado/${data.id}`;
  const mensaje = `Hola ${datosFormulario.nombre_completo}, completa tu pago de matrícula aquí: ${linkPago}`;

  try {
    if (datosFormulario.correo) {
      await enviarCorreo(datosFormulario.correo, mensaje);
    } else if (datosFormulario.telefono) {
      await enviarWhatsApp(datosFormulario.telefono, mensaje);
    }
  } catch (errNotificacion) {
    // No bloqueamos la creación de la orden si falla el envío de la notificación
    console.error("Error enviando notificación de pago:", errNotificacion.message);
  }

  return ok({ orden: data });
}