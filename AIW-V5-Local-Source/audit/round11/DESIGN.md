# Round 11 · The right instruments at each stage

Baseline: `25e29fc` (AIW v0.10.0-rc.10.73.15 candidate). Branch `claude/dazzling-cerf-a3qshh`. Controlling baseline
rc.10.73.6; `productionAccepted` false.

Asked for: a models audit (every view relevant and adding to the reader's understanding of the application being
modelled; the right views at each stage; non-relevant views removed; the surgeon analogy applied as practicably as
possible); a critical look, from the user's lens, at the missing component library, component specifications and
architecture requirements specification (non-functional requirements); refined edit and input fields; the Brain and
co-author wired properly with the model so the spark gives relevant autofill suggestions; and, from round 10, corridors
for the Layers view.

The facts below come from three inventories of the source at `25e29fc` (every view per chapter; every record type,
output and editor; the spark, the Brain routes and the fields). Line numbers are of that commit.

## 1. The lens

The user is a solution architect producing a defensible design record of one application, read later by a reviewer
and by someone who has never seen the design. At each chapter they are at a *stage*: the records that exist decide
what can be looked at. The surgeon analogy (`MODELLING-DIRECTION.md` §3) says what an instrument is for: hold the
subject steady, change what is revealed. Overview, isolation, cross-section, behaviour, intervention. The five
dimensions (scope, realization, concern, context, design state) are internal; the interface exposes them through where
you are, what you hold, and what each instrument reveals.

Three principles follow, and every change below is tested against them:

1. **An instrument earns its place by a question no other instrument answers at that stage.** Two instruments that
   answer one question are one instrument.
2. **Nothing is offered that has nothing to show.** A view or scene whose records do not exist yet is not on the tray;
   the chapter that creates them is named instead. (Whole design already does this per lens; it becomes the rule.)
3. **The subject stays put.** What the reader holds (a record, a scope) survives the change of chapter, view and
   concern, and is said in one place.

## 2. The audit

### 2.1 Views, chapter by chapter

Today every chapter offers: the Diagram (1–6 scenes), two to four own views, Layers, Table, Matrix, Whole design and
the Perspectives group — ten or more choices, none gated by what the project holds (`app.js:315,317`; `addViews`
`notation-view.js:604`; no code hides or disables a `.cm-view`). The help map lists fewer views than the switchers
draw (`shell-ux.js:211-221`). Seven own views read the same record pair as the chapter's default Matrix
(`model-matrix.js:17`), two own views carry the name of a Diagram scene offered beside them, and one label is used
twice with two meanings.

