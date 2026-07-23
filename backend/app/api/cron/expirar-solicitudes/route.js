import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { crearNotificacionWeb } from "../../../../../lib/notificacionesWeb";

export async function GET(request) {
  return expirarSolicitudes(request);
}

export async function POST(request) {
  return expirarSolicitudes(request);
}

async function expirarSolicitudes(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "cron-secret-123";
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn("⚠️ Intento de ejecución de cron no autorizado.");
      return fail("No autorizado", 401);
    }

    const limiteExpiracion = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: solicitudesExpiradas, error: errorBusqueda } = await supabaseAdmin
      .from("solicitudes")
      .select("id_solicitud, id_usuario_cajero, dni, nombre_completo")
      .eq("estado_solicitud", "pendiente_pago")
      .lt("creada_en", limiteExpiracion);

    if (errorBusqueda) {
      console.error("❌ Error buscando solicitudes expiradas:", errorBusqueda.message);
      return fail(errorBusqueda.message, 500);
    }

    console.log(`🧹 Cron: se encontraron ${solicitudesExpiradas.length} solicitudes expiradas por falta de pago.`);

    for (const solicitud of solicitudesExpiradas) {
      try {
        // 1. Notificar al cajero correspondiente
        await crearNotificacionWeb({
          id_usuario: solicitud.id_usuario_cajero,
          tipo: "solicitud_expirada",
          titulo: "Solicitud expirada",
          mensaje: `La solicitud de matrícula de ${solicitud.nombre_completo} (DNI ${solicitud.dni}) expiró por falta de pago.`,
        });

        // 2. Eliminar de ordenes_pago_pendientes (para evitar FK error si no hay ON DELETE CASCADE)
        await supabaseAdmin
          .from("ordenes_pago_pendientes")
          .delete()
          .eq("id_solicitud", solicitud.id_solicitud);

        // 3. Eliminar de solicitudes
        await supabaseAdmin
          .from("solicitudes")
          .delete()
          .eq("id_solicitud", solicitud.id_solicitud);

        console.log(`🗑️ Solicitud de matrícula ${solicitud.id_solicitud} eliminada.`);
      } catch (errDetalle) {
        console.error(`❌ Error al procesar expiración de solicitud ${solicitud.id_solicitud}:`, errDetalle.message);
      }
    }

    return ok({ procesadas: solicitudesExpiradas.length });
  } catch (error) {
    console.error("❌ Error en cron expirar-solicitudes:", error);
    return fail("Error interno del servidor.", 500);
  }
}
