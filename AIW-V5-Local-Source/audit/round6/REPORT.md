# Round-6 report: a model in, exact semantics, a target state, documents that render where they live, a governed knowledge expansion, the narrative trace, and Sol verified live

Baseline before this round: `010ddb9` (AIW v0.10.0-rc.10.73.10 candidate). Result: `4a5a62d`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.11** (candidate; see §4).

Asked for: implement the adoption assessment of 2026-10-02 and verify the pending live-model implementations with the owner's OpenAI key. The design (`audit/round6/DESIGN.md`) says what this round takes and what it leaves.

## 1. What landed

### 1.1 A model in (R6-B)

- `public/model-interpreter.js` reads Structurizr DSL (inline blocks, hierarchical identifiers, deployment environments, nodes and instances), ArchiMate exchange files and Archi's native format (every element type, every relationship kind, nesting, views), BPMN 2.0 (pools, lanes, every task type, event definitions and positions, boundary events, gateways by type, sub-processes, conditions, message flows, data objects), draw.io with C4 or ArchiMate shapes (and AIW's own export labels; compressed diagrams decoded where the browser can), Mermaid C4 and flowcharts, C4-PlantUML, and MADR decision records, into one shape: elements with normalised kinds, relationships, views, questions and a report of what was left out. Every element cites the source lines it came from and is stated only when its name is a span of them. Input is bounded (2,000,000 characters, 500 per kind, XML depth 100, no entity expansion, markup kept as text).
- The drafter prefers the model's stated elements per the design's mapping (people to actors, tasks to journey steps in flow order, systems and containers to Chapter 4 responsibilities and Chapter 5 components, named technologies to Chapter 7 options, relationships and interfaces to Chapter 8 contracts and parties, data to data definitions, environments, nodes and instances to Chapter 10, drivers to Chapter 2, decisions to Chapter 3) and falls back to the brief's rules for what the model lacks; with no model its output is byte-identical to before. BPMN events, gateways and flows become process commands with the new semantics, and an imported sub-process stands in the process model as its own element. Every record created from a model carries `provenance.journey.mode = 'model'` and the source it came from.
- The Projects page starts a project from a model file beside or instead of a brief (2 MB cap, the interpreted counts and the report lines shown; the text kept as an evidence source with a server-side hash); the journey draft surface has a model mode with the model's lines quoted beside the brief's passages; Chapter Work and the Proposals list offer "Draft from the model".

### 1.2 Exact semantics (R6-C)

- Every relationship of the connected model carries its ArchiMate 3.1 type, whether the standard allows it between its two element types, and the rule that decided it, from one table in the notation palette; a recorded relationship the standard forbids is RELATION-INVALID on the chapter that owns its source record (to fix); relationships implied by fields are never findings. The Matrix's direct cells and the Key name the type; the ArchiMate exchange reads the same table (the bank's exchange goes from 233 typed, 135 associations and 62 downgraded to 276, 92 and 26).
- Every project has a process model. Elements carry event type and position, the task a boundary event hangs on, gateway type, sub-process, external pool and data object; flows are sequence flows or message flows naming their contract; every reference is checked. Seven structural checks join Chapter 1's checks. The companion's dialogs offer the new fields; "Walk this scenario" moves a token along the chosen path with Back, Next and Play through the marks channel.
- The process picture draws pools, message flows, boundary events, sub-processes (collapsed above twelve elements), data objects and typed glyphs. Two pictures join the Diagram's picker: a sequence (Chapters 8 and 1) with lifelines and ordered messages, narrowed to the selected contract or journey step and whole with nothing selected; and a data lifecycle (Chapter 8) from states recorded on a data definition and the contracts that move them. BPMN, Mermaid and PlantUML carry the new semantics; the eighteen existing scenes lay out byte-identically.

### 1.3 Plateaus (R6-D)

