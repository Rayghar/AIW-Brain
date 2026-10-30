# AIW design process measured against the 27 reviewed handbooks

**Date:** 2026-10-30
**Release line:** AIW v0.10.0-rc.10.73 series. The controlling baseline is AIW v0.10.0-rc.10.73.6.
**Source reviewed:** branch `claude/dazzling-cerf-a3qshh` at `2b5afaa`.
**Status:** a review by AI agents only. No AIW code was changed. Every recommendation is a proposal for the owner to decide on.
productionAccepted stays false.

This file is the summary. The detail is in two companion files:
- [`CHAPTER-GAPS.md`](CHAPTER-GAPS.md), an index of the per-chapter files in `chapter-gaps/`: every verified gap, per chapter, with handbook references, AIW evidence (path:line), why it matters, the recommendation, effort and the skeptic's verdict.
- [`CAPABILITY-DEEP-DIVES.md`](CAPABILITY-DEEP-DIVES.md): thirteen capability deep-dives, many run against a live AIW. Each carries a skeptic's verdict on every claim.

---

## 1. What was done

| Step | Scale | How it was checked |
|---|---|---|
| Read the handbooks | 27 handbooks, 3.18 M words, split into 65 sections | Each section was read in full, start to end, by its own reader. The readers listed 1,819 sections and section groups as read, and recorded **2,769 items**: what the handbook prescribes and whether AIW appears to support it. |
| Map AIW's design process | 11 chapters plus Validate, Model, Output (SDD), Sol, knowledge, intake and projects | Built from the source, with path:line evidence. |
| Capability deep-dives | 13: component selection, technology selection, deployment architecture, library coverage, traceability, deliverables and views, a handbook worked example carried through AIW, quality method, data and integration, security, evolution and transition, enterprise alignment, operability and delivery | Many were run hands-on against AIW on scratch databases outside the repo (APIs, SDD exports, reference projects). A skeptic re-checked all 195 gaps. 15 did not hold as stated and were relabelled or corrected. Many of the 180 that held also carry corrections, and this summary applies them. |
| Per-chapter verification | 13 units, large chapters split by handbook family | Every reader claim that AIW lacks something was searched for in the source. Each resulting gap then went to a second agent told to refute it. No gap was refuted outright. About a third (114 of 353) were corrected as overstated, and skeptics added 50 gaps the synthesis had missed. Shards were then merged. |

**Limits.**
- The readers judged AIW support from a digest, so their "absent" marks are hypotheses. Only gaps that survived source verification and the skeptic appear here.
- Sol (the LLM layer) was not exercised in the hands-on runs, because no provider was configured for them.
- All readers, analysts and skeptics were AI agents. "Verified" means checked against the source by one agent and challenged by another.
- No independent architecture reviewer, four-eyes knowledge approver or licence counsel has reviewed these findings or severities. Status: not started.
- Severities are the AI reviewers' judgement, not the owner's or an independent reviewer's.
- The handbooks are kept outside the repository and are not committed. This report cites them as "Handbook › heading" only.

---

## 2. Direct answers

### Does AIW let the architect select the components that realise the architecture?
**Partly, and not the way the handbooks prescribe.**
- **What exists.**
  - Chapter 4 maps each responsibility to a component. Chapter 5 records the allocation with a role and a scope.
  - Chapter 5 has a "From the library" picker. It offers 20 catalogue archetypes and components saved from projects.
  - A pick becomes a candidate that a person must review, and its origin (release id and record hash) is kept.
  - Real compare-and-choose, with every option kept as a Chapter 3 alternative, exists in two places:
    - the eight code-authored design tasks (interaction, reads, persistence, delivery, resilience, distribution, partitioning, structure);
    - comparisons built from a released, four-eyes-reviewed design concern.
  - Model Alternatives and a guided boundary task also compare options and set them aside.
  - None of these starts from a library component.
- **What is missing.**
  - The picker does not start from the responsibility and its drivers. It is a text search.
  - Cards show no fit to quality drivers, no hard-constraint check, no consequences, alternatives or evidence.
  - No component-selection decision with eligible and rejected candidates is recorded.
  - Outside those design tasks, adopting a pattern or library entry creates no fit record, parameters, guarantee boundary or tests. Its obligations stay display-only proposals that never reach Chapter 11 (C5-01, C5-04 to C5-08, K-01 to K-03).
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
- The Application Architecture, Cloud Infrastructure and DevOps Masters also define 38 styles, 92 patterns, 60 tactics and 60 anti-patterns. The Enterprise Component Library adds 20 neighbouring-role compositions and 12 blueprints.
- The volume handbooks add their own catalogues: for example the Application Architecture Handbook's 182 entries (including 15 styles and 22 anti-patterns), and about 73 composition recipes across seven handbooks. Most entries carry:
  - forces and when to use / when not to;
  - boundary and owned state, and ports;
  - physical options and typed configuration attributes;
  - failure and repair, tests, metric contracts and evidence labels.
- None of this is imported.
- AIW's catalogue (AKR-0.10.73.5) has 328 records:
  - 318 of them hold generator template text;
  - its 20 archetypes are platform capabilities with templated, sometimes wrong, kits;
  - Chapter 5 can attach only SA Playbook ids: its picker offers the 19 styles and patterns, the record also accepts the 56 tactics, and no catalogue or handbook id is accepted;
  - Chapters 8, 9 and 10 have no pattern, tactic or topology picker. Chapters 9 and 10 can take approved control or runbook guidance only as text.
