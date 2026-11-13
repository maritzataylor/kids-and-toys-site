// GET /api/free-download?item=&exp=&sig=  →  the free PDF, if the link is signed and not expired
import { PRODUCTS } from "../../catalog.js";
import { verify } from "../../lib/sign.js";
import { sendPdf } from "../../lib/r2.js";

export async function onRequestGet({ request, env }) {
  const u = new URL(request.url);
  const item = u.searchParams.get("item"), exp = Number(u.searchParams.get("exp"));
  const p = PRODUCTS.find((x) => x.id === item && x.type === "free");
  if (!p || !env.DOWNLOAD_SECRET) return new Response("Not found.", { status: 404 });
  if (!(exp > Date.now())) return new Response("This link has expired. Go back to the site and grab it again, it's free.", { status: 410 });
  if (!(await verify(env.DOWNLOAD_SECRET, `${p.id}.${exp}`, u.searchParams.get("sig")))) return new Response("Invalid link.", { status: 403 });
  return sendPdf(env, p.file);
}
