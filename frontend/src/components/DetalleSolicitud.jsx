import { useState, useEffect } from "react";
import api from "../services/api";
import { FaTimes, FaCheckCircle, FaBan, FaSpinner, FaFilePdf } from "react-icons/fa";
import "../styles/DetalleSolicitud.css";

function DetalleSolicitud({ idSolicitud, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarDetalle() {
      setLoading(true);
      try {
        const response = await api.get(`/solicitudes/${idSolicitud}`);
        setDetalle(response.data.data);
      } catch (err) {
        setError("No se pudo cargar el detalle.");
      } finally {
        setLoading(false);
      }
    }
    cargarDetalle();
  }, [idSolicitud]);

  async function actualizarEstado(nuevoEstado) {
    setProcesando(true);
    try {
      await api.patch(`/solicitudes/${idSolicitud}`, { estado_solicitud: nuevoEstado });
      onClose(true); // true = recargar la lista
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo actualizar el estado.");
      setProcesando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={() => onClose(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={() => onClose(false)}>
          <FaTimes />
        </button>

        {loading && <p className="lista-estado">Cargando detalle...</p>}
        {error && <p className="lista-estado error">{error}</p>}

        {detalle && (
          <>
            <div className="detalle-header">
              {detalle.foto_url_temporal && (
                <img src={detalle.foto_url_temporal} alt="Foto carnet" className="detalle-foto" />
              )}
              <div>
                <h2>{detalle.apellido_paterno} {detalle.apellido_materno}</h2>
                <p className="detalle-nombre">{detalle.nombre_completo}</p>
                <span className={`estado-badge ${detalle.estado_solicitud}`}>
                  {detalle.estado_solicitud}
                </span>
              </div>
            </div>

            <div className="detalle-grid">
              <div><span>DNI</span><strong>{detalle.dni}</strong></div>
              <div><span>Especialidad</span><strong>{detalle.especialidades?.nombre_especialidad}</strong></div>
              <div><span>Sede</span><strong>{detalle.sedes?.nombre} — {detalle.sedes?.ciudad}</strong></div>
              <div><span>N° Registro</span><strong>{detalle.numero_registro ?? "Pendiente de aprobación"}</strong></div>
              <div><span>Teléfono</span><strong>{detalle.telefono ?? "—"}</strong></div>
              <div><span>Correo</span><strong>{detalle.correo ?? "—"}</strong></div>
            </div>

            <h3 className="detalle-subtitulo">Pago de matrícula</h3>
            {detalle.pagos?.length > 0 ? (
              detalle.pagos.map((pago) => (
                <div className="detalle-grid" key={pago.id_pago}>
                  <div><span>Monto</span><strong>S/ {pago.monto_total}</strong></div>
                  <div><span>Método</span><strong>{pago.metodo_pago}</strong></div>
                  <div><span>Fecha de pago</span><strong>{new Date(pago.fecha_pago).toLocaleDateString()}</strong></div>
                  <div><span>Estado</span><strong>{pago.estado_pago}</strong></div>
                </div>
              ))
            ) : (
              <p className="lista-estado">Sin información de pago.</p>
            )}

            {detalle.titulo_url_temporal && (
              <a
                href={detalle.titulo_url_temporal}
                target="_blank"
                rel="noopener noreferrer"
                className="detalle-titulo-link"
              >
                <FaFilePdf /> Ver título profesional
              </a>
            )}

            {detalle.estado_solicitud === "pendiente" && (
              <div className="detalle-acciones">
                <button
                  className="btn-rechazar"
                  onClick={() => actualizarEstado("rechazada")}
                  disabled={procesando}
                >
                  {procesando ? <FaSpinner className="spinning" /> : <FaBan />} Rechazar
                </button>
                <button
                  className="btn-aprobar"
                  onClick={() => actualizarEstado("aprobada")}
                  disabled={procesando}
                >
                  {procesando ? <FaSpinner className="spinning" /> : <FaCheckCircle />} Aprobar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DetalleSolicitud;