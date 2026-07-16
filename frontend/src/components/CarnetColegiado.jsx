import "../styles/Carnet.css";

const ESTADOS = {
  habilitado: { label: "Habilitado", color: "green" },
  inhabilitado: { label: "Inhabilitado", color: "red" },
  con_deuda: { label: "Con deuda", color: "yellow" },
};

function CarnetColegiado({ data }) {
  const estadoInfo = ESTADOS[data.estado] ?? ESTADOS.inhabilitado;

  return (
    <div className="carnet">
      <div className="carnet-header">
        <img src="/logocip.png" alt="CIP" className="carnet-logo" />
        <div className="carnet-title">
          <strong>Colegio de Ingenieros</strong>
          <span>del Perú</span>
        </div>
        <span className={`carnet-estado ${estadoInfo.color}`}>
          {estadoInfo.label}
        </span>
      </div>

      <div className="carnet-body">
        <img src={data.fotoUrl} alt="Foto del colegiado" className="carnet-photo" />

        <div className="carnet-info">
          <p className="carnet-nombre">
            {data.apellidoPaterno} {data.apellidoMaterno}
          </p>
          <p className="carnet-nombre-completo">{data.nombreCompleto}</p>
          <p className="carnet-especialidad">{data.especialidad}</p>

          <div className="carnet-detail">
            <span className="carnet-label">DNI</span>
            <span className="carnet-value">{data.dni}</span>
          </div>

          <div className="carnet-detail">
            <span className="carnet-label">N° Reg. CIP</span>
            <span className="carnet-value">{data.numeroRegistro}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CarnetColegiado;