# Round 24 · Report

Baseline: AIW v0.10.0-rc.10.73.24 at `1b9af2d` (the round-23 release manifest). Branch `claude/dazzling-cerf-a3qshh`,
never pushed: every commit exists only in this container until the owner pushes. Controlling baseline rc.10.73.6;
`productionAccepted` false throughout. Release field after this round: AIW v0.10.0-rc.10.73.25.

Nothing below claims a result that was not observed. Figures read from the owner's register come from runs in the
evaluator's scratch space, which keeps every output as client material; only counts are reported here. No person
reviewed a drafted design or an export, and nothing here is an approval.

## 1. What was asked

The owner read the SDD that AIW drafted from the owner's 1,400-requirement register in round 23 (run 3) and asked for
the three fixes proposed after that reading (one component per concern; each open question said once; the big decisions
first and each component's drivers limited to the ones it serves), for AIW itself to be updated so any project gets them,
for better diagrams, and for a smart, intuitive way to handle and display each chapter's models: the requirements broken
into modules and sub-modules that make sense, so the design journey is connected and manageable from a views
standpoint, and those views in the SDD. The plan is `audit/round24/PLAN.md` (commit `f0872fa`).

## 2. What the run-3 document showed

The plan's section 2 records seven findings (F1 to F7), from the lead's reading and five read-only code maps:

- F1 · the figures carried no structure at that size (no modules to fold by, untyped C4 nodes, one derived container,
  one zone, nested `<svg>` clips that misled an outside reader);
- F2 · every requirement was drafted twice (18 domain and 19 theme groups sent as 37 units);
- F3 · nothing made one component per concern (150 components, 56 of them repeating a concern);
- F4 · a component's drivers were every driver its requirements share;
- F5 · filler: an open marker or a "no … yet" line beside nearly every empty field (904 markers, 728 such lines, 54
  repeated questions in run 3's export);
- F6 · decisions in record order, the architectural style last;
- F7 · no structure to navigate by: no scope survived a chapter change.

## 3. What was done

56 commits on the round branch after the baseline (then this report and the source manifest), of which 8 merge
workstreams that ran in their own worktrees. Each workstream was audited before its merge: no check deleted or loosened
(every changed assertion was read and is replaced by one at least as strict), no secret, no client text, no model
identifier.

**W1 · Modules and sub-modules (lead; D-24-01 to D-24-03).** A requirement group of kind `module` (role business or
platform) or `sub-module` (with its parent): the requirements' functional decomposition as a tree of the groups AIW
already had, so every link, trace, figure and review that reads groups reads modules. `module-model.js` proposes the
tree deterministically from the requirements' own columns: the column that partitions them gives the modules, the next
gives each large module's sub-modules (small pairs and catch-all values gathered into "Other …"), and a theme that
recurs across modules and names a cross-cutting concern is served by a platform module (the matching area where the
source has one, a new platform module otherwise). Existing groups with the same rule are converted in place. The
structure is saved as proposed; `requirements.modules-accept` is a person's review (refused to an agent or a service
account, and while any requirement is in no module or in two); Chapter 1 raises a finding for either. An import can ask
for the proposal. A Chapter 4 responsibility group links the module it realises, and `module-scope.js` reads every
record's modules in one place: by its own links and the architecture model's chain, and (for a record without links)
by what it touches. Two refinements came from the owner's register: a remainder that holds a third of its module is
named for a person to split, and a new platform module is named for its concern as a platform, never numbered.

**W2 · Drafting by module (D-24-03 to D-24-05).** With a module structure, the drafting units are the modules
(platform modules first, a module above the packet's bound in parts of whole sub-modules); theme groups are facets and
are not drafted, so each requirement is drafted once. The packet carries the platform services proposed so far and every
component proposed so far. Contract `sol-architecture-4` asks a component for the platform services it uses and the
drivers it serves, with a reason, defines the decision categories and keeps foundational decisions for the cross-cutting
pass, which has its own instructions and whose merges its check assesses. Before the bundle is sealed, a deterministic
consolidation keeps one component per concern within a module and one platform service per cross-cutting concern,
joins what the folded proposals said, re-points the data, integrations, controls and batch work that named them, and
drops a rules component that Sol's accepted components replace. Every fold, refused merge and replacement is a note in
the preview the person reviews before anything is applied. Chapter 4 gets one responsibility group per module.

**W3 · The SDD, format 2 and by module (D-24-05, D-24-06).** New exports carry a format marker. A record prints what
is stated; sections 1 to 4 and 6 each end with their open questions, one line per question naming its records and fields, one
"Not stated" line per set of fields the same records leave empty; the filler lines go; Appendix B lists a field of one
kind under one label. Decisions print by category with the platform-wide ones first. Where the requirements have
modules, Section 1's key functionalities give one line per module; Section 4 opens with a module overview and gives each
business module, then each platform module, with its purpose, sub-modules, the modules it uses and is used by, its
components in full, the interfaces and data touching them and its own open questions; a component prints the drivers it
serves with their reasons. Section 5 opens with the module map and lays the C4 levels out by module. The content reader
reads every layout the same way: format 1, format 2 and format 2 by module of one design read the same score, and a
fixture of synthetic format-1 editions holds old exported files to the readings they had.

**W4 · Figures (D-24-07).** One SVG root per figure (clipping by `clipPath`), folded groups drawn as list boxes naming
their members, typed C4 nodes, captions naming every grouping family. The module map: actors and external systems by
party kind, the business modules with their largest sub-modules and counts, the platform modules as a band. The
container level reads by module where no container is decided (and says why), the component level draws one figure per
module, a deployment zone over budget is split by module, parties fold by kind everywhere. The third part makes the
figures read at the register's scale: a component is drawn in full only in its home module's figure (a platform service
in its platform module, the rule Section 4 prints it under, now one shared rule), every other end of a module's figure
is one box with one counted line per own component, the container level keeps each box's three heaviest lines with the
rest counted in the notes, and in print no word is drawn over another. On the synthetic register of the owner's shape
every figure together went from 632 lines, 236 hidden labels and 62 overlapping label pairs to 262, 10 and 0; a business
module's figure from 21 boxes and 49 lines to 9 and 8.

**W5 · One module scope across the journey (D-24-08).** The shell carries a scope (a module or sub-module) in the
address and keeps it across chapters and tabs; the rail has a Modules section; a module map is a shared view of every
chapter once the requirements have modules; every chapter's registers, pictures and checks read the scope through one
lens of the document; Chapter 1 shows the proposed structure and lets a person accept it, propose one from chosen
columns, edit a module or sub-module, or discard the proposal. Without a structure, every screen is as it was.

**The lead, besides W1 and the audits:** the SDD suite's double moved to the version-4 component shape; the records the
module chain does not reach are placed by what they touch (`recordAttachments`); the shell's scope readers moved into
`project-context.js`, which brought the heaviest pages back under the bundle gate (90 files to 86); a round-12 defect
in Section 5 that denied a container the section had just decomposed was fixed with a test.

## 4. The owner's register

Run in the evaluator's scratch space; the workbook, the drafted designs and their exports stay there as client
material, and only counts are reported. No person reviewed any of it.

**The module structure AIW proposes from the register's own columns.** 11 business and 9 platform modules from the
domain column and 40 sub-modules from the capability-theme column; the 18 domain groups converted in place (their ids
and links kept) and 42 groups created; two of the nine platform modules are new, for concerns no domain names
(notifications and workflow), and serve the themes that name them. The "module" column, with 1,320 distinct values,
is named as a feature name and not used. One remainder is flagged for a person to split before accepting: an "Other"
sub-module that holds 164 of its module's 374 requirements, because its capability theme is a catch-all. The
structure is saved as proposed; it is not accepted: that is a person's review (section 7).

**The no-model check.** AIW's rules drafter, which needs no provider, drafted the register by module: 20 Chapter 4
responsibility groups, each realising one module; all 50 responsibilities in their module's group; 19 components, each in
a module, none repeating a concern within its module, every one naming the drivers it serves with a reason. The same
design was exported twice: before this round's SDD and figure work (at `7706377`, with W1, W2 and W4 part 1 merged, still
SDD format 1) and on the release:

| The same design, exported | Before the SDD and figure work | The release |
| --- | --- | --- |
| Inline "open: …" markers | 238 | 0 |
| A question asked more than once | 16 | 0 |
| Open-question lines (each question once) | 0 | 69 |
| "no … yet" lines | 74 | 9 (decisions whose choice is open, each naming its alternatives) |
| Figures | 9 (one derived container of 17 components) | 13 (module map first; containers by module; one figure per module) |
| PDF pages | 95 | 101 (Section 4 lays out every module) |

A module's component figure, which drew 21 boxes and about 35 lines on this design before the third figures part,
draws 5 to 11 boxes and 4 to 10 lines on the release.

**The live run with a model, and the comparison with run 3: not done.** On 2026-10-14 the owner's OpenAI project
refused every call with its project spend limit (HTTP 429 `insufficient_quota`, `project_spend_limit_exceeded`): the
first four calls of the run and two later probes; none was billed and the run was stopped. AIW's own plan for it was
24 units (9 platform modules, 15 business units of which 6 are parts of the three largest modules) and one
cross-cutting pass, about 1.05 million tokens, against run 3's 38 units and 1.68 million tokens. The owner then asked
for the run on an Anthropic model; no Anthropic key is configured in this environment, and AIW's Anthropic wire has
not yet run live. So the plan's measures for a model draft (units sent, tokens, components per concern, decision
order, the content reading against run 3 and the reference) are not observed this round; the harness and the
measuring script are ready in scratch.

