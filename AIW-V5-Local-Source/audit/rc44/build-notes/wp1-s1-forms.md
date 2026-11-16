# wp1-s1-forms: build notes (slice S1 of design/wp1-knowledge.md)

Branch `rc44/wp1-s1-forms`, from baseline `94dbd4f`. Resumable: read this file and `git log` first.

## Baseline measurements (node build.mjs on 94dbd4f, 2026-11-16)

- chapters route code 3,228,863 B (cap 3,233,792 B); projects route 506,102 B
- 148 script files; 53 under 10 KB; stylesheet 901,873 B; entry 5,014 B
- `public/knowledge-governance.js` 8,105 B in the client bundle, `public/architecture-knowledge-unit.js` 5,327 B

## Plan

1. Tests first: `rc44-wp1-knowledge-fixtures.mjs`, `rc44-wp1-cases-forms.mjs`, the runner `rc44-wp1-knowledge-validate.mjs`,
   the four later case files as one pending case each; registered as `test:rc44-wp1-knowledge`.
2. `public/concept-form.js` (pure validator and vocabularies).
3. `public/knowledge-governance.js` hooks (limits, `form` on a claim, source extras, `formChecked`, the injected command hook).
4. `public/knowledge-concept-commands.js` (wrapper, `knowledge.library`, `.topic`, `.concept`, `.concept-review`, `-retire`, `-restore`).
5. `public/knowledge-concepts.js` (register, hash, `formStatus`, `releasedConcepts`, teaching and decision readers, `conceptReading`).
6. `worker.js` (import and dispatch), `authorship.js` (person-only types), `recovery-service.js` (imported concept reviews).
7. Related suites, syntax, lint, build and the size delta.

## Done

(see the log below; updated as work lands)

## In progress

## Next

## Deviations from the design

## Open questions
