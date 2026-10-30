# AIW design process measured against the 27 reviewed handbooks

**Date:** 2026-10-30
**Release line:** AIW v0.10.0-rc.10.73.x. The controlling baseline is rc.10.73.6.
**Source reviewed:** branch `claude/dazzling-cerf-a3qshh` at `2b5afaa`.
**Status:** a review only. No AIW code was changed. Every recommendation is a proposal for the owner to decide on.
productionAccepted stays false.

This file is the summary. The detail is in two companion files:
- [`CHAPTER-GAPS.md`](CHAPTER-GAPS.md), an index of the per-chapter files in `chapter-gaps/`: every verified gap, per chapter, with handbook references, AIW evidence (path:line), why it matters, the recommendation, effort and the skeptic's verdict.
- [`CAPABILITY-DEEP-DIVES.md`](CAPABILITY-DEEP-DIVES.md): thirteen capability deep-dives, many run against a live AIW. Each carries a skeptic's verdict on every claim.

---

## 1. What was done

| Step | Scale | How it was checked |
|---|---|---|
| Read the handbooks | 27 handbooks, 3.18 M words, split into 65 sections | Each section was read in full, start to end, by its own reader. The readers covered 1,819 headings and recorded **2,769 items**: what the handbook prescribes and whether AIW appears to support it. |
| Map AIW's design process | 11 chapters plus Validate, Model, Output (SDD), Sol, knowledge, intake and projects | Built from the source, with path:line evidence. |
| Capability deep-dives | 13: component selection, technology selection, deployment architecture, library coverage, traceability, deliverables and views, a handbook worked example carried through AIW, quality method, data and integration, security, evolution and transition, enterprise alignment, operability and delivery | Many were run hands-on against AIW on scratch databases outside the repo (APIs, SDD exports, reference projects). A skeptic re-checked every gap; 16 of 195 did not hold as stated and are corrected or withdrawn. |
| Per-chapter verification | 13 units, large chapters split by handbook family | Every reader claim that AIW lacks something was searched for in the source. Each resulting gap then went to a second agent told to refute it. No gap was refuted outright, about a quarter were corrected as overstated, and skeptics added gaps the synthesis had missed. Shards were then merged. |

**Limits.**
- The readers judged AIW support from a digest, so their "absent" marks are hypotheses. Only gaps that survived source verification and the skeptic appear here.
- Sol (the LLM layer) was not exercised in the hands-on runs, because no provider was configured for them.
- Severities are the reviewers' judgement, not the owner's.
- The handbooks are kept outside the repository and are not committed. This report cites them as "Handbook › heading" only.

---

## 2. Direct answers

### Does AIW let the architect select the components that realise the architecture?
**Partly, and not the way the handbooks prescribe.**
- **What exists.**
  - Chapter 4 maps each responsibility to a component. Chapter 5 records the allocation with a role and a scope.
  - Chapter 5 has a "From the library" picker. It offers 20 catalogue archetypes and components saved from projects.
  - A pick becomes a candidate that a person must review, and its origin (release id and record hash) is kept.
  - Real compare-and-choose, with every option kept as a Chapter 3 alternative, exists only inside eight hard-coded design tasks: interaction, reads, persistence, delivery, resilience, distribution, partitioning and structure.
- **What is missing.**
  - The picker does not start from the responsibility and its drivers. It is a text search.
  - Cards show no fit to quality drivers, no hard-constraint check, no consequences, alternatives or evidence.
  - No component-selection decision with eligible and rejected candidates is recorded.
  - Adopting a pattern or library entry creates no fit record, obligations, parameters, guarantee boundary or tests (C5-01, C5-04 to C5-08, K-01 to K-03).
  - The SDD body does not print the selection basis.

  Deep-dive: component-selection.

### Does AIW have a component library comparable to the handbooks'?
**No.**
- The handbooks define about 308 component definitions:
  - Enterprise Component Library: 120 profiles in 15 families;
  - Software Design Component Dictionary: 100;
  - Application Architecture Master: 20;
  - Cloud Infrastructure Master: 36;
  - DevOps Master: 32.
- They also define about 38 styles, 92 patterns, 60 tactics, 60 anti-patterns, 20 composition recipes and 12 blueprints. Most entries carry:
  - forces and when to use / when not to;
  - boundary and owned state, and ports;
  - physical options and typed configuration attributes;
  - failure and repair, tests, metric contracts and evidence labels.
- None of this is imported.
- AIW's catalogue (AKR-0.10.73.5) has 328 records:
  - 318 of them hold generator template text;
  - its 20 archetypes are platform capabilities with templated, sometimes wrong, kits;
  - Chapter 5 can attach only the 19 SA Playbook styles and patterns;
  - Chapters 9 and 10 have no picker at all.
- AIW does have a sound governed path that an import could use: source, then candidate, then four-eyes review, then released, then a project pin. Its organisation library can already hold a reduced component profile.

Deep-dive: library-coverage; K-04, K-06, K-08.

### Does AIW let the architect select technology and products?
**Partly.**
- **What exists.**
  - Chapter 7 compares up to 12 options per realisation, against drivers, four fixed criteria, requirement groups and obligations.
  - Recording a selection is person-only.
- **What is missing.**
  - A governed product catalogue: the 14 products are a discovery list with no approval.
  - Licence, end-of-support, support-contract and exit data.
  - A check against enterprise standards.
  - A binding to a target platform.
  - A qualification state.
- **What is broken.** The approval is self-attested (section 3).

Deep-dive: technology-selection; C7-02, C7-04, C7-05.

### Does AIW let the architect design and select a deployment architecture?
**Only partly.**
- **What exists.**
  - Chapter 10 describes one deployment: environments, zones, one runtime plan per environment and part, placements and runtime paths.
  - About 30 deterministic checks run over it.
  - It simulates a zone or failure-domain loss, sizes survivor capacity at the review desk and derives availability budgets.
  - Saved design alternatives can hold Chapter 10 changes, and a person records which one is accepted.
- **What is missing.**
  - A reference-blueprint library. The Cloud Infrastructure Master alone has 12 deployment styles.
  - Gates before preferences.
  - Physical topology: account or landing zone, region, AZ, VPC, subnet, cluster, edge.
  - An environment chain with parity and promotion.
  - CI/CD and infrastructure as code.
  - A declared failure set with degraded modes.
  - Recovery designed as a timed procedure.
  - Shared-resource envelopes.
  - Flow matrices with denied flows.

Deep-dive: deployment-architecture; C10-01 to C10-19.

---

## 3. Fix first: defects that break AIW's own rules

These were reproduced on a running AIW, and the skeptic re-checked each one. They breach the doctrine that a person decides, someone else approves, and no evidence is invented. They should be fixed before any feature work.

| # | Defect | Where |
|---|---|---|
| D1 | A person can approve their own Chapter 7 technology choice, even with the project's four-eyes setting on. The approval stores no actor, and the SDD prints "External approval evidence recorded". | deep-dive technology-selection (critical) |
| D2 | A Chapter 7 selection can be recorded with no assessments, and pending hard gates do not block it. | technology-selection |
| D3 | The SDD prints a draft preference, and drivers nobody assessed, as a decided "Design basis … because QD-x". | technology-selection |
| D4 | A withdrawn archetype still saves as a Chapter 5 candidate. The organisation library offers draft entries that were never released. One person can author and approve a project-library entry. | library-coverage, component-selection; K-05 |
| D5 | The architect who accepts a residual security risk can also record its approval. | deep-dive security-architecture |
| D6 | A trace review can be recorded on a broken trail, and doing so clears the trace warning. | deep-dive traceability |
| D7 | Five trace algorithms give different answers for the same requirement, so the Model views, ARS and SDD disagree. | deep-dive traceability (critical) |
| D8 | The review-desk availability verdict counts zone records, not independent failure domains. It can read "holds" while Chapter 10 itself warns that everything sits in a single domain. | C10-21 |
| D9 | Chapter 5 and Chapter 8 can name different owners for the same data, with no finding. | deep-dive data-and-integration |
| D10 | The journey drafter creates one production environment per component, which raises Chapter 10 errors by construction. RTO and RPO marked open on a capability are silently dropped. | deployment-architecture, worked-example |
| D11 | Archetype proposals carry template text, and sometimes the wrong kit (a relational store proposes identity-token contracts), into the component and on into the SDD. | library-coverage, component-selection; K-06 |
| D12 | ArchiMate import turns a Gap into a Chapter 1 requirement, and misfiles a business Capability as a Chapter 6 technology capability. | evolution-and-transition, enterprise-alignment |
| D13 | One reviewer can treat a hard-constraint breach away as an "accepted limitation", and the limitation never expires. | C11-01, C11-02 |
| D14 | Recording assurance or Chapter 9/10 evidence changes the design fingerprint, so the approved baseline goes stale. | C11-04 |

