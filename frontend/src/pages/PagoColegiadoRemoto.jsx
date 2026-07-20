import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FaMoneyBillWave,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaRedo,
  FaUniversity,
} from "react-icons/fa";
import "../styles/PagoColegiadoRemoto.css"; // nuevo archivo de estilos

function PagoColegiadoRemoto() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);
  const [pagado, setPagado] = useState(false);
  const intervaloRef = useRef(null);

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  const iniciarPolling = (culqiOrderId) => {
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${culqiOrderId}`);
        if (res.data.data.estado_pago === "pagado") {
          clearInterval(intervaloRef.current);
          setPagado(true);
        }
      } catch (err) {
        // reintento silencioso
      }
    }, 3000);
  };

  const abrirCheckout = async () => {
    setCargando(true);
    setError(null);
    try {
      const response = await api.get(`/pagos/orden/${orderId}`);
      const ordenData = response.data.data;
      setOrden(ordenData);

      // Verificar que el script de Culqi esté disponible
      if (!window.Culqi) {
        setError("El servicio de pago no está disponible en este momento. Intenta de nuevo más tarde.");
        setCargando(false);
        return;
      }

      window.Culqi.publicKey = import.meta.env.VITE_CULQI_PUBLIC_KEY;
      window.Culqi.settings({
        currency: "PEN",
        amount: ordenData.amount,
        order: ordenData.id,
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

      // Evento opcional: si Culqi lanza algún error al abrir
      window.Culqi.open();
      iniciarPolling(ordenData.id);
    } catch (err) {
      setError("No se pudo cargar tu pago. El enlace puede haber expirado.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    abrirCheckout();
  }, [orderId]);

  // Manejo de reintento manual
  const handleRetry = () => {
    abrirCheckout();
  };

  return (
    <section className="remoto-page">
      <div className="remoto-card">
        <div className="remoto-header">
          <FaUniversity className="remoto-logo" />
          <h1>Pago de Matrícula</h1>
        </div>

        {cargando && (
          <div className="remoto-loading">
            <FaSpinner className="spinning" />
            <p>Cargando tu pago...</p>
          </div>
        )}

        {error && (
          <div className="remoto-feedback error">
            <FaExclamationCircle />
            <span>{error}</span>
            <button className="remoto-retry-btn" onClick={handleRetry}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

        {!cargando && !error && orden && !pagado && (
          <>
            <div className="remoto-info">
              <div className="remoto-monto">
                <FaMoneyBillWave />
                <span>Monto a pagar</span>
                <strong>S/ {orden.amount.toFixed(2)}</strong>
              </div>
              <p className="remoto-orden">Orden: #{orden.id}</p>
            </div>
            <p className="remoto-instruccion">
              Completa tu pago en la ventana que se abrió. Si no se abrió,{" "}
              <button className="link-btn" onClick={handleRetry}>
                haz clic aquí
              </button>
            </p>
          </>
        )}

        {pagado && (
          <div className="remoto-feedback success">
            <FaCheckCircle />
            <span>¡Pago realizado con éxito!</span>
            <p>Gracias por tu matrícula. Puedes cerrar esta página.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default PagoColegiadoRemoto;