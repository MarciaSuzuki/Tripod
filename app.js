// Language Archive Collector — Accordion MVP (complete)
// - Sections as <details> accordions with mutual exclusivity
// - Expand all / Collapse all
// - Remembers last open section
// - All features retained: audio record/upload, tagging with visible marker IDs, profiles, QC, search, local save

// --- Constants ---
const MARKERS = [
  { id: "LA:BG_opener_past", label: "Background opener (past)", description: "Conventional background/opening frame for past-time narration." },
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

const byId = id => document.getElementById(id);

// --- State ---
let db;
let mediaRecorder = null, recordingChunks = [], recTimerId = null, recStartTime = null, lastAudioBlob = null;

// --- Utilities ---
function generateEntryId(){
  const d = new Date();
  const ymd = d.getFullYear().toString()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random()*10000).toString().padStart(4,'0');
  return `LA-${ymd}-${rnd}`;
}
function fmt(ms){ const s=Math.floor(ms/1000), m=Math.floor(s/60); return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }

// --- Accordion wiring ---
function wireAccordion(){
  const secs = Array.from(document.querySelectorAll('details.accordion'));
  const KEY = 'la_acc_open';
  secs.forEach(s => {
    s.addEventListener('toggle', () => {
      if (s.open) {
        secs.filter(x=>x!==s).forEach(x => x.open = false);
        localStorage.setItem(KEY, s.dataset.key || '');
        s.querySelector('summary')?.scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
  const last = localStorage.getItem(KEY);
  if (last){
    const hit = secs.find(s => s.dataset.key === last);
    if (hit) { hit.open = true; secs.filter(x=>x!==hit).forEach(x => x.open = false); }
  }
  byId('btnExpandAll').onclick = ()=> secs.forEach(s => s.open = true);
  byId('btnCollapseAll').onclick = ()=> { secs.forEach(s => s.open = false); secs[0].open = true; };
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
  // markers
  const ms = byId("markerSelect");
  ms.innerHTML = '<option value="">— Select marker —</option>' +
    MARKERS.map(m => `<option value="${m.id}">${m.id} — ${m.label}</option>`).join("");
  // profiles
  const ps = byId("profileSelect");
  ps.innerHTML = '<option value="">— Select profile —</option>' +
    PROFILES.map(p => `<option value="${p.id}">${p.id} — ${p.label}</option>`).join("");
  // glossary
  byId("glossarySearch").addEventListener("input", e => renderGlossary(e.target.value));
  renderGlossary();
}

// --- Model & Storage (IndexedDB) ---
function blankEntry(){
  return {
    entryId:"", createdAt:new Date().toISOString(),
    language:{name:"",code:"",dialect:""},
    genre:"", register:"", style:"",
    performance:{setting:"",audience:"",participation:"",socialConstraints:""},
    speaker:{name:"",profile:""}, collector:"", consent:"",
    transcriptHtml:"", transcriptText:"", markersUsed:[], profileApplied:"",
    audio:{hasAudio:false, mimeType:"", size:0}, version:1
  };
}
function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open("LACollectorDB",1);
    req.onupgradeneeded = ()=>{
      db = req.result;
      db.createObjectStore("entries",{keyPath:"entryId"});
      db.createObjectStore("audio");
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
    language: { name: byId("langName").value.trim(), code: byId("langCode").value.trim(), dialect: byId("langDialect").value.trim() },
    genre: byId("genre").value, register: byId("register").value, style: byId("style").value,
    performance: { setting: byId("setting").value, audience: byId("audience").value, participation: byId("participation").value, socialConstraints: byId("socialConstraints").value.trim() },
    speaker: { name: byId("speakerName").value.trim(), profile: byId("speakerProfile").value.trim() },
    collector: byId("collector").value.trim(),
    consent: byId("consent").value,
    transcriptHtml: tr.innerHTML, transcriptText: tr.innerText,
    markersUsed: Array.from(markers),
    profileApplied: byId("profileSelect").value,
    audio: { hasAudio: !!lastAudioBlob, mimeType: lastAudioBlob?.type||"", size: lastAudioBlob?.size||0 },
    version: 1
  };
}
function writeEntryToUI(e){
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
  if (e.audio?.hasAudio){
    getEntry(e.entryId).then(({audio})=>{ if(audio){ lastAudioBlob=audio; byId("audioPlayer").src=URL.createObjectURL(audio); byId("btnAttachAudio").disabled=false; } });
  } else {
    lastAudioBlob=null; byId("audioPlayer").removeAttribute("src");
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
  // bring QC section into view & open it
  const qcSection = document.querySelector('details[data-key="sec6"]');
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
  const tr = byId("transcript"); const noteId = `profile-note-${id}`;
  if(!tr.querySelector(`#${noteId}`)){
    const note = document.createElement("div");
    note.id = noteId; note.style.fontSize="12px"; note.style.color="#9aa9c5"; note.style.marginTop="8px";
    note.textContent = `[Profile applied: ${p.id} → ${p.markers.join(", ")}]`;
    tr.appendChild(note);
  }
});

// --- Audio ---
function updateTimer(){ if(!recStartTime){ byId("recTimer").textContent="00:00"; return; } const elapsed=Date.now()-recStartTime; byId("recTimer").textContent = fmt(elapsed); }
byId("btnStartRec").addEventListener("click", async ()=>{
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    recordingChunks=[];
    mediaRecorder = new MediaRecorder(stream,{mimeType:"audio/webm"});
    mediaRecorder.ondataavailable = e => { if(e.data && e.data.size>0) recordingChunks.push(e.data); };
    mediaRecorder.onstop = ()=>{ lastAudioBlob = new Blob(recordingChunks,{type:"audio/webm"}); byId("audioPlayer").src = URL.createObjectURL(lastAudioBlob); byId("btnAttachAudio").disabled=false; };
    mediaRecorder.start(); recStartTime=Date.now(); if(recTimerId) clearInterval(recTimerId); recTimerId=setInterval(updateTimer,500);
    byId("btnStartRec").disabled=true; byId("btnPauseRec").disabled=false; byId("btnStopRec").disabled=false;
  }catch(err){ alert("Mic access failed. Use Upload audio. "+err); }
});
byId("btnPauseRec").addEventListener("click", ()=>{ if(mediaRecorder?.state==="recording"){ mediaRecorder.pause(); clearInterval(recTimerId); byId("btnPauseRec").disabled=true; byId("btnResumeRec").disabled=false; }});
byId("btnResumeRec").addEventListener("click", ()=>{ if(mediaRecorder?.state==="paused"){ mediaRecorder.resume(); recStartTime=Date.now(); recTimerId=setInterval(updateTimer,500); byId("btnPauseRec").disabled=false; byId("btnResumeRec").disabled=true; }});
byId("btnStopRec").addEventListener("click", ()=>{ if(mediaRecorder){ mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(t=>t.stop()); clearInterval(recTimerId); recTimerId=null; byId("btnStartRec").disabled=false; byId("btnPauseRec").disabled=true; byId("btnResumeRec").disabled=true; byId("btnStopRec").disabled=true; byId("recTimer").textContent="00:00"; }});
byId("audioUpload").addEventListener("change", async e=>{ const f=e.target.files?.[0]; if(!f) return; lastAudioBlob = new Blob([await f.arrayBuffer()],{type:f.type||"audio/*"}); byId("audioPlayer").src = URL.createObjectURL(lastAudioBlob); byId("btnAttachAudio").disabled=false; });
byId("btnAttachAudio").addEventListener("click", ()=>{ if(!lastAudioBlob){ alert("No audio to attach."); return; } alert("Audio attached to this entry. Save to persist."); });

// --- Toolbar & Search ---
byId("btnGenId").addEventListener("click", ()=> byId("entryId").value = generateEntryId());
byId("btnNewEntry").addEventListener("click", ()=>{ const e=blankEntry(); e.entryId=generateEntryId(); byId("createdAt").value=e.createdAt; writeEntryToUI(e); });
byId("btnSaveEntry").addEventListener("click", async ()=>{ const e=readEntryFromUI(); try{ await saveEntry(e,lastAudioBlob); alert("Entry saved locally."); }catch(err){ alert("Save failed: "+err); }});
byId("btnRunQC").addEventListener("click", runQC);
byId("btnExportJSON").addEventListener("click", async ()=>{
  const e = readEntryFromUI();
  const pkg = { entry: e };
  if(lastAudioBlob && lastAudioBlob.size < 20*1024*1024){
    const ab = await lastAudioBlob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
    pkg.audio = { base64: b64, mimeType: lastAudioBlob.type };
  }
  const blob = new Blob([JSON.stringify(pkg,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`${e.entryId||"entry"}.json`; a.click(); URL.revokeObjectURL(url);
});
byId("importFile").addEventListener("change", async e=>{
  const f=e.target.files?.[0]; if(!f) return;
  try{
    const pkg = JSON.parse(await f.text()); const entry = pkg.entry || pkg;
    writeEntryToUI(entry);
    if(pkg.audio?.base64){ const b=atob(pkg.audio.base64); const bytes=new Uint8Array(b.length); for(let i=0;i<b.length;i++) bytes[i]=b.charCodeAt(i); lastAudioBlob = new Blob([bytes],{type:pkg.audio.mimeType||"audio/webm"}); byId("audioPlayer").src=URL.createObjectURL(lastAudioBlob); byId("btnAttachAudio").disabled=false; } else { lastAudioBlob=null; byId("audioPlayer").removeAttribute("src"); }
    alert("Entry imported; click Save Entry to persist locally.");
  }catch(err){ alert("Import failed: "+err); }
});
byId("btnClearForm").addEventListener("click", ()=>{ if(confirm("Clear the form? Unsaved changes will be lost.")){ writeEntryToUI(blankEntry()); }});

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
      if(entry){ writeEntryToUI(entry); if(audio){ lastAudioBlob=audio; byId("audioPlayer").src=URL.createObjectURL(audio); byId("btnAttachAudio").disabled=false; } }
      // open section 1 by default after loading
      const sec1 = document.querySelector('details[data-key="sec1"]'); if (sec1){ sec1.open = true; sec1.querySelector('summary')?.scrollIntoView({behavior:'smooth'}); }
    });
  });
});

// --- Boot ---
(async function boot(){
  await openDB();
  populateUI();
  wireAccordion();
})();