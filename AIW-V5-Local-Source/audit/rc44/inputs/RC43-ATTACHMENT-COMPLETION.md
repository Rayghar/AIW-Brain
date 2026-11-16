# AIW complete design-stage implementation

**Release:** AIW v0.10.0-rc.10.73.43+handbook.20261102.1\
**Controlling scope:** `audit/rc43/attachment-completion/AIW_Design_Stage_Requirements.md`\
**Scope SHA-256:** `c4796793f6cc07ab92718add0f468e063c5ce2b6b9b211866cffc6189e070d10`\
**Authority:** source implementation and local synthetic verification; `productionAccepted: false`.

## Release status

The attached design-stage scope is implemented in the native source. The candidate contains **30 design methods across the existing eleven stages**, **eight architecture families plus the optional AI route**, and **108 traceability entries**. These entries cover the individual stage sub-steps, cross-stage continuity, proportional applicability, optional AI design and the supplied supplier-onboarding example.

The containing package's `VERIFICATION/qualification.json` and external receipt
record the actual qualification of this exact source. Completion requires its
own clean install, frozen check/build, complete **350-script** regression,
security/integrity checks and verified package. Earlier RC42 and archived RC43
results remain historical.

The current profile is [RC43-VALIDATION-PROFILE.json](../docs/RC43-VALIDATION-PROFILE.json):
**360,000 ms per Node command, three ordinary workers and all 350 registered
scripts**, with 34 suites isolated from competing regression load and every
original assertion retained. The older 600-second profile is historical.
Source recovery and the missing original Git ancestry are documented in
[PACKAGE-STATUS.md](../PACKAGE-STATUS.md).

The detailed [attachment coverage](audit/rc43/attachment-completion/attachment-coverage.json) maps each entry to native owners, fields, semantic consumers, checks, verification and document output. The [method inventory](audit/rc43/attachment-completion/method-inventory.json) records the complete field schemas, method questions, model outputs, handbook editions and SHA-256 identities.

## Implementation structure

The architecture retains the existing canonical Design Graph, native commands, revision histories, reviewed impact acceptance and single Brain entry point. A design method is an optional structured part of the native record that owns its meaning. It is authored and saved through that record's existing editor and command.

The shared schema drives normalization, contextual questions, typed reference controls, model relationships, consistency findings and document projections. The guidance opens the native editor at the selected method. Family coverage is derived from the architecture brief and native records; it does not introduce an independent checklist or competing store.

Every method provides a connected chain:

1. An architectural question and explicit inputs.
2. An owned decision or specification on a native record.
3. Canonical model elements and typed relationships.
4. Required-field and semantic consistency checks.
5. Linked verification obligations with a stated oracle and scope.
6. An explanation in the native chapter document and SDD.

The implementation separates a sufficiently specified design from evidence that a target implementation behaves as claimed. A saved declaration, synthetic fixture or model walkthrough supplies no live provider observation or production approval.

## Complete stage scope