- AIW has a governed path an import could build on: source, then candidate, then four-eyes review, then release, then a project pin. Its organisation library can already hold a reduced component profile. But its importer reads only signed repository sources, and its size limits block a handbook-scale import, so both need changes first.

Deep-dive: library-coverage; K-04, K-06, K-08.

### Does AIW let the architect select technology and products?
**Partly.**
- **What exists.**
  - Chapter 7 compares up to 12 options per realisation, against drivers, four fixed criteria, requirement groups and obligations.
  - Recording a selection is person-only.
- **What is missing.**
  - A governed product catalogue: the 14 products are a discovery list with no approval.
  - Typed licence, end-of-support, support-contract and exit fields. Today only prose criteria ask for them.
  - A product-level check against enterprise standards. Only shared-service dependencies get a lifecycle and version reading.
  - A binding to a target platform.
  - A qualification state on the selection. Obligation checks give pass, fail or unknown per environment and release, but nothing ties them to the product's required behaviours.
  - A capability matrix derived from Chapter 8 contracts (C7-02).
  - The organisation's operating capability as a criterion and condition (C7-04).
  - An option-level cost model per accepted outcome (C7-05).
- **What is broken.** The approval is self-attested (section 3).

Deep-dive: technology-selection; C7-02, C7-04, C7-05.

### Does AIW let the architect design and select a deployment architecture?
**Only partly.**
- **What exists.**
  - Chapter 10 describes one deployment: environments, zones, one runtime plan per environment and part, placements and runtime paths.
  - About 45 deterministic checks run over it.
  - It simulates a zone or failure-domain loss, sizes survivor capacity at the review desk and derives availability budgets.
  - Saved design alternatives can hold Chapter 10 changes, and a person records which one is accepted.
- **What is missing.**
  - A reference-blueprint library. The Cloud Infrastructure Master alone has 12 deployment styles.
  - Gates before preferences.
  - Physical topology: account or landing zone, region, AZ, VPC, subnet, cluster, edge.
  - An environment chain: promotion order, an environment contract and stage-aware checks. Only a pairwise environment comparison exists today.
  - CI/CD and infrastructure as code.
  - A declared failure set with degraded modes.
  - Recovery designed as a timed procedure.
  - Shared-resource envelopes.
  - Flow matrices with denied flows.

Deep-dive: deployment-architecture; C10-01 to C10-19.

---

## 3. Fix first: defects that break AIW's own rules

How each was verified:
- **On a running AIW or a scratch copy of a reference project:** D1–D3, D5–D7, D9, D10, D12, D18, D19 and D20.
- **By running AIW's domain code in memory:** D4, D11 and D17. D11's template text was also seen in an SDD exported from a running app.
- **In the source only:** D8, D13, D14, D15 and D16.

A second agent re-checked each one. What each breaks:
- **A person decides and someone else approves:** D1, D2, D4, D5, D6, D13 and D15.
- **Unrecorded, placeholder or template content shown as decided or entry-specific:** D3, D8, D11, D16, D17 and D18.
- **One canonical Design Graph:** D9.
- **Consistency of the model:** D7, D10, D12, D14, D19 and D20.

They should be fixed before any feature work. Several are migrations, not patches. D9, for example, retires Chapter 5 dataIds as an ownership record.

| # | Defect | Where |
|---|---|---|
| D1 | A person can approve their own Chapter 7 technology choice, even with the project's four-eyes setting on. The approval stores no actor, and the SDD prints "External approval evidence recorded". | deep-dive technology-selection (critical) |
| D2 | A Chapter 7 selection can be recorded with no assessments, and pending hard gates do not block it. | technology-selection |
| D3 | The SDD prints a draft preference, and drivers nobody assessed, as a decided "Design basis … because QD-x". | technology-selection |
| D4 | A withdrawn archetype still saves as a Chapter 5 candidate. The organisation library offers draft entries that were never released. One person can author and approve a project-library entry. | library-coverage, component-selection; K-05 |
| D5 | The architect who accepts a residual security risk can also record its approval. | deep-dive security-architecture |
| D6 | A trace review can be recorded on a broken trail, and doing so clears the trace warning. | deep-dive traceability |
| D7 | Several separate trace traversals give different answers for the same requirement: the trail and desk, the Matrix chain behind the narrative, the design index behind SDD §4, driver scope, the ARS driver chain and the SDD journey line. So the Model views, ARS and SDD disagree. | deep-dive traceability (critical) |
| D8 | The review-desk availability verdict and its survive-one-zone sizing count zone records, not independent failure domains. The desk can read "holds" while Chapter 10 itself warns that everything sits in a single domain. | C10-21 |
| D9 | Chapter 5 and the Chapter 8 authority can name different owners for the same data. This leaves two conflicting "owns" edges in the canonical graph, with no finding. It arises mainly in the reference project and in data created by design tasks; the SDD already follows Chapter 8. Fix: make the Chapter 8 authority the only ownership edge. | deep-dive data-and-integration |
| D10 | The journey drafter creates one production environment per component, which raises Chapter 10 errors by construction. RTO and RPO marked open on a capability are silently dropped. | deployment-architecture, worked-example |
| D11 | Archetype proposals carry template text, and sometimes the wrong kit (a relational store proposes identity-token contracts), into the component and on into the SDD. | library-coverage, component-selection; K-06 (D11 fixes the defect; F1 completes the content) |
| D12 | ArchiMate import turns a Gap into a Chapter 1 requirement, and misfiles a business Capability as a Chapter 6 technology capability. | evolution-and-transition, enterprise-alignment |
| D13 | One reviewer can treat a hard-constraint or invariant breach away as an "accepted limitation", and the limitation never expires. | C11-01 (the waiver register that replaces it is F13) |
| D14 | Recording assurance or Chapter 9/10 evidence changes the design fingerprint, so the approved baseline goes stale. | C11-04 |
| D15 | The author of a Chapter 11 delivery action can mark it Verified on a typed reviewer name, which makes its obligation "current-verified". The delivery review has no actor or four-eyes check. | C11-14 |
| D16 | Imported BPMN branches with no condition get placeholder text. The text satisfies the gateway check, and the BPMN default flow is dropped. | C1-M1 |
| D17 | Drafted placeholder text in Chapter 10, such as "Runbook for X still to be written." or an open-question rollback, satisfies the operations check. So the "operate" milestone can complete on placeholders. Fix: store drafted text as open fields. | deep-dive operability-and-delivery |
| D18 | Chapter 10 recover and operate proposals, and a work-card placeholder, write payment wording into any project, for example "reconcile pending payments" on a clinic project. Fix: derive the wording from the project's own contracts, or gate it on the domain lens. | deep-dive deployment-architecture, operability-and-delivery |
| D19 | In a blank project, the "recovery" co-design proposal always takes the first component as its source, and the person cannot change it. Its seeded Chapter 8 contract survives removal of that interaction. | deep-dive worked-example |
| D20 | Read-only contracts raise the "duplicate" error unless a key is declared. The only way out records an open key, which misstates the contract. Fix: a reviewed "read-only, safe to repeat" declaration. | deep-dive worked-example |

