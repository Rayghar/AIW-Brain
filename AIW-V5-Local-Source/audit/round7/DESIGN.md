# Round 7 · Proportion: one header, the canvas in view, a companion that is classified

Baseline `69f1bff` (AIW v0.10.0-rc.10.73.11 candidate). Branch `claude/dazzling-cerf-a3qshh`. Release field for this round: AIW v0.10.0-rc.10.73.12 (candidate); the controlling baseline stays rc.10.73.6; `productionAccepted` stays false.

## 1. What the owner saw, measured

The owner's recording (1894 × 1086 window, so a page viewport of about 1894 × 960) and two stills. Measured in headless Chromium at 1894 × 960 on the bank reference project, Chapter 4 · Model, before this round:

| Band, top to bottom | Top (px) | Height (px) |
|---|---|---|
| Top bar (brand, save state) | 0 | 63 |
| Heading row: breadcrumb, 32 px serif title, subtitle; readiness block (22 px count, bar, two lines) | 85 | 110 |
| Tabs row with "4 of 8 milestones · Next: …" and "?" | 215 | 35 |
| "You are here · Chapter 4 · Logical application · Model · Diagram · Logical application" | 265 | 25 |
| Assistance bar: project name or record kicker; Ask Sol, Proposals, "Hover explanations · On" | 305 | 50 |
| Frame title row: "CHAPTER 4 · MODEL Logical application" + Add, expand, Perspectives | 375 | 37 |
| Views row (Diagram, Responsibilities, Coverage, Layers, Table, Matrix, Whole design) | 412 | 33 |
| Toolbar (Arrange, Layers, Focus, Trace, Build, SVG, PNG, Code; Find; zoom) | 450 | 35 |
| **The canvas begins** | **495** | 51.6 % of the viewport is above it |
| Frame bottom (the frame is 640 px tall, fixed) | 925 | below the viewport: the status line and the lower picture need the page to scroll |

