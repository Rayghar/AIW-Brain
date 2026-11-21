# rc44 wp2 slice S5: component selection as a recorded decision — build notes

Branch `rc44/wp2-s5-selection`, from `5cae40a` (the typed deployment topology, wp9a slice 1, after its second fix-up,
on `rc44/integration` `a4c1690`). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S5 under g, e.1 row 9).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"). Rulings: `RULINGS-2026-11-18.md` (main
checkout), sections A to O. Package `p40-adoption`, held in `public/architecture-task-ui.js` (no new lazy entry; 148
script files). `productionAccepted` stays false. No external authority is impersonated: nothing here approves,
releases, accepts or promotes anything for a person; the one acceptance a selection leads to (the profile's adoption)
is S1's second-person step.

## State

- **Done:** the selection module and its five steps, the registration rows, the built-in edits, the parity of row 9,
  the SDD's selection basis, the surface, the size evidence, the 13 blocks of `rc44-wp2-adoption-cases/selection.mjs`
  (all green; each seen to fail on the base first), S1's suite green with three assertions replaced (below).
- **In progress:** nothing.
- **Next (for the lead):** the open questions below; the review of the slice.

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

## Suites

(filled at the end of the slice; see the final commit)

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
