import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { FaKey } from "react-icons/fa";
import "../styles/DashboardMenuBar.css";

const MENU_ITEMS = {
  colegiado: [],
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

      <nav className="menubar-links">
        {items.map((item) => (
          <Link key={item.to} to={item.to}>
            {item.label}
          </Link>
        ))}
        <Link to="/cambiar-password" className="menubar-password-link">
          <FaKey /> Cambiar contraseña
        </Link>
      </nav>

      <button className="menubar-logout" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </header>
  );
}

export default DashboardMenuBar;