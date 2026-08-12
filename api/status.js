export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  response.status(200).json({
    ok: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    models: [
      { id: "gemini-3.1-flash-image", name: "Nano Banana 2" },
      { id: "gemini-3.1-flash-lite-image", name: "Nano Banana 2 Lite" },
      { id: "gemini-3-pro-image", name: "Nano Banana Pro" },
      { id: "gemini-2.5-flash-image", name: "Nano Banana" }
    ]
  });
}
