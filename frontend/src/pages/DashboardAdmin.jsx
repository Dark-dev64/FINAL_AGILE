import "../styles/Dashboard.css";

function DashboardAdmin() {
  return (
    <section className="dashboard">
      <div className="dashboard-card admin">
        <span className="dashboard-role">Administrador</span>
        <h1>Bienvenido, Administrador</h1>
        <p>Este es tu panel de administración general del sistema.</p>
      </div>
    </section>
  );
}

export default DashboardAdmin;