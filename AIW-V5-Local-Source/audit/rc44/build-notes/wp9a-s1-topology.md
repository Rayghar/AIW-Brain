# rc44 wp9a slice 1: typed failure domains, nodes and registration — build notes

Branch `rc44/wp9a-s1-topology-c2` (continues `rc44/wp9a-s1-topology`, which a usage limit cut off after the fixture and
an unrun suite), from the integrated base `9673661` (S0 and wp1 S1 merged).
Design: `audit/rc44/design/wp9a-deployment.md` (sections a to f, Slice 1 under g, b.4, d.3).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"), the rulings of 2026-11-18 (A to J).
Package id `p30-deployment`, route stub `p30-deployment-route` (ruling D8). Host entry: `public/deploy-view.js`
(design d.3, ruling A3). `productionAccepted` stays false. No external authority is involved in this slice: nothing
here is approved, accepted, released or promoted.

## State

- **Done:** the package (one part of five filled), its registration lines, the route stub, hook H1, the suite
  (12 blocks, green), the fixture, a browser case for the route stub, the size evidence, these notes.
- **In progress:** nothing.
- **Next:** see "Next, by slice" and "Open questions (for the lead)".

## Fix-up (after the adversarial review; the lead's rulings L1 to L11, K1, K2 and K6)

Branch `rc44/wp9a-s1-topology-fix-c2` (continues `rc44/wp9a-s1-topology-fix`, cut off after item 0), from the slice's
head `1acb341`. Review: `/home/user/hb-review/rc44-build/wp9a-s1-topology.review.json`. Each item: case first, seen to
fail on the head the item started from, then the change. One line per item; details under the item's heading below.

**In progress / next:** see the item list; an item not marked done is not started.

