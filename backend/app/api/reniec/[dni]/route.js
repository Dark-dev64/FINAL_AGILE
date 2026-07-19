import { ok, fail } from "../../../../utils/apiResponse";

export async function GET(request, { params }) {
  const { dni } = await params;

  if (!/^\d{8}$/.test(dni)) {
    return fail("El DNI debe tener 8 dígitos.");
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

    if (!response.ok || !data.success) {
      return fail("No se encontraron datos para ese DNI.", 404);
    }

    return ok({
      nombres: data.result.first_name,
      apellido_paterno: data.result.first_last_name,
      apellido_materno: data.result.second_last_name,
    });
  } catch (err) {
    return fail("No se pudo consultar el servicio de RENIEC.", 500);
  }
}