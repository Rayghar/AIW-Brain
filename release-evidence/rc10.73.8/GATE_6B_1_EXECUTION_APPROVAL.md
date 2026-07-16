# Gate 6B.1 strategy micro-pilot approval package

Generated: 2026-07-16T16:39:05.699Z

Status: **prepared, not approved, not started**. Production accepted: **false**.

The proposed comparison uses the same 24 independently reviewable cases across individual calls, same-source micro-batches, and bounded architecture-group calls. The hard envelope is 24 units, 40 calls, 120,000 total tokens, concurrency two, and at most one retry only for timeout, HTTP 429, or HTTP 5xx. Fallback is disabled and the exact model is `gpt-4.1-mini-2025-04-14`.

Measured free space: 15746134016 bytes. Projected peak free space: 15444144128 bytes. A fresh capacity check is mandatory immediately before any future execution.

Cost approval is **not granted** and no pricing estimate was queried. The provisional token ceiling is not execution authority.

Proposed command after implementation review and explicit product-owner approval:

```powershell
node --env-file-if-exists=.env --import=tsx scripts/rc10-73-8/run-gate-6b-strategy-micro-pilot.mts --manifest ../release-evidence/rc10.73.8/GATE_6B_24_CASE_BENCHMARK_MANIFEST.json --model gpt-4.1-mini-2025-04-14 --max-units 24 --max-calls 40 --max-tokens 120000 --max-retries 1 --concurrency 2 --approved-gate-6b-1
```

Do not execute Gate 6B.1, the remaining pilot, Gate 6C, or Gate 6D without separate approval.
