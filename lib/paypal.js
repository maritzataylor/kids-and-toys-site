// PayPal helpers (server side). Needs PAYPAL_CLIENT_ID + PAYPAL_SECRET secrets,
// and PAYPAL_ENV = "live" when you go live (anything else uses the sandbox).
import { PRODUCTS, SITE } from "../catalog.js";

export const apiBase = (env) =>
  env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

export async function accessToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) throw new Error("PayPal isn't connected yet.");
  const res = await fetch(`${apiBase(env)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal sign-in failed. Check PAYPAL_CLIENT_ID and PAYPAL_SECRET.");
  return (await res.json()).access_token;
}

export const paidProduct = (id) => PRODUCTS.find((p) => p.id === id && p.type === "paid");
export const money = (n) => n.toFixed(2);

// Confirms an order is ours, fully paid, at catalog prices, and recent. Returns the products bought.
export async function getPaidOrder(orderId, env) {
  if (!/^[A-Z0-9]{10,30}$/.test(orderId || "")) return { error: "That order link isn't valid.", status: 400 };
  let token;
  try { token = await accessToken(env); } catch (e) { return { error: e.message, status: 503 }; }
  const res = await fetch(`${apiBase(env)}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return { error: "We couldn't find that order.", status: 404 };
  const o = await res.json();
  const pu = o.purchase_units?.[0];
  const cap = pu?.payments?.captures?.[0];
  if (o.status !== "COMPLETED" || cap?.status !== "COMPLETED") return { error: "This order hasn't finished paying yet.", status: 402 };

  const items = (pu.items || []).map((i) => ({ p: paidProduct(i.sku), i }));
  if (!items.length || items.some(({ p, i }) => !p || i.unit_amount?.value !== money(p.price) || i.unit_amount?.currency_code !== SITE.currency)) {
    return { error: "This order doesn't match our price list. Please email us.", status: 409 };
  }
  const expected = items.reduce((a, { p, i }) => a + p.price * Number(i.quantity || 1), 0);
  if (cap.amount?.currency_code !== SITE.currency || Number(cap.amount?.value) + 0.001 < expected) {
    return { error: "This order's payment doesn't match. Please email us.", status: 409 };
  }
  const ageDays = (Date.now() - Date.parse(o.create_time || cap.create_time)) / 86400000;
  if (ageDays > SITE.downloadDays) {
    return { error: `Download links expire after ${SITE.downloadDays} days. Email ${SITE.email} and we'll send fresh ones.`, status: 410 };
  }
  return { order: o, products: items.map(({ p }) => p), email: o.payer?.email_address || null };
}