- `public/roadmap-domain.js`: plateaus (current, transition, target) with order and due date, assignments of records to the plateau that introduces and the one that retires them, and a plateau on each action, all through reviewed commands with revision checks. A project without plateaus behaves exactly as before.
- Readings derived from them: what is present at a plateau, marks for the build-up (introduced ringed, later ghosted, retired dimmed), readiness per plateau, four findings (a plateau without actions, a record introduced with no action, a target with no path, an order that contradicts itself) on Chapter 11's checks, a Transition section in both SDD editions and for every audience, and Plateau, Gap and WorkPackage elements in the ArchiMate exchange.
- Chapter 11 Work has a Plateaus editor (table, Gap reading, Assign dialog, the plateau on each action) and the build-up menu gains "By plateau".

### 1.4 Documents that render where they live (R6-E)

- The Markdown edition of the SDD can carry its figures as Mermaid code blocks (`figures=mermaid`, offered on the Output tab beside the other editions): a flowchart per scene, C4Context for the context view, an entity diagram for the data scene; the HTML, Word and PDF builders never receive it. The bank's full edition is 245,877 bytes as Mermaid against 855,378 as SVG, with 18 figures.
- Chapter 3's Output offers its decisions as MADR records, one Markdown file per decision in a zip, and a MADR file reads back into the same proposals the brief path produces.
- A technology-category icon set (sixteen categories, each a single path, no vendor marks) drawn on Chapter 7's technology choices from the chosen product's words and listed in the Key.
- Build-up animation on every Diagram: by layer, along a lit trace or by plateau, with Next, Back and Play, painted through the marks channel, the step named under the toolbar, Escape clearing.

### 1.5 Knowledge in AIW's words, scale readings, resilience (R6-F)

