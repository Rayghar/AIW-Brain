# rc44 slice S0-D12: who wrote what a merge writes — build notes

Built on `rc44/s0-d12-merge-author`, from `53ce4cf` (rc44/integration: S0, wp1 S1 to S3, wp2 S1 and S5, wp9a slice 1).
Rulings: D1, D7.1, D12, F3, F4, H2, H3, J3, J9 and Y3 of `RULINGS-2026-11-18.md` (the lead's, in the main checkout).
A lead-owned slice of wave 2; the lead gave leave to edit the shared files narrowly. `productionAccepted` stays false.
No external authority is involved or impersonated: the slice changes who the server's stamps name, nothing else.

## State

- **Done:** Y3 and H3 built, each case first and seen red; S0's block "D12 a record a merge wrote" replaced (old -> new
  below) and block "H3 a staged handler states no author" added; wp9a's S1.15 known limit of D12 replaced (old -> new
  below); the route measured (0 B) and booked in the lead's file as an item of its own; S0's notes amended where they
  said a merge stamps no author.
- **In progress:** nothing. The final suites, syntax, lint and build ran on the code of the final commit (only these
  notes changed after them).
- **Next (for the lead):** review and merge; the open questions below. S0's suite needs no other change with the build's
  packages registered (29 checks green); nothing in S0 is asked of the lead beyond what this lead-owned slice did.

## What the code did at the start (53ce4cf)

- `workspace.alternative` (`public/workbench-domain.js`) kept `{id, revision, title, reason, commands, targets, basis,
  scenario, status, at, actor}`: the actor who saved it, **not** the author kind, and nobody per command.
  `workspace.revise-alternative` replaced the commands, set `actor` to the reviser and kept the earlier revision in
  `history`. So an alternative did not record who prepared each command.
- `workspace.merge` applied the rebased commands one by one with `applyCanonical(p, c, at, merger)`. The server's stamp
  (`stampAuthorship`) read `innerCommands(workspace.merge)`, which is empty (a merge names no commands), so a record the
  merge made carried no author stamp (D12). `stampExtensions` (H2) then restamped every **existing** record of a
  collection a package holds (wp2's `selection` paths hold `decisions.records`, `realisation.components`,
  `logical.assets`) that the merge changed as the merger's: an agent account's change, merged by a person, read as the
  person's. And a record a merge made from a draft by Sol or an agent account's alternative carried no stamp, so,
  unless its own fields said otherwise (an origin), the provenance reader read it as written by a person (its default):
  the SDD counted it so. It now reads "Drafted by Sol · reviewed by <merger>".
- A package's staged handler inside a batch (`applyCanonical` -> `x.apply`) is called with four arguments; an event it
  added kept whatever author fields it wrote (H3). The boundary stripped them only for a tracker and for a command sent
  on its own (`unstated`).
- A merge request that carried `commands` of its own (no client sends one) had them read by `innerCommands`, so the
  merge-level `stampAuthorship` stamped what the merge wrote as the merger's (found while building: case below).

## What was built

