// Minimal application logic for the Tripod web app
//
// This file adds basic interactivity such as expanding/collapsing
// content sections and handling global expand/collapse actions.

document.addEventListener('DOMContentLoaded', () => {
  // Initialise collapsed state based on aria-expanded attributes
  document.querySelectorAll('.pane-head').forEach((btn) => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    const body = btn.parentElement.querySelector('.pane-body');
    const chevron = btn.querySelector('.chev');
    if (!expanded) {
      if (body) body.style.display = 'none';
      if (chevron) chevron.textContent = '▸';
    } else {
      if (body) body.style.display = '';
      if (chevron) chevron.textContent = '▾';
    }
  });

  // Handle individual pane toggles with automatic closing of others
  document.querySelectorAll('.pane-head').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const paneEl = btn.parentElement;
      const paneId = paneEl.getAttribute('data-pane');
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';

      // Toggle current pane
      btn.setAttribute('aria-expanded', String(!isExpanded));
      const chevron = btn.querySelector('.chev');
      if (chevron) {
        chevron.textContent = isExpanded ? '▸' : '▾';
      }
      const paneBody = paneEl.querySelector('.pane-body');
      if (paneBody) {
        paneBody.style.display = isExpanded ? 'none' : '';
      }

      // If expanding, close other panes except the paired group (transcript/audio)
      if (!isExpanded) {
        const isSpecial = paneId === 'transcript' || paneId === 'audioSide';
        document.querySelectorAll('.pane-head').forEach((otherBtn) => {
          if (otherBtn === btn) return;
          const otherPane = otherBtn.parentElement;
          const otherId = otherPane.getAttribute('data-pane');
          // skip closing if both are special and we are expanding one of the pair
          const otherIsSpecial = otherId === 'transcript' || otherId === 'audioSide';
          const keepOpen = isSpecial && otherIsSpecial;
          if (!keepOpen) {
            otherBtn.setAttribute('aria-expanded', 'false');
            const otherChevron = otherBtn.querySelector('.chev');
            if (otherChevron) otherChevron.textContent = '▸';
            const otherBody = otherPane.querySelector('.pane-body');
            if (otherBody) otherBody.style.display = 'none';
          }
        });
      }
    });
  });

  // Expand all sections
  const expandAllBtn = document.getElementById('expandAllBtn');
  if (expandAllBtn) {
    expandAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pane-head').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'true');
        const chevron = btn.querySelector('.chev');
        if (chevron) chevron.textContent = '▾';
        const paneBody = btn.parentElement.querySelector('.pane-body');
        if (paneBody) paneBody.style.display = '';
      });
    });
  }

  // Collapse all sections
  const collapseAllBtn = document.getElementById('collapseAllBtn');
  if (collapseAllBtn) {
    collapseAllBtn.addEventListener('click', () => {
      document.querySelectorAll('.pane-head').forEach((btn) => {
        btn.setAttribute('aria-expanded', 'false');
        const chevron = btn.querySelector('.chev');
        if (chevron) chevron.textContent = '▸';
        const paneBody = btn.parentElement.querySelector('.pane-body');
        if (paneBody) paneBody.style.display = 'none';
      });
    });
  }

  /*
   * Audio capture logic
   *
   * This section implements microphone recording, pause/resume control, saving
   * recordings, drawing real‑time and final waveforms, and optional trimming.
   * It uses the MediaRecorder API for recording and the Web Audio API for
   * visualisation and trimming. On stop, the recording is exported as a
   * downloadable file and loaded into both the main and side players.
   */
  const recordBtn = document.getElementById('recordBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn = document.getElementById('stopBtn');
  const downloadClip = document.getElementById('downloadClip');
  const audioTitle = document.getElementById('audioTitle');
  const trimStart = document.getElementById('trimStart');
  const trimEnd = document.getElementById('trimEnd');
  const applyTrimBtn = document.getElementById('applyTrimBtn');
  const player = document.getElementById('player');
  const playerSide = document.getElementById('playerSide');
  const waveformCanvas = document.getElementById('waveform');
  const waveformSideCanvas = document.getElementById('waveformSide');
  const statusEl = document.getElementById('recordingStatus');

  // Ensure canvases use their displayed width for drawing
  if (waveformCanvas) {
    waveformCanvas.width = waveformCanvas.offsetWidth;
  }
  if (waveformSideCanvas) {
    waveformSideCanvas.width = waveformSideCanvas.offsetWidth;
  }

  let mediaRecorder;
  let audioChunks = [];
  let stream;
  let audioContext;
  let analyser;
  let dataArray;
  let animationFrameId;
  let currentAudioBuffer;

  // draw the live waveform while recording
  function drawLiveWaveform() {
    if (!analyser || !waveformCanvas) return;
    animationFrameId = requestAnimationFrame(drawLiveWaveform);
    analyser.getByteTimeDomainData(dataArray);
    const ctx = waveformCanvas.getContext('2d');
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#BE4A01';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sliceWidth = width / dataArray.length;
    let x = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }

  // draw final waveform for a given AudioBuffer on the main and side canvases
  function drawFinalWaveform(buffer) {
    if (!buffer || !waveformCanvas) return;
    const pcmData = buffer.getChannelData(0);
    const length = pcmData.length;
    function drawToCanvas(canvas) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = '#BE4A01';
      ctx.lineWidth = 1;
      const middle = height / 2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const index = Math.floor((x / width) * length);
        const v = Math.abs(pcmData[index]);
        ctx.moveTo(x, middle - v * middle);
        ctx.lineTo(x, middle + v * middle);
      }
      ctx.stroke();
    }
    drawToCanvas(waveformCanvas);
    drawToCanvas(waveformSideCanvas);
  }

  // WAV encoder for trimming
  function encodeWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = 16;
    const samples = buffer.getChannelData(0);
    const blockAlign = (numChannels * bitDepth) / 8;
    const bufferLength = samples.length * blockAlign;
    const totalLength = bufferLength + 44;
    const arrayBuffer = new ArrayBuffer(totalLength);
    const view = new DataView(arrayBuffer);
    let offset = 0;
    function writeString(str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
      offset += str.length;
    }
    writeString('RIFF');
    view.setUint32(offset, totalLength - 8, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numChannels, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * numChannels * bitDepth / 8, true);
    offset += 4;
    view.setUint16(offset, numChannels * bitDepth / 8, true);
    offset += 2;
    view.setUint16(offset, bitDepth, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, bufferLength, true);
    offset += 4;
    const volume = 0x7FFF;
    for (let i = 0; i < samples.length; i++) {
      let s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s * volume, true);
      offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  // Start recording
  if (recordBtn) {
    recordBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') return;
      audioChunks = [];
      // Check browser support and secure context
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusEl) statusEl.textContent = 'Your browser does not support audio recording.';
        return;
      }
      if (!window.isSecureContext) {
        if (statusEl) statusEl.textContent = 'Audio recording requires a secure context (HTTPS or localhost). Please run this app from a web server.';
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error('Microphone access error:', err);
        if (statusEl) statusEl.textContent = 'Microphone access denied.';
        return;
      }
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      dataArray = new Uint8Array(analyser.fftSize);
      source.connect(analyser);
      drawLiveWaveform();
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationFrameId);
        if (audioContext) {
          // audioContext.close();
        }
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        // populate download link and players
        if (downloadClip) {
          downloadClip.href = url;
          downloadClip.removeAttribute('aria-disabled');
          const title = audioTitle && audioTitle.value ? audioTitle.value.trim() : 'clip';
          downloadClip.download = `${title}.webm`;
        }
        if (player) player.src = url;
        if (playerSide) playerSide.src = url;
        // decode audio for waveform and trimming
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
          currentAudioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
          drawFinalWaveform(currentAudioBuffer);
          if (trimStart) trimStart.value = '0';
          if (trimEnd && currentAudioBuffer) trimEnd.value = currentAudioBuffer.duration.toFixed(2);
        } catch (err) {
          console.error('Error decoding audio:', err);
        }
        if (statusEl) statusEl.textContent = 'Recording stopped.';
      };
      mediaRecorder.start();
      if (statusEl) statusEl.textContent = 'Recording…';
    });
  }

  // Pause recording
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        if (statusEl) statusEl.textContent = 'Recording paused.';
      }
    });
  }

  // Resume recording
  if (resumeBtn) {
    resumeBtn.addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        if (statusEl) statusEl.textContent = 'Recording…';
      }
    });
  }

  // Stop recording
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
        mediaRecorder.stop();
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      }
    });
  }

  // Apply trim to current recording
  if (applyTrimBtn) {
    applyTrimBtn.addEventListener('click', () => {
      if (!currentAudioBuffer || !audioContext) return;
      const startVal = parseFloat(trimStart && trimStart.value ? trimStart.value : '0');
      const endVal = parseFloat(trimEnd && trimEnd.value ? trimEnd.value : String(currentAudioBuffer.duration));
      if (isNaN(startVal) || isNaN(endVal) || startVal >= endVal) {
        return;
      }
      const sampleRate = currentAudioBuffer.sampleRate;
      const startSample = Math.floor(startVal * sampleRate);
      const endSample = Math.floor(endVal * sampleRate);
      const trimmedLength = endSample - startSample;
      const trimmedBuffer = audioContext.createBuffer(1, trimmedLength, sampleRate);
      const trimmedData = currentAudioBuffer.getChannelData(0).slice(startSample, endSample);
      trimmedBuffer.copyToChannel(trimmedData, 0);
      const trimmedBlob = encodeWav(trimmedBuffer);
      const trimmedUrl = URL.createObjectURL(trimmedBlob);
      if (downloadClip) {
        downloadClip.href = trimmedUrl;
        downloadClip.removeAttribute('aria-disabled');
        const title = audioTitle && audioTitle.value ? audioTitle.value.trim() : 'clip_trimmed';
        downloadClip.download = `${title}.wav`;
      }
      if (player) player.src = trimmedUrl;
      if (playerSide) playerSide.src = trimmedUrl;
      drawFinalWaveform(trimmedBuffer);
      currentAudioBuffer = trimmedBuffer;
      if (trimEnd) trimEnd.value = (endVal - startVal).toFixed(2);
      if (trimStart) trimStart.value = '0';
    });
  }
});