# AIW Living Canvas and Generative Architecture Cursor
## Target Product and System Architecture

**Status:** Proposed controlling target architecture  
**Programme position:** Post-rc.10.65 product-moat activation  
**Working name:** **Sol Living Architecture Brain**  
**Primary experience:** **Living Canvas + Generative Architecture Cursor (GAC)**

---

## 1. Executive decision

AIW should evolve from an architecture workbench that *analyses and recommends around a model* into a governed architecture co-creation environment that *actively helps the architect construct the model at the point of interaction*.

The Generative Architecture Cursor is the primary expression of this intelligence. It is not a decorative pointer, chatbot, floating assistant or static contextual menu. It is a stage-aware interaction system that understands:

- the current project and branch;
- the active lifecycle stage and viewpoint;
- the selected architecture scope;
- requirements, stakeholders, constraints and assumptions;
- quality scenarios, driver weights and design forces;
- accepted styles, patterns, tactics and ADRs;
- upstream-stage model objects and relationships;
- existing downstream objects, interfaces and lineage;
- enterprise policies and project standards;
- unresolved findings, obligations and evidence;
- the active governed Mind Factory knowledge release.

From this context, AIW presents a small set of ranked, valid and explainable next modelling actions. The architect selects, adjusts, previews and accepts an action. AIW then applies an atomic, reversible change set to the canonical architecture model and advances the co-creation session to the next unresolved scope.

### Product proposition

> **AIW turns requirements, quality drivers and architecture decisions into progressively refined, explainable and testable models through an intelligent canvas that guides every design decision.**

This interaction model should become AIW's defining moat.

---

## 2. What the product must feel like

The experience should combine the best qualities of:

- an IDE that understands the code being written;
- a CAD system that constrains invalid geometry;
- a senior architect who knows the project history;
- a visual modelling tool that preserves semantic meaning;
- a governed decision system that never hides assumptions or authority.

The user should feel that the canvas understands the architecture. The intelligence is experienced through:

- what becomes selectable;
- what is softly highlighted as the next unresolved scope;
- which actions appear beside the selected object;
- which candidate objects and relationships are proposed;
- which options are excluded or challenged;
- what ghost topology appears before acceptance;
- which obligations and tests are created with a decision;
- how the next lifecycle stage is derived from the previous one;
- how every suggestion explains its rationale, evidence and authority.

The experience must remain quiet. AIW thinks continuously, but normally shows only three to five contextually relevant actions.

---

## 3. Position within the AIW architecture

The Living Canvas does not replace the existing AIW foundations. It activates them.

### Existing foundations to retain

- Canonical architecture model and stable semantic identity.
- ArchitectureEvent, IntelligenceContext and IntelligenceResponse concepts.
- Deterministic validation, graph analysis, policy and eligibility.
- Governed Pattern DNA and knowledge-release pinning.
- Brain Signal Engine and noise budget.
- Human-approved, reversible change sets.
- Stage lineage and Viewbook projections.
- Pattern composition plans that generate nodes, relationships, interfaces, views and obligations.
- LLM Gateway authority boundaries.
- Review, evidence, SDD, fitness and conformance pipelines.

### New capability being introduced

AIW needs a first-class **Design Action Orchestrator** between the intelligence substrate and the canvas.

Its purpose is to convert project context and architecture knowledge into executable, ranked, canvas-native modelling actions.

---

## 4. Target runtime flow

```text
User gesture or lifecycle event
        ↓
Design Gesture Event
        ↓
Generative Context Assembler
        ↓
Deterministic Eligibility and Policy Engine
        ↓
Stage Transformation Grammar
        ↓
Governed Knowledge / Pattern DNA Retrieval
        ↓
Optional LLM Candidate Enrichment
        ↓
Candidate Fusion, Deduplication and Ranking
        ↓
Generative Action Menu
        ↓
Ghost Topology and Consequence Preview
        ↓
Canonical Validation and Preflight
        ↓
Human Accept / Edit / Reject / Defer
        ↓
Atomic Architecture Mutation Set
        ↓
Canonical Model + Lineage + Evidence + Audit
        ↓
Recompute intelligence and advance focus queue
```

No LLM output bypasses deterministic eligibility, policy, validation or human acceptance.

---

## 5. Intelligence layers

### 5.1 Layer A — Deterministic canonical authority

This layer owns architectural truth and mutation safety.

It determines:

- valid object types at a lifecycle stage;
- valid parent-child and decomposition relationships;
- valid relationship and interface semantics;
- required attributes and ports;
- stage transition eligibility;
- lineage rules;
- accepted policy and enterprise standards;
- pattern prerequisites, conflicts and mandatory obligations;
- quality-scenario completeness;
- stage completion and handoff readiness;
- whether a proposed mutation is safe, idempotent and reversible.

