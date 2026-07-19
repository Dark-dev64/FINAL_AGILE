import { supabaseAdmin } from "./supabaseClient";
import { enviarPasswordCambiadaCorreo } from "./emailClient";
import { enviarWhatsApp } from "./whatsappClient";

export async function notificarCambioPassword(idUsuario, codigoNuevo) {
  const { data: solicitud } = await supabaseAdmin
    .from("solicitudes")
    .select("correo, telefono, nombre_completo")
    .eq("id_usuario_colegiado", idUsuario)
    .eq("estado_solicitud", "aprobada")
    .maybeSingle();

  if (!solicitud) return; // admin/cajero sin solicitud asociada, no aplica

  const mensajeWhatsApp = `Hola ${solicitud.nombre_completo}, tu contraseña del sistema CIP fue actualizada. Tu nuevo código de recuperación es: ${codigoNuevo}. Guárdalo en un lugar seguro.`;

  // Enviamos por AMBOS canales si están disponibles, no solo por uno
  if (solicitud.correo) {
    try {
      await enviarPasswordCambiadaCorreo(solicitud.correo, {
        nombreCompleto: solicitud.nombre_completo,
        codigoNuevo,
      });
    } catch (err) {
      console.error("No se pudo enviar el correo de cambio de contraseña:", err.message);
    }
  }

  if (solicitud.telefono) {
    try {
      await enviarWhatsApp(solicitud.telefono, mensajeWhatsApp);
    } catch (err) {
      console.error("No se pudo enviar el WhatsApp de cambio de contraseña:", err.message);
    }
  }
}