// Language Archive Collector — MVP
// Storage: IndexedDB
// Audio: MediaRecorder (webm) or manual upload
// Tagging: wrap selection with <mark data-marker="ID">
// QC: lightweight checks

// ---------- Glossary & Profiles (from Tripod LA spec) ----------
const MARKERS = [
  { id: "LA:BG_opener_past", label: "Background opener (past)", description: "Conventional background/opening frame for past-time narration." },
  { id: "LA:CHAIN_medial", label: "Clause chaining – medial", description: "Medial link used to advance a narrative sequence." },
  { id: "LA:CHAIN_final", label: "Clause chaining – final", description: "Final chain marker closing a narrative sequence." },
  { id: "LA:QUOTE_OPEN_simple", label: "Quote opener – simple", description: "Default quotative open form for direct speech." },
  { id: "LA:QUOTE_CLOSE_simple", label: "Quote closer – simple", description: "Default quotative close form for direct speech." },
  { id: "LA:RESULT_summary", label: "Result / peak summary", description: "Resultative or peak-summarizing formula at or just after the high point." },
  { id: "LA:LIST_enumerator", label: "List enumerator", description: "Item-listing connector or pattern." },
  { id: "LA:POET_parallel-A≈B", label: "Poetic parallelism A≈B", description: "Simple two-line parallelism pattern." }
];

const PROFILES = [
  { id: "LA:PROFILE_NARR_casual_dialogue", label: "Narrative — casual + dialogue", markers: ["LA:BG_opener_past","LA:CHAIN_medial","LA:QUOTE_OPEN_simple"] },
  { id: "LA:PROFILE_LAMENT_formal", label: "Lament — formal", markers: ["LA:POET_parallel-A≈B","LA:RESULT_summary"] }
];

// ---------- DOM helpers ----------
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const byId = id => document.getElementById(id);

// ---------- Initialize dropdowns & glossary ----------
function populateDropdowns() {
  const markerSel = byId("markerSelect");
  markerSel.innerHTML = '<option value="">— Select marker —</option>' +
    MARKERS.map(m => `<option value="${m.id}">${m.id} — ${m.label}</option>`).join("");

  const profileSel = byId("profileSelect");
  profileSel.innerHTML = '<option value="">— Select profile —</option>' +
    PROFILES.map(p => `<option value="${p.id}">${p.id} — ${p.label}</option>`).join("");

  // Glossary
  renderGlossary();
}

function renderGlossary(filter="") {
  const list = byId("glossaryList");
  const f = filter.trim().toLowerCase();
  const items = MARKERS.filter(m => m.id.toLowerCase().includes(f) || m.label.toLowerCase().includes(f) || m.description.toLowerCase().includes(f));
  list.innerHTML = items.map(m => `
    <div class="glossary-item">
      <h4>${m.id}</h4>
      <div><em>${m.label}</em></div>
      <p>${m.description}</p>
      <button data-insert="${m.id}" class="small">Use this marker</button>
    </div>
  `).join("");
  list.querySelectorAll("button[data-insert]").forEach(btn => {
    btn.addEventListener("click", () => {
      byId("markerSelect").value = btn.getAttribute("data-insert");
      tagSelection();
    });
  });
}

byId("glossarySearch").addEventListener("input", e => renderGlossary(e.target.value));

// ---------- Entry model ----------
function blankEntry() {
  return {
    entryId: "",
    createdAt: new Date().toISOString(),
    language: {
      name: "",
      code: "",
      dialect: ""
    },
    genre: "",
    register: "",
    style: "",
    performance: {
      setting: "",
      audience: "",
      participation: "",
      socialConstraints: ""
    },
    speaker: {
      name: "",
      profile: ""
    },
    collector: "",
    consent: "",
    transcriptHtml: "",
    transcriptText: "",
    markersUsed: [],
    profileApplied: "",
    audio: {
      hasAudio: false,
      mimeType: "",
      size: 0  // bytes
    },
    version: 1
  };
}

