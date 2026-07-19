import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { subirFotoCarnet, subirTitulo } from "../services/uploadService";
import { FaMoneyBillWave, FaQrcode, FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MATRICULA = 6.00;

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
  const [idSolicitudCreada, setIdSolicitudCreada] = useState(null);
  const intervaloRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(intervaloRef.current); // limpieza al salir de la pantalla
  }, []);

  // Si alguien llega directo a esta URL sin pasar por el formulario, lo regresamos
  if (!form) {
    navigate("/dashboard-cajero");
    return null;
  }

  function iniciarPolling(culqiOrderId) {
    intervaloRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${culqiOrderId}`);
        if (res.data.data.estado_pago === "pagado") {
          clearInterval(intervaloRef.current);
          setFeedback({ type: "success", message: "¡Pago confirmado! Solicitud enviada al administrador." });
          setTimeout(() => navigate("/dashboard-cajero"), 2500);
        }
      } catch (err) {
        // silenciosamente reintenta en el siguiente ciclo
      }
    }, 3000);
  }

  async function handleGenerarQR() {
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
      });

      const orden = responseOrden.data.data.orden;
      setOrdenCulqi(orden);

      // Configura y abre el Checkout de Culqi para esta orden específica
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
          billetera: true,    // ← este es el que genera el QR real
          bancaMovil: false,
          agente: false,
          cuotealo: false,
        },
      });

      window.Culqi.open();

      iniciarPolling(orden.id);
    } catch (err) {
      setFeedback({ type: "error", message: err.response?.data?.error || "No se pudo generar el QR." });
    } finally {
      setProcesando(false);
    }
  }

async function handleEnviarLink() {
  setFeedback(null);
  setProcesando(true);

  try {
    const [datosFoto, datosTitulo] = await Promise.all([
      subirFotoCarnet(fotoFile.file, form.dni),
      subirTitulo(tituloFile, form.dni),
    ]);

    // Reutilizamos el mismo endpoint de crear-orden, no el de Links
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
      enviar_link: true, // le decimos al backend que además del QR local, mande el link
    });

    setFeedback({ type: "success", message: `Link enviado a ${form.correo || form.telefono}. Esperando su pago...` });
    iniciarPolling(responseOrden.data.data.orden.id);
  } catch (err) {
    setFeedback({ type: "error", message: err.response?.data?.error || "No se pudo enviar el link." });
  } finally {
    setProcesando(false);
  }
}

  async function handleConfirmarEfectivo() {
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
      const mensaje = err.response?.data?.error || "No se pudo procesar el pago.";
      setFeedback({ type: "error", message: mensaje });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <section className="dashboard form-layout">
      <div className="pago-matricula">
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
            >
              <Icono />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {ordenCulqi && (
          <div className="qr-placeholder">
            <p>Completa el pago en la ventana de Culqi que se abrió. Esperando confirmación...</p>
          </div>
        )}

        <label className="fecha-pago-label">
          Fecha de pago
          <span className="label-hint">(editable, solo para pruebas del sistema de deuda)</span>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            disabled={procesando || !!ordenCulqi}
          />
        </label>

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
                <FaSpinner className="spinning" />
                Procesando pago...
              </>
            ) : (
              "Confirmar pago en efectivo"
            )}
          </button>
        ) : (
          !ordenCulqi && (
            <div className="pago-opciones">
              <button className="submit-button" onClick={handleGenerarQR} disabled={procesando}>
                {procesando ? "Generando..." : "Mostrar QR en pantalla"}
              </button>
              <button className="submit-button secundario" onClick={handleEnviarLink} disabled={procesando}>
                {procesando ? "Enviando..." : `Enviar link a su ${form.correo ? "correo" : "WhatsApp"}`}
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}

export default PagoMatricula;