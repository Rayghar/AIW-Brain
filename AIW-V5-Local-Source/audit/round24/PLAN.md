# Round 24 · Modules, views and an SDD that reads like a design

Baseline: `1b9af2d` (AIW v0.10.0-rc.10.73.24). Branch `claude/dazzling-cerf-a3qshh`, never pushed. Controlling baseline
rc.10.73.6; `productionAccepted` false. Release field at the close of this round: AIW v0.10.0-rc.10.73.25.

Client material stays out of the repository: the owner's register, the reference SDD, the drafted design and its exports
stay in the evaluator's scratch space. What follows describes them by structure and counts only.

## 1. What was asked

The owner read the SDD that AIW drafted from the owner's 1,400-requirement register in round 23 and asked for:

1. the three fixes proposed after reading it: one component per concern; each open question said once; the big
   decisions first, and each component's drivers limited to the ones it serves;
2. AIW itself updated, so that every project gets them, not only this document;
3. better diagrams;
4. a smart, intuitive way to handle and display each chapter's models and diagrams: the requirements broken into
   modules and sub-modules that make sense, so that the design journey is connected and manageable from a views
   standpoint, and those views included in the SDD as required.

## 2. What the round-23 document showed

Read by the lead, and by five read-only code maps of the figures, the grouping model, the drafting pipeline, the SDD
composition and the screens (an automated and a manual reading, not a person's review).

**The register's shape.** 18 domains partition it: every requirement has exactly one. The 19 capability themes cut
across the domains (each spans 2 to 16 of them) and are mostly cross-cutting concerns (reporting 328 requirements,
workflow and maker-checker 254, audit 77, user access 57, bulk and batch 20, integration 10, notifications 9, end of day
9, performance 2), with some functional ones (branch and teller operations 164, loan lifecycle 77, charges and interest
63, product configuration 42, tax and accounting 40, customer profile and KYC 40, investment and treasury 32,
collateral 15). A "module" column holds 1,221 distinct values: a feature name, not a module.

**Findings.**

- **F1 · The figures carry no structure.** At this size every level folds, and the fold has nothing to group by: no
  drafted design has modules (neither drafter creates Chapter 4 responsibility groups), the C4 component nodes are not
  typed as components so the fold falls back to the element kind, every component derives one container ("Compute
  implementation"), and every placement sits in one zone. The result: a context overview of three boxes, a component
  overview of two, detail figures of the ten most-connected of 120 components plus "110 more", and a deployment detail of
  11 of 150 placements. Every figure also nests one `<svg>` per node and per group header for clipping, so a tool that
  reads a figure up to its first `</svg>` sees one node and every edge, and the HTML stylesheet's `.model-figure svg`
  rule reaches those nested clips.
- **F2 · Every requirement is drafted twice.** The import makes 18 domain groups and 19 theme groups; each requirement is
  in one of each, and the model drafting sends all 37 as units.
- **F3 · Nothing makes one component per concern.** From about the tenth unit on, the packet's state (160 rows, drivers
  first) no longer shows earlier components, so concerns are proposed again (20 stores, 16 reporting, 14 audit
  components). The cross-cutting pass is never told to merge (its merge request sits in the packet, under instructions
  to ignore instructions in the data), sees titles only, applies a merge only when the units come in a given order, and
  loses what the folded proposal said. Rules-skeleton components are kept beside Sol's replacements.
- **F4 · A component's drivers are every driver its requirements share**, through whole-group links; Sol's own
  `drivers` answer is written into a rationale nobody prints.
- **F5 · Filler.** The SDD prints an open marker or a "no … yet" line for nearly every empty field of every record; a
  drafted integration's one question three times; four functional drivers each "374 requirements in RG-001"; Appendix B
  lists one open field under two labels (so `openItems.total` counts it twice).
- **F6 · Order.** Decisions keep their record order: unit decisions come first, the cross pass's style and hosting
  decisions last; the categories are never defined to the model.
- **F7 · No structure to navigate by.** No scope survives a chapter change; each chapter's own module scope (Chapters
  4, 5, 6, 8 and 10 and the whole design) has no modules to scope to; Chapters 1 to 3 have no notion of a module at all.

## 3. Design decisions

Each is made here with its reason; the owner may reverse any of them.

