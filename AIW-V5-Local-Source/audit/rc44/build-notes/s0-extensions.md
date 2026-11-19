# rc44 slice S0: shared registration — build notes

Built on `rc44/s0-extensions-c2` (continues `rc44/s0-extensions`), from `94dbd4f`; fixed up on
`rc44/s0-extensions-fix-c3` (continues `rc44/s0-extensions-fix-c2`), from the builder's head `5c5aef9`.
Contract: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 4, amended by the lead's rulings of 2026-11-18, sections A and
D (`audit/rc44/RULINGS-2026-11-18.md`, on `rc44/integration`). `productionAccepted` stays false.

## State

- **Done:** the registry, the hooks in the shared machinery, the server boundary, the two lists a package adds its line
  to, the suite (22 blocks, green), the size evidence, the fix-up after the adversarial review (all eighteen items and
  the rulings D1 to D12), this contract. At S0 no package existed: the only extensions were the synthetic ones inside
  `rc44-s0-extensions-validate.mjs`. Since wp2 S1 the build registers `p40-adoption`, and the suite holds with it
  (ruling J11; section "With wp2 S1" below).
- **In progress:** nothing.
- **Next (for the lead):** merge. "Open questions" lists what the lead must decide; "What later slices must know"
  lists what the next engineers need.

## Fix-up (after the adversarial review; rulings of 2026-11-18, section D)

Each case was written first and seen to fail on the builder's head `5c5aef9` (the suite as it stands, run against an
archive of that commit: 16 of the 22 blocks fail there, the six that cover unchanged behaviour pass), then made to
pass. One line per item:

| Item | State | Case in `rc44-s0-extensions-validate.mjs` |
|---|---|---|
| Must-fix 1, ruling D1: a second person's step needs two persons | done | `D1 two persons` (on `5c5aef9`: 200 for a record only an agent wrote) |
| Must-fix 2, ruling D2, server: a document names the packages that wrote into it; a build without one reads it and refuses to change, freeze or print it | done | `D2 packages a document names` |
| Must-fix 2, ruling D2, client: no route stub, and a load that fails after "saved" | done | `D2 client` |
| Must-fix 3, ruling D3: one statement of the keys the workbench itself writes | done | `D3 workbench keys` |
| Must-fix 4, ruling D4: one tracker per package, for every commit | done | `D4 tracker` |
| Must-fix 5, ruling D5: the SDD's reading of who wrote the records reads the packages' collections | done | `D5 SDD provenance` (133 !== 139 on `5c5aef9`) |
| Rulings A1 and D11: `hard` is read inside `nonWaivable()`; `NON_WAIVABLE` stays frozen | done; case 3 replaced, old → new below; **A1 frees 19 B** on the route (899 → 880, both built and measured) | `3 checks and readiness` |
| Should-fix 1 (D6.1): the undo of a person's step is a person's | done | `SF boundary` |
| Should-fix 2 (D6.2): `validate` for an alternative's commands, when saved, revised and merged | done | `SF boundary` |
| Should-fix 3 (D6.3): a hop onto a layer of a built-in type states `only` | done | `SF start check` |
| Should-fix 4 (D6.4): both ways onto a built-in trail are stated; the helper for package suites | done | `1 record graph and trail` (`assertBuiltInTrailsUnchanged`, with a trespassing package it catches) |
| Should-fix 5: a section stays inside the section it follows; anchors are the assembled document's | done | `upgrade and sections` |
| Should-fix 6: start-check gaps (workbench id prefixes, retired command names, evidence-key clash names both, one finding id twice, no type free before the resolver) | done; a finding id two findings share cannot be known at start, so a treatment of it is refused at the boundary and `assertFindingIdsUnique` catches it in the package's suite | `SF start check`, `SF boundary`, `D3 workbench keys`, `7 idempotent and order-free` |
| Should-fix 7: a built-in layer is told by its name | done (+5 B) | `7 idempotent and order-free` (a package with a numeric layer name, in its own process) |
| Should-fix 8 (D6.3, D9): the walk reads no hop of a layer no record stands on | done, inside the allowance (538 relations asked for the references before, 0 after) | `1 record graph and trail`, `SF start check` |
| Should-fix 9: goldens for a document whose review list is not empty | done (captured from `94dbd4f`) | `6a`, `6b` (`reviewListDocument`) |
| Should-fix 10 (D9): a package that does not load, or throws while loading, is said in words | done, inside the allowance | `D2 client` |
| Should-fix 11 (D6.11): a single-segment lifecycle path | done: refused at start (no route bytes) | `SF start check` |
| Should-fix 12 (D7): the seven answers | done: in "Contract for packages"; D7.5 is also a start check | `SF start check`, `D1 two persons` (the projection, the account kind handed to `apply`) |
| Should-fix 13: the final commit | done | — |
| Ruling D12: a record a merge wrote carries no author stamp | done; how a merge stamps is unchanged | `D12 a record a merge wrote` (200 !== 400 on `5c5aef9`) |
| Ruling D10: the size file gains "opens with records" | done | `8 client build` (`opensWithRecords`) |

Found while finishing the fix-up, each with its case first:
- The statement of the workbench's id prefixes lacked `BR` (a business rule), `LC` (a Chapter 4 connection's code) and
  `RF` (a review treatment): no template holds one. The case now also reads the product source (`D3 workbench keys`).
- The walk's skip reads the layer a record *stands on*, and a Chapter 1 record stands on the context layer whatever
  its type. A package layer over a built-in type of Chapter 1 (`actor`, `outcome`, …) would hold its records in one
  document and miss them in the next, so the start check refuses it (`SF start check`). No design asks for one.
- A save that changes nothing a record says writes no author stamp (`provenance.js` `settle`), so it puts no person
  behind a record a merge wrote; the D12 case holds that too.

**Replaced assertions** (all in the slice's own suite, which does not exist on `94dbd4f`; no assertion of an older
suite was touched):
1. Case 3, by rulings A1 and D11 (the lead's correction of the lead's own contract): `treatmentsFor(hard)` is `[]` and
   `review.disposition` refuses every treatment (`/takes no treatment/`) → `treatmentsFor(hard)` is the built-in
   non-waivable finding's (`Fix before review`, `Carry as action`); the three waivers are refused, for the finding and
   for its cause, with the exact words of A1; fix before review and carry as action read and block as the built-in
   non-waivable finding does, step for step; a waiver kept from before is read as no treatment.
2. Case 8, by ruling D9: "the route delta measured at the slice is at most 700 B" → "at most 900 B", and
   `allowance.chapters` is 900.
3. Case 8, mine: "the registry module is at most 300 B" → "at most 420 B" (it is 400 B: it now holds the check of
   ruling D2 and the words for a package that does not load). The gate that binds is the route's.

**Where I see it differently from a ruling.**
- *D9 and A4 do not add up.* The allowances of A4 as amended by D9 come to 660 + 600 + 600 + 500 + 1,683 = 4,043 B.
  With S0 at 898 B, 4,031 B are left under the unchanged cap: 12 B fewer than are promised. (D9 took S0's extra 200 B
  out of the pool, but A4's table had already given out the 14 B S0 was not using at 686.) The pool of the seven later
  packages is in fact 1,671 B. Nothing is over a gate today.
- *D2 names commands and export routes; the principle it states is wider.* "A design that this build cannot read in
  full is not changed" is held for every command, every export, a freeze, an intake, a draft by Sol and the storage
  upgrade. These routes still write a document that names a missing package, and I did not change them without a
  ruling and a case each: `/api/lifecycle` (rename, archive, restore, the template flag), `/api/reviews` and
  `/api/attachments`, the knowledge repository (notices, sync, transfer), `/api/organizations` (catalogue, pins),
  `/api/operations` (policy, source sync). A recovery export must stay possible, or the project cannot be taken to a
  build that has the package. See open question 2.
- *D1's words promise a little more than the stamp gives.* The refusal says "a second signed-in person saves or
  confirms it first", as ruled. A save that changes nothing writes no stamp, so such a save does not help; a
  confirmation always does. I kept the ruled words and state the rule under `second` below.
- I have no objection to the other rulings.

**What later slices must know.**
1. *A second person's step needs a stamped person behind the record.* Records written by `workspace.merge` (D12) or
   by an upgrade step carry no author stamp, and a stamp made before the project was restored here does not count. A
   package with a `second` type gives a person a way to confirm such a record: a person's command that sets
   `confirmed: true` on it, in a collection of the type's `provenance.paths` (the boundary then stamps who
   confirmed). Without one, the only way is an edit that changes what the record says.
2. *Ids are the lead's (D8) and are in documents (D2).* An id is fixed for good once its first slice is merged. The
   list `workspace.packages` only grows: a document that once held a package's records names the package for good.
3. *A slice that makes the workbench write a new key or mint a new id prefix adds it to `WORKBENCH_KEYS` or
   `WORKBENCH_PREFIXES`* (`public/design-extension-parts.js`); the case `D3 workbench keys` fails until it does.
4. *The tracker is called on every commit of every project.* It returns at once for a document without the package's
   records.
