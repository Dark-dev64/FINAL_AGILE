import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../lib/whatsappClient";

export async function POST() {
  // Primero, forzamos la generación de notificaciones del día (por si el cron aún no corrió)
  await supabaseAdmin.rpc("fn_procesar_notificaciones_wrapper");

  const { data: pendientes, error } = await supabaseAdmin
    .from("notificaciones")
    .select("*")
    .eq("estado_envio", "pendiente");

  if (error) return fail(error.message, 500);

  const resultados = [];

  for (const noti of pendientes) {
    try {
      if (noti.canal === "correo") {
        await enviarCorreo(noti.destinatario, noti.mensaje);
      } else if (noti.canal === "sms") {
        await enviarWhatsApp(noti.destinatario, noti.mensaje);
      }

      await supabaseAdmin
        .from("notificaciones")
        .update({ estado_envio: "enviado", fecha_enviada: new Date().toISOString() })
        .eq("id_notificacion", noti.id_notificacion);

      resultados.push({ id_notificacion: noti.id_notificacion, estado: "enviado" });
    } catch (err) {
      console.error(`Error enviando notificación ${noti.id_notificacion}:`, err.message);

      await supabaseAdmin
        .from("notificaciones")
        .update({ estado_envio: "fallido" })
        .eq("id_notificacion", noti.id_notificacion);

      resultados.push({ id_notificacion: noti.id_notificacion, estado: "fallido" });
    }
  }

  return ok({ procesados: resultados.length, resultados });
}