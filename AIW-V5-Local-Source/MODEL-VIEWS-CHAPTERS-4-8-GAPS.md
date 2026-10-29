# Chapter 4–8 model views: the gaps, as observed — 27 September 2026

**What was reviewed.** The five chapter models (Responsibilities · Coverage, Components · Allocation, Platform · What fails together, Stack · Options, Sequence · Data flow), rendered from two copies of the code on isolated servers and databases, plus a reading of their source.

- The **site line**: `AIW-V5-Full-Source-2026-09-27.zip`, the source deployed to the private AIW site at its commit `664b974`. It contains v20.4 and adds a Model family switch (*Architecture diagram · Chapter analysis · Relationships*), the architecture diagram, and larger controls.
- **v20.4** (`9bd6516`), the package released this morning.

The five view files are byte-identical in both. Everything below applies to both unless marked *site line*. Evidence: 60 screenshots and measurements at 1440×900 and 390×844 on the Bank Payment Journey reference and on a blank project, headless Chromium; the code inventory cites `file:line`.

## 1. Where the reader lands *(site line)*

1. **The chapter models are hidden by default.** For Chapters 4 and up, the Model tab opens on the *Architecture diagram* family (`model-location.js`: `currentChapter >= 4 ? 'architecture' : 'chapter'`). The models this document describes are one switch away, under a name, *Chapter analysis*, that does not say what they are.
2. **Chapters 5 and 7 open on another chapter's diagram.** The diagram has scenes for Chapters 4, 6, 8, 9 and 10 only (`architecture-diagram-model.js:7–14`). Chapter 5 and Chapter 7 fall back to the Chapter 4 *Application overview* (`architecture-diagram.js:39`), captioned "Design as of Chapter 5/7". A carried selection does the same: Chapter 6 opened on the Chapter 4 overview because the selected object was a responsibility (`diagramSceneForObject`).
3. **Three families, three vocabularies.** The same chapter has three toolbars and three companions: *Diagram · Design state · Fit width · Saved views · Export SVG* with an *Ask Sol · Mind Factory · Cursor* bar; *Responsibilities · Coverage · lenses · Key · Walk*; *Explore perspectives · Whole system · Find · Arrange · Save · Details · Generative cursor*. Nothing says which to use for what.

## 2. Space and legibility

4. **The canvas gets 427–439 px of a 900 px window.** Above it stack the header, the chapter title and tabs, the family switch, the model title bar and the lens bar (357 px); below it the walk bar. The fit floor is 0.7 (`model-stage.js:4`), so the model overflows instead of shrinking: at 1440×900 Chapter 4's fifth step, Chapter 5's Settlement module and both right-hand parties, Chapter 6's *If it fails* column and Chapter 7's sizing, cost and selection columns are behind the companion. With the companion collapsed the Chapter 4 model fits (stage 1182 px, scale 0.75).
5. **Card text is drawn at about 0.7 scale**, so 13.5 px becomes about 9.5 px on screen while the toolbar stays at 13 px. Reading a card means zooming in and losing the overview.
6. **The Key button and the zoom controls float over content.** They cover rail rows and cells: the QD-001 row in Chapter 4 Coverage, TC-003/TC-005 in Chapter 6, TR-003 and its obligation cells in Chapter 7, the *In this failure* cells in *What fails together*.
7. **The status line truncates its most important counts.** "5 responsibilities in 3 groups · 5 journey steps · 0 unowned · 4 logi…", "… 3 without a failure …", "… 1 failure dom…". The ellipsis lands on *not carried*, *without a failure policy* and *failure domain*.
8. **Labels truncate where the content matters:** option titles ("Managed Kubernetes (cl…"), suggested judgements ("Restarts failed containers and reschedul…"), message labels ("IF-001 Pay…"), failure notes ("Single path · Primary operating dom…").
9. **Chapter 7 wastes its width.** Options draws two option columns in 40 % of the stage and empty grid in the rest; Stack's rail repeats the first column (TR-001 *Application execution realization* beside TC-001 *Application execution*); the six obligation columns are 8 px headings over rings.

## 3. Loading

10. **Several seconds of blank canvas on every entry**, with no loading state: 2.3–5.2 s warm, 9–11 s after a cold start. Each navigation fetches 169 module files (5.6 MB) because the server sends `cache-control: no-store` (`server.js`); the static import chain from a view is 29 deep and reaches about 129 modules. On a hosted site this is worse than on localhost.

## 4. Honesty

11. **Chapter 5 shows products nobody chose.** Every component's foot says *STANDS ON PostgreSQL +5*, *RabbitMQ +4*, *Kong Gateway +3* while Chapter 7 records "0 chosen". `productLabels` falls back to the first option that names a product (`spec-panel.js:56`, used at `realise-view.js:239`), and `realise-browser-validate.mjs:40` asserts it.
12. **Three of five models have no empty state.** On a blank project Chapter 4 says "No responsibility yet" with *New responsibility* and a proposal, and Chapter 8 says "No interactions recorded yet… Define a contract". Chapters 5, 6 and 7 draw nothing: a dotted grid, a status line of zeros ("0 components in 0 modules · 0 responsibilities not realised · 0 of 0 logical flows carried"), a companion explaining cards that are not there, and a footer saying "Select a component…".
13. **Sol's round takes the top of every companion when Sol is not connected.** *Ask Sol about the 5* leads to "Sol is not connected". *What the model shows*, the observations an architect came for, sits below the fold.
14. **Options says "No score is calculated"** (`stack-view.js:331`) above a Σ priority × effect row with ★ on the option the drivers lean to.

