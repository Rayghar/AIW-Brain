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
- **Done since:** the second fix-up (rulings M1 to M9), section "Second fix-up" below; the suite at 24 blocks, green.
- **Done since:** the second fix-up's verifier (merge, three new problems) and the lead's rulings O1 to O5.
- **Done since:** the third fix-up (rulings O1 to O5), section "Third fix-up" below (branch
  `rc44/wp9a-s1-topology-fix-c6`, from `rc44/wp9a-s1-topology-fix-c5` at `5cae40a`); the suite at 25 blocks, green.
- **Done since:** the third fix-up's verifier (merge, two hardening problems and a nit) and the lead's rulings R1 to R4.
- **In progress:** the fourth fix-up (rulings R1 to R4), section "Fourth fix-up" below (branch
  `rc44/wp9a-s1-topology-fix-c7`, from `rc44/wp9a-s1-topology-fix-c6` at `ce6eb90`).
- **Next:** the lead's merge; see "What later slices inherit" and "Open questions (for the lead)".

## Fourth fix-up (after the third verifier; the lead's rulings R1 to R4)

Branch `rc44/wp9a-s1-topology-fix-c7`, from `rc44/wp9a-s1-topology-fix-c6` (`ce6eb90`). Verifier:
`/home/user/hb-review/rc44-build/wp9a-s1-topology.verify3.json` (verdict merge; two hardening problems of O2's row and a
nit). Order of work, each case first and seen to fail on the head the item started from, a WIP commit after each:
1. R1, the trackPaths start check: each refusal a case in S0's block "O2".
2. R2, a tracker mends content, decides nothing and makes nothing: the boundary restores, refuses an added record; the
   helper holds it; cases through the server for a person's and an agent account's commit.
3. R3, routeBookings names the file it cannot read: one hostile case in S0's block "O1".
4. R4, S1.10's share of the lazy entry (own modules pinned, own import and export lists) and the files-under-10-KB
   bucket read as a ceiling in S0's and wp9a's size cases; re-measured; the O1 merge check on the final head.
5. The notes, the suites, the final commit.

Measured before any change (`node build.mjs` on `ce6eb90`): chapters route 3,230,605 B, projects 507,338 B, 148 script
files, buckets 53/50/45, stylesheet 901,873 B, no violation.

### By item (fourth fix-up)

- **Item 1, R1: done.** Case: S0's block "O2", the start check (`rc44-s0-extensions-validate.mjs`). Seen to fail on
  `ce6eb90` (`.aiw-local/fixup4/r1-before.log`): all fifteen refusals were accepted (the narrative, `finalReview.judgements`,
  `.dispositions` and `.actions`, `changes.events`, `workbench.history`, `members.roles`, another package's lifecycle
  collection and its collection for the provenance reader alone, a path named twice, and five paths no table holds as a
  built-in record collection: `runtime.things`, `security.risks`, `runtime.evidence`, `logical.assets`,
  `knowledge.claims`). Now `design-extension-parts.js extensionIssues` accepts a path only when it is in both
  `record-lifecycle.js COLLECTIONS` and `provenance.js RECORD_PATHS`, is none of `finalReview.*` (the narrative with
  them), `changes.*`, `workbench.*` or `members.*`, is no collection a registered package states as its own, and is named
  once; each refusal in its own words. The case also holds that every built-in record collection of a chapter's container
  (34 of them in this build) is accepted together, so the check refuses nothing it should take. wp9a S1.11 and S1.24 pass unchanged.
