import "dotenv/config";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import * as http from "http";
import { handleIncomingMessage } from "./handlers/message";

let qrCode: string | null = null;
let isConnected = false;

export function getStatus() {
  return { connected: isConnected, qr: qrCode };
}

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("sessions");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["Skyline Nora", "Chrome", "1.0.0"],
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCode = qr;
      isConnected = false;
      console.log("📱 QR code ready — scan in admin dashboard or terminal above");
    }

    if (connection === "open") {
      qrCode = null;
      isConnected = true;
      console.log("✅ WhatsApp connected");
    }

    if (connection === "close") {
      isConnected = false;
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...");
        setTimeout(startBot, 5000);
      } else {
        console.log("❌ Logged out — rescan QR to reconnect");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const phone = msg.key.remoteJid?.replace("@s.whatsapp.net", "") || "";
      if (!phone || phone.includes("@g.us")) continue; // skip groups

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (!text.trim()) continue;

      console.log(`📨 [${phone}]: ${text}`);

      await handleIncomingMessage(phone, text, async (reply) => {
        await sock.sendMessage(msg.key.remoteJid!, { text: reply });
        console.log(`📤 [${phone}]: ${reply.slice(0, 60)}...`);
      });
    }
  });

  return sock;
}