// ---------- IndexedDB wrapper ----------
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("LACollectorDB", 1);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      db = req.result;
      if (!db.objectStoreNames.contains("entries")) {
        db.createObjectStore("entries", { keyPath: "entryId" });
      }
      if (!db.objectStoreNames.contains("audio")) {
        db.createObjectStore("audio"); // key = entryId, value = Blob
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
  });
}

function saveEntry(entry, audioBlob=null) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["entries","audio"], "readwrite");
    tx.objectStore("entries").put(entry);
    if (audioBlob) {
      tx.objectStore("audio").put(audioBlob, entry.entryId);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

function getEntry(entryId) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["entries","audio"], "readonly");
    const req1 = tx.objectStore("entries").get(entryId);
    const req2 = tx.objectStore("audio").get(entryId);
    const result = {};
    req1.onsuccess = () => { result.entry = req1.result || null; };
    req2.onsuccess = () => { result.audio = req2.result || null; };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
  });
}

function listEntries() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("entries", "readonly");
    const store = tx.objectStore("entries");
    const req = store.openCursor();
    const out = [];
    req.onsuccess = e => {
      const cur = e.target.result;
      if (cur) {
        out.push(cur.value);
        cur.continue();
      } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

function searchEntries(q) {
  const query = q.trim().toLowerCase();
  if (!query) return listEntries();
  return listEntries().then(rows => rows.filter(r => {
    return (
      (r.entryId || "").toLowerCase().includes(query) ||
      (r.language.name || "").toLowerCase().includes(query) ||
      (r.language.code || "").toLowerCase().includes(query) ||
      (r.language.dialect || "").toLowerCase().includes(query) ||
      (r.speaker.name || "").toLowerCase().includes(query) ||
      (r.collector || "").toLowerCase().includes(query) ||
      (r.genre || "").toLowerCase().includes(query) ||
      (r.register || "").toLowerCase().includes(query) ||
      (r.style || "").toLowerCase().includes(query) ||
      (r.transcriptText || "").toLowerCase().includes(query)
    );
  }));
}

// ---------- UI <-> Entry data bindings ----------
function readEntryFromUI() {
  const e = blankEntry();
  e.entryId = byId("entryId").value.trim();
  e.createdAt = byId("createdAt").value.trim();
  e.language.name = byId("langName").value.trim();
  e.language.code = byId("langCode").value.trim();
  e.language.dialect = byId("langDialect").value.trim();
  e.genre = byId("genre").value;
  e.register = byId("register").value;
  e.style = byId("style").value;
  e.performance.setting = byId("setting").value;
  e.performance.audience = byId("audience").value;
  e.performance.participation = byId("participation").value;
  e.performance.socialConstraints = byId("socialConstraints").value.trim();
  e.speaker.name = byId("speakerName").value.trim();
  e.speaker.profile = byId("speakerProfile").value.trim();
  e.collector = byId("collector").value.trim();
  e.consent = byId("consent").value;
  e.transcriptHtml = byId("transcript").innerHTML;
  e.transcriptText = byId("transcript").innerText;
  // markersUsed: collect unique markers in transcript
  const markers = new Set();
  byId("transcript").querySelectorAll("mark[data-marker]").forEach(m => markers.add(m.getAttribute("data-marker")));
  e.markersUsed = Array.from(markers);
  e.profileApplied = byId("profileSelect").value;
  // audio metadata kept in global lastAudioBlob if attached
  if (lastAudioBlob) {
    e.audio.hasAudio = true;
    e.audio.mimeType = lastAudioBlob.type || "audio/webm";
    e.audio.size = lastAudioBlob.size || 0;
  } else {
    e.audio.hasAudio = false;
    e.audio.mimeType = "";
    e.audio.size = 0;
  }
  return e;
}

function writeEntryToUI(e) {
  byId("entryId").value = e.entryId || "";
  byId("createdAt").value = e.createdAt || new Date().toISOString();
  byId("langName").value = e.language?.name || "";
  byId("langCode").value = e.language?.code || "";
  byId("langDialect").value = e.language?.dialect || "";
  byId("genre").value = e.genre || "";
  byId("register").value = e.register || "";
  byId("style").value = e.style || "";
  byId("setting").value = e.performance?.setting || "";
  byId("audience").value = e.performance?.audience || "";
  byId("participation").value = e.performance?.participation || "";
  byId("socialConstraints").value = e.performance?.socialConstraints || "";
  byId("speakerName").value = e.speaker?.name || "";
  byId("speakerProfile").value = e.speaker?.profile || "";
  byId("collector").value = e.collector || "";
  byId("consent").value = e.consent || "";
  byId("transcript").innerHTML = e.transcriptHtml || "";
  byId("profileSelect").value = e.profileApplied || "";

  // Audio
  if (e.audio?.hasAudio) {
    // Load blob from DB for playback
    getEntry(e.entryId).then(({audio}) => {
      if (audio) {
        lastAudioBlob = audio;
        const url = URL.createObjectURL(audio);
        byId("audioPlayer").src = url;
        byId("btnAttachAudio").disabled = false;
      }
    });
  } else {
    lastAudioBlob = null;
    byId("audioPlayer").removeAttribute("src");
  }
}

// ---------- Entry ID generation ----------
function generateEntryId() {
  // LA-YYYYMMDD-XXXX random
  const d = new Date();
  const ymd = d.getFullYear().toString() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const rnd = Math.floor(Math.random()*10000).toString().padStart(4,'0');
  return `LA-${ymd}-${rnd}`;
}

// ---------- QC checks ----------
function runQC() {
  const e = readEntryFromUI();
  const results = [];

  function add(name, passed, hint="") {
    results.push({name, passed, hint});
  }

  add("Entry ID present", !!e.entryId, "Click 'Generate ID' if empty.");
  add("Language name/code/dialect present", !!(e.language.name && e.language.code && e.language.dialect),
      "Fill Language Name, ISO 639‑3 code and Dialect.");
  add("Genre selected", !!e.genre, "Choose a Genre.");
  add("Register selected", !!e.register, "Choose a Register.");
  add("Style selected", !!e.style, "Choose a Style.");
  add("Consent level selected", !!e.consent, "Choose a consent level consistent with contributor wishes.");
  add("Has transcript or audio", !!(e.transcriptText.trim().length || e.audio.hasAudio),
      "Record or upload audio and/or include a transcript.");
  // Marker sanity
  const validMarker = (id)=> MARKERS.some(m => m.id === id);
  const badMarkers = e.markersUsed.filter(id => !validMarker(id));
  add("Markers (if any) are from glossary", badMarkers.length === 0, badMarkers.length ? `Unknown IDs: ${badMarkers.join(", ")}` : "OK");

  // Profile sanity
  if (e.profileApplied) {
    const prof = PROFILES.find(p => p.id === e.profileApplied);
    const missing = prof ? prof.markers.filter(m => !e.markersUsed.includes(m)) : [];
    add("Profile markers present (if profile selected)", missing.length === 0, missing.length ? `Missing: ${missing.join(", ")}` : "OK");
  }

  // Render QC panel
  const panel = byId("qcPanel");
  panel.innerHTML = results.map(r => `
    <div class="qc-item">
      <div>${r.name}</div>
      <div class="${r.passed ? 'qc-pass' : 'qc-fail'}">${r.passed ? "PASS" : "FAIL"}</div>
    </div>
    ${r.passed ? "" : `<div class="qc-hint qc-fail" style="margin-bottom:6px">${r.hint}</div>`}
  `).join("");

  return results;
}

// ---------- Tagging ----------
function tagSelection() {
  const markerId = byId("markerSelect").value;
  if (!markerId) { alert("Choose a marker first."); return; }
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) { alert("Select text in the transcript to tag."); return; }
  const range = sel.getRangeAt(0);
  // ensure selection is within #transcript
  let container = range.commonAncestorContainer;
  while (container && container.nodeType === 3) container = container.parentNode;
  if (!container || !byId("transcript").contains(container)) {
    alert("Please select text inside the Transcript area."); return;
  }
  const mark = document.createElement("mark");
  mark.setAttribute("data-marker", markerId);
  mark.appendChild(range.extractContents());
  range.insertNode(mark);
  // normalize selection
  sel.removeAllRanges();
}

