# rc.10.73.0 Implementation Traceability

| Requirement | Implementation | Verification |
|---|---|---|
| One typed Design Graph contract | `backend/packages/domain/src/architectureDesignGraph.ts`; mirrored frontend domain package | Domain/API build; canonical graph test |
| Graph retained on the project schema | `ArchitectureProject.designGraph`; backend/frontend Zod schemas | Build and repository round-trip test |
| Deterministic record and relationship identity | `recordId`, `relationId`, stable sorting and `architectureDesignGraphHash` | Repeated-build fingerprint assertion |
| Integrity controls | `validateArchitectureDesignGraph` | Dangling relationship negative test |
| Freshness control | `isArchitectureDesignGraphFresh` | Repository freshness assertion |
| Repository enforcement | `synchronizeArchitectureProjectDesignGraph` in memory, PostgreSQL and MongoDB `saveProject`/`saveSnapshot` | Source gate and in-memory persistence test |
| Brain manifest graph pin | `ArchitectureKnowledgeManifest` graph fields; orchestrator manifest assembly | API preview receipt assertion |
| Brain proposal graph pin | `ArchitectureBrainProposalReceipt.graph` | API preview receipt assertion |
| Preview-only Brain authority | `designGraphPreview`; governance receipt sets direct mutation false | API assertion |
| Human-approved materialisation | `materializeArchitectureProjectDesignGraph` and materialisation API | Materialisation receipt assertion |
| Revision conflict protection | API `expectedRevision`; repository optimistic concurrency | API tests |
| Stale graph prevention | preview fingerprint recomputation and stale response | 409 stale-preview test |
| Auditability | `materialize-design-graph` audit event and materialisation receipt | Source gate |
| UI visibility | `CoArchitectPanel` graph fields and materialisation action | Frontend source gate and build |
| rc notation retained | release manifest, domain release and package versions use `rc.10.73.0` | Release-integrity and rc.10.73 gate |

## Migration status

| Area | rc.10.73.0 posture |
|---|---|
| Graph schema and deterministic projection | Implemented |
| Graph persistence | Implemented |
| Brain graph pinning | Implemented |
| Human materialisation | Implemented |
| Existing project fields retired | Not yet; compatibility projection retained |
| All parallel ledgers retired | Not yet |
| Graph-primary canvas commands | Not yet |
| Graph-primary SDD generation | Not yet |
| Transactional append-only reasoning repository | Not yet |
| Full approved-passage semantic grounding | Not yet |
