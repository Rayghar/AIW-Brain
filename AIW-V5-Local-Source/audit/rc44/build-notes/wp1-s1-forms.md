# wp1-s1-forms: build notes (slice S1 of design/wp1-knowledge.md)

**State: the slice was built on `rc44/wp1-s1-forms-c2` (head `f9d9bdc`), reviewed adversarially, ruled on by the lead
(`audit/rc44/RULINGS-2026-11-18.md`, section B, in the main checkout) and fixed up on `rc44/wp1-s1-forms-fix` (a
session that was cut off before its final commit) and `rc44/wp1-s1-forms-fix-c2` (the session that checked every item
again, closed one gap and made the final commit).**
**It was then verified (verdict: not yet; `/home/user/hb-review/rc44-build/wp1-s1-forms.verify.json`), ruled on again
(sections E and G of the same rulings) and fixed up a second and last time on `rc44/wp1-s1-forms-fix-c3`, from
`b2cc73d`.**
Read the section **Second fix-up** first, then **Fix-up**: each changes several things the sections below it say. Where
a sentence no longer holds it is corrected in place and marked *(fix-up)* or *(second fix-up)*.
Baseline `94dbd4f`. Resumable: read this file and `git log` first.
Suite: `npm run test:rc44-wp1-knowledge` (`rc44-wp1-knowledge-validate.mjs`; `--all`, `--only <text>`,
`--files a.mjs,b.mjs`, `--print-baseline`). 34 S1 cases; it takes about three minutes (case S1.25 writes a tranche of
540 forms and a history of 6,000 lines through the commands; case S1.29 walks 770 requests).

## Second fix-up (after the verification and the lead's rulings of 2026-11-18, sections E and G)

Branch `rc44/wp1-s1-forms-fix-c3`, from `rc44/wp1-s1-forms-fix-c2` at `b2cc73d`. Order of work as the lead gave it; each
item has its case first, seen red before its change, and a WIP commit.

| # | Ruling | What changed | Case (red before, with) |
|---|---|---|---|
| 1 | G1 | The number rule normalises a text (NFKC) and reads every run of decimal digits of any script, a text and its quote alike. An identifier, and an alias id, is letters, digits and hyphens only (an alias id also the slash of a method alias) | S1.27 (`full-width digits in a label`) |
| 2 | G2 | `conceptCovered` no longer asks whether the review stands now: a concept is covered when a second person verified it here at some time, or a release of the project holds one of its forms. A later dispute or rejection keeps who verified it before (`review.verifiedBefore {actor, at}`, a key written only then) | S1.28 (`a superseding source: the concept stays covered`), at the entry and through POST /api/commands |
| 3 | E1 | No request that is not a person's lowers the standing of a reviewed or released concept: `applyKnowledgeCommand` asks, before any command, which form claims it would reach through what they rest on (`formsRestingOn`), and the form capability decides (`rests`) | S1.29, the walk (`reviewed: knowledge.source (a source that supersedes, with another text, the one the forms rest on), sent by an agent account: the request was accepted and the standing of SYN-P001 is not as it was`) |
| 4 | G3 | The quotes of one form do not nest and are not shared: none holds another, no two entries rest on the same one, an object's own included | S1.30 (the verifier's three nested quotes) |
| 5 | G4 | `formIssues`, which every read asks, reports a structured unit on a form that is not an applicability form | S1.31 (`definition: unusable on a read`) |
| 6 | G5 | A recovery import clears the library mark (the imported mark kept as history); the mark is read against a library's history bound, so a recovered library is marked again | S1.32 (the mark's shape after a recovery) |
| 7 | G6 | A bound a limits object does not name as a whole number is the tier's | S1.33 (`Missing expected exception: limits {"sources":100,"claims":250}`) |
| 8 | E3 | The library tier's concept bound is 60; the refusals at the concept bound and at the character bound say to start another library for the next tranche | S1.7, S1.25 (the tier's shape) |
| 9 | E4 to E7 | Recorded under "Next" (E4, E5, E6, and what E1 and E3 mean for S4) and "Known limits" (E7) | – |

**Item 2, what "ever reviewed" is.** A concept's review is overwritten by the next one, so a rejection after a
verification would have forgotten it: a dispute or a rejection of a concept that was verified here carries
`verifiedBefore`. A concept that was rejected or disputed and never verified stays a draft, and an import corrects it
(S4's loop: import, a person rejects, the import corrects, a person verifies; from then on it is a person's). A review
that names no person's account was never one (B4), and a review made on another workbench names no reviewer here
(recovery): neither covers anything, until a release holds the concept.

**Item 3, the walk.** S1.29 reads every `'knowledge.*'` type the product names from its code (25: the 21 the entry
handles and four history types of the repository and organisation routes) and fails if one is not a row of the walk.
Each row is sent by seven kinds of request that are not a person's (an agent account, a draft by Sol, an import, a
request with no author, an author with no account, an import from the reviewer's own account, a draft from the
releaser's own account) against a reviewed concept and against a released, active one: 770 requests, 546 refused, 224
accepted with the concept's state, hash, each form's status, its releases and what a pin hands over unchanged. 36 of
the requests lower the standing when a person sends them; each is refused to all seven and still saved for a person,
with today's effect. Paths found beside the three the ruling names, each closed and held by the walk:
- `knowledge.deactivate` of the release of forms, and `knowledge.withdraw` of the release or of the source;
- `knowledge.activate` of a plain release recorded as the successor of the release of forms (activation unpins the
  release it supersedes);
- a revision of a covered concept that moves no hash (its forms in another order), sent as an import from the
  reviewer's own account: the reviewer became an editor and the review lapsed. A request that is nobody's now writes no
  revision of a covered concept at all;
- repository fetch, transfer and signed sync supersede and withdraw sources through the old entry and name no author.
  A form claim is refused on a source fetched from a repository, so they never reach what a concept rests on.
Eight guard mutations (each `formsRestingOn` case, the body comparison of a superseding source, the revision rule, the
repository rule, the contradiction rule) are each killed by S1.29, and a mutant that names a new type is killed by
the "joins the walk" line.

**Where I went further than a ruling, or read it in a particular way (second fix-up).**
- **E1 is not limited to a project marked as a library.** It applies wherever the register holds a covered concept or a
  release holds a form: a library is the only place the commands write one, and a recovered project (mark cleared, G5)
  that holds a release of forms is protected too.
- **E1 and the verifier's third point: a contradiction that names a form is disposed of by a signed-in person's own
  request, whatever the concept's state** (the verifier's first option). Separating the contexts makes a review stand
  again and reopening them makes it lapse; an import reviews nothing. On a concept nobody verified, a superseding
  source and a withdrawal by a non-person are accepted as before.
- **E1, activation.** Activating or deactivating a release that holds a form is a person's own request (the concept is
  in a release, so it is covered); the ruling names withdrawal and retirement. An agent account at the entry could
  otherwise make forms active.
- **E1, the entry without a form capability** (repository fetch, transfer, sync, the local import scripts) supersedes,
  withdraws, disposes of and changes the release of nothing a form rests on, covered or draft: it cannot ask who sends.
- **E1, a form rests on a source saved in the library**, not on one fetched from a repository (above). Not ruled; it is
  what keeps the signed repository path and E1 apart. A released form on a repository source could never be eligible
  anyway (it needs a signed release receipt, which a release of forms has none of).
- **G1, alias ids.** The ruling names identifiers; an alias id is "an identifier too" in the contract, so it lost the
  point, the colon and the underscore as well. Every id of the catalogue (328), of the playbook's knowledge (91) and
  of the Chapter 2 categories (18) fits. Digits of another script than the quote's are read as written, not converted: a text that
  states ٥ where its quote holds 5 is refused.
