
// ---------- Minimal state ----------
const state = {
  totalSeconds: 0,
  genreHours: {},
  goalSeconds: 100*3600,
  currentBuffer: null,
};

// ---------- DOM refs ----------
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
const recStatus = document.getElementById('recStatus');
const uploadBtn = document.getElementById('uploadBtn');
const uploadAudio = document.getElementById('uploadAudio');

const player = document.getElementById('player');
const playerSide = document.getElementById('playerSide');
const waveform = document.getElementById('waveform');
const waveformSide = document.getElementById('waveformSide');
const trimStart = document.getElementById('trimStart');
const trimEnd = document.getElementById('trimEnd');
const applyTrimBtn = document.getElementById('applyTrimBtn');

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

// ---------- Helpers ----------
function formatHMS(totalSec){
  const h = Math.floor(totalSec/3600);
  const m = Math.floor((totalSec%3600)/60);
  return `${h}h ${String(m).padStart(2,'0')}m`;
}
function refreshClockAndProgress(){
  totalHoursEl.textContent = formatHMS(state.totalSeconds);
  const pct = Math.min(100, (state.totalSeconds/state.goalSeconds)*100);
  progressFill.style.width = pct + '%';
}
function renderGenreList(){
  genreList.innerHTML='';
  Object.entries(state.genreHours).forEach(([g, sec])=>{
    const li = document.createElement('li');
    li.className='genre-item';
    li.innerHTML = `<span>${g}</span><span class="hours">${formatHMS(sec)}</span>`;
    genreList.appendChild(li);
  });
}

// ---------- Genre & Prompts ----------
const GENRES = {
  "Narrative (with dialogue)": [
    "Tell about a time a visitor came and brought surprising news.",
    "Describe a journey when the weather changed suddenly.",
    "Recall a dispute that was solved by a wise elder."
  ],
  "Lament": [
    "Describe a loss the community remembers and how people expressed grief.",
    "Tell how someone cries out to God when everything goes wrong."
  ],
  "Hymn / Song": [
    "Sing/recite a short praise about creation or protection.",
    "Describe a song people sing after a difficult time ends."
  ],
  "Proverb / Wisdom": [
    "Share a saying about hard work vs. laziness.",
    "Give a short advice about friendship or speaking wisely."
  ],
  "Procedural / Instruction":[
    "Explain how to prepare for a ceremony step by step.",
    "Tell how to settle a disagreement fairly."
  ],
  "Law / Procedural Legal":[
    "Describe a rule people must follow and why it is important."
  ],
  "List / Genealogy":[
    "List names in a family and mention one detail about each."
  ],
  "Prayer / Blessing":[
    "Offer a blessing for a newborn or a traveler.",
    "Pray for forgiveness after a wrongdoing."
  ],
  "Blessing / Curse":[
    "Give an example of a blessing said to a respected leader.",
    "Describe a warning or curse when a rule is broken."
  ]
};
function populateGenreAndPrompts(){
  genreSelect.innerHTML='';
  Object.keys(GENRES).forEach(g=>{
    const opt=document.createElement('option');
    opt.value=g; opt.textContent=g;
    genreSelect.appendChild(opt);
    if(!(g in state.genreHours)) state.genreHours[g]=0;
  });
  updatePromptSelect();
  renderGenreList(); refreshClockAndProgress();
}
function updatePromptSelect(){
  const g = genreSelect.value || Object.keys(GENRES)[0];
  promptSelect.innerHTML='';
  GENRES[g].forEach(p=>{
    const opt=document.createElement('option');
    opt.value=p; opt.textContent=p; promptSelect.appendChild(opt);
  });
}
genreSelect.addEventListener('change', updatePromptSelect);

// ---------- Sticky sizes ----------
function setStickyHeights(){
  const header = document.getElementById('app-header');
  const toolbar = document.getElementById('section-toolbar');
  const root = document.documentElement;
  root.style.setProperty('--header-height', header.offsetHeight + 'px');
  root.style.setProperty('--toolbar-height', toolbar.offsetHeight + 'px');
}
window.addEventListener('resize', setStickyHeights);
window.addEventListener('load', setStickyHeights);

