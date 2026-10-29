# Round 12 remediation · 2026-10-10

Source candidate based on the supplied AIW V5 ZIP. This directory was not a Git checkout, so there is no commit to identify or deployment to infer. The release remains `AIW v0.10.0-rc.10.73.16` and `productionAccepted` remains false.

## What changed

- The architecture model contract now runs from the existing journey draft service. **Draft with Sol** sends bounded theme packets and a cross-cutting packet to the configured architecture route. **Build rules skeleton** remains an explicit separate choice. The model result produces the same sealed draft bundle, preview, and governed apply commands as the rules draft.
- Each theme records its proposal sources, Sol interpretation, provider/model receipt and usage, or a withheld/failed reason. Requirement references from the cross-cutting pass resolve to the original requirements. Each checkpoint is bound to the project revision, skeleton stamp and packet stamp; a retry with the same receipt reuses completed themes. An interrupted job can be resumed from the UI.
- The private review now pages full proposal records by chapter, including proposed field commands, citations, reasoning and open values. The UI shows theme progress and distinguishes model proposals from rules skeleton records. A person must review a current preview before applying. Agent accounts cannot claim that review; project AI policy and architecture route availability are checked before starting.
- The release manifest commands now create and verify `SOURCE-MANIFEST.json`, including detection of newly added, unlisted source files. This manifest is file-integrity evidence, not release approval.
- The client bundle threshold reflects the measured whole knowledge-base bundle after the new integration; the build's bare-import scan no longer treats a string expression as an import.
- Rendered testing found the Sol wording preview still asserted an old summary sample. The chapter review now exposes which fields Sol reworded and their source references, and displays readable reference lists instead of raw JSON or machine confirmation flags. Its browser check opens the actual paged proposal details. The phone toolbar now keeps Help beside the tabs, shortening its chrome. The SDD content checker reads the shared Chapter 2 title. The layout router derives the exact Manhattan heuristic for each cardinal step from the current cell, reducing repeat work without changing routes.

## How to exercise it

1. Install dependencies with `npm ci`, copy `.env.example` to `.env`, configure a server-side `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`, and optionally set `AIW_LLM_ROUTE_ARCHITECTURE=default:model-name` to select the default provider's architecture model. A named provider declared in `AIW_LLM_PROVIDERS` uses `name:model-name`. Run `node --env-file=.env server.js` (local instructions in `LOCAL-RUN.md`). No key is included in this package.
2. Create or open a project with requirement groups and use its journey drafting action. Choose **Draft with Sol** to draft the whole architecture, or **Build rules skeleton** to keep deterministic drafting. A disabled project AI policy blocks the first choice.
3. Open **Review proposals** for the completed job, inspect chapter pages and the proposed commands and citations, then use the existing preview and human apply action. Retry an interrupted job using the same receipt; a project revision change makes its preview stale.
4. Run `npm run release:verify` on the unpacked source and rerun the suites listed below. The manifest is generated after this report and all source changes.

## Verification observed in this environment

| Check | Result |
| --- | --- |
| `npm run test:architecture-service` | Pass: mocked provider through Worker job, private paged review, preview, human apply |
| `node architecture-job-validate.mjs` | Pass: two-pass theme/cross job, checkpoint, withheld fallback and provenance |
| `npm run test:providers`, `npm run test:intelligence` | Pass: provider routing and mocked provider contracts |
| `npm run test:drafter-groups`, `npm run test:sdd-architecture` | Pass: grouped drafting and SDD architecture contract |
| `npm run test:review-plan`, `npm run test:architecture-ui` | Pass: domain-scale review and DOM/Worker UI behavior |
| `npm run test:export-build` | Pass: 19 consistent exports and server-thread revision builds |
| `npm run test:sdd-content` | Pass as diagnostic: 8 of 31 rich synthetic fixture records meet substantive content standard (26%); Sections 2 and 3 are skeletons |
| `npm run check`, `npm run build` | Pass: syntax/lint ratchet (183 existing problems, no new problems) and production bundle |
| `npm run test:journey-draft-browser` | Pass: 14 rendered checks from a new project through Chapter 11, Validate, SDD, Sol wording, 1,400 imported requirements, reload and reviewed apply; no page or API errors |
| `npm run test:architecture-model-browser` | Pass: new imported project, 7 model calls, 6 checks, cited chapter review, phone reload and human apply; no page errors |
| `npm run test:model-views-browser`, `npm run test:validate-browser`, `npm run test:ux-shell` | Pass: 26 rendered model checks, 15 Validate checks, 27 navigation/shell checks including all eleven chapters and phone widths |
| `npm run test:screens-at-size`, `npm run test:lifecycle-browser` | Pass: large-project companion, progress, review notice and export (5 checks across A/B), lifecycle actions across Chapters 1–10 (2 checks) |
| `npm run test:sdd-size` | Pass in isolated run: 5,572 records, 285 KB architecture Markdown, 96-page PDF, 117 pages with figures, 1,501 ms cold executive edition, 6,039 ms figured Markdown. Earlier contended runs missed time limits, so repeat on target hardware. |
| `npm run test:notation-layout` | Pass after A* optimization: 120 layouts and integrity/determinism checks, Chapter 5 Layers 891 ms against 900 ms. Earlier run was 997 ms; margin remains narrow. |

The browser obstacle was resolved by using the official Chrome for Testing headless shell package: Playwright's CDN answered with HTML rather than a ZIP, while the official Google package loaded and ran locally. Two synthetic model review captures were inspected locally and are not included in the redistributed source. They depict a deliberately simplistic loopback model double, not accepted architectural advice.

There has been no live provider run with the user's key and no client-specific substantive content acceptance. The richer SDD remains a product gap; passing a content diagnostic does not mean the SDD is ready for production. Hosted Worker execution limits may require shorter jobs or an external queue for large model runs, even with checkpointing. The broad review domain test is not evidence that the entire bulk review UI has been exercised. Performance time bounds varied by run and Chapter 5 is only 9 ms inside its limit; repeat both gates on representative deployment hardware. Browser suites cover named flows and viewports, not every possible interaction.

## Next acceptance sequence

On a connected staging environment: configure the architecture provider route and budget, run a fresh project with a real model through chapter review, exercise interruption and resume under hosted execution limits, compare the applied model and SDD against real architecture evidence, then repeat the performance gates on target hardware. Resolve the content and performance findings before approving a production candidate. No production deployment or acceptance is represented by this ZIP.
