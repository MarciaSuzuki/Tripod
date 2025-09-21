# Language Archive Collector — Accordion + Waveform + Theme

This build adds:
- **Dual-open** behavior so sections **4) Audio** and **5) Transcript** can be open **at the same time** (you can listen, pause, and transcribe).
- **Dark/Light theme toggle** (saved in the browser).
- **Waveform view and trim editing** (client-side, no libraries). Draw waveform, select a region, **Trim to Selection (Replace)** or **Download WAV (Selection)**.
- **Playback speed slider** (0.5×–1.5×) next to the audio player.
- **Logo** placed in the header.

Everything else remains: audio record/upload, tagging with visible marker labels, profiles, QC, search, Entry ID, language code/dialect, consent, local save (IndexedDB), export/import JSON.

## How to use the waveform
1) Record or Upload audio → click **Show Waveform** (or it draws automatically on new audio).  
2) **Drag on the waveform** to select a region (see the Selection times).  
3) **Trim to Selection (Replace)** to make that the new attached audio, or **Download WAV (Selection)** to save the selection as a file.  
4) Use **Zoom + / Zoom −** if you need more precision.  
5) If decode fails in your browser for certain codecs, you can still play and attach the audio; waveform may not be available for that file type.

## Theme
- Toggle with the moon/sun button. Persisted in localStorage.  
- You can set the default theme by changing `data-theme` on the `<html>` element in `index.html`.

## Deploy
- Replace the files in your GitHub Pages repo (root or `/docs`).  
- Hard refresh your site.

---

This app follows the Tripod’s **Language Archive** guidance: light, function-first markers and genre/register profiles, with evidence captured DU-by-DU for auditability. 