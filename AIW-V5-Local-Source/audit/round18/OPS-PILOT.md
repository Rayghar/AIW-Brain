# Round 18 · payment pilot and hosted execution audit

## Source identity and scope

This audit used private originals already in the workspace. It did not copy them into the Site source or a hosted project.

| Original | Identity | Use in this audit |
| --- | --- | --- |
| SEABaaS executive drilldown workbook v3(1) | SHA-256 `0cf67cb88fcf1232ac0fd2855c1b76bf2220b7b2fda595407e0f5cc202675b6c`; `11 Requirement Detail`, header row 5, 1,400 imported rows | Selected `FRD-011` at D128, `UATC-0197` at D269, and `UATC-0945` at D273 for a read-only case inventory. All three remain unconfirmed. |
| PayHub Payments Ecosystem 1.0 PDF | SHA-256 `0befdc682531f29547e415b00436c2e06ab869c76aa00b1c77f1f552fb149e61`; 23 pages | Pages 4–9 describe orchestration and proposed quality scenarios; pages 11, 13–14 name stack products and deployment platform; pages 16–20 show the outward payment architecture. These are document assertions, not verified deployed state or measured performance. |
| `AKR.zip` copy in `akr_reference` | SHA-256 `41cc73f2d9bb6bbc0b4698edb49a3e0591952df7b3ca4a2425784b135ff2708e`; 9,635,840 bytes | This copy starts with a ZIP local header but has no central directory or end record. `unzip` refuses it. No third-party original was recovered or imported from it. A separate metadata pilot handoff also expressly withholds original content pending rights review. |

The workbook records zero UAT tests for FRD-011 and, at R269:U269 and R273:U273, one test and one pass each for UATC-0197 and UATC-0945. Their `Evidence_Reference` cells are empty. The pass counts are historical source assertions; the execution logs, environment, exact scenario and current result have not been supplied. The PayHub PDF describes a 200 ms routing target, a five-minute reversal target and a ten-minute settlement target. It names Kafka and PostgreSQL (and lists SQL Server as an Orchestrator relational alternative), but contains no Kafka/RabbitMQ comparison or benchmark.

## Reproducible read-only inventory

Run from the source directory with the private original paths in `AIW_WORKBOOK` and `AIW_PAYHUB_PDF`:

```sh
npm run pilot:payment-case
```

`scripts/pilot-payment-case.mjs` checks both full SHA-256 values, the three source row positions, imports only those rows into a new blank in-memory document, and calls the production scoped case evaluator. It writes no project, source, observation, selection or approval. The output is JSON with source locators, a navigable route map, current case gaps, the separate whole-project gate and a two-option comparison to perform.

Observed result on the supplied originals: 3 selected requirements, 0 architect confirmed, 3 source located, 0 connected design objects beyond the requirements, 0 linked signed repository claims, 0 linked model/test observations; focused case **blocked** pending scope confirmation and a connected architecture. Whole-project approval is separately not ready (chapters, baseline and external approval absent). The workbook's two 1/1 UAT counters do not turn into AIW verification evidence without their originals and review.

The next real case transition needs a person to confirm the source interpretation and permitted use, the exact PayHub-to-SEABaaS relationship, a relevant retrieved original from the local repository, product versions and operating conditions, quality scenarios, and independent review. The architect should compare Kafka/RabbitMQ (or the relevant two options for the selected capability), record a preference and rationale in Chapter 7, map actual components and placements, and attach original test or operational results. A second authenticated architect can then record the Chapter 11 case finding. The case dossier must still identify the entire SDD as a separate gate.

## Hosted execution, observed 11 October 2026 UTC

The private Site was active at version 68, deployed commit `e12cf004451c81a4f2b012f0d3655723edc52dd6` at the time of this audit. The Sites state returned `automations: []`, so no cloud schedule is linked to this Site. `build.mjs` packages a Worker `scheduled()` handler calling `processDraftingQueue`, and local `architecture-service-validate.mjs` verifies unattended slices using a mock provider. A packaged handler and a local mock do not establish a production cron binding or a successful hosted provider run. Recent production logs had no recorded successful provider or scheduled queue event. Runtime environment metadata listed `AIW_LLM_MODEL` and a secret `OPENAI_API_KEY` entry with a redacted/null value; this does **not** prove whether the key is installed or valid. A live authenticated connection probe and a due-job continuation receipt are still required.

Recent Worker logs at 07:24:19, 07:26:04 and 07:26:33 UTC showed `GET /api/project` for `bank-payment` failing with `D1_ERROR: too many terms in compound SELECT: SQLITE_ERROR` and `storage-unavailable` (one request ID: `95cb460039dd1ae5fb350f594bb7dbdf`). The only dynamic compound SELECT in source was the requirement-index upsert in `requirement-storage.js`, reached by the GET storage-upgrade path. It has been replaced with 100-row `json_each` pages, retaining the index-stamp guard and atomic `DB.batch`. The deployed-row cause remains a hypothesis until the changed Site successfully reads that project; no production repair is claimed in this audit.

## Verification of code paths

- `node requirement-storage-validate.mjs`: 5,000 synthetic requirements indexed through 50 bounded JSON pages; query/search/gaps and stale index-stamp refusal passed. The test rejects any `UNION ALL` in the index writer.
- `node intake-validate.mjs`: full 1,400-row workbook pipeline passed, including source location and evidence flags.
- `node projects-validate.mjs`: project creation, ownership, persistence and exports passed.
- `node architecture-service-validate.mjs`: unattended drafting slices, lease recovery, cancellation and budget controls passed with a test-double provider; no live provider call.
- `node providers-validate.mjs`: routing and credential-safe status passed locally.
- `npm run pilot:payment-case`: exact-original read-only inventory passed. It is neither a payment-platform test nor a second architect's judgement.
