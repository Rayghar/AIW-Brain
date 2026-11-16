# wp1-s1-forms: build notes (slice S1 of design/wp1-knowledge.md)

Branch `rc44/wp1-s1-forms`, from baseline `94dbd4f`. Resumable: read this file and `git log` first.
Suite: `npm run test:rc44-wp1-knowledge` (`rc44-wp1-knowledge-validate.mjs`; `--all`, `--only <text>`, `--print-baseline`).

## Measurements (node build.mjs)

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
- The design's Appendix B records were run through `conceptFormIssues` against the real renditions on this machine
  (scratch, nothing copied): every slice and passage hash matches the design, and 15 of 17 forms are valid as written.
  The two `example` forms are refused because they state `expectedOutcome` with no `quotes` entry (rule A.3.3).

## In progress

Nothing. The slice is complete; see the final commit.

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
   structured unit; none reads `claim.form`.
3. **Merge with S0:** `worker.js` line 638 (the dispatch) and `authorship.js` near line 39 are edited here.
4. **The "third person" rule** (an imported form is released by neither its author nor its reviewer) follows the design
   and is this package's own rule; `verifierRefusal` covers the author, the comparison with the reviewer is one line
   in `formCapability.release`.
