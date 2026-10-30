# AIW design process measured against the 27 reviewed handbooks

**Date:** 2026-10-30
**Release line:** AIW v0.10.0-rc.10.73.x. The controlling baseline is rc.10.73.6.
**Source reviewed:** branch `claude/dazzling-cerf-a3qshh` at `2b5afaa`.
**Status:** a review only. No AIW code was changed. Every recommendation is a proposal for the owner to decide on.
productionAccepted stays false.

This file is the summary. The detail is in two companion files:
- [`CHAPTER-GAPS.md`](CHAPTER-GAPS.md): every verified gap, per chapter, with handbook references, AIW evidence (path:line), why it matters, the recommendation, effort and the skeptic's verdict.
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

---

## 4. Features to add to AIW

Each feature is drawn from what the handbooks prescribe. Each lists the verified gaps it closes; the gap ids are detailed in `CHAPTER-GAPS.md`, and "DD" names a deep-dive. Throughout, the doctrine holds:
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
- **Closes:** C5-01, C5-03, C5-05, C5-14, C5-18, C5-20, C4-02; DD component-selection (all).

**F3. Applying patterns and styles as governed bundles.**
- Lift the 19-entry limit. Any released pattern or style can be attached in Chapters 3, 5, 6, 8, 9 and 10.
- A style can be set per subsystem, as an explicit hybrid with crossing contracts.
- An adopted pattern expands into roles, components and interactions, with a check that its required roles are realised.
- It records its parameters, guarantee boundary and obligations.
- A composition check confirms that required companions are present and that combined mechanisms agree on their assumptions and parameters.
- Generalise today's eight code-authored design tasks into governed, releasable decision models and recipes.
- **Closes:** C5-04, C5-06, C5-07, C5-08, C5-13, C5-15, C6-07, C6-06, K-13, K-16, K-17; C3-01.

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
- **Closes:** C7-01–C7-15, K-20; DD technology-selection (all).

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
- **Closes:** C10-01–C10-06, C6-01, C6-02, C6-05, C6-08, C6-13, K-18; DD deployment-architecture (topology, environment chain, platform library, network zones).

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
- **Closes:** C3-01–C3-07 and the rest of Chapter 3; DD worked-example (hard quality requirements, review triggers).

**F7. Quality scenarios and measurement contracts.**
- **Scenarios.** Six-part quality scenarios with source and artefact. A set of normal, peak, failure, recovery and change scenarios per driver.
- **Measurement contracts.** Population, numerator and denominator, window, clock anchors, how unknowns count, guardrails and a versioned definition.
- **Objectives.** SLO records with error budgets and burn-rate owners. Hard requirements kept separate from objectives, so a hard quality requirement rules an option out instead of being weighed.
- **Workload.** A recorded workload model. Journey-level composition into child budgets.
- **Closes:** C2-01–C2-12 and C2-M1/M2; DD quality-method (all), operability-and-delivery (SLI and error budget).

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
- **Closes:** C8-01–C8-12 and the rest of Chapter 8; C5-02, C4-03; DD data-and-integration (all that hold).

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
- **Closes:** C9-01–C9-16; DD security-architecture (all).

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
- **Closes:** C10-06–C10-16 and the rest of Chapter 10.

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
- **Closes:** DD deliverables-and-views, operability-and-delivery.

**F13. Evidence, conformance and fitness functions.**
- An evidence ladder on every claim: model, local, integration, exercise, production.
- Falsifiable experiments with negative controls.
- Evidence expiry and re-run triggers.
- PASS / FAIL / UNKNOWN conformance rules per selected building block.
- Design-to-runtime drift checks.
- Anti-pattern detection driven by released anti-pattern records, with diagnosis and repair route.
- Waivers carrying authority, scope, compensating controls and expiry.
- **Closes:** K-14, K-24; DD enterprise-alignment (waiver, conformance), quality-method (fitness functions), evolution-and-transition (fitness and drift).

**F14. Transition and migration architecture.**
- Current-state capture with a register of recovered claims.
- Plateaus with entry and exit gates, invariants and authority.
- Cross-plateau dependency checks.
- Migration patterns: strangler with an authority ledger and cohort fencing; parallel run with a comparison contract.
- A cutover critical path with the last reversible point.
- Decommissioning readiness.
- A technical-debt register, and temporary components with an expiry.
- An editor for migration records.
- **Closes:** DD evolution-and-transition (all).

**F15. Enterprise alignment.**
- A business capability map, and the misfiling on import fixed.
- Organisation units and decision rights.
- Principles turned into rules and observable evidence.
- Adopted enterprise standards and reference architectures applied with conformance and tailoring readings.
- **Closes:** K-23; DD enterprise-alignment.

**F16. The full deliverable set and the traceability chain.**
- **SDD body sections:** security (threat model, treatments), data, operations, and transition.
- **Registers:** a RAID register, a glossary, and a stakeholder concern-to-view mapping.
- **Traceability.** One typed trace algorithm, so every view agrees. The requirement → driver → decision → component → product → contract → control → placement → evidence chain printed in the SDD.
- **Handoff.** An implementation specification index for engineering.
- **Closes:** C6-11, C7-10, K-21; DD deliverables-and-views, traceability.

---

## 5. Suggested order

1. **rc.10.73.x+1: integrity.** D1–D12. Mostly S/M effort and touches existing paths only.
2. **Library foundation.** The F1 record kinds and intake. Import a first slice: Application Architecture Master (styles, patterns, tactics, anti-patterns, components) and Enterprise Component Library Part 1. Every entry stays a candidate until a second person releases it.
3. **Selection paths.** F2 (Ch5 component selection), then F3 (patterns as bundles), then F4 (Ch7 qualification). These reuse the eight design tasks' existing machinery: applicability predicates, Ch3 alternatives, obligations into Ch11.
4. **Deployment.** F5 topology and blueprints, then F10 capacity and recovery.
5. **Method depth.** F6–F9, in parallel tracks per chapter.
6. **Delivery and assurance.** F11–F16.

What this order depends on from outside:
- **Licence and use of the handbook content.** Whether the content may be imported is for the owner, or their counsel, to confirm.
- **Releasing library entries.** This needs a second authorised person. AIW, Sol and this review cannot release them.
- **Production acceptance.** Nothing here establishes it.

---

## 6. Chapter by chapter (summary)

FILLED-BY-SCRIPT

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