---

## 4. Features to add to AIW

Each feature is drawn from what the handbooks prescribe. Together the features cover every high and medium verified gap. The 18 low-severity refinements not mapped here are listed in the chapter files. Each lists the verified gaps it closes; the gap ids are detailed in `CHAPTER-GAPS.md`, and "DD" names a deep-dive. Throughout, the doctrine holds:
- Sol and the rules only propose; a person selects and accepts.
- Candidate knowledge never scores.
- Governed knowledge needs a second person.

### Tier 1: Selecting what realises the architecture

**F1. Governed architecture library: the handbook catalogues as selectable knowledge.**
- **Record kinds.** Component profile, style, pattern, tactic, technique, anti-pattern, composition recipe, and reference architecture or deployment blueprint.
- **Entry template, from the handbooks:**
  - problem and forces; use when / avoid when; prerequisites;
  - quality effects (causal mechanism, observable measure, cost to other qualities);
  - guarantee boundary (claims, depends on, does not cover);
  - design parameters (unit, scope, basis, failure if wrong);
  - failure modes and repair; obligations and required companions; conformance and validation tests;
  - physical options; evidence level (illustrative, proposed, executed locally, production);
  - typed relations: requires, conflicts, alternative, realised-by, easily confused with.
- **Intake.** Handbook passage → candidate (never offered, never scored) → second-person review → release → project pin.
- **Upkeep.** An updated profile raises a reviewable migration proposal in each project that uses it. Released claims carry checked dates and review-by dates.
- **Closes:** K-01–K-04, K-06–K-09, K-11, K-12, K-19, K-22; DD library-coverage (all), component-selection (critical).

**F2. Component selection from responsibilities and drivers (Chapter 4 → 5).**
- Start from a responsibility, its drivers and its invariants, and shortlist released library components.
- Run the hard gates first: constraints, applicability, avoid-when.
- Show per-driver fit, consequences, obligations, alternatives and evidence level.
- The person chooses. AIW records a component-selection decision with the eligible and rejected candidates and the reasons.
- The component keeps its adopted profile and version.
- Obligations flow on as Chapter 8–11 verification actions.
- SDD section 4 prints the selection basis, the origin and the rejected options.
- **Also:** an application-deployable record, with an evidenced reason for each split.
- **Also:**
  - typed component ports;
  - a logical-to-physical responsibility map (authority, placement, runtime identity, owner);
  - authored component scenarios and failure walkthroughs;
  - design questions that close only on a record that fits;
  - an AI/ML and agentic component category with its obligations.
- **Closes:** C5-01, C5-03, C5-05, C5-09, C5-14, C5-16–C5-18, C5-20–C5-22, C4-02, X-22; DD component-selection (all).

**F3. Applying patterns and styles as governed bundles.**
- Lift the 19-entry limit. Any released pattern or style can be attached in Chapters 3, 5, 6, 8, 9 and 10.
- A style can be set per subsystem, as an explicit hybrid with crossing contracts.
- An adopted pattern expands into roles, components and interactions, with a check that its required roles are realised.
- It records its parameters, guarantee boundary and obligations.
- A composition check confirms that required companions are present and that combined mechanisms agree on their assumptions and parameters.
- Generalise today's eight code-authored design tasks into governed, releasable decision models and recipes.
- **Closes:** C5-04, C5-06, C5-07, C5-08, C5-13, C5-15, C6-07, C6-06, K-10, K-13, K-15–K-17, X-04, X-11, X-12, X-14; C3-01.

**F4. Technology and product selection with qualification (Chapter 6 → 7).**
- Derive the required behavioural capabilities into a capability matrix before products, and feed Chapter 8 contract semantics back into it.
- Apply eligibility gates before preference.
- Compare complete alternatives on whole-life cost per accepted outcome:
  - sourcing options: build, reuse, buy, managed or SaaS;
  - the current design and the simplest viable option are always in the set.
- Record each option's facts:
  - licence, end-of-support, support contract, vendor risk and exit feasibility;
  - provider quotas and regional availability.
- Track qualification state at the exact version, configuration and region: declared, then selected, then demonstrated, then observed.
- Record the operating-model responsibility split, and make a selection conditional on the organisation's operating capability.
- Check each choice against enterprise standards and the approved-product list.
- Put a technology decision record, with rejected options and reasons, in the SDD.
- **Also:** the option's acknowledgement and replication mode checked against recovery-point objectives. Patterns and quality mechanisms adopted in Chapters 3 and 5 become Chapter 7 qualification criteria.
- **Closes:** C7-01–C7-15, ch07-M1, ch07-M2, K-20; DD technology-selection (all).

**F5. Deployment architecture design and selection (Chapter 10, with 6 and 7).**
- Declare the failure set and the minimum service that must survive it, with degraded modes, first.
- Make location a gated decision (residency, required services, quotas, keys), and give every data copy (backups, logs, traces, keys) an approved location.
- Choose from released reference deployment blueprints (for example landing zone, single-region multi-AZ, regional active with qualified standby, cells, hub-and-spoke) as a reviewed proposal with a tailoring record.
- Model the topology:
  - accounts or landing zone, regions and AZs;
  - VPCs, subnets and the address plan;
  - clusters and edge.
- Keep a flow matrix that includes denied, infrastructure and lifecycle flows.
- Define an environment chain with a claim-based parity matrix; non-production holds no production authority.
- Record a common-cause inventory, and compute survivor capacity from the actual placements.
- **Also:**
  - provider and consumer contracts for shared platform capabilities;
  - external parties and enterprise services inside the dependency model;
  - typed capability parameters;
  - an egress inventory;
  - Chapter 6 design questions that a reference capability cannot silence.
- **Closes:** C10-01–C10-06, C6-01, C6-02, C6-05, C6-08–C6-10, C6-12–C6-14, C6-M2, K-18; DD deployment-architecture (topology, environment chain, platform library, network zones).

### Tier 2: Method depth the handbooks require

**F6. Decision records to the handbooks' template.**
- Diagnose before choosing.
- State options conditionally: select when, disqualifier, evidence needed.
- Treat feasibility as a non-compensable gate.
- Allow outcomes other than one chosen option: infeasible, deferred, bounded pilot, composed, transferred.
- Include whole-life cost, break-even and sensitivity.
- Record reversibility and points of no return.
- Add a refutable validation plan linked to a Chapter 11 check.
- Add observable review triggers and a switching condition for the credible alternative.
- **Closes:** C3-01–C3-07 and the rest of Chapter 3, X-07, X-24; DD worked-example (hard quality requirements, review triggers).