It must operate without an external model.

### 5.2 Layer B — Governed architecture knowledge

This layer consumes only approved, permitted and pinned Mind Factory releases.

It provides:

- architectural styles and decision forces;
- Pattern DNA;
- tactics and quality-attribute effects;
- component, interface and topology kits;
- anti-pattern and failure-mode detection;
- companions, conflicts and exclusions;
- obligations, risks and fitness tests;
- provider-neutral realizations and approved provider mappings;
- evidence and counterfactual explanations.

### 5.3 Layer C — Controlled LLM reasoning

This layer helps with ambiguity and generative breadth. It may:

- interpret unstructured requirements;
- infer candidate responsibilities and domain concepts;
- propose alternative decompositions;
- suggest names and concise descriptions;
- identify implied relationships;
- draft interface descriptions;
- ask clarification questions;
- explain trade-offs and consequences;
- generate candidate stage plans.

It may not:

- score authoritative readiness;
- override deterministic constraints;
- activate candidate knowledge;
- approve a decision;
- mutate the canonical model directly;
- represent an inference as a fact.

### 5.4 Layer D — Design Action Orchestrator

This is the new product-critical layer.

It combines eligible deterministic actions, Pattern DNA actions and optional LLM candidates into one ranked set. It must:

- remove duplicates and semantically equivalent choices;
- preserve authority class;
- rank by current stage, scope, driver fit and decision consistency;
- enforce a visible noise budget;
- prepare previewable mutation sets;
- expose why each option appears now and here;
- provide alternatives and omission consequences;
- support learning from accept/reject outcomes without rewriting approved knowledge.

---

## 6. Core domain contracts

### 6.1 DesignGestureEvent

A design gesture is richer than the existing model-change event. It includes intent at the canvas interaction boundary.

Representative kinds:

- `scope-hovered`
- `scope-selected`
- `scope-opened`
- `empty-canvas-invoked`
- `decompose-requested`
- `candidate-requested`
- `candidate-previewed`
- `candidate-edited`
- `candidate-accepted`
- `candidate-rejected`
- `candidate-deferred`
- `scope-finalized`
- `stage-finalization-requested`
- `stage-handoff-accepted`

Every event carries tenant, project, branch, revision, user, role, stage, viewpoint, decomposition level, selected scope and interaction coordinates.

### 6.2 GenerativeDesignContext

The context must include more than stage and selection ID. It must include:

- tenant, project, branch and revision;
- active lifecycle stage and target stage;
- active viewpoint and decomposition level;
- selected scope and its semantic neighbourhood;
- unresolved upstream scopes;
- complete upstream-stage model projection;
- current-stage nodes, relationships, interfaces and boundaries;
- requirements, objectives, stakeholders, constraints and assumptions;
- quality scenarios, weights, conflicts and calibration state;
- design forces;
- accepted styles, patterns, tactics and ADRs;
- obligations, findings, waivers and evidence;
- enterprise policies and project standards;
- active knowledge release and permitted claim set;
- user role, permission and selected autonomy mode;
- recent accepted and rejected actions.

### 6.3 GenerativeActionOption

Every option must carry:

- stable action ID and semantic key;
- action type;
- target stage and scope;
- concise label and preview description;
- authority class;
- rank and confidence;
- eligibility and prerequisites;
- rationale and `whyNow` / `whyHere` explanations;
- supported requirements and quality scenarios;
- implicated styles, patterns and tactics;
- quality benefits and trade-offs;
- risks and mandatory obligations;
- source claims and knowledge release;
- proposed mutation set;
- inverse mutation set;
- expected stage-coverage effect;
- alternatives and omission consequence.

Authority classes:

- `deterministic-required`
- `deterministic-eligible`
- `knowledge-recommended`
- `architecture-inference`
- `llm-proposed`
- `architect-created`

These classes must be visually distinguishable.

### 6.4 ArchitectureMutationSet

The current change-set vocabulary must expand to support:

- create, update and remove node;
- create, update and remove relationship;
- create, update and remove interface;
- create ports and bind contracts;
- create and resize boundaries;
- assign parent/child scope;
- create architecture views and layers;
- accept style, pattern or tactic;
- create obligation, risk, finding and fitness test;
- create or update ADR;
- create lineage link;
- set property or authority state;
- mark scope complete;
- navigate or focus.

Every mutation set must contain:

- preconditions;
- idempotency key;
- validation results;
- affected semantic IDs;
- before/after summary;
- provenance;
- risk classification;
- explicit approval requirement;
- inverse operations for rollback.

