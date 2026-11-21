# rc44 wp9a slice 1: typed failure domains, nodes and registration — build notes

Branch `rc44/wp9a-s1-topology-c2` (continues `rc44/wp9a-s1-topology`, which a usage limit cut off after the fixture and
an unrun suite), from the integrated base `9673661` (S0 and wp1 S1 merged).
Design: `audit/rc44/design/wp9a-deployment.md` (sections a to f, Slice 1 under g, b.4, d.3).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"), the rulings of 2026-11-18 (A to J).
Package id `p30-deployment`, route stub `p30-deployment-route` (ruling D8). Host entry: `public/deploy-view.js`
(design d.3, ruling A3). `productionAccepted` stays false. No external authority is involved in this slice: nothing
here is approved, accepted, released or promoted.

## State

- **Done:** the slice (the package, one part of five filled, its registration lines, the route stub, hook H1, the
  suite, the fixture, a browser case, the size evidence) and its fix-up: every item 0 to 8 below, the suite at 21
  blocks, green.
- **In progress:** the second fix-up (rulings M1 to M9), section "Second fix-up" below.
- **Next:** the lead's merge; see "What later slices inherit" and "Open questions (for the lead)".

## Second fix-up (after the verifier; the lead's rulings M1 to M9, with K and L)

Branch `rc44/wp9a-s1-topology-fix-c5`, from `rc44/wp9a-s1-topology-fix-c4` (`1372785`). Verifier:
`/home/user/hb-review/rc44-build/wp9a-s1-topology.verify.json`. Each item: case first, seen to fail on the head the
item started from, then the change. (Work in progress; this section is completed with item 8.)

