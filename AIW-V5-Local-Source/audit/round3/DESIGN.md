# Round 3 design: one shell, one frame, clear places, a Diagram that answers the layers

Baseline: `b347d8b` (AIW v0.10.0-rc.10.73.7 candidate). Asked for: no reload between Chapters 1–3 and the rest; a Model tab that keeps the page frame; Validate, SDD readiness, the review desk and the model views reimagined so they are easy to understand; a Diagram that shows and hides the model layers you toggle; richer Model views where they help.

What landed, what was measured before and after, and what remains: `audit/round3/REPORT.md`.

## What is wrong today, measured

| Fact | Evidence |
|---|---|
| Chapters 1, 2 and 3 are three separate page applications; 4–11 a fourth. Any crossing is a full navigation (186–211 requests) | `public/entry.js:11-37`; round-2 U2-01 |
| On the Model tab the frame changes: sidebar 280 → 224 px, heading 104 → 54 px and its subtitle hidden, the assistance bar gone, the 300 px companion column replaced by a panel inside the canvas, the stage moved from x 304 to x 240 | `r3-ch4-work.png`, `r3-ch4-model.png`; `workspace-ux.css` `body[data-workspace-tab=model]` rules; `.am-active`/`.cm-active` body classes |
| The sidebar's layer toggles reach the Diagram (`aiw:model-layers`) but the Chapter 4 picture holds only logical elements, so toggling "Process" changes nothing and nothing says why; the sidebar says "2 of 8 visible" on Work and "8 of 8" on Model | probe: 5 nodes before and after toggling `process` |
| Validate carries three unrelated things behind one switch (Chapter checks, Review desk, Whole design); the review desk is also Chapter 11's Model; SDD readiness appears in the heading, on Validate and on Chapter 11 | `validate-view.js:29-84`, `desk-view.js:37-91` |

## A. One shell for eleven chapters

- `entry.js` loads `app.js` for every chapter. The three page apps become studio factories, `createRequirementsStudio(store)`, `createQualityStudio(store)`, `createDecisionsStudio(store)`, registered like the Chapter 4–11 studios and chosen by `s.chapter`.
- The shell's studio contract gains defaults (`studioDefaults`) so a studio needs only: `work()`, `validation()`, `output()`, `inspector(node)`, `milestones()`, `graph()` (nodes with `layer`, used by the sidebar and selection), `next()`, `assistance()`, `assistant(kind)`, `bind(bridge)` with an AbortController and `dispose()`, `busy`, `tip(node)`. Chapter-4–11-only methods (`flowNode`, `failureSurface`, `scenarioAction`, `preview`, `accept`) default to no-ops.
- Each converted studio keeps its inner markup, ids and classes (`#r-brief-form`, `#q-driver-form`, `#d-question-form`, `.r-dialog`, …) so the browser suites and the spark hooks keep working; its own topbar, sidebar, journey rail and tab bar are deleted; its dialogs open through `public/dialog.js` in the shell's `#dialog-host`; its document and window listeners move into `bind()`.
- Chapter models 1–3 already mount in the shell (`workspace-ux.js` `CHAPTER_MODELS`). Selection uses the record id; the URL keeps `artefact`, `driver` and `decision` as aliases of `object`. Readiness comes from `milestones()`.
- `shell-ux.js` keeps only what the shell uses; `prefetchShell` goes. The client bundle gets one route for the chapters; its budget is the measured size plus 5 %.
- Tests: the three unit suites drive the studios through the shell contract; `ux-shell-browser` asserts that no chapter change is a navigation (one document for the whole journey) and drops the two-shell comparisons.

## B. One frame on every tab

- Sidebar 280 px, heading with title, subtitle and readiness, tab bar, assistance bar, a stage column and a 300 px companion column, footer: identical on Work, Model, Validate and Output. No body class restyles the sidebar, heading or bar on Model.
- Model: the stage column holds the chapter model (toolbar and picture) sized to the remaining viewport height (minimum 560 px) so the page does not scroll while the picture is open; the companion column holds the model's companion: "Reading this picture", the selected element's details with "Open in Work", the Sol section, the element's checks. Chapter views and the notation render their companion into the shell's companion host instead of a `.cm-panel` inside the canvas. "Expand" stays as an explicit full-screen action.
- Phones: the companion becomes the drawer, as on the other tabs.

