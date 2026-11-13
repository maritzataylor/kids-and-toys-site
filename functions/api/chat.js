// POST /api/chat  { messages: [{role, content}] }  →  { reply }
// Uses Cloudflare Workers AI (free daily allowance). Needs an AI binding named "AI".
import { PRODUCTS, SITE, FAQ } from "../../catalog.js";

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

function systemPrompt() {
  const bundles = PRODUCTS.filter((p) => p.bundle).map((p) => `- ${p.name}, $${p.price.toFixed(2)} (${p.ages}): ${p.blurb}`).join("\n");
  const deals = PRODUCTS.filter((p) => p.price === 1).map((p) => p.name).join(", ");
  const free = PRODUCTS.filter((p) => p.type === "free").map((p) => p.name).join(", ");
  const singles = PRODUCTS.filter((p) => !p.bundle && p.type === "paid").map((p) => p.name).join(", ");
  const products = `Bundles:\n${bundles}\n\n$1 deals: ${deals}\nFree with email signup: ${free}\nSingle 20-page packs ($3.99 each unless noted): ${singles}`;
  const faq = FAQ.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n");
  return `You are the friendly helper on the ${SITE.name} website. The academy makes fun learning videos on YouTube and sells printable learning packs (free and paid PDFs) for kids ages 2–7.
You are talking with parents, grandparents and teachers.

Products:
${products}

Policies:
- ${SITE.refundNote}
- Contact: ${SITE.email}
- YouTube: ${SITE.youtube}

FAQ:
${faq}

Rules:
- Keep replies short and warm: under 80 words, plain language.
- Only mention products, prices and policies listed above. Never invent discounts, order details or tracking info.
- You can't see orders. For order problems, ask them to email ${SITE.email} with their receipt.
- You may suggest simple learning activities for young kids.
- Never ask for personal information. If it seems a child is typing, answer simply and kindly and suggest they ask a grown-up to help.
- Stay on topic: kids' learning, the products, the videos and the shop.`;
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) return Response.json({ error: "Chat isn't connected yet." }, { status: 503 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const history = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));
  if (!history.length || history[history.length - 1].role !== "user") {
    return Response.json({ error: "Send a question to get started." }, { status: 400 });
  }
  try {
    const out = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: systemPrompt() }, ...history],
      max_tokens: 300,
      temperature: 0.4,
    });
    return Response.json({ reply: (out.response || "").trim() || "Sorry, I didn't catch that. Could you ask another way?" });
  } catch (e) {
    return Response.json({ error: "Chat is taking a break. Try again in a minute." }, { status: 502 });
  }
}
