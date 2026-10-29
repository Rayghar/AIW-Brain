# Round-5 report: pictures that carry state, one world, less text, a readable SDD, Sol on the Anthropic API

Baseline before this round: `c658a2c` (AIW v0.10.0-rc.10.73.9 candidate). Result: `4c9160b`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.10** (candidate; see §4).

Asked for: update AIW along the assessment of 2026-10-02. The design (`audit/round5/DESIGN.md`) says what this round takes and what it leaves for the owner's decisions (SSO and roles, presence and comments, delivery-tool and docs-as-code exports, knowledge connectors, locales, telemetry and plans).

## 1. What landed

### 1.1 Sol on the Anthropic API (R5-A, `7e6811b`, `642c63e`)

- One provider seam: every Sol mode (generate, reason, baseline, field, journey and the new review) goes through `modelCall` in `intelligence-provider.js`, which redacts once and dispatches to the unchanged OpenAI implementation or the Anthropic one, chosen by `AIW_LLM_PROVIDER` and defaulting to whichever key is set. The status endpoint and the health check name the provider, model, effort, refusal fallback and retention.
- The Anthropic provider (`intelligence-anthropic.js`) uses the official SDK, vendored into the Worker by `build.mjs` and recorded in `THIRD-PARTY-NOTICES.md`: the same instructions and JSON schemas as structured output, adaptive thinking with effort from `AIW_LLM_EFFORT`, the pinned instructions and a journey's brief passages as cached blocks, streaming for the journey and generate modes, server-side refusal fallbacks (a refusal that stands is a completed run with the draft withheld and its category named), typed errors mapped to 429/502/503, and a provider receipt per run with every call's response id, stop reason and usage including cache reads and writes. The result checks (numbers not in the packet, wording, the second check call) are provider-agnostic and unchanged.
- Review mode (`sol-review-1`): the packet is the chapter's records, its connected model and its current checks; the output is findings per element (fix, confirm or note, each with a reason and source references), validated against the packet, capped at 20, checked, receipted and saved as a run; the packet previews without a key.
- Budget: the owner's policy allows 0–120 requests an hour with 30 the default; the daily token cap is unchanged. Suites start their servers without the shell's provider keys, so a configured key never reaches a test.

### 1.2 Pictures that carry state (R5-B)

- `model-marks.js` is the one channel any state source paints through (`window.aiwModelMarks.set(source, marks)`, precedence traced > changed > fix > confirm > pass, ghost as its own element, dimmed as lower opacity). Every picture, the Layers view, the Table and the Matrix read the merged marks on each draw and repaint on the `aiw:model-marks` event without a new layout. The words and glyphs are the readiness model's three; the Key lists every state drawn; the exported SVG carries the same marks. The chapter checks are published on every Model draw, with a Checks switch in the Layers menu remembered per chapter and picture.
- Semantic zoom: at the first fit only titles and glyphs read; type labels from zoom 0.8, fields from 1.2; nothing is drawn under 9 px, and the companion carries the full text of the element under the pointer.
- Trace: from the toolbar, a selected element or a Matrix cell, a record's chain through driver, decision, responsibility, component, capability, realisation, contract or data, control, placement and part lights up and the rest dims; the chain and its gaps read in the companion and are the same chain the Matrix's "through the design" cells use. A previewed alternative is drawn over the saved design with its changed elements ringed.
- `record-picture.js`: a record selected on Work shows its neighbourhood as a small picture above the studio's details, its checks painted; a click opens the Model tab with it selected. Readings in the companions are two lines with More.

### 1.3 One picture world (R5-C)

- `perspective-view.js` replaces `architecture-explorer.js` and `architecture-layout.js`: the project's saved perspectives and "New perspective…" are a Perspectives group on every chapter's Model toolbar; a perspective is drawn in the Model stage by the kit, with the companion in the shell's column, the sidebar's layers and the marks applying, and Fit, zoom, the overview and the Key the kit's. Saving goes through the existing `workspace.view` command. A saved perspective of another chapter opens in place with `modelView=` in the address; `explore=` opens the Diagram; "You are here" names the chosen perspective.
- The explorer's body class, toolbar, rail, chapter band, Back special case, history entry, the always-empty canvas host and their CSS are retired. What the explorer alone offered is kept in one place each: `process-editing.js` carries the process model's dialogs (add, connect with a condition, claim, edit, remove, choose the scenario) through the shell's dialog host as reviewed `workspace.apply` commands, with the new reviewed `process.remove` command refusing reference routes and records a path or claim still names; the settlement investigation lives in the architecture case on Chapter 11.

