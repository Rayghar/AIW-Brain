# Gate 6B.2 R2 completion report

Result: **FAIL — semantic quality thresholds not met**

The fresh R2 run used strict SDK-parsed Structured Outputs, deterministic evidence quotation resolution, a Stage A atom gate, and Stage B typed candidate synthesis. Provider attempts: 14; retries: 0; tokens: 42,206; measured cost: USD 0.0369116. Transport, exact model identity, strict structured output, exact evidence lineage and accepted-quotation validity passed. This is not a transport or output-protocol failure.

Semantic quality did not meet the frozen gates: asset-type accuracy was 70%, canonical epistemic accuracy 50%, condition completeness 30%, limitation completeness 30%, and the deliberate non-claim control was not correctly classified. Stage A accepted 45 exact atoms and rejected 26 proposals (21 quotations were not present verbatim and 5 links depended on rejected atoms). Stage B retained 22 candidate-only typed assets and rejected one asset. G6B1-09 produced a valid four-field Pattern DNA asset.

The strongest structured-output-capable model actually verified for this runtime remains `gpt-4.1-mini-2025-04-14`; no stronger model entitlement has been verified. Any model comparison requires separate entitlement and execution authority and must keep the R2 evidence, prompts, schemas, frozen labels and evaluator unchanged. Prompt 6G remains blocked and was not started. Production accepted remains false.
