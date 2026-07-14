# rc.10.65 Assessment Against the AIW Living Canvas Vision

**Assessed package:** `AIW_v0.10.0-rc.10.65.0_Backend_Domain_Decomposition_Pilot_Readiness_Professional_SDD_FULLDIST`  
**Assessment type:** Static code and architecture audit against the proposed Living Canvas / Generative Architecture Cursor target  
**Important boundary:** This assessment does not claim a fresh end-to-end browser acceptance run. It distinguishes implemented foundations from the actual target user experience.

---

## 1. Executive verdict

rc.10.65 contains many of the correct architectural foundations, but it does **not** yet implement the Living Canvas or Generative Architecture Cursor experience.

The current intelligence is mainly:

- event-driven;
- advisory;
- recommendation-oriented;
- review-oriented;
- expressed through panels, badges, findings and generic next actions.

The target intelligence must become:

- stage-transformational;
- scope-aware;
- generative;
- canvas-native;
- executable through previewable modelling actions;
- continuous across upstream and downstream lifecycle models.

### Directional maturity assessment

| Dimension | Directional maturity | Assessment |
|---|---:|---|
| Canonical model and semantic foundations | 75% | Strong basis for generative interaction. |
| Deterministic intelligence and policy boundaries | 70% | Correct authority model, but context and action vocabulary are too narrow. |
| Governed Pattern DNA composition | 70% | Strong change-plan substrate; not yet integrated as the cursor's native action engine. |
| Stage transformation intelligence | 25% | Static, generic mappings for only three transitions. |
| LLM generative modelling contracts | 15% | Explanation and drafting tasks exist; decomposition generation does not. |
| Canvas-native intelligent interaction | 15% | Selection, inspector and badges exist; no contextual generative cursor loop. |
| End-to-end Living Canvas experience | 20% | Foundations are present, but the differentiating interaction is not implemented. |

These percentages are directional engineering judgments, not measured acceptance scores.

---

## 2. Foundations that are genuinely useful

### 2.1 Unified intelligence kernel

Relevant code:

- `frontend/packages/engine/src/intelligenceKernel.ts`
- equivalent backend engine package

The release already contains:

- typed architecture events;
- a common intelligence context;
- a common intelligence response;
- findings and recommendations;
- suggested components and relationships;
- explanation and trace structures;
- reviewable change sets;
- governed knowledge release references.

**Disposition:** Retain and evolve. Do not build a separate cursor intelligence stack.

### 2.2 Correct LLM authority principle

The kernel comments and gateway policy preserve the correct division:

- deterministic code owns invariants, policy, eligibility and mutation safety;
- governed knowledge supplies architectural judgment;
- LLMs enrich language and reasoning, not truth;
- user outcomes may tune ranking but not rewrite approved knowledge.

**Disposition:** Preserve as a non-negotiable architecture invariant.

### 2.3 Brain Signal Engine and quiet intelligence

Relevant code:

- `frontend/packages/brain-runtime/src/types.ts`
- signal orchestration and presentation packages

The release has:

- source and authority classes;
- severity and surface routing;
- canvas badges;
- library chips;
- stage-health signals;
- Info Center, Decision Radar and Co-Architect surfaces;
- noise-budget concepts.

**Disposition:** Retain for critique, readiness and evidence signals. Extend it to receive cursor outcomes, but do not make it the mutation engine.

### 2.4 Pattern composition plan

Relevant code:

- `frontend/packages/domain/src/patternIntelligence.ts`
- `frontend/packages/engine/src/patternIntelligence.ts`

The pattern composition capability can already plan:

- nodes;
- relationships;
- interfaces;
- architecture views;
- obligations;
- quality effects;
- canonical checks;
- rollback;
- idempotency;
- provenance.

**Disposition:** This should become the principal mutation-plan adapter for knowledge-derived cursor actions.

### 2.5 Canonical decomposition hierarchy

Relevant code:

- `frontend/packages/modelling/src/interactiveDecomposition.ts`

The package supports:

- hierarchy and parent-child structure;
- drill-down levels;
- breadcrumb navigation;
- visible-scope filtering;
- validation for missing parents and boundary-crossing problems.

**Disposition:** Use this as the scope-navigation foundation for C4-style and other decomposition journeys.

### 2.6 Viewbook and stable projections

The package supports multiple architecture views and decomposition levels. This is important because the cursor must mutate the canonical model while the views remain projections.

**Disposition:** Integrate Viewbook directly into stage co-creation and preview rather than treating it primarily as a read-only output navigator.

---

## 3. Critical gaps

## 3.1 IntelligenceContext is too shallow

Current context in `frontend/packages/engine/src/intelligenceKernel.ts` includes:

- stage;
- workspace;
- knowledge release;
- selection ID;
- quality-driver weights;
- accepted styles and patterns;
- counts for obligations, nodes, edges and lineage gaps;
- brief gaps and limited regulatory/maturity context.