**F7. Quality scenarios and measurement contracts.**
- **Scenarios.** Six-part quality scenarios with source and artefact. A set of normal, peak, failure, recovery and change scenarios per driver.
- **Measurement contracts.** Population, numerator and denominator, window, clock anchors, how unknowns count, guardrails and a versioned definition.
- **Objectives.** SLO records with error budgets and burn-rate owners. Hard requirements kept separate from objectives, so a hard quality requirement rules an option out instead of being weighed.
- **Workload.** A recorded workload model. Journey-level composition into child budgets.
- **Closes:** C2-01–C2-12, C2-M1, C2-M2, X-15, X-16, X-17; DD quality-method (all), operability-and-delivery (SLI and error budget).

**F8. Authority, data and contract register (Chapter 8).**
- **Authority and data.**
  - Designate each data definition as authoritative, derived or externally observed. Derived copies get a source, a freshness bound, permitted uses, and inherited classification, residency and retention.
  - An effective-writer inventory with scoped write authority and fenced transfers.
  - Invariants with enforcement point, mechanism, writers and verification, held in the canonical graph.
  - Lifecycle guards, owners and deadlines.
  - A semantic contract beside the schema.
- **Outcomes and partners.**
  - A reconciliation design behind "manual reconciliation".
  - Qualification of the external-party guarantees the design relies on.
- **Horizons and budgets.**
  - Recognition, replay and retention horizons that must cover each other.
  - A version-coexistence matrix.
  - Fleet-wide dependency budgets.
  - The execution agreement made mandatory for posting and effect contracts.
- **Data and integration.**
  - Data movement mechanisms: CDC, ETL and streaming.
  - Orchestration versus choreography, and sagas.
- **Closes:** C8-01–C8-12 and the rest of Chapter 8; C5-02, C5-11, C5-12, C4-03, X-05; DD data-and-integration (all that hold).

**F9. Identity, access and protection coverage (Chapter 9).**
- **Coverage.** Judge coverage per access route, not per object: inventory every route to a protected effect or to sensitive data, including bypass paths.
- **Identity.**
  - The authorisation decision chain over time: issuer, decision point, enforcement point, re-check moment, revocation window.
  - Identity classes and a least-privilege matrix per component.
- **Secrets.** A lifecycle register for secrets, keys and certificates.
- **Isolation.** The tenancy and isolation model.
- **Controls.** A control picker from released security tactics and patterns, giving each control its role (prevent, detect, respond, recover).
- **Obligations.** An obligation applicability register mapped to controls and evidence.
- The yardstick is the handbooks' six-step threat method. The handbooks do not ask for STRIDE or likelihood × impact scoring.
- **Also:** message-origin authenticity, freshness and replay horizons at integration boundaries; a safe-change design for security and network policy (dry-run, staged rollout, independent recovery channel).
- **Closes:** C9-01–C9-14, C9-M1, C9-M2; DD security-architecture (all).

**F10. Capacity and recovery engineering (Chapter 10).**
- A workload model and a limiting-resource analysis.
- Shared-resource envelopes across all deployables, including surge, draining, jobs and rollout overlap.
- Burst and outage backlog, drain time and retention against quotas.
- Recovery objectives per failure scope, as a timed stage graph ending at a business endpoint.
- Exercise evidence of matching scope.
- Data-loss claims tied to a replication or acknowledgement mechanism.
- Write authority and fencing.
- A recovery-set manifest.
- Gated reopening after recovery.
- **Also:**
  - a failure-mode register per component, contract, mechanism and plan, covering slow, stale, duplicated and partial modes as well as outage;
  - degraded behaviour declared per business operation;
  - surviving and maintenance-plus-failure capacity;
  - continuity claims reconciled with the Chapter 7 option and the Chapter 10 placements.
- **Closes:** C10-06–C10-16 and the rest of Chapter 10, X-13, C5-10, C6-03, C6-04, C6-M1, C6-M3.

**F17. Requirements as service promises, journeys and exception paths (Chapter 1).**
- **Before mechanisms are chosen.** Record a customer operation contract (the service promise).
- **Journeys as records.**
  - A promised outcome, a terminal-state set and a closure predicate.
  - An explicit unknown outcome.
  - Step contracts: entry condition, permitted actions, durable effect, recovery path.
- **Exception and recovery paths.** Designed explicitly, with exception classes.
- **Requirement records carry:**
  - the consequence if violated, and the protected invariant and its authority;
  - rationale, status and a revisit trigger.
- **Constraints.** A register with predicate, scope, change authority and harm prevented.
- **Business rules.** Versioned, as decision tables with hit policy and unknown-input handling.
- **Context and stakeholders.**
  - A stakeholder map of accountability: decides, approves, supplies evidence.
  - A record of what the team controls, influences or only observes.
  - A context-scoped vocabulary.
- **Brownfield.** A behaviour baseline and a dependency register.
- **Closes:** C1-01–C1-19, C1-M1; DD quality-method (functional requirements drafted as quality scenarios), enterprise-alignment (decision rights).

**F18. Logical decomposition and boundary design (Chapter 4).**
- **Domain records.**
  - Bounded contexts and a context map: relationship patterns, translation ownership, per-context term meaning.
  - Subdomain classification (core, supporting, generic) to set modelling depth and sourcing.
- **Choosing boundaries.**
  - Derive boundaries from shared rules, invariants, change reasons and authority.
  - Compare candidate partitions, and validate the chosen one with change, partial-failure and ownership-transfer scenarios.
  - Bring trust and privilege boundaries into the decomposition.
- **Rules and coupling.**
  - Allowed and forbidden dependency rules, with architecture-test obligations.
  - Coupling evidence.
- **Ownership and coordination.**
  - Owners with team and decision rights.
  - Human tasks as architecture.
  - A coordination decision per journey.
- **Knowledge and output.**
  - Governed domain-design patterns and reference decompositions.
  - The logical decomposition documented in the SDD.
- **Closes:** C4-01, C4-04–C4-15, ch04-M1, ch04-M2, C5-19.

### Tier 3: Delivery, assurance and evolution

**F11. Release and operations design.**
- A release manifest: artifact digest, configuration, policy, schema.
- Typed release-strategy selection.
- Progressive exposure with predeclared promote, hold and stop rules on business outcomes.
- Rollback eligibility with a point of no return and mixed-version coexistence.
- CI/CD and infrastructure as code as design records.
- Observability design: signals, correlation identifiers, alerts with owners.
- Structured runbooks.
- **Closes:** C10-17–C10-19; DD operability-and-delivery, deployment-architecture (CI/CD, IaC).

**F12. Operational acceptance and handover.**
- An acceptance decision kept separate from technical readiness, with a HOLD disposition.
- An operational acceptance and handover pack.
- A residual-obligation ledger that the receiving owner accepts.
- Target-platform qualification.
- Acceptance is always recorded by a person.
- **Closes:** C11-03, C11-11; DD deliverables-and-views, operability-and-delivery.

**F13. Evidence, conformance and fitness functions.**
- An evidence ladder on every claim: model, local, integration, exercise, production.
- Falsifiable experiments with negative controls.
- Evidence expiry and re-run triggers.
- PASS / FAIL / UNKNOWN conformance rules per selected building block.
- Design-to-runtime drift checks.
- Anti-pattern detection driven by released anti-pattern records, with diagnosis and repair route.
- Waivers carrying authority, scope, compensating controls and expiry.
- **Closes:** C11-01, C11-02, C11-05–C11-07, C11-12, K-14, K-24, X-01–X-03, X-06, X-08, X-10, X-19, X-20, X-23, X-25; DD enterprise-alignment (waiver, conformance), quality-method (fitness functions), evolution-and-transition (fitness and drift).

**F14. Transition and migration architecture.**
- Current-state capture with a register of recovered claims.
- Plateaus with entry and exit gates, invariants and authority.
- Cross-plateau dependency checks.
- Migration patterns: strangler with an authority ledger and cohort fencing; parallel run with a comparison contract.
- A cutover critical path with the last reversible point.
- Decommissioning readiness.
- A technical-debt register, and temporary components with an expiry.
- An editor for migration records.
- **Closes:** C11-08–C11-10 and the transition gaps in Chapter 11; DD evolution-and-transition (all).