### 6.5 StageDecompositionSession

Each design stage needs a session model containing:

- source stage and target stage;
- upstream scopes eligible for refinement;
- active focus scope;
- completed, skipped, deferred and unresolved scopes;
- accepted proposals per scope;
- unresolved interfaces and lineage gaps;
- stage coverage and readiness;
- pending clarification questions;
- finalization checklist;
- session history and resume point.

This prevents the cursor experience from becoming a sequence of disconnected suggestions.

### 6.6 StageTransformationGrammar

Each transition grammar must define:

- source-stage entity families;
- target-stage entity families;
- one-to-one, one-to-many, many-to-one and preservation rules;
- decomposition versus realization semantics;
- relationship propagation and remapping rules;
- interface derivation rules;
- boundary derivation rules;
- required component and interface kits;
- quality-driver-to-tactic mappings;
- tactic-to-pattern mappings;
- pattern-to-topology mappings;
- required evidence and obligations;
- completion and handoff rules.

The grammar is not a static kind lookup. It is a governed, testable architecture transformation contract.

---

## 7. Canvas interaction model

### 7.1 Focus guidance

On entering a stage, AIW highlights upstream objects that can be refined. Visual states:

- **Ready to refine** — soft pulse or outline.
- **In progress** — active focus halo.
- **Complete** — subtle check state.
- **Deferred** — visible but muted.
- **Blocked** — warning marker with reason.
- **External/preserved** — non-decomposable indication.

### 7.2 Contextual action halo

Selecting an eligible object opens a compact action halo anchored beside it. The default menu contains no more than five actions.

Examples:

- Decompose this system
- Apply recommended structure
- Add required interface
- Compare decomposition options
- Explain quality-driver implications

The menu is generated from context, not from a static object-type list.

### 7.3 Progressive choice

After selecting an action, AIW may show concise chips or cards for candidate choices. The user can choose one, several, or a composed option.

Examples:

- Web application
- Mobile application
- API application
- Transaction service
- Event-processing worker
- Operational database

Each option can expose a short rationale on hover or focus.

### 7.4 Ghost topology

Before mutation, AIW renders proposed objects and relationships as a ghost topology:

- semi-transparent nodes;
- dashed candidate connections;
- highlighted external relationship remapping;
- new interfaces and boundaries;
- obligation and risk badges;
- before/after counts;
- projected lineage and coverage.

### 7.5 Consequence preview

A compact consequence tray shows:

- requirements and drivers supported;
- patterns and tactics applied;
- mandatory obligations;
- risks and trade-offs;
- evidence and confidence;
- whether the option is deterministic, knowledge-derived or LLM-proposed.

### 7.6 Commit and continuation

The architect may:

- Accept
- Edit then accept
- Compare alternatives
- Reject with reason
- Defer
- Ask AIW to explain

After acceptance, the mutation is committed atomically, intelligence is recomputed and the next unresolved upstream scope is highlighted.

### 7.7 Stage finalization

When all scopes are complete or dispositioned, AIW offers **Finalize stage**. Finalization runs:

- completeness checks;
- lineage coverage;
- relationship and interface completeness;
- quality-driver coverage;
- obligation status;
- pattern consistency;
- open assumption and evidence checks;
- downstream handoff readiness.

The architect receives a reviewable stage handoff, not an opaque score.

---

## 8. Progressive autonomy

### Guide mode

AIW proposes one next modelling action at a time. Best for learning, complex decisions and highly governed projects.

### Compose mode

AIW proposes a coherent local topology for the selected scope. Best for normal professional authoring.

### Draft stage mode

AIW produces a complete candidate model for the target stage, organized into scope-level change sets. The architect reviews, edits and accepts it in parts.

No mode permits silent direct mutation.

---

## 9. C4 exemplar

C4 is an important interaction exemplar, but it must remain a projection over AIW's canonical metamodel rather than becoming the whole model.

### 9.1 Context to containers

Inputs:

- system of interest;
- people and external systems;
- use cases and interactions;
- requirements and constraints;
- quality drivers and scenarios;
- accepted style and patterns;
- enterprise policies.

Process:

1. AIW identifies context objects eligible for decomposition.
2. The architect selects the system of interest.
3. AIW proposes container responsibilities and types.
4. Candidate containers are ranked by required responsibilities, interfaces, data ownership and quality tactics.
5. AIW previews internal relationships and remaps context-level external interactions to container-level interfaces.
6. The architect accepts, modifies or rejects the proposed topology.
7. AIW repeats for the next eligible context object.
8. Stage finalization validates that every upstream relationship has been preserved, refined or explicitly dispositioned.

