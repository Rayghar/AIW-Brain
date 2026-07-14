# Sprint 8.8.3 — Knowledge Release Manager + Durable Knowledge Ops Persistence

This sprint converts knowledge release management from transient in-memory candidate handling into a durable release-governance boundary.

## Core outcomes

1. Release candidates are persisted through `KnowledgeOpsRepositoryPort`.
2. Local/reference mode has file-backed persistence.
3. Production shape is PostgreSQL-ready through the new migration.
4. Pattern DNA and calibration ratification create durable candidates through `@aiw/knowledge`.
5. Promotion writes immutable release manifests.
6. Rollback and release pins are durable governance events.
7. Candidate knowledge cannot influence production scoring before promotion.
8. The old Admin release-candidate side-store is removed from active source.

## Follow-on

Sprint 8.8.4 should rebuild Pattern DNA Operations UI and matrix workflows on this release-governance foundation.
