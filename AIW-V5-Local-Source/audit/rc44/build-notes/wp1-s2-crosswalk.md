# wp1-s2-crosswalk: build notes (slice S2 of design/wp1-knowledge.md, "Crosswalk and one identity")

Branch `rc44/wp1-s2-crosswalk`, from `5cae40a` (wp9a slice 1 after its second fix-up, on `rc44/integration` `a4c1690`).
Binding: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 2, the lead's rulings of 2026-11-18 (main checkout, sections A to
M), the S0 contract (`audit/rc44/build-notes/s0-extensions.md`, "Contract for packages"). `productionAccepted` stays false.
Resumable: read this file and `git log` first. Suite: `npm run test:rc44-wp1-knowledge` (the S2 cases are in
`rc44-wp1-cases-crosswalk.mjs`; `--files ./rc44-wp1-cases-crosswalk.mjs` runs them alone, about two minutes;
`AIW_RC44_WP1_MEASURE=1` makes S2.12 compare the built client with the size evidence exactly).

## State

- **Done:** every item below, each case first and seen red on the start commit (S2.7 is a guard and passed there too).
- **In progress:** nothing.
- **Next:** the lead's review and merge. S3 (pins, currency, release parts of concepts and changes) builds on this.

## What was built, case by case (`rc44-wp1-cases-crosswalk.mjs`)

