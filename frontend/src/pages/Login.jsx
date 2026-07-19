import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import { 
  FaUser, 
  FaLock, 
  FaSignInAlt,
  FaEye,
  FaEyeSlash,
  FaShieldAlt,
  FaArrowRight
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

async function handleSubmit(e) {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    const response = await api.post("/auth/login", { 
      username: username.trim(), 
      password: password.trim() 
    });
    
    const usuario = response.data.data;
    
    login(usuario);
    
    // Login normal: siempre va directo al dashboard según el rol
    const redirectPath = ROLES[usuario.rol] || "/";
    navigate(redirectPath);
    
  } catch (err) {
    const mensaje = err.response?.data?.error || 
                   err.response?.data?.message || 
                   "No se pudo iniciar sesión. Verifica tus credenciales.";
    setError(mensaje);
    setIsLoading(false);
  }
}

  return (
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-brand">
          <MdEngineering className="auth-brand-icon" />
          <h2>CIP</h2>
          <span>Consejo Estudiantil</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-header">
            <h1>Iniciar sesión</h1>
            <p className="auth-subtitle">
              Ingresa con tu usuario y contraseña asignados.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="username">
              <FaUser className="input-icon" />
              Usuario
            </label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"  
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              Contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                disabled={isLoading}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span>Recordarme</span>
            </label>
            <Link to="/recuperar-contrasena" className="forgot-link">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {error && (
            <div className="auth-error">
              <FaShieldAlt className="error-icon" />
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Verificando...
              </>
            ) : (
              <>
                <FaSignInAlt />
                Ingresar
              </>
            )}
          </button>

          <div className="auth-divider">
            <span>o</span>
          </div>

          <p className="auth-footer-text">
            ¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link>
            <FaArrowRight className="footer-arrow" />
          </p>
        </form>
      </div>
    </section>
  );
}

export default Login;