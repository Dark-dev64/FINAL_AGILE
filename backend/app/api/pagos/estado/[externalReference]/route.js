import { supabaseAdmin } from "../../../../../lib/supabaseClient";
import { ok } from "../../../../../utils/apiResponse";

const MOTIVOS_RECHAZO = {
  cc_rejected_insufficient_amount: "Fondos insuficientes.",
  cc_rejected_bad_filled_card_number: "Número de tarjeta incorrecto.",
  cc_rejected_bad_filled_date: "Fecha de vencimiento incorrecta.",
  cc_rejected_bad_filled_security_code: "Código de seguridad incorrecto.",
  cc_rejected_bad_filled_other: "Datos de la tarjeta incorrectos.",
  cc_rejected_call_for_authorize: "Debes autorizar el pago con tu banco o billetera.",
  cc_rejected_card_disabled: "La tarjeta o cuenta está deshabilitada para este pago.",
  cc_rejected_duplicated_payment: "Ya existe un pago igual muy reciente.",
  cc_rejected_high_risk: "El pago fue rechazado por seguridad.",
  cc_rejected_insufficient_data: "Faltan datos para procesar el pago.",
  cc_rejected_invalid_installments: "Cantidad de cuotas no válida.",
  cc_rejected_max_attempts: "Se alcanzó el máximo de intentos permitidos.",
  cc_rejected_other_reason: "El medio de pago rechazó la operación.",
};

export async function GET(request, { params }) {
  const { externalReference } = await params;

  const { data: ordenTemp } = await supabaseAdmin
    .from("ordenes_pago_pendientes")
    .select("estado, motivo_rechazo")
    .eq("external_reference", externalReference)
    .maybeSingle();

  if (!ordenTemp) {
    return ok({ estado_pago: "pagado" });
  }

  if (ordenTemp.estado === "rechazado") {
    return ok({
      estado_pago: "rechazado",
      motivo: MOTIVOS_RECHAZO[ordenTemp.motivo_rechazo] || "El pago fue rechazado por Mercado Pago.",
      motivo_codigo: ordenTemp.motivo_rechazo,
    });
  }

  return ok({ estado_pago: "pendiente" });
}