| Case | What it holds | Red before with |
|---|---|---|
| S2.0 | Ruling I2 (the first item of this slice): the structured unit of an applicability form is read by the number rule against the form's quotes, every text and value of it, at `knowledge.claim` and on every read (`formIssues`, so `formStatus` and every reader) | "The input did not match … architectureUnit.mechanism states the number 7" |
| S2.1 | The design's first case: `resolveConcept(p, 'P-STRANGLER')` is null while the row is proposed, while a document says its own author verified it, while a second person verified it and no release holds it; `PAT-STRANGLER-FIG` (governed) once a release of the concept holds it and is active; null again when the release is deactivated, its parts are changed or the row is retired here. The release's checksum covers its parts. The concept view lists the aliases with their standing | "resolveConcept exists" |
| S2.2 | Migration (ruling J6): `MAPPINGS` is gone from `knowledge-coverage.js`; for each of its 16 catalogue ids `knowledgeConceptCoverage(...).methods` hashes as on the start commit, on a blank project and with the method pack withdrawn; the built-in rows of scheme `aiw-method` name existing options and relate `realises` (never identity); the five style rows read `STYLE_CATALOGUE` and resolve, built-in | "Cannot find module … knowledge-crosswalk.js" |
| S2.3 | The seed: `candidate-sets/crosswalk-seed.json` is `scripts/build-crosswalk-seed.mjs`'s output (`--check`), 13 Playbook rows (10 patterns, 3 anti-patterns), one catalogue record each by exact name, `P-STANDBY` and `P-CHECK-POINTED-SYSTEM` marked, every row `proposed`, nothing verified or promoted; imported into a library as an import through the commands, each row is proposed, stamped imported and resolves nothing | ENOENT (no seed) |
| S2.4 | One identity: a row proposed twice is refused; a second verified `same` row for one alias is refused, a rejection of it is a second person's step and accepted; `narrower`, `broader`, `realises`, `distinct` rows, verified and released, never resolve; the release holds every verified row of its concept and no rejected one | "Choose a supported knowledge action." |
| S2.5 | The second person (rulings D1, D7.1, F4): `knowledge.crosswalk-review` states `second`, the confirmation and the retirement `person`, the proposal neither; the review is refused for the row's author, its last editor, an agent account, a draft by Sol and an import, each in the boundary's or `verifierRefusal`'s words; a row only an import, a draft by Sol or an agent account wrote is refused to a second person until a person confirms it (`knowledge.crosswalk-confirm`), and the person who confirmed it does not then verify it; the stored step is checked again on every read (an agent's account, no account, a changed row, a reviewer who wrote a revision, no reviewer: proposed); a person's edit lapses the review; a draft by Sol proposes rows only (a claimed status or review is refused at the gate, a review, history, actor or revision sent with the row is not stored); a non-person changes no row that was verified here or is in a release | "the review is a second person's step" |
| S2.6 | `targetContent` is the server's: a value sent is ignored on a proposal and an edit; `PAT-CIRCUIT-BREAKER` reads `authored`, `PAT-STRANGLER-FIG` `template`, `PAT-ACTIVE-PASSIVE` `marked`, the stub `ANTI-DUAL-WRITE` `stub`, a target outside the catalogue nothing; each scheme's own check; a library only; an unchanged save writes nothing; a row keeps its alias and its concept | "Choose a supported knowledge action." |
| S2.7 | No module under `public/` reads the `catalogue` name of a Playbook entry: a source scan of the modules that import the Playbook, and the readings of the three references with a trap on the name | (a guard: green on the start commit) |
| S2.8 | Inert: the bank-payment reference holding rows anyway (proposed, verified by their own author, verified in no release, in an inactive release) reads as the same document without them in the 27 readings of S1.10 but the knowledge stamp; nothing resolves; coverage, released claims and findings as they were; trails, chains and finding ids | "Choose a supported knowledge action." |
| S2.9 | Ruling E1 for the package's types: each of the four types, sent by an agent account, a draft by Sol and an import against a reviewed concept and a released one (36 requests), is refused and leaves the concept's standing, forms, releases, checksums and resolution as they were; a proposal (an agent's too) lowers nothing; a person's retirement is saved with its effect | "Choose a supported knowledge action." |
| S2.10 | Old documents and S0's helpers: with `p10-knowledge` registered the three references and the document with a review list read as S0's golden of `94dbd4f`; no crosswalk key and no package named until a row is written; a library that holds rows names `p10-knowledge` (ruling D2); the route stub, the server line and the host import exist; `assertStepsMoveNoStamp` (seen red with the design row taken out: "the design fingerprint reads history of KA-0004"), `assertTemplateCopyClearsSteps`, `assertBuiltInTrailsUnchanged`, `assertBuiltInChainsUnchanged`, `assertFindingIdsUnique`; the package conforms and clashes with nobody | "p10-knowledge is registered" |
| S2.11 | Recovery import: a row's review, in the register and in a release, loses its reviewer (kept as `importedActor`); the recovered project reads the row proposed and resolves nothing | "Choose a supported knowledge action." |
| S2.12 | Size (rulings A4, M4): 118 B of S2's 250 B as `audit/rc44/evidence/wp1-s2-size.json` books it (`ownBytes`), held through `routeBookings`; 148 scripts, no new file under 10 KB, no stylesheet change; "opens with records" | ENOENT (no evidence) |

## Registration through S0 (ruling E5; the task: "a second-person step stated on the command")

S2 needs registration rows, and registers them as package **`p10-knowledge`** through S0's contract; nothing of S0's own
files is edited. The three things a package adds outside its own modules, and nothing else:
- `design-packages.js`: `import './knowledge-package-server.js'; // p10-knowledge`.
- `public/design-package-routes.js`: the route stub `p10-knowledge-route`, `needs: p => p.knowledge?.crosswalk`,
  `load` the knowledge workspace (`knowledge-workspace-ui.js`, the host the design names for wp1's surface, ruling
  D7.6), which imports `public/knowledge-package.js`.
- The suite (the existing `test:rc44-wp1-knowledge`).

What the package states (`public/knowledge-package.js` in the browser and the server; `knowledge-package-server.js`
adds the server's rows to the same object before the start check, as `adoption-server.js` does):
- `commands`: `knowledge.crosswalk` (anyone; sent on its own, not staged), `knowledge.crosswalk-confirm` (`person`),
  `knowledge.crosswalk-review` (`second`, answering the row's projection `{id, actor, history, owner: ''}`),
  `knowledge.crosswalk-retire` (`person`). Each `apply` is `applyCrosswalkCommand`, which runs inside
  `applyKnowledgeCommand` (its copy, counter, history line, history bound and storage bound). The built-in knowledge entry
  answers these types "Choose a supported knowledge action.", so they are free for a package (S0's probe).
- `provenance.paths`: `knowledge.crosswalk` for each of the four types: the boundary stamps who wrote and who confirmed
  each row there, and reads those stamps for the second person's step (D1).
- `design`: `{'knowledge.crosswalk': crosswalkDesign}`: the rows as the design fingerprint reads them, less `history`,
  `review`, `confirmed` and `provenance` (ruling J3).
No `objectTypes`, `records`, `layers`, `hops`, `checks`, `lifecycle`, `track`, `sections`, `upgrade`: a row is no record
of the design model, raises no finding (none is needed before the concept view, ruling J7) and converts nothing.

Person-only and second-person steps, as the contract asks: `person` or `second` is stated on the command and no check is
written by the package (D1, D7.1); the step is kept under the row's key `review` (F3); the person-only step that
confirms a row no person has stood behind is `knowledge.crosswalk-confirm` (F4); the read-time check calls
`verifierRefusal` on the same projection with the stored actor and account kind and requires a person's
(`knowledge-concepts.js crosswalkState`).

## Retirement list (ruling J6)

| Retired | Replaced by | Its readers | Case |
|---|---|---|---|
| `MAPPINGS` in `public/knowledge-coverage.js` (a private table from 11 built-in comparison options to 16 catalogue ids) | the built-in rows of scheme `aiw-method`, relation `realises`, one per catalogue id: `METHOD_CROSSWALK` (`public/knowledge-crosswalk.js`), part of `BUILT_IN_CROSSWALK` (`knowledge-concepts.js`) | `knowledgeConceptCoverage`, its only reader, reads the rows | S2.2 (parity for the 16 ids; the table is gone) |
| The Playbook's `catalogue` name as an unread second identity (`playbook-knowledge.js`) | 13 proposed rows of the seed, `candidate-sets/crosswalk-seed.json`, for a person to send and a second person to verify | none (it had no reader); S2.7 keeps it so | S2.3, S2.7 |
| `STYLE_CATALOGUE` as a private table (`design-reasoning.js`) | the same object, exported: the one definition of the five style rows, which `BUILT_IN_CROSSWALK` reads | `styleAlternative` keeps reading it (the design's temporary adapter, until wp2 moves the style decision onto adoptions) | S2.2 |

Not retired: `PHRASES` (lexical retrieval, not identity), component `patternIds` (wp2's).

## Deviations from the design, and readings of the rulings

1. **The crosswalk is a registered package** (design c and d.3 have its types handled inside `applyConceptCommand`). The
   task and rulings D1 and D7.1 ask for the second person's step stated on the command; S0's `second` is how a step is
   stated, and only a package's type has it. So a library that holds rows names `p10-knowledge` under
   `workspace.packages` (D2) from its first row, before S3's pins (ruling E5 says a design document names it "when a pin
   is first written"; a library is where rows are written, and no design project takes one). The concept register
   itself stays the built-in family's, as E5 says.
2. **A person-only confirmation step, `knowledge.crosswalk-confirm`**, which the design does not have: ruling F4 asks for
   the step that puts a person behind a row an import (the seed), a draft by Sol or an agent account wrote; without it
   D1 would refuse every such row for good.
3. **A row's status is derived, not stored** (design b.1 stores `status`): retired, verified or rejected while the stored
   review stands, proposed otherwise, as S1 derives a concept's state. A status sent by a client is never read (a draft
   by Sol that claims one is refused at the gate).
4. **"Released" for a row is S2's, in `parts.crosswalk`** of a release of forms (design: release parts are S3's,
   knowledge-governance.js `knowledge.release`): the design's own first case needs a released row. The form capability's
   `parts` answers the verified rows of the released concepts; `knowledge.release` stores them before the checksum, only
   when there is one, so every other release is as it was (S1.8's checksums hold). S3 adds `parts.concepts` and
   `parts.changes` beside it, and carries `parts` into organisation releases (`orgContent`): until then a design project
   that pins an organisation release resolves no governed row.
5. **Resolution fails closed further than designed:** a released row resolves only while its release is active and as it
   was made (checksum), its copied review stands, its concept is usable as a whole in that release, and this project's
   register does not hold it retired or rejected; an alias two released rows give two concepts resolves nothing.
6. **`BUILT_IN_CROSSWALK` is assembled in `knowledge-concepts.js`** as designed, from `METHOD_CROSSWALK`
   (`public/knowledge-crosswalk.js`) and the style rows read from `STYLE_CATALOGUE`: `knowledge-coverage.js` is a
   browser module (the knowledge workspace's chunk) and S1.14 holds that no browser module imports
   `knowledge-concepts.js`, so the method rows it reads live in a module of their own. The browser reads no style row:
   a first build that read `STYLE_CATALOGUE` in the browser moved eight route outputs and two other lazy entries by a
   few bytes (export and import lists), which broke the typed topology's exact bound on its own lazy entry
   (`rc44-wp9a-deployment-validate.mjs` S1.10, "22572 B of what the entry adds, at most 22569"). With the style rows on
   the server and the stub as the list's last line no output of the build moves but the stubs' chunk and the knowledge
   workspace's entry.
7. **The method rows are 16, one per catalogue id, relation `realises`** (design: "the eleven method mappings"): a
   comparison option covers its subjects; it is not the identity of any of them (one option names four styles).
8. **`targetContent` is read from the catalogue record the row points at**: the alias of an `akr` row, the concept
   otherwise (design: `akr` rows only; the design's own case 3 asks it of two Playbook rows).
9. **A row names a registered concept** that is not retired; a row keeps its scheme, alias and concept (an edit changes
   its label, relation, note and evidence); the alias id is letters, digits and hyphens (a method alias one slash).
10. **Rows do not join `conceptHash`.** Ruling B3 for rows: a row a second person verified here at some time, or that a
    release holds, is changed by a signed-in person only (`crosswalkCovered`, as `conceptCovered`); a proposal on a
    reviewed or released concept is anyone's, because it lowers nothing (S2.9). The concept review's `crosswalkChecked`
    stays what it is: the set of verified rows changes only by a second person's review or a person's retirement.
    *(Fix-up: a row whose review stands, of either decision, is covered too (P5 d); the concept's review records the
    rows it saw, `crosswalkSeen`, and a release holds only the rows it saw verified (P5 c).)*
11. **A bound of 24 rows per concept** (*fix-up, P4: the rows that stand, neither retired nor rejected*), in the command module: the limit tiers are asserted whole by S1.7
    and S1.25, and a concept-level bound is reached through the commands in 24 requests. The history bound of the tier
    and the 8,000,000-character bound still apply; a library tranche of 60 concepts holds at most 1,440 rows.
12. **`scheme: 'lens'` is refused** until the slice that reads lenses (S4, K-15): such a row maps to a Chapter 2
    category, not a concept.
13. **`resolveConcept` answers `via.releaseId`** beside the design's `{scheme, aliasId, rowId}`; built-in answers carry
    the label "AIW built-in mapping, not reviewed by a person".
14. **The seed is not imported by a script here.** The case imports it through the commands as an import; S4's import
    script will carry it with the handbook packs. Its rows carry `basis` (the exact-name match, "for the reviewer") and
    `status: 'proposed'`.
15. **Ruling I2 reads every text and value of the unit**, its predicates' values included, not only the mechanism,
    rationales and obligations the ruling names.
16. **Recovery neutralises rows' reviews here** (design: S3, with pins): rows exist from this slice.

## Suites of S1 changed (none of `94dbd4f`)

- `rc44-wp1-cases-forms.mjs` (S1's case file, this package's own suite): `designReadings`, `moved` and `graft` are
  exported for S2.8 (no assertion changed); S1.29's walk names the four types as no command of the entry (its own rule:
  "a type added later joins the walk or this case fails"), and asserts the entry refuses them; **one assertion
  replaced**, S1.23: `run --only 'S2: not yet implemented'` answers status 1, `/PENDING S2/` and `/No case was executed/`
  -> `run --files <a file with one synthetic pending case>` answers status 1, `/PENDING T2: a synthetic pending case/`
  and `/No case was executed/` (the S2 placeholder is gone; the same property, held independently of any slice).
- `rc44-wp1-cases-crosswalk.mjs`: the placeholder's one pending case is replaced by S2.0 to S2.12 (not a loosening).

## Measurements (node build.mjs)

| | start 5cae40a | this branch | cap |
|---|---|---|---|
| chapters route code | 3,230,605 B | 3,230,723 B (**+118 B**: the route stub; no other route output moved) | 3,233,792 B (3,069 B left) |
| projects route code | 507,338 B | 507,456 B | 1,242,112 B |
| script files | 148 | 148 | 148 |
| files under 10 KB / 10–50 KB / over 50 KB | 53 / 50 / 45 | 52 / 51 / 45 (the stubs' chunk grew past 10 KB: 10,232 -> 10,350 B) | 61 under 10 KB |
| stylesheet | 901,873 B | 901,873 B | 902,144 B |
| knowledge workspace entry | 133,731 B | 134,200 B (+469 B: the method rows and the design statement 1,130 B, the registration 69 B, less the table the coverage module no longer holds, 738 B) | 377,856 B |
| opens with records (D10) | route + 145,006 B in 2 scripts | route + 145,475 B in 2 scripts (3,376,198 B) | – |

wp1: S1 65 B, S2 118 B, 477 B left for S3 of the 660 B. The route bytes are the stub (the package's own, as the contract
says); no reader or command is on the route. `knowledge-governance.js` in the client: unchanged (the release hook is in
the command function, which the client does not hold).

## Suites (on the final code; evidence `audit/rc44/evidence/wp1-s2-crosswalk-suites.json`)

- `rc44-wp1-knowledge-validate.mjs`: 47 passed (S1's 34, S2's 13), 0 failed, 3 pending (S3 to S5), 154 s.
- Green, unchanged: `rc44-s0-extensions-validate.mjs` (**with `p10-knowledge` registered every block holds**: no
  assertion of S0's suite fails, so there is none to list for the lead), `rc44-wp2-adoption-validate.mjs`,
  `rc44-wp9a-deployment-validate.mjs` (24 checks; its exact bound on its own lazy entry holds because no shared output
  moves, deviation 6), `knowledge-coverage-validate.mjs`, `rc42-g4-trace-kernel-validate.mjs`,
  `rc42-g2-library-validate.mjs`, `knowledge-structure`, `architecture-knowledge-unit`, `candidate-import`,
  `knowledge-boundaries`, `knowledge-retrieval`, `recovery-authority`, `repository-sync`, `repository-transfer`,
  `repository-service`, and the suites that import `design-reasoning.js` or the coverage module: `desk`, `tradeoff`,
  `utility`, `design-spec`, `component-library`, `architecture-intelligence`, `product-choice`, `rc42-g1-tech-approval`;
  earlier on the WIP head also `driver-applicability`, `driver-kinds`, `driver-spec-view`, `intake`, `not-stated`,
  `operations`, `rc42-g3a`, `rc42-g3b`, `rc42-g5`, `rc42-g7`, `service-routes`.
- Red, and red the same way on an archive of `94dbd4f` run in this worktree (the first failure line identical, as
  `audit/rc42/regression-2026-11-16.json` records it): `knowledge`, `stewardship`, `brain-ahead`, `chapter-reasoning`,
  `round27-model`.
- `node check-syntax.mjs`: 942 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
  `node build.mjs`: no violation.
- Not run: browser suites (red on this machine at the baseline), `test:scale`, the full regression (the lead's).
- Mutations, each alone and restored: the design row taken out (S2.10 red: "the design fingerprint reads history of
  KA-0004"); the review stated `person` instead of `second` (S2.5 red); the active-release test of `releasedCrosswalk`
  taken out (S2.1 stays green: a release that is not active holds no concept usable as a whole either, so two conditions
  guard it).

## Open questions and limits (for the lead)

1. **E5 and D2.** A library names `p10-knowledge` once it holds a row (deviation 1). If the lead wants the crosswalk to
   stay unnamed until S3, the types move into the wrapper and the second-person step is no longer stated on the command.
2. **The knowledge history moves a library's design fingerprint**, as every knowledge command does on rc.10.73.42: a
   crosswalk review appends to `knowledge.history` and moves `knowledge.version`. The rows' own steps move no stamp
   (J3, S2.10); the knowledge keys as a whole are S3's (B10: `designKeys` and `evidenceKeys` for the knowledge family).
3. **No undo receipt** for the crosswalk's steps (none of the knowledge family has one): a counter-step reverses them
   (a person's edit lapses a review; a retirement stands).
4. ~~A row a merge or a template copy wrote carries no author stamp (D12): it takes a person's confirmation before a
   second person's review, as an imported one does.~~ **Corrected in the fix-up (P5 g): no such row can exist.** A
   template copy drops `knowledge` whole (S2.10), and an alternative or a reviewed batch that carries a crosswalk
   command is refused ("This action must use its chapter review workflow."; S2.20), so a merge has no row to apply.
5. **Rows of an organisation's release** travel with S3 (`orgContent` copies no `parts` yet).
6. **S0's own suite** holds with a third real package (above). Nothing of S0 needed changing.
7. **The library's document loads the knowledge workspace's entry** before it is drawn once it holds a row (145 KB, D10's
   figure above), so that the browser reads the design row the server reads. At the close of wave 2 (D10) the lead may
   move the package's browser part into a shared entry; its design row is 69 B and the statement in
   `knowledge-crosswalk.js`.
8. **Ruling I2 is closed here** (S2.0). Its reading: every text and value of the unit, which may refuse a unit whose
   typed predicate states a number no quote holds (stricter than the ruling's list).

## Fix-up (the lead's rulings P1 to P8 of 2026-11-22, after the adversarial review of 37520d6)

Branch `rc44/wp1-s2-crosswalk-fix`, from `37520d6`. Review: `/home/user/hb-review/rc44-build/wp1-s2-crosswalk.review.json`
(four must-fix, eight should-fix, eight design concerns). Order of work, each case first and seen red on `37520d6`, a WIP
commit after each item: 1 P1; 2 P2; 3 P3 and P4; 4 P5 (a) to (h); 5 P6; 6 P7; 7 P8 (notes only); 8 notes, size, suites.

- **State:** items 1 to 4 done; item 5 next.

| Item | Done, with its case (red on `37520d6` with) |
|---|---|
| P1 (must-fix 1): a release holds no row its releaser stands behind | done: `formCapability.release` reads the rows the release would hold (`releaseRows`, the one list `parts` copies) and refuses, naming the row and why, the row's author or an editor (`verifierRefusal` on `crosswalkAuthors`), the person who confirmed a row no person wrote, and the person who verified a row an import, a draft by Sol or an agent account wrote ("a third person releases it"). Whose words a row is: the boundary's author stamp (`provenance.author`: a person's own, or `from`/`kind` import or sol-draft; an agent account's commit is a sol-draft, so the words say "drafted by Sol or by an agent account"). S2.13 ("knowledge.release by architect {} was accepted") |
| P2 (must-fix 2): a template copy names only the packages whose records it keeps | done, in S0's `project-lifecycle.js` (the edit P2 confirms): `instantiateTemplate` keeps a registered package's name only when the copy holds a record of it, read from the keys the package states as its own (`design`, `designKeys`, `evidenceKeys`, `lifecycle`, `provenance.records`, the collections of `provenance.paths`; a list only when not empty); an unregistered name is copied as stored (K2). **Reading of "the same reader that adds the name":** the server has no record reader that adds a name (the boundary names a package by the command types a commit applied, `markPackages`, and by an upgrade step that writes); the only reader in the contract of "holds a record" is the route stub's `needs`, which is the browser's and is not registered on the server. So the reader is the package's own statement of its keys, the one the boundary's stamping (`ownCollections`) and the fingerprint read; each stub's `needs` reads one of those keys (`knowledge.crosswalk`, `runtime.topology`, `adoptions`). If the lead wants one reader for both, it belongs in `design-extension-parts.js`, which P2 does not confirm. S2.10, through the service ("a copy that keeps no record of p10-knowledge names no package (ruling P2)"); the recovered library (rows kept, mark cleared, `/api/recovery` preview and restore) still names the package: a guard, green before as after. S0's suite green with the change. |
| P3 (must-fix 3): one id names one concept | done: a `same` row whose alias is the id of another concept of the register (retired or not) is refused at the proposal, on an edit and at verification (`oneIdentity`), whichever was registered first; `resolveConcept` answers null for an id that is a usable released concept and, in any scheme, a governed `same` alias of another. S2.4, both orderings ("knowledge.crosswalk by architect {} was accepted"): the concept first (proposal and edit refused), the row first (verification refused once the concept is registered; a row verified and released before resolves nothing once the other concept is released) |
| P4 (must-fix 4): the bound counts what stands | done: the 24 rows of a concept are the rows neither retired nor rejected (`crosswalkState`). S2.14, through the commands: an agent account proposes 24 rows on a reviewed concept, a person retires 23 and a second person rejects the last (after a person's confirmation, F4), and the person's proposal is accepted; 23 more fill it again and the next is refused (red before: the old sentence "has 24 crosswalk rows, the most a concept holds") |
| P5 (a) (should-fix 1): fail closed on a changed register row; the view shows both | done: `releasedCrosswalk` takes a released row only while this register holds it with the released copy's hash (`crosswalkRowHash`), neither retired nor rejected; a register that lost the row resolves nothing. `conceptAliases` gives each governed entry `register` (the register's state) and `release` (`{releaseId, relation, resolves}`, what an active release holds of it); a row a release holds and the register does not reads `unregistered`. S2.15 (red: the entry had no `register`/`release`) |
| P5 (b) (should-fix 2) | done: S2.10's message states what `assertStepsMoveNoStamp` tests (the steps written into the row in place); S2.16, through the commands, states the known limit: a person's confirmation and a second person's review move the library's design stamp, and with `knowledge.history` and `knowledge.version` put back the stamp is the earlier one. Owned by S3 with the knowledge keys (B10). S2.16 is a characterisation case: it holds on 37520d6 as after (there is no change to make in S2) |
| P5 (c) (should-fix 3) | done: `knowledge.concept-review` records `crosswalkSeen`, each row of the concept that stands as `[id, hash, state]` (only when there is one, so a review of a concept without rows reads as in S1); the release holds a verified row only when the concept's standing review saw it verified at that hash (`releaseRows`). A row verified after the review waits for the next review; nothing lapses (E1 untouched). S2.17 (red: "the review records each row that stands"). The suite's release helper now reviews the concept again before a release (a fixture step, no assertion changed); S2.13 does so too |
| P5 (d) (should-fix 4) | done: `crosswalkCovered` also holds a row whose review stands, of either decision; the refusal names the decision ("was rejected here or is in a release"). S2.18 (red: "knowledge.crosswalk by bot {} was accepted") |
| P5 (e) (should-fix 5) | done: an alias shaped as a record reference (`RECORD_REFERENCE`) is refused in every scheme (no Playbook or catalogue id has that shape, checked); a handbook alias is a topic id of the library or a whole id-shaped token (capitals and digits in hyphenated parts) of the evidence passage. S2.19 (red: "knowledge.crosswalk by architect {} was accepted" for REQ-001); S2.6's words for a handbook alias with no evidence are kept |
| P5 (f) (should-fix 6) | done: S2.9 walks nine kinds (the agent account, a draft by Sol, an import, the reviewer's and the releaser's accounts each as an import and as a draft by Sol, and, at the boundary's handler, a request that states no author and an author that names no account): 108 requests, none accepted, nothing moved. It found a gap: the handler let an author that names no account confirm (and so retire) a row; the person's steps now ask the knowledge family's `personOnly` as well. Red: "knowledge.crosswalk-confirm by an author that names no account was accepted at the boundary". Old -> new: `sent === 2 * 6 * 3` -> `sent === 2 * 6 * (KINDS.length + NOBODY.length)` with `KINDS.length + NOBODY.length === 9` (a wider walk) |
| P5 (g) (should-fix 7) | done: the statement is corrected (open question 4 above, and contractsForOthers); S2.20 shows the refusals through the service (an alternative and a reviewed batch carrying `knowledge.crosswalk`: "This action must use its chapter review workflow."), and S2.10 that a template copy keeps no knowledge. A guard: green on 37520d6 as after |
| P5 (h) (should-fix 8) | done: the mutation is recorded here and in `audit/rc44/evidence/wp1-s2-crosswalk-suites.json`: `decision-suggestions.js` line 29 made to match `pt.catalogue` turns S2.7 red ("decision-suggestions.js reads the catalogue name of a Playbook entry"); restored. Limit found: the same read written as `pt['cata' + 'logue']` passes the scan and is not met by the runtime trap, because no reading of the references calls that reader. The source scan is what bites |
