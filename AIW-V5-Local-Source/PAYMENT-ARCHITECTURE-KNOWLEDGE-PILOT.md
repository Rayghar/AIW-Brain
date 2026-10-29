# Payment architecture knowledge pilot

This pilot is a **review queue and a test fixture**. It does not claim that AIW has acquired the linked originals, cleared source rights, independently reviewed real claims, selected a broker for a bank, run a failure test, or approved a payment SDD. The candidate pack is `evaluation/payment-architecture-knowledge-pilot.json`; the automated authority check is `npm run test:payment-knowledge-pilot`.

## Case boundary

The existing illustrative Bank Payment Journey supplies three candidate requirements (REQ-001, REQ-003, REQ-004), three quality scenarios (QD-001, QD-003, QD-004), the `queue` capability (TC-003), its `tr-003` realization, and RabbitMQ `TO-005` versus Kafka `TO-006`. Those reference objects are **not confirmed project requirements**. The private originals inventoried by `scripts/pilot-payment-case.mjs` have separate hashes and row/page locators; its read only inventory has no architect confirmation or saved selection.

| Architecture question | Candidate knowledge | Evidence and review still needed |
| --- | --- | --- |
| How does a payment state change become publishable work? | Transactional outbox with a monitored relay; duplicate-safe consumption remains necessary. | Determine the real transaction boundary, acquire an exact permitted method source, review its conditions, then inject failure before and after commit and publication. |
| Should a consumer revisit already processed events? | Kafka's retained log and consumer positions may help under a defined retention, replay and access policy. | Check the project's Kafka version, partition/retention settings, operating ownership, replay permissions, processing idempotency and ledger reconciliation. |
| Is retry of unprocessed work enough? | RabbitMQ quorum queues with publisher confirms and consumer acknowledgements may fit a bounded work handoff. | Acquire documentation applicable to the exact RabbitMQ version, inspect quorum topology and acknowledgements, and exercise node and consumer failures. Current online material alone cannot prove the template's 4.0 configuration. |

The AWS outbox guidance identifies the database/message dual-write problem and duplicate-message obligation. Kafka 3.9 documentation describes consumer positions, delivery semantics and replication. RabbitMQ documentation distinguishes publisher confirms from consumer acknowledgements and explains quorum queue operating conditions. PostgreSQL 17 constraint documentation is a candidate reference for designing a unique business key; a unique key alone does not establish end-to-end payment integrity. The pack stores **locators and independently authored candidate interpretations**, not copied page bodies or a rights decision.

## Route to a real case

1. Confirm one to three requirements, quality targets, workload and scope with the payment architect. Map the selected rows of the controlling workbook and any permitted PayHub pages to the actual project. The illustrative reference is a conversation starter.
2. Retrieve exact originals through Mind Factory / Sources with revision, source hash and passage locations. Confirm permitted product use for both internal and external sources. Preserve version-appropriate documentation for each technology claim.
3. Create typed claims in the existing knowledge workflow; an independent authenticated architect checks each original, interpretation, conditions, exclusions and rights. Resolve contradictions; release and activate through the existing signed path where repository sources require it. Do not import this candidate JSON as an approved release.
4. Compare RabbitMQ and Kafka against the confirmed payment scenario in Chapter 7. Record an architect rationale with version, topology, failure domains, operating owner, retention/backlog, replay policy, duplicate handling, and alternatives. No automatic selection or numerical target assertion follows from a claim.
5. Trace the selected design through components and deployment. Run a relevant failure/replay observation and inspect actual logs, ledger references and reconciliation. A second architect assesses the focused Chapter 11 case; whole-project SDD approval remains a separate gate.

## Counterfactuals to assess with an architect

- If replay of **already consumed** payment history becomes mandatory, reopen the work-queue choice. Compare a retained log and a separate history or event store; do not infer that a queue replay mechanism exists because its delivery is durable.
- If the duplicate-debit target remains zero, examine the idempotency transaction boundary and reconciliation under crashes with either broker. Broker delivery semantics do not by themselves prove the financial result.
- If the peak acknowledgement budget tightens, measure both acknowledgement and final settlement with actual load and failure profiles. A fast broker operation does not establish the end-to-end percentile.

## What the automated test proves

`payment-knowledge-pilot-validate.mjs` uses fabricated source lines and clearly named synthetic actors. It verifies that candidate typed claims cannot enter the Brain or Chapter 7 choice guidance, a claim's author cannot verify it, a synthetic second actor must review and pin a release, missing version/topology is shown as missing context, mismatched scope is excluded, and withdrawal removes eligibility. A Chapter 7 comparison with Kafka 3.9 may retrieve its claim; a realization containing only RabbitMQ or Kafka 4.0 cannot borrow that claim through the lexical Brain, a Sol packet or semantic retrieval. The test inspects the actual synthetic embedding request: knowledge excluded by saved option scope, explicit claim ID or original source ID is omitted before provider transmission, and excluded claims stay out of the prepared Sol packet. The synthetic review is **only a gate regression**. A passing test says nothing about whether these real product options suit a bank's workload or whether a quality target has been met.

For independent evaluation, use a new case not used to author the pack. Ask an architect to compare AIW before and after governed knowledge on source precision, recognition of exclusions, quality tradeoffs, open assumptions, change impact, harmful certainty and time to a reviewable decision. Report assessor identity, case scope, underlying evidence, disagreement and any withholding of incomplete cases.
