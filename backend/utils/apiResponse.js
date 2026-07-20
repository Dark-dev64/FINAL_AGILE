export function ok(data, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function fail(message, status = 400) {
  return Response.json({ success: false, error: message }, { status });
}

const MENSAJES_DUPLICADO = {
  uq_solicitudes_correo: "Ese correo ya está registrado con otra solicitud.",
  uq_solicitudes_telefono: "Ese teléfono ya está registrado con otra solicitud.",
  solicitudes_dni_key: "Ese DNI ya está registrado con otra solicitud.",
};

/**
 * Traduce el error crudo de Postgres cuando salta una restricción UNIQUE
 * (código 23505) a un mensaje entendible. Sirve de respaldo por si dos
 * cajeros registran datos duplicados casi al mismo tiempo (el chequeo del
 * frontend ya evita la mayoría de los casos, pero no una carrera exacta).
 * Si no es un error de duplicado, devuelve null.
 */
export function mensajeErrorDuplicado(error) {
  if (error?.code !== "23505") return null;
  const restriccion = Object.keys(MENSAJES_DUPLICADO).find((clave) => error.message?.includes(clave));
  return restriccion ? MENSAJES_DUPLICADO[restriccion] : "Uno de los datos ingresados ya está registrado.";
}