5. *Every package's suite calls* `assertBuiltInTrailsUnchanged(base, withRecords)` and `assertFindingIdsUnique(p)`,
   compares the ten readings of the references with the package registered, and reports `opensWithRecords` (below).
6. *Route:* S0 uses 898 of its 900 B. 4,031 B are left under the cap.
7. *The header of a tab that is behind* now reads "A newer version is saved." (it read "A newer version was saved in
   another tab."): a tab is also behind when its own save was stored and could not be shown.
8. *wp9a:* its failure domains are `FD-NNN`. A functional driver's code is `FD<n>` (no hyphen), so the ids do not
   clash and the start check accepts the prefix; the two read alike in a citation. wp9a decides whether to keep it.
9. *A provenance block on a package's command* (`payload.provenance` with `source`, `citations` or `basis`) is refused
   by `attachProvenanceBlocks`, whose table of types is built in. A package that needs it asks the lead.
10. *A project made from a template resets a person's steps by key name* (`project-lifecycle.js`
    `instantiateTemplate`), in a package's record as in a built-in one: `review`, `handoff`, `intake`, `recorded`,
    `applied`, `sourceReview`, `generation`, `selection`, `approval` and `readOnlyDeclaration` become `null`;
    `confirmed`, `reviewed` and the like become `false`; the lists `history`, `evidence`, `simulations`, `checks`,
    `governance` and `reviews` are emptied. **A person's step a package keeps under a key of its own choosing
    (`acceptance`, `signedOff`) is carried into the copy as if it had been taken there.** Keep it under the record's
    key `review` (see `second` in the contract). wp2's design keeps an adoption's `applied` and `acceptance`: the
    reset clears `applied` and not `acceptance`. The author stamps of the template's records are carried too. See
    open question 6.

## Second round after the verifier (2026-11-19, by the lead)

The verifier of the fix-up (`72204ff`) answered "not yet": everything ruled was in the product and nothing was
weakened but the registry's own size bound (ruling F5), and hostile inputs still got through. Its report:
`/home/user/hb-review/rc44-build/s0-extensions.verify.json`. Each point below was closed on `rc44/s0-lead-f`, a case
first and seen to fail.

- **A second person's step trusted a stamp the boundary did not keep current** (must be fixed). A person's record
  that an agent account or a draft by Sol changed kept the person's stamp when the change came by a type whose prefix
  states no `provenance.paths`, or by a command that names no record. Now the boundary restamps every record of a
  package's own collections that a commit changed, whatever the command says of itself (`provenance.js`
  `stampChanged`, `design-extension-boundary.js` `stampExtensions`, called by `worker.js` after `stampAuthorship`). A
  record a commit made is left to `stampAuthorship`; one with no stamp has no person behind it. Case: block "D1 two
  persons" (three probes).
- **Keys named after what every object carries** (`constructor`, `toString`, `constructor.name`, …) moved the
  fingerprints of every old document. No part of a package states one. Case: block "SF start check".
- **The walk's skip cost a built-in layer a record.** A Chapter 1 record whose type a built-in layer holds stands on
  the context layer and is still brought onto the layer of its type; with no other record on that layer the walk
  skipped it. The kernel now names the layer of the record's type too (`trace-kernel.js`, 22 B on the route). Case:
  block "1 record graph and trail", against what rc.10.73.42 reads.
- **The case for a numeric layer name did not hold its fix.** The probe now reads a document in which a requirement
  names a runtime path; with the old index test put back the block fails (checked once, then restored).
- **A package's tracker or handler could state who wrote a journal event.** The boundary removes `actor`,
  `authorKind`, `reviewed`, `account`, `session` and `reason` from every event a package's tracker, or a package's
  command sent on its own, adds; the server's stamp is the only one. Case: block "D4 tracker". Left open, with task
  D12: an event a package's *staged* handler adds inside a reviewed batch.
- **Three small gaps.** Every form of a heading counts in a section (setext, indented, a tab, HTML): block "upgrade and
  sections". A package's noun is not `document` nor a noun the workbench reads one of its own collections under: block
  "SF start check". A list of packages that is not a list of names reads as a list this build cannot read and is
  refused as a missing package is (`UNREADABLE_PACKAGES`): block "D2 packages a document names". Replaced there, old ->
  new: `missingPackages({workspace: {packages: ['p40-adoption', 7, 'zz-synthetic']}})` equals `['p40-adoption']` ->
  the same list without the `7` equals `['p40-adoption']`, and the list with the `7` is unreadable (stricter).
- **A rename stored a read upgrade.** A project that names a missing package is renamed, archived and restored as it
  is stored (`project-lifecycle.js`). Case: block "D2 packages a document names", on a stored design of the fingerprint
  before this one.

## Lead follow-up after the fix-up (rulings F2 and F3, 2026-11-18)

Done by the lead on `rc44/s0-lead-f`, from the fix-up's head `72204ff`. Each case was seen to fail first.

- **F2, one refusal for every route that writes.** A project that names a package this build does not register is
  refused at one place in `worker.js` for every request that is not a GET, whatever it asks, except the routes in
  `MISSING_PACKAGE_OPEN`: commands (refused on the document that route reads anyway), renaming, archiving and restoring
  from the archive, recovery, access and discussions, and making another project. The one writer of a project
  (`project-storage.js` `saveStoredProject`) refuses again, for a route that is routed before that line
  (`/api/organizations`); every final catch answers 409 with code `missing_package` (`error-message.js`). The earlier
  check on three routes is retired. Case: block "D2 packages a document names" (fifteen routes refused, one of them a
  route this build does not have; rename, archive, restore, access and a recovery export stay possible).
- **F3, a step taken in another project is no step here.** `personBehind` (`design-extension-boundary.js`) does not
  count an author stamp or a confirmation made before the project was copied from a template
  (`workspace.templateOrigin.at`), as it does not count one made before a restore. Case: block "D1 two persons".
  `rc44-s0-readings.mjs` gained `assertTemplateCopyClearsSteps(p, records)`: every package with a person's or a second
  person's step calls it; it fails for a step kept under a key of the package's own.
- Route: 898 B, unchanged (server only). 22 checks pass; syntax, lint (0 new) and the build's gates pass.

## With wp2 S1: three rows, two rules of the boundary and the suite with real packages (2026-11-19)

Done by the fix-up of wp2 slice S1 on `rc44/wp2-s1-record-fix-c2`, as the lead's rulings J2, J3, J8, J9, J10 and J11
say (section J of `RULINGS-2026-11-18.md`). Each case was written first and seen to fail. Every route byte of these
rows is counted in wp2's allowance, not S0's.

| Ruling | What S0 gained | Where | Case (in `rc44-s0-extensions-validate.mjs`) |
|---|---|---|---|
| J2 | The emitter is handed `has(id)`: whether the graph holds an object under that id | `record-graph.js` `recordRelations` (route) | "J2 emitter has" |
| J3 | The row `design {key: p => what the key says}`, read by `reviewSource` in place of the raw key; one key has one statement; the helper `assertStepsMoveNoStamp` | `review-domain.js` (route), `design-extension-parts.js`, `rc44-s0-readings.mjs` | "J3 design statement", "7 idempotent and order-free" |
| J10 | The row `prefixes {built-in type: id prefix}`, read by the start check and the clash check; the scan of workbench prefixes reads the workbench's own modules only | `design-extension-parts.js` (server) | "SF start check", "7 idempotent and order-free", "D3 workbench keys" |
| J8 | `upgradeDueRefusal`: a command on a row whose package upgrade is due is answered with a reload | `design-extension-boundary.js`, `worker.js` (server) | wp2's block "storage upgrade" (a real stored row) |
| J9 | The SDD counts an unstamped record of a package's collection as written by an upgrade or a merge | `sdd-architecture.js` (server) | "D5 SDD provenance" |
| J11 | The suite holds with real packages registered | the suite | every block below |

The contract text for each row is in "The parts, one by one" (`prefixes`, `records … has`, `design`, `upgrade`).
The suite has 24 blocks (22, and the two new ones).

**J11, how the suite reads the build's packages.** `BUILD_PACKAGES` is read from the route stubs of
`public/design-package-routes.js`; no id of a real package is written in the suite. "Nothing registered" is proven in
a child process that loads the registry and the readers without `worker.js` (0 registered; every reading equals the
golden file of `94dbd4f`).

**Replaced assertions, old -> new** (the suite does not exist on `94dbd4f`; each new assertion is at least as strict;
line numbers of `rc44-s0-extensions-validate.mjs` at this head):

1. l.273, block 6a: `EXTENSIONS` equals `[]` -> `EXTENSIONS` ids equal the build's packages and their route stubs,
   **and** a process without the server's package list holds 0 and reads the three references and the document with a
   review list byte for byte as the golden file.
2. l.316, block "registration": ids equal the three synthetic ones -> the sorted union of the build's ids and the
   three.
3. l.760 and l.764, block "D2": `p40-adoption` as the package a build lacks -> `p98-absent`, an id no build
   registers; added: a package this build registers is not missing; the unreadable forms are tried with both ids.
