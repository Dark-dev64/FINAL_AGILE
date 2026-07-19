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

  const errorValidacion = validarArchivo(file, "foto");
  if (errorValidacion) {
    return fail(errorValidacion);
  }

  const extension = file.type === "image/png" ? "png" : "jpg";
  const key = `carnets/${dni}-${Date.now()}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabaseAdmin.storage
    .from("fotos-carnet")
    .upload(key, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return fail("No se pudo subir la foto: " + error.message, 500);
  }

  return ok({
    foto_key: key,
    foto_content_type: file.type,
    foto_size_bytes: file.size,
  });
}