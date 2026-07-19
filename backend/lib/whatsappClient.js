export async function enviarWhatsApp(destinatario, mensaje) {
  const response = await fetch("http://localhost:4000/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinatario, mensaje }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo enviar el mensaje de WhatsApp.");
  }
}