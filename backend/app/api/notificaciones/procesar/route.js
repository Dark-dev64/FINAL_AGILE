import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../lib/whatsappClient";
import { crearNotificacionWeb } from "../../../../lib/notificacionesWeb";

const TITULOS_RECORDATORIO = {
  recordatorio_5_dias: "Recordatorio de pago",
  recordatorio_3_dias: "Recordatorio de pago",
  recordatorio_1_dia: "Recordatorio de pago",
  vencimiento: "Tu pago vence hoy",
  vencido_diario: "Pago atrasado",
};

export async function POST() {
  // Primero, forzamos la generación de notificaciones del día (por si el cron aún no corrió)
  await supabaseAdmin.rpc("fn_procesar_notificaciones_wrapper");

  const { data: pendientes, error } = await supabaseAdmin
    .from("notificaciones")
    .select("*")
    .eq("estado_envio", "pendiente");

  if (error) return fail(error.message, 500);

  const resultados = [];
  const yaNotificadasEnWeb = new Set();

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

      // Un mismo recordatorio puede generar una fila por correo y otra por
      // WhatsApp; solo queremos UNA notificación web por recordatorio real.
      const claveDedup = `${noti.id_pago}-${noti.tipo_notificacion}`;
      if (!yaNotificadasEnWeb.has(claveDedup)) {
        yaNotificadasEnWeb.add(claveDedup);
        crearNotificacionWeb({
          id_usuario: noti.id_usuario_colegiado,
          tipo: noti.tipo_notificacion,
          titulo: TITULOS_RECORDATORIO[noti.tipo_notificacion] ?? "Notificación de pago",
          mensaje: noti.mensaje,
        }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));
      }

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