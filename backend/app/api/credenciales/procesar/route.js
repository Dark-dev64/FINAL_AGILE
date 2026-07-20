import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../lib/whatsappClient";
import { crearNotificacionWeb } from "../../../../lib/notificacionesWeb";

export async function POST() {
  const { data: pendientes, error } = await supabaseAdmin
    .from("credenciales_envio")
    .select("*")
    .eq("estado_envio", "pendiente");

  if (error) return fail(error.message, 500);

  const resultados = [];
  const yaNotificadasEnWeb = new Set();

  for (const envio of pendientes) {
    try {
      if (envio.canal === "correo") {
        await enviarCorreo(envio.destinatario, envio.mensaje);
      } else if (envio.canal === "sms") {
        await enviarWhatsApp(envio.destinatario, envio.mensaje);
      }

      await supabaseAdmin
        .from("credenciales_envio")
        .update({ estado_envio: "enviado", fecha_enviado: new Date().toISOString() })
        .eq("id_envio", envio.id_envio);

      // Nunca copiar `envio.mensaje` acá: contiene la contraseña en texto
      // plano. La notificación web es siempre un aviso genérico.
      if (!yaNotificadasEnWeb.has(envio.id_usuario)) {
        yaNotificadasEnWeb.add(envio.id_usuario);
        crearNotificacionWeb({
          id_usuario: envio.id_usuario,
          tipo: "credenciales_generadas",
          titulo: "Tus credenciales de acceso fueron enviadas",
          mensaje: "Revisa tu correo o WhatsApp para ver tu usuario y contraseña temporal.",
        }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));
      }

      resultados.push({ id_envio: envio.id_envio, estado: "enviado" });
    } catch (err) {
      console.error(`Error enviando credenciales (id_envio ${envio.id_envio}):`, err.message);

      await supabaseAdmin
        .from("credenciales_envio")
        .update({ estado_envio: "fallido" })
        .eq("id_envio", envio.id_envio);

      resultados.push({ id_envio: envio.id_envio, estado: "fallido", error: err.message });
    }
  }

  return ok({ procesados: resultados.length, resultados });
}