import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 3000);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: Boolean(process.env.GEMINI_API_KEY),
    imageModel: process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image",
    textModel: process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash"
  });
});

app.get("/api/models", async (_req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY belum dikonfigurasi." });
    }

    const models = [];
    for await (const model of await ai.models.list()) {
      const name = model.name || "";
      const id = name.replace(/^models\//, "");
      const actions = model.supportedActions || model.supported_actions || [];
      models.push({
        id,
        name: model.displayName || id,
        description: model.description || "",
        actions
      });
    }

    models.sort((a, b) => a.id.localeCompare(b.id));
    res.json({ ok: true, models });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error?.message || "Gagal mengambil daftar model Gemini." });
  }
});

app.post("/api/generate", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum dikonfigurasi di file .env."
      });
    }

    const {
      prompt,
      enhance = true,
      aspectRatio = "1:1",
      model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image"
    } = req.body || {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return res.status(400).json({
        error: "Masukkan prompt minimal 3 karakter."
      });
    }

    let finalPrompt = prompt.trim();

    if (enhance) {
      const textResult = await ai.models.generateContent({
        model: process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash",
        contents: `Rewrite this image request into one polished, production-ready image prompt.
Preserve the user's intent. Add useful subject, composition, lighting, environment,
camera/style and visual details when helpful. Do not explain anything. Return only the final prompt.

USER REQUEST:
${finalPrompt}`
      });

      const improved = textResult.text?.trim();
      if (improved) finalPrompt = improved;
    }

    const result = await ai.models.generateContent({
      model: model,
      contents: finalPrompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio
        }
      }
    });

    const parts = result.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(
      p => p.inlineData?.data && p.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart) {
      const text = parts.find(p => p.text)?.text;
      throw new Error(
        text || "Gemini tidak mengembalikan data gambar. Pastikan model image generation tersedia untuk API key Anda."
      );
    }

    const mime = imagePart.inlineData.mimeType || "image/png";
    res.json({
      ok: true,
      image: `data:${mime};base64,${imagePart.inlineData.data}`,
      prompt: finalPrompt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error?.message || "Terjadi kesalahan saat membuat gambar dengan Gemini."
    });
  }
});

app.get("*splat", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`CupzProject Gemini AI Image Generator: http://localhost:${port}`);
});