4. l.843, block "D3": the prefix scan read every module -> it reads the workbench's own modules, **and** every prefix
   literal in a package's own modules must be the workbench's or one the package states; a module of the workbench
   is never counted as a package's.
5. l.863, block "D3": the allowed rows used the key `adoptions` -> a key no package states (`journals`), **and** each
   collection a package of the build states is refused to another package.
6. l.944, block "D5": the packages' collections equal the three synthetic ones -> those and the ones the build's
   packages state, and none is the workbench's own.
7. l.1039, block "SF start check": `XY, ADP, WL, FD, DN, SLO` are each free -> `XY, WL, FD, DN, SLO` are free, and
   `ADP` is held as taken by the clash check (l.1334: stated by another package it is a clash that names both).
8. l.1061, block "SF start check": a layer over `pattern` is allowed -> a layer over a built-in type that stands on no
   layer (`risk`) is allowed, the package that holds `pattern` conforms, and a second layer over `pattern` is refused
   in words.
9. l.1289, block "needs and load": neither list holds an import or a `registerExtension` line -> every code line of
   the browser's list is the registry's import or one stub `{id: <id>-route, needs, load}`, the server's list holds
   one import for each stub and names the same packages, each stub states only `id`, `needs` and `load` and asks for
   nothing for a document without records.
10. l.1310, block 7: `out.extensions` equals the three synthetic ids -> the sorted union with the build's ids.
11. l.1326, block 7: at least 7 clashes, each naming `zzz-duplicate` and `zz-synthetic` or `mm-other` -> at least 7
    plus one for each new row (a minted prefix of `zx-minter`, one of the build's package, a design statement of
    `zw-stated`), each naming `zzz-duplicate` and the package that keeps the row; the seven of the synthetic packages
    are still each counted.
12. l.1371, block 8: the registry module in the client build is at most 420 B -> the registry as the route held it at
    S0 (bundled apart with the build's options: its readers) is at most 420 B, `registerExtension` itself is under
    120 B, and the module in the client build less `registerExtension` is at most 420 B. The bound is the same on the
    same code; the first route stub keeps `registerExtension` on the route, which is wp2's route bytes (ruling F5: the
    route gate binds).

## What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/design-extensions.js` | route (400 B) | The registry: `registerExtension`, `EXTENSIONS`, `extendTable`, `ensureExtensions`. Imports nothing, holds no project state. |
| `public/design-package-routes.js` | route (0 B today) | The browser's list of packages: one route stub a line. Empty. Imported by `project-store.js` only. |
| `design-packages.js` | server | The server's list of packages: one import a line. Empty. |
| `design-extension-boundary.js` | server | The command boundary of the packages (person-only, second-person with two persons, validate, undo, the trackers, large), the packages a commit names, the built-in type probe, the start check. |
| `public/design-extension-parts.js` | server (in no client bundle) | The upgrade chain and its notes, the packages a document names, the document sections, the statement of the workbench's own keys and id prefixes, the packages' collections, the conformance check and the clash check. |
| `rc44-s0-extensions-validate.mjs`, `rc44-s0-extensions-baseline.json` | suite | The eight cases of the contract and fourteen more blocks; the SHA-256 of the readings at `94dbd4f`. |
| `rc44-s0-readings.mjs` | suite helper, for every package's suite | The ten readings compared byte for byte, a document with a review list, `assertBuiltInTrailsUnchanged`, `assertFindingIdsUnique`, `opensWithRecords`. |
| `audit/rc44/build-notes/s0-size.json` | evidence | The route measurement, written by the suite from the build, with the field "opens with records". |

Hooks in existing files (each a few lines, all commented "rc44, slice S0"): `public/record-graph.js` (types, the
emitter), `public/trace-kernel.js` (layers, hops, the walk's skip), `public/document-memo.js` `sharedList` (checks),
the ten chapter domains (their findings list is named by its chapter number), `public/review-domain.js` (list 11,
`hard` inside `nonWaivable`, evidence keys), `public/canonical-command.js` (`stagedBy`), `public/workbench-ui.js`
(reads `stagedBy`), `public/record-lifecycle.js` and `public/provenance.js` (collections, nouns, paths),
`public/review-plan.js` (nouns), `public/project-store.js` (`ensureExtensions`, a save stored and not shown),
`public/workspace-ux.js` (the header of a tab that is behind), `public/readings-upgrade.js`, `storage-upgrade.js`,
`public/sdd-architecture.js` (sections, who wrote the records), `public/action-undo-domain.js`, `authorship.js`,
`project-lifecycle.js` (a template copy keeps the packages it names), `worker.js`.

## Contract for packages

A package is an optional part of the design model that lives in its own modules. It tells the shared machinery what it
adds by registering once. This section is the contract as built and as the rulings of 2026-11-18 stand; the suite
proves each line of it with a synthetic package.

### Package ids (rulings A2 and D8)

The lead assigns the ids. They follow dependency, not work-package number: a package whose records another package
binds, measures or reads comes first, because a hop may come only from a layer of a package earlier by id.

| Id | Package | State |
|---|---|---|
| `p10-knowledge` | wp1 knowledge | assigned |
| `p20-contexts` | wp9c contexts | provisional |
| `p30-deployment` | wp9a deployment | assigned |
| `p40-adoption` | wp2 adoption | assigned |
| `p50-workload` | wp3 workload | assigned |
| `p60-behaviour` | wp4 behaviour | provisional |
| `p70-change` | wp5 change | provisional |
| `p80-evidence` | wp6 evidence | provisional |
| `p85-governance` | wp9b governance | provisional |
| `p90-views` | wp7 views | provisional |
| `p95-guide` | wp8 guide | provisional |

- A provisional id is confirmed or moved by the lead when the package's design is written. The gaps are for packages
  not yet thought of.
- An id is fixed for good when the first slice of its package is merged, because documents then name it
  (`workspace.packages`, below).
- The id orders a package's layers after the built-in ones, its findings within a chapter, its sections at one anchor
  and its upgrade step, and decides who keeps a row two packages both state (the earlier id).
- The route stub of the package `<id>` is registered as `<id>-route`. The browser reads that name.

### The three things a package adds outside its own modules

1. **`design-packages.js`** (server): one line, an import of the module that registers the package. The server
   registers every package when it starts and then checks each one (`assertExtensions`). A package that does not
   conform stops the server, with every problem named in words.
2. **`public/design-package-routes.js`** (browser): one line, the route stub:
   `registerExtension({id: '<id>-route', needs: p => …, load: () => import(<the lazy entry that holds the package>)});`
   It is on the route and counts against the package's own route bytes.
3. **Its suite**, registered as `test:rc44-…` in `package.json`.

Nothing else in the shared machinery is edited to register a package. Edits of built-in behaviour are a different
matter: see "What the registry does not carry". An example in a comment carries no quoted import path, because
source scanners (`rc42-g1-tech-approval-validate.mjs`) read comments (ruling A8).

### `registerExtension(e)`

`e.id` is 2 to 61 lower-case letters, digits and hyphens, starting with a letter (not `constructor`). The first
registration under an id stands; registering it again changes nothing. Readers read the packages **sorted by id**, so
the order of registration never shows.

Every part is optional.

| Part | Shape | Read by |
|---|---|---|
| `objectTypes` | `{type: {label, chapter, level, prefix}}` | `record-graph.js` `OBJECT_TYPES` |
| `prefixes` | `{built-in type: id prefix}` | the start check and the clash check (`design-extension-parts.js`); ruling J10 |
| `records` | `(p, add, rel, has) => void` | `record-graph.js` `recordRelations`: the record graph and the connected model |
| `layers`, `hops` | `{layer: type}`, `[{layer, types, from, dir, ctx, only?}]` | `trace-kernel.js` |
| `checks` | `{chapter: p => [finding]}` | `document-memo.js` `sharedList`: the chapter's checks, the review, readiness |
| `commands` | `{type: {apply, staged?, person?, second?, validate?, undo?, large?}}` | `design-extension-boundary.js` (server), `canonical-command.js` `stagedBy` |
| `track` | `(prior, next, command, at) => void` | `design-extension-boundary.js` `trackExtensions` (server), for every commit |
| `lifecycle` | `{path: chapter}` | `record-lifecycle.js` `COLLECTIONS` |
| `provenance` | `{nouns: {path: noun}, paths: {type or prefix: [path]}, records: {path: chapter}}` | `provenance.js`, `sdd-architecture.js` |
| `designKeys`, `evidenceKeys` | `[key]` | `review-domain.js` `designOf` |
| `design` | `{key: p => what the key says}` | `review-domain.js` `reviewSource`, in place of the raw key; ruling J3 |
| `upgrade`, `upgradeNote` | `p => p`, one sentence | `readings-upgrade.js`, `storage-upgrade.js` (server) |
| `sections` | `[{document, after, markdown(p)}]` | the export routes of `worker.js`, `sdd-architecture.js` (server) |
| `needs`, `load` | `p => boolean`, `() => Promise` | `project-store.js` through `ensureExtensions` |

### The parts, one by one

**`objectTypes`.** A type name is letters and digits. `chapter` is 1 to 11. `level` is one of `context`, `logical`,
`intent`, `data`, `application`, `capability`, `protection`, `technology`, `interaction`, `deployment`. `prefix` is
the id prefix of the kind's records, 2 to 5 capitals. The start check refuses a prefix the workbench itself uses
(`WORKBENCH_PREFIXES`: `ADR`, `REQ`, `IF`, `BR`, `CHG`, … — a record under an id a built-in record holds is left out
of the record graph) and one two packages both state. A type that is built in, or that a package earlier by id
states, stays as it is.

**`prefixes`** (ruling J10). `{built-in object type: id prefix}`: the prefix of the records a package adds under a
built-in type from its own collection (ruling D7.2; `p40-adoption` states `{pattern: 'ADP'}`). The prefix is 2 to 5
capitals and never the workbench's own. The type is built in, is not the package's own (a kind's prefix is stated with
the kind), is not a type of Chapter 1 records and stands on no built-in layer: the same rule as for `add` with a
built-in type. The clash check claims a minted prefix exactly as it claims a kind's prefix, so two packages that state
one prefix, by either row, do not start. `WORKBENCH_PREFIXES` holds no package's prefix: the suite's scan of prefixes
reads the workbench's own modules only (a package's modules are those only its own modules import, from the module
its line of `design-packages.js` names), and asserts that every prefix literal in a package's modules is the
workbench's or one the package states.

