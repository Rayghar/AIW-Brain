# Round-2 remediation report

Baseline before this round: `1f9715e` (AIW v0.10.0-rc.10.73.6 plus the round-2 audit documents). Result: `82741a9`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.7** (candidate; see "What this report does not claim").

Every finding of `audit/round2/01`–`05`, the adoption plan in `06` and the twelve diagram proposals were worked through in three phases by eight workstreams (runner, backend, diagrams, Brain, frontend core, UI/UX, spark on Chapters 4–11 and 1–3, cross-cutting hygiene) with lead verification before each commit. The tables below give one row per finding: status, the workstream, and the suite that guards it. "Fixed" means the code change is in and a named suite checks it; "partly" names what remains; "not fixed" says why.

## 1. Summary

| Measure | Value |
|---|---|
| Findings tracked | 150 (B2 25, F2 27, D2 33, I2 26, U2 39) plus 12 diagram proposals |
| Rows fixed or done | 112 |
| Rows partly done with a named remainder | 36 |
| Rows not done | 2 |
| Final full regression at `82741a9` | 129 suites, 129 passed, 0 failed, 520 s wall at 3 workers |
| Client bundle | within every route budget; the catalogue no longer loads until Sol or the knowledge view opens |
| Lint | 0 new problems; baseline ratcheted 258 → 204 |
| Package | `AIW-V5-Local-Source-round2-remediated.zip`, SHA-256 `recorded in the delivery note outside this package`; manifest digest `recorded in the delivery note outside this package` |

## 2. Commits of this round

- `82741a9` fix(lead): project cards read the stored readiness, and Chapter 10 has one name
- `342ba8d` refactor(hygiene): shared modules out of public, no import cycles, shared helpers, frame-driven rendering, surfaced failures, one formatter, fewer globals, one naming set, lazy catalogue
- `2126169` feat(spark): the field spark on Chapters 1–3: brief, artefacts, quality scenarios, conflicts, decisions and alternatives
- `cc53694` feat(spark): field spark with cited offers, confirm questions and server-recorded Sol drafts; Co-author panel; Ask Sol "Put this in a field"; suggestion provenance
- `307c217` perf(model): the connected architecture model is built once per settled document
- `3157c0b` fix(lead): journey backlinks fold per chapter, and an empty Diagram offers the first step
- `41accd6` feat(lead): one hover reading on every chapter model and page app, Sol in the Chapter 1 companion, companion beside by default, wider desk cells
- `afffa0f` fix(ux): honest readiness and empty states, one shell behaviour across chapters, grouped Validate, in-editor review, keyboard and phone fixes, colour and type tokens
- `79f1562` fix(lead): SDD export suite asserts the figures section; ghost proposals invent no owner or source
- `73cfc30` fix(frontend): one dialog at a time, focus kept, paged lists and culled models, memoised render data, a serialised store, one dialog primitive, budgets and lint
- `744558a` feat(brain): Sol speaks about the chapter's own record on every page, with briefs, one voice, pinned instructions and acceptance statistics
- `23f5373` feat(diagrams): notation kit, layered layout with channel routing, one renderer for screen, export and SDD, viewpoints, accessibility and code exports
- `cbc1e0c` fix(backend): imported authority never approves, bodies bounded before buffering, roles on export, typed commands, retention and operability
- `0754cad` test(runner): suites run in their own process group and settle on exit; servers never outlive their suite

## 3. Discipline kept

- No code was committed before its workstream's suites passed on the shared tree, and the full regression was run at every phase close (0754cad 114/114; cc53694 128/128; final below).
- No role check, tenant boundary, budget, redaction, receipt, review gate or honesty label was weakened. No test was skipped, disabled or quarantined; every test changed for a renamed string or a replaced section says so in the suite.
- Nothing an LLM produces enters the canonical document except through a command a person submits; the spark's provenance is validated by the server and carries no score; candidate and discovery knowledge never appear as offers.
- `productionAccepted` is unchanged (false). Nothing was pushed from the session that produced this report.

## 4. Status per finding

## 01_BACKEND.md (25 findings)

