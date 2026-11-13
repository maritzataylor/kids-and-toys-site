// Signs short-lived links for free downloads, so the file is only reachable after the email form.
const enc = new TextEncoder();
async function key(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function sign(secret, data) {
  return hex(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(data)));
}
export async function verify(secret, data, sig) {
  const good = await sign(secret, data);
  if (!sig || good.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < good.length; i++) diff |= good.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}
