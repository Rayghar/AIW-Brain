# Sol's checks, and Sol on every chapter — release report (v20.4)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.4**, on v20.3 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-sol-checks-and-coverage`, from `dfce154` |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

The sponsor asked for four fixes found by the v20.3 reading. The sponsor also asked that on every model and page of every chapter, the LLM can interpret what it is given and give a response the page displays.

1. **Threats on a decision are set aside, not the advice.**
2. **The checks read a claim as a claim.**
   - A question passes.
   - "Ensuring" and every other tense of a guarantee is caught.
   - After the live runs, an instruction, a purpose, a goal and missing evidence pass too.
3. **A second pass that contradicts itself is not relied on.** Its defects decide, and the disagreement is shown.
4. **The Playbook's example load is named as the example.** Where a design records its own workload, advice that sizes it for the example is withheld, naming what the project records.
5. **Sol answers on every page.**
   - Every record, selection, desk item and saved object in Chapters 1 to 11 reaches Sol.
   - Every element Chapters 4 to 10 draw has Sol in its companion.
   - Sol's panel always answers.
   - One refinement that fails its rule costs only itself.

The live runs changed the work. The first run on the fixes withheld 11 answers of 28, 8 of them right drafts: the guard read advice as claims, and a timeout restated in seconds as an invented number. The guard was corrected, and each correction was measured on every sentence and kept answer of the live runs before it was committed.

## What the architect now sees