### 1.4 One guidance voice, "You are here", a coach and a help map (R5-D)

- One voice per screen: the heading and subtitle carry it; the arrival toast says only the chapter; "What comes next" is one line with one action; the assistance chip shows only when its fact repeats no word of the heading or subtitle beyond the chapter's name (`chipAddsFact` in `shell-ux.js`); the breadcrumb appears once; the footer is the product, the project once and the connection state. "You are here" under the tabs names chapter · tab · view and follows every change in place.
- Validate shows findings as tables with the glyph and the word in a status column and Open, Ask Sol and Treat as compact buttons, only the first group open; "This chapter in the SDD" is compact on Validate and full on Output; Chapter 11's final checks are a table. The desk names parts once per run, folds "Not carried" readings above 24 rows and keeps status and readings to two lines with More.
- A three-step coach on a project's first open per viewer (dismissible, "Show again" from the help map) and a "?" help map: eleven chapters by four tabs with what each holds, and the glossary; keyboard reachable, Escape returns focus.

### 1.5 Proposals and Sol's review in the client (R5-E)

- Mind Factory is Proposals: one list for the chapter and the selected record with a source column (rule, knowledge, task, journey, Sol, review), what, why, where it would go, and Accept / Open editor / Set aside. Each row accepts through exactly the command its surface used before; the Co-author band and the separate task entries are retired into it; the glossary says "formerly Mind Factory".
- "Review this chapter" in Proposals and in the Model tab's Sol section shows the packet first, runs when a provider is configured, lists the findings with their glyphs, paints them through the marks channel (source `sol-review`), selects an element on click, and Adopt turns one finding into a Chapter 11 action through `intelligence.adopt`'s new `review-finding` kind, the one canonical write, through the existing `review.action` command. The review state is per project and chapter; a review change redraws its own section and the Proposals list in place and never remounts a chapter model.
- Field, journey and review drafts show a progress line (sending, drafting, checking) read from the run's status, which the service records through its fetch seam; the budget and retention texts come from the status.

### 1.6 The SDD in two editions (R5-F)

- `sdd-document.js` builds the SDD from the registers in an executive edition (title and ownership, at a glance, "the design so far" from the accepted records, four figures, risks and open items as counts with the ten most important, delivery obligations; about 3,000 words at most) and a full edition with figures inline: SVG in Markdown and HTML, PNG rasterised in the browser for Word, JPEG for the PDF. One Open items appendix replaces the repeated gap text with short inline markers; no boilerplate prints with empty values; provenance notes come from `provenance.journey`; "Changes since the last baseline" appears when a baseline exists; the delivery and review audiences keep their sections.
- The export route takes `edition` and `audience` for Markdown, HTML and JSON; Word and PDF are built from the chosen edition; a freeze keeps the full edition for everyone; the Output tab's export block offers both. The figure set is memoised per document fingerprint and the Markdown renderer builds lists item by item.

### 1.7 Scale (R5-G)

- Caps: drivers, decisions, responsibilities, components, capabilities, realisations, contracts, data definitions, threats and controls keep up to 500 each; fields per data definition and connections, interactions, dependencies, realisation interfaces, zones and placements 2,000; environments 500; each bound tested in its domain. The import route's 12 MiB body is the remaining cap.
- A performance budget asserted by `scale-validate.mjs --strict` on a 500-per-chapter fixture built through the domain commands (`scripts/build-scale-fixture.mjs`): every chapter's checks under 300 ms, the readiness board, the connected model, SDD assembly and the Chapter 4 and 5 layouts within the figures in §2. Results are identical to the caches-off path: the suite compares every memoised value, and 394 reference and stress layouts hash identically.
- How: `document-memo.js` gains pass-scoped memoisation and shared lookup helpers; the chapter domains index their lookups and compute findings, milestones and exports in one pass; the layout places ranks incrementally, counts crossings with a Fenwick tree, builds the routing grid on demand, caps dummy nodes and draws connectors straight above 400; the findings lists and SDD passages page at 50 with Show more.

### 1.8 Integration (lead)

