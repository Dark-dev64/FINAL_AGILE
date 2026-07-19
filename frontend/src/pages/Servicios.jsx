import { Link } from "react-router-dom";
import { 
  FaChalkboardTeacher,
  FaCertificate,
  FaUsers,
  FaBriefcase,
  FaHandsHelping,
  FaRocket,
  FaArrowRight,
  FaCalendarAlt
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
import "../styles/Page.css";

function Servicios() {
  return (
    <div className="servicios">
      {/* HEADER */}
      <section className="page-header">
        <span className="page-eyebrow">
          <MdEngineering className="eyebrow-icon" />
          Lo que ofrecemos
        </span>
        <h1>Servicios</h1>
        <p>Recursos y espacios pensados para acompañar tu formación como futuro ingeniero.</p>
      </section>

      {/* SERVICIOS PRINCIPALES */}
      <section className="services-grid">
        <div className="service-card">
          <div className="service-icon training">
            <FaChalkboardTeacher />
          </div>
          <h3>Capacitaciones</h3>
          <p>Talleres y charlas con ingenieros colegiados de distintas especialidades.</p>
          <div className="service-tags">
            <span>Talleres</span>
            <span>Charlas</span>
            <span>Expertos</span>
          </div>
          <Link to="/contacto" className="service-link">
            Más información <FaArrowRight />
          </Link>
        </div>

        <div className="service-card featured">
          <div className="service-badge">Destacado</div>
          <div className="service-icon certification">
            <FaCertificate />
          </div>
          <h3>Certificaciones</h3>
          <p>Orientación sobre el proceso de colegiatura y certificaciones profesionales.</p>
          <div className="service-tags">
            <span>Colegiatura</span>
            <span>Certificación</span>
            <span>Asesoría</span>
          </div>
          <Link to="/contacto" className="service-link">
            Más información <FaArrowRight />
          </Link>
        </div>

        <div className="service-card">
          <div className="service-icon networking">
            <FaUsers />
          </div>
          <h3>Networking</h3>
          <p>Conexión con los 19 capítulos de ingeniería a nivel nacional.</p>
          <div className="service-tags">
            <span>Conexiones</span>
            <span>19 Capítulos</span>
            <span>Nacional</span>
          </div>
          <Link to="/contacto" className="service-link">
            Más información <FaArrowRight />
          </Link>
        </div>
      </section>

      {/* SERVICIOS ADICIONALES */}
      <section className="extra-services">
        <h2>Servicios adicionales</h2>
        <div className="extra-grid">
          <div className="extra-item">
            <FaBriefcase className="extra-icon" />
            <div>
              <h4>Bolsa de trabajo</h4>
              <p>Oportunidades laborales para estudiantes y egresados.</p>
            </div>
          </div>
          <div className="extra-item">
            <FaCalendarAlt className="extra-icon" />
            <div>
              <h4>Eventos</h4>
              <p>Congresos, seminarios y actividades académicas.</p>
            </div>
          </div>
          <div className="extra-item">
            <FaHandsHelping className="extra-icon" />
            <div>
              <h4>Voluntariado</h4>
              <p>Proyectos de responsabilidad social e ingeniería comunitaria.</p>
            </div>
          </div>
          <div className="extra-item">
            <FaRocket className="extra-icon" />
            <div>
              <h4>Emprendimiento</h4>
              <p>Apoyo a proyectos de innovación y startups.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Servicios;