### 9.2 Containers to components

Inputs:

- selected container;
- its responsibilities;
- inbound and outbound contracts;
- data ownership;
- patterns and tactics;
- quality scenarios;
- security and operational obligations.

Process:

1. AIW proposes component roles rather than arbitrary technical classes.
2. It derives candidate interfaces and internal collaborations.
3. Pattern DNA may introduce required supporting components.
4. The architect previews the component topology.
5. Accepted components retain lineage to their container, requirements, patterns and quality drivers.

Example:

A transaction-processing container with transactional consistency, auditability and asynchronous publishing may produce candidate components such as:

- Transaction Controller
- Command Handler
- Validation Policy
- Transaction Repository
- Outbox Store
- Outbox Publisher
- Idempotency Manager
- Fraud Adapter

Accepting the Transactional Outbox pattern also creates obligations for delivery semantics, retries, idempotency, monitoring and dead-letter handling.

---

## 10. AIW lifecycle grammars beyond C4

The Living Canvas must support all canonical AIW stages.

### Requirements → Quality Drivers

- Extract measurable quality scenarios from objectives and constraints.
- Highlight ambiguous or unmeasured requirements.
- Propose driver conflicts and prioritization choices.

### Quality Drivers → Logical Application

- Convert business responsibilities and quality forces into domains, capabilities, logical services, APIs, events and data ownership.
- Make every proposed element traceable to intent or an accepted architecture decision.

### Logical Application → Application Realization

- Refine logical responsibilities into modules, deployable units, workers, adapters and contracts.
- Preserve and refine external and internal relationships.

### Application Realization → Logical Technology

- Derive platform capabilities for runtime, integration, identity, data, security, observability, resilience and delivery.
- Use tactics and obligations rather than generic one-to-one technology placeholders.

### Logical Technology → Physical Technology

- Map capabilities to provider-neutral products, deployment nodes, regions, zones, networks, clusters and environments.
- Apply provider overlays only after the neutral design is accepted.

### Review & Assurance

- Guide the reviewer from findings to affected objects, evidence, decision and disposition.
- Allow accepted remediation to become governed change sets.

### SDD Pack

- Guide the architect through missing narrative, evidence, diagrams and decisions.
- Generate the document from the accepted canonical model and evidence ledger.

---

## 11. Quality-driver reasoning chain

AIW must never jump directly from a quality attribute to a branded technology.

The minimum explainable chain is:

```text
Business objective
→ quality scenario
→ design force
→ tactic
→ style/pattern implication
→ logical responsibility
→ component/interface obligation
→ technology capability
→ physical realization
→ fitness test and evidence
```

Example:

```text
Availability target
→ tolerate application-instance failure
→ redundancy + health monitoring tactics
→ stateless processing + failover pattern
→ multiple service instances and resilient state handling
→ load distribution, orchestration and telemetry capabilities
→ multi-zone deployment topology
→ failover and recovery fitness tests
```

Every generated object should be able to answer: **Why do I exist?**

---

## 12. Mind Factory role

The Mind Factory is the governed knowledge supply chain for the Living Canvas.

It must supply:

- normalized patterns and tactics;
- generative component and interface kits;
- transformation grammar fragments;
- quality-driver effects;
- prerequisites and exclusions;
- failure modes and anti-patterns;
- obligations and fitness tests;
- evidence and counterfactual explanations;
- approved provider-neutral and provider-specific realizations.

### Feedback loop

User outcomes may improve ranking and editorial priorities, but they may not silently rewrite approved knowledge.

The system should record:

- accepted and rejected actions;
- rejection reasons;
- edits made before acceptance;
- frequently missing pattern-kit elements;
- clarification questions that resolved ambiguity;
- expert reviewer disposition;
- stage-level completeness and rework.

These signals enter a Mind Factory review queue. Curators decide whether to enrich Pattern DNA, stage grammar or ranking policy.

---

## 13. Trust, safety and truthfulness

The UI must visibly distinguish:

- fact;
- architect decision;
- deterministic requirement;
- governed recommendation;
- architecture inference;
- LLM proposal;
- unresolved question;
- verified evidence.

Required safeguards:

- no silent model mutation;
- no candidate or discovery knowledge in production recommendations;
- no direct provider calls from the canvas;
- no LLM authority over scoring, policy or approval;
- all generated content tied to project revision and knowledge release;
- all accepted changes audited with actor and rationale;
- rollback available for every generated mutation set;
- stale proposals invalidated when the underlying revision changes;
- tenant and branch isolation enforced during context assembly and mutation.

---

## 14. Non-functional expectations

### Latency budgets

