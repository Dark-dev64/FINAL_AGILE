import { enviarRechazoCorreo } from "../lib/emailClient";
import { enviarWhatsApp } from "../lib/whatsappClient";

/**
 * Envía la notificación de solicitud RECHAZADA por los canales de contacto
 * que el solicitante haya registrado.
 *
 * Reglas (igual que el comprobante de pago):
 * - Si tiene correo Y teléfono -> se envía por AMBOS canales.
 * - Si solo tiene uno de los dos -> se envía solo por ese canal.
 * - Los envíos son independientes: si uno falla, no bloquea al otro.
 *
 * @param {Object} datos
 * @param {string} datos.nombreCompleto
 * @param {string} datos.dni
 * @param {string} [datos.correo]
 * @param {string} [datos.telefono]
 * @param {string} [datos.motivo] - opcional, razón del rechazo
 */
export async function enviarNotificacionRechazo({ nombreCompleto, dni, correo, telefono, motivo }) {
  const mensajeWhatsApp =
    `Hola ${nombreCompleto}, tu solicitud de colegiatura CIP (DNI: ${dni}) no fue aprobada.` +
    (motivo ? ` Motivo: ${motivo}.` : "") +
    ` Si tienes dudas, acércate a la sede donde iniciaste tu trámite.`;

  const envios = [];

  if (correo) {
    envios.push(
      enviarRechazoCorreo(correo, { nombreCompleto, dni, motivo })
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
    console.warn("⚠️ No se pudo enviar notificación de rechazo: sin correo ni teléfono registrado.");
    return { enviado: false, resultados: [] };
  }

  const resultados = await Promise.allSettled(envios);
  const resumen = resultados.map((r) =>
    r.status === "fulfilled" ? r.value : { ok: false, error: r.reason?.message }
  );

  resumen.forEach((r) => {
    if (r.ok) {
      console.log(`✅ Notificación de rechazo enviada por ${r.canal}`);
    } else {
      console.error(`❌ Falló envío de notificación de rechazo por ${r.canal ?? "desconocido"}:`, r.error);
    }
  });

  return { enviado: resumen.some((r) => r.ok), resultados: resumen };
}