- **Item 0, merge `rc44/wp2-s1-lead`:** done (`317fd8f`; conflicts in `design-packages.js`, `public/design-package-routes.js`
  and `package.json` kept both packages' lines in id order with one import of `registerExtension`, every test script).
  The four rc44 suites on the merged head: S0 23 of 24 (block `D3 workbench keys`, the assertion L10 names), wp1 34 of
  34, wp2 green, wp9a 12 of 12 (S1.11 holds `upgrade` refused, which L10 reverses: item 1).
- **Item 1, L10 first part:** done. S0's suite: block `D3 workbench keys`, the allowed-keys example uses
  `runtime.stations` and `technology.vaults` (old: `runtime.nodes`, `technology.domains`, now p30's collections) and
  asserts first that no package of the build states them; the loop after it still refuses every build collection to
  another package. `assembleParts` carries `design` and `prefixes` as tables and `upgrade` chained in the parts'
  order with `upgradeNote` one part's; case S1.11 (seen to fail: "a part states “design”, which the assembly does not
  carry"; old -> new: "a part that states `upgrade` is refused" -> "`upgrade` is carried, `needs` is refused").

- **Item 2, L1 (must-fix 1; concern 1):** done. `authorship.js` `refuseUnreviewable`: record.keep from an agent
  account, a draft by Sol or an import is refused (400, code `authorship`, "A signed-in person keeps a proposal: …";
  no command type named), alone and as a command any change carries (`payload.commands`, `payload.command`), at any
  depth up to 8, for every record, built in or a package's. A person's keep is taken as today (a built-in need is
  stamped as the person's author from AIW's words, as on rc.10.73.42; a package's record `reviewed.how 'kept'`).
  The package binds a record of AIW's or Sol's words that is no proposal only with a person's stamp behind it
  (`authoredRecord`): a keep that stamps nobody (inside a merged alternative, ruling D12) binds nothing. Cases: S0's
  new block `L1 keep is a person's step` (built-in seeded needs; seen to fail: the agent's keep answered 200) and
  S1.12 (a node Sol drafted and a domain AIW proposed; seen to fail: 200). Replaced: S1.5 "the handler's keep alone
  binds" -> "it binds once the person's stamp the server writes stands; unstamped it is refused". Suites that send
  record.keep through the server were run: see "Suites" under the fix-up.
- **Item 3, L2 (must-fix 2 and 4; concern 4):** done. One reader `hostingComparison(p, environmentId)` in
  `public/topology-domain.js` (`mixed`, `nested`, `not-standing`), and Chapter 10's error `topology-incomparable:<env>`
  (`hard`, a `checks` row of the package: no route bytes) naming the zones and what a person does. Case S1.13 (seen to
  fail: with zone 1 typed and zone 2 named, neither the six findings nor an error stood): the reviewer's walk holds
  in every state; (b) and four forms of (c); an untyped project gains nothing; a shared stated cause still reads as
  independent, marked for slice 2 to flip. Retirement list: two rows added (shared cause: slice 2; parent and child:
  slice 2 extends the reader). Replaced: S1.11 "the package states no check" -> "one check, Chapter 10's".
- **Item 4, L3 (must-fix 3; should-fix 3 and 4):** done. The tracker mends, at the end of every commit, every zone
  and placement of the document that names a node or a failure domain that is not standing (absent, retired, a
  proposal, no person's) and journals what it drops each time; the version gate before it is gone. A zone or
  placement the commit made has its location journalled. For the package's own collections the lifecycle refuses:
  S0 gains the row `canRestore {path: (p, record) => void}` (own lifecycle collections only; start-checked; read in
  `record-lifecycle.js` beside a chapter's own rule); a node is not restored while its parent or its failure domain
  is not standing, nor deeper than 8, a domain not while its parent is not there, nor deeper than 6. Case S1.14 (seen
  to fail: after the reviewer's batch zone 2 still named `dn-001` and `fd-001`), by a person and by an agent account;
  S0's block "L3 restore rule". Replaced: S1.11's key list gains `canRestore`.
- **Item 5, L4 (must-fix 5; concern 2):** done. `runtime.locate` on a placement answers the placement as `selected`
  (the record it wrote), so a batch restamps it as the commit's. Case S1.15 (seen to fail: alone the answer was the
  plan `run-001`): alone, in the agent's batch (placement and zone restamped `sol-draft`), and a merged alternative
  that relocates both leaves their earlier stamps, held as the known limit of ruling D12. Replaced: S1.2 and S1.6
  "selected is the plan (I.apiPlan)" -> "selected is the placement".
- **Item 6, L5, L6, L7 (should-fix 1, 2 and 6; concern 4 in part):** done (branch `rc44/wp9a-s1-topology-fix-c3`, which
  continues `-fix-c2`, cut off after item 5). Cases first, all five seen to fail on `afaf616` (`b118f90`).
  - L5: the marker is stated through S0's design row (`design {'runtime.topology': typed ? {schemaVersion} : nothing}`),
    `review` left out; the evidence key is gone. S0's row took a key of the document only, so it now also takes
    `chapter.key` for a new key of a chapter's container (`review-domain.js reviewSource`, 64 B on the route; the start
    check and S0's block "J3 design statement", old -> new recorded there and in S0's notes). A step older than
    `finalReview.imported.at` is nobody's (`chosenHere`), as a template copy's (review null) is: in both the four
    topology commands are refused ("The topology of this project is typed, but nobody here has chosen it yet. A
    signed-in person chooses typed topology for this project first."), the readings stay typed, and the step taken
    there moves no stamp and no version and is journalled. Cases: S1.16 (the hand-made pair at one version gives two
    stamps; the recovered project), S1.0 (the copy). Replaced: S1.0 "the copy takes topology commands" -> "refused in
    the copy until a person there takes the step; then taken"; S1.0 "[evidenceKeys, designKeys] = [['runtime.topology'],
    [...]]" -> "no evidence key; designKeys and the design row name the marker and both collections"; S1.11's key list
    `evidenceKeys` -> `design`.
  - L6: the statements of `technology.domains` and `runtime.nodes` hold each record that is no proposal, without its
    history, review, confirmed and provenance (S0's rule for every package; S1.16 calls `assertStepsMoveNoStamp`); a
    document with only proposals reads as one without the key. A save that leaves its record a proposal moves no version
    and clears no check or handoff. A failure domain's id now comes from Chapter 10's counters (`runtime.counters.domain`,
    which the design fingerprint does not read; `technology.counters` it reads), so the generator and a draft move no
    counter the fingerprint reads. Cases: S1.4 (the generator; a keep moves the stamp and the version), S1.8 (a node Sol
    drafted, a domain the agent drafted, the agent's batch; the keep), S1.16. Replaced: S1.4 "the records are design:
    the design fingerprint reads them" (stamp moves) -> "AIW's proposals move no design stamp and no evidence stamp;
    keeping one moves the stamp and the version"; S1.8 "the chapter's check is null after the draft" -> "the check a
    person ran stands"; S1.2 and S1.5 `technology.counters.domain` -> `runtime.counters.domain` (S1.2 also asserts
    `technology.counters` holds no `domain`), S1.3 adds `runtime.counters` holds no `domain`.
    Found, not changed: a reviewed batch keeps its receipt in `workbench.history`, which the design fingerprint reads
    for every batch on rc.10.73.42, so a batch of proposals moves the design stamp by its receipt; S1.8 holds that
    beside the receipt the design source is what it was, and no version or check moves.
  - L7: `simulateRuntime` (H4) reads `failureDomainKey` first and the name as before (`dk`): the "lose a failure
    domain" grouping, its refusal and its Failover test; `deploy-model.js` (H15) keys each zone the same way (`key`) in
    `r.domains`, `domainsOf`, `fallbackSimulation` and `deployInsights`, and `deploy-view.js` compares a plan's domains by
    that key. A placeholder name groups as before (it does not turn independent). Note: `deploy-model.js` is on the
    chapters route, not in the lazy entry as L7 says (it is imported by `chapter-reasoning.js`); the change saves 5 B there,
    `simulateRuntime` 10 B. The layout's bracket (`deploy-layout.js`) still groups adjacent columns by the zone's domain
    words: slice 6 (H12, R1). Case S1.17 (seen to fail: losing zone 1's typed domain lost zone 1 only).
    `deploy`, `runtime`, `rc42-g5-runtime`, `chapter-lines`, `not-stated`, `wire-merge` pass unchanged.

## What was built

| File | Where it runs | What it is |
|---|---|---|
| `public/topology.js` | server; browser in the lazy chunk of `deploy-view.js` | Assembles the package's parts into the one registration (`assembleParts`) and registers `p30-deployment`. |
| `public/topology-domain.js` | same | Slice 1's part: the marker, failure domains, deployment nodes, where a zone and a placement stand, AIW's proposals, the emitter, the tracker, the strict prefix reader. |
| `public/topology-failures.js`, `-gates.js`, `-blueprints.js`, `-fallback.js` | same | The other four parts, each an empty object with a header that names its slice. A later slice fills its own file and edits no other file of the package. |
| `design-packages.js` | server | One line: the import of `public/topology.js`. |
| `public/design-package-routes.js` | route | The import of `registerExtension` (the first package to merge brings it) and the route stub. |
| `public/deploy-view.js` | lazy entry | One line: the import of `topology.js`. |
| `public/runtime-model.js` | route | H1: `failureDomainKey` answers a zone's first typed domain, else its name as before (21 B). |
| `rc44-wp9a-deployment-validate.mjs`, `rc44-wp9a-deployment-fixtures.mjs` | suite | Registered as `test:rc44-wp9a-deployment`. One section per slice; slices 2 to 6 have a placeholder comment. |
| `rc44-wp9a-deployment-browser-validate.mjs` | browser suite | Registered as `test:rc44-wp9a-deployment-browser`. One case for slice 1 (the route stub); slice 6 adds the surface's. Needs the built client. |
| `audit/rc44/evidence/wp9a-s1-size.json` | evidence | The route measurement, itemised, with "opens with records". |

How each design hook is carried:

| Design hook | Carried as |
|---|---|
| H1 `failureDomainKey` reads the zone's typed hosting domain first | an edit of built-in code (`public/runtime-model.js`), on the route |
| H3 findings | the `checks` row, when a slice first raises a finding. Slice 1 raises none and states no `checks` (ruling J7) |
| H6 lifecycle, H7 provenance | registration rows (`lifecycle`, `provenance.nouns`, `provenance.paths`) |
| H8 staging | registration row (`commands[type].staged`) |
| H9 object types, collections, relations, trace layers and hops | registration rows (`objectTypes`, `records`, `layers`, `hops`) |
| the `TOPOLOGY` slot of H1 | not added: no built-in code calls into the package |

Commands of slice 1 (the others of design section c wait for the slice that builds their readers, ruling J6):

| Type | Who | What |
|---|---|---|
| `runtime.topology-start` | `person` | Writes the marker `runtime.topology {schemaVersion, review: {actor, at, account}}`. Every other topology command is refused without it. Idempotent once a person here has taken it. |
| `technology.domain` | staged; `validate` | Saves a failure domain `fd-NNN` / `FD-NNN` as a patch. |
| `technology.domain-proposals` | any signed-in sender; not staged | One proposal for each name in use. Binds nothing, moves no version, journals nothing. |
| `runtime.node` | staged; `validate` | Saves a deployment node `dn-NNN` / `DN-NNN` as a patch. |
| `runtime.locate` | staged | Where a zone stands (`nodeId`, `domainIds`, `reason`) or a placement (`nodeId`). |

Person-only and second-person steps (rulings D1, D7.1, F3, F4): the slice has one person-only step,
`runtime.topology-start`, stated as `person` on the command; the package writes no check of its own. Who took it is
kept under the marker's key `review`, which a copy from a template clears: the copy stays typed and a person takes
the step there. The slice has no second-person step, so it names no confirming step (F4) and states no
`provenance.paths` for one. No finding is `hard` (A1): the slice raises no finding.

## Decisions taken while building, each with its case

1. **A proposal binds nothing and is read by nothing.** A zone, a placement and a node name only a failure domain or
   node a person wrote or kept; only the tree link (`parentId`) may name a proposal, so that a drafted tree can
   stand. The emitter leaves a proposal out of the record graph and ends a chain at one. Cases S1.5, S1.8.
2. **A draft says it is a draft.** A draft by Sol and an agent account send `runtime.node` and `technology.domain`
   with `origin: 'sol-draft'`, and the record arrives proposed. The handler is not told the author inside a batch, so
   the refusal of a draft that does not say so is the type's `validate`, which the boundary asks for every command a
   request carries. A draft names no jurisdiction (design d.5). Case S1.8.
3. **The marker is bookkeeping; choosing it is a change of Chapter 10.** `evidenceKeys: ['runtime.topology']` (an
   object, which neither fingerprint reads); the first choice moves `runtime.version`, so the design stamp moves; a
   step taken again in a copy moves no stamp and no version (ruling J3, on this base, without a row of S0). Case S1.0.
   No command takes the marker back, as a document's list of packages only grows (ruling F5).
4. **AIW's proposals move no version of Chapter 6**, so the check of Chapter 10 stays current (design case 4). The
   records are design all the same: the design fingerprint reads `technology.domains`. Case S1.4.
5. **The journal.** The built-in trackers journal four record kinds; a zone's save is not journalled at the baseline.
   The package's tracker journals each node and failure domain a commit made or changed, where a zone or a placement
   stands, and the step that types the project: one change each, with the record as its source, what it said before
   and after, no affected records and the reason why no review is opened. The server stamps who sent it (ruling J5).
   AIW's own proposals, a keep, a retirement and a restore are not journalled as changes. Cases S1.0, S1.6, S1.8.
6. **A restored zone or placement names nothing that left the design meanwhile.** While a zone is retired nothing
   holds the node and the domain it names, so they can be retired; restored as it left, the zone would read as
   standing in a failure domain that is not there (an independent one to every reader). The tracker drops such names
   in the same commit, moves the record's revision and journals it; the zone reads by its own name again. Case S1.6.
   A lifecycle rule would refuse the restore instead ("restore FD-006 first"), but the registry carries no lifecycle
   rule for a built-in collection: see open question 4.
7. **A zone and a node fail with each domain their domain lies in** (`failsWith`, derived by way of the parents), as
   a zone sits in each node its node lies in. So "what a lost region takes with it" is one hop of the graph
   (`linkedVia(p, domainId, 'failsWith', 'in')`), which design d.4 asks of the evaluators. Case S1.7.
8. **The layers `node` and `domain` are on the requirement's own chain** (`ctx: false`), after the built-in layers.
   A hop onto `node` comes from `zone` and `placement`, a hop onto `domain` from `zone` and `node`. Neither layer
   holds a built-in type, so no hop states `only` (ruling D6 does not apply). Case S1.7 with
   `assertBuiltInTrailsUnchanged`.
9. **The handler works on the copy it is handed** and imports only what the route already exports: importing
   `withRuntime` and Chapter 6's `isProposed` cost the route an export each (18 B). Case S1.10.
10. **Bounds in the package's own words.** `patchLinks` (`public/technology-domain.js`) names its limit through a
    function that module does not define (see open question 5), so the package checks its two link bounds itself.

## Deviations from the design, the task and the contract

1. **H3 is a `checks` row, not an edit of `runtime-domain.js`**, and slice 1 states none. The task text names "H3's
   Chapter 10 half" among the edits of built-in code; the S0 contract lists H3 as a registration row, and the
   contract overrides the hook list. With no finding raised in this slice (ruling J7) there is nothing to register.
2. **The marker is `{schemaVersion, review: {actor, at, account}}`**, not `{schemaVersion, since, by}` (design b.1):
   a person's step is kept under `review` (ruling F3).
3. **`independence` is not stored on a failure domain** until the slice that records evidence for it
   (`technology.domain-evidence`); an absent value reads as declared. No reader or writer exists before then (J6).
4. **`topologyReading`, `zoneDomains`, `zoneJurisdiction`, `scopeOf` and `topologyGuidance`** (design d.1) are not
   exported yet: no case of slice 1 reads them. The slice that first needs one adds it to `topology-domain.js`.
5. **`register(part)`, `TOPOLOGY_COMMANDS` and `PERSON_ONLY`** (design d.1) are replaced by `assembleParts` and the
   one registration: the registry takes the first registration under an id, so the parts are assembled before it.
6. **No `withRuntime` at the head of the handler** (design c.1): the handler works on the copy it is handed, as the
   contract says, and refuses a document without Chapters 6 and 10.
7. **Derived `failsWith`** (decision 7) is an addition to design d.4.
8. **A journal change for a located zone and placement** (decision 5) is an addition: design c.1 took the journal to
   be written at the boundary for every command, which it is not.
9. **The mending of a restored zone or placement** (decision 6) is an addition.
10. **A name longer than 160 characters is not proposed** as a failure domain: a capability's failure-domain text may
    hold 4,000 characters, and a domain's name 160.
11. **The browser suite exists from slice 1** (design g creates it with slice 6): the route stub is in front of
    every project from this slice on, so its one case is held now. Slice 6 adds its cases to the same file.
12. **The route:** 249 B measured against the base alone, where the task asks for well under half of 500 B. 139 B are
    the package's own; 110 B are the registry's `registerExtension` joining the route with the first package that
    registers a stub (see "Measurements").

No assertion of a suite that exists on `94dbd4f` was deleted, loosened or replaced.

## Retirement list (ruling J6: no second truth beside an earlier path)

The typed binding (`zone.domainIds`) and its one reader (`failureDomainKey`, D8's reading) are in this slice because
design case 2 asks for them. Every reader that reads D8's key reads the typed domain: Chapter 10's `single-domain`,
`standby` and `backup-domain`, `planFacts`, the desk's sizing, vitals and fixes. These earlier readers do not read
D8's key and read a zone's failure domain by its name until their slice moves them:

| Earlier reader | Where | Retired by |
|---|---|---|
| The walkthrough's "lose a failure domain" grouping, and its Failover test for a named domain | `public/runtime-domain.js` `simulateRuntime` | slice 2 (H4) |
| The Chapter 10 Model view's private failure-domain key and its second propagation | `public/deploy-model.js` | slice 6 (H15, R1, R5, R6) |
| The desk's region guess from words in the name | `public/desk-capacity.js` | slice 6 (H13, R2) |
| Chapter 6's three string comparisons of a capability's domains | `public/technology-domain.js` | slice 5 (H14, R3, R4); no capability is typed before it |
| The zone's attribute "Domain" in the model projection (the name as words) | `public/runtime-model.js` `runtimeProjection` | slice 6 with the surface |
| Two zones that share a stated cause (`domainIds` after the first) read as independent in the built-in checks (`single-domain`, `standby`, `backup-domain`), `planFacts` and the desk: they compare the hosting domain only | `public/runtime-domain.js`, `public/design-reasoning.js`, the desk | slice 2 (the finding for a shared cause, evaluated over the ancestors); case S1.13 holds today's reading, marked "SLICE 2 FLIPS THIS" (ruling L2) |
| A zone in a domain inside another zone's hosting domain (parent and child) is not compared at all: the package's error `topology-incomparable` stands instead (ruling L2 (b)) until a reader evaluates over the ancestors | `public/topology-domain.js` `hostingComparison` | slice 2 extends `hostingComparison` to compare over the ancestors; the error stays until then |
| The Chapter 10 register prints the zones by name ("AZ-1", "AZ-2") beside the finding that they share one failure domain; no register, SDD or ARS prints an FD or DN reference (ruling L9) | `public/runtime-domain.js` register, `public/sdd-architecture.js` | slice 6 (H12, the typed location printed) |

Until slice 6 no surface offers the topology commands, so a document is typed only through the command route.
Between this slice and slices 2 and 6 such a document reads a typed zone as its typed domain in the checks and at
the desk, and by its name in the three readers above. See open question 2.

Nothing is printed of the typed topology yet: the records are in the document, the record graph, the journal and the
SDD's counts of who wrote the records, and in no register, SDD or ARS section until slice 6 (H12, a `sections` row).

What asks a person to act on a proposal today: the review plan plans "Keep or dismiss N proposals Sol's draft made in
Chapter 6 / 10" for the nodes and failure domains a draft sent (it reads every record collection; case S1.8). It does
not plan AIW's own proposals of the package: its step for those reads the built-in seeds only
(`runtime-domain.js` `seededRecords`). They are counted by the SDD ("proposed by AIW") and raise no finding until
slice 6 brings the surface that offers Keep and Retire (ruling J7). See open question 8.

## Next, by slice

- **Slice 2:** `topology-failures.js`; H4 and H5 in `runtime-domain.js`; the first finding of the package, and with
  it the `checks` row and `assertFindingIdsUnique` on a document that raises it.
- **Slice 3:** `topology-gates.js`; `parsePrefix` is exported for the address-overlap check.
- **Slice 5:** `topology-fallback.js`; the hop onto `domain` from `capability` (design d.4) joins the hops there, with
  `technology.capability-domains`.
- **Slice 6:** the surface in `topology-ui.js`; the finding "Review the proposals" for proposed domains and nodes,
  with the surface that offers Keep and Retire (J7); the `sections` row for the Chapter 10 register (H12); the
  browser suite `rc44-wp9a-deployment-browser-validate.mjs`.
- **When S0 gains the row of ruling J3** (what a package's records say to the fingerprint): the marker can be stated
  there instead of as an evidence key, if the lead prefers one way for every package.

## Measurements

Built with `client-bundle.mjs bundleClient`, as `node build.mjs` builds the client. Base: `9673661`.

| | Base | Slice 1 | Cap |
|---|---|---|---|
| Chapters route (code) | 3,229,840 B | 3,230,089 B (**+249 B**) | 3,233,792 B (unchanged; 3,703 B left) |
| Projects route (code) | 506,829 B | 507,062 B (+233) | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 61 (unchanged) |
| Stylesheet | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| Opens with records (ruling D10) | 4,062,884 B (the entry added 833,044 B in 12 scripts before it held the package) | 4,079,956 B (849,867 B in 12 scripts; the package is 16,823 B of it) | — |

The 249 B, read from the metafiles of the two builds, output by output:

| What | Bytes | Whose |
|---|---|---|
| The route stub with the import of `registerExtension` in `design-package-routes.js` | 118 | wp9a |
| H1, `failureDomainKey` | 21 | wp9a |
| `registerExtension` itself, which no route module called before | 94 | paid once, by the first package to merge |
| Import lists of two route chunks whose aliases move with that new export | 16 | the same |

Measured with scratch builds: with a second package's stub beside this one the route grows by 104 B more; without the
import of `topology.js` in `deploy-view.js` the route is the same 3,230,089 B (the package's modules add no export).

## Suites

- `rc44-wp9a-deployment-validate.mjs`: 12 blocks, green; `--measure` rewrites the size evidence from the build.
  Before the package was registered (its modules on disk, no line in `design-packages.js`, H1 not made) all ten
  blocks that existed failed, S1.1 with the baseline's "Unknown Deployment / runtime action.". The two cases added
  later (a jurisdiction that is no string; a restored zone that names retired records) were seen to fail first.
- `runtime-validate.mjs`, `deploy-validate.mjs`, `technology-validate.mjs`, `rc42-g4-trace-kernel-validate.mjs`,
  `rc42-g5-runtime-validate.mjs`: pass, unchanged.
- The old-document readings: the ten readings of the three references and of the document with a review list are
  byte for byte those of `94dbd4f` (`rc44-s0-extensions-baseline.json`); a capture of the base `9673661` was compared
  with that file and is identical, so the slice uses S0's goldens and keeps no file of its own.
- `rc44-s0-extensions-validate.mjs`: 15 blocks pass, 7 fail with a real package registered. Not edited (ruling J11);
  the seven assertions are listed under open question 1.
- `rc44-wp9a-deployment-browser-validate.mjs`: 1 case, green against the built client (88 scripts without the
  marker and no lazy entry; with the marker the entry of the Chapter 10 Model view is asked for once and Chapters 1 and
  10 draw without an error). With the stub's line taken out of `design-package-routes.js` and the client rebuilt, the
  case fails on "a project that holds the marker loads the lazy entry that holds the package" (checked once, restored).
- `node check-syntax.mjs`: 930 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, 0 new.
  `node build.mjs`: builds with no size violation.
- With the package registered, 65 existing suites were run one after another (the machine shared) and are green:
  the five above; `rc44-wp1-knowledge`; 27 that read the tables and files the slice touches (`chapter-records`,
  `design-records`, `field-spark`, `provenance`, `reference-resolution`, `tray`, `chapter-lines`,
  `native-connection-ui`, `not-stated`, `wire-merge`, `desk-fixes`, `desk`, `design-spec`, `driver-applicability`,
  `driver-kinds`, `driver-spec-view`, `model-walk`, `product-choice`, `rc42-g1-tech-approval`,
  `rc42-g7-data-contracts`, `review-plan`, `scale-readings`, `sol-coverage`, `tradeoff`, `utility`,
  `component-library`, `architecture-intelligence`); and 32 that run the server or the review (`action-undo-api`,
  `action-undo`, `baseline-size`, `changes`, `exchange-design`, `interfaces`, `journal-archive`, `rc42-g2-library`,
  `rc42-g3a-risk-and-limits`, `rc42-g3b-trace-and-delivery`, `rc42-g3c-evidence-fingerprint`, `recovery-authority`,
  `recovery-size`, `review`, `runtime-assistance`, `sdd-formats`, `sdd-size`, `security`, `technology-realisation`,
  `platform`, `readiness`, `ars`, `model-impact`, `model-lifecycle`, `workspace`, `projects`, `reference-projects`,
  `connected-design-projections`, `trace-narrative`, `model-conformance`, `workbench-ui`, `model-alternatives`).
  The five named suites, `rc44-wp1-knowledge`, S0's suite and 20 of the others were run again at the final code.
  None of the 37 suites that are red at the baseline was run, and no full regression (the lead runs it); `test:scale`
  was not run.

## Open questions (for the lead)

1. **S0's suite with this package registered** (`rc44-s0-extensions-validate.mjs`, unedited; ruling J11). Seven
   assertions fail, each because the suite assumes that no package is registered:
   - block `6a no extension registered`, line 229: `X.EXTENSIONS` equals `[]`. The server's list registers
     `p30-deployment`. The ten readings compared before that line pass.
   - block `registration`, line 264: the ids are `aa-hostile`, `mm-other`, `zz-synthetic`. Now also `p30-deployment`
     and `p30-deployment-route` (the suite loads `project-store.js`, which imports the browser's list).
   - block `D3 workbench keys`, line 777: "the statement of prefixes names FD (public/topology-domain.js)". The scan
     of quoted id prefixes reads the package's module; `FD` and `DN` are the package's (ruling J10: the scan reads
     the workbench's own modules).
   - block `D5 SDD provenance`, line 857: `packageCollections()` is the suite's three. Now also `runtime.nodes` and
     `technology.domains`.
   - block `needs and load`, line 1153: "no package exists at this slice: neither list names one".
   - block `7 idempotent and order-free`, line 1163: the child processes' ids, as in `registration`.
   - block `8 client build`, line 1209: the registry module is at most 420 B. It is 479 B: `registerExtension` was
     shaken out of the client while no stub called it.
2. **The walkthrough still groups by name** (`simulateRuntime`, mode `domain`) until slice 2. If slice 2 is not next,
   the lead may want the one line of H4 that reads `failureDomainKey` there brought forward (about 40 B).
3. **`FD` beside the functional drivers' codes `FD<n>`** (S0's note 8): kept. The ids differ by the hyphen.
4. **A lifecycle rule for a package on a built-in collection** (`canRestore` for `runtime.zones`): the registry
   carries none, so decision 6 mends a restored zone instead of refusing the restore. Is the row wanted?
5. **A defect of the baseline, not fixed here:** `patchLinks` in `public/technology-domain.js` calls `fmt`, which
   that module does not define (as at `94dbd4f`; a direct call past the limit throws "ReferenceError: fmt is not
   defined"). A link list past its limit (a zone's 21st trust boundary, a plan's 501st control) is still refused, but
   as a fault ("This action could not be completed…") in place of its sentence. The fix is one definition on the
   route (a few tens of bytes) and belongs to no package.
6. **`workspace.merge` stamps no author** (ruling D12, the lead's): a node or a failure domain a merge wrote has no
   stamp, as a built-in record has none (case S1.8 holds it for a merged proposal). The slice has no second-person
   step, so nothing is refused for it yet.
7. **A typed key that equals a name.** `failureDomainKey` answers the domain's id (`fd-002`). A zone whose failure
   domain is named "FD-002" in words reads as the same domain as a zone typed into `fd-002`. It errs towards no
   independence. Left as it is.
8. **AIW's proposals of a package are in no plan.** The review plan's step "Keep or dismiss N proposals AIW made"
   reads the built-in seeds. Should the registry carry a package's proposals to it (a row), or does each package
   raise its own finding with its surface (this package: slice 6)?
9. **Ruling J3 on this base.** S0 has no row yet for what a package's record says to the fingerprint. The marker's
   step is kept out of both fingerprints as an evidence key (decision 3). A node's and a failure domain's `history`
   is read by the design fingerprint as a built-in record's is; neither carries a person's step.
