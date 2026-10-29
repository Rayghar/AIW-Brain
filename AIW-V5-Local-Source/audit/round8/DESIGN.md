# Round 8 · Proportion completed, scale and hardening, and the journey audited end to end

Baseline `e07235a` (AIW v0.10.0-rc.10.73.12 candidate). Branch `claude/dazzling-cerf-a3qshh`. Release field for this round: AIW v0.10.0-rc.10.73.13 (candidate); the controlling baseline stays rc.10.73.6; `productionAccepted` stays false.

## 1. Why

Round 7 brought a chapter model's canvas from 489–530 px to 244–283 px at the owner's screen; at 1440 × 900 and 1280 × 720 the frame beside a 300 px companion is narrower than 1020 px, so its views keep their own row and the canvas begins 30–60 px lower, and two studios' control rows (Chapter 3's design question, Chapter 10's environment picker) take 40–50 px under the tabs. Two screens have stood over the 3 s target at 500 records per chapter since round 5 (Chapter 5 Model 5.7 s, Chapter 10 Validate about 3 s), the narrative's trace costs about 4 s per story on a 5,000-record document (21 s for an SDD's full edition at 500 per chapter), four moderate npm advisories sit in the migration tooling (the drizzle-kit → esbuild chain), and the hosted D1 row size is unmeasured. The owner asked, with these, for a deep walkthrough of the journey from a new project to the SDD with improvement recommendations noted.

## 2. Contracts

### A · Proportion completed (workspace-ux.css) — lead

- In the side-by-side layout, a frame narrower than 1020 px shows the shared views (Layers, Table, Matrix, Whole design) and the frame's Add and Perspectives controls as their icons with their names in a title; the chapter's own views keep their words; the views and the actions share the first row. Phones (under 861 px) keep every word, as round 3 set.
- Chapter 3's design-question row and Chapter 10's environment row are one 36 px line each: the label inline before the control, the buttons beside it.
- Targets, re-measured and set in `ui-proportion-browser-validate.mjs`: the canvas within 290 px at 1894 × 960 (as now), 300 at 1440 × 900, 340 at 1280 × 720.

### B · Scale (R8-S)

- Chapter 5's Model under 3 s at 500 records per chapter (1,502 elements): the layout is linear already; the cost is the SVG the browser paints. Draw at a level of detail: beyond a threshold of elements, an element far from the viewport or at a far zoom is a rectangle without its text and marks until the zoom brings it near, with every element still selectable, findable and traced; or page the Diagram by lane with the lanes a person chooses. The workstream decides on measurement and keeps what the picture says (counts, checks, trace, selection) unchanged.
- Chapter 10's Validate under 3 s at 500 records per chapter.
- The narrative: the trace index built once per document revision and reused, so one story costs well under 1 s on a 5,000-record document and the SDD's full edition at 500 per chapter under 5 s.
- Measured in `scale-validate.mjs` (its `--strict` bounds extended to these three once they are met); no behaviour, wording or markup change a person would notice.

### C · Hardening (R8-H)

- The drizzle-kit chain: upgrade to a version without the esbuild advisory if the generated migrations are byte-identical for the current schema (regenerate and diff); else pin and record why in `audit/round8/HARDENING.md`.
- The hosted D1 row size: measure the project document's size on the scale fixture and the reference projects against D1's limits as documented in the repository's own notes and the Wrangler tooling present; write the design for staying under them (chunked rows, compression, or both) with the revision check preserved; implement only if the migration is reversible and proven by a suite, else the design stands as the round's record.

### D · The journey audited (audit/round8/JOURNEY-AUDIT.md) — lead

- The lead drives the journey from a new project (a blank brief, a brief file, a model file, a reference) to the SDD editions at 1894 × 960, screen by screen, beyond the 48-step walkthrough: every create path, every Chapter 1 section, the journey draft's cards and open questions, every tab of three chapters, the whole-journey draft, the review desk, plateaus, Validate, Output and every SDD edition with its download.
- Each screen is read for what it says twice, what it hides, what it asks that it already knows, where the next step is unclear, what wording jars, what fails or waits, and what a first-time architect would not know to do. Every finding has a phase, a severity (blocks · slows · jars · polish), an effort (hour · day · week) and a recommendation; the audit ends with an ordered list. Findings taken in this round are marked; the rest are the owner's to order.
- Published as a page with the screens, and kept in the repository.

### E · Proof — lead

- The full regression on the integrated tree, the proportion suite at its new targets, the walkthrough, the report, the release field, the package.

## 3. Rules

- Nothing a person could do before is lost; only place, size and speed change.
- No old and new path side by side; one level-of-detail rule for every picture, if that is the path.
- Candidate and discovery knowledge, scoring, hard constraints and conformance are untouched.
- Every measurement in the report is one that was taken, at the viewport and on the project named.

## 4. Addendum · the owner's direction (2026-10-03)

The owner compared round 7 with round 6 on their own screen and found the round-7 header worse. Their instruction:
keep the round-6 header layout, reduce its height to make space for the canvas, make the panel on the right
collapsible so the canvas can take the width, then continue with the rest of the refinements. Contract A is replaced
by A′ below; B and C are withdrawn.

### A′ · The round-6 header, shorter, and a collapsible panel — lead

- The round-6 markup comes back unchanged: the breadcrumb naming the project and the chapter, the title and the
  subtitle on their own lines, the readiness meter at the right; the tabs row with the milestones, the next action and
  the "?"; "You are here" on screen; the studio's assistance bar (Ask Sol, Proposals, Explain) in its own row above the
  studio. Round 7's chapter kicker, inline title row and assistance-in-the-tabs-row are retired, not kept beside it.
- Only height changes: tighter type and margins (title 24 px, breadcrumb, subtitle and labels 12–13 px, the readiness figure
  20 px, tabs 38 px, the assistance row and a studio's own control row 36 px each). In a window 800 px high or less
  the subtitle steps aside and the docked frame fits the column it has (down to 340 px) so its status line stays in
  view.
- The panel at the right — object details on Work, Validate and Output, the model companion on Model — has one toggle
  at its top right. Collapsed, it is a 36 px rail carrying its name; the stage, with the model frame in it, takes the
  width it frees; the choice is kept in the browser (`aiw.panel.collapsed`) and survives a reload.
- Targets, measured and set in `ui-proportion-browser-validate.mjs`: the canvas within 380 px at 1894 × 960, 390 at
  1440 × 900 and 410 at 1280 × 720 on Chapters 1, 4 and 8, the frame's bottom inside the viewport at all three;
  collapsing the panel widens the frame by at least 200 px.

### B and C · withdrawn

The scale (R8-S) and hardening (R8-H) workstreams were stopped when the owner interrupted the round; their partial
work is not integrated. They return to the backlog as they stood in round 7's report: Chapter 5's Model and Chapter
10's Validate over 3 s at 500 records per chapter, the narrative trace's cost on large documents, the four moderate
advisories in the migration tooling, and the unmeasured hosted D1 row size.
