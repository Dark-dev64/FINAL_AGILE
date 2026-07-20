import { supabaseAdmin } from "./supabaseClient";

/**
 * Crea una notificación en la campanita de la web. Nunca debe incluir
 * contraseñas, códigos de recuperación ni otros datos críticos en el
 * mensaje. Es "fire and forget": si falla, solo se loguea, nunca debe
 * interrumpir el flujo principal (pago, aprobación, etc.) que la dispara.
 */
export async function crearNotificacionWeb({ id_usuario, tipo, titulo, mensaje }) {
  if (!id_usuario) return;

  const { error } = await supabaseAdmin
    .from("notificaciones_web")
    .insert({ id_usuario, tipo, titulo, mensaje });

  if (error) {
    console.error("❌ Error creando notificación web:", error.message);
  }
}
