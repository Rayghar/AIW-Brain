# Chapter models — Chapters 1 to 11: requirements, quality drivers, decisions, logical application, application realisation, logical technology, technology realisation, interfaces & data, security, deployment & runtime, and the review desk

Implementation record · 25 September 2026 (the review desk added the same day) · step 2 of the modelling direction. It follows [DESIGN-ANATOMY.md](DESIGN-ANATOMY.md) (step 1, Validate) and [MODELLING-DIRECTION.md](MODELLING-DIRECTION.md).

The Validate tab opens on SDD readiness, with the whole design as one body a switch away. Each chapter's Model tab now shows the standard architecture models for the work of that chapter. Chapters 1 to 11 are done; all eleven follow the same pattern (see [Shared by every chapter model](#shared-by-every-chapter-model)). Under them sit the SA Playbook, structured as knowledge, and a specification and anti-pattern layer that reads the whole design (see [The knowledge behind the models](#the-knowledge-behind-the-models)).

## Chapter 1 — requirements

Chapter 1's Model tab opens on two models of what the design must achieve. They are built from the chapter's own records — journey steps, people, requirements, outcomes, stakeholders, scope, constraints and assumptions, and the relationships between them — and from what later chapters record against them: the Chapter 2 quality drivers and the Chapter 4 responsibilities that cover each requirement.

- **Journey map.** A story map: the journey is the backbone and the requirements hang under it.
  - Each journey step is a column. Its head names the step, who takes part and, between heads, whether the journey's order is recorded: › where a *precedes* relationship records it, ⋯ where it does not.
  - The priority slices run down the rail — Must, then Should, then Could. Reading across one slice is a release: what the journey cannot work without, then what improves it.
  - Each card is a requirement, standing in its slice under the first step that needs it. A requirement needed at several steps names them; one needed at no step stands in a column of its own, *Not on the journey*.
  - Along each card's foot is the Chapter 4 responsibility that covers it — the requirement seen from inside the logical design, as the Chapter 4 cards carry their Chapter 5 components.
  - A step no requirement serves stands as a dashed hole with **Add a requirement for this step**.
  - **Walk the journey** goes step by step: who takes part, what the step needs, what it delivers, and whether the next step is recorded as following it.
- **Context.** The system in its surroundings, before any structure:
  - the people who take part on the left, the system as a boundary holding its steps in order, the outcomes it exists for, and the stakeholders who own them on the right;
  - a person joins the steps they take part in, a step joins the outcomes its requirements deliver (each route labelled with those requirements), and an owner joins their outcome;
  - beneath, the limits on the design as notes — what is in and out of scope, the constraints and the assumptions, each with the requirements it touches, and whether each assumption is confirmed.

In the reference project every step has a requirement, every requirement is on the journey, delivers an outcome and is covered by a Chapter 4 responsibility. The model shows what the lists do not:

- REQ-005's acceptance ("quickly") cannot be tested. The chapter's *Make acceptance observable* proposal is offered beside it.
- REQ-004 rests on ASM-001, which is not confirmed. The chapter's *Expose an unverified dependency* proposal is offered beside it.
- All five requirements are Must, so the map has one slice: nothing has been traded off yet.
- Step 03 *Record the posting* has no person taking part.
- Four of the five requirements deliver OUT-001.
- All twenty records are unconfirmed reference content.

### Slicing, as on Validate

- **Scope.** The whole journey, one step, one person (only their journey) or one outcome (only what delivers it). A link to a requirement opens on its step with the requirement in focus.
- **Elements.** For the whole journey you choose **Steps** or **Requirements**. More than 60 requirements open on Steps: each slice of each step folds to one card that names its requirements. One step on its own takes the width, its cards wrapping into as many as four columns.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | who owns each requirement and where it came from, and what limits it — constraints, assumptions and scope |
  | Flow | muscles | how each requirement will be accepted, and whether that acceptance can be tested |
  | Reasoning | DNA | the outcome each requirement delivers, who answers for that outcome, and the Chapter 2 quality drivers that name it |

  The lens never moves anything.
- **Dissect and step back.** Double-click a step, or choose *Focus on this step*, *Only their journey* or *Only what delivers it*. The breadcrumb or Escape steps back to the whole journey.

### Smart arrangement

- **The journey map is a grid, not a graph.** Steps are columns in the journey's recorded order and slices are bands, so nothing is routed and nothing crosses. Each band is as tall as its fullest step.
- **Every card has the same parts** — its head, a title of up to two lines, two lens lines and the strip of what covers it — so its height never depends on the lens.
- **The context uses the shared lane engine**, with the system's lane drawn as its boundary. Only the routes from steps to outcomes are labelled; the limits sit beneath the lanes in reading order.

### Co-design

- **Selecting reads the object.**
  - A requirement shows its statement, priority, the steps that need it, its acceptance, what it delivers, who owns it, what limits it, and the Chapter 4 responsibility that covers it.
  - A step shows who takes part, what it needs, what it delivers and what follows it. A person, an outcome, an owner and a limit each read their own terms.
- **Changes use Chapter 1's own editors.** Chapter 1 has its own page, so its models take the place of the page's requirements map and inspector.
  - **Edit** opens the chapter's editor on the record. **Add a requirement for this step** opens it with the step already linked, and says so; saved, the requirement stands under that step in its slice. **Connect** opens the chapter's link dialog from the selection. **Add** creates any Chapter 1 record.
  - **Propose** uses the chapter's proposals, each drawn in place until reviewed or dismissed: an enquiry about a pending payment stands under *Settle the payment* in a Should slice of its own; observable acceptance marks REQ-005; an unverified dependency stands among the limits. A limit has no place on the journey map, so a proposed scope, constraint or assumption turns the model to the context. A record open in the chapter's editor is drawn as it would be.
- **What the model shows.** Observations drawn only from recorded facts:
  - journey steps with no requirement, requirements needed at no step, and a journey order that is not recorded
  - requirements that deliver no outcome, outcomes nothing delivers, and outcomes nobody owns
  - acceptance that cannot be tested, requirements with no accountable owner or source, and wording that cannot be observed — each with the chapter's proposal where it has one
  - an assumption not yet confirmed, and a requirement tied to an out-of-scope boundary
  - requirements no Chapter 4 responsibility covers
  - everything in one priority slice, steps nobody takes part in, one outcome most requirements deliver, and unconfirmed records
- **Links in.** *All perspectives* returns to the chapter's own requirements map, which carries a *Chapter 1 models* button back. A link with `artefact=`, `object=` or `focus=` opens on that record, and Validate's observations each open the model on what they concern.

## Chapter 2 — quality drivers

Chapter 2's Model tab opens on two models of the qualities the design must hold. They are built from the chapter's own drivers and scenarios, from every later chapter that carries a driver (responsibilities, components, platform, products, runtime plans and the decisions that weigh it), and from the SA Playbook, structured as typed knowledge (see [The knowledge behind the models](#the-knowledge-behind-the-models)).

- **Utility tree.** Utility → quality family → attribute → driver, Critical drivers first.
  - The five families are the playbook's own grouping: reliability, efficiency, protection, change and use.
  - An attribute the playbook treats as core but no driver covers stands as a dashed hole. It reads what the playbook says of the attribute — definition, measures, example targets, design decisions and the technologies it names (Redis and Memcached for caching, RabbitMQ and Kafka for messaging…) — with **Explore a … driver** beside it.
  - Each driver card names its measurable target, what carries it, and how many of the playbook's tactics for its attribute the design names.
- **What if.** Move a driver's target or priority and see, before anything is saved, what stops holding.
  - The driver stays on the left; what it reaches stands to its right in chapter bands: the Chapter 3 decisions that weigh it, the Chapter 10 runtime plans, the Chapter 6 platform and the Chapter 7 products that carry it, and the Chapter 8 synchronous path.
  - Each card says *Holds*, *Stops holding*, *Revisit* or *Not recorded*, and why — arithmetic on recorded facts, never a guess. 99.9 % over 30 days allows 43.2 minutes of unavailability; 99.99 % allows 4.3, so a single replica that takes ten minutes to restart stops holding, and a second zone makes it hold again. Recovery targets meet recorded recovery times, response targets meet recorded timeouts, and a priority change shows which decisions would lean the other way.
  - Beneath, the playbook's tactics for the gap and the drivers this one pulls against, quoted from the playbook's trade-off tables.
  - **Open in the editor with these values** opens Chapter 2's own editor; nothing changes until the change is reviewed there.

In the reference project the model shows what the lists do not:

- Scalability, maintainability, deployability and usability have no driver, though the playbook treats each as core. The chapter now offers a proposal for each, drawn from the playbook's own measures and example targets.
- QD-002 and QD-004 cannot be judged: the parts that carry them run as one replica with no recovery time recorded.
- QD-004 names none of the playbook's tactics for its attribute.
- ADR-002 turns on the priorities of QD-001 and QD-003: each is a sensitivity point.
- QD-002, QD-003 and QD-005 pull against each other, each pair with the playbook's reason.

### Slicing, as on Validate

- **Scope.** The whole tree, one quality family, one attribute or one driver. A link with `driver=` opens on that driver.
- **Elements.** Drivers or Attributes. More than 40 drivers open folded to attributes.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | what carries each driver: its components, the products they stand on and its runtime plans |
  | Flow | muscles | each driver as a scenario: what happens, how the system must respond, and how that is measured |
  | Reasoning | DNA | the playbook tactics the design names for it, and the decisions that weigh it |

  The lens never moves anything.
- **Dissect and step back.** Double-click an attribute or a family. The breadcrumb or Escape steps back. **Walk the priorities** goes through the drivers Critical first.

### Co-design

- **Selecting reads the driver:** its scenario and target, the playbook's tactics for its attribute — the ones the design names with the words that name them, and the ones it does not — the decisions that weigh it, what carries it and what it pulls against.
- **Changes use Chapter 2's own editors.** **Edit driver**, **Add driver**, **Explore a … driver** (the chapter's proposals, drawn in the tree until reviewed or dismissed) and **What if** all open the chapter's editor and its change review.
- **Links in.** *All perspectives* returns to the chapter's own quality map, which carries a *Chapter 2 models* button back.

## Chapter 3 — decisions

Chapter 3's Model tab opens on two models of the decisions and why they lean the way they do. They are built from the chapter's own decisions, alternatives and their judged effects on each driver; the drivers' priorities from Chapter 2; the responsibilities an alternative would change in Chapter 4; the pattern catalogue; and the SA Playbook.

- **Decision map.** The drivers down the left in priority order, the decisions in the middle, each decision's alternatives on the right.
  - Each driver has its own track and its own port on every decision it reaches, so no two routes share a segment.
  - Each alternative names its pattern and the failure boundary to avoid, linked to the pattern catalogue and the playbook where its words name them (Idempotent Consumer, Missing Idempotency, Retry Storm), and its effect on every driver it is weighed on.
  - **Architecture style** stands as a decision. While none is recorded, it offers the playbook's five styles — Layered, Microkernel, Modular Monolith, SOA and Microservices — read against this design's own drivers.
- **Trade-offs.** Drivers down, alternatives across, every judged effect with its reason.
  - Beneath each decision, the weighted reading in plain arithmetic: Critical 3, Important 2, Supporting 1; *supports* counts +1 and *creates tension* −1. It shows which way the drivers lean; it is not a score and it does not choose.
  - A **sensitivity point** marks a driver whose one-step priority change would tip a decision.
  - The playbook's style table joins on the right: × where it supports a quality, (×) where it supports it conditionally, blank where it is silent.

In the reference project:

- No decision has a working choice. The drivers already lean to *Acknowledge a durable asynchronous handoff* (ADR-001), *Enforce the reference at the posting boundary* (ADR-002) and *Enquire and reconcile before replay* (ADR-003).
- ADR-002 turns on QD-001's and QD-003's priorities.
- No decision records the architecture style. On this design's drivers the playbook's table speaks only for SOA, conditionally, on performance — because the drivers the styles are compared on (scalability, maintainability, deployability) have not been written. Chapter 2 proposes them.

### Slicing, as on Validate

- **Scope.** All decisions, one decision, or one driver's decisions. A link with `decision=` opens on that decision.
- **Elements.** Alternatives or Decisions. Many decisions open folded to one card each.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | what each alternative would change: the Chapter 4 responsibilities it touches and the relationships it adds |
  | Flow | muscles | what follows from each alternative: its consequences, benefits and costs |
  | Reasoning | DNA | the pattern each alternative follows, the failure boundary to avoid, and its effect on every driver |

  The lens never moves anything.
- **Dissect and step back.** Double-click a driver to see only the decisions that weigh it. Escape steps back. **Walk the decisions** goes one decision at a time.

### Co-design

- **Selecting reads the reasoning:** for an alternative, the weighting in plain arithmetic, its effect on every driver with the reasons, and what the playbook and the catalogue know of its pattern and failure boundary; for a decision, its question, its drivers and how they lean.
- **Changes use Chapter 3's own editors and commands.** **Make it the working choice** uses the chapter's choose command. **Edit** and **Add an alternative** open its editors. **Record the architecture style** opens the decision editor with the style topic and the drivers preset; **Add as an alternative** adds a playbook style to it, with the playbook's marks as its reasons and the catalogue's declared conflicts as its failure boundary. Each goes through the change review.
- **Links in.** *All perspectives* returns to the chapter's own decision-impact map, which carries a *Chapter 3 models* button back.

## Chapter 4 — logical application

Chapter 4's Model tab opens on two models of the logical design. They are built from the recorded responsibilities, groups, connections and implementation links, and from the journey, requirements, quality drivers and decisions they answer to.

- **Responsibilities.** A service blueprint of the logical design: the business journey runs across, the responsibility groups run down.
  - Each journey step from Chapter 1 is a column; each Chapter 4 group is a band of rows, with its name on the left rail.
  - Each card is a responsibility, standing at the step it serves, in the band of its group. A responsibility that serves no step stands with the responsibilities it works with (tagged *via flows*); one connected to nothing stands *off the journey*.
  - Along each card's foot is the component that realises it in Chapter 5 — the logical design seen inside the physical one, the inverse of Chapter 5's cards.
  - Solid arrows hand work on; dashed arrows relate; ◇ marks a flow that runs only on a condition.
  - A journey step no responsibility serves stands as a dashed hole in a band of its own, with **Add a responsibility**. A group with no responsibility says so.
  - **Walk the journey** follows one of the journey's scenarios step by step: who serves the step, which flow brought the work there, and — where a scenario stops early — the condition it stops on and the steps it never reaches. Walked to its end, the walk can be recorded as the chapter's scenario review, the same record the explorer's walkthrough makes.
- **Coverage.** The reasons against the responsibilities: requirements (Chapter 1), quality drivers (Chapter 2) and decisions (Chapter 3) are rows; responsibilities are columns, grouped by group.
  - A dot means the responsibility covers the requirement, carries the quality driver by name, or links an accepted decision.
  - A ring means it only inherits the driver through a requirement or decision, or that the linked decision is still a draft. A dotted ring means a decision's alternative names the responsibility but no link is recorded.
  - Beside each row: what covers it, and — by lens — what realises that, where in the journey it is exercised, or the reason's own terms.

In the reference project every step is owned, every requirement is covered, and every logical flow is carried by a Chapter 5 interaction. The model shows what the lists do not:

- The risk hold ends at Risk screening, whose only onward flow is conditional, so nothing owns a held instruction. The manual review proposal is offered beside that observation.
- The settlement timeout ends at the Settlement hub and never reaches the customer.
- All three decisions are drafts, and Risk screening has no decision behind it.
- All five responsibilities are unconfirmed reference content, and no journey has been walked yet.

### Slicing, as on Validate

- **Scope.** The whole journey, one group, or one responsibility. Neighbours stay beside the subject as context. Sliced, only the steps something stands at are drawn.
- **Elements.** For the whole journey you choose **Groups** or **Responsibilities**. More than 30 responsibilities open on groups. Folded, each group is one card at the first step it acts on, naming the steps it spans, with the flows between groups.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | what each responsibility owns, exposes and is protected by, its boundary, and the Chapter 5 interaction that carries each flow |
  | Flow | muscles | where each responsibility's work comes from and where it goes, and how many journeys pass along each flow |
  | Reasoning | DNA | the requirements, quality drivers and decisions behind each responsibility, and the condition on each flow |

  The lens never moves anything.
- **Dissect and step back.** Double-click a responsibility, a folded group, or a group's name on the rail. The breadcrumb or Escape steps back: responsibility, then group, then the whole journey.

### Smart arrangement

- **The shared lane engine, with bands.** The journey's steps are the lanes; each group keeps rows of its own (`band`), and rows in one band share a row across steps wherever no flow would pass through a card. Flows turn in the gutter of the step they enter and never cross a card.
- **Every card has the same parts** — its head, two lens lines and the strip of what realises it — so its height never depends on the lens.
- **Every flow is labelled.** When there is no room for a label between two steps, the gap between them widens, once.

### Co-design

- **Selecting reads the object.**
  - A responsibility shows its group, the steps it serves, what it owns and touches, where its work comes from and goes, the requirements, quality drivers and decisions behind it, the component realising it, the journeys it takes part in and its owner.
  - A flow shows its meaning, its condition, the journeys along it and the Chapter 5 interaction that carries it.
  - A step, a group, a requirement, a quality driver and a decision each read their own terms, with a link to the chapter that records them.
- **Changes use Chapter 4's own editors.**
  - **Edit responsibility**, **Connect**, **Link a component**, **Edit flow** and **Edit group** open the chapter's editors on that record; **Add** creates a responsibility or a group.
  - In Coverage, selecting a responsibility or a requirement or decision offers the links it lacks; each opens the responsibility editor with that link ticked.
  - **Propose** uses the chapter's proposals: a manual review queue (drawn as a dashed responsibility in its group, with its relationship, and as its own column in Coverage), an idempotency register (a dashed chip among what the ledger owns) and a recovery work queue (a dashed chip at the hub's foot). Nothing is saved until the proposal is reviewed.
