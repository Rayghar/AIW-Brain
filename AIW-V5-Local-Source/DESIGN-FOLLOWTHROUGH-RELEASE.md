# AIW · From architecture intent to reviewed design and evidence

Release: **AIW v0.10.0-rc.10.73.32+followthrough.20261020**  
Source baseline: **rc.10.73.31**, commit `629c33c7deb4623722eb1bb0b1c968cc7345793f`.

This release completes the next implementation step within the existing design studio. A source-backed recommendation can continue into a typed native proposal, survive editing and reopening, enter explicit impact review, and carry its accepted verification obligations into Chapter 11. The shared architecture reading can then distinguish a declared design, an accepted proposal and current recorded verification.

The existing Work, Model, Validate and Output structure remains the customer journey. Contextual guidance uses Companion, Sol and the existing editors. No new top-level workspace, separate decision store, provider endpoint or parallel inference engine was introduced.

## 1. Recommendations continue into native design

The saved operation's exact run, option and operation identity is resolved by the private command service. Source receipts, requirements, affected objects, conditions, trade-offs, assumptions, verification proposals and the original generation receipt remain attached to the task. A stale response cannot silently become a current proposal.

| Suggested operation | Native continuation | Architect's explicit choice |
| --- | --- | --- |
| Responsibility | Chapter 4 responsibility | Owner, purpose, boundary and target record |
| Interaction | Chapter 8 interface contract | Participants, operation and failure/repeat policies |
| Information consistency | Chapter 8 invariant | Data, enforcing contracts, condition and proposed check |
| Security | Chapter 9 control | Protected objects, threats, enforcement, failure posture and verification plan |
| Technology | Chapter 7 realization and product option | Existing/new realization and explicitly selected/new option |
| Recovery | Chapter 10 runtime plan | State, recovery, outcome authority, fencing, backup and operating response |
| Deployment | Chapter 10 runtime plan and optional placement | Rollout, rollback, readiness, zone, role, replicas and capacity basis |

Every continuation edits one explicit native target. Names in model output never become object identities or trigger title-based reuse. Additional suggested objects remain visible in the original operation, with an explicit scope explanation for what this draft addresses and what remains to do.

The customer can edit, save, close, reopen, inspect the impact, return to editing, review, accept and undo through the existing workflow. Previewing does not change the canonical design. Acceptance remains a deliberate native command with optimistic concurrency and source-currentness checks. Existing records retain their fields and confirmation semantics: an unchanged responsibility definition keeps its confirmation; a substantive change invalidates it.

## 2. Accepted obligations have exact verification links

Chapter 11 delivery actions can explicitly name an accepted solution obligation using the project, task, solution, obligation and basis identities. One action verifies one named obligation. Similar titles, shared targets or proximity in the UI never create a verification link.

The projection distinguishes four states:

| State | Meaning |
| --- | --- |
| Open | No delivery action is explicitly linked to this obligation. |
| Evidence awaiting | A linked action exists, but current reviewed evidence is not recorded. |
| Current verified | The linked verification record is current for this exact design and evidence basis. |
| Review required | A fact, source, obligation basis or evidence revision that supported the verification has changed. |

The native verification form shows the registered evidence passage, its saved revision and SHA-256. Evidence is never preselected as reviewed. The architect must record and review the observation. AIW checks the reference and basis; it does not execute or independently certify the cited test.

Currentness follows the relevant requirements, drivers, selected product configuration, boundaries, contracts, data, runtime path/environment, named conditions and source receipts. A change to the selected option matters; a change to an unselected alternative does not automatically invalidate this evidence. An unrelated driver or progress note likewise does not reopen a verified obligation.

Withdrawal of a supporting released claim or method interpretation removes current support. A revised, removed or no-longer-confirmed evidence source also requires review. Original acceptance receipts and original method receipts remain byte-for-byte unchanged. Previous verification is retained in history when a person explicitly re-reviews the changed basis.

Work, Validate, Output, the component specification and the common intelligence reading use this same projection. Adding verification does not by itself invalidate an otherwise unchanged technology selection.

## 3. Delivery, repeated effects and business outcomes are composed

Chapter 8 now holds optional structured execution declarations on the native interface contract. They describe the delivery obligation, publication boundary, repeated delivery, identity, duplicate protection, changed intent, timeout meaning, completion promise, outcome authority and operating environment.

The shared applicability evaluator reads those declarations with the exact contract version, dictionary keys, participants, runtime path and environment. Missing declarations remain questions. Contrary declarations produce scoped issues. Matching declarations establish a consistent declared composition, with implementation and measurement still open.

The existing outbox comparison now prepares a distinct business delivery agreement between the business authority and the effect owner. It copies only facts established by the selected approach and reviewed answers. It does not assign the producer's atomic commit to a queue-to-consumer transport hop. Environment, stable identity, changed-intent handling and outcome discovery require explicit refinement when they have not been supplied.

This combines three related design questions:

