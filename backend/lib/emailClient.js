import nodemailer from "nodemailer";

export const transporterGmail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function construirHtmlCorreo(mensaje) {
  const lineasMensaje = mensaje
    .split("\n")
    .filter((linea) => linea.trim() !== "")
    .map(
      (linea) =>
        `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #333333;">${linea}</p>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Credenciales de acceso - Sistema CIP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EDE8; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0EDE8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 28px 32px; text-align: center;">
              <div style="font-size: 13px; letter-spacing: 0.08em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                Sistema de Colegiatura
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; line-height: 1.3;">
                Colegio de Ingenieros del Perú
              </div>
            </td>
          </tr>

          <!-- Banda de color -->
          <tr>
            <td style="height: 4px; background-color: #E31E24; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 36px 32px 24px;">
              <h1 style="margin: 0 0 6px; font-size: 20px; color: #1A1A1A; font-weight: 700;">
                Tus credenciales de acceso
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #777777;">
                Usa estos datos para ingresar por primera vez al sistema.
              </p>

              <!-- Caja de credenciales -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6; border: 1px solid #E5E2DD; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px;">
                    ${lineasMensaje}
                  </td>
                </tr>
              </table>

              <!-- Aviso de seguridad -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF3D6; border-radius: 8px; margin-bottom: 8px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #8A6D00; line-height: 1.5;">
                    ⚠️ Por tu seguridad, deberás cambiar esta contraseña la primera vez que inicies sesión. No compartas estas credenciales con nadie.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid #EFEDE8;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-align: center;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} Colegio de Ingenieros del Perú
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export async function enviarCorreo(destinatario, mensaje) {
  await transporterGmail.sendMail({
    from: `"Colegio de Ingenieros del Perú" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Tus credenciales de acceso — Sistema CIP",
    text: mensaje,
    html: construirHtmlCorreo(mensaje),
  });
}

// ==========================================================
// COMPROBANTE DE PAGO (boleta) — plantilla independiente,
// visualmente distinta del correo de credenciales.
// ==========================================================

function formatearMonto(monto) {
  const numero = Number(monto);
  return Number.isNaN(numero) ? monto : numero.toFixed(2);
}

function construirHtmlComprobante({
  nombreCompleto,
  dni,
  metodoPago,
  monto,
  fecha,
  numeroRegistro,
  orderNumber,
}) {
  const filas = [
    ["Nombre", nombreCompleto],
    ["DNI", dni],
    ["Método de pago", metodoPago?.toUpperCase()],
    ["Fecha de pago", fecha],
    numeroRegistro ? ["N° de registro CIP", numeroRegistro] : null,
    orderNumber ? ["N° de operación", orderNumber] : null,
  ].filter(Boolean);

  const filasHtml = filas
    .map(
      ([label, valor], i) => `
      <tr>
        <td style="padding: 10px 0; font-size: 13px; color: #777777; ${i > 0 ? "border-top: 1px solid #EFEDE8;" : ""}">${label}</td>
        <td style="padding: 10px 0; font-size: 14px; color: #1A1A1A; font-weight: 600; text-align: right; ${i > 0 ? "border-top: 1px solid #EFEDE8;" : ""}">${valor}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Comprobante de pago - Sistema CIP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EDE8; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0EDE8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 28px 32px; text-align: center;">
              <div style="font-size: 13px; letter-spacing: 0.08em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                Comprobante de pago
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; line-height: 1.3;">
                Colegio de Ingenieros del Perú
              </div>
            </td>
          </tr>

          <!-- Banda de color -->
          <tr>
            <td style="height: 4px; background-color: #1E7A34; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 32px 32px 8px;">

              <!-- Badge de estado + monto -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6; border: 1px solid #E5E2DD; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <span style="display: inline-block; background-color: #E1F5E4; color: #1E7A34; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: 10px;">
                      Pago confirmado
                    </span>
                    <div style="font-size: 30px; font-weight: 800; color: #1A1A1A; margin-top: 8px;">
                      S/ ${formatearMonto(monto)}
                    </div>
                    <div style="font-size: 13px; color: #777777; margin-top: 4px;">
                      Matrícula de colegiatura CIP
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Detalle -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                ${filasHtml}
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 12px 32px 28px; border-top: 1px solid #EFEDE8;">
              <p style="margin: 16px 0 4px; font-size: 12px; color: #999999; text-align: center;">
                Este es un comprobante generado automáticamente, por favor no respondas a este correo.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} Colegio de Ingenieros del Perú
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Envía el comprobante de pago (boleta) por correo, con su propia
 * plantilla visual — independiente de la de credenciales de acceso.
 */
export async function enviarComprobanteCorreo(destinatario, datosPago) {
  const montoFormateado = formatearMonto(datosPago.monto);

  const textoPlano =
    `Confirmamos tu pago de S/ ${montoFormateado} vía ${datosPago.metodoPago?.toUpperCase()} ` +
    `el ${datosPago.fecha}. DNI: ${datosPago.dni}.` +
    (datosPago.numeroRegistro ? ` N° de registro CIP: ${datosPago.numeroRegistro}.` : "");

  await transporterGmail.sendMail({
    from: `"Colegio de Ingenieros del Perú" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Comprobante de pago — Matrícula CIP",
    text: textoPlano,
    html: construirHtmlComprobante(datosPago),
  });
}

// ==========================================================
// NOTIFICACIÓN DE SOLICITUD RECHAZADA — plantilla independiente,
// tono neutro/informativo (no es un error del sistema, es una decisión).
// ==========================================================

