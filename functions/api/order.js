// GET /api/order?order=PAYPALID  →  what was bought (for the thank-you page)
import { getPaidOrder } from "../../lib/paypal.js";

export async function onRequestGet({ request, env }) {
  const o = await getPaidOrder(new URL(request.url).searchParams.get("order"), env);
  if (o.error) return Response.json({ error: o.error }, { status: o.status });
  return Response.json({ email: o.email, items: o.products.map((p) => ({ id: p.id, name: p.name })) });
}