**F15. Enterprise alignment.**
- A business capability map, and the misfiling on import fixed.
- Organisation units and decision rights.
- Principles turned into rules and observable evidence.
- Adopted enterprise standards and reference architectures applied with conformance and tailoring readings.
- **Closes:** K-23, X-18, X-21; DD enterprise-alignment.

**F16. The full deliverable set and the traceability chain.**
- **SDD body sections:** security (threat model, treatments), data, operations, and transition.
- **Registers:** a RAID register, a glossary, and a stakeholder concern-to-view mapping.
- **Traceability.** One typed trace algorithm, so every view agrees. The requirement → driver → decision → component → product → contract → control → placement → evidence chain printed in the SDD.
- **Handoff.** An implementation specification index for engineering.
- **Closes:** C6-11, C7-10, K-21, X-09, X-26, X-27, X-30, X-34; DD deliverables-and-views, traceability.

---

## 5. Suggested order

1. **rc.10.73.x+1: integrity.** D1–D14. Mostly S/M effort and touches existing paths only.
2. **Library foundation.** The F1 record kinds and intake. Import a first slice: Application Architecture Master (styles, patterns, tactics, anti-patterns, components) and Enterprise Component Library Part 1. Every entry stays a candidate until a second person releases it.
3. **Selection paths.** F2 (Ch5 component selection), then F3 (patterns as bundles), then F4 (Ch7 qualification). These reuse the eight design tasks' existing machinery: applicability predicates, Ch3 alternatives, obligations into Ch11.
4. **Deployment.** F5 topology and blueprints, then F10 capacity and recovery.
5. **Method depth.** F6–F10, F17 and F18, in parallel tracks per chapter.
6. **Delivery and assurance.** F11–F16.

What this order depends on from outside:
- **Licence and use of the handbook content.** Whether the content may be imported is for the owner, or their counsel, to confirm.
- **Releasing library entries.** This needs a second authorised person. AIW, Sol and this review cannot release them.
- **Production acceptance.** Nothing here establishes it.

---

## 6. Chapter by chapter (summary)

Across the 13 units: **353 verified gaps** (85 high, 216 medium, 52 low), plus the deep-dive gaps in CAPABILITY-DEEP-DIVES.md.

### Chapter 1 · Requirements

**20 verified gaps** (3 high, 15 medium, 2 low) · 8 reader claims shown to be already supported · 8 strengths noted. Detail: [chapter-gaps/01-requirements.md](chapter-gaps/01-requirements.md)

Chapter 1 has the right shape: a brief, then context, journey and requirements. Rules check testability, every requirement must link to an outcome and to a journey step, provenance and open questions are handled with discipline, the BPMN process gets structural checks, and relationships are typed against ArchiMate 3.1. The handbooks, though, treat this stage as the place where the business contract is fixed as data before any mechanism is chosen. That contract covers customer-operation promises with success boundaries and recovery obligations, journey terminal outcomes with closure predicates and an explicit unknown state, designed exception paths, and constraint predicates with a change authority and the harm they prevent. It also covers decision tables with hit policy and unknown-input semantics, versioned outcome definitions, and typed accountability. AIW keeps most of this as free text, or pushes it down to Chapter 8 execution agreements, which are per contract and arrive late. Validate checks wording and linkage. It does not check whether the business logic is complete: overlapping rules, unknown input becoming approval, stuck states, and exclusive splits that meet parallel joins all pass. The Chapter 1 outputs are the criteria that Chapters 3, 6 and 7 later select against, so these weaknesses carry into selection. A constraint's hardness is inferred from its priority, quality needs have to borrow functional requirements, and outcomes cannot be computed. For brownfield work there is no observed-behaviour baseline to diagnose against. Sol stays advisory: it never fills owners, sources, evidence or measure fields, which matches the handbooks' evidence discipline.

Most consequential:

- **C1-01** (high, L) No customer operation (service promise) contract recorded before mechanisms are chosen
- **C1-02** (high, L) Journeys have no record of their own: no promised outcome, terminal-state set, closure predicate or explicit unknown outcome
- **C1-03** (high, L) Exception and recovery paths are not designed: no exception-class record, and Chapter 4 traces failure scenarios only for the reference project
- **C1-04** (medium, M) Requirement record lacks consequence if violated, protected invariant and its authority, challenge method, rationale, status and revisit trigger
- **C1-05** (medium, M) Constraint register is shallow: no predicate, scope, change authority, harm prevented or class, and hardness is inferred from priority
- **C1-06** (medium, L) Business rules hold one value: no decision table with input domains, hit policy, no-hit or default semantics, unknown-input handling, or overlap and gap checks

### Chapter 2 · Architectural drivers

**18 verified gaps** (13 medium, 5 low) · 12 reader claims shown to be already supported · 10 strengths noted. Detail: [chapter-gaps/02-drivers.md](chapter-gaps/02-drivers.md)

Chapter 2 covers the first half of the quality-attribute method the handbooks prescribe, and covers it well. It has one register of drivers by kind with stable codes. A structured scenario and target must pass a measurability check before a person can confirm it. Source fingerprints reopen drivers, and driver changes reopen conflicts. The utility tree is built from the SA Playbook and shows uncovered attributes as holes, and a What-if carries a target change through to plans, capabilities, products and decisions. All of this is deterministic, and Sol is barred from measure fields. The handbooks then expect each priority scenario to become a falsifiable contract and a design obligation: a set of normal, peak, failure, recovery and change scenarios; a measurement contract with population, statistic, clock anchors, guardrails and versioned definitions; a recorded workload model; journey promises decomposed into child budgets that compose; and, for each priority driver, a recorded causal mechanism and evidence plan. AIW keeps most of this as free text inside one scenario and one target. Where it reasons further (desk capacity, budgets, design questions, monitoring drafts), it infers its inputs from target wording rather than reading recorded facts, and it checks each part against the whole availability budget instead of composing the journey. Its driver-to-carrier test counts only Ch6/7/10 records that carry a figure. As a result, correctness, security and traceability drivers read as uncarried even when Chapter 5 and 8 mechanisms deliver them. About 35 of the 98 reader items restate the measurement-contract and SLO gaps the deep-dives already hold (quality-method, operability-and-delivery). This shard adds handbook support to those gaps through dependsOn and isolates what the dives missed.

Most consequential:

- **C2-01** (medium, M) No mechanism claim or evidence plan per driver, and the ARS 'carried' test cannot see how correctness, security and traceability drivers are met
- **C2-02** (medium, M) One scenario per driver and no environment class: no normal/peak/failure/recovery/change scenario set and no check for adverse cases
- **C2-03** (medium, L) No recorded workload model: demand classes, intent versus attempt, burst profile and skew are inferred from target text
- **C2-04** (medium, L) No journey-level composition: each part is checked against the whole availability budget, and drivers cannot be broken into child budgets
- **C2-05** (medium, M) No guardrail or coverage measure can be paired with a primary target
- **C2-06** (medium, M) No clock anchors or separate clocks: start, stop and pause events, and acceptance versus completion versus finality, cannot be stated

### Chapter 3 · Decisions

**24 verified gaps** (6 high, 14 medium, 4 low) · 14 reader claims shown to be already supported · 8 strengths noted. Detail: [chapter-gaps/03-decisions.md](chapter-gaps/03-decisions.md)

