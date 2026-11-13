// POST /api/paypal/capture-order  { orderID }  →  { ok, orderID }
import { accessToken, apiBase } from "../../../lib/paypal.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const id = String(body.orderID || "");
  if (!/^[A-Z0-9]{10,30}$/.test(id)) return Response.json({ error: "Invalid order." }, { status: 400 });
  try {
    const token = await accessToken(env);
    const res = await fetch(`${apiBase(env)}/v2/checkout/orders/${id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    const data = await res.json();
    const issue = data?.details?.[0]?.issue;
    if (issue === "INSTRUMENT_DECLINED") return Response.json({ error: "declined", retry: true }, { status: 402 });
    if (issue === "ORDER_ALREADY_CAPTURED") return Response.json({ ok: true, orderID: id });
    if (!res.ok || data.status !== "COMPLETED") return Response.json({ error: "Payment didn't go through. You haven't been charged." }, { status: 502 });
    return Response.json({ ok: true, orderID: id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 503 });
  }
}
