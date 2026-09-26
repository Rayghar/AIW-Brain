# Sol's checks — release report (v20.1)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.1**, a fix release on v20 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-sol-check-fixes`, from the v20 release at `1c32f9c` |
| Date | 26 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

This release fixes three defects in how the product checks Sol's answers. A live evaluation of a v19-based build reported them. That build belongs to the separate v21 line, which the sponsor set aside, and nothing was taken from it. v20 had never changed the affected code, and each defect was reproduced on v20 before it was fixed.
- One oversized field in Sol's answer no longer costs every decision in the request.
- A drafted value worded as a guarantee is set aside on its own.
- The second check's instructions now separate defects in the advice from gaps in the design.

While verifying, a click race in five browser suites turned up. It was present in v20 as well, and it is fixed in the test harness.

## Before and after

Probe of each case on the same packet of six decisions, with the provider test double (`probe-sol-checks.mjs`, results in `PROBE_before.json` and `PROBE_after.json`):

| Case | v20 | v20.1 |
|---|---|---|
| Reasoning over 1,800 characters | Whole request fails: 0 of 6 answered | 6 of 6; the reasoning is cut after the last whole sentence and marked |
| A fifth risk | Whole request fails: 0 of 6 | 6 of 6; four risks kept, marked |
| A headline over 240 characters | Whole request fails: 0 of 6 | 6 of 6; cut at a whole word, marked |
| The same decision assessed twice | Whole request fails: 0 of 6 | 6 of 6; the second assessment is set aside |
| One oversized field, end to end through the provider path | Request fails: 0 of 6 | 6 of 6 |
| Guarantee wording in a drafted scaling policy | The whole assessment is withheld, correct replica count included | That refinement is set aside, shown and never applied; the replica refinement and the advice stand |
| Guarantee wording in the reasoning itself | Withheld | Withheld (unchanged, as it must be) |
| A broken structure | Request fails | Request fails (unchanged), and the workbench now says which check |
| The second check says design gaps are not defects in the advice | No | Yes |
| The second check says refinements are proposals, not achieved outcomes | No | Yes |

## What changed

- **The validator** (`public/brain-reasoning.js`):
  - Advice text over its limit is cut after the last whole sentence that fits, or at a whole word, and lists at their limit. The assessment names what was shortened.
  - A duplicated or unknown decision is set aside.
  - A foreign citation or empty text withholds only its own assessment.
  - Refinement values keep their rules.
  - Only a broken structure fails the request.
  - The provider schema bounds risks and questions to four each.
- **The guard:** a drafted value worded as a guaranteed or verified outcome is set aside on its own and never applied. Guarantee language in the advice itself still withholds it.
- **The second check:**
  - Its instructions list what is a defect in the advice and what is not: the design's own gaps, evidence still to be gathered and unapplied refinements are not.
  - It sees only the advice, not what was set aside.
  - Sol is asked to word refined values as what a part does, not what it ensures.
- **Failed requests** carry the validator's reason as `detail`, and the workbench shows it (`intelligence-service.js`, `public/brain-reasoning-ui.js`).
- **Sol's assessment card**, on the desk and in every chapter companion, shows *Set aside* and *Shortened to fit* (`public/brain-reasoning-ui.js`, `public/desk.css`).
- **Tests:**
  - `brain-reasoning-validate.mjs` has a new check, plus end-to-end, server and rendering assertions.
  - `chapter-reasoning-validate.mjs` now expects the corrected guarantee behaviour. Its requirement, that such wording is never offered for use, is kept.
- **Harness:** the click helper in five browser suites finds and clicks in one page task (`BROWSER_CLICK_RACE.md`).
- **Docs:** a README changelog entry; the authority boundaries and verification lists in `AIW-BRAIN-ARCHITECTURE.md`.

Against v20: 14 files changed, none added or removed (`PACKAGE_SHA256.json` lists them).

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Syntax, `npm run check` | 334 modules pass | `TEST_EVIDENCE.json` |
| Build, `npm run build` | Worker, static assets and D1 migrations built; the packaged import graph resolves | `TEST_EVIDENCE.json` |
| Suites from a clean package extract with no `node_modules` | All pass: brain-reasoning (8 checks), chapter-reasoning (9), stewardship (8), sol-evaluation (6), brain-ahead (5), the core `npm test` (11), the knowledge repository's suites (12, 5 and 4) and repository-sync. The test-double evaluation run also passes. | `TEST_EVIDENCE.json` |
| Clean install, `npm ci --offline` | Passed: 17 packages from the local npm cache, with no network access | `TEST_EVIDENCE.json` |
| Browser suites that render Sol | After the harness fix: brain-reasoning 5 of 5 runs (7 checks each), chapter-Sol 10 checks, stewardship 5, desk 16, knowledge repository 6 | `BROWSER_CLICK_RACE.md` |
| Full regression, `release-checks.mjs`, 85 suites | All 85 pass on `4f1e61b`: 81 in the full run, and the 4 browser suites cut short by the laptop's standby (threat, realise, responsibility, validate) when re-run alone. None of those four exercises Sol's checks. | `REGRESSION_RESULTS.json`, `REGRESSION_RERUN.json` |
| Package | `AIW-V5-Local-Source-v20.1.zip`, 3,281,128 bytes, SHA-256 `6de5dca115ccc2c4ce90318bf4b7fff6ac0de12e55923d9f97cab97d84faf29e`. Reproducible and byte-identical to `4f1e61b` (494 files). No excluded paths, secrets or personal data. | `PACKAGE_SHA256.json`, `PACKAGE_FILE_MANIFEST.json` |

## Not verified, and what stays with people

- **The second-check fix is instructions a live model reads.** Only a live run shows whether a model follows them, and how often a real model now trips each check. That run needs the sponsor's go-ahead, since it uses their provider key and costs money: `npm run evaluate:sol:live`.
- **Everything listed in the v20 report is unchanged:**
  - licence review;
  - a second authenticated reviewer for repository claims;
  - production signing keys;
  - architect review of the held-out expectations;
  - a SEABaaS baseline;
  - production acceptance.
- **An observation, not changed here:** the older design-drafting path (`public/intelligence-context.js`) has the same throw-on-oversize pattern. No defect was reported there.

## Commits

| Commit | |
|---|---|
| `f34bea5` | Plan recorded: the baseline checkpoint for v20.1 |
| `86d605a` | Sol's checks cost only what fails them |
| `4f1e61b` | The browser suites find and click in one page task |

The evidence in this folder is committed on top of `4f1e61b`, which is the source of the v20.1 package.
