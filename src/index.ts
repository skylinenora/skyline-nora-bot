import "dotenv/config";
import * as http from "http";
import { startBot, getStatus } from "./bot";

// Simple HTTP server so admin dashboard can check QR + connection status
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  if (req.url === "/status") {
    res.end(JSON.stringify(getStatus()));
  } else {
    res.writeHead(404);
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
