import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { crearNotificacionParaRol } from "../../../../../lib/notificacionesWeb";
import { enviarComprobantePago } from "../../../../../utils/comprobantePago";

const MONTO_MATRICULA = 4.0;

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const camposRequeridos = ["id_usuario_cajero", "metodo_pago", "fecha_pago", "fecha_vencimiento"];
    for (const campo of camposRequeridos) {
      if (!body[campo]) {
        return fail(`El campo "${campo}" es requerido.`);
      }
    }

    if (!["efectivo", "yape", "plin"].includes(body.metodo_pago)) {
      return fail("Método de pago inválido.");
    }

    // 1. Insertar el pago en la tabla pagos
    const { data: pago, error: errorPago } = await supabaseAdmin
      .from("pagos")
      .insert({
        id_solicitud: id,
        id_usuario_cajero: body.id_usuario_cajero,
        tipo_pago: "inscripcion",
        metodo_pago: body.metodo_pago,
        monto_base: MONTO_MATRICULA,
        porcentaje_recargo: 0,
        fecha_vencimiento: body.fecha_vencimiento,
        fecha_pago: body.fecha_pago,
        estado_pago: "pagado",
      })
      .select()
      .single();

    if (errorPago) {
      console.error("❌ Error registrando el pago en efectivo:", errorPago.message);
      return fail(errorPago.message, 500);
    }

    // 2. Actualizar el estado de la solicitud
    const { data: solicitud, error: errorSolicitud } = await supabaseAdmin
      .from("solicitudes")
      .update({ estado_solicitud: "pendiente" })
      .eq("id_solicitud", id)
      .select()
      .single();

    if (errorSolicitud) {
      console.error("❌ Error actualizando estado de solicitud a pendiente:", errorSolicitud.message);
      return fail(errorSolicitud.message, 500);
    }

    // 3. Enviar comprobante de pago por correo (Gmail) / WhatsApp
    enviarComprobantePago({
      nombreCompleto: solicitud.nombre_completo,
      dni: solicitud.dni,
      correo: solicitud.correo || null,
      telefono: solicitud.telefono || null,
      metodoPago: body.metodo_pago,
      monto: MONTO_MATRICULA,
      orderNumber: `MATRICULA-${id}`,
    }).catch((err) => console.error("❌ Error inesperado enviando comprobante:", err.message));

    // 4. Notificar al administrador
    crearNotificacionParaRol({
      rol: "admin",
      tipo: "solicitud_nueva",
      titulo: "Nueva solicitud de colegiatura",
      mensaje: `${solicitud.nombre_completo} (DNI ${solicitud.dni}) registró una nueva solicitud, pendiente de revisión.`,
    }).catch((err) => console.error("❌ Error inesperado creando notificación web:", err.message));

    return ok({ id_solicitud: id });
  } catch (error) {
    console.error("❌ Error en confirmar-pago:", error);
    return fail("Error interno del servidor.", 500);
  }
}
