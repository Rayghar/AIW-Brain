# AIW modelling direction: a connected architecture workbench

Accepted research and implementation direction · 23 September 2026

Implementation status is recorded separately in [MODELLING-IMPLEMENTATION.md](MODELLING-IMPLEMENTATION.md). The assessment below describes the v49 starting point.

This brief supersedes the earlier canvas-focused direction. It is a product and engineering proposal, not an implementation-completion report. The current v49 application has the canvas-space improvements; the connected exploration, semantic authoring and interoperability work below remains to be delivered. No application code or deployment was changed during this assessment.

**Product proposition.** AIW should let an architect examine a system as a coherent whole, expose its internal structure, follow its behaviour, trace each realization, understand the reasons for its design, and make a reviewable change. The same architectural meaning should travel into enterprise repositories and other modelling tools. A beginner should be able to understand the design without reconstructing connections between eleven chapter screens.

## 1. What the other approaches teach us

This is a review of current official documentation, not a hands-on evaluation of licensed installations. The AIW implications are product judgments; they are not claims that another vendor lacks a feature.

| Approach | Documented capability | Implication for AIW |
| --- | --- | --- |
| OrbusInfinity | A shared repository reuses objects across models and views. Traceability views traverse typed relationships and expose object and relationship attributes. Impact Explorer expands related objects and saves an exploration state. [1–3] | Give objects and relationships identity, semantics and ownership before rendering them. Let enterprise architecture consumers use the resulting design through their established repository. |
| Ilograph | Resources recur across perspectives. Contexts change their surrounding organization while preserving the perspective's relationships. Browsing supports retained resource selection, levels of detail and guided walkthroughs. [4–6] | This is the closest interaction precedent for the surgeon analogy: hold the subject steady while changing what is revealed around it. |
| Eraser | AI-assisted authoring produces editable diagrams; diagram-as-code supports architecture, sequence, data and process representations. Its architecture syntax distinguishes nodes, groups and connections. [7–9] | Make creation and revision direct and visually polished. Use a representation suited to the question, while AIW retains the underlying architectural semantics. |
| Structurizr | Multiple C4 views derive from one model. Filtered views can share manual positions, and dynamic views describe ordered interactions using existing model relationships. [10–12] | Preserve model consistency, distinguish levels of detail and retain spatial anchors. A new view must not require a duplicate architecture. |

AIW's proposed emphasis is the combination of continuous exploration, guided design reasoning and portable model semantics. It should function on its own and alongside a repository such as OrbusInfinity. This comparison does not justify rebuilding every feature of those products.

## 2. Current AIW shortcomings

The code reviewed is the v49 explorer at commit 2aec2acb8865a7f714e18316272d69f18e952b7e.

| Current behaviour | Consequence | Required change |
| --- | --- | --- |
| Changing chapters resets focus, zoom, pan and layer visibility, even though selection is sometimes carried forward. | The learner repeatedly loses the visual frame of the architecture. | Separate the design method from the exploration state. Preserve scope, selection and a useful return location. |
| The main canvas lays out similarly sized cards in layer rows. | Responsibilities, components, shared platforms and deployment instances look too similar. | Introduce semantic nesting, typed visual forms, interaction paths and connected realization views. |
| Technology capabilities and technology realization records both render in the technology layer. | What a system needs is difficult to distinguish from the chosen implementation. | Model and display capability, product/configuration choice and deployed instance distinctly. |
| Focus selects immediate graph neighbours. | A module's complete implementation path and shared dependencies are not consistently visible. | Use explicit traversal rules for module internals, realization lineage, interfaces and external dependencies. |
| Logical groups cover one part of the design; other concerns use separate projections. | A functional module cannot yet serve as a dependable exploration anchor throughout the design. | Give scopes, memberships, mappings and views consistent contracts across project domains. |
| Export handlers produce project/review JSON, documents, delivery data and interface specifications. No Orbus-specific adapter was located in the inspected source. | Document export cannot establish semantic interoperability with an enterprise modelling repository. | Add a mapped model-exchange contract and validate it with a real receiving tool. |

Relevant source areas: public/app.js; public/logical-domain.js; public/technology-model.js; public/technology-realisation-model.js; public/project-context.js; public/review-documents.js; worker.js.

The existing stable references, project records, realization mappings, evidence, proposal review, baselines and SDD generation are useful foundations. The next work should reconcile and extend these contracts. A connected rendering projection alone does not establish that every architectural relationship is already a fully governed model record.

## 3. Translating the surgeon analogy

