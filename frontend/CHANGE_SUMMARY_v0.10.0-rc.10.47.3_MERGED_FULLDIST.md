# AIW v0.10.0-rc.10.47.3 — Architecture Foundation & Brain Readiness

## Purpose
Prepare AIW for rc.10.48 Brain Alive by creating a clean, governed intelligence architecture foundation on top of rc.10.47.2.

## What changed

### 1. Architecture documentation added
Added formal target architecture documents and Mermaid diagrams covering:

- AIW target software architecture
- LLM Gateway architecture
- Brain Signal Engine architecture
- production deployment architecture
- cost governance architecture
- security/data boundaries
- LLM-as-provider-not-authority ADR
- quiet intelligence signals ADR

### 2. Brain Signal Engine scaffold merged into `@aiw/intelligence`
Added:

- `packages/intelligence/src/brain/types.ts`
- `BrainSignalEngine`
- `deriveSurfacePolicy`
- `prioritizeSignals`
- surface budgets/noise-budget model
- kernel/LLM finding adapters

The engine normalizes deterministic, knowledge, LLM, and system findings into quiet, prioritized signals for canvas badges, library chips, stage chips, Info Center, Decision Radar, Co-Architect, and stage gates.

### 3. LLM Gateway scaffold merged into `@aiw/integrations`
Added:

- provider-neutral request/response contracts
- routing policy
- redaction layer
- prompt-context builder
- structured response schemas
- cost estimation and usage ledger
- budget check helper
- OpenAI provider adapter stub

The gateway enforces the principle that OpenAI/other LLMs are providers behind AIW, not the authority or direct UI dependency.

### 4. Production deployment blueprint added
Added production example files:

- `deploy/docker-compose.production.example.yml`
- `deploy/.env.production.example`
- `deploy/PRODUCTION_DEPLOYMENT_CHECKLIST.md`

The target production shape is static frontend/CDN, API container, worker container, PostgreSQL/pgvector, Redis, object storage, LLM Gateway, secrets, and observability.

### 5. Verification scaffolding added
Added:

- `scripts/gates/brain-architecture-gate.mjs`
- `tests/e2e/aiw-golden-journey.spec.ts`
- `VERIFICATION_CHECKLIST_v0.10.0-rc.10.47.3.md`

### 6. Real source merge corrections
Because this was merged into the actual rc.10.47.2 source package, the scaffolds were adjusted to match the live repo:

- NodeNext import extensions fixed.
- strict optional property handling fixed.
- frontend/backend package exports updated.
- frontend/backend gates verified.

## What this release intentionally does not do
This release does not yet make the brain visually alive in the UI. It prepares the architecture so rc.10.48 can safely implement living recommendations, driver-weight effects, style-constrained library behavior, obligation arming, and quiet signal surfaces without direct LLM/UI coupling.
