# Language Archive Collector — Ideas First

This build moves the **creative step to the front**:

1) **Ideas & Themes** — choose a genre and a prompt (or type your own). See **per‑genre clocks** showing the total recorded hours collected locally.  
2) **Audio Capture** — record/upload audio, see the **waveform**, select & **trim**, adjust **playback speed**, attach to entry.  
3) **Transcript & Tagging** — type/paste, highlight spans, **Tag Selection** with marker IDs; apply **Profiles**.  
4) **Entry & Language Metadata** — language name/code/dialect, genre/register/style.  
5) **Performance Context** — setting, audience, participation, social constraints.  
6) **Contributors & Consent** — speaker, collector, consent level.  
7) **QC Checks** — run validation and fix anything that fails.

Other highlights
- **Dark/Light theme** toggle (persisted).  
- **Dual-open** behavior for sections **2** and **3** so you can **listen while transcribing**.  
- **Local save (IndexedDB)**; **Search** by ID/language/genre/etc.; **Export/Import JSON** (packs audio if not too large).  
- **Logo** in the header and new tagline: **Tripod: Meaning Based AI-Assisted OBT**.

### Per-genre “clocks”
- The app stores **audio duration** with each saved entry. The **Ideas & Themes** page sums durations by genre and shows a live **HH:MM:SS** clock for each genre.  
- Click **Refresh Clocks** to rebuild the totals from your local archive (it will try to estimate durations for older entries by decoding their audio).

### Waveform editing (quick guide)
1. Record or upload → **Show Waveform** (draws automatically after recording).  
2. **Drag to select** a region; **Zoom** if needed.  
3. **Trim to Selection (Replace)** to make the clip your attached audio; or **Download WAV (Selection)**.

This UI follows the Language Archive guidance in your manuscript—**genre coverage** and **light, function‑first tags**—so you elicit authentic speech first and annotate after. 