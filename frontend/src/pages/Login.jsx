import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/Auth.css";

const ROLES = {
  admin: "/dashboard-admin",
  colegiado: "/dashboard-colegiado",
  cajero: "/dashboard-cajero",
};

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const user = username.trim().toLowerCase();
    const pass = password.trim().toLowerCase();

    if (user === pass && ROLES[user]) {
      login(user);
      navigate(ROLES[user]);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Iniciar sesión</h1>
        <p className="auth-subtitle">Ingresa con tu usuario y contraseña asignados.</p>

        <label>
          Usuario
          <input
            type="text"
            placeholder="admin / colegiado / cajero"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label>
          Contraseña
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit">Ingresar</button>

        <p className="auth-footer-text">
          ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
        </p>
      </form>
    </section>
  );
}

export default Login;