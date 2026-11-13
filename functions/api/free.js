// POST /api/free  { email, item, consent }  →  { url }
// Saves the email to your D1 database, then returns a download link that works for 24 hours.
import { PRODUCTS } from "../../catalog.js";
import { sign } from "../../lib/sign.js";

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
  const p = PRODUCTS.find((x) => x.id === b.item && x.type === "free");
  if (!p) return Response.json({ error: "That freebie doesn't exist." }, { status: 404 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (b.consent !== true) return Response.json({ error: "Tick the box to get your free download." }, { status: 400 });
  if (!env.DB || !env.DOWNLOAD_SECRET) return Response.json({ error: "Free downloads aren't connected yet." }, { status: 503 });

  const now = new Date().toISOString();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY, first_item TEXT, last_item TEXT, consent INTEGER, created_at TEXT, updated_at TEXT)`).run();
  await env.DB.prepare(`INSERT INTO subscribers (email, first_item, last_item, consent, created_at, updated_at)
      VALUES (?1, ?2, ?2, 1, ?3, ?3)
      ON CONFLICT(email) DO UPDATE SET last_item = ?2, consent = 1, updated_at = ?3`).bind(email, p.id, now).run();

  const exp = Date.now() + 24 * 3600 * 1000;
  const sig = await sign(env.DOWNLOAD_SECRET, `${p.id}.${exp}`);
  return Response.json({ url: `/api/free-download?item=${encodeURIComponent(p.id)}&exp=${exp}&sig=${sig}` });
}
