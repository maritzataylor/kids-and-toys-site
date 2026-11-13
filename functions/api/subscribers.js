// GET /api/subscribers?key=YOUR_ADMIN_KEY  →  downloads your email list as a CSV
export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get("key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response("Not allowed.", { status: 403 });
  if (!env.DB) return new Response("Database isn't connected yet.", { status: 503 });
  let rows = [];
  try {
    rows = (await env.DB.prepare("SELECT email, first_item, last_item, consent, created_at, updated_at FROM subscribers ORDER BY created_at DESC").all()).results;
  } catch { rows = []; }
  const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = ["email,first_freebie,last_freebie,consent,signed_up,last_seen", ...rows.map((r) =>
    [r.email, r.first_item, r.last_item, r.consent ? "yes" : "no", r.created_at, r.updated_at].map(q).join(","))].join("\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="subscribers.csv"', "Cache-Control": "no-store" },
  });
}