- **G2** asks for a person's account on the stored review (B4), so that case S1.19 holds as it was.
- **G3 applies to teaching forms too** (the ruling says "of the same form"), and across every kind of entry: an item, an
  object, an entry of a sub-list, a `quotes` entry. A verbatim diagram source is content, not a quote, and is not
  compared. Each entry is named once, against the first it meets.
- **G5, the mark's history bound.** Without it a recovered library that holds more than 2,000 history lines could never
  be marked again (the bound is read before the command). Only the mark that turns a project into a library is read
  against 6,000; every other command of the unmarked project is refused at 2,000, and so is unmarking.
- **G6** is applied to every bound of the tier, not only to the history.
- **E3**: the 61st concept's refusal says the same as the character bound's. The words of the character bound are
  changed for a library only; a project keeps those of rc.10.73.42.

**Replaced assertions (old -> new), each ruled.**
- G1, S1.15 and S1.21: `… is an identifier (letters, digits and . _ : -, no spaces)` -> `… is an identifier (letters,
  digits and hyphens only)`.
- G1, S1.15: `roles[0].id 'outbox_writer.v2'` and `sequence[0].ownerRole 'role:relay'` valid -> `'outbox-writer-v2'` and
  `'role-relay'` valid, the two earlier values refused.
- G1, S1.21: `modelKind 'aiw.queue:mm1'` accepted -> `'aiw-queue-mm1'` accepted, `'aiw.queue:mm1'` refused.
- G3, S1.24: a calculation whose purpose rests on the worked value's quote is valid -> valid with the worked value
  taken off, and with it `calculation.workedValues[0] rests on the same quote as calculation.quotes[0]`.
- G3, S1.24: `guaranteeBoundary.dependsOn[0]` on the prerequisite's quote is valid -> valid with the prerequisite taken
  off, and with it `dependsOn[0] rests on the same quote as applicability.prerequisites[0]`.
- G3, S1.24: a technique step quoting words inside the technique's own quote is valid -> valid when the technique
  rests on other words, and otherwise `the quotes of a form do not nest`.
- G5, S1.12: on the recovered document a second person's concept review is refused because the forms are verified here
  first -> it is refused because the project is no library yet, and once a person marked it, because the forms are
  verified here first.
- E3, S1.7 and S1.25: the library tier `{sources: 300, claims: 1000, concepts: 300, topics: 300, history: 6000}` ->
  `{…, concepts: 60, …}`.
Fixtures: three quotes of the synthetic forms lay inside another entry's quote and took one of their own (the
mechanism's narrative, the selection's variant, the calculation's output).

**Measurements (second fix-up).** `node build.mjs` on `b2cc73d` and on this branch's head: chapters route code
3,228,928 B -> 3,228,928 B (**+0 B**; cap 3,233,792 B, 4,864 B spare); projects route 506,129 B -> 506,129 B; script
files 148 -> 148; files under 10 KB / 10–50 KB / over 50 KB 53 / 50 / 45, unchanged; stylesheet 901,873 B; client in
all 8,877,272 B, unchanged; the budget object of the size report identical; no violation. `knowledge-governance.js` in
the client 8,132 B before and after (the command function is not in the client); none of the three new modules is in
the client metafile. wp1 has used 65 B of its 660 B, all of it ruling B1, as before this round.

## Measurements (node build.mjs)