| Ch | Instrument | Verdict | Why (user's lens) |
| --- | --- | --- | --- |
| 1 | Journey map | keep, default | the chapter's question: what must happen, for whom, how important |
| 1 | Context (own) | **rename "Boundary"** | it is the scope card (people, outcomes, owners, limits); "Context" beside the C4 Context scene is two things with one name |
| 1 | scenes process, motivation | keep | the journey as BPMN; the why |
| 1 | scenes context, sequence | **gate** | they read Chapter 5 components and Chapter 8 contracts; at Chapter 1 they are empty pictures with an empty note |
| 2 | Utility tree, What if | keep | the tree is the chapter; What if is the intervention (move a target, see what stops holding) |
| 2 | scenes drivers, motivation | keep | drivers is the architecture-requirements picture |
| 3 | Decision map, Trade-offs | keep | Trade-offs is weighted and sensitive, not a pair |
| 3 | Matrix default decision×quality | **change default** | it repeats Trade-offs; the Matrix opens on decision×requirement (what each decision answers) |
| 4 | Responsibilities, Coverage | keep | Coverage holds three sets at once |
| 4 | Matrix default requirement×responsibility | **change default** | one slice of Coverage; the Matrix opens on responsibility×component (the forward look: realised yet?) |
| 5 | Components | keep, default | |
| 5 | Allocation | **retire** | it is exactly the Matrix responsibility×component (`realise-view.js:7`); the Components view already draws each allocation inside its module |
| 5 | **Specification** (new) | add | the isolation instrument: one component with everything the design says about it (§2.4) |
| 5 | scenes application, context, container | keep; context and container gated on their records | |
| 5 | scene cooperation | **drop from 5** | it reads Chapter 8 contracts; Chapter 8 offers the same picture where it belongs |
| 6 | Platform | keep, default | |
| 6 | What fails together | **rename "If a capability fails"** | the same label as Chapter 10's with a different meaning |
| 6 | Matrix default component×capability | **change default** | it repeats the Platform grid; the Matrix opens on capability×technology (what realises each capability) |
| 7 | Stack, Options | keep | |
| 7 | scene usage | gate | it needs a Chapter 10 environment |
| 8 | Sequence (own) | **retire into the scene** | the UML sequence scene (standard, exported) draws the same messages; the own view's contract promises (timeout, retry, failure) move into that scene's companion for the selected message |
| 8 | Data flow | keep | |
| 8 | scenes integration, data, lineage, cooperation, sequence, lifecycle | keep; lifecycle and sequence gated on their records | |
| 9 | Threat model, Threats & controls | keep | the coverage view carries evidence |
| 9 | Matrix default threat×control | **change default** | the Matrix opens on control×component (what each control protects) |
| 10 | Deployment | keep, default | |
| 10 | What fails together | **rename "If a zone fails"** | |
| 10 | Matrix default component×instance | **change default** | it repeats the Deployment grid; the Matrix opens on runtime plan×quality driver (which targets each plan carries) |
| 11 | Vitals, What it takes, Trace, Running board | keep | four distinct readings |
| 11 | Matrix default requirement×runtime | **change default** | it repeats Trace; the Matrix opens on requirement×control (what protects what was asked for) |
| all | Layers, Table, Whole design | keep | cross-section, data, overview |
| all | Perspectives · "New perspective…" | gate | offered once the chapter holds a record |
| all | help map | **rewrite** | it becomes the instrument tray: every instrument the chapter offers, one line each, and what later chapters add |

Diagram scenes are gated by the picture's own readiness (`viewpointOf(D).readiness`, `notation-model.js:591-596`):
a scene whose picture is empty is not in the picker; the picker's last entry says "Context from Chapter 5" and the
like, so the reader knows what is coming. Own views declare what they need (a record type, or a record type with a
count); a view whose need is not met is not drawn, and the chapter's default view opens with its empty card and the
chapter's draft action (round-8 J-14). A deep link to a hidden view falls back to the chapter default and says so in
the "You are here" line.

Nothing is lost: every retired view's information lives in the instrument that keeps its question (Allocation in the
Matrix and the Components view; Sequence's promises in the scene's companion).

### 2.2 The surgeon analogy, applied

| Dimension | Exists today | What round 11 adds |
| --- | --- | --- |
| Scope | selection carried between chapters; perspective scope; Whole design dissect | a **subject strip** in the Model tab: "Holding: Payment API · APP-003 · release", filled when a record is selected, kept across chapters while the record or a counterpart is drawn, and the chapter's default view opens on it (lit, focused or dissected). Round-8 J-43 (a selection that belongs nowhere in the new chapter is released, and says so) |
| Realization | Whole design strata; Chapter 5 allocations; specFor | the component specification (§2.4) is the realization read in one place |
| Concern | lens bars differ by chapter (S/F/R, S/O/P, F/S/I, P/I/F, O/F/P) | one vocabulary: the seven lens names of Whole design (Structure, Flow, Signals, Information, Protection, Operation, Reasoning); each chapter shows its subset under those names |
| Context | Arrange; perspectives' organizing context | unchanged |
| Design state | baselines, Compare, frozen perspectives | unchanged |
| Overview · isolation · cross-section · behaviour · intervention | Whole design · dissect · Layers and Matrix · process and sequence scenes · Work with preview, What if, failure simulations | the help map names which instrument is which, in these words |

### 2.3 The stage

