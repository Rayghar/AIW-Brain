# Round 12 · The SDD as an architecture document: specification

This is the contract for the SDD's architecture edition (decision D-01). It follows the order and the reading style of
the reference SDD the owner supplied (an attribute-driven bank SDD of about 60 pages), built entirely from AIW's
records. No client text is reproduced here; the reference sets the shape, AIW's records set the content.

## Principles

1. **A design document, not a register.** The body explains the design: what drives it, what was decided and why, how
   it is composed, how it is drawn. Registers (every requirement, every change, every field) are annexes: separate,
   paged exports linked from Appendix D, never printed in the body.
2. **Every statement rests on records.** Each paragraph names the records it comes from (codes such as BD1, FD3, QD2,
   ADR-004, APP-007, IF-012) so a reader can follow it into AIW. Nothing is invented: a record prints what is stated, and
   a field it leaves empty prints nothing in its place; the "Open questions" at the end of its section (or of its module
   in section 4) names it once, one line naming every record and field the same question is asked of, and Appendix B
   lists it by cause (format 2, round 24, D-24-06; see "Format" below).
3. **Honest status.** The cover and each section say how far the content has come: drafted by Sol and not reviewed,
   drafted by a person, confirmed, accepted. Approval is printed only when an approval record exists.
4. **Readable at any size.** A section groups before it lists: requirements by requirement group, findings by cause,
   changes by record, figures by a node budget. No list prints more than 12 items inline; the rest are counted with a
   pointer to the annex.
5. **Codes are stable.** Driver codes (BD1 …) and requirement-group codes come from the records and do not change
   between exports.

## Front matter

