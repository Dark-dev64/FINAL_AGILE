import { Link } from "react-router-dom";
import { 
  FaUsers, 
  FaAward, 
  FaCalendarAlt, 
  FaArrowRight,
  FaGraduationCap,
  FaHandshake,
  FaLightbulb,
  FaRocket
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
import "../styles/Home.css";

function Home() {
  return (
    <div className="home">
      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <MdEngineering className="badge-icon" />
            <span className="hero-eyebrow">Consejo Estudiantil · CIP</span>
          </div>
          <h1>
            <span className="highlight">Ingeniería</span> con identidad, 
            <br />ética y propósito.
          </h1>
          <p>
            Un espacio digital para conectar a los futuros ingenieros del país
            con los valores y la trayectoria del Colegio de Ingenieros del Perú.
          </p>
          <div className="hero-buttons">
            <Link to="/login" className="hero-cta">
              Ingresar a mi cuenta
              <FaArrowRight className="cta-icon" />
            </Link>
            <Link to="/quienes-somos" className="hero-secondary">
              Conocer más
            </Link>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">19</span>
              <span className="stat-label">Capítulos</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">62+</span>
              <span className="stat-label">Años de historia</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Ingenieros</span>
            </div>
          </div>
        </div>
        <div className="hero-decoration">
          <div className="floating-shape shape-1"></div>
          <div className="floating-shape shape-2"></div>
          <div className="floating-shape shape-3"></div>
        </div>
      </section>

      {/* ABOUT PREVIEW CARDS */}
      <section className="about-preview">
        <div className="about-card card-1">
          <div className="card-icon">
            <FaGraduationCap />
          </div>
          <h3>Nuestra misión</h3>
          <p>Fomentar la excelencia y la ética profesional en la ingeniería peruana.</p>
          <Link to="/quienes-somos" className="card-link">
            Saber más <FaArrowRight />
          </Link>
        </div>

        <div className="about-card card-2">
          <div className="card-icon">
            <FaUsers />
          </div>
          <h3>19 capítulos</h3>
          <p>Especialidades de ingeniería representadas a nivel nacional.</p>
          <Link to="/servicios" className="card-link">
            Ver especialidades <FaArrowRight />
          </Link>
        </div>

        <div className="about-card card-3">
          <div className="card-icon">
            <FaAward />
          </div>
          <h3>Desde 1962</h3>
          <p>Más de seis décadas impulsando el desarrollo del país.</p>
          <Link to="/quienes-somos" className="card-link">
            Nuestra historia <FaArrowRight />
          </Link>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features">
        <div className="features-header">
          <span className="features-eyebrow">¿Por qué unirte?</span>
          <h2>Beneficios del Consejo Estudiantil</h2>
        </div>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">
              <FaHandshake />
            </div>
            <h4>Networking profesional</h4>
            <p>Conecta con ingenieros y estudiantes de todas las especialidades.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <FaLightbulb />
            </div>
            <h4>Desarrollo académico</h4>
            <p>Acceso a conferencias, talleres y recursos educativos exclusivos.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">
              <FaRocket />
            </div>
            <h4>Oportunidades laborales</h4>
            <p>Bolsa de trabajo y prácticas profesionales en empresas líderes.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;