It does not carry the complete target context needed for generative modelling:

- tenant, branch and revision authority;
- active viewpoint and decomposition level;
- selected scope hierarchy and semantic neighbourhood;
- prior-stage model projection;
- unresolved upstream scope queue;
- detailed requirements, objectives and stakeholders;
- quality scenarios and design forces;
- accepted decisions and tactics;
- interfaces and relationship obligations;
- findings, evidence and waivers;
- enterprise policies;
- autonomy mode and prior accept/reject outcomes.

**Impact:** The kernel can rank generic items but cannot reliably generate the next stage model for a specific scope.

**Required change:** Introduce `GenerativeDesignContext` as a versioned superset of IntelligenceContext.

---

## 3.2 Change-set operations cannot build a model

Current `IntelligenceChangeOperation` supports only:

- `create-relationship`;
- `set-attribute`;
- `open-decision`;
- `navigate`.

It cannot express:

- create or remove node;
- create interface or port;
- create boundary;
- assign hierarchy;
- create obligation, risk, finding, ADR or fitness test;
- create lineage;
- create a view;
- apply a composed topology;
- finalize a scope or stage.

**Impact:** Intelligence responses cannot become complete, previewable architecture construction actions.

**Required change:** Replace or version this with a comprehensive `ArchitectureMutationSet` and inverse operations.

---

## 3.3 Stage transitions are static type mappings

Relevant code:

- `frontend/packages/modelling/src/canonicalArchitecture.ts`
- `createStageTransitionProposal()`

Current automatic mappings cover only:

- Application Realization;
- Logical Technology;
- Physical Technology.

The mapping is a static source-kind-to-target-kind lookup. It produces generic labels such as Application, Service, Capability or Product Binding.

It does not use:

- requirements or responsibilities;
- quality scenarios or tactics;
- accepted styles and patterns;
- data ownership;
- interface semantics;
- external relationship propagation;
- security, resilience and observability obligations;
- enterprise policy;
- Mind Factory generative kits;
- LLM reasoning.

It also lacks automatic contracts for:

- Requirements/Quality Drivers → Logical Application;
- Review & Assurance → SDD delivery.

**Impact:** The model can become technically linked but semantically thin. It cannot perform the user's context-to-container-to-component guided decomposition.

**Required change:** Replace static lookup mappings with governed `StageTransformationGrammar` services.

---

## 3.4 Upstream relationships are not meaningfully refined

The transition implementation creates lineage edges from source nodes to generated target nodes. It does not systematically:

- preserve an upstream interaction;
- remap it to downstream providers and consumers;
- create corresponding interfaces;
- identify unresolved external relationships;
- ask the architect to disposition ambiguous mappings;
- validate that all prior-stage relationships were preserved, refined or explicitly excluded.

**Impact:** AIW cannot automatically convert a context-level relationship into container-level or component-level connections.

**Required change:** Add `RelationshipPropagationService` and `InterfaceDerivationService` to each transformation grammar.

---

## 3.5 Brain actions are advisory, not generative

Current `BrainSignalAction` kinds include:

- open information;
- open radar;
- ask Co-Architect;
- apply fix;
- accept pattern;
- define interface;
- open stage;
- dismiss.

There are no first-class actions for:

- decompose selected scope;
- generate candidate containers/components;
- apply a local topology;
- compare decompositions;
- map upstream relationships;
- mark scope complete;
- finalize stage.

**Impact:** The brain can alert the architect but cannot become the primary construction interaction.

**Required change:** Add a separate `GenerativeActionOption` contract. Brain signals may point to these actions but should not replace them.

---

## 3.6 LLM task contracts do not generate architecture decomposition

Current LLM task types include:

- explain style fit;
- compare pattern trade-offs;
- critique architecture;
- draft interface contract;
- prepare review notes;
- draft SDD section;
- generate design interview questions.

Missing tasks include:

- infer candidate responsibilities;
- propose domain/capability decomposition;
- generate container candidates;
- generate component candidates;
- propose relationship and interface mapping;
- produce alternative local topologies;
- explain omitted elements;
- generate clarification questions specific to a proposed stage transformation.

**Impact:** The LLM can discuss the architecture but cannot participate in controlled model co-creation.

**Required change:** Introduce structured, schema-validated generative modelling tasks routed through the existing gateway.

---

## 3.7 Canvas selection opens an inspector, not an intelligent action loop

Relevant code:

- `frontend/apps/web/src/features/canvas/ProCanvasViewSystem.tsx`

The current interaction supports normal selection, drag/drop, inspector, library preview and brain badges. Selecting a node primarily selects the object and opens inspection context.

Missing experience elements:

- eligible-scope highlighting;
- cursor-anchored action halo;
- stage focus queue;
- generated candidate menus;
- ghost topology;
- before/after relationship mapping;
- compact consequence preview;
- scope completion and automatic progression;
- user-selectable Guide/Compose/Draft Stage autonomy.

