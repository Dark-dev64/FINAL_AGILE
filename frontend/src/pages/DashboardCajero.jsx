import "../styles/Dashboard.css";

function DashboardCajero() {
  return (
    <section className="dashboard">
      <div className="dashboard-card cajero">
        <span className="dashboard-role">Cajero</span>
        <h1>Bienvenido, Cajero</h1>
        <p>Este es tu panel para la gestión de pagos y cobros.</p>
      </div>
    </section>
  );
}

export default DashboardCajero;