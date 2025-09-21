# Language Archive Collector — Accordion MVP

This build makes the UI calm and focused: each major section (1–6) is a collapsible accordion. Only one section is open at a time (you can also Expand all / Collapse all). The app remembers the last section you had open.

## What’s included
- **Sections 1–6 as accordions** with mutual exclusivity and state memory.
- **Audio**: record (MediaRecorder) or upload; attach to entry; playback.
- **Transcript & Tagging**: select text, choose a marker, **Tag Selection**. The marker id shows next to the highlight.
- **Profiles**: pick a profile to see its marker set and add a note; QC checks for profile coverage.
- **QC Checks**: one-click checks with hints; automatically opens the QC section.
- **Search**: by ID, language name/code/dialect, speaker, collector, genre, or transcript text.
- **Local save**: IndexedDB; **Export/Import JSON** (packs audio if small).
- **Consent**: public / project-internal / team-only.

## How to use
1) Open `index.html` in Chrome/Edge/Firefox (or deploy to your Pages site).  
2) New Entry → fill section **1**, then open **2**, **3**… one at a time.  
3) In **5**, type the transcript, select a span → choose a marker → **Tag Selection**.  
4) **Run QC Checks** → fix any FAIL items → **Save Entry**.  
5) Use **Search** to find and **Load** entries you’ve saved locally.

This UI follows the Tripod’s Language Archive guidance: **light, function-first markers** and **profiles** that bundle common patterns by genre/register. See the manuscript for rationale. 