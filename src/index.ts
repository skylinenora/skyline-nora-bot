import "dotenv/config";
import * as http from "http";
import { startBot, getStatus } from "./bot";

// Simple HTTP server so admin dashboard can check QR + connection status
const server = http.createServer((req, res) => {
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
      res.end(`<!DOCTYPE html><html><head><title>Scan QR</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        </head><body style="font-family:sans-serif;text-align:center;padding:60px">
        <h2>📱 Scan met WhatsApp</h2>
        <p>WhatsApp → Instellingen → Gekoppelde apparaten → Apparaat koppelen</p>
        <div id="qr" style="display:inline-block;margin:30px"></div>
        <p><small>Pagina vernieuwt automatisch elke 20 seconden</small></p>
        <script>
          new QRCode(document.getElementById("qr"), {
            text: ${JSON.stringify(qr)},
            width: 300, height: 300
          });
          setTimeout(() => location.reload(), 20000);
        </script>
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
