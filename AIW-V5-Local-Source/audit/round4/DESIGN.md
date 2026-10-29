# Round 4 design: a brief in, every chapter drafted, co-authored to the SDD

Baseline: `df27560` (AIW v0.10.0-rc.10.73.8 candidate). Asked for: fix every item the round-3 report left open; answer whether AIW can take a typed or uploaded requirement and produce the data, views and outputs of all eleven chapters with the LLM, the Brain and the knowledge repository working together, and if so deliver a green product with reference projects that show it end to end; then a walkthrough from a new project to Chapter 11 and the SDD.

What landed, what was measured, and what remains: `audit/round4/REPORT.md`. The walkthrough from a new project to Chapter 11 and the SDD: `audit/round4/WALKTHROUGH.md`.

## What AIW does today, measured (read-only survey, file:line in the survey notes)

| Fact | Evidence |
|---|---|
| A typed brief becomes one field, `brief.problem`; nothing parses it | `shared/projects-domain.js:14`, `public/requirements-domain.js:127` |
| An upload must be an `.xlsx` of requirement rows and yields Chapter 1 requirements only; attachments are hashed, not read | `intake-service.js:28`, `public/intake-domain.js:76`, `collaboration-service.js:43-46` |
| The only thing that fills all eleven chapters is `populateReference`, driven by canned text chosen at creation; it never reads the brief | `public/reference-projects.js:3-11`, `shared/projects-domain.js:26` |
| The chain that creates every chapter's records from answers exists: `creationFields(p, ch, answers)` → `compileCreation(p, ch, answers)` → canonical commands, committed through `guide.start` / `guide.draft-answer` / `guide.commit-draft` with a basis and a preview stamp | `public/guided-creation.js:13-50`, `public/chapter-guide.js:36-47` |
| Sol drafts one field of one record per request (mode `field`), designs at most two options (mode `design`), authors one passage (`author`), assesses eight decision points (`reason`); 10 requests an hour per project; 503 without a key; no mode creates records | `intelligence-service.js:47-255`, `intelligence-provider.js:178-230`, `operation-service.js:38` |
| The spark's rule bands copy from project records only; the Co-author lists empty fields of saved records; seven record types have no rule provider | `public/field-suggestions.js:11-12, 186-581` |
| Multi-chapter rule tasks (architecture, design, exchange, protection) need an existing requirement and driver, contract or threat; none covers Chapters 2, 10 or 11 | `public/architecture-design.js:29-30`, `public/design-basis.js:11`, `public/exchange-design.js:47`, `public/security-design.js:61` |
| Knowledge reaches Sol only as eligible released claims (four eyes, release, activation); the rule spark never reads knowledge; the AKR pilot pack reaches design and author packets unreviewed | `public/knowledge-governance.js:19-37, 143-170`, `public/intelligence-context.js:72-79` |
| Reference projects carry the Bank Payment SDD title | `shared/projects-domain.js:26-27`, `public/review-domain.js:54` |

Answer today: **no**. A brief yields one field; an upload yields Chapter 1 rows; nothing drafts Chapters 2–11 from the brief. The pieces for a co-authored journey exist and work one field or one task at a time.

## Target: the co-authored journey

The authority chain is unchanged: policy → approved knowledge → deterministic reasoning → human decision → audited canonical commit. The journey drafter proposes; the person commits each chapter through the existing governed `guide.*` commands; every created record carries where it came from.

### Contract 1 · the interpreted brief (`shared/brief-interpreter.js`)

`interpretBrief(text, {name}) → {passages, outcomes, stakeholders, actors, scope, journeys, constraints, assumptions, requirements, questions}`

- `passages[]`: `{id: 'P-nnn', start, end, text}` — the brief split into sentences and list items, offsets into the stored text; every proposed value cites passage ids.
- Each record proposal: `{title, description|statement, …fields the Chapter 1 `artefact` command accepts, passages: ['P-003'], confidence: 'stated' | 'inferred'}`. "stated" means the words are in the passage; "inferred" means the rule derived it (an actor from a verb phrase, an acceptance stub from a "must" clause) and the person is asked to confirm.
- Deterministic rules: cue words and sentence shapes (must/shall/should → requirement with an acceptance stub; "so that"/goal/objective → outcome; roles and organisations → stakeholders and actors; "must not"/"within"/budget/deadline/regulation → constraints; "assume" → assumptions; "in scope"/"out of scope" → scope; ordered steps and "then" → journey steps). No knowledge is read here.
- `questions[]`: what the brief does not say and the chapter needs (owner, scope boundary, success measure), as creation questions the person answers or Sol drafts.
- Input: the typed brief (limit raised to 20,000 characters) or an uploaded `.txt`, `.md` or `.docx` (text extracted client-side; `.docx` through the existing bounded OOXML reader in `public/workbook-reader.js`, `word/document.xml` paragraphs only); `.xlsx` keeps the requirement-row intake. The source text is kept as a `coauthoring.sources` entry with its hash, so passages remain verifiable. PDF is not read in this round; the page says so.

### Contract 2 · the journey draft (`shared/journey-drafter.js`)

`draftChapter(p, ch, {brief, mode}) → {chapter, basis, records: [{answers, fields, provenance}], gaps, citations}`

