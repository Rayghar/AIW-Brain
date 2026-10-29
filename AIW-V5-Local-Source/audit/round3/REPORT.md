# Round-3 report: one shell, one frame, clear places, a Diagram that answers the layers

Baseline before this round: `b347d8b` (AIW v0.10.0-rc.10.73.7 candidate). Result: `eae1d40`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.8** (candidate; see "What this report does not claim").

Asked for, in the owner's words: no reload when moving between Chapters 1, 2, 3 and the rest; a Model tab that stops changing the dimensions of the page; SDD readiness, the review desk and the model views reimagined so they are easy to understand; a Diagram that shows and hides the model layers you toggle; more views beside the Diagram where they enrich modelling. The design is `audit/round3/DESIGN.md`; this report says what landed, what was measured before and after, and what remains.

## 1. Summary

| Measure | Value |
|---|---|
| Chapter changes that reload the document | before: every crossing between Chapters 1, 2, 3 and 4–11 (four page applications, 186–211 requests each); after: every chapter change in one document (0 requests, 1 navigation entry), and in-page links to other chapters too |
| Frame on the Model tab (1440×900) | before: sidebar 280→224 px, heading 104→54 px, bar removed, companion replaced by a panel in the canvas, stage x 304→240; after: Work and Model identical on every chapter (sidebar 280, heading 104, bar 51, stage 796×528 at x 304, companion 300 at x 1116) |
| Layer toggles on the Model tab | before: the sidebar said "8 of 8" and toggling Process on Chapter 4 changed nothing; after: the sidebar counts each layer in the picture, disables absent ones, and a toggle hides the layer's elements with "N hidden by layers · show" |
| Places | before: Validate switched between checks, the review desk and the anatomy; readiness appeared in three places; after: Validate is the checks, Output is the documents (Chapter 11: the readiness board), the desk is Chapter 11's Model, Whole design is a Model view |
| Model views per chapter | before: Diagram and the chapter's own views; after: Diagram · own views · Layers · Table · Matrix · Whole design |
| Final full regression at `eae1d40` | 129 suites, 129 passed, 0 failed, 9.4 min wall at 3 workers |
| Client bundle | one chapters route (2,270,644 B of a 2,373,632 B budget; Projects 913,941 B of 926,720 B) within budget; 125 script files of 127 |
| Lint | 0 new problems; baseline ratcheted 204 → 191 |
| Package | `AIW-V5-Local-Source-round3.zip`, SHA-256 and manifest digest recorded in the delivery note outside this package |

## 2. What landed, by ask

### 2.1 No reload between Chapters 1–3 and the rest (DESIGN A)

- `entry.js` loads `app.js` for every chapter. Chapters 1, 2 and 3 are studios created lazily from their converted modules (`createRequirementsStudio`, `createQualityStudio`, `createDecisionsStudio`) and registered beside the Chapter 4–11 studios behind `studioDefaults`, which fills every method the shell calls with a safe default. Each keeps its inner markup, ids and classes; renders Work, Validate and Output into the shell's stage and its details into the companion; opens its dialogs one at a time in the shell's dialog host with focus return; registers every listener under one AbortController that `dispose()` aborts; and saves only through store commands followed by the shell's render.
- Their own topbar, sidebar, journey rail, tab bar, readiness widget, footer, duplicate maps, popstate handling and page-layout CSS are gone. The shell carries the chapter change, the tab, the project and the deep-link aliases (`artefact`, `driver`, `decision`).
- The sidebar's eleven chapter links change the chapter in place. Every other link into the project's shell does the same: a chapter's checks from the readiness board, "Open in Work" on another chapter's record, a tab link; the address bar follows and Back returns in the same document. Links to another project, a perspective view, a modified click and links with a target or a download keep the browser's own navigation.
- The client bundle has one chapters route (the three Chapter 1–3 routes and the 4–11 route merged) within a budget of the measured size plus 5 %; the Projects route is unchanged.
- The three unit suites drive the studios through the shell contract; `ux-shell-browser` asserts the zero-navigation journey and the in-place links.

