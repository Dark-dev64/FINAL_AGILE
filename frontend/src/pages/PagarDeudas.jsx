import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import BuscarColegiadoDni from "../components/BuscarColegiadoDni";
import MetodosPago from "../components/MetodosPago";
import { FaExclamationCircle, FaSpinner, FaUserCheck, FaRedo } from "react-icons/fa";
import "../styles/PagoMatricula.css";
import "../styles/MisPagos.css";
import "../styles/PagarDeudas.css";

const TIPO_PAGO_LABELS = {
  inscripcion: "Matrícula",
  mensualidad: "Mensualidad",
  otro: "Otro",
};

function PagarDeudas() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [colegiado, setColegiado] = useState(null);
  const [deudas, setDeudas] = useState(undefined); // undefined = aún no buscado
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState(null);

  const buscarDeudas = async (colegiadoEncontrado) => {
    setColegiado(colegiadoEncontrado);
    setError(null);
    setCargandoPagos(true);
    try {
      const response = await api.get("/pagos", {
        params: { id_usuario_colegiado: colegiadoEncontrado.id_usuario },
      });
      const atrasadas = response.data.data.filter((p) => p.estado_pago === "atrasado");
      setDeudas(atrasadas);
      setSeleccionadas([]);
    } catch {
      setError("No se pudieron cargar las deudas del colegiado.");
    } finally {
      setCargandoPagos(false);
    }
  };

  const reiniciarBusqueda = () => {
    setColegiado(null);
    setDeudas(undefined);
    setSeleccionadas([]);
    setError(null);
  };

  const toggleSeleccion = (idPago) => {
    setSeleccionadas((prev) =>
      prev.includes(idPago) ? prev.filter((id) => id !== idPago) : [...prev, idPago]
    );
  };

  const deudasSeleccionadas = useMemo(
    () => (deudas || []).filter((d) => seleccionadas.includes(d.id_pago)),
    [deudas, seleccionadas]
  );

  const montoTotal = useMemo(
    () => deudasSeleccionadas.reduce((acc, d) => acc + Number(d.monto_total), 0),
    [deudasSeleccionadas]
  );

  const handleConfirmarEfectivo = async () => {
    await Promise.all(
      seleccionadas.map((idPago) =>
        api.patch(`/pagos/${idPago}`, {
          metodo_pago: "efectivo",
          id_usuario_cajero: session.id_usuario,
        })
      )
    );
    return { message: `${seleccionadas.length} deuda(s) pagada(s) correctamente.` };
  };

  const crearPreferencia = async (enviarLinkCanal) => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: seleccionadas,
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
          <h1>Pagar deudas</h1>
          <p>Busca a un colegiado por DNI para cobrar sus mensualidades atrasadas.</p>
        </div>

        {!colegiado && <BuscarColegiadoDni onEncontrado={buscarDeudas} />}

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
            <FaSpinner className="spinning" /> Buscando deudas pendientes...
          </p>
        )}

        {colegiado && deudas && deudas.length === 0 && (
          <div className="registro-feedback success">
            <FaUserCheck />
            Este colegiado no tiene deudas pendientes.
          </div>
        )}

        {colegiado && deudas && deudas.length > 0 && (
          <div className="pagos-lista">
            {deudas.map((d) => (
              <label key={d.id_pago} className="pago-item deuda-seleccionable">
                <input
                  type="checkbox"
                  className="deuda-checkbox"
                  checked={seleccionadas.includes(d.id_pago)}
                  onChange={() => toggleSeleccion(d.id_pago)}
                />
                <div className="pago-item-info">
                  <span className="pago-item-tipo">
                    {TIPO_PAGO_LABELS[d.tipo_pago] ?? d.tipo_pago}
                  </span>
                  <span className="pago-item-fecha">
                    Vencimiento: {new Date(d.fecha_vencimiento).toLocaleDateString()}
                  </span>
                </div>
                <div className="pago-item-monto">S/ {Number(d.monto_total).toFixed(2)}</div>
              </label>
            ))}
          </div>
        )}

        {seleccionadas.length > 0 && (
          <MetodosPago
            monto={montoTotal}
            onConfirmarEfectivo={handleConfirmarEfectivo}
            onCrearPreferenciaMP={crearPreferencia}
            onExito={() => setTimeout(() => navigate("/dashboard-cajero"), 2000)}
            correoDisponible={!!colegiado.correo}
            telefonoDisponible={!!colegiado.telefono}
            textoBotonEfectivo="Confirmar pago en efectivo"
            mensajeExitoPolling="¡Deudas pagadas correctamente!"
            detalleMonto={`${seleccionadas.length} deuda(s) seleccionada(s)`}
          />
        )}
      </div>
    </section>
  );
}

export default PagarDeudas;