- The bundle budgets are re-based on the measured round-5 sizes with a comment per figure; the scale, sdd-documents-browser and perspective-view suites are registered in the release gate; the lint baseline is ratcheted 190 → 187; `release-checks.mjs` strips the provider keys and provider choice from every suite's environment.
- Shared files were assigned to one workstream and carried the others' edits: `app.js`, `review-ui.js`, `validate-view.js` and `desk-view.js` with the guidance commit; `review-domain.js` and `worker.js` with the SDD commit; `brain-reasoning-ui.js`, `intelligence-service.js` and `intelligence-context.js` with the proposals commit; `workspace-ux.js`, the chapter view modules, `index.html` and the docs with the perspectives commit; `readiness-model.js`, the domains and `document-memo.js` with the scale commit.

## 2. Measured before and after

Taken in headless Chromium at 1440×900 on local servers with scratch databases and no API key, by the workstreams' probes and the lead's walkthrough probe, on the reference project unless named; the bundle, build and install figures by the gates. "Before" is the design's measurement of the round-4 candidate where the same probe measured both, otherwise the workstream's own before-figure.

| What | Before | After |
|---|---|---|
| Sol's provider | one OpenAI-compatible implementation, each mode calling it directly | one seam, OpenAI or Anthropic by configuration; the Anthropic SDK vendored into the Worker (+274 KB, licences recorded) |
| Sol's budget | 10 requests an hour per project, owner policy capped at 10 | 0–120 by the owner's policy, 30 the default; daily token cap unchanged |
| Sol on the model | none | review mode: on Chapter 4 a mock review paints 2 of 2 findings and lists them; Adopt creates one Chapter 11 action and the Changes count stays 0 |
| Checks on the picture | none; the words lived in Validate | Chapter 4 paints 5 to-confirm marks on its 5 responsibilities; Chapter 8's Layers view 11 to-fix; the Key lists the states drawn; the exported SVG carries them |
| Smallest text at the first fit | types at 4.75 px, words inside at 5 px | 9.2 px; nothing drawn under 9 px; types from zoom 0.8, fields from 1.2 |
| Trace of one record | none | from REQ-001, 13 elements and 28 relationships light and 29 dim with no gap; from LR-002 the gap is named; the Matrix's through-the-design cells use the same chain |
| Picture worlds | two: the chapter model and "Explore all perspectives" | one: the Perspectives group on every chapter's Model toolbar lists the saved perspectives; a Chapter 10 perspective opened from Chapter 4 stays in one document and survives a reload; the explorer's body class never appears; 390 px without overflow |
| Proposal surfaces | four: spark bands, Mind Factory, design tasks, the journey draft | one: Proposals lists rows from three sources on Chapter 4 without a key and four with the mock provider |
| Guidance voices on one screen | five: heading, subtitle, arrival toast, "What comes next", assistance chip | one voice: heading and subtitle; the toast names the chapter; "What comes next" one line; the chip only when it adds a fact; the breadcrumb once on every screen |
| Visible words on the stage: Chapter 8 Validate / Chapter 11 Model / Chapter 4 Validate | 1,232 / 2,639 (746 in the companion) / 837 | 671 (127 in the companion) / 1,029 (187) / 488 |
| Visible controls on Chapter 11 Model | 202 | 129, of which 61 are the desk's per-row part buttons (not tab stops); see §6 |
| The SDD (bike-share project) | 52,358 words in one edition; 0 figures in Markdown; "Unassigned" 150 times inline; one line repeated 90 times; the empty classification line 16 times | full/all 33,569 words with 19 figures; full/delivery 3,963; full/review 9,876; executive/all 1,855 words with 4 figures; "Unassigned" 0 inline and 11 in the appendix; the repeated line once; the empty line gone |
| SDD binaries (bike-share) | Word and PDF without figures | full edition Word 3.8 MB and PDF 4.4 MB with figures; executive 0.5 MB and 1.2 MB |
| HTML export of a 120-requirement project | 13.8 s | under 1 s (figure set memoised per document fingerprint, lists built item by item) |
| Chapter caps | 50 responsibilities; 60 components, capabilities, contracts, data definitions | 500 per collection; 2,000 fields and relationships; a 500-per-chapter document is 11.8 MB under the import route's 12 MiB cap |
| At 500 records per chapter, server side | Chapter 10 checks 3,995 ms; readiness board 13,447 ms; connected model 1,278 ms; SDD assembly 274,758 ms; Chapter 4 layout 3,196 ms; Chapter 5 layout a stack overflow at 1,502 nodes | every chapter's checks under 300 ms (Chapter 11's 90 ms); readiness board 364 ms; connected model 224 ms; SDD assembly 962 ms; Chapter 4 layout 62 ms; Chapter 5 layout 410 ms; results identical to the caches-off path |
| At 500 records per chapter, in the browser | Chapter 4 Validate 13.5 s, Output 5.2 s, Model 15.6 s | Chapter 4 Validate 2.2 s, Output 1.7 s, Model about 3 s; Chapter 5 Model 5.7 s and Chapter 10 Validate about 3 s remain over the 3 s target (§6) |
| Walkthrough: new project → Chapter 11 → both SDD editions | 28 steps, 0 page errors, 0 failed requests; one SDD of 52,364 words and no figures | 35 steps in one document, 0 page errors, 0 failed requests; the full edition 33,575 words with 19 figures inline, the executive edition 1,855 words with 4 figures (`audit/round5/WALKTHROUGH.md`) |
| Client bundle | 125 script files; Projects route 913,094 B; chapters route 2,284,447 B | 127 script files (model-marks, record-picture, perspective-view joined; the explorer and its layout left); Projects route 928,625 B of 945 KB; chapters route 2,198,505 B of 2,260 KB (−141 KB); stylesheet 593,598 B (−51 KB); largest chunk 359,903 B of 368 KB |
| Worker build | 150 server modules | 152 server modules, the Anthropic SDK vendored |