// ---------- Accordion logic (allow transcript + audioSide together) ----------
const allowTogether = new Set(['transcript','audioSide']);
document.querySelectorAll('.pane-head').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const pane = btn.closest('.pane');
    const key = pane.dataset.pane;
    const expanded = btn.getAttribute('aria-expanded')==='true';
    // If opening a non-special pane, close others (except transcript & audioSide)
    if(!expanded && !allowTogether.has(key)){
      document.querySelectorAll('.pane').forEach(p=>{
        const k = p.dataset.pane;
        if(p===pane) return;
        if(allowTogether.has(k)) return; // leave special panes alone
        const h = p.querySelector('.pane-head');
        const b = p.querySelector('.pane-body');
        const c = p.querySelector('.chev');
        h.setAttribute('aria-expanded','false');
        if(b) b.style.display='none';
        if(c) c.textContent='▸';
      });
    }
    // Toggle current
    btn.setAttribute('aria-expanded', String(!expanded));
    const body = pane.querySelector('.pane-body');
    if(body) body.style.display = expanded ? 'none':'block';
    const chev = btn.querySelector('.chev');
    if(chev) chev.textContent = expanded ? '▸':'▾';
    setStickyHeights();
  });
});
expandAllBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.pane').forEach(p=>{
    p.querySelector('.pane-head')?.setAttribute('aria-expanded','true');
    const b = p.querySelector('.pane-body'); if(b) b.style.display='block';
    const c = p.querySelector('.chev'); if(c) c.textContent='▾';
  });
  setStickyHeights();
});
collapseAllBtn.addEventListener('click', ()=>{
  document.querySelectorAll('.pane').forEach(p=>{
    p.querySelector('.pane-head')?.setAttribute('aria-expanded','false');
    const b = p.querySelector('.pane-body'); if(b) b.style.display='none';
    const c = p.querySelector('.chev'); if(c) c.textContent='▸';
  });
  setStickyHeights();
});

// Jump to Audio Capture
startWithPromptBtn.addEventListener('click', ()=>{
  const pane = document.querySelector('[data-pane="audio"]');
  const head = pane?.querySelector('.pane-head');
  if(head && head.getAttribute('aria-expanded')!=='true'){ head.click(); }
  pane?.scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(()=> recordBtn?.focus({preventScroll:true}), 400);
});

// ---------- Audio capture (MediaRecorder + visual) ----------
let mediaStream = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let analyser, sourceNode, rafId, mediaRecorder, chunks=[];
let recStartMs=0, recPausedMs=0, pauseStartMs=0, recTimerId=null;

