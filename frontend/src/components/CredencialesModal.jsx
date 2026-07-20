import { useNavigate } from "react-router-dom";
import { FaKey, FaArrowRight } from "react-icons/fa";
import "../styles/CredencialesModal.css";

/**
 * Se muestra en cada login mientras el usuario siga con la contraseña
 * temporal autogenerada (requiere_cambio_password = true). Reproduce el
 * mismo texto que ya se le envió por correo/WhatsApp.
 */
function CredencialesModal({ mensaje, onCerrar }) {
  const navigate = useNavigate();

  return (
    <div className="credenciales-overlay" onClick={onCerrar}>
      <div
        className="credenciales-card"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="credenciales-icon">
          <FaKey />
        </div>

        <h3>Tus credenciales de acceso</h3>
        <p className="credenciales-subtitulo">
          Esto es lo mismo que te enviamos por correo y WhatsApp. Te lo seguiremos mostrando
          hasta que cambies tu contraseña.
        </p>

        <div className="credenciales-mensaje">{mensaje}</div>

        <div className="credenciales-botones">
          <button type="button" className="credenciales-btn-cerrar" onClick={onCerrar}>
            Entendido
          </button>
          <button
            type="button"
            className="credenciales-btn-cambiar"
            onClick={() => {
              onCerrar();
              navigate("/cambiar-password");
            }}
          >
            Cambiar mi contraseña ahora <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export default CredencialesModal;
