import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { subirFotoCarnet, subirTitulo } from "../services/uploadService";
import {
  FaMoneyBillWave,
  FaQrcode,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaArrowLeft,
  FaEnvelope,
  FaWhatsapp,
  FaDesktop,
} from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0; // prueba
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET; // 4.0

const METODOS = [
  { valor: "efectivo", label: "Efectivo", icono: FaMoneyBillWave },
  { valor: "mercadopago", label: "Mercado Pago", icono: FaQrcode },
];

initMercadoPago(import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY, { locale: "es-PE" });

function PagoMatricula() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { form, fotoFile, tituloFile } = location.state || {};

  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  const [procesando, setProcesando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [preferenciaMP, setPreferenciaMP] = useState(null);
  const [mostrarBrick, setMostrarBrick] = useState(false);
  const intervaloRef = useRef(null);

  const esAdmin = session?.rol === "admin";

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  if (!form) {
    navigate("/dashboard-cajero");
    return null;
  }

  const iniciarPolling = (externalReference) => {
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${externalReference}`);
        if (res.data.data.estado_pago === "pagado") {
          clearInterval(intervaloRef.current);
          setFeedback({
            type: "success",
            message: "¡Pago confirmado! Solicitud enviada al administrador.",
          });
          setTimeout(() => navigate("/dashboard-cajero"), 2500);
        }
      } catch {
        // Reintento silencioso mientras Mercado Pago confirma la transacción.
      }
    }, 3000);
  };

  const crearPreferencia = async (enviarLinkCanal) => {
    const [datosFoto, datosTitulo] = await Promise.all([
      subirFotoCarnet(fotoFile.file, form.dni),
      subirTitulo(tituloFile, form.dni),
    ]);

    const response = await api.post("/pagos/mercadopago/crear-preferencia", {
      ...form,
      id_usuario_cajero: session.id_usuario,
      foto_key: datosFoto.foto_key,
      foto_content_type: datosFoto.foto_content_type,
      foto_size_bytes: datosFoto.foto_size_bytes,
      foto_ancho_px: fotoFile.ancho,
      foto_alto_px: fotoFile.alto,
      titulo_key: datosTitulo.titulo_key,
      titulo_content_type: datosTitulo.titulo_content_type,
      titulo_size_bytes: datosTitulo.titulo_size_bytes,
      enviar_link_canal: enviarLinkCanal || null,
    });

    return response.data.data.preferencia;
  };

  const handleAbrirCheckout = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const preferencia = await crearPreferencia(false);
      setPreferenciaMP(preferencia);
      window.open(preferencia.init_point, "_blank");
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

  const handleCobrarConQR = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const preferencia = await crearPreferencia(false);
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
      const preferencia = await crearPreferencia(canal);
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
      const [datosFoto, datosTitulo] = await Promise.all([
        subirFotoCarnet(fotoFile.file, form.dni),
        subirTitulo(tituloFile, form.dni),
      ]);

      const response = await api.post("/solicitudes/con-pago", {
        ...form,
        id_usuario_cajero: session.id_usuario,
        foto_key: datosFoto.foto_key,
        foto_content_type: datosFoto.foto_content_type,
        foto_size_bytes: datosFoto.foto_size_bytes,
        foto_ancho_px: fotoFile.ancho,
        foto_alto_px: fotoFile.alto,
        titulo_key: datosTitulo.titulo_key,
        titulo_content_type: datosTitulo.titulo_content_type,
        titulo_size_bytes: datosTitulo.titulo_size_bytes,
        metodo_pago: "efectivo",
        fecha_pago: new Date(fechaPago).toISOString(),
        fecha_vencimiento: fechaPago,
      });

      setFeedback({
        type: "success",
        message: `Pago registrado y solicitud enviada al administrador (N° ${response.data.data.id_solicitud}).`,
      });
      setTimeout(() => navigate("/dashboard-cajero"), 2500);
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
    <section className="dashboard form-layout">
      <div className="pago-matricula">
        <button className="back-button" onClick={() => navigate("/dashboard-cajero")}>
          <FaArrowLeft /> Volver
        </button>

        <div className="registro-header">
          <span className="dashboard-role">Pago de matrícula</span>
          <h1>{form.nombre_completo}</h1>
          <p>DNI: {form.dni}</p>
        </div>

        <div className="pago-monto">
          <span>Monto a pagar</span>
          <strong>S/ {MONTO_MATRICULA.toFixed(2)}</strong>
          <small>Mensualidad S/ {MONTO_MENSUALIDAD.toFixed(2)} + Carnet S/ {MONTO_CARNET.toFixed(2)}</small>
        </div>

        <div className="pago-metodos">
          {METODOS.map(({ valor, label, icono: Icono }) => (
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

        {esAdmin && (
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
                amount: MONTO_MATRICULA,
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
              onReady={() => { }}
              onError={(error) => {
                console.error("Error en Brick de Mercado Pago:", error);
                setFeedback({ type: "error", message: "No se pudo cargar el pago con QR." });
              }}
              onSubmit={async ({ formData }) => {
                try {
                  await api.post("/pagos/mercadopago/procesar-pago", formData);
                  // el polling que ya está corriendo detecta el "pagado" vía webhook
                } catch (err) {
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
            disabled={procesando || feedback?.type === "success"}
          >
            {procesando ? (
              <>
                <FaSpinner className="spinning" /> Procesando...
              </>
            ) : (
              "Confirmar pago en efectivo"
            )}
          </button>
        ) : (
          !preferenciaMP &&
          !mostrarBrick && (
            <div className="pago-opciones">
              <button className="submit-button" onClick={handleCobrarConQR} disabled={procesando}>
                <FaQrcode /> Cobrar aquí con QR
              </button>
              {form.correo && (
                <button
                  className="submit-button secundario"
                  onClick={() => handleEnviarLink("correo")}
                  disabled={procesando}
                >
                  <FaEnvelope /> Enviar link al correo
                </button>
              )}
              {form.telefono && (
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
    </section>
  );
}

export default PagoMatricula;