# Round-4 report: the open items closed, a brief in and every chapter drafted, a green product with reference projects

Baseline before this round: `df27560` (AIW v0.10.0-rc.10.73.8 candidate). Result: `eb3d605`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.9** (candidate; see §8).

Asked for: fix every item the round-3 report left open; say whether AIW can take a typed or uploaded requirement and produce the data, views and outputs of all eleven chapters with the LLM, the Brain and the knowledge repository working together, and if so deliver a green product with reference projects that show it end to end; then a walkthrough from a new project to Chapter 11 and the SDD.

## 1. The answer, before and after

**Before this round: no.** A typed brief became one field (`brief.problem`); an upload had to be an `.xlsx` of requirement rows and filled Chapter 1 only; the only thing that filled eleven chapters was canned reference text that never read the brief; Sol drafted one field of one record per request; the rule-based spark copied from existing records; the design tasks needed a requirement and a driver first. Evidence with file references: `audit/round4/DESIGN.md` §"What AIW does today".

**After this round: yes, within the authority chain.** A brief typed or uploaded (.txt, .md, .docx) is interpreted into cited passages; the journey drafter proposes every chapter's records in order from the brief and the records already accepted, with the Brain's basis and citations (governed claims and Playbook passages); the person reviews each chapter's proposals, with every value marked stated / inferred / from a named record / Sol and the gaps left as questions, and accepts a chapter through the governed guide commands; every created record carries its provenance and stays unconfirmed until a person confirms it; readiness counts drafted records as "to confirm", never as passing; the SDD exports with the chapter registers. Sol's journey mode drafts a chapter's answers in one call when a key is configured, under the same strict validation as the field mode, and the deterministic drafter stands in when it is not.

Three limits are stated plainly. The live model path could not be exercised here: no API key is configured in this environment, so every Sol call answered 503 as designed and the deterministic drafter produced every draft measured; the journey mode's packet, schema, guards, second check and fallback are covered by the server suites with the mock provider. Knowledge citations reach proposals only as governed claims and Playbook passages: governed claims need a second signed-in person to verify, a release and an activation (`AIW_LOCAL_ACCOUNTS` locally), and the two reference briefs' projects cite Playbook passages, since no claim has been released in a fresh project. PDF briefs are not read; the page says so and takes .txt, .md and .docx.

## 2. What landed

### 2.1 The items the round-3 report left open

All nine items closed, each verified and measured:

- **Project switch in place.** A link to another project, Back across projects and the in-shell restore of a model package open without a document load (72–120 ms against 417–614 ms for a load); the store prepares the other project and announces `aiw:project-switched`; studios are disposed and recreated; every chapter view and the notation re-read the new project's preferences through one hook, so view choices stay with their project (measured: a Matrix pair and a hidden layer set on project A, B shows its defaults, A's keys unchanged, back on A both are there). The Projects gallery stays its own route.
- **Every remaining document load.** The Sol panel loads the design-task module on demand; the Chapter 1–3 studios lose their browser fallback; the security finding fix, the explorer's next-stage fallback, the utility view's and the desk's treat fallback route in place; a saved perspective of another chapter opens in place and the address keeps `modelView=`.
- **Matrix of any two record types** with Rows and Columns selects, direct, via-one-record and through-the-design cells, gaps counted against the nearest kind of link, axis filters, a 60 × 40 cap, the pair remembered per chapter.
- **Eight lanes** in the Layers view with thin strips for absent layers and collapsed lanes for hidden ones; the companion lists all eight.
- **Table and Matrix on phones**: sticky header row and first column, scrolling inside the card, selects stacked below 480 px; measured at 390 and 360 px with 12 px text and no page-wide scroll.
- **Scale**: 350 records across Chapters 4–8; worst render 99 → 60 ms, worst response 190 → 84 ms; the Table pages at 50 rows.
- **The Running board** drawn by the shared renderer: parts in their zones with their state in words, selection round-trip with the desk, layers, Fit, zoom, overview and Key from the kit; the old board graphic and its CSS are gone. The kit's grouped arrangement lays crowded rows out as grids, so a 134-part board is 1,356 px wide instead of 26,796, with 74 reference layouts hashing identically.
- **Dead CSS** of the retired page shells removed from story, tradeoff, anatomy, journey-rail and workspace-ux CSS; selectors scripts still look up are kept; 14 screenshots byte-identical.
- **Stylesheet selectors outside the brief** (`.r-studio`, `.r-surface`, `.r-map-card`, the three inspector ids) were checked: the ones scripts still look up stay; the rest are gone.