- `public/brain-tradeoffs.js`: fifteen trade-off passages (209–218 words each, with the two sides, the forces, when each wins, what AIW records and where, and the questions to ask) and eleven reference latency figures, written by AIW and attributed to the sources they follow with their verified licences; a method source for the Brain's retrieval with receipts and currency, never scoring, 42,707 bytes.
- Scale readings: from the Chapter 2 targets and the Chapter 8 data, per-component demand against the Chapter 10 placements and the latency figures, with four findings on Chapter 10's checks (to confirm) and a Scale reading on the Chapter 11 desk; without numeric targets one line says so.
- Resilience beside security: Chapter 9's drafter proposes a disruption threat and a recovery control for each external contract and each zone, and a finding names an external contract with neither a resilience control nor timeout, retry and failure policies.
- Two more reference briefs (a municipal parcel-locker network, a public library's reservations), drafted to all eleven chapters (177 and 152 records) with the evidence regenerated; the three existing projects' counts are identical in every chapter.

### 1.6 The narrative trace (R6-G)

- `public/trace-narrative.js` tells what happens when, from the records along a trace: an ordered story through driver, decision, responsibility, component, capability, realisation, contract or data, control, placement and running part, each paragraph one to three sentences from the records' own fields, every gap named; bounded, deterministic, no model call. The Story view's Walk reads it, "Read as a story" opens it on a selected step and in the trace companion, and the SDD's full edition carries one section per journey step (the executive edition the first).

### 1.7 Sol verified: the probe (lead)

- `scripts/sol-live-check.mjs` runs only with a provider key in the shell: it starts the server on a scratch database, creates a project from a reference brief, asks Sol once in the field, journey and review modes as the workbench does, waits for each run and writes receipts as evidence (provider, model, pins, each run's status, stop reasons and usage, what the checks accepted or withheld) with no prompt content and no key. The test double now answers the field and journey contracts too, and `--mock` proves the probe end to end.

### 1.8 Integration (lead)

- The cross-unit wiring: the Output tab mounts Chapter 3's decision records, Chapter 1 Work and the Proposals list offer the model draft, the Transition and narrative sections are in both editions, the trace companion reads as a story, the icons are on the technology scene, the relationship checks are registered for Chapters 4 to 7 in the chapter table (an import inside the domain modules would have made a cycle), the exchange reads one typing table, the export route takes `figures=mermaid`. Thirteen new suites join the gate; the bundle budgets are re-based on the measured sizes.

## 2. Measured before and after

Taken in headless Chromium at 1440×900 on local servers with scratch databases and no API key, by the workstreams' probes and the lead's walkthrough probe, on the reference projects and the fixtures named; the bundle, build and install figures by the gates.

| What | Before | After |
|---|---|---|
| Formats read | the native package, a requirements workbook, a brief | Structurizr DSL, ArchiMate exchange and Archi, BPMN 2.0, draw.io (C4, ArchiMate and AIW shapes), Mermaid C4 and flowcharts, C4-PlantUML, MADR; a 1 MB DSL in 131–133 ms |
| Round trip of AIW's own exports (bank, 25 pictures) | none | Structurizr 255 of 255 names and 235 of 235 relationships; ArchiMate 369 of 369; PlantUML, Mermaid and draw.io 362 of 369 (the rest controls and threats, reported); BPMN 12 of 12 |
| A project drafted from a Structurizr fixture with the bike-share brief | — | 107 records, 40 from the model: Chapter 4 7, Chapter 5 7, Chapter 7 7, Chapter 8 10, Chapter 10 6 with their values stated; the rest from the brief's rules |
| Relationships typed | none of the bank's 410 | bank 410 typed (293 keep the wanted type, 40 fall back to an association implied by a field); recorded relationships 68, 67 typed, 0 invalid; clinic 43/43/0; permits 38/38/0; warehouse 36/36/0 |
| Process model | the bank only; task, gateway, event, account; no structural checks | every project; event type and position, boundary, gateway type, sub-process, pool, data object, message flows with contracts; 7 checks (0 raise on the bank; a broken fixture raises 6); the token walk |
| Sequence and state pictures | none | the bank's settlement contract: 4 lifelines, 4 messages; the whole reference 12 lifelines, 35 messages in 0.3 ms; 1,009 messages lay out in 32 ms |
| Target state | one state per project | plateaus with readiness per plateau; on the bank with three plateaus and five assignments, 4 marks per plateau, findings 5 before an action and 2 after; `plateauMarks` under 2 ms warm at 500 records per chapter |
| SDD Markdown figures | inline SVG only | Mermaid on request: bank full edition 245,877 B against 855,378 B SVG (18 figures); executive 16,449 against 98,391 (3 figures); clinic 226,856 against 775,076 |
| Decision records | none | MADR: the bank's 3 decisions, 7,840 B, read back with titles, statuses, drivers and options equal |
| Technology icons | type glyphs only | 16 categories; bank 15 of 18 options matched; the drafted references name only "compute" and "connectivity" (0 of 12 to 2 of 10) |
| Build-up | none | steps by layer: Chapter 4 Diagram 1, Chapter 8 2, Chapter 10 2, Chapter 4 Layers 6; along the trace from REQ-001 7 |
| Knowledge shipped | 327 Playbook passages, 328 catalogue records | plus 15 trade-off passages and 11 reference figures (42,707 B); ten trade-off questions retrieve 10 of 10 |
| Scale readings | none | five reference projects: three say no numeric target; parcel-lockers 20 requests a second at a stated peak over 9 components; library 0.8 over 8; findings as to confirm |
| Resilience | Chapter 9 drafter 3 of 7 control categories; no check | a disruption threat and recovery control per external contract and zone; RESILIENCE-MISSING 0 on all five references after drafting (Chapter 9 grows from 12/16/14/28/22 to 14/18/16/34/26 records) |
| Reference briefs | 3 | 5 (parcel-lockers 177 records, library-reservations 152), the first three identical in every chapter |
| Narrative | the trace lights a chain | every journey step of the four references tells 11 paragraphs (259–501 words); gaps named 7 / 43 / 14 / 17; the bank's SDD section 1,577 words; all narratives of a 500-per-chapter fixture in 21 s, of which the trace itself is 20 s |
| Sol live | the modes never exercised after round 4 | the probe proven on the double in field, journey and review; the live run blocked by this environment's network policy (§7) |
| Walkthrough | 35 steps from a brief to Chapter 11 and both editions | 47 steps in one run (0 page errors, 0 failed requests): a project from a model file and one from a brief, the drafted chapters, the pictures with their state, the trace told as a story, the build-up, the sequence, plateaus, the scale reading, the decision records, both SDD editions and the Mermaid edition (19 figures, 314,758 bytes); the full edition 36,585 words with 20 figures, the executive 2,208 words (`audit/round6/WALKTHROUGH.md`) |
| Client bundle | 127 script files; Projects route 928,625 B; chapters 2,198,505 B | 133 script files; Projects route 989,818 B of 1,010 KB; chapters 2,267,038 B of 2,260 KB budget 2,314,240 B; stylesheet 599,388 B; the trade-off pack a 41,373 B data chunk |
| Worker build | 152 server modules | 162 server modules |

## 3. Commits of this round

- `4a5a62d` build(integration): the round-6 wiring, the suites registered, the budgets re-based
- `dee7a77` feat(narrative): tell what happens when, from the records along a trace
- `847b8bb` feat(knowledge): trade-offs in AIW's words, scale readings, resilience beside security, two reference briefs
- `ee6a473` feat(documents): Mermaid figures in the Markdown edition, MADR decision records both ways, technology-category icons, a build-up of the picture
- `0ae5d24` feat(roadmap): plateaus, assignments and the target state on Chapter 11
- `e8c9342` feat(import): a model in — Structurizr, ArchiMate, BPMN, draw.io, Mermaid, PlantUML and MADR files read into proposals a person accepts
- `f714d17` feat(semantics): typed relationships, process meanings, sequence and state pictures
- `22eaff0` feat(sol): a live acceptance probe that records receipts as evidence; the test double answers every mode
- `d652db5` docs(design): round 6, a model in, exact semantics, a target state, documents that render where they live, a governed knowledge expansion, the narrative trace, Sol verified live
- the commit carrying this report, the walkthrough and the release field follows `4a5a62d`

## 4. Discipline kept

- Every unit was verified by one full regression on a clean worktree of the integrated round (147 of 148 suites pass under three workers; the scale budget suite, load-sensitive, passed alone twice on the same snapshot) and committed from that worktree's verified blobs, one commit per workstream, with the lead's cross-unit wiring carried in the owning unit's commit and named in its message. The live probe was verified and committed on its own earlier.
- The authority chain is unchanged: an imported model is proposals until a person accepts each chapter through the guide commands; typed relationships, process checks, plateau readings, figures, scale readings and the narrative are derived from saved records; plateaus and process semantics change only through reviewed commands with revision checks; the trade-off passages are AIW-authored, hashed, attributed and never scoring; the probe records receipts and writes nothing to a project; no model call approves, promotes or mutates anything.
- No security or governance was weakened: imported text is bounded, entities are never expanded, markup stays text; the process commands check every reference; the export route refuses any figure option but Mermaid on Markdown; the probe writes no key and no prompt content; no test was skipped, disabled or quarantined.
- No old and new path side by side: one typing table serves the model, the checks and the exchange; the process model is one for every project; the brief path and the model path share the drafter and the guide commands; the sequence and lifecycle pictures are entries of the Diagram's picker, not a second switcher.
- `productionAccepted` stays false. The release field advances to the candidate rc.10.73.11; the controlling baseline in the manifest script stays rc.10.73.6 until the owner records a release.

## 5. Gates at `4a5a62d`

| Gate | Result |
| --- | --- |
| `node check-syntax.mjs` | 483 application, service, script and verification modules pass |
| `node validate.mjs` (shell state in a vm sandbox) | passes |
| `node client-bundle.mjs` | no violations: chapters route 2,267,038 B of 2,314,240 B; Projects route 989,818 B of 1,034,240 B; stylesheet 599,388 B of 634,880 B; 133 script files of 140; the trade-off pack 41,373 B of 44,032 B as data |
| `node build.mjs` (Worker build) | passes: 162 server modules, `@anthropic-ai/sdk` 0.131.0 vendored, packaged imports and asset serving verified |
| `node scripts/lint.mjs` | 0 new problems; baseline 187 unchanged |
| `node release-checks.mjs` (every `test` and `test:*` script, provider keys stripped, Chromium for the browser suites, three workers) | 147 of 148 suites pass on the integrated snapshot that became `4a5a62d`; the one not passing under three workers is the scale budget suite (`test:scale --strict`, two of its bounds 361 ms and 329 ms against 300 ms under load), which passed alone twice on the same snapshot; the three release-field suites (`test:release-field`, `test:release-manifest`, `test:evidence`) pass again with the field at rc.10.73.11 |
| `npm run sol:live-check -- --mock` | passes against the test double on the OpenAI-compatible wire: the field draft, the Chapter 1 journey draft (36 cited answers) and the Chapter 4 model review (2 findings) complete and are accepted; evidence written with `live: false` |
| Clean install of a fresh `git archive` of `4a5a62d` (673 files) | `npm ci` completes (the four known moderate advisories in the migration tooling), 483 modules pass the syntax check, the client bundle builds within every budget, the Worker build packages 162 server modules with `@anthropic-ai/sdk` 0.131.0 vendored, 134 client script files and one stylesheet |

## 6. What remains, honestly

- **Sol live**: this environment's network policy denies api.openai.com, so the live run with the owner's key did not happen here; `npm run sol:live-check` runs it where the host is allowed and writes the evidence. The Anthropic wire stays unverified live (no key).
- **The model reader's edges**: Structurizr `!include`, `extends` and `!docs` are reported, not read; BPMN choreography and conversation diagrams, and message flows to pools, are not drafted; draw.io cells without C4, ArchiMate or AIW metadata are reported only; controls, threats and evidence have no element kind, so a round trip reports them.
- **A model alone**: a model states people, structure, flows and technology, never a requirement; Chapter 1 drafts the people it states and the brief rules the rest, and Chapters 4 onward develop a requirement, so a project started from a model without a brief drafts nothing there until requirements exist (the draft says so and points to Chapter 1). The walkthrough starts its model project from the model beside the brief.
- **The narrowed sequence**: the chapter's selected record narrows the sequence picture; with the shell always holding a selection, the whole chapter's sequence needs the selection cleared first (Escape), which the companion says.
- **Icons on drafted projects**: the drafter names technologies by category ("compute", "connectivity"), which the lexicon does not map; chosen products do.
- **Plateaus and the desk**: Assign is on the Plateaus table and the Gap reading, not yet on the desk's running-part rows; the per-plateau readiness needs the readiness model loaded, as it is in the worker and the browser.
- **The narrative's cost at scale**: one story is about 4 s on a 5,000-record document, all of it the trace's cost; the SDD's full edition carries one per journey step.
- **The trade-off passages** are AIW-authored teaching knowledge, not calibrated and not expert-reviewed, pending the owner's approver like every pack; the retrieval is lexical; the scale readings rest on named assumptions (peak ×3, 2 KB records and payloads) and the figures are orders of magnitude.
- **Left from round 5 and still open**: Chapter 5 Model and Chapter 10 Validate at 500 records per chapter over 3 s; the hosted D1 row size; the four moderate npm advisories in the migration tooling; SSO and roles, presence and comments, delivery-tool exports, knowledge connectors, locales, telemetry and plans.

## 7. What this report does not claim

- No live model call was made: this environment's network policy denies api.openai.com, so the owner's OpenAI key was never sent anywhere from here; the key was read from the uploaded file into a protected scratch file and nothing else of that file was kept. The probe is proven against the test double only; the Anthropic wire has no key.
- No production acceptance, licence approval, expert review, calibration or signing happened; `productionAccepted` stays false. The trade-off passages are AIW-authored teaching knowledge with attribution; their approval is the owner's, like every pack.
- Measurements were taken in headless Chromium on the reference, generated and fixture projects; other viewports and real projects were not measured.
