# rc.10.73.6 Implementation Traceability

| Requirement | Implementation |
|---|---|
| All approved repos selected | `backend/scripts/rc10-73-6-run-live-github-acquisition.mjs` |
| Current versioned GitHub API | `GitHubRestClient` in `rc10-73-6-github-acquisition-core.mjs` |
| Immutable commit pin | `acquireRepository()` |
| Truncated tree recovery | `resolveRepositoryTree()` and `completeTree()` |
| Complete governed scope | policy batching in `acquireRepository()` |
| Allow/deny path governance | `pathAllowed()` |
| Blob integrity | `gitBlobSha()` and `verifyAcquisitionManifest()` |
| Quarantine | `quarantineScan()` |
| Licence evidence | `/repos/{owner}/{repo}/license` collection |
| Exact candidate lineage | `parseArchitectureKnowledge()` |
| Checkpoint/resume | `checkpoints/{connectorId}.json` |
| Connectivity proof | `rc10-73-6-preflight.mjs` |
| Offline tests | `rc10-73-6-test-live-acquisition.mjs` |
| Release gate | `gates/rc10-73-6-live-github-acquisition-gate.mjs` |