| ID | Severity | Area | Finding | Status | Commit | Guarded by |
|---|---|---|---|---|---|---|
| B2-01 | High | Governance / restore | Imported identities satisfy the "second signed-in person" rule. `independentApproval` and the `review.governan | fixed | R2-A | recovery-authority 1–4, 7 |
| B2-02 | High | HTTP / DoS | The local server reads the entire request body into memory before any handler, Origin check or size limit runs | fixed | R2-A | server-hardening 5 |
| B2-03 | Medium | Persistence / growth | Every save whose journal, knowledge, alternatives, evidence or extension bytes changed writes a new UUID-keyed | partly: journal stored in segments and superseded blobs deleted after a grace period; opt-in `?changes=recent`, `/api/changes`, `?response=sections`; the full journal is still embedded by default until the client adopts the sections response; per-event diffs not done | R2-A | service-routes 2–3, changes, interface-impact |
| B2-04 | Medium | Persistence / retention | No retention or cleanup for `intelligence_runs`, `brain_retrieval_runs`, `operation_events`, `project_activity | partly: retention sweeps for runs, packets, events, activity, uploads and receipts with settings, hourly and on demand; the `reasonings` per-request file reads remain | R2-A | retention, brain-integration |
| B2-05 | Medium | API validation | `/api/commands` validates `revision` and `command.type` only; `payload` is not required to be an object, and d | fixed | R2-A | service-routes 1 |
| B2-06 | Medium | Error taxonomy | The route-level catch turns every exception into HTTP 503 "We could not reach project storage… please retry",  | fixed | R2-A | service-routes 4, brain-integration |
| B2-07 | Medium | Local persistence / backup | The blob store path is hard-coded relative to the working directory and independent of `AIW_LOCAL_DB`; `local- | fixed | R2-A | server-hardening 8 |
| B2-08 | Medium | AuthZ | `/api/recovery` is dispatched before the generic role gate and has no role check of its own, so viewers and re | fixed | R2-A | recovery-authority 5, service-routes 5 |
| B2-09 | Medium | AuthN / audit | Workbook imports are executed and attributed as the project owner: the worker passes `owner`, not `identity`,  | fixed | R2-A | service-routes 6 |
| B2-10 | Medium | Operability | No health endpoint, no metrics, no signal handling, no explicit HTTP timeouts; error logs are unstructured sta | fixed | R2-A | server-hardening 6, 8; retention 8 |
| B2-11 | Medium | Intelligence provider | Single attempt per call (no retry/backoff on 429/5xx), non-streaming, one 45 s/60 s timer spans two sequential | fixed (no streaming): per-call timeout, one bounded retry, cost estimate, connection probe, reservation released on interruption | R2-A | retention 3, 7 |
| B2-12 | Medium | Tests | Nine backend modules have no importing suite and several routes are exercised by one suite or none; the syntax | fixed | R2-A | service-routes imports every root backend module |
| B2-13 | Medium | API / response size | Every command response returns the whole document; API JSON is never compressed even when the client offers `g | partly: gzip/br for API JSON with explicit Content-Length; sections and recent-changes responses opt-in; no ETag on the project read because assurance refreshes on every read | R2-A | server-hardening |
| B2-14 | Low | Config surface | `.env.example` documents 7 variables; the code reads about 20. Undocumented anywhere: `AIW_REPOSITORY_SYNC_INT | fixed | R2-A | server-hardening (drift check) |
| B2-15 | Low | Packaging | The packaged Worker embeds every client file as string literals in one module, including the vendored DOCX bun | partly: assets embedded gzip-compressed (6.71 MB to 2.55 MB) with per-encoding ETag and a scheduled handler; static binding or R2 not done | R2-A | build.mjs self-check |
| B2-16 | Low | D1/R2 parity | The local adapter is the only tested implementation; it differs from the repository service's own SQLite setup | partly: WAL and busy_timeout, stale -wal/-shm cleanup, schema-to-migrations parity; batch splitting and a Miniflare parity test not done | R2-A | durability 1b |
| B2-17 | Low | Sign-in | The sign-in Origin check runs only when an `Origin` header is present, and the `Secure` cookie flag trusts a c | fixed | R2-A | server-hardening 4 |
| B2-18 | Low | AuthZ / accounts | Access grants and organisation memberships accept any actor id string; there is no account registry to validat | fixed for local accounts; hosted has no registry | R2-A | service-routes 7 |
| B2-19 | Low | Read cost | `GET /api/projects` reads and parses every full document to build summaries; `GET /api/operations`, `/api/conn | partly: `projects.summary` column so the list no longer parses documents; operations hydration and assurance caching not done | R2-A | service-routes 9 |
| B2-20 | Low | Idempotency | Receipts cover `/api/commands` only; `/api/reviews`, `/api/discussions`, `/api/lifecycle`, `/api/operations`,  | fixed server-side (route receipts, replay, in-progress 409); client does not send Idempotency-Key yet | R2-A | service-routes 10 |
| B2-21 | Low | Code quality | Helpers are copied per module and the router is a single expression. | partly: shared `http.js` json and `errorResponse`, command registry; origin and role guard helpers not extracted | R2-A |  |
| B2-22 | Low | package.json / TS boundary | `version` is `1.0.0` (release notation AIW v0.10.0-rc.10.73.6 appears nowhere in the package); `engines` says  | partly: ExperimentalWarning filtered, schema parity test; package.json release and script fields requested from the frontend workstream | R2-A |  |
| B2-23 | Low | Recovery | Preview and restore each decompress the package (up to 64 MB) and the restore re-runs preview; the historical  | fixed | R2-A | recovery-authority 5 |
| B2-24 | Low | Knowledge repository service | Any holder of the service token can request signed notice packets for any tenant/project scope; the release si | fixed | R2-A | service-routes 8, repository-service |
| B2-25 | Low | Honesty | Three statements do not match the code: LOCAL-RUN.md says changes persist in `project.sqlite` (blobs live else | fixed | R2-A | REMEDIATION-REPORT rows B-16 and B-20 corrected |

## 02_FRONTEND.md (27 findings)

| ID | Severity | Area | Finding | Status | Commit | Guarded by |
|---|---|---|---|---|---|---|
| F2-01 | High | Save flow / dialogs | Every ordinary edit whose payload differs from the stored record opens a second modal over the editor. While i | fixed in Chapters 4–11 and workbench forms: the ordinary-change review opens inside the editor's own dialog, never two dialogs, never "Saving…" while a person reviews; Chapters 1–3 and the desk requested from UI/UX | R2-B | studio-dialog-browser, workbench-ui |
| F2-02 | High | Focus management | After a completed save, focus is lost to `<body>`: the studio restores focus only if the opener is still conne | fixed: the dialog primitive remembers the opener by tag, id and data attributes and returns focus after the rebuild, else to the saved record's row | R2-B | studio-dialog-browser |
| F2-03 | High | Scale / rendering | No list pagination or virtualisation, and no viewport culling in the SVG models. | fixed: lists above 50 rows show 50 with "Show all N" in all 8 studios; findings, milestones and records memoised per settled document; off-stage SVG nodes hidden from 150 top-level children; 300-object fixture through the command path and a browser gate bounding select at 600 ms and save at 1,500 ms | R2-B | scale-browser |
| F2-04 | Medium | Performance (F-03 follow-up) | The Model render still hashes the whole technology layer synchronously: per-capability snapshots are re-serial | fixed: document-memo.js memoises technology snapshots and fingerprints, review stamps and the workbench digest for settled documents only (Chapter 7 switch 331 ms to 197 ms quiet); the connected architecture model is memoised the same way (lead) | R2-B | dialog, chapter domain suites |
| F2-05 | Medium | Architecture (F-10/UX-08 follow-up) | The three page apps and four other modules register document/window listeners at import time and nothing can r | fixed in owned modules: listeners registered once with an AbortController and dispose(); nothing calls dispose yet (one-shell migration) | R2-B |  |
| F2-06 | Medium | Dead code / boot cost | `window.aiwDecisionContext` is built at boot on every Chapter 4–11 page (applied decision edges over the whole | fixed: the boot-time decision context is removed from entry.js; nothing read it (lead) | R2-B |  |
| F2-07 | Medium | Module hygiene (F-24 follow-up) | Three modules under `public/` are unreachable from `entry.js`: they are imported only by server or test code. | fixed: 38 importers point at shared/ and the three public/ stubs are deleted; the Worker packages shared/ | R2-B, R2-G | npm run build, client-bundle |
| F2-08 | Medium | Module graph | Import cycles: two static strongly connected groups and six dynamic 2-cycles. | fixed: zero static import cycles; shared pieces moved to guidance-record.js, design-basis.js and case-context.js; the lint exemption list is gone; the dynamic 2-cycles around workbench-ui remain | R2-G | eslint import-cycle rule |
| F2-09 | Medium | Duplication (F-23 follow-up) | Helper functions are still copied per file, often byte-identical. | done for the pure helpers: 91 groups / 28,808 B to 43 / 14,066 B through public/util.js and helpers in project-context, model-stage, studio-kit and three domain modules; the rest depend on per-view state or are extractor false positives | R2-G |  |
| F2-10 | Medium | Dialog primitive | Dialogs differ in behaviour, not only in code: native `<dialog>.showModal()` with `cancel` in the studios; a c | fixed for the 8 studios and the workbench modal: public/dialog.js, native dialog with inert page, tab trap, one cancel path, busy states, error slot, focus return | R2-B | dialog, studio-dialog-browser |
| F2-11 | Medium | Editors / reuse readiness | Field vocabulary differs per chapter and two studios reuse one form id for two record types, so no single plac | partly: record-fields.js describes 27 record types with unique form ids; Chapter 4 renders from the descriptors; the browser gate checks 8 forms against them | R2-B | studio-dialog-browser |
| F2-12 | Medium | Concurrency / conflicts | `project-store.command()` is not serialised: two in-flight commands both send the same `current.revision`, so  | fixed: commands are serialised, a second command carries the first's revision, a tab that is behind refuses to send, status is "saving" until the queue drains | R2-B | workspace |
| F2-13 | Medium | localStorage | 33 keys; per-project scoping exists but the reference project keeps unscoped keys, five keys are global by des | fixed: keys scoped per project including the reference project with a one-time migration; perspectives use the scoped key and the migration exemption is gone (lead) | R2-B |  |
| F2-14 | Medium | Timers as synchronisation | 142 `setTimeout` calls; 47 are 30–80 ms waits that let layout settle before a second render or reveal. | done for the chapter model views: setTimeout 155 to 94, waits of 80 ms or less 77 to 16, through nextFrame() in model-stage.js; drag suppression, 0 ms deferrals and the Validate poll stay on timers | R2-G | view browser suites |
| F2-15 | Low | Error handling (F-12 follow-up) | Swallowed errors are down from 73 to 14 empty `catch{}`, plus 5 `.catch(()=>{})` and 5 `.catch(()=>null | fixed: reportFailure() logs the cause and raises a notice on the toast line; Co-author, design-task reload, desk import and ArchiMate import use it; no-empty 40 to 31 | R2-G |  |
| F2-16 | Low | Dates and numbers | No shared formatter: 22 bare `toLocaleString()` (numbers and dates), one `toLocaleString('en-GB')`, one `Intl. | done at the listed sites: public/format.js adopted in 18 modules; desk toFixed(1), money fields and client timestamps remain | R2-G |  |
| F2-17 | Low | Truncation | Text is truncated in JS with hand-picked limits instead of CSS: 320 `slice(0,N)` (N = 180 ×7, 60 ×8, 100 ×6, 4 | partly: CSS clip classes, full text in hover cards and tips; slice(0,N) 371 to 360; SVG labels, packet bounds and layout-fed text stay in JS | R2-G |  |
| F2-18 | Medium | CSS (F-16 follow-up) | The token layer is nominal: 7 `:root` properties, 128 custom properties defined in total, 1,207 `var()` uses a | token plan handed to UI/UX for the CSS it owns | R2-B |  |
| F2-19 | Medium | Build / delivery (F-04 follow-up) | The bundler has no source maps, no size budget, no persisted metafile, and produces 110 chunks with a long tai | partly: source maps, metafile, budgets; the 1.5 MB catalogue now loads lazily (Projects route 2.47 MB to 1.02 MB, Chapter 1 3.24 MB to 1.79 MB); tiny facade chunks remain | R2-B, R2-G | bundle-browser (no catalogue until Sol opens) |
| F2-20 | Low | Tooling (F-23 follow-up) | No linter, formatter or type check exists; `npm run check` is syntax only; hand-written lines are still up to  | fixed with a ratchet: ESLint pinned, no-unused-vars, no-empty and a static import-cycle rule for public/, scripts/lint.mjs with a baseline that only goes down; 258 to 233 problems | R2-B | npm run check |
| F2-21 | Medium | Tests | 13 UI modules have no test reference at all; 14 more are covered only incidentally; 34 of 117 suites use 291 f | partly: suites for recovery-ui, discussion-ui, alternative-editor, organization-ui, dialog, studio dialogs, scale and the arrangement command; none uses a fixed sleep; 9 untested modules and the view suites' sleeps remain | R2-B | ui-modules, dialog |
| F2-22 | Low | Rendering (F-09 follow-up) | Every command still triggers a full shell re-render through a bare signal event; on the 300-object project tha | producer done: the store emits aiw:project-command with {type, ids, revision}; the app.js consumer requested from UI/UX | R2-B |  |
| F2-23 | Low | State copies | Chapters 1–3 keep a module-local copy of the document beside the store and re-sync it by event; two workbench  | fixed in the workbench handlers: project() read after awaits | R2-B |  |
| F2-24 | Low | Validation | Validation is HTML5 attributes only, with no programmatic path: 497 `required`, 101 `maxlength`, 1 `pattern`,  | fixed in the 8 studios: novalidate forms with inline messages, aria-invalid, focus on the first bad field, wizard steps checked on leave | R2-B | studio-dialog-browser |
| F2-25 | Low | Domain boundary | Clean, with one naming hazard: no `-domain.js` module imports UI or touches DOM/window; `workbench-domain.js`  | fixed: parameter renamed doc | R2-B |  |
| F2-27 | High | Tests / release gate | The regression runner hangs forever when a browser suite dies without stopping the server it spawned: the serv | fixed: suites run detached in their own process group, the runner settles on exit and ends the group, browser suites kill their server on process exit; a simulated orphaned server reports in under a second | lead (0754cad) | simulated hung suite; full regression 114/114 then 128/128 |
| F2-26 | Low | Globals (F-07 restated with new facts) | 21 `window.aiw*` globals, 271 references in 54 files; `aiwProjectStore` is assigned in two places, `aiwInterfa | done for aiwCurrentProject: window.aiw* names 24 to 20, references 306 to 246; two write-only globals removed; the spark and shell bridges kept | R2-G |  |

## 03_DIAGRAMS.md (33 findings)

| ID | Severity | Area | Finding | Status | Commit | Guarded by |
|---|---|---|---|---|---|---|
| D2-01 | High | Notation | Every relationship kind uses one solid stroke and one filled-triangle `marker-end`; the only variant is `dashe | fixed: 26 kinds in 14 families with distinct line and ends; markers emitted only when used | R2-C | notation |
| D2-02 | High | Notation | Arrow direction contradicts the words: the connector runs component → capability and says "is served by" (serv | fixed: ArchiMate directions (composes, realizes, serves, fulfils) | R2-C | notation |
| D2-03 | Medium | Notation | Element typing is heuristic and inconsistent with the exporter: a Chapter 4 responsibility is a "Logical appli | partly: one palette table feeds Diagram, Key, SVG, code and ArchiMate exports; contract stays an application service everywhere | R2-C | notation, exchange |
| D2-04 | High | Legend | The Key's element list is built from a hard-coded family list that omits `bpmn-*`, `intent`, `decision`, `proc | fixed: Key built from what is drawn and carried in the export | R2-C | notation-browser |
| D2-05 | Medium | Notation | No cardinality, multiplicity, protocol or direction qualifier on connectors; direction is the arrowhead only;  | fixed: ends, qualifier and cardinality drawn and read aloud | R2-C | notation-code |
| D2-06 | Medium | Notation / C4 | No C4 levels: the `application` scene puts the system, its components, application services, logical component | partly: Context and Container scenes; no C4 component-level scene | R2-C | notation |
| D2-07 | Medium | Deployment view | The deployment scene ignores the trust boundary a zone belongs to, draws technology placements only when place | partly: zone inside trust boundary inside environment; deploy-view must pass the selected environment (requested) | R2-C | notation |
| D2-08 | Low | Data / security views | The data scene draws no lineage (`transforms`) and no fields; the security scene has none of the boundary-cros | partly: lineage scene with transforms and boundary-crossing marks; data fields not drawn | R2-C | notation |
| D2-09 | Low | Coverage | The `rationale` scene for Chapter 11 is defined and unit-tested but no view mounts it; Chapter 11's Model tab  | fixed: rationale scene reachable from Chapter 3; the Chapter 11 desk still has no Diagram (desk-view) | R2-C | notation |
| D2-10 | Medium | Coverage | 19 of the 43 relationship types the connected model records are never drawn (list in §2); six defined element  | partly: actor, outcome, placement and seven more relationship kinds drawn; ten kinds still not drawn | R2-C | notation |
| D2-11 | High | Layout / routing | Connectors cross elements and labels sit on boxes, contrary to the README. Reference project: ch5 tree 3 throu | fixed: 0 through-passes in all 99 reference layouts and the stress and 200-element cases; labels placed by collision search | R2-C | notation-layout |
| D2-12 | High | Layout / routing | Collinear bundles: edges from one parent to several children share the mid-y "bus" and their labels stack (ch6 | fixed: shared runs 0–1 from up to 284 | R2-C | notation-layout |
| D2-13 | High | Layout / density | On a 49-element, 74-edge project (the cap is 50 responsibilities): grouped 608 crossings and 75 labels on node | partly: Sugiyama pipeline with barycenter sweeps, transposition, wrap, fold, dummy corridors and A* channels; crossings stay high in dense cases; grouped at 200 elements about 2.3 s | R2-C | notation-layout |
| D2-14 | Medium | Layout / grouped | Grouped arrangement ignores edges: a group's nodes are laid in rows of ≤4 by rank then title, so flows inside  | fixed: groups laid out inside by the layered algorithm and placed by inter-group edges | R2-C | notation-layout |
| D2-15 | Medium | Layout / lanes | "Swimlanes" is offered on every scene; on scenes without lane groups it collapses to a single column with the  | fixed: swimlanes only with containers, real bands, pools never touch | R2-C | notation-browser |
| D2-16 | Medium | Layout / pins | Pins are absolute coordinates per scene+arrangement in `localStorage`; after the model changes a pinned node o | partly: pins relative to their container, re-validated, release, Delete, undo; the workspace.diagram-arrangement command exists in the domain and the worker validates pins against the scene (lead); the view still keeps pins in localStorage until it adopts the command | R2-C | notation-browser |
| D2-17 | Medium | Layout / determinism | Grouped layout wraps by `viewW` (stage width), so the same scene exports different geometry at different windo | fixed: layout independent of window width; 1000 px and 1440 px exports byte-identical | R2-C | notation-browser |
| D2-18 | Low | Camera | The first fit floors the zoom at 0.62 so wide pictures (ch1 and ch3 are 2,132 px) are cut at the right; below  | partly: first-fit floor 0.5, semantic zoom keeps titles and edge words; no minimap | R2-C | notation-browser |
| D2-19 | Low | Typography | Fixed 168×62 px boxes: 7 px kickers and refs on screen (UX-03 follow-up), 2-line clamped titles, 9 px sub-line | fixed: boxes sized to text, kicker 9.5 px, titles to three lines | R2-C | notation |
| D2-20 | Medium | Consistency | The same object has four palettes and vocabularies: LR-001 is a blue "Logical application component" (#8ea6c8) | fixed: one ink table per type drawn as the box top edge, used by the anatomy, and the explorer takes its object colours from the same table (lead, architecture-model.js) | R2-C | notation |
| D2-21 | Low | Consistency | Chapters 1–3 sidebars show a different "Model layers" list (Actors, Journey steps …, "4 of 5 visible") from th | not done: the sidebar layer list is in app.js (UI/UX workstream) | R2-C |  |
| D2-22 | Low | Labels | Titles cut at 80 characters, edge labels at 40, group titles at 60, with no ellipsis; the export writes each t | fixed: ellipsis with full text in tooltip and companion; wrapped titles in the export | R2-C | notation-browser |
| D2-23 | Medium | Interactivity | Connectors are not interactive: no hover, selection, tip or companion reading for a relationship in any chapte | fixed: edge hit area with title, aria-label and keyboard focus; selection reads in the companion | R2-C | notation-browser |
| D2-24 | Medium | Interactivity | No focus, dissect, neighbourhood or walk on the Diagram (the anatomy has Dissect, the explorer has scope and " | partly: focus hops and find by reference; no walk on the Diagram | R2-C | notation-browser |
| D2-25 | Medium | Interactivity | No annotation layer: findings, risks, decisions and Sol's observations are listed in the companion, never plac | partly: findings, notes and Sol-proposal callouts on the picture and in the export; baseline diff via Compare; notes in localStorage, no promotion to a review item | R2-C | notation-browser |
| D2-26 | Low | Keyboard | Tab reaches nodes and Enter/Space selects; arrow keys pan only when the stage itself has focus; no keyboard mo | fixed: arrow keys move and pin, Delete releases, moves announced; relationships after elements in tab order | R2-C | notation-browser |
| D2-27 | Low | Navigation | Cross-chapter links exist only in the companion (Realise →, Chapter 5 component, Chapter 1 step…); a node offe | partly: "Open in Chapter N" in the companion; no "Show in explorer/anatomy" | R2-C |  |
| D2-28 | High | Document parity | The SDD HTML draws its own "Architecture atlas": four perspectives from `logicalGraph(project)` (not `architec | partly: 18 SDD figures with a SHA-256 manifest wired into the HTML export (lead, worker.js); PDF and DOCX still carry no figures | R2-C | notation-code |
| D2-29 | Medium | Export quality | The SVG export is not the screen picture: no icons, no ref badges, no notes list (the deployment notes on scre | partly: export uses the screen renderer with icons, references, notes, Key, title and description; PNG still a fixed 2× raster | R2-C | notation-browser |
| D2-30 | Medium | Exchange | ArchiMate export maps 8 of 34 object types and writes every relationship as `Association` with no `<views>`; I | fixed in large part: Structurizr, C4-PlantUML, Mermaid, draw.io, BPMN, per-scene and whole-model ArchiMate; Ilograph and Eraser still export the explorer perspective | R2-C | notation-code |
| D2-31 | Low | Export | Export file names carry project, chapter and scene but no baseline, revision or arrangement; the header shows  | fixed: file names and header carry arrangement, content version and baseline | R2-C | notation-browser |
| D2-32 | Medium | Tests | Layout tests assert no node overlap, routing existence and determinism only; no edge-through-node, crossing, l | fixed: metric thresholds and the 49- and 200-element fixtures in the layout suite | R2-C | notation-layout |
| D2-33 | Low | Explorer | "Smart arrange" on the Chapter 4 explorer produced an identical picture; the explorer draws one marker and no  | not done: explorer owner | R2-C |  |

## 04_BRAIN.md (26 findings)

| ID | Severity | Area | Finding | Status | Commit | Guarded by |
|---|---|---|---|---|---|---|
| I2-01 | High | Context | On Work/Validate/Output of Chapters 5–11 the Sol panel speaks about **LR-001 (Chapter 4)** — "Sol reads Chapte | fixed: Sol speaks about the chapter's own record with the most open checks, or the project on Chapter 11; a carried selection is named and can be pinned | R2-D | brain-subject-browser 1–2, chapter-reasoning, brain-ui |
| I2-02 | High | Coverage | Chapter 1 records (requirements, constraints), Chapter 11 and every drawn element have no reasoning path: `REC | fixed: reasoning targets for requirements, constraints, Chapter 11 narrative and actions; Sol entry in the companion on every chapter model including Chapter 1 (lead, story-view.js); no bar over any canvas | R2-D | brain-subject-browser 5, chapter-reasoning, sol-coverage-browser, model-views-browser |
| I2-03 | High | Push | No proactive intelligence anywhere: Sol's round only lists records ranked by finding count (`public/chapter-re | fixed: per-tab rule-based brief in the panel and one line in the bar, computed when idle and cached per revision; desk drafted fixes excluded for cost | R2-D | brain-subject-browser 3, 3b |
| I2-04 | Medium | Honesty | The name "Sol" labels rule-based content: "Sol · Act on this context" menus (`public/requirements.js:157`, `pu | fixed in Brain files: three labelled bands From your project / Sol / Chapter tools; menu titles in the page apps requested | R2-D | intelligence-ui, brain-subject-browser 7 |
| I2-05 | Medium | Honesty | The not-connected state is described four ways: "Sol is not connected; you can still see what it would read" ( | fixed: one status line, "Test the connection", no "publish to apply"; "Send to Sol" | R2-D | intelligence-ui |
| I2-06 | Medium | Depth | Mind Factory is generic: Chapters 2–7 show the same "ARCHITECTURE CHOICES · Flow and completion … PRODUCER / B | fixed: Mind Factory shows retrieved concepts with matched words, fired rules, tactics and anti-patterns, top pattern kits and obligations, all labelled descriptive | R2-D | brain-subject-browser |
| I2-07 | Medium | Depth | Knowledge relevance is lexical: `relevantKnowledge` has six regex rules (`public/knowledge-relevance.js:4`), ` | fixed: retrieval trace and source line; generic sketch collapsed behind one line | R2-D | brain-subject-browser |
| I2-08 | Medium | Architecture | Two Sol pipelines: generate (`intelligencePacket` v2, `INTELLIGENCE_SCHEMA`, `validateIntelligenceOutput`, pro | partly: free-text questions on Work/Validate/Output go through the reasoning path with preset jobs and a receipt strip; the generate path keeps its own review prompt (open) | R2-D | chapter-sol-browser, intelligence-ui |
| I2-09 | Medium | Coverage | The companion's Sol section exists in ten chapter-model views but not Chapter 1's story view (`solSection` use | fixed: status pointer beside a model; Chapter 1 story-view companion (lead) | R2-D | chapter-sol-browser 7 |
| I2-10 | Medium | Validate | Findings are computed per chapter by rules (`logicalFindings` `public/logical-domain.js`, `interfaceFindings`, | partly: brief ranks findings and offers "Ask Sol about the top N"; Validate lists requested from UI/UX | R2-D |  |
| I2-11 | Medium | Hover | "Hover explanations" are two mechanisms: the chapter models' own `cm-tip` (record description, `public/respons | fixed: one rule-based hover reading, appended by the shared tooltip placement on every chapter model and by the Chapter 1–3 page apps (lead, model-stage.js); #cursor-tip on Chapters 4–11 from cursor-tip.js | R2-D | brain-subject-browser 8 |
| I2-12 | Medium | Field-level | No editor field has a suggestion, draft or prefill: grep of `autofill\ | fixed on every chapter: click-only spark on free-text fields with From your project / Confirm / Sol draft, accept fills the open form only, "Fill empty fields from your project" with Undo, server-validated provenance, Co-author panel, Ask Sol "Put this in a field"; Chapters 1–3 through record-fields descriptors and rules for the brief, artefacts, scenarios, conflicts, decisions and alternatives (445 cited offers on the reference project) | R2-E, R2-E2 | field-spark, coauthor, field-spark-browser, field-spark-pages-browser |
| I2-13 | Medium | Adoption | `adoptIntelligence` kind `design` copies LLM `answers` into a design task where empty and records the generati | fixed in Brain files: each copied answer keeps field, run and edited flag; form marking requested from frontend core | R2-D |  |
| I2-14 | Medium | Honesty | Ghost proposals in Chapters 1–3 are hard-coded records with owners and sources ("Enquire about a pending payme | fixed: ghost proposals leave owner and source unset (lead, requirements-domain.js); page-app labels requested from UI/UX | R2-D |  |
| I2-15 | Low | Coverage | Selecting a placement in Chapter 10's deployment diagram opens the panel on "PL-001 · Working definition PL-00 | fixed: placement title; the guide points to the record its question is about instead of inviting an answer about the selection (lead, chapter-guide-ui.js) | R2-D |  |
| I2-16 | Medium | Disclosure | Runs pin the provider and model name but not the instructions: `generationReceipt` stores provider, model, pac | fixed: every reasoning packet pins promptVersion and SHA-256 and the run stores it; the generate path returns the same pin from the provider and stores it on the run (lead, intelligence-provider.js, intelligence-service.js) | R2-D | brain-subject-browser |
| I2-17 | Medium | Learning loop | Feedback exists only for assessments (Agree / Disagree… → `intelligence.adopt kind:'assessment'`, `public/brai | fixed: adoptionStatistics per chapter, kind, verdict, field and source; shown in the stewards' view (lead, stewardship-ui.js) | R2-D | sol-evaluation |
| I2-18 | Medium | Evaluation | The only evaluation evidence is a mock-provider run: `evidence/brain-evaluation/sol-test-double-2026-09-25.jso | fixed: evaluation reports mode and evidence class test-double unless a real model is reached; the script defers its mode to the runner (lead); no real-model run (no key) | R2-D | sol-evaluation |
| I2-19 | Medium | Learning loop | Learned claims are read only when linked to a record (`learnedFor`, `public/knowledge-stewardship.js:145`, fou | fixed: uncaptured disagreement sent as a labelled project-note source until stewards capture it | R2-D | sol-coverage |
| I2-20 | Low | Performance | `public/entry.js:10` says the Brain and its 1.5 MB catalogue load only for Chapters 4–11, but `requirements.js | fixed: catalogue-store.js loads the catalogue lazily on first Sol or knowledge open; receipt checks and passage suggestions use catalogue-index.js, equivalence checked over 2,296 cases; comments corrected | R2-D, R2-G | brain-integration, bundle-browser |
| I2-21 | Low | Honesty | The "Ask Sol in your own words" composer offers "Find related evidence by meaning with OpenAI" and "Challenge  | fixed: template proposals labelled rule-based | R2-D |  |
| I2-22 | Low | Consistency | Seven help surfaces with seven vocabularies: panel ("Sol", "Mind Factory", "Architecture Brain"), companion (" | fixed: consistent naming in Brain files | R2-D |  |
| I2-23 | Low | Coverage | `/?view=projects` offers no intelligence: no "where you left off" beyond "Resume Chapter 11", no cross-project | fixed: projects.summary carries readiness (recomputed at most once a minute per project, always on create); cards read it (lead one-liner) | R2-G | service-routes |
| I2-24 | Low | Desk | The review desk's "Ask Sol" per drafted fix is the strongest push surface (drafts with numbers, "Preview", wor | partly: Validate brief shows desk vitals for the chapter's parts | R2-D |  |
| I2-25 | Low | Synthetic clicks | A programmatic `button.click()` on the assistance bar's Ask Sol never opened the panel while a pointer click d | fixed: nested programmatic click replaced by a dispatched MouseEvent; cause isolated | R2-D | brain-subject-browser 7 |
| I2-26 | Low | Guide | The chapter guide asks one unanswered field question per chapter (`CHAPTER_METHODS`, `public/chapter-guide.js: | fixed: 209 deterministic offers on the reference project, all citing project records, unchanged by candidate or discovery knowledge | R2-E | field-spark, coauthor, field-spark-browser |

## 05_UI_UX.md (39 findings)

| ID | Severity | Area | Finding | Status | Commit | Guarded by |
|---|---|---|---|---|---|---|
| U2-01 | High | Navigation | Chapters 1, 2 and 3 are each a separate document and 4–11 a fourth. Sidebar Ch1→Ch2, Ch2→Ch3, Ch3→Ch4 and Ch11 | fixed: anchors in both shells carry tab and project; the other shell is prefetched when idle; still no single shell | R2-F | ux-shell-browser and the view suites |
| U2-02 | High | Companion | The object panel `#inspector.inspector` is beside the stage in Ch4–5 (left 1116, width 300) and below it in Ch | fixed: the companion default is beside on every chapter (lead, workspace-ux.js); the sticky below variant removed | R2-F | ux-shell-browser and the view suites |
| U2-03 | High | Validate | Validate content height (scroll box 452 px tall): Ch6 2,902 px, Ch7 11,508, Ch8 7,534, Ch10 13,673 (box 310 px | fixed: findings grouped by kind or object with counts and an index, repeats fold; Chapter 8 Validate 5,682 to 2,166 px | R2-F | ux-shell-browser and the view suites |
| U2-04 | High | Flow C | "Record decision" is enabled with no working choice; clicking it answers 400 and "Not saved — Choose an altern | fixed: Record decision disabled with reason and checklist until every precondition holds; review inside the editor; 7 clicks, no failed request | R2-F | ux-shell-browser and the view suites |
| U2-05 | High | Blank project | On a project with no records: Ch4–11 readiness box says "0 of 8 milestones met · sample objects may be illustr | fixed: illustrative note only with illustrative records; "N to do"; no capacity figure without inputs | R2-F | ux-shell-browser and the view suites |
| U2-06 | High | Readiness | Adding one requirement dropped Ch4 from 50 % to 38 %; adding one responsibility (no journey link, ungrouped, n | fixed: "n of 8 met, m to re-check", re-check segment, nothing counted that the saved project does not meet | R2-F | ux-shell-browser and the view suites |
| U2-07 | Medium | Sol panel | `#brain-panel[role=dialog][aria-modal=false]` is `position: fixed` at x 1054, 370×808. In Ch1–3 the stage stil | fixed: Chapters 1–3 make room for Sol like Chapter 4 | R2-F | ux-shell-browser and the view suites |
| U2-08 | Medium | Sol content | The Sol panel holds 109 focusable controls, 16 headings and 11 distinct font sizes (11–21 px) in 370 px: conne | R2-D (panel bands) | R2-F | ux-shell-browser and the view suites |
| U2-09 | Medium | Companion | `summary[aria-label="Object lens layout"]` (32×32 at x 1375) overlaps `#inspector a.btn` "← Back" (x 1328, 69× | not verified: Back button absent in the test state | R2-F | ux-shell-browser and the view suites |
| U2-10 | Medium | Companion | `.journey-context-body` ("One project / Connected journey", 41 backlinks, 4,510 px) scrolls inside a 290 px bo | fixed: inner scroll gone; backlinks fold per chapter, open only for the current chapter (lead) | R2-F | ux-shell-browser and the view suites |
| U2-11 | Medium | Validate IA | Every chapter's Validate starts with the whole‑journey "SDD readiness" block (11 tiles, "211 blocking findings | fixed: chapter checks lead, whole-journey as collapsed summary, modes relabelled | R2-F | ux-shell-browser and the view suites |
| U2-12 | Medium | Validate | With 0 content gaps the default "Content gaps" filter shows "No findings in this category. Review the other ca | fixed | R2-F | ux-shell-browser and the view suites |
| U2-13 | Medium | Validate | "Review" on a finding (`article.l-finding button`) only sets `object=api` in the URL and repaints the companio | fixed: Review keeps focus, treatments record a disposition, ranked findings, "Ask Sol about this finding" | R2-F | ux-shell-browser and the view suites |
| U2-14 | Medium | Feedback | After "Save responsibility" the record is listed under "Ungrouped" at y 2,203 px while the stage stays at scro | fixed in every shell: saved record scrolled into view and lit | R2-F | ux-shell-browser and the view suites |
| U2-15 | Medium | Feedback | Save toast is `position: fixed` at the bottom centre (x 602–624, y 832–840, 192–235×38–46) over the stage and  | fixed: 5 s top-right toasts without the header duplicate | R2-F | ux-shell-browser and the view suites |
| U2-16 | Medium | Editors | Create dialogs in Ch4–10 are 740×860 wizards (Responsibility / Traceability / Review …) on a 900 px viewport;  | partly: required-field mark; dialogs focus their first field; steps as sections only for Freeze, the create wizards still page | R2-F, R2-G | studio-dialog-browser |
| U2-17 | Medium | Change banner | After a decision revision, "ADR‑001 changed · 16 affected records need review · Review impact → · ×" is render | fixed: notice scoped to affected chapters | R2-F | ux-shell-browser and the view suites |
| U2-18 | Medium | Layers | On Ch4 Work, clicking the already‑on "Process" layer switched all eight on ("2 of 8 visible" → "8 of 8"), anno | fixed | R2-F | ux-shell-browser and the view suites |
| U2-19 | Medium | Explorer | "Explore all perspectives" replaces the Model tab in place (URL gains only `focus=api`) with a second toolbar  | fixed | R2-F | ux-shell-browser and the view suites |
| U2-20 | Medium | Responsive | At 768 px and at 200 % zoom (720 CSS px) every Model toolbar label folds to an icon: Diagram, Responsibilities | fixed: labels kept at 768 px and 200 % zoom; one Export menu (phase 3, notation-view) | R2-F | ux-shell-browser and the view suites |
| U2-21 | Medium | Review desk | Ch11 desk: 189 text nodes at 10.5 px, 23 at 10 px, 41 at 11 px; 74 px cells clip "≥ 99.9 % · 43.2 min in 30 da | partly: 12 px floor and 44 px controls; desk geometry widened by the lead so cells stop truncating | R2-F | ux-shell-browser and the view suites |
| U2-22 | Medium | Phone | Ch4 diagram on 390 px is `scale(0.62)`: node text 12 px → 7.4 px effective; the toolbar is 8 unlabeled icons p | fixed for Chapter 4 | R2-F | ux-shell-browser and the view suites |
| U2-23 | Medium | Phone | Ch4 phone header stacks "Chapter 4 milestones met 50 % · 4 of 8 milestones met · sample objects may be illustr | fixed | R2-F | ux-shell-browser and the view suites |
| U2-24 | Medium | Phone nav | Ch1–3: a hamburger "Toggle chapter navigation" top‑right (focus stays on `body`, not a dialog) and a bottom "S | fixed for the chapter menu; companion drawer (phase 3) | R2-F | ux-shell-browser and the view suites |
| U2-25 | Medium | First run | "Next: Confirm the project brief" in Ch1 does nothing visible on either project (no dialog, no scroll, focus t | fixed: Next actions have targets; dialogs focus the first field, not the close button | R2-F, R2-G | studio-dialog-browser |
| U2-26 | Low | Naming | Three naming sets for the chapters: sidebar ("Quality drivers", "Application realisation", "Logical technology | fixed across 40 files: sentence case, one naming set; Chapter 10 standardised to "Deployment / runtime" (lead) | R2-F, R2-G | review, security suites |
| U2-27 | Low | Spelling | British and American forms mixed: "realisation" (60 leaf‑text hits) vs "realization" (412); "Organisation guid | fixed: "realization" in chapter names, British prose | R2-F, R2-G | ux-shell-browser and the view suites |
| U2-28 | Low | Jargon | Still on screen: "Object lens", "backlinks" (30 hits), "ghost" / "Preview editable ghost", "anti‑pattern" (13) | partly: glossary in every shell; "ghost", "artefact lens", "Walk the rounds", "Probed" gone; "Object lens" and "backlinks" remain | R2-F | ux-shell-browser and the view suites |
| U2-29 | Low | Shell wording | Readiness: "Chapter 1 readiness 0 % · 0 of 6 milestones · Review milestones" (popover) vs "Chapter 4 milestone | fixed | R2-F | ux-shell-browser and the view suites |
| U2-30 | Low | Keyboard | 25 sidebar stops precede the tab bar on every page (24 in Ch1) and 41 precede the canvas on Model; tabs are `b | fixed: tablist with arrow keys, named milestones group | R2-F | ux-shell-browser and the view suites |
| U2-31 | Low | Reduced motion | With `prefers-reduced-motion: reduce`, Ch4 Work has 0 transitions but Ch4 Model still has 438 elements with a  | fixed: 0 transitions under reduced motion (from 438) | R2-F | ux-shell-browser and the view suites |
| U2-32 | Low | Output | "Preview working SDD" opens a new tab (`/api/export?…&format=html&view=1`) without warning and with no way bac | fixed: previews open a new tab with noopener and say so; downloads under one menu; project export named _Project_Export.json | R2-G | ux-shell-browser and the view suites |
| U2-33 | Low | Output | "Freeze an immutable SDD baseline" has no Freeze action; its only primary is "Run checks". The "Frozen baselin | fixed: Freeze shows "Before freezing" preconditions and is disabled with its reason until the checks are current; the empty baseline select is hidden | R2-G | ux-shell-browser and the view suites |
| U2-34 | Low | Offline | Saving with the server stopped shows "Change not saved" and "The workbench could not reach its server. Your in | fixed | R2-F | ux-shell-browser and the view suites |
| U2-35 | Low | Ch1 editors | "Add requirement" opens a dialog titled "Add an artefact" with an "Artefact type" select of eight types (requi | fixed | R2-F | ux-shell-browser and the view suites |
| U2-36 | Low | Empty states | Blank Ch4 Work companion shows empty "ATTRIBUTES" and "RELATIONSHIPS · 0" headings and an "Object lens · work" | fixed: empty companion headings hidden; the Diagram empty state links to the chapter's Work tab (lead) | R2-F | ux-shell-browser and the view suites |
| U2-37 | Low | Projects | The create dialog is 810 px tall with "Create & open Chapter 1 →" below the fold at 900 px; "Saved project tem | fixed | R2-F | ux-shell-browser and the view suites |
| U2-38 | Low | Visual system | Distinct font sizes per page: projects 8, Ch1 Work 12, Ch4 Work 9, Ch4 Model 14 (7–20 px), Ch11 Model 13, Ch4  | partly: font-size tokens, half-pixel sizes snapped, 845 colour literals replaced by tokens (4,437 to 3,604) | R2-F | ux-shell-browser and the view suites |
| U2-39 | Low | Ch1 at 1100 px | Below 1200 px the Ch1–3 companion becomes a sticky bottom bar that covers the stage's action row ("Review & ed | fixed | R2-F | ux-shell-browser and the view suites |

## Diagram proposals (12)

| Proposal | Title | Status | Commit |
|---|---|---|---|
| Proposal | Title | Effort and closes | Status | Commit |
|---|---|---|---|---|
| P1 | Relationship notation kit | S, closes D2-01/02/04/05 | done | R2-C |
| P2 | In-house layered layout with corridor routing | L, closes D2-11/12/13/14 | mostly done (crossings in dense cases, no Brandes–Köpf, grouped speed) | R2-C |
| P3 | SDD figure parity and artifact manifest | M, closes D2-17/28/29 (C-12) | partly (renderer, SDD HTML figures, manifest; no PDF/DOCX figures, no baseline artifact manifest) | R2-C |
| P4 | Viewpoint catalogue from the one model | M, closes D2-06/07/08/10 | done | R2-C |
| P5 | Annotation layer: findings, risks, decisions on the picture | M, closes D2-25 | partly | R2-C |
| P6 | Diagram diff between baselines | M, closes D2-25 (diff) | done without the change-list link | R2-C |
| P7 | Vitals heat overlay on the deployment diagram | S–M | done | R2-C |
| P8 | Journey swimlanes to BPMN | S–M | partly (pools, message flow, BPMN XML; no intermediate events) | R2-C |
| P9 | Diagram-as-code exports | M, closes D2-30 (C-10) | done | R2-C |
| P10 | Accessibility of diagrams | S–M, closes D2-26 and part of C-11 | mostly done (no screen-reader test) | R2-C |
| P11 | Sol explains and critiques a diagram | S | done as a hook (explainDiagram, window.aiwDiagramPacket) | R2-C |
| P12 | Server-persisted arrangements | M (C-09), closes D2-16 in part | not done (needs the arrangement command) | R2-C |


## 5. Evidence

- Regression reports (`AIW_REPORT` JSON) and suite logs for every run named above are kept in the session scratchpad under `r2/`; the final run's report is `r2/reg-final.json`.
- Measured before/after numbers are in the commit messages and in the per-workstream reports summarised in §4 (diagram crossings and dimensions, Chapter 7 switch time, 305-object page sizes, bundle sizes per route, lint counts, duplicate-helper bytes, timer counts).
- Screenshots before and after for the UI/UX High findings are in the session scratchpad `r2/F/shots/`.

## 6. What remains, honestly

- Diagrams: crossings stay high in dense or adversarial layouts; grouped layout of 200 elements takes about 2.3 s; PDF and DOCX carry no figures; pins are validated server-side but the view still keeps them in localStorage until it adopts the arrangement command; ten relationship kinds are still not drawn; no screen-reader test.
- Brain: the generate path keeps its own review prompt beside the reasoning path's source check (I2-08); no real-model evaluation run exists because no key was present.
- Frontend: the create wizards of Chapters 4–10 still page their steps; tiny facade chunks remain in the bundle; the dynamic 2-cycles around workbench-ui remain; 43 duplicate helper groups that depend on per-view state remain.
- Backend: the full change journal is still embedded by default until every view adopts the sections response; per-event diffs, an ETag on the project read, a static asset binding for the hosted Worker and a Miniflare parity test are not done.
- UI/UX: the Chapter 1–3 and 4–11 shells are still two shells (one prefetches the other); the companion drawer on phones is not a dialog yet.

## 7. What this report does not claim

- No licence, legal, independent-review, KMS or production acceptance status changed; the review packs for those authorities are the audit documents and this report, and their true status is "not reviewed by an external authority".
- No language model was connected in any run of this round; every Sol path was exercised against provider doubles and the recorded contract.
- One browser (Chromium) on one shared container; timings are single runs and vary with load.
- The release notation above is a candidate until the owner records the release; the manifest and package digests identify exactly what was tested.