**`records(p, add, rel, has)`.** Called by the one emitter, after every built-in record and relation, for the record graph
and the connected model alike. It is not called for the driver-scope graph (`recordGraph(p, 'component')`).
- `add(record, type, source)` registers the record as an object. `source` names where it lives, by convention
  `'<path>.<id>'` (`'notes.records.NOTE-001'`). A record whose id something already holds is not registered: a package
  never stands in a built-in record's place.
- `rel(type, from, to, {source, id?, label?, attributes?, derived?, via?})` states a typed relation. It never replaces
  one. `source` names the field that states it (`'notes.records.componentId'`). State a relation only between records
  that exist: one with a missing end is left out of the record graph and is listed as unresolved in the connected model.
- `has(id)` (ruling J2) says whether the graph holds an **object** under that id at the moment it is asked: every
  built-in object, the objects of packages earlier by id, and the package's own once added. It is false for an id
  nobody holds and for a record the graph keeps as a relation, not as an object (a Chapter 4 allocation, a lineage, a
  connection): the lifecycle collections hold many of those, so an index of the document's records by id is not a test
  of "is an object". **A package that binds records by id asks `has(id)` before each `rel`.** A relation stated to a
  record that is no object is listed as `unresolved` in the connected model, and the model package of such a document
  is refused ("Resolve duplicate identities and missing relationship endpoints …"). Case: block "J2 emitter has" (a
  probe package that asks and one that does not, in a process of their own).
