import "../styles/Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <img src="/logocipfooter.png" alt="Colegio de Ingenieros del Perú" className="footer-logo" />
          <p>Colegio de Ingenieros del Perú<br />Consejo Estudiantil — Proyecto universitario</p>
        </div>

        <div className="footer-column">
          <h4>Navegación</h4>
          <a href="/quienes-somos">Quiénes somos</a>
          <a href="/servicios">Servicios</a>
          <a href="/contacto">Contacto</a>
        </div>

        <div className="footer-column">
          <h4>Contacto</h4>
          <p>contacto@cip-estudiantil.pe</p>
          <p>Lima, Perú</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Proyecto Universitario — Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}

export default Footer;