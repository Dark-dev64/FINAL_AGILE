import { useState } from "react";
import api from "../services/api";
import { FaIdCard, FaSearch, FaSpinner, FaExclamationCircle } from "react-icons/fa";
import "../styles/BuscarColegiadoDni.css";

/**
 * Input de DNI + botón de búsqueda contra un colegiado ya registrado
 * (usuario aprobado). Al encontrarlo, avisa al caller vía onEncontrado.
 */
function BuscarColegiadoDni({ onEncontrado }) {
  const [dni, setDni] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(null);

  const handleBuscar = async () => {
    if (!/^\d{8}$/.test(dni)) {
      setError("Ingresa un DNI válido de 8 dígitos.");
      return;
    }

    setError(null);
    setBuscando(true);
    try {
      const response = await api.get("/colegiado", { params: { dni } });
      onEncontrado(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || "No se pudo buscar al colegiado.");
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleBuscar();
  };

  return (
    <div className="buscar-colegiado-dni">
      <span className="dni-search-label">Buscar colegiado por DNI</span>

      <div className="dni-search-row">
        <FaIdCard className="dni-search-icon" />
        <input
          type="text"
          inputMode="numeric"
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ""))}
          onKeyDown={handleKeyDown}
          maxLength={8}
          placeholder="Ej: 71234567"
          disabled={buscando}
        />
        <button type="button" className="dni-search-btn" onClick={handleBuscar} disabled={buscando || !dni}>
          {buscando ? (
            <>
              <FaSpinner className="spinning" /> Buscando...
            </>
          ) : (
            <>
              <FaSearch /> Buscar
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="dni-search-error">
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default BuscarColegiadoDni;
