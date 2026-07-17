# Gate 6B.3 evaluator audit

Generated: 2026-07-17T10:10:24.745Z  
Production accepted: false

The R2 evaluator used ten request-level case occurrences rather than nine unique cases; G6B1-01 was counted twice. Disposition, asset type and epistemic accuracy used the first accepted asset only. Additional correct assets were ignored. Asset aliases were limited to three hardcoded mappings.

Condition and limitation completeness used all ten occurrences as the denominator. Cases with non-applicable or optional conditions/limitations could therefore be penalised. Field-level epistemic status was not evaluated, and a single whole-asset epistemic status conflated source atoms with synthesis.

G6B1-21 was forced to be a deliberate non-claim although its excerpt contains an explicit architecture-product description. G6B1-07 was expected to be a resilience control although the excerpt explicitly describes Performance Efficiency. No individual semantic-isolation fallback existed for a failed member of a paired request.

The audit was completed before V2 evaluator implementation. Original labels, outputs and scores remain unchanged.
