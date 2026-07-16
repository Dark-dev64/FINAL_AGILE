import "../styles/Page.css";

function Contacto() {
  return (
    <section className="page">
      <div className="page-header">
        <span className="page-eyebrow">Escríbenos</span>
        <h1>Contacto</h1>
        <p>¿Tienes alguna consulta? Este es un formulario de contacto, aún no conectado a ningún servicio.</p>
      </div>

      <form className="contact-form">
        <label>
          Nombre
          <input type="text" placeholder="Tu nombre completo" />
        </label>
        <label>
          Correo
          <input type="email" placeholder="tucorreo@ejemplo.com" />
        </label>
        <label>
          Mensaje
          <textarea rows="5" placeholder="Escribe tu mensaje..."></textarea>
        </label>
        <button type="submit">Enviar mensaje</button>
      </form>
    </section>
  );
}

export default Contacto;