# Gate 6B.1 governed strategy micro-pilot completion report

Generated: 2026-07-16T20:12:51.734Z
Production accepted: **false**

## Outcome

The governed 36-request strategy micro-pilot completed through the existing AIW LLM gateway using the exact pinned OpenAI snapshot `gpt-4.1-mini-2025-04-14`. The run produced candidate-only records and made no approved-knowledge, Design Graph or promotion changes.

The execution mechanics passed, but semantic quality did not. No strategy is selected for Prompt 6G. The technical decision is **redesign and rerun a smaller diagnostic set**. Prompt 6G remains blocked because the 39-of-40 call posture leaves only one call, which is insufficient for a meaningful multi-strategy diagnostic under the existing approval.

## Execution envelope

| Measure | Result |
|---|---:|
| Planned successful requests | 36 |
| Preserved rejected provider calls | 3 |
| Cumulative provider calls | 39 / 40 |
| Retries in completed run | 0 |
| Input tokens | 73,448 |
| Output tokens | 17,021 |
| Total tokens | 90,469 / 120,000 |
| Estimated cost | USD 0.056613 / USD 1.00 |
| Schema-valid completed requests | 36 / 36 |
| Exact-lineage completed requests | 36 / 36 |
| Candidate case records | 48 |
| Persisted candidate claims | 10 |
| Atomic claims rejected before persistence | 106 |
| Approved records changed | 0 |
| Design Graph mutations | 0 |
| Automatic promotions | 0 |

The three rejected calls remain historical evidence: one HTTP 400 provider-schema rejection, one whole-envelope grounding rejection, and one locally rejected atomic-grounding transaction. None created a candidate record.

## Strategy comparison

Direct comparisons use only the governed 12-case matched subset. All 24 individual cases form the broader baseline.

| Strategy | Disposition accuracy | Exact epistemic accuracy | Non-claim accuracy | Atomic rejections | Safety gates | Quality gates |
|---|---:|---:|---:|---:|---|---|
| Individual, matched subset | 0.0% | 8.3% | 83.3% | 37 | Pass | Fail |
| Same-source micro-batch | 16.7% | 16.7% | 83.3% | 16 | Pass | Fail |
| Architecture group | 8.3% | 16.7% | 83.3% | 23 | Pass | Fail |
| Individual, all 24 | 8.3% | 12.5% | 91.7% | 67 | Pass | Fail |

Same-source micro-batching is the relative best result, but selecting it would violate the quality-over-cost rule. The fail-closed atomic validator prevented consequential unsupported claims and critical epistemic misclassifications from being persisted, at the cost of excessive abstention.

## Evidence corrections and limitations

- The provider does not accept `oneOf` in this response-schema position. The first rejection is retained and the compatible schema is covered by focused tests.
- The provisional 0.60 precision threshold remains unchanged. It is now applied per atomic claim rather than to the complete JSON envelope.
- Unsupported, epistemically invalid and cross-contaminated claims are omitted before candidate persistence.
- The execution receipt contains a noncanonical runtime-plan observation. A separate correction receipt proves that the canonical runtime replay equals the committed plan fingerprint; the historical receipt was not rewritten.
- The live candidate ledger contains 17 duplicate legacy IDs because its initial identity omitted strategy/request identity. The historical ledger was not rewritten. A separate identity index provides 48 unique canonical candidate IDs and the generator is corrected for future runs.
- Delegated Sol review is not independent human verification. `humanReviewerPresent=false` and `externallyVerified=false` remain explicit.
- The knowledge-vault backup remains deferred by product-owner risk acceptance.

## Decision

Do not begin Prompt 6G, the remaining Gate 6B pilot, Gate 6C or Gate 6D from these results. Prepare a new diagnostic design with a fresh call/token approval and a claim-oriented schema/prompt that can preserve epistemic precision without converting most supported evidence into abstentions.