---

## 4. Features to add to AIW

Each feature comes from what the handbooks prescribe. Each lists the agent-verified gaps it closes.
- Together, D1–D20 and F1–F18 give every one of the 353 chapter gaps exactly one owner, including the low-severity refinements. The one exception is K-06: D11 fixes the defect and F1 completes the content.
- Deep-dive gaps are owned through the DD tags in each feature. Where a feature carries a capability that no chapter gap covers, the capability is written into the feature's text.
- Gap ids are detailed in `CHAPTER-GAPS.md`. "DD" names a deep-dive, counting only the gaps its skeptic upheld.

**Doctrine.** Each feature is meant to keep to the doctrine below. That is the reviewers' proposal, for the owner to confirm.
- **Sol** may interpret, propose, compare, critique and explain.
  - It never approves, decides, waives policy, overrides a hard constraint, promotes knowledge or invents evidence.
  - It changes the canonical graph only through proposals that a person accepts one by one.
- **Deterministic rules gate.** A hard-constraint or invariant finding blocks, and no person can wave it through. Below the gates, readings are leans; a person selects and accepts.
- **Candidate and discovery knowledge never affects scoring, hard constraints or conformance.** This includes the 14-product discovery catalogue. Library content enters no score, hard constraint or conformance reading unless a person separately adopts it as policy.
- **A second person.** Releasing knowledge, approvals, waivers and acceptance each need a signed-in person other than the author.
- **One authority path.** Each feature extends the existing record and command and retires what it replaces, through a reversible migration. One canonical Design Graph, one Brain entry point, and tenant and project boundaries are kept.
- **productionAccepted stays false.**

### Tier 1: Selecting what realises the architecture

**F1. Governed architecture library: the handbook catalogues as selectable knowledge.**
- **Record kinds.** Extend AIW's existing structured-claim kinds and organisation-library entries rather than adding new ones. The kinds: component profile, style, pattern, tactic, technique, anti-pattern, composition recipe, and reference architecture or deployment blueprint.
- **Entry template, from the handbooks:**
  - problem and forces; use when / avoid when; prerequisites;
  - quality effects (causal mechanism, observable measure, cost to other qualities);
  - guarantee boundary (claims, depends on, does not cover);
  - design parameters (unit, scope, basis, failure if wrong);
  - failure modes and repair; obligations and required companions; conformance and validation tests; physical options;
  - typed relations: requires, conflicts, alternative, realised-by, easily confused with.
- **Evidence level as stated by the source:** illustrative, proposed, or reported-executed-by-source.
  - AIW's own project evidence is kept apart from it: executed-in-project, observed-in-production, failed, stale, inconclusive.
  - A result the handbook reports enters only as reported-executed-by-source, until AIW reruns it and keeps the report as a hashed evidence source.
  - The handbooks' worked numbers import as labelled examples, never as project values. Missing evidence reads UNKNOWN, never PASS.
- **Intake.**
  1. The owner records the licence or permitted use and the SHA-256 of each handbook file.
  2. Handbook passage, through the existing source and claim path.
  3. Candidate: never offered, never scored.
  4. Second-person review.
  5. Release.
  6. Project pin.

  The project library is never an import target. The importer and its size limits need extending for a handbook-scale import.
