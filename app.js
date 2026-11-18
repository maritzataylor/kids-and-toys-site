import { PRODUCTS, SITE, FAQ, FEATURED_VIDEOS, CATEGORIES, COVER_GRID } from "./catalog.js";

// PREVIEW is set only in the claude.ai preview build, where PayPal, YouTube and the server aren't available.
const PREVIEW = !!window.KTA_PREVIEW;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const money = (n) => `$${n.toFixed(2)}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FREE = PRODUCTS.filter((p) => p.type === "free");
const PAID = PRODUCTS.filter((p) => p.type === "paid");
const find = (id) => PRODUCTS.find((p) => p.id === id);

// ---------- Site info ----------
$$(".ytLink").forEach((a) => (a.href = SITE.youtube));
$$(".emailLink").forEach((a) => { a.href = `mailto:${SITE.email}`; a.textContent = SITE.email; });
$("#yr").textContent = new Date().getFullYear();
$("#faqList").innerHTML = FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("");

// ---------- Tabs (Home / Videos) ----------
function route() {
  const videos = location.hash === "#videos";
  $('[data-view="home"]').hidden = videos;
  $('[data-view="videos"]').hidden = !videos;
  $$("[data-view-link]").forEach((a) => a.toggleAttribute("aria-current", videos));
  if (videos) { window.scrollTo(0, 0); loadVideos(); document.title = "Videos | Kids & Toys Learning Academy"; }
  else {
    document.title = "Kids & Toys Learning Academy | Where learning is fun";
    const target = location.hash && document.querySelector(location.hash);
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  }
}
window.addEventListener("hashchange", route);

// ---------- Product tiles ----------
function tile(p) {
  const art = coverArt(p);
  const isFree = p.type === "free";
  const badge = isFree ? "Free" : p.bundle ? "Bundle" : p.price === 1 ? "$1 deal" : "20-page pack";
  return `<article class="card">
    <div class="tile" style="background:${esc(p.color || "#EAF6FA")}">${art}<span class="badge">${badge}</span></div>
    <div class="card-body">
      <span class="ages">${p.bundle ? esc(p.ages) : "Ages " + esc(p.ages)}</span>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.blurb)}</p>
      <div class="buy">${isFree
        ? `<span class="free-tag">Free</span><button class="btn btn-teal" data-free="${esc(p.id)}">Get it free</button>`
        : `<span class="price">${money(p.price)}</span><button class="btn btn-pink" data-add="${esc(p.id)}">Add to cart</button>`}</div>
    </div></article>`;
}
$("#freeGrid").innerHTML = FREE.map(tile).join("");
// Shop: category tabs, search and "show more"
let shopCat = "bundles", shopQuery = "", shopLimit = 24;
function renderShop() {
  const q = shopQuery.trim().toLowerCase();
  let list = q
    ? PRODUCTS.filter((p) => (p.name + " " + p.blurb).toLowerCase().includes(q))
    : PRODUCTS.filter((p) => (p.cats || []).includes(shopCat));
  const total = list.length;
  list = list.slice(0, shopLimit);
  $("#grid").innerHTML = list.map(tile).join("") || `<p class="vnote">Nothing found. Try another word!</p>`;
  $("#moreBtn").hidden = total <= shopLimit;
  $("#shopCount").textContent = q ? `${total} result${total === 1 ? "" : "s"} for "${shopQuery}"` : `${total} item${total === 1 ? "" : "s"}`;
}
$("#tabs").innerHTML = CATEGORIES.filter((c) => c.id !== "free").map((c) =>
  `<button class="tab" data-cat="${c.id}" aria-pressed="${c.id === shopCat}">${esc(c.name)}</button>`).join("");
$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-cat]"); if (!b) return;
  shopCat = b.dataset.cat; shopQuery = ""; $("#shopSearch").value = ""; shopLimit = 24;
  $$("#tabs .tab").forEach((t) => t.setAttribute("aria-pressed", t === b)); renderShop();
});
$("#shopSearch").addEventListener("input", (e) => { shopQuery = e.target.value; shopLimit = 24; renderShop(); });
$("#moreBtn").addEventListener("click", () => { shopLimit += 24; renderShop(); });
renderShop();

// ---------- Free download (email first) ----------
let freeItem = null;
const modal = $("#freeModal");
function openFree(id) {
  freeItem = find(id);
  $("#freeName").textContent = `${freeItem.name}, ages ${freeItem.ages}.`;
  $("#freeErr").textContent = "";
  $("#freeForm").hidden = false; $("#freeDone").hidden = true;
  $("#freeSubmit").disabled = false; $("#freeSubmit").textContent = "Download free";
  modal.showModal(); $("#freeEmail").focus();
}
$("#freeClose").onclick = () => modal.close();
modal.addEventListener("click", (e) => { if (e.target === modal) modal.close(); });
$("#freeForm").onsubmit = async (e) => {
  e.preventDefault();
  const email = $("#freeEmail").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { $("#freeErr").textContent = "Enter a valid email address."; return; }
  if (!$("#freeConsent").checked) { $("#freeErr").textContent = "Tick the box to get your free download."; return; }
  const btn = $("#freeSubmit"); btn.disabled = true; btn.textContent = "Getting your file…"; $("#freeErr").textContent = "";
  if (PREVIEW) {
    $("#freeForm").hidden = true; $("#freeDone").hidden = false;
    $("#freeDoneMsg").textContent = "This is the preview. On your live site, the email is saved to your list and the PDF downloads right here.";
    $("#freeLink").hidden = true; return;
  }
  try {
    const r = await fetch("/api/free", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, item: freeItem.id, consent: true }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) throw new Error(d.error || "Something went wrong. Try again in a moment.");
    $("#freeLink").href = d.url; $("#freeLink").hidden = false;
    $("#freeForm").hidden = true; $("#freeDone").hidden = false;
    location.href = d.url; // starts the download
  } catch (err) {
    $("#freeErr").textContent = err.message; btn.disabled = false; btn.textContent = "Download free";
  }
};

// ---------- Cart ----------
let cart = [];
try { cart = JSON.parse(localStorage.getItem("kta-cart2") || "[]"); } catch { cart = []; }
cart = cart.filter((id) => PAID.some((p) => p.id === id));
const save = () => { try { localStorage.setItem("kta-cart2", JSON.stringify(cart)); } catch {} };

function coverArt(p) {
  return p.cover !== undefined
    ? `<span class="cover" role="img" aria-label="${esc(p.name)} cover" style="background-size:${COVER_GRID.cols * 100}% ${COVER_GRID.rows * 100}%;background-position:${(p.cover % COVER_GRID.cols) / (COVER_GRID.cols - 1) * 100}% ${Math.floor(p.cover / COVER_GRID.cols) / (COVER_GRID.rows - 1) * 100}%"></span>`
    : p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : `<span class="mark" aria-hidden="true">${esc(p.mark || "")}</span>`;
}
function renderCart() {
  $("#cartCount").textContent = cart.length;
  $("#cartItems").innerHTML = cart.length
    ? cart.map((id) => { const p = find(id); return `<div class="line"><span class="sw">${coverArt(p)}</span>
        <div><strong>${esc(p.name)}</strong><small>Instant download</small><br><button class="remove" data-rm="${p.id}">Remove</button></div>
        <strong>${money(p.price)}</strong></div>`; }).join("")
    : `<p class="empty">Your cart is empty. Printables you add will show up here.</p>`;
  $("#cartTotal").textContent = money(cart.reduce((a, id) => a + find(id).price, 0));
  $("#paypal").hidden = !cart.length;
  save();
}
function openCart() {
  $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false"); $("#scrim").hidden = false;
  $("#cartClose").focus(); loadPayPal();
}
function closeCart() { $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true"); $("#scrim").hidden = true; }

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-add],[data-rm],[data-free]");
  if (!t) return;
  if (t.dataset.free) return openFree(t.dataset.free);
  if (t.dataset.add) { if (!cart.includes(t.dataset.add)) cart.push(t.dataset.add); renderCart(); openCart(); }
  if (t.dataset.rm) { cart = cart.filter((id) => id !== t.dataset.rm); renderCart(); }
});
$("#cartOpen").onclick = openCart;
$("#cartClose").onclick = closeCart;
$("#scrim").onclick = closeCart;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeCart(); closeChat(); } });

// ---------- PayPal ----------
function showPPError(m) { $("#checkoutErr").textContent = m; console.error(m); }
let paypalState = "idle";
function loadPayPal() {
  if (paypalState !== "idle") return;
  paypalState = "loading";
  const notReady = !SITE.paypalClientId || SITE.paypalClientId.startsWith("REPLACE");
  if (PREVIEW || notReady) {
    $("#paypal").innerHTML = `<div class="paypal-placeholder">${PREVIEW
      ? "PayPal and card buttons appear here on your live site."
      : "Add your PayPal Client ID in catalog.js to turn on checkout."}</div>`;
    return;
  }
  const s = document.createElement("script");
  s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(SITE.paypalClientId)}&currency=${SITE.currency}&intent=capture&components=buttons`;
  s.onload = () => { try { renderPayPal(); } catch (e) { showPPError("PayPal loaded but couldn't draw its button: " + (e && e.message || e)); } };
  setTimeout(() => { if (!$("#paypal iframe") && !$("#checkoutErr").textContent) showPPError("PayPal is taking too long to appear. If this keeps happening, try another browser or turn off ad blockers."); }, 12000);
  s.onerror = () => { $("#checkoutErr").textContent = "PayPal didn't load. Check your connection and refresh the page."; paypalState = "idle"; };
  document.head.appendChild(s);
}
function renderPayPal() {
  const err = (m) => ($("#checkoutErr").textContent = m || "");
  window.paypal.Buttons({
    style: { shape: "pill", label: "pay", height: 46 },
    onClick: () => err(),
    createOrder: async () => {
      const r = await fetch("/api/paypal/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.id) { err(d.error || "Checkout couldn't start. Try again in a moment."); throw new Error("create failed"); }
      return d.id;
    },
    onApprove: async (data, actions) => {
      const r = await fetch("/api/paypal/capture-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderID: data.orderID }) });
      const d = await r.json().catch(() => ({}));
      if (d.retry) return actions.restart();
      if (!r.ok || !d.ok) return err(d.error || "Payment didn't go through. You haven't been charged.");
      cart = []; save();
      location.href = `/thanks?order=${encodeURIComponent(d.orderID)}`;
    },
    onError: (e) => err("PayPal hit a problem: " + (e && e.message ? e.message : "please try again.")),
  }).render("#paypal").catch((e) => showPPError("PayPal couldn't draw its button: " + (e && e.message || e)));
  paypalState = "ready";
}
renderCart();

// ---------- Videos ----------
function videoCard(v, big) {
  const date = v.published ? new Date(v.published).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const inner = PREVIEW || !/^[\w-]{11}$/.test(v.id)
    ? `<span class="ph"></span>`
    : `<img src="https://i.ytimg.com/vi/${v.id}/${big ? "maxresdefault" : "hqdefault"}.jpg" alt="" loading="lazy" onerror="this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'">`;
  return `<figure class="vid"><button class="frame" data-video="${esc(v.id)}" aria-label="Play ${esc(v.title)}">${inner}
      <span class="play" aria-hidden="true"><span><svg width="22" height="22" viewBox="0 0 24 24"><path fill="#fff" d="M8 5v14l11-7z"/></svg></span></span></button>
    <figcaption>${esc(v.title)}${date ? `<small>${date}</small>` : ""}</figcaption></figure>`;
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-video]");
  if (!b) return;
  const id = b.dataset.video;
  if (PREVIEW || !/^[\w-]{11}$/.test(id)) {
    const ph = b.querySelector(".ph"), play = b.querySelector(".play");
    if (ph) ph.textContent = PREVIEW ? "Videos play here on your live site." : "Add this video's ID in catalog.js.";
    if (play) play.hidden = true;
    return;
  }
  b.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="YouTube video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
});
let videosLoaded = false;
async function loadVideos() {
  if (videosLoaded) return; videosLoaded = true;
  $("#featuredGrid").innerHTML = FEATURED_VIDEOS.map((v) => videoCard(v, true)).join("") || `<p class="vnote">Featured videos will show here.</p>`;
  if (PREVIEW) {
    $("#latestGrid").innerHTML = ["Newest video", "Last week's lesson", "Sing-along", "Toy counting fun"].map((t, i) => videoCard({ id: "preview" + i, title: t })).join("") +
      `<p class="vnote" style="grid-column:1/-1">On your live site, your newest uploads appear here automatically.</p>`;
    return;
  }
  try {
    const r = await fetch("/api/videos"); const d = await r.json();
    const featured = new Set(FEATURED_VIDEOS.map((v) => v.id));
    const list = (d.videos || []).filter((v) => !featured.has(v.id));
    $("#latestGrid").innerHTML = list.length ? list.map((v) => videoCard(v)).join("")
      : `<p class="vnote">New videos will show here. <a class="ytLink" href="${esc(SITE.youtube)}" target="_blank" rel="noopener">Visit our channel</a> to watch now.</p>`;
  } catch {
    $("#latestGrid").innerHTML = `<p class="vnote">Couldn't load the newest videos. <a href="${esc(SITE.youtube)}" target="_blank" rel="noopener">Watch them on YouTube</a>.</p>`;
  }
}

