// backend/app/api/pagos/mercadopago/procesar-pago/route.js
import { paymentClient } from "../../../../../lib/mercadopagoClient";
import { ok, fail } from "../../../../../utils/apiResponse";

export async function POST(request) {
  const formData = await request.json();

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
        external_reference: formData.preference_id, // o guarda el external_reference original
        notification_url: `${process.env.APP_URL}/api/pagos/webhook-mercadopago`,
      },
    });

    return ok({ id: pago.id, status: pago.status, status_detail: pago.status_detail });
  } catch (err) {
    console.error("❌ Error creando pago desde Brick:", err.message);
    return fail("No se pudo procesar el pago.", 500);
  }
}