- **With none of the package's records in the document the emitter states nothing.** That holds for relations between
  two built-in records too (wp9a's `recovers` between environments): they are read from fields that exist only once
  the package wrote them.
- **A package's records join a package's layers only.** There are two ways a package could put a record on a built-in
  trail, and the registry cannot see either:
  1. *A relation.* A relation of a type a built-in hop reads (`fulfils`, `constrains`, `justifies`, `realizedBy`,
     `hasNeed`, `metBy`, `implementedBy`, `provides`, `uses`, `exchanges`, `owns`, `operatedAs`, `placedAs`,
     `locatedIn`, `protects`, `enforces`, `threatens`, `mitigates`) between two **built-in** records. Do not state one.
  2. *`add` with a built-in type.* `add` may emit a record of a built-in type only when that type stands on no
     built-in layer (today `pattern`), and only from the package's own collection (ruling D7.2). `add(record,
     'component', …)` would put the record on the component layer, which the governance checks read.

  The package's suite proves it has done neither: `assertBuiltInTrailsUnchanged(base, withRecords)`
  (`rc44-s0-readings.mjs`) asserts that every built-in layer of every requirement's trail and spine holds, with the
  package's records present, what it holds without them (ruling D6.4).
- `rel('fulfils', requirementId, record.id, …)` is how a requirement names the package's record.

**`layers`, `hops`.** `layers` is `{layer: object type}`: a type stands on one layer. A package's layers follow the
built-in eighteen, in id order and then in the order stated. A built-in type that stands on no built-in layer may be
given one (wp2's `mechanism` layer of type `pattern`); a type that already stands on a layer stays there. A layer
holds no built-in type of Chapter 1 (`actor`, `outcome`, `journey`, …): a Chapter 1 record stands on the context
layer and on no other, and the start check refuses the layer.
A hop is `{layer, types, from, dir, ctx, only?}`:
- `layer`: the layer the record joins. It must be a package's layer. **A hop onto a built-in layer is ignored** (and
  refused at start): a built-in layer reads the built-in hops and no other, and is told by its name.
- `types`: the relation types that bring the record (`null` for any, then give `only`).
- `from`: the layers of the record it comes from. Each is a built-in layer, an earlier layer of the same package, or a
  layer of a package **earlier by id**. The walk reads the layers in order, once.
- `dir`: `'out'` when the relation runs from the earlier record to this one, `'in'` when it runs to the earlier record.
- `ctx`: `false` for the requirement's own chain (its spine, which the governance checks read), `true` for context
  (on the trail, not on the spine). It must be stated.
- `only: relation => boolean`: which relations the hop reads. **A hop onto a layer of a built-in type states `only`**
  (ruling D6.3), and the start check refuses one that does not: documents written before the package hold records and
  relations of that type too, and `only` says which relations are the package's own (by their `source`), so that no
  trail of a document without the package's records moves.
- The hop from `requirement` whose types include `fulfils` is the layer's naming hop (`namedBy`,
  `namingRequirements`).
- A trail lists a package's layer only when it holds a record: read `T.layers.note || []`.
- The walk reads no hop of a layer no record of the document stands on. A package's hops cost a document without its
  records nothing.

**`checks`.** `{chapter: p => [finding]}`. For chapters 1 to 10 the findings follow the chapter's own, in every reader
of the chapter's checks: its Validate, the review's inherited findings (`C<chapter>:<id>`), readiness, the board, the
blockers.
- A finding is `{id, code, title, detail, level, objectId, hard?}`. `level` is `'error'` or `'warning'`. `id` is
  unique in the review, by convention `'<code>:<record id>'` with a code no chapter and no other package uses. A
  treatment is kept by finding id: when two findings share one, `review.disposition` refuses to treat it, and
  `assertFindingIdsUnique(p)` in the package's suite catches it before that.
- `objectId` names the record the finding is about. When that record is in a collection the provenance reader reads
  (`lifecycle` or `provenance.records`), a treatment of the finding holds until **that record** changes; otherwise it
  holds until anything in the design changes.
- **`hard: true` with `level: 'error'` puts the finding in the rc.10.73.42 non-waivable class, and nothing stricter**
  (rulings A1 and D11). It cannot be waived: it is not accepted as a design limitation, not marked not applicable and
  not marked source-silent, for the finding or for its cause. `review.disposition` refuses each with "“<title>” cannot
  be waived: change the design. Until then, fix it before review or carry it as an action." The dialog offers the two
  other treatments (`Fix before review`, `Carry as action`), and the finding blocks exactly as a built-in non-waivable
  finding does until the design changes or it is carried as an action. `hard` is read in one place, `nonWaivable()`
  (`review-domain.js`), which answers `true` for it; `NON_WAIVABLE` stays the frozen table of built-in codes. `hard`
  on a warning means nothing.
- **Chapter `11` is the review's own list** (`EVIDENCE:<id>`); such a finding states its `chapter` and `chapterTitle`
  itself, as `knowledgeFindings` does. Where it shows, exactly as a built-in finding of that list does (ruling D7.4):
  in the review's findings (`inheritedFindings`), where it takes a treatment; among the review's blockers when it is
  an error; in the working registers. Where it does not show: in no chapter's own checks, not in a chapter's inherited
  findings (`chapterInheritedFindings`), not in readiness for any chapter (Chapter 11 included), not on the board or
  in its counts, not in the review's final findings, not in the architecture edition and not in the ARS. A finding
  that must show in a chapter's readiness is a finding of that chapter, 1 to 10.
- The function answers `[]` for a document without the package's records, is pure, and is cheap: it runs wherever the
  chapter's checks are read (kept per settled document on the client).
- No candidate or unreleased knowledge reaches a check (plan ruling 6). The package's suite proves it.

**`commands`.** The type is `prefix.name`. **A type a built-in handler takes is never a package's**: the server asks
the built-in handler once per type, and only a type it refuses as unknown is free. Free today: every new prefix, and
unknown names under `requirements`, `quality`, `decision`, `logical`, `realisation`, `technology`, `techrealisation`,
`interfaces`, `security`, `runtime`, `review`, `process`, `record`, `change`, `workspace`, `knowledge`, `action`,
`validation`, `lens`, `coauthor`, `case`, `standards`, `assurance`, `alternative`, `model`. Closed (their handler does
not answer "Unknown … action."): `guide`, `brain`, `protection`, `exchange`, `architecture`, `design`, `evidence`,
`intelligence`. The twelve retired names the workbench still reads (`runtime.remove-plan`, `technology.keep-seed`, …)
are taken. Until the server has installed its resolver no type is free. The types of the four designs
(`knowledge.concept-pin`, `adoption.apply`, `selection.judge`, `workload.model`, `runtime.node`,
`runtime.failure-accept`, `technology.domain-evidence`, …) are free; the suite asserts it.
- `apply(document, command, at, actor, {author, revision})` answers `{document, selected?, selectedIds?}`. It works
  on the copy it is handed and throws `Error(words)` to refuse. Everything around it is the boundary every command
  has: shape and size checks, the commit's author, the revision check, provenance and authorship stamps, the journal
  with actor, author kind and reason, the activity row, the idempotency receipt.
  - `selected` is the id of the record the command wrote or decided on (ruling D7.3). The server answers it to the
    browser, which selects that record, and keeps it on the idempotency receipt; it names the record to the authorship
    stamp beside the ids the payload names (`id`, `ids`); and a suggestion the command accepted is recorded on it.
  - `selectedIds` is a list of further ids: it is how a step that touches several existing records gets each stamped.
  - `created` is not part of the contract: nothing reads it for a package's type (the one reader,
    `attachProvenanceBlocks`, knows the built-in types only).
  - `author` is the commit's author as the server classified it (`authorship.js`): `{kind, id, account}` with `kind`
    `'person'`, `'sol-draft'` or `'import'` and `account` `'person'` or `'agent'`.
- `staged: true`: an ordinary design edit. A reviewed batch may carry it (`workspace.apply`, an alternative, the
  workbench's change review), and a single edit of an existing record is reviewed as a built-in design edit is. In a
  batch the handler is called with four arguments: **it is not told the author there.** Never with `person` or
  `second`.
- `person: true`: a signed-in person's step. An agent account and a draft by Sol are refused before the project is
  read (`authorship.js` `refuseUnreviewable`); an import is refused by the boundary.
- **A type that ends in `.review`, `.handoff` or `.intake` is a review command to `authorship.js`**, whatever its
  package states. Such a type states `person` or `second`; the start check refuses one that does not (ruling D7.5).
- `second: (p, command) => record | [records] | null`: a second person's step (plan ruling 5 as ruling D1 reads it).
  It is person-only. Two things are asked, in this order:
  1. *The one rule*, `verifierRefusal` (`public/architecture-obligations.js`), on what `second` answers: the record,
     or a projection `{id, actor, history: [{revision, actor}], owner?}` the package builds (ruling D7.1). `actor` and
     `history` name everyone who wrote what the step covers. The rule refuses whoever wrote any revision, the owner,
     an agent, a request with no signed-in actor, and a record that names no author. A projection may leave out saves
     that did not change what the step covers only when the package's design says which saves, and its suite holds a
     case for a save left in and a save left out.
  2. *Two persons* (ruling D1): a person other than the actor stands behind the record **as it stands**. The boundary
     reads that from the stored record's own stamps, found by its id in the collections the package states for the
     type or its prefix under `provenance.paths` — so **a package with a `second` type states `provenance.paths`**,
     and the start check refuses one that does not. A person stands behind the record when its author stamp
     (`provenance.author`) is a person's, or a person has confirmed or kept it as it now reads
     (`provenance.reviewed`, or a judgement of the review plan that kept it). One person accepting what only an agent
     account or a draft by Sol wrote is one person, not two. A record with no author stamp has no person behind it
     (one a merge wrote: ruling D12), and neither has one whose stamp was made before the project was restored here.
     The refusal says what must happen first: "A second person's step needs two persons: no person other than <actor>
     stands behind <id> as it stands (…). A second signed-in person saves or confirms <id> first."

  What "saves or confirms" means to the stamp: the boundary stamps a person as the author when their command makes the
  record or changes what it says, and as having confirmed it when their command sets `confirmed: true` on it (or keeps
  a proposal). A save that changes nothing writes no stamp. A package with a `second` type therefore gives a person a
  command that confirms a record.

  The record must keep `actor` and a `history` entry with `revision` and `actor` for every save. **At read time** a
  package checks a stored step the same way and writes no other rule: `apply` stores on the step the actor and the
  author's account kind the boundary hands it (`{actor, at, account: author.account}`), and the reader calls
  `verifierRefusal(projection, step.actor, step.account)` on the same projection and requires `step.account ===
  'person'`. **The step is kept under the record's key `review`**, for two reasons. A project made from a template
  resets that key (and `approval`) and no key of a package's own choosing, so a step kept elsewhere would stand in
  the copy without anyone having taken it there. And `review` is bookkeeping to the stamps: a step written there does
  not change who the record's author is. Any other key, `approval` included, is content to them: the commit that
  takes the step would be stamped as the record's author, and an earlier confirmation's stamp would be cleared.

  The sentence of the first refusal stays `verifierRefusal`'s in S0; a package's own surface says who may take the
  step in its own words, and if the server's sentence misleads on an accept step, wp9b generalises it once for all
  packages (ruling A5).
- `validate(p, command, {at, actor, author})` answers a refusal in words, or nothing. It is for what the type refuses
  **by who writes the commit** (wp3: a draft by Sol states no figure). The server asks it before anything is applied,
  with the document as the request finds it: for the command sent on its own, for each command of the type inside a
  batch a request carries, and for every command an alternative carries — when the alternative is saved, when it is
  revised and when it is merged (ruling D6.2). Everything else is refused by `apply`, which sees the document as the
  earlier commands of a batch left it. The browser's previews do not ask it.
- `undo: {previous(p, command), revert(p, previous, at, actor)}`: the latest saved action is undone by its receipt, by
  the account that saved it, while nothing else has changed. Not for a staged type. **The undo of a person-only or
  second-person step is itself a person's step** (ruling D6.1): an agent account, a draft by Sol, an import and a
  request with no signed-in actor are refused.
- `large: true`: the request may carry up to 500 KB.

**`track(prior, next, command, at)`.** The package's one tracker (ruling D4); a command type states none of its own.
The server calls it after the built-in trackers for **every** command of every project — a built-in one too
(`record.retire`, `decision.save`, `workspace.merge`, a guide step) — and then for each command the commit carries
(a reviewed batch's, an applied impact's). `prior` is the document as the request found it and is not changed; `next`
is the commit's own copy. **It writes nothing for a document without the package's records**, and returns at once
there. What it writes into `next` is part of the same commit: the events it adds to `next.changes.events` are
journalled and stamped by the boundary with who, of what kind and why, and listed in the commit's activity row.

**`lifecycle`.** `{path: chapter}`, the path `container.list` (a list inside a container: a single-segment path is
refused at start, because a retirement keeps the owning container's `version`, `review` and `handoff`), the chapter 1
to 10. The collection's records retire, restore and keep through `record.retire`, `record.restore` and `record.keep`,
with who, when and why. Consequences to know: a record of such a collection that names another record's id stops that
record's retirement ("still named by"), and the other way round; a retirement moves the container's `version` and
clears its `review` and `handoff`. The provenance reader reads a lifecycle collection without being told.

**`provenance`.**
- `nouns: {path: noun}`: the singular noun of a collection ("Review 3 design notes drafted by Sol").
- `paths: {command type or prefix: [path]}`: the collections the commands of that type or prefix write, so that the
  boundary stamps who wrote and who confirmed each record, and reads those stamps for a second person's step. Under a
  built-in prefix (`runtime`, `technology`) they are read with the built-in ones, never in their place.
- `records: {path: chapter}` (chapter 1 to 11): a collection the provenance reader reads that does **not** retire
  through the lifecycle family (wp2's adoption records, which have their own withdraw). Its records are counted by
  author, listed in the review plan and found by `findRecord`; they stop no retirement.
- The SDD reads both kinds of collection (ruling D5): its count of who wrote the records, its cover line, and the
  open items "Drafted by Sol, to keep, change or retire" and the open fields, each under the package's noun.

**Keys the workbench itself writes (ruling D3).** `WORKBENCH_KEYS` (`public/design-extension-parts.js`) is the one
statement of them: a key that is the workbench's whole (`changes`, `retired`, `finalReview`, `workbench`, `workspace`,
`brief`, `artefacts`, …), and for each chapter container and the knowledge workspace the keys of it the workbench
writes. A `lifecycle` path, a `provenance.records` path or an evidence key on such a key is refused at start. A new
key of a chapter container (`runtime.nodes`, `technology.domains`, `knowledge.concepts`) and a key of the package's
own stay allowed.

**`designKeys`, `evidenceKeys`.** A key is a key of the document or `chapter.key`. Every key a package writes is
design, as any key is: the design fingerprint reads it, and the first record written moves the fingerprint.
`designKeys` declares them; the start check refuses one that lies where the fingerprint does not read.
`evidenceKeys` leave the design: a **list** is evidence beside the design (it moves `evidenceStamp`, not the design
stamp); an **object** is bookkeeping beside the design, which neither fingerprint reads (as `dataOwnership` is: wp3's
`workloadMigration`). An evidence key on a key another package states is a clash that names both packages. The
registry converts no stored stamp: an upgrade step that adds a design key to an old document moves that document's
design stamps, and handling that is the package's (as D14 did in `readings-upgrade.js`).

**`design`** (ruling J3). `{key: p => what the key says to the design fingerprint}`, for a key of the document that is
the package's own (not a key inside a chapter's container, never a key the workbench writes). `reviewSource` puts what
the function answers under the key, in place of the raw key; when it answers `undefined` or `null` the design source
holds no key, so a document without the package's records, and a baseline frozen from one, read as they did. A key
with a statement is design by that statement: the start check's probe of `designKeys` does not ask the fingerprint
about it, and it may be listed in `designKeys` too. Two packages that state one key do not start.
- **The rule for every package:** the design fingerprint never reads the `history`, `review`, `confirmed` or
  `provenance` of a package's record. No person's and no second person's step moves a design stamp, at any revision.
  A package whose records keep any of the four states the row and leaves them out of what it answers.
- A package whose records restate what an earlier record still says to the fingerprint leaves that out too, until the
  earlier record is retired (wp2: an adoption upgraded from a guided design task says only what its own steps wrote).
  That is how an upgrade step moves no stamp of an old document without converting a stored stamp.
- The package's suite calls `assertStepsMoveNoStamp(p, records)` (`rc44-s0-readings.mjs`) with a document that holds
  its records: it writes each of the four keys on every record, as a step, a confirmation and the boundary's stamps
  do, and throws, naming the key and the record, when the design fingerprint or the design version stamp moves. A
  package that states the raw key and no statement fails it.
- Cost: the loop in `reviewSource` is on the route (it is part of wp2's route bytes). A statement runs at every read
  of the design source, so it must be cheap and must answer the same value for the same document.
- Case: block "J3 design statement"; the clash in block "7 idempotent and order-free".

**The packages a document names: `workspace.packages` (ruling D2).** A document says which packages have written into
it: their ids, sorted, under `workspace.packages`. A package does not write the key; the boundary does, when a command
of the package first writes (sent on its own, carried by a reviewed batch, applied by a merge) and when the package's
upgrade step changes the document. A project made from a template keeps the list with the records. A document no
package wrote into does not gain the key, and neither fingerprint reads it.
- *Server*, for a document that names a package this build does not register: `GET /api/project` works, answers
  `missingPackages: [ids]`, and stores no upgrade of the document. Every command (a built-in one too), every export
  (the registers, the SDD, the ARS, a chapter's register, the project whole), a freeze, an intake and a draft by Sol
  are refused with status 409, `code: 'missing_package'` and the words "This project holds records of a design
  package this build of AIW does not have (<ids>). It can be read here; a design this build cannot read in full is not
  changed, frozen or printed by it. Open the project with a build that has the package."
- *Browser*: `ensureExtensions` rejects with "Design package <id> did not load." when the document names a package
  that has no route stub `<id>-route`, when a package's module cannot be fetched, and when it throws while loading.
  At a read the page says "Your saved project could not be opened." with that sentence. At a save's answer the change
  is stored: the store goes to `behind` (not `error`), the caller is told "Saved, not shown yet. Design package <id>
  did not load.", the next save from that tab is refused in the same words, and nothing says another tab changed the
  project. Loading the latest project shows it.

**`upgrade(p)`, `upgradeNote`.** An idempotent step for documents written before the package. It answers `p` itself
when it has nothing to do (that is how "needs an upgrade" is read, on every read of a project, so the no-op path must
be cheap), and a **new** document when it changes something; it never changes the one it is handed. It works on a
document as stored, which may lack any chapter, and also on the output of the built-in upgrades. A stored row the step
changes is stored again on its next read, with a recovery point. `upgradeNote` is one sentence that says what the step
did; it follows the storage upgrade's own words in the project's activity, only for a document the step changed. The
records a step writes carry no author stamp.
- **A package's upgrade is stored by a read, not inside a command** (ruling J8). `upgradeDueRefusal(document)`
  (`design-extension-boundary.js`) answers the words for a row whose package upgrade is due; `worker.js` asks it on the
  stored document before it applies a command and answers 409 (a conflict to the browser, which offers the latest
  project). Nothing is stored; the read that follows stores the upgrade with its recovery point and its sentence in
  the activity. It is asked only where a read can store an upgrade (object storage is bound); without it a command
  goes on as before. **Known limits, as on rc.10.73.42:** the built-in read upgrades are still written by whichever
  request first stores the row; and a writing route that is not a command (intake, a draft by Sol, a baseline, an
  attachment, an operation, an organisation pin, a rename) still stores a due package upgrade with its own write
  (probed for a rename: 200, the upgrade stored, no recovery point). One place for those would be the one writer
  (`project-storage.js`), told by the reader that an upgrade was due; a blanket rule there also refuses writes that
  store no upgrade, so it needs a decision per route and is left to the lead (wp2 S1's notes, point 2).
- **A command that makes an upgrade due is not refused.** A design applied through the earlier path
  (`alternative.apply`) is written as an adoption by the step in that same commit: the row was up to date when the
  command arrived, and the commit is a design change with its journal.
- **Unstamped records in the SDD** (ruling J9): a record of a package's collection that carries no author stamp was
  written by an upgrade step or by a merge (ruling D12). The SDD counts it as that (`provenanceReading(p).by.upgrade`,
  a column and a line of their own in Appendix E, only in a document that holds one), never as written by a person.
  A built-in record without a stamp reads as it always did. Case: block "D5 SDD provenance".

**`sections`.** `{document, after, markdown(p)}`. `document` is `'registers'` (the working registers), `'sdd'` (the
architecture edition, every audience), `'ars'`, or `'chapter-1'` to `'chapter-10'` (that chapter's own register).
`after` is a heading line exactly as the document prints it (`'## Performance specification'`). The section stands at
the end of the section that heading opens, before the next heading of the same or a higher level; sections at one
anchor follow each other in id order. A section that answers no text is not printed, and neither is one whose anchor
the document or edition does not print. **A section stays inside the section it follows**: its text may print deeper
headings, and a heading at or above its anchor's level is refused with the package named (`placeSections` throws; the
document is not assembled). An anchor is a heading of the document as assembled: a heading one package prints is
never another's anchor. A heading inside a code fence is text. A package places a section; it does not replace
built-in text. Documents are assembled on the server only.

**`needs(p)`, `load()`.** Stated together, by the route stub. `needs` says whether a document holds the package's
records; it is asked at every read and every save and reads only the document. `load` loads the package. The project
store awaits `ensureExtensions(project)` where it reads a project and where a save answers, before the document is
settled and drawn; `ensureExtensions` takes the project as read (`{document, …}`) and answers it. The packages are
loaded one after another, so the package a failure names is the one that failed.

### Loading on the client (rulings A3, D7.6 and D10)

`load` is one dynamic import. Where it points decides the cost. Measured at S0 with a 30 KB example package and a stub
line of 90 to 97 B (scratch builds, not kept):

| How the package is held | Chapters route | Script files |
|---|---|---|
| Statically imported by an **existing lazy entry**, `load` imports that entry | +217 B for the first package (stub and the first use of `registerExtension`) | 148, unchanged |
| A lazy entry of its own that imports only the registry | +784 B | 150 (+2), and one more file under 10 KB |
| A lazy entry of its own that imports `record-graph.js` | +1,157 B | 150 (+2) |

- **A package is held in an existing lazy entry** (ruling A3). No package gets an entry of its own without a grant
  from the lead, given per package against a measurement.
- **From its first slice a package is held in the lazy entry its design names for its surface** (ruling D7.6; wp2:
  the chunk rooted at `public/architecture-task-ui.js`). The lead confirms the host entry at each package's first
  slice.

**What the chapters-route gate measures (ruling D10).** The gate is unchanged. It measures opening a document that
holds no package records. A document that holds a package's records also loads, before it is first drawn, the lazy
entry that holds the package. Each package reports that figure in its notes and in its size evidence under the field
**"opens with records"**: the code of the chapters route and of the static closure of the lazy entry its stub loads,
each script counted once. `opensWithRecords(metafile, entry, Object.keys(BUDGET.data))` (`rc44-s0-readings.mjs`)
answers it from the metafile of the same build as `{route, added, total, files}`; the suite holds its `route` to the
gate's own figure. S0's size file carries the field: no package exists, so every document opens as the gate
measures; for reference, the entry wp2's design names adds 79,189 B in 2 scripts today, before any package is in it.
At the close of wave 2 the lead decides whether the packages' readers move into one shared lazy entry.

### Route allowances (ruling A4 as amended by D9)

The cap of the chapters route is unchanged: 3,233,792 B. No gate is raised.

| | Chapters route |
|---|---|
| S0 shared registration | 900 B in all (measured: 898 B) |
| wp1 knowledge | 660 B |
| wp2 adoption | 600 B |
| wp3 workload | 600 B |
| wp9a deployment | 500 B |
| wp4, wp5, wp6, wp7, wp8, wp9b, wp9c | 1,683 B together (about 240 B each) |

4,031 B are left after S0, and the rows below S0 add up to 4,043 B: see "Where I see it differently". Script files:
148, unchanged. Before wave 5 the lead recovers headroom by moving on-route code that only one lazily loaded surface
uses off the route. A slice's evidence files go under `audit/rc44/evidence/` (ruling A7: the local exclude ignores
only the product's run-output folder); S0's size file stays in `audit/rc44/build-notes/`.

### What the registry does not carry

An extension only adds. These items of the four designs are not registration rows; each stays an edit of built-in code
by its package, inside the package's own allowance:

- **wp2:** the built-in emitter skipping a task that has `adoptionId`; `architectureSolutionsFor`,
  `acceptedObligation`, `design-task-state.js`, `design-questions.js`, `model-reversal.js`, `component-library.js`,
  `normaliseOption`; the "Alternatives considered" text and the "styles and patterns" list of the SDD (ruling D7.7:
  both are built-in text, which a section does not replace); the design fingerprint 3 conversion.
- **wp3:** the kernel moves and the branches in `desk-capacity.js`, `quality-analysis.js`,
  `architecture-analysis.js`; the new refusal in `review.objective`. `registerPerformanceSection` as designed
  **replaces** built-in text, which the registry does not do: place a section after `## Performance specification`, or
  change `performanceMarkdown` itself.