**Impact:** The canvas feels like an intelligent modelling tool around the edges, not a JARVIS-like co-creation surface.

**Required change:** Add a dedicated Living Canvas interaction controller rather than extending the inspector with more cards.

---

## 3.8 Viewbook drill-down is largely read-only

The Viewbook can display semantic views and support drill-down, but its nodes are generally not an authoring surface.

**Impact:** The architect cannot fluidly move from viewing a system to generating its containers or from a container to generating its components within the same semantic navigation experience.

**Required change:** Share the scope/decomposition controller between Viewbook and the authoring canvas. A view may remain protected in Review mode, but Design mode needs generative actions against the same identities.

---

## 3.9 No persistent stage decomposition session

There is no first-class session tracking:

- which upstream scopes have been refined;
- which were skipped or deferred;
- which proposals were accepted;
- which relationships remain unresolved;
- where the architect should resume;
- what is required before finalization.

**Impact:** A sequence of recommendations cannot become a coherent stage-building workflow.

**Required change:** Persist `StageDecompositionSession` with resumable focus and coverage.

---

## 3.10 Mind Factory knowledge is not yet generative enough

Pattern DNA has useful topology and obligation structures, but the full corpus is not guaranteed to provide stage-specific:

- component kits;
- interface kits;
- transformation fragments;
- quality-driver tactics;
- relationship propagation rules;
- decomposition alternatives;
- counterfactual omission explanations.

**Impact:** The action orchestrator could fall back to generic menus and create the appearance of fake intelligence.

**Required change:** Add a generative-depth score and make high-impact Pattern DNA and stage kits meet a minimum executable standard.

---

## 4. Architectural disposition

### Retain

- canonical model;
- ArchitectureEvent and intelligence kernel;
- governed knowledge retrieval;
- Pattern DNA composition planning;
- Brain Signal Engine;
- LLM Gateway boundaries;
- Viewbook projections;
- decomposition hierarchy;
- evidence, audit and human approval.

### Extend

- IntelligenceContext → GenerativeDesignContext;
- ArchitectureEvent → DesignGestureEvent projection;
- change sets → full ArchitectureMutationSet;
- Pattern composition → cursor action adapter;
- stage transition service → transformation grammar;
- LLM task contracts → structured decomposition tasks;
- Viewbook → shared authoring/decomposition spine.

### Replace or retire

- static stage kind mappings as the primary transformation mechanism;
- generic one-to-one generated capability/product placeholders;
- any fixed contextual menu presented as intelligence;
- duplicate recommendation logic outside the action orchestrator;
- canvas flows that require users to leave the selected scope to browse a generic catalogue for routine next actions.

---

## 5. Recommended implementation order

### Slice 1 — Contract and kernel correction

1. Version the intelligence context.
2. Add design gesture events.
3. Add generative action and mutation contracts.
4. Add stage decomposition sessions.
5. Create a deterministic action orchestrator.
6. Adapt existing pattern composition plans to the new mutation format.

### Slice 2 — First vertical journey

Implement one complete, production-quality golden flow:

**Requirements + Quality Drivers → System Context → Containers → Components**

It must prove:

- scope highlighting;
- contextual options;
- quality-driver-influenced ranking;
- relationship remapping;
- interface creation;
- ghost preview;
- human acceptance;
- lineage;
- stage finalization;
- Viewbook and SDD continuity.

### Slice 3 — Remaining AIW lifecycle

Extend the grammar and cursor to:

- Logical Application;
- Application Realization;
- Logical Technology;
- Physical Technology;
- Review remediation;
- SDD completion.

### Slice 4 — LLM and Mind Factory activation

Add structured LLM decomposition candidates, governed fusion, feedback and curator improvement workflows only after the deterministic vertical journey is solid.

---

## 6. Acceptance criteria for the first real implementation

The release fails if any of the following is true:

- every selected object produces the same generic menu;
- suggestions ignore prior-stage relationships;
- a quality-driver change does not alter candidate ranking or obligations;
- LLM proposals can be committed without deterministic validation;
- generated objects lack requirement, pattern or decision lineage;
- relationship and interface changes are not previewed;
- accepting a pattern does not create its mandatory obligations;
- the user must search a generic library to perform routine decomposition;
- the cursor cannot resume an interrupted stage session;
- a stage can finalize with undispositioned upstream scopes or broken lineage;
- accepted actions cannot be undone;
- candidate or discovery knowledge influences authoritative recommendations;
- the experience is unavailable by keyboard.

---

## 7. Final assessment

rc.10.65 is not a failed foundation. It contains a substantial portion of the platform needed to build the Living Canvas correctly.

The missing piece is the architecture and product layer that converts intelligence into **scope-specific, executable, previewable and progressive modelling actions**.

The programme should therefore avoid adding another advisory panel or a larger Co-Architect chat surface. The next release should make the canvas itself the primary intelligence interface.
