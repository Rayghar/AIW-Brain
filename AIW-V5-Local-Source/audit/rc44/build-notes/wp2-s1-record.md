# rc44 wp2 slice S1: the adoption record, its readers and the upgrade — build notes

First build: branch `rc44/wp2-s1-record` (head `13a72c2`), from `8e8240e`. Fix-up: `rc44/wp2-s1-record-fix`, continued on
`rc44/wp2-s1-record-fix-c2` after a session was cut off, merged with `rc44/integration` (`9673661`: the final S0, wp1
S1, the rulings to section J). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S1 under g, e.3).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages", and "With wp2 S1" for the rows this
fix-up added). Rulings: `audit/rc44/RULINGS-2026-11-18.md`, sections A, D, F, H and J.
`productionAccepted` stays false. No external authority is impersonated: nothing here approves, releases or accepts
anything for a person.

## Fix-up (after the adversarial review; rulings of 2026-11-19, section J)

Review: `/home/user/hb-review/rc44-build/wp2-s1-record.review.json` (five must-fix, thirteen should-fix, ten design
concerns). Every case for a change of behaviour was written first and seen to fail on the head it was written on.
Two hold behaviour that was already there and passed when written: block "browser load", and in block "J3 design
statement" the checks that stay current after a deviation.

### State

- **Done:** items 0 to 5 of the fix-up, each line below. The slice's suite has 20 blocks, S0's suite 24.
- **In progress:** nothing.
- **Next (for the lead):** the points under "Where I went further than a ruling, or read it narrowly" and "Open
  questions"; then the merge.

### One line per item