- **One identity per mechanism.** Resolve the Playbook and catalogue ids through a reviewed crosswalk, and retire the duplicate identity.
- **Upkeep.** When a project's pinned entry is superseded or withdrawn, that project raises a finding against its own pin and offers a reviewed migration.
  - Nothing is written into a project from outside it.
  - The pin moves only when a person in that project accepts.
  - Released claims carry checked dates and review-by dates.
- **Closes:** K-03, K-04, K-06–K-08, K-11, K-12, K-15, K-19, K-22, K-25 (2 high, 7 medium, 2 low); DD library-coverage. Note the library-coverage skeptic: a governed organisation-library component entry already exists, so this extends it.

**F2. Component selection from responsibilities and drivers (Chapter 4 → 5).**
- Start from a responsibility and its drivers. Its invariants come in once C4-03 binds them, in F8.
- **Eligibility first.** A deterministic check against the project's hard-constraint drivers and adopted policy gives pass, fail or unknown. Unknown is never treated as neutral.
- **Applicability as a reading.** Each released profile's use-when and avoid-when is shown as context-match, needs-context or excluded. It raises a finding until a person records a reasoned override.
- **Then descriptive content:** consequences, obligations, alternatives, quality effects labelled uncalibrated, and evidence level. Do not rank or score.
- **Sol** may suggest candidates with receipts, as proposals only.
- **The decision.** The person's choice is recorded as a Chapter 3 decision with the eligible and rejected candidates and the reasons. Accepting it instantiates only the chosen profile, through the existing reviewed candidate path, with the profile's version pinned.
- **Afterwards.** Obligations become proposed Chapter 8–11 actions. SDD section 4 prints the selection basis, the origin and the rejected options.
- **Also:**
  - an application-deployable record, with an evidenced reason for each split;
  - typed component ports;
  - a logical-to-physical responsibility map (authority, placement, runtime identity, owner);
  - authored component scenarios and failure walkthroughs;
  - design questions that close only on a record that fits;
  - build, buy or reuse sourcing;
  - an AI/ML and agentic component category with its obligations.
- **Closes:** C5-03, C5-09, C5-14, C5-16–C5-18, C5-20–C5-23, X-22, C11-43 (1 high, 9 medium, 2 low); DD component-selection.

**F3. Adopting patterns and styles as governed bundles.**
- **Where.** Any released pattern, style or tactic can be adopted in Chapters 3, 5, 6, 8, 9 and 10 through one adoption record. This lifts the Playbook-only limit once F1's crosswalk exists.
- **Fit reading.** Adoption runs one fit reading against the entry's conditions.
- **Proposals.** Adoption deterministically proposes, without applying them, the entry's roles, components, interactions, parameters, guarantee boundary and obligations.
  - Each role binds to an existing record or stays an open question.
  - A person accepts each proposal one by one, through the audited Brain command path.
  - Sol may propose role bindings only as drafts.
- **Composition check.** Required companions must be present, conflicts are flagged, and combined mechanisms must agree on their assumptions and parameters.
- **Styles.** A style can be set per subsystem, with an explicit hybrid and crossing contracts. Each added tier must name the pressure that justifies it.
- **Decision models.** Migrate today's eight code-authored design tasks onto one generic, governed decision-model interpreter. Run both only behind a parity test, then retire the code path. Released catalogue variants become governed alternatives.
- **Closes:** K-01, K-02, K-09, K-10, K-13, K-16, K-17, C5-01, C5-04–C5-08, C5-13, C5-15, C6-06, C6-07, X-04, X-11, X-12, X-14, C3-01, C3-13–C3-15, C3-17, C3-19 (11 high, 15 medium, 1 low). X-12 finishes after F8 and F13, which it depends on.

**F4. Technology and product selection with qualification (Chapter 6 → 7).**
- **Capabilities before products.** Derive the required behavioural capabilities into a capability matrix, and feed Chapter 8 contract guarantees back into it as fit criteria.
- **Eligibility before preference.**
  - The check uses released, four-eyes technology-standard and approved-product records only.
  - The discovery catalogue and candidate entries never feed eligibility gates, the lean or a conformance reading.
  - The standards register comes from F15, so that part follows F15.
- **Whole-life comparison.**
  - Complete alternatives (build, reuse, buy, managed or SaaS) are compared on whole-life cost per accepted outcome, with sensitivity.
  - The current design and the simplest viable option are always in the set.
- **Option facts:**
  - licence model and terms, with a licence-review state that reads "pending licence counsel". It is never set by AIW or Sol and never shown as licence approval;
  - end-of-support, support contract, vendor risk and exit feasibility;
  - provider quotas and regional availability.
- **Qualification.** Extend the existing obligation verification checks to track it.
  - A state advances only on a recorded observation, with receipt, of matching scope. Unknown is the default.
  - "Observed" is never production acceptance.
- **Local and target.** Environment-scoped local and target realisations can coexist.
- **Operating model.** The operating-model responsibility split, and the organisation's operating capability as a condition.
- **SDD.** A technology decision record, with rejected options and reasons.
- **Closes:** C7-01–C7-15, ch07-M1, ch07-M2, K-20, C8-19 (3 high, 16 medium); DD technology-selection beyond D1–D3; worked-example (local and target realisations).

