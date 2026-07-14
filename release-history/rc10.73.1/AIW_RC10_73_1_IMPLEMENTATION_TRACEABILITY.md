# rc.10.73.1 Implementation Traceability

| Requirement | Implementation | Verification |
|---|---|---|
| Declare graph-primary authority | `architectureDesignGraphState.ts` — `ArchitectureDesignGraphStateAuthority` and authority policy-gate record | rc.10.73.1 gate; migration test |
| Define canonical state domains | `architectureDesignGraphCanonicalStateKinds` | Gate verifies requirements, evidence, interfaces, decisions, findings and risks |
| Preserve complete canonical objects | `canonicalValue` attributes in `architectureDesignGraph.ts` | Migration test compares projected decisions; gate checks canonical values |
| Preserve requirements aggregate metadata | Project graph record `requirementsIntelligenceMetadata` | Domain build and gate |
| Reconstruct compatibility fields from graph | `projectArchitectureStateFromDesignGraph` | Migration and empty-list command tests |
| Explicit architect-approved migration | `migrateArchitectureProjectStateToDesignGraph` | API migration test and receipt assertions |
| Reject stale migration | Exact preview/current graph fingerprint comparison | Source gate; API error mapping |
| Graph-native canonical-state command | `applyArchitectureDesignGraphCanonicalState` | State command test |
| Support explicit clearing | Patch checks use `!== undefined` for interfaces, decisions and findings | Empty decision-list regression assertion |
| Reject stale state commands | Current graph fingerprint comparison | 409 stale-command test |
| Validate command payload | API reconstructs candidate through `architectureProjectSchema` | API build and negative schema path |
| Detect changed domains | `changedStateKinds` | Command receipt assertion |
| Preserve project revision integrity | Expected revision route checks and repository optimistic concurrency | API tests |
| Translate legacy writes | `synchronizeArchitectureProjectDesignGraphState` | Compatibility-adapter test |
| Count compatibility writes | `compatibilityWriteCount` and `lastWritePath` | Compatibility-adapter assertion |
| Enforce all repositories | Memory, PostgreSQL and MongoDB project/snapshot writes call graph-state synchroniser | Gate and build |
| Expose authority posture | `GET .../design-graph/state-authority` | Route gate |
| Govern migration API | `POST .../design-graph/migrate-state` | API test and audit-source gate |
| Govern native state API | `PUT .../design-graph/state` | API tests and audit-source gate |
| Route through one Brain facade | `ArchitectureBrainOrchestrator` migration/state methods | Gate |
| Pin Brain manifests and proposals | State authority fields in domain Brain contracts and intelligence orchestrator | Gate and build |
| Expose migration in Sol | `CoArchitectPanel.tsx` migration action and governance receipt | Frontend build and gate |
| Preserve rc notation | Package versions, release contract and manifest use `rc.10.73.1` | Release-integrity gates |

## Migration status

| Area | rc.10.73.1 posture |
|---|---|
| Graph schema, integrity and deterministic projection | Implemented |
| Graph materialisation | Implemented |
| Requirements/evidence graph-primary authority | Implemented |
| Interfaces graph-primary authority | Implemented |
| Decisions graph-primary authority | Implemented |
| Findings graph-primary authority | Implemented |
| Risk-bearing requirements graph-primary tracking | Implemented |
| Graph-native state command | Implemented |
| Legacy write compatibility adapter | Implemented; transitional |
| Canvas nodes and edges graph-primary commands | Not yet |
| Quality/style/pattern graph-primary commands | Not yet |
| Stage approvals and review cases graph-primary | Not yet |
| Synthesis/reasoning-run stores retired | Not yet |
| Graph-primary SDD generation | Not yet |
| Durable append-only reasoning repository | Not yet |
| Full approved-passage semantic grounding | Not yet |
