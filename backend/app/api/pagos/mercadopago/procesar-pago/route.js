// backend/app/api/pagos/mercadopago/procesar-pago/route.js
import { paymentClient } from "../../../../../lib/mercadopagoClient";
import { ok, fail } from "../../../../../utils/apiResponse";
import { motivoRechazoLegible } from "../../../../../lib/motivosRechazoMP";

export async function POST(request) {
  const formData = await request.json();

  if (!formData.external_reference) {
    return fail("Falta la referencia externa del pago.", 400);
  }

  try {
    const pago = await paymentClient.create({
      body: {
        transaction_amount: formData.transaction_amount,
        token: formData.token,
        description: formData.description,
        installments: formData.installments,
        payment_method_id: formData.payment_method_id,
        issuer_id: formData.issuer_id,
        payer: { email: formData.payer.email },
        // IMPORTANTE: tiene que ser el external_reference que ya generamos
        // nosotros al crear la preferencia (el mismo que está guardado en
        // ordenes_pago_pendientes y que el frontend usa para hacer polling).
        // formData.preference_id NO es lo mismo -> si se usa ese, el webhook
        // nunca encuentra la orden pendiente y el pago se cobra pero el
        // sistema jamás se entera ni redirige.
        external_reference: formData.external_reference,
        notification_url: `${process.env.APP_URL}/api/pagos/webhook-mercadopago`,
      },
    });

    return ok({
      id: pago.id,
      status: pago.status,
      status_detail: pago.status_detail,
      motivo: pago.status === "rejected" ? motivoRechazoLegible(pago.status_detail) : null,
    });
  } catch (err) {
    console.error("❌ Error creando pago desde Brick:", err.message);
    return fail("No se pudo procesar el pago.", 500);
  }
}