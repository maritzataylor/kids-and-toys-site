export async function sendPdf(env, file) {
  if (!env.DOWNLOADS) return new Response("File storage isn't connected yet (R2 binding DOWNLOADS).", { status: 503 });
  const obj = await env.DOWNLOADS.get(file);
  if (!obj) return new Response("File not found. Please email us and we'll send it right over.", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": file.endsWith(".zip") ? "application/zip" : "application/pdf",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