| Stage | Native methods | Implemented design depth |
| --- | --- | --- |
| 1. Requirements | `solution-context`, `outcome-contract`, `capability-realisation`, `business-rule-contract` | Scoped solution families; outcome beneficiary, accepted obligation, current failure and causal hypothesis; enduring business capabilities and their people/process/information/control/system realization; exact decision rights, accepted handoffs, exception owners and normal/exceptional journey coverage; consequential rule inputs, units, validity, outputs, missing/conflicting evidence and boundary examples. |
| 2. Quality drivers | `measurement-contract`, `mechanism-hypothesis` | Business-intent versus attempt population; entry, completion and observation clocks; late, rejected, failed, unresolved and missing outcomes; reporting cutoff and restatement; explicit normal, burst, degraded, recovery, rollout and migration scope; mechanism, adverse interaction and refuting experiment. |
| 3. Decisions | `conditional-decision` | Scope and prerequisite conditions; provisional evidence obligations; experiments that distinguish exact alternatives; observable reopening triggers; explicit related and superseding decisions. Currentness follows changed dependent meaning, including transitive contract dependencies. |
| 4. Logical application | `domain-command`, `guarded-workflow` | Shared authoritative facts, permitted writers and existing canonical data; commands, required facts, authorization, preconditions, invariants, atomic sets and coordinated effects; exact case/evidence/policy version guards; task assignment versus decision authority; expiry, reassignment and escalation; retained and explicitly migrated workflow versions; competing commands and uncertain external results. |
| 5. Application realization | `internal-design`, `ai-system` | Internal application/domain services, ports, adapters and repositories; operation-owned transactions; permitted dependencies and forbidden capabilities; command/query input/output/error/uncertainty/cancellation contracts; common operation across all entry channels; owned implementation mapping and test seams; optional bounded AI features, models, retrieval, tools and human review. |
| 6. Logical technology | `failureScenario`, `capabilityDemand` | Multiple shared-cause memberships and simultaneous loss; separate availability and trust conditions; workload-derived request, resource, retry and retained populations; complete surviving application paths, authorized degraded service, finite backlog and recovery horizon; recovery prerequisites and permission to reopen. The failure lab and Model walkthrough consume the same simulator. |
| 7. Technology realization | `targetQualification`, `platformService` | Exact parent-qualified product/version/configuration/topology/identity/network/dependency/workload target; requirement-to-mechanism claims; explicit engineering gaps versus unresolved bindings; exact qualification experiments and evidence limits; common demand and operating-budget references; provider/customer/shared responsibility, credentials, upgrades, recovery, exit and retirement. |
| 8. Interfaces and data | `dataDesign`, `dataSemantics`, `messageSemantics`, `compatibility`, `distributedRecovery`, `dataLifecycle` | Connected native data and interaction work sections; grain and namespace/incarnation identity; canonical authority, writers, copies, cardinality and invariants; transaction read/write/atomic sets and concurrency cases; access paths and physical realization coverage; units, rounding and clocks; commands versus events versus observations; state-entry evidence; required/optional reactions and separately authorized compensation; replay and version compatibility; retention/deletion/hold/restore obligations; immutable analytical cutoff, correction and publication design. |
| 9. Security | `authority-policy`, `trust-lifecycle` | Exact principals, accountable-person equivalence, actions, resources, tenant, purpose and policy revision; explicit coverage of interactive, delayed, export, support, administration, repair and callback paths; current authority, revocation, expiry, delegation and emergency limits; independent review obligations; issuer/verifier/credential-consumer lifecycle, rotation overlap, compromise and recovery; privacy links to the same data-copy/lifecycle contracts. |
| 10. Deployment/runtime | `operating-envelope`, `recovery-contract`, `environment-contract`, `release-contract` | Steady, burst, slowdown, rollout, drain, rollback, replay, migration and recovery populations; old/new processes, jobs, connections, inquiries, repair, reserve, remote unknowns and human queues; complete recovery set; ordered detection, authorization, old-writer denial, restoration, invariant checks, reconciliation and selective reopening; immutable release composition and verification-before-deployment; claim-specific environment equivalence and limitations. |
| 11. Review/realize | `assurance-claim`, `transition-contract`, `production-learning` | Claim/mechanism/experiment/oracle/observation/coverage/limitation argument; exact multi-experiment portfolios with distinct planned/executed/failed/blocked/not-run/justified-exclusion states; reachable migration states, cohorts, snapshots, compatibility and authority transfer; reversal, compensation, forward repair and obligation retirement; reviewed operational observations opening owned requirement, ADR and control reviews through the existing change journal. |

The eight Volume 10 families are transactional services, long-running workflows, read-heavy services, asynchronous integration, partner APIs, analytical pipelines, multi-tenant platforms and legacy replacement. The optional AI-enabled family supplies the ninth path. A project can select several families and scope each to the whole project or exact native owners.

## Native identities and atomic authoring

Typed method rows use one canonical address throughout authoring, graph projection, currentness, experiments and exports:

`owner/design/method/collection/row`

Technology options and dictionary fields retain their parent-qualified native identities. An exact option remains the owner of its qualification method; containment does not redirect the edit to the enclosing realization plan. Local legacy aliases resolve only when unambiguous.

When a new owner has not yet received its native ID, the editor uses an explicit draft-relative row address. The native command allocates its final owner and dictionary identities, validates the complete normalized candidate, resolves the references and commits once. Failed validation neither mutates the document nor consumes an identity. Relative or provisional root identities do not persist.

