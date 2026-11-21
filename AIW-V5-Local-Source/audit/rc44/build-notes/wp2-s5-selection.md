# rc44 wp2 slice S5: component selection as a recorded decision — build notes

Branch `rc44/wp2-s5-selection`, from `5cae40a` (the typed deployment topology, wp9a slice 1, after its second fix-up,
on `rc44/integration` `a4c1690`). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S5 under g, e.1 row 9).
Contract: `audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"). Rulings: `RULINGS-2026-11-18.md` (main
checkout), sections A to M. Package `p40-adoption`, held in `public/architecture-task-ui.js` (no new lazy entry).
`productionAccepted` stays false. No external authority is impersonated: nothing here approves, releases, accepts or
promotes anything for a person.

## State

- **Done:** baseline measured (below); plan recorded.
- **In progress:** the case file `rc44-wp2-adoption-cases/selection.mjs`, cases first.
- **Next:** the selection module, the registration rows, the built-in edits, the parity of row 9, the SDD, the
  surface, the size evidence.

## Baseline at `5cae40a` (node build.mjs, dist/client-size-report.json)

Chapters route code 3,230,605 B (cap 3,233,792 B), projects route 507,338 B, 148 script files, buckets 53 / 50 / 45,
stylesheet 901,873 B, no violation. `design-concern-validate.mjs` fails at l.119 (`QD-002` in the assessments), as on
the baseline-red list; its first block passes.

## Plan

1. `public/adoption-selection.js` (server and the lazy entry; imported by `adoption-package.js` only):
   `applySelectionCommand` for `selection.start`, `.candidate`, `.judge`, `.choose`, `.instantiate`;
   `selectionConstraints`, `candidateEligibility`, `selectionReading`, `selectableKnowledge`.
2. Registration rows in `adoption-package.js` (commands only; `judge`, `choose`, `instantiate` a signed-in
   person's; no new part).
3. Built-in edits inside wp2's allowance: `decision-reading.js` `readDecision` reads no selection;
   `decisions-domain.js` `normaliseOption` carries the candidate over; `component-library.js` key `profile` and scope
   `knowledge`; `realisation-domain.js` the key/scope pairing; `architecture-design.js` the released concern's
   comparison as one builder (row 9); `sdd-architecture.js` (server) the selection basis.
4. The surface: the selection part of `public/adoption-ui.js`, imported by `architecture-task-ui.js`; the library
   chooser opens it by a dynamic import of that entry.

## Deviations from the design (kept current)

(filled as the slice is built)

## Open questions (for the lead)

(filled as the slice is built)
