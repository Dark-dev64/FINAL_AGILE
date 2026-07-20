import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import {
  FaLock,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
} from "react-icons/fa";
import "../styles/Auth.css";

const ROLES = {
  admin: "/dashboard-admin",
  colegiado: "/dashboard-colegiado",
  cajero: "/dashboard-cajero",
};

function CambiarPassword() {
  const { session, login } = useAuth();
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const noCoinciden = confirmar.length > 0 && passwordNueva !== confirmar;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (passwordNueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (passwordNueva.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/cambiar-password", {
        id_usuario: session.id_usuario,
        password_nueva: passwordNueva,
      });

      login({ ...session, requiere_cambio_password: false });
      navigate(ROLES[session.rol] || "/");
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <FaShieldAlt className="auth-brand-icon" />
          <h2>CIP</h2>
          <span>Seguridad de la cuenta</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-header">
            <h1>Cambiar contraseña</h1>
            <p className="auth-subtitle">
              Puedes actualizar tu contraseña cuando lo necesites.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="passwordNueva">
              <FaLock className="input-icon" />
              Nueva contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="passwordNueva"
                type={mostrarNueva ? "text" : "password"}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarNueva(!mostrarNueva)}
                aria-label={mostrarNueva ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {mostrarNueva ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmar">
              <FaKey className="input-icon" />
              Confirmar contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="confirmar"
                type={mostrarConfirmar ? "text" : "password"}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                placeholder="Repite la contraseña"
                required
                disabled={loading}
                autoComplete="new-password"
                className={noCoinciden ? "error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                aria-label={mostrarConfirmar ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={loading}
              >
                {mostrarConfirmar ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {noCoinciden && (
              <span className="field-error">
                <FaShieldAlt /> Las contraseñas no coinciden
              </span>
            )}
          </div>

          {error && (
            <div className="auth-error">
              <FaShieldAlt className="error-icon" />
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Guardando...
              </>
            ) : (
              <>
                <FaLock />
                Cambiar contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

export default CambiarPassword;