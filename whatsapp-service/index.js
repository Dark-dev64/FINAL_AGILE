import express from "express";
import cors from "cors";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

let clienteListo = false;

// Rutas comunes de Chrome/Edge en Windows — usa la que exista
const posiblesRutas = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const chromePath = posiblesRutas.find((ruta) => fs.existsSync(ruta));

if (!chromePath) {
  console.error("❌ No se encontró Chrome ni Edge instalado en las rutas esperadas.");
}

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "sistema-cip" }),
  puppeteer: {
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: 60000,
  },
});

client.on("qr", (qr) => {
  console.log("\n📱 Escanea este código QR con WhatsApp → Dispositivos vinculados:\n");
  qrcode.generate(qr, { small: true });
});

client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Cargando WhatsApp Web: ${percent}% - ${message}`);
});

client.on("authenticated", () => {
  console.log("🔑 Autenticado correctamente.");
});

client.on("auth_failure", (msg) => {
  console.error("❌ Fallo de autenticación:", msg);
});

client.on("ready", () => {
  console.log("✅ Cliente de WhatsApp conectado y listo.");
  clienteListo = true;
});

client.on("disconnected", (reason) => {
  console.warn("⚠️ WhatsApp se desconectó:", reason);
  clienteListo = false;
});

client.initialize().catch((err) => {
  console.error("⚠️ Error al inicializar WhatsApp:", err.message);
});

app.get("/", (req, res) => {
  res.send(clienteListo ? "🟢 WhatsApp conectado." : "🟡 WhatsApp no conectado. Revisa la terminal para escanear el QR.");
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