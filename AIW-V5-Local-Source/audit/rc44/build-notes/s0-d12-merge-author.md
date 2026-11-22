# rc44 slice S0-D12: who wrote what a merge writes — build notes

Built on `rc44/s0-d12-merge-author`, from `53ce4cf` (rc44/integration: S0, wp1 S1 to S3, wp2 S1 and S5, wp9a slice 1).
Rulings: D1, D7.1, D12, F3, F4, H2, H3, J3, J9 and Y3 of `RULINGS-2026-11-18.md` (the lead's, in the main checkout).
A lead-owned slice of wave 2; the lead gave leave to edit the shared files narrowly. `productionAccepted` stays false.
No external authority is involved or impersonated: the slice changes who the server's stamps name, nothing else.

## State

- **Fix-up (after the review and the lead's rulings Z1 to Z8):** done; see the section "Fix-up" at the end, which
  supersedes what this build's sections below say where they differ (the domain's actor in a merge, the old merge path,
  the date comparison, the readings of a merge).
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

The adversarial review of e91365c (`/home/user/hb-review/rc44-build/s0-d12-merge-author.review.json`: five must-fix,
six should-fix, four design concerns) and the lead's rulings Z1 to Z8 of 2026-11-22. One fix-up round, each item case
first in S0's suite (`rc44-s0-extensions-validate.mjs`, blocks "Z1" to "Z7"), each seen red on the head it started
from (e91365c, or 53ce4cf where the ruling says so), with a WIP commit after each item.

**State.** Done: Z1 to Z8 and every review item below. In progress: nothing. Next (the lead): the verifier, then the
merge. Nothing of the fix-up is left undone; the points where I read a ruling one way are under "My readings".

### One line per ruling
- **Z1** done (19e4fe1). The merge applies command i with its preparer as the domain's actor (`merged.by(i)`,
  `workbench-domain.js`), so a package record's `actor` and `history` and a delivery action's `actor` name the preparer
  as a direct write does; the merger stays `author.mergedBy` and `reviewed {how: 'merged'}`. `verifierRefusal`
  (`public/architecture-obligations.js`) refuses whom `author.mergedBy` or `reviewed.mergedBy` names ("… <actor>
  merged <id>."); the boundary reads the merge's stamp first (`mergedRefusal`, then `verifierRefusal`). Case "Z1":
  after a later change by the merger and by a third person, `synthetic.endorse` (a projection) and `synthetic.accept`
  refuse the preparer and the editor in exactly the words a direct writer and editor get, and a third person takes the
  step; on the obligation verifier the same for the merger's and a third person's later save, a third or fourth person
  verifies, and while the stamp stands the merger is refused in the verifier's words. Red on e91365c (the record's
  actor and history named the merger; A's endorse was taken after B's change; a merged action named B). Route +98 B,
  booked.
- **Z2** done (ee3d4cc). `neutraliseImportedAuthority` moves each alternative's `authors`, and every history entry's,
  to `importedAuthors` before its early return; `mergeStamper` compares no date. Case "Z2", through `/api/recovery`
  preview and restore of a hand-edited project JSON: future-dated authors naming a third person, an agent account's
  entry relabelled as a person's, the real preparer relabelled who then takes the second person's step (refused in the
  NO_PERSON words), and a document without `finalReview` (called as wp9a's S1.16 calls it). Red on e91365c.
- **Z3** done (c3605cf). A revision keeps the preparer of a command equal to the stored one or to its rebased form, each
  stored command matched once; a command that differs from both is the reviser's and its entry carries the earlier
  preparer's kind as `from` (the stored command of the same type and record, at its place first), which the merged
  stamp keeps. Case "Z3", with the editor's payload after another person's direct edit of the target: the list stays
  `[['sol-draft', AGENT]]` and the merged decision `['sol-draft', AGENT, B, B, 'merged']`. Red on e91365c (`[['person', A]]`).
- **Z4** done (3f711d9). The four-eyes refusal of a merge names the command, the alternative and its preparer and says
  what to do: "Four eyes: command 1 of “An alternative” (review.narrative) was prepared by architect-a and confirms what
  architect-a wrote (…). Revise the alternative without the confirmation; another signed-in person confirms it after the
  merge." Case "Z4": on 53ce4cf the merge answered 200 and the narrative read as confirmed (the bypass); on e91365c it
  was refused in words for nobody; now in the merger's words, and the alternative without the confirmation merges and
  another person confirms it after.
- **Z5** done (d65591e). One merge path: `mergeStamper` stamps every merge, command by command; a command its alternative
  names no preparer for (no list, a null entry, a list the import moved aside) stamps what it writes as nobody's (a record
  it made or whose words it changed keeps no author or review stamp; one it only kept or confirmed keeps no review
  stamp); `worker.js` no longer runs `stampAuthorship` or `stampExtensions` for a merge. The storage upgrade's activity
  counts the draft alternatives that name no preparer for some command (one sentence, only where there is any). Case
  "Z5": a person's decision an alternative saved before this build changes is nobody's after the merge and the second
  person's step is refused for the merger and a third person until a person saves it (red on e91365c: it kept A's stamp
  and the step was taken); a mixed list stamps the named command as its preparer's and the null one as nobody's; the
  storage upgrade's report counts two such drafts. No assertion held the old path (block D12's "saved before this build"
  assertions hold as they were); none replaced.
