import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import {
  FaChartBar,
  FaCalendarAlt,
  FaFilter,
  FaMoneyBillWave,
  FaCreditCard,
  FaUser,
  FaSearch,
  FaSpinner,
  FaExclamationTriangle,
  FaRedo,
  FaChevronLeft,
  FaChevronRight,
  FaWallet,
} from "react-icons/fa";
import "../styles/Dashboard.css";
import "../styles/ListaSolicitudes.css";
import "../styles/ReportePagosCajero.css";

const METODO_LABELS = {
  efectivo: "Efectivo",
  mercadopago: "Mercado Pago",
  yape: "Yape",
  plin: "Plin",
};

const TIPO_LABELS = {
  inscripcion: "Matrícula",
  mensualidad: "Mensualidad",
  otro: "Otro",
};

function ReportePagosCajero() {
  const { session } = useAuth();

  const [cajeros, setCajeros] = useState([]);
  const [cajeroSeleccionado, setCajeroSeleccionado] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [tipoPago, setTipoPago] = useState("");

  const [resumen, setResumen] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState(10);

  // Si es Admin, cargar lista de cajeros para el dropdown
  useEffect(() => {
    if (session?.rol === "admin") {
      api
        .get("/cajeros")
        .then((res) => setCajeros(res.data.data))
        .catch((err) => console.error("Error cargando cajeros:", err));
    }
  }, [session?.rol]);

  const cargarReporte = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        id_usuario: session?.id_usuario,
      };

      if (session?.rol === "admin" && cajeroSeleccionado) {
        params.id_usuario_cajero = cajeroSeleccionado;
      }
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaFin) params.fecha_fin = fechaFin;
      if (metodoPago) params.metodo_pago = metodoPago;
      if (tipoPago) params.tipo_pago = tipoPago;

      const res = await api.get("/reportes/pagos-cajero", { params });
      setResumen(res.data.data.resumen);
      setPagos(res.data.data.pagos);
    } catch (err) {
      setError("No se pudo cargar el reporte de pagos.");
    } finally {
      setLoading(false);
    }
  }, [session, cajeroSeleccionado, fechaInicio, fechaFin, metodoPago, tipoPago]);

  useEffect(() => {
    cargarReporte();
  }, [cargarReporte]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, porPagina, cajeroSeleccionado, fechaInicio, fechaFin, metodoPago, tipoPago]);

  // Filtrado local por búsqueda rápida (DNI / Nombre de colegiado)
  const pagosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return pagos;
    return pagos.filter((p) => {
      const nombre = (p.colegiado?.nombre_completo || "").toLowerCase();
      const dni = p.colegiado?.dni || "";
      const cajeroName = (p.cajero?.username || "").toLowerCase();
      return nombre.includes(term) || dni.includes(term) || cajeroName.includes(term);
    });
  }, [pagos, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(pagosFiltrados.length / porPagina));

  const pagosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * porPagina;
    return pagosFiltrados.slice(inicio, inicio + porPagina);
  }, [pagosFiltrados, paginaActual, porPagina]);

  const limpiarFiltros = () => {
    setCajeroSeleccionado("");
    setFechaInicio("");
    setFechaFin("");
    setMetodoPago("");
    setTipoPago("");
    setBusqueda("");
  };

  return (
    <section className="dashboard form-layout">
      <div className="reporte-pagos-container">
        <div className="registro-header">
          <span className="dashboard-role">
            <FaChartBar className="role-icon" />
            {session?.rol === "admin" ? "Administrador" : "Cajero"}
          </span>
          <h1>Reporte de cobros y auditoría de pagos</h1>
          <p>
            {session?.rol === "admin"
              ? "Consulta los pagos procesados por los cajeros y el acumulado por método."
              : "Consulta tus cobros registrados en el sistema."}
          </p>
        </div>

        {/* CONTROLES DE FILTRO */}
        <div className="reporte-filtros-card">
          <div className="reporte-filtros-grid">
            {session?.rol === "admin" && (
              <div className="filtro-campo">
                <label htmlFor="select-cajero">
                  <FaUser /> Cajero
                </label>
                <select
                  id="select-cajero"
                  value={cajeroSeleccionado}
                  onChange={(e) => setCajeroSeleccionado(e.target.value)}
                >
                  <option value="">Todos los cajeros</option>
                  {cajeros.map((c) => (
                    <option key={c.id_usuario} value={c.id_usuario}>
                      {c.username} ({c.sedes?.nombre ?? "Sin sede"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="filtro-campo">
              <label htmlFor="fecha-inicio">
                <FaCalendarAlt /> Fecha inicio
              </label>
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="fecha-fin">
                <FaCalendarAlt /> Fecha fin
              </label>
              <input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>

            <div className="filtro-campo">
              <label htmlFor="select-metodo">
                <FaCreditCard /> Método
              </label>
              <select
                id="select-metodo"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
              >
                <option value="">Todos los métodos</option>
                <option value="efectivo">Efectivo</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="yape">Yape</option>
                <option value="plin">Plin</option>
              </select>
            </div>

            <div className="filtro-campo">
              <label htmlFor="select-tipo">
                <FaFilter /> Tipo de pago
              </label>
              <select
                id="select-tipo"
                value={tipoPago}
                onChange={(e) => setTipoPago(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="inscripcion">Matrícula</option>
                <option value="mensualidad">Mensualidad</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          {(cajeroSeleccionado || fechaInicio || fechaFin || metodoPago || tipoPago) && (
            <div className="reporte-filtros-acciones">
              <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>

        {/* TARJETAS DE RESUMEN Y TOTALES */}
        {resumen && !loading && !error && (
          <div className="reporte-stats-wrapper">
            <div className="stat-card primary">
              <FaMoneyBillWave className="stat-icon green" />
              <div>
                <span className="stat-value">S/ {resumen.total_cobrado.toFixed(2)}</span>
                <span className="stat-label">Total Cobrado ({resumen.cantidad_pagos} pagos)</span>
              </div>
            </div>

            <div className="stats-desglose-card">
              <h3>
                <FaWallet /> Desglose por Método
              </h3>
              <div className="desglose-grid">
                <div className="desglose-item">
                  <span>Efectivo:</span>
                  <strong>S/ {resumen.por_metodo_pago.efectivo.toFixed(2)}</strong>
                </div>
                <div className="desglose-item">
                  <span>Mercado Pago:</span>
                  <strong>S/ {resumen.por_metodo_pago.mercadopago.toFixed(2)}</strong>
                </div>
                <div className="desglose-item">
                  <span>Yape:</span>
                  <strong>S/ {resumen.por_metodo_pago.yape.toFixed(2)}</strong>
                </div>
                <div className="desglose-item">
                  <span>Plin:</span>
                  <strong>S/ {resumen.por_metodo_pago.plin.toFixed(2)}</strong>
                </div>
              </div>
            </div>

            <div className="stats-desglose-card">
              <h3>
                <FaFilter /> Desglose por Tipo
              </h3>
              <div className="desglose-grid">
                <div className="desglose-item">
                  <span>Matrícula:</span>
                  <strong>S/ {resumen.por_tipo_pago.inscripcion.toFixed(2)}</strong>
                </div>
                <div className="desglose-item">
                  <span>Mensualidad:</span>
                  <strong>S/ {resumen.por_tipo_pago.mensualidad.toFixed(2)}</strong>
                </div>
                <div className="desglose-item">
                  <span>Otros:</span>
                  <strong>S/ {resumen.por_tipo_pago.otro.toFixed(2)}</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TABLA CONTROLES */}
        {!loading && !error && pagos.length > 0 && (
          <div className="tabla-controls">
            <div className="search-wrapper">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Buscar por DNI, nombre de colegiado o cajero..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="por-pagina-selector">
              <label htmlFor="porPaginaReporte">Mostrar</label>
              <select
                id="porPaginaReporte"
                value={porPagina}
                onChange={(e) => setPorPagina(Number(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}

        {/* TABLA DE RESULTADOS */}
        {loading && (
          <div className="tabla-wrapper">
            <p className="lista-estado">
              <FaSpinner className="spinning" /> Cargando reporte de pagos...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="dashboard-error-card">
            <FaExclamationTriangle className="dashboard-error-icon" />
            <p>{error}</p>
            <button className="dashboard-retry-btn" onClick={cargarReporte}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="tabla-wrapper">
            <table className="tabla-solicitudes">
              <thead>
                <tr>
                  <th>Fecha Pago</th>
                  <th>Colegiado</th>
                  <th>DNI</th>
                  {session?.rol === "admin" && <th>Cajero</th>}
                  <th>Concepto</th>
                  <th>Método</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {pagosPaginados.map((p) => (
                  <tr key={p.id_pago}>
                    <td>{new Date(p.fecha_pago).toLocaleString("es-PE")}</td>
                    <td>
                      <strong>{p.colegiado?.nombre_completo}</strong>
                    </td>
                    <td>{p.colegiado?.dni}</td>
                    {session?.rol === "admin" && <td>{p.cajero?.username}</td>}
                    <td>{TIPO_LABELS[p.tipo_pago] ?? p.tipo_pago}</td>
                    <td>
                      <span className={`metodo-badge ${p.metodo_pago}`}>
                        {METODO_LABELS[p.metodo_pago] ?? p.metodo_pago}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: "bold" }}>
                      S/ {Number(p.monto_total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagos.length === 0 && (
              <p className="lista-estado">No hay pagos registrados con los filtros seleccionados.</p>
            )}

            {pagos.length > 0 && pagosFiltrados.length === 0 && (
              <p className="lista-estado">No se encontraron pagos con ese término de búsqueda.</p>
            )}

            {pagosFiltrados.length > porPagina && (
              <div className="paginacion">
                <button
                  className="paginacion-btn"
                  onClick={() => setPaginaActual((prev) => Math.max(1, prev - 1))}
                  disabled={paginaActual === 1}
                >
                  <FaChevronLeft /> Anterior
                </button>

                <span className="paginacion-info">
                  Página {paginaActual} de {totalPaginas} — {pagosFiltrados.length} resultados
                </span>

                <button
                  className="paginacion-btn"
                  onClick={() => setPaginaActual((prev) => Math.min(totalPaginas, prev + 1))}
                  disabled={paginaActual === totalPaginas}
                >
                  Siguiente <FaChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default ReportePagosCajero;
