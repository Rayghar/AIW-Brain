# rc.10.78.2 baseline audit

Generated: 2026-07-18T21:50:41.9142403+01:00

## Repository baseline

- Recorded source branch: `codex/rc-10-78-1-consolidated-intelligence-admin-readiness`.
- Focused delivery branch: `codex/rc-10-78-2-role-ux-living-canvas-postgres`.
- HEAD at branch creation: `6dcafc6f55ab4f2c93e28a196c606f2b448313ea`.
- Expected commits `534ffcf`, `6dd79ed`, `ef5f517`, `aa0cda9`, `785f6c5`, and `6dcafc6` are present in ancestry.
- Staged paths: 0. Untracked paths: 0.
- The working tree was not clean before the branch was created. Seven tracked TypeScript incremental-build records and `backend/scripts/migrate-db.ts` were modified. They were preserved; their paths and SHA-256 values are recorded in the baseline-state receipt.
- The migration-runner edit is substantive pre-existing work. It adds bounded migration locking, numeric ordering, transactional rollback, safe cleanup, and terminal failure reporting. It is not represented as work created by this audit.

## Release and configuration posture

- Workspace package metadata still reports `0.10.0-rc.10.73.6`; this is a release-metadata drift item for rc.10.78.2.
- `backend/.env` exists, is ignored, is not tracked, and is not staged.
- `DATABASE_URL` and `OPENAI_API_KEY` are present in the local backend environment. Their values were not read into evidence, printed, hashed, or copied.
- Database migrations `001` through `021` are present. Runtime migration state had not yet been verified when this baseline was recorded.
- PostgreSQL is the configured project repository when `DATABASE_URL` is present. The repository does not silently select its in-memory implementation in that configuration.
- The raw knowledge vault, browser caches, package caches, local environment files, and database exports remain excluded from this release evidence.

## Current product architecture

- Project persistence already has one canonical `ProjectRepository` abstraction with PostgreSQL, MongoDB Atlas, and in-memory development adapters.
- Canonical project writes synchronize the Architecture Design Graph state before persistence.
- Project creation, project reload, optimistic revision checks, snapshots, tenant-scoped reads, candidate operations, reviewer decisions, and SDD assembly already exist.
- Role navigation currently spans six profiles. The two rc.10.78.2 primary profiles have distinct navigation catalogs, but the entry experience is project-first and exposes a role picker rather than a production public landing and sign-in flow.
- The current sequence view is a journey visualization component. It is not yet a first-class canonical requirements-derived sequence model.
- Living Canvas and the Stage Co-Author surface already use governed candidate operations, but sequence context and role-focused information architecture require consolidation.

## Baseline conclusion

The repository and history are reconcilable. The task may proceed without rewriting historical evidence or introducing a parallel authority store. Production acceptance remains false, Prompt 6 remains paused, and rc.10.79 work has not started.