- **Model proposals are shown as they would be.** An edit to a saved responsibility is staged as a reviewable model proposal. While one is open, the model shows the proposed design — a responsibility moved to another group moves to that group's band — marks what it changes, and carries the proposal's banner.
- **What the model shows.** Observations drawn only from recorded facts:
  - journey steps no responsibility serves, and requirements no responsibility covers
  - responsibilities with no requirement behind them, or off the journey
  - responsibilities not yet realised, and logical flows no Chapter 5 interaction carries
  - responsibilities whose inputs changed since they were saved
  - journeys that stop early, what they leave unowned, and the proposal that answers them
  - data owned by two responsibilities
  - draft decisions, responsibilities without a decision, quality drivers carried by nothing or only inherited
  - a responsibility most flows pass through
  - unconfirmed responsibilities, and journeys not yet walked

## Chapter 5 — application realisation

Chapter 5's Model tab opens on two models of the realisation. They are built from the recorded components, allocations and interactions, and from the Chapter 4 design those components realise.

- **Components.** The classic component model, with the logical design embedded in it, as the anatomy promised.
  - Modules from Chapter 4 are columns, in the anatomy's order, with the parties outside on either side.
  - Each card is a component, its kind shown as a stereotype («service», «worker», «adapter», «queue», «store»). It carries the responsibilities it realises, and along its foot the platform capabilities it stands on — what Chapter 6 must provide.
  - Solid arrows ask and wait for an answer; dashed arrows hand work on. The parties outside reach the edge through their Chapter 8 contracts.
  - A responsibility nothing realises stands as a dashed hole in its module, with **Create a component for it**. A component that realises nothing says so, and belongs to no module.
  - **Walk the logical flows** follows each Chapter 4 flow in turn and reads which components realise its ends and which interaction carries it.
- **Allocation.** Responsibilities (rows, grouped by module) against components (columns, grouped by module): the application/function matrix.
  - A dot is an allocation; hover it for its scope.
  - An amber ring is an allocation with no current scope; a half dot shares its scope with another component; an amber outline is realised from another module.
  - Beside each row: whether it is realised, and why — its requirements, quality drivers and decisions.

In the reference project every responsibility is realised by exactly one component, and every Chapter 4 flow is carried by an interaction. The gaps are elsewhere: the three contracts with the outside have no failure handling recorded in Chapter 8, the risk engine has no decision behind it, and all five components stand on application execution, identity and access decisions, and correlated operational evidence.

### Slicing, as on Validate

- **Scope.** The whole system, one module, or one component. Neighbours stay beside the subject as context; the rest folds into module cards.
- **Elements.** For the whole system you choose **Modules** or **Components**. A system with more than 30 components opens on modules. More than eight folded modules stand in columns in the order work flows through them, so forty modules read as a page rather than a strip.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | what each component realises and owns, and the contract that formalises each interaction |
  | Flow | muscles | what each component takes in and gives out, how each interaction behaves, and whether it says what happens when it fails |
  | Reasoning | DNA | the requirements, quality drivers and decisions behind each component, and the logical flow each interaction carries |

  The lens never moves anything.
- **Dissect and step back.** Double-click a component or a folded module, or use a module's heading. The breadcrumb or Escape steps back: component, then module, then the whole system.

### Smart arrangement

- **The same lane engine as Chapter 9**, now shared (`public/lane-layout.js`): elements share rows only where no interaction would pass through them, every interaction turns in a gutter of the module it enters, and no route crosses a card.
- **A card's height follows what it carries** — the responsibilities it realises — never the lens.
- **Every interaction is labelled.** When there is no room for a label between two neighbouring modules, the gap between them widens, once.

### Co-design

