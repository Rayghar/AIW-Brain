# Gate 6B Final Execution Approval Package

Generated: 2026-07-16T10:34:51.088Z

Status: **blocked after bounded smoke failure**. Production accepted: **false**.

## Verified runtime

- Provider: OpenAI
- Exact model: `gpt-4.1-mini`
- Purpose: `governed-candidate-semantic-transformation`
- Entitlement: passed
- Strict allowlist: exact provider/model/purpose only; no wildcard, alias, fallback or substitution
- Live smoke calls: 1
- Retries: 0
- Schema validation: failed
- Evidence lineage: failed
- Candidate records created: 0
- Approved records changed: 0
- Design Graph mutations: 0
- Automatic promotions: 0

## Selection QA

The final selection contains 204 records, 172 meaningful model-input units and 32 controls/abstentions. Twenty weak existing cases were demoted, two meaningful coverage cases were added, all 47 repositories remain visible, and all configured thematic thresholds are met. Selection fingerprint: `sha256:b6e10234c02bf9d1417a39bf52451e4a8b26cd800ae1c018dc1ea1005cb3ed38`.

## Decision boundary

Do not proceed to the pilot. Remediate the smoke failure and repeat the bounded acceptance sequence.

Gate 6C remains blocked. Gate 6D has not started. The independent knowledge-vault backup remains deferred by product-owner risk acceptance.
