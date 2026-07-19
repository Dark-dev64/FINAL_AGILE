import nodemailer from "nodemailer";

export const transporterGmail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function enviarCorreo(destinatario, mensaje) {
  await transporterGmail.sendMail({
    from: `"Colegio de Ingenieros del Perú" <${process.env.GMAIL_USER}>`,
    to: destinatario,
    subject: "Tus credenciales de acceso - Sistema CIP",
    text: mensaje,
    html: `<div style="font-family: sans-serif; padding: 20px;">
             <h2 style="color: #E31E24;">Colegio de Ingenieros del Perú</h2>
             <p>${mensaje.replace(/\n/g, "<br>")}</p>
           </div>`,
  });
}