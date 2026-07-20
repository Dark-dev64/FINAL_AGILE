import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import BuscarColegiadoDni from "../components/BuscarColegiadoDni";
import MetodosPago from "../components/MetodosPago";
import { FaExclamationCircle, FaSpinner, FaUserCheck, FaRedo } from "react-icons/fa";
import "../styles/PagoMatricula.css";

function PagarMensualidad() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [colegiado, setColegiado] = useState(null);
  const [pagoMensualidad, setPagoMensualidad] = useState(undefined); // undefined = aún no buscado, null = no tiene
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState(null);

  const buscarMensualidadPendiente = async (colegiadoEncontrado) => {
    setColegiado(colegiadoEncontrado);
    setError(null);
    setCargandoPagos(true);
    try {
      const response = await api.get("/pagos", {
        params: { id_usuario_colegiado: colegiadoEncontrado.id_usuario },
      });
      const pendiente = response.data.data.find(
        (p) => p.tipo_pago === "mensualidad" && p.estado_pago === "pendiente"
      );
      setPagoMensualidad(pendiente || null);
    } catch {
      setError("No se pudieron cargar los pagos del colegiado.");
    } finally {
      setCargandoPagos(false);
    }
  };

  const reiniciarBusqueda = () => {
    setColegiado(null);
    setPagoMensualidad(undefined);
    setError(null);
  };

  const handleConfirmarEfectivo = async () => {
    await api.patch(`/pagos/${pagoMensualidad.id_pago}`, {
      metodo_pago: "efectivo",
      id_usuario_cajero: session.id_usuario,
    });
    return { message: "Mensualidad pagada correctamente." };
  };

  const crearPreferencia = async (enviarLinkCanal) => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: [pagoMensualidad.id_pago],
      id_usuario_cajero: session.id_usuario,
      enviar_link_canal: enviarLinkCanal || null,
    });
    return response.data.data.preferencia;
  };

  return (
    <section className="dashboard form-layout">
      <div className="pago-matricula">
        <div className="registro-header">
          <span className="dashboard-role">Cajero</span>
          <h1>Pagar mensualidad</h1>
          <p>Busca a un colegiado por DNI para cobrar su mensualidad pendiente.</p>
        </div>

        {!colegiado && <BuscarColegiadoDni onEncontrado={buscarMensualidadPendiente} />}

        {colegiado && (
          <>
            <div className="registro-feedback success">
              <FaUserCheck />
              {colegiado.nombre_completo} — DNI {colegiado.dni}
            </div>

            <button type="button" className="back-button" onClick={reiniciarBusqueda}>
              <FaRedo /> Buscar otro colegiado
            </button>
          </>
        )}

        {error && (
          <div className="registro-feedback error">
            <FaExclamationCircle />
            {error}
          </div>
        )}

        {cargandoPagos && (
          <p className="lista-estado">
            <FaSpinner className="spinning" /> Buscando mensualidad pendiente...
          </p>
        )}

        {colegiado && pagoMensualidad === null && (
          <div className="registro-feedback success">
            <FaUserCheck />
            Este colegiado no tiene mensualidad pendiente por pagar (o ya está atrasada — revisa "Pagar deudas").
          </div>
        )}

        {colegiado && pagoMensualidad && (
          <MetodosPago
            monto={pagoMensualidad.monto_total}
            onConfirmarEfectivo={handleConfirmarEfectivo}
            onCrearPreferenciaMP={crearPreferencia}
            onExito={() => setTimeout(() => navigate("/dashboard-cajero"), 2000)}
            correoDisponible={!!colegiado.correo}
            telefonoDisponible={!!colegiado.telefono}
            textoBotonEfectivo="Confirmar pago en efectivo"
            mensajeExitoPolling="¡Mensualidad pagada correctamente!"
          />
        )}
      </div>
    </section>
  );
}

export default PagarMensualidad;