## 5. Verification

On the release commit `5250059` unless named otherwise, in this container, with the provider keys empty.

- **Install and check.** A clean install (`npm ci`, 112 packages, 6 s); the syntax check passed for 703 modules; the lint
  ratchet found 173 problems against its baseline of 173, none new. The install's audit lists four moderate advisories,
  all in development dependencies (drizzle-kit through esbuild's development server), none in production; the lockfile is
  unchanged this round.
- **Build.** Passed: 220 server modules from the import graph, 135 client script files and one stylesheet. The chapters
  route measures 2,926,231 B under its cap of 2,928,640 B (2,860 KB); the cap moved this round from 2,840 KB in four
  steps, each to the next whole KB with its measurement recorded in `client-bundle.mjs` (W1, W2, W5 and their merge).
  The stylesheet measures 769,276 B under 752 KB (moved from 747 KB by W5). The heaviest pages load 86 bundled files
  (the gate is under 90): W5's module scope had taken them to 90, and moving the shell's scope readers into
  `project-context.js` brought them to 86.
- **Full regression, first run** (concurrency three, browser suites included): 231 of 234 suites passed. Three browser
  suites (`model-views-browser`, `notation-browser`, `tradeoff-browser`) failed at their first wait for a chapter's model
  canvas (10 s, and 8 s for the trade-off suite) while two other suites ran beside them. Each passed alone (26 s, 143 s,
  177 s). The canvas itself is not slower: on a quiet machine the Model canvas of Chapters 1, 3, 4, 5 and 9 appears in a
  median of 1.49 to 1.70 s on the round-23 release and 1.50 to 1.57 s on this one.
- **Full regression, second run** (concurrency two, the runner's setting for slower machines; same commit):
  all 234 suites passed, every `test:*` script of `package.json` among them, Playwright browser suites included.
- **New suites:** `test:module-model` (8 checks), `test:architecture-modules` (11), `test:module-scope` and
  `test:module-scope-browser`, `test:figures-integrity`, `test:sdd-modules` (8). Each workstream also ran its focused
  and browser suites before its merge, and the lead re-ran the affected suites after each merge.
- **Integrity.** No check was deleted, skipped or loosened: every assertion a workstream changed was read before its
  merge and is replaced by one at least as strict (they are listed in the merge commits); two lead commits moved checks
  to rules this round changed on purpose (the version-4 component shape; the home rule for shared components). No
  secret, no client text and no assistant model identifier is in the diff from the baseline; the workbook, the drafted
  designs and their exports stayed in scratch.
- **Release manifest.** `SOURCE-MANIFEST.json` regenerated by the script behind `npm run release:manifest`, naming this
  release, and checked with `npm run release:verify`.

## 6. What is still open

Most consequential first:

1. **The live model run on the register and its comparison with run 3 and the reference** (section 4): waits on the
   owner's provider (the OpenAI project's spend limit, or an Anthropic key in the environment). The first Anthropic run
   should be a short trial, as the wire has not run live.
2. **A person's acceptance of the module structure**, after splitting the flagged remainder; until then every view
   and the SDD say the structure is proposed by AIW.
3. **Two estimates in the drafting plan are assumptions**, not yet measured on a live run: the packet's state growth
   (1,200 B per unit) and the cross-cutting pass's 900 tokens per unit.
4. **The container level by module** is still the busiest figure at the register's scale (25 lines kept, the rest counted
   in its notes); the component figures per module are clear.
