import { createContext, useState } from "react";

const initialForm = {
  dni: "",
  apellido_paterno: "",
  apellido_materno: "",
  nombre_completo: "",
  id_especialidad: "",
  telefono: "",
  correo: "",
  id_sede: "",
};

const initialCamposBloqueados = {
  apellido_paterno: false,
  apellido_materno: false,
  nombre_completo: false,
};

export const RegistroColegiadoContext = createContext();

/**
 * Guarda en memoria (sobrevive a la navegación entre pantallas, pero no a un
 * refresh de página) los datos que el cajero va llenando al registrar un
 * colegiado nuevo. Así, si navega por error a otra sección del menú antes de
 * enviar la solicitud, al volver a "Registrar colegiado" no pierde lo ya
 * ingresado.
 */
export function RegistroColegiadoProvider({ children }) {
  const [form, setForm] = useState(initialForm);
  const [fotoFile, setFotoFile] = useState(null);
  const [tituloFile, setTituloFile] = useState(null);
  const [datosAutocompletados, setDatosAutocompletados] = useState(false);
  const [dniConsultado, setDniConsultado] = useState(false);
  const [camposBloqueados, setCamposBloqueados] = useState(initialCamposBloqueados);

  const resetFormulario = () => {
    setForm(initialForm);
    setFotoFile(null);
    setTituloFile(null);
    setDatosAutocompletados(false);
    setDniConsultado(false);
    setCamposBloqueados(initialCamposBloqueados);
  };

  return (
    <RegistroColegiadoContext.Provider
      value={{
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
      }}
    >
      {children}
    </RegistroColegiadoContext.Provider>
  );
}
