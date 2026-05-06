import "dotenv/config";
import * as http from "http";
import QRCode from "qrcode";
import { startBot, getStatus, sendTextMessage, sendVoiceMessage } from "./bot";

const SECRET = process.env.BOT_API_SECRET ?? "";

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// Simple HTTP server so admin dashboard can check QR + connection status
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const path = (req.url || "/").split("?")[0].replace(/\/$/, "") || "/";

  // Outbound send endpoint — called by the web app to send Aicha messages
  // (text or voice memo) on schedule. Auth via shared X-Bot-Secret header.
  if (req.method === "POST" && path === "/send") {
    res.setHeader("Content-Type", "application/json");
    if (!SECRET || req.headers["x-bot-secret"] !== SECRET) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
    try {
      const raw = await readBody(req);
      const { phone, text, audioUrl } = JSON.parse(raw || "{}");
      if (!phone || (!text && !audioUrl)) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "phone and (text or audioUrl) required" }));
        return;
      }
      if (audioUrl) {
        await sendVoiceMessage(phone, audioUrl);
        if (text) await sendTextMessage(phone, text);
      } else {
        await sendTextMessage(phone, text);
      }
      res.end(JSON.stringify({ ok: true }));
    } catch (e) {
      console.error("[/send] failed:", e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: (e as Error).message }));
    }
    return;
  }

  if (path === "/status") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(getStatus()));
  } else if (path === "/qr") {
    const { connected, qr } = getStatus();
    res.setHeader("Content-Type", "text/html");
    if (connected) {
      res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2 style="color:green">✅ WhatsApp verbonden</h2>
        <p>De bot is actief. Geen QR code nodig.</p>
      </body></html>`);
    } else if (qr) {
      const imgSrc = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
      res.end(`<!DOCTYPE html><html><head><title>Scan QR</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>📱 Scan met WhatsApp</h2>
        <p>WhatsApp → Instellingen → Gekoppelde apparaten → Apparaat koppelen</p>
        <img src="${imgSrc}" style="margin:30px;border-radius:12px" />
        <p><small>Pagina vernieuwt automatisch elke 20 seconden</small></p>
        <script>setTimeout(() => location.reload(), 20000);</script>
      </body></html>`);
    } else {
      res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>⏳ Wachten op QR code...</h2>
        <p>Even geduld, de bot start op.</p>
        <script>setTimeout(() => location.reload(), 3000);</script>
      </body></html>`);
    }
  } else {
    res.writeHead(404);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🤖 Skyline Nora WhatsApp Bot`);
  console.log(`📡 Status API: http://localhost:${PORT}/status`);
  console.log(`🚀 Starting WhatsApp connection...`);
});

startBot().catch(console.error);