**F5. Deployment architecture design and selection (Chapter 10, with 6 and 7).**
- **What must survive.** Declare the failure set and the minimum service that must survive it, first. Its degraded modes are owned by the business-service record from F7.
- **Location as a gated decision.** Gates for residency, required services, quotas and keys. Every data copy (backups, logs, traces, keys) gets an approved location. The key gate completes with F9's key register.
- **Blueprints.** Choose a released reference deployment blueprint through the existing saved design alternatives, with an adoption record of fit, deviations and tailoring. Examples: landing zone, single-region multi-AZ, regional active with qualified standby, cells, hub-and-spoke.
- **Topology model:**
  - accounts or landing zone, regions and AZs;
  - VPCs, subnets and the address plan;
  - clusters and edge.
- **Flows and environments.**
  - A flow matrix that includes denied, infrastructure and lifecycle flows.
  - An environment chain with promotion order, an environment contract and parity. Non-production holds no production authority.
- **Dependencies.**
  - A common-cause inventory.
  - Provider and consumer contracts for shared platform capabilities.
  - External parties, with a supplier assessment, inside the dependency model.
  - Typed capability parameters and an egress inventory.
- **Closes:** C10-01–C10-05, C10-20, C10-22, C10-41–C10-43, C6-01, C6-09, C6-10, C6-12–C6-14, C6-M2, C8-34, C8-35, K-18 (6 high, 11 medium, 3 low); DD deployment-architecture (topology, environment chain, platform library, network zones).

### Tier 2: Method depth the handbooks require

**F6. Decision records to the handbooks' template.**
- **Before choosing.** Diagnose first.
- **Options.**
  - State options conditionally: select when, disqualifier, evidence needed.
  - Mandatory conditions are scoped to the decision and act as non-compensable gates.
  - Allow outcomes other than one chosen option: infeasible, deferred, bounded pilot, composed, transferred.
- **Analysis.**
  - An owned preference model.
  - Whole-life cost with ranges, break-even and sensitivity.
  - Reversibility and points of no return.
  - An unresolved-obligation list.
- **Afterwards.**
  - A refutable validation plan linked to a Chapter 11 check.
  - Observable review triggers, and a switching condition for the credible alternative.
  - A post-implementation review.
- **Method.** An attribute-driven design iteration record.
- **Closes:** C3-02–C3-12, C3-16, C3-18, C3-20, C3-M1, C3-M2, C3-M3, C3-M4, C11-30, X-24 (5 high, 12 medium, 3 low); DD worked-example (review triggers).

**F7. Quality scenarios, measurement contracts and the business service.**
- **Built early, ahead of F5.**
  - A business-service record holding criticality, time-dependent harm, degraded modes and continuity targets. It is the one owner of degraded-mode records.
  - A recorded workload model.
  F5 and F10 build on both rather than adding their own.
- **Scenarios.** Six-part quality scenarios, with a set of normal, peak, failure, recovery and change scenarios.
- **Measurement contracts:** population, numerator and denominator, window, clock anchors, how unknowns count, guardrails, and a versioned definition.
- **Objectives.**
  - SLO records with error budgets and burn-rate owners.
  - Hard requirements kept separate from objectives, so a hard quality requirement rules an option out instead of being weighed.
- **Composition.** Journey-level composition into child budgets, including availability composed along critical chains.
- **Closes:** C2-01–C2-16, C2-M1, C2-M2, C6-08, X-15–X-17 (1 high, 16 medium, 5 low); DD quality-method; operability-and-delivery (SLI and error budget).

**F8. Authority, data and contract register (Chapter 8).**
- **Authority and data.**
  - Designate each data definition as authoritative, derived or externally observed. Derived copies get a source, a freshness bound, permitted uses, and inherited classification, residency and retention.
  - An effective-writer inventory with scoped write authority and fenced transfers.
  - Invariants with enforcement point, mechanism, writers and verification, in the canonical graph and bound to responsibilities and components.
  - Lifecycle guards, owners and deadlines.
  - A semantic contract beside the schema, and a typed identity model.
- **Outcomes and partners.**
  - A reconciliation design behind "manual reconciliation".
  - Qualification of the external-party guarantees the design relies on.
- **Effects.** An effect classification (reversible, compensable, irreversible) with a compensating contract and owner, checked against rollback.
- **Horizons and budgets.**
  - Recognition, replay and retention horizons that must cover each other.
  - A version-coexistence matrix.
  - Fleet-wide dependency and admission budgets.
- **Execution agreements.** Made mandatory for posting and effect contracts.
- **Data and integration.** Data movement (CDC, ETL, streaming); orchestration versus choreography and sagas; outcome and error catalogues; publication and subscription registers.
- **Data modelling and data quality.**
  - A level (conceptual, logical, physical), grain and store mapping per data definition.
  - A master, reference or transactional designation, with versioned reference sets.
  - Typed quality rules (completeness, validity, control totals) with a discrepancy owner and a publication gate.
  - Data service objectives (freshness, completeness).
  - Analytical copies designated apart from operational authority.
- **Privacy by design.**
  - Per data definition: personal-data categories and permitted purposes of use (recipients, copies, retention per purpose), with linkage scope.
  - Where consent is the basis: a choice state bound to subject, purpose and notice version, with a withdrawal-enforcement target.
  - Lawful-basis status recorded as "awaiting counsel". It is never inferred by AIW or Sol, because it belongs to an external legal authority.
  - Legal-hold state with a hold authority.
  - Deletion propagated to every copy reached through lineage, including backups, and re-applied after a restore.
  - A Chapter 9 disclosure threat per personal-data copy.
