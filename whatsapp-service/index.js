import express from "express";
import cors from "cors";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode-terminal";

const app = express();
app.use(cors());
app.use(express.json());

let clienteListo = false;

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "sistema-cip" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

client.on("qr", (qr) => {
  console.log("\n📱 Escanea este código QR con WhatsApp → Dispositivos vinculados:\n");
  qrcode.generate(qr, { small: true });
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

app.listen(4000, () => {
  console.log("🟢 Servicio de WhatsApp escuchando en http://localhost:4000");
});