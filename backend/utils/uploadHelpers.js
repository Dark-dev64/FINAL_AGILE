export const LIMITES = {
  foto: {
    maxBytes: 2 * 1024 * 1024, // 2 MB
    tiposPermitidos: ["image/jpeg", "image/png"],
  },
  titulo: {
    maxBytes: 5 * 1024 * 1024, // 5 MB
    tiposPermitidos: ["application/pdf", "image/jpeg", "image/png"],
  },
};

export function validarArchivo(file, tipo) {
  const config = LIMITES[tipo];

  if (!config.tiposPermitidos.includes(file.type)) {
    return `Formato no permitido. Usa: ${config.tiposPermitidos.join(", ")}`;
  }

  if (file.size > config.maxBytes) {
    const maxMb = config.maxBytes / (1024 * 1024);
    return `El archivo supera el máximo permitido de ${maxMb} MB.`;
  }

  return null;
}