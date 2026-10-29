# Round 6 design: a model in, exact semantics, a target state, documents that render where they live, a governed knowledge expansion, the narrative trace, and Sol verified live

Baseline: `010ddb9` (AIW v0.10.0-rc.10.73.10 candidate). Asked for: implement the adoption assessment of 2026-10-02 (what Structurizr, PlantUML, Mermaid, draw.io, ArchiMate and BPMN have that AIW should adopt, and what the fifteen repositories offer), and verify the pending live-model implementations with the owner's OpenAI key.

What landed, what was measured, and what remains: `audit/round6/REPORT.md`. The walkthrough refreshed on this round: `audit/round6/WALKTHROUGH.md`.

## What this round takes, and what it leaves

Taken (each a workstream below):

- a model brought in from Structurizr DSL, an ArchiMate exchange file, BPMN 2.0, draw.io with C4 or ArchiMate shapes, the C4 subset of Mermaid and PlantUML, and MADR decision records, interpreted into proposals with provenance through the brief's path, so nothing imported is a record until a person accepts it;
- typed relationships with ArchiMate's validity rules as a hard check; pools, message flows, boundary events, sub-processes and data objects on the process model, tied to contracts, data and recovery; a sequence picture per contract and journey step; a state picture per data definition; structural process checks and a token walk;
- plateaus and gaps on Chapter 11, so a design says as-is, next and target, with readiness per plateau and the picture drawn as of a plateau;
- Mermaid figures in the Markdown edition of the SDD, MADR export of decisions, a technology-category icon set on Chapter 7, and build-up animation of a picture;
- a governed knowledge expansion authored in AIW's own words with attribution: a trade-off catalogue, reference latency figures and an estimation worksheet as deterministic readings, a scaling pass on Chapter 10, resilience drafted beside security on Chapter 9, two more reference briefs;
- the narrative trace: "what happens when" told from the records along the trace;
- a live acceptance probe for Sol that records receipts as evidence.

