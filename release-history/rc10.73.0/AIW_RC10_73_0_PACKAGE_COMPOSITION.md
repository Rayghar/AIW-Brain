# AIW rc.10.73.0 Package Composition

**Package:** `AIW_v0.10.0-rc.10.73.0_Canonical_Brain_Conformance_Closure_Design_Graph_Foundation_FULLDIST`  
**Files before checksum manifest:** 3,177  
**Uncompressed size before checksum manifest:** 83.57 MiB  
**Source/documentation files:** 2,717  
**Compiled distribution files:** 1,188

The final SHA-256 manifest is generated after this composition record and is therefore excluded from the count above.

## Included

- Backend and frontend source workspaces
- Compiled backend and frontend distribution output
- Canonical Design Graph implementation and focused regression tests
- Current rc.10.73.0 release evidence and verification logs
- Knowledge repository, benchmark material, migrations and deployment assets
- Historical release evidence retained under `release-history`
- Public verification keys used for release/signature validation

## Excluded

- `node_modules` and package-manager caches
- Git metadata
- Test-result, Playwright and coverage output
- TypeScript incremental build caches
- Temporary and backup files
- Private keys and credentials

## Verification boundary

The full backend build, focused tests, package builds and release gates passed. A fresh frontend web rebundle could not run because the delivery environment lacked the React, lucide and Vite web-workspace dependencies. The authoritative TSX source passed an esbuild syntax transform, the distributed Sol lazy chunk passed `node --check`, and the compiled-output gate passed. See `AIW_RC10_73_0_TEST_EVIDENCE.json`.
