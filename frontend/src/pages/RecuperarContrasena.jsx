  import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { FaKey, FaLock, FaShieldAlt } from "react-icons/fa";
import "../styles/Auth.css";

function RecuperarContrasena() {
  const [username, setUsername] = useState("");
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Ingresa tu usuario (DNI) y el código de recuperación que recibiste al colegiarte.
        </p>

        <label>
          Usuario (DNI)
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading || exito}
          />
        </label>

        <label>
          Código de recuperación
          <input
            type="text"
            value={codigoRecuperacion}
            onChange={(e) => setCodigoRecuperacion(e.target.value)}
            placeholder="6 dígitos"
            maxLength={6}
            required
            disabled={loading || exito}
          />
        </label>

        <label>
          Nueva contraseña
          <input
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            required
            disabled={loading || exito}
          />
        </label>

        <label>
          Confirmar contraseña
          <input
            type="password"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
            disabled={loading || exito}
          />
        </label>

        {error && (
          <p className="auth-error">
            <FaShieldAlt /> {error}
          </p>
        )}

        {exito && (
          <p className="auth-error" style={{ backgroundColor: "#EAF6EC", borderColor: "#4CAF50", color: "#2E7D32" }}>
            Contraseña restablecida. Redirigiendo al login...
          </p>
        )}

        <button type="submit" disabled={loading || exito}>
          {loading ? "Restableciendo..." : "Restablecer contraseña"}
        </button>

        <p className="auth-footer-text">
          <Link to="/login">Volver a iniciar sesión</Link>
        </p>
      </form>
    </section>
  );
}

export default RecuperarContrasena;