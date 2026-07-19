import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
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
  const [error, setError] = useState("");
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
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Cambiar contraseña</h1>
        <p className="auth-subtitle">Puedes actualizar tu contraseña cuando lo necesites.</p>

        <label>
          Nueva contraseña
          <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required disabled={loading} />
        </label>

        <label>
          Confirmar contraseña
          <input type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required disabled={loading} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Cambiar contraseña"}
        </button>
      </form>
    </section>
  );
}

export default CambiarPassword;