byId("btnAddMarker").addEventListener("click", tagSelection);
byId("btnClearMarkers").addEventListener("click", () => {
  byId("transcript").querySelectorAll("mark[data-marker]").forEach(m => {
    const parent = m.parentNode;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
  });
});

// Apply profile: no-op if no selection; we just ensure markers exist in doc by appending a note box listing applied markers (not altering text)
byId("btnApplyProfile").addEventListener("click", () => {
  const profId = byId("profileSelect").value;
  if (!profId) { alert("Choose a profile."); return; }
  const prof = PROFILES.find(p => p.id === profId);
  if (!prof) return;
  // Create a non-intrusive note at the end if not present
  const tr = byId("transcript");
  const noteId = `profile-note-${profId}`;
  if (!tr.querySelector(`#${noteId}`)) {
    const note = document.createElement("div");
    note.id = noteId;
    note.style.fontSize = "12px";
    note.style.color = "#9aa9c5";
    note.style.marginTop = "8px";
    note.textContent = `[Profile applied: ${prof.id} → ${prof.markers.join(", ")}]`;
    tr.appendChild(note);
  }
});

// ---------- Audio Recording ----------
let mediaRecorder = null;
let recordingChunks = [];
let recTimerId = null;
let recStartTime = null;
let lastAudioBlob = null;

function updateTimer() {
  if (!recStartTime) { byId("recTimer").textContent = "00:00"; return; }
  const elapsed = Math.floor((Date.now() - recStartTime)/1000);
  const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
  const ss = String(elapsed%60).padStart(2,'0');
  byId("recTimer").textContent = `${mm}:${ss}`;
}

byId("btnStartRec").addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordingChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordingChunks, { type: "audio/webm" });
      lastAudioBlob = blob;
      const url = URL.createObjectURL(blob);
      byId("audioPlayer").src = url;
      byId("btnAttachAudio").disabled = false;
    };
    mediaRecorder.start();
    recStartTime = Date.now();
    recTimerId = setInterval(updateTimer, 500);
    byId("btnStartRec").disabled = true;
    byId("btnPauseRec").disabled = false;
    byId("btnStopRec").disabled = false;
  } catch (err) {
    alert("Could not start recording. Use 'Upload audio' instead. " + err);
  }
});

byId("btnPauseRec").addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.pause();
    clearInterval(recTimerId);
    byId("btnPauseRec").disabled = true;
    byId("btnResumeRec").disabled = false;
  }
});

byId("btnResumeRec").addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "paused") {
    mediaRecorder.resume();
    recStartTime = Date.now();
    recTimerId = setInterval(updateTimer, 500);
    byId("btnPauseRec").disabled = false;
    byId("btnResumeRec").disabled = true;
  }
});

byId("btnStopRec").addEventListener("click", () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    clearInterval(recTimerId);
    recTimerId = null;
    byId("btnStartRec").disabled = false;
    byId("btnPauseRec").disabled = true;
    byId("btnResumeRec").disabled = true;
    byId("btnStopRec").disabled = true;
    byId("recTimer").textContent = "00:00";
  }
});

byId("audioUpload").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const buf = await file.arrayBuffer();
  lastAudioBlob = new Blob([buf], { type: file.type || "audio/*" });
  const url = URL.createObjectURL(lastAudioBlob);
  byId("audioPlayer").src = url;
  byId("btnAttachAudio").disabled = false;
});

byId("btnAttachAudio").addEventListener("click", () => {
  if (!lastAudioBlob) {
    alert("No audio to attach. Record or upload first.");
    return;
  }
  alert("Audio is attached to this entry. Remember to Save Entry to persist it.");
});

