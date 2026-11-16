# wp4-behaviour — Behaviour AIW can evaluate (Change 3, addition A5)

**Design date:** 2026-11-16 · **Source line:** rc.10.73.42 (`.claude/worktrees/integration/AIW-V5-Local-Source`) · **Status:** design only; no
product code changed; `productionAccepted` stays false.
All paths below are relative to the product source unless they start with `/`. "Route" means the chapters route measured by
`client-bundle.mjs`.

**In one paragraph.** Four optional declarative forms are added to records that already exist (a business rule's decision table, a
data definition's facts and state semantics, an invariant's evaluable predicate and consistency mode, a contract's operation steps
and transaction boundaries), plus one new record kind, the *challenge case*, and one evidence overlay, the *simulated run*. Three
pure, bounded evaluators (tables, state models, an interleaving and fault explorer) read those forms through the existing
three-valued predicate engine. A person records a run through a new `behaviour.*` command family; the server recomputes the
result, labels it *simulated, model-level*, and keeps the trace. A second signed-in person reviews a run before it may be cited.
Everything interactive lives in one new lazily loaded script; the route gains about 0.9 KB of hooks.

---

## a. What exists today, and what is missing

### a.1 Verified in the code

| Subject | What exists | Evidence |
|---|---|---|
| Three-valued condition engine | `evaluateApplicability(rule, facts)` over `requires`/`excludes` predicates `{fact, op, value}`; operators `eq neq oneOf includes gte lte gt lt present`; a missing or `unknown` fact gives state `unknown`, never false; result `excluded / needs-context / context-match` with per-check detail | `public/architecture-facts.js:5`, `:11-16`, `:18-28`, `:30-44` |
| Engine consumers | contract execution composition, product and knowledge scope, design tasks (7 files call it) | `public/architecture-applicability.js:61-180`, `public/product-applicability.js`, `public/composition-knowledge.js`, `public/persistence-knowledge.js`, `public/read-design-knowledge.js` |
| Execution agreement (declared, never inferred) | `contract.execution`: `delivery, publication, repetition, identity, protection, changedIntent, timeout, completion, discovery, …`; blockers for retained intent, repeat protection, truthful uncertain outcome; one generic `crash-window` obligation sentence | `public/composition-manifest.js:54-77`, `public/architecture-applicability.js:14-33`, `:78-89`, `:174` |
| Failure walkthroughs (recorded, `simulated:true`) | Chapter 6 capability or domain loss (`simulateTechnology`, recomputed by the handler, kept last 20 with a stamp); Chapter 10 zone loss; Chapter 9 threat walk; Chapter 4 and 5 journey-step tours | `public/technology-domain.js:383-411`, `:422`; `public/runtime-domain.js:299-311`; `public/security-domain.js:177`; `public/logical-domain.js:207`; `public/realisation-domain.js:364-367` |
| Walkthrough recording dialog | "a prediction from declared architecture, not a measured failure test or architecture approval"; needs all four stages seen | `public/model-walk.js:7-21`; callers `public/platform-view.js:531`, `public/deploy-view.js:535` |
| Contract payload probe | `evaluateContract` checks a synthetic payload against the flat dictionary for scenarios `normal / duplicate / timeout`; `interfaces.check` records it (CT-nnn, last 120) | `public/interfaces-domain.js:391-399`, `:426` |
| Business rule (Chapter 1, artefact type `rule`) | `value, unit, currency, effectiveDate, authority, instrument, section` and links `refinesId, dataId, controlId, requirementIds` | `public/requirements-domain.js:177-178`, `:210-214`; `public/record-fields.js:114` |
| Process gateway | an exclusive or inclusive gateway needs condition *text* on each outgoing flow; nothing links it to a rule | `public/process-model.js:149-152` |
| Data lifecycle (Chapter 8) | `{field, states ≤ 40, transitions ≤ 200}`; a transition is `{from, to, contractId}` or `{from, to, trigger:{kind:'schedule'}}`; two link checks only | `public/interfaces-domain.js:52-55`, `:166-176`, `:367` |
| Invariant (Chapter 8) | `title, condition (prose), kind (balance, uniqueness, ordering, completeness, other), check, owner, dataIds, contractIds`; findings test check, owner, links and a posting guard | `public/interfaces-domain.js:34-40`, `:254-258`, `:369-370`; `public/record-fields.js:164` |
| Command boundary | `commandHandler(type)` by prefix; author resolved and review claims refused before load; handler called `(document, command, at, actor, {author, revision})`; authorship stamped; journal; undo receipt; activity row; one save | `worker.js:101-107`, `:603`, `:638-640`, `:644`, `:654`, `:659` |
| Actor and second-person helpers (rc.10.73.42) | `commitAuthor`, `isReviewCommand`/`REVIEW_TYPES`, `claimsReview`, `refuseUnreviewable` (agent and Sol-draft refused); `verifierRefusal(a, actor, account)` and `independentVerification`; `approvalIndependent`; `independentRiskApproval`; `independentApproval`; `fourEyesOn`; four-eyes in `settle` | `authorship.js:25-36`, `:39-41`, `:48-66`; `public/architecture-obligations.js:35-39`; `public/technology-realisation-domain.js:104`; `public/security-domain.js:69`; `public/review-domain.js:319`; `public/changes-domain.js:213`; `public/provenance.js:382-405` |
| Undo of recorded walkthroughs | latest-action receipts for `technology.simulation`, `runtime.simulation`, `logical.scenario` | `public/action-undo-domain.js:6`, `:19-29` |
| One trace reading | record graph (`OBJECT_TYPES`, `RECORD_COLLECTIONS`, `recordRelations`) walked by the trace kernel (`servingRequirements`, `linkedVia`) | `public/record-graph.js:15-58`, `:70-79`, `:108-202`; `public/trace-kernel.js:19`, `:164`, `:195` |
| Design fingerprint and evidence overlay | `reviewSource` keeps every top-level key except seven; `OVERLAY` names each chapter's evidence records and markers | `public/review-domain.js:50`, `:72` |
| Supplementary findings | one list folded into the inherited findings | `public/review-domain.js:174`, `:219` |
| Server-only read hook | `registerReadingsUpgrade(p => upgradeOwnership(upgradeReadings(p)))`, run by `withFinalReview` | `public/readings-upgrade.js:294`; `public/review-domain.js:146`, `:151`; `worker.js:90-92` |
| Size gates | route cap 3158 KiB with 3,228,667 B measured (about 5.1 KB spare); `scripts: 148` exact; `tiny: 61`; stylesheet 881 KiB with 901,726 B measured at rc41 | `client-bundle.mjs:229-230`, `:264`, `:294-295`, `:336-338` |

### a.2 What is genuinely missing

1. **No evaluable behaviour anywhere.** The engine composes *declared option values*; its own header says "No expression evaluation, prose
   inference or quality-achievement claim occurs here" (`public/architecture-facts.js:1-3`) and the composition says it "neither
   infers prose nor executes/simulates the business operation" (`public/architecture-applicability.js:49-51`).
2. **No decision table** (C1-06): a rule is one value; `grep` for hit policy or DMN finds nothing.
3. **State semantics** (C8-05): no category, terminality, guard, evidence, authority, owner or deadline; no reachability check.
4. **Invariants are prose** and are compared with nothing (C4-03, C5-11). They are **not in the record graph** at all
   (`RECORD_COLLECTIONS`, `public/record-graph.js:74-78`, has no `interfaces.invariants` entry), so no trail reaches one.
5. **No operation model**: a contract has policy prose and an execution agreement, but no steps, guard, effects or transaction
   boundary (`public/record-fields.js:165-170`).
6. **No competing-operation, repeat, timeout, cancel, lost-reply or crash analysis** and no crash-window table (C8-08, C5-16).
7. **No counterexample trace** format.

### a.3 What the target description assumes that is not here

The target says RC43 "already represents commands, authoritative facts, invariants, consistency boundaries and guarded workflows"
in Stage 4. In this repository Chapter 4 holds responsibilities, groups, connections, mappings and a step tour
(`public/logical-domain.js:205-207`); a responsibility has no invariant or owned-fact field (`public/record-fields.js:136`, as the
gap review verified). There is no `design-contracts.js` and there are no thirty design methods. So in this design a **command is a
Chapter 8 contract of kind request**, an **authoritative fact is a declared variable of a Chapter 8 data definition**, and Chapter 4
receives two links only: the responsibility that coordinates an invariant, and the responsibility a challenge case names.

---

## b. Records

### b.0 Shared grammar (all forms)

