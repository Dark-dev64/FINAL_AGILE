import { useEffect } from "react";
import { FaExclamationTriangle } from "react-icons/fa";
import "../styles/ConfirmDialog.css";

/**
 * Diálogo de confirmación propio de la app (en vez de window.confirm nativo
 * del navegador), para acciones destructivas o irreversibles.
 */
function ConfirmDialog({
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  onConfirmar,
  onCancelar,
}) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    function handleKeyDown(e) {
      if (e.key === "Escape") onCancelar();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="confirm-overlay" onClick={onCancelar}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <div className="confirm-icon">
          <FaExclamationTriangle />
        </div>
        <h3>{titulo}</h3>
        {mensaje && <p>{mensaje}</p>}
        <div className="confirm-botones">
          <button type="button" className="confirm-btn-cancelar" onClick={onCancelar}>
            {textoCancelar}
          </button>
          <button type="button" className="confirm-btn-confirmar" onClick={onConfirmar}>
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