### 2.2 A brief in (Contract 1)

- `public/brief-interpreter.js` (re-exported from `shared/`) reads a brief deterministically into cited passages and one proposal per Chapter 1 record kind (requirement, outcome, stakeholder, actor, scope in or out, journey step, constraint, assumption), each marked stated or inferred (an inferred value is one that is not a span of the cited words), with questions for what the brief does not say; bounded at 20,000 characters; about 30 ms on hostile text; no knowledge read.
- `public/brief-reader.js` reads .txt, .md and .docx (paragraphs and list items of `word/document.xml` through the bounded OOXML reader) with a 12 MB cap and the file's SHA-256; PDF is refused with a reason.
- The Projects page's blank template has a brief step (typed, or a file that fills it and shows its name, size and digest); `createProject` keeps the text as the project's first evidence source, sets `brief.goal` to the first stated outcome in the brief's own words, and stores interpreted counts; the project body limit is 128 KB so a brief in any script fits.

### 2.3 The journey drafter and the review surface (Contracts 2 and 3)

- `public/journey-drafter.js` proposes, for each chapter in order, answers shaped exactly for `creationFields`, so `compileCreation` stays the only path from answers to commands. Chapter 1: one guided record per interpreted proposal of every kind, requirements last so each names its journey step, outcome, constraint and assumption. Chapter 2: a driver per requirement, with a target only when a passage states one. Chapter 3: a decision per constraint and per tensioned driver pair, with two alternatives. Chapters 4–7: a responsibility per requirement, a component per responsibility, a capability and trust boundary per component, a plan with two options per capability. Chapter 8: contracts between components and per external party, data named for the noun a requirement acts on with a key and a status field. Chapter 9: a threat and control per confidential data and external contract. Chapter 10: an environment, a zone per boundary, placements. Chapter 11: the narrative, titled "<name> — Solution Design". Every value is stated, inferred, copied from a named record, or a gap left as an open answer; the basis and citations come from `architectureBrain` (governed claims and Playbook passages only).
- `public/journey-draft-ui.js` is the review surface in the shell's frame: per chapter the proposed records with each value marked stated, inferred, from upstream or Sol, the passages beside them, the citations and the gaps as questions; Accept runs `guide.start` → `guide.draft-answer` per field → `guide.commit-draft` with the basis, the preview stamp, `reviewed: true` and the provenance; Edit opens the record's editor through the spark path; Skip; Ask Sol when configured; "Draft the whole journey" walks 1 → 11 stopping at each. Entry points: Chapter 1 Work, every chapter's Validate empty state, the readiness board's next action for an empty chapter.
- `guide.commit-draft` writes a bounded, validated `provenance.journey` to each record it creates (never over an existing one); the worker keeps it when a chapter's save rebuilds the record, marking the edited fields, including technology needs and runtime placements; readiness counts a drafted record as "to confirm" by its confirmed flag. Accepting a journey raises no change to review.
- Sol mode `journey` (`sol-journey-1`): one call per chapter with the brief passages, the upstream records and the chapter's fields; a strict schema of per-record answers checked against the packet (fields, options, passages, references, numbers, no guaranteed or verified wording), a second check call, and the deterministic answers with a reason when either fails; 503 without a key; counted in the existing budget.

### 2.4 Reference projects

- Three reference journeys generated by the pipeline from briefs kept beside their ids (citizen service requests, warehouse fulfilment, clinic appointments; 682, 724 and 643 words, each labelled an AIW authored teaching example): 96, 123 and 110 records, every one with journey provenance citing passages of the kept brief; readiness 5 passing passages and 249 / 341 / 297 to fix, 318 / 417 / 369 to confirm, 167 / 225 / 200 open answers; SDD Markdown 231, 302 and 264 KB. Nothing is confirmed, reviewed, baselined, approved or handed off, and the project, the picker and the rail say so.
- The Sol evaluation keeps a frozen copy of the former canned references as its held-out teaching design (`evaluation/reference-fixtures.mjs`), used by nothing in the product.
- `evidence/reference-projects.json` records the counts above with an authority line stating what the evidence is not.

## 3. Measured

Taken in headless Chromium at 1440×900 on local servers with scratch databases and no API key, by the workstreams' probes and the lead's walkthrough probe; the clean-install, build and bundle figures by the gates.