- Contextual action halo after selection: target under 150 ms for deterministic actions.
- Governed knowledge ranking: target under 400 ms from local/enterprise retrieval.
- LLM-enriched candidates: progressive response; deterministic menu remains available immediately.
- Ghost preview for local change set: target under 300 ms.
- Commit and recompute for typical local topology: target under 500 ms.

### Scale

The cursor must remain usable on:

- 1,500-node canonical models;
- 5,000 relationships;
- nested scope hierarchies;
- large Viewbook projections;
- concurrent recommendation sessions.

Recommendations should be calculated against a scoped semantic neighbourhood rather than recomputing the entire graph synchronously on every pointer movement.

### Accessibility

The same experience must be available without a mouse:

- keyboard focus of eligible scopes;
- command to open contextual actions;
- arrow-key navigation through candidates;
- accessible descriptions of ghost topology;
- screen-reader announcement of authority, rationale and consequences;
- no meaning conveyed solely by colour or animation;
- reduced-motion mode.

---

## 15. Target front-end components

- `GenerativeCursorController`
- `ScopeFocusQueue`
- `ContextualActionHalo`
- `CandidateChoicePopover`
- `GhostTopologyLayer`
- `ConsequencePreviewTray`
- `AuthorityBadge`
- `StageDecompositionProgress`
- `StageFinalizeGate`
- `GenerativeActionHistory`
- `ExplainRecommendationDrawer`
- `AutonomyModeSelector`

These should be product-owned components, not release-numbered overlays.

---

## 16. Target backend/domain services

- `GenerativeContextService`
- `DesignActionOrchestrator`
- `DeterministicEligibilityService`
- `StageTransformationGrammarService`
- `PatternCompositionAdapter`
- `RelationshipPropagationService`
- `InterfaceDerivationService`
- `CandidateFusionAndRankingService`
- `GenerativePreviewService`
- `ArchitectureMutationService`
- `ProposalStalenessService`
- `DesignSessionService`
- `GenerativeActionAuditService`
- `MindFactoryOutcomeFeedbackService`

---

## 17. Programme re-baseline

The planned enterprise pilot should not validate the old interaction model. The Living Canvas should be inserted before broad pilot outcome validation.

### rc.10.66 — Living Canvas Intelligence Contracts and Deterministic Cursor

Deliver:

- full GenerativeDesignContext;
- DesignGestureEvent;
- GenerativeActionOption;
- expanded ArchitectureMutationSet;
- StageDecompositionSession;
- deterministic action orchestrator;
- stage transformation grammar framework;
- scope focus queue;
- contextual action halo;
- ghost topology preview;
- Requirements/Quality → Logical Application and Logical Application → Application Realization pilot grammars.

### rc.10.67 — Generative Architecture Cursor and Progressive Stage Co-Creation

Deliver:

- all lifecycle transformation grammars;
- relationship and interface propagation;
- Pattern DNA generative kits;
- Guide, Compose and Draft Stage modes;
- stage finalization gates;
- C4 context/container/component projection;
- Viewbook continuity during co-creation;
- accessible keyboard journey.

### rc.10.68 — Governed LLM Co-Creation and Mind Factory Learning Loop

Deliver:

- LLM decomposition and candidate-generation task contracts;
- candidate fusion and contradiction handling;
- ambiguity clarification;
- alternative local topologies;
- authority-aware explanations;
- accept/reject/edit feedback capture;
- curator review queue for knowledge and grammar improvement;
- offline/private-model equivalence profile.

### rc.10.69 — Expert Architecture Outcome Pilot

Measure:

- model creation time;
- number of manual catalogue searches avoided;
- stage lineage completeness;
- interface completeness;
- quality-driver coverage;
- recommendation acceptance, rejection and edit rates;
- expert correctness assessment;
- design rework;
- ADR and SDD preparation time;
- architect trust and cognitive load.

---

## 18. Definition of success

The Living Canvas is successful when an architect can:

1. create a project and define requirements and quality drivers;
2. enter a modelling stage and immediately see which upstream scopes require refinement;
3. select one scope and receive a small set of contextually correct modelling options;
4. preview a coherent topology with relationships, interfaces, obligations and lineage;
5. understand why every element is proposed;
6. accept, edit, reject or defer the proposal;
7. repeat the flow until the stage is complete;
8. finalize the stage with explicit coverage and handoff evidence;
9. progress through the full lifecycle without manually rebuilding context or browsing an undifferentiated catalogue;
10. generate a reviewable Viewbook and SDD in which every material element traces to intent, knowledge and accountable decisions.

That is the point at which the AIW architecture brain is not merely present in the product—it is experienced as the product.
