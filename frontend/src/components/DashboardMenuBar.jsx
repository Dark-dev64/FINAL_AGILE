import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FaHome, FaCreditCard, FaKey, FaSignOutAlt } from "react-icons/fa";
import "../styles/DashboardMenuBar.css";

const MENU_ITEMS = {
  colegiado: [{ label: "Mis pagos", to: "/dashboard-colegiado/pagos", icon: FaCreditCard }],
};

const ROLE_LABELS = {
  admin: "Administrador",
  colegiado: "Colegiado",
  cajero: "Cajero",
};

function DashboardMenuBar() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const items = MENU_ITEMS[role] || [];

  return (
    <header className="menubar">
      <Link to={`/dashboard-${role}`} className="menubar-brand">
        <img src="/logocip.png" alt="CIP" className="menubar-logo" />
        <span>Panel {ROLE_LABELS[role]}</span>
      </Link>

      <nav className="menubar-links" aria-label="Navegación del panel">
        <NavLink to={`/dashboard-${role}`} end className="menubar-link">
          <FaHome aria-hidden="true" />
          <span>Inicio</span>
        </NavLink>
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink key={to} to={to} className="menubar-link">
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
        <Link to="/cambiar-password" className="menubar-password-link">
          <FaKey /> Cambiar contraseña
        </Link>
      </nav>

      <button className="menubar-logout" onClick={handleLogout}>
        <FaSignOutAlt aria-hidden="true" />
        Cerrar sesión
      </button>
    </header>
  );
}

export default DashboardMenuBar;
