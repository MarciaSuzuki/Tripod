// Language Archive Collector — Header minimal buttons, footer toolbar, org text
// Also retains: total clock + progress bar (100h goal), CSV export of sentences, ideas-first flow, waveform edit.

const MARKERS = [
  { id: "LA:BG_opener_past", label: "Background opener ( past )", description: "Conventional background/opening frame for past-time narration." },
  { id: "LA:CHAIN_medial", label: "Clause chaining – medial", description: "Medial link used to advance a narrative sequence." },
  { id: "LA:CHAIN_final", label: "Clause chaining – final", description: "Final chain marker closing a narrative sequence." },
  { id: "LA:QUOTE_OPEN_simple", label: "Quote opener – simple", description: "Default quotative open form for direct speech." },
  { id: "LA:QUOTE_CLOSE_simple", label: "Quote closer – simple", description: "Default quotative close form for direct speech." },
  { id: "LA:RESULT_summary", label: "Result / peak summary", description: "Resultative or peak-summarizing formula." },
  { id: "LA:LIST_enumerator", label: "List enumerator", description: "Item-listing connector or pattern." },
  { id: "LA:POET_parallel-A≈B", label: "Poetic parallelism A≈B", description: "Simple two-line parallelism." }
];

const PROFILES = [
  { id: "LA:PROFILE_NARR_casual_dialogue", label: "Narrative — casual + dialogue", markers: ["LA:BG_opener_past","LA:CHAIN_medial","LA:QUOTE_OPEN_simple"] },
  { id: "LA:PROFILE_LAMENT_formal", label: "Lament — formal", markers: ["LA:POET_parallel-A≈B","LA:RESULT_summary"] }
];

const GENRES = [
  "narrative","song/hymn","lament","proverb","procedural/instruction","law/procedural",
  "genealogy/list","prayer","blessing/curse","teaching/discourse","disputation"
];

const GENRE_PROMPTS = {
  "narrative":[
    "Tell about a time you were in danger and how it ended.",
    "Describe a journey where something unexpected happened.",
    "Share a story you heard from your grandparents that people like to repeat.",
    "A time a respected leader solved a conflict in the village."
  ],
  "song/hymn":[
    "Sing a short song used in celebrations.",
    "Hum a melody you know, then explain what the words usually say.",
    "Create a praise line followed by a response line (call-and-response)."
  ],
  "lament":[
    "Describe a time of loss or drought and how people spoke about it.",
    "How do elders express sadness when a tragedy happens? Give a sample line."
  ],
  "proverb":[
    "Say two or three proverbs used to advise the young.",
    "Give a proverb that warns against laziness and explain it."
  ],
  "procedural/instruction":[
    "Explain step by step how to prepare a traditional dish.",
    "Describe how to greet elders properly at a ceremony."
  ],
  "law/procedural":[
    "State three rules elders remind at community meetings.",
    "Describe the proper way to make and keep a promise."
  ],
  "genealogy/list":[
    "Recite a short lineage (three generations) the way it is normally said.",
    "List key items needed for planting season (with the usual order words)."
  ],
  "prayer":[
    "Say a short prayer for rain the way your people say it.",
    "Give a blessing for a child’s journey."
  ],
  "blessing/curse":[
    "Give a blessing an elder would say to a newly married couple.",
    "State a curse formula used when someone breaks a grave rule."
  ],
  "teaching/discourse":[
    "Explain why people should care for the poor, in the style of a talk.",
    "Give a short teaching about telling the truth, with an example."
  ],
  "disputation":[
    "Argue respectfully about a disputed land boundary—two short turns.",
    "How would someone challenge a false rumor at a public meeting?"
  ]
};

const byId = id => document.getElementById(id);

// --- Goal constants ---
const GOAL_HOURS = 100;
const GOAL_SEC = GOAL_HOURS * 3600;

// --- State ---
let db;
let mediaRecorder = null, recordingChunks = [], recTimerId = null, recStartTime = null, lastAudioBlob = null;
let audioCtx=null, audioBuf=null, zoom=1.0, selStart=0, selEnd=0, currentAudioDurationSec=0;
let currentIdea = { genre:"", prompt:"" };

