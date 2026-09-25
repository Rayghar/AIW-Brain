# Persistence design increment

The existing architecture comparison now covers how application-owned information is committed and recovered. Mind Factory has three compact concerns: Flow, Reads and Persistence. Ask Sol, Mind Factory and Cursor retain their roles. Work, Model, Validate and Output remain the same project surfaces.

## Comparison and model consequences

| Concern | Relational records | Aggregate document |
| --- | --- | --- |
| Proposed pattern | Relational transaction in one owned store | Atomic change inside one aggregate document |
| Invariant | Related records or aggregates inside the declared transaction | One bounded aggregate and its contained records |
| Clarification | Isolation, query shape, indexes and migrations | Aggregate growth, duplication, conflict handling and schema evolution |
| Scope limit | No automatic cross-store or cross-service commit | No automatic cross-aggregate transaction; document products can support wider transactions, but that needs a different design |
| Recovery | Explicit RPO/RTO, protected material, restore and reconciliation plan | The same recovery obligations; document representation supplies no recovery guarantee |

The diagrams show the actual chosen component names and the proposed atomic boundary. Commit, Competing writes and Restore explain design behavior; they do not execute failure simulations. Recovery targets are visible as proposed conditions. They never overwrite the Chapter 2 scenario or claim target achievement.

Conditions retain ownership, allowed writers, commit acknowledgement, uncertain-outcome handling, concurrency, access patterns and schema change. Recovery has its own expandable section. RPO accepts zero; a zero-loss target requires a declared acknowledgement rule and covered failure scope. RTO must be positive. Finite target values are required, up to one year in seconds. Readiness means enough declared context for model review, not that implementation proof exists.

The reviewed proposal connects three roles: authoritative application, active store and recovery repository. Existing components and transactional, backup and recovery capabilities can be reused. Logical responsibilities, physical interactions, support mappings, a persistence operating plan, a draft decision with both alternatives, the canonical data definition and recovery lineage enter one impact review. The inherited commit contract is included before acceptance. Existing application and data definitions retain their fields and ownership; adding lineage advances the data record's revision/history. Physical stores and recovery copies never become independent business authorities.

Existing selected data must have an application authority. External or missing authority must be resolved in Chapter 8; the composer does not silently transfer it. Cross-store atomic work needs another coordination design. Field dictionaries, product selection, deployment placement and measured quality remain later review obligations.

## Source and reasoning boundaries

Method `persistence-design-1`, pack `AIW-PERSISTENCE-1`, version 1. Original interaction and read method receipts remain unchanged.

The SA Playbook component method is retained from the supplied workbook. Three exact excerpts from `Quality Requirements!B13` add RTO, RPO and backup guidance. Workbook SHA-256: `d3ee19a22e664b365a0e3d618bf60ebb195788b5578a425d25c8672e7c53e4a6`. Each excerpt and local reference summary has a SHA-256 identity.

Primary references inspected on 2026-09-20:

- [Microsoft: Understand data models](https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models)
- [PostgreSQL 18: Transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [MongoDB: Atomicity and transactions](https://www.mongodb.com/docs/manual/core/write-operations-atomicity/)
- [PostgreSQL 18: Continuous archiving and point-in-time recovery](https://www.postgresql.org/docs/18/continuous-archiving.html)

Product documentation supplies bounded examples and conditions, not a product recommendation or a universal database guarantee. Typed reasoning connects requirement, quality scenario, pattern, tactic, capability, information, transaction boundary, recovery obligation and sources. No numerical quality score is computed.

Sol receives the exact saved architecture task through the existing configured LLM path. Shared conditions and graph paths appear once, with each alternative's differences preserved. Narrative excerpts are bounded and marked when shortened. The reasoning packet reserves space for the selected object, requirement and scenario. Accepted new roles resolve to their saved object IDs. Classification, recovery-copy definition, commit-contract, operating-plan, selected-component or quality changes invalidate older reasoning and proposals. Explicit source review retires stale draft alternatives. Accepted SDD reasoning retains its original method receipt.

The full knowledge repository, vector retrieval and graph database remain unconnected. This increment extends the bounded reasoning graph and existing provider integration; it does not add another knowledge UI. No live provider call was made for this increment.

## Verification

`persistence-validate.mjs` covers both compositions, incompatible atomic scopes, invalid recovery targets, zero-loss clarification, source hashes, typed graph endpoints, authority preservation, all-capability reuse, visible inherited contracts, explicit acceptance, draft decisions, unchanged quality targets, source freshness, original accepted receipts, SDD output and bounded LLM context. It exercises the actual Worker with private project storage, stale revision rejection, owner isolation and reopen.

`architecture-ui-validate.mjs` in persistence mode exercises the real interface and Worker in a DOM harness: concern selection, scenario scope, incompatible conditions, unsaved-change protection, recovery inputs, walkthrough captions, exact LLM source preparation, object choice, impact review and explicit acceptance. Chapter 2 also routes the saved alternative into its model review without prematurely changing the model.

Read and flow domain/DOM regressions, guided design, Brain and LLM integration checks are retained. Provider validation uses its existing mock harness. Syntax checks and the Sites build verify the packaged Worker dependency graph.

The managed browser connection timed out during tab discovery. Desktop/mobile rendered layout, focus geometry and visual clipping could not be verified in a browser. DOM checks are not a substitute for that review.

## Next

Connect the persisted business change to asynchronous delivery. Promote Transactional Outbox from the existing knowledge pilot into a source-grounded, reviewed alternative that exposes the commit/publish failure window and reuses the transaction, queue, duplicate-handling and operating contracts already in the model.
