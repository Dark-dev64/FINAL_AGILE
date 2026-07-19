import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { subirFotoCarnet, subirTitulo } from "../services/uploadService";
import { FaMoneyBillWave, FaQrcode, FaCheckCircle, FaExclamationCircle, FaSpinner } from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MATRICULA = 3.0;

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

  // Si alguien llega directo a esta URL sin pasar por el formulario, lo regresamos
  if (!form) {
    navigate("/dashboard-cajero");
    return null;
  }

  async function handleConfirmarPago() {
    setFeedback(null);
    setProcesando(true);

    try {
      // Recién AQUÍ se sube todo, al confirmar el pago
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
        metodo_pago: metodoPago,
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
            >
              <Icono />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {(metodoPago === "yape" || metodoPago === "plin") && (
          <div className="qr-placeholder">
            <FaQrcode className="qr-icon" />
            <p>Código QR de {metodoPago === "yape" ? "Yape" : "Plin"} (simulado para pruebas)</p>
          </div>
        )}

        <label className="fecha-pago-label">
          Fecha de pago
          <span className="label-hint">(editable, solo para pruebas del sistema de deuda)</span>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
          />
        </label>

        {feedback && (
          <div className={`registro-feedback ${feedback.type}`}>
            {feedback.type === "success" ? <FaCheckCircle /> : <FaExclamationCircle />}
            {feedback.message}
          </div>
        )}

        <button
          className="submit-button"
          onClick={handleConfirmarPago}
          disabled={procesando || feedback?.type === "success"}
        >
          {procesando ? (
            <>
              <FaSpinner className="spinning" />
              Procesando pago...
            </>
          ) : (
            "Confirmar pago y enviar solicitud"
          )}
        </button>
      </div>
    </section>
  );
}

export default PagoMatricula;