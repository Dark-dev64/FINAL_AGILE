import api from "./api";

export async function subirFotoCarnet(file, dni) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dni", dni);

  const response = await api.post("/upload/foto-carnet", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.data;
}

export async function subirTitulo(file, dni) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("dni", dni);

  const response = await api.post("/upload/titulo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.data;
}