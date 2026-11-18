# wp1-s1-forms: build notes (slice S1 of design/wp1-knowledge.md)

Branch `rc44/wp1-s1-forms-c2` (the second session's continuation of `rc44/wp1-s1-forms`, which the usage limit cut off
after its last WIP commit `a3420c0`), from baseline `94dbd4f`. Resumable: read this file and `git log` first.
Suite: `npm run test:rc44-wp1-knowledge` (`rc44-wp1-knowledge-validate.mjs`; `--all`, `--only <text>`, `--print-baseline`).

## Measurements (node build.mjs)

Both columns were measured again in the second session, in this worktree: the baseline column with the four changed
product files checked out at `94dbd4f` and the three new modules moved aside, then everything restored.

| | baseline 94dbd4f | this branch |
|---|---|---|
| chapters route code (cap 3,233,792 B) | 3,228,863 B | 3,228,863 B (**+0 B**) |
| projects route code | 506,102 B | 506,102 B |
| script files (gate 148) | 148 | 148 |
| files under 10 KB / 10–50 KB / over 50 KB | 53 / 50 / 45 | 53 / 50 / 45 |
| stylesheet | 901,873 B | 901,873 B |
| `knowledge-governance.js` in the client | 8,105 B | 8,105 B |
| `architecture-knowledge-unit.js` in the client | 5,327 B | 5,327 B |
| server modules packaged | 253 | 256 (the three new modules) |

None of the three new modules is in the client metafile. The suite checks this when `dist/client-metafile.json` exists (S1.14).
The size report holds no violation on either side; no gate in `client-bundle.mjs` was touched.

## Verification (second session, 2026-11-18)

- **The new suite on the baseline.** With the product code of `94dbd4f` all 15 S1 cases fail: S1.1 with "a claim sent
  with a form was stored without it (the form was silently dropped)", the other 14 because `public/concept-form.js`
  does not exist. `--print-baseline` run on that code prints exactly the `BASELINE` object of S1.8.
