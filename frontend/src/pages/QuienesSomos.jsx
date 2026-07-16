import "../styles/Page.css";

function QuienesSomos() {
  return (
    <section className="page">
      <div className="page-header">
        <span className="page-eyebrow">Nosotros</span>
        <h1>Quiénes somos</h1>
        <p>
          Somos el Consejo Estudiantil del Colegio de Ingenieros del Perú,
          un espacio creado para acercar a los futuros ingenieros a los
          valores y la trayectoria institucional del CIP.
        </p>
      </div>

      <div className="page-grid">
        <div className="page-card">
          <h3>Misión</h3>
          <p>Fomentar la excelencia y la ética profesional desde la etapa universitaria.</p>
        </div>
        <div className="page-card">
          <h3>Visión</h3>
          <p>Ser el puente entre la formación académica y el ejercicio profesional de la ingeniería.</p>
        </div>
        <div className="page-card">
          <h3>Valores</h3>
          <p>Integridad, compromiso, trabajo en equipo y responsabilidad social.</p>
        </div>
      </div>
    </section>
  );
}

export default QuienesSomos;