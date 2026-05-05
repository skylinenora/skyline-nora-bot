import { getAIReply, extractLeadData, extractEscalation } from "../ai";
import { notifyAdmin } from "../bot";
import { sendEscalationEmail } from "../email";
import {
  findOrCreateLead,
  updateLead,
  saveMessage,
  getConversationHistory,
} from "../db";

export async function handleIncomingMessage(
  phone: string,
  text: string,
  sendReply: (msg: string) => Promise<void>
) {
  try {
    // Save inbound message
    await saveMessage(phone, "INBOUND", text);

    // Get or create lead
    await findOrCreateLead(phone);

    // Get conversation history for context
    const history = await getConversationHistory(phone);

    // Get AI reply
    const reply = await getAIReply(history, text);

    // Check if AI captured lead data
    const leadData = extractLeadData(reply);
    if (leadData) {
      const updates: Record<string, any> = { status: "CONTACTED" };
      if (leadData.name) updates.name = leadData.name;
      if (leadData.email) updates.email = leadData.email;
      await updateLead(phone, updates);
    }

    // Detect escalation before stripping tags
    const escalationReason = extractEscalation(reply);

    // Clean reply (remove internal tags before sending)
    const cleanReply = reply
      .replace(/\[LEAD_CAPTURED:[^\]]*\]/g, "")
      .replace(/\[ESCALATE:[^\]]*\]/gi, "")
      .trim();

    // Save and send outbound message
    await saveMessage(phone, "OUTBOUND", cleanReply);
    await sendReply(cleanReply);

    // Notify admin if AI flagged this conversation as needing human handoff.
    // Two channels: WhatsApp (quick reaction) + email (thought-required tasks).
    if (escalationReason) {
      const summary =
        `🚨 *Escalatie van Aicha bot*\n\n` +
        `*Reden:* ${escalationReason}\n` +
        `*Van:* +${phone}\n` +
        `*Laatste bericht:* ${text.slice(0, 200)}`;
      await notifyAdmin(summary);
      await sendEscalationEmail({
        reason: escalationReason,
        fromPhone: phone,
        lastMessage: text,
      });
    }
  } catch (err) {
    console.error("Error handling message:", err);
    await sendReply(
      "Sorry, er is een technisch probleem. Probeer het straks nog eens."
    );
  }
}
