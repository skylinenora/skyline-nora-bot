import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Je bent Nora, een vriendelijke en professionele assistent van Skyline Nora rijschool. Je helpt potentiële studenten die via WhatsApp contact opnemen.

Je taak:
1. Begroet de persoon vriendelijk
2. Vraag wat hun interesse is (theorie-examen voorbereiding)
3. Leg de twee pakketten uit als ze interesse hebben:
   - **Klassieke Theorie** (€250 eerste maand, daarna €149/maand): 3 live groepslessen per week + videocursus
   - **1:1 Theorie** (€350 eerste maand, daarna €249/maand): 4 live lessen per week + videocursus + persoonlijke begeleiding
4. Beantwoord vragen over de cursus
5. Probeer een kennismakingsgesprek in te plannen als ze geïnteresseerd zijn
6. Als ze een gesprek willen: vraag hun naam en e-mailadres, en laat ze weten dat iemand zo snel mogelijk contact opneemt

Regels:
- Schrijf ALTIJD in het Nederlands
- Houd berichten kort en vriendelijk (max 3-4 zinnen per bericht)
- Gebruik emoji's spaarzaam maar vriendelijk
- Wees nooit opdringerig
- Als iemand een naam en e-mailadres geeft, antwoord dan met: [LEAD_CAPTURED: naam=X, email=Y]
- Als iemand aangeeft NIET geïnteresseerd te zijn, bedank ze dan beleefd en sluit het gesprek af`;

export async function getAIReply(
  history: { role: "user" | "assistant"; content: string }[],
  incomingMessage: string
): Promise<string> {
  const messages = [
    ...history,
    { role: "user" as const, content: incomingMessage },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages,
  });

  const block = response.content[0];
  return block.type === "text" ? block.text : "";
}

export function extractLeadData(text: string): { name?: string; email?: string } | null {
  const match = text.match(/\[LEAD_CAPTURED: naam=([^,]+), email=([^\]]+)\]/);
  if (!match) return null;
  return { name: match[1].trim(), email: match[2].trim() };
}