function drawLiveWave(){
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  function loop(){
    analyser.getByteTimeDomainData(dataArray);
    drawWave(waveform, dataArray);
    drawWave(waveformSide, dataArray);
    rafId = requestAnimationFrame(loop);
  }
  loop();
}
function drawWave(canvas, dataArray){
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth || canvas.width;
  const H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.beginPath();
  const slice = W/dataArray.length;
  ctx.lineWidth=1.2;
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--telha') || '#BE4A01';
  let x=0;
  for(let i=0;i<dataArray.length;i++){
    const v = dataArray[i]/128.0;
    const y = v * H/2;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    x+=slice;
  }
  ctx.stroke();
}
function drawStaticFromBuffer(buffer){
  if(!buffer) return;
  const data = buffer.getChannelData(0);
  const draw = (canvas)=>{
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.clientWidth || canvas.width;
    const H = canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.beginPath();
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--telha') || '#BE4A01';
    const step = Math.ceil(data.length/W);
    for(let x=0;x<W;x++){
      const start=x*step;
      let min=1,max=-1;
      for(let i=0;i<step;i++){
        const v = data[start+i]||0; if(v<min)min=v; if(v>max)max=v;
      }
      const y1=(1+min)*H/2, y2=(1+max)*H/2;
      ctx.moveTo(x,y1); ctx.lineTo(x,y2);
    }
    ctx.stroke();
  };
  draw(waveform); draw(waveformSide);
}
// Recording clock helpers
function fmtMS(ms){ const s=Math.max(0,Math.floor(ms/1000)); const m=Math.floor(s/60); const ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`; }
function startClock(){
  recStartMs = Date.now(); recPausedMs=0;
  recStatus.classList.add('rec'); recordBtn.classList.add('recording');
  clearInterval(recTimerId);
  recTimerId = setInterval(()=>{
    const elapsed = Date.now()-recStartMs-recPausedMs;
    recStatus.textContent = `REC ${fmtMS(elapsed)}`;
  }, 250);
}
function pauseClock(){ pauseStartMs=Date.now(); recStatus.classList.remove('rec'); recStatus.textContent=`PAUSED ${recStatus.textContent.replace(/^REC\s+/, '')}`; }
function resumeClock(){ recPausedMs += (Date.now()-pauseStartMs); recStatus.classList.add('rec'); }
function stopClock(){ clearInterval(recTimerId); recStatus.classList.remove('rec'); recStatus.textContent='Stopped'; recordBtn.classList.remove('recording'); }

recordBtn.addEventListener('click', async ()=>{
  try{
    mediaStream = await navigator.mediaDevices.getUserMedia({audio:true});
    chunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    sourceNode = audioCtx.createMediaStreamSource(mediaStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);
    drawLiveWave();
    mediaRecorder.start();
    startClock();

    mediaRecorder.ondataavailable = (e)=>{ if(e.data && e.data.size>0) chunks.push(e.data); };
    mediaRecorder.onstop = async ()=>{
      cancelAnimationFrame(rafId);
      if(mediaStream){ mediaStream.getTracks().forEach(t=>t.stop()); }
      stopClock();
      const blob = new Blob(chunks, {type:'audio/webm'});
      const url = URL.createObjectURL(blob);
      player.src=url; playerSide.src=url;
      downloadClip.href=url;
      downloadClip.download=(audioTitle.value?.trim()||'clip')+'.webm';
      downloadClip.removeAttribute('aria-disabled');

      const ab = await blob.arrayBuffer();
      state.currentBuffer = await audioCtx.decodeAudioData(ab.slice(0));
      drawStaticFromBuffer(state.currentBuffer);
      trimStart.value='0'; trimEnd.value=state.currentBuffer.duration.toFixed(2);

      player.onloadedmetadata = ()=>{
        const dur = Math.floor(player.duration||0);
        const g = genreSelect.value || 'Uncategorized';
        state.genreHours[g]=(state.genreHours[g]||0)+dur;
        state.totalSeconds += dur; renderGenreList(); refreshClockAndProgress();
      };
    };
  }catch(err){
    alert('Microphone access failed: '+err.message);
  }
});
pauseBtn.addEventListener('click', ()=>{ try{ mediaRecorder?.pause(); pauseClock(); }catch{} });
resumeBtn.addEventListener('click', ()=>{ try{ mediaRecorder?.resume(); resumeClock(); }catch{} });
stopBtn.addEventListener('click',   ()=>{ try{ mediaRecorder?.stop(); }catch{} });

// Upload support
uploadBtn.addEventListener('click', ()=> uploadAudio.click());
uploadAudio.addEventListener('change', async (e)=>{
  const file = e.target.files?.[0]; if(!file) return;
  const url = URL.createObjectURL(file);
  player.src=url; playerSide.src=url;
  downloadClip.href=url; downloadClip.download=file.name || 'clip';
  downloadClip.removeAttribute('aria-disabled');
  recStatus.textContent='Loaded file';
  const ab = await file.arrayBuffer();
  state.currentBuffer = await audioCtx.decodeAudioData(ab);
  drawStaticFromBuffer(state.currentBuffer);
  trimStart.value='0'; trimEnd.value=state.currentBuffer.duration.toFixed(2);
});

// Apply trim
applyTrimBtn.addEventListener('click', ()=>{
  if(!state.currentBuffer) return;
  const start = Math.max(0, parseFloat(trimStart.value)||0);
  const end = Math.min(state.currentBuffer.duration, parseFloat(trimEnd.value)||state.currentBuffer.duration);
  if(end<=start){ alert('Trim end must be greater than start.'); return; }
  const sr = state.currentBuffer.sampleRate;
  const length = Math.floor((end-start)*sr);
  const out = audioCtx.createBuffer(state.currentBuffer.numberOfChannels, length, sr);
  for(let ch=0; ch<out.numberOfChannels; ch++){
    const data = out.getChannelData(ch);
    const src = state.currentBuffer.getChannelData(ch).subarray(Math.floor(start*sr), Math.floor(end*sr));
    data.set(src);
  }
  // encode wav
  function bufferToWav(buff){
    const nch=buff.numberOfChannels, len=buff.length*nch*2+44;
    const buffer=new ArrayBuffer(len); const view=new DataView(buffer);
    let offset=0; const writeStr=s=>{ for(let i=0;i<s.length;i++) view.setUint8(offset+i, s.charCodeAt(i)); offset+=s.length; };
    writeStr('RIFF'); view.setUint32(offset, 36+buff.length*nch*2, true); offset+=4; writeStr('WAVE');
    writeStr('fmt '); view.setUint32(offset,16,true); offset+=4; view.setUint16(offset,1,true); offset+=2; view.setUint16(offset,nch,true); offset+=2;
    view.setUint32(offset,buff.sampleRate,true); offset+=4; view.setUint32(offset,buff.sampleRate*nch*2,true); offset+=4; view.setUint16(offset,nch*2,true); offset+=2; view.setUint16(offset,16,true); offset+=2;
    writeStr('data'); view.setUint32(offset,buff.length*nch*2,true); offset+=4;
    let idx=0;
    for(let i=0;i<buff.length;i++){
      for(let ch=0; ch<nch; ch++){
        const s = Math.max(-1, Math.min(1, buff.getChannelData(ch)[i]));
        view.setInt16(offset+idx, s<0 ? s*0x8000 : s*0x7FFF, true); idx+=2;
      }
    }
    return new Blob([view], {type:'audio/wav'});
  }
  const wav = bufferToWav(out);
  const url = URL.createObjectURL(wav);
  player.src=url; playerSide.src=url;
  downloadClip.href=url; downloadClip.download=(audioTitle.value?.trim()||'clip')+'_trim.wav';
  state.currentBuffer = out;
  trimStart.value='0'; trimEnd.value=out.duration.toFixed(2);
  drawStaticFromBuffer(out);
});

// ---------- Tagging ----------
applyTagBtn.addEventListener('click', ()=>{
  const tag = markerSelect.value;
  if(!tag){ alert('Choose a marker first.'); return; }
  const t = transcriptEl;
  const s = t.selectionStart, e = t.selectionEnd;
  if(s===e){ alert('Select some text to tag.'); return; }
  const before=t.value.slice(0,s), sel=t.value.slice(s,e), after=t.value.slice(e);
  t.value = before + `[${tag}]${sel}[/${tag}]` + after;
  const caret = (before + `[${tag}]${sel}[/${tag}]`).length;
  t.focus(); t.setSelectionRange(caret, caret);
});

// ---------- Export / Import ----------
exportJsonBtn.addEventListener('click', ()=>{
  const obj = {
    entryId: entryId.value.trim()||null,
    language: { name: languageName.value.trim(), code: languageCode.value.trim(), dialect: dialect.value.trim(), style: style.value.trim() },
    date: dateField.value || null,
    genre: genreSelect.value || null,
    prompt: promptSelect.value || null,
    transcript: transcriptEl.value,
    notes: notesEl.value,
    genresHours: state.genreHours,
    totalSeconds: state.totalSeconds
  };
  const blob = new Blob([JSON.stringify(obj,null,2)], {type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(obj.entryId||'entry')+'.json'; a.click();
});
exportCsvBtn.addEventListener('click', ()=>{
  const lines = transcriptEl.value.split(/\n+/).filter(Boolean);
  const rows=[]; let ref=1;
  for(const line of lines){
    const re=/\[([^\]]+)\](.+?)\[\/\1\]/g; const tags=[]; let clean=line, m;
    while((m=re.exec(line))) tags.push(m[1]);
    clean = clean.replace(re,'$2');
    rows.push({ref:ref++, sentence:clean.trim(), tags:tags.join('|'), notes:notesEl.value.trim()});
  }
  let csv='ref,sentence,tags,notes\n';
  rows.forEach(r=>{
    const esc = s=>`"${String(s).replace(/"/g,'""')}"`;
    csv += [r.ref, esc(r.sentence), esc(r.tags), esc(r.notes)].join(',') + '\n';
  });
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=(entryId.value.trim()||'transcript')+'.csv'; a.click();
});
importJsonBtn.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=e=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader();
    r.onload=()=>{
      try{
        const obj=JSON.parse(r.result);
        entryId.value=obj.entryId||'';
        languageName.value=obj.language?.name||'';
        languageCode.value=obj.language?.code||'';
        dialect.value=obj.language?.dialect||'';
        style.value=obj.language?.style||'';
        dateField.value=obj.date||'';
        transcriptEl.value=obj.transcript||'';
        notesEl.value=obj.notes||'';
        if(obj.genre && GENRES[obj.genre]){ genreSelect.value=obj.genre; updatePromptSelect(); }
        if(obj.prompt){
          const opt=[...promptSelect.options].find(o=>o.value===obj.prompt);
          if(opt) promptSelect.value=obj.prompt;
        }
        state.genreHours=obj.genresHours||state.genreHours;
        state.totalSeconds=obj.totalSeconds||state.totalSeconds;
        renderGenreList(); refreshClockAndProgress();
      }catch{ alert('Invalid JSON file.'); }
    };
    r.readAsText(f);
  };
  inp.click();
});

