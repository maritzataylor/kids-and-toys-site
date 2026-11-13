// GET /api/download?order=PAYPALID&item=product-id  →  the PDF, only if that order paid for it
import { getPaidOrder } from "../../lib/paypal.js";
import { sendPdf } from "../../lib/r2.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const o = await getPaidOrder(u.searchParams.get("order"), env);
  if (o.error) return new Response(o.error, { status: o.status });
  const p = o.products.find((x) => x.id === u.searchParams.get("item"));
  if (!p) return new Response("That file isn't part of this order.", { status: 403 });
  return sendPdf(env, p.file);
}
