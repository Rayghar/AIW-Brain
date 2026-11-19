# rc44 wp2 slice S1: the adoption record, its readers and the upgrade — build notes

Branch `rc44/wp2-s1-record`, from `8e8240e` (S0's fix-up head `72204ff` plus the lead's rulings F2 and F3 on
`rc44/s0-lead-f`). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S1 under g, e.3). Contract:
`audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"), the rulings of 2026-11-18 (A, D, F).
`productionAccepted` stays false. No external authority is impersonated: nothing here approves, releases or accepts
anything for a person.

## Fix-up (after the adversarial review; rulings of 2026-11-19, section J)

Branch `rc44/wp2-s1-record-fix`, from the builder's head `13a72c2`, merged with `rc44/integration` (`b59bc88`: the
final S0, wp1 S1, the rulings to section I). Review: `/home/user/hb-review/rc44-build/wp2-s1-record.review.json`.
Rulings: section J of `RULINGS-2026-11-18.md` (in the main checkout; not on this branch).

**State of the fix-up (kept current; a session can be cut off):**

- Item 0, the merge: done (`a2403ab`, no conflict). The three rc44 suites on the merged head, before any change:
  `rc44-wp1-knowledge` 34 passed; `rc44-wp2-adoption` 11 of 12 (block `size`: the evidence file was measured against
  the S0 figure before S0's second round, `304 !== 290`); `rc44-s0-extensions` 13 of 22. The nine S0 blocks that fail
  because a real package is registered: `6a no extension registered`, `registration`, `D2 packages a document names`,
  `D3 workbench keys`, `D5 SDD provenance`, `SF start check`, `needs and load`, `7 idempotent and order-free`,
  `8 client build`.
- Item 1 (J11): in progress.
- Items 2 to 5: next, in the order of the task.

## State (of the first build)

- **Done:** the package `p40-adoption` (record, reading and findings, emitter, layer `mechanism`, five steps, tracker,
  upgrade, built-in skeletons, definition shape), its two lines, its host entry, three edits of built-in code, the
  suite (12 blocks, green), the size evidence. Every block was seen to fail first (commit `7f9deda`: all 12).
- **In progress:** nothing.
- **Next (for the lead):** merge after S0; decide the items under "Open questions"; S0's own suite needs nine blocks
  adapted now that a package exists (listed there). Later slices: see "What later slices must know".

## What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/adoption-domain.js` | server; lazy entry | `adoptionRecords`, `adoption`, `adoptionReading`, `adoptionFindings`, `acceptanceSubject` (the projection), `adoptionAccepted` (the reader), `emitAdoptions`, `applyAdoptionCommand` (five steps), `trackAdoptionChange`, `ADOPTION_LIMITS` |
| `public/adoption-upgrade.js` | server; lazy entry | `needsAdoptionUpgrade`, `upgradeAdoptions` (design e.3) |
| `public/adoption-builtins.js` | server; lazy entry | `BUILTIN_DEFINITIONS` (twelve skeletons by method id), `builtinFromReceipt`, `builtinOfKind` |
| `public/adoption-definitions.js` | server; lazy entry | the definition shape, `definitionIssues` |
| `public/adoption-package.js` | server; lazy entry | the one `registerExtension({id: 'p40-adoption', …})` |
| `design-packages.js` | server | one line: the import of `adoption-package.js` |
| `public/design-package-routes.js` | route | one line: the stub `p40-adoption-route` (`needs: p => p.adoptions`, `load`: the lazy entry) |
| `public/architecture-task-ui.js` | lazy entry | one import: the entry that holds the package (ruling D7.6) |
| `rc44-wp2-adoption-validate.mjs`, `rc44-wp2-adoption-cases/record.mjs`, `rc44-wp2-fixtures.mjs`, `rc44-wp2-adoption-baseline.json` | suite | runner, S1's cases, fixtures, the goldens of the references captured from `8e8240e` |
| `audit/rc44/evidence/wp2-s1-size.json` | evidence | the route measurement with "opens with records" |

Registration rows (nothing hand-edited into the shared files): `records` (type `pattern`, from the package's own
collection, D7.2), `layers` and `hops` (each states `only`, D6.3; both are context), `checks` (Chapter 5), `commands`
(four `person`, `adoption.accept` `second`), `track` (D4), `provenance` (noun, paths, records: read by the provenance
reader, not retired by the lifecycle family), `upgrade` and `upgradeNote`. Needs and load are the stub's.

