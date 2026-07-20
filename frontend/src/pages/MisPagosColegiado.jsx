import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import MetodosPago from "../components/MetodosPago";
import {
  FaMoneyBillWave,
  FaExclamationTriangle,
  FaRedo,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaCreditCard,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "../styles/Dashboard.css";
import "../styles/MisPagos.css";

const ESTADO_PAGO_LABELS = {
  pagado: { label: "Pagado", color: "green", icon: FaCheckCircle },
  pendiente: { label: "Pendiente", color: "yellow", icon: FaClock },
  atrasado: { label: "Atrasado", color: "red", icon: FaExclamationCircle },
};

const TIPO_PAGO_LABELS = {
  inscripcion: "Matrícula",
  mensualidad: "Mensualidad",
  otro: "Otro",
};

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "inscripcion", label: "Matrícula" },
  { valor: "mensualidad", label: "Mensualidad" },
  { valor: "atrasado", label: "Deudas" },
];

const TAMANO_PAGINA = 6;

function MisPagosColegiado() {
  const { session } = useAuth();
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagandoDeuda, setPagandoDeuda] = useState(false);
  const [pagandoMensualidad, setPagandoMensualidad] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const cargarPagos = useCallback(async () => {
    if (!session?.id_usuario) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/pagos", {
        params: { id_usuario_colegiado: session.id_usuario },
      });
      setPagos(response.data.data);
    } catch {
      setError("No se pudieron cargar tus pagos.");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    cargarPagos();
  }, [cargarPagos]);

  const deudas = useMemo(
    () => pagos.filter((p) => p.estado_pago === "atrasado"),
    [pagos]
  );

  const totalDeuda = useMemo(
    () => deudas.reduce((acc, p) => acc + Number(p.monto_total), 0),
    [deudas]
  );

  const mensualidadPendiente = useMemo(
    () => pagos.find((p) => p.tipo_pago === "mensualidad" && p.estado_pago === "pendiente") || null,
    [pagos]
  );

  const historialOrdenado = useMemo(
    () => [...pagos].sort((a, b) => new Date(b.fecha_vencimiento) - new Date(a.fecha_vencimiento)),
    [pagos]
  );

  const historialFiltrado = useMemo(
    () =>
      historialOrdenado.filter((p) => {
        if (filtro === "todos") return true;
        if (filtro === "atrasado") return p.estado_pago === "atrasado";
        return p.tipo_pago === filtro && p.estado_pago !== "atrasado";
      }),
    [historialOrdenado, filtro]
  );

  const totalPaginas = Math.max(1, Math.ceil(historialFiltrado.length / TAMANO_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);

  const historialPagina = useMemo(
    () => historialFiltrado.slice((paginaActual - 1) * TAMANO_PAGINA, paginaActual * TAMANO_PAGINA),
    [historialFiltrado, paginaActual]
  );

  const cambiarFiltro = (valor) => {
    setFiltro(valor);
    setPagina(1);
  };

  const handlePagoExitoso = () => {
    cargarPagos();
    setTimeout(() => {
      setPagandoDeuda(false);
      setPagandoMensualidad(false);
    }, 2500);
  };

  const crearPreferenciaDeuda = async () => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: deudas.map((d) => d.id_pago),
    });
    return response.data.data.preferencia;
  };

  const crearPreferenciaMensualidad = async () => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: [mensualidadPendiente.id_pago],
    });
    return response.data.data.preferencia;
  };

  return (
    <section className="dashboard form-layout">
      <div className="mis-pagos">
        <div className="registro-header">
          <span className="dashboard-role">Colegiado</span>
          <h1>Mis pagos</h1>
          <p>Historial completo de tus pagos y deudas pendientes.</p>
        </div>

        {loading && <p className="lista-estado">Cargando tus pagos...</p>}

        {error && !loading && (
          <div className="dashboard-error-card">
            <FaExclamationTriangle className="dashboard-error-icon" />
            <p>{error}</p>
            <button className="dashboard-retry-btn" onClick={cargarPagos}>
              <FaRedo /> Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {deudas.length > 0 && (
              <div className="deuda-card">
                <div className="deuda-card-header">
                  <FaExclamationCircle className="deuda-icon" />
                  <h2>Tienes deuda pendiente</h2>
                </div>
                <p className="deuda-monto">S/ {totalDeuda.toFixed(2)}</p>
                <p className="deuda-detalle">
                  {deudas.length} pago{deudas.length > 1 ? "s" : ""} atrasado{deudas.length > 1 ? "s" : ""}.
                  Regulariza tu situación para evitar la inhabilitación de tu carnet.
                </p>

                <ul className="deuda-lista">
                  {deudas.map((d) => {
                    const tieneRecargo = Number(d.porcentaje_recargo) > 0;
                    return (
                      <li key={d.id_pago}>
                        <div className="deuda-lista-fila">
                          <span>
                            {TIPO_PAGO_LABELS[d.tipo_pago] ?? d.tipo_pago} — vencido el{" "}
                            {new Date(d.fecha_vencimiento).toLocaleDateString()}
                          </span>
                          <strong>S/ {Number(d.monto_total).toFixed(2)}</strong>
                        </div>
                        {tieneRecargo && (
                          <span className="deuda-recargo-nota">
                            Incluye recargo del {Number(d.porcentaje_recargo).toFixed(0)}% por atraso
                            (S/ {Number(d.monto_base).toFixed(2)} + S/{" "}
                            {(Number(d.monto_total) - Number(d.monto_base)).toFixed(2)} de recargo)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>

                {!pagandoDeuda ? (
                  <button type="button" className="submit-button" onClick={() => setPagandoDeuda(true)}>
                    <FaCreditCard /> Pagar deuda
                  </button>
                ) : (
                  <MetodosPago
                    monto={totalDeuda}
                    onCrearPreferenciaMP={crearPreferenciaDeuda}
                    onExito={handlePagoExitoso}
                    metodosPermitidos={["mercadopago"]}
                    textoBotonQR="Pagar deuda con Mercado Pago"
                    mensajeExitoPolling="¡Deuda pagada correctamente!"
                    detalleMonto={`${deudas.length} pago(s) atrasado(s)`}
                  />
                )}
              </div>
            )}

            {mensualidadPendiente && (
              <div className="mensualidad-card">
                <div className="mensualidad-card-header">
                  <FaClock className="mensualidad-icon" />
                  <h2>Mensualidad pendiente</h2>
                </div>
                <p className="mensualidad-monto">S/ {Number(mensualidadPendiente.monto_total).toFixed(2)}</p>
                <p className="mensualidad-detalle">
                  Vence el {new Date(mensualidadPendiente.fecha_vencimiento).toLocaleDateString()}.
                </p>

                {!pagandoMensualidad ? (
                  <button type="button" className="submit-button" onClick={() => setPagandoMensualidad(true)}>
                    <FaCreditCard /> Pagar mensualidad
                  </button>
                ) : (
                  <MetodosPago
                    monto={mensualidadPendiente.monto_total}
                    onCrearPreferenciaMP={crearPreferenciaMensualidad}
                    onExito={handlePagoExitoso}
                    metodosPermitidos={["mercadopago"]}
                    textoBotonQR="Pagar mensualidad con Mercado Pago"
                    mensajeExitoPolling="¡Mensualidad pagada correctamente!"
                  />
                )}
              </div>
            )}

            <div className="historial-card">
              <div className="historial-header">
                <h3 className="mis-pagos-subtitulo">Historial de pagos</h3>
                {pagos.length > 0 && (
                  <span className="historial-contador">
                    {historialFiltrado.length} de {pagos.length}
                  </span>
                )}
              </div>

              {pagos.length === 0 ? (
                <p className="lista-estado">Aún no tienes pagos registrados.</p>
              ) : (
                <>
                  <div className="filtros-row">
                    <div className="filtro-pills">
                      {FILTROS.map(({ valor, label }) => (
                        <button
                          key={valor}
                          type="button"
                          className={`filtro-pill ${filtro === valor ? "activo" : ""}`}
                          onClick={() => cambiarFiltro(valor)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {historialFiltrado.length === 0 ? (
                    <p className="lista-estado">No hay pagos que coincidan con el filtro seleccionado.</p>
                  ) : (
                    <div className="pagos-lista">
                      {historialPagina.map((pago) => {
                        const estado = ESTADO_PAGO_LABELS[pago.estado_pago] ?? ESTADO_PAGO_LABELS.pendiente;
                        const Icono = estado.icon;

                        return (
                          <div key={pago.id_pago} className="pago-item">
                            <div className="pago-item-icon">
                              <FaMoneyBillWave />
                            </div>

                            <div className="pago-item-info">
                              <span className="pago-item-tipo">
                                {TIPO_PAGO_LABELS[pago.tipo_pago] ?? pago.tipo_pago}
                              </span>
                              <span className="pago-item-fecha">
                                Vencimiento: {new Date(pago.fecha_vencimiento).toLocaleDateString()}
                                {pago.fecha_pago &&
                                  ` · Pagado: ${new Date(pago.fecha_pago).toLocaleDateString()}`}
                              </span>
                            </div>

                            <div className="pago-item-monto">S/ {Number(pago.monto_total).toFixed(2)}</div>

                            <span className={`estado-badge ${estado.color}`}>
                              <Icono /> {estado.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {totalPaginas > 1 && (
                    <div className="paginacion">
                      <button
                        type="button"
                        className="paginacion-btn"
                        onClick={() => setPagina((p) => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                        aria-label="Página anterior"
                      >
                        <FaChevronLeft />
                      </button>
                      <span className="paginacion-info">
                        Página {paginaActual} de {totalPaginas}
                      </span>
                      <button
                        type="button"
                        className="paginacion-btn"
                        onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas}
                        aria-label="Página siguiente"
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default MisPagosColegiado;
