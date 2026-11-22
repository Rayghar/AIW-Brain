# wp1-s3-pins: build notes (slice S3 of design/wp1-knowledge.md, "Releases with parts, pins, currency and findings")

Branch `rc44/wp1-s3-pins`, from `c709ae3` (rc44/integration: S0, wp1 S1 and S2, the adoption record wp2 S1, the typed
deployment topology wp9a slice 1). Binding: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 2, the lead's rulings of
2026-11-18 (main checkout, sections A to V), the S0 contract (`audit/rc44/build-notes/s0-extensions.md`, "Contract for
packages"), the S2 notes' contracts for later slices. `productionAccepted` stays false.
Resumable: read this file and `git log` first. Suite: `npm run test:rc44-wp1-knowledge` (S3's cases are in
`rc44-wp1-cases-pins.mjs`; `--files ./rc44-wp1-cases-pins.mjs` runs them alone).

## State

- **Done:** reading (build plan, rulings A to V, design sections a to i, S1 and S2 notes, S0 contract); baseline build
  measured (chapters route 3,230,723 B; 148 scripts; buckets 52 / 51 / 45; stylesheet 901,873 B).
- **In progress:** the case file, then the product code.
- **Next:** see the plan below.

## Plan (the order of work)

1. Cases first in `rc44-wp1-cases-pins.mjs` (replacing the placeholder), beginning with S3.1, which fails today.
2. Release parts (`knowledge.release` with `conceptIds`): `parts.concepts` (identity, topics, version, conceptHash, forms
   with claim hash and tier, the concept's review), `parts.changes`, beside S2's `parts.crosswalk`, in the checksum.
3. Organisation releases carry `parts` (orgContent, inside the signed checksum) and `from.supersedes`; the release-actor
   rule of P1 for the publishing administrator, over the forms and `releaseRows`.
4. The package p10-knowledge registers (E5): the `concept` object type, the pins' emitter (`informs`), the list-11
   finding, the SDD section after "## E. Provenance", the pin commands, the knowledge keys (B10, P5 b).
5. Pins (`knowledge.conceptPins`, KU), concept links (`knowledge.conceptLinks`, KB), migrations
   (`knowledge.conceptMigrations`, KM); currency (`refreshConceptPins`, one writer) after every knowledge command and on
   every read (`refreshOrganizationAssurance`).
6. Organisation notices (successor on publish; `knowledge-withdraw`), signed, verified on read; a forged one ignored.
7. Recovery: parts of organisation releases neutralised, pins retired, migration steps moved aside.
8. E6 (digest once per read), I3 (repository invalidation case), S10 (one alias over organisation releases).
9. Size evidence, notes, suites.

## Decisions taken (and why), to be checked by the reviewer

(filled in as the work goes)

## Deviations from the design

(filled in as the work goes)

## Open questions (for the lead)

(filled in as the work goes)
