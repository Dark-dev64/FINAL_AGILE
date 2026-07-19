import { useState, useEffect } from "react";
import api from "../services/api";
import DetalleSolicitud from "../components/DetalleSolicitud";
import { FaEye, FaCircle } from "react-icons/fa";
import "../styles/Dashboard.css";
import "../styles/ListaSolicitudes.css";

const ESTADO_LABELS = {
  pendiente: { label: "Pendiente", color: "yellow" },
  aprobada: { label: "Aprobada", color: "green" },
  rechazada: { label: "Rechazada", color: "red" },
};

function DashboardAdmin() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [idSeleccionado, setIdSeleccionado] = useState(null);

  async function cargarSolicitudes() {
    setLoading(true);
    try {
      const response = await api.get("/solicitudes");
      setSolicitudes(response.data.data);
    } catch (err) {
      setError("No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  function cerrarDetalle(actualizar) {
    setIdSeleccionado(null);
    if (actualizar) cargarSolicitudes();
  }

  return (
    <section className="dashboard form-layout">
      <div className="lista-solicitudes">
        <div className="registro-header">
          <span className="dashboard-role">Administrador</span>
          <h1>Solicitudes de colegiatura</h1>
          <p>Haz clic en una fila para ver el detalle completo.</p>
        </div>

        {loading && <p className="lista-estado">Cargando solicitudes...</p>}
        {error && <p className="lista-estado error">{error}</p>}

        {!loading && !error && (
          <div className="tabla-wrapper">
            <table className="tabla-solicitudes">
              <thead>
                <tr>
                  <th>DNI</th>
                  <th>Nombre</th>
                  <th>Sede</th>
                  <th>Especialidad</th>
                  <th>Pago</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => {
                  const estado = ESTADO_LABELS[s.estado_solicitud];
                  const pago = s.pagos?.[0];
                  return (
                    <tr key={s.id_solicitud} onClick={() => setIdSeleccionado(s.id_solicitud)}>
                      <td>{s.dni}</td>
                      <td>{s.apellido_paterno} {s.apellido_materno}, {s.nombre_completo}</td>
                      <td>{s.sedes?.nombre ?? "—"}</td>
                      <td>{s.especialidades?.nombre_especialidad ?? "—"}</td>
                      <td>{pago ? `S/ ${pago.monto_total} (${pago.metodo_pago})` : "Sin pago"}</td>
                      <td>{new Date(s.fecha_registro).toLocaleDateString()}</td>
                      <td>
                        <span className={`estado-badge ${estado.color}`}>
                          <FaCircle /> {estado.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {solicitudes.length === 0 && (
              <p className="lista-estado">No hay solicitudes registradas todavía.</p>
            )}
          </div>
        )}
      </div>

      {idSeleccionado && (
        <DetalleSolicitud idSolicitud={idSeleccionado} onClose={cerrarDetalle} />
      )}
    </section>
  );
}

export default DashboardAdmin;