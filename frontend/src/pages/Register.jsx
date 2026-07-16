import { Link } from "react-router-dom";
import "../styles/Auth.css";

function Register() {
  function handleSubmit(e) {
    e.preventDefault();
  }

  return (
    <section className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>Crear cuenta</h1>
        <p className="auth-subtitle">
          Este formulario aún no está conectado a ningún servicio.
        </p>

        <label>
          Nombre completo
          <input type="text" placeholder="Tu nombre completo" required />
        </label>

        <label>
          Correo
          <input type="email" placeholder="tucorreo@ejemplo.com" required />
        </label>

        <label>
          Contraseña
          <input type="password" placeholder="••••••••" required />
        </label>

        <label>
          Confirmar contraseña
          <input type="password" placeholder="••••••••" required />
        </label>

        <button type="submit">Registrarme</button>

        <p className="auth-footer-text">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </section>
  );
}

export default Register;