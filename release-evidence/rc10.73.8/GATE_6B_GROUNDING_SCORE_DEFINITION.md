# Gate 6B grounding support-score definition

Generated: 2026-07-16T16:39:05.699Z

The support score is a deterministic lexical claim-coverage signal, not a probability, truth score, semantic-entailment guarantee, or authority score. Tokens shorter than four characters and common stop words are excluded. The lexical component is the fraction of material claim tokens shared with the cited evidence, rounded to four decimals.

In precision mode, unsupported absolutes, unsupported numeric specificity, omitted source conditions, omitted material limitations, and negation mismatch create explicit risk flags and force the support score to zero. A weak result is rejected rather than treated as verified. Exact evidence-ID membership and schema validation remain separate mandatory controls.

The score cannot reliably recognise novel synonyms, domain equivalence, causal validity, or subtle scope changes. It therefore supports fail-closed screening only. Human review and later independently labelled calibration remain mandatory.