**D-24-01 · Modules and sub-modules are requirement groups in a tree.** A requirement group of kind `module` is a part
of the solution's functional decomposition, with a role (`business` or `platform`); a group of kind `sub-module` has a
`parentId` naming its module. Depth is two. Membership stays a rule on imported attributes or explicit ids; a module's
members are its own plus its sub-modules'. Business modules partition the requirements: every requirement belongs to
exactly one leaf, and Chapter 1 raises a finding for a requirement in no module or in two. Platform modules own the
requirements of their own area (if any) and **serve** cross-cutting themes across the business modules (a `serves`
rule). No parallel model: everything already keyed on requirement groups (links, traces, figures, the SDD, the delivery
plan, review plans) works for modules as it is.

**D-24-02 · AIW proposes the module structure from the source; a person accepts or changes it.** A deterministic
proposal reads the requirements' own columns: the column that partitions them with a modest number of values (here the
domain) gives the modules; a second column gives each module's sub-modules (here the capability theme within the
domain, small pairs gathered into "Other"); a theme that recurs across many modules and names a cross-cutting concern
(reporting, workflow and approval, audit, access, notifications, integration, batch and end of day) is served by a
platform module, which is the matching area where the source has one (an audit log, user and role management,
integration and channels, reporting, end of cycle) and a new platform module otherwise. Existing groups with the same
rule are converted in place, so their ids and links stay. The structure is saved as proposed; a person accepts it, and
an agent or service account cannot. Every part of the proposal says which column and rule it came from.

**D-24-03 · Each module is realised by one Chapter 4 responsibility group.** A responsibility group links the module it
realises (`requirementGroupIds`). The drafters create one per module and put each drafted responsibility in its
module's group, so the architecture model's existing module chain (responsibility, component, capability, realisation,
plan, placement, zone) gives every record of Chapters 4 to 10 its module, and every view that already scopes by module
has modules to scope to. A record's module scope is read in one place: its requirement links, its group links and that
chain; a record in several modules is shared.

**D-24-04 · Drafting runs by module, once per requirement.** Where modules exist, the drafting units are the modules:
platform modules first (they define the shared services), then business modules by size; a module above the packet's
150 requirements is drafted in parts of whole sub-modules. Theme groups are facets and are not drafted. Every packet
carries the module's requirements by sub-module, the platform services proposed so far, and every component proposed
so far (the state is capped per kind, components first). The contract (`sol-architecture-4`) asks a component for its
module, the platform services it uses instead of re-proposing them, and the drivers it serves with a reason; it defines
the decision categories and keeps "foundational" for the cross-cutting pass. The cross-cutting pass gets its own
instructions: it sees every component with its sentences, grouped by concern, and answers merges. Before the bundle is
sealed, a deterministic consolidation folds the components that remain one concern (one per concern in a module, one
platform service per cross-cutting concern), joins what the folded proposals said, re-points the data, integrations,
controls and batch work that named them, and drops a rules-skeleton component that Sol's accepted proposals replace.
Every fold and replacement is a note in the preview, so the person who reviews the draft reviews the consolidated
design. Nothing is applied without that review.

**D-24-05 · A component names the drivers it serves, with a reason.** A component gains `serves: [{driverId, reason}]`.
The SDD prints those, with their reasons; a component without them prints how many drivers reach it through its
requirements, not the list.

**D-24-06 · The SDD reads like a design (format 2).** New exports carry a format marker; the content reader reads both
formats, so frozen editions and old exported files read the same.

- A record prints what is stated. An empty optional field prints nothing; an open question is printed once, in the
  section's (and in Section 4, the module's) "Open questions" list, where one question asked of several records or
  fields is one line naming them. The reader takes a record's open statements from that list, so a record with open
  fields still falls short of the standard: nothing is hidden from the content reading.
- Appendix B keeps one label per open field; `openItems` counts each once.
- Decisions: within each category, the platform-wide decisions (style, hosting, integration, data, the cross-cutting
  pass) come first, then by how many modules and drivers they answer; the decision log follows the same order.
- Key functionalities: one line per module, with its sub-modules and counts; platform modules listed apart.
- The purpose and audience, when the brief is silent, are asked once, with where to write them.
- Section 4 is organised by module: a module overview, then per module its purpose, sub-modules, components (with their
  detail), interfaces, data and open questions; the platform modules form their own part.

**D-24-07 · Figures by module.** A new module map (the functional decomposition: business modules with their sub-modules
listed, platform modules as a band, external parties grouped by kind, actors) opens Section 5 and Chapter 1's views. The
container level draws modules as logical containers when the design's containers do not partition the components (and
says so); the component level draws one figure per module (its components, the platform services it uses, the parties
it reaches), the largest in the body and every one in the figures annex; the context groups parties by kind; the
deployment groups placements by module inside each zone. A folded group prints as a list box naming its members (up to
six, then "N more"), on screen and in print. Each figure is one SVG root (clipping by `clipPath`, not nested `<svg>`),
and a suite counts every figure's nodes and titles against the diagram and reads it the way an outside tool would.