### 2.2 One frame on every tab (DESIGN B)

- The Model tab keeps the 280 px sidebar, the heading with its subtitle and readiness, the assistance bar, the stage column and the 300 px companion column. The model canvas fills the stage column at a 560 px minimum. Every chapter view, the notation, the explorer and the review desk render their companion into the shell's column through one `companionHost` in `model-stage.js`.
- The Model-tab restyles of the sidebar, heading and bar (`body[data-workspace-tab=model]`, `.am-active`, `.cm-active`) are deleted, not overridden. On phones the companion sits under the stage, as on the other tabs, and nothing is icon-only.

### 2.3 SDD readiness, review desk and model views, reimagined (DESIGN C)

- **Validate is the chapter's checks.** A status header with the counts in words (passing SDD passages, to fix, to confirm), the last run and one Run checks button; findings grouped by object or by kind in the journey's order, each with Open editor, Ask Sol and Treat through the existing disposition command; "This chapter in the SDD" lists every passage the chapter fills with its status, what is missing and an Open in Work link. The mode switch is gone; the anatomy and the review desk are never mounted here; old mode links say where each now lives.
- **Output is the chapter's documents.** Every chapter shows its SDD contribution (passages, status, missing fields) and its exports. Chapter 11 opens on the SDD readiness board: one tile per chapter with passing, to fix and to confirm, the next action linked to the record that fills it and a link to the chapter's checks; then Preview, Download and Freeze with what Freeze needs; then the baseline, the passages and the handoff. `readiness-model.js` computes this rule-based, memoised per document, and says it approves nothing.
- **The review desk is Chapter 11's Model, table first.** Vitals as a sortable table (part, vital, recorded, target, state in words) with aria-sort and arrow-key rows; What it takes as a two-column specification sheet; Trace as requirement rows with path chips and the first broken link named; the board graphic behind a remembered Board toggle; the toolbar in the order of the other chapter models; 12 px minimum and full text; the shared Layers, Table, Matrix and Whole design views in the same switcher. The companion docks into the shell's column.
- **Words.** Passing, to fix, to confirm on every surface, in the brief, the reasoning and the review domain; nothing is called blocking on a project without records.

### 2.4 The Diagram answers the layers; richer Model views (DESIGN D)

- **One layer model.** The sidebar's eight layers are the Diagram's layers and every Model view's filter, with one table of what each chapter opens with (`public/chapter-layers.js`, shared by the shell and the views). On Model the sidebar lists every layer with its count in the current picture, disables a layer the picture does not hold ("Process · none in this picture"), names the picture, says how many elements are hidden, offers Show all and Only this chapter's layers, and syncs both ways with the Diagram's Layers menu. The state is kept per chapter and picture. On Work the layers say they filter the list, on Chapters 1–3 too.
- **Toggling a layer hides its elements and relationships and re-lays the picture**, with the note "N hidden by layers · show" on the picture and the count in the sidebar; the chapter views honour the same filter.
- **Views in every chapter's Model tab, one switcher**: Diagram · the chapter's own views · Layers · Table · Matrix · Whole design.
  - Layers: one horizontal lane per layer present in the chapter's connected model, elements in their lane, cross-lane relationships drawn, a hidden layer collapsed to its lane; a new `by-layer` arrangement drawn by the shared renderer.
  - Table: the chapter's records sortable and filterable, with key fields, open checks and link counts; the layer filter applies; a row selects; Open in Work.
  - Matrix: a default pair of record types per chapter (journey steps × requirements on Chapter 1 … requirements × running parts on Chapter 11), axes that swap, the relationship in each cell, empty rows and columns marked as the gaps.
  - Whole design: the anatomy, now a Model view.
- **Diagram**: an overview minimap, Fit and zoom always visible, an edge-kind filter in the Layers menu, the hidden note, search highlight and legend counts per layer.