## 3. Commits of this round

- `4c9160b` fix(perspectives): remove the retired explorer's four files that the perspectives commit left tracked
- `aca317f` build(bundle): budgets re-based on the measured round-5 sizes; suites registered; lint baseline ratcheted
- `7521eaf` perf(scale): chapter caps at 500 with a measured budget; checks, readiness, the SDD, the connected model and the layout within it
- `1e91564` feat(sdd): two editions and three audiences, figures in every format, one open-items appendix, provenance notes, a change section
- `3954d9e` feat(proposals): one Proposals surface, Sol reviews the model, findings adopted as actions, progress states, one name everywhere
- `7e53637` feat(guidance): one voice per screen, "You are here", findings as tables, a first-run coach and a help map
- `667871b` feat(perspectives): one picture world: the explorer's perspectives in the Model switcher, process editing and the settlement case kept, the explorer retired
- `dd51f7a` feat(pictures): the picture carries its state: checks painted on elements, semantic zoom, the trace path, alternatives ringed, a picture for every record
- `642c63e` fix(package): record the Anthropic SDK dependency the provider commit vendors
- `7e6811b` feat(sol): one provider seam, the Anthropic provider, Sol's review mode, a usable budget
- `c648211` docs(design): round 5, pictures that carry state, one world, less text, a readable SDD, Sol on the Anthropic API
- the commit carrying this report, the walkthrough, the design pointer and the release field follows `4c9160b`

## 4. Discipline kept

- Every unit was verified by one full regression on a clean worktree of the integrated round (135 suites, 135 passed, 0 failed) and committed from that worktree's verified blobs, one commit per workstream, with the shared files carried by the workstream named in each message. The provider commits (`7e6811b`, `642c63e`) were verified earlier on their own clean worktree.
- The authority chain is unchanged: marks, readings, editions, the coach, the help map and Sol's review findings are presentation and advice; Adopt is the one new write and goes through the existing `review.action` command; perspectives save through `workspace.view`; process edits go through reviewed `workspace.apply` commands and the new reviewed `process.remove`; nothing an LLM returns approves, promotes, waives or mutates the graph; the refusal fallback withholds a draft rather than inventing one; candidate and discovery knowledge reach no proposal.
- No security or governance was weakened: redaction happens once at the seam for both providers; the budget stays within the owner's policy range; the suites' servers never see the shell's provider keys; no test was skipped, disabled or quarantined.
- No old and new path side by side: the explorer and its layout are gone with the perspective view in their place, after the explorer-only abilities (process editing, the settlement case) were moved; Mind Factory, the Co-author band and the separate task entries are one Proposals surface; the explorer-only CSS, the dead `chapterNextSelection`, `queueExplorationQuestion` and `architectureSolEntry` are removed.
- `productionAccepted` stays false. The release field advances to the candidate rc.10.73.10; the controlling baseline in the manifest script stays rc.10.73.6 until the owner records a release. The vendored packages' licence texts are recorded; licence approval is the owner's.

## 5. Gates at `4c9160b`

