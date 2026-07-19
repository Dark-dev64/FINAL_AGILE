export const LIMITES = {
  foto: {
    maxBytes: 2 * 1024 * 1024,
    tiposPermitidos: ["image/jpeg", "image/png"],
  },
  titulo: {
    maxBytes: 5 * 1024 * 1024,
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

// Obtiene el ancho/alto real de una imagen antes de subirla
export function obtenerDimensionesImagen(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ ancho: img.width, alto: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen."));
    };

    img.src = url;
  });
}

// Valida que la foto tenga proporción vertical tipo carnet (más alta que ancha)
export function validarProporcionCarnet(ancho, alto) {
  if (alto <= ancho) {
    return "La foto debe ser vertical, tipo carnet (más alta que ancha).";
  }
  return null;
}