AIW's Chapter 3 already follows much of the handbooks' decision discipline. It requires at least two fully described alternatives and needs a per-driver effect with reason and evidence for the working choice before acceptance. Its deterministic reading rules out hard-constraint breaks before any weighing, reports dominance and firmness, and never chooses. Architect acceptance, external governance evidence and Sol or rule proposals stay strictly separate. The gaps are in the shape of the record around that comparison. The handbooks' templates start with diagnosis (symptoms, competing explanations, distinguishing evidence). They state each option conditionally (select when, disqualifier, evidence needed) and treat feasibility as a separate three-state gate over mandatory conditions scoped to the decision. They close with a validation plan, reversibility and commitment points, unresolved obligations, a switching condition for the credible alternative and observable review triggers. AIW holds most of these as free text or not at all. An AIW decision must also end in exactly one chosen alternative, so infeasibility, deferral, bounded pilots and composed outcomes cannot be recorded. Each alternative's impact is limited to Chapter 4 responsibilities and existing components, so infrastructure decisions and cross-layer compositions cannot be decided cleanly in Chapter 3. AIW already has the right mechanisms in narrower places: typed applicability checks in guided comparisons, governed architecture units with requires/excludes and obligations, typed Chapter 11 verification actions, Workbench cost comparisons and next-review warnings. Most gaps can therefore be closed by extending these existing paths rather than adding parallel authority paths.

Most consequential:

- **C3-01** (high, M) Alternatives have no select-when, disqualifier, prerequisite or evidence-needed conditions; catalogue fit criteria never reach the decision
- **C3-02** (high, M) A decision must end in one chosen alternative: no infeasible, deferred, pilot, reject-all, composed or transferred outcome, and no scoped selection
- **C3-03** (high, M) No validation plan on a decision: no refutable hypothesis, acceptance oracle, stop condition, linked check or observed outcome
- **C3-05** (high, M) No diagnosis before choice: no symptoms, competing explanations, distinguishing evidence, evidence class or corrected premises
- **C3-06** (high, M) No 'becomes preferable when' condition for the credible alternative, no reopen-if or disposition per alternative, and no required baseline option
- **C3-07** (high, M) No reversibility, last responsible moment, points of no return or staged-commitment gates on decisions

### Chapter 4 · Logical application

**18 verified gaps** (3 high, 14 medium, 1 low) · 10 reader claims shown to be already supported · 8 strengths noted. Detail: [chapter-gaps/04-logical-application.md](chapter-gaps/04-logical-application.md)

AIW's Chapter 4 does the first half of the handbooks' logical-application method well. Every requirement must reach an authored responsibility. A responsibility can be confirmed only once it states its purpose, its boundary (written as exclusions), its owner and its source. Every journey step must be served, links are fingerprinted, and candidate allocations to components carry a role, a scope and evidence. The handbooks, however, treat this chapter as the place where boundaries are designed and justified: bounded contexts and the relations between them, consistency boundaries tested against invariants, candidate partitions compared by change coupling and validated with change, failure and ownership-transfer scenarios, and owners with decision rights. AIW holds none of these as first-class records. Responsibilities are drafted one per requirement or per requirement group, and grouped under a title and purpose only, so the decomposition has no recorded basis; the stage named 'Set ownership boundaries' does not even store an owner on the group. Some building blocks exist elsewhere: the structure and persistence design tasks block distributed atomicity, Model Alternatives compare group reassignments by finding delta, Chapter 3 alternatives can propose responsibility relationships, Chapter 8 records invariants and outcome authorities, and Chapter 5 has an advisory cycle detector. None of them is wired to Chapter 4 boundaries or checked there. Governed knowledge is effectively absent: the catalogue holds the domain-design patterns, but no Chapter 4 picker, library kind or reader uses them. The SDD prints group purposes and responsibility refs, not boundaries, owners, connections or rationale. The doctrine fits well (drafts are proposals, Sol never fills owners or approves, knowledge never scores), so every recommendation below can follow AIW's existing pattern: person-stated records, deterministic checks, and Sol proposals that a person accepts.

Most consequential:

- **C4-01** (high, L) No bounded-context or context-map record: semantic boundaries, relationship patterns and translation ownership cannot be recorded
- **C4-02** (high, L) Boundaries are not derived from shared rules, change reasons and authority, nor chosen among candidate partitions
- **C4-03** (high, M) An invariant split across components, groups or contexts is never detected, and Chapter 4 has no consistency boundary
- **C4-04** (medium, M) The 'Set ownership boundaries' stage records no owner: groups have none, and owners are free text with no team, decision rights or role-specific accountability
- **C4-05** (medium, M) Boundary validation stops at a journey walk: no change, partial-failure or ownership-transfer scenario is recorded against groups
- **C4-06** (medium, M) Domain policy can be allocated to an adapter, gateway or integration platform with no finding, and components declare no forbidden responsibilities

### Chapter 5 · Application realization (components)

**28 verified gaps** (8 high, 14 medium, 6 low) · 23 reader claims shown to be already supported · 10 strengths noted. Detail: [chapter-gaps/05-application-realization.md](chapter-gaps/05-application-realization.md)

Chapter 5 covers the logical half of the handbooks' method well. It allocates responsibilities with a role and scope, records owners, boundaries and owned data, requires a failure policy on every flow interaction, and flags unmapped, orphan and doubly-owned elements. It also assembles a ten-section component specification from Chapters 2-10, with each field marked recorded, inferred or open. The handbooks treat every adopted mechanism as a governed bundle. That bundle holds fit criteria tested against the case, quality effects with measures and costs, scoped parameters with a basis and the failure if set wrong, a bounded guarantee with dependencies and exclusions, owned roles and obligations, failure modes with detection, and conformance tests. AIW builds that bundle in miniature, deterministically and as proposals only, inside the guided design tasks for eight topics (publication, resilience, traffic, partitioning, structure, interaction, reads, persistence) and released concerns. There, applicability predicates return known, unknown or blocked; every option becomes a Chapter 3 alternative with benefit, cost and counterfactual; roles expand into components and interactions; and obligations carry verification into Chapter 11. None of this is reachable from the ordinary component path. A pattern attached through Playbook patternIds, Chapter 3 free text, a library entry or an archetype creates no fit record, obligations, parameters, role check, guarantee boundary or tests. The 328 catalogue records that could feed these are templated text in 318 cases. Two structural objects the handbooks rely on are also missing as records. The first is the application deployable, which packages components with an evidenced split reason. The second is the atomic write set, with its concurrency protocol and writer inventory, which binds invariants to components. So nothing catches a service separated without reason or a split that crosses an invariant. Cross-mechanism composition is checked for only one Chapter 8 rule family. Failure behaviour is scattered across interactions, contracts, controls and plans, with no per-component register, no authored walkthrough and no discipline for derived copies. The governance posture matches the handbooks: library content never scores, Sol only explains or drafts and its guarantee wording is filtered, and a person accepts every proposal. The recommendations therefore lift task answers into durable Chapter 5 records (applied pattern, deployable, atomic set, composition) on the existing paths: component and property rows, Chapter 8 invariants and contracts, and the Chapter 11 obligation and verification chain. Validate checks these records and the SDD prints them, and no parallel authority is added.

Most consequential:

- **C5-01** (high, L) Adopting a pattern, style or library entry records no fit assessment outside the fixed design tasks: conditions held, contraindications, prerequisites, evidence needed, variant and simpler alternative
- **C5-02** (high, L) Atomic write sets, concurrency control and writer inventories are not recorded per invariant or bound to components, and nothing checks a split that crosses an invariant
- **C5-03** (high, L) No application deployable: components are not packaged into deployables and process roles with an evidenced split reason, success test, operating surface and revisit trigger, and distributed monoliths go undetected
- **C5-04** (high, L) No guarantee boundary for a component's properties or adopted mechanisms: bounded claim, depends-on links and does-not-cover exclusions are neither recorded nor checked
- **C5-05** (high, M) Outside the eight design-task topics, adopting a pattern or style creates no owned obligations and no companion obligations
- **C5-06** (high, L) A component cannot record the role it plays in a pattern, and no check confirms that a claimed pattern's required roles and participants are realised and owned