- **Closes:** C8-01–C8-18, C8-20–C8-22, C8-24–C8-33, C8-36–C8-44, C5-02, C5-11, C5-12, C4-03, X-05, X-07 (16 high, 22 medium, 8 low); DD data-and-integration (including data movement, orchestration and sagas, operating terms, versioning, and purpose, residency and lawful basis).

**F9. Identity, access and protection coverage (Chapter 9).**
- **Coverage.** Judge coverage per access route, not per object: inventory every route to a protected effect or to sensitive data, including bypass paths.
- **Threat elicitation.** Per element and per crossing, over spoofing, tampering, disclosure, denial of service and misuse of privilege. Each threat has a precondition and an abuse-case test link.
  - This is the handbooks' own method. They do not name STRIDE or ask for likelihood × impact scoring, but they do ask for a per-element pass over these STRIDE-like classes.
- **Identity.**
  - The authorisation decision chain over time: issuer, decision point, enforcement point, re-check moment, revocation window.
  - Identity classes and a least-privilege matrix per component.
- **Secrets.** A lifecycle register for secrets, keys and certificates.
- **Isolation.** The tenancy and isolation model, including tenant scope on data and cells.
- **Controls.** A control picker from released security tactics and patterns, giving each control its role (prevent, detect, respond, recover).
- **Obligations.** An obligation applicability register mapped to controls and evidence.
- **Boundaries and change.** Message-origin authenticity and replay horizons at integration boundaries. Safe change for security and network policy.
- **Closes:** C9-01–C9-14, C9-M1, C9-M2, C8-23, C10-24 (3 high, 14 medium, 1 low); DD security-architecture (including personal data and privacy design).

**F10. Capacity, failure and recovery engineering (Chapter 10, with 6).**
- **Capacity, using F7's workload model.**
  - A limiting-resource analysis.
  - Shared-resource envelopes across all deployables, including surge, draining, jobs and rollout overlap.
  - Survivor capacity computed from the recorded placements.
  - Burst and outage backlog, drain time and retention against quotas.
- **Failure.**
  - A failure-mode register per component, contract, mechanism and plan, covering slow, stale, duplicated and partial modes as well as outage.
  - Serving, control and recovery planes, with a static-stability check.
  - Qualified fallback paths.
- **Recovery.**
  - Objectives per failure scope, as a timed stage graph ending at a business endpoint.
  - Exercise evidence of matching scope, which completes with F13's evidence records.
  - Data-loss claims tied to a replication or acknowledgement mechanism.
  - Write authority and fencing.
  - A recovery-set manifest.
  - Gated reopening after recovery.
  - An exercise programme.
- **Closes:** C10-06–C10-16, C10-23, C10-25–C10-30, C10-32, C10-34, C10-39, C10-40, C10-44, C10-46, X-13, C5-10, C5-28, C6-02–C6-05, C6-15, C6-M1, C6-M3 (13 high, 17 medium, 4 low).

### Tier 3: Delivery, assurance and evolution

**F11. Release and operations design.**
- **Release.**
  - A release manifest: artifact digest, configuration, policy, schema.
  - Typed release-strategy selection.
  - Progressive exposure with predeclared promote, hold and stop rules on business outcomes.
  - Rollback eligibility, with a point of no return and mixed-version coexistence.
- **Runtime behaviour.**
  - Readiness, liveness and drain as separate records.
  - A runtime configuration register.
- **Operations.**
  - Observability design: signals anchored to business outcomes, metric contracts for operating measures, correlation identifiers, an audit path, telemetry sinks, alerts with owners.
  - A failure-to-runbook register.
- **Incident and support design.**
  - Incident classes.
  - A role model with an action-authority table (reduce admission, pause dispatch, correct state, reconcile, resume), each action with an owner and a safeguard. It reuses Chapter 9's separation of operational and destructive privilege, and the incident commander coordinates without gaining authority over corrections.
  - A decision-log and situation-report template that keeps observation, hypothesis, action and outcome apart, and distinguishes accepted, pending, unknown and final outcomes.
  - Handover as a recorded state.
  - A support contract: responders, response targets, supported versions, escalation.
  - All of it is authored by a person; Sol may only draft.
  - CI/CD and infrastructure as code as design records.
- **Closes:** C10-17–C10-19, C10-31, C10-33, C10-35–C10-38, C10-45 (3 high, 6 medium, 1 low); DD operability-and-delivery (including runbooks, incident response and the support model; observability; the delivery pipeline); deployment-architecture (CI/CD, IaC).

**F12. Operational acceptance and handover.**
- **The register.**
  - An operational acceptance register, as a preparation pack only.
  - Its rows come from Chapter 9 controls, Chapter 10 plans and Chapter 11 actions, each with an evidence reference and a validity interval.
  - Its disposition reads HOLD while any mandatory row is missing, stale or unknown.
- **Staged readings.**
  - Staged readiness readings: implement, deploy, production.
  - Exchange readiness per owner dimension.
  - Readiness of people and process.
- **The decision.**
  - Scoped to a service, environment and configuration.
  - Recorded only by the named acceptance authority, through a person-only command: a signed-in person other than the preparer and the design author.
  - Sol and agent accounts are refused.
  - AIW never acts as the acceptance authority, and productionAccepted stays false unless every mandatory row genuinely passes.
- **Conditions and handover.**
  - Approval conditions tracked as records.
  - A review panel per concern, with dissent recorded.
  - A residual-obligation ledger that the receiving owner accepts.
