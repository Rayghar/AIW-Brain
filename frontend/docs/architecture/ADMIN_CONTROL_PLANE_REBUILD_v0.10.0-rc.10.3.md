# Admin Control Plane Rebuild — v0.10.0-rc.10.3

## Architecture decision

Admin becomes a first-class feature module and platform package, not a collection of component-level panels appended to the main workspace.

## New boundaries

- UI: `apps/web/src/features/admin`
- Domain/control-plane logic: `packages/admin`
- API routes: `apps/api/src/routes/adminConfigurationRoutes.ts`, `adminControlPlaneRoutes.ts`, `knowledgeOpsRoutes.ts`
- Shared repository facade: `apps/api/src/repositories/adminRepositories.ts`

## Removed boundary leakage

- `App.tsx` no longer imports old `components/admin` panels.
- Old `AdminConsoleWorkspace` and `AdminControlCenter` are removed from active source.
- Admin registration is form-driven, not prompt-driven.

## Authority rule

LLM routes configure enrichment only. They do not own policy, eligibility, scoring, release approval or architecture mutation.

## Repository rule

Repository connectors are read-only by default. PR generation, repository writes and architecture mutation require explicit approval.