**D-24-08 · One module scope across the journey.** The shell carries a scope (a module or sub-module) in the address and
keeps it across chapters and tabs. The rail gains a Modules section: the tree with counts and readiness, a module map
to open a module from, and a breadcrumb ("All modules › Lending › Origination · Clear"). Every chapter's Work
registers, Model views and Validate lists show the scope (with the platform services and parties it touches as
context); views that already scope by module take the shell's scope. Chapter 1 shows the proposed structure and lets a
person accept it, rename, move a sub-module, change a rule, or redraw it from other columns.

**D-24-09 · Measured on the owner's register.** After the round, the register is drafted again through the new AIW and
compared with run 3 and the reference: units sent, tokens, components and duplicates, open-question lines, filler
lines, pages, figures (count, nodes drawn, smallest label) and the content reading. No person's review is claimed.

## 4. Workstreams

Each workstream works in its own worktree, owns its files, runs its focused suites, and is audited and merged by the
lead (no check deleted or loosened, no client text, no secret, no model identifier).

| # | Workstream | Decisions | Owns | Order |
| --- | --- | --- | --- | --- |
| W1 | Module core: the tree in requirement groups, the proposal, accept, partition findings, the record-scope reader, the import option, the Chapter 4 group link | D-24-01, 02, 03 (link) | requirement-groups, requirement-commands, a new module-model, intake-proposals, intake-service, intake-ui (option), logical-domain (group link) | first (lead) |
| W2 | Drafting by module: units, packets, contract 4, cross-pass merges, consolidation, skeleton retirement, drivers served, decision order in the bundle, Chapter 4 groups per module | D-24-03, 04, 05 | architecture-drafter, architecture-contract, architecture-request, architecture-job, realisation-domain (`serves`) | after W1 |
| W3 | The SDD, format 2: open questions once, no filler, Appendix B labels, decision order, key functionalities and Section 4 by module, drivers served, the reader | D-24-05 (print), 06 | sdd-architecture, sdd-content, open-fields (readers) | part 1 now; part 2 after W1 and W2 |
| W4 | Figures: one SVG root, the stylesheet rule, typed C4 components, list-box groups, captions; then the module map, containers and components by module, context by party kind, deployment by module | D-24-07 | notation-svg, notation-layout, figure-budget, sdd-figures, sdd-c4, sdd-document, notation-model (new scene), sdd-renderer | part 1 now; part 2 after W1 |
| W5 | One module scope across the journey: shell scope, the Modules rail, module map view, scoped registers and views, Chapter 1 structure screen | D-24-08 | app, workspace-ux, project-context, notation-view (scope), the chapter view models (scope seeds), requirements and requirements-scale (structure screen), a new module-ui | after W1 |
| R | The owner's register through the new AIW; comparison with run 3 and the reference | D-24-09 | scratch only (client material) | after W2 to W5 |

## 5. Acceptance

- A synthetic register of the same shape (generated text: 18 areas, 19 themes, 1,400 requirements) gets a proposed
  structure that partitions every requirement, names its platform modules and their themes, converts the area groups
  in place, and is the same twice; a person accepts it; an agent cannot.
- On that register the model drafting sends each requirement in one unit; a double that re-proposes one concern in
  several units yields one component per concern, with the folded sentences, ends and drivers kept and a note per fold;
  a rules component that Sol's accepted proposals replace is not in the bundle; every component names the drivers it
  serves; foundational decisions print first.
- The SDD prints no "no … yet" line, no repeated question, one label per open field; the content reading of a design
  with open fields is the same before and after (format 1 and format 2 of the same design read the same score); old
  exported files read as before.
- Every figure: one SVG root, nodes drawn equal to the diagram's, every node titled, every edge end drawn, no label under
  7 pt at A4; a module map; one component figure per module.
- The screens: a scope chosen in Chapter 1 holds through Chapters 2 to 11 and back, the registers and pictures show it,
  the address carries it, and clearing it restores the whole design; the shell suites still load no document on a
  chapter change.
- Full regression, browser suites, lint ratchet, build, release manifest; the live run measured as D-24-09 says.

## 6. External authorities

Unchanged from round 23: the owner pushes; a named reader reviews an export; the owner's architects and an independent
reviewer review the drafted design; a four-eyes approver and licence counsel release the core-banking knowledge;
production acceptance stays false.
