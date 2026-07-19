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