- **wp9a:** H1, H4, H5, H11 (a refusal inside `workspace.merge`), H13 to H16. H3, H6 to H10 and H12 are registration
  rows here.
- **wp1:** the changes inside `knowledge-governance.js` and `architecture-knowledge-unit.js`, and wrapping
  `applyKnowledgeCommand`. Its new `knowledge.*` types, the `concept` type, the pins' emitter, the list-11 finding and
  the Appendix E section are registration rows.

Deferred, with an owner (ruling A6):

- **A package's records in a chapter's "N records" count** (`chapter-records.js` reads `RECORD_COLLECTION_PATHS`) and
  **their types for relationships a person draws** (`recordTypes`: a connection a person draws to a package's record
  would read as a broken link). The first package whose records a person can connect states whether it needs them:
  wp2 S1.
- **Views.** No view knows a package's type or layer: there is no ink, icon or column for it. wp7 owns them. No
  browser suite was run for this slice, because no package exists to draw.

Limits of what is carried:

- **Staging of a built-in type.** The staged path cannot tell a built-in type that is not staged (`decision.accept`)
  from a package's type: the list of built-in types is the server's. A package that states such a type as staged is
  refused by the start check, not by construction. Dispatch (`POST /api/commands`) is by construction.
- **Evidence keys.** A package leaves only its own keys out of the design. An evidence key on a key the workbench
  keeps is refused by the start check (`WORKBENCH_KEYS`), not by construction: the design fingerprint has no list of
  built-in keys on the route.