// ---------- Marker taxonomy (complete list & bundles) ----------
const MARKERS = [
  // Core scene & backgrounding
  ["LA:BG_opener_past","Opens a story in the past; sets time/background briefly."],
  ["LA:BG_opener_present","Opens with a general/habitual frame ("as people used to…")."],
  ["LA:SCENE_time_anchor","Pins the scene to a time ("that day / during harvest")."],
  ["LA:SCENE_place_anchor","Pins the scene to a place ("in the village / at the shore")."],
  ["LA:SCENE_switch","Signals a shift to a new scene or location."],
  ["LA:SCENE_closer","Closes a scene with a natural wrap ("and that’s how it was")."],
  ["LA:BACKGROUND_demote","Marks information as non‑event background."],
  ["LA:FOREGROUND_promote","Brings an event into the main line of action."],
  // Narrative chaining, causation, peaks
  ["LA:CHAIN_initial","Starts a chain of events (first push into the action)."],
  ["LA:CHAIN_medial","Continues the event chain smoothly."],
  ["LA:CHAIN_final","Closes a chain right before a result or turn."],
  ["LA:CAUSE_because","Gives the reason for what just happened."],
  ["LA:PURPOSE_min","States purpose/intent briefly ("in order to…")."],
  ["LA:CONDITION_if","Marks a conditional step ("if… then…")."],
  ["LA:CONTRAST_local","Contrasts two actors/events in the same scene."],
  ["LA:CONCESSION_mark",""Even though …" marker before an unexpected outcome."],
  ["LA:FLASHBACK_open","Opens a brief look backward in time."],
  ["LA:FLASHBACK_close","Returns from the flashback to the now."],
  ["LA:PEAK_tempo_rise","Speeds rhythm/packing as the story climbs to the peak."],
  ["LA:PEAK_TURN","Signals the turning point where the problem flips."],
  ["LA:RESULT_summary","Sums up the outcome after the peak."],
  ["LA:AFTERMATH_close","Shows the calm or new state after the crisis."],
  // Speech, dialogue, interaction
  ["LA:QUOTE_OPEN_simple","Plain way to start a direct quote."],
  ["LA:QUOTE_OPEN_honorific","Polite/deferential quote opener to a respected person."],
  ["LA:QUOTE_OPEN_report","Introduces reported/indirect speech."],
  ["LA:QUOTE_CLOSE_simple","Plain way to end a quote."],
  ["LA:QUOTE_CHAIN_next","Continues speech by the same speaker ("and he said…")."],
  ["LA:ADDRESS_respect","Vocative or respectful address ("Sir / Teacher")."],
  ["LA:Q_YN","Yes/No question form."],
  ["LA:Q_WH","Content question ("who/what/why/where")."],
  ["LA:Q_REASON",""Why?" form that asks for cause."],
  ["LA:Q_REBUKE","Question used as a rebuke ("What have you done?!")."],
  ["LA:COMMAND_plain","Direct imperative."],
  ["LA:COMMAND_softened","Mitigated imperative ("please / let us…")."],
  ["LA:PROHIBIT_neg","Negative command ("do not …")."],
  ["LA:PETITION_open","Polite opening of a plea/request."],
  ["LA:BLESS_form","Blessing formula ("may …")."],
  ["LA:CURSE_form","Curse formula (formal denunciation)."],
  ["LA:OATH_vow","Oath/vow wording ("I pledge / we vow…")."],
  ["LA:REPORT_say_then","Narrative "he said/answered" link inside dialogue."],
  // Lists, catalogs, genealogies
  ["LA:LIST_enumerator","Clean way to list items ("first/then/and")."],
  ["LA:LIST_pairing","Pairs items tightly ("X and Y" as a unit)."],
  ["LA:LIST_final_conj","The last‑item connector ("… and finally …")."],
  ["LA:CATALOG_open","Signals the start of an inventory or catalog."],
  ["LA:CATALOG_close","Closes a catalog/list naturally."],
  ["LA:GENE_line","Genealogy line formula ("A fathered B")."],
  ["LA:GENE_subclause","Adds details to a genealogy line (age, place, mother)."],
  // Poetry, hymns, wisdom
  ["LA:POET_intro_line","Conventional first line for a poem/hymn."],
  ["LA:POET_parallel-A≈B","Synonymous parallelism (second line restates the first)."],
  ["LA:POET_parallel-A≠B","Antithetic parallelism (second line contrasts the first)."],
  ["LA:POET_parallel-A>B","Synthetic/step parallelism (line two advances line one)."],
  ["LA:POET_refrain","Repeating line/refrain cue."],
  ["LA:DOXOLOGY","Short praise/closure formula in worship poetry."],
  ["LA:PROVERB_open","Proverbial introduction ("the wise say…")."],
  ["LA:PROVERB_balance","Marks the balanced two‑part structure of a proverb."],
  ["LA:HYMN_praise_open","Praise opener used in hymns/songs."],
  ["LA:LAMENT_dirge_open","Lament opening cry."],
  ["LA:LAMENT_wail_ideo","Wailing/ideophone element common in laments."],
  ["LA:LAMENT_turn_trust","The "but I trust…" pivot in laments."],
  ["LA:LAMENT_close","Formal lament closure."],
  // Procedural, legal, covenantal
  ["LA:PROC_step_open","Introduces the first step in instructions."],
  ["LA:PROC_sequence_next","Moves to the next step."],
  ["LA:PROC_condition",""If X, do Y" step wording."],
  ["LA:PROC_result","States the expected result of a step."],
  ["LA:LEGAL_statute_open","Opens a law/statute ("These are the rules…")."],
  ["LA:LEGAL_charge","States the charge/accusation."],
  ["LA:LEGAL_plea","Defendant’s plea/answer form."],
  ["LA:LEGAL_verdict","Verdict/judgment formula."],
  ["LA:LEGAL_penalty","Penalty/sanction statement."],
  ["LA:COVENANT_oath","Covenant oath formula ("We solemnly bind ourselves…")."],
  ["LA:COVENANT_sign","Names the sign/token of a covenant."],
  ["LA:BLESS_priestly","Priestly blessing structure."],
  // Discourse management & cohesion
  ["LA:PARTICIPANT_reintro","Re‑introduces a known participant after a gap."],
  ["LA:SWITCH_REF_same","Device that keeps the same subject across clauses."],
  ["LA:SWITCH_REF_diff","Device that marks subject change cleanly."],
  ["LA:TOPIC_shift","Signals a change of topic."],
  ["LA:TOPIC_resume","Returns to a prior topic."],
  ["LA:ASIDE_parenthetical","Inserts a brief aside/explanatory parenthesis."],
  ["LA:FOCUS_cleft","Focus marking strategy (clefting or equivalent)."],
  ["LA:EMPH_exclam","Emphatic exclamation device."],
  ["LA:SUMMARY_meta","Meta‑summary ("In short / This means…")."],
  ["LA:EXEMPLIFY","Introduces an example to clarify a point."],
  ["LA:EVIDENCE_ground","Presents evidence/grounds for a claim."],
  ["LA:ATTEMPT_mark","Marks an attempted action."],
  ["LA:SUCCESS_result","Marks a successful outcome."],
  ["LA:FAIL_result","Marks an unsuccessful outcome."],
  // Evaluation & closure
  ["LA:EVAL_moral","States the lesson/moral or evaluative comment."],
  ["LA:AFTERMATH_1","Shows the community’s response after the peak."],
  ["LA:CLOSURE_benediction","Ends with a blessing/benediction."]
];
const BUNDLES = [
  ["LA:PROFILE_NARR_casual_dialogue","{BG_opener_past, CHAIN_medial, QUOTE_OPEN_simple, QUOTE_CHAIN_next, RESULT_summary}"],
  ["LA:PROFILE_LAMENT_formal","{LAMENT_dirge_open, POET_parallel-A≈B, LAMENT_turn_trust, LAMENT_close}"],
  ["LA:PROFILE_LEGAL_statute","{LEGAL_statute_open, PROC_sequence_next, LEGAL_penalty, CLOSURE_benediction}"],
  ["LA:PROFILE_HYMN_praise","{HYMN_praise_open, POET_refrain, DOXOLOGY}"],
  ["LA:PROFILE_LIST_genealogy","{CATALOG_open, GENE_line, LIST_final_conj, CATALOG_close}"]
];

