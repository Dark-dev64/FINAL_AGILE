export function isNotEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidDNI(dni) {
  return /^\d{8}$/.test(dni);
}