# WP1 — Versioned, usable knowledge (Change 1, addition A2, feature F1)

Design for the rc44 upgrade, written against the source at
`/home/user/AIW-Brain/.claude/worktrees/integration/AIW-V5-Local-Source` (package.json:4 `AIW v0.10.0-rc.10.73.42+integrity.20261116`).
Paths are relative to that root. No product code, build, test, server or browser was run; every citation was read with
Read/Grep, and the size figures come from the build evidence already in the tree (`dist/client-size-report.json`,
`dist/client-metafile.json`, written 16 Nov). The load-bearing citations (the command boundary, the authorship gate,
the governance module, the record graph and trace kernel, the size gates, the organisation route, the two handbook
entries) were read a second time in a final read-only pass; that pass corrected one count (16 catalogue ids, not 17)
and three locators in Appendix B.
Status: design only. No knowledge is promoted by this document; `productionAccepted` stays false.

What is not verified here, said once: the SHA-256 values and character counts printed in Appendix B were produced when
the appendix was drafted and could not be recomputed in the final pass (reading tools only). They show the shape of a
record; they are not evidence. The S4 builder recomputes every hash from the rendition and refuses a mismatch, so a
wrong value in this document cannot reach a pack.

Reading note on the owner's target: it attributes "thirty design methods" and `design-contracts.js` to RC43.
`public/design-contracts.js` does not exist here, and no thirty-method registry was found. What does exist is the
structured mechanism schema the target cites (`public/architecture-knowledge-unit.js`) and `public/model-alternatives.js`.
This package builds only on what is in this source line.

---

## 0. The design in one page

1. **A concept is one maintained identity with linked forms.** A form is an ordinary governed claim (`knowledge.claims[]`,
   KC) that carries one extra typed field, `form`, and sits on its own exact passage. Nine form types, two tiers:
   teaching (`definition`, `mechanism`, `example`, `exercise`) and decision-bearing (`applicability`, `selection`,
   `composition`, `calculation`, `verification`). The concept record (`knowledge.concepts[]`, KN) names the identity,
   its facets and which claims are its forms. Review, release, pinning, eligibility and receipts are the existing
   machinery, unchanged in meaning.
2. **One identity per mechanism.** A reviewed crosswalk (`knowledge.crosswalk[]`, KA) maps every other id (Playbook
   `P-/S-/T-/AP-`, catalogue `PAT-/STYLE-/ANTI-/ARCH-/TPL-`, handbook `AAP-`/`CL-`, built-in method options) onto the
   concept id. One resolver. The three local mapping tables that exist today are folded into it or declared as its
   seed.
3. **Coverage is derived, never typed in.** A topic register (`knowledge.topics[]`, KT) says what each source topic is
   for and which concept covers it. Which of Understand / Compare / Apply / Challenge / Practice is supported is
   computed from the released forms and from what the other packages have actually registered.
4. **Intake as candidates.** A deterministic pipeline turns handbook entries into candidate concepts through the
   project's own commands, as `knowledge.source` + `knowledge.claim`. Every form, and every item inside a form, must
   cite a passage of the entry (line range + SHA-256 + a verbatim quote) or it is rejected. Identity chain:
   docx SHA-256 (already recorded) → Markdown rendition SHA-256 → entry slice SHA-256 → passage SHA-256.
5. **Pins and findings.** A project relies on a concept through a concept pin (`knowledge.conceptPins[]`, KU): release,
   version, concept hash. When the pinned version is superseded, withdrawn, replaced or due, the records that rely on
   it raise a finding. The pin moves only through a proposed migration that a second person accepts.
6. **Point of use.** The concept view in the existing lazily loaded knowledge workspace offers the five actions and
   labels every form with its status and source. No new script file; about 0.6 KB of hooks on the chapters route.

Where the code constrains the lead's frame (stated plainly, with the way through):

| Frame item | What the code makes awkward | What this design does |
|---|---|---|
| 9 (size) | esbuild assigns a whole file to the chunks of every entry that reaches it. `knowledge-ingestion.js` contributes 185 B to the route chunk only because `knowledge-governance.js` imports it, although its one live client function is used by the lazy workspace (metafile). So any module `knowledge-governance.js` imports puts its client-live code on the route. | `knowledge-governance.js` imports none of the new modules. The server wraps it (`applyConceptCommand`) and injects the form validator as a capability, the pattern `worker.js:101` already uses for `diagramNodes` and `worker.js:638` for `baselineSource`. |
| 9 (script gate) | `client-bundle.mjs:294` `scripts: 148`, measured 148. A module statically imported by two lazy entries becomes a new shared chunk. | All new client code is statically imported only by `knowledge-workspace-ui.js` (already a lazy entry, 133,731 B, limit 377,856 B). Other packages reach it through the existing bridge, never by static import. A suite case scans for this. |
| 3 (four eyes) | There is no single shared helper. rc.10.73.42 left several: the server gate `refuseUnreviewable`/`REVIEW_TYPES` (authorship.js:39-66), and domain checks `verifierRefusal` (architecture-obligations.js:38, exported and generic), `independentApproval` (review-domain.js:319), `independentRiskApproval` (security-domain.js:69), `approvalIndependent` (technology-realisation-domain.js:104), and the author/last-editor rule in workbench-domain.js:194-195. | Reuse two: the server gate (new command types added to `REVIEW_TYPES`) and `verifierRefusal` for the domain-level refusal. No new check is written. |
| 7 (one trace reading) | The trace kernel is requirement-rooted with fixed layers (trace-kernel.js:19, :49-67). Knowledge is not on a requirement's trail. | Pins register in the record graph as an object type and an `informs` relation (record-graph.js), read by the kernel's single-hop reader `linkedVia` (trace-kernel.js:195). No new layer, no trail changes. |
| 4 (immutable passage) | `audit/rc42/handbook-source-hashes.json` hashes the `.docx` files, which are not in the repository. The text that can be sliced is a Markdown rendition, also not in the repository, with no figures (0 images in the three first-slice files). | A rendition manifest binds docx hash → rendition hash. Passage hashes are over rendition lines. Source diagrams cannot be imported from these renditions; see section i. |
| 1 (one document) | Project limits: 100 sources, 250 claims, 30 releases, 8,000,000 characters (knowledge-governance.js:144-250). One handbook is 700 KB and 55–140 topics. | Authoring happens in knowledge-library projects (a tiered limit), distribution through the existing organisation knowledge release and per-project pin (organization-service.js:101-129). No new store. |

---

## a. What exists today, and what is missing

### a.1 Exists (verified)

**Governance lifecycle.** `public/knowledge-governance.js`:
- State under `p.knowledge` with one shared counter (:17-19): `sources, suggestions, claims, contradictions, releases, pins, withdrawals, links, history`, plus `organizationReleases` (:33), `stewardship` (:183), `repositorySync`.
  Id prefixes in use: KS, KP, KC, KX (contradiction), KR, KW, KL, KD.
- `applyKnowledgeCommand(input, command, at, actor)` (:137-252): `knowledge.project-source`, `.source` (:148, body ≤ 60,000),
  `.suggest`, `.dismiss-suggestion`, `.claim` (:164-176; passage ≤ 101 lines and ≤ 12,000 characters; conditions and
  limitations required unless a plain definition, :172), `.capture`, `.steward`, `.review` (:200-208; `verified` refused
  for the author, :203; reviewer must tick source, rights and conditions, :205; open contradiction blocks, :206),
  `.contradiction`, `.release` (:215-222; every claim eligible, checksum = digest of the release), `.activate`
  (:223-231; a successor replaces the release it supersedes in `pins`, :230), `.deactivate`, `.withdraw` (:233-240,
  with an impact stamp), `.unlink`, `.link` (:242-246, relationship always `'informs'`, receipt kept).
- Eligibility re-checked on every read (:41-66): verified by a different actor (:46), review bound to the claim hash
  (:48), structured unit valid (:49-53), source and passage hashes (:54), superseding source (:55), open contradiction
  (:56), withdrawal (:57), repository receipt (:58-62), organisation assurance (:63), release pinned and checksum (:64).
- `releasedClaims` (:68-70), `claimReceipt` (`scoring:false`, :71), `claimReceiptCurrent` (:72), `knowledgeImpact`
  (:101-113), `knowledgeFindings` (:253, 'Review changed architectural support'), `knowledgeMarkdown` (:254),
  `linkedKnowledge` (:256).
- Organisation knowledge releases: `organizationKnowledgeRelease` (:91-100), `pinOrganizationKnowledge` (:76-87),
  limits 1,000 claims / 300 sources / 6,000,000 characters (:32). Server: organization-service.js:107-129 (publish,
  pin), :134-143 (assurance refreshed on every read), signature over the whole stored JSON (:20-23).

**Structured mechanism schema.** `public/architecture-knowledge-unit.js`: kinds (:6), fields `kind, mechanism, scope,
effects, obligations, exclusions, applicability, placement` (:8), bounded typed `requires/excludes` predicates
(:22-49), admission needs 1–12 effects and 1–12 obligations (:62-76).

**The command boundary.** `worker.js:589-666`: `POST /api/commands`; author and agent/Sol gate before anything is applied
(:603 → authorship.js:25-36, :60-66); `knowledge.*` goes to `applyKnowledgeCommand(own, command, at, actor)` (:638) and
does not receive `{author}`; then provenance stamping (:640), change tracking (:644), the journal (:652-653), the undo
receipt (:654), the save with an activity row (:659). `knowledge.review/.release/.activate/.deactivate/.withdraw/.steward`
are person-only (authorship.js:39).

**Readers.** `public/knowledge-structure.js` (catalogue records `evaluateFit:false, scoring:false`, :20; a reviewed claim
read with empty `componentRoles`, `interfaceRoles`, `verificationHints`, `failureModes`, :46-48);
`public/knowledge-coverage.js` (`knowledgeConceptCoverage`, :24-37); `public/domain-knowledge.js` (claims offered by
shape, :29-36; a `method` shape is parsed but has no accessor, :34 and :105-116).

**Curation and template reading.** `public/catalogue-curation.js` (11 marks, :31-43; stubs, :66-85; "not reviewed by a
person", :23). `public/component-snapshot.js:84-105` `templateFields(record)` and `TEMPLATE_LABEL` (rc42 D11: 318 of 328
catalogue records hold generator text).

**Candidate tooling.** `scripts/build-candidate-set.mjs` (pack `aiw-candidate-set-v1`; holds locators and hashes, no
third-party text, :1-8, :54-60); `scripts/import-candidate-set.mjs` (imports through `knowledge.fetch` from the
repository corpus, :42, then `knowledge.claim`, :55, so it cannot read a local Markdown file);
`scripts/build-domain-candidates.mjs` (`--check`, :17-18) and `scripts/import-domain-candidates.mjs` (one
`knowledge.source` per held passage and one `knowledge.claim`, locally :38-49 or through `/api/commands` :51-70). The
pack header already states `status:"candidate"`, `influence{scoring:false,…}`, `productionAccepted:false`
(candidate-sets/core-banking-domain-candidates.json).

**Organisation library.** organization-service.js:66-99: revisioned entries with `conditions, limitations, lifecycle,
reviewDue, source{location, passage, revision, licence, hash}` (:75), a different reviewer (:80), signed releases
(:85-87), install (:89-99).

**Lazy UI host.** `public/knowledge-workspace-ui.js` ("Architecture in context": Explore, Connections, Sources, Releases,
Stewards, :106) is loaded on first use by `public/brain-context-ui.js:85`. Any control carrying `data-k-action` that is
clicked before the module has loaded loads it and replays the click (brain-context-ui.js:468-473). The concept card
(:68) shows the catalogue text, the evidence posture (:55-63) and four buttons.

**Suites.** `knowledge-validate.mjs`, `knowledge-coverage-validate.mjs`, `knowledge-structure-validate.mjs`,
`architecture-knowledge-unit-validate.mjs`, `candidate-import-validate.mjs`, `knowledge-boundaries-validate.mjs`,
`knowledge-retrieval-validate.mjs`, `stewardship-validate.mjs`, `rc42-g2-library-validate.mjs`; registered as
`test:*` (package.json:26-38 for the rc42 pattern).

### a.2 Missing (verified)

| Target | Evidence that it is missing |
|---|---|
| Linked forms of one concept | A claim has `subjectId` (free text ≤ 180, knowledge-governance.js:118) and one of eleven claim types (:117). `claimRecord` copies named fields only, so a `form` sent today is silently dropped. No record says which claims belong to a concept. |
| Teaching vs decision-bearing tiers | No tier anywhere. Candidate claims are shown only in the review forms (knowledge-workspace-ui.js:75-76). |
| One identity | Two id spaces; the Playbook's `catalogue` name (13 entries: 10 patterns, 3 anti-patterns, playbook-knowledge.js:12 and :14) has no reader; three local tables map ids: `STYLE_CATALOGUE` (design-reasoning.js:481, used at :490), `MAPPINGS` (knowledge-coverage.js:9-21), and the phrase cues `PHRASES` (design-reasoning.js:454-459, lexical). `realisation-domain.js:38` accepts Playbook ids only (:152, :247). `knowledge-relevance.js:50` reads `catalogueId/patternId/conceptId`, which no record sets. |
| Coverage per topic | `knowledgeConceptCoverage` covers catalogue ids with a built-in comparison only. No topic register. |
| Handbook intake | The importer needs the repository corpus (import-candidate-set.mjs:42). No extraction shape, no per-item passage rule, no rendition identity. |
| Version pin and finding | Pins are per release (`s.pins`). A link's receipt pins one claim (knowledge-governance.js:245). Nothing is raised while a pinned release is still eligible but a newer edition exists. Organisation knowledge releases have no supersession or withdrawal at all (organization-service.js:107-129 offers list, publish, pin). Sources and claims have no checked date or review-by date (:132-136). |
| Point of use | The concept card offers no actions and does not label forms. Released `method` claims are offered nowhere (domain-knowledge.js:105-116; knowledge-ui.js:70 `releasedOffersHTML`). |
| Knowledge in the record graph | `record-graph.js` has no mention of knowledge; `knowledge.links` are read by `knowledgeImpact` and `linkedKnowledge` only. |

---

## b. Records

All new state lives in the one project document under `p.knowledge`. Every key is optional; an old document has none of
them and reads exactly as before (`knowledgeState`, knowledge-governance.js:17, needs no new default). Ids come from the
existing shared counter (`next(s, prefix)`, :19).

### b.1 New keys

