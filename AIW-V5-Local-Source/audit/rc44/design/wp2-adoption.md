# WP2 · Applied patterns bound to the model, and component selection as a recorded decision

Package id: `wp2-adoption` · Change 2, addition A3, features F2 and F3 · Design date 2026-11-16
Source line read: `AIW-V5-Local-Source` at rc.10.73.42 (integration worktree). All paths below are relative to that folder.
Status: a design only. No product file was changed, nothing was run (a regression run holds the machine). Every byte
figure is an estimate until `node client-bundle.mjs` measures it. `productionAccepted` stays false.

Reading rules used here: "verified" means I read the line in this source line today; "gap review" means the claim comes
from `audit/rc41/handbook-review/` and I re-checked the lines I cite. The owner's target names RC43 capabilities ("thirty
design methods", `public/design-contracts.js`): **neither exists in this repository** (no `design-contracts.js` under
`public/`; the guided methods found are the ones listed in section a). The design builds on what is here.

---

## a. What exists today, and what is missing

### a.1 The guided design tasks (the code paths to move and retire)

All tasks live in `p.coauthoring.designTasks[]` with ids `DES-nnn` (`public/design-task-state.js:10-12`). There are more
than eight code paths; the gap review's "eight" are the eight mechanism topics of kind `architecture`.