- **Selecting reads the object.**
  - A component shows what it realises (with each allocation's scope), what it owns, takes in and gives out, whom it talks to, what it stands on, why it exists and who owns it.
  - A responsibility shows its module, the components realising it and their scopes, its logical flows and its reasons.
  - An interaction shows its kind, its contract, its failure policy and the logical flow it carries.
- **Changes use Chapter 5's own editors.**
  - **Edit component**, **Connect**, **Technology needs** and **Edit interaction** open the chapter's editors on that record.
  - **Create a component for it** opens the component editor already allocated to the responsibility.
  - **Propose** uses the chapter's component proposals: a held-payment review queue, an idempotency result store, or an outcome recovery worker, offered on the component or responsibility they concern. The unsaved proposal is drawn in place, as a dashed card in its module with its relationship, and as its own column in the allocation matrix. Nothing is saved until the proposal is reviewed.
- **Model proposals are shown as they would be.** The app stages a Chapter 5 edit that reaches other chapters as a reviewable model proposal. While one is open, the model shows the proposed design — a removed allocation appears as a hole straight away — marks what it changes, and carries the proposal's banner: **Review proposal**, **Discard**, and the switch between the saved and the proposed model.
- **What the model shows.** Observations drawn only from recorded facts:
  - responsibilities no component realises
  - components that realise no responsibility
  - responsibilities realised from another module
  - logical flows no interaction carries, and interactions with no logical flow behind them
  - interactions with no failure policy, and contracts with the outside with no failure handling in Chapter 8
  - components with an incomplete boundary, or no decision behind them
  - data claimed by two components, and responsibilities split with the same scope
  - allocations with no scope or an out-of-date one
  - platform capabilities every component stands on, for Chapter 6

## Chapter 6 — logical technology

Chapter 6's Model tab opens on two models of the platform the application stands on. Both are built from the recorded capabilities, application needs, support mappings, dependencies, trust boundaries and failure domains.

- **Platform.** The application/technology matrix, drawn as the skeleton the anatomy describes.
  - Each row is a vendor-neutral capability. Rows are grouped by what they do — **Run**, **Keep state**, **Connect**, **Trust**, **Operate** — with the most-used capability first in each group.
  - Each column is a component, grouped by its Chapter 4 module.
  - A dot is a need where a component meets a capability: filled when essential, half when the component can run degraded without it, a dashed red socket when nothing supports it. Neighbouring needs join into a **plate**, so shared support reads as one piece of skeleton.
  - Dependencies between capabilities run as brackets beside the capability names; a critical one is thicker, because it carries a failure upward.
  - The last column says what stops if the capability fails, from Chapter 6's own simulation.
- **What fails together.** The same stack, with one capability or its whole failure domain lost, through the chapter's own simulation.
  - Lost capabilities are hatched, and the components that lose an essential need say **Stops**.
  - **Walk the failure** goes through four stages: it fails, what depends on it, the components that stop, and what could continue.
  - Positions never change between the two views.

In the reference project the platform is readable at a glance. Every need is supported, but all nine capabilities share one failure domain, and losing it stops all five components. Three capabilities each stop everything on their own: Application execution; Service connectivity, which takes execution with it; and Identity and access decisions, which takes both. Seven essential capabilities have a single path. Transactional persistence and durable work handoff have no recovery plan, and read acceleration is not used by anything.

### Slicing, as on Validate

- **Scope.** The whole platform, one module's components, or one capability with what it depends on and what depends on it.
- **Columns.** For the whole platform you choose **Modules** or **Components**. A system with more than 30 components opens on modules, where a dot counts its module's needs.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Structure | skeleton | which capability supports which component, how essential each need is, and the dependencies |
  | Operation | vital signs | each capability's continuity (single path, redundant, safe bypass), failure domain and recovery |
  | Protection | immune system | each capability's and component's trust boundary, and which needs cross one |

  Neither the lens nor the failure being explored moves anything.
- **Dissect and step back.** Double-click a capability to open it with its dependencies, or a module heading to open that module. The breadcrumb or Escape steps back.

### Smart arrangement

- **Families, then use.** Rows follow the platform families, with the most-used capability first in each family, so the capabilities everything stands on sit at the top of their group.
- **Columns keep the anatomy's order**, grouped under their modules, as in Chapters 5 and 8.
- **Dependency brackets sit on levels.** Shorter spans are nearer the names, so nested brackets never cross, and brackets on one level never overlap.

### Co-design

- **Selecting reads the object.**
  - A capability shows what it owns and supports (each need essential or degraded), what it depends on and what depends on it, its trust boundary, its continuity and recovery, why it exists, and its owner.
  - A component shows what it stands on, need by need, and which single capabilities would stop it.
  - A need shows what it asks for and what fulfils it.
  - A dependency, a trust boundary or a module reads the same way.
- **Changes use Chapter 6's own editors.**
  - **Edit capability**, **Continuity & recovery**, **Edit technology needs**, **Edit dependency** and **Edit boundary** open the chapter's editors on that record.
  - **Add a dependency** selects the capability and opens the dependency editor from it.
  - **Propose** uses the chapter's proposals. **Propose independent continuity** is offered on essential single paths, **Propose a recovery path** on stores and queues without one, and **Propose support** on an unsupported need. Each is drawn in place — the recovery dependencies as dashed brackets, the new support as a dashed dot — with a banner to **Review & edit** or **Dismiss**.
- **Model proposals are shown as they would be.** A Chapter 6 edit the app stages as a model proposal is shown in its proposed form and marked, with the proposal's banner, as in Chapter 5.
- **What the model shows.** Observations drawn only from recorded facts:
  - needs no capability supports
  - one failure domain shared by every capability, and what losing it stops
  - capabilities whose loss stops more than one component, and through what
  - the critical dependency chain
  - essential capabilities with a single path
  - identity or authoritative state declaring a bypass
  - stores and queues without a recovery plan or recovery dependency
  - capabilities nothing uses
  - needs that cross a trust boundary, by boundary
  - capabilities with no reason of their own, and needs not yet confirmed

## Chapter 7 — technology realisation

Chapter 7's Model tab opens on two models of the product layer beneath the platform. Both are built from the recorded realisations, their options and assessments, and the Chapter 6 platform above them.

- **Stack.** Every realisation, in Chapter 6's order. Read across a row:
  - the capability it realises;
  - the option preferred for it — hatched where the choice is not made yet, as the anatomy promised;
  - who depends on it, and how many components stop if it fails (from Chapter 6's simulation);
  - the six implementation obligations (operate, access, data, recover, interfaces, lifecycle), then sizing and cost;
  - how far the selection has gone: preferred, recorded, approved — or recorded on inputs that have since changed.
  **With options** lists every alternative in place under its realisation, with how many criteria each supports, trades off or still needs evidence for.
- **Options.** One realisation's options against the criteria that should decide between them.
  - The quality drivers of the components that depend on it come first, then operation, recovery, exit and cost.
  - Each cell is a judgement: supports, a trade-off, or needs evidence. An unknown stays an open item.
  - Where nothing is judged yet, a **suggested** judgement — drawn dashed — comes from what the product is documented to do, with the mechanism and where it is documented (see [Product choices](#product-choices-weighed-against-the-drivers)).
  - **As the drivers weigh them**, beneath the criteria: priority × effect for each option, on the recorded judgements and with the suggestions filling the gaps, and ★ on the option the drivers lean to. It is a lean, never a choice.
  - Benefits and limits sit beneath. The realisation is chosen from the bar, or by double-clicking it in the stack.

In the reference project the stack says one thing clearly: nothing is decided yet. All nine realisations have two illustrative options and no choice, no obligation is written, and no option is assessed. The model says where to start: Application execution, Identity and access decisions and Service connectivity, because if any one of them fails, every component stops. It also names the four realisations that carry durable state or recovery with no recovery obligation.

### Slicing and lenses

- **Scope.** The whole stack or one platform family; Options opens one realisation.
- **Rows.** **Realisations**, or **With options**.
- **Lenses.**

  | Lens | Like the | Emphasises |
  | --- | --- | --- |
  | Structure | skeleton | what each realisation provides, the product chosen, and who depends on it |
  | Operation | vital signs | the implementation obligations, sizing and cost |
  | Reasoning | DNA | how far each selection has gone, and the criteria and evidence behind it |

  The lens changes emphasis only; nothing moves.

### Co-design

- **Selecting reads the object.** A realisation shows what it realises, its owner, its choice and options, each obligation (written or not), sizing and rationale. An option shows its product, vendor, operating model, judgements, benefits, limits and evidence. A criterion shows each option's judgement on it.
- **Changes use Chapter 7's own editors.**
  - **Edit realisation**, **Write obligations** and **Selection basis** open the plan editor at the right step.
  - **Add an option**, **Edit option**, **Record the selection** and **Record approval** open the chapter's editors.
  - A judgement cell opens the assessment editor for that option and criterion.
  - **Preview it in the stack** shows an option in place of the current choice; **Prefer this option** saves a draft preference.
  - **Propose operating basics**, **Propose recovery & contract obligations** and **Propose a realisation** (for a capability nothing realises) use the chapter's proposals. The obligations a proposal would write are marked in place.
- **Model proposals are shown as they would be**, as in Chapters 5 and 6.
- **What the model shows.** Observations drawn only from recorded facts:
  - capabilities nothing realises
  - choices not made, with the ones whose failure stops everything named first
  - draft preferences not yet recorded, and recorded selections whose inputs changed
  - obligations not written, and durable state or recovery with no recovery obligation
  - preferred options not yet assessed against every criterion
  - products without a version or vendor
  - one operating model everywhere
  - realisations with only one option
  - no sizing or cost basis
  - overall selection progress

## Chapter 8 — interfaces & data

Chapter 8's Model tab opens on two models of the same exchanges:

- **Sequence.** One business scenario at a time, message by message. It shows who asks whom, what each message carries, and what the contract says when an answer is late, lost or repeated.
- **Data flow.** One row per data definition, showing its authority (the system of record) and every place it travels.

The connected explorer stays one click away under **Explore all perspectives**. Its toolbar has a **Chapter 8 models** button to come back, and the choice is remembered for each project and chapter.

### Where the scenarios come from

Nothing is drawn by hand, and nothing is invented.

1. **A recorded business journey.** Each journey path from Chapters 1–4 (confirmed, held, uncertain) is traced through the model:
   - journey step → the responsibility that implements it
   - responsibility → the component that realizes it
   - component → the contract that carries the hand-off to the next step

   An external call a step makes, such as a posting or a settlement, happens inside that step. A gateway such as *Screening disposition* becomes a guard showing the path taken, for example *Allow*.

   If a path ends in an unknown outcome (pending, enquiry, reconciliation), the answer from the last external call is drawn as lost. What the contract records for timeout, retry, failure and repeats appears in place. Anything missing is shown as a design question.
2. **Where work enters.** With no journey recorded, the sequence follows the call tree from the party that starts the work.
3. **Every interaction.** A catalogue lists each recorded interaction once.

**Reading the arrows.** A request waits for its answer, so requests nest and the answers come back in reverse order. An event does not wait. Both come straight from each contract's recorded kind. In the reference project this shows something worth discussing: *IF-001 Payment initiation* stays open while five further requests complete, including two external systems. Yet the contract's own purpose says *acceptance does not mean settlement*.

### Slicing, as on Validate

- **Scope.** You can look at the whole system, one module, or one part. A part is a component or an external participant.
  - Inside a module, its components are separate lifelines and every other module folds into one.
  - For a part, its direct partners stay separate, everything else folds into its module, and messages that do not touch the part are dimmed.
  - Messages between parts that fold into the same lifeline become one *internal steps* note on that lifeline.
- **Depth.** For the whole system you choose the lifelines: **Modules** or **Components**. A large system opens on modules.
- **Lenses.** The lenses match Validate:

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Flow | muscles | operations and business steps |
  | Signals | nervous system | a contract's timeout, failure and repeat handling, recorded or missing |
  | Information | circulation | the data each message carries, and each lifeline's authority count |

  Lenses only change what is shown. They never move anything.
- **Dissect and step back.** You can:
  - double-click a lifeline head, or use **Open this module** or **Focus on this part**
  - use the breadcrumb or Escape to step back
  - use the scenario list to switch journeys without losing your place

### Smart arrangement

- **Lifelines read from where work enters to where it leaves.**
  - Parties that only start work are on the left.
  - Modules follow in the design anatomy's smart order, with their components.
  - The parties that work reaches are on the right.

  If you rearranged columns on Validate, the same order is used here, so each part stays in the same place.
- **The data flow keeps the sequence's columns**, so a part stands in the same place in both views.
- **One row per event.**
  - A message label is centred on its message and may run past a short message. It always stays inside its own row.
  - Journey steps band the rows, and a sticky rail keeps the step numbers in view.
  - Activation bars show when a part is busy handling a request or waiting for one.
- **Data movements are packed into tracks** within each row, so they never overlap.
- **Geometry depends only on the scenario, the scope and the stage width.**

### Co-design

- **Selecting reads the part.**
  - A message selects its contract: operation, data sent and returned, correlation, timeout, retry, failure, repeats and access.
  - A data row or ★ selects its data definition: authority, classification, fields, retention, where it travels and who holds copies.
  - A lifeline head selects its component or module.
- **Changes use the chapter's own tools.**
  - **Edit contract** and **Edit data definition** open the Chapter 8 editors. Edits to existing records become a reviewable proposal, shown in place on the sequence with a compact banner, the proposed wording and dashed marks on what it affects.
  - **Propose recovery wording** and **Propose repeat protection** open the chapter's existing drafted proposals for that contract.
  - **Add** creates new contracts, data definitions or external participants through the same dialogs.
- **What the model shows.** The companion lists observations drawn only from recorded facts, each with a question to ask Sol:
  - long chains of waiting requests
  - external calls with no timeout policy
  - retries with no way to recognise a repeated request
  - interactions with no contract
  - journey steps with no recorded interaction
  - confidential data leaving the system
  - data held in many places
  - a part that sends data it neither owns nor received. In the reference project, *Core connector* and *Settlement worker* both send the payment instruction, but no contract brings it to them.
- **Walk through.** Steps through the scenario one message at a time and reads each step in plain language.
- **Links in.**
  - The anatomy's *Open in Chapter 8 model* lands on the selected contract or data.
  - A selection made on Work carries over to Model.
  - Ask Sol and Mind Factory open on the selected record.

## Chapter 9 — security

Chapter 9's Model tab opens on two models of the same protection design, drawn only from what the project records: contracts, trust boundaries, threats and controls.

- **Threat model.** The classic threat-modelling picture: the parts that act, the parties outside, the platform services and stores they reach, the flows between them and the trust boundaries those flows cross.
  - Trust regions are columns: outside where work comes from, each trust boundary in the order flows cross it, and outside where work goes.
  - Where a contract crosses a boundary, a round marker says whether that crossing is **guarded** (✓, a control covers it), **exposed** (!, a threat on it is not covered) or **not yet examined** (?, nothing recorded).
  - Where several parts reach one platform service or store in another boundary, their flows join one trunk, and a square marker stands for that **entry** into it. Fifteen separate uses become four entries, each a single question: what could go wrong here?
  - **Walk the journey** follows the recorded payment path flow by flow and reads, at each step, which boundary it crosses, what it carries, what could go wrong and what protects it.
- **Threats & controls.** Threats are rows, grouped by priority; controls are columns. A cell shows the chapter's own coverage rule:
  - a filled dot: the control is linked to the threat **and** protects something it affects;
  - a struck ring: linked, but protecting none of it;
  - a dashed ring: it protects something the threat affects but is not linked — often the quickest gap to close.
  - Beside each threat, **Coverage** names the affected objects still uncovered, and **Evidence** shows what is recorded for its controls.

In the reference project this makes the security design readable at a glance. IF-001 and IF-003 cross into and out of the system guarded; IF-002 Ledger posting leaves exposed because THR-002 is not covered on it. Nobody has yet asked what could go wrong where the payment services reach the restricted state or the channel entry. SEC-002 already protects what THR-002 threatens but is not linked to it, and SEC-003 answers no threat at all.

### Slicing, as on Validate

- **Scope.** The whole system, one trust boundary, or one part. A part keeps what it talks to and reaches beside it as context; the rest of each boundary folds into one card.
- **Elements.** For the whole system you choose **Boundaries**, **Parts** or **Parts + platform**. Parts shows platform services and stores only where they are reached across a boundary. A large system opens on boundaries. Parties outside are never grouped: they are not ours to fold.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Protection | immune system | each crossing's state, the threats and controls on every flow, and what is at risk on each part |
  | Information | circulation | which data crosses each boundary, coloured by classification; sensitive flows stand out |
  | Flow | muscles | who talks to whom, and what they reach |

  The lens never moves anything.
- **Dissect and step back.** Double-click a part or a folded boundary, or use a boundary's heading. The breadcrumb or Escape steps back: part, then boundary, then the whole system.

### Smart arrangement

- **Boundaries in the order flows cross them.** The order of the trust regions is the one that least often makes a flow pass across a boundary it does not enter; the recorded order breaks ties.
- **Parts share a row only where no flow would pass through them**, and each part is drawn level with the first neighbour already placed, so most flows read straight across. Twelve elements need five rows, and the whole design fits one screen.
- **Every flow turns in a gutter of the region it enters**, and gutter tracks never overlap unless they are one entry's shared trunk. No flow passes through a card.
- **Labels sit on the flow**, or beside its turn where space is short, or as just the contract reference; they never cover a card, a marker or another label.

### Co-design

- **Selecting reads the object.**
  - A crossing shows the contract, where it crosses, what it carries, its threats and controls, and what is not covered, with a link to the contract in Chapter 8.
  - An entry shows the service or store, who reaches it and from which boundary.
  - A boundary shows its policy, owner, what is inside and how its crossings stand.
  - A threat shows its scenario, consequence and each affected object as covered or not; a control shows where it is enforced, its mechanism, what happens when it fails, and what it answers.
- **Changes use Chapter 9's own editors.**
  - **Record a threat here** opens the threat editor with the selected contract, part or store already chosen.
  - **Edit threat**, **Edit control** and **Design a control for it** open the chapter's editors on that record.
  - **Propose a control** uses the chapter's control proposals: authority, replay, data minimisation or audit, chosen by the threat's category. The unsaved proposal is drawn as its own dashed column beside Coverage and says which threats it would close; on the threat model, what it would protect is marked dashed. A banner offers **Review & edit** or **Dismiss**. Nothing is saved until the proposal is reviewed.
- **What the model shows.** Observations drawn only from recorded facts:
  - crossings and entries with no threat or control recorded
  - threats not fully covered, and which affected objects are open
  - controls that protect what a threat affects but are not linked to it
  - controls that answer no threat
  - confidential or restricted data leaving the system on a contract with no control
  - components not inside any trust boundary
  - boundaries that many parts reach into, with the boundary's own policy
  - controls with no design, implementation or test evidence yet

## Chapter 10 — deployment & runtime

Chapter 10's Model tab opens on two models of one environment. The environment is the one chosen in the chapter's own environment picker, which stays above the model on one line.

- **Deployment.** Each deployable part is a row: components in their modules, then the platform services they stand on, then the external systems they reach. Each zone is a column, and zones that share a failure domain stand together under one bracket.
  - A filled dot is a running copy; a ring is a standby.
  - Reading a row across shows where a part runs, where it does not, whether it has enough ready copies, and how it recovers.
  - Parts with no placement wait in a **Not placed** column, each with a **place it** action.
- **What fails together.** The same grid with one zone, or a whole shared failure domain, removed. It uses Chapter 10's own failure simulation, so the Model and the Work lab give the same answer.
  - The failed zone is hatched and its copies are marked lost.
  - An outcome column shows each part's state, and its state after any declared recovery.
  - Dependencies that carry the failure to a part that would otherwise survive are drawn in red.
  - **Walk the failure** goes through four stages: the zones fail, parts lose their copies, the failure spreads through what parts need, and what could recover.
  - Selecting another zone fails that one instead. The companion lists the quality scenarios and controls at stake, and the external paths the scenario does not exercise.

In the reference project this makes the operating design readable at a glance. Every placed component runs in the Primary site. Two components and eight of the platform services they require are not placed. If the Application zone fails, four of the five components stop and none has a recovery candidate.

### Slicing, as on Validate

- **Scope.** You can look at the whole environment, one module, or one part. For a part, what it needs and what needs it stay beside it as context.
- **Rows.** For the whole environment you choose **Modules**, **Parts**, or **Parts + platform**. Platform services fold into one row unless shown; a large system opens on modules.
- **Lenses.**

  | Lens | Like the | Shows |
  | --- | --- | --- |
  | Operation | vital signs | copies per zone, minimum ready, state and recovery strategy |
  | Flow | muscles | what each part needs: platform services, other parts and external systems |
  | Protection | immune system | each zone's trust boundary, and the controls and network policy each part enforces |

  Neither the lens nor the failure being explored moves anything.
- **Dissect and step back.** Double-click a row or use the group heading. The breadcrumb or Escape steps back.

### Smart arrangement

- **Rows keep the anatomy's order.** Components follow the modules' smart order (or your Validate arrangement). Platform services are ordered by how many parts need them, most-needed first.
- **Zone columns are grouped by failure domain**, with a gap between domains.
- **Dependencies run as trunks in their own gutter.**
  - Something many parts need, such as the identity service, collects its branches on one trunk.
  - Otherwise each part that needs something has its own trunk.
  - Trunks on one level never overlap, so a 160-part system needs only seven trunk levels.

### Co-design

- **Selecting reads the part.**
  - A part shows where it runs (each placement has an **edit** link), its copies, state, recovery, monitoring and runbook, what it requires, what requires it, its runtime paths and its controls.
  - A zone shows its failure domain, isolation, boundary and what runs there, with **What if it fails?**.
  - An external system shows its runtime paths and each path's failure response, with a link to the contract in Chapter 8.
- **Changes use Chapter 10's own editors.**
  - **Edit operating plan**, **Recovery** and **Operate & change** open the plan editor at the right step.
  - **Place it** opens the placement editor with that part chosen.
  - Zones and environments open their own editors.
  - **Propose a standby elsewhere**, **Propose recovery wording** and **Propose operating basics** use the chapter's runtime proposals. A proposed standby is drawn in its zone, dashed, with a banner to **Review & edit** or **Dismiss**. Nothing is saved until the proposal is reviewed.
- **What the model shows.** Observations drawn only from recorded facts:
  - unplaced components
  - one shared failure domain
  - single copies with no recovery
  - required platform services that are not placed
  - stateful parts without state protection
  - parts that do not say whether they hold state
  - provider paths with no failure response
  - what one zone failure stops
- **Links in.** The anatomy's *Open in Chapter 10 model* lands on the plan or placement. A selection made on Work carries over.

## Chapter 11 — review & realize: the review desk

Chapter 11's Model tab opens on the review desk: the whole design read the way a clinician reads a patient on a monitor. The same desk is Validate's third mode on every chapter, beside SDD readiness and the model views. Reading it changes nothing. Where a vital reads critical or gives no signal, the desk drafts the fix from its own numbers as the owning chapter's ordinary change; it can be previewed on the desk, and it is applied only through that chapter's change review, or edited in the chapter instead.

- **The monitor.** Across the top, eight vital signs for the whole system — availability, recovery, data loss, latency, capacity, integrity, protection and observability. Each tile shows the system's target or headline (99.9 % · 43.2 min / 30 d, ≤ 2 seconds · 3 sync calls, 1 of 4 threats covered) and a heartbeat with one beat per running part: a tall red spike where it reads critical, a small green pulse where it is normal, a flat dashed line where there is no signal. A tile follows its vital down every part.
- **Vitals.** Every running part (the Chapter 10 runtime plans) as a row — services and workers first, then the platform from the edge inwards — and one column per vital. Each cell is a recorded value read against a recorded target:
  - *Availability* — how the part is placed (replicas, standbys, zones) against the unavailability its availability drivers allow. A product that works only while a majority of its nodes agree (RabbitMQ's quorum queues, Patroni's configuration store) reads *watch* when losing the zone that holds most of its nodes would lose the majority.
  - *Recovery* and *Data loss* — its recorded recovery time and loss against the strictest of its drivers' targets and the Chapter 6 recovery objectives.
  - *Latency* — the synchronous calls on a response-time driver's path, nested by who calls whom. The entry the caller waits on may take the whole target; each call made while serving it must give up before its caller does, leaving the caller time for its own work. A timeout past the target, or at or above its caller's, reads critical — the work would go on after the caller had gone.
  - *Capacity* — what the desk's objective asks of it, against what Chapter 10 lets it grow to.
  - *Integrity* — whether the requests it makes or takes record how a repeat is recognised.
  - *Protection* — Chapter 9's coverage rule on the part, its contracts and its data.
  - *Observability* — whether its monitoring is recorded, weighed by the drivers it carries.

  Each reads *normal*, *watch*, *critical*, *no signal* (the value or the target is not recorded) or *not carried* (no driver asks it of this part), with its reason in words. Select a cell for the arithmetic, the SA Playbook tactics that would move it, and the chapter whose editor changes it.
- **Probes.** Plug a probe into a part (or keep one on a decision) and its chart stays pinned to the desk as a small monitor while you look elsewhere; the probed parts can be shown alone. Probes are remembered for each project in this browser.
- **What it takes.** An objective turned into a performance specification for every part the design records:
  - The objective is the review's own when one is saved, otherwise a Chapter 2 scalability driver (concurrent users, or requests a second, with any surge driver multiplying it), otherwise the SA Playbook's own example target — *Scale to 100,000 concurrent users* (QR-Guidebook!F5) — always said as such.
  - The arrival rate is Little's law for a closed population: users ÷ (time between requests + the QD-003 response target). 100,000 users are 3,125 requests a second.
  - The rate is carried along the Chapter 5 interactions from the entry the Chapter 8 contracts record. Each part then gets its specification: replicas for the load at a target utilisation plus what its availability rule asks (one spare, or enough to lose a zone), CPU and memory, database connections, reads and writes, daily growth, the queue backlog a consumer outage leaves, cache reads, telemetry ingest, the cluster's pods and nodes, and the rate each outside system must accept.
  - Product rules are quoted with where they are documented — PostgreSQL's 100 default connections, RabbitMQ's three-node quorum queues, Redis Sentinel's three instances, Patroni's configuration store — and checked against the specification.
  - Every part is compared with what Chapters 7 and 10 record: *meets*, *short*, *check*, or *not recorded*.
  - Every number the design does not record is a named planning assumption the reviewer can change: time between requests, utilisation, replica throughput (per part, from a load test), CPU and memory per replica, connection pools, operations per request, read share, cache hits, record, message and telemetry sizes, node size. Nothing is presented as a benchmark.
  - Explored values are not saved until **Save as the review objective**, which records the objective and its assumptions in Chapter 11 with who set it. The SDD then carries the performance specification.
- **Trace.** Each requirement followed through drivers, decisions, responsibilities, components, products, interfaces, controls and runtime to its vitals — Chapter 11's own trail, read as one row. Where the thread must pass and nothing is recorded, the gap is a break in red.
- **Decisions under a probe.** A decision reads its alternatives with the patterns they follow and the failure boundaries they risk (named from the pattern catalogue), each alternative's effect on every driver, which way the drivers lean, and what it reaches both ways: the Chapter 1 requirements it answers and the limits they rest on, the Chapter 2 drivers it weighs, and the Chapter 4 to 10 records that carry it.
- **Where to start and the rounds.** The companion groups the critical and silent vitals by what would fix them, the most first (*Record how the failure of 12 parts would be seen · Chapter 10*). **Walk the rounds** steps through them, then through each anti-pattern, lighting the parts concerned. Each step and each round offers its drafted fixes.

### Drafted fixes

Each vital that reads critical or gives no signal comes with a fix drafted from the desk's own numbers, when numbers can decide it (`public/desk-fixes.js`). A cell with a draft carries ℞.

- **What is drafted.**
  - *Capacity* — the replicas the objective needs (RUN-001: grow to 24, with a Horizontal Pod Autoscaler policy and the arithmetic as its basis); a primary and a standby for a store; a queue's bound that holds the backlog a consumer outage leaves, and what the sender does when it is full (TR-003: 2,900,000 messages for a 2,812,500 backlog; RabbitMQ's reject-publish overflow, so the publisher is told and keeps the instruction pending); the cluster's nodes and the telemetry's ingest.
  - *Availability* — active replicas in every zone for services and stateless platform; a standby in the recovery zone, promoted within the recovery time, for a store or cache, with fencing; a majority spread across the zones for a quorum; a backup kept apart from what it protects.
  - *Recovery* — a recovery objective from the strictest target (QD-004's 15 minutes), with its strategy and a plan, recorded as an objective to prove by a drill.
  - *Latency* — nested timeouts for a driver's whole path: QD-003's 2 seconds become IF-001 2,000 › IF-004 1,300 › IF-005 650 ms, with what the caller does on a timeout.
  - *Integrity* — each unguarded request's idempotency key — the reference the caller already sends (IF-001 and IF-004: `paymentReference`) — and its duplicate policy.
  - *Protection* — the control that already answers a threat, extended to where the threat also lands (SEC-001 to DAT-001), or Chapter 9's own proposal for the threat's category.
  - *Observability* — monitoring drawn from what each driver measures: *Alert when half of the 43.2 min QD-002 allows in 30 days is spent; when the 95th percentile passes 2 seconds (QD-003)…*
  - *Switch points* — a product choice past its limit or leaning away from its reading becomes a Chapter 3 question with an alternative for each product, judged against the drivers from the weighing (*Should TR-003 Durable work handoff stay on RabbitMQ for 100,000 concurrent users?*).
- **Where numbers cannot decide, the desk says so.** A threat, a recovery-point objective, a third site, a drill, a cache's hot set: each is a judgement, shown as *Needs your judgement* with the chapter that decides. The desk does not invent them.
- **The chapter's own change.** A draft is the owning chapter's ordinary commands — `runtime.plan`, `runtime.placement`, `interfaces.contract`, `techrealisation.plan`, `security.control`, `decision.save` — carrying the whole record with only its fields changed. Every drafted value is marked unconfirmed (capacity, targets, timeouts, estimates), and the vital then says *Not yet confirmed by a load test* or *Not yet shown by a recovery drill*.
- **Change the number.** Each draft shows its numbers as fields — replicas, minutes, milliseconds, the key, the monitoring text. Change one and the desk reads it again: 10 replicas instead of 24 reads short by 14; 1,500 ms under a 1,300 ms caller reads critical.
- **Preview on the desk.** A draft, a step of *Where to start*, an anti-pattern's drafts, or all of them at once: the monitor and every cell show the desk as it would read, each changed cell ringed with the state it had, each tile with what it was. Nothing is applied. A standby reveals what was hidden — PostgreSQL holds state, so its missing recovery point comes into view.
- **Review and apply.** The platform's own change review opens with every changed field, the downstream work it reaches, and what it does on the desk; the architect confirms it, with a reason, or keeps it as a design alternative instead. Applied, the cells turn and pulse, and the draft is gone. A review takes up to 20 changes; the rest stay drafted for the next, so a step can be applied at a time and the monitor watched as it turns.

### Sol at the desk: the Brain reasons at every decision

The desk's instruments measure; Sol advises; the architect decides. The full design is in [AIW-BRAIN-ARCHITECTURE.md](AIW-BRAIN-ARCHITECTURE.md).

- **Ask Sol** about:
  - one decision: a drafted fix, a judgement, a switch point, or a Chapter 3 decision opened on the desk;
  - a whole step of *Where to start*;
  - *Sol's rounds*, the first decision of each step.
- **What Sol reads is shown first.** One reading per decision, then:
  - the objective and planning assumptions;
  - the product mechanisms;
  - the drivers;
  - the SA Playbook's tactics;
  - the project's governed claims and methods.

  Each comes with its receipt. *Send to Sol* sends that exact packet. The architect may add a question.
- **Sol's assessment.** Each decision gets:
  - a verdict: *Apply*, *Refine*, *Reconsider*, *Your call* or *Needs evidence*;
  - a headline and the reasoning;
  - refinements on the draft's own knobs, or proposed threats on the listed targets, or a preferred alternative for a decision;
  - risks, questions and the sources cited.

  It appears beside the draft, and its verdict appears on the cell and in the step's summary.
- **Checked twice.** The deterministic guard runs first, then a second model pass. What fails is withheld, and the reading stands.
- **Refine and decide.** *Use Sol's refinements* puts Sol's numbers and wording into the draft. The desk previews the design with them, and the change review applies them. For example, RUN-001 at 26 replicas instead of 24, if Sol argues for headroom. Proposed threats go through Chapter 9's change review, and the desk then drafts their controls.
- **Recorded.** Used, applied, or dismissed with the architect's reason, kept with the model and sources. Advice whose reading has changed is shown as history.
- **Unconnected.** The desk says Sol is not connected, still shows what it would read, and nothing is sent.

### Sol in every chapter model (Chapters 2 to 10)

The same reasoning runs in the companion of every chapter model (`public/chapter-reasoning.js`, `public/chapter-sol.js`). Only the reading differs.

- **What can be asked about.** Every chapter's own records can be asked about:
  - Chapter 2: drivers;
  - Chapter 4: responsibilities;
  - Chapter 5: components;
  - Chapter 6: platform capabilities;
  - Chapter 7: realisations and their options;
  - Chapter 8: contracts and data definitions;
  - Chapter 9: threats and controls;
  - Chapter 10: runtime plans.

  Chapter 3's decisions and alternatives are asked about as the desk reads them. Chapter 2 and Chapter 9 each add one question of their own:
  - A move being explored in Chapter 2's *What if* is its own question. Its target and priority travel with the request, and another move makes the advice history.
  - A component, contract, data definition or realisation seen from Chapter 9 is asked *what could go wrong here*.
- **The chapter's reading of a record** contains:
  - the chapter model's own description of it;
  - its recorded fields and the fields not yet recorded;
  - the journey's checks on it, errors first;
  - the desk's vitals for the running parts it touches: all of them for a runtime plan; waiting, repeats, protection and availability for a contract; only those a driver carries for a driver.

  It also carries what the chapter knows besides:
  - a driver's carriers, tactics and trade-offs;
  - a What if's reach and arithmetic;
  - a realisation's options and weighing;
  - a contract's ends and what it carries;
  - a threat's coverage;
  - a part's recorded threats and controls, and what a proposed threat may target.

  Before the packet is built, the reading is fitted to its share. The least telling parts are dropped first; the record, its checks and its vitals are dropped last.
- **What Sol may change.** Sol may change the record's own fields, as knobs: the scenario wording of a driver, the purpose and boundary of a responsibility or component, a capability's continuity and recovery plans, a realisation's operating plans, a contract's timeout, retries, failure handling and duplicates, a data definition's protection and retention, a threat's actor, scenario and consequence, a control's mechanism, failure response, telemetry and verification, and a runtime plan's replicas, recovery time, scaling policy, recovery plan and monitoring. Numbers stay within bounds. A What if move and a Chapter 9 part have no knobs: Sol weighs the move, or proposes threats on the listed targets.
- **Checked by the chapter as well.** When Sol's answer comes back, each refinement becomes the chapter's own change command. The instruments read the design again with it, so the assessment arrives with which checks clear, which appear and which vitals move. A refinement the chapter's own rules reject is withheld, for example a ready count above the maximum replicas.
- **Decide.** *Review Sol's refinements…* opens the change review with the re-reading on top. Only the refined fields change. The record's links to other records are kept: a component's allocations, a capability's and a realisation's mappings, and a contract's exchanges. Proposed threats go through Chapter 9's change review as suggestions to confirm.
- **Sol's round of a chapter.** With nothing selected, the companion offers the records with the most open checks (errors count twice) as one request, and the verdicts are marked on the canvas.
- **Recorded.** Each outcome is recorded with the chapter and the chapter reading it rested on: used, agreed, applied, or dismissed with a reason. The advice shows what was done with it.

### One Sol

Each surface has one Sol control (`public/chapter-sol.js`: `solSection` in the companion, `solOverlay` in Sol's panel). In a chapter model the companion's section is the assessment and its footer *More with Sol* opens the panel; the panel shows that assessment's status, never a second answer. On Work tabs and Validate the panel is the assessment. The two share state and redraw each other through `aiw:sol-changed`. See *One Sol* in [AIW-BRAIN-ARCHITECTURE.md](AIW-BRAIN-ARCHITECTURE.md).

### The Brain learns: the knowledge stewards' queue

A disagreement with Sol's advice, anywhere, goes to the knowledge stewards' queue (Mind Factory → Architecture in context → *Stewards*; `public/knowledge-stewardship.js`, `public/stewardship-ui.js`). So does advice acted on whose knowledge was later withdrawn. Sol advises the stewards on each item (`K:<assessment>`). A captured disagreement becomes an original source and a candidate claim (`knowledge.capture`), and the queue leads it through review, release, activation and a link to its record. From then on, Sol reads it first among the sources for that record, and only for that record. The stewards may instead record that the knowledge and design stand, ask for a revisit (`knowledge.steward`), or withdraw what the advice rested on. See [AIW-BRAIN-ARCHITECTURE.md](AIW-BRAIN-ARCHITECTURE.md).

### Decisions trigger reviews, both ways

- **When a decision's working choice or state changes** in Chapter 3 (chosen, recorded, accepted or superseded), the server records an architecture change event with the decision as its source and everything it reaches as affected records — the requirements and drivers upstream as well as the responsibilities, components, contracts and runtime plans downstream — each with the reason it should be reviewed. Choosing ADR-001's durable handoff asks 16 records to review, among them REQ-001, REQ-002, REQ-005 and QD-002, QD-003, QD-006.
- **Ask for review.** From any probe — a decision, a running part, the objective — the desk can ask the records behind what it shows to review. The request records who asks and why, and each record once.
- Both appear wherever the existing change review appears: the notice on every chapter's page, the *Changes* count, and the change review dialog, where each record's reviewer records whether it still holds, was revised, or needs an owned follow-up. The SDD's change review section carries them.

### Anti-patterns are Chapter 11 findings

The anti-patterns found in recorded facts join Chapter 11's source findings as review items. On the desk each has its fix — *Add a standby or a second replica in Chapter 10*, *Record an idempotency key or duplicate policy in Chapter 8* — and **Treat it in Chapter 11** opens Chapter 11's own assessment: fix before review, carry as an action, accept as a limitation, or not applicable, with the reasons and the reviewer. They are review items, not blockers: the reference still has 211 blocking findings.

### In the reference project

- 14 running parts: 13 critical on at least one vital, 13 with no signal on at least one. Nothing records monitoring; no recovery time or timeout is recorded; 6 requests record no idempotency key; 1 of 4 threats is covered.
- For 100,000 concurrent users: 3,125 requests a second; 24 replicas each of the payment service, risk engine and core connector, 46 and 45 of the two workers; 940 database connections against PostgreSQL's default 100; 2,812,500 messages to hold through a 15-minute consumer outage; 163 pods on 16 nodes. Every runtime plan records a maximum of one replica, so nine parts are short.
- Every requirement's thread is unbroken to where it runs; none of the five trails is yet reviewed.
- 50 fixes are drafted, and 3 product choices framed as Chapter 3 questions; 10 readings need a judgement the desk will not make. All the drafts together turn 48 readings normal and leave 3 to watch — RabbitMQ and Patroni's configuration store need a third failure domain, and one PostgreSQL primary is past its planned limit (the switch point) — and bring three missing recovery points into view.

## Product choices, weighed against the drivers

Chapter 7 records a judgement of each product option against each criterion — the drivers its components carry, then operation, recovery, exit and cost. The reference had none. Product choices are now weighed the way Chapter 3 weighs alternatives, and the review desk's objective finds where a product stops keeping up.

- **What each product is documented to do** (`public/product-knowledge.js`). Mechanisms, each quoted with where the product documents it, and the attributes it bears on:
  - Kafka keeps records for a retention period, so they can be read again; a topic's partitions spread across brokers; each partition is replicated.
  - A RabbitMQ quorum queue replicates to a majority; consumers acknowledge and failures can be dead-lettered; a queue removes a message once acknowledged (Streams keep a log); each queue has one leader on one node.
  - PostgreSQL's unique constraints refuse a repeat; a standby can be promoted; every write goes through one primary. MongoDB's unique index, replica sets and sharding.
  - Redis Sentinel and persistence; Memcached's lack of either; Kong's and NGINX's rate limits; Keycloak's OpenID Connect; OpenTelemetry's trace context; pgBackRest's point-in-time restore; Patroni's automatic failover; Kubernetes' autoscaling and restarts.
  - The SA Playbook's own technology lists (which products it names for each attribute) are shown as *named*, and never weighed: naming is not a mechanism.
  - The operating model: self-managed is work for the team, provider-managed sits with the provider.
- **Suggested judgements.** Where a cell is not judged, a mechanism that bears on the criterion's attribute suggests *supports* or *a trade-off*. Where nothing documented bears on it, nothing is suggested.
- **The weighing.** A driver weighs as its priority (Critical 3, Important 2, Supporting 1), operation, recovery, exit and cost as 1; supports +1, a trade-off −1. It is shown twice — on recorded judgements alone, and with the suggestions — with the lean (★) and the sensitivity points: a driver whose one-step priority change would tip the lean.
- **Switch points.** Two mechanisms are single-unit bottlenecks: one queue's leader takes every message on it, and one primary takes every write. Their limits are planning assumptions on the desk (10,000 a second each until a benchmark replaces them). Under the objective, the desk says where each passes its limit, and which recorded alternative spreads the load instead — Kafka's partitions, MongoDB's shards. The objective's own row weighs only once the project records it (a scalability driver, or the saved review objective); the playbook's example is shown, not weighed.
- **Recording.** *Record the suggested judgements* lists each one with its mechanism and source; the architect leaves out any that do not hold and confirms. Each becomes a Chapter 7 judgement through Chapter 7's own assessment command, with the mechanism as its reason and the documentation as its evidence.
- **Where it shows.** Chapter 7's options view; the review desk's *What it takes* cards (one line per choice: which way the drivers lean) and companion (the table, the switch point, recording); a *Product choices* tile on the desk's monitor; and Chapter 2's What if, where a product not yet judged against a driver says what its documentation suggests.

In the reference project:

- TR-003: RabbitMQ +3 against Kafka +7 with the suggestions — the payment trail (QD-006) is where they differ, because a queue removes what it has delivered and Kafka keeps it. One queue holds to about 224,000 concurrent users; past that, split the work across queues, or Kafka's partitions spread it across brokers.
- TR-002: PostgreSQL and MongoDB tie, but one PostgreSQL primary passes its planned limit above about 74,667 users (9,375 writes a second at 100,000): split the writes by service or key, or the recorded MongoDB option shards them.
- TR-001: the drivers lean to managed Kubernetes, on operation alone.
- Three choices to revisit; none is chosen for the architect.

## The knowledge behind the models

Three layers sit under every chapter model. Each reads recorded facts; none of them changes the project.

- **The SA Playbook, structured** (`public/playbook-knowledge.js`, generated from `SA Playbook_v2.xlsx` by `scripts/build-playbook-knowledge.py`).
  - Twelve quality attributes in five families. Six carry the guidebook's entry — definition, why it matters, measures, example targets, design decisions, technologies, tests, risks — and the trade-offs from the quality deep dives. The other six say where the playbook covers them instead.
  - 56 tactics and design decisions by attribute and group, each with its concept, example and use case.
  - The style × quality table (five styles) and the pattern × quality table (14 patterns), with their marks kept as marks: × support, (×) conditional support. They are never turned into scores.
  - The playbook's anti-patterns and its decision template.
  - Every entry carries its locator (sheet and cell), shown wherever it is quoted.
- **Design reasoning** (`public/design-reasoning.js`). One chain per driver through the whole design; tactics found only where recorded words name them, with the words quoted; What if; the weighted reading of decisions and their sensitivity points; architecture style as a decision.
- **Specification and anti-patterns** (`public/design-spec.js`, `public/spec-panel.js`).
  - **Specification.** Select a part in any of Chapters 4 to 10 and the companion panel says what realises it: the responsibility (Ch 4), the component (Ch 5), the platform capabilities (Ch 6), the products with version, vendor and operating model (Ch 7), where and how it runs — replicas, zones, state, recovery (Ch 10) — the drivers it must meet and the decisions behind it. What is not yet specified is listed, not filled in. Each row links to the chapter that records it.
  - **Products on the models.** Chapter 5's components carry the products they stand on — the one that says most about the component first (its data store, queue or cache before the compute every component shares), the rest behind *+N*; Chapter 10's rail says what each part runs on.
  - **Anti-patterns.** Found only in recorded facts and named as the pattern catalogue names them: single point of failure, synchronous chain, missing idempotency, retry storm, shared database coupling, god service, unbounded queue, observability as an afterthought. Each names the objects it concerns, asks the question to settle, and quotes the playbook where it speaks. They appear on the parts they concern and on Validate, beneath SDD readiness.
- **Products in the reference.** Every Chapter 7 realisation now names a product with its version, vendor, benefits and drawbacks, and an alternative to compare: Kubernetes 1.31 or a managed service; PostgreSQL 17 or MongoDB 8.0; RabbitMQ 4.0 or Apache Kafka 3.9; Redis 7.4 or Memcached 1.6; Kong Gateway 3.9 or NGINX; Keycloak 26 or managed OIDC; OpenTelemetry, Prometheus and Grafana or managed APM; pgBackRest 2.54 or provider snapshots; Patroni 4.0 or a runbook. None is chosen for the architect — each stays a candidate until Chapter 7 records the choice.

In the reference project five anti-patterns are found: a single point of failure (RUN-001, RUN-002, RUN-004 each run one replica with no standby and carry Critical drivers), a synchronous chain (APP-001 → APP-002 → APP-003 → APP-004), missing idempotency on five requests that carry QD-001, an unbounded queue (TR-003, RabbitMQ, records no capacity) and observability as an afterthought.

## Shared by every chapter model

- **One place in the page.** A chapter's models replace the explorer's canvas on its Model tab; on Chapter 1, which has a page of its own, they replace that page's requirements map and inspector. Only one chapter model is on the page at a time.
- **One camera.** Pan, zoom, fit, sticky heads and a sticky label rail behave the same in every chapter model (`public/model-stage.js`).
- **One way back.** The explorer's toolbar returns to the chapter's models. The choice between the chapter models and the explorer is remembered for each project and chapter.
- **Deep links.** The link a page opens with is kept until the right chapter model loads, even if the page rewrites its address first. The address a page rewrites for its own default selection is not mistaken for a link.
- **One lane engine.** Models that read across regions — Chapter 9's trust boundaries, Chapter 5's modules, Chapter 4's journey steps, Chapter 1's context — share one layout (`public/lane-layout.js`), checked by each chapter's tests. Chapter 4 adds bands, so each group keeps rows of its own; Chapters 5 and 9 are laid out exactly as before.

## Files

| File | Responsibility |
| --- | --- |
| `public/story-model.js` | Pure model: journey steps in order with who takes part, requirements under the steps that need them by priority slice, outcomes and their owners, scope, constraints and assumptions, the Chapter 4 responsibilities covering each requirement and the Chapter 2 drivers naming it; the chapter's findings and proposals; folding by scope and depth; the context; journey walks; insights; plain reading |
| `public/story-layout.js` | Pure layout for the journey map (steps as columns, slices as bands) and the context (the shared lane engine, with the limits as notes beneath) |
| `public/story-view.js`, `public/story.css` | The Chapter 1 Model surface: journey map, context, lenses, dissection, companion panel, journey walk, the chapter's editors and proposals; takes the place of the chapter page's own map |
| `public/requirements.js` | Chapter 1's page: its editor accepts preset links, its map carries the *Chapter 1 models* button, and it exposes its editors to the model (`window.aiwRequirementsPage`) |
| `public/playbook-knowledge.js` | The SA Playbook as typed knowledge, generated by `scripts/build-playbook-knowledge.py`: attributes and families, the guidebook's entries, trade-offs, tactics, the style and pattern tables with their marks, anti-patterns and the decision template, each with its locator |
| `public/catalogue-index.js` | The pattern catalogue's names, aliases, conflicts and alternatives, generated by `scripts/build-catalogue-index.mjs` |
| `public/design-reasoning.js` | Pure reasoning over the recorded design: one chain per driver, tactics with quoted evidence, What if, the weighted reading of decisions and their sensitivity points, architecture style as a decision, links to the catalogue and the playbook |
| `public/design-spec.js`, `public/spec-panel.js` | Each part's specification from responsibility to product and runtime, anti-patterns found in recorded facts, and the companion-panel sections that show them in Chapters 4 to 10 and on Validate |
| `public/utility-model.js`, `public/utility-layout.js` | Pure model and layout for the utility tree and What if |
| `public/utility-view.js`, `public/utility.css` | The Chapter 2 Model surface: utility tree, What if, lenses, dissection, companion panel, the priority walk, the chapter's editors and proposals |
| `public/quality-domain.js`, `public/quality.js` | Chapter 2's domain gains the playbook's core attributes as driver types with proposals from its measures; its page carries the *Chapter 2 models* button and exposes its editors (`window.aiwQualityPage`) |
| `public/tradeoff-model.js`, `public/tradeoff-layout.js` | Pure model and layout for the decision map and the trade-off matrix |
| `public/tradeoff-view.js`, `public/tradeoff.css` | The Chapter 3 Model surface: decision map, trade-offs, lenses, dissection, companion panel, decision walk, the chapter's editors and commands |
| `public/decisions-domain.js`, `public/decisions.js` | Chapter 3's domain gains *Architecture style* as a topic; its page carries the *Chapter 3 models* button and exposes its editors (`window.aiwDecisionsPage`) |
| `public/technology-realisation-domain.js` | The reference's Chapter 7 options name a product, version, vendor, benefits and drawbacks for every realisation, with an alternative each |
| `public/desk-vitals.js` | Pure: every running part's eight vitals against the targets its drivers and platform set, with reasons, tactics and fixes; the system's vital signs |
| `public/desk-capacity.js`, `public/product-facts.js` | Pure: an objective turned into a performance specification for every part, with its planning assumptions and the documented product rules it checks; the SDD's performance specification |
| `public/desk-model.js`, `public/desk-layout.js` | Pure: the desk's reading — trace, where to start, anti-pattern findings, decision probes and what a probe asks to review — and the three grid layouts |
| `public/desk-view.js`, `public/desk.css` | The review desk: Chapter 11's Model and Validate's third mode — monitor, vitals, what it takes, trace, probes, the rounds, drafted fixes with their preview, asking for review and saving the objective |
| `public/desk-fixes.js` | Pure: a fix drafted for each critical or silent vital and each switch point, as the owning chapter's commands built from the desk's numbers; composing drafts, simulating them on a copy, and describing what changes |
| `public/brain-reasoning.js` | Pure: the Brain at a decision — decision points read by the instruments, the reasoning packet with receipts, Sol's contract, validation, the deterministic guard, settling, currency and adoption |
| `public/brain-reasoning-ui.js` | Sol at the desk: preparing and showing what Sol will read, sending, assessments beside the drafts and on the cells, recording outcomes |
| `public/model-knowledge.js` | The models' knowledge packs (structured playbook, product mechanisms) with receipts, and withdrawal reaching the models and Sol |
| `intelligence-provider.js`, `intelligence-service.js` | `requestReasoning` (assessment, guard, source check, settling); `AIW_LLM_BASE_URL`; `/api/intelligence/reasoning-context`, `/reason`, `/reasonings`; `intelligence.adopt` kind `assessment` |
| `public/chapter-reasoning.js` | Pure: Sol in every chapter model — what can be asked about for a selection, each chapter's reading of its record, its knobs and change command, the instruments' re-reading, the fitted reading and the chapter's round |
| `public/chapter-sol.js` | Sol in the chapter models' companions: the ask, what Sol will read, the assessment beside the record, refinements through the change review, proposed threats, agreement and disagreement, verdicts on the canvas |
| `public/knowledge-stewardship.js` | Pure: the stewards' queue (disagreements, and advice acted on whose knowledge was withdrawn), the capture draft, each capture's place on the governed path, Sol's stewardship readings, and the claims learned for a record |
| `public/stewardship-ui.js` | The stewards' queue in the knowledge workspace: items, Sol's advice to the stewards, capture and decisions, the next governed step |
| `mock-llm-provider.mjs` | A loopback test double of the Responses API, for verification only |
| `public/workbench-ui.js` | The change review opens for several ordinary changes at once (`reviewDesignChanges`), as the desk's drafts need |
| `public/decision-impact.js` | What a decision reaches both ways, and the change event that asks earlier and later chapters to review when its working choice or state changes (hooked into `worker.js`) |
| `public/changes-domain.js`, `public/changes-ui.js` | Change review gains reviews asked for by hand (`change.request`) |
| `public/review-domain.js`, `public/review-ui.js` | Chapter 11 gains anti-pattern findings, the saved review objective (`review.objective`, `review.objective-clear`) and the SDD's performance specification; its assessment opens from the desk |
| `public/product-knowledge.js` | What each product is documented to do: mechanisms with their sources and attributes, the single-unit ceilings, the SA Playbook's technology lists and the operating model |
| `public/product-choice.js`, `public/choice-ui.js` | Pure: each realisation's options weighed against its criteria — recorded and suggested judgements, the lean, sensitivity points, the switch point — and the shared table and recording dialog |
| `public/validate-view.js`, `public/validate.css`, `public/readiness-model.js` | Validate: SDD readiness across the journey with what each chapter's own models show, and the switch to the model views |
| `public/responsibility-model.js` | Pure model: journey steps, responsibilities at the steps they serve, groups, logical flows and their conditions, what each owns and touches, the components realising them and the interactions carrying their flows, the reasons behind them; folding by scope and depth; coverage with an unsaved proposal; journey walks; insights; plain reading |
| `public/responsibility-layout.js` | Pure layout for the responsibilities (steps as lanes, groups as bands) and the coverage matrix |
| `public/responsibility-view.js`, `public/responsibility.css` | The Chapter 4 Model surface: responsibilities, coverage, lenses, dissection, companion panel, journey walks and their record, proposals and staged model proposals |
| `public/realise-model.js` | Pure model: components, what they realise, own and stand on; allocations with scope and currency; interactions and the logical flows they carry; folding by scope and depth; the allocation matrix with an unsaved proposal; insights; plain reading |
| `public/realise-layout.js` | Pure layout for the component model (card heights from what they carry) and the allocation matrix |
| `public/realise-view.js`, `public/realise.css` | The Chapter 5 Model surface: components, allocation, lenses, dissection, companion panel, logical-flow walk, proposals and staged model proposals |
| `public/platform-model.js` | Pure model: capabilities, needs, mappings and dependencies; essential and single paths; what each capability's and each domain's loss stops, by the chapter's own simulation; folding by scope and depth; insights; plain reading |
| `public/platform-layout.js` | Pure layout for the platform stack: rows by family, columns by module, cells, plates and dependency brackets |
| `public/platform-view.js`, `public/platform.css` | The Chapter 6 Model surface: platform, what fails together, lenses, dissection, companion panel, failure walk-through, proposals and staged model proposals |
| `public/stack-model.js` | Pure model: realisations, their options and assessments, obligations, sizing, cost and selection state, over the Chapter 6 platform; folding by family and rows; the options matrix; insights; plain reading |
| `public/stack-layout.js` | Pure layout for the stack (fixed columns from provision to decision) and the options matrix |
| `public/stack-view.js`, `public/stack.css` | The Chapter 7 Model surface: stack, options, lenses, companion panel, option previews, proposals and staged model proposals |
| `public/lane-layout.js` | The shared lane engine behind Chapters 1 (context), 4, 5 and 9 |
| `public/exchange-model.js` | Pure model: contracts, data, links and lifeline order; journey, entry and catalogue scenarios; folding by scope and depth; insights; plain reading |
| `public/exchange-layout.js` | Pure layout for the sequence and the data flow |
| `public/exchange-view.js`, `public/exchange.css` | The Chapter 8 Model surface: rendering, lenses, dissection, companion panel, walk-through, proposals |
| `public/deploy-model.js` | Pure model: one environment's plans, placements, zones, dependencies and runtime paths; failure scenarios over the chapter's own simulation; folding by scope and depth; insights |
| `public/deploy-layout.js` | Pure layout for the deployment grid and its dependency trunks |
| `public/deploy-view.js`, `public/deploy.css` | The Chapter 10 Model surface: deployment, what fails together, lenses, dissection, companion panel, failure walk-through, proposals |
| `public/threat-model.js` | Pure model: elements, trust regions and flows; the chapter's coverage rule per affected object; crossings and entries; folding by scope and depth; the threats × controls matrix with an unsaved proposal; insights; plain reading |
| `public/threat-layout.js` | Pure layout for the threat model (shared rows, gutter tracks, entry trunks, crossing markers, labels) and the threats × controls matrix |
| `public/threat-view.js`, `public/threat.css` | The Chapter 9 Model surface: threat model, threats & controls, lenses, dissection, companion panel, journey walk, proposals |
| `public/model-stage.js` | Shared pan, zoom, sticky heads and rail for the chapter models, on the workbench and on Chapter 1's own page |
| `public/workspace-ux.js` | Opens a chapter's own models on its Model tab; handles the *Explore all perspectives* switch, its return, and deep links |
| `public/architecture-explorer.js` | Adds the explorer's *Chapter N models* return button |
| `story-validate.mjs` (`npm run test:story`) | 6 model and layout checks, covering 40 journey map and context layouts and a 1,200-requirement synthetic import |
| `story-browser-validate.mjs` (`npm run test:story-browser`) | 10 rendered checks; needs Playwright |
| `utility-validate.mjs` (`npm run test:utility`) | 5 checks of the structured playbook, design reasoning, What if and the utility tree's layouts |
| `utility-browser-validate.mjs` (`npm run test:utility-browser`) | 9 rendered checks; needs Playwright |
| `tradeoff-validate.mjs` (`npm run test:tradeoff`) | 5 checks of the weighted reading, sensitivity points, pattern links, architecture style and both layouts |
| `tradeoff-browser-validate.mjs` (`npm run test:tradeoff-browser`) | 9 rendered checks; needs Playwright |
| `design-spec-validate.mjs` (`npm run test:design-spec`) | 6 checks of the products, specifications and anti-patterns |
| `desk-validate.mjs` (`npm run test:desk`) | 10 checks of the vitals, what it takes, the trace, decision reviews both ways, review requests, anti-pattern findings, the review objective in the SDD and the layouts |
| `desk-browser-validate.mjs` (`npm run test:desk-browser`) | 16 rendered checks; needs Playwright |
| `brain-reasoning-validate.mjs` (`npm run test:brain-reasoning`) | 7 checks: the packet, the contract, settling, the provider path, the server routes and adoption, and knowledge governance |
| `brain-reasoning-browser-validate.mjs` (`npm run test:brain-reasoning-browser`) | 7 rendered checks against a loopback test double of the provider; needs Playwright |
| `chapter-reasoning-validate.mjs` (`npm run test:chapter-reasoning`) | 9 checks: what can be asked about, each chapter's reading, what identifies it, change commands that keep relations, the instruments' re-reading, the packet, the contract per kind, the server and adoption |
| `chapter-sol-browser-validate.mjs` (`npm run test:chapter-sol-browser`) | 9 rendered checks in Chapters 2, 3, 7, 8, 9 and 10 against a loopback test double of the provider; needs Playwright |
| `stewardship-validate.mjs` (`npm run test:stewardship`) | 8 checks: the queue, Sol's stewardship advice, capture, the governed path to a link, Sol reading what was learned, the other decisions, a withdrawal from the queue, and the server |
| `stewardship-browser-validate.mjs` (`npm run test:stewardship-browser`) | 5 rendered checks of the whole learning loop against the test double; needs Playwright |
| `desk-fixes-validate.mjs` (`npm run test:desk-fixes`) | 8 checks of the drafted fixes: from the desk's numbers, judgements left to the architect, the chapters' own commands, simulation, the architect's numbers, the change review, batches of 20 |
| `product-choice-validate.mjs` (`npm run test:product-choice`) | 7 checks of the product knowledge, suggestions, the weighing, switch points under an objective, recording through Chapter 7 and What if |
| `readiness-validate.mjs` (`npm run test:readiness`) | 2 checks of the readiness line |
| `validate-browser-validate.mjs` (`npm run test:validate-browser`) | 7 rendered checks of the Validate switch; needs Playwright |
| `responsibility-validate.mjs` (`npm run test:responsibility`) | 7 model and layout checks, covering 40 journey layouts and fifty synthetic responsibilities |
| `responsibility-browser-validate.mjs` (`npm run test:responsibility-browser`) | 10 rendered checks; needs Playwright |
| `realise-validate.mjs` (`npm run test:realise`) | 7 model and layout checks, covering 40 component layouts and a 160-component synthetic system |
| `realise-browser-validate.mjs` (`npm run test:realise-browser`) | 9 rendered checks; needs Playwright |
| `platform-validate.mjs` (`npm run test:platform`) | 7 model and layout checks, covering 48 platform layouts and a 160-component synthetic system |
| `platform-browser-validate.mjs` (`npm run test:platform-browser`) | 8 rendered checks; needs Playwright |
| `stack-validate.mjs` (`npm run test:stack`) | 6 model and layout checks, covering 84 stack and options layouts and a synthetic stack |
| `stack-browser-validate.mjs` (`npm run test:stack-browser`) | 8 rendered checks; needs Playwright |
| `exchange-validate.mjs` (`npm run test:exchange`) | 10 model and layout checks, covering 288 sequence layouts and 64 data-flow layouts |
| `exchange-browser-validate.mjs` (`npm run test:exchange-browser`) | 12 rendered checks; needs Playwright |
| `threat-validate.mjs` (`npm run test:threat`) | 7 model and layout checks, covering 18 threat model layouts and a 160-part synthetic system |
| `threat-browser-validate.mjs` (`npm run test:threat-browser`) | 9 rendered checks; needs Playwright |
| `deploy-validate.mjs` (`npm run test:deploy`) | 6 model and layout checks, covering 36 deployment layouts |
| `deploy-browser-validate.mjs` (`npm run test:deploy-browser`) | 10 rendered checks; needs Playwright |

## Verification

- **Chapter 1 model and layout checks (6):**
  - The adapter reads five journey steps in order with who takes part, the requirement each needs, what each requirement delivers and is limited by, whether its acceptance can be tested, and — one layer down — the Chapter 4 responsibility covering it.
  - Holes in the journey, requirements off the journey or delivering nothing, outcomes nothing delivers, a broken journey order, a requirement tied to an out-of-scope boundary and requirements no responsibility covers all surface. Untestable acceptance and an unconfirmed assumption each come with the chapter's own proposal.
  - The journey map shows every requirement once, in its slice under the first step that needs it, with holes and what no step needs; it slices to one step, one person or one outcome, and folds to one card per slice of each step. The context slices the same way, and a proposed limit stands among the limits without changing the lanes.
  - Layouts of both views, with and without a proposal: columns, slices and cards never overlap and each card stays in its step and its slice; in the context every route is orthogonal and passes through no other card, labels avoid cards and each other, and the limits sit beneath. The lens cannot move anything.
  - The journey is walked step by step, and a requirement reads where it is needed, what it delivers, what it rests on and what covers it.
  - A 1,200-requirement import over twenty steps opens folded to one card per slice of each step, opens one step with all its requirements, and draws its context without a collision.
- **Chapter 1 rendered checks (10):**
  - The journey map opens in place of the chapter page's own map and inspector: five steps with who takes part and their recorded order, one Must slice, each requirement carrying the Chapter 4 responsibility covering it, nothing selected on arrival.
  - Each lens shows its own reading and leaves every position unchanged.
  - Selecting a requirement reads it; **Edit** opens Chapter 1's own editor.
  - The pending-payment enquiry stands under *Settle the payment* in a Should slice of its own; observable acceptance marks REQ-005; the unverified dependency turns the model to the context and stands among the limits; each is dismissed.
  - **Add a requirement for this step** opens the editor already linked to the step; saved, the new requirement stands under that step in its slice.
  - The walk, dissection of a step, Escape, and folding to Steps.
  - The context: the system as its boundary, people, outcomes and owners, the limits beneath; selecting an outcome lights what delivers it.
  - *All perspectives* and back through the page's *Chapter 1 models* button; a deep link opens on its record; Validate opens on SDD readiness and shows what the Chapter 1 models find, and an observation opens the model on its record.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Validate:** the readiness line (2 checks) and the switch (7 rendered checks) pass, now with Chapter 1's observations beside its checks.
- **Chapter 2 model and layout checks (5):**
  - The playbook is structured with a locator for every entry: 12 attributes in 5 families, 56 tactics and design decisions, the style and pattern tables with their marks, its anti-patterns and its decision template.
  - Every driver has one chain through the design, and the playbook's tactics are found in it only with quoted evidence, telling named from merely considered.
  - What if: 99.9 % → 99.99 % over 30 days shrinks the budget from 43.2 to 4.3 minutes, so a single replica that restarts in ten minutes stops holding and a second zone makes it hold again; recovery targets meet recovery times, response targets meet timeouts, and a priority change shows which decisions would tip.
  - The utility tree reads utility → quality → attribute → driver, Critical first, with the core attributes nobody covers as holes a proposed driver can fill; it slices, folds and says what it shows.
  - Layouts: cards never overlap, and neither the lens nor a proposal moves anything.
- **Chapter 2 rendered checks (9):** the tree opens in place of the chapter's map with its holes; each lens reads its own and moves nothing; selecting a driver reads its tactics with evidence; a hole reads the playbook and **Explore** draws a proposed driver until dismissed; What if reads 4.3 minutes a month and opens the editor with the tuned values; the walk, dissection, Escape and folding; *All perspectives* and back, a deep link, and Validate; a 390 px phone; no page errors.
- **Chapter 3 model and layout checks (5):**
  - The weighted reading and the sensitivity points (ADR-002 turns on QD-001 and QD-003), in plain arithmetic.
  - Patterns and failure boundaries link to the catalogue and the playbook only where their words name them.
  - Architecture style as a decision: offered from the playbook's table while none is recorded, and recorded with its marks as reasons and the catalogue's conflicts as its failure boundary.
  - The map slices to a decision or a driver, folds to decisions, and draws an unsaved alternative in its decision.
  - Layouts: every driver keeps its own track and port, no route passes through a card, and the lens moves nothing.
- **Chapter 3 rendered checks (9):** the map opens with drivers, decisions, alternatives and the style decision; each lens reads its own and moves nothing; selecting an alternative reads its reasoning and **Make it the working choice** uses the chapter's command; trade-offs with the weighted reading, sensitivity points and the playbook's styles; recording the style through the chapter's editor and change review; the walk, dissection and Escape; *All perspectives* and back, a deep link, and Validate; a 390 px phone; no page errors.
- **Specification and anti-pattern checks (6):**
  - Every Chapter 7 realisation names a product with version, vendor, benefits and drawbacks and an alternative; none is chosen for the architect.
  - A component's specification reads LR-001 → APP-001 → six platform capabilities → Kubernetes 1.31, PostgreSQL 17, Kong Gateway 3.9… → RUN-001, with its drivers, decisions and what is not yet specified.
  - The same specification from a responsibility, a component, a realisation or a runtime plan; a runtime plan says what it runs on.
  - Five anti-patterns in the reference, each from recorded facts, named from the catalogue, pointing at recorded objects, and quoting the playbook verbatim where it speaks.
  - Findings follow the facts: a recorded capacity clears the unbounded queue; an unbounded retry policy raises a retry storm and a bounded one does not.
  - Reading them changes nothing.
  - Rendered, in the Chapter 5 checks: each component names the product it stands on first, with the rest behind *+N* on one line; selecting one reads its specification from LR-002 to Kubernetes 1.31 and PostgreSQL 17 with their vendors, to RUN-002, and the three anti-patterns it and its runtime are part of.
- **Review desk checks (10):**
  - Vitals: 14 running parts on 8 vitals, services first and then the platform from the edge inwards, each with its state and reason; each vital follows the facts — a second zone, monitoring, idempotency keys and a covering control turn them normal; a recovery time past the target turns it critical.
  - What it takes: 100,000 concurrent users are 3,125 requests a second, 24 replicas of APP-001, 46 of the settlement worker, 940 connections against PostgreSQL's 100, 2,812,500 messages for a 15-minute outage and 163 pods on 16 nodes; a Chapter 2 driver and its surge, a zone rule, a request rate and a load-tested throughput each change it; room to grow meets it.
  - The thread from each requirement, and a break where a link is missing.
  - Where to start, most critical first; what a probe on a part and the objective ask to review.
  - A decision reaches both ways; choosing it records a change that 16 records review in their own chapters; nothing changed asks nothing.
  - A review asked for by hand is validated and recorded like any change, each record once.
  - Anti-patterns are review items, treated like any finding; the review objective is validated, saved and carried into the SDD.
  - Layouts never overlap; a 134-part design reads in well under a second; reading changes nothing.
- **Drafted fix checks (8):**
  - From the desk's numbers: 24 replicas for RUN-001; timeouts nested 2,000 › 1,300 › 650 ms; a 2,900,000-message bound for a 2,812,500 backlog, with what the sender does when it is full; `paymentReference` as idempotency key; Chapter 9's own control proposals; monitoring from what each driver measures.
  - Judgements left to the architect, each pointing to its chapter.
  - Every draft builds, as the owning chapter's staged commands, carrying the whole record; a switch point becomes a Chapter 3 question with an alternative for each product.
  - Simulated first: one draft turns one cell; a standby brings a recovery point into view; three nodes in two zones read *watch*; all together turn most of the monitor normal; the project is unchanged.
  - The architect's numbers: 10 replicas read short by 14; a timeout above its caller's reads critical.
  - The change review: unreviewed is refused; kept as an alternative, nothing changes; applied, the cells turn, marked not yet confirmed, and the drafts are gone.
  - Batches of 20 changes; applied batch by batch every drafted fix is used up, and what remains is judgement.
- **Brain reasoning checks (7):**
  - The packet: a reading for each decision, with its knobs and bounds, first; then the objective, product mechanisms with receipts, drivers and tactics, within 22 sources and 28,000 characters. The architect's numbers are part of what is read.
  - The contract: only the packet's decisions and sources; verdicts that fit; refinements within bounds; threats on listed targets; no invented numbers; nothing guaranteed.
  - Settling: what the source check rejects, or Sol did not reach, is withheld.
  - The provider path: an assessment call and a check call; `store: false`; an https gateway only.
  - Through the server: prepared without sending; sent only as shown and only when configured; the design unchanged; replay not billed; outcomes recorded; an applied fix leaves the advice as history.
  - Governance: withdrawing the product mechanisms stops their suggestions, limits and use by Sol, and names the assessments that rested on them.
- **Brain reasoning rendered checks (7):** asking, with every excerpt shown before sending; the cell's verdict; Sol's refinement through the preview and change review (26 replicas recorded, used and applied); a whole step; a threat Sol proposed, recorded through Chapter 9; disagreement with a reason; stale advice shown as history; persistence; no page errors.
- **Chapter reasoning checks (9):**
  - What Sol can be asked about: every chapter's own records; Chapter 3's decisions and alternatives as the desk's; a part seen from Chapter 9; a What if move carrying only its target and priority.
  - Each chapter's reading: the model's own words, the fields and what is not recorded, the checks, the desk's vitals, and the chapter's own extras (for example, RUN-001 needs 24 replicas; QD-002 at 99.99 % leaves 4.3 minutes).
  - What identifies a reading: an edit to RUN-001 makes the advice on RUN-001, its component, responsibility and capabilities history, and leaves IF-001 and RUN-002 current; another move is another question.
  - Change commands: each of 44 knobs across 10 record types changes only its own field. A component's allocations, a capability's and a realisation's mappings, and a contract's exchanges are kept.
  - The re-reading: monitoring turns RUN-001's observability from critical to normal; a duplicate policy clears IF-001's check; a ready count above the maximum is rejected.
  - The packet: the chapter's reading first and whole, a round of six fitted to its share, the objective only where capacity is read, and the disclosure policy and withdrawals applied.
  - The contract per kind: a move cannot be refined; threat proposals only on listed targets; a preferred option for a realisation; no guarantee in refined wording; a refinement the chapter rejects is withheld.
  - Through the server: records, a Chapter 9 part and a move in one request; use, agreement and application are recorded with the chapter reading they rested on; a changed record makes the advice history.
- **Chapter Sol rendered checks (9):**
  - Sol's round of Chapter 10, with every chapter reading shown before sending, and the verdicts on the canvas.
  - RUN-001's refinement, read again and applied through Chapter 10's change review, then recorded and shown as history.
  - A What if move: Sol weighs it, another move makes the advice history, and agreeing is recorded.
  - ADR-001's and TR-001's leanings, with the choice left in each chapter.
  - A threat Sol proposed for APP-001, recorded through Chapter 9's review.
  - Disagreement with a reason in Chapter 8.
  - Persistence.
  - The unconnected state.
  - No page errors.
- **Review desk rendered checks (16):** Chapter 11 opens on the desk; a vital reads its arithmetic, tactics and fix, and a monitor tile follows its vital; probes pin and persist; what it takes is explored at 250,000 users and with a load-tested throughput, then saved through its confirmation; the trace and a decision probe ask 16 records to review; choosing a decision in Chapter 3 is announced in Chapter 2; the rounds; Validate's third mode on Chapter 5; treating an anti-pattern with Chapter 11's own assessment; a drafted fix previewed (the cell ringed with the state it had, the monitor showing what would change), its number changed and read again, refused unreviewed and applied through Chapter 10's change review (the cell turns and pulses); monitoring for 12 parts applied as one step; a draft kept as an alternative; Sol unconnected (what it would read shown, nothing sent); every draft previewed together; a 390 px phone; no page errors.
- **Product choice checks (7):** the knowledge is sourced and bears on known attributes; suggestions come from mechanisms (RabbitMQ strains the payment trail where Kafka supports it) and nothing is suggested where nothing is documented; RabbitMQ +3 against Kafka +7, one queue to about 224,000 users and one primary to about 74,667, three choices to revisit; a saved objective of 300,000 users passes one queue and widens the lean; suggestions become judgements through Chapter 7's command, and a counter-judgement makes QD-004 and QD-006 sensitivity points; What if reads the same knowledge; Chapter 7's options carry the weighing. Rendered, in the desk's checks: the choice on the card and in the companion, recorded from the desk, standing in Chapter 7's options with the weighing (15 rendered desk checks in all, with the drafted fixes).
- **Chapter 4 model and layout checks (7):**
  - The adapter reads five journey steps, five responsibilities at the steps they serve in three groups, four logical flows each carried by a Chapter 5 interaction, what each responsibility owns, exposes and is protected by, the component realising it, and its requirements, quality drivers (named or inherited) and decisions.
  - Holes in the journey, uncovered requirements, responsibilities without a reason or off the journey, missing realisations, uncarried flows and double data ownership surface; journeys that stop early name what they leave unowned and the proposal that answers them.
  - Slicing draws every responsibility once, band by band, with holes in their steps; folded, each group is one card at the first step it acts on.
  - 40 layouts, with and without a proposal: lanes, bands and cards never overlap, each card stays in its step and its group, routes pass through no other card, gutter tracks never share, labels avoid cards and each other, and the lens cannot move anything.
  - A responsibility proposal stands in its group with its relationship; coverage tells covering from inheriting and accepted from draft, and keeps the proposal column with its group.
  - Journeys are walked step by step, with where and why a scenario stops.
  - Fifty synthetic responsibilities (the most Chapter 4 accepts) in twelve groups over sixteen steps fold to twelve group cards and lay out without a collision.
- **Chapter 4 rendered checks (10):**
  - The responsibilities open in place of the explorer: five steps, three groups, five cards each carrying its component, every flow labelled, nothing selected on arrival.
  - Each lens shows its own reading and leaves every position unchanged.
  - Selecting a responsibility reads it; **Edit** opens the Chapter 4 editor; the manual review proposal is drawn in its group, then dismissed.
  - Moving a responsibility to another group is staged as a model proposal, drawn in the new band, and discarded.
  - Walking the risk hold, and recording a walk of the successful payment as the chapter's scenario review.
  - Dissection, Escape and folding to groups.
  - Coverage, with the missing links offered through the Chapter 4 editor.
  - Explore and back; Chapter 11 keeps the explorer; Chapter 5 keeps its own models; a deep link opens on its object; Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 5 model and layout checks (7):**
  - The adapter reads 5 components in 3 modules, each with what it realises, owns and stands on; 4 recorded interactions; 3 contracts with the outside; and 4 logical flows, each carried by an interaction.
  - Holes, components that realise nothing, uncarried flows, interactions without a failure policy or a logical flow behind them, double data claims and shared scopes all surface.
  - Slicing shows every element once, never groups the parties outside, and keeps neighbours as context.
  - 40 layouts, with and without a proposal: lanes and cards never overlap, each card is tall enough for what it carries, routes pass through no other card, gutter tracks never share, labels avoid cards and each other, and the lens cannot move anything.
  - A proposal stands in its module with its relationship; the matrix groups by module and keeps the proposal with its module.
  - The walk follows the four Chapter 4 flows.
  - A synthetic 160-component system in 40 modules, with no Chapter 5 records, folds into seven columns in flow order and lays out every component without a collision.
- **Chapter 5 rendered checks (9):**
  - The component model opens in place of the explorer, each card carrying what it realises and stands on, every interaction labelled, nothing selected on arrival.
  - Each lens shows its own reading and leaves every position unchanged.
  - Selecting a component reads it; **Edit component** opens the Chapter 5 editor on it.
  - Removing an allocation is staged as a model proposal: the hole appears, **Create a component for it** opens the editor already allocated, and discarding restores the saved design.
  - Dissection, Escape, module folding and the logical-flow walk.
  - Allocation, and a component proposal previewed as its own card and column, then dismissed.
  - Explore and back; Chapter 11 keeps the explorer; Chapter 9 keeps its own models; Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 6 model and layout checks (7):**
  - The adapter reads 9 capabilities, 5 components, 28 needs and 4 dependencies, and — by the chapter's own simulation — what each capability's and the shared domain's loss stops.
  - Unsupported needs, single paths, missing recovery, unused capabilities, trust crossings, the critical chain and a shared domain surface; a redundant arrangement in its own domain clears a single path.
  - Slicing draws every need exactly once, keeps rows in families, and places an unsupported need where its capability would be — or in a row for the missing category.
  - 48 layouts, with and without a proposal: rows, bands and columns never collide, cells sit where rows and columns meet, plates stay in their rows, brackets keep to their gutter on non-overlapping levels, and neither the lens nor the failure can move anything.
  - Recovery and missing-support proposals are drawn in place.
  - What fails together follows the chapter's simulation and moves nothing.
  - A synthetic 160-component system on twelve capabilities folds to 40 module columns and draws all 480 needs without a collision.
- **Chapter 6 rendered checks (8):**
  - The platform opens in place of the explorer: nine capabilities, five components, 28 needs, four dependencies and what each loss stops.
  - Each lens gives its own reading — Protection marks the fifteen needs that cross a trust boundary — and none moves anything.
  - Selecting a capability reads it; **Edit capability** opens the Chapter 6 editor; **Propose a recovery path** draws its two dependencies until dismissed.
  - What fails together, its walk, the whole domain, and no movement.
  - Dissection, Escape, module columns, and a component's needs editor.
  - Explore and back; Chapter 11 keeps the explorer; Chapter 5 keeps its own models; Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 7 model and layout checks (6):**
  - The adapter reads 9 realisations with their capability, options, dependants, what stops if they fail, and their criteria.
  - A preference, a recorded selection and written obligations are read as recorded; the model asks to decide first the choices whose failure stops everything.
  - Slicing shows every realisation once in Chapter 6's order, opens a family, lists every option, and shows a hole a proposal can fill.
  - 84 layouts: rows, bands and columns never collide, cells stay in their row and column, every option meets every criterion, and neither layout reads the lens.
  - Proposals and option previews are drawn in place.
  - A synthetic stack with up to six options per realisation lays out without a collision.
- **Chapter 7 rendered checks (8):**
  - The stack opens in place of the explorer: nine realisations, every choice hatched, 54 obligations open, three whose failure stops everything.
  - Each lens gives its own reading and moves nothing.
  - Selecting a realisation reads it; **Edit realisation** opens the Chapter 7 editor; the recovery proposal marks its three obligations until dismissed.
  - An option is previewed in the stack, then preferred through the chapter's editor.
  - Options compares alternatives, opens the assessment editor from a judgement, switches realisation from the bar; Escape returns to the stack; **With options** lists every alternative.
  - Explore and back; Chapter 11 keeps the explorer; Chapter 6 keeps its own models; Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 8 model and layout checks (10):**
  - The adapter reads the saved contracts, data and interactions.
  - The three journeys become sequences with properly nested answers. The held path stops at screening, and the uncertain path loses the settlement answer.
  - The call tree is used where no journey is recorded.
  - Folding never loses a message and keeps lifeline order.
  - 288 sequence layouts: rows never overlap, 5,217 labels stay in their own rows, and activations stay on their lifelines.
  - Neither layout reads the lens.
  - 64 data-flow layouts: tracks never collide.
  - Gaps stay visible.
  - Insights come from recorded facts.
  - A 40-module, 160-component system folds and lays out in a few milliseconds.
- **Chapter 8 rendered checks (12):**
  - Chapter 8 opens on the confirmed journey in place of the explorer.
  - All three lenses leave positions unchanged in both views.
  - The uncertain journey shows the lost answer and the missing recovery policy.
  - Selection, and Ask Sol on the selection.
  - Dissection and Escape.
  - Module lifelines.
  - The data flow keeps the same order.
  - An edit becomes an unsaved proposal on the sequence, and nothing is saved without review.
  - Walk-through.
  - The Explore switch persists and returns.
  - Validate and Work are unchanged, Chapters 6 and 7 keep the explorer, and Chapter 9 opens on its own models.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 9 model and layout checks (7):**
  - The adapter reads 16 elements in five trust regions, 7 contracts, 28 uses of platform and stores, and the journey in its recorded order, without changing the project.
  - Coverage follows the chapter's rule per affected object; a recorded treatment closes a threat; an unsaved proposal becomes its own column and names what it would close.
  - Seven crossings as drawn, with their states; insights and readings come only from recorded facts.
  - Slicing shows each element once at every depth, never groups parties outside, and keeps a part's neighbours as context.
  - 18 layouts: regions and cards never overlap, every route is orthogonal and passes through no other card, gutter tracks are shared only by an entry's trunk, labels avoid cards, markers and each other, and the lens cannot move anything.
  - The matrix keeps rows, priority bands and columns apart and puts the proposal beside Coverage.
  - A synthetic 160-part system in six boundaries folds, opens one boundary and lays out every element without a collision in a few tens of milliseconds.
- **Chapter 9 rendered checks (9):**
  - The threat model opens in place of the explorer: five regions, twelve elements, seven crossings, every contract labelled, the whole design fitting the width.
  - Each lens shows its own reading and leaves every position unchanged.
  - Selecting the exposed crossing and an entry reads them.
  - **Record a threat here** opens the threat editor with the contract chosen.
  - Dissection, Escape, boundary folding and the journey walk.
  - Threats & controls, and a control proposal previewed as its own column and on the threat model, then dismissed.
  - Explore and back; Chapters 8 and 10 keep their own models; only one chapter model is on the page; Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Chapter 10 model and layout checks (6):**
  - The adapter reads one environment's plans, placements, zones, dependencies and runtime paths, and orders components as the anatomy does.
  - Slicing shows every recorded copy exactly once at every depth and scope.
  - 36 layouts: rows, cells and zone columns never collide, trunks share no level, and neither the lens nor the failure can move anything.
  - Removing the Application zone stops the three parts placed there. A part placed elsewhere still stops through what it requires, and that dependency is identified.
  - Insights come from recorded facts.
  - A synthetic 160-part system in six zones and three failure domains folds, opens a module and simulates a shared-domain failure in a few milliseconds.
- **Chapter 10 rendered checks (10):**
  - The grid opens in place of the explorer, with a one-line environment picker.
  - Lenses and the failure view leave every position unchanged.
  - What fails together, its four-stage walk, and failing another zone.
  - Selection, dependencies and Ask Sol.
  - Dissection, Escape, and module rows.
  - **Place it** opens the placement editor for that part, and the saved placement appears in its zone.
  - A standby proposal is previewed in place and can be dismissed.
  - The Explore choice is kept per chapter, Chapter 8 keeps its sequence, only one chapter model is on the page, and Validate is unchanged.
  - On a 390 px phone there is no horizontal scroll.
  - No page errors.
- **Regressions:**
  - The Chapter 4 checks (7 model, 10 rendered), the Chapter 5 checks (7 model, 9 rendered), the Chapter 6 checks (7 model, 8 rendered), the Chapter 7 checks (6 model, 8 rendered), the Chapter 8 checks (10 model, 12 rendered), the Chapter 9 checks (7 model, 9 rendered), the Chapter 10 checks (6 model, 10 rendered) and the design anatomy checks (13 model, 11 rendered) still pass. Chapters 5 and 9 are laid out exactly as before the lane engine gained bands, checked by comparing their layouts before and after.
  - Chapter 4 now opens on its own models, so the other chapters' checks that a chapter without its own models keeps the explorer now use Chapter 11.
  - Chapter 1 now opens on its own models too; the chapter page's own requirements map is one click away and keeps every control it had.
  - All 44 regression suites that can run here still pass (checked again after Chapters 2 and 3, the specification layer, the product enrichment and the review desk). Every chapter now opens on its own models, so the checks that Chapter 11 kept the explorer now check that it opens on the review desk. The four that need the private SEABaaS workbook were not run.
  - With products named on every realisation, the Chapter 4 to 10 model and rendered checks were rerun: the specification panel, the product chips on Chapter 5's components and the *runs on* labels on Chapter 10's rail leave every layout as it was.

## Limits and next steps

- Nesting follows each contract's recorded kind. Where a real provider answers early, the contract should say so, for example as an event.
- Lifelines and rows cannot be dragged on the Model tab yet. They follow the smart order, or the order set on Validate.
- What fails together is the chapter's design simulation of declared copies and dependencies. It does not establish live failover, and external provider paths are not exercised.
- The Model's failure walk-through reads the chapter's simulation but does not record a walkthrough or take assumed quality measurements. The chapter's existing failure lab, which does, is not shown on the Model tab. The same was true when the Model tab showed the explorer.
- Novice and practitioner walkthroughs are still needed.
- Chapter 9's coverage is the chapter's design rule on recorded links and affected objects. It is not a security assessment, and it does not prove that a control is implemented.
- Uses of platform services and stores carry no data of their own in the recorded model, so the Information lens shows data only on contracts.
- Chapter 5's model shows recorded allocations and interactions; it does not judge whether a component boundary is well chosen. A component that realises nothing has no module to stand in, because Chapter 4 modules group responsibilities.
- At forty modules the Chapter 5 module view is large (about 3,600 × 4,400 points); open one module to read it closely.
- Chapter 6's What fails together reads the chapter's design simulation of declared support and dependencies; it is not a failover test, and it takes no quality measurements (the Work tab's lab does).
- Chapter 7 compares options by recorded judgements with reasons and evidence; it calculates no score.
- Chapter 4's blueprint places a responsibility at the first step it serves; one that serves several steps names them on its card. Journey scenarios are the ones the project records; walking one is a design walkthrough, not an execution.
- Chapter 1's journey map places a requirement under the first step that needs it; one needed at several steps names them on its card. Priorities are the chapter's own — Must, Should and Could.
- Chapter 1's context shows the people, outcomes and owners recorded in Chapter 1. Systems outside the design appear from Chapter 8 onwards, in its sequence and data flow.
- A proposal from Chapter 1 that records no links (the unverified dependency, for example) stands among the limits touching nothing until it is reviewed.
- What if is arithmetic on recorded facts: availability budgets, recovery times, timeouts and priorities. It does not estimate throughput or cost; where the design records no fact the card says *Not recorded*. The reference runtime records few recovery times, so most of its cards say so.
- The weighted reading of a decision is a lean, not a score, and never chooses. The playbook's marks stay marks.
- The playbook's style table covers only some qualities; where it is silent the model says so.
- Tactics are recognised from the words the design records. A tactic applied but not named is not inferred.
- Anti-patterns are prompts for review found in recorded facts. They are not an assessment, and one not recorded cannot be found.
- The reference products are illustrative candidates for the architect to judge; none is recommended or chosen.
- The review desk reads recorded facts. Vitals are design arithmetic — budgets, recovery times, timeouts, coverage — not measurements of a running system; *no signal* means the design does not record it.
- What it takes is an estimate for review. Its planning assumptions are starting points to replace with load-test evidence; the product rules are documented defaults to check against the version in use.
- Each recorded interaction is taken to happen once for each request that reaches its sender; a loop is counted once.
- Probes and the desk's view are kept in this browser; the review objective, review requests and treatments are kept in the project.
- Sol's assessments are advice, source-checked automatically, not independent verification. The rendered checks run against a test double of the provider; no live provider call was made here, and the quality of Sol's advice on real designs is not yet evaluated. Sol is on the review desk; the Chapter 1–10 companions keep their existing Sol and Mind Factory, and extending desk-style reasoning to each chapter model is next.
- Drafted fixes are design arithmetic too: the replicas, bounds and timeouts follow the planning assumptions, and a recovery objective is a target to prove by a drill, not a measurement. Every drafted value is marked unconfirmed. The desk drafts only what recorded numbers decide; threats, recovery points, sites and drills stay with the architect.
- Product knowledge covers the products in the reference options. Another product has no suggestions until its mechanisms are added, with their sources; the weighing still reads what is recorded.
- The single-unit limits are planning assumptions. RabbitMQ Streams and partitioned PostgreSQL designs change the picture; say so in Chapter 7's judgements.
- **Next:** guided walkthroughs for new and practiced architects; dragging lifelines and rows on the Model tab.