function construirHtmlRechazo({ nombreCompleto, dni, motivo }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Estado de tu solicitud - Sistema CIP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EDE8; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0EDE8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 28px 32px; text-align: center;">
              <div style="font-size: 13px; letter-spacing: 0.08em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                Estado de tu solicitud
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; line-height: 1.3;">
                Colegio de Ingenieros del Perú
              </div>
            </td>
          </tr>

          <!-- Banda de color -->
          <tr>
            <td style="height: 4px; background-color: #B0201F; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 36px 32px 24px;">

              <span style="display: inline-block; background-color: #FBE1E1; color: #B0201F; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: 16px;">
                Solicitud no aprobada
              </span>

              <h1 style="margin: 0 0 6px; font-size: 20px; color: #1A1A1A; font-weight: 700;">
                Hola, ${nombreCompleto}
              </h1>
              <p style="margin: 0 0 20px; font-size: 14px; color: #555555; line-height: 1.6;">
                Revisamos tu solicitud de colegiatura (DNI: ${dni}) y, luego de la evaluación
                correspondiente, no fue posible aprobarla en esta oportunidad.
              </p>

              ${
                motivo
                  ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6; border: 1px solid #E5E2DD; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600;">Motivo</p>
                    <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.5;">${motivo}</p>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <p style="margin: 0 0 8px; font-size: 14px; color: #555555; line-height: 1.6;">
                Si consideras que esto es un error o deseas más información, puedes
                acercarte a la sede donde iniciaste tu trámite o volver a presentar
                tu solicitud corrigiendo los datos observados.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid #EFEDE8;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-align: center;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} Colegio de Ingenieros del Perú
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Envía la notificación de solicitud rechazada por correo,
 * con su propia plantilla visual (tono neutro, banda roja informativa).
 */
export async function enviarRechazoCorreo(destinatario, datosRechazo) {
  const textoPlano =
    `Hola ${datosRechazo.nombreCompleto}, tu solicitud de colegiatura (DNI: ${datosRechazo.dni}) ` +
    `no fue aprobada.` +
    (datosRechazo.motivo ? ` Motivo: ${datosRechazo.motivo}.` : "") +
    ` Si tienes dudas, acércate a la sede donde iniciaste tu trámite.`;

  await transporterGmail.sendMail({
    from: `"Colegio de Ingenieros del Perú" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Estado de tu solicitud — Sistema CIP",
    text: textoPlano,
    html: construirHtmlRechazo(datosRechazo),
  });
}

// ==========================================================
// NOTIFICACIÓN DE CAMBIO DE CONTRASEÑA — plantilla independiente,
// nunca muestra la contraseña, solo confirma el cambio y entrega
// el nuevo código de recuperación.
// ==========================================================

function construirHtmlPasswordCambiada({ nombreCompleto, codigoNuevo }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contraseña actualizada - Sistema CIP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F0EDE8; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F0EDE8; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1A1A1A; padding: 28px 32px; text-align: center;">
              <div style="font-size: 13px; letter-spacing: 0.08em; color: #D4AF37; text-transform: uppercase; font-weight: 600; margin-bottom: 6px;">
                Seguridad de la cuenta
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; line-height: 1.3;">
                Colegio de Ingenieros del Perú
              </div>
            </td>
          </tr>

          <!-- Banda de color -->
          <tr>
            <td style="height: 4px; background-color: #1E7A34; font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Cuerpo -->
          <tr>
            <td style="padding: 36px 32px 24px;">

              <span style="display: inline-block; background-color: #E1F5E4; color: #1E7A34; font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 14px; border-radius: 999px; margin-bottom: 16px;">
                Contraseña actualizada
              </span>

              <h1 style="margin: 0 0 6px; font-size: 20px; color: #1A1A1A; font-weight: 700;">
                Hola, ${nombreCompleto}
              </h1>
              <p style="margin: 0 0 24px; font-size: 14px; color: #555555; line-height: 1.6;">
                Tu contraseña del sistema CIP fue actualizada correctamente. Por tu seguridad,
                no incluimos tu contraseña en este correo. Si no realizaste este cambio,
                contacta de inmediato con tu sede.
              </p>

              <!-- Caja del código de recuperación -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAF9F6; border: 1px solid #E5E2DD; border-radius: 8px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 20px 24px; text-align: center;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #999999; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 600;">
                      Tu nuevo código de recuperación
                    </p>
                    <div style="font-size: 28px; font-weight: 800; color: #E31E24; letter-spacing: 4px;">
                      ${codigoNuevo}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Aviso -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FDF3D6; border-radius: 8px;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #8A6D00; line-height: 1.5;">
                    🔑 Guarda este código en un lugar seguro. Lo necesitarás si olvidas tu contraseña más adelante.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px; border-top: 1px solid #EFEDE8;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-align: center;">
                Este es un mensaje automático, por favor no respondas a este correo.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} Colegio de Ingenieros del Perú
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Notifica que la contraseña fue cambiada y entrega el nuevo código
 * de recuperación. Nunca incluye la contraseña en texto plano.
 */
export async function enviarPasswordCambiadaCorreo(destinatario, { nombreCompleto, codigoNuevo }) {
  const textoPlano =
    `Hola ${nombreCompleto}, tu contraseña del sistema CIP fue actualizada correctamente. ` +
    `Tu nuevo código de recuperación es: ${codigoNuevo}. Guárdalo en un lugar seguro.`;

  await transporterGmail.sendMail({
    from: `"Colegio de Ingenieros del Perú" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Tu contraseña fue actualizada — Sistema CIP",
    text: textoPlano,
    html: construirHtmlPasswordCambiada({ nombreCompleto, codigoNuevo }),
  });
}