| # | Task | Start command and state | Knowledge (code-authored) | Preview builder (writes the records) |
|---|---|---|---|---|
| 1 | Interaction (request-reply vs durable queue) | `architecture.start` `public/architecture-design.js:27-44` | `public/interaction-knowledge.js:4`, predicates `public/architecture-knowledge.js:63-64` | `public/architecture-design.js:137-172` |
| 2 | Reads (direct vs cache-aside) | same, `topic:'reads'` | `public/read-design-knowledge.js:13,33,37` | `public/read-design.js:13` |
| 3 | Persistence | same, `topic:'persistence'` | `public/persistence-knowledge.js:17,35,39` | `public/persistence-design.js:13` |
| 4 | Publication (`delivery`) | same | `public/composition-knowledge.js:31-40` | `public/composition-design.js:19-85` |
| 5 | Resilience | same | `public/composition-knowledge.js:41-50` | same |
| 6 | Traffic and edge (`distribution`) | same | `public/composition-knowledge.js:51-63` | same |
| 7 | Data partitioning | same | `public/composition-knowledge.js:64-80` | same |
| 8 | Structure | same | `public/composition-knowledge.js:81-88` | same |
| 9 | Released design concern (`knowledge:<id>`) | same, `public/architecture-design.js:29,41` | a four-eyes released claim (`public/domain-knowledge.js:115-116`) | decision comparison only, `public/architecture-design.js:93-124` |
| 10 | Boundary task (cohesive vs separate) | `design.start` `public/design-task-domain.js:44-51` | `public/design-planner.js:18-28` | `public/design-planner.js:58-93` |
| 11 | Exchange task | `exchange.start/answers/prepare` `public/exchange-design.js:44-56` | `public/exchange-design.js:8-16` | `public/exchange-design.js:20` |
| 12 | Security task | `protection.start/answers/prepare` `public/security-design.js:58-69` | `public/security-design.js:7-18` | `public/security-design.js:28` |
| 13 | Operation continuation (a saved Sol run's operation) | `intelligence.adopt` → `public/design-task-domain.js:12-41` | the saved run | `public/design-planner.js:122-198` |

What tasks 1–8 already do (verified), which is most of an adoption record in an unnamed shape:

- **Definition and version.** A method receipt: `methodId`, `packId`, source fingerprint, sources with a statement SHA-256
  (`public/architecture-knowledge.js:112-114`; identities `public/composition-manifest.js:14-20`; references
  `public/composition-knowledge.js:11-24`; currency check `public/composition-manifest.js:7-12`).
- **Roles.** `compositionRoles(topic, option, answers)` gives slot, label, component kind, capability category and
  `sameAs` (`public/composition-knowledge.js:102-108`); slots are fixed (`public/composition-manifest.js:34`).
- **Bindings.** A role reuses the record the person picked (`answers[slot+'Id']`) or creates a responsibility and a
  component (`public/composition-design.js:25-37`).
- **Relationships.** `compositionEdges` → `logical.connection` and `realisation.interaction`
  (`public/composition-design.js:12-18,38-42`).
- **Preconditions.** Typed predicates per option (`public/composition-knowledge.js:109-124`) evaluated by the shared
  three-valued evaluator: `known | unknown | blocked`, "Missing facts are questions, never false facts"
  (`public/architecture-facts.js:1-3,30-44`). A proposal is refused while anything is unknown or blocked
  (`public/architecture-design.js:70-71`).
- **Parameters.** Task answers, kept per component as untyped key/value (`public/architecture-solution.js:62`).
- **Obligations.** Per option, each with kind, role placement, field keys and a verification text
  (`public/composition-knowledge.js:126-134`); bound to components in the applied solution
  (`public/architecture-solution.js:36-51`).
- **Evidence.** A text per obligation; a Chapter 11 action can verify it, and only a second signed-in person can mark it
  verified (`public/architecture-obligations.js:28-39`, rc42 D15).
- **Decision.** Every option becomes a Chapter 3 alternative with one chosen (`public/composition-design.js:23,82-83`).
- **The applied record.** `task.applied.reasoningGraph.solution` (`public/architecture-solution.js:13-74`,
  `public/model-alternatives.js:104-106`): placement, obligations, specifications, mechanism, receipt.
- **Acceptance.** `alternative.apply` → `applyDesignAlternative` (`public/model-alternatives.js:85-136`) writes change
  events, captures a reversal (`public/model-reversal.js:5`) and records a **typed reviewer name** with
  `identityVerified:false, independenceVerified:false` (`public/model-alternatives.js:13-15`).
- **Trace.** Applied `architecture` tasks are registered as object type `pattern` ("Applied design reasoning",
  `public/record-graph.js:56`) with relations `addresses`, `assesses`, `scopes` (`public/record-graph.js:189`). The
  trace kernel has no layer for them (`public/trace-kernel.js:19`).

### a.2 The command boundary, actors and undo (to reuse)

- Commands reach a domain by prefix through one registry: `COMMAND_HANDLERS` and `commandHandler`
  (`worker.js:101,107`); unknown prefixes are refused before the project loads (`worker.js:113`). Every handler is called
  `(document, command, at, actor, {author, revision})` (`worker.js:99-100,638`).
- The author of a commit and what an agent or a Sol draft may not send: `commitAuthor`, `refuseUnreviewable`,
  `REVIEW_TYPES`, `claimsReview` (`authorship.js:25-36,39-41,46-58,60-66`), applied at `worker.js:603`.
- Authorship stamps and the journal: `stampAuthorship` (`worker.js:640`, `public/provenance.js:410`), record paths
  `public/provenance.js:54`, journal events get actor, author kind and reviewed flag (`worker.js:652-653`).
- Change trackers run in the same commit: `trackCommandChanges` (`worker.js:257-271`).
- Staged batches: `STAGED_COMMANDS` and `applyCanonical` (`public/canonical-command.js:30-33,55-70`); "Review, approval,
  adoption and evidence commands retain their own explicit authority" (`public/canonical-command.js:24-25`).
  `review.action` can be staged (`public/canonical-command.js:29`).
- Second-person helpers from the rc42 fixes: `approvalIndependent` (`public/technology-realisation-domain.js:104`, the
  command rule at `:272-276`), `independentApproval` (`public/review-domain.js:319`), `independentRiskApproval`
  (`public/security-domain.js:69`), `verifierRefusal` / `independentVerification`
  (`public/architecture-obligations.js:38-39`), `fourEyesOn` (`public/changes-domain.js:213`). All share one pattern: the
  record keeps the signed-in `actor`; the approver's actor must exist, differ, and not be an agent account.
- Undo: receipts for a bounded set of working actions (`public/action-undo-domain.js:6,19,31`) and the reviewed reversal
  of an applied design (`alternative.rollback`, `public/model-alternatives.js:59`, `public/model-reversal.js:6-22`).
- Old documents: an upgrade on read, registered once (`public/readings-upgrade.js:294`), stored by the first read
  (`storage-upgrade.js:21-36`), precedent for "kept for a person to confirm" in `public/ownership-upgrade.js:1-22`.

### a.3 Knowledge that may gate (to reuse)

- Released claims with eligibility re-checked on every read, four eyes included: `knowledgeEligibility`,
  `releasedClaims`, `claimReceipt` (file hash, line range, excerpt hash, claim hash, release checksum),
  `claimReceiptCurrent` (`public/knowledge-governance.js:41-72`).
- The structured mechanism schema on a released claim: `kind`, `mechanism`, `scope`, `effects`, `obligations
  {action, evidence}`, `exclusions`, `applicability {requires, excludes}`, `placement {target, role, reason}`
  (`public/architecture-knowledge-unit.js:6-17,51-101`). It has **no** role cardinality, relationships between roles,
  parameters, evidence kinds or companion relations.
- Library content "enters no score, no hard constraint and no conformance reading" (`public/component-library.js:10-11`).

### a.4 Component selection today

- "From the library" (`public/realisation-ui.js:217`, lazy `public/component-library-ui.js:70`) lists project entries,
  signed organisation entries and the 20 catalogue archetypes (`public/component-library.js:51,62-63`); text search only.
- The reviewed candidate path: `realisation.candidate` with `reviewed:true`, key `library` or `archetype`, a pinned
  reference (`releaseId`, `recordSha256`, or `revision`, `contentHash`) checked by `proposalSource`
  (`public/realisation-domain.js:341-354`, `public/component-library.js:19,64-71,83-91`).
- A component can name only Playbook ids in `patternIds` (`public/realisation-domain.js:38,238`); they are only printed
  (`public/design-spec.js:196`).
- A Chapter 3 alternative can name only components that already exist (`public/decisions-domain.js:183`); a fresh
  alternative object drops any field it does not know (`public/decisions-domain.js:187`).
- Hard constraints exist as a reading: `constraintForce(p, driver).hard` (`public/decision-reading.js:146`), used by
  Chapter 7 (`public/technology-realisation-domain.js:60`).

### a.5 Genuinely missing (the target of this package)

1. One **named record** for an applied mechanism, addressable by id, that any pattern, style, tactic or profile can use,
   not only the eight topics (K-01, K-02, C5-01, C5-05, X-11).
2. **Roles bound to any record type** (store, data, contract, plan, control), with required roles checked after
   acceptance (C5-06). Today only components are placed (`public/architecture-solution.js:22-25`).
3. **Typed parameters** with unit, scope, basis and "failure if wrong" (C5-07).
4. **Bounds**: depends-on, does-not-cover, removal consequence (C5-04, C5-14, X-04).
5. **Deviations** with reasons and a reviewer. None exist.
6. **A second signed-in person** on acceptance (A3). Today it is a typed name.
7. **Composition across adoptions**: required companions, shared-parameter agreement (C5-08, X-12).
8. The two questions: "where is this implemented" and "what would make it stop being valid".
9. **Component selection** as a decision with eligible and rejected candidates, eligibility pass / fail / unknown, a
   pinned profile and obligations carried forward (deep dive component-selection).
10. One trace reading for all of it (frame rule 7).

---

## b. The records

### b.1 New: the adoption record

Document key (new, top level; the row keeps unknown top-level keys, `project-storage.js:346`):

```
p.adoptions = { schemaVersion: 1, definition: 1, counter: 0, version: 0, records: [ Adoption ] }
```

`definition` is the upgrade marker (as `dataOwnership.definition`, `public/ownership-upgrade.js:14-15`). `version`
increments on every adoption write, like each chapter's `version`.

```
Adoption = {
  id: 'ADP-001',                      // 'ADP-' + pad3(++counter); never reused
  revision: 1,                        // +1 on every change; commands carry it (optimistic check)
  status: 'draft'|'prepared'|'applied'|'accepted'|'withdrawn'|'reversed'|'superseded',
  origin: 'person'|'sol-draft'|'upgrade',
  kind: 'pattern'|'style'|'tactic'|'profile'|'method',
  title, owner,                       // owner free text, as elsewhere
  scope: { requirementId, driverId, contextIds: [] },          // as architecture.start takes them today
  basis: {...}, basisStamp,           // designBasis / designBasisStamp (public/design-basis.js:16,30)

  definition: {                       // b.3; frozen at prepare
    definitionId, conceptId?, version, optionId?, groupId?,
    authority: 'released'|'built-in',
    receipt: {...},                   // claimReceipt (knowledge-governance.js:71) or method receipt (architecture-knowledge.js:112-114)
    snapshot: {...}, snapshotHash     // the definition content this project used; history is never rewritten
  },

  facts: { [key]: { value, status: 'declared'|'measured', by, at, source? } },   // readArchitectureFact shape (architecture-facts.js:11-16)
  bindings: [ { id: 'ADP-001:store', roleId, recordId, recordType, mode: 'reused'|'created'|'changed',
                 owner?, failureOwner?, at, by } ],
  relationships: [ { id, relationshipId, from, to, realisedBy: [ {source, id} ], state } ],
  parameters: [ { id: 'ADP-001:P:retention', name, value|null, unit, scope, basis: 'stated'|'assumed'|'measured'|'workload',
                  basisRef?, evidence?, failureIfWrong, appliesTo, driverId?, sharedKey?, migrated? } ],
  obligations: [ { id, title, stage: 'design'|'implementation'|'operating', chapter: 5..11, kind, action, evidence,
                   mandatory, targetIds: [], driverIds: [], factKeys: [], parameterNames: [], sourceIds: [],
                   dischargedBy?: { recordId, by, at }, declared, verification: 'pending' } ],
  evidence: [ { id, claim, kind: 'calculated'|'simulated'|'observed'|'approved', obligationId?, recipeRef?, status: 'required' } ],
  bounds: { dependsOn: [ {id, text, dischargedBy?} ], doesNotCover: [ {id, text, coveredBy?|acceptedLimitation?} ],
            reconsiderWhen: [], removalConsequence, operatingWork, supports: [ {driverId|invariantId|obligationId} ] },
  decisionId,                         // the Chapter 3 decision holding every compared option
  deviations: [ { id: 'ADP-001:DEV-01', target: {kind: 'role'|'relationship'|'precondition'|'parameter'|'obligation', id},
                  statement, reason, by, at, review?: { outcome: 'accepted'|'rejected', actor, account, at, note } } ],

  proposal: { stamp, at, changes: [...], executed: [...] } | null,   // as model alternatives keep them (model-alternatives.js:57)
  applied: { at, actor, account, reason, changeIds: [], records: [ {id, ref, title, chapter, slot, isNew} ],
             reversal: {...}, reviewAuthority } | null,
  acceptance: { at, actor, account, note, revision, deviationIds: [] } | null,
  review: { required: bool, since, causes: [ {kind, id, detail} ] },   // set by the server tracker, c.3
  reading: { stamp, at, findings: [...] },                              // stored result of the last evaluation, b.4
  legacy: { taskId, solutionId, alternativeId, methodReceipt, governedKnowledge, answers } | undefined,
  history: [ { at, event, actor, revision, note } ]                     // last 30, as chapters keep them
}
```

Lifecycle:

```
draft ──prepare──▶ prepared ──apply (a signed-in person)──▶ applied ──accept (a second signed-in person)──▶ accepted
  ▲                    │                                        │  ▲                                           │
  └── facts/bind/parameters change (proposal cleared)           │  └──── content change or new deviation ──────┘ (acceptance lapses)
                                                                ├── withdraw (reason; records stay)  ──▶ withdrawn
                                                                ├── reverse  (captured reversal)     ──▶ reversed
                                                                └── supersede (new definition version)──▶ superseded (new ADP in draft)
```

- `draft` and `prepared` records are proposals: excluded from checks and counted once as "Review the proposals", the
  rule every chapter uses (`public/record-lifecycle.js:20,42`). A Sol draft enters as `origin:'sol-draft'`, `draft`.
- `applied` is today's working-design acceptance (parity with `alternative.apply`). `accepted` is new and needs a second
  person. An acceptance lapses when the adoption's content changes, as every confirmation in AIW does.
- Nothing is deleted. `withdrawn`, `reversed` and `superseded` records stay with their history.

### b.2 Extended: decision and alternative (component selection, F2)

Both blocks are optional on existing records; no old decision gains one.

```
decision.selection = { kind: 'component'|'option', responsibilityIds: [], constraints: [ Constraint ],
                       basisStamp, reviewTrigger, preparedBy, preparedAt }
Constraint = { id, source: 'driver'|'policy', driverId?|policyId?, label, hard: true, predicate?: {fact, op, value} }

alternative.candidate = {
  kind: 'profile'|'library'|'archetype'|'existing'|'build'|'buy',
  ref: LibraryRef | {scope:'knowledge', claimId, releaseId, claimHash, releaseHash, definitionId, version}
       | {scope:'existing', componentId} | null,
  facts: { [key]: fact },                       // the candidate's declared facts, from the released profile only
  eligibility: { state: 'eligible'|'ineligible'|'unproven', stamp,
                 rows: [ { constraintId, state: 'pass'|'fail'|'unknown', basis: 'evaluated'|'person',
                           fact?, value?, expected?, evidence?, reason?, by?, at? } ] },
  applicability: { state: 'context-match'|'needs-context'|'excluded', checks: [...] },   // a reading only
  outcome: 'chosen'|'rejected'|'not-chosen', by?: 'sol'
}
```

The chosen profile is instantiated as a component **and** as an adoption record of `kind:'profile'` (role `component`
bound to the new component, role `responsibility` bound to each responsibility). So the profile's obligations, bounds,
pin and second-person acceptance use the same record and commands as a pattern.

`LibraryRef` gains one scope: `knowledge` (`public/component-library.js:83-91`), and `LIBRARY_KEYS` gains `profile`
(`public/component-library.js:19`).

### b.3 The definition contract (what can be adopted)

One shape, read through one function `adoptionDefinition(p, ref)`. It is produced by three sources in this order:

1. **Built-in** (this package): the eight topics (19 options), the boundary task's two approaches, written as data in
   `public/adoption-builtins.js` from the existing knowledge modules. Authority `built-in`, receipt = today's method
   receipt. They gate today and keep gating; they gain nothing.
2. **Released claim with `architectureUnit`** (exists today): normalised by this package. Roles come from `placement`,
   preconditions from `applicability`, obligations from `obligations`, `doesNotCover` from `exclusions`.
3. **Released concept forms from wp1-knowledge** (needed, section f): the full shape below.

```
Definition = {
  definitionId, conceptId?, version, kind, title, mechanism,
  group?: { id, question, optionIds: [] },                        // options compared together; all become alternatives
  roles: [ { id, label, required, cardinality: 'one'|'many',
             accepts: [ { type: 'component'|'responsibility'|'data'|'contract'|'capability'|'realization'|'plan'|'control'|'boundary',
                          kinds?: [], category?: '' } ],
             sameAs?: roleId, sameAsWhen?: {fact, eq, role}, create?: { type, kind, category, titleTemplate, purposeTemplate } } ],
  relationships: [ { id, from, to, kind: 'sync'|'event'|'data'|'lineage'|'contract', label, required, conditionTemplate? } ],
  facts: [ { key, label, type: 'choice'|'text'|'number', values?, unit?, why?, from?: {role, field, map?} } ],
  preconditions: { id, requires: [Predicate], excludes: [Predicate] },      // architectureApplicabilityIssues-valid (architecture-knowledge-unit.js:22-49)
  parameters: [ { name, label, type, unit, scope, required, min?, max?, appliesTo, failureIfWrong, sharedKey? } ],
  crossRules?: [ { id, left: {param}, op: 'gte'|'lte'|'eq', right: {param|companionParam}, failure } ],
  obligations: [ { id, title, stage, chapter, kind, role, action, evidence, mandatory, factKeys: [], parameterNames: [] } ],
  evidence: [ { id, claim, kind, obligationId?, recipeRef? } ],
  bounds: { dependsOn: [], doesNotCover: [], reconsiderWhen: [], removalConsequence, operatingWork },
  effects: [ { quality, direction, rationale, verify } ],                  // shown, never weighed
  companions?: { requires: [definitionId|conceptId], constrains: [] },
  steps?: [ Step ]                                                         // built-ins and released definitions: closed vocabulary below
}
Step = { op: 'data'|'lineage'|'contract'|'data-interaction'|'capability'|'dependency'|'plan'|'boundary', ...payloadTemplate }
```

Rules that keep it bounded:

- Templates are `{fact.key}`, `{role.<id>.title|id|ref}`, `{requirement.title|id}`, `{adoption.id}` substitutions only.
  No expressions, no conditionals, no code: the same discipline as predicates ("Facts are literal keys; expressions …
  are never accepted", `public/architecture-knowledge-unit.js:20-21`).
- Each `Step` runs exactly one existing chapter command (`interfaces.data`, `interfaces.lineage`, `interfaces.contract`,
  `realisation.interaction`, `technology.capability`, `technology.dependency`, `techrealisation.plan`,
  `technology.boundary`).
- **Only a built-in may register a materialiser function** (code) in `adoption-builtins.js`, for behaviour the closed
  vocabulary cannot express. A released definition can never carry or name code. Said plainly: the eight built-ins stay
  code-authored knowledge; what is retired is their separate command, state, applied-record and UI path.
- A definition from candidate or discovery knowledge does not exist for this function: `adoptionDefinition` returns
  `null` unless the claim is in `releasedClaims(p)` with `eligible:true` (`public/knowledge-governance.js:68-70`).

### b.4 The stored reading

`adoptionReading(p, a)` is a pure function (server and lazy client). Its result is stored on the record by each adoption
command and by the server tracker, so the chapters route reads a stored value and evaluates nothing.

```
reading = {
  stamp, at,
  definition: { state: 'current'|'superseded'|'withdrawn'|'interpretation-changed', reasons: [] },
  roles: [ { roleId, required, state: 'bound'|'unbound'|'broken'|'deviating', recordIds: [], issues: [] } ],
  relationships: [ { id, state: 'present'|'missing'|'deviating', realisedBy: [] } ],
  preconditions: { state, checks: [ {id, state: 'known'|'unknown'|'blocked', fact, value, expected, evidenceStatus, source} ] },
  parameters: [ { name, state: 'stated'|'open'|'out-of-range' } ],
  obligations: [ { id, state } ],                // OBLIGATION_STATES (architecture-obligations.js:10) plus 'discharged'
  companions: [ { definitionId, state: 'adopted'|'missing' } ],
  conflicts: [ { sharedKey, otherAdoptionId, values: [] } ],
  bounds: { considered: ['recorded facts', 'bound records and their relations', 'declared parameters'],
            notConsidered: ['runtime behaviour', 'implementation code', 'measured load', 'observed operation'] },
  findings: [ { id, code, level, chapter, objectId, title, detail, waivable } ]
}
```

Finding codes (rule-based, all model-level):

| Code | Level | When |
|---|---|---|
| `adoption-contraindicated` | E, `waivable:false` | a precondition evaluates `blocked` and no accepted deviation covers it |
| `adoption-role-missing` | E | a required role has no binding and no accepted deviation |
| `adoption-role-broken` | E | a bound record is retired, removed, or no longer of an accepted type or kind |
| `adoption-fit-open` | W | a precondition is `unknown` (unknown never passes) |
| `adoption-relationship-missing` | W | a required relationship has no realising relation between the bound records |
| `adoption-parameter-open` | W | a required parameter has no value |
| `adoption-parameter-conflict` | E | two applied adoptions state different values for one `sharedKey` on one bound record, or a `crossRule` fails |
| `adoption-companion-missing` | W | a required companion definition is adopted on none of the bound records |
| `adoption-orphan` | W | `bounds.supports` is empty (no driver, invariant or obligation needs the mechanism) |
| `adoption-deviation-unreviewed` | W | a deviation has no second-person review |
| `adoption-acceptance` | W | status `applied`: not accepted by a second signed-in person |
| `adoption-definition-superseded` | W | the pinned release has a successor |
| `adoption-definition-withdrawn` | E | the pinned knowledge was withdrawn or is no longer eligible |
| `design-source` (kept code, id `design-source:<taskId>` for upgraded records, else `adoption-basis:<id>`) | E | requirement, driver, decision or context changed (today's finding, `public/design-task-state.js:28`) |
| `architecture-obligation` (kept code) | W | as today (`public/review-domain.js:332`) |

Keeping the two existing codes and ids means dispositions recorded against them (`review.disposition.findingId`) stay
valid after the upgrade.

---

## c. The commands

All are handled by new modules registered in `COMMAND_HANDLERS` (`worker.js:101`): `['adoption.', applyAdoptionCommand]`
and `['selection.', applySelectionCommand]`. `COMMAND_PREFIXES` derives from that table (`worker.js:102`). Add both
prefixes to `LARGE_COMMAND_PREFIXES` (`worker.js:106`). Each handler takes `(document, command, at, actor, {author})`.

Common validation: the record exists; `payload.revision === a.revision` (else "This adoption changed. Reopen it; your
input is retained."); every id names a record the project holds; texts are bounded and refused past the bound, never
cut. Audit: every command appends to `a.history`, bumps `p.adoptions.version`, and the worker journals it with actor,
author kind and reason (`worker.js:652-653`); add `'adoptions.records'` to `RECORD_PATHS` (`public/provenance.js:54`) so
`stampAuthorship` stamps the record.

### c.1 `adoption.*` (`public/adoption-domain.js`, `applyAdoptionCommand`)

| Type | Payload | Actor rule | Validation and effect | Undo |
|---|---|---|---|---|
| `adoption.start` | `{definition: {definitionId, optionId?} \| {claimId, releaseId}, requirementId, driverId, contextIds?, fromTaskId?}` | any author; a Sol draft or agent creates `origin:'sol-draft'` | definition must resolve through `adoptionDefinition` (released and eligible, or built-in and current); 60-record limit as tasks have (`public/design-task-domain.js:45`); creates `draft`, prefilled facts where `fact.from` reads a context record | `adoption.withdraw` |
| `adoption.facts` | `{id, revision, facts: {key: value}}` | person or Sol draft (a Sol draft's facts are stored `by:'sol'`, status `unknown` until a person saves them) | keys must be the definition's; choice values checked; clears `proposal`; status → `draft` | save again |
| `adoption.bind` | `{id, revision, bindings: [{roleId, recordId \| 'new', title?}]}` | as above; a Sol draft only proposes | record type and kind must match `role.accepts`; distinct records for roles without `sameAs` (today's rule, `public/composition-design.js:34`); a bound data record must keep its Chapter 8 authority (today's rule, `:47`) | save again |
| `adoption.parameters` | `{id, revision, parameters: [{name, value, unit, scope, basis, basisRef?, evidence?}]}` | person or Sol draft; **a Sol draft or agent never sets a value with `basis:'measured'`** | name must be the definition's; unit must equal the definition's; number within `min..max`; an example number from knowledge is never prefilled | save again |
| `adoption.deviation` | `{id, revision, target, statement, reason}` | signed-in person only | target must exist in the definition; reason required; if status is `accepted` → back to `applied` (acceptance lapses) | `adoption.deviation` with `{deviationId, withdrawn: true, reason}` |
| `adoption.prepare` | `{id, revision, optionId?}` | person | refused while any precondition is `unknown` or `blocked` without a deviation (parity with `public/architecture-design.js:70-71`); for a group, every option is assessed and written as an alternative (parity with `:72` and `public/composition-design.js:82`); stores `proposal {stamp, changes, executed}` from `adoptionProposal`; status → `prepared` | edit facts or bindings |
| `adoption.apply` | `{id, revision, previewStamp, reviewed: true, reason}` | **signed-in person; agent or Sol draft refused** (type in `REVIEW_TYPES`, and `reviewed:true` is a claim, `authorship.js:46-66`) | stamp must match a fresh preview; applies the proposal's commands through the chapter handlers (c.4); writes one change event per changed record with `proposal:{adoptionId, …}` as today (`public/model-alternatives.js:98-101`); `applied {actor, account, …, reversal: captureReversal(...)}`; clears Chapter 11 checks and handoff as today (`:134`); status → `applied` | `adoption.reverse` |
| `adoption.accept` | `{id, revision, deviationIds: [], note}` | **a second signed-in person**: actor present, not an agent, not `a.applied.actor`, not the actor of any history entry that changed facts, bindings, parameters or deviations since the last apply; whatever the project's four-eyes setting | status must be `applied`; no E finding in `a.reading`; `review.required` false; `deviationIds` must equal the current deviations (each then gets `review.outcome:'accepted'`); writes `acceptance {actor, account, at, revision}` | `adoption.accept` cannot be undone; a content change lapses it |
| `adoption.obligation` | `{id, revision, obligationId, dischargedBy: recordId \| null, owner?}` | person | the record must be of the obligation's chapter and reachable from a bound record; writes `dischargedBy {recordId, by, at}` | send `null` |
| `adoption.reassess` | `{id, revision, reviewed: true, reason}` | signed-in person | recomputes `basis`, facts read from records and `reading`; clears `review.required`; history keeps before and after (today's `architecture.refresh`, `public/architecture-design.js:51-60`) | none; history |
| `adoption.supersede` | `{id, revision, definition: {…new version}}` | person | new definition must be released and a successor of the pinned one (or the current built-in); old → `superseded`, a new `draft` carries facts, bindings and parameters whose keys still exist | withdraw the new draft |
| `adoption.withdraw` | `{id, revision, reason}` | signed-in person | reason required; records it created stay (retire them with `record.retire`); obligations close as "withdrawn with the adoption" | none; history |
| `adoption.reverse` | `{id, revision, previewStamp, reviewed: true, reason}` | signed-in person | only while `previewReversal` allows it (model unchanged since apply, `public/model-reversal.js:6-9`); restores the captured domains; status → `reversed` | none |

The independence rule is one exported helper so every surface says the same thing:

```
export const adoptionAuthors = a => unique([a.applied?.actor, ...a.history.filter(h => h.revision > (a.appliedRevision||0) || h.event==='apply').map(h => h.actor)])
export function accepterRefusal(a, actor, account) { /* as verifierRefusal (architecture-obligations.js:38): no actor → 'Sign in…';
   account==='agent' → 'An agent or Sol does not accept…'; adoptionAuthors(a).includes(actor) → 'A second signed-in person accepts it; <actor> applied or edited it.' */ }
export const independentAcceptance = a => !!a.acceptance && a.acceptance.account !== 'agent' && !accepterRefusal(a, a.acceptance.actor)
```

It follows `verifierRefusal` / `independentVerification` (`public/architecture-obligations.js:35-39`) exactly; no new
kind of check. Readers call `independentAcceptance(a)`, never `a.status === 'accepted'` alone, so an imported or
hand-edited record does not count.

### c.2 `selection.*` (`public/adoption-selection.js`, `applySelectionCommand`)

Selection is a Chapter 3 decision. These commands call `applyDecisionCommand` for the decision's own fields and then
write the `selection` and `candidate` blocks. The decision's existing lifecycle (`decision.record`, `decision.accept`,
`decision.governance`, `public/decisions-domain.js:223-230`) is unchanged.

| Type | Payload | Actor rule | Validation and effect |
|---|---|---|---|
| `selection.start` | `{responsibilityIds, question?, owner, reviewTrigger?}` | any author (Sol: proposal) | responsibilities exist; runs `decision.save` with `topic:'component-selection'`, the requirements and drivers reaching the responsibilities (`driverScope`, `public/driver-scope.js:87`); writes `selection.constraints` from hard-constraint drivers (`constraintForce`, `public/decision-reading.js:146`) and adopted policy (wp9b, section f) |
| `selection.candidate` | `{id, candidate: {kind, ref}, title, summary?}` | any author; a candidate added by Sol is marked `by:'sol'` | a `knowledge` ref must pass `claimReceiptCurrent`; `library`/`archetype` refs must pass `proposalSource` (`public/component-library.js:64-71`); **a claim that is not released and eligible is refused: "Candidate knowledge can be read, not selected."**; runs `decision.alternative`; computes `eligibility` and `applicability` |
| `selection.judge` | `{id, alternativeId, constraintId, state: 'pass'\|'fail', evidence, reason}` | **signed-in person; agent or Sol refused** | only for a row whose evaluated state is `unknown`; writes `basis:'person', by, at`; evidence required |
| `selection.choose` | `{id, alternativeId, rejections: {[alternativeId]: reason}, unproven?: [constraintId]}` | signed-in person | at least two candidates; the chosen one has no `fail`; every other candidate has a reason; each `unknown` row of the chosen one must be listed in `unproven` and is written into the decision's assumptions, so approval evidence is refused while it is open (existing rule, `public/decisions-domain.js:230`); runs `decision.choose` |
| `selection.instantiate` | `{id, reviewed: true, component: {…the reviewed, edited proposal}}` | signed-in person | decision accepted and current; eligibility stamp current; runs `realisation.candidate` (the existing reviewed path) with key `profile`\|`library`\|`archetype` and the pinned ref; adds the decision to the component's `decisionIds`; creates the `kind:'profile'` adoption at `applied` with the profile's obligations open. A second person then sends `adoption.accept`. |

Eligibility is `evaluateApplicability({requires: constraints with a predicate}, candidate.facts)` per constraint
(`public/architecture-facts.js:30-44`): `known → pass`, `blocked → fail`, `unknown → unknown`. A constraint with no
typed predicate, or a candidate with no stated fact, is `unknown`. **Unknown is never neutral**: it is listed, it stops
`selection.choose` unless named as unproven, and an unproven selection cannot receive approval evidence. Candidates are
listed in the order they were added; no field holds a score, a rank or a weight, and `readDecision`
(`public/decision-reading.js:156`) is not called for a decision with a `selection` block.

### c.3 The server tracker (staleness without route code)

`trackAdoptionChange(prior, next, command, at)` exported by `adoption-domain.js`, called after `trackDecisionChange`
(`worker.js:270`). When a command changes a bound record, a driver, decision or requirement in an adoption's basis, or
pins/withdraws knowledge, it recomputes `reading` for the affected applied or accepted adoptions and sets
`review {required: true, since, causes}`. It is a tracker's addition to the same commit, as the other trackers' are
(`worker.js:250-254`). It never changes a chapter record and never changes `status` or `acceptance`; a lapsed acceptance
is read from `review.required` by `independentAcceptance`'s callers through the `design-source` finding.

Limit, stated: eligibility that expires by time alone (a signed organisation release's `expiresAt`,
`public/knowledge-governance.js:60`) is reflected at the next command or `adoption.reassess`. The SDD builder calls
`adoptionReading` fresh on the server, so documents never print a stale reading.

### c.4 How `adoption.apply` writes records

The proposal builder `adoptionProposal(input, a, at)` runs on a private copy, exactly as today's builders do
(`public/composition-design.js:20-21`): each step calls the existing chapter handler (`applyDecisionCommand`,
`applyLogicalCommand`, `applyRealisationCommand`, `applyTechnologyCommand`, `applyTechnologyRealisationCommand`,
`applyInterfacesCommand`) with a native command, and collects `executed`. It returns the shape
`architectureProposal` returns today (`public/architecture-proposal.js:45`): `{document, commands, changes[{command,
source{slot,isNew}, before, after, fields}], items, findings, signals, executed, relationships, stamp, hasChanges}` plus
`obligationsOpen[]`. So the review dialog, the change journal and the finding delta read it unchanged. No record is
written except through a chapter's own command handler; the adoption module holds no writer of chapter records.

---

## d. Modules, hooks and UI

### d.1 New modules

| Path | Exports | Purity | Loaded by |
|---|---|---|---|
| `public/adoption-domain.js` | `applyAdoptionCommand`, `adoptionProposal`, `adoptionReading`, `trackAdoptionChange`, `adoptionAuthors`, `accepterRefusal`, `independentAcceptance`, `adoptionImplementation`, `adoptionInvalidators`, `ADOPTION_LIMITS` | pure; input copied before change | worker; the adoption lazy chunk |
| `public/adoption-definitions.js` | `adoptionDefinition(p, ref)`, `definitionIssues(def)`, `unitDefinition(claim, release)`, `adoptionSupport(def)` | pure | same |
| `public/adoption-builtins.js` | `BUILTIN_DEFINITIONS`, `builtinDefinition(id, optionId)`, `builtinFromReceipt(receipt)`, materialisers | pure | same |
| `public/adoption-selection.js` | `applySelectionCommand`, `selectionConstraints(p, responsibilityIds)`, `candidateEligibility(p, decision, alternative)`, `selectionReading(p, decision)` | pure | same |
| `public/adoption-upgrade.js` | `ADOPTION_DEFINITION`, `needsAdoptionUpgrade(p)`, `upgradeAdoptions(p)` | pure; returns an upgraded copy | worker only |
| `public/adoption-document.js` | `adoptionsSection(p, specs)`, `selectionSection(p, decision)`, `adoptionMarkdown(p)` | pure | worker only (SDD is built on the server) |
| `public/adoption-ui.js` | `mountAdoption(panel, ctx)`, `openAdoption(id)`, `openSelection(ctx)`, `adoptionDossier(p, id)` | UI | static import of `public/architecture-task-ui.js` only |

`adoptionImplementation(p, id)` answers "where is this mechanism implemented in my model": per role the bound records
(ref, title, chapter, reused or created), per relationship the realising relation ids, per parameter the value and where
it is stated, per obligation its discharging record or action, read through `linkedVia(p, id, 'binds')`
(`public/trace-kernel.js:195`) and `forwardTrace` (`:174`).

`adoptionInvalidators(p, id)` answers "what would make it stop being valid": one row per precondition (the fact, the
record field it is read from or "declared by <person>", the value that holds now, the values that would block it), per
binding ("retiring <ref>, or changing its kind from store"), per required relationship, per parameter bound and cross
rule, per `bounds.doesNotCover` and `reconsiderWhen` line, the pinned release, and each basis record. Each row carries
`kind: 'evaluated'|'declared'|'stated-by-knowledge'`. It ends with `bounds.notConsidered`. It is a deterministic list;
it executes nothing and observes nothing.

### d.2 Existing files touched (narrow hooks)

| File · place | Change | Route bytes (est.) |
|---|---|---|
| `worker.js:101` | two handler rows; `:106` two prefixes; `:270` call `trackAdoptionChange` | server |
| `authorship.js:39` `REVIEW_TYPES` | add `adoption.apply`, `adoption.accept`, `adoption.deviation`, `adoption.reassess`, `adoption.withdraw`, `adoption.reverse`, `selection.judge`, `selection.choose`, `selection.instantiate` | server |
| `public/record-graph.js:189` | emit each `p.adoptions.records` entry (not `draft`/`prepared`) as type `pattern` with `addresses`, `assesses`, `binds {attributes: {role, mode}}` and `scopes`; skip a task that has `adoptionId` | ≈ +260 |
| `public/trace-kernel.js:19,21` and `:49-67` | layer `mechanism` (type `pattern`) after `path`; one hop: `hop('mechanism', 'binds scopes', 'responsibility component capability realization contract data plan control', IN)` | ≈ +130 |
| `public/review-domain.js:174` and `:219` | beside `designTaskFindings(p)`: spread stored `a.reading.findings` and the `review.required` finding of applied and accepted adoptions | ≈ +110 |
| `public/review-domain.js:50` (`reviewSource`) | adoption records join the design source under design fingerprint 3, converted for stored stamps as D14 did (`public/readings-upgrade.js:136-139`) | ≈ +30 |
| `public/provenance.js:54` | `'adoptions.records'` in `RECORD_PATHS` | ≈ +25 |
| `public/decisions-domain.js:187` (`normaliseOption`) | carry `candidate` over from the old alternative | ≈ +40 |
| `public/architecture-obligations.js:71-76` (`architectureSolutionsFor`) | read adoptions; return the same solution-shaped projection (`taskId` = `legacy.taskId` or the adoption id), so its consumers do not change: `public/design-spec.js:21,197`, `public/architecture-intelligence.js:10,224`, `public/sdd-architecture.js:44,895`, `public/review-ui.js:34,37`, `public/technology-realisation-domain.js:6,61`, `public/review-domain.js:43,332` | ≈ 0 (body swap) |
| `public/architecture-obligation-basis.js:15-20` (`acceptedObligation`) | resolve `{taskId, solutionId, obligationId}` or `{adoptionId, obligationId}` from adoptions; `:25-63` reads the legacy view for upgraded records so the basis digest is unchanged | ≈ 0 |
| `public/design-task-state.js:14,28` | `designTasksForRecord` and `designTaskFindings` skip tasks with `adoptionId` | ≈ +30 |
| `public/design-questions.js:104-109` | a `task:<topic>` answer also reads adoptions by `definition.groupId`; `decided` only when the reading has no unknown or blocked precondition, else `draft` (C5-21) | ≈ +60 |
| `public/model-reversal.js:19` | a reversed alternative marks its adoption `reversed` | ≈ +40 |
| `public/component-library.js:19,64-71,83-91` | key `profile`, scope `knowledge` (checked with `claimReceiptCurrent`) | ≈ +120 |
| `public/readings-upgrade.js:294` | `registerReadingsUpgrade(p => upgradeAdoptions(upgradeOwnership(upgradeReadings(p))))` | server |
| `storage-upgrade.js:25` | `if (needsAdoptionUpgrade(stored.document)) return true;` | server |
| `public/sdd-architecture.js:739,834-838,894-900` | print candidate eligibility and rejection in "Alternatives considered"; add adopted definitions to the styles and patterns list; sections from `adoption-document.js` through a registered slot (the pattern of `registerSDDBuilder`, `public/review-domain.js:585`) | ≈ +120 |
| `public/architecture-task-ui.js:80,87,137,198` | host the adoption surface (lazy chunk) | 0 (lazy) |
| `public/component-library-ui.js:70` | "Select for a responsibility" opens `openSelection` through `import('./architecture-task-ui.js')` | 0 (lazy) |
| `package.json` | `test:rc44-wp2-adoption`, `test:rc44-wp2-adoption-browser` | — |

Estimated route cost while the legacy path still exists: **about +0.9 KB**; the goal is ≤ 0.6 KB by folding the
design-task-state and model-reversal edits into S6. After S6 the legacy builders leave the route (they are on it today
through `public/model-alternatives.js:3` → `public/design-planner.js:1-4` → `public/architecture-design.js:1-12`), so
the net is expected to be negative. Neither figure is measured.

### d.3 UI surfaces

- **Adoption workspace** (Work tab, the existing "comparison tools" panel): hosted in the existing lazy chunk rooted at
  `public/architecture-task-ui.js`, loaded by `public/brain-context-ui.js:57`. No new lazy entry, so the script count
  stays 148 (`client-bundle.mjs:294,337`). Steps, all deterministic and working with no provider configured:
  1. **Conditions** — the definition's facts as questions, each showing `known / unknown / blocked` and the predicate's
     own failure text. A fact read from a record shows the record and field.
  2. **Roles** — for each role, the existing records that fit `accepts`, taken from the requirement's trail
     (`requirementTrace`, `public/trace-kernel.js:160`) first, then the rest; or "create new" with a name.
  3. **Parameters** — unit shown, value empty unless a person states it, basis required.
  4. **Review** — three lists: created, reused, changed (from `changes[].source.isNew` and `fields`), the finding
     delta, and "obligations that stay open". Apply needs `reviewed` and a reason.
  5. **Accept** — shown to a different signed-in person; lists each deviation to acknowledge.
- **Adoption dossier** (selecting an applied mechanism in a Model view or the record card's "Design basis"): the lazily
  loaded dossier (`public/model-dossier.js`, off the route since rc42, `client-bundle.mjs:226-229`) gains a `pattern`
  branch with two buttons: "Where is this implemented?" and "What would make it stop being valid?".
- **Component selection** (Chapter 5, "From the library", `public/realisation-ui.js:217`): starts from the selected
  responsibility; shows its drivers and hard constraints, the candidates with eligibility rows and the applicability
  reading, teaching content labelled with source and status, "Add as candidate" (disabled with the reason for candidate
  knowledge), "Judge" for unknown rows, "Choose" with a reason per rejected candidate, then the existing reviewed
  component form for the chosen one.
- **Sol** only proposes: it may send `adoption.start`, `adoption.facts`, `adoption.bind`, `adoption.parameters`,
  `selection.start` and `selection.candidate` as `sol-draft`; everything else is refused by `refuseUnreviewable`.

Size rule for implementers: on the client, `adoption-domain.js`, `adoption-definitions.js`, `adoption-builtins.js` and
`adoption-selection.js` are imported statically by `adoption-ui.js` only. `component-library-ui.js` reaches the
selection view by dynamic import and passes its own builders (`libraryProposal`, `archetypeProposal`,
`public/component-snapshot.js:114,140`) as arguments. A static import of any adoption module from a second lazy chunk
makes esbuild emit a shared chunk and breaks the 148 gate.

---

## e. What is retired, and the migration

### e.1 Retired after parity

| Retired | Replaced by | Slice |
|---|---|---|
| `architecture.start/answers/prepare/refresh/dismiss` for topics 1–8 (`public/architecture-design.js:25-86`) and the builders `public/architecture-design.js:137-172`, `public/composition-design.js:19-85`, `public/persistence-design.js:13`, `public/read-design.js:13` | `adoption.*` with the built-in definitions | S3 |
| The applied record `task.applied.reasoningGraph.solution` as an authority (`public/architecture-solution.js:13-74`, `public/model-alternatives.js:104-116`) | the adoption record | S1 (readers), S3 (writer) |
| `design.start/answers/prepare/update/dismiss` for the boundary task (`public/design-task-domain.js:44-51,80-115`, `public/design-planner.js:58-93`) | `adoption.*` with built-in `guided-boundary-1` | S3 |
| Released concern comparison (`public/architecture-design.js:93-124`) | `selection.*` with `kind:'option'` (released options as candidates; an option may now be excluded by a predicate, which `public/architecture-knowledge.js:137` could not do) | S5 |
| The typed-name acceptance of a design (`reviewAuthority`, `public/model-alternatives.js:13-15`) for adoptions | `adoption.apply` by a signed-in actor and `adoption.accept` by a second person | S3 |
| `patternIds` as a second place to say "this component uses a pattern" (`public/realisation-domain.js:238`) | read-only for old records; the picker (`public/realisation-ui.js:76`) starts an adoption instead | S6 |

`architecture.measure` (`public/architecture-design.js:47-50`) is quantitative evidence; it stays until wp3-workload
and wp6-evidence take it, addressed to the adoption id.

### e.2 Temporary adapters, each with its retirement

| Adapter | Why | Retires when |
|---|---|---|
| Exchange, security and operation tasks (rows 11–13) keep their guided flows; on accept they also write an adoption record (built-ins `exchange-contract-1`, `protection-control-1`, `operation-continuation-1`) through one function in `adoption-domain.js` | their previews are record-authoring flows, not role bindings; moving the flows is wp8-guided's and wp5-change-plan's work | wp8 replaces the exchange and security flows; wp5 replaces the operation continuation. Named in S6's done-when as open items with owners. |
| `a.proposal` and `adoption.apply` hold their own preview and apply, copied from `applyDesignAlternative` | wp5's change plan does not exist yet | wp5 lands `changeplan.accept`: `adoption.prepare` then emits a change plan and `adoption.apply` delegates. The shape is already the one wp5 must accept (c.4). |
| `architectureSolutionsFor` returns a solution-shaped projection | ten consumers read that shape | wp7-views moves the SDD and the specification onto `adoptionImplementation`; then the projection is removed. |

### e.3 Old documents

`upgradeAdoptions(p)` runs on read with the other upgrades. For each design task with `status:'applied'`:

- kind `architecture` with a solution → one adoption: `origin:'upgrade'`, `status:'applied'`, `acceptance:null`,
  `legacy {taskId, solutionId, alternativeId, methodReceipt, governedKnowledge, answers}` verbatim; definition from
  `builtinFromReceipt(task.applied.methodReceipt)` with the snapshot of the built-in **as the receipt identifies it**
  (if the receipt's interpretation is not current, `reading.definition.state:'interpretation-changed'`, exactly today's
  reason at `public/architecture-obligation-basis.js:59`); bindings from `solution.placement`; facts from
  `applied.designAnswers` (`by` = the typed reviewer name, marked `identity:'typed-name'`); parameters from
  `specifications[].parameters` with `unit:''`, `migrated:true`; obligations verbatim with their ids
  (`DES-003:delivery-intent`); `decisionId`; `applied {at, reviewer, reviewAuthority}` verbatim; no deviations.
- boundary, exchange, security, operation → an adoption with roles from `applied.records[].slot`, no obligations.
- The task stays where it is, with `adoptionId` added. Tasks not applied stay tasks; after S3 an open task of topics
  1–8 or the boundary task can be dismissed or continued with `adoption.start {fromTaskId}`, a person's action.

What the upgrade must not do, each a test in section g:

1. No guarantee appears: an upgraded adoption reads "applied · not accepted by a second person", its parameters read
   "unit not stated", its bounds are empty, and it raises `adoption-acceptance` (W) only.
2. No stamp moves: chapter reviews, handoffs, confirmations, baselines and governance read the same before and after.
3. No verification is lost: for an action verified before the upgrade,
   `architectureObligationBasis(p, ref).stamp` is byte-identical before and after, and the obligation stays
   `current-verified`.
4. It is recorded once as a storage upgrade with a recovery point (`storage-upgrade.js:1-9`), not as a design change.
5. A frozen baseline source is read as frozen and is not upgraded (the rule at `public/ownership-upgrade.js:10`).

### e.4 The parity test that allows retirement

`rc44-wp2-adoption-cases/parity.mjs`, on the existing fixtures (`composition-fixtures.mjs`, the persistence, read and
architecture suites' fixtures) with a fixed `at`: for each of the 19 options of topics 1–8 and both boundary approaches,
run the legacy path (`architecture.start` → `architecture.answers` → `architecture.prepare` → `alternative.apply`) and
the adoption path (`adoption.start` → `facts` → `bind` → `prepare` → `apply`) from the same document, then assert, after
replacing `DES-nnn`/`ADP-nnn` and `ALT-nnn` in texts:

1. the `executed` command lists are equal (type and payload, in order);
2. the design domains are deep-equal (`decisions`, `logical`, `realisation`, `technology`, `technologyRealisation`,
   `interfaces`);
3. the obligations are equal (id suffix, action, evidence, targets, field keys, declared);
4. for a grid of answers per topic, every check's state is equal, including each blocking case
   (`commitScope:'separate'` blocks the outbox; `repeatSafety:'unsafe'`; `fallback:'fabricate'`;
   `crossTransaction:'local'` blocks service boundaries; `sessionState:'local'`; `transactionLocality:'cross'`);
5. the refusal text of a not-ready prepare is equal;
6. the finding delta of the preview is equal;
7. the SDD's "Accepted architecture obligations" text for the applied result is equal.

The legacy handlers are deleted only in the commit where all seven hold for all 21 cases. Until then they stay and the
suite runs both.

### e.5 Every consumer of the old path (lines verified by search today)

Classify each read in S1 as "applied state" (move to the adoption reader) or "task in flight" (stays until S3/S6):

`public/architecture-obligations.js:71-85` · `public/architecture-obligation-basis.js:15-20` ·
`public/architecture-verification.js:31` · `public/design-task-state.js:14,28,29` · `public/record-graph.js:189` ·
`public/design-questions.js:104` · `public/sdd-architecture.js:899` · `public/result-read-context.js:13-15` ·
`public/interfaces-domain.js:201` · `public/quality-analysis.js:117` · `public/architecture-knowledge.js:301,321,349` ·
`public/knowledge-governance.js:108-109` · `public/architecture-case.js:52` · `public/case-guidance.js:10` ·
`public/chapter-guide.js:99` · `public/architecture-journey.js:9` · `public/architecture-drafting.js:41` ·
`public/architecture-operations.js:79,88` · `public/intelligence-context.js:164,313,323,337,338` ·
`public/architecture-intelligence.js:38,98` · `public/brain-reasoning.js:781` ·
`public/brain-context-ui.js:173,234,333` · `public/intelligence-ui.js:88` · `public/interfaces-ui.js:73` ·
`public/knowledge-ui.js:13,55,58` · `public/review-domain.js:11,50,174,219,501,623` · `public/model-reversal.js:19` ·
`public/readings-upgrade.js:68,115` · `project-storage.js:55,375,382` (storage of the co-authoring part; unchanged).

Suites that hold today's behaviour and must stay green unchanged until their subject is retired, then be re-pointed at
the adoption commands with the same assertions: `design-task-validate.mjs`, `architecture-design-validate.mjs`,
`composition-validate.mjs`, `persistence-validate.mjs`, `read-design-validate.mjs`, `knowledge-design-validate.mjs`,
`design-concern-validate.mjs`, `architecture-obligation-validate.mjs`, `composition-ui-validate.mjs`,
`architecture-ui-validate.mjs`, `design-task-ui-validate.mjs`, `component-library-validate.mjs`,
`rc42-g2-library-validate.mjs`, `rc42-g4-trace-kernel-validate.mjs`, `command-equivalence-validate.mjs`,
`action-undo-validate.mjs` (all registered in `package.json`).

---

## f. Shared contracts

### f.1 This package provides

| Name | Shape | For |
|---|---|---|
| `p.adoptions.records[]` | b.1 | every package that reads applied mechanisms |
| `adoptionDefinition(p, ref)` and the `Definition` shape | b.3 | wp1 (writes definitions to fit), wp8 |
| `adoptionSupport(def) → {apply: bool, reasons: []}` | which concept can be applied, and why not | wp1's "Apply" action, wp8 |
| `adoptionProposal(p, a, at)` | c.4, the existing preview shape plus `obligationsOpen` | wp5 (change-plan body), wp8 |
| `adoptionReading(p, a)`, finding codes | b.4 | wp7, wp9b (waiver classes: `waivable:false` on `adoption-contraindicated`) |
| `adoptionImplementation(p, id)`, `adoptionInvalidators(p, id)` | d.1 | wp7 (views, SDD), wp8, Sol packets |
| Graph: object type `pattern` per adoption; relations `binds {role, mode}`, `scopes`, `addresses`, `assesses`; trace layer `mechanism` | d.2 | wp7 and every trace reader |
| Evidence targets: `{kind: 'adoption-obligation', adoptionId, obligationId}` and `{kind: 'adoption-evidence', adoptionId, evidenceId, evidenceKind}` | stable ids | wp6 binds observations; wp4 attaches simulated results |
| Parameter rows `{id, name, value, unit, scope, basis, basisRef, sharedKey}` | b.1 | wp3 (a workload assumption as `basisRef`), wp4 (evaluator inputs) |
| `independentAcceptance(a)`, `accepterRefusal(a, actor, account)` | c.1 | wp5, wp9b (same rule for their accept steps) |
| `selectionReading(p, decision)`; `decision.selection`, `alternative.candidate` | b.2 | wp7 (SDD §3/§4), wp9b (decision outcomes) |
| Binding slot for future record types: `role.accepts[].type` is an open list checked against `OBJECT_TYPES` (`public/record-graph.js:15-58`) | b.3 | wp9a (deployable, topology node), wp9c (bounded context) |

### f.2 This package needs

| From | What | Until it arrives |
|---|---|---|
| wp1-knowledge | Released concept forms that normalise to `Definition`: roles with `accepts` and cardinality, relationships, parameters with units, obligations with `stage` and `chapter`, evidence with a kind, bounds, `companions {requires, constrains}`; a component-profile form with typed facts; `successorOf(release)`; the concept id per mechanism. All released through the existing four-eyes path with file SHA-256, locator and passage hash. | built-ins and today's `architectureUnit` claims only; no relationships or parameters from released knowledge |
| wp1-knowledge | Teaching content by concept id with source and status labels, for the Conditions step and the chooser | the surfaces show the built-in reference statements (`public/composition-knowledge.js:12-24`) |
| wp3-workload | A stable workload-assumption id for `parameter.basisRef` and a "this assumption changed" signal the tracker can read | `basis:'stated'|'assumed'` only |
| wp4-behaviour | A result record id for `evidence.kind:'simulated'` and a way to start a challenge from an adoption (`{adoptionId, invariant or relationship}`) | evidence rows of kind `simulated` stay `required` |
| wp5-change-plan | The change-plan envelope and `changeplan.accept` taking the body of c.4; stale-plan reassessment | the adapter in e.2 |
| wp6-evidence | Binding an observation to an evidence target (f.1) with artifact, configuration, environment and method | obligations keep today's Chapter 11 verification |
| wp7-views | SDD and views read `adoptionImplementation` and `selectionReading`; a decision on the `pattern` object label | this package ships the SDD passages itself through a registered section |
| wp8-guided | The stage workspace hosts the five adoption steps; `adoptionNextStep(p, a)` is provided for it | the existing comparison panel |
| wp9a-deployment | Record types `deployable`, topology node, runtime instance, registered in `OBJECT_TYPES` and the record graph | roles accept today's types only |
| wp9b-governance | `hardGates(p, {responsibilityIds}) → [{id, driverId?|standardId?, label, hard: true, predicate?}]` (typed gates for hard constraints and adopted policy); `decision.governance` keeping the signed-in `actor` and refusing the decision's recorder (today it keeps none, `public/decisions-domain.js:230`) | constraints come from `constraintForce` with no predicate, so their rows are `unknown` and a person judges each; the profile adoption's `adoption.accept` is the second-person step |
| wp9c-contexts-ops | A bounded-context id to scope role candidates; a home for obligations of `stage:'operating'` | scope is the requirement's trail; operating obligations stay on the adoption and as Chapter 11 actions |

---

## g. Slices

Test layout: one registered suite `rc44-wp2-adoption-validate.mjs` (plain node assertions) that imports one case file
per slice from `rc44-wp2-adoption-cases/`, and one browser suite `rc44-wp2-adoption-browser-validate.mjs`. A slice owns
its case file, so parallel slices do not edit the same lines. Fixtures: `rc44-wp2-fixtures.mjs` (S1 creates it; later
slices append exports at the end only).

### S1 · The record, its readers and the upgrade

- Depends on: nothing.
- Owns: `public/adoption-domain.js` (state accessors, `adoptionReading`, independence helpers, `trackAdoptionChange`;
  commands `adoption.obligation`, `adoption.reassess`, `adoption.withdraw`, `adoption.accept`, `adoption.deviation`),
  `public/adoption-upgrade.js`, `public/adoption-builtins.js` (`builtinFromReceipt` and definition skeletons: ids, roles,
  obligations), `public/adoption-definitions.js` (shape and `definitionIssues`), `rc44-wp2-adoption-cases/record.mjs`,
  `rc44-wp2-fixtures.mjs`; hooks in `worker.js:101,106,270`, `authorship.js:39`, `public/record-graph.js:189`,
  `public/trace-kernel.js:19-21,49-67`, `public/review-domain.js:50,174,219`, `public/provenance.js:54`,
  `public/architecture-obligations.js:71-76`, `public/architecture-obligation-basis.js:15-63`,
  `public/readings-upgrade.js:294`, `storage-upgrade.js:25`.
- Tests first:
  - upgrade of the Bank Payment reference with three applied tasks (delivery, resilience, persistence) yields three
    adoptions with the task's obligations by id;
  - e.3 rules 1–5, including the byte-identical obligation basis stamp for a verified action;
  - `architectureObligationsFor` returns the same rows before and after the upgrade;
  - the trace of a requirement holds the adoption on layer `mechanism`, and `linkedVia(p, id, 'binds')` returns the role
    records; `rc42-g4-trace-kernel-validate.mjs` unchanged and green;
  - `adoption.accept` is refused for the applier, for an agent account and with no actor, and accepted for a second
    person; an acceptance lapses when a deviation is added;
  - retiring a bound store raises `adoption-role-broken` in the same commit (the tracker).
  - **Fails today:** "retire the store an applied outbox design placed its commit obligation on; a finding names the
    applied mechanism" — today nothing fires (`designTaskFindings` reads only the basis stamp,
    `public/design-task-state.js:28`).
- Done when: the case file passes; every suite in e.5 passes unchanged; `node client-bundle.mjs` reports the chapters
  route within its cap and 148 scripts.

### S2 · The definition contract and the generic builder (composition topics)

- Depends on: S1.
- Owns: `public/adoption-domain.js` commands `adoption.start/facts/bind/parameters/prepare/apply/reverse` and
  `adoptionProposal` (a separate region of the file, marked), `public/adoption-builtins.js` (the five composition
  topics, 13 options, steps and materialisers), `public/adoption-definitions.js` (`adoptionDefinition`,
  `unitDefinition`), `rc44-wp2-adoption-cases/parity.mjs` (topics 4–8), `rc44-wp2-adoption-cases/released.mjs`.
- Tests first:
  - parity (e.4) for the 13 composition options;
  - a released `architectureUnit` claim of kind `pattern` with placement and applicability can be started, bound and
    applied; its obligations appear on the adoption with the claim receipt pinned;
  - the same claim before its release, or verified by its own author, is refused by `adoption.start`;
  - a template with an unknown placeholder or a step outside the closed vocabulary is refused by `definitionIssues`;
  - an agent account sending `adoption.apply` is refused; a Sol draft's facts stay `unknown`.
  - **Fails today:** "apply a released pattern claim to an existing component" — no command accepts it; `patternIds`
    refuses any id that is not a Playbook id (`public/realisation-domain.js:38,238`).
- Done when: parity holds for topics 4–8; legacy handlers still present and green.

### S3 · Remaining built-ins, the surface, and retirement of the eight paths

- Depends on: S2.
- Owns: `public/adoption-builtins.js` (interaction, reads, persistence, boundary), `public/adoption-ui.js`,
  `public/architecture-task-ui.js`, `public/design-questions.js:104-109`, deletion of the retired handlers and builders
  (e.1 rows 1–3 and 5), `rc44-wp2-adoption-cases/parity.mjs` (topics 1–3 and boundary),
  `rc44-wp2-adoption-browser-validate.mjs`.
- Tests first: parity for the remaining 8 cases; browser: start an adoption from a component with no provider
  configured, answer conditions, bind two existing records and one new, read "created / reused / changed / stays open",
  apply, sign in as a second person, accept; the applier sees no Accept control and the command refuses them;
  a design question reads `decided` only when the adoption's conditions all hold.
  - **Fails today:** "the person who applied a design cannot be the one who accepts it" — today the applier types a
    reviewer name (`public/model-alternatives.js:95-96`).
- Done when: all 21 parity cases hold; the legacy handlers are deleted in that commit; the suites in e.5 that named
  `architecture.*` or `design.*` commands are re-pointed with their assertions unchanged; size gates measured and met.

### S4 · Questions, bounds, deviations and composition

- Depends on: S1 (parallel with S2 and S3).
- Owns: `public/adoption-domain.js` functions `adoptionImplementation`, `adoptionInvalidators` and the composition part
  of `adoptionReading` (companions, shared parameters, cross rules, orphan), `public/adoption-document.js`,
  `public/sdd-architecture.js:834-838,894-900`, the `pattern` branch of `public/model-dossier.js`,
  `rc44-wp2-adoption-cases/questions.mjs`.
- Tests first:
  - `adoptionImplementation` on the proof fixture names five roles, six relationships with their relation ids, and
    three obligations with their state;
  - `adoptionInvalidators` lists "state and intent no longer share one local transaction" with the record it is read
    from, and ends with what was not considered;
  - an outbox adoption with no duplicate-protection adoption on its consumer raises `adoption-companion-missing`;
  - two adoptions stating different `ordering` on one contract raise `adoption-parameter-conflict`;
  - the SDD prints definition, version and authority, "applied, not accepted by a second person" or the accepter,
    roles, parameters with basis, deviations with reason and reviewer, depends-on and does-not-cover, and keeps
    calculated, simulated, observed and approved evidence in separate columns;
  - an upgraded adoption prints no bounds and no acceptance.
  - **Fails today:** "ask where an applied outbox is implemented and get the store, the relay and the consumer by role"
    — no function or view answers it.
- Done when: the case file passes; the SDD suites (`sdd-architecture`) pass unchanged.

### S5 · Component selection

- Depends on: S1 (parallel with S2–S4).
- Owns: `public/adoption-selection.js`, `public/component-library.js:19,64-71,83-91`,
  `public/decisions-domain.js:187`, `public/component-library-ui.js`, the selection part of `public/adoption-ui.js`
  (its own exported function, added at the end of the file), `public/sdd-architecture.js:739`,
  `rc44-wp2-adoption-cases/selection.mjs`.
- Tests first:
  - three candidates against two hard constraints give rows pass, fail and unknown; the failing one cannot be chosen;
    the unknown one can be chosen only when named unproven, and approval evidence is then refused;
  - a row a person judged keeps their actor; an agent's judgement is refused;
  - a candidate-status profile can be read by the chooser and is refused by `selection.candidate`;
  - no result object has a `score`, `rank` or `weight` key, and candidates keep insertion order;
  - `selection.instantiate` saves the component through `realisation.candidate` with the pinned release and claim
    hash, links the decision, and creates the profile adoption with its obligations open;
  - a released concern compared through `selection.*` produces the same decision and alternatives as
    `public/architecture-design.js:93-124` did (parity for row 9), and an option with a failing `excludes` predicate is
    now ineligible;
  - the SDD prints the selection basis and each rejected candidate with its reason.
  - **Fails today:** "record a library candidate as rejected without creating it as a component" — an alternative may
    name only existing components (`public/decisions-domain.js:183`).
- Done when: the case file passes; `component-library-validate.mjs` and `rc42-g2-library-validate.mjs` unchanged and
  green.

### S6 · Close: remaining consumers, adapters, measurement

- Depends on: S3, S4, S5.
- Owns: every file in e.5 not yet moved; the three adapters in e.2; `public/realisation-ui.js:76`;
  `rc44-wp2-adoption-cases/close.mjs`.
- Tests first: a grep-style assertion that no module outside `adoption-upgrade.js` reads
  `applied.reasoningGraph.solution`; an exchange, a security and an operation task accepted today produce an adoption
  record; Sol's packet for a component names its adoptions from the adoption record; the size report shows the route
  below its S1 figure.
- Done when: one authority for applied mechanisms; the adapters in e.2 are the only temporary code, each with its named
  retirement; the full regression is classified against the baseline.

---

## h. Proof scenario (synthetic fixtures only)

System family: **transactional**. Fixture project "Fernhill Events — seat reservations" (`rc44-wp2-fixtures.mjs`),
invented for this test; no client material.

Starting model: requirement REQ "A confirmed reservation always leads to a ticket being issued"; quality driver
"Integrity: no confirmed reservation without a ticket instruction" (measurable); hard constraint driver "Customer
records stay in region North"; responsibilities "Reserve a seat" and "Issue a ticket"; components `Reservation
service` (service), `Reservation store` (store), `Ticket events` (queue), `Ticketing worker` (worker); data
`Reservation` with authority `Reservation service`.

1. **Source concept.** "Transactional outbox". The decision-bearing definition is the built-in
   `composition-delivery-1 / transactional-outbox` (authority built-in, reference AWS-OUTBOX with its statement hash,
   `public/composition-knowledge.js:13`). The handbook profile "MSG 004 Transactional outbox relay"
   (`/home/user/hb-review/Enterprise_Component_Library_Part_1_Application_and_Resilience.md:7020-7038`) is loaded in the
   fixture as a **candidate** claim: readable, labelled "candidate · not reviewed", and refused by `adoption.start`.
2. **Explanation.** The Conditions step shows the built-in reference statement and, labelled, the candidate text.
3. **Model application.** `adoption.start` on REQ and the integrity driver. Facts: `deliveryContract: required`,
   `commitScope: same-store`, `duplicates: deduplicated`, `ordering: per-key`. Bindings: `processor` → Reservation
   service (reused), `store` → Reservation store (reused), `queue` → Ticket events (reused), `consumer` → Ticketing
   worker (reused), `relay` → new "Reservation outbox relay". Parameter `retention` left open. Deviation: "The relay
   runs inside the Reservation service process, not as a separate worker — one deployment unit is all the team
   operates."
4. **Consequences.** The review lists: created — one component, its responsibility, data "Publication intent", one
   lineage, the contract "Business delivery", capabilities and the operating plan; reused — four components and the
   data definition; changed — the store's interactions; stays open — obligations `delivery-intent`, `delivery-effect`,
   `delivery-recovery`, the parameter `retention`, one deviation to review. Person A applies. Person B accepts and
   acknowledges the deviation; person A's attempt is refused.
5. **Challenge.** "What would make it stop being valid?" lists the same-store commit, the consumer's duplicate
   protection, the relay binding and the pinned method. Then a command moves "Publication intent" to another store's
   authority: in that commit the tracker sets review required, the precondition reads `blocked`, and
   `adoption-contraindicated` (E) appears in Chapter 5 and Chapter 11. Behavioural challenge (two reservations racing
   for one seat) belongs to wp4; the adoption shows its evidence row of kind `simulated` as `required`.
6. **Evidence.** `delivery-effect` becomes a Chapter 11 action; person B (not its author) marks it verified with a
   confirmed evidence source. The obligation reads `current-verified`; the adoption's evidence table still shows
   `observed: none` — the verification is an architect-recorded review, and the table says so.
7. **Component selection.** For "Issue a ticket": `selection.start`; candidates — a released synthetic profile "Inbox
   and deduplication component" (facts state its data location), a project library entry "Ticket consumer v2" (no
   facts), and the archetype the catalogue offers. Against "Customer records stay in region North": pass, unknown,
   unknown. Person A judges the library entry `fail` with evidence, chooses the profile, records why each other was
   rejected; `decision.record`, `decision.accept`; `selection.instantiate` saves the component pinned to the release
   and claim hash and creates the profile adoption; person B accepts it.
8. **SDD.** §3 prints the selection basis, the eligible and rejected candidates and reasons. §4 prints, for the outbox:
   definition, version and authority; roles and bound records; parameters (`retention` open); the deviation with its
   reason and reviewer; depends-on and does-not-cover ("does not make the consumer's effect exactly-once"); obligations
   with state; "applied by A, accepted by B". The document's standing line "does not establish live implementation,
   external approval, or production readiness" is unchanged.

The browser suite walks steps 3–5 and 7; the node suite asserts 1–8 on the documents.

---

## i. Gaps, risks and limits

### Closed by this package

K-01, K-02, C5-01, C5-04, C5-05, C5-06, C5-14, C5-21, X-11; the deep dive's selection gaps "picker does not start from
the responsibility", "no component-selection decision", "trace from responsibility to profile broken", and profile
pinning with drift reading.

### Closed in part (what is delivered, what is left)

- **C5-07** — typed parameters on adoptions with unit, scope, basis and failure-if-wrong. Left: moving Chapter 9 control
  parameters onto the same row type, per-kind attribute templates (wp1 content), work bounds per traffic class (wp3).
- **C5-08, X-12** — required companions, shared-parameter agreement and bounded cross rules between adoptions. Left: a
  composition record with an assumption register and walkthrough (wp4), recipes as released knowledge (wp1),
  invariant-anchored joint acceptance (wp4).
- **X-04** — bounded claim on adopted mechanisms, printed in the SDD. Left: bounds on property rows that no adoption
  backs.
- **C5-18** — a boundary change is the `structure` adoption with its decision; `independentNeed` becomes a predicate
  only in a new built-in version (`composition-structure-2`), never by changing version 1. Left: replacement-contract
  check and migration link (wp5).
- **C5-20** — build, buy and reuse are candidate kinds in a selection. Left: fit-gap, sourcing experiment, exit (wp9b).
- **C5-23** — pinned definition versions, supersession and drift review. Left: side-by-side generations, retirement
  preconditions (wp5, wp9a).
- **X-22** — a Chapter 10 plan or Chapter 7 realisation can be bound to a role, which links it to the deciding
  decision. Left: deployable, data-store and runtime-instance elements (wp9a).

### Deferred, with the reason

- **C5-03** application deployable: a new record type and views; it is wp9a's topology model. This package binds it
  when it exists.
- **C5-09** typed ports: derived from Chapter 8 contracts; a views and contract concern (wp7, wp4).
- **C5-16** authored walkthrough and failure path check: needs the bounded evaluators (wp4).
- **C5-17** responsibility map: a view (wp7); bindings carry `failureOwner` for it.
- **C5-22** AI component category and obligations: needs released AIN profiles (wp1) and a Chapter 6 category (wp9a).
  Once released, their obligations arrive through the profile adoption with no further work here.

### Risks

1. **Parity is large.** 21 cases with topic-specific writes. Mitigation: built-ins may keep materialiser code; the
   legacy handlers are deleted only in the commit where parity holds; slices S2 and S3 split the topics.
2. **Size gates.** The route has about 5 KB spare for the whole upgrade and the script count is exact. The estimate
   here is unmeasured. A static import of an adoption module from a second lazy chunk adds a script. Mitigation: the
   import rule in d.3; measure at the end of S1, S3 and S6; if S1 exceeds 0.6 KB, move the `design-questions` and
   `model-reversal` edits to S6.
3. **A new trace layer.** Consumers read layers by name (only `public/trace-kernel.js` enumerates `TRACE_LAYERS`), but
   a view that lists all layers of a trace would show `mechanism`. Mitigation: the rc42 trace suite stays unchanged;
   S1 adds a case that the trail, the matrix annex and the ARS are unchanged for a project with no adoption.
4. **Design fingerprint.** Adding adoptions to the design source could move every stamp. Mitigation: the D14 conversion
   precedent and e.3 rule 2 as a test.
5. **Second person in a one-person project.** `adoption.accept` can never be sent there; adoptions stay "applied, not
   accepted" with a W finding. This is intended and is shown as such; it blocks nothing that does not block today.
6. **Stored readings can lag** for time-based expiry (c.3). Documents read fresh; the Validate list may lag until the
   next command.
7. **Released definitions are thin today.** `architectureUnit` has no relationships or parameters, so a released
   pattern adopts with roles, preconditions and obligations only until wp1 extends the forms.
8. **Legacy obligation references.** Chapter 11 actions hold `{taskId, solutionId, obligationId}`. They are resolved,
   not rewritten; e.3 rule 3 guards the digest.

### What this package cannot honestly deliver yet

- **The handbook component profiles as selectable, gating knowledge.** They are AI-generated candidate content. They can
  be imported and read. Releasing them needs a second authorised person and a licence review; neither is impersonated.
  Until then selection works on released claims, project and signed organisation entries, and catalogue archetypes.
- **Mostly-evaluated eligibility.** Hard constraints are prose today; without typed gates (wp9b) and typed profile
  facts (wp1) most rows are `unknown` and a person judges them. The check is deterministic and honest, not yet
  informative.
- **"What would make it stop being valid" beyond recorded facts.** It reads the model. It does not execute behaviour
  (wp4) or compare with an observed system (wp6), and says so in its result.
- **Observed evidence.** Evidence rows distinguish calculated, simulated, observed and approved, but this package
  produces none of them; it records what is required and reads today's architect-recorded verification.
- **RC43's thirty methods.** Not in this repository; nothing here depends on them.
- **Production acceptance, independent architecture review, licence approval.** Not claimed. The SDD passages state the
  true status of each adoption: who applied it, whether a second person accepted it, and what remains open.