| Key | Id | Purpose |
|---|---|---|
| `knowledge.library` | — | `{enabled, at, actor, reason}`. Marks a knowledge-library project (limit tier, b.5). |
| `knowledge.topics[]` | `KT-nnnn` | The topic register: one row per source topic. |
| `knowledge.concepts[]` | `KN-nnnn` | The concept register. |
| `knowledge.crosswalk[]` | `KA-nnnn` | Crosswalk rows (aliases). |
| `knowledge.conceptPins[]` | `KU-nnnn` | The project's pins to concept versions. |
| `knowledge.previews[]` | organisation uuid | Pinned candidate teaching previews (slice S6 only). |

**Topic** (`KT`):
```
{id, file, topicId, title, lineStart, lineEnd, sliceSha256, sourceId|null, declaredKind,
 intendedUse: 'foundation'|'design-method'|'verification-method'|'reference'|'not-imported',
 conceptId|null, reason, at, actor}
```
`file` is the docx name as in `audit/rc42/handbook-source-hashes.json`. `reason` is required when `conceptId` is null or
`intendedUse` is `not-imported`. Unique on `(file, topicId)`. No lifecycle beyond upsert; the mapping to a concept is
checked in the concept's review (`identityChecked`).

**Concept** (`KN`):
```
{id, conceptId, title, kind, family, scope[], stages[], lenses[], steward, reviewDue, reviewTriggers[],
 notAdopted[], successorOf|null, splitFrom|null, changeNote|null,
 forms: [{type, claimId}],
 revision, at, actor, lastEditor, history: [{revision, at, actor, change}],
 review?: {decision, actor, reviewer, at, reason, identityChecked, formsChecked, crosswalkChecked, conceptHash},
 retired?: {at, actor, reviewer, reason}}
```
- `conceptId`: the canonical id, `/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+){1,7}$/`, ≤ 80, unique in the project. Where a catalogue
  record is the same mechanism the concept takes that id (`PAT-TRANSACTIONAL-OUTBOX`), so every existing claim, link
  and suite that already uses catalogue ids as `subjectId` stays valid. Otherwise `CON-<KIND>-<SLUG>`.
- `kind` ∈ `CONCEPT_KINDS`: `style, pattern, tactic, technique, anti-pattern, component, composition,
  reference-architecture, deployment-topology, principle, topic`.
- `scope[]` ∈ the placement targets of architecture-knowledge-unit.js:17 (`caller, callee, interaction, data-owner,
  component, capability, runtime`); `stages[]` ⊆ 1..11; `lenses[]` ⊆ Chapter 2 category ids (`QUALITY_TYPES`,
  quality-domain.js:12). These are the K-15 facets.
- `reviewTriggers[]` ⊆ `product-version, platform-contract, contradicting-incident, new-workload, new-threat, region,
  quota, classification, runtime, recovery-objective` (K-11, K-19).
- `forms`: exactly one `definition` (the anchor); any other type zero or more times (≤ 4 per type, `example` ≤ 6,
  `exercise` ≤ 9). Each `claimId` must be a claim of this project with `subjectId === conceptId` and
  `form.type === type`.
- States are derived, not stored: `draft` (no verified review, or its hash no longer matches), `reviewed` (verified by
  a second person and every form claim verified by someone other than its author), `released` (present in a release's
  `parts`), `active` (that release is pinned), `withdrawn`, `retired`. Editing a concept changes `conceptHash`, so a
  review lapses the way a `confirmed` flag does elsewhere.
- `conceptHash = digest({conceptId, title, kind, family, scope, stages, lenses, forms: [{type, claimHash}]})` with forms
  sorted by type then hash; `claimHash = digest(claim)` exactly as `claimReceipt` computes it (:71).
  `digest` is `sha256(canonical(value))` (brain-integrity.js:3, :17).

**Crosswalk row** (`KA`):
```
{id, conceptId, scheme: 'akr'|'playbook'|'aiw-method'|'handbook'|'lens'|'external',
 aliasId, label, relation: 'same'|'narrower'|'broader'|'realises'|'distinct',
 evidenceClaimId|null, note, targetContent?: 'authored'|'template'|'marked'|'stub',
 status: 'proposed'|'verified'|'rejected'|'retired', at, actor, lastEditor,
 review?: {decision, actor, reviewer, at, reason, aliasChecked, rowHash}}
```
- Only `relation:'same'` makes identity. One verified `same` row per `(scheme, aliasId)`: verifying a second one for a
  different concept is refused.
- `targetContent` is set by the server for `scheme:'akr'`: `marked` when `catalogueMark(id)` (catalogue-curation.js:45),
  `stub` when the id is only a relation stub (:83-85), `template` when `templateFields(record)` names `summary`
  (component-snapshot.js:100), else `authored`. The client never computes it (see d.5 on why).
- `scheme:'lens'` rows map a catalogue or handbook quality-lens id to a Chapter 2 category: `aliasId` is the foreign
  lens id, `conceptId` is replaced by `category` (a `QUALITY_TYPES` id). Unmapped lenses stay unmapped and are shown so.