- **Variable id**: `<dataId>.<name>`, for example `dat-001.available`. It must pass `safeFactKey` (`public/architecture-facts.js:6`).
- **Value**: a finite number, a string ≤ 120, a boolean, or a list of ≤ 16 such scalars. `null` means *not stated* and reads as
  `unknown` (`unknownValue`, `public/architecture-facts.js:8`).
- **Term**: a value, or one of `{var: id}`, `{arg: name}`, `{sum: [varId, …]}` (≤ 6, numbers), `{count: varId}` (length of a list).
- **Predicate**: `{left: term, op, right: term, label}` with `op` in `eq neq oneOf includes gte lte gt lt present`
  (`APPLICABILITY_OPERATORS`). The evaluator resolves both terms to scalars, writes the left one as a synthetic fact and calls
  `evaluateApplicability`; it adds no comparison of its own. An unresolved term gives `unknown`.
- **Condition**: `{requires: [predicate], excludes: [predicate], text}`. `text` (≤ 600) holds whatever the grammar cannot express. A
  condition with non-empty `text` is **not evaluated** as a whole: its verdict can be `violated` (a stated predicate is definitely
  false) or `not-evaluated`, never `preserved`.
- **Effect**: `{var, op: 'set' | 'add' | 'sub' | 'append' | 'remove', value: term}`.
- **Form envelope**: every form is `{v: 1, state: 'proposed' | 'authored', version: n, author: {kind, by, at}, versions: [{version,
  at, by, body}] (last 3), …body}`. `state` is `proposed` when the commit's author is an agent account or a Sol draft
  (`authorship.js:35`), whatever the payload says. A proposed form is shown, labelled, and read by no evaluator and no check.

### b.1 Extended records (all additions optional; absent on every existing record)