function renderGlossary(){
  const glossary = document.getElementById('glossaryList');
  const profileList = document.getElementById('profileList');
  glossary.innerHTML=''; markerSelect.innerHTML='';

  // Dynamically find group boundaries by sentinel IDs (more robust than hard indices)
  const GROUPS = [
    ["Core scene & backgrounding","LA:BG_opener_past"],
    ["Narrative chaining, causation, and peaks","LA:CHAIN_initial"],
    ["Speech, dialogue, and interaction","LA:QUOTE_OPEN_simple"],
    ["Lists, catalogs, and genealogies","LA:LIST_enumerator"],
    ["Poetry, hymns, and wisdom","LA:POET_intro_line"],
    ["Procedural, legal, and covenantal","LA:PROC_step_open"],
    ["Discourse management & cohesion","LA:PARTICIPANT_reintro"],
    ["Evaluation & closure","LA:EVAL_moral"]
  ];

  const starts = GROUPS.map(([name,id])=>({name, idx: MARKERS.findIndex(m=>m[0]===id)}))
                       .filter(g=>g.idx>=0)
                       .sort((a,b)=>a.idx-b.idx);

  for(let gi=0; gi<starts.length; gi++){
    const start = starts[gi];
    const endIdx = (gi+1<starts.length) ? starts[gi+1].idx : MARKERS.length;
    const h = document.createElement('li'); h.innerHTML = `<strong>${start.name}</strong>`; glossary.appendChild(h);
    for(let i=start.idx;i<endIdx;i++){
      const [id,label]=MARKERS[i];
      const li=document.createElement('li'); li.textContent = `${id} — ${label}`; glossary.appendChild(li);
      const opt=document.createElement('option'); opt.value=id; opt.textContent=`${id} — ${label}`; markerSelect.appendChild(opt);
    }
  }

  profileList.innerHTML='';
  BUNDLES.forEach(([id,desc])=>{
    const li=document.createElement('li'); li.textContent=`${id} — ${desc}`; profileList.appendChild(li);
  });
}