Left, named so nobody assumes it is done: vendor logos (trademarks; the icon set is by technology category); Structurizr `!include`, workspace extension and `!docs`; BPMN choreography and conversation diagrams; draw.io shapes without C4 or ArchiMate metadata; ArchiMate relationship derivation beyond the validity check; knowledge connectors and feeds (the owner's decision from round 5); papers as authoritative sources (they cannot be fetched and hashed from this environment, so they are cited as further reading only); the Anthropic wire live (no Anthropic key was supplied); and the items round 5 left (SSO and roles, presence and comments, delivery-tool exports, locales, telemetry and plans).

## Measured today (at `010ddb9`)

| Fact | Value |
|---|---|
| Diagram-as-code and exchange formats written | 6 code formats (Structurizr DSL, C4-PlantUML, Mermaid, draw.io, ArchiMate exchange, BPMN) and 4 exchanges (native package, Orbus, Ilograph, Eraser) |
| Formats read | the native package (a whole-document restore through the recovery route), a requirements workbook (.xlsx), a brief (.txt, .md, .docx) |
| Relationship types on the connected model | about forty AIW kinds; an ArchiMate type only at export time; no validity check; the Matrix's direct cells carry the AIW kind only |
| Process model | elements task, gateway, event, account; transitions with a condition; pools and message flows derived, never recorded; no timers, errors, sub-processes or data objects; gateways export as exclusive; process findings: none; the process model exists for the bank reference only |
| Sequence and state pictures | none |
| Target state | none: one state per project, no plateaus, no gaps; actions carry no plateau |
| SDD Markdown figures | inline SVG in a `<figure>` block; Mermaid: none |
| Decision records out | none per decision (MADR: none) |
| Chapter 7 glyphs | type glyphs only; no technology icons |
| Animation | none |
| Knowledge shipped | 327 Playbook passages and 328 catalogue records; trade-off passages 0; latency reference figures 0; scale findings 0; Chapter 9 drafter uses 3 of the 7 control categories |
| Reference briefs | 3 |
| Narrative | the trace lights a chain; nothing tells it |
| Sol live evidence | one live run on the OpenAI wire on 2026-09-20 (`evidence/brain-integration/live-llm.json`, gpt-4.1-mini); the round-5 modes (journey, review) and the Anthropic wire never live |

## Contracts shared by the workstreams

### Contract I · a model in (`interpretModel`)

`public/model-interpreter.js` (re-exported from `shared/`) exports `interpretModel(text, {name, format})`, format detected when not given, returning:

```
{format: 'structurizr'|'archimate'|'bpmn'|'drawio'|'mermaid-c4'|'plantuml-c4'|'madr'|'unknown', name, hash,
 passages: [{id:'P-001', start, end, text}],
 elements: [{id, kind, name, description, technology, tags:[], parent, external, passages:['P-..'], confidence:'stated'|'inferred', attrs:{}}],
 relationships: [{id, from, to, label, technology, kind, passages, confidence}],
 views: [{id, title, kind, elementIds}],
 questions: [{key, question, forType}],
 report: {omitted:[], counts:{}}}
```

Element kinds are normalised: person, stakeholder, system, container, component, interface, service, capability, data, node, environment, zone, instance, process, task, event, gateway, lane, pool, requirement, outcome, constraint, driver, decision, alternative, boundary, technology. Relationship kinds: uses, flow, message, sequence, realizes, serves, assigned, composes, accesses, triggers, association. Every element cites the passages (source lines) it came from; a value that is not a span of the cited text is `inferred`. MADR files produce decision and alternative elements through `interpretMADR(text)` in `public/madr.js` (workstream E), which the interpreter calls for the `madr` format.

`modelDraft(p, chapter, foreign)` in `public/journey-drafter.js` returns records in the drafter's shape (`{key, kind:'guided', type, title, answers, fields, provenance}`) so acceptance stays `guide.start` → `guide.draft-answer` → `guide.commit-draft`. The mapping: person → Chapter 1 actor; stakeholder → stakeholder; process, task → journey step; requirement, outcome, constraint → their Chapter 1 kinds; driver → Chapter 2 quality driver; decision and alternative → Chapter 3; system (internal) and container → Chapter 4 responsibility and Chapter 5 component; component → Chapter 4 responsibility; service, capability → Chapter 6 capability; technology → Chapter 7 need and option; interface and relationships between containers or to an external system → Chapter 8 contract (event when the relationship or technology says async, queue, topic, event); data → Chapter 8 data; external system → Chapter 8 party; environment, node, zone, instance → Chapter 10 environment, zone, plan, placement. BPMN tasks, events, gateways and sequence flows become `process.element` and `process.transition` extras committed through `workspace.apply`, as `commitExtras` already does for relationships. Provenance: `provenance.journey = {mode:'model', sourceId, passages, ...}`; `journeyProvenance` accepts `mode:'model'` only with a `sourceId` naming an evidence source of kind `model`. `draftChapter(p, ch, {brief, model})` prefers the model's stated elements and falls back to the brief rules for what the model lacks; with no model source its output is byte-identical to today (the reference-projects evidence guards this).

### Contract T · typed relationships, process semantics, sequence and state

- `architectureModel(p).relationships[i].archimate = {type, valid, rule}` from `archimateRelationship(wanted, sourceType, targetType)`; `relationshipFindings(p)` returns `{id:'RELATION-INVALID:'+r.id, code:'RELATION-INVALID', level:'error', objectId: r.from, …}` for recorded (not derived) relationships only. The Matrix's direct cells and the Key name the type.
- Process elements gain `eventType` ('none'|'message'|'timer'|'error'|'signal'), `position` ('start'|'intermediate'|'end'|'boundary'), `attachedTo` (a task id, boundary only), `gatewayType` ('exclusive'|'parallel'|'inclusive'|'event'), `parentId` (a `subprocess` element), `partyId` (an external pool) and `dataId` (a Chapter 8 data definition, kind `data`); transitions gain `kind` ('sequence'|'message') and `contractId`. `withProcessModel` creates the process model for every project; the bank reference routes stay the bank's. `processFindings(p)` returns codes PROC-START, PROC-END, PROC-REACH, PROC-GATEWAY, PROC-DANGLING, PROC-BOUNDARY, PROC-MESSAGE and is part of Chapter 1's checks.
- Scene `sequence` (chapters 8 and 1): nodes `kind:'lifeline'` (one per component or party), edges `kind:'message'` with `step` 1..n and the operation as label; arrangement `sequence` (lifelines as columns, messages as rows). Scene `lifecycle` (chapter 8): nodes `kind:'state'` from a data definition's `lifecycle.states`, edges `kind:'transition'` labelled by the contract that moves it; `interfaces.data` accepts `lifecycle: {field, states:[], transitions:[{from, to, contractId}]}`.
- The BPMN export carries the new semantics; the Mermaid and PlantUML exports carry `sequenceDiagram` and `stateDiagram-v2` for the two scenes.

### Contract S · plateaus

`p.roadmap = {plateaus:[{id:'PLT-nnn', title, kind:'current'|'transition'|'target', order, purpose, due}], assignments:{[objectId]:{introducedIn, retiredIn}}, history}`. Commands `review.plateau {id?, title, kind, order, purpose, due}`, `review.plateau-remove {id}`, `review.plateau-assign {objectId, introducedIn, retiredIn}`; `review.action` gains `plateauId`. `public/roadmap-domain.js` exports `plateausOf(p)` (ordered), `plateauMarks(p, plateauId)` → `{marks:[{id, state:'ghost'|'changed'|'dimmed'}], info:{introduced, retired, actions}}` for the marks channel (source `plateau`), `plateauReadiness(p)` (readiness of the records each plateau introduces), `roadmapFindings(p)` (a plateau without actions, an introduced record without an action, a target with no path) and `transitionSection(p, edition)` (Markdown for the SDD, wired by the lead). The ArchiMate exchange carries plateaus, gaps and work packages.

### Contract F · figures by format, icons, build-up

- `sddFigures(project, {code:'mermaid'})` adds `figure.mermaid` from `diagramCode('mermaid', D, L)`; `sddDocument(p, {figures:'mermaid'})` emits per figure a bold `Figure N · title` line, a fenced ```mermaid block and a caption paragraph, and no `<figure>`; the HTML, Word and PDF builders never receive this variant. The route is `GET /api/export?chapter=11&format=md&figures=mermaid` (the lead adds the parameter to `worker.js`); the Output export block offers "Markdown with Mermaid figures". Mermaid emitters: `erDiagram` for the data scene, `sequenceDiagram` and `stateDiagram-v2` for Contract T's scenes.
- `public/madr.js` exports `interpretMADR(text)` (Contract I shape) and `madrExport(p)` → `{files:[{path, text}]}` (one MADR Markdown per decision: title, status, context, decision drivers from the quality drivers, considered options from the alternatives with their benefits and costs, decision outcome, consequences, confirmation from evidence); Chapter 3's Output tab offers the download.
- `public/technology-icons.js` exports `iconFor(text)` → an icon id or null (database, queue, cache, gateway, function, container, browser, mobile, storage, identity, search, stream, scheduler, model, network, message) and `ICONS[id] = {title, path}` (24 × 24 path data). `notation-model` sets `node.icon` for stack-scene nodes (wired by the lead); `notation-svg` draws it in the glyph slot from zoom 0.8 and the Key lists the icons drawn.
- Build-up: a `build` menu in the notation toolbar (`data-nt-menu="build"`) with modes layer, trace and plateau and Next, Back, Play; the steps are painted through the marks channel (source `build`, `dimmed` for what is not yet revealed); Escape clears.

### Contract K · knowledge in AIW's words

`public/brain-tradeoffs.js` exports `BRAIN_TRADEOFFS = {id:'AIW-TRADEOFFS-1', authored:'AIW', passages:[{id:'TO-001', title, text, chapters, records, sha256, attribution:[{title, url, licence}]}], figures:[{id:'LN-001', title, value, unit, text, sha256, attribution}]}`: fifteen trade-offs (each: the two sides, the forces, when each wins, what AIW records and where, the questions to ask) and the reference latency figures, written by AIW and attributed to the CC BY sources they follow. It is a `brain-method` source for retrieval with receipts and currency, counted in the bundle's data budget, named in the withdraw list, and never scoring. `scaleReadings(p)` in `public/desk-capacity.js` derives per-component demand (requests a second, storage, bandwidth) from the Chapter 2 targets and Chapter 8 data, compares it with the placements, and returns `{inputs, derived, findings, figures}`; its findings (SCALE-*) join Chapter 10's checks as to-confirm. Chapter 9's drafter proposes a 'Service disruption' threat and a 'Recovery & availability' control for each external contract and each zone through `resilienceDrafts(p)` in `public/security-domain.js` (wired by the lead into the drafter); `securityFindings` adds RESILIENCE-MISSING (to confirm) for an external contract with neither a resilience control nor timeout, retry and failure policies.

### Contract L · the live probe

`scripts/sol-live-check.mjs` runs only with a key in the shell (OPENAI_API_KEY with AIW_LLM_MODEL, or ANTHROPIC_API_KEY): it starts the server on a scratch database, creates a project from the bike-share brief, runs field, journey (Chapter 1) and review (Chapter 4) once each, waits for completion, and writes `evidence/sol-live/<date>-<provider>.json` with `{at, provider, model, effort, pins, runs:[{mode, id, status, stopReason, usage, checks, fallback}], passed, notes}`: no prompt content, no key. It exits non-zero on a failed run. It is not in the release gate.

## Workstreams and ownership

| Workstream | Owns | Must not touch |
|---|---|---|
| R6-B a model in | new `public/model-interpreter.js` (+ `shared/`), `public/journey-drafter.js`, `public/journey-draft-ui.js` and its CSS, `public/brief-reader.js` (model file kinds), `public/projects.js`, `shared/projects-domain.js`, `public/chapter-guide.js` (`journeyProvenance`), `worker.js` (`POST /api/projects` body limit and the model field), fixtures under `evaluation/model-fixtures/`, new suites `model-interpreter-validate.mjs` and `model-import-browser-validate.mjs`, `journey-drafter-validate.mjs`, `projects-validate.mjs`, `journey-draft-browser-validate.mjs` | `model-exchange.js`, the notation files, the chapter domains, `madr.js` (calls it through the contract only) |
| R6-C exact semantics | `public/architecture-model.js`, `public/notation-palette.js`, `public/model-matrix.js`, `public/process-model.js`, `public/process-editing.js`, `public/architecture-commands.js`, `public/notation-model.js`, `public/notation-layout.js`, `public/notation-svg.js`, `public/notation-code.js`, `public/interfaces-domain.js`, `public/exchange-view.js`, Chapter 1's findings function, `notation.css`, the notation, notation-layout, notation-browser, notation-code, exchange-browser, interfaces, perspective-view and architecture-case suites, new `process-semantics-validate.mjs` | `notation-view.js`, `sdd-*.js`, `review-domain.js`, `canonical-command.js` (no new command names are needed) |
| R6-D plateaus | new `public/roadmap-domain.js` (+ `shared/`), new `public/roadmap-ui.js` and CSS, `public/review-domain.js`, `public/canonical-command.js`, `public/readiness-model.js`, `public/model-exchange.js` (ArchiMate plateaus, gaps, work packages), the review, readiness and reconciliation suites, new `roadmap-validate.mjs` and `roadmap-browser-validate.mjs` | `review-ui.js` (the lead mounts the editor), `notation-view.js` (the lead wires the plateau field through Contract S), `sdd-document.js` |
| R6-E documents | `public/sdd-document.js`, `public/sdd-figures.js`, `public/sdd-renderer.js`, `public/review-ui.js` (export block), `public/validate-view.js` (Chapter 3 Output MADR download), new `public/madr.js` (+ `shared/`), new `public/technology-icons.js`, `public/notation-view.js` (build menu, plateau field, icons in the Key), `validate.css`, the sdd-documents-browser, validate-browser and ux-shell-browser suites, new `sdd-mermaid-validate.mjs`, `madr-validate.mjs`, `technology-icons-validate.mjs`, `notation-build-browser-validate.mjs` | `worker.js` (the lead adds the `figures` parameter), `notation-model.js`, `notation-svg.js` (icons are drawn by C against the contract), `review-domain.js` |
| R6-F knowledge and scale | new `public/brain-tradeoffs.js` (+ `shared/`), `public/architecture-brain.js`, `public/knowledge-governance.js` (withdraw list, currency), `public/desk-capacity.js`, `public/runtime-domain.js`, `public/security-domain.js`, `public/desk-view.js` (scale readings), `shared/reference-journeys.js` (two briefs), `scripts/reference-projects-evidence.mjs`, `evidence/reference-projects.json`, the brain, brain-integration, desk, desk-browser, security, runtime and reference-projects suites, new `brain-tradeoffs-validate.mjs`, `scale-readings-validate.mjs`, `resilience-validate.mjs` | `journey-drafter.js` (the lead wires `resilienceDrafts`), `client-bundle.mjs` (report the data budget entry), `shared/projects-domain.js` |
| R6-G the narrative trace | new `public/trace-narrative.js` (+ `shared/`), `public/story-view.js`, `public/story-model.js`, `public/story-layout.js`, `story.css`, the story-browser suite, new `trace-narrative-validate.mjs` | `notation-view.js` (the lead adds the "Read as a story" action), `sdd-document.js` (the lead wires `narrativeSection`) |
| Lead | `audit/round6/`, the live probe (Contract L) and `evidence/sol-live/`, the cross-unit wiring named above, `client-bundle.mjs`, `package.json` scripts and the release field, `scripts/lint-baseline.json`, the regressions on clean worktrees, the commits, the walkthrough refresh, the report, the package | — |

Rules every workstream keeps: work from source files; no new path beside an old one (migrate, adapt, retire); every new behaviour has a suite; no test is skipped, disabled or quarantined; no secret in any file; no model identifier in code or commit text; the units do not commit (the lead commits each verified unit from its worktree); a unit that needs a line in another unit's file writes the exact patch into its report for the lead.

The authority chain is unchanged: an imported model is proposals until a person accepts each chapter through the guide commands; typed relationships, process checks, plateau readings, figures, scale readings and the narrative are derived from the saved records; the trade-off passages are AIW-authored, released with their hashes and never promoted by a model, and no knowledge affects scoring; the live probe records receipts and never writes to a project; `productionAccepted` stays false.
