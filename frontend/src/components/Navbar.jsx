import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  FaHome,
  FaUsers,
  FaCogs,
  FaEnvelope,
  FaSignInAlt,
  FaBars,
  FaTimes
} from "react-icons/fa";
import "../styles/Navbar.css";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  function closeMenu() {
    setIsOpen(false);
  }

  function toggleMenu() {
    setIsOpen(!isOpen);
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
        onClick={toggleMenu}
        aria-label="Abrir menú de navegación"
        aria-expanded={isOpen}
      >
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      <nav className={`navbar-links ${isOpen ? "open" : ""}`}>
        <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          <FaHome className="nav-icon" />
          <span>Inicio</span>
        </NavLink>
        <NavLink to="/quienes-somos" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          <FaUsers className="nav-icon" />
          <span>Quiénes somos</span>
        </NavLink>
        <NavLink to="/servicios" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          <FaCogs className="nav-icon" />
          <span>Servicios</span>
        </NavLink>
        <NavLink to="/contacto" onClick={closeMenu} className={({ isActive }) => isActive ? "active" : ""}>
          <FaEnvelope className="nav-icon" />
          <span>Contacto</span>
        </NavLink>

        <div className="navbar-auth">
          <Link to="/login" onClick={closeMenu} className="navbar-cta">
            <FaSignInAlt className="auth-icon" />
            <span>Ingresar</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default Navbar;