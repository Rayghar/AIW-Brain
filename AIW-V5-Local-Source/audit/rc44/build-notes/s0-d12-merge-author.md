# rc44 slice S0-D12: who wrote what a merge writes — build notes

Built on `rc44/s0-d12-merge-author`, from `53ce4cf` (rc44/integration: S0, wp1 S1 to S3, wp2 S1 and S5, wp9a slice 1).
Rulings: D1, D7.1, D12, F3, F4, H2, H3, J3, J9 and Y3 of `RULINGS-2026-11-18.md` (the lead's, in the main checkout).
A lead-owned slice of wave 2; the lead gives leave to edit the shared files narrowly. `productionAccepted` stays false.

## State

- **Done:** nothing yet.
- **In progress:** reading; the plan below.
- **Next:** the cases first in `rc44-s0-extensions-validate.mjs` (block "D12 a record a merge wrote" replaced).

## What the code does at the start (53ce4cf)

- `workspace.alternative` (public/workbench-domain.js) keeps `{id, revision, title, reason, commands, targets, basis,
  scenario, status, at, actor}`: the actor who saved it, **not** the author kind, and nobody per command.
  `workspace.revise-alternative` replaces the commands, sets `actor` to the reviser and keeps the earlier revision in
  `history`. So the alternative does not record who prepared each command; this build records it from now on.
- `workspace.merge` applies the rebased commands one by one with `applyCanonical(p, c, at, merger)`. The server's
  stamp (`stampAuthorship`) reads `innerCommands(workspace.merge)`, which is empty (a merge names no commands), so a
  record the merge made carries no author stamp (D12). `stampExtensions` (H2) then restamps every **existing** record of
  a package-held collection the merge changed as the merger's: an agent account's change merged by a person read as
  the person's.
- A package's staged handler inside a batch (`applyCanonical` -> `x.apply`) is called with four arguments; an event it
  adds keeps whatever author fields it wrote (H3). The boundary strips them only for a tracker and for a command sent on
  its own (`unstated`).

## Plan

1. `workspace.alternative` and `workspace.revise-alternative`: the server records, per command, who prepared it
   (`authors`, index-aligned with `commands`: `{kind, by, account, session?}`), created only when first written. A
   revision keeps the preparer of a command it carries unchanged and names the reviser for a command it changes or
   adds; the earlier list goes into the history entry. An alternative saved before this build has no list.
2. `workspace.merge`: the domain hands the server each command's result (`merged(q, c, i)`, one option); the server
   stamps what that command wrote as written by its preparer (the same `stampAuthorship` and the packages'
   `stampChanged` as any commit), then as reviewed by the merger (`provenance.reviewed {by, at, how: 'merged'}`), and
   the merge-level `stampExtensions` does not restamp them as the merger's. An alternative without a full list merges
   as today (known limit).
3. The boundary: a person who prepared or merged a record, while the merge's stamps stand, is not its second person;
   a merge's review counts as a person standing behind the record (D1).
4. H3: every event a reviewed batch's or a merge's commands add before the trackers run states no author fields.
5. Old documents: no stamp is invented for a record merged before this build; the goldens and readings of S0 hold.

## Deviations from the design

(none yet)

## Open questions

(none yet)
