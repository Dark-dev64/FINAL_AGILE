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

/**
 * Igual que crearNotificacionWeb, pero para TODOS los usuarios de un rol
 * (ej. avisarle a todos los admin de una solicitud nueva). También
 * fire-and-forget.
 */
export async function crearNotificacionParaRol({ rol, tipo, titulo, mensaje }) {
  const { data: usuarios, error } = await supabaseAdmin
    .from("usuarios")
    .select("id_usuario, roles!inner(nombre)")
    .eq("roles.nombre", rol);

  if (error) {
    console.error(`❌ Error buscando usuarios con rol "${rol}":`, error.message);
    return;
  }

  await Promise.all(
    (usuarios || []).map((u) => crearNotificacionWeb({ id_usuario: u.id_usuario, tipo, titulo, mensaje }))
  );
}
