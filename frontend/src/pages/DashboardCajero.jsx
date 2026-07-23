import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRegistroColegiado } from "../hooks/useRegistroColegiado";
import ConfirmDialog from "../components/ConfirmDialog";
import api from "../services/api";
import {
  FaSearch,
  FaUser,
  FaIdCard,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaLock,
  FaSave,
  FaSpinner,
  FaFileUpload,
  FaFilePdf,
  FaImage,
  FaTrashAlt,
} from "react-icons/fa";
import { MdEngineering } from "react-icons/md";
import "../styles/Dashboard.css";
import "../styles/RegistroColegiado.css";
import { validarArchivo, obtenerDimensionesImagen, validarProporcionCarnet } from "../utils/fileValidators";
import { subirFotoCarnet, subirTitulo } from "../services/uploadService";
import { useNavigate } from "react-router-dom";

function DashboardCajero() {
  const { session } = useAuth();
  const {
    form,
    setForm,
    fotoFile,
    setFotoFile,
    tituloFile,
    setTituloFile,
    datosAutocompletados,
    setDatosAutocompletados,
    dniConsultado,
    setDniConsultado,
    camposBloqueados,
    setCamposBloqueados,
    resetFormulario,
  } = useRegistroColegiado();
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [consultandoDni, setConsultandoDni] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [especialidades, setEspecialidades] = useState([]);
  const [fotoError, setFotoError] = useState(null);
  const [tituloError, setTituloError] = useState(null);
  const [subiendoArchivos, setSubiendoArchivos] = useState(false);
  const [mostrarConfirmBorrar, setMostrarConfirmBorrar] = useState(false);
  const [verificandoDuplicados, setVerificandoDuplicados] = useState(false);
  const navigate = useNavigate();
  const sedeDelCajero = sedes.find((s) => s.id_sede === session?.id_sede);

  const hayDatosIngresados =
    Object.entries(form).some(([campo, valor]) => campo !== "id_sede" && String(valor).trim() !== "") ||
    !!fotoFile ||
    !!tituloFile;

  function confirmarBorrarTodo() {
    resetFormulario();
    setFotoError(null);
    setTituloError(null);
    setFeedback(null);
    setMostrarConfirmBorrar(false);
  }

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const [resSedes, resEspecialidades] = await Promise.all([
          api.get("/sedes"),
          api.get("/especialidades"),
        ]);
        setSedes(resSedes.data.data);
        setEspecialidades(resEspecialidades.data.data);
      } catch (err) {
        setFeedback({ type: "error", message: "No se pudieron cargar los catálogos." });
      }
    }
    cargarCatalogos();
  }, []);

  useEffect(() => {
    if (session?.id_sede) {
      setForm((prev) => ({ ...prev, id_sede: session.id_sede }));
    }
  }, [session, setForm]);

  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "telefono") {
      const soloNumeros = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, telefono: soloNumeros }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    // Si el DNI ya fue consultado, NO permitir cambios en los campos bloqueados
    if (dniConsultado && camposBloqueados[name]) {
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));

    // Si se modifica el DNI después de haber consultado, resetear el estado
    if (name === "dni" && dniConsultado) {
      setDniConsultado(false);
      setDatosAutocompletados(false);
      setCamposBloqueados({
        apellido_paterno: false,
        apellido_materno: false,
        nombre_completo: false,
      });
      setForm((prev) => ({
        ...prev,
        dni: value,
        apellido_paterno: "",
        apellido_materno: "",
        nombre_completo: "",
      }));
    }
  }

  const MENSAJES_DNI_DUPLICADO = {
    aprobada: "Este DNI ya está registrado como colegiado. No se puede volver a registrar.",
    pendiente: "Este DNI ya tiene una solicitud pendiente de revisión.",
    rechazada: "Este DNI ya tiene una solicitud registrada anteriormente (fue rechazada) y no puede volver a usarse.",
  };

  async function handleConsultarDni() {
    if (!/^\d{8}$/.test(form.dni)) {
      setFeedback({ type: "error", message: "Ingresa un DNI válido de 8 dígitos antes de consultar." });
      return;
    }

    setFeedback(null);
    setConsultandoDni(true);

    try {
      const verificacion = await api.get("/solicitudes/verificar", { params: { dni: form.dni } });
      if (verificacion.data.data.dni?.existe) {
        const estado = verificacion.data.data.dni.estado;
        setFeedback({
          type: "error",
          message: MENSAJES_DNI_DUPLICADO[estado] || "Este DNI ya está registrado en el sistema.",
        });
        return;
      }

      const response = await api.get(`/reniec/${form.dni}`);
      const datos = response.data.data;

      setForm((prev) => ({
        ...prev,
        apellido_paterno: datos.apellido_paterno || "",
        apellido_materno: datos.apellido_materno || "",
        nombre_completo: datos.nombres || "",
      }));

      setDatosAutocompletados(true);
      setDniConsultado(true);
      setCamposBloqueados({
        apellido_paterno: true,
        apellido_materno: true,
        nombre_completo: true,
      });
    } catch (err) {
      const mensaje = err.response?.data?.error || "No se pudo consultar el DNI.";
      setFeedback({ type: "error", message: mensaje });
    } finally {
      setConsultandoDni(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);

    if (!dniConsultado) {
      setFeedback({ type: "error", message: "Debes consultar el DNI primero antes de continuar." });
      return;
    }

    if (!form.correo.trim()) {
      setFeedback({ type: "error", message: "Debes registrar un correo de contacto." });
      return;
    }

    if (!fotoFile) {
      setFeedback({ type: "error", message: "Debes adjuntar la foto tipo carnet." });
      return;
    }

    if (!tituloFile) {
      setFeedback({ type: "error", message: "Debes adjuntar el título profesional." });
      return;
    }

    setVerificandoDuplicados(true);
    try {
      const verificacion = await api.get("/solicitudes/verificar", {
        params: {
          dni: form.dni,
          correo: form.correo.trim(),
          ...(form.telefono.trim() ? { telefono: form.telefono.trim() } : {}),
        },
      });
      const { dni, correo, telefono } = verificacion.data.data;

      if (dni?.existe) {
        setFeedback({
          type: "error",
          message: MENSAJES_DNI_DUPLICADO[dni.estado] || "Este DNI ya está registrado en el sistema.",
        });
        return;
      }
      if (correo?.existe) {
        setFeedback({ type: "error", message: "Ese correo ya está registrado con otra solicitud." });
        return;
      }
      if (telefono?.existe) {
        setFeedback({ type: "error", message: "Ese teléfono ya está registrado con otra solicitud." });
        return;
      }
    } catch {
      setFeedback({ type: "error", message: "No se pudo verificar los datos. Intenta de nuevo." });
      return;
    } finally {
      setVerificandoDuplicados(false);
    }

    // Proceso de subida de archivos y creación de la solicitud
    setLoading(true);
    setSubiendoArchivos(true);

    try {
      const [datosFoto, datosTitulo] = await Promise.all([
        subirFotoCarnet(fotoFile.file, form.dni),
        subirTitulo(tituloFile, form.dni),
      ]);

      setSubiendoArchivos(false);

      const response = await api.post("/solicitudes", {
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
      });

      const { id_solicitud } = response.data.data;
      
      const nombreCompleto = form.nombre_completo;
      const dni = form.dni;
      const correo = form.correo;
      const telefono = form.telefono;

      resetFormulario();

      navigate("/dashboard-cajero/pago", {
        state: {
          idSolicitud: id_solicitud,
          nombreCompleto,
          dni,
          correo,
          telefono,
        },
      });
    } catch (err) {
      const mensaje = err.response?.data?.error || "No se pudo registrar la solicitud.";
      setFeedback({ type: "error", message: mensaje });
    } finally {
      setLoading(false);
      setSubiendoArchivos(false);
    }
  }

  const campoBloqueado = (campo) => camposBloqueados[campo];

  async function handleFotoChange(e) {
    const file = e.target.files[0];
    setFotoError(null);
    setFotoFile(null);

    if (!file) return;

    const errorFormato = validarArchivo(file, "foto");
    if (errorFormato) {
      setFotoError(errorFormato);
      return;
    }

    try {
      const { ancho, alto } = await obtenerDimensionesImagen(file);
      const errorProporcion = validarProporcionCarnet(ancho, alto);
      if (errorProporcion) {
        setFotoError(errorProporcion);
        return;
      }
      setFotoFile({ file, ancho, alto });
    } catch (err) {
      setFotoError("No se pudo procesar la imagen.");
    }
  }

  function handleTituloChange(e) {
    const file = e.target.files[0];
    setTituloError(null);
    setTituloFile(null);

    if (!file) return;

    const errorFormato = validarArchivo(file, "titulo");
    if (errorFormato) {
      setTituloError(errorFormato);
      return;
    }

    setTituloFile(file);
  }

  return (
    <section className="dashboard form-layout">
      <div className="registro-colegiado">
        <div className="registro-header">
          <span className="dashboard-role">
            <MdEngineering className="role-icon" />
            Cajero
          </span>
          <h1>Registrar nuevo colegiado</h1>
          <p>Completa los datos del ingeniero para generar su solicitud de colegiatura.</p>
        </div>

        {hayDatosIngresados && (
          <div className="borrar-todo-row">
            <button type="button" className="borrar-todo-btn" onClick={() => setMostrarConfirmBorrar(true)}>
              <FaTrashAlt /> Borrar todos los datos
            </button>
          </div>
        )}

        {mostrarConfirmBorrar && (
          <ConfirmDialog
            titulo="¿Borrar todos los datos?"
            mensaje="Se perderá todo lo que ingresaste en este formulario, incluyendo la foto y el título adjuntados. Esta acción no se puede deshacer."
            textoConfirmar="Sí, borrar todo"
            textoCancelar="Cancelar"
            onConfirmar={confirmarBorrarTodo}
            onCancelar={() => setMostrarConfirmBorrar(false)}
          />
        )}

        <form className="registro-form" onSubmit={handleSubmit}>
          {/* Campo DNI con botón de consulta */}
          <div className="form-group">
            <label htmlFor="dni">
              <FaIdCard className="input-icon" />
              DNI
              <span className="label-hint">(8 dígitos)</span>
            </label>
            <div className="dni-row">
              <input
                id="dni"
                type="text"
                name="dni"
                maxLength={8}
                value={form.dni}
                onChange={handleChange}
                placeholder="Ingresa 8 dígitos"
                required
                disabled={consultandoDni || loading}
                className={dniConsultado ? "success-field" : ""}
              />
              <button
                type="button"
                className="dni-button"
                onClick={handleConsultarDni}
                disabled={consultandoDni || loading || !form.dni || dniConsultado}
              >
                {consultandoDni ? (
                  <>
                    <FaSpinner className="spinning" />
                    Consultando...
                  </>
                ) : dniConsultado ? (
                  <>
                    <FaCheckCircle />
                    Verificado
                  </>
                ) : (
                  <>
                    <FaSearch />
                    Consultar
                  </>
                )}
              </button>
            </div>
            {dniConsultado && (
              <div className="field-helper success">
                <FaCheckCircle />
                <span>DNI verificado</span>
              </div>
            )}
          </div>

          {/* Campos de apellidos y nombre (bloqueados PERMANENTEMENTE) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="apellido_paterno">
                <FaUser className="input-icon" />
                Apellido paterno
                {campoBloqueado("apellido_paterno") && (
                  <FaLock className="lock-icon" />
                )}
              </label>
              <div className="input-wrapper">
                <input
                  id="apellido_paterno"
                  type="text"
                  name="apellido_paterno"
                  value={form.apellido_paterno}
                  onChange={handleChange}
                  required
                  disabled={campoBloqueado("apellido_paterno") || loading}
                  className={campoBloqueado("apellido_paterno") ? "locked-field" : ""}
                  placeholder="Ej: Pérez"
                  readOnly={campoBloqueado("apellido_paterno")}
                />
                {campoBloqueado("apellido_paterno") && (
                  <div className="field-lock-icon">
                    <FaLock />
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="apellido_materno">
                <FaUser className="input-icon" />
                Apellido materno
                {campoBloqueado("apellido_materno") && (
                  <FaLock className="lock-icon" />
                )}
              </label>
              <div className="input-wrapper">
                <input
                  id="apellido_materno"
                  type="text"
                  name="apellido_materno"
                  value={form.apellido_materno}
                  onChange={handleChange}
                  required
                  disabled={campoBloqueado("apellido_materno") || loading}
                  className={campoBloqueado("apellido_materno") ? "locked-field" : ""}
                  placeholder="Ej: García"
                  readOnly={campoBloqueado("apellido_materno")}
                />
                {campoBloqueado("apellido_materno") && (
                  <div className="field-lock-icon">
                    <FaLock />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nombre completo - BLOQUEADO PERMANENTEMENTE */}
          <div className="form-group">
            <label htmlFor="nombre_completo">
              <FaUser className="input-icon" />
              Nombre completo
              {campoBloqueado("nombre_completo") && (
                <FaLock className="lock-icon" />
              )}
            </label>
            <div className="input-wrapper">
              <input
                id="nombre_completo"
                type="text"
                name="nombre_completo"
                value={form.nombre_completo}
                onChange={handleChange}
                required
                disabled={campoBloqueado("nombre_completo") || loading}
                className={campoBloqueado("nombre_completo") ? "locked-field" : ""}
                placeholder="Ej: Juan Carlos"
                readOnly={campoBloqueado("nombre_completo")}
              />
              {campoBloqueado("nombre_completo") && (
                <div className="field-lock-icon">
                  <FaLock />
                </div>
              )}
            </div>
          </div>

          {/* Especialidad */}
          <div className="form-group">
            <label htmlFor="id_especialidad">
              <MdEngineering className="input-icon" />
              Especialidad
            </label>
            <select
              id="id_especialidad"
              name="id_especialidad"
              value={form.id_especialidad}
              onChange={handleChange}
              required
              disabled={loading}
            >
              <option value="" disabled>Selecciona una especialidad</option>
              {especialidades.map((esp) => (
                <option key={esp.id_especialidad} value={esp.id_especialidad}>
                  {esp.nombre_especialidad}
                </option>
              ))}
            </select>
          </div>

          {/* Sede */}
          <div className="form-group">
            <label htmlFor="id_sede">
              <FaMapMarkerAlt className="input-icon" />
              Sede
              <FaLock className="lock-icon" />
            </label>
            <div className="input-wrapper">
              <input
                id="id_sede"
                type="text"
                value={sedeDelCajero ? `${sedeDelCajero.nombre} — ${sedeDelCajero.ciudad}` : "Cargando..."}
                readOnly
                disabled
                className="locked-field"
              />
              <div className="field-lock-icon">
                <FaLock />
              </div>
            </div>
            <span className="registro-hint">
              Esta sede corresponde a tu cuenta y no puede modificarse.
            </span>
          </div>

          {/* Teléfono y Correo */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="telefono">
                <FaPhone className="input-icon" />
                Teléfono
                <span className="label-hint">(opcional)</span>
              </label>
              <input
                id="telefono"
                type="tel"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Opcional"
                maxLength={9}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="correo">
                <FaEnvelope className="input-icon" />
                Correo
              </label>
              <input
                id="correo"
                type="email"
                name="correo"
                value={form.correo}
                onChange={handleChange}
                placeholder="Ej: correo@ejemplo.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="registro-hint">
            <FaExclamationCircle className="hint-icon" />
            <span>El correo es obligatorio (se usa para el pago y el envío de credenciales). El teléfono es opcional.</span>
          </div>

          {/* Foto y Título */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="foto_carnet">
                <FaImage className="input-icon" />
                Foto tipo carnet
                <span className="label-hint">(JPG/PNG, máx. 2 MB)</span>
              </label>
              <input
                id="foto_carnet"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleFotoChange}
                disabled={loading}
              />
              {fotoFile && (
                <div className="field-helper success">
                  <FaCheckCircle />
                  <span>{fotoFile.file.name} ({fotoFile.ancho}x{fotoFile.alto}px)</span>
                </div>
              )}
              {fotoError && (
                <div className="field-helper error">
                  <FaExclamationCircle />
                  <span>{fotoError}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="titulo_profesional">
                <FaFilePdf className="input-icon" />
                Título profesional
                <span className="label-hint">(PDF/JPG/PNG, máx. 5 MB)</span>
              </label>
              <input
                id="titulo_profesional"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleTituloChange}
                disabled={loading}
              />
              {tituloFile && (
                <div className="field-helper success">
                  <FaCheckCircle />
                  <span>{tituloFile.name}</span>
                </div>
              )}
              {tituloError && (
                <div className="field-helper error">
                  <FaExclamationCircle />
                  <span>{tituloError}</span>
                </div>
              )}
            </div>
          </div>

          {feedback && (
            <div className={`registro-feedback ${feedback.type}`}>
              {feedback.type === "success" && <FaCheckCircle className="feedback-icon" />}
              {feedback.type === "error" && <FaExclamationCircle className="feedback-icon" />}
              {feedback.message}
            </div>
          )}

          <button type="submit" className="submit-button" disabled={!dniConsultado || verificandoDuplicados}>
            {subiendoArchivos ? (
              <>
                <FaSpinner className="spinning" />
                Subiendo archivos...
              </>
            ) : verificandoDuplicados ? (
              <>
                <FaSpinner className="spinning" />
                Verificando datos...
              </>
            ) : loading ? (
              <>
                <FaSpinner className="spinning" />
                Registrando...
              </>
            ) : (
              <>
                <FaSave />
                Continuar al pago
              </>
            )}
          </button>

          {!dniConsultado && (
            <p className="required-hint">
              <FaExclamationCircle />
              Debes consultar el DNI primero para habilitar el registro
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default DashboardCajero;