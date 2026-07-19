import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  FaUser, 
  FaLock, 
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaUserPlus,
  FaShieldAlt,
  FaCheckCircle,
  FaArrowRight,
  FaIdCard
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
import "../styles/Auth.css";

function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
    aceptaTerminos: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (formData.nombre.length < 3) {
      newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
    }

    if (!formData.email.includes('@') || !formData.email.includes('.')) {
      newErrors.email = "Ingresa un correo electrónico válido";
    }

    if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    if (!formData.aceptaTerminos) {
      newErrors.aceptaTerminos = "Debes aceptar los términos y condiciones";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Simular registro
    setTimeout(() => {
      setIsLoading(false);
      // Redirigir al login
      navigate("/login");
    }, 1500);
  };

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
            <h1>Crear cuenta</h1>
            <p className="auth-subtitle">
              Únete al Consejo Estudiantil del CIP
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="nombre">
              <FaUser className="input-icon" />
              Nombre completo
            </label>
            <div className="input-wrapper">
              <input
                id="nombre"
                name="nombre"
                type="text"
                placeholder="Ej: Juan Pérez García"
                value={formData.nombre}
                onChange={handleChange}
                required
                className={errors.nombre ? "error" : ""}
              />
            </div>
            {errors.nombre && <span className="field-error">{errors.nombre}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <FaEnvelope className="input-icon" />
              Correo electrónico
            </label>
            <div className="input-wrapper">
              <input
                id="email"
                name="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
                className={errors.email ? "error" : ""}
              />
            </div>
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <FaLock className="input-icon" />
              Contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                required
                className={errors.password ? "error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FaShieldAlt className="input-icon" />
              Confirmar contraseña
            </label>
            <div className="input-wrapper password-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={errors.confirmPassword ? "error" : ""}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="aceptaTerminos"
                checked={formData.aceptaTerminos}
                onChange={handleChange}
                className={errors.aceptaTerminos ? "error" : ""}
              />
              <span>
                Acepto los <Link to="/terminos">términos y condiciones</Link>
              </span>
            </label>
            {errors.aceptaTerminos && <span className="field-error">{errors.aceptaTerminos}</span>}
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Creando cuenta...
              </>
            ) : (
              <>
                <FaUserPlus />
                Registrarme
              </>
            )}
          </button>

          <div className="auth-divider">
            <span>o</span>
          </div>

          <p className="auth-footer-text">
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
            <FaArrowRight className="footer-arrow" />
          </p>
        </form>
      </div>
    </section>
  );
}

export default Register;