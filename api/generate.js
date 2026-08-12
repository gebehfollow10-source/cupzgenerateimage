import { GoogleGenAI } from "@google/genai";

const MODELS = {
  "gemini-3.1-flash-lite-image": "Nano Banana 2 Lite",
  "gemini-3.1-flash-image": "Nano Banana 2",
  "gemini-3-pro-image": "Nano Banana Pro",
  "gemini-2.5-flash-image": "Nano Banana"
};

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");

  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return response.status(500).json({
      error: "GEMINI_API_KEY belum diatur di Vercel Environment Variables."
    });
  }

  try {
    const {
      prompt,
      model = "gemini-3.1-flash-image",
      aspectRatio = "1:1",
      negativePrompt = ""
    } = request.body || {};

    if (!prompt || !String(prompt).trim()) {
      return response.status(400).json({ error: "Prompt tidak boleh kosong." });
    }

    if (!MODELS[model]) {
      return response.status(400).json({ error: "Model gambar tidak dikenal." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const finalPrompt = [
      `Create a high-quality image based on this user prompt: ${String(prompt).trim()}`,
      `Desired aspect ratio: ${aspectRatio}.`,
      negativePrompt && String(negativePrompt).trim()
        ? `Avoid these elements/styles: ${String(negativePrompt).trim()}.`
        : "",
      "Return an image suitable for a modern AI image generator UI."
    ].filter(Boolean).join("\n");

    const result = await ai.models.generateContent({
      model,
      contents: finalPrompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio }
      }
    });

    let image = null;
    let text = "";

    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.text) text += part.text;
      if (part.inlineData?.data) {
        image = {
          mimeType: part.inlineData.mimeType || "image/png",
          data: part.inlineData.data
        };
      }
    }

    if (!image) {
      return response.status(502).json({
        error: "Gemini tidak mengembalikan gambar. Coba prompt/model lain.",
        text
      });
    }

    return response.status(200).json({
      ok: true,
      model,
      modelName: MODELS[model],
      aspectRatio,
      image,
      text
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({
      error: error?.message || "Terjadi kesalahan saat menghubungi Gemini API."
    });
  }
}