- **What a package's functions do is the package's.** The tables are extended by construction (a built-in row always
  stands). `records`, `apply`, `upgrade` and `track` are code: the registry cannot stop one from writing a built-in
  key, stating a relation between built-in records or adding a record of a built-in type. The start check reads what
  a package states, not what its functions do; the helpers above, the package's own suite and its review cover that.
- **A provenance block** (`payload.provenance` with `source`, `citations` or `basis`) on a package's command is
  refused: the table of types that take one is built in.
- **The browser stages only what it has loaded.** A package's staged command previews on the client once the package
  is loaded, which is where its surface lives.
- **Routes other than commands and exports.** See open question 2.

### Proving the old-document rule in a package's suite

`rc44-s0-readings.mjs` gives the ten readings as text (`readings(p)`) and as SHA-256 (`digests(p)`) for
`REFERENCES` (`bank-payment`, `clinic-appointments`, `parcel-lockers`): graph, connected model, trails and spines,
findings with stamps, fingerprints, readiness, provenance, registers, SDD, ARS; and `reviewListDocument()`, a document
whose review list is not empty, which no reference is. Capture the goldens from an unchanged checkout of the slice's
base: `node rc44-s0-readings.mjs --capture <sha> > rc44-<slice>-baseline.json`. Then compare with the package
registered. Do not reuse S0's golden file once built-in behaviour has moved. With the package's records in a
document, call `assertBuiltInTrailsUnchanged(base, withRecords)` and `assertFindingIdsUnique(p)`.

### A minimal worked example

This package was run against the registry as it stands here (conformance, save through `POST /api/commands`, the
trail, the finding, the author refused, an agent's record refused until a person confirms it, a second person
accepted, the stored step read back, a template copy, retire); it is not in the repository.

```js
// public/example-notes.js — registered by a line in design-packages.js (server) and held in an existing lazy entry (browser)
import {registerExtension} from './design-extensions.js';
import {verifierRefusal} from './architecture-obligations.js';
const notes = p => p.notes?.records || [];
function applyNote(p, command, at, actor, options) {
  const raw = command.payload || {}, s = p.notes ??= {version: 0, counter: 0, records: []};   // the key is created when first written
  const find = () => { const r = s.records.find(x => x.id === raw.id); if (!r) throw Error('Choose a design note.'); return r; };
  if (command.type === 'note.save') {
    if (typeof raw.title !== 'string' || !raw.title.trim()) throw Error('Name the design note.');
    let r = raw.id ? find() : null;
    if (!r) { r = {id: 'NOTE-' + String(++s.counter).padStart(3, '0'), revision: 0, history: []}; r.ref = r.id; s.records.push(r); }
    Object.assign(r, {title: raw.title.trim(), requirementIds: Array.isArray(raw.requirementIds) ? raw.requirementIds : [], componentId: raw.componentId || '', revision: r.revision + 1, actor});
    r.history.push({revision: r.revision, actor, at});   // who wrote each revision: what the second-person rule reads
    s.version++; return {document: p, selected: r.id};
  }
  // A person confirms the note as it reads: the boundary stamps who confirmed (provenance.reviewed).
  if (command.type === 'note.confirm') { const r = find(); r.confirmed = true; s.version++; return {document: p, selected: r.id}; }
  // The step keeps who took it and with what kind of account, as the boundary hands them to apply.
  // It is kept under `review`: a project made from a template resets that key, and the stamps of who wrote the note stay.
  if (command.type === 'note.accept') { const r = find(); r.review = {actor, at, revision: r.revision, account: options?.author?.account ?? null}; s.version++; return {document: p, selected: r.id}; }
  throw Error('Unknown note action.');
}
// At read time: the stored acceptance is a person's, of the current revision, and independent by the one rule.
export const noteAccepted = r => !!r.review && r.review.revision === r.revision && r.review.account === 'person' && !verifierRefusal(r, r.review.actor, r.review.account);
registerExtension({
  id: 'example-notes',
  objectTypes: {note: {label: 'Design note', chapter: 3, level: 'intent', prefix: 'NOTE'}},
  records(p, add, rel) {
    for (const r of notes(p)) {
      add(r, 'note', 'notes.records.' + r.id);
      for (const id of r.requirementIds || []) rel('fulfils', id, r.id, {source: 'notes.records.requirementIds'});
      if (r.componentId) rel('annotates', r.id, r.componentId, {source: 'notes.records.componentId'});
    }
  },
  layers: {note: 'note'},
  hops: [{layer: 'note', types: ['fulfils'], from: ['requirement'], dir: 'out', ctx: false},
         {layer: 'note', types: ['annotates'], from: ['component'], dir: 'in', ctx: true}],
  checks: {3: p => notes(p).filter(r => !noteAccepted(r)).map(r => ({id: 'note-unaccepted:' + r.id, code: 'note-unaccepted', title: 'Have the design note accepted', detail: r.id + ' is not accepted by a second person at its current revision.', level: 'warning', objectId: r.id}))},
  commands: {
    'note.save': {apply: applyNote, staged: true},
    'note.confirm': {apply: applyNote, person: true},
    'note.accept': {apply: applyNote, second: (p, command) => notes(p).find(r => r.id === command.payload?.id) || null}
  },
  lifecycle: {'notes.records': 3},
  provenance: {nouns: {'notes.records': 'design note'}, paths: {note: ['notes.records']}},   // a second type states its collection
  designKeys: ['notes']
});
```

The two lines outside the package: in `design-packages.js` (server), an import of `./public/example-notes.js`; in
`public/design-package-routes.js` (browser), with `registerExtension` imported from `design-extensions.js`:

```js
registerExtension({id: 'example-notes-route', needs: p => !!p.notes, load: () => import(<the lazy entry that imports example-notes.js>)});
```

With that: `NOTE-001` is in `recordGraph(p)` and the connected model; `requirementTrace(p, requirementId).layers.note`
holds it; `linkedVia(p, 'NOTE-001', 'annotates')` is its component; Chapter 3's checks hold `note-unaccepted:NOTE-001`;
the document names `example-notes` under `workspace.packages`; `note.accept` by its author answers "A second signed-in
person, who did not write or own the action, verifies it. architect-a wrote NOTE-001."; `note.accept` on a note only
an agent account wrote answers "A second person's step needs two persons: …" until a person confirms the note; by
another person it is recorded with `account: 'person'`, `noteAccepted` reads it, the finding is gone and the note's
author stamp is still its writer's; in a project made from this one as a template the acceptance is gone and the
finding is back; `record.retire` retires the note.

