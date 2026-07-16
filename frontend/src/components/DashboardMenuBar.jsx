import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/DashboardMenuBar.css";

const MENU_ITEMS = {
  admin: [{ label: "Ver solicitudes", to: "/dashboard-admin/solicitudes" }],
  cajero: [{ label: "Prueba", to: "/dashboard-cajero/prueba" }],
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
      </nav>

      <button className="menubar-logout" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </header>
  );
}

export default DashboardMenuBar;