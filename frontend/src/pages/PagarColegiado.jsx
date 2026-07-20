import { useState, useMemo } from "react";
import { useAuth } from "../hooks/useAuth";
import api from "../services/api";
import BuscarColegiadoDni from "../components/BuscarColegiadoDni";
import MetodosPago from "../components/MetodosPago";
import { FaExclamationCircle, FaSpinner, FaUserCheck, FaRedo, FaCreditCard } from "react-icons/fa";
import "../styles/PagoMatricula.css";
import "../styles/MisPagos.css";
import "../styles/PagarColegiado.css";

const TIPO_PAGO_LABELS = {
  inscripcion: "Matrícula",
  mensualidad: "Mensualidad",
  otro: "Otro",
};

function PagarColegiado() {
  const { session } = useAuth();

  const [colegiado, setColegiado] = useState(null);
  const [pagos, setPagos] = useState(undefined); // undefined = aún no buscado
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [error, setError] = useState(null);

  const buscarPagos = async (colegiadoEncontrado) => {
    setColegiado(colegiadoEncontrado);
    setError(null);
    setCargandoPagos(true);
    try {
      const response = await api.get("/pagos", {
        params: { id_usuario_colegiado: colegiadoEncontrado.id_usuario },
      });
      setPagos(response.data.data);
      setSeleccionadas([]);
    } catch {
      setError("No se pudieron cargar los pagos del colegiado.");
    } finally {
      setCargandoPagos(false);
    }
  };

  const reiniciarBusqueda = () => {
    setColegiado(null);
    setPagos(undefined);
    setSeleccionadas([]);
    setError(null);
  };

  const deudas = useMemo(() => (pagos || []).filter((p) => p.estado_pago === "atrasado"), [pagos]);

  const mensualidadPendiente = useMemo(
    () => (pagos || []).find((p) => p.tipo_pago === "mensualidad" && p.estado_pago === "pendiente") || null,
    [pagos]
  );

  const sinPendientes = colegiado && pagos && deudas.length === 0 && !mensualidadPendiente;

  const toggleSeleccion = (idPago) => {
    setSeleccionadas((prev) => (prev.includes(idPago) ? prev.filter((id) => id !== idPago) : [...prev, idPago]));
  };

  const deudasSeleccionadas = useMemo(
    () => deudas.filter((d) => seleccionadas.includes(d.id_pago)),
    [deudas, seleccionadas]
  );

  const montoDeudaSeleccionada = useMemo(
    () => deudasSeleccionadas.reduce((acc, d) => acc + Number(d.monto_total), 0),
    [deudasSeleccionadas]
  );

  // Después de pagar, refrescamos la búsqueda del MISMO colegiado en vez de
  // salir de la pantalla: así, si tenía deuda Y mensualidad pendiente, el
  // cajero puede cobrar lo que falte sin tener que buscarlo de nuevo.
  const handleExito = () => {
    setTimeout(() => {
      if (colegiado) buscarPagos(colegiado);
    }, 2000);
  };

  const handleConfirmarEfectivoDeuda = async () => {
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

  const crearPreferenciaDeuda = async (enviarLinkCanal) => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: seleccionadas,
      id_usuario_cajero: session.id_usuario,
      enviar_link_canal: enviarLinkCanal || null,
    });
    return response.data.data.preferencia;
  };

  const handleConfirmarEfectivoMensualidad = async () => {
    await api.patch(`/pagos/${mensualidadPendiente.id_pago}`, {
      metodo_pago: "efectivo",
      id_usuario_cajero: session.id_usuario,
    });
    return { message: "Mensualidad pagada correctamente." };
  };

  const crearPreferenciaMensualidad = async (enviarLinkCanal) => {
    const response = await api.post("/pagos/mercadopago/crear-preferencia-pago", {
      ids_pago: [mensualidadPendiente.id_pago],
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
          <h1>Pagar mensualidad y deudas</h1>
          <p>Busca a un colegiado por DNI para cobrar su mensualidad pendiente y/o sus deudas atrasadas.</p>
        </div>

        {!colegiado && <BuscarColegiadoDni onEncontrado={buscarPagos} />}

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
            <FaSpinner className="spinning" /> Buscando pagos pendientes...
          </p>
        )}

        {sinPendientes && (
          <div className="registro-feedback success">
            <FaUserCheck />
            Este colegiado no tiene deudas ni mensualidad pendiente.
          </div>
        )}

        {colegiado && deudas.length > 0 && (
          <div className="deuda-card">
            <div className="deuda-card-header">
              <FaExclamationCircle className="deuda-icon" />
              <h2>Deuda pendiente</h2>
            </div>

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
                    <span className="pago-item-tipo">{TIPO_PAGO_LABELS[d.tipo_pago] ?? d.tipo_pago}</span>
                    <span className="pago-item-fecha">
                      Vencimiento: {new Date(d.fecha_vencimiento).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="pago-item-monto">S/ {Number(d.monto_total).toFixed(2)}</div>
                </label>
              ))}
            </div>

            {seleccionadas.length > 0 && (
              <MetodosPago
                monto={montoDeudaSeleccionada}
                onConfirmarEfectivo={handleConfirmarEfectivoDeuda}
                onCrearPreferenciaMP={crearPreferenciaDeuda}
                onExito={handleExito}
                correoDisponible={!!colegiado.correo}
                telefonoDisponible={!!colegiado.telefono}
                textoBotonEfectivo="Confirmar pago en efectivo"
                mensajeExitoPolling="¡Deuda pagada correctamente!"
                detalleMonto={`${seleccionadas.length} deuda(s) seleccionada(s)`}
              />
            )}
          </div>
        )}

        {colegiado && mensualidadPendiente && (
          <div className="mensualidad-card">
            <div className="mensualidad-card-header">
              <FaCreditCard className="mensualidad-icon" />
              <h2>Mensualidad pendiente</h2>
            </div>
            <p className="mensualidad-monto">S/ {Number(mensualidadPendiente.monto_total).toFixed(2)}</p>
            <p className="mensualidad-detalle">
              Vence el {new Date(mensualidadPendiente.fecha_vencimiento).toLocaleDateString()}.
            </p>

            <MetodosPago
              monto={mensualidadPendiente.monto_total}
              onConfirmarEfectivo={handleConfirmarEfectivoMensualidad}
              onCrearPreferenciaMP={crearPreferenciaMensualidad}
              onExito={handleExito}
              correoDisponible={!!colegiado.correo}
              telefonoDisponible={!!colegiado.telefono}
              textoBotonEfectivo="Confirmar pago en efectivo"
              mensajeExitoPolling="¡Mensualidad pagada correctamente!"
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default PagarColegiado;