Stable row IDs are distinct from display labels. Leading/trailing whitespace or a malformed ID is rejected atomically, preventing normalization from leaving a reference pointing to a vanished identity. New sibling rows become selectable before saving, and label changes refresh the reference controls without losing focus or search text.

Method rows inherit their native owner's architectural scope. Their typed relationships join the existing model and journey index. An authored relationship does not prove requirement fulfillment, deployment, authority approval or test execution.

## Applicability, currentness and migration

Optional depth remains proportional to the actual solution. A method can be explicitly declared **Not applicable**, with a reason, accountable owner, source and human review against its precise current scope. The command owns the scope fingerprint; a caller cannot forge it.

The visible method states are **Design declared**, **Incomplete**, **Inconsistent** and **Not applicable (reviewed)**. A stale or unreviewed exclusion remains open. An exclusion cannot hide a contradictory authority or resource declaration, and an active design cannot rely on a method that has been excluded.

Applicability and ordinary source readings use semantic content, including transitive typed dependencies. Each canonical dependency is visited once, so mutually referenced methods terminate and settle consistently. A changed domain command can invalidate both its interface contract and an ADR that observes that contract. A changed experiment or workflow guard can invalidate the dependent component reading.

Generated review receipts, timestamps, authorship metadata and assessment fingerprints do not recursively fingerprint themselves. Authored experiment checks, emergency-review duties, substantive assessment rationale and actual business status retain their meaning. Fresh applicability decisions bind the finalized, normalized native owner rather than an incomplete transport payload.

Reading definition 4 introduces this semantic dependency content. The upgrade preserves the distinction between genuinely current and stale historical readings, refuses ambiguous old-to-new fingerprint aliases and leaves frozen historical baselines intact. A migration does not promote an old observation or human approval into new authority.

## Supplier-onboarding acceptance design

The supplier fixture is built from a **blank project through native commands**. It contains 17 complete method declarations and 53 connected native assertions. It distinguishes uploaded, technically checked, reviewed, approved, activating and activated states.

The approval is bound to the exact tenant, supplier, case version, immutable evidence, bank revision and policy version. A banking change invalidates the prior approval and reopens reconsideration. Work already dispatched under an uncertain activation outcome remains an owned obligation to reconcile by its original identity.

HTTP, import, operator and callback channels converge on one guarded application operation. The scanner may read authorized evidence and report technical findings; it cannot approve the supplier, change case persistence or grant activation authority. The native checks reject substituting the scanner for the business approval holder, treating an observation as effect authority or claiming one local transaction over separately authoritative scanner state.

The design retains existing v1 cases while defining the conditions for undispatched cases to migrate to v2. It includes stale-approval, duplicate-action, revoked-authority, scanner-timeout and lost-response challenges, with independent case/approval histories and provider journals as the planned oracles.

The real-browser journey exercises authoring and review: a confirmed contradictory workflow is refused without mutation; an explicit draft can retain the open finding; repair and reconfirm restore the coherent design; changing the approval meaning invalidates the downstream application reading. Normal JSON export and reviewed restoration preserve canonical identities and the changed design. These checks validate AIW's support for the architecture; they do not implement or execute a supplier-management service.

## Optional AI design

The AI method belongs to the native application component and links to existing data, controls, commands, transitions and verification experiments.

| Capability | Required architectural boundary |
| --- | --- |
| Features | Stable entity and transformation identity; event-time and historical known-at meaning; maximum age; missing/stale policy; training/serving parity and a refuting experiment. |
| Models | Exact model version and SHA-256 artifact; data/feature/runtime binding; evaluation population; separate promotion authority; deadline, abstention and reversal. |
| Retrieval | Trusted principal and purpose; immutable source/permission revision; authorization before context and again at answer release; cited, uncited and cached dependency tracking; bounded revocation and invalid-dependency response. |
| Tools | Allowlisted typed command and schema; trusted identity outside model content; exact operation/argument/case/evidence/policy approval; original intent; uncertainty and cancellation. Model content cannot grant effect authority. |
| Human review | Exact case/evidence/policy guard and assignment-versus-authority distinction; arrival rate, reviewer count, service rate, backlog and finite clearance; expiry, reassignment and escalation. |

Required capabilities must have complete rows. Excluded capabilities need a coherent scope rationale and cannot retain contradictory active declarations. The validators challenge invalid artifact digests, missing release authorization, model-granted authority and insufficient review capacity.

