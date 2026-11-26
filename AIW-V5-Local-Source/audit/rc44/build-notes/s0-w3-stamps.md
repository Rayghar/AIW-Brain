# rc44 build S0-w3-stamps: a library's log is not design (Y2), and an import moves every record stamp aside (Z8) — build notes

Built on `rc44/s0-w3-stamps`, from `4349bb6` (rc44/integration with the build contract). Working release number
AIW v0.10.0-rc.10.73.44 (proposed; not confirmed by the owner). `productionAccepted` stays false. No external authority
is involved or impersonated: the build changes what a library's design fingerprint reads, what the knowledge package's
steps write into the family's log, and how a recovery import keeps the stamps a record carried; nothing else.
Rulings read: B10, X4, X5(b), Y2 (part A); Z2, Z5, Z8, Z9 and the known limit of `s0-d12-merge-author.md` (Fix-up, Z8)
(part B); the build contract of 2026-11-26 for everything else. A lead-owned build on the lead's shared files and wp1's
files, by leave. Route bytes are reported, not booked (AA2).

## State

- **Done:** baseline checkpoint and plan (cb18aeb); part A's cases first, goldens captured on the unchanged start
  commit, B10.2 to B10.7 seen red (86bf8bb); part B's cases first, golden captured on the unchanged start commit, I1 to
  I7 seen red (8d14a8c); part A built, `rc44-s0-b10` green (e6c8366); wp1's S2.16, S3.14 and S3.27 turned around as
  Y2 rules (d23aee3); part B built, `rc44-s0-import` green (1fd716f).
  Then: the SDD's count of an imported package record (I4, seen red first; e764cb9), I1's built-in requirement
  (f512445), recovery-size's assertion replaced as Z8 rules (9e5af59, 5c094c1), notes (Suites, Measurements, limits).
- **In progress:** nothing: the related suites, check-syntax, lint and the build ran on the final code (see "Suites"
  and "Measurements"); the evidence is `audit/rc44/evidence/s0-w3-stamps-build-2026-11-26.json`.
- **Review and fix-up (AA1):** the adversarial review asked for changes (four must-fix items); the one fix-up is on
  `rc44/s0-w3-stamps-fix` (section "Fix-up" at the end: each item with its case, the carried items, the suites and the
  measurements).
- **Next:** the lead's merge (AA1), with the rebuild, the related suites, S0's suite and the browser run of wave 3; the
  open questions below and those of the fix-up.

## Plan

