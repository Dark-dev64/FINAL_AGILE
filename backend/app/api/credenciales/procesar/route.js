import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { enviarCorreo } from "../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../lib/whatsappClient";

export async function POST() {
  const { data: pendientes, error } = await supabaseAdmin
    .from("credenciales_envio")
    .select("*")
    .eq("estado_envio", "pendiente");

  if (error) return fail(error.message, 500);

  const resultados = [];

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