import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand" onClick={closeMenu}>
        <img src="/logocip.png" alt="Colegio de Ingenieros del Perú" className="navbar-logo" />
        <div className="navbar-titles">
          <strong>Colegio de Ingenieros</strong>
          <small>del Perú — Consejo Estudiantil</small>
        </div>
      </Link>

      <button
        className={`navbar-toggle ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Abrir menú de navegación"
        aria-expanded={isOpen}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={`navbar-links ${isOpen ? "open" : ""}`}>
        <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          Inicio
        </NavLink>
        <NavLink to="/quienes-somos" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          Quiénes somos
        </NavLink>
        <NavLink to="/servicios" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          Servicios
        </NavLink>
        <NavLink to="/contacto" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          Contacto
        </NavLink>

        <div className="navbar-auth">
          <Link to="/register" onClick={closeMenu} className="navbar-register">
            Registrarse
          </Link>
          <Link to="/login" onClick={closeMenu} className="navbar-cta">
            Ingresar
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;