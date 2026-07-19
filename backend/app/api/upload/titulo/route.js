import { supabaseAdmin } from "../../../../lib/supabaseClient";
import { ok, fail } from "../../../../utils/apiResponse";
import { validarArchivo } from "../../../../utils/uploadHelpers";

export async function POST(request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const dni = formData.get("dni");

  if (!file || !dni) {
    return fail("Se requiere el archivo y el DNI.");
  }

  const errorValidacion = validarArchivo(file, "titulo");
  if (errorValidacion) {
    return fail(errorValidacion);
  }

  const extension = file.type === "application/pdf" ? "pdf" : (file.type === "image/png" ? "png" : "jpg");
  const key = `titulos/${dni}-${Date.now()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from("titulos")
    .upload(key, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return fail("No se pudo subir el título: " + error.message, 500);
  }

  return ok({
    titulo_key: key,
    titulo_content_type: file.type,
    titulo_size_bytes: file.size,
  });
}