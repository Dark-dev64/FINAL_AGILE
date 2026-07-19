import "../styles/Carnet.css";

function CarnetColegiado({ data }) {
  return (
    <div className="carnet">
      <img src="/logocip.png" alt="" aria-hidden="true" className="carnet-watermark" />

      <div className="carnet-content">
        <div className="carnet-left-col">
          <img src="/logocip.png" alt="CIP" className="carnet-logo" />
          <img src={data.fotoUrl} alt="Foto del colegiado" className="carnet-photo" />
        </div>

        <div className="carnet-right-col">
          <h2 className="carnet-title">
            <span className="carnet-title-line">COLEGIO DE INGENIEROS</span>
            <span className="carnet-title-line">DEL PERÚ</span>
          </h2>

          <div className="carnet-info">
            <p className="carnet-nombre">{data.apellidoPaterno}</p>
            <p className="carnet-nombre">{data.apellidoMaterno}</p>
            <p className="carnet-nombre">{data.nombreCompleto}</p>
            <p className="carnet-especialidad">{data.especialidad}</p>
            <p className="carnet-dni">DNI: {data.dni}</p>
          </div>

          <div className="carnet-footer">
            <span className="carnet-footer-label">Nº Reg. CIP:</span>
            <span className="carnet-footer-value">{data.numeroRegistro}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarnetColegiado;