
// Ensure code runs after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  try {
/* App State (simplified) */
const state = {
  totalSeconds: 0, // across all genres
  genreHours: {},  // { genre: seconds }
  goalSeconds: 100 * 3600,
  currentBlob: null,
  currentBuffer: null,
  mediaRecorder: null,
  chunks: [],
  dark: false,
  markers: [
    {id:"LA:BG_opener_past", label:"Background opener (past)"},
    {id:"LA:CHAIN_medial", label:"Chain - medial"},
    {id:"LA:CHAIN_final", label:"Chain - final"},
    {id:"LA:QUOTE_OPEN_simple", label:"Quote open (simple)"},
    {id:"LA:QUOTE_CLOSE_simple", label:"Quote close (simple)"},
    {id:"LA:RESULT_summary", label:"Result summary"},
    {id:"LA:LIST_enumerator", label:"List enumerator"},
    {id:"LA:POET_parallel-A≈B", label:"Poetic parallel A≈B"}
  ],
  genres: {
    "Narrative (with dialogue)": ["Tell about a time a visitor came and brought surprising news.","Describe a journey when the weather changed suddenly.","Recall a dispute that was solved by a wise elder."],
    "Lament": ["Describe a loss the community remembers and how people expressed grief.","Tell how someone cries out to God when everything goes wrong."],
    "Hymn / Song": ["Sing/recite a short praise about creation or protection.","Describe a song people sing after a difficult time ends."],
    "Proverb / Wisdom": ["Share a saying about hard work vs. laziness.","Give a short advice about friendship or speaking wisely."],
    "Procedural / Instruction": ["Explain how to prepare for a ceremony step by step.","Tell how to settle a disagreement fairly."],
    "Law / Procedural Legal": ["Describe a rule people must follow and why it is important."],
    "List / Genealogy": ["List names in a family and mention one detail about each."],
    "Prayer / Blessing": ["Offer a blessing for a newborn or a traveler.","Pray for forgiveness after a wrongdoing."],
    "Blessing / Curse": ["Give an example of a blessing said to a respected leader.","Describe a warning or curse when a rule is broken."]
  }
};

/* DOM references */
const totalHoursEl = document.getElementById('totalHours');
const progressFill = document.getElementById('progressFill');
const genreList = document.getElementById('genreList');
const genreSelect = document.getElementById('genreSelect');
const promptSelect = document.getElementById('promptSelect');
const startWithPromptBtn = document.getElementById('startWithPromptBtn');

const recordBtn = document.getElementById('recordBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const stopBtn = document.getElementById('stopBtn');
const downloadClip = document.getElementById('downloadClip');
const audioTitle = document.getElementById('audioTitle');
const player = document.getElementById('player');
const waveform = document.getElementById('waveform');
const trimStart = document.getElementById('trimStart');
const trimEnd = document.getElementById('trimEnd');
const applyTrimBtn = document.getElementById('applyTrimBtn');
const playerSide = document.getElementById('playerSide');
const waveformSide = document.getElementById('waveformSide');

const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const expandAllBtn = document.getElementById('expandAllBtn');
const collapseAllBtn = document.getElementById('collapseAllBtn');

const markerSelect = document.getElementById('markerSelect');
const applyTagBtn = document.getElementById('applyTagBtn');
const transcriptEl = document.getElementById('transcript');
const notesEl = document.getElementById('notes');

const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const importJsonBtn = document.getElementById('importJsonBtn');

const qcBtn = document.getElementById('qcBtn');
const qcOutput = document.getElementById('qcOutput');

const newEntryBtn = document.getElementById('newEntryBtn');
const saveEntryBtn = document.getElementById('saveEntryBtn');
const clearFormBtn = document.getElementById('clearFormBtn');

const entryId = document.getElementById('entryId');
const languageName = document.getElementById('languageName');
const languageCode = document.getElementById('languageCode');
const dialect = document.getElementById('dialect');
const style = document.getElementById('style');
const dateField = document.getElementById('dateField');

/* Helpers */
function formatHMS(totalSec){
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600)/60);
  return `${hours}h ${String(minutes).padStart(2,'0')}m`;
}

function refreshClockAndProgress(){
  totalHoursEl.textContent = formatHMS(state.totalSeconds);
  const pct = Math.min(100, (state.totalSeconds / state.goalSeconds) * 100);
  progressFill.style.width = `${pct}%`;
}

function renderGenreList(){
  genreList.innerHTML = '';
  Object.entries(state.genres).forEach(([g, prompts])=>{
    if(!(g in state.genreHours)) state.genreHours[g] = 0;
    const li = document.createElement('li');
    li.className = 'genre-item';
    li.innerHTML = `<span>${g}</span><span class="hours">${formatHMS(state.genreHours[g])}</span>`;
    genreList.appendChild(li);
  });
}

function populateGenreAndPrompts(){
  // populate selects
  genreSelect.innerHTML = '';
  Object.keys(state.genres).forEach(g=>{
    const opt = document.createElement('option');
    opt.value = g; opt.textContent = g;
    genreSelect.appendChild(opt);
  });
  updatePromptSelect();
}

function updatePromptSelect(){
  const g = genreSelect.value;
  promptSelect.innerHTML = '';
  if(g && state.genres[g]){
    state.genres[g].forEach(p=>{
      const opt = document.createElement('option');
      opt.value = p; opt.textContent = p;
      promptSelect.appendChild(opt);
    });
  }
}

/* Sticky measurements: ensure the toolbar sits exactly below header */
function setStickyHeights(){
  const header = document.getElementById('app-header');
  const toolbar = document.getElementById('section-toolbar');
  const root = document.documentElement;
  root.style.setProperty('--header-height', header.offsetHeight + 'px');
  root.style.setProperty('--toolbar-height', toolbar.offsetHeight + 'px');
}
window.addEventListener('resize', ()=> setStickyHeights());
window.addEventListener('load', ()=> setStickyHeights());

/* Pane toggles */
document.querySelectorAll('.pane-head').forEach(btn=>{
  btn.addEventListener('click', e=>{
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !expanded);
    const chev = btn.querySelector('.chev');
    if(chev) chev.textContent = expanded ? '▸' : '▾';
    const body = btn.parentElement.querySelector('.pane-body');
    if(body) body.style.display = expanded ? 'none' : 'block';
    setStickyHeights();
  });
});

expandAllBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.pane-head').forEach(btn=>{
    btn.setAttribute('aria-expanded', true);
    const chev = btn.querySelector('.chev'); if(chev) chev.textContent = '▾';
    const body = btn.parentElement.querySelector('.pane-body');
    if(body) body.style.display = 'block';
  });
  setStickyHeights();
});
collapseAllBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.pane-head').forEach(btn=>{
    btn.setAttribute('aria-expanded', false);
    const chev = btn.querySelector('.chev'); if(chev) chev.textContent = '▸';
    const body = btn.parentElement.querySelector('.pane-body');
    if(body) body.style.display = 'none';
  });
  setStickyHeights();
});

/* Theme toggle */
themeToggle.addEventListener('click', ()=>{
  const html = document.documentElement;
  const dark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', dark ? 'light' : 'dark');
});

/* Ideas flow */
genreSelect.addEventListener('change', updatePromptSelect);
startWithPromptBtn.addEventListener('click', ()=>{
  // Jump to Audio Capture section
  document.querySelector('[data-pane="audio"] .pane-head').setAttribute('aria-expanded', true);
  document.querySelector('[data-pane="audio"] .pane-body').style.display = 'block';
  document.querySelector('[data-pane="audio"]').scrollIntoView({behavior:'smooth', block: 'start'});
});

/* Audio recording with waveform visualization */
let mediaStream = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let analyser, sourceNode, rafId;

function drawWaveform(canvas, dataArray){
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0,0,width,height);
  ctx.beginPath();
  const slice = width / dataArray.length;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#1461ff';
  let x = 0;
  for(let i=0;i<dataArray.length;i++){
    const v = dataArray[i] / 128.0;
    const y = (v * height/2);
    if(i===0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += slice;
  }
  ctx.stroke();
}

function startWaveLoop(){
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  function loop(){
    analyser.getByteTimeDomainData(dataArray);
    drawWaveform(waveform, dataArray);
    drawWaveform(waveformSide, dataArray);
    rafId = requestAnimationFrame(loop);
  }
  loop();
}

recordBtn.addEventListener('click', async ()=>{
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({audio:true});
    state.chunks = [];
    state.mediaRecorder = new MediaRecorder(mediaStream);
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);
    startWaveLoop();
    state.mediaRecorder.start();

    state.mediaRecorder.ondataavailable = (e)=> state.chunks.push(e.data);
    state.mediaRecorder.onstop = async ()=>{
      cancelAnimationFrame(rafId);
      if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); }
      const blob = new Blob(state.chunks, {type: 'audio/webm'});
      state.currentBlob = blob;
      const url = URL.createObjectURL(blob);
      player.src = url;
      playerSide.src = url;
      downloadClip.href = url;
      downloadClip.download = (audioTitle.value?.trim() || 'clip') + '.webm';
      downloadClip.setAttribute('aria-disabled','false');
      // Update genre hours (add player duration when known)
      player.onloadedmetadata = ()=>{
        const dur = Math.floor(player.duration || 0);
        const g = genreSelect.value || 'Uncategorized';
        state.genreHours[g] = (state.genreHours[g]||0) + dur;
        state.totalSeconds += dur;
        renderGenreList();
        refreshClockAndProgress();
      };
      // Buffers for trim
      const arrayBuf = await blob.arrayBuffer();
      state.currentBuffer = await audioCtx.decodeAudioData(arrayBuf);
      trimStart.value = "0";
      trimEnd.value = String(state.currentBuffer.duration.toFixed(1));
    };
  }catch(err){
    alert('Microphone access failed: ' + err.message);
  }
});

pauseBtn.addEventListener('click', ()=>{ try{ state.mediaRecorder?.pause(); }catch{} });
resumeBtn.addEventListener('click', ()=>{ try{ state.mediaRecorder?.resume(); }catch{} });
stopBtn.addEventListener('click', ()=>{ try{ state.mediaRecorder?.stop(); }catch{} });

applyTrimBtn.addEventListener('click', async ()=>{
  if(!state.currentBuffer) return;
  const start = Math.max(0, parseFloat(trimStart.value)||0);
  const end = Math.min(state.currentBuffer.duration, parseFloat(trimEnd.value)||state.currentBuffer.duration);
  if(end <= start){ alert('Trim end must be greater than start.'); return; }
  const length = Math.floor((end-start) * audioCtx.sampleRate);
  const out = audioCtx.createBuffer(state.currentBuffer.numberOfChannels, length, audioCtx.sampleRate);
  for(let ch=0; ch<out.numberOfChannels; ch++){
    const data = out.getChannelData(ch);
    state.currentBuffer.getChannelData(ch).subarray(Math.floor(start*audioCtx.sampleRate), Math.floor(end*audioCtx.sampleRate)).forEach((v,i)=> data[i]=v);
  }
  // Export trimmed buffer to WAV (simple)
  function bufferToWav(buff){
    const numOfChan = buff.numberOfChannels, length = buff.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    function setUint16(data, offset, v){ view.setUint16(offset, v, true); }
    function setUint32(data, offset, v){ view.setUint32(offset, v, true); }
    let offset = 0;
    // RIFF header
    setUint32(view, 0, 0x46464952); // "RIFF"
    setUint32(view, 4, 36 + buff.length * numOfChan * 2);
    setUint32(view, 8, 0x45564157); // "WAVE"
    // fmt chunk
    setUint32(view, 12, 0x20746d66); // "fmt "
    setUint32(view, 16, 16);
    setUint16(view, 20, 1);
    setUint16(view, 22, numOfChan);
    setUint32(view, 24, buff.sampleRate);
    setUint32(view, 28, buff.sampleRate * 2 * numOfChan);
    setUint16(view, 32, numOfChan * 2);
    setUint16(view, 34, 16);
    // data chunk
    setUint32(view, 36, 0x61746164); // "data"
    setUint32(view, 40, buff.length * numOfChan * 2);
    offset = 44;
    const interleaved = new Float32Array(buff.length * numOfChan);
    for(let i=0;i<buff.length;i++){
      for(let ch=0; ch<numOfChan; ch++){
        interleaved[i*numOfChan + ch] = buff.getChannelData(ch)[i];
      }
    }
    let idx = 0;
    for(let i=0; i<interleaved.length; i++, idx+=2){
      const s = Math.max(-1, Math.min(1, interleaved[i]));
      view.setInt16(offset + idx, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], {type: 'audio/wav'});
  }
  const wav = bufferToWav(out);
  const url = URL.createObjectURL(wav);
  player.src = url;
  playerSide.src = url;
  downloadClip.href = url;
  downloadClip.download = (audioTitle.value?.trim() || 'clip') + '_trim.wav';
});

