# Pattern DNA Operations — v0.10.0-rc.10.6

Pattern DNA Operations is the governed editing surface for pattern intelligence. It controls aliases, vendor realizations, compatibility/conflict links, obligations, risks, mitigations, fitness-test mappings, requirements and quality impacts.

## Authority model

- Edits are durable staged operations.
- Edits do not mutate the production knowledge library.
- Staged edits are materialized into knowledge-release candidates.
- Candidates must be validated and promoted before recommendations can change.
- LLMs may help draft but do not own scoring, policy, release approval or architecture mutation.

## Persistence model

Local/reference mode stores staged edits in `data/local/knowledge-ops-store.json` through `knowledgeOpsDurableRepository`. PostgreSQL-ready persistence is captured in `database/migrations/013_sprint8_8_4_pattern_dna_operations.sql` with RLS enabled.
