# Sol against a direct LLM — reading the answers

| | |
|---|---|
| Run | `LIVE_SOL_VS_DIRECT.json`, 27 September 2026 00:22–00:27 UTC, 26 cases and 28 assessments, no request failures |
| Model | `gpt-4.1-mini-2025-04-14` for both arms, through the OpenAI Responses API with `store:false` |
| Sol | The Brain's packet, Sol's instructions, the deterministic guard, the second pass and the chapter rules |
| Direct | The same model and answer format, given what an architect would bring. That is the project's description, each decision's title and draft, and a recorded decision's question and alternatives. None of the Brain. |
| Reader | The implementing engineer. **This is the engineer's reading, not an independent architecture review.** Row by row: `ANSWER_REVIEW.json`. |

## In short

**The Brain helps Sol where the design records its facts.** It works against Sol in two places:
- its checks withhold right answers for technicalities;
- on the teaching designs its desk presents an example load as the project's.

Both are fixable in the Brain. On the bank payment reference, 16 assessments:

| Outcome | Assessments |
|---|---|
| Sol better | 10 |
| About the same | 4 |
| Direct better | 2, both right drafts that Sol's checks withheld |

On the two teaching designs, 12 assessments:

| Outcome | Assessments |
|---|---|
| Direct better | 6 |
| Sol better | 3 |
| Both fail the case | 3 |

Across all 28:

| | Sol | Direct |
|---|---|---|
| Right, from the design's recorded facts | 16 | — |
| Right, from general practice | — | 18 |
| Right in the value that matters, with a minor fault (Sol: products the packet never names; direct: invented tools or recovery times) | 1 | 2 |
| A consequential fault in otherwise sound advice | 2 (SP-03, SP-04) | 2 (BP-03, SP-04) |
| A value that would mislead an architect who took it | — | 3 (BP-01, BP-11, BP-12) |
| Wrong advice or the wrong class of verdict | 2 shown (WF-01, WF-06) | 3 (SP-01, WF-01, WF-04) |
| Withheld, although the draft was right | 4 (BP-06, BP-09, SP-02, WF-02) | — |
| Withheld, and the draft was wrong or unsupported | 3 (SP-01, SP-06, WF-04) | — |

## What the Brain adds

Sol works from the design's own numbers, records and identities. The direct model cannot, and three of its values would have misled an architect who took them:

| Case | Sol | Direct |
|---|---|---|
| BP-01 capacity | 24 replicas, rebuilt from 3,125 req/s at 200 req/s per replica at 70% CPU plus a spare, with a load test to confirm | 16 replicas "given typical load patterns", while asking what the load is |
| BP-11 runtime plan | 24 replicas, 3 ready, a 15-minute recovery, all from the reading | 3 replicas against a need of about 24 |
| BP-12 contract | A 1,000 ms timeout from QD-003's 2-second budget; the design's own `paymentReference` as the key | A 10,000 ms timeout on a 2-second path; "enabled" as the idempotency key |
| BP-08 switch point | 9,375 writes/s needed against 7,000 planned; the 75,000-user single-primary ceiling | "Clarify the trade-offs" |

The direct model also invented owners and tools (BP-03, WF-06), and filled the threat field with alternatives or controls in 12 of 28 answers.

## What the Brain costs

1. **Right answers withheld for technicalities: 4 of 7 withholdings.**
   - In BP-06, SP-02 and WF-02 the model filled the threat field on a decision, which takes no threats. The whole assessment was withheld, although the guard already sets aside a guarantee-worded refinement and keeps the rest.
   - In BP-09 the guard read the question "What is the current measured 95th percentile acknowledgement latency…?" as a verified claim. The second pass then marked the draft unsupported, while every issue it listed said the draft was supported.
2. **The example load on the teaching designs.**
   - The desk's capacity arithmetic for the citizen-service and warehouse designs carries the SA Playbook's example objective: 100,000 users and 3,125 req/s. Their recorded workloads are 10 and 20 requests a second.
   - Sol took the example as the project's load in all four capacity assessments (SP-01, SP-06, WF-01, WF-06). Two of them reached the architect, WF-01 and WF-06.
   - The direct model, which saw only the recorded workload, sized SP-06 and WF-06 more plausibly (3 and 5 replicas).
   - The cases SP-01 and WF-01 were written to catch exactly this, and it now shows live.
3. **Faults Sol's checks let through.**
   - SP-03 rewrites an illustrative workload as a "typical observed pattern".
   - SP-04 proposes a 10-second timeout against the project's 2-second acknowledgement target, and says "ensuring exactly-once processing". The guard reads "ensure" and "ensures" but not "ensuring".
   - BP-11 names Prometheus and Grafana, which the packet never records.

## What the automated metrics can and cannot see

After the scorer fixes, the same answers score as follows:

| | Sol | Direct |
|---|---|---|
| Advised | 21 of 28 | 28 of 28 |
| Expected class of verdict | 20 of 21 | 25 of 28 |
| Flagged claims | 0 of 21 | 1 of 28 |
| Sound as scored | 20 | 23 |
| Fails the Brain's checks on substance (numbers, guarantees) | — | 7 of 28 |

The expectations test the class of verdict and a keyword, not the values against the design. So "sound as scored" counts the direct arm's 3 replicas and 10-second timeout as sound, and counts Sol's teaching-design sizing as sound. Value bands per case (for example `timeoutMs` at most 2,000 on BP-12, or replicas for the recorded workload on SP-06 and WF-06) would let the metrics see what this reading sees. The expectations are implementation-authored, so adding bands is an architect's change.

## What was wrong with the scorer, and is fixed

These are all found by reading the answers.

- **Citation labels.** It read S13 as the number 13.
- **Negation.** It flagged every "guarantee", where the guard passes "does not guarantee".
- **Questions.** It flagged the question "Are there atomicity guarantees…?" as a claim.
- **Hedges.** It flagged the hedge "an objective to be proven in testing".
- **Reason labels.** It guessed withholding reasons from words, so a second-pass note naming a latency "target" counted as a threat proposal.
- **"Sound" and the band.** It counted a number outside the case's band as sound.
- **Missing wording.** It kept no answer text, so none of this could be checked.

## Recommended next, not done here

Each of these changes what architects see, so each waits for the sponsor.

1. Set aside a threat proposal on an item that takes none, as a guarantee-worded refinement already is, instead of withholding the whole assessment.
2. Let the guard pass questions, as the scorer now does, and read "ensuring", "guaranteeing" and "achieving".
3. Do not settle on a second pass that marks an assessment unsupported while its issues say it is supported.
4. On a teaching design without a recorded objective, have the desk say plainly that its capacity arithmetic rests on the Playbook's example, or size from the recorded workload. Sol's packet must not present the example as the project's load.
5. Add value bands to the expectations, after an architect's review.

## Limits

- **One run.** This is one run of one model, and answers differ from run to run.
- **One control prompt.** The control arm is a single plain prompt; another prompt or model would answer differently.
- **Expectations.** They are implementation-authored and need an architect's review.
- **Reviewer.** This reading is the engineer's, not independent review.