/* Tagging: apply visible tag to selection */
applyTagBtn.addEventListener('click', ()=>{
  const tag = markerSelect.value;
  if(!tag){ alert('Choose a marker first.'); return; }
  const textarea = transcriptEl;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if(start === end){ alert('Select some text to tag.'); return; }
  const before = textarea.value.slice(0, start);
  const selected = textarea.value.slice(start, end);
  const after = textarea.value.slice(end);
  const tagged = `[${tag}]${selected}[/${tag}]`;
  textarea.value = before + tagged + after;
  textarea.focus();
  // place caret after inserted tag
  const caret = (before + tagged).length;
  textarea.setSelectionRange(caret, caret);
});

/* Export JSON and CSV */
exportJsonBtn.addEventListener('click', ()=>{
  const obj = {
    entryId: entryId.value.trim() || null,
    language: { name: languageName.value.trim(), code: languageCode.value.trim(), dialect: dialect.value.trim(), style: style.value.trim() },
    date: dateField.value || null,
    genre: genreSelect.value || null,
    prompt: promptSelect.value || null,
    transcript: transcriptEl.value,
    notes: notesEl.value,
    genresHours: state.genreHours,
    totalSeconds: state.totalSeconds
  };
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (obj.entryId || 'entry') + '.json';
  a.click();
});

exportCsvBtn.addEventListener('click', ()=>{
  // Parse transcript to CSV rows: ref#, sentence, tags, notes
  const lines = transcriptEl.value.split(/\n+/).filter(Boolean);
  const rows = [];
  let ref = 1;
  for(const line of lines){
    // Extract [TAG]...[/TAG] segments (nested not supported).
    const tagRegex = /\[([^\]]+)\](.+?)\[\/\1\]/g;
    const tags = [];
    let clean = line;
    let m;
    while((m = tagRegex.exec(line))){
      tags.push(m[1]);
    }
    clean = clean.replace(tagRegex, '$2');
    rows.push({ref: ref++, sentence: clean.trim(), tags: tags.join('|'), notes: notesEl.value.trim()});
  }
  // Build CSV
  let csv = 'ref,sentence,tags,notes\n';
  rows.forEach(r=>{
    const row = [r.ref, `"${r.sentence.replace(/"/g,'""')}"`, `"${r.tags}"`, `"${r.notes.replace(/"/g,'""')}"`].join(',');
    csv += row + '\n';
  });
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (entryId.value.trim() || 'transcript') + '.csv';
  a.click();
});