## 3. Measured before and after

Taken with a Playwright probe (`probe-after.mjs`, headless Chromium, reference project) on the final tree; the before values are from `DESIGN.md`.

| What | Before (`b347d8b`) | After (`eae1d40`) |
|---|---|---|
| Ch1 → 2 → 3 → 4 → 7 → 11 → 1 → 3 through the sidebar | four page applications; each crossing a full navigation of 186–211 requests | 7 chapter changes, every one in the same document: 1 navigation entry, 0 requests, document marker kept |
| A readiness-board link on Chapter 11 Output to another chapter's record | full navigation | opens Chapter 1 Work with `REQ-005` selected in the same document; Back returns to Chapter 11 in the same document |
| Frame at 1440×900, Work vs Model, Chapters 1, 4, 8, 11 | sidebar 280 → 224 px, heading 104 → 54 px, bar removed, companion replaced by a panel in the canvas, stage x 304 → 240 | identical on all four tabs of every chapter: sidebar 280 px, heading 104 px (137 px on Chapter 11, whose heading wraps on every tab), bar 51 px, stage 796 × 528 px at x 304, companion 300 px at x 1116, page height 900 (no scroll) |
| Sidebar layers on Chapter 4 Model | "8 of 8 visible"; toggling Process changed nothing and nothing said why | "Logical application · 5 ✓"; the seven layers the picture does not hold read "none in this picture" and are disabled; hint "Logical application · every layer shown" |
| Toggling a present layer | no effect on the Chapter 4 picture | Chapter 4: Logical off → 0 of 5 elements drawn, note "5 hidden by layers · show", sidebar "5 hidden by layers"; Chapter 5: Logical off → 14 of 19, "5 hidden by layers"; Chapter 8: Physical off → 7 of 13, "6 hidden by layers"; toggling back restores every element |
| Model views on Chapter 4 | Diagram, Responsibilities, Coverage | Diagram · Responsibilities · Coverage · Layers · Table · Matrix · Whole design |
| Chapter 11 Model | the review desk as cards, Vitals in its own layout | Diagram · Vitals · What it takes · Trace · Layers · Table · Matrix · Whole design; Vitals is a sortable table (Part, Vital, Recorded, Target, State); Board behind a toggle; smallest text 12 px |
| Validate | a switch between Chapter checks, Review desk and Whole design | one status line per chapter, e.g. Chapter 4 "0 to fix · 11 to confirm · 0 of 6 SDD passages passing"; no mode switch; grouped findings; "This chapter in the SDD" |
| Output | exports only; the readiness board on Validate and in the heading | the chapter's SDD contribution and exports; Chapter 11 opens on the readiness board, then the working SDD |
| Phone, 390 px, Chapter 4 Model | — | page width 390 (no horizontal scroll), stage 366 px, the companion is the model companion under the stage; Chapter 11 Vitals scrolls inside the stage (model height 21,514 → 1,401 px, measured by the desk workstream) |

## 4. Commits of this round

- `eae1d40` feat(shell): every link into the project's shell changes it in place
- `f35d03c` feat(desk): Chapter 11 shares the model views, Vitals scrolls on phones, dead Validate and desk paths retired
- `5dea2e7` refactor(layers): one table of chapter layers shared by the shell and the model views
- `a9d4e9f` feat(shell): one shell for eleven chapters with no reload; one frame on every tab; one layer model; Layers, Table, Matrix and Whole design views; Diagram overview
- `22cbad4` fix(words): checks say "to fix", never "blocking", in the brief, the reasoning and the review domain
- `106d07f` feat(validate): Validate is the chapter's checks, Output is its documents, and the review desk opens on tables
- `2eb3e28` docs(design): round 3, one shell, one frame, clear places, a Diagram that answers the layers
- the commit carrying this report, the lint baseline and the release field follows `eae1d40`

## 5. Discipline kept

