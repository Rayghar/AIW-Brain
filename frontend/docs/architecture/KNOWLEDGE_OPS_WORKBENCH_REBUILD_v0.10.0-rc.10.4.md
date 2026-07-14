# Architecture Note — Knowledge Ops Workbench Rebuild v0.10.0-rc.10.4

## Decision

Knowledge Operations is now a feature-owned workspace with its own package contracts and API route module. The active Knowledge workspace routes to `KnowledgeOpsWorkbench` rather than the retired mesh-only component.

## Rationale

Global enterprise adoption requires trustable knowledge governance. Users must be able to see which claims require review, who is assigned, how contradictions are resolved, which sources are stale, and which duplicate/synonym normalizations are staged. These operations must be audit-friendly and release-bound.

## Boundaries

- UI: `apps/web/src/features/knowledge-ops`.
- API: `apps/api/src/routes/knowledgeOpsWorkbenchRoutes.ts`.
- Domain/workflow contracts: `packages/knowledge`.
- RBAC: `packages/engine/src/rbac.ts`.
- Shared local store: `apps/api/src/repositories/adminRepositories.ts`.

## Non-goals

- Directly mutating production recommendation scoring.
- Replacing Knowledge Release Manager.
- Durable Postgres persistence in this sprint.

## Follow-up

The next phase should deepen Knowledge Release Manager and/or durable Knowledge Ops persistence so these workbench events flow into candidate releases, validation gates, promotion, rollback and tenant/project release pinning.
