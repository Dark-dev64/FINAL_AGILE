import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import {
  FaUser,
  FaKey,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaCheckCircle,
} from "react-icons/fa";
import "../styles/Auth.css";

function RecuperarContrasena() {
  const [username, setUsername] = useState("");
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
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
      await api.post("/auth/recuperar", {
        username: username.trim(),
        codigo_recuperacion: codigoRecuperacion.trim(),
        password_nueva: passwordNueva,
      });

      setExito(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo restablecer la contraseña.");
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
          <span>Recuperación de cuenta</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-header">
            <h1>Recuperar contraseña</h1>
            <p className="auth-subtitle">
              Ingresa tu usuario (DNI) y el código de recuperación que recibiste al colegiarte.
            </p>
          </div>

          {exito ? (
            <div className="auth-success">
              <FaCheckCircle className="success-icon" />
              <p>Contraseña restablecida correctamente.</p>
              <span>Redirigiendo al inicio de sesión...</span>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="username">
                  <FaUser className="input-icon" />
                  Usuario (DNI)
                </label>
                <div className="input-wrapper">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tu número de DNI"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="codigoRecuperacion">
                  <FaKey className="input-icon" />
                  Código de recuperación
                </label>
                <div className="input-wrapper">
                  <input
                    id="codigoRecuperacion"
                    type="text"
                    value={codigoRecuperacion}
                    onChange={(e) => setCodigoRecuperacion(e.target.value)}
                    placeholder="6 dígitos"
                    maxLength={6}
                    required
                    disabled={loading}
                    inputMode="numeric"
                  />
                </div>
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
                    Restableciendo...
                  </>
                ) : (
                  <>
                    <FaLock />
                    Restablecer contraseña
                  </>
                )}
              </button>
            </>
          )}

          <div className="auth-divider">
            <span>o</span>
          </div>

          <p className="auth-footer-text">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default RecuperarContrasena;