// ---------- Chatbot ----------
const history = [];
const log = $("#chatLog");
const samplePromise = PREVIEW && window.claude?.use ? window.claude.use("sample").catch(() => null) : Promise.resolve(null);
const INSTRUCTIONS = `You are the friendly helper on the ${SITE.name} website. The academy makes learning videos on YouTube and offers printable learning PDFs for kids ages 2–7. You talk with parents, grandparents and teachers.
Printables:
${PRODUCTS.map((p) => `- ${p.name} (${p.type === "free" ? "FREE, get it by entering an email" : "$" + p.price.toFixed(2)}), ages ${p.ages}: ${p.blurb}`).join("\n")}
Payment is by PayPal or card through PayPal. ${SITE.refundNote} Contact: ${SITE.email}.
FAQ:
${FAQ.map((f) => `Q: ${f.q} A: ${f.a}`).join("\n")}
Rules: reply in under 80 words, warm and plain. Only mention the printables, prices and policies above; never invent discounts or order details. You can't see orders; for order problems ask them to email ${SITE.email}. Never ask for personal information. If a child seems to be typing, answer simply and suggest asking a grown-up. Reply with only your answer to the visitor.`;

function bubble(text, who) {
  const el = document.createElement("div");
  el.className = `msg ${who}`; el.textContent = text;
  log.appendChild(el); log.scrollTop = log.scrollHeight; return el;
}
function openChat() {
  $("#chat").hidden = false; $("#chatOpen").hidden = true;
  if (!log.children.length) bubble("Hi! I can help you find the right printable, point you to our free ones, or answer questions about downloads.", "bot");
  $("#chatInput").focus();
}
function closeChat() { $("#chat").hidden = true; $("#chatOpen").hidden = false; }
$("#chatOpen").onclick = openChat;
$("#chatClose").onclick = closeChat;

