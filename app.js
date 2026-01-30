document.addEventListener('DOMContentLoaded', () => {
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
  const saveAudioIdBtn = document.getElementById('saveAudioIdBtn');
  const audioTitle = document.getElementById('audioTitle');
  const recStatus = document.getElementById('recStatus');
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadAudio = document.getElementById('uploadAudio');

  const player = document.getElementById('player');
  const waveform = document.getElementById('waveform');
  const trimStart = document.getElementById('trimStart');
  const trimEnd = document.getElementById('trimEnd');
  const applyTrimBtn = document.getElementById('applyTrimBtn');

  const expandAllBtn = document.getElementById('expandAllBtn');
  const collapseAllBtn = document.getElementById('collapseAllBtn');

  const newEntryBtn = document.getElementById('newEntryBtn');
  const saveEntryBtn = document.getElementById('saveEntryBtn');
  const clearFormBtn = document.getElementById('clearFormBtn');

  const entryId = document.getElementById('entryId');
  const languageName = document.getElementById('languageName');
  const languageCode = document.getElementById('languageCode');
  const dialect = document.getElementById('dialect');
  const styleSelect = document.getElementById('styleSelect');
  const genreMeta = document.getElementById('genreMeta');
  const registerSelect = document.getElementById('registerSelect');
  const settingSelect = document.getElementById('settingSelect');
  const audienceSelect = document.getElementById('audienceSelect');
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

  // ---------- Genre & Prompts (Ideas) ----------
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
    ],
    "Other": []
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
    // populate Genre (metadata) with same list
    genreMeta.innerHTML='';
    Object.keys(GENRES).forEach(g=>{
      const opt=document.createElement('option');
      opt.value=g; opt.textContent=g;
      genreMeta.appendChild(opt);
    });
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

  // ---------- Accordion logic ----------
  document.querySelectorAll('.pane-head').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const pane = btn.closest('.pane');
      const expanded = btn.getAttribute('aria-expanded')==='true';

      if(!expanded){
        // Opening this pane, close all others
        document.querySelectorAll('.pane').forEach(p=>{
          if(p===pane) return;
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
    setTimeout(()=> document.getElementById('recordBtn')?.focus({preventScroll:true}), 400);
  });

  // ---------- Audio capture (MediaRecorder + visual) ----------
  let mediaStream = null;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let analyser, rafId, mediaRecorder, chunks=[];
  let recStartMs=0, recPausedMs=0, pauseStartMs=0, recTimerId=null;

  function drawLiveWave(){
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    function loop(){
      analyser.getByteTimeDomainData(dataArray);
      drawWave(waveform, dataArray);
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
    draw(waveform);
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
      const sourceNode = audioCtx.createMediaStreamSource(mediaStream);
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
        player.src=url;
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
    player.src=url;
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
    player.src=url;
    downloadClip.href=url; downloadClip.download=(audioTitle.value?.trim()||'clip')+'_trim.wav';
    state.currentBuffer = out;
    trimStart.value='0'; trimEnd.value=out.duration.toFixed(2);
    drawStaticFromBuffer(out);
  });

  // ---------- Save audio & create Entry ID ----------
  function genEntryId(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `LA-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${Math.random().toString(36).slice(2,6)}`;
  }
  saveAudioIdBtn.addEventListener('click', ()=>{
    if(!downloadClip.href || downloadClip.getAttribute('aria-disabled')==='true'){
      alert('Record or upload audio first, then try again.'); return;
    }
    const id = genEntryId();
    entryId.value = id;
    if(!dateField.value){
      const d=new Date(); dateField.value = d.toISOString().slice(0,10);
    }
    // Pick extension from current download name or default to .webm
    const currentName = downloadClip.download || 'clip.webm';
    const ext = (currentName.split('.').pop() || 'webm').toLowerCase();
    downloadClip.download = `${id}.${ext}`;

    if(confirm(`Entry ID created: ${id}\nDownload the audio now with this ID as filename?`)){
      downloadClip.click();
    } else {
      alert('You can still download later via the Download button.');
    }
  });

  // ---------- Init ----------
  (function init(){
    // Ensure all panes start collapsed
    document.querySelectorAll('.pane').forEach(p=>{
      const h=p.querySelector('.pane-head'), b=p.querySelector('.pane-body'), c=p.querySelector('.chev');
      h?.setAttribute('aria-expanded','false'); if(b) b.style.display='none'; if(c) c.textContent='▸';
    });
    populateGenreAndPrompts();
    refreshClockAndProgress();
    setStickyHeights();
  })();
});