Edits of built-in code (inside the allowance, each commented "rc44, wp2"):
1. `public/record-graph.js`: the built-in emitter skips a task that has `adoptionId` (one record for one mechanism).
2. `public/review-domain.js` `reviewSource`: a task is read without its `adoptionId`; `adoptions` joins the design
   source as the records whose revision is past 1 (see deviation 2). A document without such a record keeps no key.
3. `public/architecture-task-ui.js`: the import above.

`architectureSolutionsFor` and the obligation basis are **not** edited in S1 (see deviation 3).

## The record as built (differences from design b.1 are deviations below)

`p.adoptions = {schemaVersion: 1, definition: 1, counter, version, records}`, created when first written. A record:
`id` (`ADP-nnn`), `ref`, `revision`, `status` (`applied`, `withdrawn`, `reversed`; `draft`, `prepared`, `superseded`
come with S2), `origin`, `kind`, `title`, `owner`, `scope`, `definition {definitionId, version, optionId, groupId,
authority, receipt, snapshot, snapshotHash}`, `facts`, `bindings`, `parameters`, `obligations`, `decisionId`,
`deviations`, `applied`, `review` (the acceptance), `confirmed`, `legacy`, `history`.

- **History** entries are `{n, at, event, actor, revision, note?, causes?}`; `n` counts up for good. Events: `upgrade`,
  `reassess`, `accept`, `deviation`, `obligation`, `withdraw`, `reverse`, `changed` (the tracker's). The entries the
  projection and the tracker read are never trimmed; the others keep their last 30.
- **Steps** (all refuse a stale `revision` with "This adoption changed. Reopen it; your input is retained.", and a
  record that is not `applied`): `adoption.reassess` (confirms; no revision), `adoption.accept` (writes `review`; no
  revision), `adoption.deviation` (add, or withdraw with a reason; revision), `adoption.obligation` (discharge by a
  record a bound record reaches, or clear; revision), `adoption.withdraw` (reason; revision; the task it was upgraded
  from is marked `dismissed`, as `model-reversal.js` marks a reversed design's task).
- **Findings** (Chapter 5, id `<code>:<adoption id>`, `objectId` the adoption): `adoption-role-broken` (error),
  `adoption-role-missing` (error), `adoption-basis` (warning), `adoption-deviation-unreviewed` (warning),
  `adoption-acceptance` (warning). None is marked `hard` in S1: the one the design makes non-waivable
  (`adoption-contraindicated`, ruling A1's class) needs preconditions, which are S2's.

## The second person (rulings D1, D7.1, F3, F4, A5)

- **No check of the package's own.** `adoption.accept` is a `second` type. Its function answers the projection
  `acceptanceSubject(a)` = `{id, actor, history: [{revision, actor}]}`: `actor` is who stands behind the applied record
  (the signed-in applier from S2 on; for a record no signed-in person applied, the person who first confirmed it
  here); `history` names once each, since the last apply, who applied, who confirmed in the applier's place, and who
  changed facts, bindings, parameters or deviations.
- **Left out of the projection** (design c.1; D7.1 asks for it to be said): a save that changed none of those —
  `adoption.obligation` (discharging an obligation), and `adoption.reassess` of a record a signed-in person applied.
  Cases: *left in* — C adds a deviation and is refused ("architect-c wrote ADP-001") whoever confirms afterwards;
  *left out* — B discharges an obligation, is not named by the projection, and accepts once another person stands
  behind the record (the boundary's two-persons rule, D1, refuses B first, because B's save is the record's last).
- **At read time** `adoptionAccepted(p, a)` calls `verifierRefusal` on the same projection with the stored step's
  actor and account kind and requires `account === 'person'`, the step's revision to be the record's, its deviation
  ids to be the active ones, nothing changed or reassessed after it (`review.seq`), and the step to be taken in this
  project (after a restore or a template copy). A status written by hand does not count.
- **Kept under `review`** (F3): `{actor, at, account, revision, seq, note, deviationIds}`. The stored status stays
  `applied`; "accepted" is read, never stored (deviation 1). `assertTemplateCopyClearsSteps` passes; in a copy the
  adoption reads "applied in another project · not applied or accepted in this project".
- **Ruling F4 — the person-only step that confirms a record no person has stood behind: `adoption.reassess`.** An
  upgraded adoption carries no author stamp and its applier is a typed name, so `adoption.accept` is refused by the
  one rule ("ADP-001 names no author: save it again first."; the sentence is `verifierRefusal`'s, ruling A5). A
  signed-in person reads it against the model and sends `adoption.reassess`; the boundary stamps who confirmed
  (`provenance.reviewed`), the projection names that person, and a second person accepts. The package says which step
  comes first in its own words (`adoptionReading(...).acceptance.next`, and the finding's detail). Case: block `accept`.
  The same path serves a record a template copy carries (block `template copy`).

## The upgrade (design e.3) and what it moves

`upgradeAdoptions(p)` answers `p` itself when no task stands as applied without an adoption. Otherwise, for each such
task, one adoption exactly as e.3 lists (asserted field by field in block `upgrade`): origin `upgrade`, status
`applied`, no acceptance; `legacy {taskId, solutionId, alternativeId, methodReceipt, governedKnowledge, answers}`
verbatim; the definition from `builtinFromReceipt` with the receipt and a snapshot of what the project used (roles
from the placement, obligations by id suffix); bindings from `solution.placement`; facts from `applied.designAnswers`
(`by` the typed reviewer name, `identity: 'typed-name'`); parameters from `specifications[].parameters` with
`unit: ''`, `migrated: true`; obligations verbatim with their ids; `decisionId`; `applied {at, reviewer, reason,
changeIds, records, reviewAuthority}` verbatim; no deviations, no bounds. A task of another kind gives roles from
`applied.records[].slot` and no obligations. The task stays, with `adoptionId` added. It writes nothing else.

**What it moves** (asserted, block `e3 rules`, on the Bank Payment reference with three applied tasks): of the ten
readings of `rc44-s0-readings.mjs` it moves `graph`, `model` (three `pattern` objects are the adoptions instead of the
tasks, with `binds`), `trails` (the layer `mechanism`), `findings` and `readiness` (three `adoption-acceptance`
warnings in Chapter 5), `provenance` (three records with no author stamp), `registers` and `sdd` (those findings and
counts). It leaves `stamps` and `ars`. Also asserted unmoved: the design fingerprint and its version stamp, the
evidence fingerprint, every requirement's trace stamp, the design source a freeze keeps (byte-identical), the whole
`finalReview` record, every chapter container, the obligation basis stamp of a verified action (which stays
`current-verified`), and the 22 rows of `architectureObligationsFor`. Built-in layers of every trail and spine:
unchanged (`assertBuiltInTrailsUnchanged`).

The five "must not" rules: 1 block `e3 rules`; 2 block `e3 rules`; 3 block `e3 rules`; 4 block `storage upgrade`
(a row written as an older build kept it is stored again at its first read, once, with a recovery point that holds
the row as it was and the step's sentence in the activity, and no event in the design journal); 5 block `e3 rules` (a
frozen source holds no task list and is answered as it is).

**Observed, and worth knowing:** on the server the read upgrades run wherever a document is read (`withFinalReview`),
the commit's own copy included. So a design applied on this build through `alternative.apply` is an adoption from
its own commit (origin `upgrade`, not accepted), and the document names `p40-adoption` from then on. Only a row stored
by an older build goes through the storage upgrade.

## Ruling A6: the chapter's record count, and types for relationships a person draws

- **Types for drawn relationships: not needed, and should stay so.** An adoption's relations (`binds`, `addresses`,
  `assesses`, `scopes`) are stated by its own steps and read from the record; a person never draws one. If a drawn
  link could be typed onto an adoption, a binding could be asserted outside `bind` and `apply`. No surface offers an
  adoption as an end of a drawn relationship.
- **The chapter's "N records" count: not in S1; yes from S3.** In S1 no chapter page lists adoptions (their surface is
  S3's, in the comparison tools). When S3 shows them, `adoptions.records` should count for the chapter that lists them.
  Which chapter that is, is open: the built-in type `pattern` is Chapter 3's ("Applied design reasoning"), while the
  package's collection and findings are stated for Chapter 5, where the bound components are (open question 3).

## Deviations from the design, the task text and the contract

1. **`accepted` is read, not stored.** Design b.1 stores status `accepted`. The contract keeps a second person's step
   under `review` because any other key is content to the authorship stamps: moving `status` would stamp the accepter
   as the record's author and clear the confirmation the two-persons rule reads.
2. **No design fingerprint 3 and no conversion of stored stamps.** The design converts stamps as D14 did. Instead the
   upgrade moves no stamp by construction: `reviewSource` leaves an adoption whose revision is 1 out (its content is
   the task's, which `guidedDesign` reads already) and reads a task without its `adoptionId`. A deviation, a discharge
   or a withdrawal moves the revision, so the record joins the design source and the fingerprint moves (asserted). A
   confirmation and an acceptance of a record as upgraded move no design stamp (asserted). Cost: about 100 B on the
   route; no stored stamp, alias table or frozen baseline is touched.
3. **The readers of the applied solution are not moved in S1.** `architectureSolutionsFor` and `acceptedObligation`
   still read the task. Every adoption of S1 has its task beside it, so the rows are the same (asserted), and a
   withdrawn or reversed adoption takes its task's applied standing with it (asserted: no reader lists its
   obligations). A body swap that reads adoptions needs an adoption that holds a solution, which S2 writes; doing it
   now would add route bytes for no reading that differs.
4. **The tracker's flag is a history entry, not a key `review {required, since, causes}`.** `review` is the
   acceptance (F3). A `changed` entry is bookkeeping to the stamps and is closed by the next `reassess`.
5. **No stored `reading`.** The design stores it so the route evaluates nothing. Under S0 the findings are the
   package's `checks`, which run in the lazily loaded package and are kept per settled document.
6. **`adoption-basis` is a warning** (the design's kept code `design-source` is an error). The task's own
   `design-source:<task id>` finding still comes from `designTaskFindings` for an upgraded record, as an error, as
   before; a second error for a changed bound record would block every review on an edit of a shared component.
7. **Both hops are context** (`ctx: true`); the design's hop has no context mark. No spine holds the layer, so no
   governance check reads it.
8. **No `designKeys` row.** The registry's check of a design key probes `reviewSource` with a list under the key,
   where the package keeps a container; it cannot read the line of deviation 2. The suite holds that the key moves the
   fingerprint.
9. **`adoption.reassess` does not recompute a basis** (the design's does): an upgraded record's basis is its task's,
   which `designBasisCurrent` already reads. It confirms and closes an open change.
10. **Base commit `8e8240e`, not `72204ff`** as the task text says. Ruling F3 binds every package with a person's step
    to call `assertTemplateCopyClearsSteps`, which exists only from `8e8240e`; the worktree was handed over there.
11. **The "fails today" case is held on the persistence design**, whose commit obligation
    (`DES-003:persistence-commit`) does rest on its store; the outbox's commit obligation rests on its processor in this
    code. The outbox's own store is held too (block `withdraw`, the tracker called as the server calls it).

## Measurements (`audit/rc44/evidence/wp2-s1-size.json`; `node build.mjs`, `dist/client-size-report.json`)

| | Before (S0, `s0-size.json`) | This slice |
|---|---|---|
| Chapters route (`routes.chapters.code`) | 3,229,761 B | 3,230,065 B (**+304 B** of wp2's 600 B; cap 3,233,792 unchanged; 3,727 B left) |
| Projects route | 506,802 B | 507,030 B (+228 B: the stub and the registry's `registerExtension`) |
| Script files | 148 | 148 |
| Files under 10 KB | 53 | 53 |
| Stylesheet | 901,873 B | 901,873 B |
| Opens with records (D10) | 3,308,950 B (79,189 B beside the route, 2 scripts) | 3,327,437 B (97,372 B beside the route, 2 scripts) |

Where the 304 B are: the stub and the first use of `registerExtension` on the route (S0 measured 217 B for a first
package), the emitter's skip, the two changes of `reviewSource`. **This is half of wp2's allowance, not "well under
half"**: the stub alone is a third of it. See open question 1.

## Suites

- `test:rc44-wp2-adoption`: 12 blocks, green.
- Green, unchanged: `design-task`, `architecture-design`, `composition`, `persistence`, `read-design`,
  `knowledge-design`, `architecture-obligation`, `component-library`, `rc42-g2-library`, `rc42-g4-trace-kernel`,
  `action-undo`, `architecture-case`, `architecture-drafting`, `architecture-operation-continuation`,
  `architecture-operation-group`, `architecture-verification`, `brain`, `exchange-design`, `model-alternatives`,
  `realisation`, `security-design`, `rc42-g1-tech-approval`, `rc42-g3a-risk-and-limits`, `rc42-g3b-trace-and-delivery`,
  `rc42-g3c-evidence-fingerprint`, `rc42-g5-runtime`, `rc42-g6-import`, `rc42-g7-data-contracts`, `baseline-size`,
  `driver-design-ui`, `output-stage`, `recovery-authority`, `review`, `roadmap`, `sdd-architecture`, `fingerprint`,
  `model-lifecycle`, `model-views`, `provenance`, `scale-readings`, `sdd-content`, `sdd-formats`, `sdd-modules`,
  `sdd-size`, `sol-sdd`, `trace-narrative`, `design-task-ui`, `exchange-task-ui`, `brain-ui`, `field-spark`.
- Red as on the baseline (both in `audit/rc42/regression-2026-11-16.json`, same failure line, and red on `8e8240e`):
  `design-concern`, `command-equivalence`.
- **Red because a package now exists: `test:rc44-s0-extensions`, 9 of 22 blocks** (S0's own file; not edited, by
  instruction). See open question 2.
- `node check-syntax.mjs`: passes. `node scripts/lint.mjs --summary`: 162 problems, 0 new. `node build.mjs`: passes
  every gate.
- Not run: the full regression (the lead's), and the browser suites that are red on this machine at the baseline
  (`architecture-ui`, `composition-ui`, `security-task-ui`).

## What later slices must know

1. **S2/S3: move the applied-solution readers when the first adoption without a task is written** (deviation 3), and
   give `adoption.apply` a signed-in `applied.actor`: the projection and the reader already read it.
2. **S2: `adoption-contraindicated` is the `hard` finding** (ruling A1). Preconditions, relationships, parameters
   with units, companions and cross rules are not evaluated in S1; the reading has the places for them.
3. **S6: `design-source:<task id>`** still comes from `designTaskFindings`. When the task readers skip a task with
   `adoptionId`, the adoption must raise it under the same id, or a recorded treatment is lost.
4. **A step that changes what an adoption says must move `revision` and set `confirmed` false** (`changed()` in
   `applyAdoptionCommand`): the acceptance and the fingerprint read the revision.
5. **`evidence` rows (S4) cannot be a list named `evidence`** on the record: a template copy empties every list of
   that name.
6. **The tracker writes no journal event of its own.** The cause is on the adoption's history; who sent the commit is
   in the journal of the command.

## Open questions (for the lead)

1. **Route allowance.** S1 uses 304 B of wp2's 600 B. The design's later rows (`component-library.js` about 120 B,
   `normaliseOption` 40 B, `design-questions.js` 60 B, `design-task-state.js` 30 B, `model-reversal.js` 40 B) do not
   fit in 296 B unless S3 and S6 take the legacy builders off the route first, as the design expects.
2. **S0's suite, with a package registered** (nothing of S0's was edited). Nine blocks fail, each on an assertion that
   no package exists or that uses what this package now holds:
   - `6a no extension registered`, `registration`, `7 idempotent and order-free`: equality with the list of the
     synthetic packages; `EXTENSIONS` now also holds `p40-adoption` and `p40-adoption-route`.
   - `needs and load`: "no package exists at this slice: neither list names one".
   - `D2 packages a document names`: uses `p40-adoption` as the example of a package this build lacks.
   - `SF start check`: its allowed probe is a layer over `pattern`, which now stands on `mechanism`.
   - `D5 SDD provenance`: the list of the packages' collections now starts with `adoptions.records`.
   - `8 client build`: the registry module is 479 B in the bundle, over the suite's own 420 B (the first route stub
     keeps `registerExtension` on the route; the bytes are inside the 304 B above).
   - `D3 workbench keys`: **needs one token in a product file of S0**: `ADP` in `WORKBENCH_PREFIXES`
     (`public/design-extension-parts.js`), as S0's note 3 asks of a slice that mints an id prefix. Until then another
     package could state `ADP` as its prefix unrefused.
3. **Which chapter an adoption belongs to** (A6): the built-in type `pattern` says 3; the package states 5 for its
   collection and findings.
4. **An acceptance of an adoption that has left its upgraded state moves the design fingerprint**, as a review kept
   on any built-in record does (the fingerprint reads records whole). If a frozen baseline should not read an
   acceptance as a design change, that is a ruling for all packages (wp9b).
5. **S0's check of `designKeys`** cannot read a projection of a key (deviation 8).
6. **The sentence of the first refusal** for a record nobody stands behind is `verifierRefusal`'s ("names no author:
   save it again first."), which misleads on an accept step; ruling A5 leaves it to wp9b.
