# Payment pilot evidence and human review queue

Research date: 12 October 2026 (Africa/Lagos). Status: **prepared for human review; no architecture selection, independent approval, measurement or SDD approval recorded**. No laptop corpus or full payment original was uploaded. This dossier contains source receipts and research interpretations, not released design authority.

Session update: the user selected the second listed requirement, interpreted as UATC-0197, and explicitly permitted this single requirement and selected supporting passages to be stored in the private project and disclosed to OpenAI for the pilot. This permission is bounded; it does not authorize the full corpus. The user offered to act as the second human architect. Exact requirement scope/quality-target confirmation and the actual authenticated source/case assessments remain pending. No review or approval is submitted on the user's behalf. Earlier read-only inventory counts below describe the original inspection, not an approval state after this update.

Local verification update: Playwright/Chromium saved this single requirement and its bounded original extract as an agent-prepared candidate in an isolated local project, read the focused-case evidence queue, downloaded the working export, restarted the actual server and verified persistence. The requirement remained unconfirmed and the case evidence-blocked. These are application checks, not payment test measurements or human findings. No hosted pilot project or provider request was created by this local check. See `local-chromium/bounded-payment/results.json` and its export for the exact exercised state.

## Your next review actions

1. Check UATC-0197, “Create new transfer,” sheet `11 Requirement Detail`, row 269. Confirm or correct: create a transfer payment request; modify/delete only while awaiting approval or rejection. Define the authorization and concurrency boundary. The workbook's one-pass counter has no linked execution artifact.
2. Confirm a measurable scenario for this boundary: operation, load, percentile, start/end clock points, failure profile and target. Do not automatically reuse the PDF's 200 ms routing target for maker/checker request editing.
3. In the private pilot project, inspect each exact source revision and selected passage. Review its recorded permission/use note, conditions, limits and contradictions. Candidate extraction is not released authority. An independent source reviewer must be a genuine distinct authenticated actor where the application requires it.
4. Compare Kafka 3.9 retained-log and RabbitMQ 4.0 quorum-work-queue candidates below. Record your own rationale, chosen/deferred/rejected status, actual patch/tier/topology/operating owner and assumptions. Do not approve the supplied synthetic fixture as real evidence.
5. Attach the original test record or run an approved observation for retries, uncertain outcomes and approval/edit races. Record actual timing and financial reconciliation. No benchmark or runtime environment was available in this implementation run.
6. Chapter 11 → Validate → Focused case: record your own dimension findings and evidence references. The application identifies whether the signed-in reviewer differs from the case author. Because the Site currently permits only the owner's account, genuine distinct-account independence may require an explicitly authorized collaborator later; no audience change or invented identity is made here. A focused finding does not approve the whole-project SDD.

## What was actually checked

- Read the supplied `PAYMENT-ARCHITECTURE-KNOWLEDGE-PILOT.md`, `evaluation/payment-architecture-knowledge-pilot.json`, `scripts/pilot-payment-case.mjs`, and prior round 18/20 evidence inventories.
- Located and independently hashed both controlling payment originals. Reran the supplied read-only pilot script against them successfully. It imports only three selected rows into an unsaved in-memory project; its `reviewed:true` parser/intake flag is **not** architect confirmation or independent review.
- Inspected the PayHub PDF's relevant pages with the installed PyMuPDF reader and visually checked the quality tables on pages 5 and 8. No source edit or hosted import occurred.
- Read local knowledge repository metadata and its SQLite store through `mode=ro`; did not query or export full-text bodies. Read exact public official Kafka 3.9, RabbitMQ 4.0 and PostgreSQL 17 source bytes, computed SHA-256 and identified section/line locators. Public source bodies were not copied into this dossier or a project.

## Real originals and case readiness

| Original | Verified identity | Exact scope/locators |
| --- | --- | --- |
| `C:\Users\ilohec\Downloads\SEABaaS_Executive_Drilldown_Value_Realisation_Workbook_v3.xlsx` | SHA-256 `0cf67cb88fcf1232ac0fd2855c1b76bf2220b7b2fda595407e0f5cc202675b6c`. The `v3 (1).xlsx` copy has identical bytes. | Sheet `11 Requirement Detail`, header row 5. FRD-011: D128; UATC-0197: D269; UATC-0945: D273. UAT counters: R128:U128, R269:U269, R273:U273. |
| `C:\Users\ilohec\Downloads\SB PayHub Payments Ecosystem 1.0.pdf` | SHA-256 `0befdc682531f29547e415b00436c2e06ab869c76aa00b1c77f1f552fb149e61`; 23 pages. | Pages 4-9: architecture and proposed drivers. Pages 11/13: Kafka and relational products. Page 14: OpenShift infrastructure. Pages 17-20: payment path and deployment assertions. |