| Gate | Result |
|---|---|
| `node release-checks.mjs` on a clean worktree of the integrated round (3 workers, Chromium, no provider keys) | 135 suites, 135 passed, 0 failed (three new suites: scale, sdd-documents-browser, perspective-view; the explorer's suite retired) |
| `node check-syntax.mjs` | 454 application, service, script and verification modules pass |
| `node validate.mjs` (shell state in a vm sandbox) | passes |
| `node client-bundle.mjs` | no violations: chapters route 2,198,505 B of 2,314,240 B; Projects route 928,625 B of 967,680 B; largest hand-written chunk 359,903 B of 376,832 B; stylesheet 593,598 B of 634,880 B; 127 script files of 130 |
| `node build.mjs` (Worker build) | passes: 152 server modules, `@anthropic-ai/sdk` 0.131.0 vendored, packaged imports and asset serving verified |
| `node scripts/lint.mjs` | 0 new problems; baseline ratcheted 190 → 187 |
| Suites that read the release field, after it advanced | brain-integration, knowledge-second-brain, repository-sync pass |
| Clean install on a fresh archive of `4c9160b` (631 files) | `npm ci` adds 112 packages (7 for the Anthropic SDK); check-syntax, the client bundle and the Worker build pass. `npm audit` reports 4 moderate advisories, all through the pre-existing `drizzle-kit` → `@esbuild-kit` → `esbuild` 0.18 development-server path, which nothing in AIW runs; the only fix npm offers is a semver-major downgrade of `drizzle-kit`, so it is recorded here and left for the owner (§6) |

## 6. What remains, honestly

- **Two screens over the 3 s target at 500 records per chapter**: Chapter 5 Model (1,502 elements) at 5.7 s and Chapter 10 Validate at about 3 s. The layout is now linear in the elements; what remains is the SVG the browser paints. Paging the Diagram by lane, or drawing a lane's elements as one path at the far zoom, is the next step and needs a design decision about what a 1,500-element picture should show.
- **Chapter 11 Model keeps 129 visible controls**, 61 of them the desk's per-row part buttons. Taking them out changes how the desk works, so it is left for the owner's decision.
- **Hosted store row size**: a 500-per-chapter document is 11.8 MB; the local SQLite store takes it, the hosted D1 row limit does not without chunking. The import route's 12 MiB body cap is the only guard today.
- **Live Anthropic acceptance** is unverified: the provider, the review mode, the refusal fallbacks, the 429 mapping and the cache-usage receipt are covered on both wires with the mock provider; the real API's acceptance of the schemas, actual cache hits and per-call timeouts at higher effort need a key.
- **Three states on the picture**: Sol's "note" findings paint as to-confirm because the readiness model has three words; a fourth, advisory state would need the Key, the Table and the readiness counts to agree on it.
- **The trace keeps the nearest links only**: at each step of the chain it lights the records related by the nearest kind the Matrix holds (a recorded relationship before one through a record, before chains, and only the shortest chains). A record reached only through a longer path is not lit, and the companion names the gaps but not the paths it left out.
- **Four moderate npm advisories in development tooling**: `npm audit` on the clean install reports them, all through the pre-existing `drizzle-kit` → `@esbuild-kit` → `esbuild` 0.18 path (the esbuild development server, which nothing in AIW runs; AIW's own bundler is a current esbuild). The only fix npm offers is a semver-major downgrade of `drizzle-kit`; replacing or pinning the migration tool is the owner's call and is not done here.
- **Left by design for the owner's decisions** (unchanged from `DESIGN.md`): SSO with real roles and reviewer binding, presence and comments, Jira or Azure DevOps and docs-as-code exports, Confluence or SharePoint knowledge connectors, locales, telemetry and plans.
- Two stray files outside the repository (`/desk-browser.log`, `/browser.txt`) from an earlier round's shell remain; they are harmless and could not be removed from this session.

## 7. What this report does not claim

- No live model call was made: no API key exists in this environment. The Anthropic provider and the review mode are verified on both wires with the mock provider; acceptance of the large enum lists and the limits moved into schema descriptions, actual cache hits, and the per-call timeouts at higher effort are unverified against the real API.
- No production acceptance, licence approval, expert review, calibration or signing happened; `productionAccepted` stays false. The vendored packages' licence texts are recorded in `THIRD-PARTY-NOTICES.md`; licence approval is the owner's.
- Measurements were taken in headless Chromium on the reference, generated and fixture projects; other viewports and real projects were not measured.
