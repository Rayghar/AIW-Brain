# rc44 wp2 slice S1: the adoption record, its readers and the upgrade — build notes

Branch `rc44/wp2-s1-record`, from `8e8240e` (S0's fix-up head `72204ff` plus the lead's rulings F2 and F3 on
`rc44/s0-lead-f`). Design: `audit/rc44/design/wp2-adoption.md` (sections a to f, S1 under g, e.3). Contract:
`audit/rc44/build-notes/s0-extensions.md` ("Contract for packages"), the rulings of 2026-11-18 (A, D, F).
`productionAccepted` stays false.

## State

- **Done:** reading (plan, rulings, S0 contract, design); the goldens of the three references and of the document with
  a review list, captured from the unchanged base `8e8240e` (`rc44-wp2-adoption-baseline.json`); this plan.
- **In progress:** fixtures and the case file (tests first).
- **Next:** the modules, the two lines that register the package, the built-in edits, measurements.

## Plan (what S1 builds)

| File | What |
|---|---|
| `public/adoption-domain.js` | accessors, `adoptionReading`, the acceptance projection and its reader, the five commands, the tracker |
| `public/adoption-upgrade.js` | `needsAdoptionUpgrade`, `upgradeAdoptions` (design e.3) |
| `public/adoption-builtins.js` | `builtinFromReceipt`, definition skeletons |
| `public/adoption-definitions.js` | the definition shape, `definitionIssues` |
| `public/adoption-package.js` | the one `registerExtension({id: 'p40-adoption', …})` |
| `design-packages.js`, `public/design-package-routes.js` | one line each |
| `public/architecture-task-ui.js` | one import: the lazy entry that holds the package (ruling D7.6) |
| `rc44-wp2-adoption-validate.mjs`, `rc44-wp2-adoption-cases/record.mjs`, `rc44-wp2-fixtures.mjs` | suite, cases, fixtures |

## Deviations from the design (and why)

1. Base commit: `8e8240e`, not `72204ff`. Ruling F3 binds every package with a person's step to call
   `assertTemplateCopyClearsSteps`, which exists only from `8e8240e`; the worktree was handed over at that commit.