1. How will committed business intent remain available for delivery?
2. Where is a repeated instruction prevented from creating another business effect?
3. How will the caller discover the authoritative business result when a response is missing?

The bounded implementation interpretation is based on the inspected AWS transactional outbox and idempotent API guidance and Microsoft's asynchronous request-reply guidance. It retains its own authority label, **Inspected source interpretation**. It is not represented as independent project approval or a newly reviewed repository claim.

The native action opens the exact missing field in the existing Boundary, Payloads or Behaviour editor, expands its disclosure and focuses the control. It refuses stale guidance and protects a dirty native draft. See [ARCHITECTURE-EXECUTION-COVERAGE.md](ARCHITECTURE-EXECUTION-COVERAGE.md) for source URLs, interpretation scope and remaining coverage across cache, databases, sharding, delivery, traffic distribution and resilience.

## 4. Drivers and source context have priority

Decision packets reserve the selected record and applicable requirements, architecture drivers and constraints before optional knowledge. If that required context exceeds the existing packet bounds, the request fails before calling a provider. If disclosure excludes required context, the guard does not permit a supported-fit recommendation or refinement from the incomplete packet.

Chapter review retains the existing limits of 60 records, 160 connected elements, 240 relationships and 48,000 source characters. Complete contextual source bundles take priority over optional graph-neighbour breadth. The earlier private twelve-extra-source-row heuristic could exclude every complete knowledge bundle for a well-connected physical realization; review now bounds those rows through its existing record/element/context limits and character allowance. Any omitted breadth is reported. Single-object packets retain their existing 22-source and 28,000-character bounds.

The supplied AKR and Second Brain structures continue through the shared repository integration delivered in rc31. This release consumes that knowledge through its existing identities, source conditions, Pattern DNA relationships, interpretation receipts and governance lifecycle. No editorial or candidate material is automatically promoted into approved executable knowledge. See [EMBEDDED_INTELLIGENCE_RELEASE.md](EMBEDDED_INTELLIGENCE_RELEASE.md) for the exact supplied-material accounting.

## 5. Evaluation now follows the current product contracts

The default evaluation dataset is `evaluation/sol-current-v1.json`: twelve implementation-authored cases containing fourteen assessments across payment, a small service workflow and an existing MySQL migration scenario. These are regression cases, not an independently held-out measure of architectural quality. The historical `sol-heldout-v1.json` remains intact; retired targets fail preflight rather than regain invented workload assumptions.

Preflight loads the exact catalogue and resolves every target before any provider call. Reports retain redacted packet snapshots, project/context digests, provider receipts and the exact comparison input. The control receives the same disclosed saved project facts, including drivers and constraints, through the same configured reasoning draft route. The independent checker retains its configured check route. Actual provider/model differences and fallbacks are recorded rather than assumed comparable.

Mock or custom transports cannot become live evidence through a mode label. Configuration is distinguished from an observed successful connection. Saved alternatives and proposed verification survive keep/recheck; replay applies the current checks without silently dropping those fields or making a new model request.

Useful commands:

```bash
npm run test:architecture-operation-continuation
npm run test:architecture-obligations
npm run test:execution-composition
npm run test:sol-evaluation
node scripts/evaluate-sol-decisions.mjs --preflight
node scripts/evaluate-sol-coverage.mjs --preflight
```

The synthetic coverage run exercised eighteen assessments and fourteen contextual responses, spanning the eleven chapters and the design, mind, author and challenge modes. It validates protocol, guards and HTML generation. It does not measure a model's architecture quality.

## 6. UI continuity and startup cost

The exchange and impact editors load when their existing workflows need them. Their synchronous read interfaces remain available, and first mutation/preview actions await loading. Project switches, changed revisions or selections, replaced editors, typed input and disposal prevent a late module from reopening or overwriting a stale interaction. Failed loading can be retried. Existing source receipts and explicit acceptance remain authoritative.

Redundant import wrappers were removed through already-loaded shared projections. The original client size, script-count, stylesheet and data limits are unchanged. The release verification record includes the measured production build report.

## Verification scope

The release evidence is recorded in `audit/design-followthrough/verification.json`, with the coverage report, source/currentness checks and production size report alongside it. The suites include native domain commands, in-memory private Worker persistence, exact owner/project isolation, concurrent revision rejection, source withdrawal, retained history, Happy DOM editor interactions and current evaluation replay.

Two limits remain explicit:

- **Rendered browser/mobile QA was not performed in this execution.** The supported browser-control capability was unavailable. Native DOM tests cover interaction behavior, not pixel layout, viewport responsiveness or browser rendering.
- **No live provider comparison was completed in this execution.** Hosted provider configuration exists, but authenticated customer-session execution was unavailable here. Synthetic response tests and provider-route contract checks do not establish live connectivity or architecture quality.

No customer design was changed by these synthetic tests. Release publication preserves the existing private audience. The publication receipt and exact-source Git archive identify the final source commit; the source manifest verifies every packaged source file independently of its checkout-parent commit field.