// --- Utilities ---
function generateEntryId(){
  const d = new Date();
  const ymd = d.getFullYear().toString()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random()*10000).toString().padStart(4,'0');
  return `LA-${ymd}-${rnd}`;
}
function fmt(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60), h=Math.floor(m/60); return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
function toHMS(sec){ sec = Math.max(0, Math.floor(sec||0)); const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function clamp(v,min,max){ return Math.max(min, Math.min(max,v)); }
const safeKey = g => g.replace(/[^a-z0-9]+/gi,'_');

// --- Theme toggle ---
(function themeBoot(){
  const key="la_theme"; const root=document.documentElement;
  const saved=localStorage.getItem(key)||"dark";
  root.setAttribute("data-theme", saved);
  const btn = byId("btnTheme");
  if (btn) {
    btn.textContent = saved==="dark" ? "🌙" : "☀️";
    btn.addEventListener("click", ()=>{
      const cur = root.getAttribute("data-theme")==="dark" ? "light" : "dark";
      root.setAttribute("data-theme", cur);
      localStorage.setItem(key, cur);
      btn.textContent = cur==="dark" ? "🌙" : "☀️";
    });
  }
})();

// --- Accordion (allow both Sections 2 & 3 open together) ---
function wireAccordion(){
  const secs = Array.from(document.querySelectorAll('details.accordion'));
  const KEY = 'la_acc_open';
  const isDual = s => (s.dataset.key==="sec2" || s.dataset.key==="sec3");
  secs.forEach(s => {
    s.addEventListener('toggle', () => {
      if (s.open) {
        secs.forEach(x => {
          if (x===s) return;
          const bothDual = isDual(s) && isDual(x);
          if (bothDual) return; // allow 2 & 3 together
          if (!isDual(x)) x.open = false;
        });
        const openKeys = secs.filter(x=>x.open).map(x=>x.dataset.key);
        localStorage.setItem(KEY, JSON.stringify(openKeys));
        s.querySelector('summary')?.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
  const saved = localStorage.getItem(KEY);
  if (saved){
    try{
      const keys = JSON.parse(saved);
      secs.forEach(s => s.open = keys.includes(s.dataset.key));
      if (!secs.some(s=>s.open)) secs.find(s=>s.dataset.key==="sec1").open = true;
    }catch{}
  }
  byId('btnExpandAll').onclick = ()=> secs.forEach(s => s.open = true);
  byId('btnCollapseAll').onclick = ()=> { secs.forEach(s => s.open = false); secs[0].open = true; };
}

// --- Ideas & Themes UI ---
function renderIdeasList(){
  const host = byId("ideasList");
  host.innerHTML = "";
  GENRES.forEach(genre => {
    const key = safeKey(genre);
    const row = document.createElement("div");
    row.className = "idea-row";
    row.innerHTML = `
      <div class="genre">
        <div>${genre}</div>
        <div class="clock" id="clock_${key}">00:00:00</div>
      </div>
      <div class="controls">
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <select id="prompt_${key}" aria-label="Prompts for ${genre}">
            ${(GENRE_PROMPTS[genre]||[]).map(p=>`<option value="${p.replace(/"/g,'&quot;')}">${p}</option>`).join("")}
          </select>
          <input type="text" id="promptCustom_${key}" placeholder="Or type your own idea/prompt…" />
        </div>
      </div>
      <div class="actions">
        <button class="small" id="start_${key}">Start with this prompt</button>
      </div>
    `;
    host.appendChild(row);
    byId(`start_${key}`).addEventListener("click", ()=>{
      const sel = byId(`prompt_${key}`);
      const custom = byId(`promptCustom_${key}`).value.trim();
      const prompt = custom || (sel?.value||"");
      if (!prompt){ alert("Choose or type an idea/prompt first."); return; }
      currentIdea.genre = genre;
      currentIdea.prompt = prompt;
      byId("currentIdeaGenre").textContent = genre;
      byId("currentIdeaPrompt").textContent = prompt;
      const gsel = byId("genre"); if (gsel) gsel.value = genre;
      const s2 = document.querySelector('details[data-key="sec2"]');
      const s3 = document.querySelector('details[data-key="sec3"]');
      if (s2) s2.open = true; if (s3) s3.open = true;
      s2?.querySelector('summary')?.scrollIntoView({behavior:'smooth', block:'start'});
      const openKeys = Array.from(document.querySelectorAll('details.accordion')).filter(x=>x.open).map(x=>x.dataset.key);
      localStorage.setItem('la_acc_open', JSON.stringify(openKeys));
    });
  });
}

// Compute total recorded time per genre and update header progress
async function recalcGenreClocks(){
  const totals = {}; GENRES.forEach(g=>totals[g]=0);
  const entries = await listEntries();
  const decodeTasks = [];
  entries.forEach(e=>{
    if (!e.genre) return;
    const dur = e.audio?.durationSec;
    if (dur && dur>0){ totals[e.genre] += dur; }
    else {
      decodeTasks.push((async()=>{
        try{
          const {audio} = await getEntry(e.entryId);
          if (audio){
            const ac = ensureAudioCtx();
            const buf = await ac.decodeAudioData(await audio.arrayBuffer());
            const d = buf.duration||0;
            totals[e.genre] += d;
            // persist duration if possible
            e.audio = e.audio || {}; e.audio.durationSec = d;
            try{ await saveEntry(e,null); }catch{}
          }
        }catch{}
      })());
    }
  });
  await Promise.allSettled(decodeTasks);

  // Update per-genre clocks and total
  let totalSec = 0;
  GENRES.forEach(g=>{
    const el = byId(`clock_${safeKey(g)}`);
    totalSec += totals[g];
    if (el) el.textContent = toHMS(totals[g]);
  });
  updateGoalProgress(totalSec);
}

function updateGoalProgress(totalSec){
  const totalClock = byId("totalClock");
  const bar = byId("progressBar");
  const wrap = document.querySelector(".progress-wrap");
  if (totalClock) totalClock.textContent = toHMS(totalSec);
  if (bar) bar.style.width = Math.min(100, (totalSec/GOAL_SEC)*100).toFixed(1)+"%";
  if (wrap) wrap.setAttribute("aria-valuenow", String(Math.floor(totalSec)));
}

// --- Glossary ---
function renderGlossary(filter=""){
  const list = byId("glossaryList");
  const f = filter.trim().toLowerCase();
  const items = MARKERS.filter(m => m.id.toLowerCase().includes(f)||m.label.toLowerCase().includes(f)||m.description.toLowerCase().includes(f));
  list.innerHTML = items.map(m=>`
    <div class="glossary-item">
      <h4>${m.id}</h4>
      <div><em>${m.label}</em></div>
      <p>${m.description}</p>
      <button data-insert="${m.id}" class="small">Use this marker</button>
    </div>
  `).join("");
  list.querySelectorAll("button[data-insert]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      byId("markerSelect").value = btn.getAttribute("data-insert");
      tagSelection();
    });
  });
}

// --- Populate dropdowns ---
function populateUI(){
  byId("createdAt").value = new Date().toISOString();
  if (!byId("entryId").value) byId("entryId").value = generateEntryId();
  const ms = byId("markerSelect");
  ms.innerHTML = '<option value="">— Select marker —</option>' +
    MARKERS.map(m => `<option value="${m.id}">${m.id} — ${m.label}</option>`).join("");
  const ps = byId("profileSelect");
  ps.innerHTML = '<option value="">— Select profile —</option>' +
    PROFILES.map(p => `<option value="${p.id}">${p.id} — ${p.label}</option>`).join("");
  byId("glossarySearch").addEventListener("input", e => renderGlossary(e.target.value));
  renderGlossary();
  renderIdeasList();
}

// --- Model & Storage (IndexedDB) ---
function blankEntry(){
  return {
    entryId:"", createdAt:new Date().toISOString(),
    idea:{genre:"", prompt:""},
    language:{name:"",code:"",dialect:""},
    genre:"", register:"", style:"",
    performance:{setting:"",audience:"",participation:"",socialConstraints:""},
    speaker:{name:"",profile:""}, collector:"", consent:"",
    transcriptHtml:"", transcriptText:"", markersUsed:[], profileApplied:"",
    audio:{hasAudio:false, mimeType:"", size:0, durationSec:0}, version:1
  };
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open("LACollectorDB",1);
    req.onupgradeneeded = ()=>{
      db = req.result;
      if (!db.objectStoreNames.contains("entries")) db.createObjectStore("entries",{keyPath:"entryId"});
      if (!db.objectStoreNames.contains("audio")) db.createObjectStore("audio");
    };
    req.onsuccess = ()=>{ db = req.result; resolve(db); };
    req.onerror = ()=>reject(req.error);
  });
}
function saveEntry(entry, blob){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(["entries","audio"],"readwrite");
    tx.objectStore("entries").put(entry);
    if (blob) tx.objectStore("audio").put(blob, entry.entryId);
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
  });
}
function getEntry(id){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(["entries","audio"],"readonly");
    const r1 = tx.objectStore("entries").get(id);
    const r2 = tx.objectStore("audio").get(id);
    const out = {};
    r1.onsuccess=()=>{out.entry=r1.result||null};
    r2.onsuccess=()=>{out.audio=r2.result||null};
    tx.oncomplete=()=>resolve(out);
    tx.onerror=()=>reject(tx.error);
  });
}
function listEntries(){
  return new Promise((resolve,reject)=>{
    const tx = db.transaction("entries","readonly");
    const req = tx.objectStore("entries").openCursor();
    const rows=[];
    req.onsuccess = e=>{ const c=e.target.result; if(c){ rows.push(c.value); c.continue(); } else resolve(rows); };
    req.onerror = ()=>reject(req.error);
  });
}
function searchEntries(q){
  const f = q.trim().toLowerCase();
  return listEntries().then(rows => !f ? rows : rows.filter(r =>
    (r.entryId||"").toLowerCase().includes(f) ||
    (r.language.name||"").toLowerCase().includes(f) ||
    (r.language.code||"").toLowerCase().includes(f) ||
    (r.language.dialect||"").toLowerCase().includes(f) ||
    (r.speaker.name||"").toLowerCase().includes(f) ||
    (r.collector||"").toLowerCase().includes(f) ||
    (r.genre||"").toLowerCase().includes(f) ||
    (r.register||"").toLowerCase().includes(f) ||
    (r.style||"").toLowerCase().includes(f) ||
    (r.transcriptText||"").toLowerCase().includes(f)
  ));
}

// --- Read/Write UI ---
function readEntryFromUI(){
  const tr = byId("transcript");
  const markers = new Set(); tr.querySelectorAll("mark[data-marker]").forEach(m=>markers.add(m.getAttribute("data-marker")));
  return {
    entryId: byId("entryId").value.trim() || generateEntryId(),
    createdAt: byId("createdAt").value.trim() || new Date().toISOString(),
    idea: { genre: currentIdea.genre||"", prompt: currentIdea.prompt||"" },
    language: { name: byId("langName").value.trim(), code: byId("langCode").value.trim(), dialect: byId("langDialect").value.trim() },
    genre: byId("genre").value, register: byId("register").value, style: byId("style").value,
    performance: { setting: byId("setting").value, audience: byId("audience").value, participation: byId("participation").value, socialConstraints: byId("socialConstraints").value.trim() },
    speaker: { name: byId("speakerName").value.trim(), profile: byId("speakerProfile").value.trim() },
    collector: byId("collector").value.trim(),
    consent: byId("consent").value,
    transcriptHtml: tr.innerHTML, transcriptText: tr.innerText,
    markersUsed: Array.from(markers),
    profileApplied: byId("profileSelect").value,
    audio: { hasAudio: !!lastAudioBlob, mimeType: lastAudioBlob?.type||"", size: lastAudioBlob?.size||0, durationSec: currentAudioDurationSec||0 },
    version: 1
  };
}
function writeEntryToUI(e){
  currentIdea.genre = e.idea?.genre||"";
  currentIdea.prompt = e.idea?.prompt||"";
  byId("currentIdeaGenre").textContent = currentIdea.genre||"—";
  byId("currentIdeaPrompt").textContent = currentIdea.prompt||"—";

  byId("entryId").value = e.entryId||"";
  byId("createdAt").value = e.createdAt||new Date().toISOString();
  byId("langName").value = e.language?.name||"";
  byId("langCode").value = e.language?.code||"";
  byId("langDialect").value = e.language?.dialect||"";
  byId("genre").value = e.genre||"";
  byId("register").value = e.register||"";
  byId("style").value = e.style||"";
  byId("setting").value = e.performance?.setting||"";
  byId("audience").value = e.performance?.audience||"";
  byId("participation").value = e.performance?.participation||"";
  byId("socialConstraints").value = e.performance?.socialConstraints||"";
  byId("speakerName").value = e.speaker?.name||"";
  byId("speakerProfile").value = e.speaker?.profile||"";
  byId("collector").value = e.collector||"";
  byId("consent").value = e.consent||"";
  byId("transcript").innerHTML = e.transcriptHtml||"";
  byId("profileSelect").value = e.profileApplied||"";
  currentAudioDurationSec = e.audio?.durationSec||0;
  if (e.audio?.hasAudio){
    getEntry(e.entryId).then(async ({audio})=>{ if(audio){ lastAudioBlob=audio; byId("audioPlayer").src=URL.createObjectURL(audio); byId("btnAttachAudio").disabled=false; await renderWaveformFromBlob(lastAudioBlob); } });
  } else {
    lastAudioBlob=null; byId("audioPlayer").removeAttribute("src"); clearWaveform();
  }
}

// --- QC ---
function runQC(){
  const e = readEntryFromUI(); const out=[];
  const add=(name,pass,hint="")=>out.push({name,pass,hint});
  add("Entry ID present", !!e.entryId, "Click Generate ID.");
  add("Language name/code/dialect present", !!(e.language.name&&e.language.code&&e.language.dialect), "Fill language fields.");
  add("Genre selected", !!e.genre, "Choose a Genre.");
  add("Register selected", !!e.register, "Choose a Register.");
  add("Style selected", !!e.style, "Choose a Style.");
  add("Consent selected", !!e.consent, "Choose a Consent level.");
  add("Transcript or audio present", !!(e.transcriptText.trim().length||e.audio.hasAudio), "Add some transcript or record/upload audio.");
  const validMarker = id => MARKERS.some(m=>m.id===id);
  const bad = e.markersUsed.filter(id=>!validMarker(id));
  add("Markers are from glossary", bad.length===0, bad.length?("Unknown: "+bad.join(", ")):"OK");
  if (e.profileApplied){
    const p = PROFILES.find(x=>x.id===e.profileApplied);
    const missing = p ? p.markers.filter(m=>!e.markersUsed.includes(m)) : ["(unknown profile)"];
    add("Profile markers present", missing.length===0, missing.length?("Missing: "+missing.join(", ")):"OK");
  }
  const panel = byId("qcPanel");
  panel.innerHTML = out.map(r=>`<div class="qc-item"><div>${r.name}</div><div class="${r.pass?'qc-pass':'qc-fail'}">${r.pass?'PASS':'FAIL'}</div></div>${r.pass?'':`<div class="qc-fail" style="margin-bottom:6px">${r.hint}</div>`}`).join("");
  const qcSection = document.querySelector('details[data-key="sec7"]');
  if (qcSection){ qcSection.open = true; qcSection.querySelector('summary')?.scrollIntoView({behavior:'smooth'}); }
  return out;
}

// --- Tagging ---
function tagSelection(){
  const markerId = byId("markerSelect").value;
  if(!markerId){ alert("Choose a marker first."); return; }
  const sel = window.getSelection();
  if(!sel || sel.rangeCount===0){ alert("Select text in the transcript."); return; }
  const range = sel.getRangeAt(0);
  let node = range.commonAncestorContainer; while(node && node.nodeType===3) node=node.parentNode;
  if(!node || !byId("transcript").contains(node)){ alert("Select inside the transcript area."); return; }
  const mark = document.createElement("mark");
  mark.setAttribute("data-marker", markerId);
  mark.appendChild(range.extractContents());
  range.insertNode(mark);
  sel.removeAllRanges();
}
byId("btnAddMarker").addEventListener("click", tagSelection);
byId("btnClearMarkers").addEventListener("click", ()=>{
  const tr = byId("transcript");
  tr.querySelectorAll("mark[data-marker]").forEach(m=>{ const p=m.parentNode; while(m.firstChild) p.insertBefore(m.firstChild,m); p.removeChild(m); });
});

// --- Profiles ---
byId("btnApplyProfile").addEventListener("click", ()=>{
  const id = byId("profileSelect").value; if(!id){ alert("Choose a profile."); return; }
  const p = PROFILES.find(x=>x.id===id); if(!p) return;
  const tr = byId("transcript"); const noteId = `profile-note-${safeKey(id)}`;
  if(!tr.querySelector(`#${noteId}`)){
    const note = document.createElement("div");
    note.id = noteId; note.style.fontSize="12px"; note.style.color="var(--muted)"; note.style.marginTop="8px";
    note.textContent = `[Profile applied: ${p.id} → ${p.markers.join(", ")}]`;
    tr.appendChild(note);
  }
});

// --- Audio Recording/Upload & Player ---
function updateTimer(){ if(!recStartTime){ byId("recTimer").textContent="00:00:00"; return; } const elapsed=Date.now()-recStartTime; byId("recTimer").textContent = fmt(elapsed); }
byId("btnStartRec").addEventListener("click", async ()=>{
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recordingChunks=[];
    mediaRecorder = new MediaRecorder(stream,{mimeType:"audio/webm"});
    mediaRecorder.ondataavailable = e => { if(e.data && e.data.size>0) recordingChunks.push(e.data); };
    mediaRecorder.onstop = async ()=>{
      lastAudioBlob = new Blob(recordingChunks,{type:"audio/webm"});
      byId("audioPlayer").src = URL.createObjectURL(lastAudioBlob);
      byId("btnAttachAudio").disabled=false;
      await renderWaveformFromBlob(lastAudioBlob);
    };
    mediaRecorder.start(); recStartTime=Date.now(); if(recTimerId) clearInterval(recTimerId); recTimerId=setInterval(updateTimer,500);
    byId("btnStartRec").disabled=true; byId("btnPauseRec").disabled=false; byId("btnStopRec").disabled=false;
  }catch(err){ alert("Mic access failed. Use Upload audio. "+err); }
});
byId("btnPauseRec").addEventListener("click", ()=>{ if(mediaRecorder?.state==="recording"){ mediaRecorder.pause(); clearInterval(recTimerId); byId("btnPauseRec").disabled=true; byId("btnResumeRec").disabled=false; }});
byId("btnResumeRec").addEventListener("click", ()=>{ if(mediaRecorder?.state==="paused"){ mediaRecorder.resume(); recStartTime=Date.now(); recTimerId=setInterval(updateTimer,500); byId("btnPauseRec").disabled=false; byId("btnResumeRec").disabled=true; }});
byId("btnStopRec").addEventListener("click", ()=>{ if(mediaRecorder){ mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); clearInterval(recTimerId); recTimerId=null; byId("btnStartRec").disabled=false; byId("btnPauseRec").disabled=true; byId("btnResumeRec").disabled=true; byId("btnStopRec").disabled=true; byId("recTimer").textContent="00:00:00"; }});
byId("audioUpload").addEventListener("change", async e=>{ const f=e.target.files?.[0]; if(!f) return; lastAudioBlob = new Blob([await f.arrayBuffer()],{type:f.type||"audio/*"}); byId("audioPlayer").src = URL.createObjectURL(lastAudioBlob); byId("btnAttachAudio").disabled=false; await renderWaveformFromBlob(lastAudioBlob); });
byId("btnAttachAudio").addEventListener("click", ()=>{ if(!lastAudioBlob){ alert("No audio to attach."); return; } alert("Audio attached to this entry. Save to persist."); });
byId("playbackRate").addEventListener("input", e=>{ const r=parseFloat(e.target.value); const ap=byId("audioPlayer"); ap.playbackRate=r; byId("playbackRateVal").textContent = r.toFixed(2)+"×"; });

// --- Waveform & Trim ---
function ensureAudioCtx(){
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function clearWaveform(){
  audioBuf=null; selStart=0; selEnd=0; zoom=1.0; currentAudioDurationSec=0;
  byId("audDur").textContent="0.000";
  byId("selStart").textContent="0.000"; byId("selEnd").textContent="0.000"; byId("zoomVal").textContent="1.0";
  const c = byId("waveCanvas"); const g=c.getContext("2d"); g.clearRect(0,0,c.width,c.height);
}
async function renderWaveformFromBlob(blob){
  try{
    const ac = ensureAudioCtx();
    const ab = await blob.arrayBuffer();
    const buf = await ac.decodeAudioData(ab.slice(0));
    audioBuf = buf; currentAudioDurationSec = buf.duration||0;
    byId("audDur").textContent = (audioBuf.duration||0).toFixed(3);
    drawWaveform();
  }catch(err){
    console.warn("Waveform decode failed:", err);
    clearWaveform();
    alert("Waveform not available for this audio type in your browser. You can still play and attach it.");
  }
}
function drawWaveform(){
  const c = byId("waveCanvas"); const g = c.getContext("2d");
  g.clearRect(0,0,c.width,c.height);
  if(!audioBuf){ return; }
  const ch = audioBuf.getChannelData(0);
  const dur = audioBuf.duration;
  const pxPerSecBase = c.width / dur;
  const pxPerSec = pxPerSecBase * zoom;
  byId("zoomVal").textContent = zoom.toFixed(1);
  const samplesPerPx = audioBuf.sampleRate / pxPerSec;
  const mid = c.height/2;
  g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#9ec1ff';
  g.lineWidth = 1;
  g.beginPath();
  for (let x=0; x<c.width; x++){
    const idx = Math.floor(x * samplesPerPx);
    const y = mid + (ch[idx]||0) * (mid-4);
    if (x===0) g.moveTo(x,y); else g.lineTo(x,y);
  }
  g.stroke();
  // Selection shading
  if (selEnd > selStart){
    const x1 = selStart * pxPerSec;
    const x2 = selEnd * pxPerSec;
    g.fillStyle = 'rgba(100,150,255,0.15)';
    g.fillRect(Math.min(x1,x2), 0, Math.abs(x2-x1), c.height);
    g.fillStyle = 'rgba(100,150,255,0.35)';
    g.fillRect(Math.min(x1,x2), 0, 2, c.height);
    g.fillRect(Math.max(x1,x2)-2, 0, 2, c.height);
  }
}
function xToTime(x){
  const c = byId("waveCanvas");
  const dur = audioBuf?audioBuf.duration:0;
  const pxPerSecBase = c.width / Math.max(dur,0.0001);
  const pxPerSec = pxPerSecBase * zoom;
  return clamp(x/pxPerSec, 0, dur);
}
(function wireWaveCanvas(){
  const c = byId("waveCanvas");
  let dragging=false, startX=0;
  c.addEventListener("mousedown", e=>{ if(!audioBuf) return; dragging=true; startX=e.offsetX; selStart=xToTime(startX); selEnd=selStart; drawWaveform(); updateSelLabels(); });
  c.addEventListener("mousemove", e=>{ if(!audioBuf||!dragging) return; selEnd=xToTime(e.offsetX); drawWaveform(); updateSelLabels(); });
  window.addEventListener("mouseup", ()=>{ dragging=false; });
})();
function updateSelLabels(){
  byId("selStart").textContent = (Math.min(selStart,selEnd)).toFixed(3);
  byId("selEnd").textContent   = (Math.max(selStart,selEnd)).toFixed(3);
}
byId("btnShowWave").addEventListener("click", ()=>{ if(lastAudioBlob) renderWaveformFromBlob(lastAudioBlob); else alert("Record or upload audio first."); });
byId("btnZoomIn").addEventListener("click", ()=>{ zoom = clamp(zoom+0.5, 1, 8); drawWaveform(); });
byId("btnZoomOut").addEventListener("click", ()=>{ zoom = clamp(zoom-0.5, 1, 8); drawWaveform(); });
byId("btnClearSel").addEventListener("click", ()=>{ selStart=0; selEnd=0; updateSelLabels(); drawWaveform(); });

// Trim: replace current audio with selection (WAV)
async function trimToSelection(returnBlob=false){
  if(!audioBuf){ alert("No waveform loaded."); return null; }
  const start = Math.min(selStart, selEnd), end = Math.max(selStart, selEnd);
  if (end<=start){ alert("Make a selection on the waveform first."); return null; }
  const sr = audioBuf.sampleRate, chs = audioBuf.numberOfChannels;
  const startIdx = Math.floor(start*sr), endIdx = Math.floor(end*sr);
  const frames = endIdx - startIdx;
  const out = ensureAudioCtx().createBuffer(chs, frames, sr);
  for (let ch=0; ch<chs; ch++){
    const src = audioBuf.getChannelData(ch);
    const dst = out.getChannelData(ch);
    for (let i=0; i<frames; i++){ dst[i] = src[startIdx+i] || 0; }
  }
  const wavBlob = audioBufferToWavBlob(out);
  if (!returnBlob){
    lastAudioBlob = wavBlob;
    byId("audioPlayer").src = URL.createObjectURL(wavBlob);
    await renderWaveformFromBlob(wavBlob);
    byId("btnAttachAudio").disabled=false;
    alert("Trim applied. Remember to Save Entry.");
  }
  return wavBlob;
}
byId("btnTrimApply").addEventListener("click", ()=>{ trimToSelection(false); });
byId("btnDownloadSel").addEventListener("click", async ()=>{
  const b = await trimToSelection(true);
  if(!b) return;
  const url = URL.createObjectURL(b); const a = document.createElement("a");
  a.href=url; a.download="selection.wav"; a.click(); URL.revokeObjectURL(url);
});

// WAV encode (16-bit PCM)
function audioBufferToWavBlob(buffer){
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const length = buffer.length * numChannels * 2;
  const headerSize = 44;
  const totalSize = headerSize + length;
  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample/8, true);
  view.setUint16(32, numChannels * bitsPerSample/8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);
  let offset = 44;
  const chData = [];
  for (let ch=0; ch<numChannels; ch++) chData.push(buffer.getChannelData(ch));
  for (let i=0; i<buffer.length; i++){
    for (let ch=0; ch<numChannels; ch++){
      let s = Math.max(-1, Math.min(1, chData[ch][i]));
      view.setInt16(offset, s<0 ? s*0x8000 : s*0x7FFF, true);
      offset += 2;
    }
  }
  return new Blob([view], {type:'audio/wav'});
}
function writeString(view, offset, string){
  for (let i=0; i<string.length; i++) view.setUint8(offset+i, string.charCodeAt(i));
}

// --- Toolbar & Search ---
byId("btnGenId").addEventListener("click", ()=> byId("entryId").value = generateEntryId());
byId("btnNewEntry").addEventListener("click", ()=>{ const e=blankEntry(); e.entryId=generateEntryId(); byId("createdAt").value=e.createdAt; writeEntryToUI(e); });
byId("btnSaveEntry").addEventListener("click", async ()=>{
  const e=readEntryFromUI();
  try{
    await saveEntry(e,lastAudioBlob);
    alert("Entry saved locally.");
    recalcGenreClocks(); // update per-genre and total progress
  }catch(err){ alert("Save failed: "+err); }
});
const btnRunQC = byId("btnRunQC"); if (btnRunQC) btnRunQC.addEventListener("click", runQC);

const btnExportJSON = byId("btnExportJSON"); if (btnExportJSON) btnExportJSON.addEventListener("click", async ()=>{
  const e = readEntryFromUI();
  const pkg = { entry: e };
  if(lastAudioBlob && lastAudioBlob.size < 20*1024*1024){
    const ab = await lastAudioBlob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
    pkg.audio = { base64: b64, mimeType: lastAudioBlob.type || "audio/wav" };
  }
  const blob = new Blob([JSON.stringify(pkg,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`${e.entryId||"entry"}.json`; a.click(); URL.revokeObjectURL(url);
});

const btnExportCSV = byId("btnExportCSV"); if (btnExportCSV) btnExportCSV.addEventListener("click", ()=>{
  const csv = buildTranscriptCSV();
  if (!csv){ alert("Nothing to export. Add a transcript first."); return; }
  const id = (byId("entryId").value||"entry").trim() || "entry";
  const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${id}_transcript.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

function buildTranscriptCSV(){
  const root = byId("transcript");
  const { text, marks } = extractTextAndMarkOffsets(root);
  const sentences = segmentSentences(text);
  if (!sentences.length) return null;
  // assign tags to sentences by overlap
  for (const m of marks){
    for (const s of sentences){
      if (m.start < s.end && m.end > s.start){
        s.tags.add(m.marker);
      }
    }
  }
  const header = ["ref","sentence","tags","notes"];
  const rows = [header];
  sentences.forEach((s, i)=>{
    const tags = Array.from(s.tags).join(" | ");
    rows.push([String(i+1), s.text, tags, ""]);
  });
  return rows.map(r=>r.map(csvCell).join(",")).join("\r\n");
}

function csvCell(v){
  const s = (v==null?"":String(v));
  if (/[",\r\n]/.test(s)){
    return '"' + s.replace(/"/g,'""') + '"';
  }
  return s;
}

function extractTextAndMarkOffsets(root){
  let text = "";
  const marks = [];
  function walk(node){
    if (node.nodeType === Node.TEXT_NODE){
      text += node.nodeValue;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    // ignore profile applied notes
    if (node.id && node.id.startsWith("profile-note-")) return;
    const tn = node.tagName;
    if (tn === "BR"){
      text += "\n";
      return;
    }
    if (tn === "MARK" && node.hasAttribute("data-marker")){
      const start = text.length;
      node.childNodes.forEach(walk);
      const end = text.length;
      marks.push({start, end, marker: node.getAttribute("data-marker")});
      return;
    }
    node.childNodes.forEach(walk);
    if (tn === "DIV" || tn === "P"){ text += "\n"; }
  }
  walk(root);
  return { text, marks };
}

function segmentSentences(text){
  const sents = [];
  const re = /[^.!?…\n]+(?:[.!?…]+|$)/g;
  let m;
  while ((m = re.exec(text)) !== null){
    const raw = m[0].trim();
    if (!raw) continue;
    sents.push({ start: m.index, end: m.index + m[0].length, text: raw, tags: new Set() });
  }
  return sents;
}

// Import / Clear / Search
const importFile = byId("importFile");
if (importFile) importFile.addEventListener("change", async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  try{
    const pkg = JSON.parse(await f.text()); const entry = pkg.entry || pkg;
    writeEntryToUI(entry);
    if(pkg.audio?.base64){
      const b=atob(pkg.audio.base64); const bytes=new Uint8Array(b.length); for(let i=0;i<b.length;i++) bytes[i]=b.charCodeAt(i);
      lastAudioBlob = new Blob([bytes],{type:pkg.audio.mimeType||"audio/webm"}); byId("audioPlayer").src=URL.createObjectURL(lastAudioBlob); byId("btnAttachAudio").disabled=false; await renderWaveformFromBlob(lastAudioBlob);
    } else { lastAudioBlob=null; byId("audioPlayer").removeAttribute("src"); clearWaveform(); }
    alert("Entry imported; click Save Entry to persist locally.");
    recalcGenreClocks();
  }catch(err){ alert("Import failed: "+err); }
});
const btnClear = byId("btnClearForm"); if (btnClear) btnClear.addEventListener("click", ()=>{ if(confirm("Clear the form? Unsaved changes will be lost.")){ writeEntryToUI(blankEntry()); clearWaveform(); }});

byId("btnSearch").addEventListener("click", async ()=>{
  const q = byId("searchInput").value;
  const rows = await searchEntries(q);
  const out = rows.map(r=>`
    <div class="glossary-item">
      <h4>${r.entryId}</h4>
      <div>${r.language.name} [${r.language.code}] — ${r.language.dialect}</div>
      <div>Genre: ${r.genre||"–"} | Register: ${r.register||"–"} | Style: ${r.style||"–"}</div>
      <div>Speaker: ${r.speaker?.name||"–"} | Collector: ${r.collector||"–"}</div>
      <button class="small" data-load="${r.entryId}">Load</button>
    </div>
  `).join("");
  byId("searchResults").innerHTML = out || "<div class='muted'>No matches.</div>";
  byId("searchResults").querySelectorAll("button[data-load]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-load");
      const {entry,audio} = await getEntry(id);
      if(entry){ writeEntryToUI(entry); if(audio){ lastAudioBlob=audio; byId("audioPlayer").src=URL.createObjectURL(audio); byId("btnAttachAudio").disabled=false; await renderWaveformFromBlob(lastAudioBlob); } }
      const sec1 = document.querySelector('details[data-key="sec1"]'); if (sec1){ sec1.open = true; sec1.querySelector('summary')?.scrollIntoView({behavior:'smooth'}); }
    });
  });
});

// --- Boot ---
(async function boot(){
  await openDB();
  populateUI();
  wireAccordion();
  recalcGenreClocks();
})();