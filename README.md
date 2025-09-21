# Language Archive Collector — Goal Clock + CSV Export

New in this build

- **Total clock + progress bar** in the header. Target is **100 hours**. The header shows the sum of audio durations from all locally saved entries and fills a progress bar (0–100%).  
- **Export Transcript (CSV)**: exports the transcript as a **table of sentences** with columns **ref, sentence, tags, notes**.  
  - Sentences are split by `. ! ? …` or line breaks.  
  - Any **marker tags** that overlap a sentence are collected into the **tags** column (joined with `|`).  
  - **notes** is left empty so teams can annotate later in a spreadsheet.

Everything else remains:
- **Ideas & Themes** first, with **per‑genre clocks**,
- **Audio Capture** + **Transcript & Tagging** can be open at the same time,
- **Waveform** view and **trim**,
- **Dark/Light** theme (persisted),
- **Search**, **QC checks**, **JSON export/import**,
- Your **logo** and tagline: *Tripod: Meaning Based AI‑Assisted OBT*.

### How the total clock works
- When you **record** or **upload** audio, the app decodes the file and stores its **duration** with the entry (`audio.durationSec`).  
- The **Ideas & Themes** clocks and the **header progress bar** sum these durations across your local archive.  
- Click **Refresh Clocks** to re‑compute totals (the app will try to estimate durations for older entries by decoding their audio).