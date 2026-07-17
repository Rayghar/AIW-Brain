# BIA-1 focused remediation plan

## Decision

Remediate bounded context propagation only. Pass 1 proved that the current AIW Full Brain path cannot reach reasoning because it serialises complete requirements, review, audit, context-candidate, and Design Graph structures into one prompt. Every Full Brain request failed locally with `LLM_INPUT_TOO_LARGE`; generic generation completed.

## Change

Compose a bounded generation view from the same current Brain services:

- preserve every frozen scenario requirement ID, kind, criticality, and statement;
- retain bounded deterministic requirements, stakeholders, journeys, conflicts, and open questions;
- retain bounded recommendations, findings, audit and review summaries;
- retain bounded context and candidate Design Graph summaries;
- retain the knowledge manifest and deterministic-rule references;
- retain a local fingerprint of the complete unbounded runtime result;
- omit raw evidence bodies and duplicated runtime structures from transfer;
- fail closed above 120,000 Brain-context characters.

The provider input remains below the existing 180,000-character policy ceiling. Authority remains candidate-only, with zero approved-record changes, Design Graph mutations, or automatic promotions.

## Acceptance

- all five Full Brain prompts pass the local size gate;
- frozen inputs, rubric, gold expectations, and baseline outputs remain unchanged;
- exact model remains `gpt-5.6-sol` with no fallback;
- all Full Brain outputs validate against the same strict schema;
- Pass 2 uses the same five scenarios and evaluator;
- no second remediation or Pass 3 is permitted.

`productionAccepted=false`.
