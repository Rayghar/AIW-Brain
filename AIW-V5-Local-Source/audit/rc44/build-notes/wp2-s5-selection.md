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

| Earlier step or reader | What happened in S5 | Retired in |
|---|---|---|
| The comparison's own writer (`previewReleasedConcern`'s decision and alternatives) | **re-pointed**: one builder, `concernComparison`, which the guided comparison and `selection.*` both write through; parity held against the goldens of `5cae40a` for both options, through both paths | done |
| `architecture.start/answers/prepare` on a `knowledge:` topic, its preview and `alternative.apply` of it (the guided front-end) | **left standing**, writing through the one builder: S1's own fixture (`governedConcernApplied`, J4), `architecture-intelligence.js`'s "Compare the released approaches" action (`architecture-intelligence-validate.mjs` l.112) and the comparison tools' task UI read it | S3, with the other guided tasks and their surface |
| The applied guided comparison as an adoption of kind `concern` (S1's upgrade) | unchanged | S3/S6 with the task readers |

So a released concern can be compared two ways until S3: both write one decision shape through one builder; a
selection's decision also carries its basis (constraints, candidates, eligibility), the guided one does not (it is
weighed as before). That is the earlier path standing, not a second writer.

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

- **Done:** items 1 to 6 (Q7, Q1, Q2, Q3, Q4, Q5 and Q6). Every S5 block is green; S1's `size` block is red until item 9
  (wp2's allowance is 800 B since Q10; the route is over until item 7 retires the guided path's code).
- **In progress:** item 7 (Q8).
- **Next:** items 8 and 9 (Q9, notes and size).

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
