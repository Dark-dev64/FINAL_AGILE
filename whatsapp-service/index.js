import express from "express";
import cors from "cors";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import QRCode from "qrcode";

const app = express();
app.use(cors());
app.use(express.json());

let clienteListo = false;
let ultimoQR = null; // guardamos el string crudo del QR más reciente

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "sistema-cip" }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--single-process",
    ],
  },
});

client.on("qr", (qr) => {
  ultimoQR = qr;
  console.log("📱 Nuevo QR generado. Ábrelo en: /qr");
});

client.on("ready", () => {
  console.log("✅ Cliente de WhatsApp conectado y listo.");
  clienteListo = true;
  ultimoQR = null; // ya no hace falta mostrar el QR
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ WhatsApp se desconectó:", reason);
  clienteListo = false;
});

client.initialize().catch((err) => {
  console.error("⚠️ Error al inicializar WhatsApp:", err.message);
});

// ==========================================================
// Endpoint para ver el QR como imagen en el navegador,
// en vez de depender de que se vea bien en los logs de Render.
// ==========================================================
app.get("/qr", async (req, res) => {
  if (clienteListo) {
    return res.send("<h2>✅ WhatsApp ya está conectado, no hay QR pendiente.</h2>");
  }

  if (!ultimoQR) {
    return res.send("<h2>⏳ Generando QR, recarga esta página en unos segundos...</h2>");
  }

  try {
    const dataUrl = await QRCode.toDataURL(ultimoQR, { width: 400 });
    res.send(`
      <html>
        <head><meta http-equiv="refresh" content="20" /></head>
        <body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;margin-top:2rem;">
          <h2>Escanea este código con WhatsApp → Dispositivos vinculados</h2>
          <img src="${dataUrl}" alt="QR de WhatsApp" />
          <p>Esta página se recarga sola cada 20s mientras no te conectes.</p>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Error generando el QR: " + err.message);
  }
});

app.get("/", (req, res) => {
  res.send(clienteListo ? "🟢 WhatsApp conectado." : "🟡 WhatsApp no conectado. Ve a /qr para escanear.");
});

app.post("/send", async (req, res) => {
  const { destinatario, mensaje } = req.body;

  if (!clienteListo) {
    return res.status(503).json({ error: "El cliente de WhatsApp aún no está listo." });
  }

  try {
    const soloDigitos = destinatario.replace(/\D/g, "");
    const numeroConCodigo = soloDigitos.startsWith("51") ? soloDigitos : `51${soloDigitos}`;
    const chatId = `${numeroConCodigo}@c.us`;

    const estaRegistrado = await client.isRegisteredUser(chatId);
    if (!estaRegistrado) {
      return res.status(404).json({ error: `El número ${destinatario} no tiene WhatsApp.` });
    }

    await client.sendMessage(chatId, mensaje);
    res.json({ success: true });
  } catch (err) {
    console.error("Error enviando WhatsApp:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🟢 Servicio de WhatsApp escuchando en el puerto ${PORT}`);
});