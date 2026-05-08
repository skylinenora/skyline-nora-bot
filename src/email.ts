import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "build_placeholder");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "nizar@skylinenora.nl";

/**
 * Email Nizar when Aicha is blocked and needs human input to continue.
 * Used in addition to WhatsApp notification — email is for things that
 * need thought, WhatsApp is for things that need a quick reaction.
 */
export async function sendEscalationEmail({
  reason,
  fromPhone,
  lastMessage,
}: {
  reason: string;
  fromPhone: string;
  lastMessage: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  RESEND_API_KEY not set — skipping escalation email");
    return;
  }
  try {
    await resend.emails.send({
      from: "Aicha <noreply@skylinenora.nl>",
      to: ADMIN_EMAIL,
      subject: `🚨 Aicha needs you — ${reason.slice(0, 60)}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 560px; color: #111;">
          <h2 style="color: #ff4d8d; margin-bottom: 8px;">Aicha is blocked</h2>
          <p style="color: #555; margin-top: 0;">She needs you to step in before she can continue.</p>

          <div style="background: #fbf7ee; border-left: 4px solid #ff4d8d; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 8px;"><strong>Reden:</strong></p>
            <p style="margin: 0;">${escapeHtml(reason)}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px 0; color: #555; width: 130px;">Lead:</td>
              <td style="padding: 8px 0;"><a href="https://wa.me/${fromPhone}" style="color: #2563eb;">+${fromPhone}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #555; vertical-align: top;">Laatste bericht:</td>
              <td style="padding: 8px 0;">${escapeHtml(lastMessage.slice(0, 400))}</td>
            </tr>
          </table>

          <a href="https://wa.me/${fromPhone}"
             style="display: inline-block; background: #ff4d8d; color: white; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Open WhatsApp →
          </a>

          <p style="margin-top: 32px; color: #999; font-size: 12px;">
            This is an automated alert from Aicha. She'll keep handling other DMs while you respond to this one.
          </p>
        </div>
      `,
    });
    console.log(`📧 Escalation email sent to ${ADMIN_EMAIL}`);
  } catch (err) {
    console.error("Failed to send escalation email:", err);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
