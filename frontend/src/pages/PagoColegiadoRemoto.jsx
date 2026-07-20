import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../services/api";
import {
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaUniversity,
} from "react-icons/fa";
import "../styles/PagoColegiadoRemoto.css";

function PagoColegiadoRemoto() {
  const { orderId: externalReference } = useParams();
  const [searchParams] = useSearchParams();
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [pagado, setPagado] = useState(false);

  useEffect(() => {
    const status = searchParams.get("status");

    if (status === "approved") {
      const confirmacion = setTimeout(() => {
        setPagado(true);
        setCargando(false);
      }, 0);
      return () => clearTimeout(confirmacion);
    }

    if (status === "rejected") {
      const rechazo = setTimeout(() => {
        setError("El pago no se pudo completar. Intenta nuevamente o contacta al cajero.");
        setCargando(false);
      }, 0);
      return () => clearTimeout(rechazo);
    }

    const intervalo = setInterval(async () => {
      try {
        const res = await api.get(`/pagos/estado/${externalReference}`);
        if (res.data.data.estado_pago === "pagado") {
          clearInterval(intervalo);
          setPagado(true);
          setCargando(false);
        }
      } catch {
        // Reintento silencioso mientras Mercado Pago confirma la transacción.
      }
    }, 3000);

    return () => clearInterval(intervalo);
  }, [externalReference, searchParams]);

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
            <p>Estamos verificando la confirmación de tu pago...</p>
          </div>
        )}

        {error && (
          <div className="remoto-feedback error">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
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