| File | What | Route |
|---|---|---|
| `public/workbench-domain.js` | `workspace.alternative` keeps `authors[i] {kind, by, account, at, session?}` beside `commands[i]` from the commit's author; `workspace.revise-alternative` names its reviser for a command it changes or adds, keeps the preparer of one it carries as it was (by `digest`), and its history entry keeps the list it replaced; the merge calls the option `merged(q, c, i)` after each command. Without an author (a caller that is not the server) nothing is written, as before. | 0 B: `applyWorkbenchCommand` is in no client bundle (the browser previews with `previewWorkingChange` and `previewScenarioAlternative`; the server applies) |
| `public/provenance.js` | `mergeStamper(prior, command, merger, at, {fourEyes, collections, also})`: per command, the same `stampAuthorship` and the packages' `stampChanged` as any commit, with the preparer as the author, against a copy of the command's collections (and the packages') as the merge left them before it; then `author.mergedBy` and `reviewed {by: merger, at, how: 'merged'}` on what it wrote, or `reviewed.mergedBy` beside a keep or a confirmation it applied. `null` (merge as before) when a command names nobody or the list was written before a restore or a template copy (F3). | 0 B: server only (no client chunk holds it; checked in the build) |
| `worker.js` | Hands the merge its stamper; skips the merge-level `stampAuthorship` and `stampExtensions` when it ran; calls `unstatedStaged` after the apply. | server |
| `design-extension-boundary.js` | `personBehind` counts a merge's review; `mergedRefusal` refuses the preparer and the merger while the merge's stamps stand, in words that fit any package; `stampedCollections`; `unstatedStaged` (H3). | server |

Words of the refusal: "A second person's step needs two persons: <id> reads as <preparer> prepared it in an alternative
and <merger> merged it. A signed-in person who neither prepared nor merged <id> takes this step."

## Cases (each seen to fail first)

In `rc44-s0-extensions-validate.mjs`:
- **"D12 a record a merge wrote"** (replaced). On `53ce4cf`'s code it fails at "a person: the alternative names who
  prepared each command" (no list). It proves, for an alternative a person staged, one Sol drafted (a person's session,
  authorKind sol-draft) and one an agent account staged, each merged by a second person: the alternative's list; a
  package's record (`SYN`) and a built-in one (a decision) stamped as written by the preparer (kind and actor) and
  reviewed by the merger; a draft by Sol stays Sol's and an agent account's the agent's; the second-person step refused
  for the preparer (on the record, on a projection that names only who applied it, on the built-in record) and for the
  merger (package and built-in), nothing accepted by a refusal, a third person accepting both. Then: a merge request
  that carries commands of its own restamps nothing (red with the merge-level `stampAuthorship`: the merged decision
  read as the merger's); a revision by a person of an agent account's alternative names the reviser for what it changed
  or added and keeps the agent for what it carried, its history keeps the earlier list, and the merged records carry
  each its own preparer; a later unchanged save keeps the merge's stamps, a confirmation keeps who wrote it, a person's
  change makes it theirs; a keep a person prepared, merged by another, is the preparer's keep with the merger beside it,
  and neither is the second person; a topology node a person prepared is stamped and reviewed, one Sol or an agent
  account prepared arrives as their proposal with no stamp; an agent account's change of a person's decision, merged,
  is the agent's (it read as the merger's); no alternative can carry an adoption's or a selection's step; and an
  alternative saved before this build (its list taken out of the stored row) merges as before, with **every assertion
  of the earlier block kept as it was**; one whose list predates a restore merges as before.
- **"H3 a staged handler states no author"** (new). A synthetic staged handler (`forge = 'staged'` in `applySynthetic`)
  journals with forged author fields. On `53ce4cf`'s code the reviewed batch keeps them ("the commit's author, not the
  handler's words"). Proven sent on its own, in a reviewed batch, in a batch an agent account drafted and in a merge.
- The block's built-in second-person step is `zm-vouch` (`vouch.accept` on `decisions.records`, as wp2's
  `selection.confirm` acts on decisions), registered in the block: a decision keeps no writer of its own, so its
  projection names whom the server's stamp names.

## Replaced assertions (old -> new)