A body has several overlapping organizations: organs, anatomical regions and systems such as circulation and the nervous system. Examining one organ still requires seeing the systems passing through it. Software architecture has the same challenge: a module participates in interactions, data ownership, security boundaries, technology support and deployment contexts.

A single hierarchy cannot express all of this. AIW needs to distinguish:

| Dimension | Question | Required behaviour |
| --- | --- | --- |
| Scope | Which system, module, component or interaction am I examining? | Enter and leave the subject without losing its surroundings. |
| Realization | What implements this responsibility, and what supports that implementation? | Follow explicit, potentially many-to-many mappings. |
| Concern | Am I examining behaviour, data, security, resilience or design rationale? | Retain the subject and reveal the relationships relevant to that question. |
| Context | Is this organized by functional area, owner, deployment location or trust boundary? | Change the organizing context without cloning or reclassifying the objects. |
| Design state | Is this the current working design, a proposal, a baseline or an observed deployment? | Keep identities traceable and make differences explicit. |

These are internal distinctions, not five additional header controls. The interface should expose them through a compact location indicator, contextual exploration actions and progressive detail.

The experience should support overview, isolation, cross-section, behaviour and intervention. A module expands in place; relevant external neighbours remain visible at lower detail. The user can reveal the mechanisms underneath, follow a transaction, inspect a shared dependency and compare a proposed change. A small whole-system overview and navigation history preserve orientation.

Two-dimensional nested and aligned views should carry the first implementation. An optional exploded arrangement of adjacent realization levels may help explain mappings. Visual depth must have a clear meaning; perspective, animation and decoration should not conceal relationships.

## 4. The semantic contract

Every architecturally meaningful item must be addressable. This includes requirements, quality scenarios, modules, responsibilities, components, interfaces, contracts, messages, data entities, stores, capabilities, technology choices, deployment instances, trust boundaries, policies, decisions, applied patterns, assumptions, evidence, tests and saved views.

Objects need stable identity, type, meaningful attributes, lifecycle, source references and revision history. Attributes require types, units and constraints where relevant. Information with its own identity or lifecycle—such as a contract, policy or quality scenario—should be a linked object rather than an opaque text field.

Relationships must be first-class records too: identity, relationship type, source and target roles, direction, scope, attributes, evidence and revision. A call can link its contract, exchanged data, authorization rule and timeout/retry policy. An implementation mapping can state coverage, rationale and unresolved gaps. The system must validate allowed endpoint types and cardinalities.

Preserve these distinctions:

- A logical responsibility, application implementation and deployed instance are different objects connected through realization and deployment relationships.
- Composition, membership, ownership, deployment, support, interaction and realization have different meanings.
- One responsibility may have several implementations; one implementation may fulfil several responsibilities.
- A shared broker or identity service can support several modules. Focusing on a module must not invent an exclusively owned copy.
- A model object can have several visual occurrences. Changing a view's position or visibility does not change model ownership or deployment.
- A product choice does not establish a deployed topology. A design path does not establish observed runtime behaviour.

Logical responsibilities can be shown inside their implementing components when that projection is clearly labelled as realization. Where mappings overlap, AIW should use aligned views, scoped references and explicit links. It must not invent containment to produce a convenient drawing.

A saved view should itself record purpose, scope, concern, organizing context, model version/baseline, projection rules, layout and annotations. Working views reflect the same accepted model revision. Frozen review views remain tied to their captured baseline.

## 5. The modelling experience

The canvas remains the primary workspace. Preserve the existing Work, Model, Validate and Output surfaces and the roles of Sol, Mind Factory and Cursor. The eleven chapters organize design work; the architecture can be explored across them without restarting the user's visual journey.

The earlier sidebar direction remains relevant: Project, Architecture Journey and model perspectives have distinct purposes. Avoid the tiny separately scrolling chapter window; let the lower perspective area use available scrolling space while retaining access to the whole journey. Object details appear on selection and can be dismissed, instead of consuming the headers.

| Question | Visual form |
| --- | --- |
| What does the solution do? | Modules and responsibilities with meaningful boundaries and high-level exchanges. |
| How is this implemented? | Nested or aligned realization views with cross-highlighting and explicit mappings. |
| How does a scenario work? | A selected path through the topology, linked to a sequence or timeline, including alternatives and failure paths. |
| Who owns and changes the data? | Data ownership and lineage, authoritative stores, messages and state transitions. |
| Where does it run and what can fail together? | Deployment topology, instances, shared platforms and failure domains. |
| What protects it? | Trust boundaries, identity paths, enforcement points, threats and control evidence. |
| Why this design? | Decisions, applied patterns, quality scenarios, assumptions and validation evidence attached to the affected objects. |