The fresh script run found **3 source-located requirements, 0 confirmed, 0 connected design trails, 0 linked signed claims, 0 observations, and 0 of 9 end-to-end case checks complete**. Acceptance is blocked. Whole-project SDD readiness is independently false with no baseline or external approval.

FRD-011 reports partially delivered, with zero UAT executions. UATC-0197 and UATC-0945 each report one test and one pass; all three evidence-reference cells are empty. These counters cannot establish test execution, current quality achievement or broker suitability. Requirement confirmation and the mapping between workbook scope and PayHub remain human gates. Do not confuse these imported IDs (REQ-001/002/003) with the illustrative bank template's REQ-001/003/004.

Candidate quality scenarios to confirm are routing within 200 ms under peak load (page 8, Performance row), reversal within five minutes after a mid-process failure (page 8, Reliability row), and settlement within ten minutes of file receipt (page 5, Reconciliation Gaps row). The PDF records targets and product/deployment assertions, not a comparative technology decision or benchmark. Define workload, percentile, clock boundaries, failure profile and acceptance authority before using a target.

## Official product source receipts

All rows remain **retrieved for research, unreviewed, unreleased and inactive**. A receipt establishes byte identity, not rights, semantic approval or applicability. Version families are known; the real system's patch versions, clients, topology, service tier and operating owner are still unknown.

