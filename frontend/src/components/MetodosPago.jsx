import { useState, useEffect, useRef } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import api from "../services/api";
import {
  FaMoneyBillWave,
  FaQrcode,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaEnvelope,
  FaWhatsapp,
} from "react-icons/fa";

const METODOS = [
  { valor: "efectivo", label: "Efectivo", icono: FaMoneyBillWave },
  { valor: "mercadopago", label: "Mercado Pago", icono: FaQrcode },
];

initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, { locale: "es-PE" });

/**
 * Encapsula la elección de método de pago (efectivo / Mercado Pago QR / enviar
 * link por correo o WhatsApp), el polling de confirmación y el Brick de pago.
 * El caller decide QUÉ se está pagando (monto, y qué hacer al confirmar).
 */
function MetodosPago({
  monto,
  onConfirmarEfectivo,
  onCrearPreferenciaMP,
  onExito,
  mostrarSelectorFecha = false,
  correoDisponible = false,
  telefonoDisponible = false,
  textoBotonEfectivo = "Confirmar pago",
  textoBotonQR = "Cobrar aquí con QR",
  deshabilitarEfectivo = false,
  mensajeExitoPolling = "¡Pago confirmado!",
  detalleMonto = null,
  metodosPermitidos = ["efectivo", "mercadopago"],
}) {
  const metodosMostrados = METODOS.filter((m) => metodosPermitidos.includes(m.valor));
  const [metodoPago, setMetodoPago] = useState(metodosPermitidos[0] || "efectivo");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [procesando, setProcesando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [preferenciaMP, setPreferenciaMP] = useState(null);
  const [mostrarBrick, setMostrarBrick] = useState(false);
  const intervaloRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  const iniciarPolling = (externalReference) => {
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${externalReference}`);
        const { estado_pago, motivo, motivo_codigo } = res.data.data;

        if (estado_pago === "pagado") {
          clearInterval(intervaloRef.current);
          setFeedback({ type: "success", message: mensajeExitoPolling });
          onExito?.();
        } else if (estado_pago === "rechazado") {
          clearInterval(intervaloRef.current);
          setFeedback({
            type: "error",
            message: `Mercado Pago rechazó el pago: ${motivo}${motivo_codigo ? ` (${motivo_codigo})` : ""} Puedes intentar de nuevo.`,
          });
          setPreferenciaMP(null);
          setMostrarBrick(false);
        }
      } catch {
        // Reintento silencioso mientras Mercado Pago confirma la transacción.
      }
    }, 3000);
  };

  const handleCobrarConQR = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const preferencia = await onCrearPreferenciaMP(false);
      setPreferenciaMP(preferencia);
      setMostrarBrick(true);
      iniciarPolling(preferencia.external_reference);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || err.message || "No se pudo generar el pago.",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleEnviarLink = async (canal) => {
    setFeedback(null);
    setProcesando(true);
    try {
      const preferencia = await onCrearPreferenciaMP(canal);
      setPreferenciaMP(preferencia);
      const destino = canal === "correo" ? "correo" : "WhatsApp";
      setFeedback({
        type: "success",
        message: `Link de pago enviado por ${destino}. Esperando confirmación...`,
      });
      iniciarPolling(preferencia.external_reference);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || "No se pudo enviar el link.",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarEfectivo = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const resultado = await onConfirmarEfectivo(fechaPago);
      setFeedback({ type: "success", message: resultado?.message || "Pago registrado." });
      onExito?.();
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || "No se pudo procesar el pago.",
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="metodos-pago">
      <div className="pago-monto">
        <span>Monto a pagar</span>
        <strong>S/ {Number(monto).toFixed(2)}</strong>
        {detalleMonto && <small>{detalleMonto}</small>}
      </div>

      {metodosMostrados.length > 1 && (
        <div className="pago-metodos">
          {metodosMostrados.map(({ valor, label, icono: Icono }) => (
            <button
              key={valor}
              type="button"
              className={`metodo-card ${metodoPago === valor ? "activo" : ""}`}
              onClick={() => setMetodoPago(valor)}
              disabled={procesando || !!preferenciaMP}
              aria-pressed={metodoPago === valor}
            >
              <Icono />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}

      {mostrarSelectorFecha && (
        <label className="fecha-pago-label">
          Fecha de pago (prueba de sistema de deuda)
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            disabled={procesando || !!preferenciaMP}
          />
        </label>
      )}

      {preferenciaMP && !mostrarBrick && (
        <div className="qr-placeholder">
          <FaQrcode className="qr-icon pulse" />
          <p>Completa el pago en Mercado Pago. Esperando confirmación...</p>
        </div>
      )}

      {mostrarBrick && preferenciaMP && (
        <div className="qr-placeholder">
          <Payment
            initialization={{
              amount: Number(monto),
              preferenceId: preferenciaMP.id,
            }}
            customization={{
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                bankTransfer: "all",
                digitalWallet: "all",
                ticket: "excluded",
                mercadoPago: "all",
              },
            }}
            onReady={() => {}}
            onError={(error) => {
              console.error("Error en Brick de Mercado Pago:", error);
              setFeedback({ type: "error", message: "No se pudo cargar el pago con QR." });
            }}
            onSubmit={async ({ formData }) => {
              try {
                await api.post("/pagos/mercadopago/procesar-pago", formData);
                // el polling que ya está corriendo detecta el "pagado" vía webhook
              } catch {
                setFeedback({ type: "error", message: "No se pudo procesar el pago con QR." });
              }
            }}
          />
          <p>Escanea el QR con tu billetera digital para completar el pago.</p>
        </div>
      )}

      {feedback && (
        <div className={`registro-feedback ${feedback.type}`}>
          {feedback.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
          {feedback.message}
        </div>
      )}

      {metodoPago === "efectivo" ? (
        <button
          className="submit-button"
          onClick={handleConfirmarEfectivo}
          disabled={procesando || deshabilitarEfectivo || feedback?.type === "success"}
        >
          {procesando ? (
            <>
              <FaSpinner className="spinning" /> Procesando...
            </>
          ) : (
            textoBotonEfectivo
          )}
        </button>
      ) : (
        !preferenciaMP &&
        !mostrarBrick && (
          <div className="pago-opciones">
            <button className="submit-button" onClick={handleCobrarConQR} disabled={procesando}>
              <FaQrcode /> {textoBotonQR}
            </button>
            {correoDisponible && (
              <button
                className="submit-button secundario"
                onClick={() => handleEnviarLink("correo")}
                disabled={procesando}
              >
                <FaEnvelope /> Enviar link al correo
              </button>
            )}
            {telefonoDisponible && (
              <button
                className="submit-button secundario whatsapp"
                onClick={() => handleEnviarLink("whatsapp")}
                disabled={procesando}
              >
                <FaWhatsapp /> Enviar link por WhatsApp
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default MetodosPago;
