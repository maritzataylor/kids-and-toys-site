// POST /api/paypal/create-order  { items: ["product-id", ...] }  →  { id }
// Prices come from catalog.js on the server, never from the browser.
import { SITE } from "../../../catalog.js";
import { accessToken, apiBase, paidProduct, money } from "../../../lib/paypal.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request." }, { status: 400 }); }
  const ids = [...new Set(Array.isArray(body.items) ? body.items : [])];
  const products = ids.map(paidProduct).filter(Boolean);
  if (!products.length) return Response.json({ error: "Your cart is empty." }, { status: 400 });

  const total = money(products.reduce((a, p) => a + p.price, 0));
  const order = {
    intent: "CAPTURE",
    purchase_units: [{
      description: `${SITE.name} printables`,
      amount: { currency_code: SITE.currency, value: total, breakdown: { item_total: { currency_code: SITE.currency, value: total } } },
      items: products.map((p) => ({
        name: p.name.slice(0, 127), sku: p.id, quantity: "1", category: "DIGITAL_GOODS",
        unit_amount: { currency_code: SITE.currency, value: money(p.price) },
      })),
    }],
    application_context: { shipping_preference: "NO_SHIPPING", brand_name: SITE.name.slice(0, 127), user_action: "PAY_NOW" },
  };
  try {
    const token = await accessToken(env);
    const res = await fetch(`${apiBase(env)}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.message || "PayPal couldn't start checkout." }, { status: 502 });
    return Response.json({ id: data.id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 503 });
  }
}
