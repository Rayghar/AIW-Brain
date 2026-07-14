# AIW End-to-End Navigation Audit — v0.10.0-rc.10.23

## Scope
Audit and repair of the uploaded `AIW_v0.10.0-rc.10.22_Cambridge_Logic_Global.zip` package where manual testing showed that most pages/workspaces could not be clicked or navigated reliably.

## Findings

### P0-1 — Package graph version skew blocked install/build
`package.json` declared rc.10.22 in selected workspaces while many internal `@aiw/*` dependencies and the lockfile still pointed to rc.10.21. `npm ci` attempted to fetch internal workspace packages from the registry instead of linking local workspaces.

**Impact:** local install/build could fail before the UI even runs.

**Fix:** normalized all workspace package versions and internal `@aiw/*` dependency versions to `0.10.0-rc.10.23`, then regenerated the lockfile.

### P0-2 — Activation workspace JSX was broken
The Activation route rendered `LocaleSwitcher` and `GuidedJourneyWorkspace` as adjacent JSX siblings without a fragment.

**Impact:** the web bundle could fail or route composition could break when opening the full reference workbench, which defaults to the Activation workspace.

**Fix:** wrapped the activation route in a React fragment.

### P0-3 — Mind Factory split route file had a corrupt import block
`apps/api/src/routes/mindFactoryJobsRoutes.ts` had an incomplete `import {` block and missing local guard helpers.

**Impact:** API build failed, preventing validated full-stack operation.

**Fix:** restored the correct imports and local `actorOf`/`guard` helpers.

### P1-1 — Comparison workspace was routable but hidden from sidebar
The Comparison workspace existed in the route model and selector but was filtered out of the primary sidebar workspace navigation.

**Impact:** users perceived a missing/broken page because a first-class workspace was not click-accessible from the main rail.

**Fix:** removed the comparison filter so all 17 workspaces are visible/clickable when the active experience profile permits them.

### P1-2 — Route handoff needed a single navigation path
Workspace buttons, command palette entries, selectors and stage actions used direct setters in multiple places.

**Impact:** hard to verify consistent click/focus behavior across navigation surfaces.

**Fix:** introduced `enterWorkspace()` and `enterStage()` helpers and routed the sidebar, topbar selector, command palette and launchpad through them. Both helpers focus the main landmark after navigation.

### P1-3 — API health/readiness still reported old active release
Health/readiness and several active API route payloads still returned rc.10.21.

**Impact:** operators could not trust whether the running build matched the delivered artifact.

**Fix:** updated active API version responses to rc.10.23 and repaired the E2E smoke script to compare health version against the package version instead of stale rc.6.

## Verification completed
- `npm ci --ignore-scripts`
- `npm run package:integrity`
- `npm run release:hygiene`
- `npm run build`
- `npm run ui:clickability:verify`
- `npm run e2e:navigation:wiring`
- `npm run browser:e2e:smoke`
- `npm run a11y:contrast`
- `npm run e2e`
- `npm run test -w @aiw/api -- test/sprint8_9_5.test.ts test/sprint8_9_6.test.ts test/sprint8_9_7.test.ts test/sprint8_9_8.test.ts`
- `npm run security:check`
- `npm run route:permissions:report`

## Route coverage after repair
- 17/17 workspaces statically route-wired and visible in at least one experience profile.
- 6/6 lifecycle stages route-wired.
- Browser bundle builds successfully.
- API and worker builds succeed.
- API Mind Factory regression tests: 16/16 passed.
- Admin/Knowledge mutation permission coverage: 56/56 guarded.

## Boundary
The included browser validation is static/bundle-based smoke and navigation wiring verification. It is not a Playwright/Selenium live-click suite. The next hardening step should add a real browser automation harness if the project accepts the dependency.
