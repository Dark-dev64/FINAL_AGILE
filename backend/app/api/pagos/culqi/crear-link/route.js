import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../../lib/whatsappClient";

const MONTO_MATRICULA = 6.0;

export async function POST(request) {
  const datosFormulario = await request.json();

  const response = await fetch("https://api.culqi.com/v2/links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.CULQI_SECRET_KEY}`,
      "x-culqi-product": "link",
    },
    body: JSON.stringify({
      amount: Math.round(MONTO_MATRICULA * 100),
      currency_code: "PEN",
      concept: `Matrícula CIP - DNI ${datosFormulario.dni}`,
      limit_uses: 1, // un solo uso, para que no se reutilice
      is_open_amount: false,
      payment_methods: ["billetera"], // solo QR, sin tarjeta ni código Yape
      expiration_date: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutos
    }),
  });

  const data = await response.json();
  console.log("Respuesta de Culqi (Link):", JSON.stringify(data, null, 2));

  if (!response.ok) {
    return fail(data.user_message || data.merchant_message || "No se pudo generar el link de pago.", response.status);
  }

  // Guardamos igual que con las Órdenes, reutilizando la misma tabla temporal
  const { error } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .insert({
      culqi_order_id: data.id, // guardamos el id del LINK aquí (será distinto al de una orden normal)
      datos_solicitud: datosFormulario,
      monto: MONTO_MATRICULA,
    });

  if (error) return fail(error.message, 500);

  // Enviar el link por el canal disponible
  const mensaje = `Hola ${datosFormulario.nombre_completo}, completa el pago de tu matrícula CIP aquí: ${data.url}`;

  if (datosFormulario.correo) {
    await enviarCorreo(datosFormulario.correo, mensaje);
  } else if (datosFormulario.telefono) {
    await enviarWhatsApp(datosFormulario.telefono, mensaje);
  }

  return ok({ link: data });
}