# AIW rc.10.71.1 Scoped Requirements Traceability

Generated: 2026-07-13T12:00:45Z

This is a release-delta evidence matrix. It is not the complete 396-requirement programme matrix.

| ID | Requirement | Status | Implementation evidence | Verification evidence |
|---|---|---|---|---|
| AUTH-01 | Establish one project Architecture Brain authority | Verified | `architectureBrainOrchestrator.ts`, Brain application routes | Authority API test; gate checks 1–15 |
| AUTH-02 | Remove direct LLM ownership from architecture routes | Verified | Requirements, Living Canvas, project identity and synthesis routes call the orchestrator | Static audit shows 0 architecture-route direct paths |
| AUTH-03 | Keep Mind Factory and operational probes isolated | Verified by design | Knowledge extraction/promotion and health routes classified separately | Authority API and audit inventory |
| AUTH-04 | Load canonical repository project and enforce expected revision | Verified | Brain routes, Ask Sol and synthesis canonical loaders | Stale projection/Ask Sol/System Context API tests |
| AUTH-05 | Return one governed proposal receipt | Verified | Domain `ArchitectureBrainProposalReceipt`; receipt factory | Requirements, workspace, Stage Co-Author, Ask Sol, synthesis and browser assertions |
| AUTH-06 | Prevent LLM direct canonical mutation | Verified contract | Receipt governance, existing accept/apply endpoints | Tests assert `directModelMutationAllowed=false`; human accept paths only |
| AUTH-07 | Make browser intelligence projection-only | Verified | Local recommendation/audit/cursor/synthesis fallback imports removed | Static audit and 39-point gate |
| AUTH-08 | Retire old Brain Signal generators | Verified | Eight modules deleted; runtime index cleaned | Static audit reports 0 remaining |
| KNOW-01 | Pin Kernel, grammar, AKR, Pattern DNA, Cambridge and LLM policy | Verified as fingerprinted manifest | `createArchitectureKnowledgeManifest` | Brain receipt tests and E2E receipt visibility |
| KNOW-02 | Enterprise-sign the runtime knowledge release | Not delivered | — | KMS/live infrastructure acceptance required |
| GRAPH-01 | Build typed Architecture Context Graph | Verified foundation | Domain and engine graph modules | Engine tests, API graph test and audit counts |
| GRAPH-02 | Connect journey participants and interactions | Verified | participant → interaction → participant edges | Engine Genesis test |
| GRAPH-03 | Connect evidence to interface contracts | Implemented | evidence → interface `substantiates` edges | Build/gate; broader fixture coverage remains desirable |
| GRAPH-04 | Compile stage slices with unresolved/stale references | Verified | graph compiler stage slices | Engine semantic-context test |
| IMPACT-01 | Detect semantic requirement changes | Verified | `detectArchitectureSemanticChanges` | Engine authority test |
| IMPACT-02 | Mark only traced durable downstream records stale | Verified | `applyArchitectureSemanticStaleness` | Engine test asserts object stale, journeys/context current |
| MIG-01 | Migrate legacy fields once into canonical Requirements Intelligence | Verified | `migrateLegacyRequirementsProject` and API | Engine/API tests |
| MIG-02 | Clearly identify canonical authority while retaining compatibility projections | Verified | migration receipt fields | Engine/API tests and gate |
| RECON-01 | Detect potential duplicates, contradictions and numeric-target conflicts | Verified foundation | `detectRequirementConflicts` | Engine tests |
| RECON-02 | Block unresolved selected conflicts from canonical acceptance | Verified | merge guard and 422 API response | Engine/API tests; browser button disabled |
| RECON-03 | Require explicit disposition and rationale | Verified | proposal UI and conflict-resolution API | Engine/API tests |
| RECON-04 | Audit accepted conflict dispositions | Verified | API audit/activity events | API route contract and test |
| SYSCTX-01 | Compile System Context on server through Brain | Verified | `systemContextCandidate` and Brain routes | Authority gate and API test |
| SYSCTX-02 | Keep System Context preview non-mutating until human acceptance | Verified | preview/apply separation and revision check | API test |
| REG-01 | Preserve Stage Co-Author and governed LLM regression behaviour | Verified | Orchestrator adapters | rc.10.67/68/70 regression tests |
| ACC-01 | Backend focused regression | Verified | 7 test files | 30/30 passed |
| ACC-02 | Desktop and laptop browser acceptance | Verified focused | rc.10.71.1 Playwright journey | 2/2 passed |
| PROG-396 | Complete programme-wide 396-requirement evidence update | **Open** | Scoped delta only | Must be completed before claiming full requirements closure |