- **Z6** done (b64e909), item by item: (1) a merge request carrying commands of its own is refused, "A merge applies the
  commands the alternative holds: send none with it." (case "Z6", red on e91365c: 200, and P2's false package name is
  gone with it; D12's two-outcome case replaced by one outcome); (2) mixed lists follow Z5 (case "Z5"); (3) the
  reviser's `from` (case "Z3"); (4) the merger of a keep or a confirmation is refused in words that say "kept" or
  "confirmed" (case "Z6", with a requirement a person wrote and another confirmed in an alternative; D12's keep
  assertion replaced); (5) `unstatedStaged`, `markPackages` and `stampAuthorship` read one command form (`worker.js`
  `applied`; no behaviour changes, so no case: no package command reaches the reconciliation); (6) the stale words: wp9a's
  S1.8 and S1.12 comments, the SDD's comment and Appendix E line ("Written by an upgrade of the project or by a merge
  of an alternative that names no preparer, with no author stamp"; D5's assertion replaced), S0's notes (item 1 of
  "What later slices must know", the D1 contract paragraph, the S0-D12 section).
- **Z7** done (b64e909). `reviewOf` answers no review for `how: 'merged'`, so the SDD counts no merged record as
  confirmed (it is counted as its preparer's, from the stamp), the review plan lists a merged draft by Sol until a
  person confirms or keeps it, the summary and the disclosure count it as not reviewed, and a judgement's scope covers it;
  `personBehind` reads the merge's stamp, so D1 still counts the merger as a person behind the record. Appendix E says
  "Merged from workbench alternatives: N records, counted as written by whoever prepared them; merged by <names>. A merge
  is a person's review of the alternative and confirms no record's words." only where there is one. A record's label
  reads "Written by architect-a · merged by architect-b", or "Drafted by Sol · merged by architect-b, not reviewed".
  Case "Z7", red on the code before (the merged records counted as confirmed). Route +197 B (`public/provenance.js`).
- **Z8** recorded (no code; the lead's S0-import slice in wave 3). Known limit, to be stated in the merge evidence:
  every stamp a recovery import carries on a record is still decided "from elsewhere" by a date comparison
  (`personBehind`'s `here()`, `reviewOf`'s `historicalReview`): `provenance.author` and `provenance.reviewed` of imported
  records, and the merge stamps (`mergedBy`, `how: 'merged'`) an imported record carries. A hand-edited package whose
  record stamps are dated after the import still counts them as a person behind the record. Only the alternatives' lists
  are moved aside (Z2). Slice S0-import moves every imported stamp aside so that no date decides, beside S0-D10 and
  S0-B10.

### One line per review item
- must-fix 1 (an import forges a preparer): Z2, case "Z2". Done.
- must-fix 2 (a revision through the editor puts a person's name on an agent's draft): Z3, case "Z3". Done.
- must-fix 3 (the preparer refused only while the stamp stands): Z1, the preparer is the domain's actor; case "Z1". Done.
- must-fix 4 (the obligation verifier does not refuse the preparer or the merger): Z1, both ways of the review (the
  preparer through the action's actor and history, the merger through `verifierRefusal`'s reading); case "Z1". Done.
- must-fix 5 (the four-eyes refusal of a merge has no case and wrong words): Z4, case "Z4". Done.
- should-fix 1 (one outcome for a merge carrying commands): refused; case "Z6", D12 replaced. Done.
- should-fix 2 (mixed lists): Z5, command by command; case "Z5". Done.
- should-fix 3 (`from` for a revised draft by Sol): Z3; case "Z3". Done.
- should-fix 4 (kept or confirmed in the merger's words): case "Z6"; D12 replaced. Done.
- should-fix 5 (`unstatedStaged`'s command form): one form in `worker.js`; no behaviour changes. Done.
- should-fix 6 (stale comments and the SDD line): done as listed under Z6 (6).
- design concern 1 (the import boundary is a date comparison): for alternatives, Z2; for record stamps, Z8 (S0-import).
- design concern 2 (two readings of who wrote a merged record): Z1, one source: the preparer is the domain's actor.
- design concern 3 (the old merge path beside the new): Z5, retired; the storage upgrade counts what still takes it.
- design concern 4 (the SDD reads a merge as a confirmation): Z7.

### Replaced assertions (old -> new)
Items 1 to 8 are in `rc44-s0-extensions-validate.mjs`: 1 to 5, 7 and 8 in block D12, which this slice added at e91365c
(not on 53ce4cf); 6 in S0's block D5, on 53ce4cf. Items 9 and 10 are in wp2's and wp1's suites, on 53ce4cf.
1. D12 `assert.equal(syn.actor, B, 'the record names who applied it, as before')` -> `[syn.actor, syn.history actors]`
   deepEqual `[prepared.by, [prepared.by]]` (Z1).
2. D12 the merger of a package record `/architect-b wrote /` -> the merge's exact words `MERGED(syn.id, prepared.by, B)`,
   on `synthetic.accept` and on `synthetic.endorse` (Z1).
3. D12 the unchanged later save by B (the record's actor was B) -> by A, the record's actor now; the same assertion
   that it stamps nothing (Z1).
4. D12 the merger of a confirmed record `/architect-b wrote /` -> `MERGED(confirmed, A, B)` (Z1).
5. D12 the preparer of a decision `new RegExp(as + ' wrote ' + dec.id)` -> `MERGED(dec.id, as, B)` (Z1: the merge's
   stamp is read first).
6. D5 `/Written by an upgrade of the project or by a merge, with no author stamp: 2 records\. …/` -> `/… or by a merge
   of an alternative that names no preparer, with no author stamp: 2 records\. …/` (Z6).
7. D12 a list dated before a restore marker set by hand merged with no stamp (`[undefined x 5]`) -> no date is compared,
   the list on the stored row stands (`['person', A, B, B, 'merged']`); lists made elsewhere are moved aside at the
   import, proven through `/api/recovery` in block Z2 (Z2).
8. D12 the merge request carrying commands, either outcome -> one outcome, 400 in words, then the merge and its stamp
   (Z6); D12 the merger of a keep `MERGED(prop, A, B)` ("prepared it") -> the same sentence with "kept" (Z6).

9. wp2's J9 (`rc44-wp2-adoption-cases/record.mjs`, on 53ce4cf) `/Written by an upgrade of the project or by a merge,
   with no author stamp: 3 records\. …/` -> `/… or by a merge of an alternative that names no preparer, with no author
   stamp: 3 records\. …/` (Z6, the same line as D5's).
10. wp1's S3.10 (`rc44-wp1-cases-pins.mjs`, on 53ce4cf): `atMerge.chapters - 3229840 - booked.othersTotal -
   booked.poolTotal === size.ownBytes` (the route recorded at wp1 S3's head less every booking on the books now) ->
   the same equality with the bookings recorded with that route (`atMerge.otherPackages`, `atMerge.sharedPool`), each
   asserted to be on the books still with its bytes. The old form broke on any booking filed after wp1 S3's merge, here
   `mergeAuthorY3` (290 B); the lead's ruling X4 ruled the same for S2.12. The head's build is still held to every
   booking by the case's own "this build: S3 is …" check and by S0's O1. This edits wp1's suite, which the slice was not
   named to edit: the lead confirms or rules otherwise.

Each new assertion is at least as strict: everyone refused before is refused now, in exact words; the size equality
still holds wp1's own figure exactly, against the bookings that stood when it was measured.

### Suites (on the fix-up's code)
- The four rc44 suites: S0 (`rc44-s0-extensions`, 36 checks), wp9a, wp2 and wp1 green (wp2 and wp1 after items 9 and
  10 above; before them each was red on its one assertion, J9 and S3.10).
- Every suite that imports a changed file and the ones the task names, all green: provenance, evidence, review-plan,
  seeded-proposals, recovery-authority, rc42-g3b-trace-and-delivery, architecture-obligation, architecture-verification,
  sdd-architecture, sdd-content, sdd-modules, sol-sdd, rc42-g2-library, rc42-g6-import, action-undo, action-undo-api,
  model-alternatives, workspace, workbench-ui, desk-fixes, connected-design-projections, design-records, journal-archive,
  rc42-g7-data-contracts, rc42-g3c-evidence-fingerprint, fingerprint, drafter-groups, local-accounts,
  model-reconciliation, module-model, rc42-g1-tech-approval, rc42-g3a-risk-and-limits, architecture-scenarios,
  development, enhancements.
- `sol-disclosure` and `command-equivalence` fail, in the same words here and on 53ce4cf (a git archive run in this
  worktree's scratch folder): "The desk no longer holds F:capacity:run-001, F:capacity:run-008 …" and "a working choice
  made: the saved document is the one the route saved before round 12 · $.workbench.history[1] …": red at the baseline,
  as the merge evidence lists them.
- `node check-syntax.mjs`: 945 modules. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, 0 new.
  `node build.mjs`: every gate passes; the measurements above.
- Not run: the full regression and the browser suites (the lead's).

### Measurements
`node build.mjs` (dist/client-size-report.json routes.chapters.code): 3,228,648 B at e91365c; 3,228,746 B after Z1
(+98 B, `verifierRefusal`); 3,228,741 B after Z2 and Z3 (-5 B, the minifier's names in one shared chunk: Z2 and Z3 are
server-only); unchanged by Z4 and Z5 (server-only); 3,228,938 B after Z6 and Z7 (+197 B, `public/provenance.js`).
+290 B in all against e91365c, booked as `sharedPoolBytes.mergeAuthorY3` = 290 in
`audit/rc44/evidence/lead-bookings-size.json` (S0's bytes, to the shared pool, as Z1 rules); the cap 3,233,792 B is
unchanged and no gate moved. 148 script files; buckets 52, 51, 45; no violation. The SDD's new sentence is in a lazy
entry (architecture-task-ui), not on the route; `applyWorkbenchCommand`, `mergeStamper`, the boundary, `worker.js`,
`recovery-service.js` and `storage-upgrade.js` are in no route chunk (checked against the route's files).

### My readings (where a ruling left a choice)
- Z1 "while the merge's stamp stands": after another person's later change the merger is not refused (the stamp names
  the new writer, and the merger wrote no revision). Case "Z1" asserts it (the merger endorses after C's change). If the
  merger is to be refused for good, the record needs a list of merges carried across saves; I did not build one.
- Z2 "no date decides": I removed `mergeStamper`'s date comparison rather than keep it beside the move. A template copy
  keeps no alternative (`project-lifecycle.js`), and a restore moves every list, so a list that stands was written here.
- Z3: a command that names no record pairs, for `from`, with a stored command of its type that nothing matched; a new
  command added beside a removed one of the same type is so read as its revision. That discloses Sol's part rather than
  hides it.
- Z5 "stamping nothing as anyone's": for a record such a command changed, its author and review stamps are removed (fail
  closed), not left standing as the earlier writer's; for one it only kept or confirmed, the review stamp.
- Z6 (1): refused, as the review offered, rather than taught `innerCommands` to skip a merge's own commands.
- Z7: I made `reviewOf` answer no review for a merge rather than change `confirmedByPerson` alone, so every reader of what
  a person reviewed (the SDD, the review plan, the summary, the disclosure, a judgement's scope, the chapters' badges)
  reads a merge alike; the label names the merger. The SDD's Appendix E line (Z6) changes the text of a document that
  holds unstamped package records; no reference holds one (6a and 6b are byte-identical).

### Known limits (after the fix-up)
1. Z8, above: imported record stamps are still decided by a date (slice S0-import).
2. A conflict the merger resolves as "current" keeps the current value in a record the merge stamps as the preparer's
   write (the preparer's other fields are theirs).
3. Known limits 3 to 5 of the build stand: a brief a merge changes is versioned as the merger's; the journal events of a
   merge name the merger; the packages' trackers run once for the merge, not per command.
4. Known limit 1 of the build is closed by Z5 (no merge restamps as the merger's), and known limit 2 by Z1.

### What later slices must know
- A package's projection (D7.1) names the preparer of a merged command through the record's own `actor` and `history`:
  the preparer is the domain's actor in a merge. Packages call `verifierRefusal`, which also refuses whom a merge's stamp
  names as merger.
- `reviewOf` answers no review for `how: 'merged'`; a package that asks whether a person reviewed a record gets none
  for a merge; `personBehind` (the boundary) still counts the merger.
- A merge request carries no commands; a merge is stamped by `mergeStamper` alone.
- A restored alternative keeps its list as `importedAuthors` and names nobody here.
- Slice S0-import (Z8) moves imported record stamps aside; until then the date comparison is the guard.