| Product/source | Immutable original and locator | SHA-256 of exact fetched bytes |
| --- | --- | --- |
| Kafka 3.9 Design | [Official source, commit d0cc96bde945ce6c40ce183b0a140d14fe90fbdc](https://github.com/apache/kafka-site/blob/d0cc96bde945ce6c40ce183b0a140d14fe90fbdc/content/en/39/design/design.md). Consumer Position: line 149; Message Delivery Semantics: line 179, external-system boundary: line 205; Availability and Durability Guarantees: lines 278-283. 68,004 bytes. [Rendered 3.9 documentation](https://kafka.apache.org/39/design/design/). | `1f1d48a255e3ecee0284d2150a43a5e8c262e186a457c07006d8eb2e68200b89` |
| RabbitMQ 4.0 Quorum Queues | [Official versioned source, commit 72a7dbe107d3957c8931ba452837dd6dcee56024](https://github.com/rabbitmq/rabbitmq-website/blob/72a7dbe107d3957c8931ba452837dd6dcee56024/versioned_docs/version-4.0/quorum-queues/index.md). Use Cases: line 101; Dead Lettering: line 206; Poison Message Handling: line 339, 4.0 default delivery limit: line 367; replication: line 642; fault tolerance: line 991; data safety: line 1025. 60,095 bytes. | `41c5eb8d6e3dd48fd6c29f2422510d8512315af0efb152b6f855bf8a6f7a38d4` |
| RabbitMQ 4.0 Acknowledgements/Confirms | [Same immutable official revision](https://github.com/rabbitmq/rabbitmq-website/blob/72a7dbe107d3957c8931ba452837dd6dcee56024/versioned_docs/version-4.0/confirms.md). Separate acknowledgement boundaries: line 64; manual acknowledgement: line 123; crash requeue/idempotence: lines 520-532; quorum confirms: line 605; guaranteed delivery: line 653. 31,229 bytes. | `2c79532e1b7a256b1f25cf5cead57efdf471fb508f51f490e920fe6591d54cc3` |
| PostgreSQL 17 constraints | [Official REL_17_STABLE source, commit ab22337434958cb59cdca7cddd0cbd9a27ea4765](https://github.com/postgres/postgres/blob/ab22337434958cb59cdca7cddd0cbd9a27ea4765/doc/src/sgml/ddl.sgml). Unique Constraints: line 828; null handling: lines 907-930; Primary Keys: line 937. 208,402 bytes. [Rendered version 17 constraints](https://www.postgresql.org/docs/17/ddl-constraints.html). | `cea060a26fddc0b9b401e1a478941854d7e4bd9c1340f1d91f4beaa8a17207ed` |

**Version-source defect found:** requesting RabbitMQ `/docs/4.0`, `/docs/4.0/quorum-queues` or `/docs/4.0/confirms` in the browsing service redirected to current 4.3 documentation. The fixture's current-page locator cannot prove 4.0 behaviour. The immutable `versioned_docs/version-4.0` originals above resolve that research gap; exact patch applicability still needs review. Observed copyright/license headers are metadata, not a new reuse-rights determination.

## Bounded comparison prepared for an architect

These are viable candidate mechanisms to assess, without scoring, recommendation or saved selection.

| Actual question to confirm | Kafka 3.9 retained-log option | RabbitMQ 4.0 quorum-work-queue option | Evidence needed before deciding |
| --- | --- | --- | --- |
| Must already consumed history be replayed? | Consumer offsets can revisit retained records; retention, partition key and replay permissions determine usability. | Quorum work queues target pending delivery; consumed-history replay needs a separate retained store or a separately reviewed stream design. | Approved retention window, deletion/privacy rule, replay owner and duplicate-safe replay test. |
| What happens when a node or consumer fails? | `acks=all` depends on the in-sync set; review replication, minimum ISR, leader-election policy and offset/output coordination. External ledger writes require cooperation beyond broker transactions. | Publisher confirmation and consumer acknowledgement cover different boundaries. Quorum availability needs a majority; a consumer crash can redeliver unacknowledged work. In 4.0 the default delivery limit is 20, so define monitored dead-letter handling and recovery ownership. | Actual configuration, failure-domain placement, producer retry policy, crash traces, payment references and ledger reconciliation. |
| How do timing and financial correctness interact? | Measure replay/backlog recovery and end-to-end processing under the confirmed load. | Measure confirms, backlog, retries and processing under the same conditions. | No documentation proves the 200 ms, five-minute, ten-minute or zero-duplicate-financial-effect targets. Compare equivalent environments and observation windows. |

PostgreSQL 17 unique constraints can enforce a business-key boundary; nullable keys need explicit treatment. A key alone does not establish one financial effect across remote participants. Review the transaction boundary and concurrent retry behaviour. [Official constraints](https://www.postgresql.org/docs/17/ddl-constraints.html).

The [AWS transactional outbox guidance](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html), sections Intent and Issues and considerations, supports preparing a candidate state/outbox/relay mechanism with duplicate-safe consumers. It remains a mutable locator with no exact acquired-source receipt in this dossier. It does not supply an atomic remote settlement or eliminate reconciliation.

Proposed trace for review: confirmed payment requirement -> confirmed quality scenario -> existing architecture decision -> payment orchestrator responsibility -> outbox/relay application components -> Chapter 6 durable-handoff capability -> Chapter 7 compared product realization -> consumer/reconciler -> interface and payment/business-key records -> Chapter 10 runtime assets and failure domains -> current observation -> Chapter 11 focused finding. These names describe preparation only; no model objects or product choices were saved by this research task. Reopen the reasoning when replay, target, version, topology, source release or withdrawal changes.

## Local/hosted knowledge boundary

`C:\AIW\aiw\knowledge-repository\store\akr-store.sqlite` was opened read-only. Store ID is `ebb8387e-72a7-429e-894d-3fb0c264c48b`; schema is `aiw-knowledge-repository-store-v1`; `builtAt` is `2026-10-04T06:10:57.879Z`. Its connector metadata contains no Kafka, RabbitMQ or PostgreSQL repository rows, and its schema has no signed-release tables. This does not establish the absence of releases held elsewhere.

The historical knowledge-brain README explicitly describes discovery-only records, `productionAccepted:false`, and a retired 24-file adapter. Its adapter contract says approved query fails closed without trusted independent signed releases. The README also identifies a restricted historical full-collection index containing text from ten metadata-only repositories. Do not use that derived index as a permitted content export. Local acquisition, a connector's approval label and an archive receipt are insufficient hosted authority.

The governed route must retain exact permitted originals/passages, human permission/use notes, independent authenticated claim review, contradiction disposition, signed release where required, explicit project activation and withdrawal propagation. This research did not establish a live hosted connection or a currently activated release. Only a bounded reviewed selection may cross that route.

## Precise open human/evidence gates

1. Payment owner/architect confirms one to three requirement interpretations, scope and quality scenarios against the exact controlling originals; records genuine confirmation rather than importing template status.
2. Source owner/rights authority supplies permitted-use decisions for workbook, PDF, repository passages and externally acquired product documentation, including disclosure and storage limits. An implementation agent does not sign these decisions.
3. Independent authenticated architect verifies each exact claim passage, scope, conditions, exclusions and contradictions; authorized issuer signs a release where required; project owner explicitly activates it. Research receipts remain candidate material until then.
4. Architect authors the Kafka/RabbitMQ comparison, selected/deferred/rejected status, rationale and open assumptions in the existing decision model; supplies exact patch versions, tier, topology, owner, workload and runtime placement. No product is preselected here.
5. Test owner provides original UAT execution artifacts or runs a bounded approved crash/retry/replay observation with actual logs, environment, payment reference, timing and reconciliation. Source pass counters and synthetic tests do not count as runtime payment evidence.
6. A second authenticated architect assesses a real focused case and records their own finding. No authenticated reviewer session or instruction to contact a named person was available to this research task; no review request was sent and no reviewer identity was invented. Whole-project SDD approval remains a separate genuine human gate.

No failed payment test, achieved payment target, selected broker, cleared source use or independent sign-off is claimed. The independently completed preparation is the fresh original inventory, exact official version-source receipts, candidate comparison, trace outline and explicit review queue above.