/* Import JSON */
importJsonBtn.addEventListener('click', ()=>{
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json';
  inp.onchange = e=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const obj = JSON.parse(reader.result);
        entryId.value = obj.entryId || '';
        languageName.value = obj.language?.name || '';
        languageCode.value = obj.language?.code || '';
        dialect.value = obj.language?.dialect || '';
        style.value = obj.language?.style || '';
        dateField.value = obj.date || '';
        transcriptEl.value = obj.transcript || '';
        notesEl.value = obj.notes || '';
        if(obj.genre && state.genres[obj.genre]){
          genreSelect.value = obj.genre; updatePromptSelect();
        }
        if(obj.prompt){
          const opt = Array.from(promptSelect.options).find(o=>o.value===obj.prompt);
          if(opt) promptSelect.value = obj.prompt;
        }
        state.genreHours = obj.genresHours || state.genreHours;
        state.totalSeconds = obj.totalSeconds || state.totalSeconds;
        renderGenreList();
        refreshClockAndProgress();
      }catch(err){
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };
  inp.click();
});

/* QC checks (simple demo) */
qcBtn.addEventListener('click', ()=>{
  const issues = [];
  if(!entryId.value.trim()) issues.push('• Entry ID is empty.');
  if(!languageName.value.trim()) issues.push('• Language name is empty.');
  if(!languageCode.value.trim()) issues.push('• Language code is empty.');
  if(!dateField.value) issues.push('• Date is missing.');
  if(!transcriptEl.value.trim()) issues.push('• Transcript is empty.');
  if(!markerSelect.value) issues.push('• No marker selected (ensure glossary loaded).');
  qcOutput.textContent = (issues.length? issues.join('\n') : '✓ All basic QC checks passed.');
});

/* Search (very simple filter that highlights matches) */
searchInput.addEventListener('input', ()=>{
  const q = searchInput.value.trim().toLowerCase();
  const text = transcriptEl.value;
  if(!q){
    transcriptEl.value = text; // unchanged
    return;
  }
  // No rich highlighting in textarea; a simple alert on not found
  if(!text.toLowerCase().includes(q)){
    // nothing
  }
});
clearSearchBtn.addEventListener('click', ()=>{
  searchInput.value = '';
});

/* New & Save & Clear (localStorage demo) */
newEntryBtn.addEventListener('click', ()=>{
  entryId.value = `LA-${Date.now()}`;
  transcriptEl.value = '';
  notesEl.value = '';
  audioTitle.value='';
  player.removeAttribute('src'); playerSide.removeAttribute('src');
  genreSelect.selectedIndex = 0; updatePromptSelect();
  qcOutput.textContent='';
  alert('New entry started.');
});
saveEntryBtn.addEventListener('click', ()=>{
  const obj = {
    entryId: entryId.value,
    language: { name: languageName.value, code: languageCode.value, dialect: dialect.value, style: style.value },
    date: dateField.value,
    transcript: transcriptEl.value, notes: notesEl.value,
    totalSeconds: state.totalSeconds, genreHours: state.genreHours
  };
  localStorage.setItem(`entry:${obj.entryId}`, JSON.stringify(obj));
  alert('Entry saved locally (browser storage).');
});
clearFormBtn.addEventListener('click', ()=>{
  if(confirm('Clear current form?')){
    document.querySelectorAll('input, textarea, select').forEach(el=>{
      if(el.type==='date') el.value='';
      else el.value='';
    });
    transcriptEl.value='';
    notesEl.value='';
  }
});

/* Populate marker glossary + select */
function renderGlossary(){
  const glossary = document.getElementById('glossaryList');
  glossary.innerHTML = '';
  markerSelect.innerHTML = '';
  state.markers.forEach(m=>{
    const li = document.createElement('li');
    li.textContent = `${m.id} — ${m.label}`;
    glossary.appendChild(li);
    const opt = document.createElement('option');
    opt.value = m.id; opt.textContent = `${m.id} — ${m.label}`;
    markerSelect.appendChild(opt);
  });
}

/* Init */
(function init(){
  renderGenreList();
  populateGenreAndPrompts();
  refreshClockAndProgress();
  renderGlossary();
  setStickyHeights();
})();
    console.log('Tripod app booted.');
  } catch (err) {
    console.error('Boot error:', err);
    alert('An error prevented the app from loading: ' + err.message);
  }
});