| Item | State | Where it is held |
|---|---|---|
| 0. Merge `rc44/integration` | done (`a2403ab` at `b59bc88`, no conflict; again `21f5e5c` at `9673661`, which adds section J and the merge evidence and no product file). On the merged head before any change: `rc44-wp1-knowledge` 34 passed; `rc44-wp2-adoption` 11 of 12 (the size evidence was counted against S0 before its second round); `rc44-s0-extensions` 13 of 22. | — |
| 1. Ruling J11, S0's suite with real packages | done: 24 of 24 blocks with `p40-adoption` registered. Twelve assertions replaced, each at least as strict; the list old -> new is in S0's notes, section "With wp2 S1". | S0's suite, every block |
| 2. Must-fix 1 / J1, the applier is named | done. The upgrade records who applied the design, read from the journal events the task names, as a history entry (`event: 'apply'`, `identity: 'journal'`); a design applied on this build is named by the tracker in the next commit and read live from the journal until then. The projection names the applier, every other actor those events name, and the owner. Where the journal names nobody, a person confirms first (F4). | block "J1 applier" (A applies, B confirms: A is refused by the one rule, B by the two-persons rule, C is taken), "accept", "storage upgrade" |
| 2. Must-fix 2 / J2, a relation only between objects | done. S0 hands the emitter `has(id)`; the package states `binds`, `scopes`, `addresses` and `assesses` only to an object of the graph. The connected model of the upgraded Bank Payment document has no issue, as before, and its model package validates; the same for a task of another kind whose records include an allocation. | block "J2 connected model"; S0 "J2 emitter has" |
| 2. Must-fix 3 / J3, what of a record is design | done. S0's row `design {adoptions: adoptionDesign}`: no `history`, `review`, `confirmed` or `provenance`, and nothing the earlier design task still says, under one rule for every revision. The upgrade, a confirmation and an acceptance move no design stamp at any revision; a baseline frozen before the upgrade reads no change; a deviation is a change. `review-domain.js` names the key nowhere. | block "J3 design statement" (with a baseline actually frozen); S0 "J3 design statement"; `assertStepsMoveNoStamp` |
| 2. Must-fix 4 / J4, current only if its knowledge is | done. The receipts a definition pins are read with `claimReceiptCurrent` and `withdrawn`; a deactivated release reads `withdrawn`, raises `adoption-definition-withdrawn` (error), refuses acceptance, ends a standing acceptance and is flagged by the tracker. A released design concern is upgraded under its own skeleton and kind (`concern`). A candidate claim on the same subject moves no reading. | block "J4 knowledge" |
| 2. Must-fix 5 / J5, the tracker is journalled | done. One change event for each change the tracker opens or adds to and for each reversal, with the adoption as its source; the server stamps who sent the commit. | blocks "J5 journal" (a bound record, the driver, the decision, a reviewed batch, a merged alternative, a reversal), "tracker", "held back" |
| 2. J10, the minted prefix | done. S0's row `prefixes {pattern: 'ADP'}`, read by the clash check; `WORKBENCH_PREFIXES` holds no package's prefix. | "registration"; S0 "SF start check", "7", "D3" |
| 3. J6, no second truth | done. `adoption.obligation` and `adoption.withdraw` are no commands of this build; `adoption.accept` is refused while `design-source:<task>` stands as an error and is taken after `architecture.refresh`. The reader holds it too (my addition, below). The retirement list is below. | blocks "registration", "accept", "deviation", "held back", "J6 basis after acceptance" |
| 3. J7, no finding before the step can be taken | done. No `adoption-acceptance` finding; the reading states the standing and what must happen next in a reader's words. An upgraded old document whose applied designs' records all stand gains no finding (corrected by the lead after the verifier: one whose applied design lost a bound record gains `adoption-role-broken`, an error, at the upgrade, and its findings, readiness and registers move). | blocks "e3 rules", "accept", "template copy" |
| 3. J8, an upgrade is stored by a read | done for commands, as ruled: 409 with a reload, nothing stored; the read stores the upgrade with its recovery point. Every other save: the lead's ruling K1 (below, "Lead follow-up"). | block "storage upgrade"; S0 block "2 command boundary" (a synthetic upgrade) |
| 3. J9, the SDD's count | done: a line and a column of their own, only in a document that holds such a record; in the suite's fixture 61 by a person before and after, 3 by an upgrade. | block "J9 SDD provenance"; S0 "D5 SDD provenance" |
| 4. Should-fix 1, the owner | done: the projection carries `owner`; the one rule refuses the owner. | "J1 applier" |
| 4. Should-fix 2, two re-read steps | done as J6 rules: the reading carries the earlier path's basis state, accept is refused while it stands. | "accept", "tracker", "J6 basis after acceptance" |
| 4. Should-fix 3, `adoption.obligation` | done: held back to S2. | "registration", "deviation" |
| 4. Should-fix 4, `adoption.withdraw` | done: held back to S3, so a withdrawn adoption whose design can still be reversed cannot arise. | "held back" |
| 4. Should-fix 5, e.3 rule 4 for a command | done (J8). | "storage upgrade" |
| 4. Should-fix 6, suite gaps | done: the applier; a baseline frozen before the upgrade; documents with tasks in flight, proposed, set aside or reversed (read as a process without the package reads them); the tracker on a contract, a data definition and a need, in a reviewed batch and through a merged alternative; the connected model's issues; the SDD's counts. | "J1", "J3", "old documents", "J5", "J2", "J9" |
| 4. Should-fix 7, unstamped records | done (J9). | "J9 SDD provenance" |
| 4. Should-fix 8, a bound record's type | done: the type the record graph gives it; a record the graph keeps as a relation is no role; a record that left keeps the type of its chapter and reads as a broken role. | "J2 connected model", "upgrade" |
| 4. Should-fix 9, a mechanism that no longer stands | done: a reversed adoption stays one object of the graph with what it addressed and scoped, on no trail, as a task set aside before the upgrade is. | "held back", "J5 journal" |
| 4. Should-fix 10, a lost pointer | done: a task whose `adoptionId` names no adoption of its own is linked again or upgraded again. | "upgrade" |
| 4. Should-fix 11, a reader's words | done: no finding, reading or refusal of the package names a command type. | "tracker", "e3 rules", "accept" |
| 4. Should-fix 12, the upgrade and the browser | done: see "Which code the browser holds" below. In a process that holds what the browser holds, the package registers without an upgrade step and the upgraded document reads as the server reads it. | "registration", "size", "browser load" |
| 4. Should-fix 13, notes | done: "Corrections to the first build's notes" below. | — |
| J12, the chapter | done: an adoption is counted under Chapter 3, the chapter of its object type (provenance, the SDD's table, the journal event's source). | "registration", "trace", "J9" |
| 5. Notes | done: this section; S0's contract text. | — |

### Where I went further than a ruling, or read it narrowly