- No code was committed before its workstream's suites passed on the shared tree, and the full regression was run before each code commit (a9d4e9f 129/129 in 562 s; 5dea2e7 129/129 on a clean worktree of its own change; f35d03c and eae1d40 129/129 on the final tree).
- The authority chain is untouched: nothing added here writes the document except through the existing store commands; readiness, checks and the SDD board are rule-based and say so; Ask Sol and Treat go through the existing disposition command; no LLM output approves, promotes or mutates anything.
- No role check, tenant boundary, budget, redaction, receipt, review gate or honesty label was weakened. No test was skipped, disabled or quarantined; every suite changed for a moved surface says so in the suite.
- No old and new path side by side: the three Chapter 1–3 page applications are gone (their shells, routers, rails, tab bars, readiness widgets and page CSS retired); the Model-tab restyles are deleted, not overridden; the chapter-layer table exists once (`public/chapter-layers.js`).
- `productionAccepted` is unchanged (false). The release field advances to the candidate rc.10.73.8; the controlling baseline in the manifest script stays rc.10.73.6 until the owner records a release.

## 6. Gates at `eae1d40`

| Gate | Result |
|---|---|
| `node check-syntax.mjs` | 436 application, service, script and verification modules pass |
| `node validate.mjs` (shell state in a vm sandbox) | passed |
| `node client-bundle.mjs` | no violations: chapters route 2,270,644 B of 2,373,632 B; Projects route 913,941 B of 926,720 B; 125 script files of 127; stylesheet 7.7 KB smaller than at `a9d4e9f` |
| `node scripts/lint.mjs` | 0 new problems; baseline ratcheted 204 → 191 (191 problems: 160 no-unused-vars, 31 no-empty, all pre-existing) |
| `node release-checks.mjs` at `eae1d40` (3 workers) | 129 suites, 129 passed, 0 failed, 9.4 min wall |
| Suites that read the release field, after it advanced | brain-integration, knowledge-second-brain, repository-sync pass |
| Before/after screenshots, Chapters 1–3, four tabs, 1440 and 390 px | 24 pairs pixel-identical after the dead-CSS removal (`r3/V2/` in the session scratchpad; not in the package) |

## 7. What remains, honestly

Named so the next round can take them; none of them is a reload between chapters, a reshaped Model tab or a layer toggle that does nothing.

- **Three flows still end in a document load.** Creating a project through the intake assigns the address of Chapter 1 when it is saved (`intake-ui.js`); the Projects gallery is its own route by design (`?view=projects`); the Brain context panel falls back to a full address only when the design-task module is not loaded. Everything else that names a chapter, tab or object inside the project routes in place.
- **The Chapter 1–3 studios keep a browser fallback in `goChapter`** for a page without the shell's bridge; in the shell the bridge is always present, so the fallback is never taken. Retiring it means deciding the studios can never run outside the shell.
- **Matrix pairs are per chapter, not chosen by the person.** Each chapter opens its default pair with the axes swappable; choosing any two record types from a menu is the next step.
- **The Layers view draws the chapter's connected model**; a lane for a layer the chapter does not touch stays absent rather than empty. Showing the eight lanes always, with the empty ones collapsed, is a presentation choice still open.
- **Phones.** The Model tab keeps the companion under the stage and the desk tables scroll inside their cards; the Matrix and Table views are usable but dense below 390 px, and were not tuned beyond the 12 px floor.
- **The review desk's board graphic** stays as the Board toggle; it was not redrawn.
- **Measurements** were taken on the reference project in headless Chromium; a project with hundreds of records was not profiled on the Table and Matrix views.

## 8. What this report does not claim

- No production acceptance, licence approval, expert review, calibration or signing happened in this round; `productionAccepted` stays false.
- The release notation rc.10.73.8 is a candidate written by this round; recording it as the controlling baseline is the owner's act.
- The measurements above were taken in headless Chromium at 1440×900 and 390×844 on the reference project; other viewports and real projects were not measured.
