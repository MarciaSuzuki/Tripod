# Language Archive Collector — MVP

A single‑page, offline‑friendly web app for collecting **Language Archive (LA)** entries with audio recording, light annotation, controlled metadata, a marker glossary, quick QC checks, and local search.

> Marker families, profiles, and QC ideas are aligned to the *Translation Tripod* specification for the Language Archive (light function‑first markers; profiles; consent & provenance; validation gates). See the manuscript for details.


## Features

- **Language metadata**: name, ISO 639‑3 code, dialect/variety
- **Entry ID**: auto‑generated (`LA-YYYYMMDD-####`)
- **Genre / Register / Style** dropdowns (controlled lists)
- **Performance context**: setting, audience, participation, social constraints
- **Contributors & consent**: speaker pseudonym & profile, collector, consent level
- **Audio**: in‑browser recording (MediaRecorder) or file upload; attach to entry
- **Transcript editor**: contenteditable with **inline markers** using `<mark data-marker="…">`
- **Marker glossary** with quick insert
- **Profiles** (bundled markers) with gentle in‑text note
- **QC checks**: required fields, transcript/audio presence, marker validity, profile coverage
- **Local storage**: IndexedDB (entries + audio)
- **Search**: find and load entries by id / language / speaker / collector / genre / transcript text
- **Import/Export**: JSON package (optionally includes base64 audio if < 20MB)

## How to run

1. Unzip the package.
2. Open `index.html` in a modern browser (Chrome/Edge/Firefox). No server needed.
3. Click **New Entry**, fill metadata, record or upload audio, type a transcript.
4. Select text → choose a marker → **Tag Selection**.
5. Click **Run QC Checks** and then **Save Entry**.
6. Use the top search bar to find and reload saved entries.
7. Use **Export Entry (JSON)** to back up/share; **Import Entry** to restore.

## Notes

- Audio recording requires HTTPS or `file://` permissions depending on browser. If recording is blocked, use **Upload audio**.
- All data is kept locally in your browser. Export often.
- This is an MVP intended for field pilots. Extend it as needed (e.g., multi‑speaker sessions, multi‑file attachments, richer QC).

