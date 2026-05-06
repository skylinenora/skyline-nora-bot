import "dotenv/config";
import { Client, LocalAuth, MessageMedia, NoAuth } from "whatsapp-web.js";
import { handleIncomingMessage } from "./handlers/message";

let qrCode: string | null = null;
let isConnected = false;
let client: Client | null = null;

export function getStatus() {
  return { connected: isConnected, qr: qrCode };
}

function chatIdFor(phone: string): string {
  return `${phone.replace(/\D/g, "")}@c.us`;
}

export async function sendTextMessage(phone: string, text: string): Promise<void> {
  if (!client || !isConnected) throw new Error("WhatsApp client not connected");
  await client.sendMessage(chatIdFor(phone), text);
}

// Sends a pre-recorded mp3 as a true WhatsApp voice memo (PTT bubble).
// Audio URL must be reachable from the bot host.
export async function sendVoiceMessage(phone: string, audioUrl: string): Promise<void> {
  if (!client || !isConnected) throw new Error("WhatsApp client not connected");
  const media = await MessageMedia.fromUrl(audioUrl, { unsafeMime: true });
  await client.sendMessage(chatIdFor(phone), media, { sendAudioAsVoice: true });
}

export async function notifyAdmin(message: string): Promise<void> {
  const target = process.env.NOTIFY_PHONE;
  if (!target) {
    console.warn("⚠️  NOTIFY_PHONE not set — skipping admin notification");
    return;
  }
  if (!client || !isConnected) {
    console.warn("⚠️  WhatsApp client not connected — skipping admin notification");
    return;
  }
  const chatId = `${target.replace(/\D/g, "")}@c.us`;
  try {
    await client.sendMessage(chatId, message);
    console.log(`🔔 Admin notified: ${message.slice(0, 80)}`);
  } catch (err) {
    console.error("Failed to notify admin:", err);
  }
}

export async function startBot() {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "sessions" }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  client.on("qr", (qr) => {
    qrCode = qr;
    isConnected = false;
    console.log("📱 QR code ready — open /qr to scan");
  });

  client.on("ready", () => {
    qrCode = null;
    isConnected = true;
    console.log("✅ WhatsApp connected");
  });

  client.on("disconnected", (reason) => {
    isConnected = false;
    console.log("❌ Disconnected:", reason);
    setTimeout(startBot, 5000);
  });

  client.on("message", async (msg) => {
    if (msg.fromMe) return;
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const phone = msg.from.replace("@c.us", "");
    const text = msg.body?.trim();
    if (!text) return;

    console.log(`📨 [${phone}]: ${text}`);

    await handleIncomingMessage(phone, text, async (reply) => {
      await msg.reply(reply);
      console.log(`📤 [${phone}]: ${reply.slice(0, 60)}...`);
    });
  });

  await client.initialize();
  return client;
}
