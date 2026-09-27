# Sol beside a direct LLM — release report (v20.3)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.3**, on v20.2 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-sol-direct-comparison`, from `962fb5e` |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

The sponsor asked three things: fix the evaluation, check Sol's answers directly, and confirm how a direct LLM's answers compare with the Brain and LLM together.

1. **The evaluation reads answers as Sol's checks do.** Before this release, the scorer:
   - read citation labels such as S13 as numbers;
   - flagged "does not guarantee", hedges such as "to be proven", and questions as claims;
   - guessed withholding reasons from their words;
   - counted a number outside its case's band as sound;
   - kept no wording, so none of this could be seen.

   All seven are fixed, and every flag keeps the sentence that raised it.
2. **Every answer is kept.** A withheld assessment keeps the draft its checks withheld. A kept report can be scored again without asking any model; each packet must still carry its stamp.
3. **A direct-LLM control arm.** The same model answers the same questions with what an architect would bring, but none of the Brain. The same scorer scores it, and the Brain's checks measure what they would have withheld. Only the evaluation can reach it: a check proves the application still reasons through `requestReasoning` alone.
4. **A live comparison, read answer by answer.** All 26 cases ran on `gpt-4.1-mini-2025-04-14` in both arms. The engineer read all 28 answer pairs (`ANSWER_REVIEW.md`). This is the engineer's reading, not independent review.

## What the comparison shows

| | Sol better | Same | Direct better | Both fail |
|---|---|---|---|---|
| Bank payment reference (16), where the design records its own facts | 10 | 4 | 2 | 0 |
| Citizen service and warehouse teaching designs (12) | 3 | 0 | 6 | 3 |

**What the Brain adds.** Sol works from the design's own figures. Without them, the direct model gave three values that would mislead an architect who took them:
- 16 replicas and 3 replicas, where about 24 are needed;
- a 10-second timeout on a 2-second path.

**What the Brain costs.**
- **Right answers withheld.** Four of Sol's seven withheld drafts were right. Three were withheld because the model filled the threat field on a decision. One was withheld because the guard read a question as a claim, after which the second pass contradicted itself.
- **The example load.** On the teaching designs, the desk's capacity arithmetic carries the Playbook's example objective. Sol took it as the project's load in all four capacity assessments, and two of those reached the architect.

The automated metrics, even corrected, cannot see this: they test the class of verdict and a keyword, not values against the design.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Full regression, `release-checks.mjs` | **87 of 87 suites pass on `53eb9a2` in a single run**, 00:51–01:02 UTC, including every browser suite. A first attempt did not set the Playwright module as v20.2 did. Its 17 browser suites could not start and its other 70 passed; that was a setup error in the run, repeated with the v20.2 settings. | `REGRESSION_RESULTS.json`, `TEST_EVIDENCE.json` |
| The evaluation's own suite | 13 checks, including 7 new ones: the scorer's numbers, negations, hedges and questions; labels by check; kept and rescored answers; the control arm's request and reach | `TEST_EVIDENCE.json` |
| Clean package extract, no `node_modules` | Syntax, build and 13 suites pass, including the Brain chain and the evaluation. `evaluate:sol` then runs both arms against the test double. | `PACKAGE_SHA256.json` |
| Clean install, `npm ci --offline` | Passed | `PACKAGE_SHA256.json` |
| Package | `AIW-V5-Local-Source-v20.3.zip`, 3,322,399 bytes, SHA-256 `fb014b8f1bc33559bfe3bb3e317d268d54d8e4f20868f8e3c4bbe2fa30b7ed72`. Reproducible and byte-identical to `53eb9a2` (499 files). No excluded paths, secrets or personal data. Against v20.2: 7 files changed, none added or removed. | `PACKAGE_SHA256.json`, `PACKAGE_FILE_MANIFEST.json` |
| Live runs | A first run lost the network at 11% battery after 9 cases and is kept as interrupted. The full run: 26 cases in both arms, no request failures, 366,135 tokens. With the interrupted run, about half a million tokens in all. | `LIVE_RUN_INTERRUPTED_2026-09-26.json`, `LIVE_SOL_VS_DIRECT.json` |
| Rescore | The same answers, scored by the corrected scorer; no model asked | `LIVE_SOL_VS_DIRECT.rescored.json` |
| Reading | 28 answer pairs, one judgement each; the tallies check against the rows and the report | `ANSWER_REVIEW.md`, `ANSWER_REVIEW.json` |

## The key

The sponsor supplied an env file for the purpose. For each run:
- it was extracted to the session's temporary folder;
- it was loaded into the evaluation process with `node --env-file`, never displayed;
- it was deleted once the process had started, or when the run ended.

The supplied zip is unchanged. The runs pinned `AIW_LLM_MODEL=gpt-4.1-mini-2025-04-14` and left the endpoint at the OpenAI default.

## Open

- **Four product fixes found by the reading.** Each changes what architects see, so each waits for the sponsor.
  - Set aside a threat on a decision rather than withholding the assessment.
  - Let the guard pass questions, and read "ensuring".
  - Do not settle on a self-contradicting second pass.
  - Stop presenting a Playbook example as a teaching project's load.
- **Value bands per case in the expectations,** after an architect's review.
- **Independent review** of the answers and of the expectations.
- **The branch is not pushed.**

## Commits

| Commit | |
|---|---|
| `4eae5c4` | Plan recorded: the v20.3 baseline |
| `eb30783` | The scorer reads numbers and guarantees as the guard does; answers kept; the direct-LLM control arm |
| `deeab49` | The interrupted first live run |
| `254150a` | The scorer reads questions, hedges and withholding reasons as the checks do; kept answers score again offline |
| `53eb9a2` | The live comparison, the reading, and the documentation; the source of the v20.3 package |

The package, regression and test evidence are committed on top of `53eb9a2`.