## Deviations from the contract, the rulings and the designs

1. **`ensureExtensions(project)` takes the project as read (`{document, …}`) and answers it**, where the contract
   writes `ensureExtensions(p)`. It saves about 25 B on the route, and the store no longer holds a saved document it
   has not yet loaded the packages for.
2. **Parts beyond the contract's table**, each asked for by a hook list of the four designs: `provenance.records`
   (wp2: adoption records read by provenance, not retired by the family), `upgradeNote` (wp3: the clause in the
   storage upgrade's activity), `chapter-n` documents for `sections` (wp9a H12, wp3's register), `large` (wp3) and
   `track` (wp2, wp3). `validate` is in the contract's row; here it is a function of its own only for what the handler
   is not told inside a batch (the commit's author), and every other refusal is the handler's, as in built-in commands.
3. **A package's layers stand after the built-in ones**, where wp3 writes its layers between built-in ones
   (`… 'driver', 'service', 'workload', 'objective', 'decision' …`). Its hops are all context hops from built-in layers
   and from its own earlier layer, so they work unchanged; only the listed order differs.
4. **First registration under an id stands.** The route stub has its own id (`<id>-route`).
5. **Chapter findings lists are named by their chapter number** in `sharedList` (they were named by strings such as
   `'decisions:findings'`), so that one place adds the packages' findings for every reader.
6. **The review's own list** (`inheritedSupplement`) is kept by `sharedList` as list 11 and is the one statement of
   that list, where it was written out twice.
7. `RECORD_NOUNS` and `COLLECTIONS` are no longer frozen: they are the tables the packages' rows join. Nothing read
   their frozenness.

From the fix-up:

8. **Ruling D4, one way:** the per-type `track` is folded into the package's tracker and is no longer a part of a
   command (the start check names it).
9. **Ruling D2 is held on more routes than it names:** besides every command and every export, a freeze, an intake, a
   draft by Sol and the storage upgrade are refused or skipped; the export of the project whole and the delivery
   exchange are refused with the documents. It is not held on the routes listed under open question 2.
10. **Ruling D1, one addition:** a stamp made before the project was restored here does not count as a person behind
    the record, as a restored review does not count in rc.10.73.42. The ruling does not say so.
11. **Should-fix 6, a finding id two findings share:** not refused at start (the ids are known only from a document);
    refused when treated, and caught by the helper in the package's suite.
12. **Should-fix 11:** refused at start instead of fixed in `record-lifecycle.js`, as D6.11 allows (no route bytes).
13. **Ruling D7.2 is the contract and a helper, not a refusal:** `add` with a built-in type that stands on a built-in
    layer is not refused by the emitter (that would cost route bytes S0 does not have); `assertBuiltInTrailsUnchanged`
    catches it in the package's suite.
14. **Should-fix 8 as built:** the skip holds for every layer, the built-in ones too, and reads the layer a record
    stands on; the context layer is always read. A package layer over a built-in type of Chapter 1 is refused at start.
15. **An existing surface's words changed:** the header of a tab that is behind (see "What later slices must know",
    7). No existing suite asserts the old words; `dialog-validate.mjs` and `studio-dialog-browser-validate.mjs` assert
    the refusal for another tab's save, which is unchanged.
16. **Trims of S0's own route code** that paid for should-fix 8 and 10: the store keeps one variable for a saved
    answer, the review's list has one name (`evidenceRaw` is gone), the emitter's guard is `||`, the registry's
    words are shorter.

No assertion of a suite that exists on `94dbd4f` was deleted, loosened or replaced. The three assertions replaced in
the slice's own suite are listed under "Fix-up".

## Measurements

Baseline built from an archive of `94dbd4f` (`node build.mjs`): chapters route 3,228,863 B, projects route 506,102 B,
148 script files, 53 under 10 KB, stylesheet 901,873 B.

| | Baseline | S0 as built (`5c5aef9`) | S0 after the fix-up | Cap |
|---|---|---|---|---|
| Chapters route (code) | 3,228,863 B | 3,229,549 B (+686) | 3,229,761 B (**+898 B**, allowance 900) | 3,233,792 B (unchanged; 4,031 B left) |
| Projects route (code) | 506,102 B | 506,599 B (+497) | 506,802 B (+700) | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 53 | 61 (unchanged) |
| Files from 10 to 50 KB, over 50 KB | — | 50, 45 | 50, 45 | — |
| Stylesheet | 901,873 B | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| The registry module | — | 265 B | 400 B | — |

The route, commit by commit of the fix-up (each an archive of the commit, built and measured as `build.mjs` does):

| After | Chapters route over the baseline |
|---|---|
| Must-fix 1, 3, 4, 5 and the server part of 2 (all server-side) | 686 B |
| The client part of D2 | 899 B (+213) |
| Rulings A1 and D11 | 880 B (−19: what A1 frees) |
| Should-fix 1 to 7, 9, 11 and D7.5 (should-fix 7 is the only one on the route) | 885 B (+5) |
| Should-fix 10 and 8, with the trims of deviation 16 | 898 B (+13 net; the walk's skip is +39 B in `trace-kernel.js`) |
| Head | 898 B |

`audit/rc44/build-notes/s0-size.json` holds the same figures and the field "opens with records";
`node rc44-s0-extensions-validate.mjs --measure` rewrites it from the build and `AIW_S0_MEASURE=1` makes the suite
compare its own build with it.

## Suites

`rc44-s0-extensions-validate.mjs`: 22 blocks, all green, also with `AIW_S0_MEASURE=1` (its own build is what the
size evidence says). On the baseline tree only block 6a passes ("the registration point exists" fails the rest). On
the builder's head `5c5aef9` the suite as it now stands passes six blocks (6a, 6b, only adds, 4, 5, needs and load)
and fails sixteen, each on a case of the fix-up.

After the fix-up, on the head as built (2026-11-18, two suites at a time, the machine shared):
- **193 existing suites** (every suite of `package.json` whose file imports `worker.js`, `review-domain.js`,
  `record-graph.js`, `trace-kernel.js`, `sdd-architecture.js`, `project-store.js`, `project-lifecycle.js`,
  `workspace-ux.js` or a registry module, but for four browser suites and `scale`; with the 84 the reviewer ran):
  178 green. 15 red,
  each run again alone and failing with the line recorded for the baseline in
  `audit/rc42/regression-2026-11-16.json`: `architecture-ui`, `brain-ahead`, `brain-companion`, `brain-reasoning`,
  `chapter-reasoning`, `command-equivalence`, `composition-ui`, `design-concern`, `intelligence`, `intelligence-ui`,
  `knowledge`, `round27-model`, `security-task-ui`, `sol-disclosure`, `stewardship`. `requirements` failed once in
  the batch on a timer of a tooltip (`innerWidth is not defined`, a file this slice does not touch; the record marks
  it failed at the baseline and passed later) and passes alone.
- **Browser, against the built client:** `studio-dialog-browser` (a tab behind another tab's save), `action-undo-ui`,
  `lifecycle-browser`, `sdd-authoring-browser`: green.
- `node check-syntax.mjs` passes (911 modules). Lint: 162 problems, baseline 162, 0 new. `node build.mjs` builds with
  no size violation.
- `test:scale` was not run (15 minutes, red at the baseline for this machine's speed), and no full regression (the
  lead runs it).

## Open questions (for the lead)

The rulings of 2026-11-18 answered the eight questions of the first build (a package's own lazy entry: A3; `hard`:
A1 and D11; the second-person sentence: A5; record counts and views: A6; ids and layers: D8; headroom: A4 and D9;
the `evidence/` folder: A7; comments and source scanners: A8). What is open now:

1. **The allowances add up to 12 B more than is left** (4,043 B promised, 4,031 B left). Which row gives?
2. **Routes that still write a document that names a missing package:** `/api/lifecycle` (rename, archive, restore,
   template flag), `/api/reviews`, `/api/attachments`, the knowledge repository (notices, sync, transfer),
   `/api/organizations` (catalogue, pins), `/api/operations` (policy, source sync). Rename and archive do not touch
   the design; the knowledge and organisation routes do. Refuse them all at one place (every non-GET project route
   except access and recovery), or only those that change the design?
3. **Ruling D12 stands open and is the lead's** (wave 2): until a merge stamps what it writes, a second person's step
   on a merged record needs a person's change or confirmation first. The same holds for records an upgrade step or a
   template copy wrote.
4. **`workspace.packages` only grows.** A document whose package records are all retired still names the package and
   cannot be changed by a build without it. Is a way to un-name a package wanted, and whose step is it?
5. **`FD`** (see "What later slices must know", 8): wp9a's failure-domain ids beside the functional drivers' codes.
6. **A project made from a template** resets a person's steps by key name ("What later slices must know", 10). The
   contract tells a package to keep its step under `review`; nothing stops a package from keeping it elsewhere, and
   then an acceptance travels into the copy. Should the reset clear by construction whatever a `person` or `second`
   command writes (a registration row), and should the author stamps of a template's records count as "a person
   behind the record" in the copy (they do today, for built-in records too)?
