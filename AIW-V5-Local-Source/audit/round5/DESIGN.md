# Round 5 design: pictures that carry state, one world, less text, a readable SDD, Sol on the Anthropic API

Baseline: `c658a2c` (AIW v0.10.0-rc.10.73.9 candidate). Asked for: update AIW along the assessment of 2026-10-02: market readiness, the Anthropic API, diagrams and models that carry understanding, less text and a guided journey, a Brain that narrates connections, a readable SDD, Sol and Mind Factory, more visuals that carry state.

What landed, what was measured, and what remains: `audit/round5/REPORT.md`. The refreshed walkthrough from a new project to Chapter 11 and both SDD editions: `audit/round5/WALKTHROUGH.md`.

## What this round takes, and what it leaves

Taken (each a workstream below): the Anthropic provider and a usable Sol budget; pictures that carry state (checks painted on elements, semantic zoom, the trace path, before-and-after, every record with a picture); one picture world (the explorer's perspectives inside the Model switcher); one guidance voice per screen, findings as tables, a "You are here" line, a first-run coach and a help map; a Sol review mode on the model and one Proposals surface; the SDD in two editions with figures, an open-items appendix, provenance footnotes and a change section; the chapter caps lifted with a measured performance budget.

Left for the next round, named so nobody assumes they are done: SSO with real roles and reviewer binding, presence and comments, Jira or Azure DevOps and docs-as-code exports, Confluence or SharePoint knowledge connectors, locales, telemetry and plans. Each needs a decision the owner has not taken.

## Measured today (reference project, 1440×900; the walkthrough's SDD)

| Fact | Value |
|---|---|
| Words on the stage: Chapter 8 Validate / Chapter 11 Model / Chapter 11 Validate | 2,044 / 2,639 (+1,127 in the companion) / 1,579 |
| Controls on one screen: Chapter 8 Validate / Chapter 11 Model | 134 / 202 |
| Guidance voices on one screen | five: heading, subtitle, arrival toast, "What comes next", assistance chip |
| Picture worlds | two: the chapter model and "Explore all perspectives" |
| Proposal surfaces | four: spark bands, Mind Factory, design tasks, the journey draft |
| First fit of a picture | zoom 0.5: element types at 4.75 px, words inside at 5 px |
| The SDD | 49,533 words, 6,953 lines, 0 figures in Markdown, 150 "Unassigned", 165 "Open question", one line repeated 90 times, one boilerplate block 18 times |
| Chapter caps | 50 responsibilities; 60 components, capabilities, contracts, data definitions |
| Sol budget | 10 requests an hour per project, owner policy capped at 10 |

## Contracts shared by the workstreams

### Contract M · marks on the picture (`aiw:model-marks`)

Any source can say what state an element is in; the renderer paints it the same way everywhere.

- `window.aiwModelMarks.set(source, marks)` and `clear(source)`; `marks: [{id, state, note, href?}]` where `state` is one of `pass`, `fix`, `confirm` (the chapter checks, from `chapterChecks` in `readiness-model.js`, keyed by record id), `ghost` (a proposal not yet saved), `changed` (an impact or an alternative), `traced` and `dimmed` (the trace path). The event `aiw:model-marks` carries `{source}`; the notation and every chapter view redraw their marks without re-laying out.
- Precedence when two sources mark one element: `traced` > `changed` > `fix` > `confirm` > `pass`; `ghost` is drawn as its own element; `dimmed` lowers opacity and never hides.
- Painting: the shared glyphs and words of `readiness-model.js` (✕ to fix, ○ to confirm, ✓ passing), a ring for `changed`, a hatched outline for `ghost`, a highlighted path for `traced`. The Key explains every state it draws. Nothing is written to the document.
- Sources in this round: the chapter checks (always on, with a switch in the Layers menu), the trace path (pick a requirement or any record: its chain through the layers lights, the rest dims), change impact and decision alternatives (before and after), Sol's review findings, proposals (ghosts).

### Contract P · the model provider seam

`modelCall(env, status, {instructions, input, schema, name, mode}, call, fetcher)` in `intelligence-provider.js` is the one seam every mode uses (draft call under a strict schema, then a check call). A provider is chosen by `AIW_LLM_PROVIDER` (`anthropic` | `openai`), defaulting to `anthropic` when `ANTHROPIC_API_KEY` is set and `openai` when `OPENAI_API_KEY` is set. The Anthropic provider uses the official SDK (`@anthropic-ai/sdk`, fetch-based, so the Node server and the Worker share it), `claude-opus-5-5` unless `AIW_LLM_MODEL` names another, structured outputs with the same JSON schemas (`output_config.format`), adaptive thinking, `output_config.effort` from `AIW_LLM_EFFORT` (default `medium`), prompt caching on the pinned instructions and on the brief passages of a journey, streaming with the final message for the journey and generate modes, server-side fallbacks on refusal as the SDK documents them, and receipts carrying provider, model, response id and usage including cache reads. The mock provider in the suites answers both shapes. The owner's policy allows 0–120 requests an hour (default 30) and keeps the daily token cap; the status endpoint names the provider.

### Contract R · Sol reviews the model

Mode `review` (prompt pin `sol-review-1`): the packet is the chapter's records, its connected model and its current checks; the output is `{findings: [{elementId, severity: 'fix' | 'confirm' | 'note', title, reason, sourceRefs}]}` with every element id and source ref in the packet, validated and checked like the other modes, receipted, saved as an intelligence run. Findings are advisory: they are painted through Contract M (source `sol-review`), listed in the companion, and become canonical only when the person adopts one through the existing `intelligence.adopt` path. Sol never writes a check.

### Contract E · SDD editions

`GET /api/export?chapter=11&format=md|html|json&edition=executive|full&audience=all|delivery|review` (defaults `full`, `all`). The executive edition is at most about 3,000 words: title and ownership, at a glance, the design so far (a rule-based story from the accepted records: the journey, the decisions with their chosen alternative and rationale, the shape of the application, where it runs), four figures (the journey, the logical application, the deployment, the traceability matrix), risks and open items as counts with the ten most important, delivery obligations. The full edition keeps the registers with: figures in every format (inline SVG in Markdown and HTML; PNG rasterised in the browser for DOCX; the PDF says where its figures are when it cannot embed them), one open-items appendix with inline markers instead of repeated gap text, no empty boilerplate lines, provenance footnotes from `provenance.journey`, and a change section against the last frozen baseline when one exists. `audience=delivery` keeps obligations, interfaces, data and runtime; `audience=review` keeps decisions, risks, findings and traces.

### Contract G · guidance and chrome

One guidance voice per screen: the heading and its subtitle. The arrival toast says only the chapter name. "What comes next" is one line. The assistance chip appears only when it adds a fact the heading does not. The breadcrumb appears once. The footer carries the product and the connection state. A "You are here" line names chapter · tab · view. Readings in companions are two lines with "More". Validate groups are closed except the first. Targets on the reference project at 1440×900: Chapter 8 Validate under 900 words on the stage; Chapter 11 Model under 1,200 on the stage and 300 in the companion; no screen with more than 80 controls visible.

## Workstreams and ownership

| Workstream | Owns | Must not touch |
|---|---|---|
| R5-A Sol provider and review mode | `intelligence-provider.js` (+ new `intelligence-anthropic.js`), `intelligence-service.js`, `public/intelligence-context.js` (the review packet), `operation-service.js` (policy range), `mock-llm-provider.mjs`, `.env.example`, `package.json` dependency, `build.mjs` if the Worker bundle needs it, the intelligence, sol-* and security suites, README/LOCAL-RUN provider notes | the client, except `public/intelligence-context.js` |
| R5-B pictures carry state | `notation-view.js`, `notation-svg.js`, `notation-layout.js`, `notation-palette.js`, `notation.css`, `model-stage.js`, `layers-view.js`, `model-table.js`, `model-matrix.js`, new `model-marks.js` and `record-picture.js`, one mount line in `app.js` for the record picture, the notation and model-views suites | the chapter view modules' own code beyond calling the kit, the explorer, the desk, the studios |
| R5-C one world | `architecture-explorer.js` (becomes a view like the others), `workspace-ux.js` explorer parts, `app.js` explore and modelView routing only, explorer CSS, the explorer and ux-shell suites | the notation files (use their public API), the desk, the studios |
| R5-D guidance, chrome, journey | `app.js` heading, bar, footer, toast, coach, help map and "You are here" (not the Model render branch, not routing), `shell-ux.js`, `validate-view.js`, `review-ui.js` except its export block, `desk-view.js` companion and status texts only, `styles.css`, `validate.css`, `desk.css` text rules, `workspace-ux.css`, their suites | the notation files, the explorer, the export block of `review-ui.js`, `readiness-model.js` |
| R5-E proposals and Sol in the client | `brain-context-ui.js` (Mind Factory becomes Proposals), `field-spark.js`, `field-suggestions.js`, `design-task-ui.js` entry, `journey-draft-ui.js` entry, `brain-reasoning-ui.js` for the review findings, `coauthor-ui.js`, their CSS and suites; starts when R5-A's review mode and R5-B's marks exist | the provider, the notation files, the chrome |
| R5-F the SDD | `review-domain.js` assembly, `sdd-renderer.js`, `sdd-figures.js`, `review-documents.js`, `review-pdf.js`, `worker.js` export parameters, `review-ui.js` export block, the review, readiness and export suites | the chapter domains, the client beyond the export block |
| R5-G scale | the chapter domains' caps, `document-memo.js`, a performance probe and suite at 500 records per chapter with budgets (findings under 300 ms, the readiness board under 500 ms, SDD assembly under 2 s, Diagram layout under 1.5 s at 500 elements), `scripts/build-scale-fixture.mjs` | the views (the model-views workstream owns paging) |
| Lead | integration, regressions on clean worktrees, commits, the walkthrough refresh, the report, the package | — |

The authority chain is unchanged: nothing here writes the document except through existing commands; marks, readings, editions and Sol's review findings are presentation and advice; `productionAccepted` stays false.