- **The new suite here:** 15 passed, 0 failed, 4 pending (S2 to S5).
- **Related suites:** the 53 registered suites that import `knowledge-governance.js`, `authorship.js` or
  `recovery-service.js` (and `test:knowledge`, `test:architecture-case`), two at a time: 45 passed, 8 failed. The 8
  (`brain-ahead`, `brain-reasoning`, `chapter-reasoning`, `command-equivalence`, `contextual-intelligence-ui`,
  `design-concern`, `knowledge`, `stewardship`) are red in `audit/rc42/regression-2026-11-16.json` and were run again
  here on the baseline's product code: each fails with the same first line (apart from a timestamp and a generated id).
  `test:scale` was not run (a load suite of more than 15 minutes, red at the baseline for this machine; the lead's).
  The four unregistered suites `architecture-knowledge-unit`, `candidate-import`, `knowledge-boundaries` and
  `brain-synthesis-retrieval` pass.
- **Past the baseline failure of `stewardship-validate.mjs`:** it stops at line 92 on the baseline, before its server
  cases send `knowledge.capture` and `knowledge.steward` through `/api/commands` (now the wrapper). A scratch copy with
  that one assertion set aside (never committed) passes its 8 checks, with the same output on the baseline and here.
- `node check-syntax.mjs`: 914 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
  `node build.mjs`: passes every gate.

## Done

- `public/concept-form.js`: the nine form types, their tier, fixed claim type and predicate, the closed vocabularies
  (`CONCEPT_KINDS`, `CONCEPT_SCOPES`, `RELATION_VERBS`, `EVIDENCE_LEVELS`, `ALIAS_SCHEMES`, `CONCEPT_ID`), `quoteFound`,
  `conceptFormIssues`, `conceptFormRecord`. Pure; imports nothing.
- `public/knowledge-concept-commands.js`: `applyConceptCommand` (the one entry for `knowledge.*`), `formCapability`,
  `KNOWLEDGE_LIMIT_TIERS`, `knowledgeLimits`, `REVIEW_TRIGGERS`; commands `knowledge.library`, `.topic`, `.concept`,
  `.concept-review`, `.concept-retire`, `.concept-restore`; the rules of a form on `knowledge.claim`, `.review`, `.release`.
- `public/knowledge-concepts.js`: `conceptHash`, `conceptAuthors`, `conceptRecords`, `formStatus`, `releasedConcepts`,
  `conceptReading`, `conceptTeachingForms`, `conceptDecisionForms`.
- `public/knowledge-governance.js`: the fifth argument `{forms, limits}`; a claim's `form` and `authoredAs`; the optional
  source keys `checkedAt`, `reviewDue`, `versionScope`, `sourceFile`; `formChecked` on a form's review; the form hooks at
  claim, review and release; the register's command types through the `default` branch. 0 bytes in the client.
- `worker.js` (import and dispatch with `{author}`), `authorship.js` (four person-only types), `recovery-service.js`
  (an imported concept review loses its actor).
- Suite: 15 S1 cases green; S2 to S5 hold one pending case each. 22 mutations of the guards were each killed by the suite.
- Second session: S1.10 names the gates it compares one by one (the eligibility gate, criteria and state of each of the
  reference's nine technology selections, the product comparison of each, the Chapter 7 findings, the gate of the
  requirements specification) beside the checks, readiness, SDD, contextual reading and Sol's packet, and asserts that
  the reference offers each of them non-empty. It also states what a released, active form adds (open question 2).
- Second session: a value nested more deeply than a form holds (below the sixth level; the deepest a form goes is the
  fourth) is refused with a sentence. Before, the reserved-name scan walked it and a 20,000-level value ended in a
  stack overflow (caught by the command route as a 400, and thrown on a read of a tampered document).
- The design's Appendix B records were run through `conceptFormIssues` against the real renditions on this machine
  (scratch, nothing copied): every slice and passage hash matches the design, and 15 of 17 forms are valid as written.
  The two `example` forms are refused because they state `expectedOutcome` with no `quotes` entry (rule A.3.3).

## In progress

Nothing. The slice is complete on `rc44/wp1-s1-forms-c2`; its head is the final commit.

## Next (for the slices that follow; none blocks S1)

- **S0 registration, when it lands:** nothing of S1 is registered in `record-graph.js`, `trace-kernel.js`,
  `review-domain.js`, `record-lifecycle.js`, `provenance.js`, `canonical-command.js`, the readings upgrade or the project
  store. Candidates for the registry: `designKeys`/`evidenceKeys` for `knowledge.concepts`, `.topics`, `.library` (see
  the first open question), journal nouns for the six new command types, a lifecycle row for concept retire/restore.
- **`architecture-knowledge-unit.js:6` `KINDS`** (`component`, `technique`, `composition`, `deployment-topology`): left
  out here because it costs about 60 B on the route and nothing in S1 needs it. S3 holds the route allowance; S4's
  component profiles (Appendix B.2 uses unit kind `component`) need it before they can be imported.
- **S2:** `knowledge.crosswalk*`, `resolveConcept`, `BUILT_IN_CROSSWALK`; add its person-only types to the line in
  `authorship.js`; `conceptReading` gains `aliases`.
- **S3:** `knowledge.release` with `conceptIds` and `parts` (the S1 release guard in `formCapability.release` is the place:
  it already asks for a reviewed concept, released whole, by a person who wrote no form and did not verify an imported
  one); versions; the four pin commands (`conceptDecisionForms` already reads `knowledge.conceptPins[{id, conceptId,
  releaseId, status}]`, and should also compare the pin's `conceptHash` and `anchor`); `refreshConceptPins` at the end
  of every command; `knowledge.withdraw` of a concept id; "restore only an unreleased concept" and "a new review
  replaces it while the concept is unreleased" (both need `parts`); recovery of crosswalk reviews, `parts` and pins;
  record-graph rows through S0; `concept` states `released`, `active`, `withdrawn`.
- **S4:** `knowledge.topic` checks the file against the rendition manifest (no manifest exists yet, so the file name is
  recorded as given); the import script sends `authorKind: 'import'`; Appendix B's `example` forms need a quote for
  `expectedOutcome`.
- **S5:** the claim and review forms of the knowledge workspace gain the form fields and `formChecked`. Until then a
  form claim can be verified through the command route only: the existing review form sends no `formChecked` and is
  refused with the reason.

## Deviations from the design

1. **Source `origin` is `sourceFile`.** The design adds `origin: {file, fileSha256, rendition, …}` to a source, but a
   source already has `origin` (a string: `recorded-original`, `project-source`, `repository-fetch`,
   `architect-dismissal`) and `knowledgeEligibility` reads it. The new object is stored as `sourceFile`.
2. **The register's commands run inside `applyKnowledgeCommand`.** The design has the wrapper handle the new types
   itself. Here the wrapper injects them as part of the form capability and `applyKnowledgeCommand`'s `default` branch
   calls it, so the copy of the document, the shared counter, the 2,000-entry history bound, the history line and the
   8,000,000-character bound are the same lines for every `knowledge.*` command. `FORM_CAPABILITY` is therefore a
   function of the request's author, `formCapability(author, limits)` with `claim`, `review`, `release`, `command`.
3. **The pending case files do not fail the run.** The design asks for the later case files as "a single failing case".
   A registered suite that is red by design would be read as a regression, so a pending case is listed as PENDING and
   fails only with `--all` (or `AIW_RC44_WP1_ALL=1`).
4. **Stricter than designed, each on purpose:**
   - a concept is not verified by the author of one of its form claims (the design names the concept's author and last
     editor); the same check stands on every read (`conceptAuthors` through `verifierRefusal`);
   - a concept's review needs every form eligible for release (`knowledgeEligibility`), not only "verified by another";
   - releasing form claims is guarded already in S1 (design: S3): the concept reviewed, released whole, the releasing
     person wrote no form and did not verify an imported or drafted one; an import, a draft by Sol and a request with
     no author release no form;
   - a form's review (`knowledge.review` of a form claim) is refused for an import, a draft by Sol and a request with
     no author, whatever its outcome; a plain claim's review keeps the behaviour of rc.10.73.42;
   - a request that states no author stores a form as `authoredAs: 'import'`, never as a person's;
   - the seven new claim types exist for forms only: a plain claim still chooses among the eleven of rc.10.73.42;
   - names and labels in a decision-bearing form follow the number rule (identifiers and targets do not);
   - `conceptDecisionForms` hands over nothing when the concept's definition is not released in the pinned release;
   - a recovery import clears the actor of a concept review (design: S3, with the crosswalk and pin rows).
5. **`authorship.js`:** the four S1 types are added on their own line below `REVIEW_TYPES` (not inside the literal), to
   keep the merge with S0 and wp2 S1 clean.
6. **`KINDS` not extended** (see Next).
7. **Limits:** `KNOWLEDGE_LIMIT_TIERS` also bounds concepts and topics (project 100 / 100, library 300 / 300); the
   design names sources, claims and releases only. The release limit (30) is the same in both tiers and was not touched.
8. **Scalars and quotes.** Rule A.3.3 is applied as: `quotes[]` holds at least one verbatim quote of the passage for each
   text the form states of itself (`short`, `explanation`, `narrative`, `purpose`, `relation`, `bounds`, `scenario`,
   `expectedOutcome`); `title` and `modelKind` are labels and need none.
9. **`conceptReading`** returns `{conceptId, title, kind, family, scope, stages, lenses, state, forms}`. `aliases`,
   `versions`, `pin`, `relations`, `coverage`, `maturity`, `admission` belong to S2, S3 and S4.

## Fix-up (after the adversarial review and the lead's rulings of 2026-11-18)

Branch `rc44/wp1-s1-forms-fix`, from `f9d9bdc` (the head of `rc44/wp1-s1-forms-c2`). The rulings are
`audit/rc44/RULINGS-2026-11-18.md` section B (in the main checkout; not on this branch). Order of work as the lead gave
it; each item has its case first, seen red on `f9d9bdc`, and a WIP commit. Resumable: read this section and `git log`.

| # | Item | State | Case |
|---|---|---|---|
| 1 | Must-fix 1 (the quote floor is measured on the collapsed text; a verbatim diagram source has the same floor) and must-fix 2 (the number rule reads a target label; identifier fields hold identifiers) | done | S1.15 |
| 2 | B1: a form claim is read only by the concept readers; S1.10 strengthened | done (route +38 B) | S1.10, S1.16 |
| 3 | B2: concepts, topics and form claims in a library project only | done | S1.17 (and S1.1, S1.5 through the service, S1.7, S1.8, S1.10, S1.13 adjusted) |
| 4 | B3: what `conceptHash` covers; only a person changes what a review covered; an upsert that changes nothing writes nothing | done | S1.18 (S1.4 and S1.5 through the service adjusted) |
| 5 | B4 and should-fix 4: a concept review records the reviewer's account kind, a read requires a person's; `kindRefusal` requires account `person` | done | S1.19 (S1.5 review shape adjusted) |
| 6 | B5: fail closed (should-fix 3 and 5): a pin hands over nothing of a concept that is not eligible as a whole or is retired, the reading says why (`conceptDecisionReading`, `releasedConcepts[].reasons`, `conceptReading().releases`); a released concept is not restored | done | S1.20 (S1.9 adjusted) |
| 7 | B7: a concept id is not a record reference (by shape, `RECORD_REFERENCE`, or because a record of the project bears it); `calculation.modelKind` is an identifier (should-fix 9) | done | S1.21 (S1.2 adjusted) |
| 8 | Should-fix 2 (a unit on an applicability form only), 7 (a retired concept is not reviewed), 8 (a run that executed no case fails), 10 (all fifteen pre-existing command types walked, with a baseline taken on 94dbd4f), 1 (the full list of what a released, active form moves, below and asserted) | done | S1.22, S1.23, S1.8, S1.10 |
| 9 | B6: every statement of a decision-bearing form rests on its own quote (should-fix 6): `quotes: [{field, quote}]`, distinct; a sub-list entry is `{text, quote}`; the number rule per text and for the claim's statement, conditions and limitations | done | S1.24 (fixtures and S1.2, S1.9, S1.15, S1.20 moved to the new shape) |
| 10 | B8: the history bound is part of the tier (should-fix 11) | | |
| 11 | B9, B10: text | | |

What item 1 changed, for those who write forms (S4's validator runs the same rules):
- A quote (an item's `quote`, a `quotes[]` entry) is 12 to 240 characters **once whitespace is collapsed**, at least
  eight of them letters or digits. A verbatim diagram `source` has the same floor (its ceiling stays 4,000).
- An identifier field (`composition.roles[].id` and `.sameAs`, `sequence[].ownerRole`, `verification.scenarios[].id`)
  matches `/^[A-Za-z0-9][A-Za-z0-9._:-]*$/`. An alias id in a target matches the same with `/` allowed
  (`delivery/transactional-outbox`).
- A target's `{label}` follows the number rule of its item.

## Open questions (for the lead)

1. **The design fingerprint moves with any knowledge write, as on rc.10.73.42.** `reviewSource` (review-domain.js:50)
   holds every top-level key but seven, so `p.knowledge` is in the fingerprint: a plain candidate `knowledge.source`
   moves it on the baseline (shown in S1.10), and so do the new records. No finding, summary, readiness reading, SDD
   or Sol packet moves (S1.10), but a finding's `stamp` and a recorded review stamp do. In a design project that
   imports candidates this makes a recorded review read stale. Whether `knowledge.concepts`, `.topics`, `.library`
   (or all candidate knowledge) are design or evidence keys is for S0's `designKeys`/`evidenceKeys`. Not changed here.
2. **A released form is a released claim.** Once verified by a second person, released and activated, a form claim is
   read by every existing reader of `releasedClaims` (the contextual reading, Sol's grounding) without a pin, as any
   released claim is today (design risk i.3 item 9). Those readers read the statement, conditions, limitations and the
   structured unit; none reads `claim.form`. Measured in S1.10 on the bank-payment reference with the nine forms
   released and active: no finding, summary, blocker count, readiness reading, trace coverage, selection gate, Chapter 7
   finding or specification gate moves. One reading does: the product comparison of each of the nine technology
   selections lists the released applicability claim beside each option (`C.options[].claims.matches`), because the
   fixture's structured unit has an empty scope and so applies to every product. It is listed by its statement and its
   receipt (`scoring:false`), never its form, and nothing else of the comparison moves. A candidate, a verified form, a
   reviewed concept and a release that is not active add nothing there. Whether a released decision-bearing form
   should reach these readers only through a pin is the lead's to rule; S1 changes no existing reader.
3. **Merge with S0** (read on `rc44/s0-extensions` at `d681353`, not merged here). Three places meet:
   - `worker.js`: S0 rewrites the dispatch line and adds `installBuiltInCommands(type=>…type.startsWith('knowledge.')?applyKnowledgeCommand:…)`.
     After the merge both must name `applyConceptCommand` (same arguments: `(own, command, at, actor, {author})`), and
     `worker.js` must not import `knowledge-governance.js` for commands: S1.14 asserts the dispatch text and that import.
   - `authorship.js`: S0 replaces the `isReviewCommand` line two lines below the line added here; keep both.
   - `package.json`: both add one `test:` line.
   `knowledge.*` stays a built-in command family (the wrapper), not a registered package: its four person-only types
   are in `REVIEW_TYPES` here. If the lead wants them stated through S0's `commands` part instead, the line in
   `authorship.js` moves there and nothing else changes.
4. **The "third person" rule** (an imported form is released by neither its author nor its reviewer) follows the design
   and is this package's own rule; `verifierRefusal` covers the author, the comparison with the reviewer is one line
   in `formCapability.release`.