What repeats on one screen: the milestones count (in the readiness block and in the tabs row); the chapter and tab (breadcrumb, tabs, "You are here", the frame's title); "Chapter 01 / work" as a kicker beside the Work tab; "Reference examples are labelled throughout …" in every Work inspector while the sidebar's project card already says "Reference · Confirm before use". The widest control on the screen is the "Hover explanations · On" pill. Sol's review card stands first in every Model companion, above the view's reading and the findings, with a four-line explanation whether or not Sol is connected.

## 2. Targets

At 1894 × 960, 1440 × 900 and 1280 × 720, on the Model tab of every chapter:

- the canvas (the first picture's drawing area) begins within the first third of the viewport, and nothing above it is said twice. Set from the measurements at the end of the round, with a margin for the chapters whose frame carries a scenario row: 290 px at 1894 × 960 (measured 244–283, from 489–530), 330 px at 1440 × 900 (273–314), 370 px at 1280 × 720 (306–347). Chapter 11's Model is the review desk, whose vitals board stands above its table, so it is held to the frame rule below, not to the canvas line;
- the whole frame, its status line included, is inside the viewport: the page does not scroll;
- the companion's sections are classified under one summary style, each collapsible, the state remembered per viewer; Sol's section is closed until there is something of Sol's to read.

On the Work tabs: the chapter header and the tabs row are the same two rows; the inspector says "Details" once, not the tab and the chapter again; the reference note appears once per project per viewer, dismissable.

## 3. Contracts

### A · The chrome (app.js, styles.css, workspace-ux.css) — lead

- `.topbar` 52 px.
- One `header.chapter-head` row, min-height 48 px: left, the kicker "Chapter 04" and the `h1` (the same wording, 22 px serif) with the subtitle beside it (13 px, muted, one line with an ellipsis; hidden under 1280 px); right, `details.progress-disclosure` as a compact meter (64 px track, "4 of 8", "Next: Review inherited inputs →" as the one next-action control). The breadcrumb goes: the sidebar names the project. The old `.journey-status` in the tabs row goes with it.
- `.workspace-bar`: the tabs on the left; the studio's assistance bar as the bar's right-hand flex item (the shell appends the studio's `assistance()` markup inside the bar, after the tabs, so the studios' delegated listeners keep working); the help button last. `.you-are-here` stays in the DOM for screen readers and the suites (`#yah-text`), visually hidden. Bottom margin 10 px.
- The assistance bar: buttons 32 px high; the cursor toggle becomes an icon button with `aria-pressed` and the label "Explain" (the full sentence in its title); the brief chip keeps its place on Work tabs and is hidden on the Model tab (the companion carries the reading).
- `.main` padding 14 px 24 px 12 px.
- The phone layout keeps its rules: the heading under 160 px, the readiness disclosure closed.

### B · The frame (exchange.css, each view's `shell()`, model-stage.js) — lead

- `.cm-top` carries the views and the actions in one 36 px row: the `.cm-title` (the chapter and "Model" again) is hidden at and above 1001 px and its text moves to the row's `aria-label`; the crumbs chip (the scene or view in view) sits left of the views, 12 px.
- `.cm-bar` 36 px.
- `sizeModel` fits the viewport in every case: `h = innerHeight − top − footer − 12`, never under 440 px (560 on a phone), so the frame's bottom stays on screen.

### C · The model companion (model-stage.js, workspace-ux.css) — lead

- The docked companion folds its sections as they are rendered: every top-level `section` whose first child is an `h4` becomes `details.cp` with that `h4` as its `summary` (its count `span` becomes the badge), in this order: the selection's own section(s) first, then "What the model shows", then the checks, then "Reading this …", then Sol's sections (`.cs-*`, `.sr`, `.dk-sol*`) under one `details.cp.cp-sol`. Sections without an `h4` (the selection's specimen, a story, the process guide) stay open and unfolded at the top.
- One summary style: 11 px small caps label, the count badge, a chevron; `aria-expanded` follows the `open` attribute.
- Defaults: the selection and "What the model shows" open; "Reading this …" open the first time a viewer sees a chapter's companion and as left afterwards; Sol closed unless it is busy, the latest run has findings, or the viewer opened it. State remembered per viewer in `localStorage` under `aiw.companion.<section key>` (best effort; the page renders without storage).
- The fold is idempotent and re-applied after each render of the host (a MutationObserver on the host), so no view changes its render line.

### D · Sol's section (brain-reasoning-ui.js, chapter-sol.js, desk.css) — lead

- The review section's heading reads "Sol · review of Chapter 4" and carries a state chip: "not run" · "reviewing…" · "3 findings" · "the chapter changed since" (stale).
- Before a run: one line, "Sol reads the chapter's records, their checks and the connected model; you see the packet first and decide." and the "Review this chapter" button. Nothing else.
- After a run: the run line (run id, time, model, source-checked), then the findings in three groups with their counts: **To consider** (open), **Adopted**, **Set aside** (withheld, declined, dismissed); each finding keeps its severity word, element reference, title, reason and actions.
- The same markup in the Proposals panel (base `cm-btn`) and in the Model companion.

### E · Work, Validate and Output chrome (the chapter studios) — R7-W

- Every Work inspector head says "Details" once (no tab suffix, no "Chapter NN / tab" kicker); the guidance `h2` 18 px serif; the explanation one paragraph.
- The note "Reference examples are labelled throughout …" shows once per project per viewer (dismissable, `aiw.note.reference.<project id>` in `localStorage`, best effort) and nowhere else; the "Reference example" badges keep their title text.
- "A useful next thought" stays, 13 px, one box.
- The Validate head: the tiles 64 px high; the sentence under them joins the tile row as its caption.
- Chapters 1–3 (`requirements.js`, `quality.js`, `decisions.js`), Chapters 4–11 (`logical-ui.js`, `realisation-ui.js`, `technology-ui.js`, `technology-realisation-ui.js`, `interfaces-ui.js`, `security-ui.js`, `runtime-ui.js`, `review-ui.js`), `validate-view.js`, and their stylesheets (`requirements.css`, `intake.css`, `logical.css`, `validate.css`, `review.css`); the assistance bars' markup stays as it is (the shell restyles them under A).

### F · Proof — lead

- `ui-proportion-browser-validate.mjs` (`test:ui-proportion`): on the bank project at the three viewports, for Chapters 1, 4, 8 and 11 on the Model tab: the canvas top ≤ 250 px; `document.scrollingElement.scrollHeight ≤ innerHeight + 2`; the companion's `details.cp` in the contract's order; Sol's section closed by default, open after a click and still open after a reload; the milestones text once on the page; no visible "You are here".
- The existing browser suites that read the header (`ux-shell-browser-validate.mjs` and the model view suites) are adapted to the new markup where they assert on it, never weakened on what they prove.
- The walkthrough probe reruns; the report records the band table after.

## 4. Rules

- Nothing a person could do before is lost: every control keeps its name, its keyboard path and its `data-` hook; only its place and size change.
- One summary style for every collapsible section in the companion; no second pattern.
- No new text that says what the screen already shows.
- Storage is a convenience: every page renders the same without it.