## Assurance and continuing ownership

One passing experiment cannot close a portfolio. Each check and original observation has its own exact experiment identity, evidence class, scope, comparison and currentness. A synthetic model observation cannot establish a target-platform claim. Planned experiments remain visible in the assurance document before results exist.

Operational learning uses a typed original observation for an incident, measurement, provider change, growth or policy change. A person reviews the exact trigger through `review.learning`, which opens the existing change journal and owned follow-up reviews. It does not silently edit the requirement, ADR or control, or grant approval. Unassessed or stale operational follow-up blocks the applicable delivery handoff.

Recovery treats reopening as an authority decision. When fencing is required, restoration follows denial of the old writer; reconciliation follows invariant validation; inquiry, new acceptance, dispatch and reconciliation have separate prerequisites. The recovery inventory includes data, accepted work, history, configuration, schema, trust, provider identity and audit evidence.

## Verification inventory

The release keeps the original 341 registered scripts and adds these nine:

| New script | Principal scope |
| --- | --- |
| `test:intent-handbook-completion` | Stage 1–5 semantics, native creation, exact currentness, transitive/cyclic dependency and migration checks. |
| `test:supplier-onboarding-completion` | Blank-project connected supplier design, negative cases, canonical graph and exports. |
| `test:platform-handbook-completion` | Shared failures, demand, target qualification, data/semantic contracts, fresh authoring and migration. |
| `test:platform-handbook-completion-browser` | Native data activity panels, typed pickers, exact options, shared-cause Model walkthrough and method deep links. |
| `test:rc43-assurance-completion` | Authority, runtime, recovery, portfolios, transition, learning and applicability. |
| `test:rc43-assurance-completion-ui` | Canonical Worker command and DOM integration, retained drafting state and human review gates. |
| `test:rc43-assurance-completion-browser` | Real portfolio authoring, distinct observation receipts and explicit operational-review creation. |
| `test:rc43-shared-method` | Shared methods, scoped families, AI path, canonical graph, references, applicability and grouped editor roundtrips. |
| `test:rc43-method-journey-browser` | Real brief/family authoring, guided AI editing and the connected supplier journey. |

The complete release runner remains authoritative under the committed validation profile. Its external command watchdog is declared separately from the unchanged in-suite performance and size thresholds, including the 150-client-script limit. The complete frozen run must preserve its source commit, executable inputs, candidate check/build receipts and full command logs. Generated audit outputs are identified separately; they do not exempt source files from the freeze.

## Source locations and operation

| Responsibility | Source |
| --- | --- |
| Shared method, typed identity, applicability and dependency semantics | `public/design-contracts.js` |
| Native method editor and reference controls | `public/design-contract-ui.js` |
| Intent, logical and internal-software schemas/checks | `public/intent-design-contracts.js` |
| Platform, qualification, data and interaction schemas/checks | `public/platform-design-contracts.js` |
| Authority, runtime, assurance and evolution schemas/checks | `public/assurance-design-contracts.js` |
| Native graph, scope and journey | `public/architecture-model.js`, `public/journey-context.js` |
| Contextual guidance and native editor registry | `public/chapter-guide.js`, `public/chapter-guide-ui.js`, `public/field-spark.js` |
| Evidence portfolio and original observations | `public/architecture-verification.js`, `public/assurance-domain.js` |
| Learning-trigger review and continuing ownership | `public/review-domain.js`, `public/changes-domain.js`, `public/delivery-feedback.js` |
| Document projection and source-reading upgrade | `public/design-contract-document.js`, `public/source-fingerprint.js`, `public/readings-upgrade.js`, `public/reading-copies.js` |

Extract `AIW-rc43-handbook-complete-source.zip`, enter `AIW-Brain/AIW-V5-Local-Source`, run `npm ci` and `npm start`, then open `http://localhost:4173`. See [LOCAL-RUN.md](LOCAL-RUN.md) for the build, persistence, accounts, backup and optional provider configuration.

No deployment, live provider evaluation, independent human review, licence decision, KMS signing or production acceptance is inferred from these source tests. Those authorities remain explicit project-specific obligations. The package retains prior release evidence as history and binds RC43 claims to its own source and execution.
