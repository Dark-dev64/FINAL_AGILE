import { useContext } from "react";
import { RegistroColegiadoContext } from "../context/RegistroColegiadoContext";

export function useRegistroColegiado() {
  const context = useContext(RegistroColegiadoContext);
  if (!context) {
    throw new Error("useRegistroColegiado debe usarse dentro de un RegistroColegiadoProvider");
  }
  return context;
}
