# Gate 6B.2 grounding validation specification

Production accepted: false. The lexical threshold `0.60` remains a provisional precision-screening signal, not semantic truth and not a whole-envelope score.

Validation order is fixed:

1. exact case-ID allowlist;
2. exact evidence-ID allowlist;
3. immutable excerpt-hash replay;
4. exact support-span offset and text replay;
5. disposition and semantic-asset type validation;
6. claim polarity validation against the exact support span;
7. condition applicability and field-specific support;
8. limitation applicability and field-specific support;
9. lexical coverage of claim text against its own support spans;
10. canonical epistemic validation;
11. cross-case and cross-source contamination detection;
12. accept, reject, or delegated-development-review routing.

Negation, condition and limitation signals elsewhere in a bounded passage do not invalidate an unrelated supported statement. A mismatch is raised only when the signal materially changes the exact supported statement. Structured assets are validated field by field; serialized JSON is never scored as one claim. References, procedures, examples, non-claims, abstentions, Pattern DNA, Architecture Genome, machine-readable facts, and scoped distinctions each retain their own validation rules.
