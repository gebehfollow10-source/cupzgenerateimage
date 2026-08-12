const $=id=>document.getElementById(id);
const promptEl=$("prompt"),modelEl=$("model"),ratioEl=$("ratio"),negativeEl=$("negative"),btn=$("generate"),canvas=$("canvas"),meta=$("meta"),error=$("error"),download=$("download"),historyEl=$("history"),status=$("status");
let current=null,history=JSON.parse(sessionStorage.getItem("cupz_history")||"[]");

function renderHistory(){
  if(!history.length){historyEl.innerHTML='<div class="historyEmpty">Belum ada hasil di sesi ini.</div>';return}
  historyEl.innerHTML=history.map((x,i)=>`<button class="historyItem" data-i="${i}"><img src="${x.src}" alt="Generated image"></button>`).join("");
  historyEl.querySelectorAll(".historyItem").forEach(b=>b.onclick=()=>show(history[+b.dataset.i].src,history[+b.dataset.i].model,history[+b.dataset.i].ratio));
}
function show(src,model="",ratio=""){
  current=src;canvas.classList.remove("loading");canvas.innerHTML=`<img src="${src}" alt="CupzProject generated image">`;meta.textContent=`${model}${ratio?" • "+ratio:""}`;download.disabled=false;
}
async function check(){
  try{const r=await fetch("/api/status"),d=await r.json();status.className=d.configured?"status ok":"status bad";status.innerHTML=d.configured?"<i></i> Gemini connected":"<i></i> API key not configured"}catch{status.className="status bad";status.innerHTML="<i></i> Server offline"}
}
async function generate(){
  if(!promptEl.value.trim()){error.hidden=false;error.textContent="Tulis prompt terlebih dahulu.";return}
  error.hidden=true;btn.disabled=true;btn.textContent="Generating...";canvas.classList.add("loading");canvas.innerHTML="";meta.textContent="Gemini sedang membuat gambar...";
  try{
    const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:promptEl.value,model:modelEl.value,aspectRatio:ratioEl.value,negativePrompt:negativeEl.value})});
    const d=await r.json();if(!r.ok)throw new Error(d.error||"Generation failed");
    const src=`data:${d.image.mimeType};base64,${d.image.data}`;show(src,d.modelName,d.aspectRatio);
    history.unshift({src,model:d.modelName,ratio:d.aspectRatio,prompt:promptEl.value});history=history.slice(0,10);sessionStorage.setItem("cupz_history",JSON.stringify(history));renderHistory();
  }catch(e){canvas.classList.remove("loading");canvas.innerHTML='<div class="empty"><div class="emptyIcon">!</div><h3>Generation failed</h3><p>Periksa API key, model, quota, dan koneksi.</p></div>';error.hidden=false;error.textContent=e.message;meta.textContent="Gagal membuat gambar."}
  finally{btn.disabled=false;btn.textContent="✦  Generate image"}
}
btn.onclick=generate;promptEl.onkeydown=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")generate()};
download.onclick=()=>{if(!current)return;const a=document.createElement("a");a.href=current;a.download=`cupzproject-${Date.now()}.png`;a.click()};
$("clear").onclick=()=>{history=[];sessionStorage.removeItem("cupz_history");renderHistory()};
renderHistory();check();