## C. Clear places: Work edits, Model shows, Validate checks, Output documents

- **Validate = Checks.** A status header (passing, to fix, to confirm, last run, Run checks); findings grouped by object by default or by kind, each with Open editor, Ask Sol and Treat; a section "This chapter in the SDD" listing the passages the chapter fills, with status; no mode switch. "Whole design" moves to the Model tab as a view; the review desk is reached from Chapter 11 only.
- **Output = Documents.** Every chapter: its SDD contribution (passages, status, missing fields) and its exports. Chapter 11: the SDD readiness board, one tile per chapter with passing, to fix and to confirm, the next action and a link; then Preview, Download and Freeze with its preconditions.
- **Review desk = Chapter 11 Model**, table first: Vitals as a sortable table (part, vital, recorded, target, state in words), What it takes as a two-column specification sheet, Trace as requirement rows with path chips and the first broken link named; the board graphic stays behind a "Board" toggle; the toolbar matches the other chapter models; 12 px floor and full text everywhere.

## D. The Diagram answers the layers; richer Model views

- **One layer model.** The sidebar's eight layers are the Diagram's layers and every Model view's filter. On Model the sidebar shows, per layer, how many elements the current picture holds ("Logical application · 5"; "Process · none in this picture", disabled), the scene's name, and "Show all" and "Only this chapter's layers". Toggling hides the layer's elements and relationships and re-lays the picture, with a note "3 hidden by layers · show"; the Diagram toolbar's Layers menu is the same control. The state is kept per chapter and scene. On Work the layers keep their list-filter meaning and the sidebar says so.
- **Views in every chapter's Model tab**, one switcher: Diagram · the chapter's own views · Layers · Table · Matrix · Whole design.
  - Layers: horizontal lanes, one per layer present in the chapter's connected model, elements in their lane, cross-lane relationships drawn; a hidden layer collapses its lane. A new `by-layer` arrangement in the notation, drawn by the shared renderer.
  - Table: the chapter's records as a sortable, filterable table (reference, title, key fields, open checks, linked counts); the layer filter applies; a row selects; "Open in Work".
  - Matrix: two record sets, with chapter defaults (1 journey steps × requirements, 2 requirements × drivers, 3 decisions × drivers, 4 requirements × responsibilities, 5 responsibilities × components, 6 components × capabilities, 7 capabilities × products, 8 components × contracts, 9 threats × controls, 10 components × placements, 11 requirements × running parts); a cell shows the relationship and selects; empty rows and columns are the gaps.
  - Whole design: the anatomy, moved from Validate.
- **Diagram**: an overview minimap, fit and zoom controls always visible, an edge-kind filter in the Layers menu, the hidden-by-layers note, search highlight, and legend counts per layer.

## Workstreams and ownership

| Workstream | Owns | Must not touch |
|---|---|---|
| R3-S one shell | `entry.js`, `requirements.js`, `quality.js`, `decisions.js`, `shell-ux.js`, their unit suites, `ux-shell-browser-validate.mjs`, `client-bundle.mjs` budgets, and in `app.js` only the studio registration, `FOUNDATION`/`CHAPTERS`, `studioDefaults` and chapter-change code | the Model render branch, the layers code, the Validate/Output branches of `app.js` |
| R3-M model | `model-stage.js`, `notation-model.js`, `notation-layout.js`, `notation-view.js`, `notation-svg.js`, the chapter `*-view.js` companion placement, new `model-table.js`, `model-matrix.js`, `layers-view.js`, `architecture-explorer.js` placement, `workspace-ux.css` and `styles.css` frame rules, notation and model CSS, and in `app.js` only the Model render branch, the sidebar layers block and the layer functions | the studio registration, the Validate/Output branches |
| R3-V validate, output, desk | `validate-view.js`, `review-ui.js`, `desk-view.js`, `desk-layout.js`, `readiness-model.js`, `validate.css`, `desk.css`, review and output CSS, their suites, and in `app.js` only the Validate and Output render branches | the Model branch, the layers code, the studio registration |

The lead integrates, runs the full regression and the browser gates, and commits each workstream when green. The authority chain is untouched: nothing here writes the document except through existing commands; readiness and checks stay rule-based and labelled.