- **Item 0, merge `rc44/integration` (`a4c1690`):** done (`1efbecc`), no conflict. The four rc44 suites on the merged
  head: S0 26 of 26, wp1 34 of 34 (4 pending), wp9a 21 of 21 (S1.7 now runs K8's helper: it exists), wp2 19 of 20, its
  block `size` red ("this build is inside the allowance of wp2: 669 B", M4).
- **Item 1, M1:** done (`d66c269`), case S1.21.
- **Item 2, M2:** done, cases in S1.16 (a step dated after the import, a package without finalReview, both; seen to fail
  on `d66c269`: "Missing expected exception: a step dated after the import: architect-a's runtime.node is refused").
- **Item 3, M3:** done, case S1.22 through the server (it holds behaviour unchanged since the slice, so it passes on
  `df4ff65` as on this head: the ruling is a reading, and the code comment of `topologyFindings` that said only "the
  review is blocked" now says the reading). The reading of L2: "cannot be checked" is the non-waivable class of
  rc.10.73.42. Beside the built-in non-waivable `state-protection` error of the same chapter, step by step: the same two
  treatments and no waiver (the three waivers refused, the package's in ruling A1's words, the built-in in its own),
  "fix before review" keeps both blockers, the review's checks count them, the findings milestone stays open, a positive
  review is refused, and a freeze (the job route) is a working draft that holds both; `runtime.review` and
  `runtime.handoff` are taken while both stand, as their built-in rule reads no error; changing the design removes
  exactly this blocker. Deviation recorded: L2's words "the chapter cannot be checked ... or handed off" are not built;
  M3 rules that they mean this class.
- **Item 4, M4:** in progress.

## Fix-up (after the adversarial review; the lead's rulings L1 to L11, K1, K2, K6, and K7 to K9 since)

Branches: `rc44/wp9a-s1-topology-fix` (item 0, cut off), `rc44/wp9a-s1-topology-fix-c2` (items 1 to 5, cut off),
`rc44/wp9a-s1-topology-fix-c3` (items 6 and 7, and a trial merge, below), `rc44/wp9a-s1-topology-fix-c4` (this head:
`-c3` before the trial merge, and item 8), from the slice's head `1acb341`. Review:
`/home/user/hb-review/rc44-build/wp9a-s1-topology.review.json`. Each item: case first, seen to fail on the head the item
started from, then the change.

`rc44/integration` still stands at `9673661`, which this branch holds since the start: its merge before the final
commit brought nothing. The adoption record is the one item 0 merged (`rc44/wp2-s1-lead` at `25cc426`). That branch
moved on during the fix-up (`963cae8`, `17753df`, `ec0cd3c`: the lead's follow-up after its verifier, rulings K7 to K9,
"suites not yet rerun"). A trial merge of `ec0cd3c` (`8c6237d` on `-c3`, no conflict) gave wp9a 21 of 21 (with S1.7
calling K8's helper), S0 26 of 26 and wp1 34 of 34, but wp2's suite does not finish: its block `upgrade` runs without
end, on `ec0cd3c` itself too (300 s without an answer, this branch's code not involved), and
`upgradeAdoptions(bankPaymentApplied())` alone does not return in 30 s there: the new loop of `adoption-upgrade.js`
(`do id='ADP-'+…;while(typeOf(id)||…)`) seems never to find an id `typeOf` leaves free (open question 14). So this head
keeps the adoption record of `25cc426` and leaves the follow-up to the lead's merge; S1.7 calls K8's helper once it is
there (`assertBuiltInChainsUnchanged`; it held on the trial merge, and with `tracePath` as before K8 too).

### One line each

| Item of the review or ruling | State | Case (suite `rc44-wp9a-deployment-validate.mjs` unless named) |
|---|---|---|
| Must-fix 1: a keep by an agent, a draft or an import | done (L1, item 2) | S0 "L1 keep is a person's step"; S1.12 |
| Must-fix 2: a half-typed environment reads more independent | done (L2, item 3): `hostingComparison`, Chapter 10's error `topology-incomparable` | S1.13 (the reviewer's walk) |
| Must-fix 3: a zone left in a retired domain or node | done (L3, item 4): the tracker mends every zone and placement at the end of every commit | S1.14 |
| Must-fix 4: nested domains and a shared cause stated nowhere | done (L2, item 3): nested raises the error; the shared cause is a retirement row and a case marked for slice 2 | S1.13 ("SLICE 2 FLIPS THIS") |
| Must-fix 5: a placement located in a batch keeps its stamp | done (L4, item 5) | S1.15 |
| Should-fix 1: the fingerprint does not read typed or not | done (L5, item 6) | S1.16 (the hand-made pair: two stamps) |
| Should-fix 2: a recovery import keeps who chose it | done (L5, item 6): a step older than the import is nobody's; the commands are refused until a person takes it | S1.16; S1.0 (the copy) |
| Should-fix 3: a zone made and located in one batch is not journalled | done (L3, item 4) | S1.14 |
| Should-fix 4: a node restored under a retired parent or domain; a ninth level | done (L3, item 4): S0's row `canRestore` | S0 "L3 restore rule"; S1.14 |
| Should-fix 5: H1 trusts `domainIds[0]` without the marker | recorded, not changed (L11 (a)): only a hand-made recovery package reaches it | — |
| Should-fix 6: proposals and the design fingerprint | done (L6, item 6) | S1.4, S1.8, S1.16 |
| Should-fix 7: the limits are not reachable | done (L8, item 7): 120 nodes, 60 domains | S1.18 |
| Should-fix 8: the jurisdiction list | done (L8, item 7): the 249 officially assigned codes | S1.19, S1.1 |
| Should-fix 9: small input points | done (L8, item 7) | S1.19 |
| Should-fix 10: the address text and the mapped form | done (L8, item 7); the overlap check is slice 3's | S1.19, S1.1 |
| Should-fix 11: evidence and the Chapter 10 register | done (L9, item 7) | S1.10; the retirement list |
| Should-fix 12: goldens again; `assembleParts` rows | the rows done (L10, item 1); the goldens not captured again, as L10 rules | S1.11; S1.3 |
| L1 | done (item 2) | as must-fix 1 |
| L2 | done (item 3) | S1.13 |
| L3 | done (item 4); the lifecycle question for built-in collections waits for slice 2, as ruled | S1.14 |
| L4 | done (item 5); the merged alternative keeps its stamps (D12), the case says so | S1.15 |
| L5 | done (item 6), with S0's design row extended to `chapter.key` (deviation 13) | S1.16, S1.0; S0 "J3 design statement" |
| L6 | done (item 6); a batch's own receipt still moves the stamp (rc.10.73.42, for every batch) | S1.4, S1.8, S1.16 |
| L7 | done (item 6); `deploy-model.js` is on the route, not in the lazy entry as L7 says (it cost -5 B) | S1.17 |
| L8 | done (item 7) | S1.18, S1.19 |
| L9 | done (item 7); S0's boundary sentence for a person-only step still names the type (open question 10) | S1.0, S1.19, S1.10 |
| L10 | done (items 1 and 7): S0's suite with both packages; `assembleParts`; `fmt` in `patchLinks`, 34 B booked apart | S0 "D3 workbench keys"; S1.11; S1.20 |
| L11 | recorded (see "What later slices inherit"): (a) slice 6, or nobody; (b) wp9b; (c) slice 6; (d) slice 2 | — |
| K1, K2 | inherited through the merge: the package has no upgrade step, so its reads store nothing | — |
| K6 | done: the registry's one-time cost is in the adoption record's figure; the package's own bytes stated | S1.10 |
| K7 | nothing to change (checked on the trial merge): the tracker watches zones and placements (one path each) and its own collections | — |
| K8 | done as far as this head allows: S1.7 calls `assertBuiltInChainsUnchanged` when the helper is there (the adoption record's follow-up); it held on the trial merge | S1.7 |
| K9 | nothing to change: no prefix row; the emitter states records under their own ids only | — |

Where I read a ruling otherwise, plainly: L5 and L6 say "through S0's design row", which took a key of the document only;
I extended the row (64 B on the route, which I count as wp9a's; the lead may book them to the shared pool as an S0 row).
L7 places `deploy-model.js` in the lazy entry; the build puts it on the chapters route. L8's document bound of 8,000,000
characters is enforced for the knowledge library, not for a project: I set the counts against it as the rulings do.

### What later slices inherit

- **Slice 2:** the one reader of L2, `hostingComparison(p, environmentId)` in `public/topology-domain.js`: it extends it
  to compare over the ancestors and the shared causes and writes no second comparison; S1.13's assertion marked "SLICE 2
  FLIPS THIS" flips; the error `topology-incomparable` stays for whatever the reader cannot yet compare. The lifecycle
  question of L3 (a package's rule on a built-in collection, concern 3) is ruled when it starts; until then the
  tracker's mend and the L2 (c) error stand. L11 (d): no calculated verdict reads as confirmed an ancestor chain an
  unreviewed draft changed. Its findings join Chapter 10's `checks` row (`assertFindingIdsUnique` is called in S1.7).
- **Slice 3:** the overlap check of L8 compares `parsePrefix(…).parts` and `length`, never the stored text (which is now
  canonical); an IPv4-mapped address cannot be stored in either form, so the check need say nothing of mapped
  addresses unless slice 3 admits them; a node's `address` is one prefix.
- **Slice 6:** the surface (the counts 120 and 60 are what it says when full); the finding "Review the proposals" for
  AIW's own proposals (L11 (c)); the Chapter 10 register printing the typed location (L9, H12); R5, R6, the layout's
  bracket and the desk's region guess (retirement list); L11 (a), a hand-made recovery package with typed fields and no
  marker read by the built-in key, if a surface ever reads one.
- **wp9b:** L11 (b), the lifecycle family's rule (an agent account retires and restores a person's node as it does a
  person's zone; an import by a person writes authored records stamped as imported).
- **Every later slice of wp9a:** the package's records at its slice-1 limits already take about 3,740,000 of a
  document's 8,000,000 characters (S1.18); a slice that adds records measures them at their limits through the commands
  (B8) against what is left, and sets its own counts so that the document bound is not what a person hits first. Route:
  wp9a has 190 B left of its 500 B on the chapters route.

### By item

**In progress / next:** nothing; every item below is done.

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
- **Item 7, L8, L9, L10 second part (should-fix 7 to 11; concern 10):** done. Cases first, all six seen to fail on
  `cf22c9e` (`bd94461`).
  - L8 limits: every limit is reached through the commands in S1.18, with every field, open entry and history at its
    limit (60 failure domains, a chain six deep, proposals past the bound, 12 domains on a zone, 120 nodes, a chain eight
    deep, 20 trust boundaries a node). There the package's records take 3,740,460 characters with their stamps (about
    20,800 a record; a node alone about 23,300, a domain about 17,700), the whole Tidewater document 3,762,903 of the
    8,000,000-character document bound of rulings B8 and E3. So the limits are now `nodes: 120, domains: 60` (were 2,000
    and 500: 2,000 nodes at their limits are about 46,600,000 characters); the package's counts bind first while the
    rest of a project holds less than about 4,260,000 characters, and past that the document bound binds whatever the
    package holds. Found: no code enforces a document bound for a project (the 8,000,000 characters are the knowledge
    library's, `knowledge-governance.js`); the measurement uses it as the rulings do. A zone's typed fields add at most
    753 characters; one change of a node at its limits journals 13,673 characters, kept apart from the document
    (`project-storage.js` stores the journal in segments). The built-in limit of 2,000 zones is not the package's and
    is not reachable at its own field limits either (about 10,000 characters a zone): noted for the lead.
  - L8 input (S1.19): the jurisdiction is one of the 249 officially assigned ISO 3166-1 alpha-2 codes (`JURISDICTIONS`,
    in the lazy module); `runtime.locate` naming a zone and a placement is refused; a text field sent as anything but a
    string is refused ("The node name is words: send it as text."), for every text field of both records and the
    reason of a locate; `treatment` on a domain whose cause is a location is refused (after the rules of the zones that
    name it, so S1.2's refusal stays the first); an address is kept in its canonical text (dotted decimal; RFC 5952) and
    the IPv4-mapped form is refused in hex as it was dotted. `parsePrefix` answers the parts slice 3's overlap check
    compares. Replaced: S1.1 "refused as not two capital letters" -> "refused as no officially assigned code" (now also
    ZZ and UK); S1.1 "the stored address is the text sent, lower-cased" -> "the canonical text"; S1.1 "2,000 nodes by
    hand, the 2,001st refused" and S1.4 "498 domains by hand, proposals refused at 503, 500 by hand, the 501st refused"
    -> S1.18, the same reached through the commands at 120 and 60.
  - L9: the refusal before the marker says "This project's topology is not typed yet. A signed-in person chooses typed
    topology for this project first." (S1.0, replaced; it named `runtime.topology-start`); S1.19 scans every refusal of
    `topology-domain.js` for a command type. Not changed: the boundary's own refusal of a person-only step from an agent
    account names the type ("runtime.topology-start is a signed-in person's step: …"); it is S0's sentence for every
    package (`design-extension-boundary.js`), not this package's: for the lead. The size evidence is rewritten
    (`audit/rc44/evidence/wp9a-s1-size.json`, schema v2): what was measured, against 9673661 and against the adoption
    record, every byte itemised, the bookings of K6 and L10 apart, no "well under half". Replaced: S1.10 "delta < 250
    against the base alone" and "the package's own under 150 B" -> "every byte against the adoption record itemised and
    adding up; wp9a's own ≤ 500 B; K6 and L10 apart".
  - L10 second part: `patchLinks` (`public/technology-domain.js`) has its `fmt` (`n.toLocaleString('en-GB')`, as
    `assurance-domain.js` formats its counts), 34 B on the route, booked to the shared pool. Case S1.20 through the
    server (seen to fail: "This action could not be completed. Your input is kept; reload the project and try
    again."): a zone saved with 21 trust boundaries is answered "A record links up to 20 trust boundaries; 21 were
    sent."; twenty are taken. `technology`, `interfaces`, `security`, `runtime`, `technology-realisation` pass unchanged.
  - Route (S1.10, `--measure`): 3,230,500 B; +660 B against 9673661; +344 B against the adoption record (3,230,156 B, its
    build at 25cc426); of these, wp9a's own 310 B (of 500), the baseline defect's fix 34 B; the registry's one-time cost
    is in the adoption record's figure. 148 scripts, 53 under 10 KB, stylesheet unchanged, no gate changed.
- **Item 8, notes and the final merge:** done. This section, the retirement list (two rows struck out by L7, one row
  added for what of the Model view stays with slice 6), "What later slices inherit", the deviations 13 to 16, the
  measurements and suites after the fix-up, open questions 10 to 14. `git merge rc44/integration`: already up to date.
  K8: S1.7 calls `assertBuiltInChainsUnchanged` when the helper is there (see the trial merge above).

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
12. **The route** (at the slice): 249 B measured against the base alone; after the fix-up see "Measurements".
13. **S0's design row takes `chapter.key`** (fix-up, rulings L5 and L6): the row of ruling J3 took a key of the document
    only, and the marker and the two collections live in chapter containers. `reviewSource` now puts a statement of
    `chapter.key` under that key of a copy of the chapter (64 B on the route, counted as wp9a's); the start check takes
    `chapter.key` for a new key of a chapter's container and refuses every key the workbench writes, a deeper key and a
    key that is no name; two statements of a key and of a key inside it are a clash. S0's contract text says so.
14. **Failure-domain ids from Chapter 10's counters** (`runtime.counters.domain`, fix-up, ruling L6): the design
    fingerprint reads `technology.counters` and not `runtime.counters`, so a proposal would otherwise move the design
    stamp by its counter. A document typed on an earlier build of this unreleased slice (only test and trial documents)
    keeps its counter in `technology.counters.domain`, which this head no longer reads: such a document would mint
    `fd-001` again. No released document holds one, so no upgrade step is written; the lead's trial documents are to be
    typed again.
15. **The limits are 120 nodes and 60 failure domains** (fix-up, ruling L8; design: 2,000 and 500), measured through
    the commands against the document bound.
16. **The walkthrough and the Model view read the typed domain in this slice** (fix-up, ruling L7; design: slices 2
    and 6), first through `failureDomainKey`, then the name as before, so that a placeholder name does not turn
    independent.

No assertion of a suite that exists on `94dbd4f` was deleted, loosened or replaced. The fix-up replaced assertions of
the rc44 suites (this package's and S0's), each with one at least as strict; the list is in the final commit and under
"Fix-up" item by item.

## Retirement list (ruling J6: no second truth beside an earlier path)

The typed binding (`zone.domainIds`) and its one reader (`failureDomainKey`, D8's reading) are in this slice because
design case 2 asks for them. Every reader that reads D8's key reads the typed domain: Chapter 10's `single-domain`,
`standby` and `backup-domain`, `planFacts`, the desk's sizing, vitals and fixes. These earlier readers do not read
D8's key and read a zone's failure domain by its name until their slice moves them:

| Earlier reader | Where | Retired by |
|---|---|---|
| ~~The walkthrough's "lose a failure domain" grouping, and its Failover test for a named domain~~ | `public/runtime-domain.js` `simulateRuntime` | **retired by the fix-up** (ruling L7, H4): it reads `failureDomainKey` first, the name as before (S1.17) |
| ~~The Chapter 10 Model view's private failure-domain key~~ | `public/deploy-model.js` (`r.domains`, `domainsOf`, `fallbackSimulation`, `deployInsights`), `public/deploy-view.js` (a plan's domains) | **retired by the fix-up** (ruling L7, H15): each zone is keyed by `failureDomainKey` first (S1.17) |
| The Model view's second propagation (`fallbackSimulation`), its scenario list from zones only, the layout's bracket over adjacent columns by the zone's domain words, and a group's title from the first zone's words (a typed zone that states no name is titled "Undeclared failure domain") | `public/deploy-model.js`, `public/deploy-layout.js` | slice 6 (R5, R6, with the surface); the bracket and the title read the typed domain with H12 |
| The desk's region guess from words in the name (a latency reading, ruling L7) | `public/desk-capacity.js` | slice 6 (H13, R2) |
| Chapter 6's three string comparisons of a capability's domains | `public/technology-domain.js` | slice 5 (H14, R3, R4); no capability is typed before it |
| The zone's attribute "Domain" in the model projection (the name as words) | `public/runtime-model.js` `runtimeProjection` | slice 6 with the surface |
| Two zones that share a stated cause (`domainIds` after the first) read as independent in the built-in checks (`single-domain`, `standby`, `backup-domain`), `planFacts` and the desk: they compare the hosting domain only | `public/runtime-domain.js`, `public/design-reasoning.js`, the desk | slice 2 (the finding for a shared cause, evaluated over the ancestors); case S1.13 holds today's reading, marked "SLICE 2 FLIPS THIS" (ruling L2) |
| A zone in a domain inside another zone's hosting domain (parent and child) is not compared at all: the package's error `topology-incomparable` stands instead (ruling L2 (b)) until a reader evaluates over the ancestors | `public/topology-domain.js` `hostingComparison` | slice 2 extends `hostingComparison` to compare over the ancestors; the error stays until then |
| The Chapter 10 register prints the zones by name ("AZ-1", "AZ-2") beside the finding that they share one failure domain; no register, SDD or ARS prints an FD or DN reference (ruling L9) | `public/runtime-domain.js` register, `public/sdd-architecture.js` | slice 6 (H12, the typed location printed) |

Until slice 6 no surface offers the topology commands, so a document is typed only through the command route.
Between this slice and slices 2 and 6 such a document reads a typed zone as its typed domain in the checks, at the
desk, in the walkthrough and in the Model view, and by its name only in the rows above that are not struck out.

Nothing is printed of the typed topology yet: the records are in the document, the record graph, the journal and the
SDD's counts of who wrote the records, and in no register, SDD or ARS section until slice 6 (H12, a `sections` row).

What asks a person to act on a proposal today: the review plan plans "Keep or dismiss N proposals Sol's draft made in
Chapter 6 / 10" for the nodes and failure domains a draft sent (it reads every record collection; case S1.8). It does
not plan AIW's own proposals of the package: its step for those reads the built-in seeds only
(`runtime-domain.js` `seededRecords`). They are counted by the SDD ("proposed by AIW") and raise no finding until
slice 6 brings the surface that offers Keep and Retire (ruling J7). See open question 8.

## Next, by slice

- **Slice 2:** `topology-failures.js`; H4's lost set and H5 in `runtime-domain.js` (the walkthrough already reads the
  typed domain: `dk` in `simulateRuntime`); its findings join the `checks` row Chapter 10's error opened (see "What
  later slices inherit").
- **Slice 3:** `topology-gates.js`; `parsePrefix` answers the parts and length the address-overlap check compares.
- **Slice 5:** `topology-fallback.js`; the hop onto `domain` from `capability` (design d.4) joins the hops there, with
  `technology.capability-domains`.
- **Slice 6:** the surface in `topology-ui.js`; the finding "Review the proposals" for proposed domains and nodes,
  with the surface that offers Keep and Retire (J7); the `sections` row for the Chapter 10 register (H12); the
  browser suite `rc44-wp9a-deployment-browser-validate.mjs`.
- **Done by the fix-up:** the marker, the nodes and the failure domains are stated through S0's row of ruling J3.

## Measurements

**After the fix-up** (this head; `node build.mjs` and S1.10 `--measure`, `audit/rc44/evidence/wp9a-s1-size.json`). Two
bases, each built with `node build.mjs` from an archive of its commit: the integrated base `9673661`, and the adoption
record at `25cc426` (`rc44/wp2-s1-lead`), which this branch merged. (The lead's later `ec0cd3c` measures 3,230,165 B,
9 B more; the trial merge with it 3,230,509 B: the same 344 B, itemised alike.)

| | 9673661 | Adoption record 25cc426 | This head | Cap |
|---|---|---|---|---|
| Chapters route (code) | 3,229,840 B | 3,230,156 B | 3,230,500 B (+660 / **+344**) | 3,233,792 B (unchanged; 3,292 B left) |
| Projects route (code) | 506,829 B | 507,069 B | 507,242 B | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 53 | 61 (unchanged) |
| Stylesheet | 901,873 B | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| Opens with records (D10) | 4,062,884 B | — | 4,086,030 B (855,530 B in 12 scripts) | — |

The 344 B against the adoption record, read from the metafiles of the two builds, route output by route output:

| What | Bytes | Booked to |
|---|---|---|
| The route stub with its import of `registerExtension` (`design-package-routes.js`) | 105 | wp9a |
| H1, `failureDomainKey` reads the typed domain (`runtime-model.js`) | 21 | wp9a |
| The lifecycle reads a package's restore rule (`record-lifecycle.js`, L3) | 47 | wp9a |
| S0's design row takes `chapter.key` (`review-domain.js reviewSource`, L5, L6) | 64 | wp9a (the lead may book it as an S0 row) |
| `simulateRuntime` reads the typed domain (`runtime-domain.js`, H4 of L7) | -10 | wp9a |
| The Model view keys a zone by it (`deploy-model.js`, H15 of L7) | -5 | wp9a |
| Alias and import shifts of the route outputs whose imports and exports moved | 88 | wp9a |
| `fmt` for `patchLinks` (`technology-domain.js`, the defect of rc.10.73.42, L10) | 34 | the shared pool (L10) |

wp9a's own: **310 B of its 500 B** (190 B left). The registry's one-time cost (K6, 110 to 123 B) is in the adoption
record's figure: its stub brought `registerExtension` onto the route. Against `9673661` the route grew 660 B: wp2 S1's
316 B, wp9a's 310 B, the defect's 34 B. No gate changed.

**At the slice** (`1acb341`, before the fix-up). Built with `client-bundle.mjs bundleClient`, as `node build.mjs`
builds the client. Base: `9673661`.

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

**After the fix-up** (this head, the adoption record of `25cc426`): `rc44-wp9a-deployment-validate.mjs` 21 blocks green
(S1.10 with `--measure`); `rc44-s0-extensions-validate.mjs` 26 of 26; `rc44-wp1-knowledge` 34 of 34 (4 pending, as
before); `rc44-wp2-adoption-validate.mjs` 19 of 20 blocks, its block `size` red ("this build is inside the allowance of
wp2: 660 B": it counts every package's route bytes as wp2's, open question 11; it passed on `afaf616`, after item 5, where
the route was 569 B over the base). `test:deploy-browser`, red at the baseline, fails as there ("unplaced parts wait in Not
placed"). For the fingerprint, the review and the readers of the design source (S0's row now takes `chapter.key`), on
this head, green and unchanged: `review`, `rc42-g3c-evidence-fingerprint`, `baseline-size`, `recovery-authority`,
`sdd-architecture`, `roadmap`, `architecture-case`, `rc42-g3b-trace-and-delivery`, `rc42-g7-data-contracts`,
`readiness`, `model-alternatives`, `reference-projects`, `validation-confirmation`, `native-connection-ui`, `provenance`,
`review-plan`. `rc44-wp9a-deployment-browser-validate.mjs` green against the built client. Existing suites of the files the
fix-up items 6 and 7 changed, green and unchanged: `deploy`, `runtime`, `rc42-g5-runtime`, `chapter-lines`,
`not-stated`, `wire-merge` (H4, H15), `technology`, `interfaces`, `security`, `technology-realisation` (`patchLinks`);
those of the earlier items as their lines above say. `node check-syntax.mjs` passes; `node scripts/lint.mjs --summary`:
162, baseline 162, 0 new; `node build.mjs`: no size violation.

**At the slice:**

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

Questions 1, 2, 4, 5 and 9 were closed by the rulings and the fix-up (L10 and item 1; L7 and item 6; L3 and item 4,
with the built-in collections left to slice 2; L10 and item 7; L5, L6 and item 6). 3, 6, 7 and 8 stand (8 is L11 (c)).
New after the fix-up:

10. **S0's boundary sentence for a person-only step names the type** ("runtime.topology-start is a signed-in person's
    step: …", `design-extension-boundary.js`), for every package. L9 asks that no refusal name a command type; the
    package's own refusals name none (S1.19), but this one is S0's. Change S0's words (the S0 and wp2 suites hold parts
    of them), or let a package state its step's words?
11. **wp2's suite on a branch that holds both packages.** Its block `size` asserts "this build is inside the allowance
    of wp2" as the whole route against the integrated base: with wp9a merged that is 660 B, over 600, though wp2's own
    figure (the adoption record against the base) is 316 B. It counts every package's bytes as wp2's; the lead
    re-measures at each merge (K6). Not edited here.
12. **A reviewed batch's receipt moves the design stamp.** `workspace.apply` keeps its receipt in `workbench.history`,
    which the design fingerprint reads on rc.10.73.42, so a batch of proposals moves the design stamp by its receipt
    though the proposals say nothing (S1.8 holds the rest). Built-in; for every batch.
14. **The adoption record's follow-up does not finish its own suite.** On `rc44/wp2-s1-lead` at `ec0cd3c` the block
    `upgrade` of `rc44-wp2-adoption-validate.mjs` runs without end, and `upgradeAdoptions(bankPaymentApplied())` does
    not return in 30 s: the loop that skips an id a record holds (`adoption-upgrade.js`, K9 (c)) seems never to find a
    free one (perhaps `typeOf` answers the adoption's own type for every `ADP-` id, through the minted prefix). Not
    this package's code; this head keeps `25cc426` until the lead's merge.
13. **No document bound for a project in code.** The 8,000,000 characters of rulings B8 and E3 are the knowledge
    library's (`knowledge-governance.js`); a project's document has no bound of its own, and the built-in limit of
    2,000 zones is not reachable at its own field limits (about 10,000 characters a zone). The package's counts are set
    against the 8,000,000 as the rulings read it.

Earlier questions, as asked at the slice:

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
