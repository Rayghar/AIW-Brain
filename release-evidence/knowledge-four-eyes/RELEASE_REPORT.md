# Four eyes, candidate knowledge and the Brain chain — release report (v20.2)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.2**, on v20.1 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-knowledge-four-eyes`, from v20.1 at `62542ae` |
| Date | 26 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

The sponsor approved three items from the review of the older TypeScript backend (rc10.91.1), and asked for confirmation that the Brain is wired end to end.

1. **Four eyes on every claim.**
   - A claim is used only after an authenticated person other than its author has verified it. This is checked at review and again on every read.
   - Before, only repository claims needed a second person. The older backend applied separation of duties only to its evidence releases.
   - So that two people can do this on one machine, the local server gains opt-in accounts: each with its own secret, a sign-in page and a signed session.
2. **The older backend's candidate knowledge.**
   - Its curated corpus BK-P2-20260911 becomes a candidate set of 16 claims. Each is anchored on an exact passage verified in this laptop's corpus.
   - The set comes with an importer that works through the project's own commands.
   - Two assets are not importable, with reasons.
3. **One identity for a file, whichever way it is read.** A GitHub read no longer strips a byte-order mark, so it hashes like the corpus.
4. **The Brain chain, end to end.** One suite runs corpus → candidate → a second person's review → release → signed receipt → activation → link → Sol's packet → the provider request.

## Is the Brain wired end to end?

Yes, in code and in an automated end-to-end test. Not yet with real people, a production key or a live model. `npm run test:brain-chain` runs on the local server with two synthetic accounts, the synthetic corpus, a synthetic signing key and the provider test double:
1. A candidate set is built against the corpus and imported as exact originals and candidate claims.
2. The author is refused when verifying; a second signed-in person verifies.
3. The claim is released, the operator's signed receipt is verified and applied, the release is activated, and the claim is linked to IF-001.
4. Sol's packet for IF-001 carries the claim, and the request to the provider sends it.
5. A claim still a candidate reaches neither.

Still with people: real reviewers, a production signing key, a live provider run, and licence review.

## Verification

| Gate | Result | Evidence |
|---|---|---|
| Full regression, `release-checks.mjs` | **87 of 87 suites pass on `f435e61` in a single run**, including every browser suite | `REGRESSION_RESULTS.json` |
| New and changed suites | `test:brain-chain` (4 checks), `test:local-accounts` (3), `test:stewardship-browser` (5, two signed-in browsers), the knowledge-ingestion four-eyes checks, and the BOM check in `test:repository-service` (12). The BOM check fails without the fix. | `TEST_EVIDENCE.json` |
| Clean package extract, no `node_modules` | Syntax (334 modules), build, and 13 suites pass, including the Brain chain and local accounts | `TEST_EVIDENCE.json` |
| Clean install, `npm ci --offline` | Passed, from the local cache with no network access | `TEST_EVIDENCE.json` |
| Package | `AIW-V5-Local-Source-v20.2.zip`, 3,312,915 bytes, SHA-256 `02aa08998a5b031ebeb04a00d2c54ac041a715799d450ebfe43ca72eaecf0988`. Reproducible and byte-identical to `f435e61` (499 files). No excluded paths, secrets or personal data. Against v20.1: 5 files added, 18 changed. | `PACKAGE_SHA256.json`, `PACKAGE_FILE_MANIFEST.json` |
| Candidate set | 16 claims. Each anchor was checked against the verified original in this laptop's corpus (store `ebb8387e-…`). Two assets are not importable, with reasons. No third-party text is carried. | `CANDIDATE_SET_EVIDENCE.json` |

**What changes for existing projects:** a claim its author verified, saved before this release, is no longer used by Sol, releases or links until another person reviews it. The workbench says why. The seed project has no such claims.

## What was not done

- **The BK-P2 set was not imported into your project.** It was built and verified against this laptop's corpus. Importing is your decision: `npm run candidates:import -- --dry-run`, then `npm run candidates:import`.
- **The package's checks made no live provider call.** The live Sol evaluation ran afterwards; see below.
- **Nothing was reviewed or approved by a real second person.**

## Live operations, after the package

The sponsor approved four live operations on 26 September 2026. They change no source file. The record is `LIVE_OPERATIONS.json`.

| Operation | Result |
|---|---|
| Push | **Done.** The branch is on the private repository `github.com/Rayghar/AIW-Brain` at `7e1d707`, 30 commits. A scan beforehand found no secrets and no local paths; the largest file is 1.5 MB. |
| Daily task | **Registered.** *AIW Knowledge Repository Refresh* re-verifies the store daily at 06:30, as the current user and not elevated. Windows' defaults keep it to mains power, so a test start on battery was queued until the laptop is plugged in. |
| Live GitHub refresh | **Done.** 19 repositories moved to their latest commits: 2,487 documents, of which 418 were downloaded and 2,075 reused by blob hash. 6 were quarantined for key-shaped strings. 8 repositories were unchanged, and 3 failed closed: Apache Camel's tree is too large for this route, Meshery's was too large in the dry run and hit a network failure in the run, and DDD Crew answered 422. The rebuild completed with no errors: 22,443 passages, 369 invalidated and 2,773 signed notices. Details: `LIVE_REFRESH_EVIDENCE.json`. |
| Live Sol evaluation | **Done.** All 26 held-out cases ran on `gpt-4.1-mini-2025-04-14` with no request failures, using 337,447 tokens. Sol's own checks withheld 13 of 28 assessments. Of the 15 shown, 14 agree with the expected verdict and all cite their own reading. The scorer flagged 4 of the 15 as false support, but at least two look like scorer errors: it reads citation labels such as S13 as numbers, and it forbids "guarantee" even where Sol's guard passes "does not guarantee". The key came from an env file the sponsor supplied; it was loaded straight into the process and its temporary copy deleted afterwards. Details: `LIVE_SOL_EVALUATION.json`. |

The new snapshots carry the licence evidence of the snapshots they replace, which was not reviewed again. Licence review remains with people.

The evaluation's expectations are implementation-authored and need an architect's review. Its metrics are proxies for grounding and the expected class of advice, not a measure of architectural judgement.

## Commits

| Commit | |
|---|---|
| `5f1d3d7` | Plan recorded: the v20.2 baseline |
| `b4dd915` | A GitHub read keeps the byte-order mark, as the corpus does |
| `f897d57` | Four eyes on every claim, with local accounts for two people on one machine |
| `5d547ff` | The earlier backend's candidate knowledge imported, and the Brain chain proven end to end |
| `f435e61` | Documentation |

The evidence in this folder is committed on top of `f435e61`, which is the source of the v20.2 package. The live operations record is committed after `7e1d707`.
