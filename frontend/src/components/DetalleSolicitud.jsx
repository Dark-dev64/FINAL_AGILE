import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaTimes,
  FaCheckCircle,
  FaBan,
  FaSpinner,
  FaFilePdf,
  FaIdCard,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaPhone,
  FaEnvelope,
  FaExclamationTriangle,
  FaRedo,
  FaUserCircle,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileAlt,
  FaCommentDots,
} from "react-icons/fa";
import "../styles/DetalleSolicitud.css";

const ESTADO_LABELS = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

function DetalleSolicitud({ idSolicitud, onClose }) {
  const { session } = useAuth();
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(null); // "aprobada" | "rechazada" | null
  const [observacion, setObservacion] = useState("");

  const cargarDetalle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/solicitudes/${idSolicitud}`);
      setDetalle(response.data.data);
    } catch (err) {
      setError("No se pudo cargar el detalle.");
    } finally {
      setLoading(false);
    }
  }, [idSolicitud]);

  useEffect(() => {
    cargarDetalle();
  }, [cargarDetalle]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciarConfirmacion(nuevoEstado) {
    setError(null);
    setObservacion("");
    setConfirmando(nuevoEstado);
  }

  function cancelarConfirmacion() {
    setConfirmando(null);
    setObservacion("");
  }

  async function confirmarAccion(nuevoEstado) {
    if (nuevoEstado === "rechazada" && !observacion.trim()) {
      setError("Debes escribir una observación para rechazar la solicitud.");
      return;
    }

    setProcesando(true);
    try {
      await api.patch(`/solicitudes/${idSolicitud}`, {
        estado_solicitud: nuevoEstado,
        ...(nuevoEstado === "rechazada" && {
          observacion: observacion.trim(),
          id_usuario_admin: session?.id_usuario,
        }),
      });
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el estado.");
      setProcesando(false);
      setConfirmando(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => onClose(false)} aria-label="Cerrar">
          <FaTimes />
        </button>

        {loading && (
          <div className="detalle-skeleton">
            <div className="skeleton-detalle-header">
              <div className="skeleton-box skeleton-foto" />
              <div className="skeleton-lines">
                <div className="skeleton-line" style={{ width: "60%", height: "1.2rem" }} />
                <div className="skeleton-line" style={{ width: "40%" }} />
              </div>
            </div>
            <div className="skeleton-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div className="skeleton-line" key={i} style={{ height: "2.5rem" }} />
              ))}
            </div>
          </div>
        )}

        {error && !loading && !confirmando && (
          <div className="dashboard-error-card">
            <FaExclamationTriangle className="dashboard-error-icon" />
            <p>{error}</p>
            <button className="dashboard-retry-btn" onClick={cargarDetalle}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

        {detalle && !loading && (
          <>
            {/* ===== HEADER ===== */}
            <div className="detalle-header">
              {detalle.foto_url_temporal ? (
                <img src={detalle.foto_url_temporal} alt="Foto carnet" className="detalle-foto" />
              ) : (
                <div className="detalle-foto detalle-foto-placeholder">
                  <FaUserCircle />
                </div>
              )}
              <div>
                <h2>{detalle.apellido_paterno} {detalle.apellido_materno}</h2>
                <p className="detalle-nombre">{detalle.nombre_completo}</p>
                <span className={`estado-badge ${detalle.estado_solicitud}`}>
                  {ESTADO_LABELS[detalle.estado_solicitud] ?? detalle.estado_solicitud}
                </span>
              </div>
            </div>

            {/* ===== DATOS PERSONALES ===== */}
            <section className="detalle-seccion">
              <h3 className="detalle-seccion-titulo">
                <FaIdCard /> Datos personales
              </h3>
              <div className="detalle-grid">
                <div>
                  <span>DNI</span>
                  <strong>{detalle.dni}</strong>
                </div>
                <div>
                  <span><FaGraduationCap /> Especialidad</span>
                  <strong>{detalle.especialidades?.nombre_especialidad ?? "—"}</strong>
                </div>
                <div>
                  <span><FaMapMarkerAlt /> Sede</span>
                  <strong>{detalle.sedes?.nombre} — {detalle.sedes?.ciudad}</strong>
                </div>
                <div>
                  <span>N° Registro CIP</span>
                  <strong>{detalle.numero_registro ?? "Pendiente de aprobación"}</strong>
                </div>
              </div>
            </section>

            {/* ===== CONTACTO ===== */}
            <section className="detalle-seccion">
              <h3 className="detalle-seccion-titulo">
                <FaPhone /> Contacto
              </h3>
              <div className="detalle-grid">
                <div>
                  <span><FaPhone /> Teléfono</span>
                  <strong>{detalle.telefono ?? "—"}</strong>
                </div>
                <div>
                  <span><FaEnvelope /> Correo</span>
                  <strong>{detalle.correo ?? "—"}</strong>
                </div>
              </div>
            </section>

            {/* ===== PAGO ===== */}
            <section className="detalle-seccion">
              <h3 className="detalle-seccion-titulo">
                <FaMoneyBillWave /> Pago de matrícula
              </h3>

              {detalle.pagos?.length > 0 ? (
                detalle.pagos.map((pago) => (
                  <div className="detalle-pago-card" key={pago.id_pago}>
                    <div className="detalle-pago-monto">
                      <span>Monto pagado</span>
                      <strong>S/ {pago.monto_total}</strong>
                    </div>
                    <div className="detalle-pago-detalles">
                      <div>
                        <span>Método</span>
                        <strong>{pago.metodo_pago}</strong>
                      </div>
                      <div>
                        <span><FaCalendarAlt /> Fecha</span>
                        <strong>{new Date(pago.fecha_pago).toLocaleDateString()}</strong>
                      </div>
                      <div>
                        <span>Estado</span>
                        <strong className={`pago-estado-${pago.estado_pago}`}>
                          {pago.estado_pago}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="lista-estado detalle-sin-pago">Sin información de pago.</p>
              )}
            </section>

            {/* ===== DOCUMENTOS ===== */}
            {detalle.titulo_url_temporal && (
              <section className="detalle-seccion">
                <h3 className="detalle-seccion-titulo">
                  <FaFileAlt /> Documentos
                </h3>
                <a
                  href={detalle.titulo_url_temporal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detalle-titulo-link"
                >
                  <FaFilePdf /> Ver título profesional
                </a>
              </section>
            )}

            {/* ===== ACCIONES ===== */}
            {detalle.estado_solicitud === "pendiente" && session?.rol === "admin" && (
              <div className="detalle-acciones-wrapper">
                {confirmando === null && (
                  <div className="detalle-acciones">
                    <button
                      className="btn-rechazar"
                      onClick={() => iniciarConfirmacion("rechazada")}
                      disabled={procesando}
                    >
                      <FaBan /> Rechazar
                    </button>
                    <button
                      className="btn-aprobar"
                      onClick={() => iniciarConfirmacion("aprobada")}
                      disabled={procesando}
                    >
                      <FaCheckCircle /> Aprobar
                    </button>
                  </div>
                )}

                {confirmando && (
                  <div className={`detalle-confirmacion ${confirmando}`}>
                    <p>
                      {confirmando === "aprobada"
                        ? `¿Confirmas aprobar la solicitud de ${detalle.nombre_completo}? Se generará su carnet y credenciales de acceso.`
                        : `¿Confirmas rechazar la solicitud de ${detalle.nombre_completo}? Esta acción no se puede deshacer.`}
                    </p>

                    {confirmando === "rechazada" && (
                      <div className="observacion-flotante">
                        <div className="observacion-flotante-header">
                          <FaCommentDots />
                          <span>Agregar Observación <span className="observacion-required">*</span></span>
                        </div>
                        <textarea
                          className="observacion-textarea"
                          rows={4}
                          placeholder="Explica el motivo del rechazo (ej: foto no cumple el formato tipo carnet, documentos ilegibles, datos incompletos)..."
                          value={observacion}
                          onChange={(e) => setObservacion(e.target.value)}
                          disabled={procesando}
                          autoFocus
                        />
                        <span className="observacion-hint">
                          Esta observación se enviará al solicitante por correo y WhatsApp.
                        </span>
                      </div>
                    )}

                    {error && (
                      <div className="detalle-confirmacion-error">
                        <FaExclamationTriangle /> {error}
                      </div>
                    )}

                    <div className="detalle-confirmacion-botones">
                      <button
                        className="btn-cancelar-confirmacion"
                        onClick={cancelarConfirmacion}
                        disabled={procesando}
                      >
                        Cancelar
                      </button>
                      <button
                        className={confirmando === "aprobada" ? "btn-aprobar" : "btn-rechazar"}
                        onClick={() => confirmarAccion(confirmando)}
                        disabled={
                          procesando || (confirmando === "rechazada" && !observacion.trim())
                        }
                      >
                        {procesando ? (
                          <FaSpinner className="spinning" />
                        ) : confirmando === "aprobada" ? (
                          <FaCheckCircle />
                        ) : (
                          <FaBan />
                        )}
                        {procesando ? "Procesando..." : "Sí, confirmar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DetalleSolicitud;