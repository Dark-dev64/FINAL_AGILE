import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { preferenceClient } from "../../../../../lib/mercadopagoClient";
import { enviarLinkPagoCorreo } from "../../../../../lib/emailClient";
import { enviarWhatsApp } from "../../../../../lib/whatsappClient";

const TIPO_PAGO_LABELS = {
  inscripcion: "Matrícula",
  mensualidad: "Mensualidad",
  otro: "Otro",
};

export async function POST(request) {
  const body = await request.json();
  const idsPago = Array.isArray(body.ids_pago) ? body.ids_pago.map(Number) : [];

  if (idsPago.length === 0) {
    return fail("Debes indicar al menos un pago a cobrar.", 400);
  }

  const { data: pagos, error: errorPagos } = await supabaseAdmin
    .from("pagos")
    .select("id_pago, id_usuario_colegiado, tipo_pago, monto_total, fecha_vencimiento, estado_pago")
    .in("id_pago", idsPago);

  if (errorPagos) return fail(errorPagos.message, 500);

  if (!pagos || pagos.length !== idsPago.length) {
    return fail("Uno o más pagos no existen.", 404);
  }

  if (pagos.some((p) => p.estado_pago === "pagado")) {
    return fail("Uno o más pagos seleccionados ya están pagados.", 400);
  }

  const idColegiado = pagos[0].id_usuario_colegiado;
  if (pagos.some((p) => p.id_usuario_colegiado !== idColegiado)) {
    return fail("Todos los pagos deben pertenecer al mismo colegiado.", 400);
  }

  const { data: solicitud, error: errorSolicitud } = await supabaseAdmin
    .from("solicitudes")
    .select("nombre_completo, dni, correo, telefono")
    .eq("id_usuario_colegiado", idColegiado)
    .eq("estado_solicitud", "aprobada")
    .single();

  if (errorSolicitud || !solicitud) {
    return fail("No se encontró al colegiado de estos pagos.", 404);
  }

  const montoTotal = pagos.reduce((acc, p) => acc + Number(p.monto_total), 0);
  const externalReference = `PAGO-${solicitud.dni}-${Date.now()}`;
  const esMatricula = pagos.every((p) => p.tipo_pago === "inscripcion");
  const hayAtrasados = pagos.some((p) => p.estado_pago === "atrasado");
  const concepto = esMatricula ? "tu matrícula" : hayAtrasados ? "tu deuda pendiente" : "tu mensualidad";

  let preferencia;
  try {
    preferencia = await preferenceClient.create({
      body: {
        items: pagos.map((p) => ({
          title: `${TIPO_PAGO_LABELS[p.tipo_pago] ?? p.tipo_pago} CIP - vence ${p.fecha_vencimiento} - DNI ${solicitud.dni}`,
          quantity: 1,
          unit_price: Number(p.monto_total),
          currency_id: "PEN",
        })),
        payer: {
          name: solicitud.nombre_completo,
          email: solicitud.correo || undefined,
        },
        external_reference: externalReference,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
          pending: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
          failure: `${process.env.FRONTEND_URL}/pago-colegiado/${externalReference}`,
        },
        auto_return: "approved",
        notification_url: `${process.env.APP_URL}/api/pagos/webhook-mercadopago`,
      },
    });
  } catch (err) {
    console.error("Error creando preferencia de Mercado Pago:", err.message);
    return fail("No se pudo generar la preferencia de pago.", 500);
  }

  const { error } = await supabaseAdmin.from("ordenes_pago_pendientes").insert({
    mercadopago_preference_id: preferencia.id,
    external_reference: externalReference,
    ids_pago: idsPago,
    id_usuario_cajero: body.id_usuario_cajero || null,
    monto: montoTotal,
  });

  if (error) return fail(error.message, 500);

  if (body.enviar_link_canal) {
    const mensajeWhatsApp = `Hola ${solicitud.nombre_completo}, completa el pago de ${concepto} CIP aquí: ${preferencia.init_point}`;

    try {
      if (body.enviar_link_canal === "correo" && solicitud.correo) {
        await enviarLinkPagoCorreo(solicitud.correo, {
          nombreCompleto: solicitud.nombre_completo,
          dni: solicitud.dni,
          monto: montoTotal,
          linkPago: preferencia.init_point,
          concepto,
        });
      } else if (body.enviar_link_canal === "whatsapp" && solicitud.telefono) {
        await enviarWhatsApp(solicitud.telefono, mensajeWhatsApp);
      }
    } catch (errNotificacion) {
      console.error("Error enviando notificación de pago:", errNotificacion.message);
    }
  }

  return ok({
    preferencia: {
      id: preferencia.id,
      init_point: preferencia.init_point,
      external_reference: externalReference,
    },
  });
}
