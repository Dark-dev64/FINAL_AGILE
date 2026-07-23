import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import MetodosPago from "../components/MetodosPago";
import { FaArrowLeft } from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0;
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET;

function PagoMatricula() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { idSolicitud, nombreCompleto, dni, correo, telefono } = location.state || {};

  const esAdmin = session?.rol === "admin";

  if (!idSolicitud) {
    navigate("/dashboard-cajero");
    return null;
  }

  const crearPreferencia = async (enviarLinkCanal) => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia", {
      id_solicitud: idSolicitud,
      id_usuario_cajero: session.id_usuario,
      enviar_link_canal: enviarLinkCanal || null,
    });

    return response.data.data.preferencia;
  };

  const handleConfirmarEfectivo = async (fechaPago) => {
    const response = await api.patch(`/solicitudes/${idSolicitud}/confirmar-pago`, {
      id_usuario_cajero: session.id_usuario,
      metodo_pago: "efectivo",
      fecha_pago: new Date(fechaPago).toISOString(),
      fecha_vencimiento: fechaPago,
    });

    return { message: `Pago registrado y solicitud enviada al administrador (N° ${response.data.data.id_solicitud}).` };
  };

  return (
    <section className="dashboard form-layout">
      <div className="pago-matricula">
        <button className="back-button" onClick={() => navigate("/dashboard-cajero")}>
          <FaArrowLeft /> Volver
        </button>

        <div className="registro-header">
          <span className="dashboard-role">Pago de matrícula</span>
          <h1>{nombreCompleto}</h1>
          <p>DNI: {dni}</p>
        </div>

        <MetodosPago
          monto={MONTO_MATRICULA}
          onConfirmarEfectivo={handleConfirmarEfectivo}
          onCrearPreferenciaMP={crearPreferencia}
          onExito={() => {
            setTimeout(() => navigate("/dashboard-cajero"), 2500);
          }}
          mostrarSelectorFecha={esAdmin}
          correoDisponible={!!correo}
          telefonoDisponible={!!telefono}
          textoBotonEfectivo="Confirmar pago en efectivo"
          mensajeExitoPolling="¡Pago confirmado! Solicitud enviada al administrador."
          detalleMonto={`Mensualidad S/ ${MONTO_MENSUALIDAD.toFixed(2)} + Carnet S/ ${MONTO_CARNET.toFixed(2)}`}
        />
      </div>
    </section>
  );
}

export default PagoMatricula;