The shell presents everything always; readiness is read for marks and Validate but never gates a view
(`readiness-model.js:194-223` feeds marks, `projectHasRecords` is read only by the desk's note). Round 11 makes the
stage visible: the tray per chapter (§2.1), the subject strip (§2.2), and the Output tab listing the documents the
chapter can produce *now* and those that need later chapters.

### 2.4 The missing deliverables: a critical look

The product promises "measurable expectations" (Chapter 2), allocation "without losing identity" (Chapter 5) and a
living SDD that carries the design and its obligations (`PRODUCT-VISION.md:7-14`). Three deliverables an architecture
practice expects from such a record are absent, and the reader cannot see them because they are not there to see.

**Architecture requirements specification (ARS).** The records exist: a Chapter 2 driver is a quality scenario with
stimulus, conditions, response, metric, operator, target, unit, window, measurement, priority and links
(`quality-domain.js:61,128-129`); `targetIsMeasurable` (`:47`) is strict. But no document frames them as a
specification: drivers appear as the Chapter 2 register and as references in the traceability register. The categories
stop at twelve (`:6-20`): no compliance, privacy, cost or capacity, so a regulatory obligation can only be a Chapter 1
constraint in prose. Recovery targets are held three times (Chapter 2 recoverability, Chapter 6 `recoveryMinutes`,
Chapter 10 `recoveryMinutes`) and capacity four times (Chapter 2 scalability, Chapter 7 capacity, Chapter 10 replicas,
Chapter 11 objective), unlinked except in the desk vitals.
*Round 11:* an **Architecture requirements specification** as a document (Chapter 2 Output, and an SDD section that
widens today's capacity-only "Performance specification" to every category), produced from the drivers: purpose and
scope, the categories, each requirement with id, scenario, measurable target, verification, priority, owner, source,
and its trace (requirements, responsibilities, components, decisions, controls, runtime plans), the conflicts, and the
open items (unmeasurable targets, unverified targets, targets no runtime plan carries). Four categories added
(compliance, privacy, cost, capacity). Chapter 6 and 10 recovery fields and Chapter 7/10 capacity fields gain a
`driverId` link to the Chapter 2 scenario they serve, so the ARS shows each target's chain and any disagreement; the
Validate tab gains the gate "every driver measurable, verified-by named, carried by a plan".

**Component specification.** A component holds purpose, boundary, owner, prose inputs, outputs and technology needs,
owned data ids and decision ids (`realisation-domain.js:129-155`); it holds no interface, no quality attribute, no
behaviour, no version. The nearest specification is `specFor` (`design-spec.js:59-93`), computed for the companion and
never stored or output, and it omits contracts, data and controls. The SDD's component register is a listing.
*Round 11:* a **component specification** read from the links the design already records — identity, purpose,
boundary, responsibilities (4), provided and required interfaces with their contracts and promises (8), data owned,
consumed and produced (8), quality targets inherited through its responsibilities (2), technology needs and the
capabilities that support them (6), product choices (7), controls that protect it and threats that target it (9),
runtime plans and placements (10), decisions it rests on (3), open gaps — as the Chapter 5 **Specification** view (the
isolation instrument: the held component in the centre, its specification around it, each entry a link to its record),
as a per-component document (Chapter 5 Output) and as an SDD section. Two structured links join the component record,
`consumesDataIds` and `producesDataIds`, so inputs and outputs can name data definitions instead of prose (the prose
stays as description).

**Component library.** None exists. The project and organisation libraries hold templates and guidance
(`workbench-domain.js:128-133`; `organization-service.js`), and the knowledge catalogue holds twenty component
archetypes with component kits, interface kits and obligations (`brain-catalogue.js`) that nothing can instantiate.
*Round 11, first increment:* a `component` library kind whose content is a component specification; "Add to the
library" from a project component (the specification snapshot, with its interfaces, needs and obligations); "From the
library" in Chapter 5 Work, which proposes a component (status candidate, origin library or archetype) with its
contracts and needs as proposals through the existing reviewed path — library content is knowledge, a proposal is not
a record, and nothing is approved by the act of installing. The organisation library's review and signed releases
apply unchanged. A catalogue reading in the workbench lists the archetypes and the organisation's components with
"Propose into this project".

### 2.5 Editing

Two dialog systems (Chapters 1–3 native dialogs with browser validation; 4–11 `dialog.js` with inline validation),
at least ten field class families at three font sizes and three focus rings, five studios with a private copy of
`field()` beside the shared `studioField`, descriptors (`record-fields.js`) rendered by Chapter 4 only, maxlength
disagreements, no required marker outside three families, owners as free text in every chapter while Chapter 1
records stakeholders, patterns and tactics as prose beside the catalogues that name them, assumptions as prose beside
Chapter 1's assumption records, and status words that differ by chapter.
*Round 11:* one field kit for every editor — the descriptors render every field (`fieldHTML`), the studio helpers
replace the private copies, Chapters 1–3 move to `openDialog` with inline validation and the step structure the other
chapters have, one size, one focus ring, one required marker, maxlength from the descriptor; pickers where a linked
record exists: owner (stakeholders, with free text kept for people not recorded), pattern and anti-pattern (the
catalogue), tactic (the playbook), assumption (Chapter 1 records), data in and out (Chapter 8 definitions). Status
words stay what each chapter's domain means (an owner decision) but are shown in one chip language.

### 2.6 The spark and the Brain: why suggestions do not feel relevant

The wiring exists and is sound: three bands (rules from the project, confirmations, a Sol draft), a server-built
packet, a two-pass grounded draft, provenance recorded on save, budgets and receipts
(`field-spark.js`, `intelligence-service.js:193-284`, `intelligence-provider.js:240-296`, `worker.js:102-198`).
What makes it feel unwired:

1. **With an OpenAI key alone, Sol is "not configured"** (`AIW_LLM_MODEL` is required for OpenAI,
   `intelligence-provider.js:35`), the help text names OpenAI settings even when Anthropic is selected
   (`intelligence-ui.js:31`, `brain-reasoning-ui.js:51`), and the status line does not say what to set.
2. **The draft is on demand, two clicks deep** (Prepare, then Draft), one field at a time; nothing is offered when the
   editor opens. The rule bands are computed on click too.
3. **The packet is generic.** It holds the record, its parent, four requirements, four drivers and three claims
   (`intelligence-service.js:229-237`); it does not hold the record's own neighbours by chapter — a component's
   responsibilities and their purposes, a contract's two components, a control's threats, a plan's component and
   capability — which are what a relevant draft is made of.
4. **Seven record types have no rule provider** (dependency, boundary, TI connection, party, lineage, environment,
   zone) and four forms are outside the spark (needs, placement, field, candidate), so their bands are empty.
5. **A dismissal is forgotten** (in memory only, `field-spark.js:11,328`), and a reopened editor does not show what was
   accepted before (`:102`), so the spark repeats itself.
6. **The live probe covers one field** (Chapter 4), so nobody has evidence of the spark's drafts on the other chapters.
7. Two provenance vocabularies (From your project / Confirm / Sol draft against stated / inferred / upstream / open /
   Sol) for one idea.

*Round 11:* a documented default model for OpenAI so a key alone connects (an owner decision names it); the status
line and help name the selected provider and exactly what is missing; on editor open, the rule offers for every empty
field are computed and said in one line ("4 suggestions from your project · Fill"), and the Sol packet for the
record's primary fields is prepared so the first click sends; chapter-aware neighbours in the packet (`relatedOf` by
record type: responsibilities, components, contracts, data, capabilities, threats, controls, plans, each as a short
reading) and the field's descriptor help in the instruction, so the draft is about this record in this design;
providers for the seven types and descriptors for the four forms; dismissals persisted in the existing
`coauthor.dispositions`; a reopened editor shows its accepted provenance; one provenance vocabulary (stated · inferred
· Sol draft · edited) across the spark and the journey draft; `sol:live-check` extended to one spark draft per chapter,
so the owner's local run records the drafts' relevance as evidence. The checks that keep the Brain within doctrine
(proposals only, grounded, budgeted, audited) do not change.

### 2.7 Corridors for the Layers view

The by-layer arrangement orders each lane by barycentre and routes every connector on its own
(`notation-layout.js:303-343`, `way: new Map()`); the tree and layered arrangements plan corridors through dummy
nodes first (`layered`, `:245-246`) and bundle cleanly. The Layers views carry 18,211 crossing points across 64 views
against 564 on the 88 Diagram defaults, and 10 of round 10's 16 fallbacks are Layers views.
*Round 11:* a connector that spans more than one lane is given a corridor through each lane it crosses: the gaps
between a lane's elements (72 px) are slots; long connectors are assigned to slots by the barycentre of their ends,
ordered to minimise crossings, at most four to a gap (eight pixels apart) without widening the lane; the corridor
points become `way` for the router, so a long connector threads the lanes where it was planned and bundles find each
other. Measured by the round-10 evidence harness: crossing points, foreign shared runs and fallbacks on the 64 Layers
views, with the same gates.

## 3. Workstreams, in order

| # | Workstream | Delivers | Proof |
| --- | --- | --- | --- |
| A | The tray | view and scene gating by records; retirements and renames of §2.1; Matrix defaults; the help map as the instrument tray; the subject strip and carry rules; one lens vocabulary | `model-views-browser`, `notation-browser`, chapter browser suites: a fresh project offers only the views that can draw; a deep link to a hidden view falls back and says so; the subject survives a chapter change |
| B | The specifications | ARS document and SDD section; four categories; `driverId` links on recovery and capacity fields; the Validate gate; the component specification (reader, Chapter 5 view, Output, SDD section); `consumesDataIds`/`producesDataIds` | domain suites (quality, realisation, review documents): the ARS lists every driver once with its chain; a component specification names every linked record and no other; SDD editions carry both sections |
| C | The spark | §2.6 | `field-spark`, `coauthor`, `intelligence` suites on the test double; `sol:live-check` per chapter (owner's run) |
| D | Corridors | §2.7 | `notation-layout`, `notation-metrics`, the evidence harness: Layers crossing points and fallbacks fall; every gate holds |
| E | The field kit | §2.5 | the studio dialog gate (`formFieldsMatch`) on every chapter; `field-spark-pages` on Chapters 1–3 with inline validation; a11y: every control labelled, required marked, errors described |
| F | The library | §2.4 library increment | workbench and organisation suites: add to library, propose from library and from an archetype, nothing approved by installing |

Each workstream commits on its own once its suites pass; the round closes with the full regression, the report and
the release field rc.10.73.16.

## 4. Owner decisions, with the defaults this round uses

1. Retire Chapter 5 Allocation (the Matrix keeps the pair) — default yes.
2. Retire the Chapter 8 own Sequence view into the UML sequence scene, promises in its companion — default yes.
3. Drop the cooperation scene from Chapter 5 — default yes.
4. Rename Chapter 1 Context to Boundary; Chapter 6 and 10 "What fails together" to "If a capability fails" and
   "If a zone fails" — default yes.
5. The Matrix defaults of §2.1 — default as listed.
6. Gating by records rather than by chapter number (a chapter whose later-chapter records already exist, from an
   import, sees them) — default yes.
7. The OpenAI default model when `AIW_LLM_MODEL` is unset: the one the recorded live runs used (`gpt-4.1-mini`) —
   default yes; the owner may name another.
8. The seven lens names as the one vocabulary — default yes.
9. Status words per chapter kept, shown in one chip language — default yes.
10. The component library's first increment is proposals only; no component is approved by installing — fixed by
    doctrine, not a choice.

## 5. Deferred, with reasons

Linked pickers beyond owner, pattern, tactic, assumption and data (round 12); a stored component specification with
its own revision (the derived one is the record until the owner wants to sign a specification); summaries for the
straight-line giants and nesting for composition (round 10 §5); the independent novice walkthrough and the ArchiMate
junction review (external).

## 6. Success

- A fresh project's Chapter 1 offers Journey map, Boundary and the process and motivation scenes, and nothing else;
  Chapter 5 with components offers the Specification view; the help map and the switchers agree on every chapter.
- The ARS lists every Chapter 2 driver with a measurable target or an open item; the component specification of a
  reference component names its interfaces, data, targets, capabilities, products, controls, plans and decisions.
- With a key and no model named, Sol connects; opening a Chapter 5 component editor offers suggestions for its empty
  fields without a click; a field draft's packet names the record's own neighbours.
- Layers crossing points fall by at least 20% on the reference views, with no new fallback.
- Every editor renders from descriptors with inline validation; `formFieldsMatch` holds for all eleven chapters.
