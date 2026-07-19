import { Link } from "react-router-dom";
import { 
  FaMapMarkerAlt, 
  FaEnvelope, 
  FaPhone, 
  FaFacebook, 
  FaTwitter, 
  FaLinkedin, 
  FaInstagram,
  FaYoutube
} from "react-icons/fa";
import { MdSchool } from "react-icons/md";
import "../styles/Footer.css";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        {/* Columna 1: Marca */}
        <div className="footer-brand">
          <img src="/logocipfooter.png" alt="Colegio de Ingenieros del Perú" className="footer-logo" />
          <div>
            <h3>Colegio de Ingenieros</h3>
            <p>Consejo Estudiantil — Proyecto universitario</p>
            <div className="footer-social">
              <a href="#" aria-label="Facebook" className="social-link">
                <FaFacebook />
              </a>
              <a href="#" aria-label="Twitter" className="social-link">
                <FaTwitter />
              </a>
              <a href="#" aria-label="LinkedIn" className="social-link">
                <FaLinkedin />
              </a>
              <a href="#" aria-label="Instagram" className="social-link">
                <FaInstagram />
              </a>
              <a href="#" aria-label="YouTube" className="social-link">
                <FaYoutube />
              </a>
            </div>
          </div>
        </div>

        {/* Columna 2: Navegación */}
        <div className="footer-column">
          <h4>Navegación</h4>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/quienes-somos">Quiénes somos</Link></li>
            <li><Link to="/servicios">Servicios</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </div>

        {/* Columna 3: Contacto */}
        <div className="footer-column">
          <h4>Contacto</h4>
          <ul className="contact-list">
            <li>
              <FaEnvelope className="contact-icon" />
              <a href="mailto:contacto@cip-estudiantil.pe">contacto@cip-estudiantil.pe</a>
            </li>
            <li>
              <FaPhone className="contact-icon" />
              <a href="tel:+5112345678">+51 1 234 5678</a>
            </li>
            <li>
              <FaMapMarkerAlt className="contact-icon" />
              <span>Lima, Perú</span>
            </li>
            <li>
              <MdSchool className="contact-icon" />
              <span>Proyecto Universitario</span>
            </li>
          </ul>
        </div>

        {/* Columna 4: Newsletter / Horario */}
        <div className="footer-column">
          <h4>Horario de Atención</h4>
          <ul className="schedule-list">
            <li>
              <span className="day">Lunes - Viernes</span>
              <span className="hours">9:00 AM - 6:00 PM</span>
            </li>
            <li>
              <span className="day">Sábado</span>
              <span className="hours">9:00 AM - 1:00 PM</span>
            </li>
            <li>
              <span className="day">Domingo</span>
              <span className="hours">Cerrado</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Footer inferior */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <p>
            &copy; {currentYear} Colegio de Ingenieros del Perú — Consejo Estudiantil. 
            Todos los derechos reservados.
          </p>
          <div className="footer-legal">
            <Link to="/politica-privacidad">Política de Privacidad</Link>
            <span className="separator">|</span>
            <Link to="/terminos">Términos y Condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;