import "../styles/Home.css";

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-eyebrow">Consejo Estudiantil · CIP</span>
          <h1>Ingeniería con identidad, ética y propósito.</h1>
          <p>
            Un espacio digital para conectar a los futuros ingenieros del país
            con los valores y la trayectoria del Colegio de Ingenieros del Perú.
          </p>
          <a href="/login" className="hero-cta">Ingresar a mi cuenta</a>
        </div>
      </section>

      <div className="gear-divider" aria-hidden="true"></div>

      <section className="about-preview">
        <div className="about-card">
          <h3>Nuestra misión</h3>
          <p>Fomentar la excelencia y la ética profesional en la ingeniería peruana.</p>
        </div>
        <div className="about-card">
          <h3>19 capítulos</h3>
          <p>Especialidades de ingeniería representadas a nivel nacional.</p>
        </div>
        <div className="about-card">
          <h3>Desde 1962</h3>
          <p>Más de seis décadas impulsando el desarrollo del país.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;