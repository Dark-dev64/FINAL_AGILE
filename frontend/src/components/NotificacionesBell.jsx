import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import ConfirmDialog from "./ConfirmDialog";
import { FaBell, FaCheckDouble, FaTrashAlt, FaTimes, FaExclamationCircle } from "react-icons/fa";
import "../styles/NotificacionesBell.css";

const POLL_MS = 45000;

function tiempoRelativo(fechaIso) {
  const diffMin = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60000);
  if (diffMin < 1) return "justo ahora";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  return `hace ${Math.floor(diffH / 24)} d`;
}

function NotificacionesBell() {
  const { session } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState(null);
  const [confirmarBorrarId, setConfirmarBorrarId] = useState(null); // id_notificacion_web | "todas" | null
  const panelRef = useRef(null);

  const cargarNotificaciones = useCallback(async () => {
    if (!session?.id_usuario) return;
    try {
      const response = await api.get("/notificaciones-web", {
        params: { id_usuario: session.id_usuario },
      });
      setNotificaciones(response.data.data);
    } catch {
      setError("No se pudieron cargar las notificaciones.");
    }
  }, [session]);

  useEffect(() => {
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, POLL_MS);
    return () => clearInterval(intervalo);
  }, [cargarNotificaciones]);

  useEffect(() => {
    if (!abierto) return undefined;

    function handleClickFuera(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setAbierto(false);
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setAbierto(false);
    }

    document.addEventListener("mousedown", handleClickFuera);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [abierto]);

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  async function marcarLeida(idNotificacion) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id_notificacion_web === idNotificacion ? { ...n, leida: true } : n))
    );
    try {
      await api.patch(`/notificaciones-web/${idNotificacion}`, { leida: true });
    } catch {
      cargarNotificaciones();
    }
  }

  async function marcarTodasLeidas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await api.post("/notificaciones-web/marcar-leidas", { id_usuario: session.id_usuario });
    } catch {
      cargarNotificaciones();
    }
  }

  async function confirmarBorrar() {
    setBorrando(true);
    try {
      if (confirmarBorrarId === "todas") {
        await api.delete("/notificaciones-web", { params: { id_usuario: session.id_usuario } });
        setNotificaciones([]);
      } else {
        await api.delete(`/notificaciones-web/${confirmarBorrarId}`);
        setNotificaciones((prev) => prev.filter((n) => n.id_notificacion_web !== confirmarBorrarId));
      }
      setConfirmarBorrarId(null);
    } catch {
      setError("No se pudo borrar. Intenta de nuevo.");
    } finally {
      setBorrando(false);
    }
  }

  return (
    <div className="notificaciones-bell" ref={panelRef}>
      <button
        type="button"
        className="notificaciones-toggle"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
      >
        <FaBell />
        {noLeidas > 0 && <span className="notificaciones-badge">{noLeidas > 9 ? "9+" : noLeidas}</span>}
      </button>

      {abierto && (
        <div className="notificaciones-panel">
          <div className="notificaciones-panel-header">
            <h3>Notificaciones</h3>
            <button
              type="button"
              className="notificaciones-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
            >
              <FaTimes />
            </button>
          </div>

          {notificaciones.length > 0 && (
            <div className="notificaciones-acciones">
              <button type="button" onClick={marcarTodasLeidas} disabled={noLeidas === 0}>
                <FaCheckDouble /> Marcar todo leído
              </button>
              <button
                type="button"
                className="notificaciones-borrar-todas"
                onClick={() => setConfirmarBorrarId("todas")}
              >
                <FaTrashAlt /> Borrar todas
              </button>
            </div>
          )}

          {error && (
            <div className="notificaciones-error">
              <FaExclamationCircle /> {error}
            </div>
          )}

          <div className="notificaciones-lista">
            {notificaciones.length === 0 ? (
              <p className="notificaciones-vacio">No tienes notificaciones.</p>
            ) : (
              notificaciones.map((n) => (
                <div key={n.id_notificacion_web} className={`notificacion-item ${n.leida ? "" : "no-leida"}`}>
                  <button
                    type="button"
                    className="notificacion-contenido"
                    onClick={() => !n.leida && marcarLeida(n.id_notificacion_web)}
                  >
                    <span className="notificacion-titulo">{n.titulo}</span>
                    <span className="notificacion-mensaje">{n.mensaje}</span>
                    <span className="notificacion-fecha">{tiempoRelativo(n.created_at)}</span>
                  </button>
                  <button
                    type="button"
                    className="notificacion-borrar"
                    onClick={() => setConfirmarBorrarId(n.id_notificacion_web)}
                    aria-label="Borrar notificación"
                  >
                    <FaTrashAlt />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {confirmarBorrarId !== null && (
        <ConfirmDialog
          titulo={confirmarBorrarId === "todas" ? "¿Borrar todas las notificaciones?" : "¿Borrar esta notificación?"}
          mensaje="Esta acción no se puede deshacer."
          textoConfirmar={borrando ? "Borrando..." : "Sí, borrar"}
          textoCancelar="Cancelar"
          onConfirmar={confirmarBorrar}
          onCancelar={() => setConfirmarBorrarId(null)}
        />
      )}
    </div>
  );
}

export default NotificacionesBell;
