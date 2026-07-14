# AIW Clinical Refactor Plan

## North star

AIW must become a globally credible architecture-intelligence platform where product experience, modelling, intelligence, knowledge operations, admin governance, runtime evidence and portfolio intelligence are cleanly separated.

## Phase 8.8.0A — Stabilization and Release Integrity

Status: implemented in `v0.10.0-rc.10.1`.

Purpose:

- restore clean install,
- restore build,
- align release metadata,
- add package integrity gate,
- add route-permission coverage report,
- prepare for structural refactor.

## Phase 8.8.0B — Clinical Refactor Foundation

Target:

- Keep functionality stable.
- Reduce structural risk.
- Do not add major new product promises.

Required work:

1. API decomposition:
   - move remaining domain routes out of `apps/api/src/app.ts`,
   - keep `app.ts` as composition root,
   - enforce route collision detection.

2. Frontend store decomposition:
   - `projectSlice`,
   - `canvasSlice`,
   - `intelligenceSlice`,
   - `adminSlice`,
   - `knowledgeOpsSlice`,
   - `conformanceSlice`,
   - `portfolioSlice`,
   - `uiSlice`.

3. Design-system decomposition:
   - tokens,
   - typography,
   - buttons,
   - forms,
   - surfaces,
   - canvas styling.

4. Package boundaries:
   - `packages/intelligence`,
   - `packages/modelling`,
   - `packages/knowledge`,
   - `packages/admin`,
   - `packages/integrations`.

5. Semantic/view separation:
   - `ArchitectureModel` remains semantic truth,
   - `ArchitectureView` owns layout, visual style, filters and density,
   - no new semantic records may depend on UI-only styling metadata.

6. Background work:
   - introduce `apps/worker`,
   - move source refresh, repository scan, claim extraction and release validation jobs into worker-ready handlers.

## Phase 8.8.1 — Admin Control Plane Rebuild

Target capabilities:

- model-route CRUD,
- route health probes,
- tenant policy,
- repository connector registry,
- feature flags,
- admin audit trail,
- role/permission administration.

## Phase 8.8.2 — Knowledge Ops Workbench

Target capabilities:

- claim review,
- contradiction triage,
- corroboration analysis,
- source refresh queues,
- reviewer assignment,
- comments/escalations,
- duplicate/synonym resolution.

## Phase 8.8.3 — Knowledge Release Manager

Target capabilities:

- release candidate creation,
- release diff,
- validation gates,
- promotion,
- rollback,
- tenant/project release pinning,
- release manifest export.

## Phase 8.8.4 — Pattern DNA Operations

Target capabilities:

- pattern editor,
- aliases/synonyms,
- vendor realizations,
- compatibility/conflict matrix,
- obligations,
- fitness-test mappings,
- evidence claim links.

## Phase 8.8.5 — Guided Journey Rebuild

Target capabilities:

- paste brief,
- extract drivers,
- generate first model,
- recommend patterns,
- generate alternatives,
- create ADRs,
- generate conformance controls,
- export architecture pack.

## Phase 8.8.6 — Pro Canvas View System

Target capabilities:

- named views,
- layers panel,
- view versions,
- comments,
- presentation mode,
- SVG/PNG/PDF export,
- edge bundling,
- group/container modelling.

## Governance guardrails

- No candidate knowledge may influence production recommendations before promotion.
- LLMs enrich explanations and drafts; they are not scoring, policy or release authority.
- Admin and Knowledge Ops actions must be auditable.
- Tenant isolation must be preserved in API, persistence and audit records.
- Every phase must keep `npm ci`, `npm run build`, package integrity, security scan and structure gate green.
