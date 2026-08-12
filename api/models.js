export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY belum diatur di Vercel." });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(502).json({ error: "Gemini Models API mengembalikan response tidak valid." }); }
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Gagal mengambil daftar model Gemini." });

    const models = (data.models || []).map(m => ({
      id: String(m.name || "").replace(/^models\//, ""),
      name: m.displayName || m.name,
      description: m.description || "",
      actions: m.supportedGenerationMethods || []
    })).filter(m => m.id);

    models.sort((a,b) => a.id.localeCompare(b.id));
    return res.status(200).json({ ok: true, models });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Model API error." });
  }
}
