import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  FaPaperPlane,
  FaDesktop,
} from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MATRICULA = 6.0;

const METODOS = [
  { valor: "efectivo", label: "Efectivo", icono: FaMoneyBillWave },
  { valor: "mercadopago", label: "Mercado Pago", icono: FaQrcode },
];

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

  const crearPreferencia = async (enviarLink) => {
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
      enviar_link: enviarLink,
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

  const handleEnviarLink = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const preferencia = await crearPreferencia(true);
      setPreferenciaMP(preferencia);
      const destino = form.correo ? "correo" : "WhatsApp";
      setFeedback({
        type: "success",
        message: `Link de pago enviado a su ${destino}. Esperando confirmación...`,
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

        {preferenciaMP && (
          <div className="qr-placeholder">
            <FaQrcode className="qr-icon pulse" />
            <p>Completa el pago en Mercado Pago. Esperando confirmación...</p>
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
          !preferenciaMP && (
            <div className="pago-opciones">
              <button className="submit-button" onClick={handleAbrirCheckout} disabled={procesando}>
                <FaDesktop /> Pagar con Mercado Pago
              </button>
              <button className="submit-button secundario" onClick={handleEnviarLink} disabled={procesando}>
                <FaPaperPlane /> Enviar link {form.correo ? "al correo" : "por WhatsApp"}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default PagoMatricula;
