# rc44 wp2 slice S5: component selection as a recorded decision — build notes

Branch `rc44/wp2-s5-selection`, from `5cae40a` (the typed deployment topology, wp9a slice 1, after its second fix-up,
on `rc44/integration` `a4c1690`). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S5 under g, e.1 row 9).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"). Rulings: `RULINGS-2026-11-18.md` (main
checkout), sections A to O. Package `p40-adoption`, held in `public/architecture-task-ui.js` (no new lazy entry; 148
script files). `productionAccepted` stays false. No external authority is impersonated: nothing here approves,
releases, accepts or promotes anything for a person; the one acceptance a selection leads to (the profile's adoption)
is S1's second-person step.

## State

- **Built (082e06b):** the selection module and its five steps, the registration rows, the built-in edits, the parity
  of row 9, the SDD's selection basis, the surface, the size evidence, the 13 blocks of
  `rc44-wp2-adoption-cases/selection.mjs` (each seen to fail on the base first), S1's suite with three assertions
  replaced (below), the related suites (below).
- **Corrected by the fix-up (ruling Q7):** at 082e06b the block `S5 old documents`, and so `test:rc44-wp2-adoption`,
  were **red**, not green as this file and the builder's result said: `concernProject` called `createProject` without
  the fixture's time, so its SDD printed the day it was read and no longer matched the golden captured the day before.
- **Fix-up:** branch `rc44/wp2-s5-selection-fix`, from 082e06b; the rulings of section Q (2026-11-22); see the section
  "Fix-up" at the end of this file for each item, its case and what is left.

## What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/adoption-selection.js` | server; the lazy entry | `applySelectionCommand` (`selection.start`, `.candidate`, `.judge`, `.choose`, `.instantiate`), `selectionConstraints`, `candidateEligibility`, `selectionReading`, `selectableProfiles`, `SELECTION_LIMITS` |
| `public/adoption-ui.js` | server; the lazy entry | `selectionView`, `openSelection` (the selection's part only; S3 adds the adoption workspace); a module of the package, imported by `adoption-package.js`; it sets `window.aiwSelection` in the browser |
| `public/adoption-package.js` | server; the lazy entry | five command rows (`judge`, `choose`, `instantiate` a signed-in person's); `provenance.paths.selection`; imports the view |
| `public/component-library-ui.js` | its own lazy entry | "Select for a responsibility": a dynamic import of the host, then `window.aiwSelection({store, modal})` with its own dialog helper |
| `rc44-wp2-adoption-cases/selection.mjs`, `rc44-wp2-selection-baseline.json` | suite | 13 blocks; goldens captured at `5cae40a` (only test files changed then) |
| `rc44-wp2-fixtures.mjs` (appended) | suite | `concernProject`, `guidedConcernPreview`, `decisionSays`, `selectionProject`, `PROFILE_FACTS`, `ARCHETYPE` |
| `audit/rc44/evidence/wp2-s5-size.json` | evidence | `ownBytes` 153 |

Built-in edits (each commented "rc44 wp2 S5"):
1. `public/architecture-design.js`: `concernComparison`, the one builder of a released concern's comparison (row 9);
   the guided comparison writes through it (route).
2. `public/decision-reading.js` `readDecision`: answers null for a decision with a `selection` key (route).
3. `public/decisions-domain.js` `normaliseOption`: a candidate stays with its alternative through a person's edit
   (route).
4. `public/adoption-domain.js` `definitionOf`: reads a profile adoption's claim receipt with the existing rule (J4).
5. `public/sdd-architecture.js` (server): the selection basis after "Alternatives considered".

### The record

`decision.selection` (created when first written): `{kind: 'component'|'option', responsibilityIds | requirementId,
driverId, concern {id, title, receipt}, predicates {driverId: {fact, op, value}}, reviewTrigger, prepared ('person' |
'sol-draft' | 'import'), judgements [{alternativeId, constraintId, state, evidence, reason, actor, at, account}], choice
{alternativeId, unproven, sentence, rows, actor, at, account} | null, instantiated {componentId, ref, adoptionId, actor,
at, account}?, actor, at, account}`. `alternative.candidate`: `{kind, ref, facts, by?: 'sol', outcome?: 'chosen' |
'rejected'}`. Eligibility is read, never stored (the choice keeps the rows as they read when it was made, for the SDD).

### Doctrine points and their cases

| Point | Block |
|---|---|
| No result object of the selection carries a score, rank or weight key; candidates keep insertion order; `readDecision` reads none | `S5 no score` |
| A candidate (unreleased) profile is read by the chooser, refused by `selection.candidate`, and reaches no constraint, eligibility row, finding or reading | `S5 candidate knowledge` |
| An agent account's and a draft by Sol's judgement are refused (and write nothing); a person's keeps its actor and account | `S5 server` |
| A candidate whose hard-constraint row is unknown is chosen only when named unproven; approval evidence is then refused (decision.governance's existing rule) | `S5 eligibility` |
| Accept and approve steps: the slice states none of its own; the profile adoption is accepted by a second person (S1's `adoption.accept`, a `second` type), refused to the person who instantiated it and to an agent | `S5 registration`, `S5 server` |
| Old documents read byte-identically (references, review list, both fixtures without a selection) | `S5 old documents` |
| Fails today: a library candidate recorded as rejected, no component created | `S5 fails today` |
| A typed reading of a hard constraint is a signed-in person's (Sol, an import, an agent account refused) | `S5 Sol` |

### Second-person and person-only steps (rulings D1, D7.1, F3, F4)

- `selection.judge`, `selection.choose`, `selection.instantiate`: `person: true` on the command; no check of the
  package's own. `selection.start` and `selection.candidate` may be a draft by Sol's proposal (marked).
- The selection keeps every person's step under its key `selection`, which a project copied from a template clears
  (`project-lifecycle.js` resets the key by name). `assertTemplateCopyClearsSteps` passes on the decisions and on the
  profile adoption.
- F4: a profile adoption is written by a signed-in person's `selection.instantiate`, stamped as theirs by the boundary
  (H2); a second person accepts it with `adoption.accept`. A copy carries no applier (`applied` is reset), so S1's
  `adoption.reassess` is the person-only step that confirms it there, as for any adoption.

## Row 9 of the retirement table (ruling J6): retired, re-pointed, or left

Design e.1 row 9 retires the released concern comparison (`architecture-design.js:93-124`) in S5 in favour of
`selection.*` with kind `option`. What the code allows:

| Earlier step or reader | What happened in S5 (after the fix-up, ruling Q8) | Retired in |
|---|---|---|
| The comparison's own writer (`previewReleasedConcern`'s decision and alternatives) | **retired**: `previewReleasedConcern` deleted; the one builder, `concernComparison`, moved to `adoption-selection.js` and written by `selection.*` only; parity held against the goldens of `5cae40a` (`BASE.guided`) | S5 |
| `architecture.start` on a `knowledge:` topic, `architecture.answers`, `.prepare` and `.refresh` of such a task, the preview and so `alternative.apply` of an alternative it prepared (the guided front-end) | **retired**: refused in words ("…the guided comparison of a released concern is retired."); a task an older project holds is read as before and can be set aside (`architecture.dismiss`) | S5 |
| The comparison tools' concern picker, `openConcern('knowledge:…')` (architecture-intelligence's "Compare the released approaches" action, the knowledge workspace) | **re-pointed**: the picker offers no released concern; `openConcern` opens a selection of the concern's options (`window.aiwSelection`) | S5 |
| S1's fixture `governedConcernApplied`, `architecture-intelligence-validate.mjs` l.112-118 | **re-pointed** with the lead's leave (item 7) | S5 |
| `design-concern-validate.mjs` (its two blocks run the guided path) | **not re-pointed**: no leave; it now fails at l.24 (was l.119 at the base); for the lead | the lead to rule |
| The applied guided comparison as an adoption of kind `concern` (S1's upgrade) and its readers | unchanged: an older project's applied task is still read | S3/S6 with the task readers |

Since the fix-up a released concern is compared one way only, as a selection of its options.

## Deviations from the design, the task text and the contract

1. **Row 9 re-pointed, not retired** (above). The task's "retired or re-pointed": the writer is re-pointed; the front-end
   stays because S1's cases must pass unchanged and its fixture builds an applied guided comparison, and because a
   non-red 94dbd4f suite (`architecture-intelligence`) starts one.
2. **No option is excluded by a predicate yet.** Design S5 asks that "an option with a failing excludes predicate is now
   ineligible". A released concern states no typed fact of an option (`domain-knowledge.js` `concernFields`: id, title,
   trade-off, evidence), so an option's rows read unknown against every hard constraint: chosen only as unproven
   (held in `S5 parity row 9`). An option can be excluded once wp1's selection form gives options typed content.
3. **A profile is saved through `realisation.component`, not `realisation.candidate`.** Giving the reviewed candidate
   path a `profile` key and a `knowledge` scope cost 281 B on the route (measured: `component-library.js` 237 B,
   `realisation-domain.js` 44 B), more than wp2 has left. The component is saved as a candidate, allocated its
   responsibility, with the decision in its `decisionIds` and a `source` naming the release, the claim and the
   decision; the pin itself is on the profile adoption (`definition.receipt`, a claim receipt read with
   `claimReceiptCurrent`) and on the selection's candidate. A library entry or an archetype goes through
   `realisation.candidate` with its pinned reference, as designed. `component-library.js` is unchanged.
4. **Eligibility is read, not stored**, and constraints are read from the decision's drivers on every read (design b.2
   stores both): a stored copy goes stale when a driver or the knowledge changes. The choice keeps the rows as they
   read when it was made.
5. **Constraint predicates are a person's statement at `selection.start`.** Design f.2: until wp9b's `hardGates`, no
   constraint has a typed predicate. A signed-in person may state one (`predicates`), refused from Sol, an import and an
   agent account; without one a row is unknown and a person judges it.
6. **Profile facts are a released claim's structured unit's scope** (`architectureUnit.scope`: product, version,
   topology, tier, operating model, capability), on a claim whose subject is `component-profile:<id>`, until wp1's
   component-profile form exists (design f.2). The fixture states its data location as `topology`.
7. **The chooser shows a candidate profile's title, status label and source location**, not its statement or facts
   (plan section 6 item 4 is the owner's decision for candidate content in design projects).
8. **`selection.instantiate` takes the reviewed component inline**, not from the library chooser's builders
   (`libraryProposal`, `archetypeProposal`): the view asks for the reviewed fields itself.
9. **No browser suite was run**: the comparison tools' browser suites are red on this machine at the baseline. The
   view is rendered in node (`S5 surface`).
11. **The view is a module of the package, opened through a hook.** The design has the library chooser reach
    `openSelection` through an import of the host entry. A workbench module that imports a package's module (the host
    re-exporting the view) makes S0's suite read the package's modules as the workbench's, and the id prefix the
    package mints (`ADP`) as a workbench prefix (block "D3 workbench keys" failed so, on an intermediate commit). So the
    package imports the view, the host keeps its one bare import of the package, and the chooser loads the host and
    calls `window.aiwSelection` (the codebase's pattern: `window.aiwProjectStore`, `window.aiwArchitectureTask`). The
    view takes the dialog helper from its caller, so the server bundle holds no dialog code.
10. **Decision acceptance** asks what Chapter 3 always asks (each alternative described, the chosen one's effect on each
    driver): the cases state it through `decision.alternative`, as a person does.

## Replaced assertions, old -> new (S1's `rc44-wp2-adoption-cases/record.mjs`; not a 94dbd4f suite)

Each is recorded beside the assertion ("slice S5; was: …"); each is at least as strict.
1. block "registration": `Object.keys(e.commands)` equals the three adoption steps -> the adoption steps are exactly
   those three, **and** the package's other steps are exactly the five selection steps.
2. block "registration": `e.provenance.paths` equals `{adoption: ['adoptions.records']}` -> equals that and
   `selection: ['decisions.records', 'realisation.components', 'logical.assets', 'adoptions.records']`, exactly.
3. block "size": the client's adoption modules are `adoption-domain.js`, `adoption-package.js` -> those and
   `adoption-selection.js`, `adoption-ui.js`, exactly (the upgrade's exclusion loop unchanged).

No assertion of a suite that exists on `94dbd4f` was changed.

## Measurements (node build.mjs, dist/client-size-report.json)

| | Start `5cae40a` | This slice |
|---|---|---|
| Chapters route (`routes.chapters.code`) | 3,230,605 B | 3,230,758 B (**+153 B**, S5's own; allowance 275 B; wp2 478 of 600) |
| Projects route | 507,338 B | 507,390 B (+52) |
| Script files | 148 | 148 |
| Buckets (under 10 KB / 10–50 / over 50) | 53 / 50 / 45 | 53 / 50 / 45 |
| Stylesheet | 901,873 B | 901,873 B |
| Opens with records (host `architecture-task-ui.js`) | — | 3,352,696 B (121,938 B in 2 scripts beside the route) |

Itemised (route outputs, metafiles of both builds): `decision-reading.js` +17, `decisions-domain.js` +35,
`architecture-design.js` +93 and its export +8. A first build measured +537 B (with the reviewed candidate path's edits
and a builder of closures); see deviation 3.

## Suites (run on the slice's head, two at a time, the machine shared)

- `test:rc44-wp2-adoption`: 33 blocks green (S1's 20, S5's 13). Each S5 block was seen to fail on the base first
  (commit `9b37553`: all thirteen fail; the request is "Unknown project action.").
- Named by the task, green: `component-library`, `rc42-g2-library`, `decisions`, `sdd-architecture`, `sdd-content`,
  `sdd-formats`, `sdd-modules`, `sol-sdd`, `rc44-s0-extensions` (26 checks; with the package's S5 rows registered no
  block fails), `rc44-wp9a-deployment` (24), `rc44-wp1-knowledge`.
- Every other suite that imports a changed file (47 more): green, but for four red at the baseline and red the same way
  on an archive of `5cae40a` run on this machine: `design-concern` (l.119, `QD-002` in the assessments),
  `command-equivalence` (l.60), `contextual-intelligence-ui` (l.116), and `sdd-size` (the export timer: 11.8 s here,
  12.0 s on the base, against 10 s).
- `node check-syntax.mjs`: passes (940 modules). `node scripts/lint.mjs --summary`: 162 problems, the baseline's 162,
  0 new. `node build.mjs`: every gate passes; chapters route 3,230,758 B, 148 scripts.
- Not run: the full regression (the lead's), the browser suites (red at the baseline on this machine), `test:scale`.

## Open questions (for the lead)

1. Row 9: retire the guided front-end of a released concern in S3 with the other guided tasks (and re-point
   `architecture-intelligence.js`'s compare action and S1's fixture then), or earlier?
2. A decision's own effect on a constraint driver (Chapter 3's assessment) and the selection's row for the same
   constraint are two readings of one question; S5 writes neither from the other. Should a selection write `violates`
   for a failing row, and should `decision.accept` read unproven rows?
3. The route stub's `needs` is unchanged: a document whose only package records are selections (no adoption) does not
   load the lazy entry before it is drawn; nothing on the route needs it (Chapter 3 draws the decision, the view loads
   with the comparison tools).
4. Template copies clear the whole `selection` key (the reset rule names it): the copy keeps the alternatives with their
   candidates and reads no selection (and no weighing). Whether the constraints' typed readings should travel into a
   copy is for the lead.

## Fix-up (rulings Q1 to Q11 of 2026-11-22; review /home/user/hb-review/rc44-build/wp2-s5-selection.review.json)

Branch `rc44/wp2-s5-selection-fix` from `082e06b`. Each item: the case first, seen to fail on the head it started
from, then the change; a WIP commit after each item.

### Progress

- **Done:** items 1 to 9. Every S5 block is green (20 blocks). Red, for the lead: three size checks that assume the
  route grows, now that the retirement shrank it by 2,305 B (S1's `size` block, `mine > 0`; S0's `8 client build`,
  "the route as built now is the slice's or a later one's", `>= slice - 700`; wp9a's `S1.10 the client build`, `mine >
  0`): none is mine to loosen and each passes once the saving is booked in the lead's file (item 9); and
  `design-concern-validate.mjs` (fails at l.24, was l.119 at the base: item 7).
- **In progress:** nothing.
- **Next:** the lead's review; the open points at the end of this section.

### Items

1. **Q7, must-fix 8, should-fix 11 — done.** `concernProject` and S1's `governedConcernApplied` (the lead's leave of Q8
   covers S1's fixture) give `createProject` their fixed time. Case `S5 fixtures` (new): every fixture of the suite
   (`bankPaymentApplied`, `governedConcernApplied`, `otherKindApplied`, `concernProject`, `guidedConcernPreview`,
   `selectionProject`) built under two clocks years apart is the same document; it failed first on
   `governedConcernApplied` and `concernProject`. The golden `documents.concernProject` was captured again on
   `5cae40a`'s product source (a `git archive` of `5cae40a` with this branch's `rc44-wp2-fixtures.mjs` copied in; only
   test files differ): only its `sdd` reading changed; `selectionProject` and both guided comparisons read as the golden
   already held. The baseline file says so (`concernProjectRecaptured`). `S5 old documents` is green again.
2. **Q1, must-fix 1, design concern 6 — done.** `readDecision` no longer answers null for a selection: it answers the
   reading with no class and no weight for any driver (`decision-reading.js` readDecisionOf: `cls` is null when the
   decision holds `selection`), whatever priorities a what-if or a sensitivity step asks about, so nothing is weighed,
   led, firm or sensitive; an alternative whose effect on a hard constraint is "breaks it" is still ruled out, so the
   built-in error 'The working choice breaks a hard constraint' (decisions-domain.js) is raised for a selection.
   `readingLines` says one thing of a selection besides the ruled-out lines: "A selection is not weighed." Callers
   changed in the same slice: Chapter 3 draws no panel "On the drivers" for a selection (`decisions.js` readingHTML);
   the trade-off map and the desk show each candidate as "A candidate of a selection: read against the hard
   constraints, not weighed" (`tradeoff-model.js` readingStanding, kind `selection`); the SDD's trade-off analysis
   leaves a selection out and prints no AIW reading for its alternatives (`sdd-architecture.js`; its basis is printed
   with its record). Case `S5 Q1 readers` (new; failed first on "readDecision answers a reading for a selection", then
   on the map's standing): the trade-off model, the desk probe, the what-if, design-reasoning's tuning, utility-model's
   sensitivity, Sol's decision item and packet, the suggestions and the SDD read a selection without throwing; the
   built-in 'breaks' error is raised for a selection whose chosen candidate breaks a hard constraint. Replaced
   assertions (`S5 no score`, this slice's own suite): `readDecision(p, d)` is null (before and after the choice) ->
   the reading weighs nothing (no driver with a class or a weight, no total or part, no lead, no sensitivity point, no
   firmness), and a decision without a selection is weighed, both before and after the choice. A row a person judged
   fail is written into Chapter 3 as "breaks it" by the selection itself (item 3), so the same error holds for it.
3. **Q2, must-fix 2, design concern 1 — done.** One truth for the choice. `decisions-domain.js` exports
   `SELECTION_STEP`, a symbol: a key a request cannot carry (a request is JSON; the boundary, a reviewed batch and a
   saved alternative pass on what was sent). On a decision that holds `selection`, `decision.choose`,
   `decision.clear-choice`, a `decision.alternative` that adds an alternative, changes a candidate's rejection reason or
   changes its effect on a hard constraint (the reading's `hard` drivers) are refused, "Change ADR-nnn through its
   selection.", unless sent with that key, which only `adoption-selection.js` does (its `decide`). The selection's row is
   the authority for a hard constraint and Chapter 3 shows it: `rowsToChapter` writes each candidate's row as its effect
   on each hard constraint through the chapter's own handler (a person's pass as "supports", fail as "breaks it", with
   the judgement's reason, judge and evidence; unknown as "needs evidence"), adding to the decision's drivers a hard
   constraint it does not yet name; the effect on every other driver, Sol's and the rules' marks included, is kept as it
   was. It runs after every judgement and at the choice. Chapter 3 asks no support of a row the selection named unproven
   for its chosen candidate (`decisionFindings`, `support-…`), so a selection with unproven rows can be accepted and
   approval evidence is still refused (item 5). The package states its first check of chapter 3,
   `selectionFindings` (`adoption-package.js` checks `{3, 5}`): the error `selection-choice` when Chapter 3's working
   choice is not the selection's, or names no candidate; `decision.accept` and `decision.governance` read it as every
   chapter-3 error. Case `S5 Q2 one truth` (new, through the server; failed first on "the judged row is written into
   Chapter 3"): each of the five paths refused to a person, an agent account and a draft by Sol, in words, with nothing
   changed; the effect on a driver that is no hard constraint stays Chapter 3's; both mismatches are errors that refuse
   acceptance. The suite's `completion` helper (this slice's own) no longer states "neutral" for the hard constraints of a
   selection: it sends them back as the selection wrote them (old -> new recorded in the code).
4. **Q3, must-fix 3, design concern 3, should-fix 2 — done.** No person-stated typed reading before wp9b: design f.2
   stands. `selection.start` refuses `predicates`, whatever is sent under the key and whoever sends it ("No typed reading
   of a hard constraint is stated: a person judges each row with evidence and a reason."); `predicatesOf`, the evaluated
   rows and their basis are gone, and the view and the SDD state no typed reading. A row is a signed-in person's
   judgement (pass or fail, with evidence and a reason, `basis: 'person'`, by, at) or unknown; a row a person judged is
   not judged again; the facts a released profile states are shown beside its rows in the view for the person who
   judges. A candidate whose basis no longer stands reads unknown on every row, whatever was judged of it, with the
   reason. The start's author is kept in `selection.started {actor, at, account, kind}`, which no later step overwrites
   (`actor`, `at`, `account` stay the last step's); `prepared` is `agent` for an agent account's start and a candidate an
   agent account adds is marked `by: 'agent'` (beside `sol` for a draft by Sol), shown in the reading, the view ("prepared
   by an agent account", "added by an agent account") and the SDD ("Prepared by an agent account.", ", added by an agent
   account"). Cases: `S5 Sol` (failed first: the typed reading was taken from a person), `S5 eligibility`, `S5 server`,
   `S5 SDD`, `S5 surface`. Replaced assertions, old -> new (this slice's suite; each recorded in the code):
   `threeCandidates` stated A's typed reading -> states none, and B judges the first constraint of both profiles (pass,
   fail) with evidence; `S5 eligibility` rows "evaluated" against the typed reading -> rows a second person judged, with
   judge and evidence, and unknown rows with no basis; `S5 Sol` a draft by Sol and an agent account refused a typed
   reading -> everyone refused, for three shapes of the key, and the start's author kept after a judgement and a choice
   by others, and an agent account's marks in the reading, view and SDD; `S5 server` a row the typed reading answered is
   not judged -> a row a person judged is not judged again (by the judge or a third person); `S5 SDD` the typed reading
   printed -> "no typed reading" for both constraints and each judged row naming its judge; `S5 old documents` a template
   copy's `readDecision` is null -> its reading weighs nothing (item 8 changes what a copy is).
5. **Q4, must-fix 4 and 5, design concern 2, should-fix 7 — done.** A second person stands behind every person's word
   on a hard constraint. `selection.confirm {id, note?}` is stated `second` on the command (`adoption-package.js`); its
   projection (`adoption-selection.js` confirmSubject) is `{id, actor: the chooser, owner, history}`, history naming once
   each the chooser (who also names each unproven row: the view asks for it row by row) and every person who judged a row
   of the chosen candidate, so the one rule (verifierRefusal) refuses each of them, at the boundary and at read time
   (confirmStands, ruling D7.1); the boundary's D1 check also needs a person behind the decision as it stands (the
   chooser's commit stamps it). The confirm is kept as `selection.confirm {actor, at, account, basis, note}`: it stands
   while its basis (the choice, the chosen candidate's rows with their judges, the rows named unproven, the hard
   constraints) is as it was, a person's, taken here. While a choice stands that no second person confirmed, the package
   raises the error `selection-confirm` on Chapter 3, so `decision.accept` refuses, for every kind of candidate; and
   `selection.instantiate` requires the confirm. For a profile, `adoption.accept`'s projection (`adoption-domain.js`
   acceptanceSubject) also names the chooser and the judges of the chosen candidate's rows. While a chosen row is
   unproven, `decision.governance` (approved) and `decision.save` with `assumptionsResolved: true` are refused
   (`decisions-domain.js`, reading `selection.choice.unproven`: clearing the assumptions' sentence does not get round it).
   After the choice, `selection.judge` takes a row of the chosen candidate that reads unknown, from a person other than
   the chooser: the choice's rows and its unproven list follow, the decision's assumptions drop the row, the selection's
   rows are written into Chapter 3 (so the decision is revised and its acceptance lapses), and the confirm lapses (its
   basis moved; the new judge is in the projection). A row judged fail after the choice is "breaks it" in Chapter 3 and
   raises the built-in 'breaks' error (ruling Q1). The view: one box "Name unproven if chosen" per row that reads unknown,
   none ticked, and the choice sends the rows ticked; a "Confirm the selection" button once chosen; the Judge button on the
   chosen candidate's unknown rows. Cases: `S5 Q4 second person` (new, through the server; failed first on "a chosen
   selection nobody confirmed is an error"): every kind (profile, library entry, archetype, existing component, build,
   buy, released option) is refused acceptance until a second person confirms, the one error before the confirm being
   `selection-confirm`; the chooser, the judge, an agent account and a draft by Sol are refused the confirm; governance
   and resolving the assumptions are refused while unproven; the profile adoption's projection names the chooser and the
   judge, each refused `adoption.accept`; the judgement after the choice; the fail row's 'breaks'. `S5 surface` (failed
   first on the boxes). Replaced assertions, old -> new: `S5 registration` five steps, none second -> six, only
   `selection.confirm` second and a review command; S1's `registration` (the list S5 added) five steps -> six; the
   suite's `acceptDecision` and the server block confirm by a third person (C) before acceptance, as the boundary applies
   the step (the boundary's refusals are held through the server).
6. **Q5, must-fix 6, design concern 7 (accepted) — done.** `selection.instantiate` creates, never updates: a component
   payload that names an id (any value, null included) is refused ("The reviewed component is a new component: it names
   no id."), and the component is built from the reviewed fields only (title, kind, purpose, boundary, owner, inputs,
   outputs, rationale, assumptions, technology needs): no status, link, library pin, pattern or source is taken from the
   payload; its decision is the selection's alone. A profile's component is saved with `realisation.component` (design
   concern 7, as the lead accepts), its `source` naming the release, the claim, the claim's full hash and the decision.
   Case `S5 Q5 instantiate creates` (new; failed first: the payload with `api-pod`'s id was taken): three ids refused and
   the Payment service unchanged; the component sheet, the component specification and the profile adoption name the
   release, the claim, the hash and the decision.
   **Q6, must-fix 7, design concern 4, should-fix 3 — done.** A recovery import (`recovery-service.js`
   neutraliseImportedAuthority, the edit the lead confirms) moves each selection's start, judgements, choice, confirm,
   instantiation and last actor into `decision.selection.imported`, and the candidates' outcomes into
   `importedOutcome`; they count as nobody's here, a document with no selection gains no key, and an instantiation from
   before is still not repeated. `rc44-s0-readings.mjs` gains `assertRecoveryClearsSteps(p, records)`, the counterpart of
   `assertTemplateCopyClearsSteps` (the edit the lead confirms): after the import no value, and no element of a list, of
   the records is a step a named actor took, unless kept under a key that starts with "imported"; the wp2 suite calls
   it on the selections. Facts are read from the released claim on each read (`factsFor`) and none are stored on the
   candidate any more; a library, archetype, existing, build, buy or option candidate states none. The standing of every
   kind is read on each read (`standingOf`): the released claim of a profile and of a concern; the library entry (in the
   project's library, not deprecated, at the revision compared; an organisation entry installed with the same content);
   the archetype (one of the catalogue's, not withdrawn); the existing component (in the model). The reason is in
   `eligibility.reasons`, every row reads unknown while it does not stand, and `selection.choose` refuses it with the
   reason. Case `S5 Q6 elsewhere` (new; failed first in assertRecoveryClearsSteps on `started`). Replaced assertion
   (`S5 eligibility`): the stored candidate's facts -> no copy stored, and the reading's facts are the released claim's.
   Known limit: the lifecycle refuses to retire a component a selection compares, so an existing candidate loses its
   standing only in a document made by hand; the case reads such a document.
7. **Q8, must-fix 9, should-fix 4 — done, but for one suite (below).** Row 9 is retired in this slice. The guided
   front-end of a released concern is gone: `architecture.start` on a `knowledge:` topic is refused ("Compare the
   released options of a concern as a selection in Chapter 3: the guided comparison of a released concern is retired.",
   `architecture-design.js` CONCERN_RETIRED); a task on a released concern that an older project holds is read as before
   and can be set aside (`architecture.dismiss`), while its answers, preparation and re-reading are refused, and an
   alternative it prepared is not previewed, so not applied. The comparison's one builder (`concernComparison`) moved to
   `adoption-selection.js` (off the route); `previewReleasedConcern` is deleted. The comparison tools' concern picker no
   longer offers a released concern as a guided topic, and `window.aiwArchitectureTask.openConcern('knowledge:…')` (the
   path of architecture-intelligence's "Compare the released approaches" action and of the knowledge workspace) opens a
   selection of the concern's options (`window.aiwSelection` with `concernId`, whose view asks for the requirement, the
   driver, the accountable architect and the reason, then adds each released option as a candidate). A selection's
   decision gets the error `selection-withdrawn` on Chapter 3 when what its chosen candidate rests on no longer stands
   (a concern's or a profile's released knowledge withdrawn, a library entry, archetype or component gone): the finding
   the guided path got through S1's concern adoption (should-fix 4). Cases: `S5 parity row 9` (failed first on "the
   guided start of a released concern is refused"). Replaced assertions, old -> new:
   - `S5 parity row 9`: the guided comparison, run now, gives the decision captured at the base -> the guided start,
     answers, preparation, re-reading and preview are refused, a held task can be set aside, no route module builds the
     comparison, the tools and the intelligence open a selection; `selection.*` still gives `BASE.guided` (captured from
     the guided path at the base). The one builder in `architecture-design.js` -> the one builder in
     `adoption-selection.js`, and no route module (`architecture-design`, `architecture-task-ui`,
     `architecture-intelligence`) writes the comparison. New: the withdrawal finding for an option selection and for a
     chosen profile.
   - S1's fixture `governedConcernApplied` (the lead's leave): it ran the guided path -> it answers the document that
     path made, captured at `5cae40a` by running the function there with its fixed time
     (`rc44-wp2-governed-concern.json`); S1's `J4` block is green on it. S5's fixture `guidedConcernPreview` is removed
     with the path (what it gave at the base is `BASE.guided`); `S5 fixtures` no longer lists it.
   - `architecture-intelligence-validate.mjs` (the lead's leave; l.112-118 at the base): (1) `architecture.start` on the
     action's concern opens a task pinning the released claim -> the guided start is refused, and `selection.start` of
     kind option on the action's concern, requirement and driver pins exactly that claim, with the action's driver, as a
     draft by Sol's proposal; (2) "creating a proposed task cannot invalidate the source that suggested it" and (3)
     "answering a draft is not an architectural source change" do **not** carry over as they were: a selection writes a
     Chapter 3 decision at its start, a design change the requirement's context reads, where the guided task wrote none.
     Replaced by the exact statement: the generation is stale after the start, the selection's decision is the only
     source change the action makes (with the decisions as they were the generation is current), and adding the options
     as candidates changes no other source. **My view, for the lead:** I do not think (2) can be kept as stated without
     reading a Sol-drafted selection's decision as no design source, which is a rule of its own; I replaced it with the
     strictest statement that holds and flag it here rather than weaken it silently.
   - **Not done: `design-concern-validate.mjs`** (on the baseline-red list, failing at l.119 at `5cae40a`) exercises the
     guided path itself in two blocks (start, answers, prepare, preview signals, reasoning-graph edges, apply, staleness:
     about 40 assertions). With the start retired it now fails at l.24 (the refusal's words). The lead's leave of Q8
     names S1's fixture and `architecture-intelligence-validate.mjs`, not this suite, and its guided-task readers'
     assertions (`assessInteraction`, `interactionReasoningGraph`, the preview's signals) have no `selection.*`
     counterpart to point at. It is left unchanged for the lead to rule: leave to re-point it (most of its decision
     assertions map onto the selection's decision; its task-reader assertions would read a task as an older project
     holds it), or a decision that it retires with the path.
   Route: the retirement takes the guided path's code off the chapters route (`architecture-design.js` 11,622 -> 8,608
   B in the route's output), which more than pays for Q1, Q2 and Q4 (see item 9).
8. **Q9 — done for (1), (5), (6), (8), (9), (10); (11) in item 9.** Case `S5 Q9 the rest` (new; failed first on "the
   late hard constraint is one of the selection's").
   - (1), should-fix 1: `selectionConstraints` reads the hard constraints the decision names and, after them, those that
     reach what is selected now (a component selection's responsibilities through driver-scope.js; an option
     selection's requirement), so a constraint that arrives after the start is read at the choice (the choice writes it
     into the decision's drivers and its rows into Chapter 3) and at instantiation (its unknown row was not named
     unproven: "changed since it was chosen"); the confirm no longer covers the selection, so acceptance and
     instantiation are refused until a person judges the row and a second person confirms again.
   - (5), should-fix 5: `selection.judge` writes through the chapter's own handler (the rows written into Chapter 3 by an
     inner `decision.alternative`), so the decision is revised and its history keeps it; the bare version bump is gone.
   - (6), should-fix 6, design concern 5: `adoption-ui.js`'s header says that `adoption-package.js` imports it and states
     `window.aiwSelection` as a contract later slices inherit until the lead's decision D10 (its arguments now include
     `concernId` and `driverId`).
   - (8), should-fix 8: a project copied from a template keeps a selection's decision with its alternatives as plain
     alternatives: no `selection` key, no candidate block (no facts are stored since item 6), nothing chosen; a plain
     Chapter 3 decision, weighed as one (`project-lifecycle.js`, the edit Q9 rules). Replaced (`S5 old documents`): the
     copy's `selection` is null and its reading weighs nothing -> no `selection` key, no candidate block, nothing chosen,
     weighed as a plain decision, and no selection finding there.
   - (9), should-fix 9: the SDD prints, beside the rows stored at the choice, the reading as it is now, with why a
     candidate no longer stands ("at the choice: … · now: …"), so a withdrawn profile does not keep printing pass
     (`sdd-architecture.js`, server-only). It reads the package's reading through the package's chapter-3 finding
     `selection-withdrawn` (decisionFindings), not by importing the package: a first version imported
     `candidateEligibility`, and S0's `D3 workbench keys` then read `adoption-selection.js` as a workbench module and
     its `ADP` as a workbench prefix (the constraint of design concern 5).
   - (10), should-fix 10: the case "an option with a failing excludes predicate is now ineligible" is kept in
     `S5 parity row 9`, marked for wp1's selection form (and wp9b's gates), holding today's reading: unknown, chosen only
     as unproven.
9. **Notes, size, suites — done.** Measured with `node build.mjs` (dist/client-size-report.json):

   | | `5cae40a` (start) | 082e06b (the slice) | this fix-up |
   |---|---|---|---|
   | Chapters route (`routes.chapters.code`) | 3,230,605 B | 3,230,758 B (+153) | **3,228,300 B (−2,305)** |
   | Projects route | 507,338 B | 507,390 B | 507,960 B (+622) |
   | Script files | 148 | 148 | 148 |
   | Buckets (under 10 KB / 10–50 / over 50) | 53 / 50 / 45 | 53 / 50 / 45 | 53 / 50 / 45 |
   | Stylesheet | 901,873 B | 901,873 B | 901,873 B |
   | Opens with records (host `architecture-task-ui.js`) | — | 3,352,670 B | 3,359,476 B (131,176 B in 2 scripts beside the route) |

   Along the way: Q1 +127 B, then the sentence shortened; Q2 and Q4 +~430 B on `decisions-domain.js`; Q8 −3,014 B on
   `architecture-design.js` (the guided path's code left the route). wp2's own bytes: S1 325 B; S5 books **0 B**
   (`audit/rc44/evidence/wp2-s5-size.json`: `ownBytes` 0, `routeDelta` −2,305): a package books no negative figure
   (ruling O1), so the saving is the lead's to book at the merge (lead-bookings-size.json). The size case (`S5 size`)
   holds the 800 B of Q10 for wp2 and 475 B for S5, `ownBytes` an integer of at least 0 equal to the growth when the
   route grows, the delta beside it, and M4's identity (wp2's bytes on this build are S1's and S5's route delta: −1,980
   B). **S1's `size` block** (`record.mjs` l.880, a 5cae40a suite: `mine > 0 && mine <= 600`) now reads −1,980 B and
   fails `mine > 0`: it cannot pass until the saving is booked in the lead's file; I did not loosen it (and left its 600
   B, the stricter bound, for the lead to move to 800 with Q10). Cap unchanged; no gate raised.
   `node check-syntax.mjs`: 940 modules pass. `node scripts/lint.mjs --summary`: 162 problems, the baseline's 162, 0 new.
   Suites (one after another, the machine shared): `test:rc44-wp2-adoption` (S1's 20 blocks and S5's 20) green but for
   S1's `size`; 64 suites that import a changed file, `rc44-wp1-knowledge`, `component-library`, `rc42-g2-library`,
   `architecture-intelligence`, `recovery-authority`, `recovery-size`, `sdd-*`, `sol-sdd`, `decisions`, `decision-reading`,
   `tradeoff`, `desk`, `architecture-whatif`, `utility`, `brain-tradeoffs` among them: 59 green; red the same way as on
   `5cae40a`: `command-equivalence` (l.60, checked on an archive of 5cae40a) and `contextual-intelligence-ui` (l.116);
   red by this fix-up, for the lead: `design-concern` (l.24, item 7), `rc44-s0-extensions` (`8 client build` only, after
   `D3` was fixed) and `rc44-wp9a-deployment` (`S1.10` only), both size checks (above). Not run: the full regression
   (the lead's), the browser suites (red at the baseline on this machine), `test:scale`, `sdd-size` (its timer).

### Fix-up, line by line

Must-fix (review):
1. readDecision null for a selection, callers broken, 'breaks' off — done (item 2, Q1): `S5 Q1 readers`; 'breaks' from a fail row in `S5 Q4 second person`.
2. Chapter 3's commands go round the selection — done (item 3, Q2): `S5 Q2 one truth`.
3. Person-stated predicates nobody can see — done (item 4, Q3: removed): `S5 Sol`, `S5 eligibility`.
4. The second-person step does not cover the judgement — done (item 5, Q4): `S5 Q4 second person`.
5. Approval after assumptionsResolved while unproven — done (item 5, Q4): `S5 Q4 second person`.
6. instantiate updates an existing component — done (item 6, Q5): `S5 Q5 instantiate creates`.
7. Imported or hand-written steps and facts trusted — done (item 6, Q6): `S5 Q6 elsewhere`. A judgement written by hand into a live document is not told from one a command wrote; documents are written only through the commands, and the one way a document arrives from elsewhere (a recovery import) moves the steps aside.
8. The suite red at its head (clock) — done (item 1, Q7): `S5 fixtures`.
9. Row 9 re-pointed, not retired — done (item 7, Q8): `S5 parity row 9`; `design-concern-validate.mjs` not re-pointed (no leave).

Should-fix (review):
1. A late hard constraint never read — done (item 8, Q9 (1)): `S5 Q9 the rest`.
2. An agent account's selection reads prepared person — done (item 4, Q3): `S5 Sol`.
3. Standing of library, archetype and existing candidates — done (item 6, Q6): `S5 Q6 elsewhere`.
4. No finding when a selection's knowledge is withdrawn — done (item 7, Q8): `S5 parity row 9` (`selection-withdrawn`).
5. judge bypasses revise — done (items 3 and 8, Q9 (5)): `S5 Q9 the rest`.
6. adoption-ui.js's header and the window hook — done (item 8, Q9 (6)): `S5 Q9 the rest`.
7. Choose names every unknown row unproven for the person — done (item 5, Q4): `S5 surface`.
8. What a template copy is — done (item 8, Q9 (8)): `S5 old documents`.
9. The SDD prints only the stored rows — done (item 8, Q9 (9)): `S5 Q9 the rest`.
10. The excludes case — kept, marked for wp1's selection form, holding today's reading (item 8, Q9 (10)): `S5 parity row 9`.
11. The result and the notes — corrected (items 1 and 9, Q7, Q9 (11)): this file's "State", and the fix-up's result.

Design concerns (review):
1. Two readings of one hard constraint — closed by Q2: the selection's row is the authority, written into Chapter 3, which may not change it.
2. Is unproven a waiver — closed by Q4: a second person confirms before acceptance, approval is refused while unproven, and only a person other than the chooser closes a row.
3. Person-stated predicates — closed by Q3: removed until wp9b's hard gates.
4. Package steps on built-in records kept under `selection` — closed for the recovery import by Q6 (moved aside, `assertRecoveryClearsSteps`); a template copy now keeps no selection at all (Q9 (8)). The contract row S0 might state for package steps kept on built-in records is the lead's (not added).
5. S0 tells a package's modules by who imports them — kept: `window.aiwSelection` is stated as the contract until D10 (Q9 (6)).
6. A shared reader's contract — closed by Q1: readDecision answers for a selection and every caller has a case.
7. A profile instantiated through realisation.component — accepted by the lead (Q5): its source names release, claim, hash and decision, and the readers find them.
8. The chooser shows a candidate profile inside a design project — recorded as pending for the owner (Q11, below).
9. wp2's route headroom — closed by Q10 (800 B) and by the retirement's saving (S5 books 0 B).

Rulings:
- Q1 — done (item 2). Q2 — done (item 3). Q3 — done (item 4). Q4 — done (item 5). Q5 — done (item 6). Q6 — done
  (item 6). Q7 — done (item 1). Q8 — done but for `design-concern-validate.mjs` (item 7). Q9 (1), (5), (6), (8), (9),
  (10) — done (item 8); (11) — done (item 9). Q10 — applied: the size case holds 800 B for wp2 (item 9); S1's own size
  block keeps 600 B (not mine to loosen) and is red until the lead books the saving. Q11 — recorded: the chooser shows a
  candidate profile's title, status label and source location inside a design project; plan section 6 item 4 leaves
  candidate content in design projects to the owner, whose decision is **pending**.

### What later slices must know

- A selection's decision: Chapter 3's `decision.choose`, `decision.clear-choice`, a new alternative, a candidate's
  rejection reason and its effect on a hard constraint are the selection's (`SELECTION_STEP`, decisions-domain.js);
  any slice that writes a decision's choice or alternatives for a selection goes through `selection.*`.
- `decision.selection` now holds `started`, `confirm` and, after a recovery import, `imported`; `alternative.candidate`
  holds no facts (read with `selectionReading`, from the released claim). A template copy keeps no selection.
- `selection.confirm` is a second person's step; `confirmStands(p, d)` and `confirmSubject(p, d)` are exported. The
  package's chapter-3 checks (`selection-choice`, `selection-confirm`, `selection-withdrawn`) are errors that refuse
  acceptance and approval.
- The comparison of a released concern has one builder, `adoption-selection.js` `concernComparison`; the guided path
  for a released concern is retired.
- `window.aiwSelection({store, modal, decisionId?, responsibilityId?, concernId?, driverId?})` is a contract until D10.
- No hard constraint is evaluated before wp9b's hard gates; wp1's selection form and wp9b's gates flip the marked
  excludes case.

### Open points for the lead

1. `design-concern-validate.mjs`: leave to re-point its guided-path blocks to `selection.*` (most decision assertions
   map; its task-reader assertions would read a task as an older project holds it), or a ruling that it retires with
   the path. Until then it fails at l.24 instead of l.119.
2. `architecture-intelligence-validate.mjs`'s "creating a proposed task does not invalidate its source" cannot hold
   for a selection, which writes a Chapter 3 decision at its start; replaced by the exact statement that the decision is
   the only source change (item 7). Accept, or rule that a Sol-drafted selection's decision is no design source.
3. Route booking: the fix-up's −2,305 B against `5cae40a` (S5 books 0 B) is the lead's to book. Three size checks of
   suites on `5cae40a` assume the route grows and fail until it is: S1's `size` (record.mjs l.880, `mine > 0`, −1,980
   B), S0's `8 client build` (rc44-s0-extensions-validate.mjs l.1461, `measured >= slice - 700`, 3,228,300 B) and
   wp9a's `S1.10 the client build` (rc44-wp9a-deployment-validate.mjs l.1223, `mine > 0`, −1,963 B). S1's 600 B bound
   moves to 800 B with Q10 at the lead's hand.
4. The confirm and the judgements are kept on the built-in decision under `selection`; whether S0 states a contract row
   for package steps on built-in records (design concern 4) is the lead's.

## Second fix-up (rulings U1 to U6 of 2026-11-22; verifier /home/user/hb-review/rc44-build/wp2-s5-selection.verify.json)

Branch `rc44/wp2-s5-selection-fix-c2` from `7f1b897` (the fix-up's head). Items in the order the lead gave them, each
case first, seen to fail on the head it started from, then the change; a WIP commit after each item.

### Progress

- **Done:** item 1 (U1): case `S5 U1 hard constraint` (failed at `7f1b897`: a person's decision.save that drops QD-008
  was taken, 200 !== 400), then the change (commit 8738d5d); the wp2 suite is green but for S1's `size` (item 5).
  Route +83 B (3,228,300 -> 3,228,383).
- **Done:** item 2 (U4): architecture-intelligence-validate.mjs's two assertions restored exactly as on 5cae40a (failed
  at 8738d5d on 'Creating a proposed task cannot invalidate the source that suggested it'), case `S5 U4 proposal` (failed
  without the change), then the change in `public/journey-context.js` (route +39 B, 3,228,383 -> 3,228,422).
- **Done:** item 3 (U3): `design-concern-validate.mjs` re-pointed (each replaced assertion marked "U3: was … ->" in the
  suite); its task readers read the documents the guided path made at `5cae40a` (`rc44-wp2-design-concern-held.json`,
  captured by the suite as it was there); case `S5 U3 concern`. Both failed first (no option was refused for want of its
  criterion notes; the view had no note fields); then `selection.candidate` of kind option refuses an option not assessed
  on every released criterion, and the view asks a note per option and criterion (both off the route). The suite now runs
  to its baseline red assertion (l.119 at `5cae40a`, l.199 now) and stops there for the same reason (`QD-002: ''` in the
  assessments).
- **Done:** item 4 (U5): case `S5 U5 SDD basis` and `S5 SDD` re-pointed (both failed at 76eb0f9: no package section);
  the basis is the package's section of the architecture edition through S0's sections part (`adoption-server.js`
  `selectionBasis`, after "## Trade-off analysis", server-only), read from `selectionReading`; `sdd-architecture.js` prints
  a pointer in the decision record and no longer reads the package's finding (its import of `decisionFindings` and
  `constraintForce` is gone again).
- **In progress:** item 5 (U2).
- **Next:** U2, U6, the notes.
