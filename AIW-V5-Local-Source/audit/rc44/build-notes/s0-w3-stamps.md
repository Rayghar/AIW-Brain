# rc44 build S0-w3-stamps: a library's log is not design (Y2), and an import moves every record stamp aside (Z8) — build notes

Built on `rc44/s0-w3-stamps`, from `4349bb6` (rc44/integration with the build contract). Working release number
AIW v0.10.0-rc.10.73.44 (proposed; not confirmed by the owner). `productionAccepted` stays false. No external authority
is involved or impersonated: the build changes what a library's design fingerprint reads, what the knowledge package's
steps write into the family's log, and how a recovery import keeps the stamps a record carried; nothing else.
Rulings read: B10, X4, X5(b), Y2 (part A); Z2, Z5, Z8, Z9 and the known limit of `s0-d12-merge-author.md` (Fix-up, Z8)
(part B); the build contract of 2026-11-26 for everything else. A lead-owned build on the lead's shared files and wp1's
files, by leave. Route bytes are reported, not booked (AA2).

## State

- **Done:** baseline checkpoint and plan.
- **In progress:** the cases of `rc44-s0-b10-validate.mjs` (part A) and `rc44-s0-import-validate.mjs` (part B).
- **Next:** see the plan.

## Plan

Part A (Y2, the rest of B10):
1. Cases first (`rc44-s0-b10-validate.mjs`, `test:rc44-s0-b10`): goldens of old documents captured on the unchanged
   start commit (a design project with the knowledge records the commands that existed before rc44 write, the Bank
   Payment reference with them, a library as wp1 S1 to S3 write it, with a pin and a link, and the same library with
   its mark cleared, as a recovery import leaves it). Then: a library's design source reads neither `knowledge.history`
   nor `knowledge.version`, its evidence reads the log; every built-in knowledge command and every step of the package
   in a library moves no design stamp through the log; the package's steps write the family's log again (one line
   each, naming the package); the history panel draws the one trail from the document alone; a design project's
   readings are byte-identical to the goldens (S0's helpers too) and a package's step there moves no design stamp
   through its line; a library stored under the start commit reads with the same findings and its design stamp moves
   once, at the first read, and the case records exactly what moves.
2. Code: `public/review-domain.js` `designOf` (the library rule and the rule for a package's line elsewhere);
   `public/knowledge-governance.js` (the package's line names the package); `public/knowledge-concept-commands.js`
   (the handlers say whose step it is instead of `quiet`); `public/knowledge-workspace-ui.js` (the panel reads the
   log; the activity join and `stepsOf` retired).
3. Existing assertions the ruling turns around (old -> new recorded below): S2.16, S3.14 and S3.27 of wp1's suite.

Part B (Z8):
1. Cases first (`rc44-s0-import-validate.mjs`, `test:rc44-s0-import`), through `/api/recovery` (preview and restore)
   and the command route: a record stamped by a person dated after the import, one dated before, one with no date, a
   merged record (`mergedBy`, `how: 'merged'`), a confirmed narrative, a package's record (registered through S0), and
   the same package imported twice; each reads as nobody's here (`reviewOf`, `personBehind`, `confirmedByPerson`, the
   label, the SDD, the review plan); a signed-in person here confirms it and is the one named; four eyes and the
   second-person rule refuse nobody on account of an imported stamp; an earlier imported project reads exactly as
   today; a document never imported gains no key.
2. Code: `recovery-service.js` `neutraliseImportedAuthority` moves each record's `provenance.author` and
   `provenance.reviewed` to `provenance.imported` (built-in paths, the retired store, and every collection a package
   states, as the boundary's stamp walker reads them), before any early return, and marks the import as one that moved
   them; `public/provenance.js` reads the kept stamp as nobody's (the author kind stays what wrote the words, no person
   is named, nothing is reviewed) and keeps it through later saves; `public/source-fingerprint.js` reads it as no
   content; the date comparison (`historicalReview`, the boundary's `here()`) is retired for an import that moved the
   stamps and kept, as a recorded known limit, for a project imported before this build.

After the work: the two suites, S0's suite, wp1's suite (all of it), the other rc44 node suites, every suite that
imports the changed files; `node check-syntax.mjs`; `node scripts/lint.mjs --summary`; `node build.mjs` before and after.

## Measurements

`node build.mjs` at the start (`4349bb6`), `dist/client-size-report.json`: routes.chapters.code 3,228,938 B; 148 script
files; buckets under 10 KB 52, 10 to 50 KB 51, over 50 KB 45.
