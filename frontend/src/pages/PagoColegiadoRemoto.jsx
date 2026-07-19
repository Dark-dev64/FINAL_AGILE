import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

function PagoColegiadoRemoto() {
  const { orderId } = useParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function abrirCheckout() {
      try {
        const response = await api.get(`/pagos/orden/${orderId}`);
        const orden = response.data.data;

        window.Culqi.publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY;
        window.Culqi.settings({
          currency: "PEN",
          amount: orden.amount,
          order: orden.id,
        });
        window.Culqi.options({
          lang: "es",
          installments: false,
          paymentMethods: {
            tarjeta: false,
            yape: false,
            billetera: true,
            bancaMovil: false,
            agente: false,
            cuotealo: false,
          },
        });
        window.Culqi.open();
      } catch (err) {
        setError("No se pudo cargar el pago. El link pudo haber expirado.");
      } finally {
        setCargando(false);
      }
    }
    abrirCheckout();
  }, [orderId]);

  return (
    <section className="auth-page">
      <div className="auth-form" style={{ textAlign: "center" }}>
        {cargando && <p>Cargando tu pago...</p>}
        {error && <p className="auth-error">{error}</p>}
        {!cargando && !error && <p>Completa tu pago en la ventana que se abrió.</p>}
      </div>
    </section>
  );
}

export default PagoColegiadoRemoto;