5. **Overview folds** in `figure-budget.js` group a component by its Chapter 4 mapping rather than its home module; the two
   differ only for a component that realises responsibilities in two modules.
6. **Wording:** an open decision prints "Open: no alternative is chosen yet" with its alternatives (nine on the
   register's rules design); it states the decision's standing rather than filling a field, but it could read better.
7. **The gap register was not re-verified this round**; this round's own findings (F1 to F7) are tracked here.
8. **Carried from round 23:** GR-SDD-30's version-gated wording; the screens-at-size items (GR-UX-09 to GR-UX-17); the
   rules drafter at depth (E2); domain comparisons (K2); a provider's daily token budget (M); and the drafting plan
   panel still says it sends themes where the units are modules (`journey-draft-ui.js`).

## 7. External authorities and the owner's decisions

Nothing here impersonates or replaces them, and none of their steps is claimed:

| Authority | What only they can do | State |
| --- | --- | --- |
| The owner | Push the branch; raise the OpenAI project's spend limit, or configure an Anthropic key, so the live run can go ahead; rotate the API keys of the `.env` file uploaded earlier | Not done |
| A person on the owner's side | Review and accept the proposed module structure of the register (Chapter 1) | Not done |
| The owner's architects and an independent reviewer | Review a drafted design through AIW, page by page (GR-GOV-21) | Not done |
| A four-eyes knowledge approver and licence counsel | Release the core-banking knowledge pack (GR-DOM-10, GR-DOM-11) | Not done |
| The workbook owner | Answer the open source questions (GR-SRC-08) | Not done |
| A named human reader | Fill the SDD review gate's checklist for an export (C2-10) | Not done |
| Production acceptance | Accept a release for production | Not done; `productionAccepted` is false |
