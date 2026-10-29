# AIW · Driver-led design studio

Release: **AIW v0.10.0-rc.10.73.30+drivers.20261020**

This release integrates architecture-driver reasoning into the existing guided design journey. It builds on the private site's newer `10.73.29+journey.20261018` source, preserving its Work, Model, Validate and Output refinements.

## The customer journey

The existing Companion opens a comparison in its selected requirement and component context. New comparisons begin with **Conditions**, followed by **Compare**, **Place** and **Verify**. The requirement and applicable drivers remain visible. Questions lead to their actual fields, and returning to a task retains the examined option and step. Source review preserves unsaved answers.

To enter the journey, select a requirement or component, open **Companion / Sol → Co-design**, then use **Compare architecture choices · a guided comparison** or the **Start** action for an architectural choice. Continue with the existing model proposal preview and acceptance flow.

The entry no longer presents a mechanism sketch before the design context is established. Duplicate concern selectors and help are consolidated. Placement is reviewed before the existing Save and preview action. The existing proposal workspace still handles review and acceptance; application of a proposal remains distinct from decision governance and target verification.

## Architecture decisions covered

| Decision | Conditions and model consequence |
| --- | --- |
| Direct reads or cache-aside | Read reuse, permitted staleness, authority, cache permission, invalidation, failure behaviour and controlled refill. A cache remains a disposable copy with no new write authority. |
| PostgreSQL or MySQL | The existing product comparison now considers explicit version and configuration facts, including InnoDB, uniqueness and atomic effects, replication, PostgreSQL row policies and materialized views, and compatibility requirements. A product name alone cannot establish conditional support. |
| One store or sharding | Partitioning is its own comparison, independent of relational/document persistence. It asks for the actual pressure, simpler alternatives, partition key, transaction locality, cross-partition reads, routing ownership, rebalance and recovery. Routing can belong to the application, platform store, or a separately justified component. |
| Request-response or durable queue | Completion semantics, repeat protection, ordering, backlog/admission limits and outcome discovery determine the comparison. A queued acknowledgement is distinct from a final business result. |
| Direct endpoint, reverse proxy, balancing, or both | Proxy policy and backend distribution are separate responsibilities. A combined option can realise both. The model need not invent two products or deployable services. |
| Bounded call or protected call | A circuit breaker and isolation policy belong at the caller/dependency boundary. Remote failure, safe repetition, deadlines, fallback and operating ownership determine the obligations. |

The existing delivery, service-boundary and quantitative methods remain available. Partitioning has no invented numerical calculator. Workload and capacity calculations continue to require an explicit project input or explicit exploration of an illustrative example.

## One connected reasoning record

All eight existing driver kinds participate in the shared scope projection. Direct component links add positive scope beside responsibility, decision and requirement-group links. Recorded paths retain their provenance. An unlinked component does not acquire another component's direct driver merely because they are adjacent in a diagram.

A prepared alternative retains the complete applicable driver IDs, focus driver, compared approaches, checks, trade-offs, concrete role placement, method/source receipt and implementation/verification obligations. Acceptance retains that trace in the existing task and alternative history. Component specifications, product criteria and the SDD read the same accepted trace; there is no second solution registry.

Obligations identify the affected component, relevant driver IDs, parameter fields, source references and evidence required. They remain **pending verification**. Their presence is not a preference bonus in a product comparison.

The model preview highlights the changed relationships. Two affected endpoints do not cause an unrelated retained edge to be marked as a proposed relationship.

## Loading and interface continuity

Architecture-case review and workbook tools load when their existing surfaces are opened. A loading state explains the wait. Project and disposal guards cancel late editor opens; a case action also checks that the user has retained the same tab and section. The focused-case workspace preserves the current control's focus when its reader arrives. Knowledge governance reads a small canonical source-identity manifest, without loading the complete composition evaluator merely to recognise a withdrawn source.

Retired and superseded Companion styling is removed. These refinements retain the existing client size and request-count budgets; they add no new navigation layer or duplicate editor.

## Brain, repository, MindFactory, Pattern DNA and Sol