| Record (existing) | New key | Body | Why this key survives saves |
|---|---|---|---|
| Chapter 1 artefact, `type: 'rule'` | `decisionTable` | `hitPolicy: 'unique' \| 'first' \| 'priority' \| 'collect'`; `inputs[≤ 8] {id, name, type: number \| integer \| boolean \| enum \| string, unit?, min?, max?, step?, values?[≤ 24], missing: 'reject' \| 'clarify' \| 'row', source?: {dataId, field}}`; `outcomes[≤ 12] {id, label, class: 'approve' \| 'reject' \| 'refer' \| 'other'}`; `rows[≤ 60] {id, when: [{input, op, value}], outcome, priority?, note?}` (a closed or open bound is the choice of `gte`/`gt`, `lte`/`lt`); `noHit {outcome \| null, owner, response}`; `default? {outcome}`; `examples[≤ 40] {id, inputs: {name: value \| null}, expected: outcomeId \| 'no-hit' \| 'input-rejected', note}` | `cleanRecord` keeps only a named list of extra keys; `'decisionTable'` is added to it (`public/requirements-domain.js:201`) |
| Chapter 8 data definition | `behaviour` | `vars[≤ 12] {name, type: number \| integer \| boolean \| enum \| list, unit?, field? (one of its fields), values?}`; `definitionVersion`, `inFlightMigration`; `states {<state name>: {category: initial \| pending \| received \| applied \| unknown \| terminal-success \| terminal-failure \| compensated, dimension: business \| attempt \| observation, meaning, owner, permitted: [submit \| lookup \| release \| compensate \| none], maxAge?: {value, unit, basis}, escalationOwner?}}`; `transitions[≤ 200] {from, to, by: contractId \| 'schedule', event, kind: normal \| timeout \| correction \| compensation, guard: condition, evidence, authorityId, effects[], versionGuard: bool}`; `forbidden[≤ 40] {from, to, reason}` | `saveData` does `Object.assign(d, next)` on the stored record (`public/interfaces-domain.js:223`). It is a sibling of `lifecycle`, never inside it, because `d.lifecycle` is replaced whole on a lifecycle save (`:219`, `:223`) |
| Chapter 8 invariant | `formal` | `{requires, excludes, text}` (a condition, b.0); `checkAt: 'quiescent' \| 'always'` (default quiescent: when every operation of the case has ended) | `saveInvariant` spreads the old record (`public/interfaces-domain.js:256`) |
| Chapter 8 invariant | `consistency` | `{mode: 'atomic' \| 'bounded-delay' \| 'compensated', coordinatorId (a Chapter 4 responsibility), decisionId?, maxDelay?: {value, unit, basis}, reconciliation?}` | same |
| Chapter 8 invariant | `isolation` | `{level (as stated, ≤ 120), anomalies[≤ 4] {kind: lost-update \| write-skew \| read-skew \| phantom, status: ruled-out \| accepted \| open, reason, caseId?}, retryPolicy, evidenceRef}` | same |
| Chapter 8 invariant | `progress` | `{deadline: {value, unit, basis}, exceptionOwner}`; with `kind: 'progress'`, a new member of `INVARIANT_KINDS` (`public/interfaces-domain.js:34`) | same |
| Chapter 8 contract | `behaviour` | `args[≤ 8] {name, type, unit?}`; `sameAs?: contractId` (this entry channel runs that contract's operation); `steps[≤ 12] {id, kind: read \| guard \| write \| dedupe \| call \| emit \| commit \| ack, tx?, label, read?: [varId], guard?: condition, onFail?: reject \| abort \| defer, effects?: [effect], call?: {contractId}, dedupe?: {keyVar, key: term, onSeen: return-prior \| reject}}`; `transactions[≤ 4] {id, protection: none \| lock \| serializable \| version-check \| conditional-write, vars?: [varId], onConflict: reject \| retry}`; `ack {step, attests: receipt \| durable-acceptance \| completion}`; `recovery[≤ 12] {position, durableState, callerKnows: accepted \| unknown \| rejected, ackVisibleTo, repeatPermitted: bool, recovery: retry-same-identity \| query-authority \| reconcile \| compensate \| none, recoveryContractId?, evidence, owner, negativeControl, dismissed?: {reason}}` | `saveContract` does `Object.assign(c, next)` on the stored record (`public/interfaces-domain.js:205-206`) |

Rules that hold for every extension:
- A form is written only by `behaviour.form` (c). The chapter's own save never reads or writes it.
- A dangling reference (a state, field, contract or variable that no longer exists) is a finding `behaviour-link` (to fix), the
  same treatment `lifecycle-link` gives today (`public/interfaces-domain.js:367`). It is never repaired silently.
- Nothing is inferred for an existing record: no predicate from `condition` prose, no state category from the order of `states`
  (the picture's "first state is Initial" stays a drawing convention), no steps from policy prose.

### b.2 New section `p.behaviour` (absent until the first behaviour command)

```
p.behaviour = {
  schemaVersion: 1,
  counters: {case: 0, run: 0, review: 0},
  cases:   [ChallengeCase],   // design records; in the design fingerprint
  runs:    [BehaviourRun],    // overlay: simulated evidence
  reviews: [RunReview],       // overlay
  reading: {evaluator, basis, findings: [...], lines: {<recordId>: [Line]}}   // overlay, derived (d.3)
}
```

**ChallengeCase** — id `bc-001`, ref `BC-001`; record lifecycle `proposed → authored → retired` through the one lifecycle family
(`record.keep`, `record.retire`, `record.restore`).

| Field | Meaning |
|---|---|
| `title` (R, ≤ 160), `question` (≤ 600), `owner`, `source` | what the case tries to break, and who owns it |
| `kind` (R) | `table`, `lifecycle`, `race`, `repeat`, `timeout`, `cancel`, `lost-reply`, `crash` |
| `targetIds` (R, 1–8) | the rule, data definition, contract or invariant under challenge |
| `invariantIds` (≤ 6) | the rules that must hold (R for every kind but `table`) |
| `responsibilityId?`, `requirementIds`, `requirementGroupIds` | the Chapter 4 responsibility entitled to decide; grounds |
| `initial {varId: value}` (≤ 24) | starting conditions; a variable left out is `unknown` |
| `actors[≤ 3] {id, label, contractId, args: {name: value}}` | the competing or repeated operations |
| `events[≤ 12] {by: contractId \| 'schedule', facts?: {…}}` | for kind `lifecycle`: the event sequence to walk |
| `fault? {kind: duplicate \| lost-reply \| timeout \| cancel \| crash, actor, at?: stepId \| 'each'}` | the injected condition |
| `bounds? {maxStates, maxInterleavings, maxDepth, retries}` | within the caps of d.2; defaults apply when left out |
| `notConsidered[≤ 12]` (each ≤ 200) | what the author says the case leaves out |
| `expectation?` | `violation-expected`, `no-violation-expected` or empty: the author's hypothesis, shown beside the verdict, never a verdict |
| `adoptionRef? {adoptionId, evidenceId}` | set when wp2 starts the case from an adoption (f) |
| `revision`, `history[≤ 24]`, `provenance`, `open` | as every design record |

**BehaviourRun** — id `brn-001`, ref `BRN-001`. Written only by `behaviour.run`; never edited.

```
{id, ref, at, actor, account, caseId, caseRevision,
 class: 'simulated', level: 'model',
 receipt: {packId: 'AIW-BEHAVIOUR-EVAL-1', version, fingerprint, kind},
 stamp,                                  // d.3: the case, the forms it read and the evaluator, fingerprinted
 observations,                           // the recorder's own words (R)
 result: Result,                         // b.3
 targets: [{kind: 'record', id} | {kind: 'adoption-evidence', adoptionId, evidenceId, evidenceKind: 'simulated'}],
 targetIds: [recordId],                  // flat, for the record graph
 withdrawn?: {by, at, reason}}
```

Kept: every run that has a review or a target of kind `adoption-evidence`, plus the latest 40 others (the pattern of
`technology.simulations`, `public/technology-domain.js:422`, with pinning added).

**RunReview** — id `brv-001`: `{id, at, actor, account, runId, runStamp, conclusion: 'counterexample-accepted' | 'no-violation-read' |
'inconclusive', notes (R), reviewed: true, withdrawn?}`. It records that a second person read the trace, its bounds and what it
leaves out. It approves nothing.

**States of a run as every surface words them** (one reader, `runState(p, run)`):
`simulated · recorded by <actor> · not reviewed` → `simulated · reviewed by <actor>`; and independently `current` or
`stale (the design changed since)`; `withdrawn`; `method withdrawn` (the evaluator pack is in `p.knowledge.withdrawals`, the rule
`executionMethodCurrent` applies at `public/architecture-applicability.js:36-39`).

### b.3 The result and the trace a person reads (`aiw.behaviour-trace/1`)

```
Result = {
  verdict: 'violated' | 'no-violation-within-bounds' | 'not-evaluated' | 'bounds-exceeded',
  explored: {states, transitions, interleavings, depth, complete: bool,
             limits: {maxStates, maxInterleavings, maxDepth, retries}},
  considered: [text],        // generated: "2 operations: A Reserve seat, B Reserve seat", "6 interleaving points", …
  notEvaluated: [{where, text, reason}],   // every predicate, effect or recovery the evaluator could not interpret
  outside: [text],           // the evaluator kind's fixed list + the case's notConsidered
  invariants: [{id, ref, verdict: 'violated' | 'preserved' | 'not-evaluated', atStep?}],
  trace: [Step] (≤ 64),      // the shortest violating path, or a representative complete path when none violates
  final: {vars: {varId: value}, outcomes: {actorId: 'done' | 'rejected' | 'conflict' | 'unknown' | 'crashed'}},
  affected: {invariantIds, requirementIds, driverIds, responsibilityId, contractIds, dataIds},
  witness?: {inputs, rowIds}  // kind table: the concrete input of a gap or an overlap
}
Step = {n, actor, actorLabel, contractId, stepId, what,
        changed: [{var, label, from, to}],
        rules: [{invariantId, state: 'holds' | 'violated' | 'unknown', detail}],
        note?}
```

The five things the owner asked for map one to one: *what happened* is `trace[].what`; *which state changed* is `trace[].changed`;
*which rule was preserved or violated* is `trace[].rules` and `invariants`; *which requirement is affected* is
`affected.requirementIds`, read from the trace kernel (`servingRequirements`, `public/trace-kernel.js:164`) for the case's
contracts and data plus the invariant's own grounds; *what remains outside the analysis* is `outside`, `notEvaluated` and
`explored.limits`.

Verdict rules, in this order: any `unknown` guard or invariant predicate on the explored path gives `not-evaluated`; a state where an
invariant predicate is definitely false gives `violated` (valid even when the bounds were hit); bounds hit without a violation gives
`bounds-exceeded`; otherwise `no-violation-within-bounds`. No verdict is ever worded "passed", "correct" or "safe".

---

## c. Commands

All are new, under the prefix `behaviour.`, handled by `applyBehaviourCommand(document, command, at, actor, {author})` in
`public/behaviour-domain.js`, registered once in `COMMAND_HANDLERS` (`worker.js:101`) as `['behaviour.', applyBehaviourCommand]`.
They pass through the existing boundary unchanged: authorship and refusal (`worker.js:603`), revision conflict (`:619`), the
handler (`:638`), the activity row and the save (`:659`). None is added to `STAGED_COMMANDS`
(`public/canonical-command.js:30`); see e.3 for why and what that costs.

| Type | Payload | Actor rule | Validation (refusals name the limit or the missing thing) | Audit | Undo |
|---|---|---|---|---|---|
| `behaviour.form` | `{subject: {kind: 'rule' \| 'data' \| 'invariant-formal' \| 'invariant-consistency' \| 'invariant-isolation' \| 'invariant-progress' \| 'contract', id}, form: {…} \| null, restoreVersion?: n}` | any signed-in editor. An agent account or a Sol draft may send it; the form is stored `proposed` | subject exists and is not retired; normalisers of `behaviour-forms.js` (limits of b.1; every reference resolves; variable ids pass `safeFactKey`; operators in the engine's list, anything else must be sent as `text`); `state` and `author` are never taken from the payload | form `version` and `versions[]`; one change-journal event shaped as the host record's own edit; activity row; the chapter's markers lapse as for any content edit: `p.interfaces.version++`, `review = null`, `handoff = null` for a Chapter 8 host (the statements at `public/interfaces-domain.js:431`), `p.contentVersion++` for a rule (`public/requirements-domain.js:134-135`) | `restoreVersion` writes an earlier body as a new version; nothing is lost |
| `behaviour.keep` | `{subject}` | a signed-in person; never an agent or a Sol draft (added to `REVIEW_TYPES`, `authorship.js:39`); with the project's four-eyes setting on, not the person who wrote the proposed form (`fourEyesOn`, `public/changes-domain.js:213`) | the form is `proposed` | `author` becomes the keeper with `from` the proposer's kind | `behaviour.form` with `restoreVersion` or `form: null` |
| `behaviour.case` | a patch of ChallengeCase (absent keeps, `null` clears) | as `behaviour.form`; an agent's case is `state: 'proposed'` | targets and invariants exist; `initial` names declared variables; actors name contracts with an authored `behaviour` form; bounds within caps; ≤ 200 cases | `history`, authorship through `stampWritten` (`public/provenance.js:462`), journal event | `record.retire` and `record.restore` (the one lifecycle family; `'behaviour.cases'` joins `COLLECTIONS`, `public/record-lifecycle.js:50`) |
| `behaviour.run` | `{caseId, reviewed: true, observations, seen: {trace, bounds, outside}}` | a signed-in person. `reviewed: true` makes `refuseUnreviewable` refuse an agent or a Sol draft (`authorship.js:46-66`) | the case is authored and every form it reads is authored; the evaluator pack is not withdrawn; `observations` present; all three `seen` flags true. **The server recomputes the result**; a result sent by the client is ignored (as `technology.simulation` recomputes, `public/technology-domain.js:422`) | the run itself (`actor`, `account`, `at`, `receipt`, `stamp`); activity row | none by design: evidence history is append-only. A run recorded in error is withdrawn |
| `behaviour.review` | `{runId, conclusion, notes, reviewed: true}` | **a second signed-in person**, whatever the four-eyes setting: not the run's recorder, not a writer of the case or of any form the run read, not the case's owner by name; never an agent or Sol. Enforced twice: `REVIEW_TYPES` at the door, and `runReviewRefusal` in the handler, which builds `{id, actor, history, owner}` and calls the existing `verifierRefusal` (`public/architecture-obligations.js:38`) | the run is current and not withdrawn; `runStamp` equals the run's stamp | RunReview with `actor` and `account` | `behaviour.withdraw` |
| `behaviour.withdraw` | `{runId \| reviewId, reason}` | the recorder of that run or review, or a reviewer role | reason present | `withdrawn {by, at, reason}`; the record stays and reads "withdrawn" | not reversible; record again |

A run recorded before a legacy project gained actors cannot exist (the section is new), so there is no "no actor" legacy case to
read; a run or review without `actor` is refused.

---

## d. Modules, hooks and the surface

### d.1 New modules (all pure except the lab)

| Path | Exports | Purity |
|---|---|---|
| `public/behaviour-forms.js` | `BEHAVIOUR_LIMITS`, `PRED_OPS`, `normaliseDecisionTable`, `normaliseDataBehaviour`, `normaliseInvariantForms`, `normaliseOperation`, `normaliseCase`, `formOf(p, subject)`, `declaredVariables(p)` | pure; throws `Error` with the user's words, as `normaliseContractExecution` does (`public/architecture-applicability.js:14-33`) |
| `public/behaviour-eval.js` | `BEHAVIOUR_EVALUATORS` (the manifest), `EVALUATOR_KINDS`, `evaluatorFingerprint()`, `resolveTerm`, `conditionVerdict(condition, state)` (wraps `evaluateApplicability`), `evaluateDecisionTable(table, limits)`, `analyseStateModel(lifecycle, form, context)`, `walkLifecycle(…)` | pure, deterministic: no clock, no randomness, no I/O |
| `public/behaviour-explore.js` | `exploreCase(model, kase, limits) → Result`, `crashPositions(operation, execution)`, `faultSchedules(…)` | pure, deterministic |
| `public/behaviour-domain.js` | `applyBehaviourCommand`, `withBehaviour`, `assembleCase(p, caseId)`, `runCase(p, caseId)`, `caseStamp`, `runCurrent`, `runState`, `runReviewRefusal`, `independentRunReview`, `simulatedEvidenceFor(p, target)`, `behaviourConsequences(prior, next)`, `behaviourNextStep(p, subject)` | pure over the document |
| `public/behaviour-reading.js` | `behaviourReading(p)` (the static checks and the run-driven findings and lines), `refreshBehaviourReading(p)` | pure; the refresh writes only `p.behaviour.reading` |
| `public/behaviour-lab.js` | `openChallenge(detail)`, `mountChallengeView(host, selection)`, `leaveChallengeView()` | DOM; the one client importer of the five modules above |

`BEHAVIOUR_EVALUATORS = {id: 'AIW-BEHAVIOUR-EVAL-1', version: '1.0.0', kinds: EVALUATOR_KINDS}`; its fingerprint is
`digest(manifest)` (`public/brain-integrity.js`), the construction of `executionFingerprint`
(`public/architecture-applicability.js:35`).

### d.2 The evaluators, their bounds and what each does not consider

| Kind (`EVALUATOR_KINDS[].id`) | Reads | Does | Caps (default) | Fixed "outside this analysis" |
|---|---|---|---|---|
| `decision-table` | a rule's `decisionTable` | builds the critical points of each input (every bound, the bound ± `step`, `min`, `max`, every enum value, and `null` for missing); evaluates each combination and each example three-valued; reports overlaps and gaps **with a witness input**, uncovered or doubly covered endpoints, examples whose expected outcome differs, and any combination where a missing input reaches an outcome of class `approve` | 20,000 combinations (same) | "the table as declared, not the code that implements it"; "values between critical points are represented by those points"; "input freshness and source quality" |
| `state-model` | a data definition's `lifecycle` and `behaviour` | exact reachability over ≤ 40 states and ≤ 200 transitions; terminality; the C8-05 rules of d.3; for a `lifecycle` case walks the event sequence, choosing transitions by guard (unknown guard: stop, `not-evaluated`) | the record's own limits (`public/interfaces-domain.js:52`) | "timers and calendars"; "in-flight instances of an earlier definition version"; "who actually holds the stated authority" |
| `interleaving` | contracts' `behaviour`, data `vars`, invariants' `formal`, the case | breadth-first exploration of every interleaving of ≤ 3 operations, with state memoisation; invariants checked at `checkAt`; returns the shortest violating path | `maxStates` 5,000 (2,000); `maxInterleavings` 5,000 (1,000); `maxDepth` 64 (32); `retries` 2 (1); 3 operations; 12 steps each; 24 variables | "the database engine's isolation as implemented"; "lock waits, deadlocks and lock timeouts"; "more operations than the case names"; "time, latency and load"; "any effect not written as a step" |
| `outcome-uncertainty` | the above plus `contract.execution` (`identity`, `protection`, `timeout`, `changedIntent`, `repetition`; `public/composition-manifest.js:58-63`) | derives fault branches: a duplicate delivery with the same or a new identity; a reply lost after a `call` effect; a timeout explored both ways (effect applied, effect not applied); a competing cancel. The caller's next move follows the declared `timeout` meaning | as `interleaving` | "the provider's real behaviour"; "how long uncertainty lasts"; "manual reconciliation steps written as prose" |
| `crash-recovery` | the above plus `contract.behaviour.recovery` | stops one operation at each derived crash position; applies only durable effects (writes of a committed block; buffered writes of an uncommitted transaction are discarded); runs the declared recovery for that position; checks invariants and that no outcome is left `unknown` without an owner | as `interleaving`; 12 positions | "crashes inside a step"; "storage corruption and partial writes"; "the recovery procedure as operated" |

Interleaving semantics, stated so two engineers build the same thing:
1. A state is `{vars, versions (one counter per variable, raised on every write), per actor: pc, local snapshot, read versions,
   buffered writes, retries, outcome, seen identities}`; its key is the JSON of that object with sorted keys.
2. A **block** is the unit that cannot be interleaved. Consecutive steps sharing a `tx` whose transaction has protection `lock`,
   `serializable` or `conditional-write` form one block. Under `none` and `version-check` every step is its own block.
3. `read` copies the named variables and their versions into the actor's snapshot. `guard` evaluates over the snapshot for variables
   the actor has read, otherwise over the shared state (which counts as a read then). A false guard ends the operation with
   `onFail`; an unknown guard ends the exploration with `not-evaluated`.
4. `write` under `none` applies at once: `set` computes from the actor's snapshot (so a stale decision is visible), `add` and `sub`
   apply the delta to the shared value. Under `version-check` writes are buffered and applied at `commit` only if every read
   version is unchanged; otherwise the operation ends `conflict` or restarts once per `retries`.
5. `dedupe` looks its key up in a list variable inside the same block as the effect it protects: `return-prior` ends the operation
   `done` with no further effect.
6. Exploration is breadth-first from the initial state, actors in case order, so the first violation found is a shortest one and
   the result is identical on every run. `interleavings` is the number of distinct complete paths, counted over the explored graph
   (it is acyclic: every block advances a pc or a retry counter).
7. Limits are counts only. No evaluator stops on elapsed time, because a time limit would make the verdict depend on the machine.

Where it runs: the lab previews in the browser inside the lazy script (bounded work: at most 5,000 states of at most 24 variables);
the recorded result is always recomputed by the server inside the command, so no Web Worker script is needed and the script count
grows by exactly one.

### d.3 The stored reading (how findings reach the route without evaluator code)

The route cannot afford the static checks (they need `behaviour-eval.js`). So the server keeps their result in the document:

- `refreshBehaviourReading(p)` is chained into the server-only read hook: `registerReadingsUpgrade(p =>
  refreshBehaviourReading(upgradeOwnership(upgradeReadings(p))))` (`public/readings-upgrade.js:294`). `withFinalReview` runs it on
  every server read and on every command result before the save (`worker.js:620`, `:624`, `:638`).
- It returns at once when `p.behaviour` is absent. Otherwise it computes `basis = valueFingerprint([evaluator fingerprint,
  p.behaviour.cases, runs, reviews, p.contentVersion, p.logical?.version, p.realisation?.version, p.interfaces?.version,
  p.knowledge?.withdrawals])` and recomputes only when the basis moved. It writes no timestamp, so the same design always gives
  the same reading.
- A frozen baseline's source is read with `{upgrade: false}` (`public/review-domain.js:151`) and keeps the reading it was frozen with.
- `reading.findings[]` are complete finding objects `{id, code, chapter, objectId, title, detail, level}`. The route folds them
  where supplementary findings already are: `...list(p.behaviour?.reading?.findings)` in `inheritedSupplement` and `evidenceRaw`
  (`public/review-domain.js:174`, `:219`). Client and server therefore read the same findings with the same stamps.
- `reading.lines[recordId]` are the one-line summaries documents print: `{text, class: 'declared' | 'calculated' | 'simulated',
  runId?, current, reviewedBy?}`.

Finding codes (all rule-based; none is scored; W = to confirm, E = to fix):

| Code | Level | Chapter | Raised when |
|---|---|---|---|
| `behaviour-proposals` | W | host's | proposed forms or cases wait for a person (one finding per chapter, as proposals are grouped today) |
| `behaviour-link` | E | host's | a form names a state, field, variable, contract or record that is gone |
| `dt-overlap` | E under `unique`; W "shadowed row" under `first`/`priority` | 1 | two rows definitely match one input; the witness is in the detail |
| `dt-gap` | E | 1 | a point of the declared domain reaches no row, and no `default` or owned `noHit` outcome exists |
| `dt-endpoint` | W | 1 | a bound's endpoint is covered by no row, or by two |
| `dt-missing-approves` | E | 1 | with an input missing, an outcome of class `approve` is reached |
| `dt-missing-undeclared` | W | 1 | an input states no `missing` handling |
| `dt-example` | E | 1 | an example's expected outcome differs from the evaluated one |
| `dt-not-evaluated` | W | 1 | the combination cap was hit, or a row holds an unsupported condition |
| `sm-no-unknown` | E | 8 | a contract whose `execution.timeout` is `unresolved` moves the lifecycle and no state has category `unknown` |
| `sm-final-without-evidence` | E | 8 | a transition by a contract with an unresolved timeout or possible repetition reaches a final state with no `evidence` naming the outcome authority |
| `sm-timeout-to-failure` | E | 8 | an `unknown` state moves to `terminal-failure` by `timeout` or schedule |
| `sm-received-as-success` | E | 8 | a state of category `received` is also the lifecycle's only success end |
| `sm-dead-end` | E | 8 | a non-final state has no outgoing transition |
| `sm-owner-age`, `sm-unreachable`, `sm-terminal-exit`, `sm-unguarded`, `sm-authority-mismatch`, `sm-migration`, `sm-progress` | W | 8 | the warnings of C8-05, each as the gap file words it |
| `invariant-boundary` | W; E while `consistency.mode` is `atomic` | 8 | the authorities of its data and the providers of its contracts are more than one component, or realise responsibilities in different groups, and no mode with a coordinator or an accepted decision is recorded |
| `invariant-isolation-unanalysed` | W | 8 | the invariant binds more than one data definition or is of kind uniqueness, balance or completeness, and no anomaly row is recorded |
| `crash-repeat-unprotected` | E | 8 | a recovery row permits a repeat while `execution.protection` is `none` |
| `ack-empty-commit` | E | 8 | `execution.completion` is `acceptance` and no step is committed before the `ack` step |
| `crash-incomplete`, `crash-no-recovery` | W | 8 | repetition is possible and positions lack rows; delivery is required and a position has no recovery |
| `dual-write` | W; E when `delivery` is `required` | 8 | a component that is the authority of, posts or produces a definition also calls or publishes through a contract with no execution agreement, or one whose `publication` is not `atomic-commit` |
| `behaviour-violation` | E | 8 | the latest current run of a case is `violated` |
| `behaviour-not-evaluated` | W | 8 | the latest current run is `not-evaluated` or `bounds-exceeded` |
| `behaviour-stale` | W | 8 | the latest run of a case is no longer current |
| `behaviour-unreviewed` | W | 8 | a current run has no independent review |

`sm-*`, `dt-*`, `invariant-*`, `crash-*`, `ack-*` and `dual-write` are raised only for **authored forms** (and `invariant-boundary`,
`invariant-isolation-unanalysed`, `dual-write` only when the project holds a `behaviour` section, so no existing project gains a
finding by upgrading). The four `behaviour-*` run findings exist only when someone recorded a run.

### d.4 Existing files touched (narrow hooks only)

| File and place | Change | On the route? |
|---|---|---|
| `worker.js:101` | add `['behaviour.', applyBehaviourCommand]` and its import | server |
| `authorship.js:39` | add `'behaviour.keep'`, `'behaviour.review'` to `REVIEW_TYPES` | server |
| `public/readings-upgrade.js:294` | chain `refreshBehaviourReading` | server only (`worker.js:90-92`) |
| `public/sdd-architecture.js:998-1000` | after the Invariants and Lifecycles lines, print `p.behaviour.reading.lines` for the component's invariants, data and contracts (f.1 gives the wording); reads the stored lines, imports no behaviour module | server-built document |
| `public/requirements-domain.js:201` | add `'decisionTable'` to the retained keys | yes, 16 B |
| `public/interfaces-domain.js:34` | add `'progress'` to `INVARIANT_KINDS` | yes, 11 B |
| `public/record-lifecycle.js:50`, `public/provenance.js:56` | `['behaviour.cases', 8]` in `COLLECTIONS`; noun `'challenge case'` | yes, about 65 B |
| `public/review-domain.js:72`, `:174`, `:219` | `behaviour: 'runs reviews reading|counters'` in `OVERLAY`; the two supplement spreads of d.3 | yes, about 125 B |
| `public/record-graph.js:15-58`, `:74-78`, after `:188` | object types `invariant|Invariant|8|data` and `challenge|Challenge case|8|interaction`; collections `invariant:interfaces.invariants challenge:behaviour.cases evidence:behaviour.runs`; one loop that states `binds` (invariant → its data and contracts), `challenges` (case → its targets and invariants) and `evidences` (run → `targetIds` and its case) | yes, about 370 B |
| `public/workspace-ux.js`, beside the delegated listener at `:130-134` | one listener for `aiw:concept-capability`, `aiw:concept-action` and `aiw:challenge` that answers the capability from a five-name pattern and otherwise does `import('./behaviour-lab.js')` | yes, about 300 B |
| `public/instrument-tray.js:25-33` | a shared view `{id: 'challenge', label: 'Challenge', kind: 'intervention', q: 'Explore a declared behaviour within stated bounds and read what the trace shows.', offered: p => …}` (the pattern of the Module map, `:32`) | no (only lazy views import it) |
| `public/notation-view.js:85-88` | `loadBehaviourLab = () => import('./behaviour-lab.js')` beside `loadAnatomy` and `loadModuleUI`; mount it for view `challenge` | no (lazy) |
| `public/validate-view.js` (loaded at `public/workspace-ux.js:377`) | a "Behaviour" card: forms, cases and runs with their state, the findings by code, "Open in Challenge" | no (lazy) |

Not touched: `public/trace-kernel.js` (no new layer in this package; readers use `linkedVia`), `public/canonical-command.js`,
`public/action-undo-domain.js`, `public/architecture-facts.js`, `public/process-model.js`, `public/ars-document.js`.

### d.5 The surface

**Where.** The Model tab of Chapters 1, 4, 5 and 8 gains the shared view **Challenge**, offered once the project holds a rule, an
invariant, a data lifecycle or a kept contract. The Validate tab gains the Behaviour card. wp1's concept view, wp2's adoption view
and wp8's stage workspace open the same view by event (f.1). There is no control on the Work tab in this package.

**Three columns.**
1. *What can be challenged here*: the chapter's records that can carry a form, each with its state: "no evaluable form",
   "proposed", "declared", and its cases. Chapter 1 lists rules; Chapter 4 lists responsibilities with the invariants they
   coordinate and the cases that name them; Chapter 5 lists components with the contracts they provide; Chapter 8 lists invariants,
   lifecycles and contracts.
2. *Declare*: the editor of the selected form. Decision table: a grid with typed inputs, the hit policy stated in words, the no-hit
   and default rows apart, and the boundary examples below. State model: one row per state and per transition, a "deliberately
   omitted" list. Invariant: predicates built from declared variables, with a free-text remainder marked **Not evaluated**.
   Operation: ordered steps grouped by transaction with the protection chosen in words; the crash-window table generated from the
   steps and the execution agreement, each row for a person to complete or dismiss.
3. *Challenge*: starting conditions (every declared variable, "not stated" allowed), the competing actors, the injected fault, the
   bounds. **Run** previews. The trace reads top to bottom, one lane per actor, with the state table beside it, the violated rule
   marked, and three always-visible panels: *Considered*, *Not evaluated*, *Outside this analysis*. **Record this run** asks for
   observations and the three "I read…" confirmations, then sends `behaviour.run`. A recorded run shows its label from `runState`.
   **Review** appears only to a person who is allowed to review it, with the refusal's sentence shown to anyone else.

**Without a language model.** Everything above is deterministic. The guidance is `behaviourNextStep(p, subject)`: a fixed order of
questions per form ("Which facts does this rule protect? Declare them on DAT-001", "What must be true before the write?", "Which
steps commit together?", "Who else can run this at the same moment?"), each answerable in the editor. Starters are rules, never
generated text: "Add a competing copy of this operation", "Generate the crash positions", "Add the endpoints as examples".

**Sol.** No new model call. Sol may (a) explain a recorded run: the run and its case are added to the packet as a `brain-method`
source built like `executionMethodSource` (`public/architecture-applicability.js:40-47`), through the one seam
(`intelligence-provider.js` `modelCall`, as `architecture-request.js:2` names it); (b) propose form rows, which arrive as
`behaviour.form` from a Sol-draft author and are stored `proposed`. Sol never sends `behaviour.run`, `behaviour.keep` or
`behaviour.review` (refused at `worker.js:603`), and never fills a threshold, a bound or an initial value: the existing withholding
of unsourced numbers applies to the proposal.

**Lazy boundary and bytes.**
- One new lazy entry, `public/behaviour-lab.js`, about 45 KB minified with the five modules it alone imports on the client
  (forms 7, eval 9, explore 8, domain and reading 9, UI 12). Scripts: 148 → **149**. Justification: the evaluators are used from four
  chapters and three other packages' surfaces through one event, and no existing lazy chunk's users need them; hosting them in
  `exchange-task-ui.js` or `validation-models.js` would make those surfaces load 45 KB they do not use. If the lead does not move
  the exact gate (`client-bundle.mjs:294`), the fallback is a static import from `public/validation-models.js` (lazy at
  `public/validate-view.js:219`), at the cost of that chunk's size.
- The five modules must have **no second client importer**: a second lazy importer would make esbuild split a shared chunk and add
  a script. The SDD reads stored lines for that reason.
- Route: about **0.9 KB** (d.4: 16 + 11 + 65 + 125 + 370 + 300). This package asks for a cap of 1,024 B. If the lead allots less,
  drop in this order: the noun (38 B), the `challenge` object type and relation (about 150 B; cases then reach the graph only
  through their runs), the `aiw:challenge` event (about 90 B; wp2 and wp8 then use `aiw:concept-action`).
- Stylesheet: the route stylesheet has about 400 B to spare (`client-bundle.mjs:264`). The lab adds **no rule** to it: it reuses
  `l-dialog`, `l-field`, `btn`, `cm-*` and the Validate table classes, and carries its own rules (≤ 2 KB) inside the lazy script as
  an adopted stylesheet using the existing theme variables.

---

## e. Retirement and migration

### e.1 Nothing is retired, and why each neighbour stays

| Existing mechanism | Concern | Why it is not replaced |
|---|---|---|
| `interfaces.check` and `evaluateContract` (`public/interfaces-domain.js:391-399`, `:426`) | does a sample payload fit the dictionary; is a policy sentence present | a payload conformance probe. It executes no behaviour. The lab links to it; its scenarios `duplicate` and `timeout` keep their meaning |
| the `crash-window` obligation (`public/architecture-applicability.js:174`) | a pending verification obligation per execution agreement | it stays the obligation. The crash-window table is the design artefact printed under it; the obligation text and id do not change |
| `logical.scenario`, `realisation.scenario` (`public/logical-domain.js:207`, `public/realisation-domain.js:364-367`) | a tour of journey steps | no behaviour is evaluated there; unchanged |
| `technology.simulation`, `runtime.simulation` | capability and zone loss | another concern (wp9a); unchanged |

One authority path per concern is kept by construction: findings of this package come only from the stored reading; a run's result
comes only from the server's evaluation; a run's state comes only from `runState`.

Future retirement candidate (not in this release): once wp7 draws failure branches in the Sequence picture from challenge cases, the
probe's `duplicate` and `timeout` scenarios can be re-pointed at cases. The parity test would be: for every contract, the probe's
`policyDefined` equals "a case of kind repeat or timeout exists and its operation is declared".

### e.2 Old documents

- No storage upgrade and no change to `storageUpgradeNeeded` (`storage-upgrade.js:21-36`). A document without `p.behaviour` is read,
  fingerprinted, checked and printed exactly as before: `OVERLAY` and `COLLECTIONS` read an absent section as empty
  (`listAt`, `public/provenance.js:57-60`), the supplement spread reads an empty list, the read hook returns at once.
- Adding `invariant` to the record graph registers records the graph did not hold. A project with invariants gains objects in the
  Table and Layers views and in graph counts. This is intended and is the one visible change for existing projects; S6 measures it
  (g).
- No old record gains a guarantee: an invariant with prose only reads "no evaluable form declared"; a lifecycle without `behaviour`
  raises none of the `sm-*` findings; a rule without a table raises none of the `dt-*` findings.
- A template copy, a model package and a recovery package must carry forms and cases as they carry any record content. S1 tests the
  three paths; where a path rebuilds records from a field list, the form is dropped **with a notice in that path's own report**,
  never silently, and the test pins which.

### e.3 Why behaviour commands are not staged, and the cost

`applyCanonical` (`public/canonical-command.js:55-70`) is imported by client modules (`public/desk-fixes.js:15`,
`public/chapter-reasoning.js:35`, `public/guided-creation.js:1`). Giving it a `behaviour` handler would put the handler and its
normalisers on the route. So behaviour edits are single commands, never part of a `workspace.apply` batch, an alternative or a
reviewed change. Consequences, stated plainly: a change plan (wp5) cannot carry a form edit in this release; it can show, through
`behaviourConsequences(prior, next)`, which recorded challenges its edits make stale. If wp5 needs forms inside plans, the route to
it is a registration seam in `canonical-command.js` that only the server and the lab fill; that is a change to the shared boundary
and is the lead's to decide.

---

## f. Shared contracts

### f.1 This package PROVIDES

| Name | Shape | For |
|---|---|---|
| `EVALUATOR_KINDS` (`public/behaviour-eval.js`) | `[{id: 'decision-table' \| 'state-model' \| 'interleaving' \| 'outcome-uncertainty' \| 'crash-recovery', version, title, inputs: [{name, unit?, meaning}], bounds: {name: {default, cap}}, notConsidered: [text]}]` | wp1 (checks `calculation.modelKind` at intake, server side); wp3 uses the same row shape for its calculators so wp1 reads one shape |
| Capability answer | on `aiw:concept-capability` with `detail.action === 'challenge'` and `detail.modelKind` one of the five ids, sets `detail.supported = {by: 'behaviour', note}` synchronously | wp1's concept view |
| Challenge entry | handles cancelable `aiw:concept-action` with `action: 'challenge'` (detail `{conceptId, pinId, receipt, objectId, form}`), and `aiw:challenge` with detail `{subject?: {kind, id}, caseId?, adoptionId?, evidenceId?, invariantId?, relationship?}`; calls `preventDefault()` and opens the Challenge view | wp1, wp2, wp8 |
| Simulated evidence | `simulatedEvidenceFor(p, target) → [{runId, ref, class: 'simulated', level: 'model', verdict, current, reviewedBy \| null, bounds, at}]` with `target` a record id or wp2's `{kind: 'adoption-evidence', adoptionId, evidenceId, evidenceKind: 'simulated'}`; and the rule **a simulated run may satisfy only an evidence requirement of kind `simulated`, and only when it is current, independently reviewed and its verdict matches the case's stated expectation** | wp2 (its evidence rows of kind `simulated`), wp6 |
| Stored lines | `p.behaviour.reading.lines[recordId] = [{text, class, runId?, current, reviewedBy?}]`; wording: "Simulated (model-level): BC-001 two buyers for the last seat — no violation within bounds (2 operations, 6 interleavings, complete). Recorded by …, reviewed by …. Not considered: …" | wp7 (ARS, views, SDD beyond §4), any printer |
| Trace format | `aiw.behaviour-trace/1` (b.3) | wp7 (sequence and state pictures), wp8 (teaching) |
| Record graph | types `invariant`, `challenge`; runs as `evidence`; relations `binds`, `challenges`, `evidences`; read with `linkedVia(p, id, type, dir)` (`public/trace-kernel.js:195`) | every trace reader |
| Invariant consistency | `invariant.consistency {mode, coordinatorId, decisionId}` and the finding `invariant-boundary` | wp9c (contexts), wp2 (`supports: [{invariantId}]`), wp9b |
| Finding codes with a class hint | `reading.findings[].class`: `integrity` for `behaviour-violation`, `dt-missing-approves`, `sm-timeout-to-failure`, `crash-repeat-unprotected`; `analysis` for the rest | wp9b (which classes may be waived is its decision) |
| `independentRunReview(p, run)`, `runReviewRefusal(p, run, actor, account)` | built on `verifierRefusal` | wp6, wp9b |
| `behaviourConsequences(prior, next) → [{caseId, runId, becomes: 'stale'}]` | server reader | wp5 |
| `behaviourNextStep(p, subject) → {question, why, action}` and `exploreCase` for a sandbox | deterministic | wp8 (a practice attempt calls the evaluator directly and sends no command) |
| Evidence file | `audit/rc44/evidence/wp4-behaviour.json`, schema `aiw.behaviour-evidence/1` | release evidence |

### f.2 This package NEEDS

| From | What | Until it arrives |
|---|---|---|
| wp1-knowledge | (1) the events of its f.1 as written; (2) only **released** `calculation` and `verification` forms may be offered as a starting point for a form or a case, and the case then cites `conceptReceipt` in its provenance; a candidate example is shown labelled and is never loaded into a form by AIW | the lab opens only from the Model and Validate tabs; no prefill |
| wp2-adoption | the evidence target shape and stable `evidenceId`; that an adoption's parameter rows may be read as `initial` values with their `basis` shown | cases carry no `adoptionRef` |
| wp3-workload | nothing at run time. Agreement that load, timing and capacity are wp3's and appear in this package only under "outside this analysis" | — |
| wp5-change-plan | reads `behaviourConsequences`; decides the staging seam of e.3 | behaviour edits stay single commands |
| wp6-evidence | the project-wide evidence vocabulary (calculated, simulated, observed, approved) and the rule that `simulated` never stands in for `observed`; binding of an implementation test to a case as its *negative control* | the run's own `class` and `level` and the wording of f.1 |
| wp7-views | the state picture with categories, guards, forbidden transitions and timeout branches (`public/notation-model.js:616-622`); failure branches in the Sequence picture from `trace`; printing `reading.lines` in the ARS; whether `invariant` becomes a trace layer | the lab's own trace and tables; SDD §4 lines |
| wp8-guided | hosts the Challenge entry in the stage workspace for Stages 1, 4, 5 and 8; keeps practice out of `behaviour.run` | Model and Validate tabs only |
| wp9b-governance | waiver classes for the `integrity` findings; `decision.governance` keeping the actor, so `consistency.decisionId` can require an accepted decision | "accepted" is read as the decision's existing architect acceptance |
| wp9c-contexts-ops | a bounded-context id per responsibility | `invariant-boundary` compares responsibility groups (`logical.groups`) |
| Lead | the script gate at 149; the route allotment (0.9 KB asked); the adopted-stylesheet rule for lazy surfaces | fallback host of d.5 |

---

## g. Slices

Suites: `rc44-wp4-behaviour-validate.mjs` (node assertions, sections A–E), `rc44-wp4-behaviour-browser-validate.mjs`, fixtures in
`rc44-wp4-behaviour-fixtures.mjs`; registered as `test:rc44-wp4-behaviour` and `test:rc44-wp4-behaviour-browser` beside the rc42
entries (`package.json:26-38`). Each slice writes its section first and sees it fail.

| Slice | Owns (no two slices edit the same lines) | Depends on | Tests written first | Done when |
|---|---|---|---|---|
| **S1 Forms and commands** | `public/behaviour-forms.js`; `public/behaviour-domain.js` (dispatcher with every command type, the run and review cases delegating to functions S3 and S4 fill); `worker.js:101`; `authorship.js:39`; `public/requirements-domain.js:201`; `public/interfaces-domain.js:34`; `public/record-lifecycle.js:50`; `public/provenance.js:56` | — | **Section A.** Fails today: `commandHandler('behaviour.form')` falls to `applyCommand`. Key cases: a rule's table survives a later `artefact` save (fails today, `cleanRecord` drops it); a data `behaviour` survives an `interfaces.data` save that resends `lifecycle`; an agent's form is stored `proposed` and read by nothing; `behaviour.keep` refused for an agent and, with four eyes on, for the proposer; a payload `state: 'authored'` is ignored; limits refused by name; an unsupported operator is refused unless sent as `text`; a document without `p.behaviour` is byte-identical after a read and its design stamp is unchanged; a form edit lapses the chapter's review marker; one journal event names the host record; template copy, model package and recovery package keep or report the forms | section A green; `command-equivalence-validate.mjs`, `interfaces-validate.mjs`, `rc42-g7-data-contracts-validate.mjs` unchanged and green |
| **S2 Tables, state models, the reading** | `public/behaviour-eval.js`; `public/behaviour-reading.js`; `public/readings-upgrade.js:294`; `public/review-domain.js:72`, `:174`, `:219` | S1 | **Section B.** Fails today: no finding for two overlapping rows. Key cases: overlap under `unique` with its witness; a gap with its witness; an exact endpoint (`gte 18` and `lt 18` meet, `gt 18` and `lt 18` leave 18 uncovered); a missing input never reaches `approve`; row order matters under `first` and is reported, not hidden; the combination cap gives `dt-not-evaluated`, not silence; each `sm-*` error from a three-state fixture, including timeout → terminal failure; `invariant-boundary` for two components in two groups, E under `atomic`; `dual-write`; the reading is identical across two refreshes and absent for a project with no section; findings appear in `inheritedFindings` with their chapter and keep their stamp until an input changes; recording evidence does not move the design stamp | section B green; `rc42-g4-trace-kernel-validate.mjs`, `ars-validate.mjs` green |
| **S3 Interleaving, cases, runs** | `public/behaviour-explore.js` (explorer core); `public/behaviour-runs.js` (new: `assembleCase`, `runCase`, stamps, `behaviour.run`, `behaviour.withdraw`, re-exported by the domain) | S1 | **Section C, the completion criterion.** Fails today: no such evaluator. Key cases: reservation unprotected → `violated`, shortest trace, the invariant and requirement named; reservation with `conditional-write`, with `lock` and with `version-check` → `no-violation-within-bounds`, second buyer `rejected` or `conflict`, `explored.complete` true; an `unknown` initial value → `not-evaluated`; a `text` remainder on the invariant → never `preserved`; bounds of 4 states → `bounds-exceeded` with the limits printed; same input, same JSON, 50 times; the server ignores a client-sent result; an agent's `behaviour.run` refused; a run goes `stale` when a step changes and stays readable; a third actor accepted, a fourth refused | section C green; the two reservation traces written to the evidence file |
| **S4 Uncertain outcomes, recovery, review** | `public/behaviour-explore.js` (fault section, a separate block of the file) ; `public/behaviour-runs.js` (review functions); crash-window checks in `public/behaviour-reading.js` (a separate function S2 leaves as a stub) | S3 | **Section D.** Key cases: a duplicate with `identity: stable` and a `dedupe` step → one effect; with `per-attempt` → two effects, violated; a lost reply with `timeout: failed` → local state says failed while the effect exists, violated; with `unresolved` → outcome `unknown`, no invented result; a timeout explores both branches and says so in `considered`; crash positions generated from steps and from the execution agreement alone; a position without recovery → `crash-no-recovery`; `behaviour.review` refused for the recorder, for a writer of the case or of a form it read, for the owner by name, for an agent, and accepted for a second person; a stale run cannot be reviewed; a simulated run never satisfies a target of kind `observed` | section D green; `rc42-g3b-trace-and-delivery-validate.mjs` green (shared `verifierRefusal`) |
| **S5 The lab** | `public/behaviour-lab.js`; `public/instrument-tray.js:25-33`; `public/notation-view.js:85-88`; `public/validate-view.js` (the card); `public/workspace-ux.js` (the listener beside `:130`) | S1 for the editors; S2–S4 for the readings (stubs until then) | **Browser suite.** Fails today: no Challenge view. Key cases: the view is offered only when a challengeable record exists; declaring the reservation and reading the violated trace with its three panels; recording needs the three confirmations; the label reads "Simulated · model-level · not reviewed"; a second signed-in person reviews and the first sees the refusal sentence; the proposed form shows as proposed and cannot be run; `aiw:challenge` opens the view; with no provider configured every step works; keyboard only; light, dark and forced colours. **Size cases** (node, from `dist/client-size-report.json`): scripts = the settled gate; the lab chunk is one file over 10 KB; route delta ≤ the allotment; the route stylesheet unchanged | browser suite green; the build passes its gates |
| **S6 Graph, SDD, proof** | `public/record-graph.js` (three places of d.4); `public/sdd-architecture.js:998-1000`; `rc44-wp4-behaviour-fixtures.mjs`; `audit/rc44/evidence/wp4-behaviour.json` | S3 (S4 for the review line) | **Section E.** Fails today: `linkedVia(p, 'inv-001', 'evidences', 'in')` is empty because no invariant is registered. Key cases: a project without invariants and without a section has the same graph signature before and after; the reference project's object counts are compared and any difference is listed in the evidence file for the lead (never an assertion loosened); the SDD prints the simulated line with its label and bounds and prints nothing for a proposed form; the proof scenario of h runs end to end from fixtures | section E green; `sdd-document` and model suites green; evidence file written |

Order: S1 → (S2 ∥ S3) → S4; S5 from S1 onward; S6 after S3. Six sessions, at most three in parallel.

---

## h. Proof scenario (transactional family; synthetic fixtures only)

**System:** "Riverside Hall seat reservation", a fixture built by `reservationProject({protection})`. No client material.

1. **Source concept.** `Application_Architecture_Master.md`, lines 245–255 ("Choose aggregate boundaries carefully", "Work a
   reservation example"): two commands that read the same available amount and reserve independently exceed it; the remedy is a
   serialized decision at one authority. Held by wp1 as a **candidate** concept with the file's SHA-256
   (`audit/rc42/handbook-source-hashes.json`), the line locator and the passage hash.
2. **Explanation.** The concept view shows the definition and the worked example labelled "candidate · teaching · not reviewed".
   Challenge is enabled because the capability query is answered for `interleaving`. Nothing from the passage is loaded into a form.
3. **Model application.** REQ-001 "A buyer can reserve a seat"; BR-001 "A seat is held for at most one buyer"; LR-001 "Allocate seat
   capacity"; DAT-001 Seat inventory with `vars` `capacity` (integer), `available` (integer), `holds` (list); INV-001 "Seats are
   never oversold" with `formal.requires`: `{count: holds} lte {var: capacity}` and `available gte 0`, `consistency {mode: 'atomic',
   coordinatorId: LR-001}`; IF-001 "Reserve seat" with steps `s1 read available`, `s2 guard available gte 1 (onFail reject)`,
   `s3 write available sub 1`, `s4 write holds append {arg: buyer}`, `s5 commit`, all in `T1` with `protection: 'none'`.
4. **Consequences.** The reading raises `invariant-isolation-unanalysed` (W) on INV-001. No finding claims a violation: nothing has
   been run.
5. **Challenge.** BC-001 "Two buyers, last seat": kind `race`, actors A and B on IF-001, `initial` `capacity 1`, `available 1`,
   `holds []`, invariant INV-001. Run: **violated**. Trace: A reads 1; B reads 1; A's guard holds; B's guard holds; A writes
   `available` 1 → 0 and `holds` [] → [A]; B writes `available` 0 → −1 and `holds` [A] → [A, B]; at the end INV-001 is violated
   twice over. Affected: REQ-001. Outside: engine isolation as implemented, more than two buyers, timing, payment. Recorded as
   BRN-001. The reading raises `behaviour-violation` (E).
   The architect sets `T1.protection` to `conditional-write` (guard and write are one step). BRN-001 becomes **stale** and stays in
   history. Run again: **no violation within bounds**; B is `rejected`; `explored.complete` is true. Recorded as BRN-002.
6. **Evidence.** BRN-002 reads "simulated · model-level · recorded by architect-a · not reviewed". architect-a's attempt to review it
   is refused with the sentence naming them; architect-b reviews it (`no-violation-read`). An anomaly row on INV-001 cites BC-001
   (`lost-update: ruled-out`). The implementation evidence for INV-001 stays **pending**: a simulated run does not close it.
7. **SDD.** §4, under the Reservation service: "Invariants: INV-001 Seats are never oversold — declared: count(holds) ≤ capacity;
   available ≥ 0; atomic, coordinated by LR-001. Simulated (model-level): BC-001 two buyers for the last seat — no violation within
   bounds (2 operations, complete). Recorded by architect-a, reviewed by architect-b. Not considered: …". Appendix B keeps the
   pending implementation evidence. The earlier counterexample is in the review register as history.

The fixtures also hold one small case per other family, used by sections B–D, not walked end to end here: human workflow (a claim
lifecycle with an `unknown` state and a timer), asynchronous integration (outbox crash positions), analytical pipeline (a completeness
invariant across two definitions for `invariant-boundary`), multi-tenant platform (an entitlement decision table with a missing
tenant tier), AI-enabled process (a human-review decision table where a missing confidence value must not approve).

---

## i. Gaps, deferrals, risks, and what cannot honestly be delivered

### i.1 Closed

| Gap | How |
|---|---|
| **C1-06** decision tables | `decisionTable` on a rule with typed inputs, hit policy, bounds, no-hit and default apart, missing-input handling, boundary examples; overlap and gap checks with witnesses; "missing never approves" as an error |
| **C8-05** state semantics | `behaviour.states` and `transitions` with category, dimension, meaning, owner, permitted actions, guard, evidence, authority, kind, forbidden list, definition version; the error and warning rules; kind `progress` |
| **C5-11** isolation and anomalies | `invariant.isolation` with anomaly rows; the overlapping-history counterexample is a recorded `race` run; `invariant-isolation-unanalysed` |
| **C5-16** failure and recovery walkthrough | challenge cases of kind `crash`, `lost-reply`, `timeout` with a step trace naming the acting contract, the state before and after and the rule; a state model with owners and permitted actions; `sm-dead-end`, `sm-owner-age` |
| **C8-08** crash windows and acknowledgement | positions generated from steps and the execution agreement; a person-completed recovery table; the `ack` block; `dual-write`, `crash-*`, `ack-empty-commit` |
| **C4-03** split invariants | `invariant-boundary`; `consistency.mode` and coordinator; Chapter 4 lists the invariants a responsibility coordinates |

### i.2 Deliberately deferred

- **DMN 1.3 import** and **the gateway-to-table link** (C1-06, second half): the link needs a field and a check in
  `public/process-model.js`, which is route code; the import is intake work. Both wait for a byte allotment.
- **C1-08** rule versioning with typed dependents: only the table's `version` and the chapter marker are delivered; reopening
  downstream records belongs to wp5.
- **C8-05 event table per definition and the provider-status map**: they depend on the partner guarantee ledger (C8-09), not in scope.
- **C5-16 `failureHandlerId` on interactions** and the `failure-handler` warning: a Chapter 5 field on the route; proposed for wp9c.
- **C5-02** atomic set and version scope on components: the operation model's transactions cover the evaluable part; the Chapter 5
  record is wp2's or wp9c's.
- **C4-05** change and ownership-transfer scenarios: wp5 and wp9c.
- **Pictures** (state picture with guards and timeouts; failure branches in the Sequence picture) and **ARS printing**: wp7.
- **`invariant` as a trace layer**: wp7 decides; the object and its relations are registered now.
- **Staging behaviour edits in reviewed changes**: e.3.

### i.3 Risks

1. **Route bytes.** About 0.9 KB is more than "a few hundred". The drop order is in d.5; the measured figure is a test (S5).
2. **Script gate.** One new lazy script makes 149. A second importer of the five modules would silently make it 150; S5 asserts
   there is exactly one.
3. **Registering invariants in the graph** changes object counts for projects that hold them. S6 measures before asserting; a
   suite that pins a count on such a project is reported to the lead, not edited.
4. **A stored reading can lag** in a client-side preview of staged edits (the preview shows the reading of the saved revision). The
   card says "as of the last save". On the server it cannot lag.
5. **A bounded result read as proof.** Mitigated by wording (no "passed"), by the three always-visible panels, by the label on every
   surface and document, and by the rule in f.1 that a simulated run satisfies only a `simulated` requirement.
6. **Model fidelity.** The operation model is the architect's statement of intent. A protection declared as `lock` is believed, not
   checked. The fixed "outside" list says so; wp6's implementation evidence is the only thing that tests it.
7. **Forms on records through copy and package paths** (e.2): three paths to test; a silent loss would be an integrity defect.
8. **State explosion.** Count limits hold it; the caps are deliberately small. A case that needs more is told to narrow itself.
9. **Two readings of "timeout".** The payload probe and the challenge case both use the word; the lab names them apart.
10. **Second-person check by name is weak**: owner comparison catches only a name written as the account id, as
    `public/architecture-obligations.js:33-35` already says.

### i.4 What this package cannot honestly deliver yet

- **The Stage 4 experience as the target words it.** There are no Chapter 4 command, authoritative-fact or guarded-workflow records in
  this repository. The architect declares facts and operations on Chapter 8 records and sees them from Chapter 4 through links.
  "Synchronized responsibility, sequence, state and data-authority views" is wp7's.
- **Arbitrary business correctness.** Quantifiers over many entities, time arithmetic, string functions, aggregate queries and
  anything not in the grammar of b.0 stay "not evaluated".
- **Real concurrency behaviour.** No engine isolation level, lock manager, retry timing or distributed clock is simulated.
- **More than three competing operations, or unbounded repetition.**
- **Production performance or capacity.** Load is wp3's; nothing here measures it.
- **Evidence above model level.** Every result of this package is *simulated* (runs) or *calculated* (static checks). None is
  observed, none is approved, and none moves `productionAccepted`.
- **External authorities.** The evaluator pack is AIW's own bounded method, authored with the product. It has had no independent
  architecture review; the evidence file records that status as "not reviewed by an independent reviewer" for the lead's review pack.
