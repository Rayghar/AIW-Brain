# ADR-0001 — LLMs are provider services, not AIW authority

## Status

Accepted for rc.10.47.3 foundation.

## Context

AIW will use OpenAI and potentially other LLM providers for critique, explanation, drafting, design interview, SDD generation, and co-authoring.

However, AIW must remain a governed architecture platform. LLM output cannot become the uncontrolled source of truth.

## Decision

All LLMs are accessed through the AIW LLM Gateway.

The LLM may:

- recommend,
- explain,
- critique,
- draft,
- summarize,
- ask questions,
- propose alternatives.

AIW must:

- verify,
- validate,
- govern,
- audit,
- persist,
- approve,
- decide official architecture truth.

## Consequences

Positive:

- Provider independence.
- Better security.
- Lower cost risk.
- Clear auditability.
- Better enterprise trust.

Negative:

- More upfront architecture work.
- Need for response schemas.
- Need for usage ledger and policy enforcement.
