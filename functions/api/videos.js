// GET /api/videos  →  your newest YouTube uploads (from the channel's public feed, no API key needed)
import { SITE } from "../../catalog.js";

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

export async function onRequestGet() {
  if (!/^UC[\w-]{20,}$/.test(SITE.youtubeChannelId)) return Response.json({ videos: [], note: "Add your channel ID in catalog.js" });
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${SITE.youtubeChannelId}`, { cf: { cacheTtl: 1800, cacheEverything: true } });
  if (!res.ok) return Response.json({ videos: [] }, { status: 502 });
  const xml = await res.text();
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 12).map(([, e]) => ({
    id: (e.match(/<yt:videoId>([^<]+)/) || [])[1],
    title: decode((e.match(/<title>([^<]*)/) || [])[1] || ""),
    published: (e.match(/<published>([^<]+)/) || [])[1],
  })).filter((v) => v.id);
  return Response.json({ videos }, { headers: { "Cache-Control": "public, max-age=1800" } });
}