Use a consistent visual language: distinct object silhouettes and ports, readable labels, meaningful boundaries, restrained icons, clear relationship types and a legend. Vendor imagery belongs at the relevant implementation level. Colour supplements labels and line styles. Aggregate exchanges at overview scale must disclose their underlying relationships on inspection.

A beginner should see the answer to three questions at any time: where am I, what am I looking at, and what is the next useful thing to explore? The interface can offer a short guided story and let the user leave it to inspect any object. Story steps refer to saved model selections and paths, so explanation remains connected to the architecture.

Authoring must be direct. Reuse an existing object or create a typed object in context; connect compatible objects; edit the relationship's meaning; see what is affected. Changing a visual arrangement is separate from proposing a change in ownership, allocation or deployment. Reuse the existing proposal/acceptance pipeline for architectural changes, with selective application and reversible history. Navigation and layout adjustments should not require architecture approval.

## 6. Reasoning must act on the visible architecture

The Brain should receive the selected scope, concern, baseline, relevant model paths, open questions and eligible knowledge references. Sol can explain or navigate that context. Mind Factory compares alternatives on the same scope. Cursor makes each selected object's purpose, implementation, dependencies and rationale available without losing the canvas.

Styles, patterns and tactics need scope and an application record. For example, applying asynchronous delivery to a notification boundary must not imply that every module uses an event-driven style. The applied pattern should link its participants, prerequisite capabilities, relevant quality scenarios, obligations, alternatives and supporting evidence. Antipattern findings require an explained condition and affected scope.

Comparing a direct call with buffered delivery should show the actual proposed participants and relationships, the expected effect on the selected quality scenario, ordering and duplicate-handling obligations, recovery responsibilities and operational costs. The LLM helps interpret intent and explain choices. Structured checks establish whether prerequisites and constraints are met. The architect reviews a proposed model change.

Dependency reachability shows potential impact, not proof of an outage. Design walkthroughs, calculated estimates and observed measurements must remain distinguishable. Quantitative claims need an explicit calculation or measurement and its assumptions; arbitrary pattern scores cannot establish performance improvements.

Existing LLM and knowledge services can be reused, but their presence is not evidence that this experience is complete. Live provider validation and knowledge-release eligibility remain separate acceptance obligations.

## 7. Interoperability is part of the model contract

Orbus documents structured Excel imports for objects and relationships. Its published connector documents object and relationship operations that depend on target model, type, relationship-pair and identifying-attribute information. [1,13] The inspected public documentation does not establish a universal direct ArchiMate XML import route into every OrbusInfinity tenant.

| Exchange route | Intended preservation | Verification required |
| --- | --- | --- |
| Native AIW package | The full supported project model, identities, relationships, attributes, views, evidence references, baselines and external mappings. | Reimport without changing identity or accepted state; versioned schema and migration tests. |
| OrbusInfinity adapter | A selected, mapped set of objects, relationship types, attributes and external identities using its configured Excel import or API route. | Inspect the target metamodel/template; import and re-export a representative model; prove repeat updates do not duplicate records. |
| ArchiMate exchange adapter | Concepts and relationships with an explicit ArchiMate mapping, properties and supported views. The standard separates model, view and diagram exchange schemas. [14] | Validate the declared exchange version, schema, relationship semantics and behaviour in a receiving tool. |
| Ilograph / Structurizr / Eraser adapters | Editable perspectives or diagrams for the subset each format expresses: resources/contexts, C4 model views, or diagram DSL respectively. [4,9,10,15] | Preserve supported references and labels, render correctly, and report AIW semantics the target cannot express. |
| SVG/PDF and document outputs | A readable depiction and explanation of a selected design state. | Fidelity and source-model references; these are presentation deliverables. |

Every export needs a preview of what is preserved, transformed, omitted or requires a mapping. Retain external-ID mappings and identify the authoritative system for updates. Do not silently force an unsupported concept into a generic component type. Unsupported metadata may remain in the native package or a clearly declared supplement; that does not make it native target-tool semantics.

Start with a reviewed export and controlled update path. Later reimport should produce a reconciled change proposal with version/conflict checks. Automatic bidirectional synchronization should follow demonstrated mapping fidelity and an agreed ownership policy.