### Chapter 6 · Logical technology

**18 verified gaps** (5 high, 12 medium, 1 low) · 6 reader claims shown to be already supported · 9 strengths noted. Detail: [chapter-gaps/06-logical-technology.md](chapter-gaps/06-logical-technology.md)

Chapter 6 covers the first half of the method these handbooks prescribe. Every component need must map to a vendor-neutral capability. Each capability states its purpose, the boundary between platform and application, its owner, rationale, trust boundary and failure domain. Continuity is declared and checked as fail-closed (bypass, redundant, single), stateful categories need recovery and backup links, and a four-step failure lab propagates loss along critical dependencies. Where a capability comes from one of the rule-based design tasks (interaction, publication, resilience, traffic/edge, partitioning, structure, persistence, reads), it is derived from a recorded Chapter 3 decision with alternatives and applicability gates. The method the handbooks centre on, a failure model rather than a list of components, is only partly supported. Failure domains are free-text strings matched by string comparison, there is one fault per simulation and outage is binary. There is no serving/control/recovery plane distinction, no failure-mode worksheet, no named degraded modes per business operation and no availability composition, and external providers stay outside the dependency graph. Selecting a capability is mostly a pick from 15 closed categories filled from templates. There is no selection path with fit criteria and alternatives for most capability types, and no library or reference-architecture route into Chapter 6. Shared platform capabilities have no provider/consumer contract. Chapter 6's engineering content (dependencies, failure domains, continuity, trust boundaries) reaches the SDD only as annex registers and one figure.

Most consequential:

- **C6-01** (high, L) Failure domains are free-text strings: no shared-cause register, nominated fault set, correlated loss or independence evidence
- **C6-02** (high, L) No serving/control/recovery plane distinction, autonomy horizon, static-stability or recovery-path independence check
- **C6-05** (high, M) Alternate and bypass paths are not qualified: no AND/OR dependency semantics, validity conditions, fallback eligibility, outage-scale capacity, exercise recency or return to primary
- **C6-07** (high, L) Choosing a capability type has no selection path: no fit criteria, alternatives or 'avoid when' outside eight design-task topics
- **C6-08** (high, M) No availability objective per capability and no composition along critical dependency chains (serial dependencies, common cause)
- **C6-03** (medium, M) No failure-mode analysis beyond binary outage: no slow, stale, duplicated or partial modes, no detection, containment or residual obligations

### Chapter 7 · Technology realization (products)

**17 verified gaps** (3 high, 14 medium) · 12 reader claims shown to be already supported · 9 strengths noted. Detail: [chapter-gaps/07-technology-realization.md](chapter-gaps/07-technology-realization.md)

Chapter 7 follows the handbooks' basic order. A vendor-neutral Chapter 6 capability is realised by comparing at least two concrete options (product, version, tier, vendor, operating model, typed configuration facts). The comparison runs against inherited drivers, four fixed criteria, requirement groups and accepted design-task obligations. An option that breaks a hard constraint is excluded, only a person can record the selection, the selection goes stale when its inputs change, and approval evidence is kept separate. Product mechanisms count only when a version and matching configuration facts are recorded. Assessments go stale when the option's version or configuration changes. Both rules match the handbooks' insistence that behaviour is qualified for the selected configuration, not the product label. What is missing is most of what the handbooks put around each option:
- an explicit boundary of what the product does not guarantee, turned into a residual obligation elsewhere;
- a capability matrix derived from Chapter 8 contracts and adopted patterns, with selected values checked against required values;
- sourcing shapes (build, reuse, buy, managed, SaaS) with a fit assessment;
- the organisation's demonstrated operating capability as a criterion and as a condition on the selection;
- a per-option cost model built from cost drivers, with cost per useful outcome and switching points.
Option facts are author-entered and undated. Options have no region, quota or service-contract terms, no pre-selection experiment record and no exit feasibility test. The SDD body prints only capability → product with a selection label, so the comparison, the rejected options and the conditions appear only in the register annex. The deep dives already cover self-approval, recording without assessments or gates, licence and lifecycle data, standards conformance, target binding, qualification state, shared responsibility and review triggers. The gaps below add the remaining method steps.

Most consequential:

- **C7-02** (high, L) Required behavioural capabilities are not derived into a capability matrix, and Chapter 8 contract semantics never feed back into the Chapter 7 selection
- **C7-04** (high, M) The organisation's operating capability is not recorded or assessed, and a selection cannot be made conditional on it
- **C7-05** (high, L) No option-level cost model built from drivers, comparable on cost per accepted outcome
- **C7-01** (medium, M) Product guarantee boundaries are not recorded per option or carried forward as residual design obligations
- **C7-03** (medium, M) No build / reuse / buy / managed / SaaS sourcing shape and no fit assessment of starting points
- **C7-06** (medium, M) No sensitivity or switching-point analysis on uncertain cost, demand and effort inputs

### Chapter 8 · Interfaces & data

**44 verified gaps** (12 high, 24 medium, 8 low) · 56 reader claims shown to be already supported · 30 strengths noted. Detail: [chapter-gaps/08-interfaces-data.md](chapter-gaps/08-interfaces-data.md)

For a single contract, Chapter 8 is AIW's closest match to the handbooks. The rule-checked execution agreement combines delivery, publication, repetition, effect-level repeat protection, a timeout kept 'unresolved', owned outcome discovery, one retry owner, the caller envelope and nested attempt exposure, all without an LLM and from inspected sources. The rule-based design tasks (Interaction, Publication, Reads, Persistence, Resilience, Distribution, Partitioning) compare mechanisms and write every option as a Chapter 3 alternative with estimates and pending verification obligations. The doctrine holds throughout: values are stated by a person, open questions stay open, and Sol only proposes. The handbooks go further. They treat each boundary as several connected contracts (authority, meaning, identity, state, time and failure), each recorded as a structured artefact and checked against the others. AIW holds most of this as prose that is checked only for presence, or as design-task answers that leave no structured field for Validate, Model or the SDD to read. Several things are missing outright: a data role and writer inventory, invariant enforcement points, lifecycle guards and owners, a reconciliation design behind 'manual-reconciliation', a semantic field contract, an identity register, a partner guarantee ledger and a version-coexistence record. The cross-record checks that make a design defensible are also absent: retention and recognition horizons against retry, replay and recovery windows; a derived copy's classification against its source; invariant guards against every writer; failover and restore against unresolved outcomes; fleet retry exposure and admission limits against dependency ceilings. Contract timeoutMs and the execution caller budget also remain two unreconciled timing authorities, and the execution agreement itself is optional. Data-side selection is thin and the chapter order works against the method. Store choice weighs only relational records against an aggregate document, no workload profile is recorded, and Chapter 8 guarantees never reach Chapter 7 as fit criteria, even though Chapter 7 configuration facts already name them. Most remedies fit the existing structure as typed fields, rule findings, governed knowledge concerns and SDD tables. Many neighbouring items (sagas, ordering, dead letters, consumer register, operating terms, privacy, residency, master data) are already covered by the deep-dives and are cited as dependencies.

Most consequential:

- **C8-01** (high, L) Derived copies are not designated: no data role, source, freshness bound, permitted use or inherited obligations
- **C8-02** (high, L) No effective-writer inventory or scoped write authority: non-modelled writers, partitioned or multi-writer scope and authority transfer cannot be recorded
- **C8-03** (high, L) Invariants name no enforcement point, mechanism, scope, writers or verification, and sit outside the canonical graph
- **C8-04** (high, M) No semantic contract beside the schema: units, scale, time basis, absence and unknown-value rules, key scope, meaning version, history and correction policy
- **C8-05** (high, L) Lifecycle states and transitions carry no meaning, category, owner, guard, evidence, authority or deadline, and nothing checks progress or terminality
- **C8-06** (high, S) The execution agreement is optional, so posting and effect contracts pass Validate with only a key name and policy prose