| Existing capability | Contribution in this release |
| --- | --- |
| AIW Brain | Shares canonical driver scope and configuration applicability with model, product and reasoning consumers. It retains hard-constraint standing separately from preference arithmetic. |
| Knowledge Repository | Existing candidate claims can include bounded typed conditions and logical placement. The existing passage, review, release, activation and withdrawal process still governs them. |
| MindFactory and guided alternatives | The existing exploration/proposal workflow compares credible approaches, resolves roles onto the model, and uses the native preview and acceptance commands. |
| Pattern DNA | Existing pattern/style/tactic identities and relationships remain linked to mechanisms, capability needs, source conditions and placement. A named concept is a candidate for consideration until its applicability is established. |
| LLM/Sol | Receives the applicable driver set, conditions, alternatives, placements, obligations and source identities. Repeated graph data is represented once within the existing packet budget. Declared fit never establishes measured quality. Product advice becomes stale when its material configuration or supporting applicability changes. |

The typed evaluator uses a small fixed set of comparisons over literal fact keys. Missing facts produce questions. It does not execute repository content or infer a configuration from prose. Existing specialised methods retain their own engineering checks and equations.

## Product comparison and configuration

Product-specific questions are folded into the existing option configuration editor. Unknown, false and zero remain distinct. The option's standard version, topology, tier, instance count and failure domains cannot be overwritten by additional facts.

Generic product mechanisms require a stated version. Exact version restrictions are enforced where a claim defines that scope; compatibility with other selected versions still needs review against the cited documentation. The reference set covers the engineering decisions described above and can grow through the existing governed repository process.

The product profile shows the same evaluated mechanism state as the comparison: conditions stated, more context needed, or outside this configuration. A mechanism can be unavailable while the product remains a candidate for another approach. A recorded hard-constraint violation excludes a choice from preference arithmetic and blocks recording it as an accepted selection under the existing review semantics.

Previously recorded judgements are retained when configuration or source changes require re-review. Automatically adopted suggestions retain their support receipts. Human evidence is kept distinguishable from a conditional documentation-based suggestion.

## Changes and existing projects

The new facts and solution traces are optional fields in the existing document model. Existing designs, model arrangement and history are retained. Some older comparisons may request a source review because their captured basis did not contain the now-visible driver scope or the revised method interpretation. AIW does not silently turn that older acceptance into a new approval.

A changed driver target or other captured fact now produces a specific explanation and a current read-only comparison. The old adopted solution remains visible until an architect reviews or replaces it. Reassessment does not invent measurements or erase the decision history.

Method interpretation revision 2 is recorded separately from the publisher's original file identity. Older method receipts and generated guidance require a deliberate source review when this interpretation changes. Refresh retains the saved declarations and the earlier adoption, alternative and model history.

## Verification

Focused suites cover shared driver scope, missing/false configuration facts, typed condition validation, Redis topology counterexamples, hard constraints, source withdrawal, stale assessments, the guided DOM journey, concrete role placement, specification/export traceability and changed-target reassessment. Existing domain and in-process Worker suites cover persistence, owner/revision guards, proposal acceptance, rollback and Sol source handling. The release's test commands are included in the complete source.

New focused commands:

```sh
npm run test:driver-applicability
npm run test:driver-design-ui
npm run test:driver-knowledge-ui
npm run test:driver-solution
npm run test:driver-spec-view
npm run test:driver-product-ui
npm run test:architecture-grounding
npm run test:architecture-evaluation
npm run test:deferred-case
npm run test:deferred-intake
```

**Visual verification limit:** the browser-control capability required by this environment's Sites workflow was unavailable. This release uses DOM interaction checks and production build/package verification; it does not claim a fresh desktop/mobile visual browser review. Earlier screenshots in the repository are historical evidence, not evidence for this release.

## Local use

Use Node.js 22.13 or later, install the locked dependencies with `npm ci`, then run `npm run dev`. `npm run build` emits the packaged Worker and client. The source includes the existing local server, method sources, tests and export code; it is a complete checkout rather than a patch bundle. Runtime credentials and private customer records are not included in the source archive.
