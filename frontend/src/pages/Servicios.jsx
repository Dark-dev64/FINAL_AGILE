import "../styles/Page.css";

function Servicios() {
  return (
    <section className="page">
      <div className="page-header">
        <span className="page-eyebrow">Lo que ofrecemos</span>
        <h1>Servicios</h1>
        <p>Recursos y espacios pensados para acompañar tu formación como futuro ingeniero.</p>
      </div>

      <div className="page-grid">
        <div className="page-card">
          <h3>Capacitaciones</h3>
          <p>Talleres y charlas con ingenieros colegiados de distintas especialidades.</p>
        </div>
        <div className="page-card">
          <h3>Certificaciones</h3>
          <p>Orientación sobre el proceso de colegiatura y certificaciones profesionales.</p>
        </div>
        <div className="page-card">
          <h3>Networking</h3>
          <p>Conexión con los 19 capítulos de ingeniería a nivel nacional.</p>
        </div>
      </div>
    </section>
  );
}

export default Servicios;