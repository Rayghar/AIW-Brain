# Sol beside a direct LLM, after the fixes — the answers read one by one (v20.4)

| | |
|---|---|
| Live run | `LIVE_SOL_VS_DIRECT_AFTER_FIXES.json`, commit `4c89871`, 27 September 2026, `gpt-4.1-mini-2025-04-14` |
| Read as | `LIVE_SOL_VS_DIRECT_AFTER_FIXES.rechecked.json`: the kept answers passed again through the final checks (`7082246`, `npm run evaluate:sol -- --recheck`) without asking the model |
| Reader | The implementing engineer (Claude). This is the engineer's reading, not an independent architecture review. |
| Rows | `AFTER_FIXES_REVIEW.json`, one per assessment, with the scales used in v20.3 |

## In short

| | Sol better | Same | Direct better | Both fail |
|---|---|---|---|---|
| Bank payment reference (16) | 11 | 5 | 0 | 0 |
| Citizen service and warehouse teaching designs (12) | 6 | 3 | 3 | 0 |
| **All 28** | **17** | **8** | **3** | **0** |
| v20.3, for comparison (a different run) | 13 | 4 | 8 | 3 |

- **No right draft is withheld.** In v20.3, four were. Every withholding in this run (4 of 28) is a teaching design sized for the SA Playbook's example load. Each is withheld with the workload the project records, and a request for its own objective.
- **Sol names the example.** On the bank reference, Sol now says that the objective is the Playbook's example and asks for the project's own (BP-01, BP-14).
- **Sol agrees with the expected verdict on all 24 answers it shows.** The direct model agrees on 26 of 28. Its two misses both size a teaching design for the example load (SP-01, WF-01).

## What the Brain adds

- Sol works from the design's recorded keys, drivers, product mechanisms and arithmetic. The direct model works from general practice.
- **The instruments read Sol's numbers again.** Sol proposed a 5-second timeout on the bank's risk check (BP-12), inside a 2-second acknowledgement path. Taken, it turns RUN-001 and RUN-002 latency critical in the re-reading, before the architect applies anything. The direct model proposed the same 5 seconds, and nothing checks it.
- **Direct answers that would mislead an architect:**
  - WF-01 invents test evidence: "Testing shows 15 replicas can handle the load".
  - BP-14 adds nested timeouts to 3,950 ms and concludes the path is too slow.
  - SP-01 calls the example sizing "appropriate" for a project that records 10 applications a second.
  - BP-11 sets 3 replicas with no basis.

## What remains

1. **Timeouts are not tied to the path's target.**
   - On the bank reference, the re-reading catches it.
   - On the teaching designs, Sol and the direct model both set 30 seconds against a 2-second acknowledgement (SP-04, WF-04), and no arithmetic reads it again.
2. **Two teaching runtime plans sized for the example.** Beside the example (SP-06, WF-06), Sol still sized the plan for it. The architect gets a withholding and no advice, while the direct model answered for the recorded load.
3. **Wording.**
   - Sol described nested timeouts as summing (BP-14).
   - It called the example "the project planning assumptions" (BP-08).
   - A drafted condition called an illustrative workload "validated … confirmed by performance testing" (WF-03). The guard reads *verified*, *proven*, *validated* or *measured* only before capacity, latency, throughput, recovery or availability.
4. **The scorer reads the noun "guarantee" as a claim.** It flags BP-06 ("stronger guarantees") and BP-08 ("transaction guarantees"). By this reading neither is false support.

## Limits

- One run of one model per release, and answers differ between runs: under the final checks, the three v20.4 runs withheld 8, 5 and 4 of 28.
- The final checks are applied to kept answers. The second pass is a model and was not asked again, so the defects it recorded stand.
- The control arm is one plain prompt; another prompt or model would answer differently.
- The expectations are implementation-authored and need an architect's review.