| What | Before | After |
|---|---|---|
| A brief's fate | typed: one field; file: `.xlsx` rows into Chapter 1 only | the bike-share brief (579 words) interprets into 52 passages, 2 outcomes, 9 stakeholders, 3 actors, 8 scope items, 7 journey steps, 4 constraints, 3 assumptions, 9 requirements and 5 questions; a `.docx` of the same text reads identically with its digest |
| Chapters drafted from a brief | none (Chapter 1 rows at most) | all eleven, from one brief and no typing: 45 Chapter 1 records (every kind), 9 quality drivers, 5 decisions, 9 responsibilities, 9 components, 9 capabilities, 9 realisations, 8 contracts and 8 data definitions, 10 threats and 10 controls, 9 environments and 9 running parts, the narrative titled "Neighbourhood bike share — Solution Design" |
| Walkthrough: new project → Chapter 11 → SDD | — | 28 steps in one document, 0 page errors, 0 failed requests; SDD Markdown 359,385 bytes with every chapter register; the HTML preview renders (`audit/round4/WALKTHROUGH.md`, screenshots in the delivery) |
| Change review raised by accepting a journey | 87 affected records on the first build | 0 |
| Reference projects | two, one canned record per chapter, Bank Payment SDD title, Chapter 8 data without fields | three generated from briefs: 96 / 123 / 110 records, every one with journey provenance, titled as their own name, data with key and status fields |
| Project switch | a document load (417–614 ms) | in place, 72–120 ms; view preferences stay with their project |
| Same-project document loads left in the shell | 7 (Sol panel fallback, three studio fallbacks, security fix, explorer next stage, utility and desk treat, saved perspectives) | 0; only the Projects gallery and the no-shell fallbacks load a document |
| Matrix | one default pair per chapter | any two record types, remembered per chapter; direct, via-one-record and through-the-design cells; gaps against the nearest link kind |
| Layers view | lanes for present layers only | eight lanes always, absent layers as strips, hidden layers collapsed |
| Table and Matrix at 390 × 844 and 360 × 780 | dense, no sticky header | page width equals the viewport, 12 px minimum, sticky header row and first column, selects stacked |
| Model views at 350 records (Chapters 4–8) | worst render 99 ms, worst response 190 ms | 60 ms and 84 ms; Table pages at 50 rows; Matrix capped at 60 × 40 |
| Running board on a 134-part design | a separate graphic; 26,796 px wide when drawn by the kit | the shared renderer, 1,356 px wide, 0.45 s; 74 reference layouts identical |
| Dead page-shell CSS | 10 rules in five stylesheets | removed; 14 screenshots byte-identical |
| Client bundle | 125 script files; Projects route 913,941 B | 125 script files; Projects route 913,094 B; chapters route 2,284,447 B of 2,373,632 B |
| Clean install on a fresh archive of `eb3d605` | — | `npm ci` adds 105 packages; check-syntax and the client bundle pass |


## 4. Commits of this round

- `eb3d605` feat(reference): three reference projects generated by the pipeline from their briefs
- `8f83bfb` fix(journey): every interpreted kind is drafted, no cap, the title convention, provenance kept across chapters, no change review on accept
- `fe2c727` feat(journey): every chapter drafted from the brief and co-authored to the SDD through the governed guide
- `dd6e803` feat(shell): projects, saved views and every remaining link change in place; views reset on a project switch; dead page-shell CSS retired
- `e8197ea` feat(brief): a typed or uploaded brief starts a project with cited passages
- `1ba8ce1` feat(desk): the Running board is a picture of the one model, drawn by the shared renderer
- `7764150` feat(views): Matrix of any two record types, eight lanes, phone-tuned sheets, paging at scale
- `8e7c91e` docs(design): round 4, a brief in, every chapter drafted, co-authored to the SDD
- the commit carrying this report, the walkthrough, the lint baseline and the release field follows `eb3d605`

## 5. Discipline kept

