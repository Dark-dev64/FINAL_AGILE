import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import CarnetColegiado from "../components/CarnetColegiado";
import { FaMapMarkerAlt, FaShieldAlt, FaExclamationTriangle, FaRedo, FaPhone, FaEnvelope, FaIdCard } from "react-icons/fa";
import "../styles/Dashboard.css";

const ESTADOS = {
  habilitado: { label: "Habilitado", color: "green" },
  inhabilitado: { label: "Inhabilitado", color: "red" },
  con_deuda: { label: "Inhabilitado", color: "red" },
};

function DashboardColegiado() {
  const { session } = useAuth();
  const [colegiado, setColegiado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cargarColegiado = useCallback(async () => {
    if (!session?.id_usuario) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/colegiado/${session.id_usuario}`);
      setColegiado(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cargar tu información.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    cargarColegiado();
  }, [cargarColegiado]);

  const estadoInfo = colegiado ? (ESTADOS[colegiado.estado] ?? ESTADOS.inhabilitado) : null;
  const primerNombre = colegiado?.nombreCompleto?.split(" ")[0] ?? "";

  return (
    <section className="dashboard dashboard-colegiado-page">
      <div className="dashboard-column dashboard-column-wide">
        <span className="dashboard-role">Colegiado</span>

        {loading && (
          <div className="dashboard-skeleton" aria-label="Cargando tu información">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-subtitle" />
            <div className="skeleton-carnet" />
          </div>
        )}

        {error && !loading && (
          <div className="dashboard-error-card">
            <FaExclamationTriangle className="dashboard-error-icon" />
            <p>{error}</p>
            <button className="dashboard-retry-btn" onClick={cargarColegiado}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

        {colegiado && !loading && (
          <>
            <div className="dashboard-header-row">
              <div className="dashboard-welcome">
                <h1>Bienvenido/a, {primerNombre}</h1>
                <div className="dashboard-member-summary">
                  <div className="dashboard-summary-item">
                    <span className="dashboard-summary-icon">
                      <FaMapMarkerAlt />
                    </span>
                    <div>
                      <span className="dashboard-summary-label">Tu sede:</span>
                      <strong className="dashboard-summary-value">{colegiado.sede}</strong>
                    </div>
                  </div>
                  <div className="dashboard-summary-item">
                    <span className="dashboard-summary-icon">
                      <FaShieldAlt />
                    </span>
                    <div>
                      <span className="dashboard-summary-label">Tu estado es:</span>
                      <span className={`estado-indicador ${estadoInfo.color}`}>
                        <span className="estado-indicador-dot" />
                        {estadoInfo.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CarnetColegiado data={colegiado} />

            <div className="mis-datos-card">
              <h2 className="mis-datos-titulo">Mis datos personales</h2>

              <div className="mis-datos-grid">
                <div className="mis-datos-item">
                  <FaIdCard className="mis-datos-icon" />
                  <div>
                    <span className="mis-datos-label">DNI</span>
                    <span className="mis-datos-valor">{colegiado.dni}</span>
                  </div>
                </div>

                {colegiado.telefono && (
                  <div className="mis-datos-item">
                    <FaPhone className="mis-datos-icon" />
                    <div>
                      <span className="mis-datos-label">Teléfono</span>
                      <span className="mis-datos-valor">{colegiado.telefono}</span>
                    </div>
                  </div>
                )}

                {colegiado.correo && (
                  <div className="mis-datos-item">
                    <FaEnvelope className="mis-datos-icon" />
                    <div>
                      <span className="mis-datos-label">Correo</span>
                      <span className="mis-datos-valor">{colegiado.correo}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default DashboardColegiado;
