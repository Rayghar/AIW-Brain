# External Expert Review Protocol — rc.10.72.3

## Objective

Determine whether deterministic AIW and governed-LLM AIW are correct, complete, trustworthy and at least equal to a conventional architecture baseline.

## Panel

Use at least five independent reviewers with a mix of solution, software, platform, security and enterprise architecture experience. Reviewers must not know which AIW variant produced an answer.

## Inputs

- The scenario brief and accepted project evidence.
- Anonymous variants from `SOL_BLINDED_EXPERT_REVIEW_PACK.json`.
- The conventional control output where available.

## Scoring dimensions

Score each 1–5:

1. Correctness
2. Relevance to lifecycle stage
3. Evidence grounding
4. Completeness
5. Trade-off quality
6. Actionability
7. Governance and safety
8. Trust after reviewing provenance

Also record critical omissions, false claims, preferred variant and estimated correction time.

## Acceptance thresholds

- Median overall score >= 4/5.
- No AIW variant below conventional on a critical dimension.
- LLM-assisted variant not below deterministic on correctness or governance.
- No unresolved critical security or resilience omission.
- At least 90% requirement-to-model traceability and critical-interface completeness on benchmark projects.

## Independence boundary

The internal self-review supplied with this release is not a substitute for this panel. Results must be signed by the reviewers and retained as immutable evidence.