All three columns were measured again in the second fix-up session, each with `node build.mjs` on its own tree: commit
`94dbd4f` exported whole, the slice's first head `f9d9bdc`, and this branch. The first two equal what the first build
and the review measured. (The first fix-up session measured 3,228,901 B, +38 B, before the Brain's receipt was changed.)

| | baseline 94dbd4f | first build f9d9bdc | after the fix-up |
|---|---|---|---|
| chapters route code (cap 3,233,792 B) | 3,228,863 B | 3,228,863 B (+0 B) | 3,228,928 B (**+65 B**, all of it ruling B1; 4,864 B spare) |
| projects route code (cap 1,242,112 B) | 506,102 B | 506,102 B | 506,129 B (+27 B) |
| script files (gate 148) | 148 | 148 | 148 |
| files under 10 KB / 10–50 KB / over 50 KB | 53 / 50 / 45 | 53 / 50 / 45 | 53 / 50 / 45 |
| stylesheet | 901,873 B | 901,873 B | 901,873 B |
| client in all | 8,877,207 B | 8,877,207 B | 8,877,272 B |
| `knowledge-governance.js` in the client | 8,105 B | 8,105 B | 8,132 B (+27 B: `releasedClaims`) |
| `knowledge-stewardship.js` in the client | 7,142 B | 7,142 B | 7,153 B (+11 B: the stewards' reading) |
| `architecture-brain.js` in the client | 15,218 B | 15,218 B | 15,245 B (+27 B: the receipt's active releases) |
| server modules packaged | 253 | 256 (the three new modules) | 256 |
| opens with records (ruling D10) | – | as the chapters route | as the chapters route: S1 has no client code |

None of the three new modules is in the client metafile, and no built script holds the limit tiers. The suite checks
both when `dist/client-metafile.json` exists (S1.14). The size report holds no violation; no gate in `client-bundle.mjs`
was touched. B1 was granted up to 120 B of wp1's 660 B: it used 65 B, so wp1 has 595 B left for S3. Everything else
of the fix-up is off the route: item 12 changed `knowledge-governance.js` inside the command function, which the
client does not hold (8,132 B before and after it).

## Fix-up (after the adversarial review and the lead's rulings of 2026-11-18)

Branch `rc44/wp1-s1-forms-fix`, from `f9d9bdc`, continued on `rc44/wp1-s1-forms-fix-c2`. Order of work as the lead gave
it; each item has its case first, seen red before its change, and a WIP commit.

The first fix-up session committed items 1 to 10 and was cut off before its final commit. The second session took
none of it on trust: it ran the suite on that head (26 passed), ran each item's case as committed with the item on the
product code of the commit before it (each is red there, with the line given under Verification), read each item's
code against its ruling, probed the rulings from outside the suite, found one gap, which is item 12, and finished
item 2 where the first session had left a design reading that names a release of forms (the Brain's receipt).

| # | Item | State | Case |
|---|---|---|---|
| 1 | Must-fix 1 (the quote floor is measured on the collapsed text; a verbatim diagram source has the same floor) and must-fix 2 (the number rule reads a target label; identifier fields hold identifiers) | done | S1.15 |
| 2 | B1: a form claim is read only by the concept readers; S1.10 strengthened. Second session: the Brain's receipt names no release of forms, so in the 27 readings a released, active form moves exactly what a plain candidate source moves on rc.10.73.42 | done (route +65 B: 38 B in the first session, 27 B in the second) | S1.10, S1.16 |
| 3 | B2: concepts, topics and form claims in a library project only | done | S1.17 (S1.1, S1.5 through the service, S1.7, S1.8, S1.10, S1.13 adjusted) |
| 4 | B3: what `conceptHash` covers; only a person changes what a review covered; an upsert that changes nothing writes nothing | done | S1.18 (S1.4, S1.5 through the service adjusted) |
| 5 | B4 and should-fix 4: a concept review records the reviewer's account kind, a read requires a person's; `kindRefusal` requires account `person` | done | S1.19 (S1.5 adjusted) |
| 6 | B5 (should-fix 3 and 5): a pin hands over nothing of a concept that is not eligible as a whole or is retired, and the reading says why; a released concept is not restored | done | S1.20 (S1.9 adjusted) |
| 7 | B7 (should-fix 9): a concept id is not a record reference; `calculation.modelKind` is an identifier | done | S1.21 (S1.2 adjusted) |
| 8 | Should-fix 2 (a unit on an applicability form only), 7 (a retired concept is not reviewed), 8 (a run that executed no case fails), 10 (all fifteen pre-existing command types walked), 1 (what a released, active form moves, below and asserted) | done | S1.22, S1.23, S1.8, S1.10 |
| 9 | B6 (should-fix 6): every statement of a decision-bearing form rests on its own quote | done | S1.24 (fixtures, S1.2, S1.9, S1.15, S1.20 moved to the new shape) |
| 10 | B8 (should-fix 11): the history bound is part of the tier; a tranche written through the commands; every caller reads the tier | done | S1.25 (S1.7, S1.14 adjusted) |
| 11 | B9, B10: text; the two inaccurate sentences; the package id | done | below (Known limits, Next, deviation 4, S1.8) |
| 12 | Found by the second session (rulings B3 and B9): a claim that carries **no** form, on a concept's id under a form's fixed predicate with another polarity, opened a contradiction with that form, whoever sent it. An agent account, a draft by Sol, an import and a request with no author could so make a reviewed concept's review lapse; the concept was then no longer covered and the same sender could edit it. Ruling B9 takes it as given that a non-person cannot add an opposing candidate to a reviewed concept | done | S1.26 |

Item 11 in one place: B9 is under "Known limits"; B10 is under "Next" for S3 and S4, with what the fix-up adds for S2;
the sentence of deviation 4 that the reviewer found inaccurate is corrected in place; the first build's report said the
wrapper writes what the old entry writes "for every pre-existing command" while S1.8 walked six of the fifteen types,
and S1.8 now walks all fifteen, so the sentence holds as written; this package's id is `p10-knowledge` (ruling A2 as
amended by D8), named under "Next" where wp1 first registers through S0.

Where I disagree with a ruling: nowhere in substance. Two rulings are read in a particular way and one question is
left for the lead, each said plainly below: B1's "every reading is asserted not to move" (four of the 27 readings
carry seven stamp values that any knowledge write moves on rc.10.73.42; nothing else of them moves); B8's "set the
tier to that" (the counts were left as designed and the measured tranche sizes are stated); and, beside B3, a
superseding source (under Known limits), which is not refused and should be ruled on.

### What a released, active form moves (ruling B1, should-fix 1; asserted in S1.10)

Measured on the bank-payment reference with the nine forms of one concept released and active, a marker placed in each
claim's statement, in a text of each form, in its first condition and in the structured unit. Of the review's 27
readings (findings, summaries, blocker count, readiness, trace coverage, review capacity, the eligibility gate and
criteria of each of the nine technology selections, the nine product comparisons, the Chapter 7 findings, the
specification gate and the specification text, `releasedClaims`, `knowledgeFindings`, domain knowledge, knowledge
structures, the architecture knowledge snapshot, the SDD text, the contextual reading, the Brain's knowledge, the whole
Brain context, Sol's packet in three modes, the record graph, the sources the Brain cites for a question, the reasoning
packet of a decision, the chapter stamps) **none moves outside seven stamp values, and the marker reaches none**. Those
seven are exactly what a plain candidate source, saved through the old entry, moves on rc.10.73.42; the case asserts
both, at each of the five stages. The review asked for a packet mode `draft`; that is not a mode (it throws on every
document), so `design` is read instead.

What does move:
1. **The concept readers** (`knowledge-concepts.js`): `conceptRecords`, `conceptReading` (nine forms `released` with
   their content), `releasedConcepts`, `conceptTeachingForms`, and `conceptDecisionForms` through an active pin.
2. **The knowledge workspace's own lists:** `knowledgeGraph` (nodes, edges, counts of sources and claims),
   `knowledgeMarkdown` (it names the active release), and the workspace's lists of sources, claims and releases. In
   that graph a released, active form claim is drawn as `reviewed`, not `active` (the graph asks `releasedClaims`);
   S5's concept view is where its state is `released`.
3. **Stamps:**
   - the stamp of the knowledge state, in the Brain's receipt (`brainContext().governed.receipt.knowledgeStamp`,
     `packet.brainReceipt.knowledgeStamp`) and each packet's `stamp` over that receipt: 7 values. A plain candidate
     source through the old entry moves exactly these on rc.10.73.42 (asserted);
   - *(second session)* not the receipt's list of active releases. The first fix-up session left the release's id and
     checksum there (`…receipt.activeReleases`, 4 values): the one place where a design reading named a release of
     forms. The receipt now lists the active releases the Brain reads, and a release of forms is none of them
     (`architecture-brain.js`, 27 B); a release of plain claims is named as before (S1.16). Nothing but the receipt
     reads that list;
   - the whole-document fingerprint (`designFingerprint`, `reviewSourceStamp`) and so each finding's `stamp`, as any
     knowledge write does on rc.10.73.42. With B2 only a library project takes such writes through the commands.

### What changed, for those who build on this slice

**Forms (`public/concept-form.js`; S4's validator runs the same rules).**
- A quote (an item's `quote`, a quotes entry, a sub-list entry's quote) is 12 to 240 characters **once whitespace is
  collapsed**, at least eight of them letters or digits. A verbatim diagram `source` has the same floor (ceiling 4,000).
- `quotes` is `[{field, quote}]` (at most 8): each entry names the text of the form it grounds (`short`,
  `explanation`, `narrative`, `purpose`, `relation`, `bounds`, `scenario`, `expectedOutcome`); each stated text has at
  least one; no quote is given twice (compared with whitespace collapsed). All nine form types.
- In a decision-bearing form an entry of a sub-list (`guaranteeBoundary.dependsOn`, `.doesNotEstablish`,
  `technique.inputs`, `.steps`, `.outputs`) is `{text, quote}`; the quote is found in the lines (`at`) of the object
  that holds the list. No teaching form has a sub-list today; one would keep plain texts on the object's one quote.
- The number rule (decision-bearing forms): an item's text against the item's quote; a sub-list entry's text against
  its own quote; a form-level text against the quotes given for that field; a target's `{label}` against its item's
  quote; and the claim's own `statement`, `conditions` and `limitations` against all quotes of the form (they have no
  quote of their own). `conceptFormIssues(form, {excerpt, lineStart, claim: {statement, conditions, limitations}})`;
  `formIssues(claim)` in `knowledge-concepts.js` passes them, at `knowledge.claim`, at review and on every read.
- Identifier fields (`composition.roles[].id` and `.sameAs`, `sequence[].ownerRole`, `verification.scenarios[].id`,
  `calculation.modelKind`) match `/^[A-Za-z0-9][A-Za-z0-9._:-]*$/`; an alias id in a target matches the same with `/`.
- `CONCEPT_ID` refuses a prefix and a number (`RECORD_REFERENCE`, `/^[A-Z][A-Z0-9]*-\d+$/`: `REQ-001`, `KC-0001`).
- Only an applicability form's claim carries `architectureUnit`.

**Commands (`public/knowledge-concept-commands.js`).**
- `knowledge.concept`, `.topic`, `.concept-review`, `.concept-retire`, `.concept-restore`, a `knowledge.claim` with a
  form, the review of a form and the release of forms are refused unless a person marked the project as a knowledge
  library. `knowledge.library {enabled:false}` is refused while the project holds a concept, a topic or a form claim.
- A request that is not a person's (agent account, draft by Sol, import, no author, an author with no person's
  account) is refused, on a concept whose review stands or which a release of the project holds: an edit that changes
  its hash, any form claim on it, a topic upsert that changes its hash.