### Chapter 9 · Security

**16 verified gaps** (3 high, 12 medium, 1 low) · 13 reader claims shown to be already supported · 8 strengths noted. Detail: [chapter-gaps/09-security.md](chapter-gaps/09-security.md)

Chapter 9 follows the handbooks' core chain well. Each threat targets real design objects, a control is justified by a threat, evidence is stamped and goes stale when the control changes, a risk treatment is kept separate from governance, and Chapter 10 binds every control to a runtime plan. The handbooks also prescribe the analysis that turns this chain into a defensible security design, and that analysis is missing. They inventory every route to a protected effect and check that each route is covered. They follow an authorisation decision through time (issuer, decision point, enforcement point, re-check moment, cache and revocation window). They state the tenancy and isolation model, give each control a role (prevent, detect, respond or recover) and layer, and analyse common cause and escalation paths. They also derive security obligations from every pattern, mechanism, product and topology chosen elsewhere. AIW records most of these points as prose (control enforcement and mechanism, contract authorization, path access, Chapter 7 accessPlan). Its checks treat coverage as one control per affected object, so a detective control, or a control on the data with an unprotected export route, clears a threat. Many reader items repeat gaps that the deep-dives already cover, so they are cited as dependencies here, not repeated: the identity and access model, secret and key lifecycle, the obligation register, evidence class and negative tests, privacy and purpose, the control catalogue and picker, and the SDD security section. The new gaps below are the analytic method steps the dives did not name. A few reader items are not raised as separate gaps because a dive already covers them or they are niche: differential-privacy accounting, attestation selection, purpose-limited partner evidence sharing, typed configuration layers, and TLS termination per segment.

Most consequential:

- **C9-01** (high, L) Protection coverage is judged per object, not per access route: no inventory of routes to a protected effect or sensitive data, and no check that each route crosses an enforcing control
- **C9-02** (high, L) No authorisation decision chain or timing per protected operation: issuer and audience, decision and enforcement points, when authority is re-checked, decision caching, revocation window, policy-outage behaviour
- **C9-03** (high, L) The designed system's tenancy and isolation model cannot be stated or checked
- **C9-04** (medium, M) Controls have no preventive, detective or corrective role, so coverage counts detection as prevention and a threat has no prevent/detect/respond/recover structure
- **C9-05** (medium, L) Security obligations of the patterns, mechanisms, products and topologies chosen in other chapters do not reach Chapter 9, and controls carry no 'does not replace' complements
- **C9-06** (medium, M) Dual control and delegated authority are pairs of role names: no person-level separation, conflict scope, version-bound approval, delegation limits or compensating oversight

### Chapter 10 · Deployment / runtime

**46 verified gaps** (19 high, 21 medium, 6 low) · 58 reader claims shown to be already supported · 31 strengths noted. Detail: [chapter-gaps/10-deployment-runtime.md](chapter-gaps/10-deployment-runtime.md)

The delivery, infra, appdesign/intdata and method handbooks treat deployment and runtime architecture as a chain of decisions that must each be qualified. The architect declares the failure set and the minimum service that must survive it, chooses location and topology through gates, and sizes from a workload model and shared-dependency envelopes. Recovery is designed as a timed, gated procedure that ends at a business endpoint. Release and rollback mechanisms are chosen by their prerequisites and reversal scope, and operation is accepted only on evidence of matching scope. AIW's Chapter 10 describes one deployment well as structure: environments, zones with free-text failure domains, one runtime plan per environment and asset, placements and contract-bound paths, checked by about 30 deterministic rules plus zone and failure-domain walkthroughs. Its doctrine holds throughout: recovery figures are labelled assumed, walkthroughs are marked simulated, design review is kept apart from exercise evidence, evidence goes stale on change, selection and acceptance are person-only, and Sol only drafts. But the decisive content is mostly prose checked only for presence (fencing, backupPlan, readiness, rollout, rollback, recoveryPlan, monitoring, runbook). Its numbers are single assumed values per plan. They are never added up across plans, never tied to a replication or acknowledgement mechanism, and never compared with the recorded per-zone placements. Much of the handbooks' arithmetic does exist (zone-loss sizing, connections against maxConnections, single-unit ceilings, backlog drain, restore-time budget, nested retry exposure), but it lives in Chapter 3 design tasks, the Chapter 8 execution reading and the Chapter 11 desk, runs on global or hand-typed inputs, and is not bound to Chapter 10 plans or targets. So the gaps are mostly about binding and typed records, not missing calculators: failure set and degraded modes, common-cause and survivor readings, resource envelopes, recovery objectives and stage graphs, recovery sets, write authority, reopening gates, evidence of matching scope, and typed release, rollback and exposure records. One concrete defect was found independently by three shards: the desk and ARS availability reading counts zone records, not independent failure domains, so it can read 'holds' while Chapter 10 itself warns of a single domain. Every fix is a new record, a deterministic reading or a Validate check; none changes the authority chain.

Most consequential:

- **C10-01** (high, L) No declared failure set, continuity claim or degraded-mode contract drives the deployment design
- **C10-02** (high, L) Location is not a gated decision, and not every data plane or copy (backups, logs, traces, keys) has an approved location
- **C10-03** (high, L) Flows exist only as permitted Chapter 8 contract paths: no infrastructure or lifecycle flows, no deny invariants between environments and no layer-by-layer qualification
- **C10-04** (high, L) No account or landing-zone boundary with readiness states, and no address plan (IPAM ledger, non-overlap, subnet contracts, address capacity)
- **C10-05** (high, L) No common-cause inventory or cut-set analysis: shared dependencies across placements, zones and environments are not recorded, intersected or walked
- **C10-06** (high, M) Survivor capacity is not computed from recorded placements, qualified per-replica capacity and retry amplification for each zone loss

### Chapter 11 · Review & realize

**45 verified gaps** (12 high, 27 medium, 6 low) · 28 reader claims shown to be already supported · 11 strengths noted. Detail: [chapter-gaps/11-review-realize.md](chapter-gaps/11-review-realize.md)

Across the three handbook families, Chapter 11 is the stage where the architect tries to break the design, turns it into a qualified and operated service, and later retires it. AIW follows this stance closely on honesty and authority. Rules raise findings, and a person must treat each one with evidence. Typed checks are bound to an accepted obligation, the exact objects, an environment, a release and a source revision. They read fail before unknown before pass, and they go stale when their basis changes. Review, approval and handoff are person-only commands, approval needs a second signed-in person, and every output disclaims production readiness. The weaknesses fall in four places. In governance, one reviewer can treat a hard-constraint breach away as an accepted limitation; limitations and approval conditions are untracked free text that never expires; verification has no separation of duties; a failing check blocks nothing; and recording evidence even makes the approved baseline stale. In the assurance argument, AIW has no claim register, evidence ladder, verification-case record with an oracle and a negative control, conformance population or reviewer-raised finding, and patterns adopted outside design tasks bring no validation scenarios. In transition and after delivery, plateaus record only which design objects exist, while the handbooks model how authority, cohorts, contract versions, reconciliation, reversal options, rehearsals, residual obligations, retirement, incidents and realised benefits move and feed back into decisions; AIW holds most of this as eight prose migration fields, or not at all. Many items reinforce gaps the deep-dives already confirmed (decommissioning, fitness functions, waivers, test strategy, operational acceptance, RAID), so they are cited as dependencies rather than repeated, and the six retirement items from four handbook families suggest the decommissioning dive deserves high severity.

Most consequential:

- **C11-01** (high, M) Hard constraints and mandatory invariants can be treated away: no non-waivable finding class and no mandatory-gate reading
- **C11-02** (high, L) No scoped, time-bounded exception register: accepted limitations never expire and carry no rule, scope, authority, compensating control, exposure cap, inheriting owner or closure evidence
- **C11-03** (high, M) Approval conditions and approved scope are untracked free text: there is no scoped release recommendation with enforceable conditions
- **C11-04** (high, M) Recording evidence makes the approved design stale: assurance observations and Chapter 9/10 evidence sit inside the design fingerprint
- **C11-05** (high, L) No claim register: consequential and mandatory claims are not linked to mechanism, assumptions and scoped evidence, and an unknown or contradicted claim blocks nothing
- **C11-06** (high, L) No common evidence ladder or statement of what evidence can conclude: lower-level evidence can close a target obligation

### Cross-cutting · method, traceability, Validate, SDD, Model, Sol

**34 verified gaps** (7 high, 20 medium, 7 low) · 25 reader claims shown to be already supported · 14 strengths noted. Detail: [chapter-gaps/12-cross-cutting.md](chapter-gaps/12-cross-cutting.md)

AIW's eleven chapters follow the same order as the method handbooks (requirements, drivers, decisions, responsibilities, components, technology, interfaces, security, runtime, review), over one canonical graph with typed relations that every Model view reads. Its strongest cross-cutting features are content-fingerprint invalidation and honest labelling. Records, control and runtime evidence, assurance records, typed checks and Chapter 11 dispositions go stale when what they judged changes. Simulations and calculations are marked as assumptions or analytical estimates, typed obligation checks give pass/fail/unknown/stale bound to an environment and release, and nothing in AIW or Sol approves. The handbooks treat every design claim as a scoped, falsifiable statement with an evidence level and boundary, a guarantee boundary, scoped parameters, invariants placed inside the boundary that enforces them, owned operating roles, a validation scenario with a negative control, and an expiry. AIW holds these as structured records only in islands: the fixed rule-based design-task topics, Chapter 8 execution agreements, Chapter 9 control parameters and evidence stages, Chapter 10 design/exercise evidence, and Chapter 11 typed checks on accepted obligations. Elsewhere they are free text, so they do not form one claim–evidence model across Chapters 2–10. Validate tests completeness rather than adequacy: findings are only error or warning, warnings never block readiness, missing evidence has no 'unknown' or 'unproven' state, and every record gets the same rigour whatever its consequence. Composition across mechanisms and chapters is thin. Beyond driver-target agreement, binding Chapter 9 controls into Chapter 10 and Chapter 8 journey arithmetic, there are no horizon, residency, ownership or option-placement rules, no composition argument or interaction analysis per journey, and no allocated journey budget. The trace stops at controls and runtime plans: assurance records, obligations and actions sit outside the canonical graph, and the realization chain has no deployable unit or data store. Patterns and reference architectures can be adopted only as playbook ids or text, and outside the guided topics adoption imports no prerequisites, companions, tests or roles. Exceptions never expire or name an authority, and conditional approvals carry conditions as untracked text. Sol stays inside the doctrine, but its proposals carry no validation plan. Each gap below can be closed with person-authored records, deterministic checks and Sol proposals that a person accepts, without letting an LLM or candidate knowledge decide anything. Items that are already deep-dive gaps (decision rights, enterprise conformance, the RAID register, the causal trail, views) are cited as dependencies, not repeated.

Most consequential:

- **X-01** (high, L) No shared, claim-scoped evidence model: no common evidence class or level, no required level per claim, no 'does not establish' boundary and no inconclusive, invalid or blocked result
- **X-02** (high, L) Validate has no 'unknown' or 'unproven' result: missing, stale or unobserved evidence never blocks readiness, coverage is not counted, and assurance layers are only partly separated
- **X-03** (high, L) No validation-scenario or experiment record: design claims have no hypothesis, Given/When/Then, negative control, acceptance rule declared in advance or proposed/executed status
- **X-04** (high, L) Design elements and adopted mechanisms carry no bounded claim: no depends-on, does-not-cover, failure scope, disproving observation or maturity, and their limits never reach the SDD
- **X-05** (high, L) Few cross-chapter consistency rules: horizons and retention, residency against zone, ownership and writer authority against access, Ch7 option against Ch10 placement, demand against capacity and roadmap, and recovery order are never reconciled
- **X-06** (high, M) Exceptions and accepted limitations name no rule, scope, authority, compensating control, expiry or removal test, and repeated exceptions never prompt a rule review

### Knowledge catalogue, component libraries and governance

**25 verified gaps** (4 high, 16 medium, 5 low) · 19 reader claims shown to be already supported · 10 strengths noted. Detail: [chapter-gaps/13-knowledge-libraries.md](chapter-gaps/13-knowledge-libraries.md)

On provenance and authority, AIW's knowledge governance does what the handbooks ask and in places more: exact hashed passages, four-eyes review re-checked on every read, checksummed and signed releases, withdrawal impact, honest curation marks, and candidate, discovery and catalogue content that never scores. It already has much of the machinery the handbook method needs. That includes a three-valued requires/excludes applicability engine, eight code-authored decision models (five composition topics plus interaction, reads and persistence) whose options carry applicability, 'reconsider if', obligations and verification that flow through a reviewed task into Chapter 11, governed design-concern claims that become Chapter 3 comparisons, and drift findings on reused library guidance. The break is between knowledge and the design records. Outside the built-in models, adopting a pattern, style or library entry in Chapter 3 or 5 is at most an identity check. Chapters 8 to 10 have no picker, and the Playbook and the catalogue hold the same mechanisms under two unconnected identities. Fit against an entry's conditions appears only as a transient contextual reading. Its obligations, parameters, companions and conflicts never reach Validate, the accepted-obligation register or the SDD. The handbooks' common entry template (decision rules, guarantee boundary, variants, parameters, diagnostic signals, validation scenarios) has no AIW shape. Neither do composition recipes or reference-architecture dossiers, their main reuse vehicles, so a design cannot be assembled from reusable knowledge, tailored against it or checked for conformance with it. Most of the 328 catalogue records hold unmarked generator template text, and one person can author and approve a project library entry, which sits beside the four-eyes path for claims. Source discipline is close to the handbooks apart from checked dates and re-validation on claims. Catalogue maintenance (successors, admission checklists, stewards, change registers) and coverage of delivery, operations and transition decisions are only partial.

Most consequential:

- **K-01** (high, L) Adopting a pattern, style or library entry is never checked against the entry's own conditions outside the built-in decision models
- **K-02** (high, L) Adopting an entry carries none of its obligations, exclusions or validation scenarios into the design outside the built-in decision models
- **K-03** (high, L) No typed relations between entries: required companions, conflicts, alternatives and easily confused entries are never surfaced at adoption or checked
- **K-04** (high, XL) No governed composition-recipe or blueprint type: multi-entry compositions exist only as code, and agreement between mechanisms is checked only for execution contracts
- **K-05** (medium, S) Library guidance enters a design without independent review: one person authors and approves a project library entry, and draft component entries can be proposed
- **K-06** (medium, S) Template-generated catalogue content is offered, cited and shown as entry-specific conditions and obligations with no marker

---

## 7. What the handbooks do not ask for

Some earlier assumptions did not survive checking against the text:
- **STRIDE, PCI DSS and likelihood × impact scoring.** None of these appears in any of the 27 handbooks. The QA Environment Handbook uses consequence and likelihood only to allocate test effort.
- **Threat elicitation.** AIW already flags every trust-boundary crossing that has no threat, and drafts threats by rule.
- **Survivor capacity.** AIW already computes survivor capacity after a zone loss.
- **Error budgets.** AIW already derives availability error budgets from Chapter 2 objectives.
- **Backward trace.** AIW already has a layered backward trace from any record.
- **Comparing deployment alternatives.** AIW already compares saved deployment alternatives on capacity and cost.

Each of these is listed under "already supported" in the detail files, with evidence, so it is not re-proposed as new work.
