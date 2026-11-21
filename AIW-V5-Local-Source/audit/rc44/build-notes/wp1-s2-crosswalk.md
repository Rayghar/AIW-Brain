# wp1-s2-crosswalk: build notes (slice S2 of design/wp1-knowledge.md, "Crosswalk and one identity")

Branch `rc44/wp1-s2-crosswalk`, from `5cae40a` (wp9a slice 1 after its second fix-up, on `rc44/integration` `a4c1690`).
Binding: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 2, the lead's rulings of 2026-11-18 (main checkout, sections A to
M), the S0 contract (`audit/rc44/build-notes/s0-extensions.md`, "Contract for packages"). `productionAccepted` stays false.
Resumable: read this file and `git log` first. Suite: `npm run test:rc44-wp1-knowledge` (the S2 cases are in
`rc44-wp1-cases-crosswalk.mjs`; `--only S2.` runs them alone).

## State

- **Done:** baseline measured (below); parity golden of the retired table captured on the start commit.
- **In progress:** the case file (tests first).
- **Next:** the modules, then the suites, the size evidence and the final commit.

## Plan (as decided at the start, from the code)

1. **Ruling I2 first** (the first item of the next wp1 slice): the structured unit of an applicability form is read by
   the number rule against the form's quotes, at `knowledge.claim` and on every read (`formIssues`).
2. **The crosswalk is a registered package, `p10-knowledge`** (ruling E5; the task: "a second-person step stated on the
   command", rulings D1 and D7.1). Its command types are free for a package: the built-in knowledge entry answers
   "Choose a supported knowledge action." for them.
   - `knowledge.crosswalk` (anyone: a person, an import, a draft by Sol, an agent account as a draft): proposes or edits
     a row; never verifies; `targetContent` is the server's.
   - `knowledge.crosswalk-confirm` (`person`): the person-only step that confirms a row no person stood behind (F4).
   - `knowledge.crosswalk-review` (`second`): verifies or rejects a row, on the projection `{id, actor, history, owner}`
     of the row (D7.1); the boundary asks `verifierRefusal` and two persons (D1). The step is kept under `review` (F3),
     with the reviewer's account kind; a read asks `verifierRefusal` again and a person's account.
   - `knowledge.crosswalk-retire` (`person`).
   - Each runs inside `applyKnowledgeCommand` (its copy, counter, history line and storage bound), handed a capability.
   - `design` row for `knowledge.crosswalk` (ruling J3): what a row says to the design fingerprint, without `history`,
     `review`, `confirmed`, `provenance`.
   - Client: one route stub (`p10-knowledge-route`), loading the knowledge workspace (the design's host, d.7), which
     registers the package's design row; the server adds the commands (`knowledge-package-server.js`).
3. **One identity.** `resolveConcept(p, id)`: a released concept; a verified, released `same` row; a built-in `same`
   row (navigation only). A row is released when a release of forms holds it (`parts.crosswalk`, the verified rows of
   the released concepts, in the checksum); a proposed row, a row verified by its own author and a verified row no
   release holds never resolve.
4. **Retire `MAPPINGS`** (knowledge-coverage.js) in the same commit as its replacement: `BUILT_IN_CROSSWALK`
   (`public/knowledge-crosswalk.js`): the 16 method rows of scheme `aiw-method` and the five style rows read from
   `STYLE_CATALOGUE` (design-reasoning.js, exported). Parity for the 16 ids against the golden of the start commit.
5. **The seed**: `scripts/build-crosswalk-seed.mjs` writes `candidate-sets/crosswalk-seed.json` from the Playbook's
   `catalogue` names and the catalogue only (13 rows, all proposed, no verification), with `--check`.

## Measurements at the start (node build.mjs on 5cae40a)

Chapters route code 3,230,605 B (cap 3,233,792 B, 3,187 B left); 148 script files; files under 10 KB / 10–50 KB / over
50 KB 53 / 50 / 45. wp1 has used 65 B (S1, ruling B1); S2 may add at most 250 B.

## Retirement list (ruling J6)

- `MAPPINGS` in `public/knowledge-coverage.js` → `BUILT_IN_CROSSWALK` rows of scheme `aiw-method`
  (`public/knowledge-crosswalk.js`); its one reader, `knowledgeConceptCoverage`, reads the rows.

## Deviations from the design

(filled as the work goes)

## Open questions

(filled as the work goes)
