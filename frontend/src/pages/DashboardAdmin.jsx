import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../services/api";
import DetalleSolicitud from "../components/DetalleSolicitud";
import {
  FaEye,
  FaCircle,
  FaSearch,
  FaExclamationTriangle,
  FaRedo,
  FaClipboardList,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "../styles/Dashboard.css";
import "../styles/ListaSolicitudes.css";

const ESTADO_LABELS = {
  pendiente: { label: "Pendiente", color: "yellow" },
  aprobada: { label: "Aprobada", color: "green" },
  rechazada: { label: "Rechazada", color: "red" },
};

const FILTROS = [
  { key: "todas", label: "Todas" },
  { key: "pendiente", label: "Pendientes" },
  { key: "aprobada", label: "Aprobadas" },
  { key: "rechazada", label: "Rechazadas" },
];

function DashboardAdmin() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  const cargarSolicitudes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/solicitudes");
      setSolicitudes(response.data.data);
    } catch (err) {
      setError("No se pudieron cargar las solicitudes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSolicitudes();
  }, [cargarSolicitudes]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroEstado, porPagina]);

  function cerrarDetalle(actualizar) {
    setIdSeleccionado(null);
    if (actualizar) cargarSolicitudes();
  }

  const conteos = useMemo(() => {
    return solicitudes.reduce(
      (acc, s) => {
        acc.todas += 1;
        acc[s.estado_solicitud] = (acc[s.estado_solicitud] ?? 0) + 1;
        return acc;
      },
      { todas: 0, pendiente: 0, aprobada: 0, rechazada: 0 }
    );
  }, [solicitudes]);

  const solicitudesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    return solicitudes.filter((s) => {
      const coincideEstado = filtroEstado === "todas" || s.estado_solicitud === filtroEstado;
      if (!coincideEstado) return false;
      if (!term) return true;
      const nombreCompleto = `${s.apellido_paterno} ${s.apellido_materno} ${s.nombre_completo}`.toLowerCase();
      return s.dni.includes(term) || nombreCompleto.includes(term);
    });
  }, [solicitudes, filtroEstado, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(solicitudesFiltradas.length / porPagina));

  const solicitudesPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return solicitudesFiltradas.slice(inicio, inicio + porPagina);
  }, [solicitudesFiltradas, paginaActual, porPagina]);

  function irAPagina(pagina) {
    setPaginaActual(Math.min(Math.max(1, pagina), totalPaginas));
  }

  return (
    <section className="dashboard form-layout">
      <div className="lista-solicitudes">
        <div className="registro-header">
          <span className="dashboard-role">Administrador</span>
          <h1>Solicitudes de colegiatura</h1>
          <p>Haz clic en una fila para ver el detalle completo.</p>
        </div>

        {!loading && !error && solicitudes.length > 0 && (
          <div className="stats-row">
            <div className="stat-card">
              <FaClipboardList className="stat-icon neutral" />
              <div>
                <span className="stat-value">{conteos.todas}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>
            <div className="stat-card">
              <FaClock className="stat-icon yellow" />
              <div>
                <span className="stat-value">{conteos.pendiente}</span>
                <span className="stat-label">Pendientes</span>
              </div>
            </div>
            <div className="stat-card">
              <FaCheckCircle className="stat-icon green" />
              <div>
                <span className="stat-value">{conteos.aprobada}</span>
                <span className="stat-label">Aprobadas</span>
              </div>
            </div>
            <div className="stat-card">
              <FaTimesCircle className="stat-icon red" />
              <div>
                <span className="stat-value">{conteos.rechazada}</span>
                <span className="stat-label">Rechazadas</span>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && solicitudes.length > 0 && (
          <div className="tabla-controls">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por DNI o nombre..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="filtro-tabs">
              {FILTROS.map((f) => (
                <button
                  key={f.key}
                  className={`filtro-tab ${filtroEstado === f.key ? "active" : ""}`}
                  onClick={() => setFiltroEstado(f.key)}
                >
                  {f.label}
                  <span className="filtro-count">{conteos[f.key] ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="por-pagina-selector">
              <label htmlFor="porPagina">Mostrar</label>
              <select
                id="porPagina"
                value={porPagina}
                onChange={(e) => setPorPagina(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {loading && (
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
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j}>
                        <div className="skeleton-cell" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && !loading && (
          <div className="dashboard-error-card">
            <FaExclamationTriangle className="dashboard-error-icon" />
            <p>{error}</p>
            <button className="dashboard-retry-btn" onClick={cargarSolicitudes}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

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
                {solicitudesPaginadas.map((s) => {
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

            {solicitudes.length > 0 && solicitudesFiltradas.length === 0 && (
              <p className="lista-estado">No se encontraron solicitudes con ese criterio.</p>
            )}

            {solicitudesFiltradas.length > porPagina && (
              <div className="paginacion">
                <button
                  className="paginacion-btn"
                  onClick={() => irAPagina(paginaActual - 1)}
                  disabled={paginaActual === 1}
                >
                  <FaChevronLeft /> Anterior
                </button>

                <span className="paginacion-info">
                  Página {paginaActual} de {totalPaginas} — {solicitudesFiltradas.length} resultados
                </span>

                <button
                  className="paginacion-btn"
                  onClick={() => irAPagina(paginaActual + 1)}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente <FaChevronRight />
                </button>
              </div>
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