- Every code commit was verified by a full regression on a clean worktree of HEAD plus that work before it was committed (7764150 128/129 with the shell suite's load-sensitive wait rerun green alone, then made load-tolerant; 1ba8ce1 and e8197ea 130/130; dd6e803 and fe2c727 132/132; 8f83bfb and eb3d605 133/133).
- The authority chain is unchanged: the drafter proposes and never writes; `compileCreation` is the only path from answers to commands; the person commits each chapter through `guide.start` → `guide.draft-answer` → `guide.commit-draft` with a basis and a preview stamp; nothing drafted is confirmed, reviewed, approved, baselined or handed off by the drafter; candidate and discovery knowledge never reach a proposal; Sol's journey output is validated against its packet and falls back to the deterministic answers with a reason.
- No role check, tenant boundary, budget, redaction, receipt, review gate or honesty label was weakened; the project body limit was raised for the brief only. No test was skipped, disabled or quarantined.
- No old and new path side by side: the old board graphic, the studios' browser fallbacks, the separate Chapter 1 artefact commit path and the canned reference text are gone.
- `productionAccepted` stays false. The release field advances to the candidate rc.10.73.9; the controlling baseline in the manifest script stays rc.10.73.6 until the owner records a release.

## 6. Gates at `eb3d605`

| Gate | Result |
|---|---|
| `node check-syntax.mjs` | 448 application, service, script and verification modules pass |
| `node validate.mjs` (shell state in a vm sandbox) | passed |
| `node client-bundle.mjs` | no violations: chapters route 2,284,447 B of 2,373,632 B; Projects route 913,094 B of 926,720 B; 125 script files of 127 |
| `node build.mjs` (Worker build) | passes |
| `node scripts/lint.mjs` | 0 new problems; baseline ratcheted 191 → 190 |
| `node release-checks.mjs` at `eb3d605` (3 workers) | 133 suites, 133 passed, 0 failed (four new suites: brief-interpreter, journey-drafter, journey-draft-browser, reference-projects) |
| Suites that read the release field, after it advanced | brain-integration, knowledge-second-brain, repository-sync pass |
| `node scripts/reference-projects-evidence.mjs` | `evidence/reference-projects.json` regenerated on the final drafter; `reference-projects` suite passes against it |

## 7. What remains, honestly

Named so the next round can take them; none of them is an open item of the round-3 report, and none makes a drafted record pass, confirm or approve anything.

- **A drafted project is not a passing SDD.** The drafter leaves what the brief does not say as open answers ("Unassigned", "Open question: …"), which the checks count as to fix, and every record stays unconfirmed, which they count as to confirm. Reaching "passing" is the person's work: answer the gaps, confirm each record, treat the findings, record the architect review, freeze a baseline and have a second person approve. On the reference projects that is 249–341 items to fix and 318–417 to confirm.
- **Sol's part is validated with a mock, not a live model.** No key is configured here. With a key, the journey mode drafts each chapter's answers in one call under the same guards as the field mode; whether its answers are better than the rules' was not measured.
- **Knowledge citations are Playbook passages in a fresh project.** Governed claims need a second person to verify, a release and an activation before they can be cited; locally that needs `AIW_LOCAL_ACCOUNTS`. The AKR pilot pack still reaches the design and author packets unreviewed, as before this round; it was not changed.
- **Four-eyes stays where it was.** `alternative.apply`, `workspace.apply` and `guide.commit-draft` accept a typed reviewer name without a second signed-in person, as before this round; the journey accepts chapters through `guide.commit-draft`. Tightening this is a governance decision for the owner, not a change made here.
- **One link per requirement per kind.** A requirement names one constraint and one assumption (the one sharing most words); a second constraint that also applies is not linked, though Chapter 3 still decides on every constraint.
- **Parts without their own provenance.** Decision alternatives, technology needs and runtime placements are parts of their parent record and carry no provenance of their own; the parent does.
- **Accept time grows with the brief.** A 45-record Chapter 1 commits one record at a time through the guide (about eight commands each); it completes but is noticeably slower than a small brief. A batched guide commit is the next step.
- **The Projects gallery is still its own route**, by design; everything else in the shell is in place.
- **Two stray files at the filesystem root** (`/desk-browser.log`, `/browser.txt`), written outside the repository by a workstream's shell with an unset variable, could not be removed from this session (a safety check stops removals at the root); they are harmless and the owner can delete them.

## 8. What this report does not claim

- No production acceptance, licence approval, expert review, calibration or signing happened; `productionAccepted` stays false.
- The live model path was not exercised in this environment: no API key is configured here, so every Sol call answered 503 as designed and the deterministic drafter produced every draft measured; the journey mode's schema, guards, second check and fallback are covered by the server suites with the mock provider.
- The reference projects are AIW-authored teaching examples generated by the pipeline; nothing in them is confirmed, reviewed or accepted, and they say so.
- The measurements were taken in headless Chromium on the reference and generated projects; other viewports, real projects and real briefs were not measured.