- **Closes:** C11-03, C11-11, C11-16, C11-24, C11-37, C11-39, X-20 (2 high, 5 medium); DD deliverables-and-views and operability-and-delivery (acceptance pack, go-live decision).

**F13. Evidence, verification, conformance and waivers.**
- **Evidence.**
  - A claim register and an evidence ladder (model, local, integration, exercise, production).
  - A statement of what each level can and cannot establish.
  - Falsifiable verification cases with oracles and negative controls.
  - A test strategy and verification portfolio.
  - Evidence expiry and re-run triggers.
  - Epistemic status on design statements.
- **Checks and findings.**
  - Failing checks block what they should.
  - Reviewer-raised findings.
  - PASS / FAIL / UNKNOWN conformance over a declared population.
  - Design-to-runtime drift.
  - Anti-pattern and misuse detection driven by released records.
- **Waivers (exception grants).** These extend D13.
  - Each records the waived rule and its version, the exact scope, compensating controls and what they leave uncovered, the approving authority and its mandate, a start and an expiry.
  - **Non-waivable findings** refuse any waiver: Chapter 3 "breaks", the Chapter 7 hard-constraint error, Chapter 1 Must-constraint violations, and integrity, authorisation and recovery invariants. A hard constraint changes only through a reviewed change to its Chapter 1 constraint and Chapter 2 driver.
  - **The approver** is a signed-in person other than the design author, whatever the four-eyes setting. Agent accounts are refused.
  - **Sol** may draft text, but never grants or renews a waiver.
  - **Expiry** reopens the finding and refuses handoff.
- **Closes:** C11-02, C11-05–C11-07, C11-12, C11-13, C11-15, C11-17–C11-20, C11-28, C11-29, C11-38, C11-40–C11-42, K-14, K-24, X-01–X-03, X-06, X-08, X-10, X-19, X-23, X-25, X-29, X-31–X-33 (9 high, 15 medium, 8 low); DD enterprise-alignment (waiver, conformance), quality-method (fitness functions), evolution-and-transition (fitness and drift), operability-and-delivery (test strategy).

**F14. Transition and migration architecture.**
- **Starting point.** Current-state capture.
- **Plateaus.** Entry and exit gates, invariants and authority.
- **Migration mechanics.**
  - Migration units and cohorts.
  - An authority-handover protocol.
  - A staged compatibility plan for contracts and schemas.
  - Reversal plans.
  - Data-migration reconciliation.
  - A parallel-run comparison contract.
  - Rehearsal records.
- **Plan and retirement.**
  - A sequenced, feasible delivery plan.
  - Retirement plans and decommissioning readiness.
  - A technical-debt register, and temporary components with an expiry.
  - An editor for migration records.
- **Closes:** C11-08–C11-10, C11-25, C11-32–C11-36, C11-45, X-28 (3 high, 6 medium, 2 low); DD evolution-and-transition.

**F15. Enterprise alignment.**
- **Capabilities.** A business capability map, extending the governed "Enterprise capability" identity. It builds on D12's import fix.
- **People and rights.** Organisation units, decision rights and typed operating roles. These are consumed by F17 and F18, so they come first.
- **Principles.** Principle records (statement, implementation rule, observable evidence).
  - Adopted from released four-eyes organisation entries, or authored by a person in the project.
  - Built on the existing constraint → driver → conformance path.
  - Sol may propose mappings only as drafts.
- **Standards.** Adopted enterprise standards and reference architectures, applied with conformance and tailoring readings. The approved-product register is consumed by F4.
- **Closes:** K-23, X-18, X-21 (2 medium, 1 low); DD enterprise-alignment.

**F16. The full deliverable set and the traceability chain.**
- **SDD body sections:** security (threat model, treatments), data, operations, and transition.
- **Registers:** a RAID register, a glossary, and a stakeholder concern-to-view mapping.
- **Traceability.** One typed trace model, so every view agrees. It builds on D7. The requirement → driver → decision → component → product → contract → control → placement → evidence chain is printed in the SDD.
- **Views.** Failure-story walkthroughs and cross-view consistency checks.
- **Handoff.**
  - An implementation specification index that shares the architecture's identifiers.
  - Implementation status per element, with an as-built overlay.
- **Closes:** C6-11, K-21, X-09, X-26, X-27, X-30, X-34, C11-21–C11-23, C11-26, C11-27, C11-44 (9 medium, 4 low); DD deliverables-and-views, traceability.

**F17. Requirements as service promises, journeys and exception paths (Chapter 1).**
- **Before mechanisms are chosen.** A customer operation contract (the service promise).
- **Journeys as records.**
  - A promised outcome, a terminal-state set and a closure predicate.
  - An explicit unknown outcome.
  - Step contracts.
- **Exceptions.** Designed exception and recovery paths.
- **Requirement records carry:**
  - the consequence if violated, and the protected invariant and its authority;
  - rationale, status and a revisit trigger.
- **Constraints and rules.**
  - A constraint register with predicate, scope, change authority and harm prevented.
  - Versioned business rules as decision tables.
- **Context and stakeholders.**
  - An accountability-based stakeholder map, using F15's decision rights.
  - A record of what the team controls, influences or only observes.
  - A context-scoped vocabulary.
  - A benefit register.
