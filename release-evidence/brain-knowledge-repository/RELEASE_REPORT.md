# AIW Brain and knowledge repository — release report

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20**, successor to the supplied v19 (SHA-256 `1f4876421119fd15c464049a55e5356f03cc2aeec7ed5e3d31784c1c11c79ff1`) |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-brain-knowledge-repository` |
| Date | 26 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

The acquired architecture corpus is now a working knowledge repository on this laptop: 47 pinned GitHub snapshots, 186,219 file entries and 18,961 documentation files, every byte verified. The workbench searches it, reads verified passages and retrieves exact originals into a project through the one governed path that already existed. The Brain also gained the items its v19 architecture listed as ahead: the desk and Sol in the SDD, an evaluation harness, and Mind Factory from the desk. Beside Sol, it now shows repository leads that are never sent to Sol.

Nothing in this release approves knowledge or proves the quality of advice. Those gates belong to people and are listed under [What stays with people](#what-stays-with-people).

## What was delivered

| Area | Delivered | Where (in `AIW-V5-Local-Source/`) |
|---|---|---|
| Knowledge repository service | A separate laptop process. It streams the acquisition manifests (up to 409 MB each) and verifies every byte against its manifest hash on every read. Contract-v1 revision and passage identities are held in SQLite with a contentless FTS5 index, so there is no second copy of third-party text. The registry's path, size and licence policy are enforced. Loopback HTTP with a bearer token and a Host check; browser origins are refused. Notices are signed with an Ed25519 key that can sign notices only. | `repository-service/` |
| Workbench | Discovery routes at `/api/knowledge/corpus`, every response `discovery-only`. Exact-original retrieval goes through the existing `knowledge.fetch`, with the same `repository-fetch` identity as a live GitHub read; the workbench re-derives the identity and re-hashes the bytes itself. Signed notices are applied automatically when a project is opened. Mind Factory → Sources has a *Knowledge repository* surface: search, a verified passage reader, *Retrieve the exact original*, and *Interpret this passage* on its exact lines. Concepts lead to the passages that mention them. | `knowledge-repository.js`, `knowledge-service.js`, `repository-sync.js`, `worker.js`, `server.js`, `public/repository-corpus-ui.js`, `public/knowledge-*.js` |
| Brain | Repository leads beside what Sol will read, marked *not sent to Sol*. Sol never receives or cites them. The SDD's *Architecture reasoning record*. *Compare in Mind Factory* at a desk switch point: the weighing, each product's documented mechanisms and the governed claims that name it. Switch items anchor Sol's recall on the Chapter 7 realisation. | `public/brain-reasoning-ui.js`, `public/reasoning-record.js`, `public/product-comparison.js`, `public/desk-view.js`, `public/brain-reasoning.js` |
| Evaluation | 26 held-out decisions in three domains, run through the real reasoning path. It runs against the test double by default. Injected faults prove that the guards and metrics catch defects. Live mode needs a configured provider. | `evaluation/sol-heldout-v1.json`, `sol-evaluation.js`, `scripts/evaluate-sol-decisions.mjs`, `mock-llm-provider.mjs` |
| Live refresh | Fetches newer documentation from approved repositories at an immutable commit. Downloads are verified by git blob hash and credential-shaped files are quarantined. It fails closed on truncated trees, redirects, tampering and over-limit changes. Downloads go to a separate `acquired/` root; the original acquisition is never written. Includes `refresh.ps1` (lock and logs) and `register-refresh-task.ps1`, which has not been registered. | `repository-service/acquire.js`, `refresh.ps1`, `register-refresh-task.ps1` |
| Harness | Regression timeout and concurrency are configurable. A timed-out suite's whole process tree is ended on Windows. The explorer test closes SQLite before deleting it. Suites can no longer overwrite the runner's report. The desk suite waits for the flash that reports each action; the supplied v19 fails the old wait in the same way on this laptop. | `release-checks.mjs`, `architecture-explorer-validate.mjs`, `desk-browser-validate.mjs` |
| Documentation | Operator and architect guide; the Brain architecture, status and integration register; run guide and changelog. | `KNOWLEDGE-REPOSITORY.md`, `AIW-BRAIN-ARCHITECTURE.md`, `SECOND-BRAIN-STATUS.md`, `BRAIN-INTEGRATION-REGISTER.md`, `LOCAL-RUN.md`, `README.md` |

Against v19: 33 files added, 24 changed, none removed, 437 byte-identical. The 24-file pilot is retired. Its 24 revisions exist in the full store with identical contract-v1 identities, all current and retrievable. The older `knowledge-brain` discovery tool is marked superseded for architects.

## The corpus on this laptop

| | |
|---|---|
| Store | `ebb8387e-72a7-429e-894d-3fb0c264c48b`, baseline 25 September 2026 22:44 UTC |
| Connectors | 47: 30 approved, 9 candidate, 8 discovery-only |
| Use policy (acquisition dossier) | 8 ingest with attribution, 17 derive claims only, 12 adapter only, 10 metadata only |
| File entries in the pinned snapshots | 186,219 |
| Documentation revisions | 18,961, all current, zero unavailable |
| Can become project sources | 7,753 |
| Not retrievable | 11,091 from repositories not approved; 83 on paths the source contract does not accept; 34 over 60,000 bytes |
| Text-indexed | 8,432 files, 45,517 passages |
| Concept cues | 13,582, across 191 catalogue concepts |
| Builds | Initial build: 18,961 revisions in 50 s. A later refresh was interrupted and resumed: it re-verified the remaining 17,479 revisions in 26 s with no change and so no notices. Zero errors in both. |

Metadata-only dossiers are never text-indexed. Source: `CORPUS_EVIDENCE.json`.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Syntax, `npm run check` | 334 modules pass | `TEST_EVIDENCE.json` |
| Build, `npm run build` | Worker, static assets and D1 migrations built; the packaged import graph resolves | `TEST_EVIDENCE.json` |
| New suites, run from a clean package extract with no `node_modules` | All pass. New: repository-service (12 checks), repository-acquire (5), knowledge-repository (4), brain-ahead (5) and sol-evaluation (6). Related existing suites also pass: the core `npm test` (11), repository-sync and knowledge-second-brain. So does the test-double evaluation run. | `TEST_EVIDENCE.json` |
| Clean install, `npm ci --offline` | Passed: 17 packages from the local npm cache with no network access, so the lockfile agrees with `package.json`. Only Drizzle's migration tools are installed; the runtime needs none. | `TEST_EVIDENCE.json` |
| Browser (Playwright, Chromium) | 6 of 6 rendered checks at 1440 × 900 and at a 390 px phone width | `BROWSER_EVIDENCE.json`, `screenshots/` |
| Full regression, `release-checks.mjs`, 85 suites including 17 browser suites | All 85 pass on `3a6a336`: 82 in the full run, and the 3 cut short by laptop standby when re-run alone. The first run, on `8173665`, found one pre-existing test race, now fixed (below). | `REGRESSION_RESULTS.json`, `REGRESSION_RERUN.json`, `REGRESSION_RESULTS_RUN1.json` |
| Sol evaluation, test double | 26 cases and 28 assessments, none withheld. Verdict agreement 92.9 %, own reading cited 100 %, false support 0 %. | `AIW-V5-Local-Source/evidence/brain-evaluation/sol-test-double-2026-09-25.json` |
| Package | `AIW-V5-Local-Source-v20.zip`, 3,276,524 bytes, SHA-256 `b8183e3585638201897e42ab559c2511d1d947bb2d04634e5403229d715e6efa`. Reproducible and byte-identical to `3a6a336` (494 files). No excluded paths, secrets or personal data. | `PACKAGE_SHA256.json`, `PACKAGE_FILE_MANIFEST.json` |
| Corpus | Built and re-verified on this laptop. Through the workbench running against the real service, a search in Mind Factory → Sources for "transactional outbox" returned 8 passages. The 24 pilot revisions are all in the full store with identical identities. | `CORPUS_EVIDENCE.json` |

The test double returns canned answers. Its metrics show that the path, the guards and the metrics work, not that Sol judges well. Expected support cited (75 %) and "addresses the issue" (16.7 %) are low because the canned answers are generic, not written for each case.

**Security and integrity:**
- The service binds to loopback, requires a bearer token and a matching Host, and refuses browser origins. Hostile query text never reaches FTS syntax.
- The workbench verifies and applies notices signed with the notices-only key, and that key cannot make a release receipt verify.
- The signed-update path passes its checks:
  - release and independent authenticated review;
  - exact source binding, scope and origin;
  - replay and tamper;
  - invalidation and Brain withdrawal.
- Quarantined and metadata-only text is never searchable. Excerpts are re-verified against the original on every request.
- The live refresh is verified against a loopback fake: blob-verified downloads, credential quarantine, and fail-closed truncation, redirects and tampering.
- The package holds no private keys or tokens, no `.env`, databases, key material, repository store or corpus files, and no personal data.
- Secrets stay under `%LOCALAPPDATA%\AIW\repository-service`, outside Git, and the workbench `.env` is ignored. No signing private key is in the Site.

**The regression:**
- **First full run** (`8173665`): 84 of 85 suites passed. The failure was `test:desk-browser`. After a drafted fix is applied, the desk's flash stays until the next one replaces it. The suite waited for any flash and read it 300 ms later, so a slower 12-command change review was read as the previous flash.
- **Control:** the supplied v19, run alone from its verified archive on this laptop, fails at the same assertion with the same text. The race predates this release.
- **Fix:** the suite now waits up to 20 s for the flash that reports each action, and notes the cell's 2.6 s pulse at the same moment. The assertions are unchanged. v19 and v20 each then pass all 16 checks, with matching per-check times.
- **Final full run** (`3a6a336`): 82 of 85 passed, including the desk suite and every new suite. The laptop went into standby about a minute into the run, from 03:17 to 06:07. The two suites in flight outlived their 25-minute timers across the standby, and one browser suite timed out on its first page two minutes after waking. All three pass when re-run alone on the same commit.

**Not run, deliberately:**
- A live GitHub acquisition (network).
- A live provider evaluation (the sponsor's key and cost).
- Registering the daily refresh task (persistent configuration).
- The legacy `backend/` and `frontend/` builds of the monorepo. This deliverable is the V5 Local Source, whose one build produces both the server Worker and the static client. Those trees hold earlier uncommitted work that this release does not touch.

## Deviations from the plan

- **CLI.** `init` creates the service token and the notice key; `build` doubles as the refresh; `acquire` is new. Release signing stays with the existing `scripts/sign-repository-sync.mjs`, so there is no second signing path. The plan named separate keygen, refresh and sign commands.
- **Passages.** At most 60 lines; the plan allowed 100.
- **Licences.** Taken from the acquisition dossier (the GitHub API's detection and the dossier's disposition), not from scanning licence files in each snapshot. Both are labelled detected, not cleared.

## What stays with people

| Dependency | Whose decision | Status |
|---|---|---|
| Licence and redistribution review of the corpus | Licence counsel | Not started. Licences are detected, not cleared. The 10 metadata-only repositories are not text-indexed. Corpus content is not uploaded to the hosted workbench. |
| Independent review of repository claims | A second authenticated reviewer (four eyes) | None reviewed. The local server has one identity, so a repository claim cannot complete review there. |
| Production signing and key custody | Enterprise KMS authority | No production key is installed. The notice key is a local key under `%LOCALAPPDATA%`. The release-signing private key must stay offline on the laptop. |
| Expected advice in the held-out set | An independent architect | Written by the implementation; it needs review and amendment before any result is relied on. |
| Live provider evaluation | Sponsor: their provider account and cost | Not run. `npm run evaluate:sol:live` needs `OPENAI_API_KEY` and `AIW_LLM_MODEL` in `.env`. |
| Live GitHub acquisition | Sponsor: network use and rate limits | Not run. Start with `node repository-service/cli.mjs acquire --dry-run`. |
| Daily refresh task | Sponsor: persistent configuration | Written, not registered (`repository-service/register-refresh-task.ps1`). |
| Hosted workbench access to the corpus | Architecture decision, after licence review | The hosted Site cannot reach the laptop. It keeps the bundled locators, the packet preview and signed-update upload. |
| An architect-reviewed SEABaaS baseline | Architect | Not done. |
| Production acceptance | Production acceptance authority | Not claimed. |

## Housekeeping for the sponsor

- The earlier discovery index `knowledge-repository/knowledge-brain/output/collection/collection.sqlite` (about 826 MB) contains text from the 10 repositories whose dossier permits metadata only. It is flagged as restricted in its README and has not been deleted. Deleting it is your decision; nothing in the workbench needs it.
- `knowledge-repository/AKR-0.10.73.7_/` (the unpacked acquisition, read in place) and `knowledge-repository/AKR.zip` were not created or changed by this work, and remain untracked. Only `github-live/` inside the acquisition is git-ignored, so take care with `git add -A` at the repository root.
- The working tree also holds earlier uncommitted changes, for example under `backend/` and in `AGENTS.md`. They are not part of this release and were not committed.

## Commits

| Commit | |
|---|---|
| `847cd33` | Checkpoint: the supplied v19, imported byte for byte |
| `86ef5fb` | Plan recorded; regressions made measurable on Windows |
| `21cf426` | The knowledge repository service over the full acquired corpus |
| `41f64f6` | Mind Factory → Sources connected to the knowledge repository |
| `b6dead3` | The Brain's open items and repository leads |
| `3d29ef7` | Live documentation refresh |
| `8173665` | Guide, Brain status and rendered checks |
| `56b58f6` | The runner keeps its own report; handoff status corrected |
| `3a6a336` | The desk suite waits for the flash that reports each action |

The evidence in this folder is committed on top of `3a6a336`, which is the source of the v20 package.

## Running it

From `AIW-V5-Local-Source`:
- **Repository service:** `npm run repository:init` once, then `npm run repository:build`, then `npm run repository:serve`.
- **Workbench:** `node --env-file=.env server.js`.

Both were stopped at the end of this work. [`KNOWLEDGE-REPOSITORY.md`](../../AIW-V5-Local-Source/KNOWLEDGE-REPOSITORY.md) is the full guide.
