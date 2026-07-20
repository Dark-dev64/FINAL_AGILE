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
  { valor: "yape", label: "Yape (QR)", icono: FaQrcode },
  { valor: "plin", label: "Plin (QR)", icono: FaQrcode },
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
  const [ordenCulqi, setOrdenCulqi] = useState(null);
  const intervaloRef = useRef(null);

  // Mostrar fecha solo si el usuario tiene rol administrador (ajusta según tu lógica)
  const esAdmin = session?.rol === "admin";

  // Limpiar intervalo al desmontar
  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  // Protección de ruta
  if (!form) {
    navigate("/dashboard-cajero");
    return null;
  }

  const iniciarPolling = (culqiOrderId) => {
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${culqiOrderId}`);
        if (res.data.data.estado_pago === "pagado") {
          clearInterval(intervaloRef.current);
          setFeedback({
            type: "success",
            message: "¡Pago confirmado! Solicitud enviada al administrador.",
          });
          setTimeout(() => navigate("/dashboard-cajero"), 2500);
        }
      } catch (err) {
        // reintento silencioso
      }
    }, 3000);
  };

  const handleGenerarQR = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      // Verificar Culqi
      if (!window.Culqi) {
        throw new Error("El servicio de pago no está disponible.");
      }

      const [datosFoto, datosTitulo] = await Promise.all([
        subirFotoCarnet(fotoFile.file, form.dni),
        subirTitulo(tituloFile, form.dni),
      ]);

      const responseOrden = await api.post("/pagos/culqi/crear-orden", {
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
      });

      const orden = responseOrden.data.data.orden;
      setOrdenCulqi(orden);

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
      iniciarPolling(orden.id);
    } catch (err) {
      setFeedback({
        type: "error",
        message: err.response?.data?.error || err.message || "No se pudo generar el QR.",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleEnviarLink = async () => {
    setFeedback(null);
    setProcesando(true);
    try {
      const [datosFoto, datosTitulo] = await Promise.all([
        subirFotoCarnet(fotoFile.file, form.dni),
        subirTitulo(tituloFile, form.dni),
      ]);

      const responseOrden = await api.post("/pagos/culqi/crear-orden", {
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
        enviar_link: true,
      });

      const orden = responseOrden.data.data.orden;
      setOrdenCulqi(orden);
      const destino = form.correo ? "correo" : "WhatsApp";
      setFeedback({
        type: "success",
        message: `Link de pago enviado a su ${destino}. Esperando confirmación...`,
      });
      iniciarPolling(orden.id);
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
              disabled={procesando || !!ordenCulqi}
              aria-pressed={metodoPago === valor}
            >
              <Icono />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Solo visible para administradores */}
        {esAdmin && (
          <label className="fecha-pago-label">
            Fecha de pago (prueba de sistema de deuda)
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              disabled={procesando || !!ordenCulqi}
            />
          </label>
        )}

        {ordenCulqi && (
          <div className="qr-placeholder">
            <FaQrcode className="qr-icon pulse" />
            <p>Completa el pago en la ventana de Culqi. Esperando confirmación...</p>
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
          !ordenCulqi && (
            <div className="pago-opciones">
              <button className="submit-button" onClick={handleGenerarQR} disabled={procesando}>
                <FaDesktop /> Mostrar QR en pantalla
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