Part A (Y2, the rest of B10):
1. Cases first (`rc44-s0-b10-validate.mjs`, `test:rc44-s0-b10`): goldens of old documents captured on the unchanged
   start commit (a design project with the knowledge records the commands that existed before rc44 write, the Bank
   Payment reference with them, a library as wp1 S1 to S3 write it, with a pin and a link, and the same library with
   its mark cleared, as a recovery import leaves it). Then: a library's design source reads neither `knowledge.history`
   nor `knowledge.version`, its evidence reads the log; every built-in knowledge command and every step of the package
   in a library moves no design stamp through the log; the package's steps write the family's log again (one line
   each, naming the package); the history panel draws the one trail from the document alone; a design project's
   readings are byte-identical to the goldens (S0's helpers too) and a package's step there moves no design stamp
   through its line; a library stored under the start commit reads with the same findings and its design stamp moves
   once, at the first read, and the case records exactly what moves.
2. Code: `public/review-domain.js` `designOf` (the library rule and the rule for a package's line elsewhere);
   `public/knowledge-governance.js` (the package's line names the package); `public/knowledge-concept-commands.js`
   (the handlers say whose step it is instead of `quiet`); `public/knowledge-workspace-ui.js` (the panel reads the
   log; the activity join and `stepsOf` retired).
3. Existing assertions the ruling turns around (old -> new recorded below): S2.16, S3.14 and S3.27 of wp1's suite.

Part B (Z8):
1. Cases first (`rc44-s0-import-validate.mjs`, `test:rc44-s0-import`), through `/api/recovery` (preview and restore)
   and the command route: a record stamped by a person dated after the import, one dated before, one with no date, a
   merged record (`mergedBy`, `how: 'merged'`), a confirmed narrative, a package's record (registered through S0), and
   the same package imported twice; each reads as nobody's here (`reviewOf`, `personBehind`, `confirmedByPerson`, the
   label, the SDD, the review plan); a signed-in person here confirms it and is the one named; four eyes and the
   second-person rule refuse nobody on account of an imported stamp; an earlier imported project reads exactly as
   today; a document never imported gains no key.
2. Code: `recovery-service.js` `neutraliseImportedAuthority` moves each record's `provenance.author` and
   `provenance.reviewed` to `provenance.imported` (built-in paths, the retired store, and every collection a package
   states, as the boundary's stamp walker reads them), before any early return, and marks the import as one that moved
   them; `public/provenance.js` reads the kept stamp as nobody's (the author kind stays what wrote the words, no person
   is named, nothing is reviewed) and keeps it through later saves; `public/source-fingerprint.js` reads it as no
   content; the date comparison (`historicalReview`, the boundary's `here()`) is retired for an import that moved the
   stamps and kept, as a recorded known limit, for a project imported before this build.

After the work: the two suites, S0's suite, wp1's suite (all of it), the other rc44 node suites, every suite that
imports the changed files; `node check-syntax.mjs`; `node scripts/lint.mjs --summary`; `node build.mjs` before and after.

## What the code did at the start (4349bb6)

- `public/review-domain.js` `designOf` read `knowledge.history` and `knowledge.version` as design in every project; the
  knowledge package stated `knowledge.concepts`, `.topics`, `.library`, `.pinCurrency` and `.organizationNotices` as
  evidence (S3, B10). So every built-in knowledge command in a library (one line, one version each) moved its design
  stamp, a concept's review and a restated library mark included (Y2's limit; B10.3 red: "concept-review moves no design
  stamp of the library").
- The package's handlers (`public/knowledge-concept-commands.js` `applyCrosswalkCommand`, `applyPinCommand`) passed
  `quiet: true`, so `applyKnowledgeCommand` wrote no line and moved no version for them; the history panel
  (`public/knowledge-workspace-ui.js` `renderKnowledgeReleases(p, steps)`) joined the log with the project activity's
  latest page, fetched by `stepsOf` from `/api/activity` (X4 e).
- A recovery import (`recovery-service.js` `neutraliseImportedAuthority`) left `provenance.author` and
  `provenance.reviewed` of every record in place; `public/provenance.js` `reviewOf` read a review dated after
  `finalReview.imported.at` as standing (`historicalReview`), the boundary's `personBehind` read an author or merge stamp
  dated after it as a person here (`here()`), `verifierRefusal` refused an imported merger, `settle`'s four eyes refused
  an imported writer, and the label, the SDD's people and the review plan named or counted them. Seen in I1 to I4 red:
  e.g. "after: no stamp stands after the import", "verifierRefusal refuses nobody on account of an imported merge stamp",
  "artefacts OUT-001: Written by architect-a".

## Cases (each seen red on the start code first, unless named a guard)

`rc44-s0-b10-validate.mjs` (part A; goldens `rc44-s0-b10-baseline.json`, captured on the unchanged start commit with
`node rc44-s0-b10-validate.mjs --capture 4349bb6`):

| Case | What it holds | Red on the start code |
|---|---|---|
| B10.1 | a design project reads as on the start commit with the package registered: the blank project and the Bank Payment reference holding the knowledge records of the commands before rc44, and a library whose mark is cleared (stored on the start commit), byte for byte in every S0 reading; trails and chains with and without the knowledge records | a guard (passes on both) |
| B10.2 | a library's design source holds no `knowledge.history`, no `knowledge.version`, and reads claims, releases, sources, crosswalk, pins, links; the log is in its evidence overlay; a line or a version moved in place moves no design stamp and moves the evidence stamp; without the mark both are design | "the design source of a library holds no knowledge.history" |
| B10.3 | through the commands, a concept's review and a restated library mark in a library: one line and one version each, no design stamp, the evidence stamp moves | "concept-review moves no design stamp of the library (the log is not design there)" |
| B10.4 | the package's steps write one line each (type, record, actor, `package: 'p10-knowledge'`) and move the version; in a library the line moves no design stamp; a confirmation moves none at all, an unlink does (a design change) | "one line for each step of the package, naming it and who took it" |
| B10.5 | the history panel draws the one trail from the log alone; the package's lines with who took them, the family's own as before; an activity handed to it is not read; the workspace fetches no `/api/activity` | "crosswalk is in the trail, with who took it" |
| B10.6 | in a design project (no mark) a package's line and its version say nothing to the design fingerprint or the evidence stamp; the design source reads the family's own lines and the version they moved; a built-in line is design as before (through the commands in a real design project: wp1's S3.6, an agent's migration that now writes its line, still moves no design stamp; S3.1 and S3.27 too) | "a package's line in a design project moves no design stamp" |
| B10.7 | a library stored on the start commit (a confirmed narrative among its stamps) reads with the same findings and readiness (what each says), its narrative still current; what moves at the first read is exactly the readings `findings` (the stamps of findings taken of the whole design) and `stamps`: design `3a96628f22dc413d` -> `7c8dba1839cb092c`, design version `…:2` -> `7c8dba1839cb092c:2`, evidence `ea35c2918f0148a5` -> `d86e38288b5a6b20`; once: the document the first read leaves reads the same at every later read | "the design stamp moves: the log leaves the library's design" (and, before the carry-over was built, "the same findings": the narrative went stale) |

`rc44-s0-import-validate.mjs` (part B; golden `rc44-s0-import-baseline.json`, a project imported on the unchanged start
commit, captured with `node rc44-s0-import-validate.mjs --capture 4349bb6`; the suite registers a package of its own,
`zx-stamps`, through S0):

| Case | What it holds | Red on the start code |
|---|---|---|
| I1 | through `/api/recovery` (preview, restore) of a hand-edited project JSON: records stamped by a person dated after the import, before it and with no date, one confirmed by a second person, a draft by Sol confirmed, a merged record (`mergedBy`, `how: 'merged'`) and the confirmed narrative: no stamp stands, each is kept under `provenance.imported` exactly as carried, `reviewOf` null, not confirmed by a person, the label names nobody, the SDD's people name nobody, a second person's step is refused for each (no person stands behind it); a person here confirms one and is the one named, a second person then takes the step; the narrative confirmed here names its confirmer | "after: no stamp stands after the import" |
| I2 | the merger elsewhere takes the second person's step once a person here confirmed the record (`verifierRefusal` refuses nobody on account of an imported merge stamp); under four eyes the writer elsewhere confirms; four eyes still refuses a writer here | "verifierRefusal refuses nobody on account of an imported merge stamp" |
| I3 | the built-in collections, the narrative, the retired store and a package's collections (provenance.records and provenance.paths) are walked; before the early return of a document without finalReview; a document with no stamp gains no key; other provenance keys stay; `finalReview.imported.stamps` counts the records | "artefacts OUT-001" |
| I4 | the readers on the moved stamps whatever their dates (reviewOf, confirmedByPerson, labels, the SDD's counts and people, the review plan, the boundary, verifierRefusal); the move moves no reading of a record (`recordStamp`) | "artefacts OUT-001: Written by architect-a" |
| I5 | a project imported on the start commit reads exactly as there (every S0 reading, every reader, the second person's step for two persons), nothing moves on its read; its next import moves its stamps aside | the golden part passes there; red on "the next import moves its stamps aside" |
| I6 | the same package imported twice reads the same twice; a project imported here, a stamp written here since, exported and imported again: what the first import kept stays as it was, the stamp written here is kept under the same key with the earlier history as `earlier` | "Cannot read properties of undefined (reading 'reviewed')" |
| I7 | one path: `historicalReview` and the boundary's `personBehind` read the import's date only through `datedImport` (a project imported before this build); the template copy's date stays (F3) | "historicalReview reads the date only for a project imported before this build" |

## What was built

Part A (Y2):
- `public/review-domain.js` `designOf`: in a library (the mark) `knowledge.history` goes into the evidence overlay and
  `knowledge.version` leaves the design (bookkeeping); elsewhere the design source reads the log less the lines that
  name a package, and the version less the moves those lines made. A switch (`withLibraryLogAsDesign`) reads the log as
  design, as before this build, for the readings upgrade alone; `reviewSourceStamp` keeps that reading's stamp apart.
- `public/readings-upgrade.js` `toLibraryLog`: a library whose review keeps stamps of the whole design and is not yet
  marked is carried over once at its first read (as D14's fingerprint upgrade does: a stored stamp that was current
  stays current, a frozen baseline is answered through the alias table), then marked `finalReview.libraryLogUpgrade`
  (the stamp it read, for audit).
- `public/knowledge-governance.js`: every knowledge command writes its line and moves the version; a package's line
  names the package (`forms.package`). `public/knowledge-concept-commands.js`: the handlers pass `package:
  'p10-knowledge'` instead of `quiet: true`.
- `public/knowledge-workspace-ui.js`: `renderKnowledgeReleases(p)` draws the log; a line that names the package and is
  of the package's types (`packageStep`) is drawn with who took it; `stepsOf` and the `/api/activity` fetch retired.

Part B (Z8):
- `public/provenance.js` `keepImportedStamps(p)` (pure; called by `recovery-service.js`): every collection the server
  stamps (the stamping paths, the provenance reader's paths, `logical.assets`, every package's `provenance.paths`,
  lifecycle and records) and the retired store: `provenance.author` and `.reviewed` -> `provenance.imported {author?,
  reviewed?, earlier?}`, only where there is something to keep; answers the count. `neutraliseImportedAuthority` calls it
  before its early return and records `finalReview.imported.stamps`.
- `public/provenance.js`: `authorship` reads the kind the kept author stamp says (person, Sol's draft, an import,
  AIW's), never who; nothing kept is a review or a keep here. `datedImport(p)`: the one statement of which import is
  dated (one with no `stamps` count, made before this build); `historicalReview` reads the date only for it. `setOwned`
  keeps `provenance.imported` through every later save (MARKS).
- `public/source-fingerprint.js`: `provenance.imported` is no content to a reading (as author and reviewed).
- `design-extension-boundary.js` `personBehind`: the import's date only through `datedImport`; the template copy's date
  stays. `public/review-domain.js` `localReview` and `public/architecture-obligations.js` (a captured verification): the
  import's date only through `datedImport` (the steps are moved aside by the import already: strip).

## Deviations from the task's words, and readings of the rulings

1. **Concepts stay evidence in a library.** Y2 lists "concepts, forms, releases, crosswalk, pins" as what a library's
   design source reads. S3 (B10) made `knowledge.concepts` and `.topics` evidence, and S3.14 asserts that a concept's
   field written in place moves no design stamp (the concept moves the evidence stamp); making concepts design would
   invert that assertion. Read: "the knowledge records themselves" are the records the design source reads today
   (claims and forms, releases, sources, the crosswalk and pins through their design rows), the concepts and topics
   beside it as evidence, and not the log. The lead may rule otherwise.
2. **The library rule is the workbench's, in `designOf`, not a row a package states.** `knowledge.history` and
   `.version` are keys the workbench writes (`WORKBENCH_KEYS`), which S0's contract keeps from every package; the rule
   reads the mark only, so the browser and the server read a library alike whether or not the package has loaded.
   `designKeys`/`evidenceKeys` are unchanged.
3. **A package's line elsewhere says nothing to the design** (bookkeeping, not evidence): in a design project a pin's,
   a link's or a migration's line moves neither fingerprint, as the quiet step did, so a design project reads as before
   and a person's step moves no stamp there (J3, L6). Lines are told by the `package` field the knowledge family writes;
   a line from before this build names none and is read as it was (S2's crosswalk lines in a library included).
4. **The version.** A package's step moves `knowledge.version` as every line does; in a design project the design source
   reads the version less the moves the package's lines made.
5. **A stored library's stamps are carried over once** (`toLibraryLog`), so it reads with the same findings (B10.7: the
   confirmed narrative stays current). Y2 allowed the stamps to move once; the carry-over keeps the findings and moves the
   stamps exactly once.
6. **An imported record's author kind** is the kind its kept stamp says, so the SDD still discloses a draft by Sol as
   Sol's and counts a person's words as a person's (by nobody named). A keep or confirmation made elsewhere is no keep or
   confirmation here (nothing reads as reviewed); where no author stamp was kept, the record reads by its own origin, as
   a record written before the stamps does. Not 'import': an import here names whose words they were, not who.
7. **A stamp written here after an import, then imported again**, is kept under the same key with the earlier history
   nested as `earlier` (one key per record; history never trimmed).
8. **One path, and the date readings that remain** (the task's "say which and why"): (a) the template copy's date in
   `personBehind` (ruling F3: a copy is no import; its stamps are not moved by this build); (b) wp2's
   `public/adoption-domain.js` and `public/adoption-selection.js` `here()` still read the import's date for an adoption's
   acceptance and a selection's confirm: those steps are moved aside by the import already (Q6, J), so the date reads
   nothing a person here did; they are wp2's files, built beside this build, and were not edited — the lead or wp2's next
   build points them at `datedImport`; (c) a project imported before this build, for which every reader keeps the date
   (the known limit below).
   **Corrected in the fix-up (must-fix 1):** the sentence "those steps are moved aside by the import already" was false for
   an adoption's acceptance: `neutraliseImportedAuthority` moved a selection's steps aside (Q6) but left
   `adoptions.records[].review` in place, so wp2's `here()` counted an acceptance dated after the import as the second
   person's step (I8 red on `c72a0a2`). The import now moves it aside (`importedReview`, `review` null), so the date wp2's
   `here()` reads decides nothing for an import of this build; for a project imported before this build it decides as
   there (known limit 1). Pointing wp2's `here()` at `datedImport` stays wp2's or the lead's.

## Retirement list (J6)

| Earlier | Now | Readers |
|---|---|---|
| the package's quiet step (`quiet: true`, no line, no version; S3) | one line naming the package, the version moved | `applyKnowledgeCommand`; `designOf` (bookkeeping outside a library) |
| the history panel's join with the project activity (`stepsOf`, `/api/activity`, `renderKnowledgeReleases(p, steps)`; X4 e) | the log alone (`renderKnowledgeReleases(p)`) | the knowledge workspace's Releases view |
| the date comparison as the import's guard (`historicalReview`, `personBehind`'s `here()`, `localReview`, a captured verification's) | the import moves every record stamp aside and says so (`finalReview.imported.stamps`); the date read only for a project imported before this build (`datedImport`) | `reviewOf`, `judgementOf`, the boundary, `localReview`, `architectureObligationActionState` |

## Replaced assertions (old -> new), each named by the ruling that turns it

All in wp1's suite, each recorded in its case too (the task's leave: "the knowledge package's steps write the family's
log again where wp1 routed around it", ruling Y2; the design stamp assertions of each case stand as they were):
1. `rc44-wp1-cases-crosswalk.mjs` S2.16: `history.length` equal ("writes no line into knowledge.history") and `version`
   equal ("moves no knowledge.version") -> the lines it had stand and exactly one line follows, the step's
   (`[length + 1, type, id, actor, 'p10-knowledge']`), and the version moved by one; "moves no design stamp of the
   library" unchanged.
2. `rc44-wp1-cases-pins.mjs` S3.14: `history.length` equal ("no line in knowledge.history") and `version` equal
   ("knowledge.version does not move") -> the library's lines stand, exactly the pin's and the link's lines follow
   (type, record, actor, package), the version moved by two, and the stamp with those lines and the version put back
   equals the stamp with them; "a pin moves the stamp" unchanged.
3. `rc44-wp1-cases-pins.mjs` S3.27: the panel handed the activity counts the log plus 2 and draws the steps with who took
   them -> the log itself holds exactly the pin's and the link's lines, the panel drawn from the document alone counts
   that log and draws each with who took it, and the panel handed the activity equals the panel without it; "of the log
   is still in it" and "drawn without its actor" -> the same over the family's own lines (the package's lines are drawn
   with their actor, asserted above).
These turn S3's quiet step around as Y2 rules (as S3 turned S2.16 around under B10); each new assertion is exact.

One in a general suite, as ruling Z8 rules (the import's one new change to the design's sections):
4. `recovery-size-validate.mjs` (part A, the restored project): "every other section restores exactly" compared each
   section with the original's -> compares it with the original's with exactly the import's record-stamp move made on a
   copy (`keepImportedStamps`), character for character; and the review's expected imported mark
   (`neutraliseImportedAuthority({finalReview})`) gets the count the import makes over the whole project
   (`expected.imported.stamps = keptStamps`). Seen red on this branch before the replacement: "every other section restores
   exactly … + 'quality'" (the trade-off conflict the suite saves through the server carries an author stamp). Every
   other assertion of the case (the journal whole, the review whole, the knowledge and workbench, the baseline parts by
   their SHA-256) is unchanged.

## Known limits (after this build)

1. **A project imported before this build** keeps its record stamps in place and is read with the import's date, as on
   the start commit (I5), until its next import; recorded for the merge evidence, not a silent change.
2. **Marking a project as a library, or clearing the mark, moves its design stamp once** (the log leaves or rejoins the
   design), as the mark's own line moved it before this build.
3. **A package's steps count against the family's history bound** (2,000 lines in a project, 6,000 in a library), as
   every knowledge command's line does; a bound is a write bound, history is never trimmed.
4. **The browser registers the knowledge package only for a document with crosswalk rows or pins** (the route stub's
   `needs`): a library that holds concepts but neither reads its concepts and topics as design in the browser until the
   package loads (S3's evidence keys); the log rule of this build does not depend on it. For S0-D10's shared entry
   (`s0-w3-bundle`) or the lead.
5. wp2's `here()` readers (deviation 8 b, corrected by the fix-up): an imported acceptance is moved aside, so they read a date only for a project imported before this build.
6. **An import moves the imported project's design stamp once, at the import** (corrected in the fix-up, must-fix 2:
   the first version of this limit was wrong). The design fingerprint reads a built-in record's provenance, so moving
   its stamps aside changed the fingerprint and every chapter stamp of a stamped record; on `c72a0a2` a project with
   stamped records and a frozen baseline read "Requirements, Decisions" as changed since the baseline, `baselineCurrent`
   false and readiness back at "Freeze a reviewable baseline", where `4349bb6` read the baseline current (it was current
   there: the claim "it was never current here" was wrong). The import now carries the stamps of the whole design over
   its own move in the same pass (`readings-upgrade.js keepingDesignStamps`, called first in
   `neutraliseImportedAuthority`): stored stamps that were current are taken again, the frozen baseline is answered
   through the alias table (chapters, design, evidence). I9 holds the three references and a project through
   `/api/recovery` against a golden of `4349bb6`. What remains: (a) an imported document whose readings definition is
   older than this build's (the conversions `convertCopies` and `toReadings` write their own alias table without
   chaining an earlier one), whose frozen baseline loses the import's aliases; (b) what the other steps of the import
   change of the design (as on `4349bb6`: e.g. through `/api/recovery` the restored project reads "Review narrative,
   traceability, findings, or delivery plan" there and here) still makes a stored stamp stale, as there.

## Suites (on this branch, each with env -u of the provider keys; the runner `.aiw-local/run-suites.sh`, two at a time)

- This build's: `test:rc44-s0-b10` 7/7, `test:rc44-s0-import` 7/7 (both, and the four rc44 suites below, run again on
  the final code with the same outcome; the evidence file lists every suite's exit).
- rc44: `test:rc44-s0-extensions` 35 of 36 blocks (O1, bytes only); `test:rc44-wp1-knowledge` (all of it) 85 of 87
  delivered cases (S2.12 and S3.10, bytes only; 2 pending); `test:rc44-wp2-adoption` all blocks but "size" and
  "S5 size" (bytes only); `test:rc44-wp9a-deployment` 24 of 25 (S1.10, bytes only). Each of those six size cases fails
  by exactly the +583 B unbooked here and passes on `4349bb6` (S0's suite 36/36, wp1's two size cases and wp9a's suite
  25/25 run there in `.aiw-local/base`; wp2's two by their own figures: 908 - 325 = 1772 - 1189 = 583).
- Green, importing or exercising the changed files: provenance, recovery-authority, evidence, review-plan,
  seeded-proposals, fingerprint, rc42-g3c-evidence-fingerprint, rc42-g2-library, rc42-g3a-risk-and-limits,
  rc42-g3b-trace-and-delivery, architecture-obligation, architecture-verification, knowledge-coverage, repository-sync,
  hosted-knowledge, knowledge-boundaries, knowledge-design, knowledge-repository, knowledge-structure,
  repository-transfer, candidate-import, payment-knowledge-pilot, driver-applicability, specification-reasoning,
  technology-realisation, journal-archive, intake, operations, sdd-formats, service-routes, architecture-case,
  perspective-view, ui-modules, knowledge-retrieval, sdd-architecture, sdd-content, sdd-modules, sol-sdd, workspace,
  model-alternatives, action-undo, action-undo-api, design-records, connected-design-projections,
  rc42-g7-data-contracts, model-reconciliation, local-accounts, drafter-groups.
- `test:recovery-size`: red on this branch before its one assertion was replaced (replaced assertion 4: "every other
  section restores exactly … + 'quality'"), green after it (every check, its timings inside their bounds).
- Red on this runner before the change, and red the same way here (the first failing assertion compared with the run
  on `4349bb6` in `.aiw-local/base`, timestamps and UUIDs aside): command-equivalence ("a working choice made: the saved
  document is the one the route saved before round 12 · $.workbench.history[1]"), sol-disclosure ("The desk no longer
  holds F:capacity:run-001, F:capacity:run-008"), knowledge ("The upstream inventory dependency can time out."),
  stewardship ("F:latency:QD-003: knowledge captured from a disagreement …"), brain-ahead ("| Capacity | Critical |").
- Not run: the browser suites (they start servers on ports the OS chooses, outside 4100-4999; the panel's change is
  held by B10.5 and S3.27), the full regression (the lead's), `test:scale` (red at the baseline).
- `node check-syntax.mjs`: 947 modules, passed. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
  `node build.mjs`: every gate passes (Measurements).

## What later builds must know

- A recovery import leaves no `provenance.author` or `provenance.reviewed` on any record: they are under
  `provenance.imported` and name nobody here. A package's own reader of a stamp (e.g. wp1's `rowOrigin`, wp2's
  `a.provenance?.author?.kind`) reads such a record as one with no stamp, which fails closed; a reader that needs the
  words' kind calls `authorship`/`authorOf`. `provenance.imported` is no content to a reading, and every save keeps it.
- `datedImport(p)` (`public/provenance.js`) is the one statement of an import whose date is read; a new reader of the
  import's date uses it.
- A design package's step through the knowledge family (`applyKnowledgeCommand` with `forms.package`) writes a line
  naming the package; outside a library such a line says nothing to the design fingerprint. Only the knowledge package
  writes such lines today.
- A library's `knowledge.history` is evidence and `knowledge.version` bookkeeping (`designOf`); a reading of a library's
  design never reads them.

## Open questions (for the lead)

1. Deviation 1 (concepts as evidence) and deviation 6 (an imported record's kind) are readings; confirm or rule.
2. The three replaced wp1 assertions turn S3's assertions around, as Y2 rules; the lead confirms the leave.
3. wp2's `here()` readers: point them at `datedImport` in wp2's next build, or by the lead at the merge.
4. Known limit 6: closed by the fix-up (must-fix 2), save its two remaining cases (a) and (b).
5. The six size cases that fail only by the unbooked +583 B (Measurements): retired by `s0-w3-bundle` (AA2).

## External dependencies

None is involved. Licence counsel not engaged; four-eyes knowledge approver not assigned; independent architecture
review not started; production acceptance authority not established; release number unconfirmed (the owner).

## Measurements

`node build.mjs` (env -u ANTHROPIC_BASE_URL -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u OPENAI_API_KEY), read from
`dist/client-size-report.json`; the start measured in a `git archive` of `4349bb6` under `.aiw-local/` and in this
worktree before any change (the same figures):

| | start `4349bb6` | this branch | cap |
|---|---|---|---|
| routes.chapters.code | 3,228,938 B | 3,229,521 B (**+583 B**, booked nowhere: AA2) | 3,233,792 B now; 3,266,560 B once `s0-lead-w3` lands |
| routes.projects.code | 508,466 B | 508,721 B (+255 B) | 1,242,112 B |
| script files | 148 | 148 | 148 |
| buckets (under 10 KB, 10 to 50 KB, over 50 KB) | 52, 51, 45 | 52, 51, 45 | under 10 KB at most the base's 52 |
| violations | none | none | |
| opens with records (`p10-knowledge`, entry `public/knowledge-workspace-ui.js`, `opensWithRecords` on `dist/client-metafile.json`) | route + 147,315 B in 2 scripts = 3,376,253 B | route + 146,691 B in 2 scripts = 3,376,212 B | |

Where the +583 B are: `designOf`'s library rule and the old-reading switch (`review-domain.js`), `authorship`'s kept
kind and `datedImport` (`provenance.js`), `source-fingerprint.js`'s kept key, `localReview` and the verification's date
(`review-domain.js`, `architecture-obligations.js`). `keepImportedStamps`, `toLibraryLog` and the recovery code are in no
client chunk (searched in `dist/client/assets`). The knowledge workspace's lazy entry is 624 B smaller (`stepsOf`
retired). No stylesheet rule was added.

Because nothing is booked (AA2), the size cases written for the bookings fail on this branch by exactly the +583 B, and
pass on `4349bb6` (run there): S0's block "O1 the bookings add up", wp1's S2.12 and S3.10, wp2's blocks "size" and
"S5 size", wp9a's S1.10. Build `s0-w3-bundle` retires them beside this build (AA2); listed for the lead.

## Fix-up (AA1: the one review, the one fix-up; branch `rc44/s0-w3-stamps-fix` from `c72a0a2`)

State: **done** but for the lead's merge (see "Fix-up: suites and measurements" for what ran). Each must-fix item has
a case seen to fail on `c72a0a2` first (the failure is quoted; a case run on `c72a0a2` ran in a `git archive` of it under
`.aiw-local/head` with the fix-up's test files copied in). Goldens new in the fix-up were each captured on the unchanged
start commit `4349bb6` (a `git archive` under `.aiw-local/base`, the fix-up's test files copied in), never recaptured.

| Item | Outcome | Case (failure seen on `c72a0a2`) |
|---|---|---|
| must-fix 1: an adoption's acceptance kept in place by the import, decided by wp2's date | done: `recovery-service.js` moves `adoptions.records[].review` aside (`importedReview`, `review` null; no step, no key), before the early return, as M2 does for the topology step; deviation 8(b), known limit 5 and the evidence corrected | I8 through `/api/recovery` with wp2's fixture server ("an acceptance taken where the package came from is no acceptance here, whatever its date") |
| must-fix 2: a new import of a project with stamped records and a frozen baseline reads the baseline changed | done: `public/readings-upgrade.js keepingDesignStamps` takes the stamps of the whole design (design, chapters, evidence, treated findings) of the document as a read gives it before and after the stamp move and carries them over (`carry`, shared with `toLibraryLog`): a stored stamp that was current is taken again, a frozen baseline is answered through the alias table; `recovery-service.js` calls it as the import's first step; known limit 6 corrected | I9, golden `rc44-s0-import-baselines.json` (`--capture-baselines 4349bb6`): the three references in process and a project through `/api/recovery`, baselineChanges, baselineCurrent, readiness and what the findings say as on `4349bb6` ("bank-payment: the frozen baseline reads as on the start commit after the import: [["Requirements","Decisions"]]") |
| must-fix 3: a stored library's first read says evidence was recorded since a frozen baseline | done: `carry` writes an `evidence` alias in `finalReview.readingsUpgrade` (chained; kept by `toDesignFingerprint`), `review-domain.js baselineChanges` reads it; the evidence's `libraryStampsMove` updated | B10.7 extended, golden `rc44-s0-b10-frozen.json` (`--capture-frozen 4349bb6`: the stored library with checks and a baseline taken there) ("a baseline frozen on the start commit reads as it read there: [["Evidence recorded since the baseline"]]") |
| must-fix 4: the history panel loses the package's steps of a document stored before this build | done (the reviewer's preferred fix): `public/readings-upgrade.js` writes, at the first read, one line naming the package for each step the package's records keep (`packageSteps`: a row's proposals and edits, its review, a person's confirmation, its retirement; a pin, a repin, an unpin; a link and its unlink; a migration's proposals and edits and its confirmation), by time after the lines standing at its time, and moves the version by as many; in a library inside `toLibraryLog`'s carry (the log is evidence), in a design project alone (bookkeeping: no stamp moves) | B10.8, golden `rc44-s0-b10-panel.json` (`--capture-panel 4349bb6`: the panel `4349bb6` drew with the activity rows of the four steps), in the library and in the design project ("library: one line for each step the package's records keep, naming the package, with who took it") |
| should-fix 1: recovery-size's expectation computed by `keepImportedStamps` | done: the suite moves the stamps itself (every object of a section whose provenance holds author or reviewed, knowledge included) and counts them; the review is compared character for character with the old expectation translated by the suite's own move, and the alias table with the one computed from it (old -> new below) | `test:recovery-size` |
| should-fix 2: I7 matches source text only | done: I10 reads, by behaviour, an author stamp (the boundary's personBehind, the second person's step), a review plan judgement (historicalReview) and an architect review (localReview) dated before and after the import, for an import of this build and one of `4349bb6`; a guard (the behaviour is `c72a0a2`'s). The captured verification's date is not in it: carried | I10 |
| should-fix 4: `provenance.draft.appliedBy` names a person from elsewhere | done: `public/provenance.js recordProvenance` reads the mark's applier as nobody on a record whose stamps an import kept (no date decides); a stamp written here still names its writer | I11 ("quality.drivers: the line names nobody from elsewhere: Drafted by Sol, not reviewed; applied by architect-a on 2099-01-01") |
| should-fix 3, 5, 6, 7, 8, 9 and the five design concerns | carried (below) | |

Replaced assertions in the fix-up (old -> new, each at least as strict; ruling Z8 with should-fix 1 and must-fix 2):
1. `recovery-size-validate.mjs` "every other section restores exactly": the sections were compared with a copy moved by
   the product's own walker (`keepImportedStamps`) -> with a copy the suite moves itself (every object whose provenance
   holds author or reviewed, under `provenance.imported` with `earlier`), character for character; new beside it: "the
   project carries record stamps, which the import moves aside".
2. `recovery-size-validate.mjs` "the review, its baseline whole, with imported authority neutralised": the restored review
   equalled `neutraliseImportedAuthority({finalReview})` with the product's count -> the restored review less its alias
   table equals that expectation with the suite's own count and with the design stamp the suite's move changes
   translated (before -> after), character for character, and the alias table equals, character for character, the one
   computed from the suite's own move (each chapter it changes, the design, the evidence); new beside it: "the project kept
   no alias table before the import", "the move changes the stamp of a chapter whose records carried stamps".
3. `rc44-s0-b10-validate.mjs` B10.7 only gained assertions (a frozen baseline); no assertion of it changed.

Found in the fix-up, not a review item (carried, for the lead): a record an import carries with `confirmed: true` cannot
be confirmed here as it stands: the boundary stamps a confirmation only when the flag turns true (`provenance.js settle`),
so a person's confirmation of it stamps nothing and nobody stands behind it until it changes or is unconfirmed first (I8
records exactly this for an adoption: the confirmation stamps nothing, the accept is refused, and after a deviation and a
confirmation a second person accepts). The same was true on `4349bb6` (its stamp was dated before the import). Owner:
the lead (S0's settle), or wp2 for the adoption's step.

### Carried forward (one line each: what, where, which later build)

- should-fix 3: `/api/recovery` is open for a document naming a package this build lacks, the import walks only the
  registered packages yet records `stamps`, so a later build's package collections would read their stamps as a person's
  (`worker.js` MISSING_PACKAGE_OPEN, `recovery-service.js`) — record the walked package ids in `finalReview.imported`
  and keep the date for the others, or refuse the import: the lead (S0), before the next package that adds collections.
- should-fix 5: `libraryLogDue` fires once for a library created under this build (no marker yet) and rewrites the alias
  table at that read (`readings-upgrade.js`) — mark a library at its creation or require a stamp of the old reading:
  the lead (S0), with S0-D10's shared entry.
- should-fix 6: the package's steps count against the family's history bound (2,000 / 6,000 lines); which bound a person
  meets first is not measured (contract 48; `knowledge-governance.js`) — wp1 S4+S5, which measures its limits.
- should-fix 7: B10.3 and B10.4 take the steps in process; server-route variants (`/api/commands`) — wp1 S4+S5 (its
  suite's server harness), or the lead at the merge.
- should-fix 8: `verifierRefusal` still refuses the writer elsewhere through the record's own actor and history, which
  the import does not move, while the merger elsewhere is no longer refused (fails closed) — the lead's ruling; wp9b with
  the shared sentences.
- should-fix 9: the browser suites were not run; the panel's change and the retired activity fetch need the Releases
  view in the browser — the lead's browser run that closes wave 3.
- should-fix 2 (rest): the captured verification's date (`architecture-obligations.js`) has no behavioural case — the
  lead, or the next build that touches the obligations.
- design concern 1: with the log out of a library's design, a concept record edit moves no design stamp (deviation 1:
  concepts stay evidence), so a library's narrative, review and baseline do not lapse on it — the lead rules Y2's list
  against S3.14; until then stated here.
- design concern 2: an imported record keeps the author kind of its kept stamp, which goes stale after a write by nobody
  (an upgrade, a merge with no preparers, a tracker), and the SDD counts it as a person's (`provenance.js authorship`,
  `sdd-architecture.js`) — the lead (S0), against contract 33.
- design concern 3: `designOf` treats any line with a truthy `package` as bookkeeping in a design project and subtracts
  one version per line (`review-domain.js`); a hand-edited line can hide a built-in change — restrict to registered ids
  and `packageStep` types, or record the version each line moved: the lead (S0), or wp1 S4+S5.
- design concern 4: the design fingerprint reads built-in records' provenance raw, so each stamp move needs an alias
  table; a fingerprint version that reads no authorship, with its own upgrade (`review-domain.js reviewSource`) — the
  lead, as a later S0 build.
- design concern 5: a project imported before this build keeps the date reading until its next import (`datedImport`), a
  long-lived second path with no upgrade retiring it — the lead (an upgrade that moves its stamps aside on read, with
  its own case), or recorded as accepted.
- limit of must-fix 4: a step its records do not keep writes no line: an earlier crosswalk review a later one replaced, a
  confirmation whose stamp a later edit replaced, a step an import moved aside (`readings-upgrade.js packageSteps`) —
  recorded; no owner needed unless the lead wants the activity rows read server-side.
- limit of must-fix 2 (known limit 6 a, b): an imported document of an earlier readings definition loses the import's
  aliases at its conversion; what the import's other steps change of the design stays stale as on `4349bb6` — the lead.
- a re-confirmation of a record that came confirmed stamps nothing (above, I8) — the lead (S0's settle) or wp2.

### Fix-up: what the code does now, readings for later builds

- `neutraliseImportedAuthority` moves the record stamps first (`keepingDesignStamps(p, keepImportedStamps)`), then an
  adoption's acceptance aside with the other steps. The stamps of the whole design are taken of the document as a read
  gives it (with its read upgrades when no readings upgrade is due), so a stamp of the origin's read is matched. The
  restore names the project 'imported' (`workspace.template`), and gives it its id and name, before the import's steps;
  the design source reads all three, so a stamp of the whole design (a check, a narrative, a baseline's design stamp)
  goes stale at a restore through `/api/recovery` there and here alike, while each chapter's stamp is carried (I9 and
  `test:recovery-size`: "Review narrative, traceability, findings, or delivery plan" on both commits).
- `finalReview.readingsUpgrade` may hold `evidence: {now: then}`; `baselineChanges` reads it. A later upgrade that
  rewrites the table keeps or chains it (`toDesignFingerprint` keeps it; `carry` chains it).
- A document with the knowledge package's records and no line naming the package is upgraded at its read
  (`needsReadingsUpgrade`); the server stores it with the readings upgrade (J8's known limit: whichever request first
  stores the row).

### Fix-up: suites and measurements

Every run with `env -u ANTHROPIC_BASE_URL -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN -u OPENAI_API_KEY`, two at a time
(`.aiw-local/run-suites.sh`), on the fix-up's final code; no server started on a port (the suites use the in-process
Worker).
- This build's: `test:rc44-s0-b10` 8/8 (B10.8 new), `test:rc44-s0-import` 11/11 (I8 to I11 new).
- `test:rc44-wp1-knowledge` (all of it): 87 passed, 2 pending, 0 failed (S2.12 and S3.10 pass on this run).
- `test:rc44-s0-extensions`: 35 of 36 blocks; only "O1 the bookings add up" fails, by unbooked route bytes (AA2: book
  nothing; retired by `s0-w3-bundle`).
- `test:rc44-wp2-adoption`: all but "size" and "S5 size"; `test:rc44-wp9a-deployment`: 24 of 25 but S1.10. Each fails by
  exactly the unbooked bytes of this build and its fix-up, 727 B (583 + 144: wp2 1052 - 325 and 1916 - 1189, wp9a
  1069 - 342), as on `c72a0a2` by 583 B; they pass on `4349bb6` (the build's run there).
- `test:recovery-size`: green (its two assertions replaced, above; timings inside their bounds).
- Green, importing or exercising the changed files: recovery-authority, rc42-g2-library, provenance, review-plan,
  sdd-architecture, fingerprint, rc42-g3c-evidence-fingerprint, evidence, knowledge-boundaries, ui-modules,
  repository-transfer, knowledge-design, knowledge-structure, knowledge-repository, knowledge-coverage, repository-sync,
  hosted-knowledge, candidate-import, seeded-proposals, journal-archive, architecture-obligation,
  architecture-verification, sdd-content, sdd-modules, sol-sdd, workspace, model-alternatives, design-records,
  action-undo, changes, brain, rc42-g3a-risk-and-limits, rc42-g3b-trace-and-delivery, intake, service-routes,
  local-accounts, drafter-groups.
- Not run: the browser suites (they start servers on ports the OS chooses, outside 4100-4999; the lead's browser run
  closes the wave), the full regression (the lead's), and the suites of the build's list not named above (not touched
  by the fix-up's changes beyond those named).
- `node check-syntax.mjs`: 947 modules, passed. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.

`node build.mjs` (same env), `dist/client-size-report.json`; before is the fix-up's start commit `c72a0a2` (built in a
`git archive` of it under `.aiw-local/head`), after is this branch; the start of the build, `4349bb6`, as measured by the
build:

| | `4349bb6` | `c72a0a2` (before) | this branch (after) | cap |
|---|---|---|---|---|
| routes.chapters.code | 3,228,938 B | 3,229,521 B | 3,229,665 B (+144 B on `c72a0a2`, +727 B on `4349bb6`, booked nowhere: AA2) | 3,233,792 B now; 3,266,560 B once `s0-lead-w3` lands |
| routes.projects.code | 508,466 B | 508,721 B | 508,792 B | 1,242,112 B |
| script files | 148 | 148 | 148 | 148 |
| buckets (under 10 KB, 10 to 50 KB, over 50 KB) | 52, 51, 45 | 52, 51, 45 | 52, 51, 45 | under 10 KB at most 52 |
| violations | none | none | none | |
| opens with records (`p10-knowledge`, `opensWithRecords` on `dist/client-metafile.json`) | 3,376,253 B | route + 146,691 B in 2 scripts = 3,376,212 B | route + 146,691 B in 2 scripts = 3,376,356 B | |

Where the +144 B are: `baselineChanges`' evidence alias (`review-domain.js`) and `recordProvenance`'s reading of the
draft mark on an imported record (`provenance.js`). The carry-over, the package lines and the import's moves are in no
client chunk (`readings-upgrade.js` and `recovery-service.js` are server-only). No stylesheet rule was added.