- **Brownfield.** A behaviour baseline.
- **Closes:** C1-01–C1-19, C11-31 (3 high, 15 medium, 2 low); DD quality-method (functional requirements drafted as quality scenarios).

**F18. Logical decomposition and boundary design (Chapter 4).**
- **Domain records.**
  - Bounded contexts and a context map.
  - Subdomain classification.
- **Choosing boundaries.**
  - Derive boundaries from shared rules, invariants, change reasons and authority.
  - Compare candidate partitions, recorded as a Chapter 3 decomposition decision.
  - Validate the chosen one with change, partial-failure and ownership-transfer scenarios.
  - Bring trust and privilege boundaries into the decomposition.
- **Rules and coupling.**
  - Allowed and forbidden dependency rules, with architecture-test obligations.
  - Coupling evidence.
- **Ownership and coordination.**
  - Owners, using F15's decision rights.
  - Human tasks as architecture.
  - A coordination decision per journey.
- **Knowledge and output.**
  - Governed domain-design patterns.
  - The logical decomposition documented in the SDD.
- **Closes:** C4-01, C4-02, C4-04–C4-16, ch04-M1, ch04-M2, C5-19, C5-24–C5-27 (2 high, 15 medium, 5 low).

---

## 5. Suggested order

Release numbers are proposals; the owner confirms them.

0. **Before any library import: licence and source confirmation.** The owner or their counsel records the licence or permitted use and the SHA-256 of each handbook file. **Status today:** not confirmed. A review pack for counsel is still to be prepared.
1. **AIW v0.10.0-rc.10.73.7 (proposed): integrity.** D1–D20. Several are migrations, not patches, for example D9 and D7.
2. **Foundations other features depend on:**
   - F15's decision rights and standards register;
   - F7's business-service record and workload model;
   - F13's evidence ladder and claim register;
   - F1's record kinds, crosswalk and intake, once step 0 is done.
3. **Library slices**, each a candidate set until a second authorised person releases it:
   - Application Architecture Master and Enterprise Component Library Part 1, for components and patterns;
   - Cloud Infrastructure Master and Enterprise Component Library Part 3, for deployment blueprints and platform components;
   - security tactics and patterns;
   - product and technology entries.
4. **Selection paths:**
   1. F2, Chapter 5 component selection. Its invariant input waits for C4-03 in F8.
   2. F3, patterns as bundles. X-12 waits for F8 and F13.
   3. F4, Chapter 7 qualification, using F15's standards register.
5. **Deployment and runtime:**
   1. F5, topology and blueprints. The location gate completes with F9's key register.
   2. F10, capacity, failure and recovery. Its exercise evidence uses F13.
6. **Method depth**, in parallel tracks per chapter: F6, the rest of F7, F8, F9, F17 and F18.
7. **Delivery and assurance:** F11, F12, the rest of F13, F14 and F16.

**External authorities and their true status:**
- **Licence counsel:** not engaged.
- **Four-eyes knowledge approver** for library releases: not assigned. AIW, Sol and this review cannot release entries.
- **Independent architecture reviewer** for these findings: not started.
- **Production acceptance authority:** nothing here establishes production acceptance.

---

## 6. Chapter by chapter (summary)

Across the 13 units: **353 agent-verified gaps** (85 high, 216 medium, 52 low), plus the deep-dive gaps in CAPABILITY-DEEP-DIVES.md.

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

## 7. What the handbooks do not ask for, and what AIW already does

### Not asked for
- **STRIDE, PCI DSS and likelihood × impact scoring.** None of these appears in any of the 27 handbooks.
  - The QA Environment Handbook uses consequence and likelihood only to allocate test effort.
  - The Application Architecture Handbook goes further. Its Failure Mode Analysis section advises bounded experiments "rather than filling a spreadsheet with unsupported likelihood scores", and warns against "a single numerical risk score".
  - The yardstick for security is the handbooks' own method, which works through each element using spoofing, tampering, disclosure, denial of service and misuse of privilege.

### Already partly supported
The remaining work sits in the features named. The supported part is evidenced in the detail files and is not re-proposed; only the residue named in each feature is new work.

- **Threat elicitation.**
  - **Today:** the Model asks "what could go wrong here?" once for each unexamined contract crossing and each entry into a platform service or store. This is advice only and blocks nothing. The journey drafter drafts threats by four rules.
  - **Still a verified gap (F9):** a per-element checklist over the handbooks' categories, and a precondition field.
- **Survivor capacity.**
  - **Today:** the review desk sizes replicas and nodes so that Z−1 zones carry the full load. A capacity tool computes min((replicas − failed) × per-replica rate, downstream rate).
  - **Not yet:** survivors computed from recorded placements or qualified per-plan capacity (C10-06; F5, F10). The zone count it uses is defective (D8).
- **Error budgets.**
  - **Today:** AIW computes a time-based availability budget from Chapter 2 targets and checks each part against it.
  - **Still a gap (F7):** SLI definitions, denominators and a burn-rate policy.
- **Backward trace.**
  - **Today:** a layered backward trace from any record exists.
  - **Missing:** it rests on untyped Matrix chains and disagrees with other traversals (D7; F16).
- **Comparing deployment alternatives.**
  - **Today:** saved alternatives that hold Chapter 10 changes are compared on capacity and cost, and a person records the choice.
  - **Missing (F5):** governed blueprints, hard gates and an approach record.
