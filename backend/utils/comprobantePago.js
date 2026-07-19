import { enviarComprobanteCorreo } from "../lib/emailClient";
import { enviarWhatsApp } from "../lib/whatsappClient";

/**
 * Envía el comprobante de pago (yape/plin) por los canales de contacto
 * que el colegiado haya registrado en su solicitud.
 *
 * Reglas:
 * - Si tiene correo Y teléfono -> se envía por AMBOS canales (Gmail + WhatsApp).
 * - Si solo tiene uno de los dos -> se envía solo por ese canal.
 * - Los envíos son independientes: si uno falla, no bloquea al otro.
 *
 * El correo usa una plantilla HTML propia de "boleta de pago"
 * (enviarComprobanteCorreo), distinta de la del correo de credenciales.
 * El WhatsApp sigue siendo texto plano.
 *
 * Nota: en la base de datos algunos registros usan el valor "sms" como nombre
 * de canal por razones históricas, pero en la práctica ese canal siempre
 * envía por WhatsApp (enviarWhatsApp), nunca por SMS real.
 *
 * @param {Object} datos
 * @param {string} datos.nombreCompleto
 * @param {string} datos.dni
 * @param {string} [datos.correo]
 * @param {string} [datos.telefono]
 * @param {string} datos.metodoPago  "yape" | "plin"
 * @param {number|string} datos.monto
 * @param {string} [datos.numeroRegistro] - opcional, si ya se generó
 * @param {string} [datos.orderNumber] - opcional, número de operación de Culqi
 */
export async function enviarComprobantePago({
  nombreCompleto,
  dni,
  correo,
  telefono,
  metodoPago,
  monto,
  numeroRegistro,
  orderNumber,
}) {
  const fecha = new Date().toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" });

  const mensajeWhatsApp =
    `Hola ${nombreCompleto}, confirmamos que tu pago de matrícula CIP ` +
    `por S/ ${monto} vía ${metodoPago.toUpperCase()} fue procesado correctamente el ${fecha}. ` +
    `DNI: ${dni}.` +
    (numeroRegistro
      ? ` Tu número de registro es ${numeroRegistro}.`
      : ` Tu solicitud fue registrada y está pendiente de aprobación.`);

  const envios = [];

  if (correo) {
    envios.push(
      enviarComprobanteCorreo(correo, {
        nombreCompleto,
        dni,
        metodoPago,
        monto,
        fecha,
        numeroRegistro,
        orderNumber,
      })
        .then(() => ({ canal: "correo", ok: true }))
        .catch((err) => ({ canal: "correo", ok: false, error: err.message }))
    );
  }

  if (telefono) {
    envios.push(
      enviarWhatsApp(telefono, mensajeWhatsApp)
        .then(() => ({ canal: "whatsapp", ok: true }))
        .catch((err) => ({ canal: "whatsapp", ok: false, error: err.message }))
    );
  }

  if (!correo && !telefono) {
    console.warn("⚠️ No se pudo enviar comprobante: el colegiado no tiene correo ni teléfono registrado.");
    return { enviado: false, resultados: [] };
  }

  const resultados = await Promise.allSettled(envios);
  const resumen = resultados.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, error: r.reason?.message }
  );

  resumen.forEach((r) => {
    if (r.ok) {
      console.log(`✅ Comprobante de pago enviado por ${r.canal}`);
    } else {
      console.error(`❌ Falló envío de comprobante por ${r.canal ?? "desconocido"}:`, r.error);
    }
  });

  return { enviado: resumen.some((r) => r.ok), resultados: resumen };
}