import { Link } from "react-router-dom";
import { 
  FaBullseye, 
  FaEye, 
  FaHeart, 
  FaHandshake,
  FaShieldAlt,
  FaUsers,
  FaGraduationCap,
  FaArrowRight
} from "react-icons/fa";
import { MdEngineering, MdSchool } from "react-icons/md";
import "../styles/Page.css";

function QuienesSomos() {
  return (
    <div className="quienes-somos">
      {/* HEADER */}
      <section className="page-header">
        <span className="page-eyebrow">
          <MdEngineering className="eyebrow-icon" />
          Nosotros
        </span>
        <h1>Quiénes somos</h1>
        <p>
          Somos el Consejo Estudiantil del Colegio de Ingenieros del Perú,
          un espacio creado para acercar a los futuros ingenieros a los
          valores y la trayectoria institucional del CIP.
        </p>
      </section>

      {/* MISIÓN, VISIÓN, VALORES */}
      <section className="values-grid">
        <div className="value-card mission">
          <div className="value-icon">
            <FaBullseye />
          </div>
          <h3>Misión</h3>
          <p>Fomentar la excelencia y la ética profesional desde la etapa universitaria.</p>
        </div>

        <div className="value-card vision">
          <div className="value-icon">
            <FaEye />
          </div>
          <h3>Visión</h3>
          <p>Ser el puente entre la formación académica y el ejercicio profesional de la ingeniería.</p>
        </div>

        <div className="value-card values">
          <div className="value-icon">
            <FaHeart />
          </div>
          <h3>Valores</h3>
          <p>Integridad, compromiso, trabajo en equipo y responsabilidad social.</p>
        </div>
      </section>

      {/* EQUIPO / HISTORIA */}
      <section className="history-section">
        <div className="history-content">
          <h2>Nuestra historia</h2>
          <p>
            Fundado en 1962, el Colegio de Ingenieros del Perú ha sido el pilar 
            del desarrollo profesional en el país. El Consejo Estudiantil nace 
            con el objetivo de conectar a los futuros ingenieros con esta 
            tradición de excelencia.
          </p>
          <div className="history-stats">
            <div className="history-stat">
              <span className="stat-number">1962</span>
              <span className="stat-label">Fundación del CIP</span>
            </div>
            <div className="history-stat">
              <span className="stat-number">19</span>
              <span className="stat-label">Capítulos</span>
            </div>
            <div className="history-stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Ingenieros</span>
            </div>
          </div>
        </div>
        <div className="history-image">
          <div className="image-placeholder">
            <MdSchool className="placeholder-icon" />
          </div>
        </div>
      </section>

      {/* VALORES DETALLADOS */}
      <section className="detailed-values">
        <h2>Nuestros principios</h2>
        <div className="principles-grid">
          <div className="principle-item">
            <FaShieldAlt className="principle-icon" />
            <h4>Integridad</h4>
            <p>Actuamos con honestidad y transparencia en todo lo que hacemos.</p>
          </div>
          <div className="principle-item">
            <FaHandshake className="principle-icon" />
            <h4>Compromiso</h4>
            <p>Dedicados a la formación de ingenieros con excelencia profesional.</p>
          </div>
          <div className="principle-item">
            <FaUsers className="principle-icon" />
            <h4>Trabajo en equipo</h4>
            <p>Colaboramos para construir una comunidad fuerte y unida.</p>
          </div>
          <div className="principle-item">
            <FaGraduationCap className="principle-icon" />
            <h4>Responsabilidad social</h4>
            <p>Comprometidos con el desarrollo sostenible del país.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default QuienesSomos;