## 5. Interaction defects (verified in the code)

15. **Propose a realisation targets the wrong capability.** `technologyRealisationProposal(p,'missing')` ignores the id it is given and takes the first unrealised capability (`technology-realisation-domain.js:72`); every hole row and capability panel offers it.
16. **Chapter 7's family scope cannot be reached.** The handler exists (`stack-view.js:403`) but `.sk-mg` has `pointer-events:none` (`stack.css:14`) and the click handler returns on it (`stack-view.js:425`); measured at runtime: `pointerEvents: "none"`.
17. **Walk progress leaks between projects.** `visited` is module-level and keyed by scenario id (`responsibility-view.js:40, 523`), so *Record this walk* can be offered for a project that was never walked.
18. **Dead-end selections dim everything and empty the companion:** a Chapter 6 `MISSING:` rail row (`platform-view.js:182` sets the highlight before any branch matches); Chapter 5's unplaced and `COL:` lane heads; a bundled flow label at Groups depth, which selects `G:…` and nothing recognises it.
19. **Chapter 5's unplaced lane is labelled "Outside the system"** (`realise-view.js:396`).
20. **The companion toggle is named "Show the companion panel" in both states**; only `aria-pressed` changes.
21. **A model that cannot be built leaves the previous drawing on screen** under "The … model could not be prepared" (only `.cm-html` is replaced; Chapter 7 also skips its panel).
22. **Selection paths that bypass `select()`** leave the URL `object=` and Sol's context stale (`responsibility-view.js:91, 101, 608`; `realise-view.js:89`; `platform-view.js:94, 418`; `stack-view.js:83, 428`; `exchange-view.js:93, 449`). Reported by the code inventory; not exercised here.

## 6. Consistency between the five

23. **Different words for the same control:** the grouping control is *Elements* (4, 5), *Columns* (6, 8), *Rows* (7), *Lifelines* (8); it hides itself with one module in 6 and 8 but not in 4 and 5; the automatic switch is at 30 in 4–6, 11 actors in 8, absent in 7.
24. **Lenses:** *Flow* means three different things in 4, 5 and 8; there is no *Reasoning* lens in 6 or 8 though capabilities and contracts carry drivers and decisions; *Protection* exists only in 6.
25. **Walks:** Chapter 4 forces the whole journey and the map; Chapter 5 walks the current scope; Chapter 8 alone autoplays (2.2 s) and takes arrow keys; Chapter 7 has no walk. Escape steps back one level in 4, 5 and 8 and jumps to the whole in 6 and 7.
26. **Legends are incomplete and leak.** Chapter 4 Coverage has no key for proposed cells; Chapter 5 none for data, gap or party routes; Chapter 6 one legend for both views, nothing for hatched, *Stops* or *Degraded*; Chapter 7 none for ★, suggested, stale or +; Chapter 8 none for the lost ✕, gaps, ? or orphans. `.cm-legend .k-cell` is defined unscoped in `platform.css:134`, `realise.css:180` and `threat.css:162`, so one chapter's legend dot takes another's colour.
27. **Proposals:** only Chapter 4 follows a proposal previewed elsewhere; Chapter 5's proposal card is inert; Chapter 8 draws no preview; only Chapter 8 locks editing while a model proposal is open.

## 7. Keyboard, screen readers, phones

28. **34 of the 47 selectable things in Chapter 4 are `<i data-sel>` chips** with no keyboard path; the same pattern is in 5, 7 and 8. Dissecting is double-click only.
29. **Icon-only buttons without a name:** two on the desktop toolbar, three to four on a phone. `.cm-state` is `aria-live` and re-announced on every render.
30. **On a phone the lens content is hidden from the first fit:** the floor is 0.6 and `cm-far` hides lens lines below 0.62 (`model-stage.js:4, 21`); about half the screen is controls before the canvas starts.

## 8. Tests

31. No rendered test covers keyboard selection, the `object=` URL, a blank project, the "could not be prepared" path, legends, or lens content on phones. Chapters 5 and 6 have no Sol companion test. `realise-browser-validate.mjs:40` locks in gap 11.

## Proposed order of work

1. **Room and legibility** (4–9): one control row instead of two; the family switch as a compact segment; the companion as a drawer under 1500 px; controls in a gutter, not over content; a status line that wraps or moves to the companion; Chapter 7's rail and columns rebalanced.
2. **Loading** (10): cache headers with revalidation, `modulepreload` for each view's graph, and a loading state in the stage.
3. **Honesty** (11–14): chosen products only; real empty states for 5, 6 and 7; Sol's round demoted when Sol is not connected; the scoring sentence corrected.
4. **Defects** (15–22).
5. **One vocabulary and complete legends** (23–27).
6. **Keyboard and phones** (28–30).
7. **Landing** (1–3, *site line*): open on the chapter model, or remember the last family; give Chapters 5 and 7 a scene of their own or say whose scene is shown.
8. **Tests for each** (31).

Items 1–6 and 8 change the five views and the shared `cm-*` layer, which are identical in both lines. Item 7 changes files that exist only in the site line.