1. `rc44-s0-extensions-validate.mjs`, block "D12 a record a merge wrote" (S0's suite, not on `94dbd4f`). Old: an
   alternative a person (A) saved and merged leaves its records with no author stamp
   (`[rec.actor, rec.provenance?.author, …]` = `[A, undefined, undefined]`), so a second person's step is refused for B
   and C in the NO_PERSON words, A is refused as its author, an unchanged save stamps nothing and leaves it refused, a
   person's save or confirmation lets a second person accept. New: those same assertions, unchanged, for an alternative
   saved before this build (the stored row rewritten without the list), **and** for an alternative saved on this build
   the stamps of the preparer and the merger, the refusal of both and the acceptance by a third person, for a package's
   and a built-in record and three kinds of preparer (and the cases listed above). The second-person step is still
   refused for whoever wrote the record, and now also for the merger.
2. `rc44-wp9a-deployment-validate.mjs`, block S1.15 (wp9a's suite, not on `94dbd4f`), l.747. Old:
   `[placement.provenance?.author?.kind, zone.provenance?.author?.kind]` deepEqual `['sol-draft', 'sol-draft']`,
   "KNOWN LIMIT (ruling D12): a merge stamps no author". New: the relocated node and reason are asserted, and
   `[stamps(placement), stamps(zone)]` deepEqual `[['person', B, C, C, 'merged', 'person'], …twice]` (kind, by,
   mergedBy, reviewed by, how, authorship). The case's comment and pass line say so.

No assertion of a suite that exists on `94dbd4f` was touched.

## Measurements

`node build.mjs` (dist/client-size-report.json), at `53ce4cf` and at this head:

| | before | after |
|---|---|---|
| routes.chapters.code | 3,228,648 B | 3,228,648 B |
| scripts | 148 | 148 |
| buckets (under 10 KB, 10 to 50 KB, over 50 KB) | 52, 51, 45 | 52, 51, 45 |
| violations | none | none |

Booked: `audit/rc44/evidence/lead-bookings-size.json` `sharedPoolBytes.mergeAuthorY3` = 0, with its item (ruling,
measurement, why). S0's block "O1 the bookings add up" passes on this build.

## Deviations from the design (the task's wording)

- **An adoption:** no command an alternative can carry writes one on this build (`adoption.*` are person or second
  steps, the selection's are not staged), so no merge writes an adoption; the case proves an alternative holding one is
  refused. The package records the cases merge are the synthetic `SYN` and a topology node.
- **A package's record cannot be changed through an alternative, only made:** `targetSnapshot` reads the journey index,
  which holds no package record, so the rebase answers "Removed records require a new alternative." (pre-existing). The
  agent's change of a person's record is shown on a decision, a built-in record in a collection a package holds.
- **Where the list is written:** in `applyWorkbenchCommand`, where an alternative is written (the server passes the
  commit's author already), not as a step of `worker.js` after it. An earlier WIP commit did the latter; it was moved.
- **A keep or a confirmation** an alternative carries is stamped as its preparer's (as `settle` stamps any person's keep),
  with the merger named beside it (`reviewed.mergedBy`), so the merger is not the second person there either.
- **The merge-level stamping does not run** when the per-command stamper ran (it covered everything the merge wrote, and
  a merge request's own `commands` could otherwise restamp the records as the merger's).
- **Four eyes** (a project's setting) is applied per command, as for any commit: a merge whose command confirms what
  its own preparer wrote in it is refused in such a project (it was not before, because nothing was stamped).

## Known limits (recorded, not closed)

1. An alternative saved before this build (no list), one with a command carried from such an alternative (null), or one
   whose list predates a restore merges as before: what it makes carries no author stamp, and an existing record of a
   collection a package holds that it changes is restamped as the merger's (`stampExtensions`, as on `53ce4cf`).
2. The preparer is named by the merge's stamps only while they stand. After a person's later change of what the record
   says, the stamp names that person, and the record's own history (a package's `history`, written by its handler with
   the merger as the actor) does not name the preparer: the preparer of the earlier revision could then be the second
   person, unless the package's projection names them. (Before this build the preparer was never named.) Two ways to
   close it, for the lead: a list of merges kept on the record's provenance across saves, or the preparer handed to a
   package's staged handler as its actor in a merge.
3. A brief the merge changes is versioned as the merger's (`versionBrief` reads the commit's author).
4. A record's label reads "reviewed by <merger>": `HOW_WORDS` has no word for `merged` (one would cost route bytes).
5. The journal events of a merge name the merger, the commit's author, as before.

## Suites

Not the full regression (the lead's). Run on this branch, one after another, on a loaded machine:
- The four rc44 suites: S0 (29 checks), wp9a (25), wp2, wp1: green on the head.
- Every suite that imports `public/workbench-domain.js`, `public/provenance.js` or the boundary, with action-undo,
  action-undo-api and the authorship suites (journal-archive, local-accounts, model-reconciliation, module-model,
  drafter-groups, rc42-g1-tech-approval, rc42-g7-data-contracts, review-plan, sol-disclosure): green, but for two.
- `sol-disclosure` and `command-equivalence` fail, each in the same words on `94dbd4f` (a git archive, run alone) and on
  `53ce4cf` as on this branch ("The desk no longer holds F:capacity:run-001, F:capacity:run-008 …"; "a working choice
  made: the saved document is the one the route saved before round 12 · $.workbench.history[1] …"): red at the
  baseline, as the lead's merge evidence classifies them.
- `review-plan` took 332 s here and 384 s on an archive of `53ce4cf` at the same time (37 s in the lead's run): load.
- `node check-syntax.mjs`: 945 modules. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, 0 new.
  `node build.mjs`: every gate passes (measurements above).

## Open questions (for the lead)

1. Known limit 2: is the preparer of a merged revision to be refused for good (as a writer of any revision), and by
   which of the two ways?
2. wp9a's suite: the comments of S1.8 ("a merge stamps no author: the lead's ruling D12") and of the tail of S1.12 ("a
   keep inside a merged alternative stamps nobody") no longer describe the build; their assertions still hold (the
   merged node is a proposal; S1.12's tail builds its documents by hand). Not edited: wp9a's words.
3. The SDD's line "Written by an upgrade of the project or by a merge, with no author stamp" stays true of records
   merged before this build; it could name the build.

## Fix-up (rulings Z1 to Z8; branch rc44/s0-d12-merge-author-fix, from e91365c)

Progress (kept current while the fix-up runs; the final lines follow once it closes):
- Done: Z1 (19e4fe1), Z2 (ee3d4cc), Z3 (c3605cf), Z4 (3f711d9), each case first in S0's suite (blocks Z1 to Z4).
- In progress: Z5. Next: Z6, Z7, Z8, then the final suites, syntax, lint, build and the closing commit.
- Route: 3,228,648 B at e91365c; 3,228,741 B after Z4 (+98 B verifierRefusal, -5 B minifier names); booked
  `mergeAuthorY3` = 93 B in the lead's file.