- *(item 12)* A claim that would open a contradiction with a claim that carries a form (the same subject and predicate,
  another polarity, one of them `prohibits` or `limits`: `flagOverlaps`, as on rc.10.73.42) is asked of the form
  capability, whether or not the new claim carries a form itself and whether it comes by `knowledge.claim` or
  `knowledge.capture`: on a concept that is reviewed or in a release only a person records it; on a draft concept it
  opens as before. `formCapability(...)` gains `opposes(s, claim, held)`. An entry that holds no form capability
  (`applyKnowledgeCommand` called directly) opens no contradiction with a form at all and refuses the claim in words.
  Two plain claims contradict each other through either entry as before (S1.8 holds the bytes).
- `knowledge.concept` and `knowledge.topic` saved again unchanged write nothing (the document is returned as it was;
  the worker still writes its own revision and activity row, as it does for a repeated `knowledge.project-source`).
- `knowledge.concept` refuses an id that a record of the project bears as its id or reference.
- `knowledge.release` refuses a release that mixes plain claims and forms.
- `knowledge.concept-restore` refuses a concept that a release of the project holds.
- A concept review stores `account` (the reviewer's account kind).

**Readers (`public/knowledge-concepts.js`).**
- `conceptHash(concept, claims, topics)`: every field of the record except `at`, `actor`, `lastEditor`, `history`,
  `revision`, `changeNote`, `review`, `retired` (so `id`, `steward`, `reviewDue`, `reviewTriggers`, `notAdopted`,
  `successorOf`, `splitFrom` and any field no command writes are in it), the forms as type and claim hash, and the
  topics mapped to the concept as sorted `{file, topicId, sliceSha256}`.
- `conceptCovered(p, concept)`: its review stands, or a release of the project holds one of its forms.
- `releasedConcepts(p)[]` gains `reasons`; `eligible` means the concept is usable as a whole (each form released,
  exactly one definition, not retired in this project).
- `conceptReading()` gains `releases: [{releaseId, title, eligible, reasons}]`.
- `conceptDecisionReading(p, pinId)` → `{pinId, conceptId, releaseId, forms, reasons}`; `conceptDecisionForms` is its
  `forms`: nothing unless the concept is eligible as a whole in the pinned release.
- Teaching content that is not released is returned in a library project only.
- `formIssues(claim)` is exported.

**`public/knowledge-governance.js`.**
- `releasedClaims(p)` leaves out every release that holds a form claim.
- `KNOWLEDGE_LIMIT_TIERS` and `knowledgeLimits(p)` live here (re-exported by the command module, which freezes them):
  project `{sources 100, claims 250, concepts 100, topics 100, history 2000}`, library `{300, 1000, 300, 300, 6000}`.
  `applyKnowledgeCommand` and `pinOrganizationKnowledge` read the tier of the document, so the old entry, repository
  fetch and transfer (`knowledge-service.js:60`, `repository-transfer.js:66`; they hold no literal of their own),
  repository sync and the import scripts are held to the same bounds. `repository-packet.js` reads it for the
  capacity it states (a packet itself still names at most a project's 100 sources and 250 claims).

### Where I went further than a ruling, or read it in a particular way

- **B1, a release holds plain claims or forms, never both.** Every reader of `releasedClaims` is handed
  `{claim, release}`, and the release object holds all its claims: filtering claim by claim would still hand forms
  over inside `release.claims` (the snapshot serialises it; S1.16 caught this). So the whole release is left out, and
  `knowledge.release` refuses a mixed one. Design section c lets S3's `knowledge.release` add a concept's forms to a
  set of plain claim ids: with this, a release made with `conceptIds` holds forms only. A mixed release that a
  document holds anyway reaches no reader of released claims: its plain claims read as not active.
- **B1, links.** `knowledge.link` reads `releasedClaims`, so a form is linked to no record now; a link to a form that
  a document holds anyway reads 'Review changed architectural support'. S3's pin link must go through the concept readers.
- **B1, the Brain's receipt** *(second session)*. The ruling names the readers that receive no form claim; the
  receipt received none, but it named the release of forms among the active releases, and the Brain's context and
  Sol's packets carry the receipt. It now lists the active releases the Brain reads. That is a third place of
  exclusion (after `releasedClaims` and the stewards' reading) and 27 B of the 120 B the ruling grants; if the lead
  would rather have the receipt name every active release, it is one condition in `architecture-brain.js` and two
  assertions (S1.10, S1.16) to turn back.
- **B3 and B9, an opposing claim without a form** *(second session, item 12)*. B3 names "adding a form claim"; the
  refusal is applied to any claim that would open a contradiction with a form of a covered concept, form or not, and
  to `knowledge.capture`, because all of them reach the one function that opens contradictions. An entry without the
  form capability cannot ask who is sending, so it opens no contradiction with a form at all, on a draft concept
  either: that is stricter than "on a draft concept the same request is accepted" for the one caller it concerns, the
  local mode of an import script that calls `applyKnowledgeCommand` directly.
- **B2 is applied to more commands than it names:** also the review of a form, the concept review, retire, restore
  and the release of forms. A project that holds forms anyway (recovery, an older library) reads them, inert, and
  takes no command on them until a person marks it a library. *(second fix-up, ruling G5: this sentence was not true
  of a recovery when it was written, as the verifier found: the recovery import kept the mark. It clears it now; case
  S1.32.)*
- **B3:** `id` is in the hash (the ruling's list of bookkeeping does not name it). Any form claim by a non-person on a
  covered concept is refused, although a claim alone does not move the hash until it is attached: the ruling says so,
  and an opposing one would open a contradiction (B9).
- **B5:** "retired" is read from this project's register, whatever release holds the concept.
- **B6:** a sub-list entry carries its quote; the alternative the ruling allows ("or is keyed to one") is not built.
  Quotes must be distinct among the entries of `quotes[]` (ruled). *(second fix-up, ruling G3: the first fix-up let
  sub-list entries and items share a quote; now no two entries of a form rest on the same quote and none holds
  another; case S1.30.)*
- **B7:** the shape rule is "a prefix and a number", not a list of the record graph's prefixes: it covers the 39
  prefixes the two reference documents use (ACT, ADR, … REQ, … ZON), the knowledge ids, and any a later package
  registers. Ids of another
  shape that a record bears (`PROC-REF-START`) are refused at `knowledge.concept` by looking the record graph up.
- **B8, "set the tier to that".** Stated plainly, because here I did not change the tier's counts:
  - a tranche of 60 concepts and nine forms each, written through the commands with two correction rounds (in each,
    one form of every concept is corrected by a person, verified again, the concept reviewed again and the whole
    tranche released as a successor), costs **1,867 commands** and **6,721,578 of 8,000,000 characters** with the
    synthetic handbook's topics (4,236 characters, the size of a pattern handbook's entry). It fits.
  - with topics the size of a component profile (12,697 characters) and passages some twenty lines longer, measured
    on ten concepts written the same way: 101,250 characters for each concept with the first release, 147,835 with
    one successor release, 194,268 with two. **Sixty fit with their first release (about 6.1 million characters) and
    not with a successor release of the whole tranche; 54 fit with one, 41 with two.** Corrections made before the
    first release cost one claim each, not a copy of the tranche.
  - the bound that binds is the 8,000,000 characters, and it depends on the size of the topics, which the counts
    cannot express; so the counts stay as designed (300 sources, 1,000 claims, 300 concepts, 300 topics) and the
    numbers above are what a steward plans a tranche by. If the lead wants the library's concept bound lowered to a
    tranche (60, or 41), it is one number in `KNOWLEDGE_LIMIT_TIERS`. *(second fix-up, ruling E3: the lead set it to
    60; a library holds one tranche, and the refusals at the concept bound and at the character bound say to start
    another library. The tranche's characters measured in this round: 6,729,018 after two correction rounds; with
    component-sized topics 101,312 for each concept with the first release, 147,928 with one successor release,
    194,392 with two, so 78, 54 and 41 concepts fit.)*
  - the history bound of a library is 6,000 lines: the tranche above uses 1,867; corrections up to the claims bound
    (460 more forms, rejected and verified again) about 3,000; S2's crosswalk rows will add some hundreds. At its
    bound the history holds about 0.8 million characters. Both bounds are reached through the commands in S1.25.

### Known limits, recorded as ruled

- **B9, an opposing candidate.** A non-person cannot add a form to a reviewed or released concept (B3), nor a claim
  without a form that contradicts one of its forms (item 12, S1.26). A person's opposing candidate, with or without a
  form, keeps the fail-safe of rc.10.73.42: a contradiction opens, the form claims of that subject and predicate are
  not eligible and the concept reads `draft` until a person separates the contexts or rejects one; once the contexts
  are separated the review stands again, because nothing it covered was changed. At handbook scale that is a way for
  one person's request to stall a concept; it is asserted as it is in S1.18 and S1.26.
- *(second fix-up: ruled, E1 and G2, and closed; what follows is the first fix-up's record of the path. A request that
  is not a person's is now refused the superseding source of a covered concept's form, and the concept stays covered
  whatever became of its review; a person's superseding source keeps the effect described here. Cases S1.28, S1.29.)*
  **A superseding source is not refused, and it should be ruled on.** `knowledge.source` with `supersedes` and another
  body makes every claim on the superseded source ineligible, forms included, whoever sends it: an agent account and an
  import too, as on rc.10.73.42 for any claim. It does not change a concept's hash, so B3 as ruled does not refuse it.
  Measured by a probe in the second fix-up session, through `applyConceptCommand`:
  - on a concept that is reviewed and not yet released, the review no longer stands, the concept is no longer covered,
    and the same agent account or import then edits it (`reviewDue` set to 2099-12-31 was accepted). Nothing unreviewed
    is released by that (the concept is a draft and needs its second person again), but it is the two steps that item
    12 closed for an opposing claim;
  - on a concept that is released and active, its forms read `released-ineligible`, the concept is not eligible as a
    whole and a pin hands over nothing (fail closed); the register's concept reads `draft`; it stays covered, so its
    record is still a person's to change. An organisation's copy pinned in a design project is not touched (the rule
    reads the project's own sources).
  A changed rendition is S4's legitimate use of the command, and a changed source that stops the use of what rests on
  it is the fail-safe of rc.10.73.42. Whether, for a source that a covered concept's form cites, the superseding
  revision must be a person's request is a choice between that fail-safe and B3's rule; I did not make it.
- **A contradiction's disposition** *(second fix-up)*. A contradiction that names a form claim is disposed of by a
  signed-in person's own request (S1.29); between plain claims it is as on rc.10.73.42 (refused for an agent account
  and a draft by Sol at the server gate, accepted from a person's request marked as an import). **Ruling E7, a limit
  that stays:** set to `open` by a person it makes the released claims it names ineligible (`affectsReleased`), as on
  rc.10.73.42, a form among them: one person's request switches a released concept off until a person separates the
  contexts again.
- **Ruling E7, the other limit that stays:** a person's opposing claim makes a reviewed concept read `draft` until a
  person separates the contexts (B9, above). With G2 the concept stays covered meanwhile, so no agent or import edits
  it in that window.
- **The repository's signed invalidations** *(second fix-up)*. A signed repository sync records invalidated source
  revisions (`repositorySync.invalidations`) without a knowledge command, and a released claim on such a source reads
  ineligible. No form rests on a repository source any more (S1.29), so this reaches no concept the commands wrote; a
  document that holds such a form anyway is refused its supersession and withdrawal through the old entry.
- **A threshold in words, or inside an identifier** *(second fix-up, G1)*. The number rule reads digits: "five
  seconds" is a word, and `SLA-99-999-percent` is a valid identifier, as ruled. The second person's review is what
  reads them.
- **A form claim's own review stores no account kind** (it has the shape of a claim review of rc.10.73.42 plus
  `formChecked`); ruling B4 is on the concept's review, which covers each form claim with its review by hash.
- **Reading a tranche-sized active release is slow.** `knowledgeEligibility` digests the whole release once for each
  claim it is asked about (rc.10.73.42 behaviour). With 540 forms in one active release `releasedConcepts` took about
  43 seconds on this machine; `conceptReading` and `conceptDecisionForms` call it. A per-release memo of the checksum
  in `knowledgeEligibility` is about 70 B on the route. S3 or S5 must settle it before a tranche is read interactively.
- **The structured unit of an applicability form** is not read by the number rule (the ruling names the statement,
  conditions and limitations). Its predicates may hold thresholds; they are reviewed by the second person.

## Verification (the two fix-up sessions, 2026-11-18)

What the first fix-up session recorded is kept below it; what the second session saw itself comes first.

**Second session (the one that made the final commit).**
- **The first session's head** (`fcc502f`): the suite gave 26 passed, 0 failed, 4 pending.
- **Cases first, checked again.** For each item the suite files as committed with the item were run on the product
  files of the commit before it, in a scratch copy of the tree. Each case is red there:
  S1.15 "applicability: the validator"; S1.10 "released and active: a reading of the design moved"; S1.16 "Missing
  expected exception."; S1.17 "Missing expected exception."; S1.18 "id is in the hash"; S1.19 "the review records the
  reviewer's account kind"; S1.20 "KC.conceptDecisionReading is not a function"; S1.21 "REQ-001 is not a concept id";
  S1.22 "definition" (the definition form with a unit); S1.24 "The input did not match … quotes[0] names the text it
  grounds"; S1.25 "Expected values to be strictly deep-equal" (the tiers). S1.23 is red with the runner of the commit
  before ("a filter that matches nothing is not a pass"): its change is in the runner. S1.8's walk of the fifteen
  types passes before and after: it completes coverage and changes nothing.
- **This session's own cases, red before their change:** S1.26 "Missing expected exception: an agent account: a plain
  opposing claim on a reviewed concept"; "S1.5 through the service", with the same request sent through
  `POST /api/commands`, "an agent account opens no contradiction with a form of a reviewed concept"; S1.10 "released
  and active: a reading of the design moved" and S1.16 "the Brain's receipt names the release of plain claims, which
  it reads, and not the release of forms" before the receipt was changed.
- **The suite on the final code, after `node build.mjs`** (so that S1.14 read the built client): 27 passed, 0 failed,
  4 pending (S2 to S5), 118 seconds.
- **Old documents:** `--print-baseline` run on the product files of `94dbd4f` (the six changed files at the baseline,
  the three new modules moved aside) prints byte for byte what it prints on this branch, and S1.8 asserts that object,
  the walk of the fifteen pre-existing command types included.
- **Guard mutations, in a scratch copy:** nine tried, nine killed. The capability not asked about a contradiction with
  a form; `opposes` asking nobody (in S1.26 and through the service); an entry with no capability opening the
  contradiction; `knowledge.capture` not handing the capability on; the read-time check ignoring the stored account
  kind (S1.19); a retired concept reviewed (S1.22); `releasedClaims` handing over a release that holds a form (S1.16);
  a covered concept changed by anyone (S1.18, S1.26, the service case). The first session's 38 were not run again.
- **`stewardship-validate.mjs` past its baseline failure** (it stops at its line 92 on this machine, on the baseline
  too, before its server cases send `knowledge.capture` and `knowledge.steward` through `/api/commands`): a scratch
  copy with that one assertion set aside, never committed, passes its 8 checks on this branch and on commit `94dbd4f`
  with identical output.
- **Related existing suites, two at a time** (84: the sixty of the first session, which are every existing
  `*-validate.mjs` that imports `knowledge-governance.js`, `knowledge-stewardship.js`, `repository-packet.js`,
  `authorship.js` or `recovery-service.js` and thirteen named others, and twenty-four more that exercise a reader built
  on released claims: the Brain, product comparison, the architecture case, Sol's packets; browser, layout, screens
  and scale suites not run). Run twice, with item 12 in and again on the final product code after the receipt was
  changed, with the same result: **73 passed, 11 failed, none newly red.** Nine of the eleven are registered suites
  that are red in `audit/rc42/regression-2026-11-16.json`, each with the first failure line that record holds
  (`brain-ahead`, `brain-reasoning`, `chapter-reasoning`, `command-equivalence`, `contextual-intelligence-ui`,
  `design-concern`, `knowledge`, `stewardship`, `sol-disclosure`); the other two have no `test:` script
  (`repository-packet-validate.mjs` is a tool that needs a packet file this machine does not hold;
  `sol-comparison-validate.mjs` fails on a sentence of Sol's request that holds no knowledge). Each of the eleven was
  run again on commit `94dbd4f` exported whole: it fails there too, with the same output once times, generated ids,
  source positions and the tree's path are set aside (for `contextual-intelligence-ui` the same lines with one line
  at another place: the two runs recorded standard output and standard error differently).
- `node check-syntax.mjs`: 914 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
  `node build.mjs`: passes every gate (numbers under Measurements). `client-bundle.mjs` and `build.mjs` are not in the
  diff against `94dbd4f`, and no `*-validate.mjs` that exists on `94dbd4f` is.
- Evidence: `audit/rc44/evidence/wp1-s1-forms-fixup.json`.

**First session, as it recorded it** (not run again unless said above).
- **Cases first.** Each new case was run red before its change: S1.15 at the padded quote, then at the target label;
  S1.10 at "released and active: a reading of the design moved"; S1.16 at "released claims: the plain claim, and no
  form" (and, with the stewards' filter taken out again, at "a plain candidate is listed as before; no form is");
  S1.17 "Missing expected exception"; S1.18 "id is in the hash"; S1.19 "the review records the reviewer's account
  kind"; S1.20 `conceptDecisionReading is not a function` (the behaviour it replaces was asserted by S1.9: four forms
  handed over); S1.21 "REQ-001 is not a concept id"; S1.22 at the definition form with a unit (and, with the guard
  "a retired concept is not reviewed" removed, "Missing expected exception: verified"); S1.23 "a filter that matches
  nothing is not a pass"; S1.24 with the fixtures in the new shape: 21 of 25 cases red; S1.25 at the tiers.
- **Guard mutations:** 38 tried, 38 killed (listed in the evidence file).

## Verification of the first build (second session, 2026-11-18)

- **The new suite on the baseline.** With the product code of `94dbd4f` all 15 S1 cases fail: S1.1 with "a claim sent
  with a form was stored without it (the form was silently dropped)", the other 14 because `public/concept-form.js`
  does not exist. `--print-baseline` run on that code prints exactly the `BASELINE` object of S1.8.
- **The new suite then:** 15 passed, 0 failed, 4 pending (S2 to S5).
- **Related suites:** the 53 registered suites that import `knowledge-governance.js`, `authorship.js` or
  `recovery-service.js` (and `test:knowledge`, `test:architecture-case`), two at a time: 45 passed, 8 failed. The 8
  (`brain-ahead`, `brain-reasoning`, `chapter-reasoning`, `command-equivalence`, `contextual-intelligence-ui`,
  `design-concern`, `knowledge`, `stewardship`) are red in `audit/rc42/regression-2026-11-16.json` and were run again
  on the baseline's product code: each fails with the same first line (apart from a timestamp and a generated id).
  `test:scale` was not run (a load suite of more than 15 minutes, red at the baseline for this machine; the lead's).
- **Past the baseline failure of `stewardship-validate.mjs`:** it stops at line 92 on the baseline, before its server
  cases send `knowledge.capture` and `knowledge.steward` through `/api/commands` (now the wrapper). A scratch copy with
  that one assertion set aside (never committed) passed its 8 checks, with the same output on the baseline and there.

## Done

- `public/concept-form.js`: the nine form types, their tier, fixed claim type and predicate, the closed vocabularies
  (`CONCEPT_KINDS`, `CONCEPT_SCOPES`, `RELATION_VERBS`, `EVIDENCE_LEVELS`, `ALIAS_SCHEMES`, `CONCEPT_ID`,
  `RECORD_REFERENCE`), `quoteFound`, `conceptFormIssues`, `conceptFormRecord`. Pure; imports nothing.
- `public/knowledge-concept-commands.js`: `applyConceptCommand` (the one entry for `knowledge.*`), `formCapability`,
  `REVIEW_TRIGGERS`, the re-exported `KNOWLEDGE_LIMIT_TIERS` and `knowledgeLimits`; commands `knowledge.library`,
  `.topic`, `.concept`, `.concept-review`, `.concept-retire`, `.concept-restore`; the rules of a form on
  `knowledge.claim`, `.review`, `.release`.
- `public/knowledge-concepts.js`: `conceptHash`, `conceptAuthors`, `conceptRecords`, `conceptCovered`, `formIssues`,
  `formStatus`, `releasedConcepts`, `conceptReading`, `conceptTeachingForms`, `conceptDecisionReading`,
  `conceptDecisionForms`.
- `public/knowledge-governance.js`: the fifth argument `{forms, limits}`; the limit tiers; a claim's `form` and
  `authoredAs`; the optional source keys `checkedAt`, `reviewDue`, `versionScope`, `sourceFile`; `formChecked` on a
  form's review; the form hooks at claim, review and release, and *(fix-up, item 12)* where a claim would contradict
  a form (`flagOverlaps`); the register's command types through the `default` branch; `releasedClaims` without the
  releases of forms. 27 bytes in the client.
- `public/knowledge-stewardship.js` (the stewards' reading lists no form claim), `public/architecture-brain.js`
  *(fix-up, second session)* (the Brain's receipt names no release of forms), `repository-packet.js` (the tier),
  `worker.js` (import and dispatch with `{author}`), `authorship.js` (four person-only types), `recovery-service.js`
  (an imported concept review loses its actor).
- Suite: 27 S1 cases green; S2 to S5 hold one pending case each. The runner fails a run that executed no case.
- The design's Appendix B records were run through `conceptFormIssues` against the real renditions on the first
  build's machine (scratch, nothing copied): every slice and passage hash matched the design. *(fix-up)* The appendix
  is written in the first build's shape; with B6 its `quotes` are `[{field, quote}]` and its `doesNotEstablish`
  entries are `{text, quote}`, and the two `example` forms still need a quote for `expectedOutcome`.

## In progress

Nothing. The second fix-up is complete on `rc44/wp1-s1-forms-fix-c3`; its head is the final commit. Nothing was pushed
and nothing was merged. The three points the first fix-up left for the lead are ruled: the superseding source (E1),
the receipt (E2, confirmed), the tier's counts (E3). What this round leaves for the lead is under "Open questions",
items 7 to 10.

## Next (for the slices that follow; none blocks S1)

- **S0 registration, when it lands:** nothing of S1 is registered in `record-graph.js`, `trace-kernel.js`,
  `review-domain.js`, `record-lifecycle.js`, `provenance.js`, `canonical-command.js`, the readings upgrade or the project
  store. Candidates for the registry: journal nouns for the six new command types, a lifecycle row for concept
  retire/restore, and the keys below (B10). **This package's id is `p10-knowledge`** (ruling A2 as amended by D8); a
  route stub, should wp1 ever need one, is `p10-knowledge-route`. By ruling B10 the first slice of wp1 that
  registers through S0 is S3 (`designKeys`, `evidenceKeys`, the record-graph rows of a pin). Ruling D2 has the
  boundary write a package's id into a document when a command or an upgrade step of that package first writes;
  `knowledge.*` is a built-in command family today (open question 3), so S3 must settle with the lead whether a
  document that holds concepts names `p10-knowledge` and what a build without the package does with it. Under ruling
  D7 a `second` step answers a projection `{id, actor, history, owner?}`:
  `conceptAuthors(concept, claims)` is that projection for a concept's review (the concept's author, every editor and
  the author of each form claim), and a read hands the stored actor and account kind to `verifierRefusal` and requires
  a person's.
- **Opens with records (ruling D10):** a document that holds concepts, topics or forms loads nothing more than one that
  holds none. S1 has no client code (none of its three modules is in the client), so the figure equals the chapters
  route's. It first differs in S5, whose concept view lives in the knowledge workspace's lazy entry.
- **S2:** `knowledge.crosswalk*`, `resolveConcept`, `BUILT_IN_CROSSWALK`; add its person-only types to the line in
  `authorship.js`; `conceptReading` gains `aliases`. Its commands follow B2 (a library only) and B3: the verified
  crosswalk rows of a concept are what `crosswalkChecked` reviewed, so either they join `conceptHash` or a non-person's
  row on a covered concept is refused; an unchanged upsert writes nothing. Its reviews store the reviewer's account
  kind, as the concept review does (B4), and its person-only steps ask `kindRefusal` (an author that names a person's
  account).
- **S3 (ruling B10 and what the fix-up adds):**
  - the reading takes a released concept's identity (title, kind, family, facets) from the release parts, not from the
    register: today `conceptReading` reads the mutable register record, and for an organisation release there is none;
  - a currency state and a finding for a concept retired behind an active pin (today a pin on it hands over nothing
    and `conceptDecisionReading` says why; nothing is raised);
  - `KINDS` in `architecture-knowledge-unit.js:6` extended with `component`, `technique`, `composition`,
    `deployment-topology` (about 60 B on the route) before S4 imports component profiles;
  - `designKeys` and `evidenceKeys` for `knowledge.concepts`, `.topics` and `.library` through S0 (the design
    fingerprint holds `p.knowledge` whole, so a library project's recorded reviews read stale on every knowledge write);
  - `conceptHash` covers the topics mapped to a concept: release parts must carry those rows (`file`, `topicId`,
    `sliceSha256`), or the hash cannot be recomputed where the release is pinned;
  - a release made with `conceptIds` holds forms only; `knowledge.link` with a pin reads the concept readers;
  - `knowledge.release` with `conceptIds` and `parts` (the guard in `formCapability.release` is the place); versions;
    the four pin commands (`conceptDecisionReading` reads `knowledge.conceptPins[{id, conceptId, releaseId, status}]`
    and should also compare the pin's `conceptHash` and `anchor`); `refreshConceptPins`; `knowledge.withdraw` of a
    concept id; "a new review replaces it while the concept is unreleased"; recovery of crosswalk reviews, `parts` and
    pins; record-graph rows through S0; `concept` states `released`, `active`, `withdrawn`;
  - the cost of reading a large active release (above). **Ruling E6:** S3 settles it before a pin is read
    interactively, inside wp1's allowance (a per-release memo of the checksum in `knowledgeEligibility`, estimated at
    70 B on the route; 595 B of the 660 B are left);
  - **ruling E4:** a release holds plain claims or forms, never both. S3 follows the code, not design section c;
  - **ruling E5:** the concept register is part of the built-in knowledge family, and a document that holds concepts
    names no package for them. `p10-knowledge` is what S3 registers (the pin, the `concept` type, its finding, its SDD
    section); a design document names `p10-knowledge` when a pin is first written into it;
  - *(second fix-up)* what S3's commands must keep. A pin, a release with parts and a withdrawal of a concept id each
    join the walk of case S1.29 (it fails until they do), and each asks the form capability where it would lower a
    covered concept's standing: `formsRestingOn` in `knowledge-governance.js` is the one place that says which commands
    reach a form through what it rests on. In a design project a request marked as an import can still withdraw a
    pinned organisation release (E1 is applied where the register or a release of the project holds the concept, and
    to the organisation's releases of forms a project holds): S3 states whether the pin's project needs more;
  - *(second fix-up, G2)* a concept review may hold `verifiedBefore {actor, at}`; recovery clears `review.actor` and
    the library mark, so a recovered concept is covered again only through a release or a review made here.
- **S4 (ruling B10 and what the fix-up adds):**
  - *(second fix-up, rulings E1 and E3)* **one library project for each tranche**, sized by the figures under B8: a
    library holds 60 concepts, and the character bound may bind first (about 100,000 characters for each concept with
    its first release and 47,000 more for each successor release of the tranche). An import brings a changed rendition
    as a new source, without `supersedes`; a person sends the supersession. The import neither withdraws nor
    supersedes what a covered concept rests on, disposes of no contradiction that names a form, and writes no revision
    of a covered concept, not even one that changes nothing the review covered (it sends a concept exactly as stored,
    which writes nothing, or leaves it alone). A form claim cites a source saved by `knowledge.source`, never one
    fetched from a repository. A concept a person rejected and nobody verified is still the import's to correct;
  - the import script always states author kind `import`; the review pack says that the third-person rule rests on
    the author kind a request states (a person who sends extracted content as their own gets the two-person path);
  - the extraction shape follows the code, not design Appendix A.2 (deviation 10): `quotes: [{field, quote}]`,
    sub-list entries `{text, quote}`, identifiers, the quote floor, `modelKind` an identifier, a unit on the
    applicability form only, a concept id that is no prefix-and-number;
  - import order: map a concept's topics and attach its forms **before** its review; afterwards an import cannot
    change it (B3), nor send a claim, with or without a form, that contradicts one of its forms (item 12): a second
    handbook's opposing reading of a reviewed concept is a person's to record. "A second run changes nothing" holds
    for `knowledge.concept` and `knowledge.topic`; sources and claims are not upserts, so their idempotency is the
    script's (by tags), as designed;
  - a changed rendition sent as a superseding source stops the use of every form on the source it replaces, in the
    library, at once. *(second fix-up: ruled, E1. For a source a covered concept's form cites it is a person's step;
    the script sends the new rendition as a new source and says that a person sends the supersession.)*
  - the extraction shape, again (rulings G1 and G3): an identifier and an alias id hold letters, digits and hyphens
    (an alias id also a slash); no quote of a form holds another quote of it and no two entries rest on one quote, so
    the extractor gives each item, each sub-list entry and each `quotes` entry words of its own;
  - `knowledge.topic` checks the file against the rendition manifest (no manifest exists yet);
  - tranche size: the numbers under B8 above.
- **S5:** the claim and review forms of the knowledge workspace gain the form fields and `formChecked` (until then a
  form is verified through the command route only); the concept view shows `conceptReading().releases[].reasons` and
  `conceptDecisionReading().reasons`; candidate teaching content is shown in a library only (plan section 6 item 4);
  the workspace graph draws a released, active form as `reviewed`.

## Deviations from the design

1. **Source `origin` is `sourceFile`.** The design adds `origin: {file, fileSha256, rendition, …}` to a source, but a
   source already has `origin` (a string: `recorded-original`, `project-source`, `repository-fetch`,
   `architect-dismissal`) and `knowledgeEligibility` reads it. The new object is stored as `sourceFile`.
2. **The register's commands run inside `applyKnowledgeCommand`.** The design has the wrapper handle the new types
   itself. Here the wrapper injects them as part of the form capability and `applyKnowledgeCommand`'s `default` branch
   calls it, so the copy of the document, the shared counter, the history bound of the tier, the history line and the
   8,000,000-character bound are the same lines for every `knowledge.*` command. `FORM_CAPABILITY` is therefore a
   function of the request's author, `formCapability(author, limits)` with `claim`, `review`, `release`, `command`
   and, *(fix-up, item 12)* `opposes`.
3. **The pending case files do not fail the run.** The design asks for the later case files as "a single failing case".
   A registered suite that is red by design would be read as a regression, so a pending case is listed as PENDING and
   fails only with `--all` (or `AIW_RC44_WP1_ALL=1`). *(fix-up)* A run in which no case was executed fails.
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
   - *(fix-up; the first build's sentence here was inaccurate: it said "names and labels follow the number rule
     (identifiers and targets do not)", while a target's label was not read and an identifier could hold a sentence)*
     in a decision-bearing form every text follows the number rule: texts, names, labels and a target's label, each
     against its own quote; an identifier is the one text the rule does not read, and it must be an identifier;
   - *(fix-up, B5)* `conceptDecisionForms` hands over nothing unless the concept is eligible as a whole in the pinned
     release (the first build required only its definition and handed over the other usable forms);
   - a recovery import clears the actor of a concept review (design: S3, with the crosswalk and pin rows).
5. **`authorship.js`:** the four S1 types are added on their own line below `REVIEW_TYPES` (not inside the literal), to
   keep the merge with S0 and wp2 S1 clean.
6. **`KINDS` not extended** (see Next, S3).
7. **Limits:** `KNOWLEDGE_LIMIT_TIERS` also bounds concepts and topics (project 100 / 100, library 300 / 300) and,
   *(fix-up, B8)* the history (project 2,000, library 6,000); it is defined in `knowledge-governance.js` and every
   caller reads the tier of the document. The design names sources, claims and releases only, injected by the
   wrapper. The release limit (30) is the same in both tiers and was not touched.
8. **Scalars and quotes.** *(fix-up, B6)* `quotes[]` holds `{field, quote}` entries: at least one verbatim quote of
   the passage for each text the form states of itself (`short`, `explanation`, `narrative`, `purpose`, `relation`,
   `bounds`, `scenario`, `expectedOutcome`), none given twice; `title` is a label and `modelKind` an identifier, and
   need none. The first build took a list of strings and counted them.
9. **`conceptReading`** returns `{conceptId, title, kind, family, scope, stages, lenses, state, forms, releases}`.
   `aliases`, `versions`, `pin`, `relations`, `coverage`, `maturity`, `admission` belong to S2, S3 and S4.
10. *(fix-up, B6)* **The extraction shape of Appendix A.2 changes:** `quotes: [{field, quote}]`; in a decision-bearing
    form each entry of `dependsOn`, `doesNotEstablish`, `technique.inputs`, `.steps`, `.outputs` is `{text, quote}`.
    Rule A.3.4 ("every number appears inside a quote of the same item") is applied to each text against its own quote
    and to the claim's statement, conditions and limitations. Rule A.3.9: `modelKind` is an identifier, not "any
    bounded string". S4 follows the code.
11. *(fix-up, B1)* **Design b.2 keeps a form "an ordinary governed claim" that every reader of released claims reads.**
    It is a governed claim in its review, release and eligibility, and no reader of released claims receives it
    (b.4 stands as written). A release holds forms or plain claims, not both.
12. *(fix-up, B2)* **Design section c lets an editor, an import or a draft by Sol send `knowledge.concept` and
    `knowledge.topic` in any project.** They are accepted in a knowledge library only.
13. *(fix-up, B3)* **Design b.1 gives `conceptHash` seven fields and the forms.** It covers the whole record but its
    bookkeeping, and the topics mapped to the concept.

## Open questions (for the lead)

1. **The design fingerprint moves with any knowledge write, as on rc.10.73.42.** `reviewSource` (review-domain.js:50)
   holds every top-level key but seven, so `p.knowledge` is in the fingerprint: a plain candidate `knowledge.source`
   moves it on the baseline (shown in S1.10). *(fix-up)* With B2 a design project takes no concept, topic or form
   through the commands, so only a library's own recorded reviews are touched; B10 gives the keys to S3 through S0.
2. *(fix-up: ruled, B1; the first build's question "a released form is a released claim" is closed.)* No reader of
   released claims receives a form, and *(second session)* the Brain's receipt no longer names a release of forms;
   see "What a released, active form moves".
3. **Merge with S0** (read on `rc44/s0-extensions` at `d681353`, not merged here). Three places meet:
   - `worker.js`: S0 rewrites the dispatch line and adds `installBuiltInCommands(type=>…type.startsWith('knowledge.')?applyKnowledgeCommand:…)`.
     After the merge both must name `applyConceptCommand` (same arguments: `(own, command, at, actor, {author})`), and
     `worker.js` must not import `knowledge-governance.js` for commands: S1.14 asserts the dispatch text and that import.
   - `authorship.js`: S0 replaces the `isReviewCommand` line two lines below the line added here; keep both.
   - `package.json`: both add one `test:` line.
   `knowledge.*` stays a built-in command family (the wrapper), not a registered package: its four person-only types
   are in `REVIEW_TYPES` here. If the lead wants them stated through S0's `commands` part instead, the line in
   `authorship.js` moves there and nothing else changes. *(fix-up)* The fix-up touched none of these three places.
4. **The "third person" rule** (an imported form is released by neither its author nor its reviewer) follows the design
   and is this package's own rule; `verifierRefusal` covers the author, the comparison with the reviewer is one line
   in `formCapability.release`. It rests on the author kind a request states (B10, for S4's review pack).
5. *(fix-up)* **The tier's counts against the storage bound**: see B8 above. *(second fix-up: ruled, E3; the bound is 60.)*
6. *(fix-up)* **The suite now takes about two minutes**, because B8 asks for a tranche and a bound reached through the
   commands. If that is too long for the lead's regression, the 6,000-line fill (about 30 seconds) is the part to
   move behind a flag; I did not, because then the library's bound would be asserted by a document edit. *(second
   fix-up: about three minutes now; the walk of S1.29 takes some twenty seconds and three service projects each a
   few.)*
7. *(second fix-up)* **A form rests on no repository source.** I refused it at `knowledge.claim` to keep ruling E1 and
   the repository's signed path apart (fetch, transfer and sync name no author and go through the old entry). It is
   not ruled. If the lead wants forms on repository sources, those three callers must carry an author and the signed
   sync's withdrawal needs its own ruling against E1 (a signed revocation is a fail-safe nobody "sends").
8. *(second fix-up)* **Activating and deactivating a release of forms is a person's own request**, and so is every
   disposition of a contradiction that names a form, on a draft concept too. Both go beyond the paths E1 names; each
   is one line of `rests` or `formsRestingOn` to turn back.
9. *(second fix-up)* **The structured unit of an applicability form is still not read by the number rule** (Known
   limits): its mechanism, rationale and obligation texts may state a threshold no quote holds, and a pin hands the
   unit over. No ruling names it; the unit is the rc.10.73.42 contract and has no quotes of its own. A rule "a number
   in the unit is in some quote of the form" is a few lines in `formIssues`, off the route.
10. *(second fix-up)* **The refusal still reads "is reviewed or in a release"** for a concept whose review has lapsed
    (G2 keeps it covered). I kept the words, which six cases assert; "was reviewed here" would be more exact.