function localAnswer(q) {
  q = q.toLowerCase();
  if (/free/.test(q)) return `Our free printables: ${FREE.map((p) => p.name).join(", ")}. Click "Get it free", enter your email, and it downloads right away.`;
  if (/paypal|card|pay/.test(q)) return FAQ.find((f) => /PayPal account/.test(f.q)).a;
  if (/download|pdf|print|get my/.test(q)) return FAQ[0].a;
  const age = q.match(/(\d+)\s*-?\s*(year|yr)/);
  if (age) {
    const n = +age[1];
    const picks = PRODUCTS.filter((p) => { const m = p.ages.match(/(\d+)(?:–(\d+))?/); return m && n >= +m[1] && n <= +(m[2] || 99); });
    if (picks.length) return `For a ${n}-year-old, try: ${picks.map((p) => `${p.name} (${p.type === "free" ? "free" : money(p.price)})`).join(", ")}.`;
  }
  return `I'm not sure about that one. Email us at ${SITE.email} and we'll help.`;
}
async function ask(text) {
  text = text.trim(); if (!text) return;
  $("#chips").hidden = true;
  bubble(text, "me"); history.push({ role: "user", content: text });
  const wait = bubble("Thinking…", "bot typing");
  let reply = "";
  try {
    if (PREVIEW) {
      const sample = await samplePromise;
      if (!sample) throw new Error();
      const msgs = history.slice(-10).map((m, i) => ({ role: m.role, content: i === 0 && m.role === "user" ? INSTRUCTIONS + "\n\nVisitor: " + m.content : m.content }));
      if (msgs[0].role !== "user") msgs.shift();
      reply = ((await sample(msgs, { cache: false, modelTier: "quick" })).text || "").trim();
    } else {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      const d = await r.json(); if (r.ok) reply = d.reply;
    }
    if (!reply) throw new Error();
  } catch { reply = localAnswer(text); }
  wait.remove(); bubble(reply, "bot"); history.push({ role: "assistant", content: reply });
}
$("#chatForm").onsubmit = (e) => { e.preventDefault(); const i = $("#chatInput"); ask(i.value); i.value = ""; };
$("#chips").addEventListener("click", (e) => { if (e.target.tagName === "BUTTON") ask(e.target.textContent); });

route();
