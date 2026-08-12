export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY belum diatur di Vercel." });

  try {
    const body = req.body || {};
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const enhance = body.enhance !== false;
    const aspectRatio = body.aspectRatio || "1:1";
    const model = body.model || process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
    const textModel = process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash";

    if (prompt.length < 3) return res.status(400).json({ error: "Masukkan prompt minimal 3 karakter." });

    let finalPrompt = prompt;

    if (enhance) {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(textModel)}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text:
                  "Rewrite the user's image request into one polished production-ready image prompt. " +
                  "Preserve intent. Add useful subject, composition, lighting, environment, camera/style " +
                  "details when helpful. Return only the final prompt.\\n\\nUSER REQUEST:\\n" + prompt
              }]
            }]
          })
        }
      );
      const raw = await r.text();
      let d;
      try { d = JSON.parse(raw); } catch { throw new Error(`Gemini text endpoint returned invalid data (HTTP ${r.status}).`); }
      if (!r.ok) throw new Error(d?.error?.message || `Gemini text error (HTTP ${r.status}).`);
      const improved = d?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
      if (improved) finalPrompt = improved;
    }

    // Current Gemini image-generation endpoint.
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: finalPrompt,
        response_format: {
          type: "image",
          mime_type: "image/png",
          aspect_ratio: aspectRatio,
          image_size: "1K"
        }
      })
    });

    const raw = await r.text();
    let d;
    try { d = JSON.parse(raw); } catch {
      throw new Error(`Gemini image endpoint returned invalid data (HTTP ${r.status}).`);
    }
    if (!r.ok) throw new Error(d?.error?.message || `Gemini image error (HTTP ${r.status}).`);

    let imageData = null;
    let mime = "image/png";

    for (const step of d.output || []) {
      if (step.type !== "model_output") continue;
      for (const block of step.content || []) {
        if (block.type === "image" && block.data) {
          imageData = block.data;
          mime = block.mime_type || mime;
          break;
        }
      }
      if (imageData) break;
    }

    // Compatibility fallback for SDK/gateway response shapes.
    if (!imageData) {
      for (const step of d.steps || []) {
        if (step.type !== "model_output") continue;
        for (const block of step.content || []) {
          if (block.type === "image" && block.data) {
            imageData = block.data;
            mime = block.mime_type || mime;
            break;
          }
        }
        if (imageData) break;
      }
    }

    if (!imageData) throw new Error("Gemini tidak mengembalikan gambar. Pastikan model yang dipilih mendukung image generation.");

    return res.status(200).json({
      ok: true,
      image: `data:${mime};base64,${imageData}`,
      prompt: finalPrompt,
      model
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Terjadi kesalahan Gemini API." });
  }
}
