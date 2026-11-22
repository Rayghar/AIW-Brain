# wp1-s3-pins: build notes (slice S3 of design/wp1-knowledge.md, "Releases with parts, pins, currency and findings")

Branch `rc44/wp1-s3-pins`, from `c709ae3` (rc44/integration: S0, wp1 S1 and S2, the adoption record wp2 S1, the typed
deployment topology wp9a slice 1). Binding: `audit/rc44/BUILD-PLAN-2026-11-16.md` section 2, the lead's rulings of
2026-11-18 (main checkout, sections A to V), the S0 contract (`audit/rc44/build-notes/s0-extensions.md`, "Contract for
packages"), the S2 notes' contracts for later slices. `productionAccepted` stays false.
Resumable: read this file and `git log` first. Suite: `npm run test:rc44-wp1-knowledge` (S3's cases are in
`rc44-wp1-cases-pins.mjs`; `--files ./rc44-wp1-cases-pins.mjs` runs them alone, about two minutes;
`AIW_RC44_WP1_MEASURE=1` makes S3.10 compare the built client with the size evidence exactly).

## State

- **Done:** every item below, each case written first (commit `8308a3b`, all 19 red on `c709ae3`); S3.20 added later and
  seen red by mutation. The final commit is on the branch.
- **In progress:** the fix-up of the adversarial review (rulings X1 to X5), on `rc44/wp1-s3-pins-fix`; see "Fix-up" below.
- **Next:** the fix-up's items in order (0 merge, 1 X1, 2 X2, 3 X3, 4 X4, 5 X5, 6 notes, size and suites), then the lead.

## What was built, case by case (`rc44-wp1-cases-pins.mjs`)

| Case | What it holds | Red before with |
|---|---|---|
| S3.1 | The design's first case, through the real boundary and the organisation route: a library releases SYN-P001 with `conceptIds`, its administrator publishes it, a design project pins the organisation release, pins the concept, links `api-pod`; the library publishes v2 as the successor; on the next read the review's knowledge findings hold "Review a newer knowledge version" for `api-pod` (one finding, `knowledge:<link id>`), the pinned forms read as before (still v1), the component is deep-equal, the design stamp did not move, and `knowledgeFindings` (the reader of plain links, the Brain's) is as it was | "Cannot find module public/knowledge-pins.js" (the case's first product step, a release with conceptIds, answered "Choose the exact reviewed claims to release.", as S3.9 shows) |
| S3.2 | Release parts: `parts.concepts` (the concept record, topics, version 1, conceptHash = the register's hash, forms with claim hash and tier, the review) and `parts.changes` (added), inside the checksum; tampered parts make the concept unusable; a release without conceptIds has no concept parts and the old checksum; conceptIds with other claim ids, or an unknown concept, refused; the releaser refused as a form's author and as the verifier of an imported form, a third person accepted | "Cannot find module …" |
| S3.3 | Versions: the same hash keeps v1 and an empty change register; a changed applicability form gives v2 and `changes` names it (`{type, was, now}` claim hashes); `releaseChangeRegister` | idem |
| S3.4 | Currency, in order, with today injected: current, due (the concept's review date, a source's), newer-available (an own successor), replaced (the successor activated; the release unpinned), changed (a tampered claim; a pin hash that is not the release's), retired (the concept retired behind the pin, B10), withdrawn (concept, release, form, source; first of all); `refreshConceptPins` writes `knowledge.pinCurrency` and nothing for a document with no pin | idem |
| S3.5 | Withdrawal: a forged notice and an unsigned one are ignored; only an administrator withdraws, after review; the pinned release reads ineligible "Withdrawn by the organisation: <reason>", the pin withdrawn, the record raises "Review withdrawn knowledge" with the reason, nothing is handed over; neither listing of the organisation shows a notice, and a notice is no release a project installs (that guard seen red: "a notice is no release a project installs") | idem |
| S3.6 | Migration: Sol (an agent account) proposes; it moves no design stamp (L6); the agent's repin is refused at the gate; the architect's repin is refused (one person accepting a draft, D1); after the architect confirms (F4) the architect is still refused; a stale stamp is refused; a second architect accepts: the old pin `moved`, a new pin at v2, the link not rewritten, the version finding "Review SYN-P001: this record rests on version 1; the project now pins version 2" until a person links the record again; the component is deep-equal; a person's own proposal is refused to that person and accepted by a second; `assertTemplateCopyClearsSteps` and `assertStepsMoveNoStamp` on pins, links and migrations | idem |
| S3.7 | Record graph: no pin, the graph's objects and relations as without; a pin is a `concept` object (ref SYN-P001), `linkedVia(api-pod, informs, in)` is the pin and out the record; `assertBuiltInTrailsUnchanged`, `assertBuiltInChainsUnchanged`, every requirement's trail as before; a link to a record that does not exist is refused | idem |
| S3.8 | Recovery: a release's concept review loses its reviewer (kept as `importedActor`), pins are retired ("Imported historical pin"), a migration's acceptance is moved aside (`importedReview`, closed), nothing released elsewhere is usable; an organisation release keeps its signed bytes and reads ineligible until verified here | idem |
| S3.9 | SDD Appendix E (S0's sections part, after "## E. Provenance"): "### Knowledge versions this design rests on", concept, version, release, state, each form's file, lines and passage hash, the records that rely on it; after a successor: still v1, `newer-available`, "A newer version exists: version 2 in …"; a document with no pin prints no section | "knowledge.release by releaser: Choose the exact reviewed claims to release." |
| S3.10 | Size (A4, M4, O1): 108 B of S3's 477 B, booked as `ownBytes` in `audit/rc44/evidence/wp1-s3-size.json`, read through `routeBookings`; 148 scripts; the under-10-KB bucket as a ceiling; stylesheet as before; no server module in the client; "opens with records" | ENOENT (no evidence) |
| S3.11 | E6: `releasedConcepts` digests a tranche-sized release once per read (was once per claim), `conceptDecisionReading` once, `conceptReading` at most twice | "Cannot find module …" |
| S3.12 | I3: the signed invalidation list makes a released claim on a repository source ineligible with no command; a form on a repository source is refused (I1); a released form a document holds on one anyway is unusable with the invalidation among its reasons, a pin hands nothing over, the currency reads changed | idem |
| S3.13 | P1 for organisation releases: the publishing administrator is refused as the author of a form, as the verifier of an imported form, and as the author of a crosswalk row the release holds; a third person publishes; the organisation release carries `parts` inside its signed checksum (a changed part breaks it) | "knowledge.release by releaser: Choose the exact reviewed claims to release." |
| S3.14 | B10 and P5 b: the package's `design` and `evidenceKeys`, exactly; a concept's field, a topic, the library mark, the currency and the notices, written in place, move no design stamp (the concept moves the evidence stamp); pins' and links' steps move no stamp; a migration says nothing; a pin moves the stamp (it is design); the package's commands write no line into `knowledge.history` and move no `knowledge.version` | "Cannot find module …" |
| S3.15 | S10: an organisation release whose `same` row would give an alias a second concept is not pinned, in words naming the other row by (project, row id); two libraries' rows of one id are two rows; an organisation release's rows resolve in the design project | idem |
| S3.16 | E1 walk of the seven pin types, by an agent account, a draft by Sol and an import: each refused, or (the migration proposal) accepted with the pin, its currency, its links and what it hands over as they were; a type added later joins the walk | idem |
| S3.17 | Old documents: the three references and the review-list document read as S0's golden of `94dbd4f` with the package as S3 states it; S1.8 run (bank reference and legacy knowledge document: findings, stamps, fingerprint, SDD, release checksums); no new key before it is written; an organisation release pinned names no package, a pin names `p10-knowledge`; a template copy names none; the package's parts and its person and second types, exactly; it conforms and clashes with nobody | "Expected values to be strictly deep-equal" (the package's parts) |
| S3.18 | Plan ruling 6: no pin on an unreviewed, unreleased or inactive release; a pin written onto a candidate hands nothing over; a current pin and link on the bank reference move no summary, blocker count, coverage, capacity, selection gate, product comparison, realisation finding, specification gate, released claims, knowledge findings, domain knowledge, knowledge structures, snapshot or intelligence reading, and raise no finding | "Cannot find module …" |
| S3.19 | A person's steps: pin and link refused to an agent account, a draft by Sol and an import; one active pin per concept; a record linked once per pin; unpin with a stale stamp refused; `conceptUses`; after a second architect's unpin the link raises "Review changed architectural support" and nothing is handed over; an unlinked record raises nothing | idem |
| S3.20 | A concept withdrawn by its id: refused as an import (E1); a person's withdrawal stores the pin and the relying record in its impact; the currency reads withdrawn; nothing is handed over | red by mutation (the impact hook taken out: "Expected values to be strictly deep-equal"), restored |

## Registration through S0 (rulings E5, D1, D7.1, F3, F4; the S0 contract)

`p10-knowledge` now states, beside S2's crosswalk rows (nothing of S0's own files was edited):
- `objectTypes`: `concept` (Knowledge concept, Chapter 11, level intent, prefix KU); `records`: each pin that is active
  or that an active link names, as a `concept` object, and each active link as a relation `informs` from the pin to the
  record, asked `has(id)` first (J2). No layer, no hop: no trail moves (S3.7).
- `checks: {11: conceptLinkFindings}`: one finding per active link whose pin is not current, id `knowledge:<link id>`,
  chapter 11, chapterTitle "Knowledge support", level warning, objectId the record. It reads the stored currency.
- `commands` (server): `knowledge.concept-pin`, `-link`, `-unlink`, `-unpin`, `-migration-confirm` (`person`),
  `knowledge.concept-migration` (anyone: a proposal), `knowledge.concept-repin` (`second`, projection: the proposal and
  every writer of it). `provenance.paths` for each: `knowledge.conceptPins`, `.conceptLinks`, `.conceptMigrations`. The
  person-only step that confirms a proposal no person wrote is `knowledge.concept-migration-confirm` (F4). The repin is
  kept under the migration's key `review` with the actor and account kind (F3, D7.1).
- `design`: the crosswalk (S2), the pins and the links (all but history, review, confirmed, provenance), the migrations
  (nothing: a proposal, L6). `evidenceKeys`: `knowledge.concepts`, `.topics` (lists: evidence), `.library`,
  `.pinCurrency`, `.organizationNotices` (objects: bookkeeping).
- `sections` (server): Appendix E, after "## E. Provenance".
- The route stub's `needs` reads `knowledge.conceptPins` too.

S0's own suite holds with the package as S3 states it: every block of `rc44-s0-extensions-validate.mjs` passes,
"O1 the bookings add up" included. There is no assertion of S0's suite to list for the lead.

## Retirement list (ruling J6)

| Earlier | Now | Readers |
|---|---|---|
| A pin written into a document by hand (S1 and S2 cases; no command made one) | `knowledge.concept-pin`, on a release of concepts only | `conceptDecisionReading` reads a pin's version identity when its release holds parts (a release without parts names none; no command pins one) |
| `knowledge.link` of a form claim (refused since S1: `releasedClaims` holds no form) | `knowledge.concept-link` through a pin (`knowledge.conceptLinks`) | the package's finding, the record graph, the SDD's section, `conceptUses`; the readers of `knowledge.links` (claim links) are untouched and read no concept link |
| S2's "a design project that pins an organisation release resolves no governed row" | organisation releases carry `parts`; their rows resolve, keyed by (project, row id) | `resolveConcept`, `conceptAliases` |
| The knowledge family's log line for a package's command (S2's crosswalk) | none (quiet): the boundary's activity row records it, the row keeps who took it | S2.16 turned around |
Nothing runs side by side: claim links stay for plain claims, concept links are for released concepts only.

## Deviations from the design, and readings of the rulings

1. **Concept links live in `knowledge.conceptLinks` (KB), not in `knowledge.links` with `pinId`** (design b.2). Ten
   readers of `knowledge.links` (the Brain, knowledgeFindings, knowledgeMarkdown, linkedKnowledge, the stewards, the
   case, technology realisation, the reversal basis, the relevance reader, the workspace graph) read a link as a claim
   link; a concept link there would reach them (B1) and cost route bytes in each. The type is `knowledge.concept-link`
   and `knowledge.concept-unlink` (built-in types belong to the built-in handler).
2. **The finding is the package's registered list-11 check** (E5, S0 contract), not a hook in `knowledgeFindings`
   (design d.4, about 190 B on the route). The case's "the project's knowledgeFindings" is read as the review's knowledge
   findings (chapterTitle "Knowledge support", `inheritedFindings`); `knowledgeFindings(p)` itself, which the Brain reads,
   is unchanged (S3.1 asserts both).
3. **The currency is stored beside the pins, `knowledge.pinCurrency` {pinId: {state, title, detail, successor?}}**, not
   on the pin (design b.1): the boundary restamps every record of a package collection a commit changes (H2), so a
   currency on the pin would make a withdrawal by X restamp the pin as X's. The organisation's notices are stored as
   `knowledge.organizationNotices`, only where a pin reads them. Both are bookkeeping (no fingerprint reads them).
4. **`retired`** is a currency state (B10), title "Review retired knowledge".
5. **Releases of concepts are made with `conceptIds`** (design c). Without it a release is as in S1 and S2 (no concept
   parts, the old checksum). conceptIds with other claim ids is refused (E4), not merged.
6. **A migration is its own record (`knowledge.conceptMigrations`, KM)**, numbered in a sequence of its own: the shared
   counter is read by the design fingerprint, and a proposal says nothing to the design (L6). A proposal by Sol needs a
   person's confirmation, and then a second person (D1): design case 6's "proposal by Sol accepted by a person" is
   "confirmed by a person, accepted by a second". The doctrine line "a pin, a link through a pin and a migration are a
   person's steps" is read as: pin, link, unlink, unpin, confirm and repin are; the proposal is anyone's (design d.7:
   Sol may draft it; AGENTS.md: LLMs propose).
7. **The package's commands write no line into `knowledge.history` and move no `knowledge.version`** (B10, P5 b; S2.16
   turned around). Through S0 a package cannot state `knowledge.history` or `.version` (WORKBENCH_KEYS), so this is how
   the flip is reached: the boundary's activity row records each step.
8. **Organisation release parts are not neutralised on recovery**: they are signed bytes; rewriting them breaks the
   checksum. The release reads ineligible until this workbench's organisation signs exactly it, as its claims do.
9. **The pin's version identity is compared only for releases with parts** (S1's hand-written pins on parts-less releases
   keep S1's reading).
10. **`conceptPin(p, id)`** is exported from `public/knowledge-pins.js` (the lazy entry and the server), not from
    `knowledge-governance.js` on the route (design f.1).
11. **J7 (no finding before the surface that offers its step).** The finding arises only in a document where a person
    pinned and linked through the command route, the same route that offers the migration, the relink and the unpin; no
    old or upgraded document gains it. The browser surface is S5's. If the lead reads J7 as the browser surface, the
    check is one row to hold back until S5.
12. **E6** is settled by a fourth parameter of `knowledgeEligibility` (`made`, the release check read once): 8 B on the
    route. `releasedClaims` (plain releases, at most 250 claims) still reads it per claim.

## Suites of S1 and S2 changed (none of `94dbd4f`)

- `rc44-wp1-cases-forms.mjs` S1.29: the seven pin types join the walk as no command of the entry, and the entry is
  asserted to refuse each (the case's own rule). No assertion replaced.
- `rc44-wp1-cases-crosswalk.mjs`, three replaced, each recorded in the file:
  - S2.10: `Object.keys(package)` equals `[commands, design, id, provenance]` -> equals `[checks, commands, design,
    evidenceKeys, id, objectTypes, provenance, records, sections]`; its commands equal S2's four -> S2's four and S3's
    seven (exact sets), and each of S2's four writes the crosswalk only; the route stub's `needs` regex gains
    `||p.knowledge?.conceptPins`.
  - S2.16 (turned around, as ruled): "moves the library's design stamp (the known limit)", history + 1, version moved ->
    the stamp does not move, history and version do not move, the row keeps who took the step, the activity row names it.
  - S2.12: the two equalities read every size file -> they read the files booked at S2's head (every file but wp1 S3's);
    the measured check still counts every file.

## Measurements (node build.mjs)

| | start c709ae3 | this branch | cap |
|---|---|---|---|
| chapters route code | 3,230,723 B | 3,230,831 B (**+108 B**) | 3,233,792 B (2,961 B left) |
| projects route code | 507,456 B | 507,564 B | 1,242,112 B |
| script files | 148 | 148 | 148 |
| files under 10 KB / 10–50 KB / over 50 KB | 52 / 51 / 45 | 52 / 51 / 45 | 61 under 10 KB |
| stylesheet | 901,873 B | 901,873 B | 902,144 B |
| opens with records (D10) | route + 145,475 B in 2 scripts | route + 147,750 B in 2 scripts (3,378,581 B) | – |

Route bytes, module by module: the stub's `needs` +26, KINDS (B10) +60, `knowledge-governance.js` +22 (orgContent
`parts`, E6's `made`), two minifier renames −4, lists +4. wp1: S1 65, S2 118, S3 108; 369 B of 660 B left.

## Suites (on the final code)

- `rc44-wp1-knowledge-validate.mjs`: S1 34, S2 23, S3 20 cases pass; 2 pending (S4, S5).
- Green: `rc44-s0-extensions` (every block, with the package as S3 states it), `rc44-wp2-adoption`, `rc44-wp9a-deployment`,
  `rc42-g4-trace-kernel`, `rc42-g2-library`, `rc42-g1-tech-approval`, `rc42-g3a`, `rc42-g3b`, `rc42-g7`,
  `knowledge-coverage`, `knowledge-structure`, `architecture-knowledge-unit`, `candidate-import`, `knowledge-boundaries`,
  `knowledge-retrieval`, `knowledge-repository`, `knowledge-design`, `knowledge-ingestion`, `knowledge-second-brain`,
  `hosted-knowledge`, `recovery-authority`, `repository-sync`, `repository-transfer`, `repository-service`, `service-routes`,
  `intake`, `operations`, `enterprise-references`, `sdd-architecture`, `sdd-content`, `sdd-formats`, `sdd-layout-cache`,
  `sdd-mermaid`, `sdd-modules`, `architecture-intelligence`, `architecture-evaluation`, `architecture-obligation`,
  `brain-chain`, `brain-integration`, `brain-synthesis-retrieval`, `brain-tradeoffs`, `caller-resilience`, `composition`,
  `connected-design-projections`, `decision-reading`, `domain-lens`, `drafter-groups`, `driver-applicability`,
  `embedded-intelligence`, `execution-composition`, `execution-journey`, `outcome-contract`, `outcome-design-journey`,
  `payment-knowledge-pilot`, `read-outcome`, `ui-modules`, `rc44-wp9a-deployment-browser` (with the headless shell).
- **Not completed: `recovery-size`.** It stopped with "Error: database or disk is full" (SQLite, errcode 13): the machine's
  disk had 37 MB free (`df`: 100% used), not a failure of the suite. It was not run again, because it writes some
  hundreds of MB and another agent shares the disk. `recovery-authority` (which imports `recovery-service.js`) and S3.8
  pass; the lead's regression runs `recovery-size`.
- Red, the same first failure as `audit/rc42/regression-2026-11-16.json` records at the baseline: `knowledge`
  ("The upstream inventory dependency can time out."), `stewardship` ("F:latency:QD-003 …"), `brain-ahead`
  ("… /\| Capacity \| Critical \|/"), `chapter-reasoning` ("These decisions do not fit in one request."),
  `design-concern` ("Expected values to be strictly deep-equal").
- `node check-syntax.mjs`: 943 modules. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
- Not run: the browser suites (red on this machine at the baseline), `test:scale`, the full regression (the lead's).

## Open questions and limits (for the lead)

1. **The built-in knowledge commands still move a library's design stamp** through `knowledge.history` and
   `knowledge.version` (the concept register's, a form's review, a release): those keys are the workbench's
   (WORKBENCH_KEYS), and no S0 row states them. Taking them out of a library's design source is an edit of S0's
   statement or of `reviewSource`, the lead's.
2. **J7**, deviation 11.
3. **Organisation rows are not held to the bound of 24** (admit): they stand in no register here. The one-alias rule
   is asked at the organisation pin (S10).
4. **The org publication's actor kind**: the organisation route names no account kind; `publishRefusal` takes the
   publisher as a person's account (an agent account is not an organisation administrator here).
5. **Stored currency can lag one read** (design risk 5): refreshed after every knowledge command and on every read.
6. **Size cases of other packages** compare their own equalities with every size file: S2.12 needed reading the files at
   its head; wp2's, wp9a's and S0's size blocks passed here, but each will meet the same when a later booking arrives (the
   lead's, as P8 and V3 say).
7. **A `concept` object in the record graph** (design risk 3): no picture draws it today; the record graph's objects of
   a document with pins gain one object a pin.

## Contracts for later slices, as they now are

- `conceptReceipt(p, conceptId, releaseId)` -> `{kind:'governed-concept', conceptId, releaseId, releaseHash, version,
  conceptHash, forms:[{type, claimId, claimHash}], organizationId?, scoring:false}`; `conceptReceiptCurrent(p, r)`.
- `conceptPin(p, id)` (knowledge-pins.js), `conceptUses(p, pinId)`, `conceptImpact(p, id)`, `conceptVersions(p,
  conceptId)`, `knowledgeUsage(p, releaseId)`, `knowledgeBasis(p)`, `knowledgeBasisMarkdown(p)`, `migrationStamp(p,
  id)`, `unpinStamp(p, pinId)`, `releaseChangeRegister(p, releaseId)`, `conceptPinCurrency(p, pin, {today})`,
  `refreshConceptPins(p, {today})` (the one writer).
- `releasedConcepts(p)[]` gains `part`, `version`, `conceptHash`; `conceptReading` gains `releases[].version` and `pin`
  when they exist; a released concept's identity comes from the release's copy when no register holds it (B10).
- Commands other packages may send: `knowledge.concept-pin` {conceptId, releaseId}, `knowledge.concept-link` {pinId,
  objectId, form?}, `knowledge.concept-migration` {pinId, toReleaseId, reason}.
- `knowledge.release` takes `conceptIds`; `parts = {concepts, changes, crosswalk?}`.
- `publishRefusal(p, releaseId, actor)` and `organizationAliasRefusal(p, release)` (knowledge-concept-commands.js),
  asked by the organisation route.
- Organisation notices: `organization_releases` rows `notice:<release id>` of kind `knowledge-notice`, signed;
  `knowledge-withdraw` (administrator).

External authorities: unchanged. No four-eyes knowledge approver is assigned, licence counsel is not engaged, no
independent architecture review has started, no production acceptance authority exists. Nothing here releases or
promotes knowledge; every record is synthetic; `productionAccepted` stays false.

## Fix-up (rulings X1 to X5 of 2026-11-22, after the adversarial review of `ada5954`)

Branch `rc44/wp1-s3-pins-fix`, from `ada5954`. Review: `/home/user/hb-review/rc44-build/wp1-s3-pins.review.json`
(three must-fix, nine should-fix, seven design concerns). Cases first, each seen red on the head it starts from.

### Item 0: merge of rc44/integration (`e96abef`, component selection wp2 S5)

- Done, commit `138382f`. One conflict: S2.12 in `rc44-wp1-cases-crosswalk.mjs` (wp2 S5's edit by ruling W2 and this
  slice's). Kept in a working form for now: wp2 S5's `LATER` list with this slice's booking file added beside it; ruling
  X4 settles it in item 4. `recovery-service.js` merged cleanly (wp2 S5's selection block and this slice's pins block).
- On the merged tree: `node build.mjs` passes, no violation; chapters route 3,228,648 B (rc44/integration 3,228,540 B
  plus this slice's 108 B, exactly), 148 scripts, buckets 52/51/45.
- Suites: `rc44-s0-extensions` green (every block, "O1 the bookings add up" included), `rc44-wp2-adoption` green,
  `rc44-wp9a-deployment` green. `rc44-wp1-knowledge`: 75 pass, 2 fail, 2 pending. S2.12 fails only in
  `AIW_RC44_WP1_MEASURE=1` mode, which is valid only at S2's own commit (passes without it). S3.10 fails: "the start
  commit is the integrated base and what the other packages and the pool booked" (wp2 S5's 864 B and the lead's
  -3,047 B are now on the books and S3.10 read every booking): settled in item 4 with S2.12 and re-measured in item 6.

### Item 1: X1 (must-fix 1), no agent account takes an organisation knowledge step

- Done. Case **S3.21**, through the route (`world()`, bot an administrator of the organisation): bot publishing a release
  of concepts from a library it owns (403, the words of worker.js for review and releases, code `authorship`, nothing
  signed), withdrawing a person's organisation release (403, no notice row, the design project's pin stays current and
  raises nothing), pinning it into a design project it owns (403, the project unchanged); a person's same requests are
  taken (a pin into their own project, a withdrawal by the administrator steward). Behind the gate: the organisation
  route asked directly for bot refuses at the release-actor rule ("An organisation release is published by a signed-in
  person, not by an agent or service account."), and `publishRefusal` refuses a call that names no account kind.
- Seen red: on the start head bot's publication answered 201; with the gate for publication only, the withdrawal answered
  200 (a notice written); with publication and withdrawal only, the pin answered 200.
- Code: `worker.js` (the agent gate for `/api/organizations` lists `knowledge`, `knowledge-pin` and `knowledge-withdraw`
  beside `review` and `releases`; confirmed by the lead in X1), `organization-service.js` (passes
  `accountKind(env, actor)`), `public/knowledge-concept-commands.js` (`publishRefusal(p, releaseId, actor, account)`: the
  account has no default any more, and anything but a person's account is refused first).
