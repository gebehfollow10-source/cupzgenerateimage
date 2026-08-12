const $ = s => document.querySelector(s);
const promptEl = $("#prompt");
const canvas = $("#canvas");
const generateBtn = $("#generateBtn");
const downloadBtn = $("#downloadBtn");
const promptUsed = $("#promptUsed");
let currentImage = null;
let allModels = [];

async function loadModels() {
  const select = $("#model");
  try {
    const r = await fetch("/api/models");
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Gagal mengambil model");

    allModels = data.models || [];
    select.innerHTML = "";

    const imageModels = allModels.filter(m =>
      m.actions.some(a => String(a).toLowerCase().includes("generatecontent")) &&
      /image|imagen|nano.?banana/i.test(m.id + " " + m.name)
    );
    const preferred = imageModels.length ? imageModels : allModels;

    preferred.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name + " — " + m.id;
      select.appendChild(opt);
    });

    const defaultId = "gemini-3.1-flash-image";
    if ([...select.options].some(o => o.value === defaultId)) {
      select.value = defaultId;
    }
  } catch (e) {
    select.innerHTML = '<option value="gemini-3.1-flash-image">Gemini 3.1 Flash Image</option>';
  }
}

loadModels();

const inspirations = [
  "A cinematic night market in Yogyakarta, Indonesia, after rain, warm lanterns, reflections on wet streets, realistic photography",
  "A futuristic Indonesian city floating above the ocean at sunset, elegant architecture, volumetric light, epic cinematic concept art",
  "A cute orange cat astronaut exploring a colorful alien planet, whimsical 3D illustration, expressive face, detailed environment",
  "Luxury perfume bottle on black marble with dramatic studio lighting, premium editorial product photography"
];

document.querySelectorAll(".quick button").forEach(btn => {
  btn.onclick = () => { promptEl.value = btn.dataset.prompt; promptEl.focus(); };
});

$("#randomBtn").onclick = () => {
  promptEl.value = inspirations[Math.floor(Math.random() * inspirations.length)];
  promptEl.focus();
};

async function generate() {
  const prompt = promptEl.value.trim();
  if (prompt.length < 3) return promptEl.focus();

  generateBtn.disabled = true;
  generateBtn.innerHTML = "<span>◌ Gemini sedang membuat gambar…</span>";
  downloadBtn.disabled = true;
  promptUsed.textContent = "";
  canvas.innerHTML = '<div class="loading"><div class="loader"></div><div>Gemini sedang menyempurnakan prompt & membuat gambar…</div></div>';

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        prompt,
        enhance: $("#enhance").checked,
        aspectRatio: $("#aspectRatio").value,
        model: $("#model").value
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Generation failed");

    currentImage = data.image;
    canvas.innerHTML = "";
    const img = document.createElement("img");
    img.src = currentImage;
    img.alt = prompt;
    canvas.appendChild(img);
    promptUsed.textContent = "Prompt final Gemini: " + data.prompt;
    downloadBtn.disabled = false;
  } catch (err) {
    canvas.innerHTML = `<div class="empty"><div class="spark">!</div><h3>Generation failed</h3><p>${escapeHtml(err.message)}</p></div>`;
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = "<span>✦ Generate with Gemini</span><kbd>Ctrl ↵</kbd>";
  }
}

downloadBtn.onclick = () => {
  if (!currentImage) return;
  const a = document.createElement("a");
  a.href = currentImage;
  a.download = `cupzproject-gemini-${Date.now()}.png`;
  document.body.appendChild(a); a.click(); a.remove();
};

generateBtn.onclick = generate;
promptEl.onkeydown = e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") generate();
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}