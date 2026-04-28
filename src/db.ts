import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query(sql: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

export async function findOrCreateLead(phone: string) {
  const existing = await query(
    `SELECT * FROM "Lead" WHERE phone = $1 LIMIT 1`,
    [phone]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const created = await query(
    `INSERT INTO "Lead" (id, phone, source, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, 'whatsapp', 'NEW', now(), now())
     RETURNING *`,
    [phone]
  );
  return created.rows[0];
}

export async function updateLead(phone: string, data: Record<string, any>) {
  const fields = Object.keys(data)
    .map((k, i) => `"${k}" = $${i + 2}`)
    .join(", ");
  const values = Object.values(data);
  await query(
    `UPDATE "Lead" SET ${fields}, "updatedAt" = now() WHERE phone = $1`,
    [phone, ...values]
  );
}

export async function saveMessage(phone: string, direction: "INBOUND" | "OUTBOUND", content: string) {
  // Upsert conversation
  await query(
    `INSERT INTO "Conversation" (id, phone, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, 'active', now(), now())
     ON CONFLICT (phone) DO UPDATE SET "updatedAt" = now()`,
    [phone]
  );

  const conv = await query(`SELECT id FROM "Conversation" WHERE phone = $1`, [phone]);
  const convId = conv.rows[0].id;

  await query(
    `INSERT INTO "Message" (id, direction, content, "sentAt", "conversationId")
     VALUES (gen_random_uuid(), $1, $2, now(), $3)`,
    [direction, content, convId]
  );
}

export async function getConversationHistory(phone: string): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const conv = await query(`SELECT id FROM "Conversation" WHERE phone = $1`, [phone]);
  if (conv.rows.length === 0) return [];

  const msgs = await query(
    `SELECT direction, content FROM "Message"
     WHERE "conversationId" = $1
     ORDER BY "sentAt" ASC
     LIMIT 20`,
    [conv.rows[0].id]
  );

  return msgs.rows.map((m: any) => ({
    role: m.direction === "INBOUND" ? "user" : "assistant",
    content: m.content,
  }));
}
