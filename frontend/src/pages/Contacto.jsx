import { useState } from "react";
import { 
  FaEnvelope,
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaCheckCircle,
  FaFacebook,
  FaTwitter,
  FaLinkedin,
  FaInstagram,
  FaYoutube
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
import "../styles/Page.css";

function Contacto() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  });

  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí iría la lógica de envío
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  return (
    <div className="contacto">
      {/* HEADER */}
      <section className="page-header">
        <span className="page-eyebrow">
          <MdEngineering className="eyebrow-icon" />
          Escríbenos
        </span>
        <h1>Contacto</h1>
        <p>¿Tienes alguna consulta? Estamos aquí para ayudarte.</p>
      </section>

      <div className="contact-wrapper">
        {/* FORMULARIO */}
        <div className="contact-form-container">
          {isSubmitted ? (
            <div className="success-message">
              <FaCheckCircle className="success-icon" />
              <h3>¡Mensaje enviado!</h3>
              <p>Nos pondremos en contacto contigo pronto.</p>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="nombre">
                  <FaUser className="form-icon" />
                  Nombre completo
                </label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  placeholder="Tu nombre completo"
                  value={formData.nombre}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">
                    <FaEnvelope className="form-icon" />
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="tucorreo@ejemplo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="telefono">
                    <FaPhone className="form-icon" />
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    placeholder="+51 987 654 321"
                    value={formData.telefono}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="asunto">Asunto</label>
                <input
                  type="text"
                  id="asunto"
                  name="asunto"
                  placeholder="¿Sobre qué deseas contactarnos?"
                  value={formData.asunto}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  rows="5"
                  placeholder="Escribe tu mensaje detalladamente..."
                  value={formData.mensaje}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <button type="submit" className="submit-btn">
                <FaPaperPlane className="btn-icon" />
                Enviar mensaje
              </button>
            </form>
          )}
        </div>

        {/* INFORMACIÓN DE CONTACTO */}
        <div className="contact-info">
          <h3>Información de contacto</h3>
          
          <div className="info-item">
            <FaEnvelope className="info-icon" />
            <div>
              <strong>Email</strong>
              <a href="mailto:contacto@cip-estudiantil.pe">contacto@cip-estudiantil.pe</a>
            </div>
          </div>

          <div className="info-item">
            <FaPhone className="info-icon" />
            <div>
              <strong>Teléfono</strong>
              <a href="tel:+5112345678">+51 1 234 5678</a>
            </div>
          </div>

          <div className="info-item">
            <FaMapMarkerAlt className="info-icon" />
            <div>
              <strong>Dirección</strong>
              <span>Lima, Perú</span>
            </div>
          </div>

          <div className="social-section">
            <h4>Síguenos en redes</h4>
            <div className="social-links">
              <a href="#" aria-label="Facebook" className="social-link fb">
                <FaFacebook />
              </a>
              <a href="#" aria-label="Twitter" className="social-link tw">
                <FaTwitter />
              </a>
              <a href="#" aria-label="LinkedIn" className="social-link li">
                <FaLinkedin />
              </a>
              <a href="#" aria-label="Instagram" className="social-link ig">
                <FaInstagram />
              </a>
              <a href="#" aria-label="YouTube" className="social-link yt">
                <FaYoutube />
              </a>
            </div>
          </div>

          <div className="contact-hours">
            <h4>Horario de atención</h4>
            <div className="hours-item">
              <span>Lunes - Viernes</span>
              <span>9:00 AM - 6:00 PM</span>
            </div>
            <div className="hours-item">
              <span>Sábado</span>
              <span>9:00 AM - 1:00 PM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contacto;