1. **J6, further: the reader holds it too.** As ruled, the accept step was refused while the earlier path's finding
   stood. But an adoption accepted earlier went on reading "applied · accepted by …" while `design-source:<task>` (an
   error) stood, whenever a source changed that the tracker does not watch by id (another driver, another decision,
   the knowledge stamp). Now `adoptionAccepted` is false while that finding stands, and an acceptance given before
   `architecture.refresh` re-read the design (the task's `sourceReview.at`) does not stand again: a second person
   accepts the design as re-read. This is stricter than ruled. Case: "J6 basis after acceptance", seen to fail
   (`true !== false`).
2. **J8, as ruled and no further: commands** (closed by the lead's ruling K1; see "Lead follow-up"). A writing route that is not a command still stored a due package
   upgrade with its own write (no tab left open is needed: the Projects page sends a rename or an archive without reading the project), as it stores the built-in read upgrades. Probed on `/api/lifecycle`: a rename sent at
   the stored revision of a row whose upgrade is due answers 200 and stores the three adoptions, with no recovery
   point and no storage-upgrade row in the activity. By the code the same holds wherever a route reads with
   `withFinalReview` and saves: `intake-service.js`, `drafting-service.js`, `baseline-service.js`,
   `collaboration-service.js`, `operation-service.js` and `organization-service.js`. I did not close it: the one place
   for all routes is the one writer (`project-storage.js` `saveStoredProject`, told by `readStoredProject` that an
   upgrade was due), and a blanket rule there also refuses writes that store no upgrade and come before the read
   (the browser applies repository notices with a POST just before it reads a project; a project that names a missing
   package is renamed as stored). It needs a decision per route and the browser suites, which I cannot run here.
   **I think the ruling's headline ("stored by a read") asks for it; the lead should decide.**
3. **J8, read narrowly: a command that makes an upgrade due is not refused.** `alternative.apply` on this build
   writes the adoption in its own commit (the step runs where the commit's document is read). The row was up to date
   when the command arrived, and the commit is a design change with its journal. Refusing it would put a storage
   upgrade after every applied design.
4. **J3, one edit of `reviewSource` stays.** The key's name is gone. What stays is that a guided task is read without
   `adoptionId`, the pointer the upgrade adds, because `guidedDesign` reads the task whole. S0's `design` row cannot
   say it: a statement on a key the workbench writes is refused at start, rightly. The alternative is no pointer on
   the task and a lookup in the built-in emitter, which costs more on the route. It goes with the task readers (S6).
5. **J7, read narrowly: `adoption-deviation-unreviewed` stays a warning.** It can arise only after a person recorded a
   deviation through the command, so no upgraded old document gains it. I kept it because a recorded deviation that
   nobody reviewed is something a reader of the review must see. If the lead reads J7 as "no finding of the package
   that only `adoption.accept` clears before S3", it is one line to hold back.
6. **J12, the findings stay with Chapter 5's checks.** The ruling says "counted". The findings are about bound
   components, and Chapter 5 is where a reader fixes them; their `objectId` is the adoption.
7. **J1, where the journal names more than one actor** for one apply, nobody is recorded as the applier, each of them
   is refused by the one rule (read from the journal at every reading), and a person confirms first.
8. **J4, further: a definition this build cannot identify is never read as current.** A receipt that names a method
   this build does not author (and no released concern) was upgraded as a built-in and read `current`, because its
   source revisions still matched. It is now upgraded under the id its receipt carries with the authority
   `unrecognised`, and reads `not-evaluated` in words. It raises no finding (an old document gains none) and does not
   refuse an acceptance: the second person accepts the record as it reads, and the reading says what was not
   evaluated. If the lead wants acceptance refused for it, it is one line. Case: block "upgrade", seen to fail.

### Replaced assertions, old -> new (`rc44-wp2-adoption-cases/record.mjs`; the suite does not exist on `94dbd4f`)

Each is recorded in the code beside the assertion ("was: …"). No assertion of a suite that exists on `94dbd4f` was
changed.

1. l.74, "registration": five steps stated -> exactly three, and `adoption.obligation` and `adoption.withdraw` are
   unknown commands of this build (J6).
2. l.78, "registration", and l.251, "trace": the provenance reader counts adoptions under Chapter 5 -> Chapter 3 (J12).
3. l.83, "registration": no module of the package names a knowledge store in its source -> the package reads released
   knowledge through the one existing rule and no store of its own, and the behaviour is held in "J4 knowledge" (J4).
4. l.205, "e3 rules": each upgraded adoption raises `adoption-acceptance` (warning) and nothing else -> an upgraded old
   document gains no finding of the package and no other finding, and the reading states the standing (J7).
5. l.225, "e3 rules": the upgrade moves graph, model, trails, findings, readiness, provenance, registers, sdd -> graph,
   model, trails, provenance, sdd (stricter: fewer readings move).
6. l.307, "accept": B's first accept is refused with "names no author" -> refused with "A second person's step needs
   two persons" (the applier is named, so the one rule passes B and the two-persons rule asks for a person behind the
   record).
7. l.310, "accept": the next step matched `adoption.reassess` -> it names no command type and says the earlier design
   is reviewed first (should-fix 11, J6).
8. l.321 and l.412, "accept" and "template copy": the projection without `owner` -> with `owner` (should-fix 1).
9. l.372 and l.431, "deviation" and "tracker": `adoption-acceptance` beside the other warning -> the other warning
   alone (J7).
10. l.381, "deviation": the save left out is `adoption.obligation` -> the save left out is a confirmation of a record
    whose applier is named (J6 holds the obligation step back).
11. l.410, "template copy": the finding `adoption-acceptance` is back in the copy -> the reading says who must act, and
    no finding of the package is raised (J7).
12. l.453, "tracker": the marker alone -> the marker and a journal event that names the adoption with who sent the
    commit (J5; stricter).
13. l.489, "held back" (was block "withdraw"): `adoption.withdraw` marks the adoption withdrawn and its task dismissed
    -> the step is no command of this build, and the obligations stand where the earlier path keeps them (J6).
14. l.631, "J4 knowledge": the hand-written acceptance was dated before the fixture's apply -> dated after it, and the
    earlier date is held as not standing.
15. "size": the evidence was counted against S0's own figure -> against the integrated base, with the bytes of J2, J3
    and J10 on the route included.

### No second truth: each earlier step and reader, and the slice that retires it (ruling J6)

| Earlier step or reader | What it still does beside the adoption | Retired or moved in |
|---|---|---|
| `alternative.apply` of a guided design (`model-alternatives.js`) | writes the applied solution on the task; the upgrade step writes the adoption in the same commit | S2 writes adoptions of its own (`adoption.apply`, a signed-in `applied.actor`); S3 deletes the handler for design tasks |
| `alternative.rollback` and `previewReversal` (`model-reversal.js`) | reverses the design and marks the task; the tracker takes the adoption with it (`reversed`), journalled | S3, with `adoption.withdraw`: until then the applied standing is kept by the task, the model alternative and the adoption, and only the earlier path moves it |
| `architecture.refresh` (a typed reviewer name) | re-reads a design's sources and clears `design-source:<task>`; `adoption.accept` waits for it | S3 for a task with an adoption: the basis becomes the adoption's own reading, and the `sourceReview` clause of `adoptionAccepted` goes with it |
| `designTaskFindings` `design-source:<task id>` (`design-task-state.js`) | the error for a design whose sources changed | S6: the adoption raises it under the same id, or a recorded treatment is lost |
| `architectureSolutionsFor`, `acceptedObligation`, `architectureObligationsFor`, the obligation basis | the one place an obligation's standing is read; the adoption holds a verbatim copy of the obligations and reads their state from that reader | S2, when the first adoption without a task exists, and `adoption.obligation` with them; S6 at the latest |
| The built-in emitter of design tasks (`record-graph.js`) | skips a task that has an adoption; still emits a task without one | S6 |
| `reviewSource` `guidedDesign` | says to the fingerprint what the task says; the adoption's statement leaves that out; the task is read without `adoptionId` | S6 |
| A project copied from a template (`instantiateTemplate` deletes the tasks) | the copy carries the adoption without its task: the adoption lists its obligations as open while `architectureObligationsFor` answers no row. A copy made from a template whose stored row no read of this build has upgraded yet carries no adoption at all (the copy is made from the row as stored) | S2, with the obligation readers; the lead says whether a copy carries adoptions once it does not carry tasks |
| The task's method receipt, refreshed by `architecture.refresh` | the adoption pins the receipt as applied; its currency is read from the receipts the adoption holds | S3 |
| `architecture.measure` | quantitative evidence on the task | wp3 and wp6 (design e.1) |

### What S2 and S3 inherit

**S2 (the definition contract, `adoption.start` to `adoption.apply`):**
1. `adoption.apply` puts the signed-in applier on `applied.actor` and an `apply` history entry with no `identity`:
   the projection reads both already, and counts the covered saves from the last such entry.
2. `adoption.obligation` comes with the obligation readers. The projection then also names whoever discharged an
   obligation (ruling J12: the discharge moves the revision, so the acceptance covers it). Add `'obligation'` to
   `COVERED` in `adoption-domain.js` and a case for it.
3. A step that changes what an adoption says moves `revision` and sets `confirmed` false (`changed()`).
4. `adoptionDesign` says everything but the bookkeeping for an adoption with no task beside it. A new key that is
   bookkeeping must be left out there; `assertStepsMoveNoStamp` catches one that is not. While its task stands, an
   upgraded adoption's bindings, facts, parameters, obligations, owner, title, definition and scope are left out of
   the design statement too (the task says them). A step of S2 that changes one of them on such a record must reach
   the design statement: S2 adds the counterpart of `assertStepsMoveNoStamp`, a case that such a change moves the
   design stamp.
5. Every relation the emitter states asks `has(id)` first.
6. `definitionOf` reads released knowledge from `definition.receipt.governedConcern.receipt` and
   `legacy.governedKnowledge`. A definition S2 builds from a released claim puts its claim receipt where that reader
   finds it, or extends the reader, with a case that a withdrawn claim reads `withdrawn`.
7. `adoption-contraindicated` is the `hard` finding (ruling A1). Preconditions, relationships, parameters with units,
   companions and cross rules are not evaluated in S1.
8. The upgrade writes no more than the tasks give; `ADOPTION_LIMITS.records` (60) is for S2's `adoption.start` to hold.
9. A list named `evidence` on the record is emptied by a template copy; S4 names its rows otherwise.
10. Route: wp2 has used 316 B of 600 B. 284 B are left for S2 to S6.

**S3 (the surface and the retirement of the eight paths):**
1. When the surface offers the two steps, the warning "not accepted by a second person" is raised (J7): the reading
   already holds the standing and the words (`acceptance.next`).
2. `adoption.withdraw` moves all three places of the applied standing in one commit, or refuses (should-fix 4).
3. `architecture.refresh` is retired for a task with an adoption; `adoption.reassess` then recomputes the basis, and
   `design-source:<task id>` is carried under the same id (S6).
4. The chapter's "N records" count (ruling A6): adoptions are counted under Chapter 3 by the provenance reader now;
   the chapter page that lists them should count them there.
5. The browser reads the record with `adoption-domain.js` only. If a surface needs a definition's skeleton, it comes
   from the record's snapshot, not from `adoption-builtins.js` (a server module).

### Which code the browser holds (should-fix 12, ruling J12)

The lazy entry rooted at `public/architecture-task-ui.js` holds `adoption-domain.js` (the readers, the three steps,
the tracker) and `adoption-package.js` (the registration). It does not hold `adoption-upgrade.js`,
`adoption-builtins.js` or `adoption-definitions.js`: **the browser reads no old document with the upgrade.** Every
document it draws was read by the server, which stores the upgrade at that read. `adoption-server.js` adds the
`upgrade` to the registered package on the server. Block "browser load" holds the browser's side in a process without
`worker.js`: the route stub alone asks for the lazy entry for a document with adoptions; until the entry has arrived
no reader knows the adoption (which is why the project store loads it before the first draw); once it has, the
package is registered with every row but `upgrade` and `upgradeNote`, and the ten readings of the upgraded document
equal the server's. No browser suite was run for the slice: the browser suites of the comparison tools are red on
this machine at the baseline.

### Measurements (`audit/rc44/evidence/wp2-s1-size.json`; `node build.mjs`, `dist/client-size-report.json`)

| | Integrated base (`rc44/integration`) | This slice after the fix-up |
|---|---|---|
| Chapters route (`routes.chapters.code`) | 3,229,840 B | 3,230,156 B (**+316 B** of wp2's 600 B; cap 3,233,792 B unchanged; 3,636 B left) |
| Projects route | 506,829 B | 507,069 B (+240 B) |
| Script files | 148 | 148 |
| Files under 10 KB | 53 | 53 |
| Stylesheet | 901,873 B | 901,873 B |
| **Opens with records** (ruling D10) | 3,308,964 B as S0 measured it (79,189 B beside the route, 2 scripts) | **3,325,174 B** (95,018 B beside the route, 2 scripts); the first build measured 3,327,437 B (97,372 B), with the upgrade in the browser's entry |

The base figure is the lead's (`audit/rc44/evidence/merge-s0-wp1-2026-11-19.json`: 3,229,840 B). The 316 B hold the
route stub and the first use of `registerExtension` on the route, the emitter's skip of a task that has an adoption,
`has(id)` for the emitter (J2), the loop that reads a package's `design` statement in `reviewSource` (J3) and the task
read without `adoptionId`. They were not measured piece by piece. J10, J8 and J9 are server code. The first build
measured 304 B against S0 before its second round. No gate was changed.

### Suites run on the fix-up's head

- `test:rc44-wp2-adoption`: 20 blocks, green. `test:rc44-s0-extensions`: 24 blocks, green. `test:rc44-wp1-knowledge`:
  34 cases passed, 4 pending for slices not built yet.
- 69 related suites (those of the first build, of the review, and every suite that combines object storage with
  applied design tasks): 63 passed. Six are red, each with the same assertion at the same line when run on an archive
  of the baseline commit `94dbd4f` on this machine, and each on the baseline-red list
  (`audit/rc42/regression-2026-11-16.json`): `design-concern` (l.119), `command-equivalence` (l.60), `intelligence`
  (l.242), `architecture-ui` (l.36), `composition-ui` (l.37), `security-task-ui` (l.52).
- `node check-syntax.mjs`: passes. `node scripts/lint.mjs --summary`: 162 problems, the baseline's 162, 0 new.
  `node build.mjs`: every gate passes.
- Not run: the full regression (the lead's) and the browser suites.

### Corrections to the first build's notes (should-fix 13)

- The first build listed nine S0 blocks that failed "because a package exists". Two more assertions were hidden behind
  earlier failures in the same blocks: "ADP is free" (block "SF start check") and the `designKeys` probe that named
  `adoptions` (block "D3 workbench keys"). Both failed because of how the package was built, not because a package
  exists. Rulings J10 and J3 gave the rows that settle them.
- The first build held e.3 rule 2 for a frozen baseline only indirectly (the review cites the fixture's blockers as
  the reason it gave; I did not find that sentence in the notes as committed). A working-draft freeze needs only
  current checks; the suite now freezes a baseline before the upgrade (block "J3 design statement").
- The base of the first build was `8e8240e`, not `72204ff` as its task text said: ruling F3's helper exists only from
  there.

### Open questions (for the lead)

1. J8 for the writing routes that are not commands (point 2 above).
2. Whether `adoption-deviation-unreviewed` waits for S3 too (point 5 above).
3. Route: 284 B are left of wp2's 600 B. The design's later rows (`component-library.js` about 120 B,
   `normaliseOption` 40 B, `design-questions.js` 60 B, `design-task-state.js` 30 B, `model-reversal.js` 40 B) fit only
   if S3 and S6 take the legacy builders off the route first, as the design expects.
4. The sentence of the two refusals on an accept step is the shared one ("verifies it", "wrote ADP-001"); ruling A5
   leaves it to wp9b.

## The slice as it now stands

### What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/adoption-domain.js` | server; the browser's lazy entry | `adoptionRecords`, `adoption`, `adoptionReading`, `adoptionFindings`, `journalApplier`, `acceptanceSubject` (the projection), `adoptionAccepted` (the reader), `adoptionDesign` (what a record says to the design fingerprint), `emitAdoptions`, `applyAdoptionCommand` (three steps), `trackAdoptionChange`, `ADOPTION_LIMITS` |
| `public/adoption-package.js` | server; the browser's lazy entry | the one `registerExtension({id: 'p40-adoption', …})` |
| `adoption-server.js` | server | adds `upgrade` and `upgradeNote` to the registered package; the line of `design-packages.js` |
| `public/adoption-upgrade.js` | server | `needsAdoptionUpgrade`, `upgradeAdoptions` (design e.3) |
| `public/adoption-builtins.js` | server | `BUILTIN_DEFINITIONS` (twelve skeletons by method id), `builtinFromReceipt`, `receiptDefinition` (a released design concern), `builtinOfKind` |
| `public/adoption-definitions.js` | server | the definition shape, `definitionIssues`, `DEFINITION_KINDS` (with `concern`) |
| `public/design-package-routes.js` | route | the stub `p40-adoption-route` (`needs: p => p.adoptions`, `load`: the lazy entry) |
| `public/architecture-task-ui.js` | lazy entry | one import: the entry that holds the package (ruling D7.6) |
| `rc44-wp2-adoption-validate.mjs`, `rc44-wp2-adoption-cases/record.mjs`, `rc44-wp2-fixtures.mjs`, `rc44-wp2-adoption-baseline.json` | suite | runner, S1's cases, fixtures, the goldens of the references |
| `audit/rc44/evidence/wp2-s1-size.json` | evidence | the route measurement with "opens with records" |

Registration rows: `prefixes` (`{pattern: 'ADP'}`), `records` (type `pattern`, from the package's own collection),
`layers` and `hops` (each states `only`; both are context), `checks` (with Chapter 5's), `commands`
(`adoption.reassess` and `adoption.deviation` a person's, `adoption.accept` a second person's), `track`, `provenance`
(noun, paths, records under Chapter 3), `design` (`{adoptions: adoptionDesign}`), and on the server `upgrade` and
`upgradeNote`. Needs and load are the stub's.

Edits of built-in code, each commented "rc44, wp2" or with its ruling:
1. `public/record-graph.js`: the built-in emitter skips a task that has `adoptionId`; the one emitter hands a package
   `has(id)` (J2, S0's row).
2. `public/review-domain.js` `reviewSource`: a task is read without its `adoptionId`; a package's `design` statement is
   read in place of its raw key (J3, S0's row).
3. `public/architecture-task-ui.js`: the import above.
4. `public/sdd-architecture.js`: the count of records an upgrade or a merge wrote (J9).
5. `worker.js`, `design-extension-boundary.js`: the reload for a command on a row whose package upgrade is due (J8).
6. `public/design-extension-parts.js`: the start checks and the clash checks of `prefixes` and `design` (J10, J3).

### The record

`p.adoptions = {schemaVersion: 1, definition: 1, counter, version, records}`, created when first written. A record:
`id` (`ADP-nnn`), `ref`, `revision`, `status` (`applied`, `reversed`; `draft`, `prepared`, `withdrawn`, `superseded`
come with later slices), `origin`, `kind`, `title`, `owner`, `scope`, `definition {definitionId, version, optionId,
groupId, authority, receipt, snapshot, snapshotHash}`, `facts`, `bindings`, `parameters`, `obligations`, `decisionId`,
`deviations`, `applied`, `review` (the acceptance), `confirmed`, `legacy`, `history`.

- **History** entries are `{n, at, event, actor, revision, note?, causes?, changeId?, identity?}`; `n` counts up for
  good. Events: `upgrade`, `apply` (with `identity: 'journal'` when the journal named the applier), `reassess`,
  `accept`, `deviation`, `changed` (the tracker's, with the journal event's id), `reverse`. The entries the projection
  and the tracker read are never trimmed; the others keep their last 30. The history is bookkeeping to the authorship
  stamps and to the design fingerprint alike.
- **Steps** (each refuses a stale `revision` with "This adoption changed. Reopen it; your input is retained.", and a
  record that is not `applied`): `adoption.reassess` (confirms; no revision), `adoption.accept` (writes `review`; no
  revision), `adoption.deviation` (add, or withdraw with a reason; revision).
- **Findings** (with Chapter 5's, id `<code>:<adoption id>`, `objectId` the adoption): `adoption-role-broken` (error),
  `adoption-role-missing` (error), `adoption-definition-withdrawn` (error), `adoption-basis` (warning),
  `adoption-deviation-unreviewed` (warning). None is marked `hard` in S1.
- **The definition's standing** (`definition.state`): `current`; `interpretation-changed` (a built-in whose
  interpretation moved); `withdrawn` (the released knowledge it pins is no longer current: an error, and no
  acceptance); `not-evaluated` (a method this build does not author). `definition.authority` is `built-in`,
  `released` or `unrecognised`.
- **The reading** (`adoptionReading`): `label`, `accepted`, `definition {state, reasons}`, `basis {state, findingId}`
  (the earlier path's finding for the same design), `roles`, `parameters`, `obligations` (their state from the one
  obligation reader), `deviations`, `acceptance {accepted, by, at, next}`, `changed`, `bounds`, `findings`.

### The second person (rulings D1, D7.1, F3, F4, A5, J1, J6)

- **No check of the package's own.** `adoption.accept` is a `second` type. Its function answers the projection
  `acceptanceSubject(a, p)` = `{id, actor, owner, history: [{revision, actor}]}`: `actor` is the signed-in applier
  (on the record, named by the journal, or read from the journal now), or, where nobody is named, the person who first
  confirmed the record here; `history` names once each everyone the journal names for the apply, and since the last
  apply who confirmed in the applier's place and who changed facts, bindings, parameters or deviations.
- **Left out of the projection** (design c.1; ruling D7.1): a confirmation of a record whose applier is named. Cases:
  *left in* — C adds a deviation and is refused whoever confirms afterwards; *left out* — B confirms a record A
  applied and C deviated, is not named, and accepts.
- **At read time** `adoptionAccepted(p, a)` requires a person's stored step, of the record's revision and its active
  deviations, taken in this project, with nothing changed or reassessed since, of a definition whose knowledge is
  current, with no finding of the earlier path standing for the same design and no source review of that design after
  it, and independent by `verifierRefusal` on the same projection. A status written by hand does not count.
- **Kept under `review`** (F3): `{actor, at, account, revision, seq, note, deviationIds}`. The stored status stays
  `applied`; "accepted" is read, never stored. `assertTemplateCopyClearsSteps` passes; in a copy the adoption reads
  "applied in another project · not applied or accepted in this project".
- **Ruling F4 — the person-only step that confirms a record no person has stood behind: `adoption.reassess`.** An
  upgraded adoption carries no author stamp, so the boundary's two-persons rule refuses an accept until a signed-in
  person has read it against the model and confirmed it. The same path serves a record a template copy carries.

### The upgrade (design e.3) and what it moves

`upgradeAdoptions(p)` answers `p` itself when no task stands as applied without an adoption of its own. Otherwise, for
each such task, one adoption as e.3 lists (asserted field by field in block "upgrade"): origin `upgrade`, status
`applied`, no acceptance, no author stamp; `legacy` verbatim; the definition from the built-in its receipt names, or
the released design concern it pins, with a snapshot of what the project used; bindings from the placement (for a task
of another kind, from its applied records, typed by the record graph); facts, parameters (`unit: ''`, `migrated:
true`), obligations verbatim with their ids; `applied` verbatim; the applier where the journal names one.

**What it moves** (block "e3 rules", on the Bank Payment reference with three applied tasks): of the ten readings of
`rc44-s0-readings.mjs` it moves `graph`, `model`, `trails` (the layer `mechanism`), `provenance` and `sdd` (the count
of who wrote the records). It leaves `findings`, `stamps`, `readiness`, `registers` and `ars` while every record the applied designs bound stands; an applied design that lost a bound record gains `adoption-role-broken` (error) at the upgrade, and then `findings`, `readiness` and `registers` move too. The chain that explains a pair of built-in records (the Matrix, the Model trace, the SDD journey line) does not move: ruling K8. Also unmoved: the
design fingerprint and its version stamp, the evidence fingerprint, every requirement's trace stamp, the design source
a freeze keeps (byte-identical), the whole `finalReview` record, every chapter container, the obligation basis stamp
of a verified action (which stays `current-verified`), the 22 rows of `architectureObligationsFor`, the issues of the
connected model (none) and every built-in layer of every trail and spine.

The five "must not" rules: 1, 2, 3 and 5 in block "e3 rules"; 4 in block "storage upgrade" (a row an older build kept
is stored again at its first read, once, with a recovery point and the step's sentence in the activity, and no event
in the design journal; a command that arrives first is answered with a reload).

### Ruling A6: the chapter's record count, and types for relationships a person draws

- **Types for drawn relationships: not needed, and should stay so.** An adoption's relations are stated by its own
  steps and read from the record. If a drawn link could be typed onto an adoption, a binding could be asserted
  outside its steps. No surface offers an adoption as an end of a drawn relationship.
- **The chapter's "N records" count: not in S1; from S3,** under Chapter 3 (ruling J12).

### Deviations from the design, the task text and the contract

1. **`accepted` is read, not stored.** Design b.1 stores status `accepted`. The contract keeps a second person's step
   under `review`, because any other key is content to the authorship stamps.
2. **No design fingerprint 3 and no conversion of stored stamps.** The upgrade moves no stamp by construction: the
   package states what its records say to the fingerprint (S0's row `design`, ruling J3), and an adoption leaves out
   what its task still says.
3. **The readers of the applied solution are not moved in S1**, and the two steps that would write beside them are
   held back (ruling J6). See the retirement list above.
4. **The tracker's flag is a history entry**, not a key `review {required, since, causes}`: `review` is the acceptance
   (F3). Each flag is also one journal event (J5).
5. **No stored `reading`.** The findings are the package's `checks`, kept per settled document.
6. **`adoption-basis` is a warning**; the earlier path's `design-source:<task id>` stays the error for changed
   sources, and the adoption's reading carries its state.
7. **Both hops are context.** No spine holds the layer, so no governance check reads it.
8. **`adoption.reassess` does not recompute a basis**: the basis is the task's until S3.
9. **The "fails today" case is held on the persistence design**, whose commit obligation rests on its store; the
   outbox's own store is held too (block "held back").
10. **A kind `concern`** beside the design's five (ruling J4): a released design concern compared and applied as a
    guided design; S5 moves such a comparison to `selection.*`.

## Lead follow-up after the verifier (2026-11-20 and 21; branch rc44/wp2-s1-lead)

The verifier (35eeaed) answered not yet: J8 partly fixed, five new problems. The lead closed them, cases first, each
seen to fail before its change (rulings K1 to K9).

| item | what | case |
| --- | --- | --- |
| K1, J8 for every save | The one writer (`project-storage.js` `saveStoredProject`) refuses to store the upgraded document over a row whose package upgrade is due, unless it is the storage upgrade (`keepPrior`); the answer is the browser's conflict (409). A rename, archive or restore stores the row as it was. Seen to fail: `POST /api/operations` stored the adoptions (200). | S0 "2 command boundary"; "storage upgrade" |
| K2, template copy | A template row whose package upgrade is due is copied as the read would store it. Seen to fail: the copy held no adoption. | "template copy" |
| K7, the tracker sees both twins | The tracker compares every record the lifecycle collections hold under a bound id (`recordSays`), so a change of a component's inputs or technology needs, kept only under `realisation.components`, flags the adoption and is journalled. Seen to fail: `false !== true`, acceptance kept standing. | "tracker" (with the task and in a template copy) |
| K8, chains | `tracePath` takes a chain through the built-in layers when one exists; a package's record explains a pair only when nothing else does. Shared helper `assertBuiltInChainsUnchanged` (7,194 chains on the Bank Payment fixture). Seen to fail: OUT-001 to tc-010 ran through ADP-001. | "trace" |
| K9 (a) | `prefixes` refuses an inherited name (`Object.hasOwn`). | S0 J10 case |
| K9 (b) | A status this build does not write reads "not a standing this build reads (…)". | "upgrade" |
| K9 (c) | The upgrade mints no id a record of the document holds; the emitter states no adoption, and no relation, under an id another record holds. | "upgrade" |
| notes | The three passages the verifier named are corrected above (J7 row, "What S2 inherits" 4, "What it moves"). | |