**Concept pin** (`KU`):
```
{id, conceptId, title, releaseId, releaseHash, organizationId?, version, conceptHash,
 anchor: {claimId, claimHash}, status: 'active'|'moved'|'retired',
 pinnedAt, pinnedBy, reviewer, reason,
 migration?: {toReleaseId, toVersion, toConceptHash, changes, stamp, proposedBy, proposedAt, authorKind},
 movedTo?, retired?: {at, actor, reviewer, reason},
 currency?: {state, title, detail, successor?: {releaseId, version, conceptHash}, at}}
```
One active pin per `conceptId`. `currency` is the only derived value stored: it is written by one function
(`refreshConceptPins`, d.2) on the server at the two points in d.4 and read by the one finding hook. Stored because its
inputs (the organisation's notices) exist only on the server and because the route cannot afford the reader.
`currency.state` ∈ `current | newer-available | replaced | withdrawn | changed | due`.

### b.2 Extended records (all additions optional)

| Record | Addition | Notes |
|---|---|---|
| `knowledge.sources[]` (KS) | `checkedAt`, `reviewDue` (ISO dates), `versionScope` (≤ 240), `origin: {file, fileSha256, rendition, renditionSha256, lineStart, lineEnd, topicId}` | K-11 and the passage chain. `hash` stays `sha256(body)`; nothing else hashes the source object. |
| `knowledge.claims[]` (KC) | `form: {type, v:1, …}` (b.3), `authoredAs: 'person'|'import'|'sol-draft'|'agent'`; seven claim types added to the closed list at :117: `mechanism, selection, composition, calculation, verification, example, exercise` | `review.claimHash` already covers every field of the claim (:207), so a form is immutable once reviewed. `review` gains `formChecked`. |
| `knowledge.releases[]` (KR) | `parts: {concepts[], crosswalk[], changes[]}` | Covered by the release checksum automatically (`digest(release)`, :221). Absent on old releases; `canonical` drops undefined keys, so old checksums do not move. |
| `knowledge.organizationReleases[]` | `parts` (copied), `from.supersedes`, `assurance.successor: {id, title, at}`, `assurance.withdrawn: {at, reason}` | `parts` joins `orgContent` (:34) as one optional key. |
| `knowledge.links[]` (KL) | `pinId`, `form` | A link without `pinId` is a legacy claim link and behaves as today. |
| `knowledge.withdrawals[]` | target may be a `conceptId` | `known` check at :234 extended. |

**Release parts.** `parts.concepts[i]` is the concept record at release time plus
`{version, conceptHash, forms: [{type, claimId, claimHash, tier}]}`. `version` is 1, or the version the superseded
release held for that `conceptId` plus 1 when the hash differs (same hash → same version). `parts.crosswalk` holds the
verified rows of those concepts. `parts.changes` is the release change register against the superseded release
(K-12): `[{conceptId, change: 'added'|'changed'|'withdrawn'|'renamed'|'split', forms: [{type, was, now}], note}]`,
computed deterministically at release and therefore immutable evidence.

### b.3 The nine forms

Tier is fixed by type. A form's content is bounded data: strings with limits, short lists, no expressions, no code.
Every list item carries `at: [lineStart, lineEnd]` inside the claim's passage and `quote` (12–240 characters) that must
occur in those lines after whitespace is collapsed. Fixed predicate and claim type per form so that
`flagOverlaps` (:120-123) keeps working across handbooks.

| Type | Tier | Claim type · predicate | Content (limits) |
|---|---|---|---|
| `definition` | teaching | `definition` · "is defined as" | `short` ≤ 400, `explanation` ≤ 4,000, `distinctions[{from, difference}]` ≤ 8, `vocabulary[{term, meaning}]` ≤ 12 |
| `mechanism` | teaching | `mechanism` · "works by" | `narrative` ≤ 4,000, `steps[{n, text}]` ≤ 16, `effects[{quality, direction, mechanism, observableMeasure?, potentialCost?}]` ≤ 12 (no magnitude), `diagram?: {notation, source ≤ 4,000, origin: 'source-figure'}` only when the passage holds a diagram source |
| `applicability` | decision | `applicability` · "applies when" | `useWhen[]`, `avoidWhen[]`, `prerequisites[]` ≤ 12 each, `guaranteeBoundary?: {boundedClaim ≤ 800, dependsOn[] ≤ 8, doesNotEstablish[] ≤ 8}`; the claim also carries the existing `architectureUnit` (typed predicates, obligations, effects, placement) for every kind except `topic` |
| `selection` | decision | `selection` · "is chosen over alternatives when" | `alternatives[{target, chooseWhen, cost}]` ≤ 12, `rules[{condition, candidate, contraindication, evidenceNeeded}]` ≤ 12, `variants[{name, chooseWhen, tradeoff}]` ≤ 12 |
| `composition` | decision | `composition` · "composes with" | `roles[{id, name, responsibility, recordKind, required, sameAs?}]` ≤ 16, `relations[{verb, target, when?, reason}]` ≤ 24, `invariants[{kind, statement}]` ≤ 12, `parameters[{name, type, unit?, meaning, selectionBasis, wrongChoice?, required, example?: {value, evidenceLevel:'illustrative'}}]` ≤ 24, `ports[{name, direction, contract}]` ≤ 16, `sequence[{step, ownerRole, text, exitEvidence?, onFailure?}]` ≤ 24 |
| `calculation` | decision | `calculation` · "is calculated by" | `modelKind` ≤ 60, `purpose`, `inputs[{name, unit, meaning}]` ≤ 16, `outputs[]` ≤ 8, `relation` ≤ 1,200 (text for people; never parsed), `bounds` ≤ 800, `notConsidered[]` ≤ 12, `workedValues[{name, value, unit, evidenceLevel:'illustrative'}]` ≤ 16 |
| `verification` | decision | `verification` · "is verified by" | `scenarios[{id, given, when, then, evidenceRequired, evidenceLevel}]` ≤ 16, `failureModes[{failure, behaviour?, signal?, response, evidence?}]` ≤ 16, `metric?: {name, unit, boundary, population, aggregation, window, thresholdBasis, coverage, missingData, ownerAction}`, `signals[{name, unit, interpretation}]` ≤ 12, `technique?: {purpose, inputs[], steps[], outputs[], evidenceProduced}` |
| `example` | teaching | `example` · "is illustrated by" | `title`, `scenario` ≤ 1,200, `steps[]` ≤ 16, `expectedOutcome` ≤ 600, `evidenceLevel`, `numbersAre: 'teaching-assumptions'` |
| `exercise` | teaching | `exercise` · "is practised by" | `items[{level: 'beginner'|'intermediate'|'advanced', prompt ≤ 1,200, stage?}]` ≤ 9 |

Closed vocabularies (exported from `concept-form.js`):
- `RELATION_VERBS`: `requires, requires-when, complements, alternative-to, conflicts-with, constrains, specialises,
  realises, validated-by, remediates, distinguished-from, uses, related` (`related` is untyped navigation: it never
  supports a companion or conflict reading).
- A relation or alternative `target` is `{conceptId}`, `{alias: {scheme, aliasId}}` or `{label}`. Only the first two
  can resolve; a `{label}` target is shown as unresolved.
- `EVIDENCE_LEVELS` (what the source says of itself): `illustrative, proposed, reported-executed-by-source`. A level
  outside this list, or any of `executed, observed, pass, passed, verified` as a level, is refused. Absent reads
  UNKNOWN. Project-side levels (executed in project, observed in production, failed, stale, inconclusive) belong to
  wp6-evidence and are never written here.
- `invariants[].kind`: `identity, authority, time, ordering, publication, lifecycle, other`.
- `roles[].recordKind`: `responsibility, component, contract, data, capability, realization, plan, control, party`
  (the trace layers' record kinds, trace-kernel.js:19).
- `stage` of an exercise: `problem, consequence, inspect, decide, run, evidence, revise, assess` (the teaching sequence
  of Change 7).

Field names the shapes must never use, at any depth: `reviewed`, `confirmed`, `targetConfirmed`, `assumptionsResolved`,
`acknowledge`, `sourceChecked`, `rightsChecked`, `conditionsChecked` with the value `true`; `status` or `decision` with
a value of reviewed, accepted, approved, verified or confirmed; `effect:'not-applicable'`. The authorship gate scans a
payload eight levels deep for exactly these (`claimsReview`, authorship.js:46-58) and would refuse an import or a draft
that carried one as content. That is why a level is `evidenceLevel` and never `status`, and why the b.3 shapes hold no
`decision` key. `conceptFormIssues` refuses them by name so the reason given is about the form, not about authorship.

Rules that keep numbers honest: in a decision-bearing form a numeric literal is allowed only inside a `quote` or a typed
predicate value whose quote contains it; `workedValues` and `parameters[].example` are the only places a worked number
may sit, always with `evidenceLevel:'illustrative'`, and no reader may use them as a default.

### b.4 What "status" means at the point of use

One function, `formStatus`, gives each form exactly one state and label:

| State | When | Label shown |
|---|---|---|
| `released` | in a pinned release, eligible | "Released · <release title> v<n> · verified by <reviewer> · <file> L<a>–L<b> · passage <first 12 of SHA-256>" |
| `released-ineligible` | in a pinned release, not eligible | "Not usable: <reasons>" |
| `reviewed` | verified, not in a release (library project) | "Reviewed · awaiting release" |
| `candidate` | a claim of this project without a verified review | "Candidate · not reviewed · <file> L<a>–L<b>" |
| `preview` | teaching form from a pinned preview (S6) | "Candidate preview · not reviewed · from <organisation>, <date>" |
| `catalogue` / `catalogue-template` | catalogue record reached by a `same` row | "Catalogue description (AKR-0.10.73.5)" / "Generic catalogue template: no entry-specific guidance" |
| `playbook` | Playbook entry reached by a `same` row | "SA Playbook · <locator>" |
| `built-in-method` | built-in comparison reached by a built-in row | "AIW built-in comparison · <pack id>" |

Content of a decision-bearing form is returned only in state `released`, and to a design record only through an active
pin (b.1). Teaching content is returned in `released`, `candidate` and `preview`, always with its label. Nothing in any
state other than `released` is read by a check, a gate, a score, a draft or Sol.

### b.5 Limits

`applyKnowledgeCommand` reads its limits from an injected tier instead of literals (:144, :149, :165, :185, :218):
`project` = today's values (100 sources, 250 claims, 30 releases); `library` = 300 sources, 1,000 claims, 30 releases,
the organisation release's own bounds (:32). The 8,000,000-character storage bound (:250) is unchanged in both tiers,
which is why a library project holds one tranche (about 60 concepts), not a whole handbook. Eligibility rules do not
depend on the tier.

---

## c. Commands

All are `knowledge.*` types on `POST /api/commands`. `commandShape` (worker.js:108-115) already admits the prefix
(:102) and its larger body (:106). They are dispatched at **worker.js:638**, where
`type.startsWith('knowledge.') ? applyKnowledgeCommand(own, input.command, at, actor)` becomes
`applyConceptCommand(own, input.command, at, actor, {author})`. `applyConceptCommand`
(`public/knowledge-concept-commands.js`) handles the new types itself and delegates every existing type to
`applyKnowledgeCommand` with the injected capabilities, so there is still one entry for `knowledge.*`.

The other callers of `applyKnowledgeCommand`, all server-side or scripts, stay as they are and are named here so none is
missed: `knowledge-service.js:60` and `repository-transfer.js:66` (`knowledge.source` for a fetched or transferred
repository source), `repository-sync.js:69` (`knowledge.withdraw` of an invalidated source) and
`scripts/import-domain-candidates.mjs:44-45` (plain source and claim). They pass no capability, so the limit tier is
`project` and a `form` can never be stored through them (refused, c table). None of them writes a concept, a crosswalk
row or a pin; a withdrawal made by repository sync reaches the pins at the next read (`refreshConceptPins`, d.4).

Audit: each command appends `{at, actor, type, id, reason, reviewer}` to `knowledge.history` (the existing line, :251;
the wrapper does the same for its own types and honours the 2,000-entry bound, :139) and takes the standard journal,
activity row and idempotency receipt of the boundary (worker.js:652-659).

Undo: none of these is a reversible working action (action-undo-domain.js:6 lists nine types; knowledge is not among
them and is not added). Reversal is by counter-command, with the history kept, as knowledge governance does today.

Actor rules use existing mechanisms only (the server gate, the one exported second-person check, and the commit's
author kind):
- **P (person-only):** the type is added to `REVIEW_TYPES` (authorship.js:39), so an agent account or a draft by Sol is
  refused before anything is applied (:60-66). A payload carrying `reviewed:true` or `decision:'verified'` is refused
  for them anyway (`claimsReview`, :46-58).
- **2P (second person):** in the domain function, `verifierRefusal({id, actor, history, owner:''}, actor,
  author?.account)` (architecture-obligations.js:38) must return null (not signed in, an agent, no recorded author, or
  the author or any earlier editor all refuse), and `author?.kind === 'sol-draft'` refuses, the wording of
  workbench-domain.js:195. Concept and crosswalk records keep `actor` and `history[{revision, actor}]` so
  `deliveryActionAuthors` (:36) reads them unchanged.
- **Not an import either:** the server gate stops agents and Sol drafts; it lets a person's request marked
  `authorKind:'import'` through (authorship.js:61). For the new P and 2P types the wrapper also refuses
  `author.kind !== 'person'`: an import records what a file says and reviews nothing. The existing types keep today's
  behaviour, so no existing suite changes.

Which steps are 2P and why the pin is not: releasing knowledge is the accept step of this package, and it is 2P at
three points (each form's review, the concept's review, and the release when a form was imported or drafted). A pin
is the project saying "use this released version", the same act as today's `knowledge.activate` and `knowledge.link`
(person-only with a named reviewer, :223, :243); it accepts no design. Accepting a design that rests on the pin is
wp2-adoption's 2P step, and accepting a *move* of a pin is 2P here (`knowledge.concept-repin`).

| Type | Payload | Actor | Validation | Reversal |
|---|---|---|---|---|
| `knowledge.library` | `{enabled, reason, reviewer, reviewed:true}` | P | reason required | same command with `enabled:false` (refused while the project exceeds the project tier) |
| `knowledge.topic` | topic fields (b.1) | editor, import, Sol draft | file is in the rendition manifest; `sliceSha256` matches the source body when `sourceId` given; `reason` rule | upsert |
| `knowledge.concept` | `{id?, conceptId, title, kind, family, scope, stages, lenses, steward, reviewDue, reviewTriggers, notAdopted, successorOf, splitFrom, changeNote, forms}` | editor, import, Sol draft (a draft, never a review) | b.1 rules; `successorOf`/`splitFrom` name an existing concept and need `changeNote` ∈ `rename, semantic, split, applicability` plus a reason | edit; `knowledge.concept-retire` |
| `knowledge.concept-review` | `{id, decision, reviewer, reason, reviewed:true, identityChecked, formsChecked, crosswalkChecked}` | P + 2P | `verified` needs the three checks, every form claim verified by someone other than its author, no open contradiction on a form claim; stores `conceptHash` | a later edit lapses it; a new review replaces it while the concept is unreleased |
| `knowledge.concept-retire` / `-restore` | `{id, reason, reviewer, reviewed:true}` | P | restore only an unreleased concept | each other |
| `knowledge.crosswalk` | `{id?, conceptId|category, scheme, aliasId, label, relation, evidenceClaimId?, note?}` | editor, import, Sol draft | scheme closed; `akr`: the id is a catalogue record or stub; `playbook`: `knowledge(id)` exists (playbook-knowledge.js:18); `aiw-method`: `<topic>/<optionId>` exists in `architectureOptions(topic)`; `handbook`: a topic of this project or an `evidenceClaimId` whose passage contains the alias; server sets `targetContent`; status `proposed` | edit; `-retire` |
| `knowledge.crosswalk-review` | `{id, decision, reviewer, reason, reviewed:true, aliasChecked:true}` | P + 2P | one verified `same` per `(scheme, aliasId)`; stores `rowHash` | `knowledge.crosswalk-retire` (P) |
| `knowledge.claim` (existing) | + `form` | as today | `subjectId` is a registered concept; fixed predicate and claim type for the form; `conceptFormIssues(form, {excerpt, lineStart})` empty (shape, bounds, every `at` inside the passage, every `quote` found, number rule, evidence levels); `applicability` on a non-`topic` concept needs a valid `architectureUnit`; records `authoredAs`. A payload with `form` and no capability injected is refused, never stored without it | none (a claim is immutable); withdraw |
| `knowledge.review` (existing) | + `formChecked` | P, not the author (:203) | for a form claim, `verified` also needs `formChecked === true` and the form re-validated | as today (:201) |
| `knowledge.release` (existing) | + `conceptIds[]` | P; for every form claim the releasing actor is not its author, and not its reviewer either when `authoredAs !== 'person'` | each concept `reviewed`; its form claims are added to the claim set and pass `knowledgeEligibility` (:217); builds `parts` before the checksum (:221) | successor release; withdraw |
| `knowledge.concept-pin` | `{conceptId, releaseId, reason, reviewer, reviewed:true}` | P | the release is pinned; the concept is in its `parts`; every form claim eligible; no other active pin for the concept | `knowledge.concept-unpin` |
| `knowledge.concept-migration` | `{id, toReleaseId, reason}` | editor or Sol draft (a proposal) | target release pinned and holds the concept at a different hash; stores `changes` (per-form difference by claim hash) and `stamp = digest([knowledgeStamp(p), id, toConceptHash, uses])` | overwritten by a new proposal; cleared by `{id, clear:true}` |
| `knowledge.concept-repin` | `{id, stamp, reason, reviewer, reviewed:true}` | P, and not `migration.proposedBy`; when the proposal was a Sol draft any signed-in person | stamp current; target still eligible | a new migration back |
| `knowledge.concept-unpin` | `{id, stamp, reason, reviewer, reviewed:true}` | P | stamp covers the records that still rely on it | pin again |
| `knowledge.link` (existing) | + `pinId`, `form` | as today (P) | the claim is a form of the pin's version; `form` defaults to `definition` | `knowledge.unlink` |
| `knowledge.withdraw` (existing) | id may be a `conceptId` | as today (P) | impact stamp as today (:235); the wrapper adds the pins and relying records to the stored impact | none (as today) |

What `knowledge.concept-repin` does: the old pin becomes `moved` with `movedTo`; a new pin is created at the target
version. Links that named the old pin are **not** rewritten. Each raises 'Review <concept>: this record rests on
version n; the project now pins version m' until a person links it again to the new pin (or, for an adoption, until
wp2-adoption's own re-acceptance). That is the finding instead of the silent rewrite.

`knowledge.activate` and `knowledge.deactivate` are not changed. Activating a successor still replaces the release it
supersedes (:230); the pins on the replaced release then read `replaced` and their records raise the existing
'Review changed architectural support'. The person activating sees those pins and records in the activation form
before confirming (lazy UI only).

---

## d. Modules, hooks and the surface

### d.1 `public/concept-form.js` (new, pure)

Exports `FORM_TYPES`, `FORM_TIER`, `FORM_CLAIM_TYPE`, `FORM_PREDICATE`, `CONCEPT_KINDS`, `RELATION_VERBS`,
`EVIDENCE_LEVELS`, `CONCEPT_ID` (the pattern), `quoteFound(excerpt, lineStart, at, quote)`,
`conceptFormIssues(form, {excerpt, lineStart})` → string[], `conceptFormRecord(form, ctx)` → normalised copy or throws
(the pair mirrors `architectureUnitIssues`/`architectureUnitRecord`, architecture-knowledge-unit.js:51, :97; unknown
fields are an issue, as there, :14). Imports nothing from the project. No DOM, no clock.

### d.2 `public/knowledge-concepts.js` (new, pure readers)

Imports `knowledge-governance.js` (`knowledgeState, releasedClaims, knowledgeEligibility, withdrawn, organizationRef,
claimReceipt, knowledgeStamp`), `brain-integrity.js` (`digest`), `concept-form.js`, `catalogue-store.js`,
`catalogue-curation.js`, `playbook-knowledge.js`, `design-reasoning.js` (`STYLE_CATALOGUE` only), `trace-kernel.js`
(`linkedVia`). It must not import `component-snapshot.js` (d.5). Exports:

| Export | Returns |
|---|---|
| `conceptRecords(p)` | this project's concept register with derived state |
| `releasedConcepts(p)` | every concept in a pinned release (own and organisation), each `{concept, release, eligible, forms}`; a form is eligible by `knowledgeEligibility(p, claim, release)` and by `conceptFormIssues` being empty (read-time re-check, the way :49-53 re-checks a unit); the concept's recomputed hash must equal its stored `conceptHash` |
| `conceptVersions(p, conceptId)` | the versions available, newest first by the supersession chain |
| `conceptHash(concept, claims)`, `conceptReceipt(p, conceptId, releaseId)`, `conceptReceiptCurrent(p, receipt)` | the identity of a version, for pins and for wp2-adoption |
| `formStatus(p, entry)` | b.4 |
| `conceptTeachingForms(p, conceptId)` | teaching forms in `released`, `candidate`, `preview`, each labelled |
| `conceptDecisionForms(p, pinId)` | decision-bearing forms of the pinned version in state `released`; `[]` for any other state or without an active pin |
| `conceptRelations(p, pinIdOrConceptId)` | relations with each target resolved or marked unresolved |
| `conceptReading(p, conceptId, {capabilities})` | everything the concept view shows (f.1) |
| `resolveConcept(p, id)` | `{conceptId, relation, via, authority: 'governed'|'built-in'}` or null |
| `BUILT_IN_CROSSWALK` | the built-in seed: the eleven method mappings moved from knowledge-coverage.js:9-21, and the five style rows read from `STYLE_CATALOGUE` |
| `conceptAdmission(p, conceptId)` | the K-12 checklist as `[{id, met, why}]` |
| `conceptCoverage(p, conceptId, {capabilities})`, `topicCoverage(p)`, `COVERAGE_ACTIONS` | section d.6 |
| `conceptsFor(p, {lens, scope, stage, kind, family})` | the K-15 index, ordered by `conceptId`, no score |
| `conceptPinCurrency(p, pin, {today})`, `refreshConceptPins(p, {today})` | the one computation of `currency`, and the one writer of it |
| `conceptUses(p, pinId)` | records relying on a pin: `linkedVia(p, pinId, 'informs', 'out')` ∪ `linkedVia(p, pinId, 'applies', 'out')` |
| `conceptImpact(p, idOrPinId)` | union of `knowledgeImpact` over the form claims, plus `conceptUses` |
| `releaseChangeRegister(p, releaseId)` | K-12, also used to build `parts.changes` |
| `knowledgeUsage(p, releaseId)` | K-25: concepts pinned, linked, cited by a decision, never used, withdrawn |
| `knowledgeBasis(p)`, `knowledgeBasisMarkdown(p)` | the pinned versions a design rests on, for the SDD |

`conceptPinCurrency` in order: `withdrawn` (a withdrawal targets the concept id, the release, a form claim or its
source, :22; or `assurance.withdrawn`) → `replaced` (the release is no longer pinned) → `changed` (a form claim is
ineligible for any other reason, or the recomputed hash differs) → `newer-available` (an own release supersedes the
pinned one and holds the concept at another hash; or `assurance.successor` is set) → `due` (`reviewDue` of the concept
or of a form's source is before `today`) → `current`. Titles: 'Review withdrawn knowledge', 'Review changed
architectural support' (the existing words, for `replaced` and `changed`), 'Review a newer knowledge version',
'Knowledge due for re-validation'.

`resolveConcept` order: an id that is itself a released concept; a verified, released `same` row; a row of
`BUILT_IN_CROSSWALK` (authority `built-in`: navigation only, labelled "AIW built-in mapping, not reviewed by a person",
the posture catalogue-curation.js:23 states of its own marks). A `proposed` row never resolves.

### d.3 `public/knowledge-concept-commands.js` (new; reached by the server and the suites only)

Exports `applyConceptCommand(input, command, at, actor, {author} = {})`, `KNOWLEDGE_LIMIT_TIERS`, `FORM_CAPABILITY`
(`{record, issues, releaseParts}`). Imports `knowledge-governance.js`, `knowledge-concepts.js`, `concept-form.js`,
`architecture-obligations.js` (`verifierRefusal`), `component-snapshot.js` (`templateFields`), `catalogue-curation.js`,
`playbook-knowledge.js`, `architecture-knowledge.js` (`architectureOptions`), `quality-domain.js` (`QUALITY_TYPES`).
Deterministic given `(input, command, at, actor, author)`; ends every command with `refreshConceptPins(document,
{today: at.slice(0, 10)})`. No client module imports it.

### d.4 Existing files touched (narrow hooks)

| File · function · line | Change | Route bytes |
|---|---|---|
| worker.js:27, :638 | import and call `applyConceptCommand(own, input.command, at, actor, {author})` for `knowledge.*` (the `knowledge.fetch` branch stays first) | server |
| authorship.js:39 `REVIEW_TYPES` | add `knowledge.library, knowledge.concept-review, knowledge.concept-retire, knowledge.concept-restore, knowledge.crosswalk-review, knowledge.crosswalk-retire, knowledge.concept-pin, knowledge.concept-repin, knowledge.concept-unpin` | server |
| knowledge-governance.js:137 `applyKnowledgeCommand` | fifth parameter `{forms = null, limits = null} = {}`; `:144, :149, :165, :185, :218` read `limits` (default today's numbers, same messages) | 0 (the function is not in the client bundle: the file is 8,105 B there against 33,737 B of source) |
| knowledge-governance.js:116-119 `claimRecord` | seven claim types added at :117; `...(r.form !== undefined ? {form: forms.record(r.form, …), authoredAs} : {})`; refuse `form` without `forms` | 0 |
| knowledge-governance.js:132-136 `sourceInput` | optional `checkedAt`, `reviewDue`, `versionScope`, `origin`, validated (ISO dates, bounded text, 64-hex hashes) | 0 |
| knowledge-governance.js:200-208 `knowledge.review` | `formChecked` for a form claim; re-validate through `forms.issues` | 0 |
| knowledge-governance.js:215-222 `knowledge.release` | `conceptIds`; the releasing-actor rule; `release.parts = forms.releaseParts(p, release, r)` before `release.checksum` | 0 |
| knowledge-governance.js:234 `knowledge.withdraw` | `known` accepts a concept id of the register or of a pinned release's parts | 0 |
| knowledge-governance.js:242-246 `knowledge.link` | optional `pinId`, `form`, checked against the pin | 0 |
| knowledge-governance.js:91-100 `organizationKnowledgeRelease` | copy `parts`; set `from.supersedes` | 0 |
| knowledge-governance.js:34 `orgContent` | `...(r.parts ? {parts: r.parts} : {})` | about 30 B |
| knowledge-governance.js:253 `knowledgeFindings` | a link with `pinId` whose pin's stored `currency.state` is not `current` raises one finding with `currency.title` and `currency.detail`; the existing finding and its words are untouched | about 190 B |
| knowledge-governance.js (new export) `conceptPin(p, id)` | one-line reader of a pin, for wp2-adoption's findings | about 70 B |
| architecture-knowledge-unit.js:6 `KINDS` | add `component, technique, composition, deployment-topology` | about 60 B |
| record-graph.js:15-58 `OBJECT_TYPES` | `concept|Knowledge concept|11|intent` | about 40 B |
| record-graph.js:187 `recordRelations` (beside the `coauthoring.links` line) | under `!part`: `add({id, title, ref: conceptId}, 'concept', 'knowledge.conceptPins.' + id)` for each active pin, then `rel('informs', l.pinId, l.objectId, {id: l.id, source: 'knowledge.links', attributes: l})` for each active link with a `pinId` | about 260 B |
| design-reasoning.js:481 | `export` on `STYLE_CATALOGUE` | 7 B |
| knowledge-coverage.js:9-21 | `MAPPINGS` deleted; import `BUILT_IN_CROSSWALK` from `knowledge-concepts.js` (same lazy chunk) | 0 |
| knowledge-workspace-ui.js :1-23, :68, :75-79, :106, :220, :222 | import `concept-view-ui.js`; the concept card delegates to it; the claim, review, release and activation forms gain the form fields, `formChecked`, concept selection and the change register; a `concept` action and `openConcept(id, action)` on `window.aiwKnowledge` | 0 (lazy chunk) |
| organization-service.js:84 | exclude `kind:'knowledge-notice'` rows from the library release list | server |
| organization-service.js:107-118 | on publish, find the organisation release whose `from.releaseId` is the project release's `supersedes`; write a signed notice row `{kind:'knowledge-notice', id:'notice:'+old.id, organizationId, releaseId: old.id, supersededBy: {id, title, at}}` (the table's key is `(organization_id, id)`, drizzle/0005_serious_guardsmen.sql:50-56, so it is an upsert) | server |
| organization-service.js (new action `knowledge-withdraw`, POST) | administrator; `{releaseId, reason, reviewed:true}`; upserts the notice with `withdrawn: {at, by, reason}`; `auditEvent` | server |
| organization-service.js:134-150 `refreshOrganizationAssurance` | for each pinned release read `notice:<id>`, verify its signature with `verifyOrganizationRelease` (:23), set `assurance.successor` or, when withdrawn, `eligible:false` with the reason; call `refreshConceptPins(p)` on both return paths (:135 and :149). It is the one place every read passes (10 call sites in worker.js, intelligence-service.js, baseline-service.js, drafting-service.js) | server |
| recovery-service.js:94-99 | apply the same `verifier` neutralisation to `knowledge.concepts[].review`, `knowledge.crosswalk[].review` and their copies in `releases[].parts`; set imported pins to `retired` with the reason 'Imported historical pin' | server |
| sdd-architecture.js:1720 `appendixE` | append `knowledgeBasisMarkdown(B.p)` (the module is not in the client bundle) | server |
| package.json scripts | `test:rc44-wp1-knowledge`, `test:rc44-wp1-knowledge-browser` | — |

**Route total: about 660 B** against 4,929 B spare (3,233,792 − 3,228,863, dist/client-size-report.json). Ceiling for
this package: 700 B; slice S3 measures it with `node client-bundle.mjs` once builds are allowed. Said plainly: 660 B
is above an even share of the spare (4,929 B over eleven packages is about 448 B each), and it is the lead's to grant.
The order of trims if it is not: drop the `conceptPin` export (−70 B; wp2 then reads `knowledgeState(p).conceptPins`
itself); shorten the finding to the existing title with the state in `detail` only (about −60 B); what cannot be cut
is the record-graph registration (about 300 B, frame item 7), the finding hook and the unit kinds, about 530 B.
**Script files: 148 → 148.** **Knowledge workspace chunk: about +45 KB** (133,731 B today,
limit 377,856 B).

No storage upgrade is registered (storage-upgrade.js:21-36 and review-domain.js:146 are untouched): nothing in an old
document needs rewriting.

### d.5 Why the client never runs the template detector

`templateFields` lives in `component-snapshot.js`, which today sits inside the `component-library-ui` lazy chunk
(10,162 B of that chunk). If the knowledge workspace chunk imported it too, esbuild would split it into a new shared
file and the script count would be 149. `catalogue-curation.js:17-20` records the same decision for the route. So the
content state of a catalogue record is established once, on the server, when a crosswalk row is saved
(`targetContent`), reviewed with the row, released with it, and only displayed by the client.

### d.6 Coverage and maturity (derived)

`conceptCoverage(p, conceptId, {capabilities})` returns, per action, `{state, forms, why}` with `state` ∈
`supported | candidate | partial | none`:

| Action | Supported when | Otherwise |
|---|---|---|
| Understand | the `definition` form is `released` | `candidate` if it exists as candidate or preview (shown labelled); `partial` if only a catalogue or Playbook description resolves; else `none` |
| Compare | a `selection` form is `released` and at least one alternative target resolves to a concept that has a released definition | `partial` with the unresolved targets listed |
| Apply | `applicability` and `composition` are `released`, `conceptAdmission` has no unmet item, and `capabilities.apply(kind)` is true | `partial`: "conditions and roles can be read; guided application is not available for this kind in this build" |
| Challenge | a `verification` or `calculation` form is `released` and, for a calculation, `capabilities.challenge(modelKind)` is true | `partial`: "scenarios are listed as text; AIW has no evaluator for <modelKind>" |
| Practice | an `exercise` form exists (`released`, or `candidate`/`preview` labelled) and `capabilities.practice()` is true | `partial`: "the exercise is shown; attempts are not recorded here" |

`capabilities` defaults to all false, so a build without wp2, wp4 or wp8 reports `partial`, never `supported`.
`maturity` is `{level, label}`: 0 listed (topic only), 1 candidate, 2 explained, 3 applicable, 4 evaluable; `used` is
reported separately from `knowledgeUsage`. `topicCoverage(p)` joins the topic register to this, so a topic with no
concept still has a row with its intended use and reason.

`conceptAdmission` items (K-12): definition; mechanism; a use-when and an avoid-when; one alternative or a recorded
reason none is credible; failure behaviour (a `failureModes` item); a steward; one measure (`metric` or an effect's
`observableMeasure`); one validation scenario; every relation target resolvable; `checkedAt` on each form's source. It
gates Apply, not release: a foundation topic may be released with a definition and an exercise and says so.

### d.7 The surface

Host: the Explore tab of the knowledge workspace (knowledge-workspace-ui.js:64-68), in the same lazy chunk, rendered
by `public/concept-view-ui.js` (new; statically imported only by `knowledge-workspace-ui.js`).

- **Header.** Title, kind, canonical id; alias chips, each `scheme · id · relation · authority` (governed or built-in;
  a `targetContent` of `template` or `marked` on the chip); the active pin ("Pinned: v2 of <release> · current") or
  "Not pinned in this project"; the currency line when it is not `current`.
- **Action strip.** Five buttons, Understand, Compare, Apply, Challenge, Practice, each with its state chip and the
  `why` as the accessible description. `none` is disabled with its reason; `partial` opens the pane with the reason on
  top.
- **Panes.** Understand: definition, mechanism narrative and numbered steps (a sketch drawn from the steps in the
  manner of `conceptDiagram`, :30-34, captioned "drawn by AIW from the steps; not a source figure"), examples. Compare:
  alternatives, rules, variants, with 'also consider' (`alternative-to`), 'do not confuse with'
  (`distinguished-from`). Apply: use-when, avoid-when, guarantee boundary, roles, relations (`requires`,
  `conflicts-with`), parameters with unit, basis and the consequence of a wrong choice, obligations from the unit;
  then "Pin this version" (`knowledge.concept-pin`), "Link to this record" (`knowledge.link` with the pin) and "Apply
  to the model", which dispatches `aiw:concept-action` (f.1). Challenge: scenarios with their evidence level,
  failure modes, the metric contract, calculation inputs, bounds and what is not considered. Practice: exercise items
  by level. Every form block ends with its b.4 label and "Open the passage" (`openKnowledgeSource`,
  knowledge-explanation-ui.js:57, for released claims).
- **Library projects only:** a review queue grouped by concept (each form beside its passage with line numbers, the
  existing layout of :76; the admission checklist; the crosswalk proposals) and the release form with concept
  selection and the computed change register.
- **Releases tab (:71):** per pinned release, its concepts with version, the pins on it, 'newer edition available' and
  the migration proposal with the per-form difference and the records that rely on the pin.
- **Entry from anywhere:** a control `data-k-action="concept" data-id="<concept id or alias>"` (optionally
  `data-concept-action`). Before the workspace has loaded, the existing bridge loads it and replays the click
  (brain-context-ui.js:471-473), so no route code is added for the entry.

With no LLM provider configured everything above works: it is all deterministic reading of the document. Sol may send
`knowledge.concept`, `knowledge.crosswalk` and `knowledge.concept-migration` as drafts; it is refused every review,
release, pin and repin by authorship.js:60-66.

---

## e. What is retired, and the migration

| Retired | Replaced by | Consumers migrated | Parity test that allows it |
|---|---|---|---|
| `MAPPINGS` in knowledge-coverage.js:9-21 (a private table from built-in comparison options to catalogue ids) | `BUILT_IN_CROSSWALK` rows of scheme `aiw-method` in `knowledge-concepts.js` | `knowledgeConceptCoverage` (its only reader) | `knowledge-coverage-validate.mjs` unchanged and green; rc44 case: for each of the 16 catalogue ids the table's 11 rows name, `knowledgeConceptCoverage(p, id).methods` is deep-equal before and after, on the suite's fixture |
| The Playbook's `catalogue` name as an unread second identity (playbook-knowledge.js:12, :14) | 13 `proposed` crosswalk rows built by `scripts/build-crosswalk-seed.mjs` (exact name match against the catalogue), verified by a person, released | none (it had no reader) | rc44 case: the seed holds exactly the 13 named entries and each resolves to one catalogue record; a source scan asserts no runtime module reads `.catalogue` of a Playbook entry, so a second path cannot appear |
| `STYLE_CATALOGUE` as a private table (design-reasoning.js:481) | the same object, exported, as the single definition of the five style rows; `BUILT_IN_CROSSWALK` reads it | `styleAlternative` (:490) keeps reading it; `resolveConcept` reads it through the seed | rc44 case: `resolveConcept(p, 'S-MODMONO')` is `STYLE-MODULAR-MONOLITH`, authority `built-in`, for all five. **Temporary adapter:** it stays on the route as a built-in seed until the five rows are verified and released in a governed crosswalk release and wp2-adoption moves the style decision onto adoption records; then `styleAlternative` reads relations from the pinned concept and the table is deleted |
| Free-text `subjectId` for new structured content | a form claim's `subjectId` must be a registered concept | the claim form (knowledge-workspace-ui.js:75) offers the register; legacy claims are untouched and shown "subject not in the concept register" | rc44 case: a form claim on an unregistered subject is refused; a plain claim on any subject still saves (existing suites) |

Not retired, and why: `PHRASES` (design-reasoning.js:454-459) is lexical retrieval, not identity. Component
`patternIds` keep their Playbook ids (realisation-domain.js:38): lifting that limit is wp2-adoption's, through
`resolveConcept`.

Old documents: no upgrade, no rewrite. An old claim has no `form` and belongs to no concept; an old link has no
`pinId` and raises only the finding it raised before; an old release has no `parts` and the same checksum. Resolving
an old component's `P-STRANGLER` to a concept makes the concept findable from it and nothing else: no fit reading, no
obligation, no adoption appears because the schema changed. A template copy drops `knowledge` whole as today
(project-lifecycle.js:8). A recovery import neutralises the new reviews and pins (d.4).

---

## f. Shared contracts

### f.1 This package PROVIDES

Domain (import from `public/knowledge-concepts.js` in server-side and suite code; on the client only through the
bridge below, never by static import):

```
resolveConcept(p, id)            -> {conceptId, relation, via:{scheme, aliasId, rowId|null}, authority} | null
conceptReading(p, conceptId, {capabilities})
  -> {conceptId, title, kind, family, scope, stages, lenses, aliases[], versions[], pin|null,
      forms:[{type, tier, status, label, content|null, architectureUnit|null,
              receipt, source:{file, lineStart, lineEnd, passageSha256, checkedAt, versionScope}}],
      relations[], coverage:{understand, compare, apply, challenge, practice}, maturity, admission[]}
conceptDecisionForms(p, pinId)   -> [{type, content, architectureUnit|null, receipt}]   // released + pinned only
conceptTeachingForms(p, conceptId) -> [{type, status, label, content, receipt|null}]
conceptRelations(p, pinIdOrConceptId) -> [{verb, target:{conceptId|null, label}, when, reason, resolved, receipt}]
conceptsFor(p, {lens, scope, stage, kind, family}) -> [{conceptId, title, kind, coverage, pinned}]  // ordered by id
conceptReceipt(p, conceptId, releaseId)
  -> {kind:'governed-concept', conceptId, releaseId, releaseHash, version, conceptHash,
      forms:[{type, claimId, claimHash}], organizationId?, scoring:false}
conceptReceiptCurrent(p, receipt) -> boolean
conceptPin(p, pinId)             -> pin | null          // exported from knowledge-governance.js (route-safe)
conceptUses(p, pinId)            -> record ids
knowledgeBasis(p)                -> {pins:[{pinId, conceptId, title, version, release, state, forms[], uses[]}]}
knowledgeBasisMarkdown(p)        -> string
```
Constants from `public/concept-form.js`: `FORM_TYPES`, `FORM_TIER`, `CONCEPT_KINDS`, `RELATION_VERBS`,
`EVIDENCE_LEVELS`, and the content shapes of b.3 (version `v:1`).

Commands other packages may send: `knowledge.concept-pin`, `knowledge.link` with `pinId`,
`knowledge.concept-migration`.

Record graph: object type `concept` (source `knowledge.conceptPins.<id>`, id = the pin id) and relation `informs`
from the pin to a record (source `knowledge.links`). Read with `linkedVia(p, recordId, 'informs', 'in')` and
`linkedVia(p, pinId, 'informs', 'out')` (trace-kernel.js:195).

Finding: id `knowledge:<link id>`, chapter 11, `chapterTitle: 'Knowledge support'`, level `warning`, the four titles of
d.2, folded where knowledge findings already are (review-domain.js:174, :219).

Client:
- A control `data-k-action="concept" data-id="…"` opens the concept view; `data-concept-action` selects a pane.
- `window.aiwKnowledge.openConcept(id, action)` once the workspace has loaded.
- Before enabling Apply, Challenge or Practice the view dispatches a synchronous
  `CustomEvent('aiw:concept-capability', {detail: {action, kind, modelKind, supported: null}})` on `document`; a package
  that can take the action sets `detail.supported = {by, note}`.
- On click it dispatches a cancelable `CustomEvent('aiw:concept-action', {detail: {action, conceptId, pinId, receipt,
  objectId, form}})`. The handler calls `preventDefault()` when it takes it; if nobody does, the view says the action
  is not available in this build. (`aiw:*` document events are an existing convention, brain-context-ui.js:474.)
- Another package's lazy surface that needs a reading calls `(await import('./knowledge-workspace-ui.js')).concepts`,
  the existing lazy entry, which re-exports the readers. No new script file results.

Evidence: `audit/rc44/evidence/knowledge-coverage-<set>.json` (schema `aiw.knowledge-coverage/1`: per topic the
intended use, the concept, the five states with reasons, the maturity) and
`audit/rc44/evidence/knowledge-authority-status.json` (g, S4).

### f.2 This package NEEDS

| From | Need |
|---|---|
| wp2-adoption | (1) A handler for `aiw:concept-action` with `action:'apply'` and an answer to the capability query per concept kind. (2) Every adoption stores `pinId` and `conceptHash`, creates the pin through `knowledge.concept-pin` when there is none, and reads conditions, roles, parameters, relations and obligations only through `conceptDecisionForms(p, pinId)` and `conceptRelations`. (3) It registers a relation `applies` from the pin id to the adopting record in `recordRelations`, so `conceptUses` sees adoptions. (4) It raises its own finding when `conceptPin(p, pinId)` is `moved` or its `currency.state` is not `current`. (5) It lifts `PATTERN_IDS` (realisation-domain.js:38) and sets the explicit link `knowledge-relevance.js:50` reads, both through `resolveConcept`. (6) The companion and conflict findings of K-03 at adoption, from `conceptRelations`. |
| wp3-workload, wp4-behaviour | A registry of evaluator kinds with their input names and units (`EVALUATOR_KINDS` or equivalent), so `calculation.modelKind` can be checked at intake and Challenge can say `supported`; a handler for `action:'challenge'`. Until it exists every calculation is "text only". |
| wp6-evidence | The project-side evidence vocabulary, and the rule that a `verification.scenarios[]` item of level `proposed` becomes a proposed evidence item, never a result. The place where a released `technique` is offered when a check is planned (Chapter 11 delivery action, Chapter 9 verification plan). The input for the stewards' item "an observed outcome contradicts a pinned concept" (K-25). |
| wp7-views | Prints `knowledgeBasis` in the SDD (the `appendixE` hook is one line and is theirs to move). Decides which pictures draw `concept` objects; the default expected by this package is none. |
| wp8-guided | Renders the relevant-knowledge controls with `data-k-action="concept"`; handles `action:'practice'` in the sandbox; writes no practice attempt under `knowledge.*`. |
| wp9a-deployment | Uses the kinds `deployment-topology` and `reference-architecture`; no extra shape is expected. |
| wp9b-governance | Exceptions and waivers against a concept's conditions (K-19's exception record) are its records, citing `conceptReceipt`. A concept never becomes policy by being released: a standard is a separate, person-approved record. |
| Lead / owner | The Markdown renditions with the recorded permitted use per file (S4); the name of the second knowledge approver; confirmation that candidate teaching previews may be distributed to design projects (S6). |

---

## g. Slices

Suite files: `rc44-wp1-knowledge-validate.mjs` (plain node assertions; it only imports and runs the case files, so
parallel slices never edit the same lines), `rc44-wp1-knowledge-fixtures.mjs` (synthetic text and builders, the
convention of `composition-fixtures.mjs`), one case file per slice, and `rc44-wp1-knowledge-browser-validate.mjs`.
S1 creates the runner, the fixtures and all five case files (the later ones as a single failing case "not yet
implemented"), so the tests exist first.

### S1 — Forms and the concept register
- **Depends on:** nothing.
- **Owns:** `public/concept-form.js`, `public/knowledge-concepts.js` (register, hash, `releasedConcepts`,
  `formStatus`, teaching and decision readers, `conceptReading` without crosswalk or pins),
  `public/knowledge-concept-commands.js` (`knowledge.library`, `.topic`, `.concept`, `.concept-review`,
  `.concept-retire/-restore`, the wrapper), knowledge-governance.js lines 116-119, 132-136, 137-139, 144-185 (limit
  literals), 200-208; architecture-knowledge-unit.js:6; worker.js:27, :638; authorship.js:39;
  `rc44-wp1-knowledge-validate.mjs`, `rc44-wp1-knowledge-fixtures.mjs`, `rc44-wp1-cases-forms.mjs`; package.json.
- **Tests first** (`rc44-wp1-cases-forms.mjs`):
  1. *Fails today:* a `knowledge.claim` with a `form` is either stored with the form or refused; today it is stored
     without it (:118).
  2. Each of the nine shapes round-trips; an unknown field, an over-limit list, an `at` outside the passage, a `quote`
     not in its lines, a number outside a quote in a decision-bearing form, `evidenceLevel:'passed'`, a reserved
     field name (`status:'verified'`, `reviewed:true`) inside a form are each refused with a sentence naming the item;
     and every valid fixture form passes `claimsReview` as null, so an import by an agent account is not refused for
     its content.
  3. A form on an unregistered subject is refused; a plain claim on a free subject still saves.
  4. Concept register: one definition; a form claim of another subject or type refused; `conceptHash` moves with any
     form claim; an edit lapses the review.
  5. `knowledge.concept-review`: refused for the author, the last editor, an agent account (`author.account:'agent'`),
     a Sol draft and a request marked `authorKind:'import'`; `verified` refused while a form claim is unverified or
     verified by its own author.
  6. Decision-bearing content is absent from `conceptDecisionForms` in every state but `released`; teaching content of
     a candidate is returned labelled `candidate`.
  7. Limits: project tier refuses the 251st claim with today's message; library tier accepts it; an agent cannot send
     `knowledge.library`.
  8. Old document: a project fixture from `knowledge-validate.mjs` gives identical `releasedClaims`,
     `knowledgeFindings` and release checksums before and after.
  9. Read-time re-check: a released form tampered in the document is `released-ineligible`.
- **Done when:** the cases pass; every existing knowledge suite named in a.1 is green unchanged; `node --check` and
  lint clean.

### S2 — Crosswalk and one identity
- **Depends on:** S1.
- **Owns:** `knowledge-concepts.js` (`resolveConcept`, `BUILT_IN_CROSSWALK`, alias part of `conceptReading`),
  `knowledge-concept-commands.js` (`knowledge.crosswalk`, `-review`, `-retire`), knowledge-coverage.js:9-21,
  design-reasoning.js:481, `scripts/build-crosswalk-seed.mjs`, `candidate-sets/crosswalk-seed.json`,
  `rc44-wp1-cases-crosswalk.mjs`.
- **Tests first:**
  1. *Fails today:* `resolveConcept(p, 'P-STRANGLER')` is null while the row is `proposed` and `PAT-STRANGLER-FIG`
     once it is verified and released; today nothing resolves.
  2. Parity for the 16 ids of the retired `MAPPINGS` (section e).
  3. The seed holds exactly 13 Playbook rows, each matching one catalogue record by exact name; `P-STANDBY` and
     `P-CHECK-POINTED-SYSTEM` carry `targetContent:'marked'` (their targets are in catalogue-curation.js:33, :36).
  4. A second verified `same` row for one `(scheme, aliasId)` is refused; `narrower` never resolves as identity.
  5. Review refused for the author, an agent and a Sol draft; a Sol draft can only create `proposed`.
  6. `targetContent` sent by a client is ignored and recomputed; `PAT-CIRCUIT-BREAKER` reads `authored`, a template
     record reads `template`.
  7. Source scan: no module under `public/` reads `.catalogue` of a Playbook entry.
- **Done when:** the cases pass; `knowledge-coverage-validate.mjs` green unchanged; `MAPPINGS` no longer exists.

### S3 — Releases with parts, pins, currency and findings
- **Depends on:** S1 (S2 only for showing aliases).
- **Owns:** knowledge-governance.js lines 34, 91-100, 215-222, 234, 242-246, 253 and the new `conceptPin`;
  `knowledge-concepts.js` (`conceptReceipt`, currency, `refreshConceptPins`, `conceptUses`, `conceptImpact`,
  `releaseChangeRegister`, `knowledgeUsage`, `knowledgeBasis*`); `knowledge-concept-commands.js` (the four pin
  commands, the release and link capabilities); record-graph.js; organization-service.js:84, :107-118, :134-150 and
  `knowledge-withdraw`; recovery-service.js:94-99; sdd-architecture.js:1720; `rc44-wp1-cases-pins.mjs`.
- **Tests first:**
  1. *Fails today:* a design project pins an organisation release, links a component through a pin, the library
     publishes a successor; the project's `knowledgeFindings` holds 'Review a newer knowledge version' for that
     component, and its forms are unchanged. Today nothing is raised.
  2. Release: `parts` built, in the checksum; a release without `conceptIds` has no `parts` and the checksum the old
     code gives; the releasing actor refused when it authored a form claim, and when it reviewed an import-authored one.
  3. `version` stays when the hash is the same and increments when a form changes; `parts.changes` names the changed
     form.
  4. Currency order and titles for each state, with `today` injected; `due` from a source `reviewDue`.
  5. Withdrawal: an organisation `knowledge-withdraw` makes the pinned release ineligible with its reason; the pin
     reads `withdrawn`; a forged or unsigned notice is ignored.
  6. Migration: proposal by Sol accepted by a person; proposal by a person refused when accepted by the same person;
     stale stamp refused; after repin the old link raises the version finding until linked again; nothing in the
     linked record changed.
  7. Record graph: with no pins `recordGraph(p)` is deep-equal to today's; with pins
     `linkedVia(p, componentId, 'informs', 'in')` is the pin; requirement trails are unchanged (compare
     `requirementTrace` ids before and after).
  8. Recovery import: concept and crosswalk reviews lose their actor; pins are retired.
  9. SDD: Appendix E names the concept, version, release, state and each form's file, lines and passage hash.
  10. Size (when builds are allowed): chapters route within 3,233,792 B with this package's hooks at most 700 B;
      148 script files.
- **Done when:** the cases pass; `rc42-g4-trace-kernel-validate.mjs`, `rc42-g2-library-validate.mjs` and the knowledge
  suites green unchanged.

### S4 — Intake pipeline, topic register and coverage evidence
- **Depends on:** S1, S2.
- **Owns:** `scripts/handbook-rendition.mjs`, `scripts/validate-concept-extraction.mjs`,
  `scripts/build-handbook-candidates.mjs`, `scripts/import-handbook-candidates.mjs`,
  `scripts/knowledge-coverage-evidence.mjs`, `candidate-sets/handbooks/` (manifest, packs),
  `knowledge-concepts.js` (`conceptCoverage`, `topicCoverage`, `conceptAdmission`, `conceptsFor`),
  `rc44-wp1-cases-intake.mjs`, `audit/rc44/KNOWLEDGE-REVIEW-PACK-<set>.md` (generated).
- **Tests first** (against the synthetic handbook in the fixtures; no handbook text enters the repository):
  1. *Fails today:* an extraction whose form has no passage, a passage whose SHA-256 does not match the rendition, a
     quote not in its lines, a passage over 101 lines or 12,000 characters, an `at` outside the passage: each is
     rejected with the path of the offending item, and the pack is not written. Today no validator exists.
  2. Identity chain: the pack is refused when the docx hash is not in `audit/rc42/handbook-source-hashes.json`, when
     the rendition hash differs from the manifest, or when the file's permitted use is not owner-recorded.
  3. Import through `applyConceptCommand` as `import`: one source per topic (body = the slice, `origin` complete), one
     topic, one concept, one claim per form, crosswalk proposals; nothing reviewed; a second run changes nothing.
  4. After import `releasedClaims`, `knowledgeFindings`, the chapter findings and the Sol source list of the fixture
     project are deep-equal to before (no candidate reaches a check).
  5. Coverage: every topic of the synthetic handbook has a row; an unimported topic has its reason; states follow
     d.6 with capabilities off (Apply is `partial`), then on.
  6. `--check` fails when a pack is not the script's output.
  7. The evidence file validates against `aiw.knowledge-coverage/1` and holds `productionAccepted:false` and the true
     status of each authority as entered, `not designated` when empty.
- **Done when:** the cases pass; `candidate-import-validate.mjs` green unchanged; the two real entries of the appendix
  build into a pack from the renditions on a machine that has them.

### S5 — The concept view
- **Depends on:** S1–S3 (S4 for the coverage rows).
- **Owns:** `public/concept-view-ui.js`, knowledge-workspace-ui.js (the lines in d.4), a new stylesheet section in
  the existing knowledge workspace sheet, `rc44-wp1-knowledge-browser-validate.mjs`, `rc44-wp1-cases-isolation.mjs`.
- **Tests first:**
  1. *Fails today (browser):* opening a concept shows five actions with a state each; today the card has none (:68).
  2. Each form block shows its b.4 label; a candidate teaching form reads "Candidate · not reviewed"; a
     decision-bearing candidate shows no content outside the library review queue.
  3. A `data-k-action="concept"` control clicked before the workspace loaded opens the concept (the replay bridge).
  4. With no capability handler Apply reads partial with its reason; with a test handler it is enabled and the
     `aiw:concept-action` detail carries the pin and receipt.
  5. Second person in the browser: the reviewer's own concept offers no verify control; the server refuses a forged
     request.
  6. No provider configured: every pane renders.
  7. Isolation (node): the static-import scan of f.1; `conceptDecisionForms` and every existing reader give the same
     result with and without candidates.
  8. Keyboard and screen-reader names on the action strip; light, dark and forced colours.
- **Done when:** the cases pass; the size report shows 148 scripts, the route within budget, the workspace chunk
  under its bound.

### S6 — Candidate teaching previews (only after the owner confirms distribution)
- **Depends on:** S4, S5.
- **Owns:** organization-service.js (new actions `knowledge-preview`, `knowledge-preview-pin`),
  `knowledge-concepts.js` (reading `knowledge.previews` inside `conceptTeachingForms` only), the preview rows of the
  concept view, cases added to `rc44-wp1-cases-isolation.mjs`.
- **What it is:** an administrator publishes, from a library project, a signed `kind:'knowledge-preview'` document
  holding only teaching-tier candidate forms and their sources. A project editor pins it into `knowledge.previews`,
  a collection no existing reader touches (`releasedClaims` reads `releases` and `organizationReleases` only, :68-70).
- **Tests first:** publication refuses any decision-bearing form; with a preview pinned, `releasedClaims`, every
  finding, every reading and the Sol packet are byte-identical to without it (a marker string in the preview text must
  not appear in any packet, the technique of `knowledge-boundaries-validate.mjs:60`); a scan shows `.previews` is read
  in one function; the label is on every preview block.
- **Done when:** the cases pass and the owner's confirmation is recorded in the authority status file. Until then
  candidate teaching content is visible in the library project only.

---

## h. Proof scenario — asynchronous integration

Synthetic fixtures only (`rc44-wp1-knowledge-fixtures.mjs`). System family: **asynchronous integration**. System:
"Northquay Parcel Notices": a booking service must tell partner carriers that a parcel was booked, once per booking,
even when the broker is unavailable. Accounts: `importer`, `reviewer`, `releaser`, `architect`, `second-architect`,
and `bot` (an agent account). The source is a four-entry *Synthetic Integration Handbook* written for the suite in the
handbooks' entry template (SYN-P001 Transactional outbox, SYN-P002 Idempotent receiver, SYN-A001 Unsafe dual write,
SYN-C001 Outbox relay), with a synthetic docx hash entry and a rendition hash computed in the fixture.

| Step | What happens | What is asserted |
|---|---|---|
| 1 Source concept | The library project is marked a library. The pack is built from validated extractions and imported by `importer` as `import`. | 4 sources, 4 topics, 4 concepts, their form claims and crosswalk proposals exist as candidates; an extraction with a missing quote was rejected at build; nothing is eligible. |
| 2 Review and release | `reviewer` verifies each form (`formChecked`), the concepts and the crosswalk rows; `bot` and `importer` are refused. `releaser` releases with `conceptIds`; `reviewer` is refused as releaser of import-authored forms. The release is activated and published to the organisation. | `parts` holds 4 concepts at version 1; the change register lists 4 additions; the organisation release verifies. |
| 3 Explanation | The design project pins the organisation release. `architect` opens a control `data-k-action="concept" data-id="SYN-P001"` on the booking component. | The alias resolves; Understand is `supported`; definition and mechanism are labelled "Released · … · verified by reviewer · … · passage …"; nothing was written. |
| 4 Model application | `architect` pins the concept (`knowledge.concept-pin`) and links the booking component and the "ParcelBooked" contract through the pin. (With wp2 present the same step is its adoption proposal; without it Apply reads `partial` and says why.) | One active pin; `linkedVia(p, component, 'informs', 'in')` is the pin; `bot` is refused the pin. |
| 5 Consequences | The Apply pane shows the roles (business update, outbox record, relay, consumer), the relation `requires` → Idempotent receiver, `conflicts-with` → Unsafe dual write, parameters with unit and basis, obligations. | `conceptDecisionForms(p, pinId)` returns them; the same call on a candidate copy of the concept returns `[]`; no finding or score changed by pinning. |
| 6 Challenge | The Challenge pane lists the crash-window scenarios (before commit, after commit, after publish, before marking) at evidence level `proposed`, and the calculation "oldest unhanded intent" with its inputs and what is not considered. | With no evaluator registered the state is `partial` and the text says AIW did not evaluate it; with a test capability it is `supported` and the action event carries `modelKind`. |
| 7 Evidence | Nothing is recorded as evidence by this package. The scenarios are handed to wp6 as proposed items. | No record under `security.evidence`, `runtime.evidence` or assurance was created; the level stays `proposed`. |
| 8 SDD | The SDD is built. | Appendix E holds "Knowledge versions this design rests on": SYN-P001 v1, the release, state current, each form with file, lines and passage hash; the component's passage is unchanged. |
| 9 New edition | The library releases version 2 (a changed avoid-when) superseding version 1 and publishes it. The design project is read. | The component and the contract each raise 'Review a newer knowledge version'; the pinned forms still read version 1; the SDD still prints version 1 and says a newer version exists. |
| 10 Migration | Sol proposes the migration (a draft); `second-architect` accepts it. | The pin moves to version 2; the two links raise the version finding until `architect` links them again; the old pin and its receipts remain in the document. |
| 11 Withdrawal | The organisation withdraws version 2 with a reason. | The pinned release is ineligible with that reason; the records raise 'Review withdrawn knowledge'; `conceptDecisionForms` returns `[]`. |
| 12 Differential | The whole walk is repeated with the candidates left unreviewed. | Findings, readings and Sol sources of the design project are identical to a project with no knowledge at all. |

---

## i. Gaps, risks and what cannot be delivered yet

### i.1 Gap ids closed

| Gap | How |
|---|---|
| K-03 | Typed relations with a closed verb list, a target, a reason and a passage, verified four-eyes inside `selection` and `composition` forms; shown at selection ('requires', 'also consider', 'do not confuse with'); `conceptRelations` for the adoption checks. |
| K-04 | A governed composition record: concept kind `composition` with roles, sequence, invariants, relations, parameters and acceptance scenarios, reviewed and released like any concept. (Its interpreter is wp2's; see deferred.) |
| K-06 | The content state of every catalogue target is established by the detector on the server, reviewed and shown ("Generic catalogue template"); governed forms replace template text in the concept view; coverage counts governed, template and marked separately. |
| K-07 | The reviewed crosswalk, one resolver, the local tables folded in, controlled subjects for form claims. |
| K-08 | Decision rules, guarantee boundary, variants, effect mechanism, measure and cost, failure modes, signals and validation scenarios all have fields (b.3), each anchored to its lines. |
| K-11 | `checkedAt`, `reviewDue`, `versionScope` on sources; `reviewDue`, `reviewTriggers`, `notAdopted` on concepts; a non-blocking `due` state and finding; the SDD prints checked date and version scope. |
| K-12 | `successorOf` / `splitFrom` with a change note; the admission checklist; the release change register; a named steward. |
| K-15 | Lens, scope, stage and family facets on concepts; `lens` crosswalk rows; the `conceptsFor` index, ordered by id, never scored. |
| K-19 | A pattern as a versioned package: version and hash, entry conditions (typed predicates), prohibited combinations (`conflicts-with`), configuration inputs (`parameters`), event review triggers, and the per-project consumer register (pins and the records that rely on them). |
| K-22 | Concept kind `technique` with a `verification.technique` shape; released techniques listed in the concept view and by `conceptsFor({kind:'technique'})`. |
| K-25 | `knowledgeUsage` per release (pinned, linked, cited, never used, withdrawn) in the Releases tab. |
| Deep-dive library-coverage | A governed record that holds a handbook component profile (kind `component` with ports, parameters, physical variants, failure modes, tests); the evidence-level vocabulary for imported statements; an import path at handbook scale with tiered limits; pins re-checked with a migration proposal. |

### i.2 Deferred, with the reason

| Item | Why | Who |
|---|---|---|
| K-03 companion and conflict *findings* at adoption; K-04 the generic recipe interpreter and moving the eight built-in tasks onto it | They act on adoption records | wp2-adoption (contract f.2) |
| K-06 excluding template records from Sol's grounding (`catalogueSources`, architecture-brain.js:110) | The detector is 1.5 KB and the route has no room; the alternative, a list of the ten authored ids, is about 260 B and would need the lead's grant | Lead decision |
| K-11 refusing `latest` URLs for a product-mechanism version scope and comparing built-in `accessedAt` dates | Both sit in route modules and concern product claims, not the handbook path | Later |
| K-12 a field-experience source origin (workload, configuration, observation window) | It is an observation record | wp6-evidence |
| K-15 the "candidate mechanisms for this concern" panel on Chapter 2–10 records | It is a stage surface | wp8-guided, from `conceptsFor` |
| K-19 the per-consumer exception record, and an owner's cross-project list of consumers | Exceptions are waivers (wp9b); the cross-project list needs a scan of projects in organization-service.js:37-44 | wp9b; later |
| K-22 offering a technique in the Chapter 11 check dialog and the Chapter 9 verification plan | Those forms are other packages' | wp6-evidence |
| K-25 the stewards' item "an observed outcome contradicts a pinned concept" | It needs bound observations; `knowledge-stewardship.js` is on the route | wp6-evidence |
| The remaining catalogue families and the other 24 handbooks | Content, tranche by tranche, after the first three slices | Stewards |

### i.3 Risks

1. **Review capacity.** The three first slices hold 265 top-level topics (140, 70 and 55 H1 headings) and several
   forms each. Every form needs a person other than the importer, and import-authored forms need a third account to
   release. Nothing decision-bearing is usable until that is done. Mitigation: tranches of about 60 concepts, teaching
   forms first, coverage reported honestly as `candidate`.
2. **Storage bound.** A release copies its claims (:219). One tranche with one or two releases fits 8,000,000
   characters; a third release of a large tranche may not. Mitigation: tranche size; export before extending, as the
   error already says (:250).
3. **A `concept` object in the record graph may be drawn.** `architecture-model.js` draws over the same registration
   (record-graph.js:208-215). S3 case 7 guards trails; a picture or figure-hash change in a project with pins would
   be a defect to settle with wp7-views before merge. Projects without pins are unaffected by construction.
4. **Chunk placement.** One static import of the new modules from another client module adds a script file or moves
   their code onto the route. The scan in S5 case 7 and the size report are the guard. The assumption that
   `applyKnowledgeCommand` stays out of the client bundle rests on the metafile (8,105 B of 33,737 B) and must be
   re-read after S1.
5. **Stored currency can lag one read.** It is refreshed after organisation assurance on every read and after every
   knowledge command. A document read outside the worker (an export restored elsewhere) carries the last stored value;
   recovery import retires pins for that reason.
6. **Quote matching is a grounding check, not a truth check.** It rejects invented items; it cannot tell whether an
   interpretation is right. That is the second person's review, and the review pack says so.
7. **Rendition identity.** The Markdown is a conversion. If the owner re-converts, hashes change; the manifest makes
   that a new rendition and the superseding-source rule (:55) then applies to every claim on the old one.
8. **Contradictions across handbooks** will open on applicability claims of one concept (`flagOverlaps`, :120-123) and
   block verification until context-separated (:206). Intended, but it adds review work.
9. **Existing readers see released forms as ordinary claims.** A released `applicability` form with a typed unit is
   read by the contextual reading (architecture-intelligence.js:192-195) without a pin, as any released claim is today.
   When two versions of one concept are pinned from two organisation releases, both are read there. The concept view
   shows both versions and the pin decides for adoption; deactivating the older release is the remedy.

### i.4 What this package cannot honestly deliver yet

- **The four document sets are not here.** The Master Course M01–M32, the Explained Reference and Cheat Sheet, the
  Illustrated Compendium and the Expanded SA Playbook were not supplied (upgrade plan, section 1). "Every topic in the
  four document families has an explicit coverage record" cannot be shown. What is delivered is the mechanism and
  coverage records for the three first-slice handbooks; the same pipeline takes the four sets when the owner supplies
  them with authorship, permitted use and hashes.
- **Source diagrams.** The renditions contain no figures or diagram sources. "Mechanism and diagram" is delivered as
  structured steps with a sketch AIW draws from them, labelled as such. Importing the handbooks' own figures needs the
  docx or a rendition that keeps them.
- **Released knowledge from the handbooks.** This package imports candidates. Release needs the owner's second
  knowledge approver, a person, per form. Until then Apply and Challenge read `candidate` or `partial` for handbook
  concepts, and that is the honest state.
- **Licence review.** The owner's recorded permitted use is carried on each source. Licence counsel has not reviewed
  anything; the authority status file records that, and the review pack is prepared for them.
- **Apply, Challenge and Practice as working actions.** This package provides the knowledge, the states and the
  hand-off. Adoption is wp2's, evaluation wp3/wp4's, the sandbox wp8's. In a build without them the three actions say
  so.
- **Evaluation.** A `calculation` form is a description with inputs and bounds. AIW evaluates nothing here.

---

## Appendix A — Intake pipeline

### A.1 Steps

0. **Owner's record.** `audit/rc42/handbook-source-hashes.json` (docx name, bytes, SHA-256) exists.
   `scripts/handbook-rendition.mjs` writes and checks `candidate-sets/handbooks/renditions.json`
   (`aiw.handbook-renditions/1`): per file `{file, fileSha256, rendition: {file, sha256, bytes, lines, tool,
   convertedAt, convertedBy}, edition, authorship: {statedBy, statement}, permittedUse: {status:
   'owner-recorded'|'pending', note, recordedBy, recordedAt}}`. `fileSha256` must equal the rc42 record. The script
   computes only hashes and counts; a person enters authorship and permitted use. A file whose permitted use is
   `pending` cannot be built into a pack.
1. **Topic inventory** (deterministic): every H1 of the rendition is a topic `{topicId, title, lineStart, lineEnd,
   sliceSha256, declaredKind}`. The id is read from the heading or the header line (`# AAP-P030 …`;
   `# MSG 004 …` with `CL-MSG-004 | technology capability | logical technology` beneath).
2. **Extraction** (a content-extraction agent, or a person): one JSON object per topic, A.2. The agent sees one
   slice; the slice is untrusted data and never an instruction.
3. **Validation** (`scripts/validate-concept-extraction.mjs`): A.3. A rejected object is reported with the path of
   each failure and is never repaired by the script.
4. **Build** (`scripts/build-handbook-candidates.mjs`, with `--check`): pack `aiw-concept-candidates-v1`: `{packId,
   set, source, authority: 'Candidate only. …', status: 'candidate', influence: {scoring:false, constraints:false,
   conformance:false, drafter:false, brain:false}, productionAccepted: false, topics[], concepts[] (validated
   extractions), crosswalkProposals[], notImported[{topicId, reason}], counts}`. The pack holds locators, hashes, the
   structured readings and their short quotes; the passages themselves are read again from the rendition at import, as
   build-candidate-set.mjs:1-8 does.
5. **Import** (`scripts/import-handbook-candidates.mjs`, local and through `/api/commands` with `authorKind:'import'`,
   the two modes of import-domain-candidates.mjs:38-70): per topic `knowledge.source` (body = the slice; `path` =
   `<rendition>#L<a>-L<b> · <topicId> <title>`; `revision` = `<edition> · docx <first 16> · rendition <first 16>`;
   `license` = the owner's note; `checkedAt`, `versionScope`, `origin`), `knowledge.topic`, `knowledge.concept`,
   one `knowledge.claim` per form, `knowledge.crosswalk` per alias. Idempotent by the tags `candidate-pack:<id>`,
   `topic:<id>`, `form:<type>`. Nothing is reviewed, released or pinned.
6. **Review, release, publish, pin:** the commands of section c and the existing organisation route.

### A.2 The JSON a content-extraction agent must produce (`aiw.concept-extraction/1`)

```json
{
  "schema": "aiw.concept-extraction/1",
  "source": {"file": "<docx name>", "fileSha256": "<64 hex>", "rendition": "<md name>", "renditionSha256": "<64 hex>"},
  "topic": {"topicId": "<id>", "title": "<heading>", "lineStart": 0, "lineEnd": 0, "sliceSha256": "<64 hex>",
            "declaredKind": "<as the source says>", "declaredFamily": "<as the source says>"},
  "concept": {"proposedConceptId": "<CONCEPT_ID>", "title": "", "kind": "<CONCEPT_KINDS>", "family": "",
              "scope": [], "stages": [], "lenses": [],
              "intendedUse": "foundation|design-method|verification-method|reference"},
  "forms": [
    {"type": "<FORM_TYPES>",
     "passage": {"lineStart": 0, "lineEnd": 0, "sha256": "<64 hex>"},
     "statement": "<one sentence, the reading of the passage>",
     "conditions": ["…"], "limitations": ["…"],
     "content": { "…": "the shape of b.3 for this type; every list item has at:[a,b] and quote" },
     "architectureUnit": { "…": "applicability only; the shape of architecture-knowledge-unit.js" }}
  ],
  "aliases": [{"scheme": "handbook|akr|playbook", "aliasId": "", "label": "", "relation": "same|narrower|broader|realises",
               "at": [0, 0], "quote": "", "basis": ""}],
  "notExtracted": [{"what": "", "why": ""}],
  "extractor": {"kind": "llm|person", "model": "", "instructionsSha256": "", "at": ""}
}
```
Line numbers in `topic` are lines of the rendition; every other line number is relative to the slice (its first line
is 1), because the slice becomes the knowledge source body and a claim's lines are lines of its source
(knowledge-governance.js:169).

### A.3 Validation (the same rules at build time and, for the form, on the server at `knowledge.claim`)

1. `source` hashes match the manifest; `topic` lines and `sliceSha256` match the rendition.
2. Every form has a `passage` inside the slice, 1–101 lines, 1–12,000 characters, whose SHA-256 equals the SHA-256 of
   those lines joined by `\n`. **A form without a passage is rejected.**
3. Every list item in `content` has `at` inside the form's passage and a `quote` of 12–240 characters found in those
   lines after collapsing whitespace. **An item without both is rejected, and its form with it.** Scalar texts
   (`short`, `narrative`, `boundedClaim`, …) need one `quotes[]` entry each on the form.
4. Decision-bearing forms: every number appears inside a quote of the same item.
5. Evidence levels are from `EVIDENCE_LEVELS`; the words executed, observed, passed and verified are refused as
   levels.
6. Vocabularies and bounds of b.1 and b.3; unknown fields are refused.
7. `aliases` of scheme `handbook` cite a line that contains the alias id; `akr` and `playbook` aliases need no
   passage and become `proposed` rows with `basis` in the note.
8. A non-`definition` form needs `conditions` and `limitations` (the rule of :172).
9. `calculation.modelKind`: any bounded string; flagged "no evaluator registered" unless the evaluator registry (f.2)
   names it.
10. Strings are data: no field is interpreted, expanded or executed, and all are escaped when shown.

---

## Appendix B — Two worked candidate records from the real handbooks

Both show that the shape fits real entries. The topics are lines 3620–3663 of `Application_Architecture_Master.md` and
lines 7020–7337 of `Enterprise_Component_Library_Part_1_Application_and_Resilience.md` in `/home/user/hb-review`; the
two docx hashes are those of `audit/rc42/handbook-source-hashes.json` (lines 14 and 84). Every `at` range and every
quote below was read against those lines in the final pass (slice line n is rendition line 3619 + n, and 7019 + n).
The rendition, slice and passage hashes are as drafted (lines joined by `\n`) and were not recomputed in that pass:
the builder recomputes them. Content is abbreviated to what proves the fit; quotes are verbatim from the cited lines.
Neither record is knowledge: both are candidates until a second person verifies each form.

### B.1 Application Architecture Master › AAP-P030 Transactional Outbox

```json
{
  "schema": "aiw.concept-extraction/1",
  "source": {"file": "Application_Architecture_Master.docx",
             "fileSha256": "64c3e5aa5bfd9cc66db328a7b676fea0affb6f5c9fe3af483b1810640f185d8c",
             "rendition": "Application_Architecture_Master.md",
             "renditionSha256": "f67bf423c3d3e3dbd8640e2de6a8f89a3c775066c5998b3388cdc1ea2b65c997"},
  "topic": {"topicId": "AAP-P030", "title": "Transactional Outbox", "lineStart": 3620, "lineEnd": 3663,
            "sliceSha256": "b8d85c801983fefb546efc4499f5cb2be38e5a28c0573786de0852b1b8c11802",
            "declaredKind": "pattern", "declaredFamily": "Reliable local publication intent"},
  "concept": {"proposedConceptId": "PAT-TRANSACTIONAL-OUTBOX", "title": "Transactional outbox", "kind": "pattern",
              "family": "Reliable local publication intent", "scope": ["data-owner", "interaction"],
              "stages": [5, 8], "lenses": ["integrity", "reliability"], "intendedUse": "design-method"},
  "forms": [
    {"type": "definition",
     "passage": {"lineStart": 7, "lineEnd": 7, "sha256": "62718cc55e314ac69f45b3101fdb8de895bb8a3b4d1caca67b2706f092d1a53f"},
     "statement": "A transactional outbox records the intent to publish in the same local transaction as the state change; a relay sends it later.",
     "content": {"type": "definition", "v": 1,
       "short": "A publication intent written in the same local transaction as the authoritative state, sent later by a relay.",
       "quotes": ["writes a durable publication or dispatch intent in the same local transaction as authoritative state"],
       "distinctions": [{"from": "end-to-end exactly-once delivery", "difference": "It closes the local dual-write gap only; delivery may repeat.",
                         "at": [7, 7], "quote": "usually requires duplicate-tolerant delivery because acknowledgement can be lost"}]}},
    {"type": "mechanism",
     "passage": {"lineStart": 15, "lineEnd": 17, "sha256": "9e5bbb9a541052e0da003621f8b0a0d277b536b377836a027892eb7ffd8678ef"},
     "statement": "The outbox row is inserted with the acceptance records; a relay claims bounded batches, publishes and records handoff.",
     "conditions": ["A relay retry keeps the same event identity."],
     "limitations": ["A crash between publish and marking sent can redeliver."],
     "content": {"type": "mechanism", "v": 1,
       "steps": [
         {"n": 1, "text": "Insert the outbox row with the other acceptance records.", "at": [17, 17], "quote": "Insert the outbox row alongside the other acceptance records."},
         {"n": 2, "text": "Claim bounded batches, publish, record handoff.", "at": [17, 17], "quote": "Claim bounded batches using qualified concurrency controls, publish and record handoff."},
         {"n": 3, "text": "Keep the intent until handoff is established.", "at": [15, 15], "quote": "Preserve intent until successful handoff is established under the chosen contract."}]}},
    {"type": "applicability",
     "passage": {"lineStart": 9, "lineEnd": 21, "sha256": "fe4ca959e5fcfec35f71ffc9d6c69e16e924a6feaff86e8d63e8fe3052733946"},
     "statement": "Use it where acceptance must never commit without evidence of the work that follows; do not present it as exactly-once.",
     "conditions": ["A local state change must cause a publication or dispatch."],
     "limitations": ["Consumers and external providers need their own identity or reconciliation."],
     "content": {"type": "applicability", "v": 1,
       "useWhen": [{"text": "Acceptance must not commit without evidence of the work that must follow.", "at": [9, 9],
                    "quote": "Acceptance should never commit without evidence of the work that must follow."}],
       "avoidWhen": [{"text": "A read-only dependency with no durability obligation.", "at": [11, 11],
                      "quote": "A direct synchronous call may be appropriate for a read-only dependency with no durability obligation."}],
       "guaranteeBoundary": {"boundedClaim": "Durable handoff intent without a distributed transaction.",
         "doesNotEstablish": ["End-to-end exactly-once delivery."], "at": [11, 21],
         "quote": "Avoid describing the outbox as end-to-end exactly once."}},
     "architectureUnit": {"kind": "pattern",
       "mechanism": "A publication intent is committed with the authoritative state and sent later by a relay that may deliver more than once.",
       "effects": [{"quality": "integrity", "direction": "supports", "rationale": "Durable handoff intent without a distributed transaction."},
                   {"quality": "performance", "direction": "tradeoff", "rationale": "It adds storage, relay operations and lag."}],
       "obligations": [{"action": "Consumers deduplicate by the original identity.", "evidence": "Crash injection after publish and before marking sent shows one effect."},
                       {"action": "Cleanup keeps unsent intents.", "evidence": "Accepted identities reconcile with outbox intents."}],
       "exclusions": ["Do not describe the result as end-to-end exactly once."],
       "placement": [{"target": "data-owner", "role": "outbox writer", "reason": "The intent is written in the owner's local transaction."}]}},
    {"type": "composition",
     "passage": {"lineStart": 11, "lineEnd": 17, "sha256": "5990c8e521acee7cdf3ab36314e4b5adf4a1a0c205f9a38cdd6c49313e9feb0a"},
     "statement": "The pattern needs a consumer-side identity protocol and keeps publication state apart from business completion.",
     "conditions": ["Consumers perform effects on delivery."], "limitations": ["The related entries are named without a verb in the source."],
     "content": {"type": "composition", "v": 1,
       "roles": [{"id": "relay", "name": "Relay", "responsibility": "Claims, publishes and records handoff.", "recordKind": "component", "required": true,
                  "at": [17, 17], "quote": "Claim bounded batches using qualified concurrency controls, publish and record handoff."}],
       "relations": [{"verb": "requires", "target": {"label": "consumer identity protocol"}, "reason": "Redelivery is possible.",
                      "at": [11, 11], "quote": "Consumers need their own identity protocol"}],
       "invariants": [{"kind": "publication", "statement": "Publication state is separate from business completion.",
                       "at": [15, 15], "quote": "Publication state is separate from business completion."}]}},
    {"type": "composition",
     "passage": {"lineStart": 42, "lineEnd": 42, "sha256": "ceb24b870b3700c9a0493ffd3772a2ed4d0a269962dc752bb8bf498369e84ffa"},
     "statement": "The source relates this entry to Unit of Work, Inbox and Idempotent Receiver, and the Outbox relay component.",
     "conditions": ["Navigation only."], "limitations": ["No relation type is stated."],
     "content": {"type": "composition", "v": 1,
       "relations": [{"verb": "related", "target": {"alias": {"scheme": "handbook", "aliasId": "AAP-P031"}}, "reason": "Named as a related entry.",
                      "at": [42, 42], "quote": "AAP-P027, AAP-P031, AAP-C007"}]}},
    {"type": "verification",
     "passage": {"lineStart": 27, "lineEnd": 40, "sha256": "69faaf3d3665f8d16f5f1a13d24fbe99491adc85217e76ee5d3d7ef7fa2e621c"},
     "statement": "Crash injection around commit, publish and marking, and the age of the oldest unhanded intent, check the pattern.",
     "conditions": ["A relay and an acceptance inventory exist."], "limitations": ["Thresholds are the project's to set."],
     "content": {"type": "verification", "v": 1,
       "scenarios": [{"id": "crash-windows", "given": "A committed intent", "when": "the process crashes before commit, after commit, after publish or before marking",
                      "then": "no committed intent disappears and duplicates create no duplicate effect",
                      "evidenceRequired": "Crash injection results with identities reconciled", "evidenceLevel": "proposed",
                      "at": [27, 27], "quote": "Inject crashes before commit, after commit, after publish and before sent marking."}],
       "metric": {"name": "oldest_unhanded_outbox_intent", "unit": "seconds", "boundary": "local commit to qualified publication handoff",
                  "missingData": "UNKNOWN when relay or acceptance inventory is incomplete", "at": [29, 40],
                  "quote": "oldest_unhanded_outbox_intent"}}},
    {"type": "example",
     "passage": {"lineStart": 23, "lineEnd": 23, "sha256": "8a6a57e7af02e446a5270341138df0d9dd6e9bed2c8d178349da58c71cb847f8"},
     "statement": "A cleanup job that deletes unsent rows by age loses accepted work during a broker outage.",
     "conditions": ["Illustrative failure."], "limitations": ["A teaching design, not an observed incident."],
     "content": {"type": "example", "v": 1, "title": "Cleanup deletes unsent intents",
       "steps": [{"text": "Cleanup deletes unsent rows by creation age during an outage.", "at": [23, 23],
                  "quote": "A cleanup job deletes unsent rows by creation age during a broker outage."}],
       "expectedOutcome": "Repair the cleanup predicate and restore missing work with the original identities.",
       "evidenceLevel": "illustrative", "numbersAre": "teaching-assumptions"}}
  ],
  "aliases": [
    {"scheme": "handbook", "aliasId": "AAP-P030", "label": "Transactional Outbox", "relation": "same", "at": [1, 1], "quote": "AAP-P030 Transactional Outbox"},
    {"scheme": "akr", "aliasId": "PAT-TRANSACTIONAL-OUTBOX", "label": "Transactional Outbox", "relation": "same", "basis": "name match; for the reviewer"}
  ],
  "notExtracted": [
    {"what": "selection form", "why": "The entry names one alternative in a sentence and no alternative table."},
    {"what": "exercise form", "why": "The entry has none; the chapter's learning studio exercise is a separate topic."},
    {"what": "the reference AAP-R22 as checkedAt", "why": "It is in the source register topic (checked 2026-10-29); the importer sets checkedAt from there."}
  ],
  "extractor": {"kind": "person", "model": "", "instructionsSha256": "", "at": "2026-11-16"}
}
```
What it shows: the entry's four headed sections map onto five form types with no field left over; the "Related
entries" line has no verb, so it imports as `related`, not as `requires`; the one typed companion comes from prose and
keeps a `{label}` target until a reviewer resolves it; the metric contract fits `verification.metric` including its
UNKNOWN rule; the built-in mapping `delivery/transactional-outbox → PAT-TRANSACTIONAL-OUTBOX` (knowledge-coverage.js:11)
attaches the existing guided comparison to the same concept.

### B.2 Enterprise Component Library Part 1 › CL-MSG-004 Transactional outbox relay

```json
{
  "schema": "aiw.concept-extraction/1",
  "source": {"file": "Enterprise_Component_Library_Part_1_Application_and_Resilience.docx",
             "fileSha256": "5a9798bd1f2e6818f30c12b3392e80272c6c1274be6eebc35407adba9867572e",
             "rendition": "Enterprise_Component_Library_Part_1_Application_and_Resilience.md",
             "renditionSha256": "700e4e4651d4875cc25eaf964dfbee8fe70bffa86149233fd13dbd2108306484"},
  "topic": {"topicId": "CL-MSG-004", "title": "MSG 004 Transactional outbox relay", "lineStart": 7020, "lineEnd": 7337,
            "sliceSha256": "570922c5e23d5615dd3636634a94ac538e94f0a7f258ff3f537e7a81d87e23d5",
            "declaredKind": "technology capability", "declaredFamily": "Messaging and asynchronous processing"},
  "concept": {"proposedConceptId": "CON-COMP-OUTBOX-RELAY", "title": "Transactional outbox relay", "kind": "component",
              "family": "Messaging and asynchronous processing", "scope": ["component", "capability"],
              "stages": [5, 6, 8], "lenses": ["integrity", "reliability"], "intendedUse": "design-method"},
  "forms": [
    {"type": "definition",
     "passage": {"lineStart": 5, "lineEnd": 5, "sha256": "32cc6ccdef006db46dcb67dc85d6fe805c35ed3218e83942071d34348bbbd3b0"},
     "statement": "The relay publishes obligations that were committed with business state in the same local transaction.",
     "content": {"type": "definition", "v": 1, "short": "A relay that publishes committed outbox obligations and may publish duplicates after a crash.",
                 "quotes": ["publishes durable event or work obligations that were committed with business state in the same local transaction"]}},
    {"type": "mechanism",
     "passage": {"lineStart": 11, "lineEnd": 11, "sha256": "02ec706bfff0e1bfc35e048c53b3b0bdadb7175cb06791e5c5b589fc876fdb3d"},
     "statement": "The domain transaction inserts an outbox row; a separate relay publishes committed rows and records delivery evidence.",
     "conditions": ["The database and the broker are separate resources."], "limitations": ["A recoverable duplicate window remains."],
     "content": {"type": "mechanism", "v": 1,
       "steps": [{"n": 1, "text": "Insert the outbox row with the business change.", "at": [11, 11], "quote": "inserts an outbox row alongside the business change"},
                 {"n": 2, "text": "Publish committed rows and record delivery evidence afterwards.", "at": [11, 11], "quote": "A separate relay publishes only committed rows and records evidence of delivery afterward."}]}},
    {"type": "applicability",
     "passage": {"lineStart": 11, "lineEnd": 19, "sha256": "473bc90483f508c4205b73117073848c92bc0974754654addebc85090a88afe1"},
     "statement": "Use when a local business change must reliably cause an event and the database and broker cannot share a transaction.",
     "conditions": ["A local business change has a delivery obligation."], "limitations": ["It does not make a separate business and outbox write atomic."],
     "content": {"type": "applicability", "v": 1,
       "useWhen": [{"text": "A local business change must reliably cause an event or asynchronous command.", "at": [17, 17],
                    "quote": "A local business change must reliably cause an event or asynchronous command."}],
       "avoidWhen": [{"text": "The outbox is written in a different database transaction from business state.", "at": [19, 19],
                      "quote": "An application writes the outbox in a different database transaction from business state."}]},
     "architectureUnit": {"kind": "component",
       "mechanism": "A relay reads committed delivery obligations, publishes their immutable identities and records confirmed progress.",
       "effects": [{"quality": "integrity", "direction": "supports", "rationale": "The business change and its event are committed together."},
                   {"quality": "performance", "direction": "tradeoff", "rationale": "Publication is asynchronous; storage and cleanup are added."}],
       "obligations": [{"action": "An uncertain publication is retried with the same event id.", "evidence": "Delivery trace and consumer receipts after a relay crash."},
                       {"action": "Cleanup never removes work without the agreed delivery evidence.", "evidence": "Coverage of business transitions against stored event identities."}]}},
    {"type": "selection",
     "passage": {"lineStart": 21, "lineEnd": 103, "sha256": "1f94cbeb8118782cf24b4b73267790a32652fc260c7f57694fbc3c8e6b941787"},
     "statement": "Polling suits a database with efficient short claims; change-data capture suits an existing qualified capture platform.",
     "conditions": ["Both keep the duplicate window."], "limitations": ["Operating costs are the source's description, not measurements."],
     "content": {"type": "selection", "v": 1,
       "alternatives": [
         {"target": {"label": "Polling outbox relay"}, "chooseWhen": "The database supports efficient short claims and operational simplicity matters.",
          "cost": "Polling load and table maintenance must be bounded.", "at": [34, 36], "quote": "The database supports efficient short claims and operational simplicity matters."},
         {"target": {"label": "CDC outbox relay"}, "chooseWhen": "Low-latency log capture and an existing qualified CDC platform justify it.",
          "cost": "Connector positions, log retention and schema transformation require operations.", "at": [39, 41], "quote": "Low-latency log capture and an existing qualified CDC platform justify it."}],
       "variants": [{"name": "PostgreSQL polling relay workers", "chooseWhen": "Short claims on the primary are acceptable.",
                     "tradeoff": "Polling, vacuum and retained payload storage add database load.", "at": [89, 95], "quote": "Polling, vacuum and retained payload storage add database load."}]}},
    {"type": "composition",
     "passage": {"lineStart": 48, "lineEnd": 83, "sha256": "881080871ca4c9f3d58e83768b20b778d2a5aea1aad781ef3d2121a2e6069bd9"},
     "statement": "The relay owns delivery attempts and checkpoints; the domain command owns event creation and meaning.",
     "conditions": ["An outbox table exists in the owner's store."], "limitations": ["It cannot prove that consumers completed their effects."],
     "content": {"type": "composition", "v": 1,
       "invariants": [{"kind": "publication", "statement": "Business state and outbox event are inserted in the same local transaction.",
                       "at": [54, 54], "quote": "Business state and outbox event are inserted in the same local transaction."},
                      {"kind": "identity", "statement": "An uncertain publication is retried with the same event id.",
                       "at": [56, 56], "quote": "An uncertain publication is retried with the same event ID."}],
       "ports": [{"name": "Outbox rows", "direction": "consumed", "contract": "Committed immutable rows with unique event id; aggregate sequence and schema version included.",
                  "at": [73, 75], "quote": "Committed immutable rows with unique event ID; aggregate sequence and schema version included."}]}},
    {"type": "composition",
     "passage": {"lineStart": 105, "lineEnd": 160, "sha256": "b655aa2296c201243ab5175d23ff9886ec1ed3bac1167e7bba2191e14d471c71"},
     "statement": "Four attributes must be specified: creation transaction scope, claim batch size, claim lease and aggregate ordering policy.",
     "conditions": ["Values are validated against the project's workload."], "limitations": ["The examples are illustrative choices."],
     "content": {"type": "composition", "v": 1,
       "parameters": [
         {"name": "claim_batch_size", "type": "integer", "unit": "events", "meaning": "Work held by one relay attempt.",
          "selectionBasis": "Bound by database lock time and publication capacity.", "required": true,
          "example": {"value": 100, "evidenceLevel": "illustrative"}, "at": [133, 139], "quote": "Bound by database lock time and publication capacity."},
         {"name": "claim_lease_seconds", "type": "integer", "unit": "seconds", "meaning": "How long a claim is held before reclaim.",
          "selectionBasis": "Expiry permits reclaim.", "wrongChoice": "A lease does not fence external duplicate publication.", "required": true,
          "example": {"value": 30, "evidenceLevel": "illustrative"}, "at": [142, 148], "quote": "Expiry permits reclaim but does not fence external duplicate publication."}]}},
    {"type": "composition",
     "passage": {"lineStart": 299, "lineEnd": 308, "sha256": "e8a8d3b0e5196dd7651f251c3c1fbb999bb28b8ce19d4ca853bbb7796acc0bb0"},
     "statement": "The relay uses the transaction coordinator and publishes to the durable event log.",
     "conditions": ["As the profile relates them."], "limitations": ["Relations are the library's, not a project's."],
     "content": {"type": "composition", "v": 1,
       "relations": [{"verb": "uses", "target": {"alias": {"scheme": "handbook", "aliasId": "CL-APP-005"}}, "reason": "Share the business transaction at creation.",
                      "at": [307, 307], "quote": "Share the business transaction at creation."}]}},
    {"type": "verification",
     "passage": {"lineStart": 231, "lineEnd": 278, "sha256": "b922990b231431ae8077f0e1e414e498c72442084edb3aa7b9da2d7f144c2c28"},
     "statement": "Two proposed acceptance tests and two failure modes check the relay.",
     "conditions": ["A broker and a database that can be correlated."], "limitations": ["The tests are proposed by the source and were not executed."],
     "content": {"type": "verification", "v": 1,
       "scenarios": [{"id": "CL-MSG-004-T2", "given": "Relay crashes after confirmation.", "when": "The row is reclaimed.",
                      "then": "Original identity is preserved and consumer effect remains unique.", "evidenceRequired": "Delivery trace and consumer receipts.",
                      "evidenceLevel": "proposed", "at": [270, 278], "quote": "Original identity is preserved and consumer effect remains unique."}],
       "failureModes": [{"failure": "An outbox insert uses a separate connection and commit.", "behaviour": "Business and event state can diverge under failure.",
                         "response": "Move creation into the owning unit of work and reconcile old gaps.", "evidence": "Injected rollback and database evidence.",
                         "at": [245, 249], "quote": "An outbox insert uses a separate connection and commit."}]}},
    {"type": "example",
     "passage": {"lineStart": 209, "lineEnd": 229, "sha256": "59177cb81d29bb2a9f0407586fbe2341a47999c6381781fbf45fe8f37ff72add"},
     "statement": "After a crash following broker confirmation the event is published again and the consumer deduplicates it.",
     "conditions": ["A synthetic scenario."], "limitations": ["Proposed acceptance, not an executed result."],
     "content": {"type": "example", "v": 1, "title": "Crash after broker confirmation",
       "steps": [{"text": "Reclaim after lease expiry and publish the same event again.", "at": [217, 217], "quote": "Reclaim after lease expiry and publish E19 again."}],
       "expectedOutcome": "Two deliveries may occur, one semantic consumer effect, and no event disappears.",
       "evidenceLevel": "proposed", "numbersAre": "teaching-assumptions"}},
    {"type": "exercise",
     "passage": {"lineStart": 310, "lineEnd": 316, "sha256": "c305205a858899487691c757f29a309ee76835a1a5bfd782e944f9b603a57de4"},
     "statement": "Three practice tasks at beginner, intermediate and advanced level.",
     "conditions": ["Practice only."], "limitations": ["No model answer is given by the source."],
     "content": {"type": "exercise", "v": 1,
       "items": [{"level": "beginner", "prompt": "Draw the three crash windows around commit, publish and mark.", "stage": "inspect",
                  "at": [312, 312], "quote": "Draw the three crash windows around commit, publish and mark."},
                 {"level": "advanced", "prompt": "Design aggregate ordering across two relay workers without holding database locks during network calls.", "stage": "decide",
                  "at": [316, 316], "quote": "Design aggregate ordering across two relay workers without holding database locks during network calls."}]}}
  ],
  "aliases": [
    {"scheme": "handbook", "aliasId": "CL-MSG-004", "label": "Transactional outbox relay", "relation": "same", "at": [3, 3], "quote": "CL-MSG-004"},
    {"scheme": "handbook", "aliasId": "AAP-C007", "label": "Outbox relay", "relation": "same", "basis": "same component in the Application Architecture Master; for the reviewer"}
  ],
  "notExtracted": [
    {"what": "the SQL implementation example (slice lines 162-183)", "why": "Labelled 'Illustrative and not executed'; it would import as a second example with evidenceLevel illustrative, left out here for length."},
    {"what": "operations signals (slice lines 280-297)", "why": "They fit verification.signals in a second verification claim; left out here for length."},
    {"what": "a relation 'realises' to PAT-TRANSACTIONAL-OUTBOX", "why": "The profile does not name the pattern entry; a steward proposes that crosswalk row and a second person verifies it."}
  ],
  "extractor": {"kind": "person", "model": "", "instructionsSha256": "", "at": "2026-11-16"}
}
```
What it shows: a 318-line, 12,516-character profile fits one knowledge source and eleven claims, none over 83 lines;
`composition` needs more than one claim per concept (ports and invariants in one passage, the attribute table in
another, the relationship table in a third), which is why only `definition` is a singleton; the library's own evidence
labels ("Proposed acceptance test", "Illustrative and not executed") map onto `EVIDENCE_LEVELS` without loss; the
worked values 100 and 30 land only in `parameters[].example` as illustrative; the pattern (B.1) and the component (B.2)
are two concepts joined by a reviewed `realises` relation, not one concept with two meanings.
