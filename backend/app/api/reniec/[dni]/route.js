import { ok, fail } from "../../../../utils/apiResponse";

export async function GET(request, { params }) {
  const { dni } = await params;

  if (!/^\d{8}$/.test(dni)) {
    return fail("El DNI debe tener 8 dígitos.", 400);
  }

  try {
    const response = await fetch(
      `https://api-codart.cgrt.org/api/v1/consultas/reniec/dni/${dni}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RENIEC_API_TOKEN}`,
        },
      }
    );

    const data = await response.json();

    // Caso 1: la API respondió con error HTTP o success: false
    if (!response.ok || !data.success) {
      return fail("No se encontraron datos para ese DNI.", 404);
    }

    const resultado = data.result;

    // Caso 2: la API respondió success: true pero sin datos útiles
    if (
      !resultado ||
      !resultado.first_name ||
      !resultado.first_last_name ||
      !resultado.second_last_name
    ) {
      return fail("No se encontraron datos para ese DNI.", 404);
    }

    return ok({
      nombres: resultado.first_name,
      apellido_paterno: resultado.first_last_name,
      apellido_materno: resultado.second_last_name,
    });
  } catch (err) {
    return fail("No se pudo consultar el servicio de RENIEC.", 500);
  }
}