- For chapter `ch`, one `answers` object per record to create, shaped exactly for `creationFields(p, ch, answers)`, so `compileCreation` is the only path that turns answers into commands; the drafter never writes the document.
- Sources of answers, in this order: the brief's passages (Chapter 1; the Chapter 11 framing), the upstream records the chain already created (Chapter 2 drivers from requirement acceptance clauses as the spark rule does; Chapter 3 decisions from drivers and constraints with two alternatives; Chapter 4 responsibilities from journeys and requirements; Chapter 5 components from responsibilities; Chapter 6 needs and boundaries from components; Chapter 7 plans from capabilities; Chapter 8 parties, data and contracts from cross-component interactions; Chapter 9 threats and controls from data and parties; Chapter 10 environments, zones, plans and placements from components; Chapter 11 narrative from the brief and the chain), then Playbook passages and eligible released claims through `architectureBrain`/`brainSources` for the `basis` and `citations` (claim receipts), never candidate or discovery knowledge.
- `provenance` per record: `{mode: 'deterministic' | 'sol', passages: [], upstream: ['REQ-001', 'QD-002'], claimIds: [], playbook: [], runId?}`.
- `gaps[]`: creation questions no source answers; they stay questions for the person (never invented).
- Mode `sol` (server, `intelligence-service.js` mode `journey`, prompt pin `sol-journey-1`): one call per chapter; the packet is the brief passages, the upstream records and the chapter's `creationFields`; the output is a strict schema `{answers: [{field, value, passages, sourceRefs}]}` where every field key is one of the chapter's fields, every value ≤ 2,000 characters, every passage and source ref is in the packet, numbers only from the packet, no guaranteed/verified wording; validated like `field`, a second call checks it, a failed check falls back to the deterministic answers for that chapter and says so. Without a key the deterministic mode runs and the page says Sol was not consulted. Budget: counted in the existing hourly cap; the whole journey is at most eleven requests.

### Contract 3 · the review and commit (`public/journey-draft-ui.js`)

- Entry points: a new project from a brief (Projects page: name, brief typed or a file, "Start from this brief"); on Chapter 1 Work, "Draft from the brief" when the brief exists and the chapter is empty; on every chapter's Validate and Work empty state, "Draft this chapter from the journey"; on Chapter 1, "Draft the whole journey" that runs chapters in order, stopping at each for the person.
- The surface, in the shell's stage and companion (one frame): per chapter, the proposed records as cards with the fields that will be saved, each value marked stated / inferred / from upstream / Sol, the passages quoted beside them, the citations (Playbook, claims) and the gaps as questions to answer. Actions: Accept chapter (runs `guide.start` → `guide.draft-answer` per field → `guide.commit-draft` with the basis and the preview stamp, `reviewed: true`), Edit a value (opens the record's editor pre-filled through the existing spark path, which carries `solSuggestions` provenance), Skip a record, Ask Sol to draft (mode `journey`, when configured).
- Created records keep `confirmed: false` and the chain's `source`; `guide.commit-draft` gains an optional validated `provenance` (Contract 2) written to each created record's `provenance.journey` and to the guide session history, so the SDD and the readiness checks can say "drafted from the brief, confirmed by nobody yet". Confirmation stays a human act on the record.
- Readiness: a drafted chapter counts as "to confirm", never "passing", until its records are confirmed; the readiness board's next action for an empty chapter becomes "Draft this chapter from the journey".

### Reference projects (`public/reference-projects.js`)

- Three reference journeys, each generated through Contract 1 → 2 → `compileCreation` from a real brief kept in the module (citizen service requests, warehouse fulfilment, and a third: clinic appointment scheduling), so the reference projects are the pipeline's own output and every record cites its passage. `workspace.reference = {id, authority: 'AIW authored illustration', verified: false}` stays; nothing in them claims confirmation, review or acceptance.
- The SDD title bug is fixed: a reference project's narrative title is its own name, as '<name> — Solution Design'.
- Evidence: `evidence/reference-projects.json` with, per project, record counts per chapter, the readiness counts (passing / to fix / to confirm) and the SDD export sizes; a suite asserts the counts and that every record carries journey provenance.

### Green product

- Every gate green: clean install, Worker build, client bundle within budget, syntax, lint 0 new, the full regression, the browser suites, the manifest. "Green" means the gates pass; `productionAccepted` stays false and the external authorities' status is reported as it is.

## Workstreams and ownership

| Workstream | Owns | Must not touch |
|---|---|---|
| R4-A shell flows, dead CSS | app.js route code, brain-context-ui.js fallback, requirements/quality/decisions.js `goChapter`, project-context.js, project-store.js, intake-ui.js `onSaved`, story/tradeoff/anatomy/journey-rail/workspace-ux/brain-context CSS dead rules, ux-shell-browser suite | model views, desk, journey modules |
| R4-B model views | model-matrix.js, model-table.js, layers-view.js, notation-layout.js, notation-view.js (its views), notation CSS, model-views-browser and notation-layout suites | app.js, desk, journey modules |
| R4-C desk board | desk-view.js, desk-layout.js, desk.css, review.css, desk-browser suite | notation-*.js, model-stage.js |
| R4-D brief in | `shared/brief-interpreter.js` (+ unit suite), brief text extraction (`public/brief-reader.js` on the OOXML reader), projects.js and shared/projects-domain.js (brief limit, brief file, interpreted brief stored), worker.js brief/source storage, the Projects page brief step | the drafter, the review surface, intake-ui.js, intake-service.js |
| R4-E journey drafter | `shared/journey-drafter.js` (+ unit suite), chapter-guide.js (`provenance` on commit), `public/journey-draft-ui.js` + CSS, entry points in requirements.js (Chapter 1 Work), validate-view.js and readiness-model.js (next action), intelligence-service.js / intelligence-provider.js / intelligence-context.js mode `journey`, a browser suite | brief-interpreter.js (consumes its contract), reference-projects.js, the model views, the desk |
| R4-F reference projects | reference-projects.js, the third brief, the title fix, `evidence/reference-projects.json`, projects suite, SDD export suites | everything else; starts when R4-D and R4-E land |
| Lead | integration, full regression, commits, the walkthrough, the report | — |
