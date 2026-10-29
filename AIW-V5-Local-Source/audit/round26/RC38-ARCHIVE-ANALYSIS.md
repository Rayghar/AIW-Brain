# AIW rc.10.73.38 archive — analysis against the round 26 tree

Prepared by Sol (lead) on 2026-10-21 from `AIW-rc38-source.zip` (SHA-256 `a57ac0f9ef8ddb097830854ba3913faae931536f9eaa3033a42f63a0652850f5`, 1,430 files).
Comparison base: the round 26 branch at commit 8969b23 (all four workstreams merged plus the lead's fixes).
Controlling baseline unchanged: AIW v0.10.0-rc.10.73.6. `productionAccepted` is false in the archive's manifest and nothing below changes that.

## 1. What this archive is

- **Identity.** Release `AIW v0.10.0-rc.10.73.38+studio.20261021`; parent commit `83854ef…` (rc37). The notation is preserved. Twelve releases (rc27 → rc38) were cut between 17 and 21 October.
- **Lineage.** It forks from the round 26 package at commit **802090a** (W1 shell fixes + W4 Output merged). Evidence: `audit/round26/merge-notes/` holds only W4.md; `studio-kit.js` is byte-identical to the pre-W5 version; the Work-frame suite does not exist; the round 27 assessment lists PLAN.md, GAP-REGISTER.md and W2–W5.md as *inputs* and says historical branch claims "do not establish current source".
- **So the Model (W2), Validate (W3) and Work (W5) code of round 26 was never merged there.** The archive re-implemented those decisions its own way (`work-frame.js`, `record-card.js`, `validation-workspace.js`, `output-workspace.js`, `model-round27.css`) and then went well beyond them (rounds 28–29, rc30–38).
- **Our branch is superseded.** 8969b23 now carries only three things the archive does not: the merged W2/W3/W5 code (different from the archive's own), the lead's fix-forward set, and the Work-frame suite. None of it transplants cleanly; the right move is to make rc38 the new baseline (section 7).

## 2. What changed, in volume

| Measure | Round 26 (8969b23) | rc38 archive |
|---|---|---|
| Client modules (`public/*.js`, bytes) | 11.91 MB | 12.79 MB (+7.4%) |
| New client modules | — | 40 (the largest: architecture applicability, architecture intelligence, evidence workspace, validation workspace, workbench actions, chapter insight) |
| Test suites (`*-validate.mjs`) | 261 | 356 |
| `test:*` scripts | 272 | 346 (311 run by the release runner) |
| Chapters-route bundle cap | 2,912 KB | 3,042 KB (measured 3,114,012 B) |
| Stylesheet cap | 768 KB | 846 KB (measured 866,189 B) |
| Runtime dependencies | — | unchanged (lockfile identical) |
| Server (`server.js`, `settings.js`) | — | unchanged; `worker.js` +5 lines; `intelligence-provider.js` +8 lines |

What the releases added, by their own notes: one Work composition in all eleven chapters with a task path per section, a prioritised Validate queue with grouping, cause roll-ups and bulk confirmation, Output with document selector and previews, connection controls on all nine native drawings (Overview/Selected/All/None, Reveal next), Layers by ArchiMate layer, Arrange presets, a three-lens component Specification, driver-led design journeys, architecture obligations and verification, external model reconciliation, server-issued Undo receipts, enterprise references and knowledge coverage.

## 3. What I verified myself

| Check | Result |
|---|---|
| `npm run build` | Passes. Chapter code 3,114,012 B under the raised 3,042 KB cap. |
| `npm run check` (syntax + lint ratchet) | **Fails.** 239 problems against the 172 baseline: 24 new (unused variables, empty blocks, and 3 import cycles from the new `aiw/no-import-cycle` rule). The baseline file is unchanged, so the gate is honest and red. |
| Secrets | None. The only `sk-…` strings are the two fake keys in existing test fixtures. |
| Client material | 81 register-style identifiers, all already in the 14 October baseline, plus **four occurrences of one `UATC-…` identifier in the new `audit/round27/release-verification.json`**. |
| Model identifiers | The default Sol model in `settings.js`/`.env.example` names a Claude model; that is product configuration and was already so. No session identifiers in code, tests or evidence. |
| Live probe, view-row hang (round 26 defect) | **Not present.** The archive's watcher observes only `aria-pressed` and fits on an animation frame; Chapter 11 Model answers in 8 ms with Sol open. |
| Live probe, arrival by address | Chapters 4 and 5 arrive with guidance and no pre-selected record (round 26 row X-05/X-06 closed in the archive). |
| Live probe, page errors across 12 screens | 0 page errors, 0 console errors. |
| Live probe, Model canvas at 1440×900, Sol closed | 452 px tall (round 26 floor was 360 px). With Sol open: 304 px. |
| Live probe, Model canvas on a phone (390×844) | **14 px.** The switcher, lens row, element row, connection row and the 219 px footer leave no canvas (screenshot `phone-ch5-model-clean.png`). |
| Full regression (`release-checks.mjs`, 312 suites, 2 workers, 85 min) | **214 pass, 98 fail.** Every one of the 19 failed node-only suites I re-ran alone fails again, so those are real. Ten browser suites re-run alone fail again (§3a). |

### 3a. What the regression failures are

The archive's own `verification.json` records *focused* checks per release; it does not claim a whole-repository run, and the runner shows why. The 98 failures fall into four kinds:

- **The core harness is broken.** `npm test` (`validate.mjs`, the shell's node harness that evaluates `app.js` with its helpers in one context) dies with `Identifier 'NAMES' has already been declared`: `chapter-names.js` and `app.js` both declare `const NAMES` at top level. `module-scope` fails the same way. Nothing that depends on that harness has run since the duplicate was introduced.
- **Suites still expect earlier markup or words** (real drift between tests and code): `decisions` (Chapter 3's blank-project switch), `quality`, `ars`, `utility`, `coauthor`, `intelligence`, `desk`, `product-choice`, `seeded-proposals`, `driver-solution`, `chapter-reasoning`, `design-concern`, `stewardship`, `sdd-formats`, `sdd-mermaid`, `knowledge`, and the stale evidence files flagged by `chapter-lines` and `reference-projects`.
- **Two hygiene gates fail on real defects:** `server-hardening` finds settings read by the code that `settings.js` does not declare (`AIW_QA_CLIENT` and others, introduced by the round 28–29 harnesses), and `xss-browser` finds `knowledge-relevance.js` defining its own `esc` instead of importing the shared one.
- **Browser suites:** about 40 timeouts and assertion failures; the ten re-run alone all fail again (below). `refinement-walkthrough` and `inspector-toggle-browser` need an authored walkthrough directory that the archive does not ship, and `scale` timed out at 360 s.

**Browser suites re-run one at a time, no other load:** all ten fail again — `requirements-browser` (waits for the Chapter 1 import control `.r-import`), `studio-dialog-browser` (waits for `.l-work .l-record`), `platform-browser`, `stack-browser`, `model-views-browser` (a `TypeError` in the suite itself), `desk-browser`, `exchange-browser`, `field-kit-browser`, and the archive's own `round27-work-browser` and `round27-validate-browser` (the latter records 0 passed). So the browser failures are drift between the suites and the current surfaces, not host load. I did not see a single browser suite fail only under load.

## 4. Findings, ranked

1. **The quality gates are red.** `npm test` cannot even start (the duplicate `NAMES` declaration), the full regression fails 98 of 312 suites with the node-only ones failing alone, and `npm run check` fails with 24 new lint findings. The rc38 notes say whole-repository lint was not run; they are right. Three of the findings are import cycles among `design-reasoning.js`, `driver-links.js` and `technology-realisation-domain.js`, which is an architecture smell, not a style one.
2. **No release since rc34 was seen in a real browser by its authors.** rc37 and rc38 state it plainly: the managed preview was unavailable, evidence is native SVG rasters and WeasyPrint renders of static fixtures, and `realise-browser-validate` was updated without being run. Rounds 28 and 29 did have browser walkthroughs (2,745 and 180 recorded clicks), so the drift is four releases deep. My own browser run is the first on this code: see the regression line above and the phone finding below.
3. **The Model is unusable on a phone.** 14 px of canvas. Measured on Chapter 5 at 390×844: the Model frame is a fixed 560 px grid whose rows are the switcher block (131 px), the lens/element/connection rows (193 px), the canvas (14 px) and the footer (219 px); the canvas gets what is left. `model-round27.css` pins the stage to `height:100%` of that row. The fix is small: on phones let the frame grow with a canvas minimum (about 320 px) and fold the footer, then pin it in a browser suite. Desktop is fine (452 px with Sol closed).
4. **Round 26's browser contracts were replaced, not loosened, but coverage moved.** Assertion lines fell in `model-views-browser` (237→211), `validate-browser` (180→146), `tray` (111→89) and others because W2/W3 code is not there; the archive's own `round27-*` suites cover its replacements. The Sol evaluation suite was rebuilt around a new 12-case authored dataset (71→21 assertion lines; the old held-out dataset is retained as evidence). No suite was deleted.
5. **Bundle caps moved 130 KB (+4.5%) in a week.** Each move is recorded with its measurement, as the policy asks, and RC36-DESIGN.md itself says "do not increase limits to conceal a loading regression". The sizes are honest; the trend is the finding.
6. **Verification claims are carefully worded and mostly true.** The notes distinguish static renders from screenshots, list what was not run, and keep `productionAccepted` false. One `notation-layout-validate` result is reported as "not fully passed" because of their tool environment; it should pass here (see regression).
7. **One client identifier leaked into new evidence** (`audit/round27/release-verification.json`). Trivial to scrub; worth a rule in the evidence generator.
8. **Small a11y nit.** After a chapter change the Sol panel's title carries a visible focus ring (`ch5-model.png`); focus should land on the panel's first control or on the main heading.

## 5. Governance and security review of the server-side changes

- **`worker.js`.** Two new command families are routed: `action.*` (undo receipts) and `validation.*` (bulk confirmation). The request body limit is raised from 500 KB to 4.5 MB **only** for `evidence.model-reconcile`; every other command keeps 500 KB. Authorship stamping, four-eyes flag, provenance blocks and change tracking still run for the reconciled commands (they are recorded as a `workspace.apply` batch). Acceptable; the larger limit is behind the same authentication as before.
- **Model reconciliation** (`model-reconciliation.js`). Requires `reviewed:true`, a reason, and a stamp that matches the current source and design; every identity row must be explicitly kept or taken; patched records enter with `confirmed:false`; a reconciliation history and a source version are kept. This follows the doctrine (a person decides; nothing silently mutates the graph).
- **Undo** (`action-undo-domain.js`). Server-issued receipts for a bounded set of nine working actions (intake reviews, driver moves, draft preferences, simulations, scenarios). No approvals, freezes, reviews or baselines are undoable, and the client cannot supply old stamps. Good design; it closes round 26 row W-03 properly.
- **Bulk confirmation** (`validation-confirmation-domain.js`). Requires a reviewer name and a review basis, confirms only records the chapter's own command can confirm, and says in its labels that no test or approval is implied. Closes row V-08 the way the plan asked.
- **Review handoff** (`review-domain.js`). Unchanged in substance and slightly stricter: a current architect-reviewed baseline, approval evidence, and a *second signed-in person* for the approval.
- **Sol prompts** (`intelligence-provider.js`). Prompt versions bumped (field 3, journey 2, review 2); a drafted value now needs a project passage or upstream record and may not cite knowledge outside the record's declared scope. Tighter than before.
- No new network endpoints, no dependency changes, no secrets, `server.js` and `settings.js` byte-identical.

## 6. What this means for the round 26 register

The archive's round 27 registers reconcile our 98 rows against its own code: Work 26 rows (8 implemented, 12 "implemented pending browser", 2 partly, 4 with corrections), Model 30 rows (29 done, 1 remaining), Validate 12 rows (all done, 2 with corrections), Output folded into one scope record. I did not re-verify each row; the live probes confirm the ones I could see (arrival with guidance, one section switch, one Validate frame, documents with preview, undo and bulk confirmation present).

## 7. Recommendation

1. **Adopt rc38 as the new working baseline** and retire our 8969b23 branch to history. Keep the controlling baseline rc.10.73.6 and the notation. Nothing from our W2/W3/W5 merges should be transplanted; the archive's versions are the live ones and are better integrated.
2. **Before anything else, make the gates green:** the duplicate `NAMES` declaration so `npm test` runs at all, the 24 lint findings (the 3 import cycles first), the `server-hardening` and `xss` defects, then the 98 failing suites one by one, deciding for each whether the suite or the surface is right; record the full run in `audit/`. This is a round of its own, not a patch.
3. **Fix the phone Model** (one CSS rule) and add a phone-canvas assertion to a browser suite that actually runs.
4. **Reconcile the suites with the surfaces, then run a real-browser acceptance** of rc34–rc38's surfaces (Specification lenses, connection controls, Arrange, Work task paths) on this host, where Chromium is available, and attach the evidence; until then the four releases' UI stays "rendered, not exercised".
5. Scrub the client identifier from `release-verification.json` and add that check to the evidence generator.
6. External authorities: unchanged and still open — licence/legal, independent architecture review, four-eyes knowledge approval, KMS, production acceptance. The archive claims none of them.
