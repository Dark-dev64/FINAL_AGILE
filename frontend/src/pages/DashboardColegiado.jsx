import { useState } from "react";
import CarnetColegiado from "../components/CarnetColegiado";
import { colegiadoMock } from "../data/colegiadoMock";
import "../styles/Dashboard.css";

function DashboardColegiado() {
  // TODO: cuando exista backend, este estado se reemplaza por el valor
  // que venga directamente de la base de datos (colegiadoMock desaparece).
  const [colegiado, setColegiado] = useState(colegiadoMock);

  function cambiarEstado(nuevoEstado) {
    setColegiado((prev) => ({ ...prev, estado: nuevoEstado }));
  }

  return (
    <section className="dashboard">
      <div className="dashboard-column">
        <span className="dashboard-role">Colegiado</span>
        <h1>Bienvenido, {colegiado.nombreCompleto}</h1>
        <p>Este es tu carnet digital como miembro colegiado del CIP.</p>

        <CarnetColegiado data={colegiado} />

        {/* Selector temporal solo para pruebas locales, quitar al conectar backend */}
        <div className="dev-status-switcher">
          <span>Simular estado (solo pruebas):</span>
          <button onClick={() => cambiarEstado("habilitado")}>Habilitado</button>
          <button onClick={() => cambiarEstado("inhabilitado")}>Inhabilitado</button>
          <button onClick={() => cambiarEstado("con_deuda")}>Con deuda</button>
        </div>
      </div>
    </section>
  );
}

export default DashboardColegiado;