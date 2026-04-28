import "dotenv/config";
import * as http from "http";
import QRCode from "qrcode";
import { startBot, getStatus } from "./bot";

// Simple HTTP server so admin dashboard can check QR + connection status
const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const path = (req.url || "/").split("?")[0].replace(/\/$/, "") || "/";

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