From the last live run (`4c89871`), read with the final checks (`AFTER_FIXES_REVIEW.md`, the engineer's reading, not independent review):

| | Sol better | Same | Direct better | Both fail |
|---|---|---|---|---|
| Bank payment reference (16) | 11 | 5 | 0 | 0 |
| Citizen service and warehouse teaching designs (12) | 6 | 3 | 3 | 0 |
| All 28 (v20.3's run, for comparison) | 17 (13) | 8 (4) | 3 (8) | 0 (3) |

- **No right draft is withheld** (four in v20.3).
- **Every withholding (4 of 28) is a teaching design sized for the Playbook's example.** Each is withheld with the workload the project records and a request for its own objective.
- **Sol agrees with the expected verdict on all 24 answers it shows.** The direct model agrees on 26 of 28, and both of its misses size a teaching design for the example.
- **The instruments catch what Sol gets wrong.** Sol advised a 5-second timeout on the bank's risk check, inside a 2-second path. The instruments' re-reading flags it before anything is applied. The direct model's identical value has no such check.
- **The direct model misleads where Sol does not:**
  - invented test evidence (WF-01);
  - nested timeouts added up and read as too slow (BP-14);
  - the example sizing called appropriate for a project with 10 applications a second (SP-01);
  - 3 replicas with no basis (BP-11).

**Every chapter, live.** One target of every kind in Chapters 1 to 11 was asked, 33 requests. Each was answered and displayed.
- Of 19 assessments, 14 were shown and 5 withheld:
  - two for one refinement each, which the final checks set aside instead (`sol-checks` check 6 uses their wording);
  - one switch point answered "judge", which a switch point does not take;
  - two sizing a teaching design for the example.
- Of 14 panel responses, 13 passed their source check. One was shown as the reviewed method's guidance, with the reason.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Full regression, `release-checks.mjs` | **90 of 90 suites pass, 07:32–08:24 UTC, including all 18 browser suites**, with the Playwright settings of v20.2 and v20.3. The run started on `f7f563f`. While it ran, `7082246` changed only the evaluation's scorer and its suite, and that suite passes again from the clean extract of the package. The full runs on `54ab9da` and `d0fb283` also passed all 90. | `REGRESSION_RESULTS.json`, `REGRESSION_RESULTS_*.json`, `TEST_EVIDENCE.json` |
| New suites | `test:sol-checks` 6 checks, `test:sol-coverage` 5, `test:sol-coverage-browser` 5 rendered, `test:sol-evaluation` 14 | `TEST_EVIDENCE.json` |
| Clean package extract, no `node_modules` | Syntax, build and 17 suites pass from the package alone, among them `test:sol-checks` (6), `test:sol-coverage` (5), `test:sol-evaluation` (14) and the Brain chain. `evaluate:sol` then runs both arms, and `evaluate:sol:coverage` every chapter, against the test double. `npm ci --offline` passed. | `PACKAGE_SHA256.json` |
| Package | `AIW-V5-Local-Source-v20.4.zip`, 3,354,539 bytes, SHA-256 `c7f81b3bd9761b8631b01c9c496560968d19ede4ceac1404e4038916ed1fb18e`. Reproducible and byte-identical to `9bd6516` (503 files). No excluded paths, secrets or personal data. Against v20.3: 4 files added, 31 changed, none removed. | `PACKAGE_SHA256.json`, `PACKAGE_FILE_MANIFEST.json` |
| Rendered coverage, on `9bd6516` | 5 of 5 checks. Every one of the 137 elements Chapters 4 to 10 draw has Sol in its companion: 88 to ask about, 7 already assessed, 7 to explain, and 35 only drawn, each saying which record to select. Two cases this design does not draw are covered by the model check instead: a driver in Chapter 4, and a contract's link as its own selection. | `RENDERED_COVERAGE.json` |
| Live coverage | Three runs (`54ab9da`, `d0fb283`, `4c89871`); the last answered and displayed all 33 requests | `LIVE_SOL_COVERAGE*.json` |
| Live comparison | Three runs, 26 cases in both arms each, no request failures | `LIVE_SOL_VS_DIRECT*.json` |
| Recheck | The kept answers of the three runs, through the final checks, without asking a model. Withheld: 8, 5 and 4 of 28. | `*.rechecked.json` |
| Guard reading | All 4,242 sentences of the four live runs (v20.3 included), old and new reading compared; every sentence that now passes was read as advice | This report |
| Reading | 28 answer pairs, one judgement each; the rows are checked against the report | `AFTER_FIXES_REVIEW.md`, `AFTER_FIXES_REVIEW.json` |

## The key

The sponsor supplied an env file for the purpose. For each run:
- it was extracted to the session's temporary folder;
- it was loaded into the process with `node --env-file`, never displayed;
- it was deleted once the process had started, and again when the run ended.

The supplied zip is unchanged. The runs pinned `AIW_LLM_MODEL=gpt-4.1-mini-2025-04-14` and left the endpoint at the OpenAI default.

## Correction to v20.3

The v20.3 reading said the bank reference records its own objective. It does not.
- All three evaluation designs size for the Playbook's example (100,000 concurrent users).
- The bank reference records no competing workload; the teaching designs record 10 and 20 requests a second.

The v20.3 evidence carries a dated correction, and nothing was rewritten.

## Open

- **Timeouts against their path's target.** On the teaching designs, no arithmetic reads a contract's timeout against the 2-second acknowledgement. Sol and the direct model both advised 30 seconds there (SP-04, WF-04).
- **Runtime plans beside the example.** Sol still sized two teaching runtime plans for the example. They were withheld, so the architect got no advice where the direct model answered for the recorded load.
- **The guard's reading of *validated*.** It covers only capacity, latency, throughput, recovery and availability. A drafted condition calling an illustrative workload "validated … confirmed by performance testing" passed.
- **A switch point answered "judge".** This happened twice across the runs, on the bank's PostgreSQL ceiling. The contract does not take it, so the answer is withheld with the reason.
- **The scorer reads the noun "guarantee" as a claim.** It flags "stronger guarantees" and "transaction guarantees".
- **Value bands per case in the expectations,** after an architect's review.
- **Independent review** of the answers and of the expectations.
- **The v20.3 and v20.4 branches are not pushed.**

## Commits

| Commit | |
|---|---|
| `c230d9e` | Plan recorded: the v20.4 baseline |
| `68ff5c1` | The four fixes |
| `910c8ae` | Sol on every chapter page |
| `bbbd04c` | Revert: no Sol bar on intake views the router never shows |
| `62437ca` | Rendered proof that every drawn element has Sol |
| `54ab9da` | A verbose second pass never costs the advice; the coverage script; the v20.3 correction |
| `d0fb283` | Sol's panel always answers; the second pass judges the advice on its own |
| `5d0e67f` | The guard withholds claims, not advice; a value restated in another unit is its own |
| `4c89871` | The coverage report keeps a withheld draft |
| `3a3ebce` | One refinement costs only itself; a purpose clause claims nothing |
| `f7f563f` | `--recheck`: today's checks on kept answers |
| `7082246` | The scorer reads the control arm's text values as numbers |
| `9bd6516` | Documentation; the source of the v20.4 package |

The evidence is committed on top of `9bd6516`.