// ---------- Toolbar actions ----------
byId("btnGenId").addEventListener("click", () => {
  byId("entryId").value = generateEntryId();
});

byId("btnNewEntry").addEventListener("click", () => {
  const e = blankEntry();
  e.entryId = generateEntryId();
  writeEntryToUI(e);
});

byId("btnSaveEntry").addEventListener("click", async () => {
  const entry = readEntryFromUI();
  if (!entry.entryId) { entry.entryId = generateEntryId(); byId("entryId").value = entry.entryId; }
  try {
    await saveEntry(entry, lastAudioBlob);
    alert("Entry saved locally.");
  } catch (err) {
    alert("Failed to save entry: " + err);
  }
});

byId("btnRunQC").addEventListener("click", runQC);

byId("btnExportJSON").addEventListener("click", async () => {
  const e = readEntryFromUI();
  const data = { entry: e };
  // include audio as base64 if small (< 20MB)
  if (lastAudioBlob && lastAudioBlob.size < 20*1024*1024) {
    const ab = await lastAudioBlob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
    data.audio = { base64: b64, mimeType: lastAudioBlob.type };
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${e.entryId || "entry"}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

byId("importFile").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const pkg = JSON.parse(text);
    const eobj = pkg.entry || pkg;
    writeEntryToUI(eobj);
    if (pkg.audio?.base64) {
      const bstr = atob(pkg.audio.base64);
      const bytes = new Uint8Array(bstr.length);
      for (let i=0;i<bstr.length;i++) bytes[i] = bstr.charCodeAt(i);
      lastAudioBlob = new Blob([bytes], { type: pkg.audio.mimeType || "audio/webm" });
      const url = URL.createObjectURL(lastAudioBlob);
      byId("audioPlayer").src = url;
      byId("btnAttachAudio").disabled = false;
    } else {
      lastAudioBlob = null;
      byId("audioPlayer").removeAttribute("src");
    }
    alert("Entry imported into the form. Click Save to persist locally.");
  } catch (err) {
    alert("Import failed: " + err);
  }
});

byId("btnClearForm").addEventListener("click", () => {
  if (!confirm("Clear the form? Unsaved changes will be lost.")) return;
  writeEntryToUI(blankEntry());
});

// ---------- Search ----------
byId("btnSearch").addEventListener("click", async () => {
  const q = byId("searchInput").value;
  const rows = await searchEntries(q);
  const out = rows.map(r => `
    <div class="glossary-item">
      <h4>${r.entryId}</h4>
      <div>${r.language.name} [${r.language.code}] — ${r.language.dialect}</div>
      <div>Genre: ${r.genre || "–"} | Register: ${r.register || "–"} | Style: ${r.style || "–"}</div>
      <div>Speaker: ${r.speaker?.name || "–"} | Collector: ${r.collector || "–"}</div>
      <button class="small" data-load="${r.entryId}">Load</button>
    </div>
  `).join("");
  byId("searchResults").innerHTML = out || "<div class='muted'>No matches.</div>";
  byId("searchResults").querySelectorAll("button[data-load]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-load");
      const {entry, audio} = await getEntry(id);
      if (entry) {
        writeEntryToUI(entry);
        if (audio) {
          lastAudioBlob = audio;
          byId("audioPlayer").src = URL.createObjectURL(audio);
          byId("btnAttachAudio").disabled = false;
        } else {
          lastAudioBlob = null;
          byId("audioPlayer").removeAttribute("src");
        }
      }
      window.scrollTo({top:0, behavior:"smooth"});
    });
  });
});

// ---------- App boot ----------
(async function boot() {
  await openDB();
  populateDropdowns();
  const e = blankEntry();
  e.entryId = generateEntryId();
  byId("createdAt").value = e.createdAt;
  byId("entryId").value = e.entryId;
  // Ensure dropdowns are interactive (basic smoke test: value read/write)
  ["genre","register","style","setting","audience","participation","consent"].forEach(id => {
    const el = byId(id);
    el.addEventListener("change", () => {});
  });
})();