// ---------- QC (basic demo) ----------
qcBtn.addEventListener('click', ()=>{
  const issues=[];
  if(!entryId.value.trim()) issues.push('• Entry ID is empty.');
  if(!languageName.value.trim()) issues.push('• Language name is empty.');
  if(!languageCode.value.trim()) issues.push('• Language code is empty.');
  if(!dateField.value) issues.push('• Date is missing.');
  if(!transcriptEl.value.trim()) issues.push('• Transcript is empty.');
  if(!markerSelect.value) issues.push('• No marker selected.');
  qcOutput.textContent = issues.length? issues.join('\n') : '✓ All basic QC checks passed.';
});

// ---------- New / Save / Clear ----------
newEntryBtn.addEventListener('click', ()=>{
  entryId.value=`LA-${Date.now()}`; transcriptEl.value=''; notesEl.value='';
  audioTitle.value=''; player.removeAttribute('src'); playerSide.removeAttribute('src');
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
    document.querySelectorAll('input, textarea, select').forEach(el=> el.value = '');
    transcriptEl.value=''; notesEl.value='';
  }
});

// ---------- Init ----------
(function init(){
  // Ensure all panes start collapsed as per spec
  document.querySelectorAll('.pane').forEach(p=>{
    const head=p.querySelector('.pane-head'); const body=p.querySelector('.pane-body'); const c=p.querySelector('.chev');
    head?.setAttribute('aria-expanded','false'); if(body) body.style.display='none'; if(c) c.textContent='▸';
  });
  // Populate genres and glossary
  populateGenreAndPrompts();
  renderGlossary();
  refreshClockAndProgress();
  setStickyHeights();
})();
