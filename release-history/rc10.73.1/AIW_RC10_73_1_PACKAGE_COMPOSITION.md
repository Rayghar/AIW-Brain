# AIW rc.10.73.1 Package Composition

**Package:** `AIW_v0.10.0-rc.10.73.1_Canonical_Brain_Conformance_Closure_Canonical_Graph_State_Migration_FULLDIST`  
**Files before checksum manifest:** 3,202  
**Uncompressed size before checksum manifest:** 84.14 MiB  
**Source/documentation files:** 1,943  
**Compiled distribution files:** 1,194

The final SHA-256 manifest is generated after this composition record and is therefore excluded from the count above.

## Included

- Backend and frontend source workspaces
- Fresh compiled backend and frontend distribution output
- Canonical graph-primary state authority, migration and native-state command implementation
- Compatibility adapter and repository-boundary enforcement
- rc.10.73.1 behavioural tests, release gates and verification logs
- Knowledge repository, benchmark material, database migrations and deployment assets
- Historical release evidence retained under `release-history`
- Public verification keys used for release/signature validation

## Excluded

- `node_modules` and package-manager caches
- Git metadata
- Test-result, Playwright, coverage and TypeScript incremental output
- Temporary and backup files
- Private keys and credentials

## Verification boundary

The full backend build, 11 focused backend tests, 24/24 rc.10.73.1 release gates, dependency/integrity/security gates, full frontend package build, fresh Vite production bundle, 12 frontend regression tests and compiled Sol migration-action checks passed. Browser end-to-end, live LLM-provider, managed-infrastructure, independent-expert and production acceptance remain unclaimed. See `AIW_RC10_73_1_TEST_EVIDENCE.json`.
