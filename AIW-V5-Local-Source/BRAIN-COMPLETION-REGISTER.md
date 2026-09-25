# Architecture Brain: composition and quantitative evidence

This delivery completes the next software scope identified after the shared Brain integration. It does not certify the entire knowledge catalogue, production behaviour, or unrestricted generation of arbitrary architectures.

## What the architect can do

Select a requirement, quality scenario or linked object, open Mind Factory, and choose a design concern. The existing comparison progresses through Compare, Conditions, Objects and Evidence. Sol explains the same saved comparison. Cursor retains the selected-object context. The source/release lifecycle remains inside the existing companion surfaces.

| Concern | Compared designs | What appears in the reviewed model |
| --- | --- | --- |
| Interaction | Request/reply; durable queued work | Caller, processor, optional queue, delivery and recovery obligations. Existing flow retained. |
| Reads | Authoritative reads; cache-aside | Information authority, disposable copy, lineage, access and freshness obligations. Existing flow retained. |
| Persistence | Relational records; aggregate document | Local commit boundary, store, recovery material and operating responsibilities. Existing flow retained. |
| Publication | Best-effort publication; transactional outbox | Business authority, one transaction store, publication intent, relay, channel and consumer. No invented distributed atomicity. |
| Resilience | Bounded calls; breaker with bulkhead | Caller and dependency with explicit deadline, retry, rejection, probe and resource-pool policies. No unnecessary proxy component. |
| Distribution | Single endpoint; health-routed replica pool | Application identity and routing role; runtime placement and replica count stay in Chapter 10. Local session loss and shared bottlenecks remain explicit. |
| Structure | Modules in one application; separately owned services | Logical responsibilities, allocations, contracts and ownership. Internal module collaboration does not become a network self-call. |

Eight new alternatives reuse canonical chapter commands, conditional checks, draft decisions retaining both choices, explicit model-impact review, architect acceptance, SDD receipts and reversal. Existing components, data authority, classification, retention and confirmed needs are preserved. Existing recovery dependency links are reused. The accepted task captures new object IDs and related implementations, contracts and dependencies so later changes invalidate its reasoning.

Diagrams show roles, numbered interactions and failure-case explanations. One concern selector replaces a growing row of buttons. The extra capabilities stay within the established forest/paper/gold interface and the three existing companions.

## Numerical reasoning and observations

Six explicit methods cover backlog drain, cache mean cost/source demand, restore time, retry budgets, replica/bottleneck capacity and remote-call transport budgets. Publication shares the backlog method. There are no default improvement percentages or architecture scores. Inputs, units, formulas, assumptions and option differences are visible; unbounded backlog is represented explicitly.

Architect-recorded observations require the original source, exact lines, source revision/content hash, workload, environment, procedure, reviewer and an authenticated recording identity. Comparisons retain individual observations, mean, sample deviation and prediction error. Changed inputs, model, implementation, dependencies, source revision or withdrawal make earlier observations stale. The working SDD exposes this status and the original evidence; frozen baselines retain their original content.

This is a calibration workflow, not a claim that a project or the entire catalogue has been calibrated. Synthetic observations used in acceptance tests are labelled synthetic. Production validation requires actual workload and failure measurements from the target system.

## Sol and knowledge authority

The existing server-side OpenAI connection remains in use. Architecture answers must cite the actual reviewed method; explanation-only comparisons cannot emit unrelated boundary proposals. Citation schema constraints are isolated from ordinary prose fields. Long method packets share repeated checks, preserve typed relationships and fail explicitly if required reasoning cannot fit.

A second, bounded provider call checks the candidate against its original source packet. It does not independently verify sources. If the check rejects the explanation, the response uses structured findings from the reviewed method and visibly explains why. The candidate, assessment, source stamp, provider identities and combined usage remain in the private run receipt. A rejected response cannot secretly enter the model. Provider failures retain the existing explicit failure behaviour and shared timeout.

The evaluation exposed meaningful defects: missing method citations, unsupported design options, a shared-schema alias that constrained prose to citation labels, best-effort descriptions inheriting outbox benefits, and overstated session/transaction guarantees. An automatic rewrite experiment still introduced unsupported assertions, so the shipped path checks and withholds rather than treating a rewrite as verified truth. The earlier reports are retained as investigation evidence, not release acceptance.

Eight inspected primary references back the new procedures. Their exact URLs, access dates, bounded paraphrases and summary hashes accompany the methods. A hash establishes content identity; it is not proof of truth or independent approval. The recovered 328-record catalogue remains descriptive unless a particular claim passes the existing source, interpretation, release and eligibility gates. No blanket promotion or invented repository refresh was performed.

## Verification and boundaries

The executable acceptance evidence is in `evidence/brain-completion/`:

- `domain-regressions.json`: existing interaction/read/persistence, model alternatives/reversal, review, knowledge lifecycle, Brain integration, new composition, provider and source-check tests.
- `interaction-regressions.json`: all four new concerns through the mounted interface and real Worker/SQLite commands, model acceptance, observations, ownership, unsaved-input protection and SDD.
- `live-reasoning.json`: eight real OpenAI requests over synthetic scenarios, including complete candidate/check receipts. Rubric checks are necessary conditions, not semantic certification.
- `evaluation-review.json`: the implementation assistant's reading of the actual final responses and any limits. This is not independent human review.

The browser service repeatedly failed with `CDP operation refresh tabs timed out after 20000ms`. Documented bootstrap and alternative DOM recovery did not restore it. These tests therefore do **not** certify rendered layout, keyboard navigation or a full visual walkthrough. Publication does not remove that remaining gate.

The recovered PostgreSQL/pgvector backend is not deployed in the Worker. Its useful authority and retrieval contracts are carried by the existing D1/R2 implementation. Independent architectural review, broader held-out recommendation evaluation, production measurements, and executable recipes for every catalogue concept remain outside the verified claims of this delivery.
