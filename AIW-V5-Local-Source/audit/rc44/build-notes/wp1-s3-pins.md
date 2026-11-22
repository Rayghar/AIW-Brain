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

### Item 2: X2 (must-fix 2), the organisation receives only what the library stands behind now

- Done. Case **S3.22**, through the route: a concept the library withdrew by its id, a concept it retired and a crosswalk
  row it retired after the release, each refused at publication with nothing signed ("The library does not stand behind
  SYN-P001 now, so its release is not published: … SYN-P001 has been withdrawn" / "… SYN-P001 is retired in this
  project: <reason>" / "The library does not stand behind KA-0001 (external Outbox, a crosswalk row of SYN-P001) now, so
  its release is not published: it is retired in this library."); a library that stands behind its release publishes it.
- Seen red: on the head of item 1 the withdrawn concept's release answered 201; with the fix, each of the three checks
  taken out by mutation alone turns the case red again (201 at its step).
- Code: `public/knowledge-concept-commands.js` `standsBehind(p, s, release)`, asked at the end of `publishRefusal` (so the
  organisation route asks it with the release-actor rule, before `organizationKnowledgeRelease`): each concept of
  `parts.concepts` usable as a whole in that release (`releasedConcepts`), each row of `parts.crosswalk` among
  `releasedCrosswalk`'s rows of that release; a release that is not active is left to `organizationKnowledgeRelease`'s
  own words. Server only: no route byte.

### Item 3: X3 (must-fix 3), one one-alias rule at every door

- Done. `oneAlias(p, rows, release = null)` (public/knowledge-concept-commands.js) is the one function: asked at a second
  person's verification (`knowledge.crosswalk-review`), at an edit whose written row reads verified (`knowledge.crosswalk`)
  and at the organisation pin (organization-service.js `knowledge-pin`, rows: the release's rows). It reads this register's
  verified `same` rows and the verified `same` rows the project's active releases hold, its own and the organisation's,
  each known by (project, row id), an organisation release's `from.projectId` as its project. `organizationAliasRefusal`
  is retired into it (removed; its one caller now asks `oneAlias`). The words: a row of this register is named as before
  ("(KA-0007, verified): one alias names one concept. Reject or retire that row first."); a row a release holds is named
  by row id and project ("(KA-0001 of project <id>): one alias names one concept[, so the organisation release that gives
  it SYN-P002 is not pinned here]. Deactivate or withdraw the knowledge that names the other first.").
- Case **S3.23**, the review's reverse order through the route: library B pins library A's organisation release (Outbox
  -> SYN-P001); B's edit back to what a lapsed review of its own Outbox -> SYN-P002 covered is refused, and a second
  person's verification of a new Outbox -> SYN-P002 is refused, each naming `KA-0001 of project <library A>`; Outbox
  still resolves to SYN-P001 and no row of B gives it to SYN-P002. S3.15 (the forward order) is kept as it was.
- Seen red: on the head of item 2 the edit back was accepted; with the fix, the edit door's call and the verification
  door's call each taken out by mutation turn S3.23 red at that step ("was accepted"), and the reading of releases taken
  out turns S3.15 red.
- **Replaced assertion (S2.4, the block of ruling S8, "a pair held from before")**: old: b (handbook SYN-S001 ->
  PAT-CIRCUIT-BREAKER) is verified, accepted, while the active release `first` holds a's verified copy (external SYN-S001
  -> PAT-STRANGLER-FIG). New: that verification is refused, naming a by project and row id (X3 reads the project's own
  active releases too); the pair is then made as a document from before X3 could hold it (`first` deactivated, b
  verified, `first` activated again), and every assertion of the block on the pair stands as it was. At least as strict:
  one more refusal is asserted, nothing is dropped.
- For later slices: activating a release is not one of X3's doors. It needs none for the project's own releases: a row
  of an own release resolves only while this register holds it exactly as copied (`releasedRows`), and a row of the
  register comes to read verified only through the doors above. An organisation release's rows resolve on their own,
  which is why the pin is a door. S4's import, if it makes rows read verified, asks `oneAlias(document, rows)`.

### Item 4: X4 (the nine should-fix items), each with its case or its record

Cases first, committed red (`WIP … item 4 (X4): the cases first`), then the change. Each line: the should-fix, the case,
red before with, the change.
- **(a) Recovery clears `knowledge.organizationNotices`** as it clears `pinCurrency` (should-fix 1). **S3.8** extended: a
  hand-made package's forged successor notice ("Forged edition" v9) is cleared to `{}`, the currency too; a document with
  no notices gains no key. Red before: "recovery clears the notices". Change: `recovery-service.js` (two lines beside the
  currency's; confirmed by the lead in X4).
- **(b) A successor the organisation (or the project) withdrew is not offered as newer** (should-fix 2), both branches.
  **S3.24**: own branch, v2 (supersedes v1) withdrawn by a person reads `current`, then v3 (supersedes v2) reads
  `newer-available` naming v3; the organisation's branch, OR2 withdrawn by the administrator reads `current` with no
  finding, then OR3 (supersedes OR2) reads `newer-available` naming OR3 through OR2's notice. Red before: "a withdrawn
  successor is no newer version". Change: `conceptPinCurrency` walks the project's own supersedes chain nearest first and
  passes over a successor whose release, or a form of the concept in it, is withdrawn; `refreshOrganizationAssurance`
  walks the signed notices forward (at most 8 hops, each a signed knowledge release that names the one before it in
  `from.supersedes`) and passes over a successor whose own notice says withdrawn.
- **(c) A withdrawal's stored impact names the pins and relying records for every id the currency reads as withdrawn**
  (should-fix 3). **S3.25**: a withdrawal of the pinned release, of either form claim and of the source each stores the
  pin and `REQ-001`; a withdrawal of a source no pin rests on stores no pin. Red before: "KR-0005: the impact names the
  pin and the record on it". Change: one list, `pinRests(p, pin)` (knowledge-concepts.js), read by both
  `conceptPinCurrency` and `withPinImpact`.
- **(d) A released concept's identity in the reading comes from the release's part when the register's hash differs**
  (should-fix 4; B10). **S3.26**: after a person edits title, kind and scope of SYN-P001 behind its release, the reading
  shows the release's copy; the reading's state stays the register's (`draft`). Red before: "the identity is the release's
  copy". Change: `conceptReading` takes the head from the newest released part unless an active release holds the
  register's concept at its current hash.
- **(e) The knowledge workspace's history panel shows the package's steps from the activity row** (should-fix 5).
  **S3.27**, through the route: `renderKnowledgeReleases(doc, events)` lists `knowledge.history` and the pin's and link's
  steps by time, each step with who took it ("· concept-pin · KU-0001 · architect"), the summary counting both; without
  the activity the panel reads as before; no other activity is listed; every command type of the package is a step it
  reads (`packageStep`, knowledge-package.js) and no built-in knowledge type is. Red before: "with it: the log and the
  package's two steps". Change: `renderKnowledgeReleases(p, steps)`; the workspace reads the activity's latest page once
  per saved revision of a document that holds crosswalk rows or pins (`stepsOf`), and a document without them is drawn
  as before. Limit: the latest page (60 events) of the activity; older steps are in the project activity itself.
- **(f) The successor notice walks the supersedes chain to the nearest published ancestor and notifies every
  organisation release of it** (should-fix 6). **S3.28**: v1 published twice (OR1a, OR1b), v2 never published, v3
  published as OR3: OR3 names both in `from.supersedes`, and a design project pinning each reads `newer-available` naming
  OR3. Red before: "it names every organisation release of the nearest published ancestor". Change: the organisation's
  `knowledge` action walks the library's supersedes chain (at most 31 steps) to the nearest release it published, writes
  a notice for each organisation release of it, and names one by its id or several by the list of their ids
  (`from.supersedes`: a string as before for one, a list for several; the refresh reads either).
- **(g) A mutation for each behavioural case** (should-fix 7), each run on this branch and the file restored byte for byte
  (`.aiw-local/mutate.mjs`, scratch, not committed):
  - S3.4: the `retired` branch of `conceptPinCurrency` taken out: red ("Expected values to be strictly deep-equal").
  - S3.6: the repin's stale-stamp check taken out: red ("knowledge.concept-repin by second-architect was accepted").
  - S3.15: the release rows' reading in `oneAlias` taken out: red ("Expected values to be strictly equal").
  - S3.16: `knowledge.concept-unlink` stated as anyone's in the server registration and its `personOnly` taken out: red
    ("knowledge.concept-unlink by an agent account was accepted").
  - S3.19: the one-active-pin-per-concept check taken out: red ("knowledge.concept-pin by architect was accepted").
  - (S3.21 to S3.23 of this fix-up were seen red the same way for each door; see items 1 to 3.)
- **(h) The pin, migration and link bounds count what stands** (should-fix 9; B8). **S3.29**: 200 pins that moved or were
  retired, 2,000 retired links and 200 accepted or closed migrations leave room (a new pin, link and proposal are taken,
  the proposal numbered KM-0201); 200 active pins, 2,000 active links and 200 open migrations refuse ("… that stand").
  Red before: "This project holds 200 concept pins, the most it holds." Change: the three bounds in `pinCommand` count
  active pins, active links and open migrations; the words say what to do. What still binds a long-lived design is the
  document's character bound (8,000,000), as for every record.
- **(i) S2.12 asserts against the bookings recorded at wp1 S2's start** (should-fix 8). `audit/rc44/evidence/wp1-s2-size.json`
  gains `bookingsAtStart` (5cae40a: wp2-s1 325 B, wp9a-s1 342 B and its two pool items 34 B and 64 B; 3,229,840 + 769 =
  3,230,605 B); the lead gave leave in X4 to add the record and edit S2.12 so. **Replaced assertion (S2.12)**, old: the
  two equalities read every size file less a list of bookings filed after S2's start (wp2 S5's, wp1 S3's, the lead's
  Q8 saving), which each later merge edited (W2, and the working form of item 0). New: they read the recorded bookings,
  and each recorded booking is asserted to be on the books still with the same bytes. Red before (the record absent):
  "the bookings recorded at wp1 S2's start commit". No later merge edits S2.12 again.

### Item 5: X5, the design concerns as ruled

- **(a) J7: the list-11 check row is held back until S5.** Done. `public/knowledge-package.js` states no `checks`; the
  finding stays the package's reader (`knowledge-pins.js conceptLinkFindings`, unchanged) and Appendix E of the SDD,
  which already says "A newer version exists". So the review's list raises nothing a browser user could only waive, until
  S5's concept view offers relink, migration, repin and unpin in the browser; S5 registers the row again (one line:
  `checks:{11:conceptLinkFindings}`) with its surface. Case **S3.1**, seen red before the hold ("the package registers no
  check of list 11 (ruling X5 a)"). **Replaced assertions (ruling X5 a)**:
  - S3.1: old: the review's knowledge findings (`inheritedFindings`, chapterTitle "Knowledge support") hold exactly one
    "Review a newer knowledge version" for api-pod, and the package's registered check gives `knowledge:<link id>`. New:
    the package's reader gives exactly that one finding with that id, the package registers no check, the review's list
    is empty, and Appendix E prints "… version 1 of “Synthetic integration concepts 1” · newer-available … A newer version
    exists: version 2 in “Synthetic integration concepts 2”." (the case's name says so too). At least as strict: the same
    finding is asserted, at its reader, and two more facts are.
  - S3.5, S3.6, S3.19: each assertion on the review's list (`findings11`) of the package's finding -> the same assertion
    on the package's reader, plus the review's list asserted empty where the finding is raised.
  - S3.17 and S2.10: the package's parts `[checks, commands, design, evidenceKeys, id, objectTypes, provenance, records,
    sections]` -> the same without `checks` (exact sets both).
- **(b) B10's remaining part** (the built-in knowledge commands still move a library's design stamp through
  `knowledge.history` and `knowledge.version`) is the lead's at the close of wave 2, with D10. Until then the history
  panel of X4 (e) shows both trails as one. Recorded; nothing built.
- **(c) The two stored caches (`pinCurrency`, `organizationNotices`).** Listed, reader by reader, on this branch:
  - Refresh first (`refreshOrganizationAssurance`, which ends with `refreshConceptPins`): worker.js's project read, its
    command route (before and after applying), its export route (the SDD with Appendix E, the registers, the ARS);
    baseline-service.js; drafting-service.js; intelligence-service.js; organization-service.js (the dependencies scan,
    the library install, the pins). The command boundary refreshes the currency after every knowledge command too
    (`withCurrency`).
  - Read no stored currency or notice: object-service.js (the graph and discussions read the record graph, whose
    `concept` objects carry no currency), collaboration-service.js, intake-service.js, intelligence-draft-service.js
    (Sol reads no form: B1), knowledge-repository.js, repository-sync.js, retention.js, storage-upgrade.js,
    project-lifecycle.js (a template copy drops the knowledge), project-storage.js.
  - **Known limits, owned by S4:** operation-service.js reads the review's findings (`inheritedFindings`) without a
    refresh: it reads no currency while X5 (a) holds the row back, but it will once S5 registers it, so S4 (or S5 with its
    row) refreshes there first or reads the currency computed on read. repository-transfer.js exports the stored caches
    as they are; recovery clears both (X4 a) and the next read writes them again. A pin made in the same commit as the
    first notice of its release reads the notice only at the next read (design risk 5): the read refreshes.
- **(d) `knowledge.conceptLinks` stands (B1);** wp2 S2's brief confirms its contract f.2 (relation `applies`,
  `conceptPin`, the adoption findings) against `knowledge.conceptLinks` before binding to it. Recorded for wp2 S2.
- **(e) The concept record is a row the release holds.** Done. Case **S3.30**: in a project release the concept record's
  author and an editor of it (who wrote no form) are each refused ("KN-0001 (the concept record of SYN-P001): A second
  signed-in person … architect wrote KN-0001. A release holds no concept record its releaser wrote …"), a third person
  releases it; in an organisation release the administrator who edited the record is refused the publication of the
  release that holds the edited record, and publishes the earlier release whose record they never wrote. Seen red before:
  "Missing expected exception: architect, its author, is refused the release". Code: the release capability
  (`formCapability.release`) and `publishRefusal` read the record's author and editors (`recordAuthors`) with
  `verifierRefusal`, after the forms and rows (so the words of S1.11 and S3.13 for a form's author stand).
- **(f) A concept object in the model** (design risk 3: `architectureModel(p)` holds a `concept` object, Chapter 11,
  level intent, and an `informs` relation for each pin) is wp7's to draw or not. Recorded for wp7.
- **(g) For the merge evidence (the lead's):** rc44 development documents that hold concepts, topics or a library mark
  take new design and evidence stamps at their first read under S3 (B10: `knowledge.concepts` and `.topics` are evidence
  and `.library`, `.pinCurrency`, `.organizationNotices` bookkeeping, so they leave the design source), and no released
  document does: no document of rc.10.73.42 or earlier holds those keys (S3.17 reads the three references and the
  review-list document as at 94dbd4f).