- **Cover**: the solution name in capitals; "Solution Design Document"; the authoring group (the SDD narrative's
  owner or organisation, else "not named yet" with where to name it); version and status ("Version 0.1 · Working draft
  · not approved"); date; the baseline when one is frozen; the format marker after the cover (`<!-- aiw:sdd-format 2 -->`).
- **Document control**: a table of version, status, owner, audience (a dash where not stated), date, baseline;
  "Approvals: none recorded" unless
  an approval exists; one sentence on provenance ("Drafted by Sol from the requirements workbook; not reviewed by a
  person" when that is true).
- **Contents**: generated from the headings; page numbers in Word and PDF; links in HTML and Markdown.

## 1. Introduction: <solution name>

- Opening paragraph: what the solution is and what it replaces or extends (brief problem and goal, SDD narrative
  summary).
- **Purpose** (brief goal, narrative purpose).
- **Key functionalities**: one bullet per functional requirement group or functional driver, with its requirement count
  ("Customer management and onboarding (374 requirements)"). A project with modules (round 24, D-24-01 to D-24-03):
  one bullet per business module with its requirements, the functional drivers that cover it and its sub-modules with
  their counts; then the platform modules apart, each with its concern, its own requirements and what it serves (its
  serves rule: "serves 109 requirements in 14 other modules, those whose capability theme is …").
- **Target users**: actors and stakeholders, grouped (staff roles, partners, customers, external organisations).
- **Business problems solved**: one bullet per business problem (brief problems and outcomes): "Title: what changes".
- **Stakeholder personas**: a table: Stakeholder | Role | Motivations | Wishes | Concerns | How they use the solution |
  Expected benefits (Chapter 1 stakeholder persona fields; an empty cell prints a dash, the section's open questions
  naming it).
- **Scope**: in scope and out of scope, one line each (Chapter 1 scope records).

## 2. Architectural drivers

- One sentence: the drivers guide the design so that it meets the business needs, the functional requirements, the
  quality expectations and the constraints.
- One subsection per driver kind that has records, in this order: A. Business drivers (BD), B. Functional drivers (FD),
  C. Quality drivers (QD), D. Constraints (C), E. Operational drivers (OD), F. Data drivers (DD), G. Technology
  evolution (TE), H. Business continuity (BC).
- Each driver: "**BD1: Title**", then Description, Impact (on the architecture), Priority (High, Medium, Low, with the
  reason when recorded). A functional driver adds the requirement groups it covers with their requirement and gap
  counts. A quality driver adds its scenario in one sentence (stimulus, conditions, response) and its measurable target,
  or "target not stated".
- **Summary table**: Category | Driver | Description | Impact on architecture | Priority, every driver once.

## 3. Architecture decisions

- One sentence: the key decisions, driven by the drivers above.
- Grouped by decision category: I. Foundational choices; II. Structural decisions; III. Cross-cutting concerns;
  IV. Trade-offs and alternatives; V. Additional decisions. A decision without a category is listed under V.
- Each decision, under its title (the topic or question):
  - **Decision**: the chosen alternative's approach; or "Open: no alternative is chosen yet" followed by the
    alternatives under consideration. Round 25: then AIW's reading, apart from any proposal of Sol's: for an open
    decision, "The drivers lean to …" (or a tie, or the only alternative a hard constraint leaves), labelled as AIW's
    reading of the recorded effects and not a choice; for a working choice, where it stands when it does not lead (a
    hard constraint it breaks, the alternative that dominates it, its rank). The decision log says the same in a few
    words.
  - **Status**: draft, recorded, accepted or superseded, and the governance state.
  - **Justification**: the rationale, then one bullet per driver the decision serves: "Scalability (QD3): …" from the
    chosen alternative's effect and reason per driver.
  - **Alternatives considered**: each other alternative, its approach and why it was not chosen (its rejection reason,
    else its costs). Round 25: where a person gave neither, "AIW's reading:" follows (ruled out, dominated, or its rank
    and total on the drivers); it is not a reason, and the question why the alternative was not chosen stays open.
  - **Impact**: the gains (benefits) and the costs and consequences of the chosen alternative.
  - **Stakeholders**, **Dependencies**, **Licensing**, **Skills**, **Documentation**: printed when recorded.
  - **Answers**: the requirement groups, requirements (counted beyond 12) and drivers it answers, by code.
- **Trade-off analysis**: for each decision compared on weighted drivers (Chapter 3 trade-offs), the criteria, the
  result and the sensitivity. Round 25 (`decision-reading.js`): each alternative is weighed, never scored: the criteria
  with their weights (a constraint marked hard or soft) and the drivers left out because no priority is stated; a table
  of the alternatives with each total (with its range where effects are not stated), its effects and its standing
  (leads, tied, its rank, ruled out by a hard constraint, dominated, the working choice); then the result and how
  firmly it holds, the unstated effects that could change it, where the leader and the runner-up pull apart and the
  sensitivity points. Effects no person has reviewed say whose they are (Sol's, or drafted by AIW's rules from the SA
  Playbook). The arithmetic is shown; it does not choose.

## 4. Architectural components, interfaces, properties and composition

- Opening: the architectural styles and patterns the design uses (patterns of chosen alternatives and of components),
  one bullet each with where it applies.
- **High-level component description**: for each application component, numbered: its responsibilities and
  functionalities (realised responsibilities), and its relationship to the drivers: the drivers it serves, each with its
  reason ("Serves: FD1 Deposit accounts, because …", the component's own serves, D-24-05); a component that names none
  says how many drivers reach it through its responsibilities and requirements, and the specification table names
  their codes.
- **Component specification table** (landscape in Word and PDF): Component | Responsibilities | Properties |
  Technologies | Interfaces | Dependencies | Architectural solution | Architectural drivers. Technologies come from the
  Chapter 6 capabilities and Chapter 7 realisations the component needs (a capability with its product where one is
  named, the capability alone where none is; the products not named are asked once, in the section's open questions);
  interfaces from the Chapter 8 contracts it
  provides (operation names); dependencies from its interactions; properties and architectural solution from the
  component's own fields.
- **Component detail**, one subsection per component: interfaces (operations with their payload names), data model
  (data owned, consumed and produced with their key fields), coupling (data coupling through shared data definitions;
  control coupling through interactions), quality properties.
- **Quality-driver-focused interactions**: for each quality driver of High priority (then the others), how each
  component supports it (component properties, controls on it, its runtime plan, its capabilities), one bullet per
  component that has something to say.
- **External integrations**: for each external party, numbered: purpose; data exchange formats; communication
  protocols; security considerations; potential challenges; architectural facilitation (the components and contracts
  that use it).
- **By module** (round 24, D-24-03; a project with modules): a **Module overview** (one row per module: role,
  sub-modules, requirements, components, open questions) and the **Component specification table** first; then the
  **Business modules** and the **Platform modules**, each module with its role and size, its purpose (the Chapter 4
  group that realises it, else its own description), its sub-modules with their counts, the modules it uses and is used
  by (the Chapter 8 contracts between their components), its components in full (high-level line and detail), the
  components it shares named by reference ("Also part of this module: …"), the interfaces and data that touch its
  components, the integrations, invariants and batch chain that belong to it alone, and its own open questions; a
  platform module also says what it serves. A record in several modules prints in full once: a platform component under
  its platform module (in several, the one that owns or serves most of the requirements it realises), any other under
  its first module; its detail names the modules it is shared with. Membership is read only through module-scope.js:
  recordModules, then recordAttachments for a record the module chain does not reach and that has no links of its own
  (a party by the components its contracts join, a data entity by its owners, a contract by its ends, a control or a
  threat by what it protects or threatens), as the figures by module place it; an invariant goes where all the data and
  contracts it binds are. Then the **Records in no module** (any record in neither, an integration, an invariant or the
  batch chain among them), and the parts the modules share (quality-driver-focused interactions, the integrations,
  invariants and batch chain of several modules) with the section's open questions. The content reader reads the same
  records from either layout.

## 5. Architecture models

- Two sentences on the C4 levels used.
- **Context diagram (Level 1)**, **Container diagram (Level 2)**, **Component diagrams (Level 3)** (one per container
  that has components, within the node budget), **Deployment diagram**: each with a purpose line and a caption.
- A figure keeps to a node budget (about 40 nodes); above it, nodes are grouped (by requirement group, module or
  component) and a detail figure is drawn per group. Labels print at 7 pt or larger at A4 width. The text alternative is
  a short generated summary (under about 1,000 characters) pointing to the section that lists the elements.
- By module (round 24, D-24-07; the figure set lists what the section prints, level by level and module by module):
  where the project has modules, the **Module map** comes first, with its purpose line, as Figure 1 (if it draws the
  modules within fewer boxes to fit a page, a line says so). Where the deployable containers are not decided (no
  container holds a component, or one holds 80 % of them or more), the modules stand for them: **Containers by module
  (Level 2)** with its purpose line and the sentence saying why, and **Components by module (Level 3)** with its purpose
  line, then, where some module is not drawn in the body, a table with one row per module in Chapter 1's order (its
  components; its figures below, or its figure in the figures annex by title, or why it has none: one component, which
  section 4 describes, or none), then a heading and the figures for each module the body draws (the six of two
  components or more that hold the most; the figures annex draws every one), then the components no module holds.
  Figures are numbered from 1 in reading order. Where the containers are decided, levels 2 and 3 read by container, as
  above. Without modules, the section is as above.

## 6. Architecture model refinements

- The versions (baselines and plateaus) with what changed between them, from the change summary: records added,
  changed and removed by chapter, and open reviews by cause. If nothing is frozen: "This is the first version; no
  refinement is recorded yet."
- The plateaus, the gap plan (a group whose gaps no component closes shows a dash), the migration records (the fields
  each states) and the retired records; then the section's open questions: the groups no component closes and the
  migration fields not stated, each once.

## 7. Appendix

- **A. Requirements analysis and component mapping**: per requirement group: its description; its key functionalities
  (up to 12 statements, then "and N more"); delivery state counts when the requirements carry an assessment
  (delivered, partly delivered, not delivered); the components that realise it and the drivers on it. A platform module
  that owns no requirement says what it serves, by its serves rule.
- **B. Open items**: grouped by cause with counts, each with where to resolve it.
- **C. Domain lens**: when a lens is chosen (D-14), each concern with its state and the records that address it.
- **D. Annexes**: the full requirement register (by group), the traceability matrix (CSV), the change journal (paged),
  the architecture requirements specification, the component specifications, the interface specifications (OpenAPI,
  AsyncAPI), each with how to export it.
- **E. Provenance**: who and what wrote the records (people, imports, Sol drafts), what is reviewed and what is not, and
  the sources.

## Format

Every export prints format 2 (round 24, D-24-06): a record prints only what is stated, and an empty optional field
prints nothing (a table cell not stated is a dash). Sections 1 to 4 and 6 end with "Open questions" (in section 4 by
module, each module's own list too, and the section's list of what no module holds); the delivery edition's obligations
end with theirs. A list names each question once, one line for every record and field it is asked of, and one line per
set of fields the same records leave unstated, at most 12 lines with the rest counted and pointed to Appendix B. Each
record of sections 2 to 4 also carries a marker the renderers skip (`<!-- aiw:open description impact? -->`) naming the
statements it leaves open, so that the content reader reads format 2 as it reads format 1. Format 1 (an "open: …"
marker in place of each empty field, then "open") is what editions printed before round 24 and what baselines frozen
then keep; the content reader reads both the same, and AIW prints it only for the suites that compare the formats.

## Editions, audiences and formats

- Editions: **architecture** (the default; this specification) and **executive** (two pages: what the solution is, the
  top drivers, the open decisions, the shape, where it runs, what protects it, the risks and open items).
- Audiences: all (everything above); delivery (sections 1, 4, 5 and Appendix A and D, plus obligations); review
  (sections 2, 3, 6 and Appendix B, C and E, plus assurance).
- Formats: Markdown, HTML (with a contents sidebar), JSON (the document structure and figures; the project document is
  embedded only when asked), Word and PDF (contents with page numbers, real heading levels, a landscape section for the
  component table, figures at page width).

## Content standard and reviewer gate

Content readiness judges the written design separately from chapter readiness, external approval and measured quality.
The reader checks every record in the complete architecture edition, sections 2–4. A pass requires those three sections
to exist, contain records and have no content findings; a partially written or rules-drafted section does not pass. The
cover and Output screen report the score and the exact records to complete. A section with 20% or more open statements,
or at least half its records drafted by rules, bears the in-place banner “This section is a skeleton; Sol has not drafted
it”. An exported banner is binding when the Markdown is reread without the project.

| Section | Written content required |
| --- | --- |
| 2 · Architectural drivers | Every driver has a one-to-three-sentence description and a one-to-three-sentence architectural impact in project terms, with High, Medium or Low priority and its basis. Source silence is an explicit question, not a fabricated value. |
| 3 · Decisions | Every decision identifies a chosen or proposed alternative, compares at least two alternatives, justifies the preference by a named driver and reason, explains why each other alternative was not preferred, and states the impact. A recommendation is never recorded as approval. |
| 4 · Components and integration | Every component has a kind, links to a driver and gives at least three actual responsibility sentences. Named allocations, properties and solutions do not count as responsibility sentences. Every external integration states purpose, formats, protocols and security, or asks an explicit source-silent question. Data entities have noun-phrase names. |

Design fields do not carry provenance bookkeeping, count dumps, slug names or verb-fragment entity names. Provenance and
open questions have their own fields and appendix. Run `npm run test:sdd-content` for the synthetic positive and negative
cases. Run `npm run test:sdd-content -- /absolute/path/to/export.md` for a real exported Markdown edition; it rereads
the text and exits nonzero if incomplete. A JSON architecture package can also be given, but it carries AIW’s embedded
content reading without the Markdown; the checker labels this difference and validates the report’s complete structure.

Before delivering a client SDD, an independent named reader fills a page-by-page checklist **outside the source
repository**. The checklist records the exact export’s SHA-256, page count, reader name, reading date, the content score,
and for each section its page range, pass or fail, one short quoted line or specific omission, and a remedy for a fail.
The reader records the result for figures, traceability, source rights and open obligations as well. A template follows;
no blank template counts as a completed review, and content readiness never means that a person approved the design.

| Export SHA-256 | Page count | Reader | Date | Content score | Result |
| --- | ---: | --- | --- | ---: | --- |
| To be filled from the exact export | To be counted | Named person | To be recorded | From Output | Pending |

| Section and pages | Pass or fail | Short quoted line or specific omission | Remedy if failed |
| --- | --- | --- | --- |
| Cover and document control | Pending |  |  |
| 1 · Introduction | Pending |  |  |
| 2 · Architectural drivers | Pending |  |  |
| 3 · Decisions | Pending |  |  |
| 4 · Components and integration | Pending |  |  |
| 5 · Models and figures | Pending |  |  |
| 6 · Refinements | Pending |  |  |
| 7 · Appendices, evidence and trace | Pending |  |  |

## Acceptance

- Every section above is present for a project that has the records, and says "none recorded" in one line otherwise.
- On the SEABaaS-size project: the architecture edition is under 2 MB of Markdown without figures and under 150 pages in
  PDF; every requirement is accounted for through its group, with the complete matrix in the annex; the export takes
  under 10 s; no figure label is smaller than 7 pt at A4 width.
- A section-presence suite checks the order and the headings against this specification; a size suite checks the
  bounds on a synthetic large project.