- **Item 2, R2: done.** Cases: S0's block "O2", the helper part and the server part, and wp9a's S1.24 (unchanged, green
  under the stricter helper). Seen to fail on `ce6eb90` (`.aiw-local/fixup4/r2-before-1.log`, and `r2-before-2.log` from a
  scratch copy of the suite whose helper assertions only log, so the server part ran too): the helper accepted a tracker
  that adds a record, removes one, sets `confirmed`, or moves every lifecycle and review field; through the server an
  added record was stored (A's and the agent account's commit), a removed record was stored, a confirmation the tracker
  set stood, `state`, `keptAt` and the rest the tracker set while it mended stood, a proposal the tracker kept stopped
  being one, and an inherited contract whose revision the tracker moved stopped being AIW's proposal. What was built:
  - `design-extension-boundary.js trackExtensions`: for each record of the package's `trackPaths` that a call changed,
    the boundary puts back from its copy `TRACKED_STANDING` (`state`, `origin`, `keptAt`, `confirmed`,
    `targetConfirmed`, `review`, `reviews`, `provenance`), then stamps the content change as the commit's
    (`stampTracked`, as before); a call that adds a record to such a path, or removes one, is refused; so is one whose
    change of content or bookkeeping moves the chapter's reading of whether the record is AIW's proposal
    (`canonical-command.js LIFECYCLE_RULES` seed, or `state` where a chapter states no rule), which no copy can put back
    without undoing the mend. A refusal is an error tagged for `isTrackerRefusal`; `worker.js` answers it in its own
    words (500, `fault`, logged as every tracker fault is), so nothing is stored and the answer names the package:
    "This action could not be completed: the design package zt-tracking's tracker added ADR-990 to decisions.records.
    A tracker mends the records of the collections it states (trackPaths); it decides nothing and makes nothing, so
    nothing was saved."
  - `rc44-s0-readings.mjs`: `TRACKED_STANDING` (the same list; this file imports only modules of the baseline, so S0's
    suite holds the two equal) and `assertTrackerStaysInPaths` also holds, inside the package's `trackPaths`, that no
    record is added or removed and none of those fields moves on a record, naming the fields, the record and the case.
  - S0's synthetic package gains modes (`decide`, `keep`, `unseed`, `remove`, and the set-up `propose` and `seed` done
    by its own command) and states `interfaces.contracts` beside `decisions.records`.
  - Old -> new (S0's suite, block "O2"): (1) "a confirmation the tracker sets is no person's review": `confirmed` stays
    `true` and the provenance is as it was -> the confirmation is restored: the record is byte for byte as it was, B's,
    for A's commit and the agent account's (stricter: the whole record, not the provenance alone). (2) "a record the
    tracker adds is no one's" (stored, unstamped) -> the call is refused, the commit not stored (revision, the decisions
    and the probe as they were), the answer naming the package, for A and the agent account. (3) The helper: "a record
    added to a path it states is inside its paths" (`changed['decisions.records']` equal to 1) -> the helper throws,
    naming the record. (4) The helper's answer on four cases: `changed {'decisions.records': 2}` -> `changed
    {'decisions.records': 2, 'interfaces.contracts': 0}` (the package now states the second path; equally strict).
  - `settle`'s `tracked` flag and `stampTracked`'s replacement of a stamp a tracker wrote are kept, as R2 confirms; with
    the provenance put back before the stamp, a stamp the tracker writes never reaches `settle`.
  - The S0 contract text (`s0-extensions.md`: the `trackPaths` row and paragraph, the helper, a section for this
    fix-up) and the comments of `design-extension-boundary.js`, `provenance.js` and `worker.js` say the same.
  - S0 28 of 28; wp9a S1.5, S1.6, S1.8, S1.11, S1.12, S1.14, S1.15, S1.21 to S1.24 green.
- Item 3: in progress.

## Third fix-up (after the second verifier; the lead's rulings O1 to O5, with K to N)

Branch `rc44/wp9a-s1-topology-fix-c6`, from `rc44/wp9a-s1-topology-fix-c5` (`5cae40a`). Verifier:
`/home/user/hb-review/rc44-build/wp9a-s1-topology.verify2.json` (verdict merge, three new problems). Order of work, each
case first and seen to fail on the head the item started from, a WIP commit after each:
1. O1, the bookings checked: routeBookings refuses; the lead's file; the consistency check in S0's suite.
2. O2, trackPaths: the boundary says what a tracker changed; the tracker's answer retired.
3. O3, the notes.
4. O5, re-measured after O2 (O4 needs no code).
5. The notes, the suites, the final commit.

### One line each

| Item | State | Case (suite `rc44-wp9a-deployment-validate.mjs` unless named) |
|---|---|---|
| New problem 1: the M4 helper trusts whatever the evidence files record | done (O1): `routeBookings` refuses what it cannot trust; the lead's merge check adds the bookings up against the build | S0 block "O1 the bookings add up" (seen to fail on `5cae40a`) |
| New problem 2: M1 extended S0's contract; the boundary stamps whatever pairs a tracker answers | done (O2): the answer is retired; the boundary copies the package's `trackPaths` and stamps what a call changed; `assertTrackerStaysInPaths` holds that a tracker stays in them | S0 block "O2 tracked paths"; S1.24; S1.11; S1.21 (each new case seen to fail on `5cae40a`) |
| New problem 3: small inaccuracies in the notes | done (O3) | notes only: "Second fix-up", item 4; "Known limits" (e) |
| O1 | done: the four refusals, the lead's file, the merge check beside S0's build block | S0 "O1" |
| O2 | done: the row, its start check, the boundary's copy and stamp, the helper, the S0 block, wp9a's `trackPaths`, `trackTopology` answering nothing, `assembleParts`, S1.11 replaced, S1.21 holding, S1.24 calling the helper; the S0 contract text and the comments | S0 "O2"; S1.24; S1.11; S1.21 |
| O3 | done | notes |
| O4 | nothing to do (no code): confirmed as ruled | — |
| O5 | done: re-measured after O2; S1.10's pins old -> new; S0's row booked at 0 B in the lead's file; the merge check green on the final head; wp9a 342 B of 500 (158 B left), pool 98 + 0 B | S1.10; S0 "O1"; wp2 `size` |

### Where I read a ruling otherwise, or did a little more (plainly)

- **O1:** the lead's own figure is held to 0 (a file named `lead-bookings-size.json` that states bytes of its own is
  refused); the ruling says "(ownBytes 0)" and I read that as a rule. `routeBookings` also answers `own` for every file
  (the merge check needs it). The stale-figure case changes, in turn, each package file's own figure by one byte; the
  lead's own figure cannot be changed at all (refused), so it is not among them.
- **O2, the join:** `assembleParts` joins the parts' `trackPaths` in their order and lists each path once (two later
  parts may both mend zones); the ruling says "joins ... in their order".
- **O2, the helper is stricter than its words:** besides "the whole document outside the package's own keys, its
  trackPaths and changes.events", `assertTrackerStaysInPaths` holds that `prior` does not move, that the journal's
  earlier events stand as they were (outside `changes.events` alone, a tracker could rewrite an earlier event) and that
  the journal's counter moves by exactly the events added (the counter numbers them; the ruling does not name it). "The
  package's own keys" are its design and evidence keys, the keys of its design row and its lifecycle and provenance
  collections.
- **O2, two holes the new stamping would have opened, closed in S0's files:** (1) `stampTracked` stamps through
  `settle`, which, for a person's commit, reads a record that turned `confirmed` or stopped being a proposal as that
  person's confirmation or keep; a tracker's call is neither, so `settle` takes a flag (`tracked`) and a tracker's call
  confirms and keeps nothing and marks no draft of Sol's as a person's edit (S0 "O2", a confirmation the tracker sets;
  seen to fail with the flag taken out). (2) A stamp the tracker writes on a record of its paths is replaced by the
  boundary's copy's; a record it adds keeps no author or review stamp at all (the ruling: "not stamped as anyone's").
- **O2, the copy:** kept as each record's JSON text and read back only where a call changed it; measured at the
  runtime limits (2,000 zones, 2,000 placements), on the shared machine: about 9 ms per tracker call, 0.44 s for a
  reviewed batch of 50 commands (about 35 ms and 1.7 s with `structuredClone`).
- **O2, where the S0 block stands:** last in S0's suite, because it registers its synthetic package for good and no
  earlier block may read it; the O1 block stands beside the build block, as ruled.
- **O5:** the ruling expects route bytes for the part's name in `design-extension-parts.js`; that module is in no
  client bundle (S0's block 8 asserts it), so the build measures 0 B. The row is booked at 0 B in the lead's file with
  the build it was measured on, so that it is on the books.
- I do not disagree with any ruling of section O.

### What later slices must know (third fix-up)

- **Every package with a tracker:** it answers nothing. A tracker that mends records of a built-in collection states
  those collections as `trackPaths`; the boundary stamps what each call changed there. Its suite calls
  `assertTrackerStaysInPaths(extension, cases)` (`rc44-s0-readings.mjs`) on its tracker's cases, and asserts from the
  answer that the cases reach what the tracker changes.
- **wp2 (the adoption record, and S5 being built beside this):** `trackAdoptionChange` states no `trackPaths` and wp2's
  suite does not yet call `assertTrackerStaysInPaths`. By reading the code it writes the package's own `adoptions` and
  the journal only; wp2's owner shows it with the helper in wp2's next slice.
- **Every size file** (`audit/rc44/evidence/*-size.json`): an own figure of at least 0, a pool item that one file
  books, a negative pool item only in the lead's file. On every merge the lead's check in S0's suite (block "O1") must
  add up exactly against the integrated base; the slices built beside this one (wp2 S5, wp1 S2) fail it at the merge
  until their files book what their builds add.
- **wp9b:** known limit (e) with its consequence (Chapter 11's `review.checks`, the intake and a recorded architect
  review lapse after a package's proposal is dismissed), with the built-in seeds' rule (M6), the shared sentences (M7)
  and L11 (b).
- **Slice 2:** a part that mends zones (the failure set) states `trackPaths` in its own part; `assembleParts` joins them.

### By item

- **Item 1, O1: done.** Case: S0's block "O1 the bookings add up" (`rc44-s0-extensions-validate.mjs`, after block 8,
  whose build it reads). Seen to fail on `5cae40a` (`.aiw-local/third-fixup/o1-before.log`): a negative own figure, a
  pool item two files book, a negative pool item in a package's file and bytes of the lead's own were all accepted, a
  figure that is no integer was refused in other words, and the merge check did not exist. Now `rc44-s0-readings.mjs`
  `routeBookings` refuses each, naming the file (an own figure is an integer of at least 0; a pool item is an integer
  one file books; a negative pool item only in `lead-bookings-size.json`, whose own figure is 0), and answers `own` for
  every file beside `others`; `assertBookingsAddUp(route, base, dir)` is the lead's merge check: the route less the
  integrated base (3,229,840 B at `9673661`) is every file's own bytes plus the pool's, exactly, or it fails naming each
  file's figure. The block holds it on this build (765 = 0 + 325 + 342 + 98) and sees it fail for a stale figure (each
  package file's own figure changed by one byte, in turn), a foreign file with bytes, a foreign pool item and a negative
  pool item of the lead's that no build shows. `audit/rc44/evidence/lead-bookings-size.json` exists (schema v3, ownBytes
  0, sharedPoolBytes empty until item 2 measures S0's row, productionAccepted false). wp2's block `size` and S1.10 keep
  their two checks of M4 and pass unchanged.

- **Item 2, O2: done.** Cases: S0's block "O2 tracked paths" and wp9a's S1.24 "the tracker stays in its paths",
  with S1.11 replaced and S1.21 unchanged. Seen to fail on `5cae40a`: the start check refused `trackPaths` as no part
  of the contract (`.aiw-local/third-fixup/o2-s0-before-1.log`); with the start check and the helper left out, all
  five server cases failed (`o2-s0-before-2.log`: the record the tracker mended, answering nothing, was not stamped
  for a person's commit nor for an agent account's; a fabricated answer restamped a record the call did not change;
  a record the tracker added took the commit's stamp; a stamp the tracker wrote was kept); S1.11 failed ("a part
  states trackPaths"); S1.24 failed in its three parts (no trackPaths; trackTopology answered the pairs; no
  `assertTrackerStaysInPaths`) (`o2-wp9a-before*.log`). What was built:
  - S0 (`design-extension-parts.js`): the part `trackPaths`, start-checked (it needs `track`; a non-empty list of
    `chapter.collection` paths; none of the package's `lifecycle`, `provenance.records` or `provenance.paths`
    collections).
  - S0 (`design-extension-boundary.js trackExtensions`): before each call of a package's tracker the records of its
    `trackPaths` are copied (by id, in order); after it each record whose JSON the call changed is handed to
    `provenance.js stampTracked` with the copy as `was`; a record with no copy (one the call added) is no one's; the
    answer is not read. `stampTracked` stamps through `settle` with a new flag `tracked`: a tracker's call confirms and
    keeps nothing and marks no draft as a person's edit, and a stamp it wrote is replaced by the copy's; for an added
    record it removes the author and review stamps. Server only.
  - S0 (`rc44-s0-readings.mjs`): `assertTrackerStaysInPaths(extension, cases)`: the tracker on a copy of each case's
    `next`; `prior` unchanged; the journal's earlier events unchanged and its counter moved by the events added; the
    document outside the package's own keys (design and evidence keys, design row, lifecycle and provenance
    collections), its `trackPaths` and the journal unchanged; answers `{cases, changed, journalled}`.
  - wp9a: `trackPaths: ['runtime.zones', 'runtime.placements']` (what the mend changes: a zone's `nodeId` and
    `domainIds`, a placement's `nodeId`, with their `revision`); `trackTopology` answers nothing (and clones a record
    only where a restore brought it back); `assembleParts` joins the parts' `trackPaths` in their order, each path once,
    and its tracker answers nothing.
  - S1.24 calls `assertTrackerStaysInPaths` on nine cases of the tracker (no topology, the step, a node, a failure
    domain, a zone and a placement located, a zone and a placement a restore brings back naming what is not there, a
    proposal kept): the calls mend one zone and one placement and journal seven changes, and nothing else moves.
  - Mutations, each caught: without the boundary's stamp call, S0 "O2" (person, agent, added, stamp) and S1.21 ("the
    zone the mend changed is stamped as the commit's") fail; without the `tracked` flag, S0 "O2" fails on the tracker's
    confirmation stamped as A's review; without the unstamp of an added record, S0 "O2" fails on the added record.
  - Old -> new (wp9a's suite): S1.11 `j.track()` deep-equal to the parts' `[was, is]` pairs ("the trackers' answers are
    joined in the parts' order") -> `j.trackPaths` deep-equal to the joined paths, `j.track()` answers `undefined` though
    the parts answer, and every part's tracker runs in order; S1.11 the registration's keys gain `trackPaths`, with its
    value asserted. S1.21 is unchanged and green (the boundary now stamps what the mend changes).
  - The S0 contract text (`s0-extensions.md`: the `track` and `trackPaths` rows and paragraphs, the helpers, a section
    for this fix-up) and the comments of `design-extensions.js`, `design-extension-boundary.js`, `provenance.js`,
    `topology.js` and `topology-domain.js` say the same.
  - Route after item 2 (`node build.mjs`): 3,230,605 B, unchanged: the part's name is in `design-extension-parts.js`,
    in no client bundle (S0 block 8), and `stampTracked` and `settle` are server-only. In the lazy entry:
    `topology-domain.js` 20,903 B (unchanged: `trackPaths` added what the retired answer saved) and `topology.js`
    1,448 -> 1,503 B; S1.10 is red until item 4 re-measures it.
  - Suites after item 2: S0 28 of 28; wp9a 24 of 25 (S1.10, the pins).

- **Item 3, O3: done** (notes only; no case). Under "Second fix-up", item 4: the figures 246 B and 669 - 246 - 98
  are marked as the figures at item 4, with the final 342 B and 765 - 325 - 98 beside them. Known limit (e) names its
  consequence (Chapter 11's `review.checks`, the intake and a recorded architect review lapse after a package's
  proposal is dismissed, the safe direction) and its owner (wp9b, with the built-in seeds' rule). The second fix-up's
  lines on M1's answer are marked as retired by O2.

- **Item 4, O4 and O5: done.** O4 needs no code (it confirms the second fix-up's S0 edits: `quietProposals`,
  `routeBookings` as O1 amends it, `stampTracked` as O2 uses it). O5, re-measured after O2 with `node build.mjs` and
  S1.10 `--measure` (`audit/rc44/evidence/wp9a-s1-size.json`, its name now "after its third fix-up"):
  - chapters route 3,230,605 B, unchanged by items 1 to 3 (+765 B against `9673661`, +440 B against `rc44/integration`
    `a4c1690`; cap 3,233,792 B unchanged, 3,187 B left); projects 507,338 B; 148 script files; 53 files under 10 KB
    (buckets 53/50/45); stylesheet 901,873 B; no violation; no gate changed.
  - the lazy entry's pinned module bytes, old -> new (S1.10 `LAZY_SHARE`, recorded in its comment and the commit):
    `topology.js` 1,448 -> 1,503 B (`assembleParts` joins `trackPaths`, its tracker answers nothing);
    `topology-domain.js` 20,903 -> 20,903 B (the `trackPaths` row added what the retired answer saved); the four
    parts 10 B each and the lists 178 B unchanged; the package's share 22,569 -> 22,624 B against `a4c1690`'s entry.
    "Opens with records": 4,086,294 -> 4,086,349 B (855,689 -> 855,744 B in 12 scripts beside the route).
  - S0's part name booked in the lead's file: `trackPathsPartNameO2` 0 B (`design-extension-parts.js` is in no client
    bundle; the boundary's copy, `stampTracked` and `settle` are server-only), with the build it was measured on.
  - The consistency check of item 1 on this build: 3,230,605 - 3,229,840 = 765 = wp2 325 + wp9a 342 + the lead 0, plus
    the pool 98 (wp9a's 34 + 64) + 0 (the lead's): S0 block "O1" green; wp2's block `size` and S1.10 green.
  - Restated: **wp9a's own bytes 342 B of its 500 B, 158 B left**; the shared pool's bytes on the route 98 B (wp9a's
    file) + 0 B (the lead's file), so of the pool of the seven later packages (1,656 B after H1) 1,558 B are left, as
    ruling N1 states.

- **Item 5: done.** The notes (this section, "State", "Measurements", "Suites"); on the final code (`e87faa6`, whose
  code is the final head's: the commits after it change these notes only) the four rc44 suites, the browser case and
  the suites that import or exercise the changed files, `node check-syntax.mjs`, `node scripts/lint.mjs --summary` and
  `node build.mjs` (see "Suites", after the third fix-up); the lead's merge check by hand on the final build
  (`assertBookingsAddUp(3230605, 9673661)`: grew 765, own 667, pool 98); the final commit.

Measured before any change (`node build.mjs` on `5cae40a`): chapters route 3,230,605 B, projects 507,338 B, 148 script
files, buckets 53/50/45, stylesheet 901,873 B, no violation.

## Second fix-up (after the verifier; the lead's rulings M1 to M9, with K and L)

Branch `rc44/wp9a-s1-topology-fix-c5`, from `rc44/wp9a-s1-topology-fix-c4` (`1372785`). Verifier:
`/home/user/hb-review/rc44-build/wp9a-s1-topology.verify.json`. Each item: case first, seen to fail on the head the
item started from, then the change. Commits: `1efbecc` (item 0), `88a4468`/`d66c269` (1), `df4ff65` (2), `fd79252`
(3), `ee75ae6` (4), `81879af` (5), `5d4e02c`/`46cbd47` (6), `f45cb4c` (7), the final commit (8).

### One line each

| Item | State | Case (suite `rc44-wp9a-deployment-validate.mjs` unless named) |
|---|---|---|
| New problem 1: the mend un-types zones standing in a domain that is there but no person's | done (M1): the mend and the comparison read one predicate, there and no proposal; a mended zone or placement is stamped as the commit's | S1.21 (both of the verifier's paths, an AIW and a Sol domain; seen to fail) |
| New problem 2: a hand-made recovery package bypasses L5 | done (M2): the import moves the step aside before its early return; no date compared | S1.16 (a later review.at, no finalReview, both; seen to fail) |
| New problem 3: the chapter can be checked and handed off while the error stands | done as ruled (M3): the reading is the non-waivable class; no code change but the comment | S1.22 (through the server, beside the built-in state-protection error) |
| New problem 4: wp2's block `size` red | done (M4): each package's size case measures its own bytes | wp2 block `size`; S1.10 (both seen to fail) |
| New problem 5: the lazy-entry bound loosened without record | done (M5): set from the measurement, itemised by module | S1.10 |
| New problem 6: S1.7's K8 call guarded | done (M5): unconditional | S1.7 |
| New problem 7: two refusals name the type; the notes misattribute one | done (M7): the notes say which comes from where; wp9b rewords them | S1.0 (each sentence exact) |
| New problem 8: S1.14's weak match | done (M5): the exact sentence, refs read from the document that holds them | S1.14 |
| New problem 9: dismissing a proposal moves the version and clears the checks | done (M6): row `quietProposals`; built-in seeds unchanged (wp9b); the design stamp still moves by the retirement list (known limit (e)) | S1.23 (seen to fail) |
| Weakened: S1.10 `< 20000` -> `< 25000` without record | done (M5): replaced by the measured, itemised bound, recorded old -> new | S1.10 |
| Partly, should-fix 2: a recovery import kept who chose it | done with M2 | S1.16 |
| Partly, L2: compared only when they can be | done with M1 (the invariant holds again) and M3 (the reading of "cannot be checked") | S1.13, S1.21, S1.22 |
| Partly, L3: no zone or placement left naming a record that is not there | done with M1: the mend no longer over-reaches; it stamps what it changes | S1.14, S1.21 |
| Partly, L5: typed or not is design; who chose it is not | done with M2 (no bypass) and M1 (the copy's readings stay typed after its first commit) | S1.16, S1.21, S1.0 |
| Partly, L9: words and notes | done with M7: the shared sentences recorded where they come from, for wp9b | S1.0, S1.19 |
| M1 | done | S1.21 |
| M2 | done (`recovery-service.js`, exactly this) | S1.16 |
| M3 | done: recorded as the reading of L2 | S1.22 |
| M4 | done: `rc44-s0-readings.mjs routeBookings`, wp2's block and S1.10; the four rc44 suites green on the merged head | wp2 `size`; S1.10 |
| M5 | done | S1.10, S1.7, S1.14 |
| M6 | done: S0's row `quietProposals`, beside `lifecycle` | S1.23; S0 "L3 restore rule" |
| M7 | done: in the notes; S1.0 pins the sentences | S1.0 |
| M8 | done: the 64 B booked to the shared pool; wp9a's own 342 B, 158 B left | S1.10 |
| M9 | done: (e) and (f) recorded | — |

Where I read a ruling otherwise, or did a little more, plainly:
- M1: the mend's stamp needs the commit's author, which a tracker is not handed. Following H2 (the boundary keeps the
  stamp current, not the package), S0's `track` row may now answer `[[as it was, as it is]]` for records of other
  collections the tracker changed, and `trackExtensions` stamps each as the commit's (`provenance.js stampTracked`,
  server only; `worker.js` hands the author over). That is an edit of S0's boundary and contract, which M1 does not name.
  (Retired by ruling O2 in the third fix-up: the answer is ignored, and the boundary copies `trackPaths` instead.)
  The restore rule (L3) reads the same predicate as the mend and the comparison, so a node's restore is no longer
  refused because its domain is a person-kept record a draft changed since.
- M3: L2's words "the chapter cannot be checked, frozen as checked or handed off" are not built: as M3 rules, they mean
  the non-waivable class of rc.10.73.42. I agree with the ruling.
- M6: the statement is a row of its own (`quietProposals`), as `canRestore` is, not a new shape of `lifecycle`; it covers
  a proposal's restore too. The design stamp still moves by the retirement list (known limit (e)); M6 names version and
  check only, and closing the stamp too costs route bytes in `reviewSource` (not measured), so I left it to the lead.
- M7: pinning the shared sentences exactly in S1.0 means wp9b's rewording changes this suite too (recorded there as a
  known limit, old -> new to be recorded by wp9b).

### By item


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
- **Item 4, M4:** done. One rule for both size cases, in S0's helper for package suites:
  `rc44-s0-readings.mjs routeBookings(ownFile)` reads every `audit/rc44/evidence/*-size.json`: a package's own bytes as
  its evidence records them at its own head (`ownBytes`, or `delta` for a file that books its whole growth to its
  package, as wp2's v1 does) and the shared pool's (`sharedPoolBytes`, by item). The adoption record's block `size`
  (`rc44-wp2-adoption-cases/record.mjs`) and wp9a's S1.10 each hold: the build passes every gate with the caps
  unchanged; the figure recorded at the package's own head is inside its allowance (wp2: `delta` 325 B of 600; wp9a:
  `ownBytes` 246 B of 500, **the figure at item 4**); and this build's growth against the integrated base, less every
  other package's own bytes and less the shared pool's, is inside the allowance (**the figures at item 4**, before
  item 6 added M6's 96 B: wp2: 669 - 246 - 98 = 325 B; wp9a: 669 - 325 - 98 = 246 B; on the final head of the second
  fix-up wp9a's own bytes are 342 B, and 765 - 325 - 98 = 342 B, as "Measurements" says; ruling O3). Seen
  to fail first: wp2's block red at 669 B (item 0), then "wp9a-s1-size.json states no route bytes of its own" until the
  evidence was measured again; S1.10 failed on the old evidence file. Old -> new, at least as strict (with no other
  package's evidence the new assertion is the old one): wp2 `measured.chapters - INTEGRATED.chapters <= 600` ->
  `measured.chapters - INTEGRATED.chapters - othersTotal - poolTotal` in (0, 600]; wp9a `booked.wp9a = fromAdoption -
  registryOnceK6 - baselineDefectL10 <= 500` -> `ownBytes = fromAdoption - sharedPoolBytes (pinned to the itemised
  figures) <= 500`, plus the live build's growth less the other packages' own and the pool's in (0, 500]. The evidence
  is schema v3 (`ownBytes`, `sharedPoolBytes`; `booked` gone). The four rc44 suites on this head: see the commit.
  Not changed: wp2's `--measure` still writes the whole growth as wp2's `delta`, so it is to be run at wp2's own head
  only (on a merged head its own check `measured == size.slice` fails, so it cannot pass unnoticed).
- **Item 5, M5:** done.
  - The package's share of the lazy entry of the Chapter 10 Model view, set from the measurement on this head against
    the adoption record's entry (a4c1690 adds 833,120 B beside the route; this head 855,612 B): **22,492 B**, itemised
    by module from the entry's script: `topology-domain.js` 20,843, `topology.js` 1,431, the four empty parts 10 each,
    and the script's import and export lists with the rest of the closure 178. S1.10 pins each module's bytes of this
    build to those figures (every run, not only with `--measure`), records them in the evidence, and holds the share at
    most 22,492 B. Old -> new: `w.added - BASE_OPENS.added < 25000` (loosened from `< 20000` by the first fix-up without
    record; against the base's entry) -> the itemised modules exact and the share `<= 22492` against the adoption
    record's entry. Seen to fail first: the evidence held no share.
  - S1.7 calls `assertBuiltInChainsUnchanged` unconditionally (old: only `if (typeof … === 'function')`).
  - S1.14 matches the exact sentence ("FD-nnn cannot come back yet: FD-mmm, which it lies in, is not standing in the
    design. Restore it first, or bring FD-nnn back elsewhere."), both refs read from the document that holds the
    records (old: `/FD-/i`, the parent's ref read from a document that did not hold it).
- **Item 6, M6:** done, case S1.23 (seen to fail on `81879af`: "dismissing AIW's proposal moves no version"). S0's
  registration gains the row `quietProposals {path: true}` (start-checked: the package's own `lifecycle` collections
  only, `true` or not stated; S0's block "L3 restore rule" holds the start check; the contract row is in
  `s0-extensions.md`), read in `record-lifecycle.js`: a proposal of such a collection that is retired (dismissed) or
  restored a proposal moves no version and clears no check or handoff; a keep stays a design change, and the retirement
  of a record a person kept moves the version and clears the check as before. p30 states it for `technology.domains` and
  `runtime.nodes`. Built-in seeds keep their rc.10.73.42 rule (S1.23 holds a seeded need's dismissal moving Chapter 6's
  version and clearing its check and handoff): recorded for the lifecycle family's owner, wp9b. Route: 96 B in
  `record-lifecycle.js`, booked to wp9a's own. Deviation: the statement is a row of its own beside `lifecycle` (as
  `canRestore` is) rather than a new shape of the `lifecycle` row, so that `COLLECTIONS` and its readers stay as they
  are; and it covers a proposal's restore as well as its retirement (a proposal restored says nothing to the design
  either, ruling L6). Known limit, recorded in the case: the design stamp still moves by the dismissal's entry in
  `retired.records`, which the design fingerprint reads for every retirement on rc.10.73.42 (with M9 (e); see
  "Known limits" below). Old -> new: S1.11 the registration's keys gain `quietProposals`.
- **Item 7, M7, M8, M9:** done.
  - M7, which sentence naming a command type comes from where (S1.0 now pins each exactly; old: `/person/`):
    an agent account's request gets `authorship.js` `refuseUnreviewable`, before the project is read: "An agent or
    service account does not review, confirm, accept or approve (runtime.topology-start). A person signs in to do
    that."; a draft by Sol gets the same function's "A draft by Sol does not review, confirm, accept or approve
    (runtime.topology-start). A person signs in to do that."; an import (a person's account stating author kind
    `import`) gets S0's boundary (`design-extension-boundary.js` `extensionHandler`): "runtime.topology-start is a
    signed-in person's step: an import, a draft by Sol and an agent account review, accept and approve nothing."; a
    request with no signed-in actor would get the boundary's "Sign in: runtime.topology-start is a signed-in person's
    step." (the server's routes ask for a signed-in account before that). These are the workbench's and every
    package's sentences; they are reworded with the other shared sentences in wp9b (ruling A5). The first fix-up's
    notes attributed the agent account's refusal to the boundary: that was wrong, corrected here, under item 7 of the
    first fix-up and in open question 10. The package's own refusals name no command type (S1.19).
  - M8, the size evidence restated on this head after the merge with the adoption record (`node build.mjs`; S1.10
    `--measure`; `audit/rc44/evidence/wp9a-s1-size.json` schema v3): see "Measurements" (second fix-up).
  - M9, known limits added: (e) and (f), in "Known limits (rulings L11 and M9)" below.
- **Item 8, notes and the final commit:** done: this section; "Known limits (rulings L11 and M9)"; "Measurements"
  (second fix-up); "What later slices inherit" (second fix-up). Suites on the final head: see "Suites (second fix-up)".

### What later slices inherit (second fix-up)

- **Every package:** ~~S0's `track` may answer `[[as it was, as it is]]` for records of other collections it changed
  itself; the boundary stamps each as the commit's (M1).~~ Superseded by ruling O2 (third fix-up): a tracker answers
  nothing; a package states the built-in collections its tracker mends as `trackPaths`, and the boundary stamps what a
  call changed there. S0's row `quietProposals {path: true}` says that a proposal of
  a package's own lifecycle collection is no design change when it is dismissed or restored (M6). A package's size case
  follows one rule (M4): its evidence states `ownBytes` and, for anything booked to the shared pool, `sharedPoolBytes`
  by item; its suite asserts the recorded figure at its own head and this build's growth less every other package's
  own bytes and the pool's (`rc44-s0-readings.mjs routeBookings`), each inside its allowance. A file with only `delta`
  (wp2's v1) books its whole growth to its package.
- **Slice 2:** `hostingComparison` reads "standing" as there and no proposal, whoever changed the record last (M1); the
  tracker's mend reads the same predicate and stamps what it changes; L2's error is the non-waivable class (M3), and
  any finding slice 2 adds that "cannot be checked" means the same.
- **wp9b:** the shared sentences of a person-only step (M7, ruling A5); a built-in seed's dismissal, which moves its
  chapter's version and clears its check (M6, rc.10.73.42's rule, held in S1.23); the design stamp that moves by a
  batch's receipt and by the retirement list (M9 (e)); L11 (b).
- **The lead:** wp2's `--measure` writes the whole growth as wp2's `delta`, to be run at wp2's own head only; the
  registry's one-time cost (K6) is inside wp2's recorded `delta` until it is re-booked to the shared pool.

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
| L9 | done (item 7); the shared sentences for a person-only step still name the type (open question 10; ruling M7: wp9b) | S1.0, S1.19, S1.10 |
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
  wp9a has 158 B left of its 500 B on the chapters route (after the second fix-up: 342 B its own, against `a4c1690`).

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
    package (`design-extension-boundary.js`), not this package's: for the lead. (Corrected by the second fix-up, ruling
    M7: an agent account's request is refused by `authorship.js` `refuseUnreviewable`; only an import reaches S0's
    boundary sentence. See "Second fix-up", item 7.) The size evidence is rewritten
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

## Known limits (rulings L11 and M9)

- (a) A hand-made or hand-edited recovery package that carries typed fields without the marker is read by the
  built-in key; the commands cannot produce it (slice 6, or nobody).
- (b) An agent account retires and restores a person's node as it does a person's zone on rc.10.73.42, and an import by
  a person writes authored records stamped as imported: the lifecycle family's rule, for wp9b.
- (c) AIW's own proposals of the package are in no review plan until slice 6 gives them a surface; the SDD counts them.
- (d) For slice 2: no calculated verdict reads as confirmed an ancestor chain that an unreviewed draft changed.
- (e) A reviewed batch keeps its receipt in `workbench.history`, which the design fingerprint reads on rc.10.73.42: a
  batch of proposals moves the design stamp by its receipt alone (S1.8 holds that nothing else moves). Likewise, found
  by the second fix-up: a dismissal of a package's proposal moves no chapter version and clears no chapter's check or
  handoff (M6), but the design stamp moves by the dismissal's entry in `retired.records`, which the design fingerprint
  reads for every retirement on rc.10.73.42 (S1.23 holds it, marked KNOWN LIMIT). **Its consequence (ruling O3):**
  after a package's proposal is dismissed, Chapter 11's `review.checks`, the intake and a recorded architect review are
  no longer current (`finalChecksCurrent` goes from true to false), because the retirement list is in the design
  source on rc.10.73.42. That is the safe direction: a check lapses, and none stands that should not. It stays a known
  limit, **owned by wp9b** with the built-in seeds' rule (M6). Closing it would mean leaving such entries out of the
  design source (`review-domain.js reviewSource`, on the route: the second verifier measured 187 B in a scratch copy,
  more than wp9a had left).
- (f) No document bound is enforced by code; the package's limits keep its worst case near 3.74 M of the 8 M characters
  (S1.18), and later wp9a slices measure what they add against that.

## Measurements

**After the third fix-up** (the final head; `node build.mjs`; S1.10 `--measure`; ruling O5). The route did not move:
O1 is a suite helper and evidence, O2 is server-only on the route side (the part's name is in
`design-extension-parts.js`, in no client bundle; the boundary, `stampTracked` and `settle` are server-only) and its
client bytes are in the lazy entry.

| | 9673661 | rc44/integration a4c1690 | `5cae40a` (start) | This head | Cap |
|---|---|---|---|---|---|
| Chapters route (code) | 3,229,840 B | 3,230,165 B | 3,230,605 B | 3,230,605 B (+765 / **+440**) | 3,233,792 B (unchanged; 3,187 B left) |
| Projects route (code) | 506,829 B | 507,069 B | 507,338 B | 507,338 B | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 53 | 53 (buckets 53/50/45) | 61 (unchanged) |
| Stylesheet | 901,873 B | 901,873 B | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| Opens with records (D10), entry of `deploy-view.js` | 4,062,884 B | 4,063,285 B | 4,086,294 B | 4,086,349 B (855,744 B in 12 scripts) | — |

The package's share of the lazy entry: 22,624 B against `a4c1690`'s entry (was 22,569 B): `topology-domain.js` 20,903,
`topology.js` 1,503 (was 1,448), the four empty parts 10 each, the lists 178. Bookings on the route against
`9673661`: wp2 325 B, wp9a 342 B, the lead 0 B of their own; the shared pool 98 B (wp9a's file: the `fmt` fix 34, S0's
design row 64) and 0 B (the lead's file: S0's `trackPaths` row); 325 + 342 + 0 + 98 + 0 = 765 B, the route's growth,
exactly (S0 block "O1"). **wp9a's own: 342 B of its 500 B, 158 B left.** The pool of the seven later packages (1,656 B
after H1) has 1,558 B left.

**After the second fix-up** (this head; `node build.mjs`; S1.10 `--measure`, `audit/rc44/evidence/wp9a-s1-size.json`
schema v3; ruling M8). Bases, each built with `node build.mjs` from an archive of its commit: the integrated base
`9673661`, and `rc44/integration` at `a4c1690` (the adoption record as closed), which this branch merged.

| | 9673661 | rc44/integration a4c1690 | This head | Cap |
|---|---|---|---|---|
| Chapters route (code) | 3,229,840 B | 3,230,165 B | 3,230,605 B (+765 / **+440**) | 3,233,792 B (unchanged; 3,187 B left) |
| Projects route (code) | 506,829 B | 507,069 B | 507,338 B | 1,242,112 B (unchanged) |
| Script files | 148 | 148 | 148 | 148 (unchanged) |
| Files under 10 KB | 53 | 53 | 53 | 61 (unchanged) |
| Stylesheet | 901,873 B | 901,873 B | 901,873 B | 902,144 B (unchanged) |
| Opens with records (D10), entry of `deploy-view.js` | 4,062,884 B (833,044 B beside the route) | 4,063,285 B (833,120 B) | 4,086,294 B (855,689 B in 12 scripts) | — |

The 440 B against `a4c1690`, by module of the route outputs (metafiles of the two builds):

| What | Bytes | Booked to |
|---|---|---|
| The route stub with its import of `registerExtension` (`design-package-routes.js`) | 105 | wp9a |
| H1, `failureDomainKey` reads the typed domain (`runtime-model.js`) | 21 | wp9a |
| The lifecycle reads a package's restore rule (`record-lifecycle.js`, L3) | 47 | wp9a |
| The lifecycle reads `quietProposals` (`record-lifecycle.js`, M6) | 96 | wp9a |
| `simulateRuntime` reads the typed domain (`runtime-domain.js`, H4 of L7) | -10 | wp9a |
| The Model view keys a zone by it (`deploy-model.js`, H15 of L7) | -5 | wp9a |
| Import and export lists of the route outputs (+88), with `composition-design.js` +3, `model-impact.js` -1, `architecture-design.js` -2 | 88 | wp9a |
| S0's design row takes `chapter.key` (`review-domain.js reviewSource`, L5, L6) | 64 | the shared pool (M8) |
| `fmt` for `patchLinks` (`technology-domain.js`, the defect of rc.10.73.42, L10) | 34 | the shared pool (L10) |

**wp9a's own: 342 B of its 500 B (158 B left).** The shared pool's bytes from this package: 98 B (34 + 64). M1's
`stampTracked` (`provenance.js`) and M2's change (`recovery-service.js`) are server-only: the route does not grow by them
(the itemised modules show no `provenance.js` byte). The registry's one-time cost (K6, 110 to 123 B) is in the
adoption record's figure and in wp2's recorded `delta` (325 B), which wp2's evidence books to wp2; the lead re-books it
to the shared pool under K6 if wished. The shared pool of the seven later packages (F1, H1: 1,656 B) has thus given
98 B to wp9a's shared items, 1,558 B left, less the registry's 110 to 123 B once the lead books it there. Against
`9673661` the route grew 765 B: wp2 325 B (with the registry's cost), wp9a 342 B, the shared pool's 98 B.

The package's share of the lazy entry (ruling M5): 22,569 B against the adoption record's entry, itemised from the
entry's script: `topology-domain.js` 20,903, `topology.js` 1,448, the four empty parts 10 each, import and export lists
and the rest of the closure 178 (at item 5, before M6: 22,492 B, `topology-domain.js` 20,843, `topology.js` 1,431).

**After the first fix-up** (head `1372785`, as that fix-up recorded it; superseded by the figures above: the 64 B of
S0's design row are the shared pool's by M8, and the base is now `a4c1690`; `node build.mjs` and S1.10 `--measure`). Two
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

**After the third fix-up** (the final code; logs under `.aiw-local/third-fixup/`, not committed). The rc44 suites, run
again on the final head one after another: `rc44-wp9a-deployment-validate.mjs` 25 of 25 (S1.10 with `--measure` at
item 4; S1.24 new; S1.11 as replaced; S1.21 unchanged); `rc44-s0-extensions-validate.mjs` 28 of 28 (blocks "O1 the
bookings add up" and "O2 tracked paths" new); `rc44-wp1-knowledge` 34 of 34 (4 pending); `rc44-wp2-adoption-validate.mjs`
20 of 20 (its block `size` green under M4 and O1); `rc44-wp9a-deployment-browser-validate.mjs` 1 of 1 against the client
`node build.mjs` built on this head (port from 4100, its own `.aiw-local` database, no server left running). The suites
that import a changed file (`provenance.js`, the boundary, `design-extension-parts.js`, `design-extensions.js`, the
package's modules, `rc44-s0-readings.mjs`) or run the server that does (`worker.js` imports the boundary and
`provenance.js`), green and unedited: `provenance`, `seeded-proposals`, `evidence`, `changes`, `design-records`,
`validation-confirmation`, `deploy`, `runtime`, `workspace`, `fingerprint`, `action-undo`, `recovery-authority` and
`review-plan`, run again on the final head; and, run on `e87faa6` (the same code) after its commit, `action-undo-api`,
`drafter-groups`, `technology`, `model-alternatives`, `rc42-g7-data-contracts`, `wire-merge`, `sdd-architecture`,
`rc42-g3c-evidence-fingerprint`, `review`, `interfaces`, `security`, `technology-realisation`, `service-routes`,
`journal-archive`, `rc42-g1-tech-approval`, `rc42-g4-trace-kernel`, `rc42-g5-runtime`, `readiness`,
`reference-projects`, `not-stated`, `chapter-lines`, `platform`, `component-needs`, `model-lifecycle`,
`execution-journey`, `quality`, `driver-kinds`. Red, each as on the baseline: `test:command-equivalence` and
`test:sol-disclosure` (both among the 37 of `audit/rc42/regression-2026-11-16.json`; they import `provenance.js` and
`design-extensions.js`) fail with the baseline's own line ("a working choice made: the saved document is the one the
route saved before round 12 · $.workbench.history[1]" and "The desk no longer holds F:capacity:run-001,
F:capacity:run-008"), and fail the same way on a copy of `94dbd4f`. `test:requirements` (not among the 37) is
intermittent under load: a timer of `public/requirements.js` `showTip` reads `innerWidth` after the suite's window is
gone (`ReferenceError: innerWidth is not defined`); on this code it passed 2 of 5 runs, and on copies of `94dbd4f` and
`5cae40a` it failed the same way in 1 of 2 runs each; the fix-up touches neither the module nor the suite. `node
check-syntax.mjs`: 938 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, 0 new. `node
build.mjs`: built, no size violation (chapters route 3,230,605 B, 148 script files, buckets 53/50/45). None of the other
suites red at the baseline was run, and no full regression (the lead runs it).

**After the second fix-up** (the final head; the machine shared, so times are long): `rc44-wp9a-deployment-validate.mjs`
24 of 24 (S1.10 with `--measure` at item 6, the last code change); `rc44-s0-extensions-validate.mjs` 26 of 26;
`rc44-wp1-knowledge` 34 of 34 (4 pending); `rc44-wp2-adoption-validate.mjs` 20 of 20 (its block `size` green under
M4); `rc44-wp9a-deployment-browser-validate.mjs` green against the client built by `node build.mjs` on this code (port
from 4100, its own `.aiw-local` database, no server left running). For the files changed: `recovery-service.js`
(M2): `recovery-authority`, `recovery-size` (407 s under load; 57 s at the baseline), `rc42-g2-library`, `rc42-g3a-risk-
and-limits`, `rc42-g3b-trace-and-delivery`, `intake`, `knowledge-retrieval`, `operations`, `service-routes`;
`record-lifecycle.js`, `design-extension-parts.js`, the boundary and `worker.js` (M1, M6): `changes`, `provenance`,
`seeded-proposals`, `review-plan` (392 s under load), `technology`, `runtime`, `sdd-architecture`,
`validation-confirmation`, `model-lifecycle`, `action-undo`, `action-undo-api`, `rc42-g7-data-contracts`,
`design-records`, `deploy`, `rc42-g5-runtime`, `fingerprint`, `review`, `rc42-g3c-evidence-fingerprint`, `workspace`,
`model-alternatives`, `interfaces`, `technology-realisation`, `journal-archive`, `readiness`, `reference-projects`,
`not-stated`, `wire-merge`, `chapter-lines`, `security`, `rc42-g1-tech-approval`, `rc42-g4-trace-kernel`, `platform`,
`component-needs`: all green, none edited. `node check-syntax.mjs`: 938 modules pass. `node scripts/lint.mjs --summary`:
162 problems, baseline 162, 0 new. `node build.mjs`: built, no size violation. None of the 37 suites red at the baseline
was run, and no full regression (the lead runs it).

**After the first fix-up** (head `1372785`, the adoption record of `25cc426`): `rc44-wp9a-deployment-validate.mjs` 21 blocks green
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

10. **The shared sentences for a person-only step name the type** (closed by ruling M7: reworded in wp9b with the
    other shared sentences). Two places, not one as asked first: `authorship.js` `refuseUnreviewable` for an agent
    account and a draft by Sol ("An agent or service account does not review, confirm, accept or approve
    (runtime.topology-start). A person signs in to do that." and "A draft by Sol does not …"), and S0's boundary
    (`design-extension-boundary.js`) for an import ("runtime.topology-start is a signed-in person's step: an import, a
    draft by Sol and an agent account review, accept and approve nothing."). S1.0 pins all three.
11. **wp2's suite on a branch that holds both packages.** Its block `size` asserts "this build is inside the allowance
    of wp2" as the whole route against the integrated base: with wp9a merged that is 660 B, over 600, though wp2's own
    figure (the adoption record against the base) is 316 B. It counts every package's bytes as wp2's; the lead
    re-measures at each merge (K6). Not edited here. (Closed by ruling M4 in the second fix-up, item 4: the block now
    takes the other packages' own bytes and the shared pool's out, `rc44-s0-readings.mjs routeBookings`.)
12. **A reviewed batch's receipt moves the design stamp.** `workspace.apply` keeps its receipt in `workbench.history`,
    which the design fingerprint reads on rc.10.73.42, so a batch of proposals moves the design stamp by its receipt
    though the proposals say nothing (S1.8 holds the rest). Built-in; for every batch. (Recorded as known limit M9 (e).)
14. **The adoption record's follow-up does not finish its own suite.** On `rc44/wp2-s1-lead` at `ec0cd3c` the block
    `upgrade` of `rc44-wp2-adoption-validate.mjs` runs without end, and `upgradeAdoptions(bankPaymentApplied())` does
    not return in 30 s: the loop that skips an id a record holds (`adoption-upgrade.js`, K9 (c)) seems never to find a
    free one (perhaps `typeOf` answers the adoption's own type for every `ADP-` id, through the minted prefix). Not
    this package's code; this head keeps `25cc426` until the lead's merge. (Closed: `a4c1690` checks a minted id
    against the ids the document holds; merged in the second fix-up, item 0, and wp2's suite is green on this head.)
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
