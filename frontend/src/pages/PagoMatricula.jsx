import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRegistroColegiado } from "../hooks/useRegistroColegiado";
import api from "../services/api";
import { subirFotoCarnet, subirTitulo } from "../services/uploadService";
import MetodosPago from "../components/MetodosPago";
import { FaArrowLeft } from "react-icons/fa";
import "../styles/PagoMatricula.css";

const MONTO_MENSUALIDAD = 3.0;
const MONTO_CARNET = 1.0; // prueba
const MONTO_MATRICULA = MONTO_MENSUALIDAD + MONTO_CARNET; // 4.0

function PagoMatricula() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { resetFormulario } = useRegistroColegiado();
  const { form, fotoFile, tituloFile } = location.state || {};

  const esAdmin = session?.rol === "admin";

  if (!form) {
    navigate("/dashboard-cajero");
    return null;
  }

  const crearPreferencia = async (enviarLinkCanal) => {
    const [datosFoto, datosTitulo] = await Promise.all([
      subirFotoCarnet(fotoFile.file, form.dni),
      subirTitulo(tituloFile, form.dni),
    ]);

    const response = await api.post("/pagos/mercadopago/crear-preferencia", {
      ...form,
      id_usuario_cajero: session.id_usuario,
      foto_key: datosFoto.foto_key,
      foto_content_type: datosFoto.foto_content_type,
      foto_size_bytes: datosFoto.foto_size_bytes,
      foto_ancho_px: fotoFile.ancho,
      foto_alto_px: fotoFile.alto,
      titulo_key: datosTitulo.titulo_key,
      titulo_content_type: datosTitulo.titulo_content_type,
      titulo_size_bytes: datosTitulo.titulo_size_bytes,
      enviar_link_canal: enviarLinkCanal || null,
    });

    return response.data.data.preferencia;
  };

  const handleConfirmarEfectivo = async (fechaPago) => {
    const [datosFoto, datosTitulo] = await Promise.all([
      subirFotoCarnet(fotoFile.file, form.dni),
      subirTitulo(tituloFile, form.dni),
    ]);

    const response = await api.post("/solicitudes/con-pago", {
      ...form,
      id_usuario_cajero: session.id_usuario,
      foto_key: datosFoto.foto_key,
      foto_content_type: datosFoto.foto_content_type,
      foto_size_bytes: datosFoto.foto_size_bytes,
      foto_ancho_px: fotoFile.ancho,
      foto_alto_px: fotoFile.alto,
      titulo_key: datosTitulo.titulo_key,
      titulo_content_type: datosTitulo.titulo_content_type,
      titulo_size_bytes: datosTitulo.titulo_size_bytes,
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
          <h1>{form.nombre_completo}</h1>
          <p>DNI: {form.dni}</p>
        </div>

        <MetodosPago
          monto={MONTO_MATRICULA}
          onConfirmarEfectivo={handleConfirmarEfectivo}
          onCrearPreferenciaMP={crearPreferencia}
          onExito={() => {
            resetFormulario();
            setTimeout(() => navigate("/dashboard-cajero"), 2500);
          }}
          mostrarSelectorFecha={esAdmin}
          correoDisponible={!!form.correo}
          telefonoDisponible={!!form.telefono}
          textoBotonEfectivo="Confirmar pago en efectivo"
          mensajeExitoPolling="¡Pago confirmado! Solicitud enviada al administrador."
          detalleMonto={`Mensualidad S/ ${MONTO_MENSUALIDAD.toFixed(2)} + Carnet S/ ${MONTO_CARNET.toFixed(2)}`}
        />
      </div>
    </section>
  );
}

export default PagoMatricula;