The Orbus integration acceptance gate will need the actual target metamodel, a sample import/export template or authorized tenant access. This dependency does not block defining AIW's model contract or preparing a test package.

## 8. Delivery plan and gates

| Stage | Deliverable | Gate before declaring it complete |
| --- | --- | --- |
| 1. Reconcile the model and exchange contracts | Inventory current object types and references; define relationship semantics, scope/membership, realization and view state; migration plan; native package schema; first Orbus mapping worksheet. | Existing IDs and baselines survive migration. Shared dependencies and many-to-many mappings are represented. An unsupported export mapping is reported. |
| 2. Prove one coherent exploration and authoring experience | A representative core-banking scope with system overview, module entry, realization cross-section, shared services, retained context, meaningful object editing and return navigation. | The user can move across levels and concerns without creating duplicate facts or losing the selected subject. Missing mappings remain visible as gaps. |
| 3. Connect behaviour and reasoning | One complete scenario crossing module boundaries, data changes, security and recovery concerns, explanation, alternatives and a reviewable design change. | Accepting one change updates the relevant working views and SDD; rejecting it leaves accepted state intact. Claims remain linked to sources and assumptions. |
| 4. Prove external exchange | Native export/reimport and an Orbus import/update proof; a bounded ArchiMate mapping where appropriate. | Object identities, mapped attributes and relationships survive the demonstrated exchange. Repeat import does not create duplicates. Limitations are recorded. |
| 5. Generalize and validate usability | Apply the same model/view rules across the remaining chapters; additional adapters in priority order; keyboard access, stable layout and larger-model checks. | A novice can explain and navigate an unfamiliar design; an experienced architect can edit and export it without rebuilding diagrams. |

Interoperability discovery begins in Stage 1, before view implementation locks in assumptions. Stages 2 and 3 form the first complete user-facing modelling milestone; individual controls should not be presented as its completion.

Use the existing SEABaaS repayment-schedule notification case as an initial source-backed anchor. Confirm module boundaries from the actual evidence; mark any proposed components, technology choices or interactions as hypotheses. Include shared dependencies and more than a straight sequence so the test exposes the real modelling challenge. The workbook's requirements do not by themselves establish the production architecture.

For that milestone, a participant should be able to locate the relevant module; explain its responsibilities; reveal implementation and technology support; follow an interaction through data and security boundaries; identify an unresolved mapping; compare a local design alternative; accept or reject the change; return to the whole system; and explain what will be preserved in an external export. Record wrong turns and points of confusion during novice and practitioner sessions. Passing code tests alone does not establish these outcomes.

Existing model storage and services should be retained where they meet the contract. Introduce graph indexing or a different database only when concrete query, scale or consistency requirements justify it. The immediate engineering work is semantic reconciliation, view projection, contextual navigation and verified change propagation.

## Sources

Official documentation reviewed on 23 September 2026. Research observations above are bounded to these documented behaviours.

1. [OrbusInfinity: Centralized Repository](https://www.orbussoftware.com/capability/central-repository)
2. [OrbusInfinity: Traceability View](https://support.orbussoftware.com/hc/en-us/articles/31547634440221-Traceability-View)
3. [OrbusInfinity: Using Impact Explorer](https://support.orbussoftware.com/hc/en-us/articles/30456793367325-Using-Impact-Explorer)
4. [Ilograph: Contexts](https://www.ilograph.com/docs/editing/contexts/)
5. [Ilograph: Browsing diagrams](https://www.ilograph.com/docs/getting-started/browsing-diagrams/)
6. [Ilograph: Walkthroughs](https://www.ilograph.com/docs/editing/walkthroughs/)
7. [Eraser: AI](https://www.eraser.io/ai)
8. [Eraser: What is diagram as code?](https://docs.eraser.io/diagram-as-code)
9. [Eraser: Architecture diagram syntax](https://docs.eraser.io/architecture-diagram-syntax)
10. [Structurizr: one model and multiple views](https://structurizr.com/)
11. [Structurizr: filtered views and shared positions](https://docs.structurizr.com/ui/diagrams/filtered-view)
12. [Structurizr: dynamic views](https://docs.structurizr.com/dsl/cookbook/dynamic-view/)
13. [Microsoft Learn: OrbusInfinity connector](https://learn.microsoft.com/en-us/connectors/orbusinfinity/)
14. [The Open Group: ArchiMate Model Exchange File Format](https://www.opengroup.org/open-group-archimate-model-exchange-file-format)
15. [Ilograph specification](https://www.ilograph.com/docs/spec/)
