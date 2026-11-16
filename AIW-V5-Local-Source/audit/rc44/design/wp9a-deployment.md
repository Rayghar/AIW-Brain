# wp9a-deployment — Deployment topology, reference blueprints and location gates

**Release line:** AIW v0.10.0-rc.10.73.44 (proposed), built on this repository's rc.10.73.42 source.
**Feature:** F5 (gap review section 4). **Chapters:** 6, 7 and 10.
**Status:** design only. No product code was changed, nothing was run. productionAccepted stays false.
**Source root (abbreviated `SRC`):** `/home/user/AIW-Brain/.claude/worktrees/integration/AIW-V5-Local-Source`.
All `path:line` references are to files under `SRC` as read on 2026-11-16 unless they name another root.

Three things to know before reading the detail:

1. **The D8 fix introduced a reading, not a record.** The brief speaks of "the Chapter 6 failure-domain records the rc.10.73.42 fix D8 introduced". The code holds no such record. D8 added one shared reading of a zone's failure domain (`public/runtime-model.js:6-9`: `failureDomainKey`, `statedField`, `hostingZone`) that Chapter 10 and the review desk use. Chapter 6 still compares strings (`public/technology-domain.js:240`, `:266`, `:388`). This package adds the typed record and keeps D8's reading as the one key every reader uses.
2. **The size hook list is larger than the guideline.** I estimate 0.95 KB on the chapters route for this package's own hooks, and up to 1.5 KB if it also has to add the three shared registries listed in section f. Section d itemises every hook and says which ones can be dropped. No new script file is needed: the surface and the domain modules sit in the existing lazy chunk of `public/deploy-view.js`.
3. **No handbook blueprint is released by this package.** Blueprints from the handbooks stay candidate until a second authorised person releases them through wp1's path. The proof scenario uses a synthetic released fixture and says so.

Design files for wp1, wp2 and wp4 were already in the output folder when this was written. They were not read, because the brief says the packages are designed independently. Names in section f are this package's proposals for reconciliation.

---

## a. What exists today, and what is missing

### a.1 Records and commands in the code

| Thing | Where | What it holds |
|---|---|---|
| Environment `ENV-nnn` | `public/runtime-domain.js:22` (four stages), `:319-321` (save), `public/record-fields.js:190` | title, stage, purpose, owner, basis, `assetIds`, `confirmed`. No relation to another environment. No check reads the stage. |
| Zone `ZON-nnn` | `public/runtime-domain.js:23` (`ZONE_KINDS` hosting/access), `:314` (`ZONE_FIELDS`), `:324-327` (save), `public/record-fields.js:191` | title, kind, `failureDomain` (180 characters of text), isolation, owner, `boundaryIds`. No location, scope or parent. |
| Runtime plan `RUN-nnn` | `public/runtime-domain.js:80` (`addPlan`), `:117-120` (field tables), `:143-152` (`savePlan`) | one per environment and asset; replicas, state mode, recovery strategy, `backupZoneId`, target rows, schedule, and prose `rollout` / `rollback`. |
| Placement `PL-nnn` | `public/runtime-domain.js:153-158`, `public/record-fields.js:199` | plan, zone, role (active or standby), replicas, basis. |
| Runtime path `RP-nnn` | `public/runtime-domain.js:331-340` | one per environment and Chapter 8 contract. |
| Evidence `RV-nnn`, walkthrough `RS-nnn` | `public/runtime-domain.js:343`, `:344` | design or exercise evidence per plan; a recorded walkthrough of one zone or one failure-domain string. |
| Chapter 6 capability `TC-nnn` | `public/technology-domain.js:316` (`CAPABILITY_FIELDS`), `:318-329` | `failureDomain` and `alternateDomain` as 4,000-character text; `continuity` single, redundant or bypass; `continuityPlan` prose. |
| Chapter 8 data `DAT-nnn` | `public/record-fields.js:171`, `public/interfaces-domain.js:208-209`, `:23` (`CLASSIFICATIONS`) | `residency` is free text ("Where the data must stay"). `authorityId` names the owning part. |

The deployment unit today is the asset a plan operates: a Chapter 5 component or a Chapter 7 realization (`runtimeInputs`, `public/runtime-domain.js:31`). There is no separate deployable record. The gap review assigns that to F2 (C5-03), which is wp2's.

### a.2 Checks, readings and walkthroughs

- **Chapter 10 checks:** `runtimeFindingsOf` (`public/runtime-domain.js:210-281`). The failure-domain checks are `single-domain`, `standby` and `backup-domain` (`:252-254`), all through `failureDomainKey` over `hostingZone`.
- **Walkthrough:** `simulateRuntime` (`public/runtime-domain.js:299-312`). It loses one zone, or every zone whose `failureDomain` string equals the chosen zone's (`:300`, a `norm()` comparison, not `failureDomainKey`). It propagates along `runtimeDependencyProjection` (`public/runtime-model.js:37-69`).
- **Review desk:** `planFacts` and `availabilityCheck` (`public/design-reasoning.js:159-174`, `:287-299`) count active copies by hosting failure domain since D8. Desk sizing sets Z to the distinct hosting failure domains (`public/desk-capacity.js:140-145`). The scope to survive is one project-wide assumption, "one replica" or "one zone" (`public/desk-capacity.js:35`).
- **Region guess:** the desk decides "one data centre" or "across a region" from words in the failure-domain text (`public/desk-capacity.js:424-435`). The regex still contains `\bzone [a-z0-9]\b` (`:428`), so "Zone A" and "Zone B" read as two regions (gap C10-42, still open).
- **Chapter 6 lab:** `simulateTechnology` (`public/technology-domain.js:383-410`) loses one capability or one string-matched domain. A redundant or bypass capability with a plan reads "degraded" (`:389`).
- **Chapter 10 Model view:** `public/deploy-model.js` keeps a third failure-domain key of its own. An unstated domain becomes `'zone:'+id` and so counts as independent (`:58`, `:86-90`, `:118`, `:211-212`). That disagrees with D8, where an unstated domain shows no independence. It also carries a second propagation, `fallbackSimulation` (`:117-127`), and derives its scenario list only from zones and strings (`failureScenarios`, `:94-98`).

### a.3 Command boundary, actor rules, audit and undo (reused, not rebuilt)

- **Dispatch:** `COMMAND_HANDLERS` by prefix or exact type (`worker.js:101`, `commandHandler` at `:107`). Every handler is called `(document, command, at, actor, {author, revision})` (`worker.js:638`).
- **Authorship:** `commitAuthor` and `refuseUnreviewable` run before anything is applied (`worker.js:603`, `authorship.js:25-36`, `:60-66`). `REVIEW_TYPES` (`authorship.js:39`) lists the commands an agent account or a draft by Sol may never send. `claimsReview` (`authorship.js:46-58`) refuses payloads that claim a review.
- **Second person, as rc.10.73.42 built it:** the record keeps the signed-in `actor` (and `account:'agent'` when it came from one), and a predicate compares actors.
  - `signed` stamp and refusal: `public/security-domain.js:182`, `:192`.
  - Predicates: `independentRiskApproval` (`public/security-domain.js:68-69`), `approvalIndependent` (`public/technology-realisation-domain.js:104`, with `recorded.actor` kept at `:271`), `independentApproval` (`public/review-domain.js:318-319`).
  - Library approval by a second person: `public/workbench-domain.js:195`.
  There is no single shared helper. The pattern is the helper. This package follows it exactly.
- **Audit:** every command gets journal events with actor, author kind, reviewed flag and reason, plus an activity row (`worker.js:644-659`). Authorship stamps come from `stampAuthorship` (`public/provenance.js:410-423`), which finds a command's records through `PATHS_BY_PREFIX` (`public/provenance.js:336`).
- **Staging:** `applyCanonical` and `STAGED_COMMANDS` (`public/canonical-command.js:29-33`, `:55-70`). Saved alternatives hold 1 to 20 staged commands (`public/workbench-domain.js:19-21`, `:145-172`). Only a person merges or sets one aside.
- **Lifecycle:** `record.retire`, `record.restore`, `record.keep` over `COLLECTIONS` (`public/record-lifecycle.js:50`, `:190-200`).
- **Undo:** receipts for a bounded set of working actions, including `runtime.simulation` (`public/action-undo-domain.js:6`, `:43`).
- **Old documents:** upgrades on read (`storage-upgrade.js:21-36`, `public/ownership-upgrade.js:14-22`).
- **Trace:** `public/record-graph.js` (`OBJECT_TYPES` `:15-58`, `RECORD_COLLECTIONS` `:70-79`, `recordRelations` `:108-202`, runtime relations `:176-183`) and `public/trace-kernel.js` (`TRACE_LAYERS` `:19`, `TRACE_HOPS` `:49-67`, `forwardTrace` `:174-178`, `linkedVia` `:195-198`).

### a.4 Knowledge and selection machinery this package builds on

- **Structured claim unit:** `public/architecture-knowledge-unit.js:6` lists the kinds: style, pattern, tactic, anti-pattern-signal, product-mechanism, design-principle, quality-tradeoff. There is no blueprint kind.
- **Three-valued condition engine:** `evaluateApplicability` (`public/architecture-facts.js:30-44`) returns context-match, needs-context or excluded.
- **Released-only eligibility:** `knowledgeEligibility`, `releasedClaims`, `claimReceiptCurrent` (`public/knowledge-governance.js:41`, `:68`, `:72`).
- **Library entries of kind `pattern` and `reference-architecture`** can be saved and approved (`public/workbench-domain.js:180`) but are refused for use (`:74`). Chapter 10 lists only `runbook` entries (`public/workbench-ui.js:103`).
- **Saved alternatives** compare capacity and cost only (`alternativeMetrics`, `public/architecture-analysis.js:27-32`). They never read a driver or a gate.
- **Handbook file hashes** are recorded in `SRC/audit/rc42/handbook-source-hashes.json` (Cloud Infrastructure Master at `:52-54`, Enterprise Component Library Part 3 at `:92-94`).

### a.5 What the target attributes to RC43 that is not in this code

- `design-contracts.js` does not exist (glob of `public/`).
- The Stage 10 "operating populations, resource budgets, environment contracts, release composition and ordered recovery" are not records here. Rollout is one prose field (`PLAN_TEXT`, `public/runtime-domain.js:117`). The nearest things are the desk's global assumptions (`public/desk-capacity.js:32-47`).
- `architecture-knowledge-unit.js` and `model-alternatives.js` do exist.

### a.6 What is genuinely missing

1. A typed failure domain (scope, cause, containment, independence evidence) shared by Chapters 6 and 10.
2. A topology above the zone: account, region, availability zone, network, subnet, cluster, managed service, each with a location.
3. A declared failure set: which failures the design claims to survive, what must keep running, evaluated against the topology and accepted by a second person.
4. Location as a gate: where data may rest, checked against every recorded copy, never traded off.
5. A relation between a recovery environment and the production environment it covers (C10-22).
6. A way to adopt a released deployment blueprint with its roles bound to project records.
7. Typed rollout parameters, so transitional populations can be counted.
8. A qualified fallback: eligible errors, altered semantics, capacity, independence, exercise.

---

## b. The records

All new state lives in the one project document, under the Chapter 6 and Chapter 10 sections. Every key is optional. A document that holds none of them reads exactly as it does today.

Ids come from counters in the section (`runtime.counters`, as `public/runtime-domain.js:102` keeps them), never from random values. Every record carries `revision`, a bounded `history` (24 entries, as `revise` at `public/runtime-domain.js:110`), `origin`, optional `state:'proposed'` and optional `open` fields, like its neighbours.

### b.1 New collections

**`technology.domains[]` — failure domain, `fd-NNN` / `FD-NNN` (Chapter 6).**
One register for the whole project. A location domain and a shared cause are the same record kind, told apart by `cause`.

| Field | Values |
|---|---|
| `title` | required, 160 |
| `scope` | `''` (not stated), `instance`, `node`, `zone`, `site`, `region`, `provider`, `global` |
| `cause` | `''`, `location`, `power`, `network-path`, `carrier`, `identity`, `naming`, `key-service`, `configuration`, `release`, `control-plane`, `operator`, `supplier`, `data-store`, `other` |
| `parentId` | a containing domain (a zone-scope domain inside a region-scope one). Acyclic, depth at most 6. |
| `basis` | what makes it one unit, and what it shares (2,400) |
| `owner`, `recoveryOwner` | 180 each |
| `treatment` | `''`, `remove`, `isolate`, `accept` (for a shared cause) |
| `independence` | `{state:'declared'|'demonstrated', evidenceId, note}`. `declared` by default. |
| `legacyKeys[]` | the normalised strings it was proposed from. Informational only. |

States: proposed (AIW made it from names in use) → authored (a person kept or saved it) → retired. Retirement is refused while a zone, node, capability or declared failure names it (`referencesTo`, `public/record-lifecycle.js:73-77`).

**`runtime.nodes[]` — deployment node, `dn-NNN` / `DN-NNN` (Chapter 10).**

| Field | Values |
|---|---|
| `kind` | `account`, `region`, `availability-zone`, `site`, `network`, `subnet`, `cluster`, `node-pool`, `namespace`, `cell`, `managed-service`, `edge`, `external-network` |
| `title`, `parentId` | parent must exist; no cycle; depth at most 8 |
| `domainId` | the failure domain this node constitutes, if any |
| `jurisdiction` | `''` or two capital letters (ISO 3166-1 alpha-2). A child inherits the nearest stated ancestor's. |
| `place`, `provider` | text, 160 each. The provider is a variable; it may be kept open. |
| `tier` | `''`, `ingress`, `workload`, `data`, `endpoint`, `management` (network and subnet) |
| `exposure` | `''`, `private`, `public` |
| `address` | `''` or one strictly parsed IPv4 or IPv6 prefix |
| `reason` | why this node or tier exists (600). Gap C10-41. |
| `owner`, `basis`, `boundaryIds[]` | as a zone has them |

Limit: 2,000 nodes. Which environments a node serves is derived from the zones under it, never stored twice.

**`runtime.failures[]` — declared failure, `fs-NNN` / `FS-NNN`.**

| Field | Values |
|---|---|
| `environmentId`, `title` | required |
| `scope` | `instance`, `zone`, `site`, `region`, `provider`, `shared-cause`, `correlated` |
| `quantifier` | `any-one` (any one domain of that scope that hosts something here) or `named` |
| `domainIds[]` | the named domains (required for `named`, `shared-cause`, `correlated`) |
| `durationMinutes` | `''` or a positive number |
| `mustSurvive[]`, `mayDegrade[]` | plan ids. `mustSurvive` is required before acceptance. |
| `minimumService` | `{continues[], deferred[], rejected[], serviceRef}`. The lists hold ids of requirements, journey steps or responsibilities. `serviceRef` names wp3's business-service degraded mode when that exists. |
| `exclusions` | what the claim does not cover (2,400) |
| `acceptedCauseIds[]` | shared causes consciously accepted for this claim |
| `inScope` | boolean. Only a person's save sets it. |
| `owner`, `basis` | |
| `recorded` | `{at, actor, revision}`, set by the handler on every content save (as `public/technology-realisation-domain.js:271`) |

**`runtime.failureAcceptances[]` — `FA-NNN`, append-only** (shape of `security.governance`, `public/security-domain.js:193`):
`{id, failureId, at, actor, account?, decision:'accepted'|'returned', stamp, verdict, cases, reviewer, reference, observations}`.

**`runtime.gates[]` — location gate, `lg-NNN` / `LG-NNN`.**

| Field | Values |
|---|---|
| `kind` | `residency`, `placement`, `required-service`, `quota`, `key-custody`, `identity` |
| `title`, `environmentId` | `''` means every environment |
| subject (residency, placement) | `dataIds[]`, `classifications[]` (from `CLASSIFICATIONS`), `personalData` (boolean) |
| `permitted[]` | jurisdiction codes (residency) |
| `requires` | `{tiers[], exposure}` (placement) |
| `nodeIds[]`, `requirement` | the locations decided and what must be available there (the other four kinds) |
| `source` | required: the obligation's source (regulation, contract clause, policy). May be kept open. |
| `owner`, `recorded {at, actor, revision}` | |

**`runtime.gateEvidence[]` — `GE-NNN`, append-only:** `{id, gateId, nodeId, at, actor, account?, state:'pass'|'fail', reference, observations, stamp}`.

**`runtime.copies[]` — data copy, `dcp-NNN` / `DCP-NNN`.**
`{dataId, kind, planId?, zoneId | nodeId, basis, derivedFrom?}` with `kind` one of `primary`, `replica`, `backup`, `log`, `trace`, `export`, `crash-dump`, `key-material`, `cache`, `other`. A copy AIW derives from the trail is `state:'proposed'` and carries `derivedFrom:{via:[relation ids]}`.

**`runtime.topology` — marker:** `{schemaVersion:1, since, by}`. Written only by `runtime.topology-start`, which a person sends when they first choose to type the project's topology. Its presence is what turns the topology checks on (see b.4). Every other topology command is refused without it, so a staged topology command can exist only in a document that has the marker.

### b.2 Extensions of existing records (all optional)

| Record | New fields | Saved by |
|---|---|---|
| `technology.capabilities[]` | `failureDomainIds[]`, `alternateDomainIds[]`, `fallback {…}` | `technology.capability-domains`, `technology.fallback` |
| `runtime.zones[]` | `nodeId`, `domainIds[]` (the first with cause `location` is the primary hosting domain; the rest are shared causes), `reason` | `runtime.locate` |
| `runtime.placements[]` | `nodeId` (a cluster, node pool or managed service under the zone's node) | `runtime.locate` |
| `runtime.environments[]` | `promotesToId`, `recoversIds[]`, `accountNodeId` | `runtime.environment-link` |
| `runtime.plans[]` | `transition {strategy, maxSurge, maxUnavailable, canaryCount, drainingMax, basis}` with `strategy` one of `''`, `rolling`, `blue-green`, `canary`, `recreate` | `runtime.transition` |
| `runtime.simulations[]` | `failureId`, `caseId` on a walkthrough of a declared failure | existing `runtime.simulation` |

The existing saves keep fields they do not know: zone (`public/runtime-domain.js:326`), environment (`:320`), plan (`:152`), placement (`:157`), capability (`public/technology-domain.js:327`). So an ordinary edit of a zone never drops its `nodeId`.

`fallback` on a capability:
`{eligibleErrors[], semantics:'equivalent'|'reduced'|'advisory', freshnessSeconds, validity, capacity:{value, unit, basis}, outageDemand:{value, unit} | workloadRef, independenceDomainIds[], exercise:{cadenceDays, evidenceId}, returnToPrimary}`.
`eligibleErrors` come from a closed list (`timeout`, `unavailable`, `overload`, `dependency-failure`, `stale-data`). `authorisation-denied` is refused: a fallback never answers a denial.

### b.3 Lifecycle and currency

- A declared failure is **declared** → **evaluated** (derived on read, never stored) → **accepted** (a current, independent `FA` record) → lapses when its stamp moves.
- The acceptance stamp is `[runtimeEnvironmentStamp(p, envId), digest of the domains and nodes the cases read, fs.revision]`. `runtimeEnvironmentStamp` is the existing one (`public/runtime-domain.js:63`).
- A gate's evidence carries the same kind of stamp over the gate and the node it speaks about.

### b.4 Old documents

- No storage upgrade is needed and none is added. `storageUpgradeNeeded` (`storage-upgrade.js:21-36`) is not touched.
- No record is converted. A zone's `failureDomain` text stays what it is and keeps its D8 reading.
- The topology checks run only when `runtime.topology` exists. A document without it raises no new finding, so no existing project changes its counts or its readiness because the schema changed.
- Typed domains are offered, never applied: `technology.domain-proposals` creates proposed `FD` records from the distinct names in use and binds nothing. A person keeps a proposal and then binds the records that use that name through a reviewed change.

---

## c. The commands

### c.1 Where they plug in

- **Server dispatch:** exact-type entries in `COMMAND_HANDLERS` (`worker.js:101`), placed before `['runtime.', …]` and `['technology.', …]`. `commandHandler` (`worker.js:107`) already matches exact types first when they are listed first (as `model.apply-impact` and `feedback.import` are). All go to one function, `applyTopologyCommand(document, command, at, actor, {author})`, in `public/topology-domain.js`.
- **Authorship gate:** the person-only types are added to `REVIEW_TYPES` (`authorship.js:39`). `refuseUnreviewable` then refuses them from an agent account or a draft by Sol before the project is loaded (`worker.js:603`).
- **Staging:** the design-edit types reach `applyCanonical` (`public/canonical-command.js:55-70`) through one extension map (section d.2, hook H8).
- **Working copy:** the handler begins `const p = withRuntime(input)`, as `applyRuntimeCommand` does (`public/runtime-domain.js:316`).
- **Version and review reset, copied from the owning chapter:**
  - `runtime.*` content commands: `version++`, `review = null`, `handoff = null` (as `public/runtime-domain.js:348`).
  - `runtime.*` evidence-like commands: `evidenceVersion++` and the same reset.
  - `technology.*` commands: `version++`, `review = null`, `handoff = null` (as `public/technology-domain.js:427`).
- **Audit:** nothing to add. The journal, activity row and authorship stamp are written at the boundary for every command (`worker.js:640-659`), once the new collections are listed in `PATHS_BY_PREFIX` (hook H7).

### c.2 Design edits (stageable; a patch save, like `runtime.zone`)

Actor rule for all of these: any signed-in person. A draft by Sol or an agent account may send them only unreviewed, in a governed batch, and the records arrive as `state:'proposed'`.
Undo for all of these: save again (the earlier value is in `history`), or `record.retire` / `record.restore`.

| Type | Payload | Validation |
|---|---|---|
| `technology.domain` | `{id?, title, scope, cause, parentId, basis, owner, treatment, recoveryOwner, open}` | title required; enums; parent exists, no cycle, depth ≤ 6; at most 500 domains |
| `technology.capability-domains` | `{id, failureDomainIds, alternateDomainIds}` | capability exists; every id is an authored domain; at most 12 each |
| `technology.fallback` | `{id, fallback | null}` | capability's `continuity` is `redundant` or `bypass`; `authorisation-denied` refused; numbers finite and non-negative; unit required with a value |
| `runtime.node` | b.1 fields | kind enum; parent rules; jurisdiction pattern; strict prefix parse; `tier` only on `network` and `subnet` |
| `runtime.locate` | `{zoneId, nodeId?, domainIds?, reason?}` or `{placementId, nodeId}` | zone or placement exists; domains authored; a placement's node lies under its zone's node |
| `runtime.environment-link` | `{id, promotesToId?, recoversIds?, accountNodeId?}` | no self link; `recoversIds` only on a `Recovery design` environment; the promotion chain has no cycle |
| `runtime.transition` | `{id, transition | null}` | plan exists; a percent is 0 to 100; counts are whole numbers |
| `runtime.failure` | b.1 fields | environment exists; `named`, `shared-cause` and `correlated` need `domainIds`; plan ids are plans of that environment; the handler sets `recorded` |
| `runtime.gate` | b.1 fields | kind enum; a residency or placement gate names a subject; data ids exist; the handler sets `recorded` |
| `runtime.copy` | b.1 fields | data exists; exactly one of `zoneId`, `nodeId`; kind enum |

### c.3 Generators (deterministic; create proposals only)

| Type | Effect |
|---|---|
| `runtime.topology-start` | Writes the `runtime.topology` marker with who and when. A signed-in person only: refused from an agent account or a draft by Sol, because it turns checks on. Idempotent. Resets the Chapter 10 review like any content change. |
| `technology.domain-proposals` | One proposed `FD` per distinct `failureDomainKey` among zones and per distinct normalised capability domain string. Binds nothing. |
| `runtime.copy-proposals` `{environmentId}` | For each data definition, walks `forwardTrace` (`public/trace-kernel.js:174`) from its authority to plans, placements and zones, and proposes a `primary` copy per hosting zone and a `backup` copy per `backupZoneId`. Every proposal records the relation ids it came by. |

### c.4 Person-only steps (in `REVIEW_TYPES`; never staged; append-only)

| Type | Payload | Actor rule | Validation |
|---|---|---|---|
| `runtime.failure-accept` | `{id, decision, stamp, reviewer, reference, observations, reviewed:true}` | **A second signed-in person.** Refused without an actor, from an agent account or a draft by Sol, and when `actor === failure.recorded.actor` or the failure has no recorded actor. Same wording and order as `public/security-domain.js:192`. | `stamp` equals the current stamp; `mustSurvive` is not empty; for `accepted`, the verdict is not `does-not-survive` and no location gate of that environment fails |
| `runtime.gate-evidence` | `{id, nodeId, state, reference, observations, stamp, reviewed:true}` | A signed-in person. For `state:'pass'`, **a second person**: not `gate.recorded.actor`. | only for `required-service`, `quota`, `key-custody`, `identity`. A residency or placement gate is computed and takes no evidence. |
| `technology.domain-evidence` | `{id, evidenceId, note, reviewed:true}` | A signed-in person | `evidenceId` names a current `runtime.evidence` record of kind `exercise` with result `pass` (`public/runtime-domain.js:343`, `:67`). Sets `independence.state:'demonstrated'`. |

The independence predicate is `failureClaimIndependent(fs, fa)`: both actors kept, different, and neither record marked `account:'agent'`. It mirrors `approvalIndependent` and `independentRiskApproval`. Every surface reads acceptance through it.

Undo for these: none. A later record supersedes an earlier one, and a moved stamp lapses it. That is how `runtime.evidence` and `security.governance` behave today.

### c.5 Existing commands reused unchanged

- `runtime.simulation` records a walkthrough of a declared failure case when the payload carries `failureId` and `caseId`. It stays `simulated: true` and keeps its undo receipt (`public/action-undo-domain.js:6`).
- `record.retire`, `record.restore`, `record.keep` for every new collection (hook H6).
- `workspace.alternative`, `workspace.merge`, `workspace.set-aside`, `workspace.apply` for staged topology changes.
- `runtime.evidence` for exercise evidence.

---

## d. Modules, hooks and the surface

### d.1 New modules

All are pure: no I/O, no clock (the `at` passed in is the only time), no randomness. All sit in `public/` because the server and the client share them.

| Path | Exports (main ones) | Loads |
|---|---|---|
| `public/topology.js` | imports the parts in order and re-exports them | server: static import in `worker.js`, beside `./public/readings-upgrade.js` (`worker.js:92`). Client: static import from `topology-ui.js` only. |
| `public/topology-domain.js` | `applyTopologyCommand`, `TOPOLOGY_COMMANDS`, `PERSON_ONLY`, `register(part)`, `topologyReading(p, envId)`, `zoneDomains(p, zone)`, `zoneJurisdiction(p, zone)`, `scopeOf(p, zone)`, `topologyGuidance(p, envId)` | with `topology.js` |
| `public/topology-failures.js` | `lossCases(p, failure)`, `evaluateFailure(p, failureId)`, `failureAccepted(p, failure)`, `failureClaimIndependent`, `cutPoints(p, envId)`, `survivalScope(p, envId)` | with `topology.js` |
| `public/topology-gates.js` | `gateReading(p, gateId)`, `locationGateState(p, envId)`, `copyInventory(p, envId)` | with `topology.js` |
| `public/topology-blueprints.js` | `topologyFacts(p, envId, bindings)`, `blueprintFit`, `blueprintProposal`, `blueprintConformance`, `populationsFor(p, envId)` | with `topology.js` |
| `public/topology-fallback.js` | `fallbackReading(p, capabilityId)`, `continuityHolds(p, capability, lostDomainIds)` | with `topology.js` |
| `public/topology-ui.js` | `mountTopology(root, context)` | client only: static import from `public/deploy-view.js` |

**Evaluator bounds, stated on every result.**
Every reading returns `{evidenceClass:'calculated', method:'aiw.topology-eval/1', bounds, considered[], notConsidered[]}`.

- At most 64 loss cases per declared failure. More than that returns `unknown` with the reason "narrow the scope". Nothing is truncated silently.
- One failure at a time, unless the failure names a correlated set.
- Counts of copies only. No rate, latency or throughput.
- Not considered, and said so: control-plane loss with cached authority, data consistency after promotion, health detection time, partial capacity loss, provider facts.

A calculated verdict is model-level evidence. The four classes stay apart everywhere:
- **calculated:** these readings;
- **simulated:** a recorded walkthrough (`RS`, `simulated: true`);
- **observed:** `runtime.evidence` of kind `exercise`, and later wp6's observations;
- **approved:** a current, independent `FA` record.

**Verdicts of `evaluateFailure`.**

| Verdict | Meaning |
|---|---|
| `survives` | every `mustSurvive` plan is `available` in every case |
| `recovers-conditionally` | every `mustSurvive` plan is at least `conditional` (a declared recovery candidate, in this environment or in a linked recovery environment) |
| `does-not-survive` | some case leaves a `mustSurvive` plan degraded or unavailable. The result names the case, the plan and the dependency chain. |
| `unknown` | a hosting zone has no typed domain of the needed scope, a placement's role or count is open, or a fallback the result depends on is not qualified |

Propagation is not reimplemented. Each case calls `simulateRuntime` with the lost set (hook H4).

### d.2 Hooks in existing files

Estimated bytes are minified bytes on the chapters route. They are estimates: builds were not allowed while this was written. The size gate itself is the test (slice 6).

| # | File and place | Change | Est. |
|---|---|---|---|
| H1 | `public/runtime-model.js:6` (`failureDomainKey`) | Returns the zone's primary typed domain id (`z.domainIds?.[0]`) when present, else today's normalised string. Add `export const TOPOLOGY = {}`, the slot the lazy module fills. | 55 B |
| H2 | — | Not used. An earlier draft dispatched from the `default:` case of `applyRuntimeCommand` (`public/runtime-domain.js:347`); server dispatch by exact type plus H8 costs less. | 0 B |
| H3 | `public/runtime-domain.js:280` (end of `runtimeFindingsOf`) and `public/technology-domain.js:212` (`technologyFindingsOf`) | Append `TOPOLOGY.findings?.(p)` and `TOPOLOGY.findings6?.(p)`. | 90 B |
| H4 | `public/runtime-domain.js:299-305` (`simulateRuntime`) and `:344` (`runtime.simulation`) | Optional third argument `lost = {zones, plans, soft}`: the zones lost, plans lost outright, and plans whose loss propagates as degraded because a qualified fallback stands in. `:344` passes `TOPOLOGY.lostFor?.(p, raw)` and keeps `failureId`. Without the argument the function runs byte for byte as today. | 190 B |
| H5 | `public/runtime-domain.js:253` (`standby`) | Not raised when `TOPOLOGY.standbyElsewhere?.(p, r, domains)` finds a standby in a linked recovery environment in another failure domain (C10-22). | 45 B |
| H6 | `public/record-lifecycle.js:50` (`COLLECTIONS`) | Add `technology.domains` (6) and `runtime.nodes`, `runtime.failures`, `runtime.gates`, `runtime.copies` (10). | 140 B |
| H7 | `public/provenance.js:336` (`PATHS_BY_PREFIX`) | Append the same five paths to the `technology` and `runtime` lists. | 95 B |
| H8 | `public/canonical-command.js:55-67` (`applyCanonical`) | One extension map: a type registered there is stageable and is applied by its registered handler. Shared with other packages (section f). | 100 B, shared |
| H9 | `public/record-graph.js:15-58`, `:70-79`, `:108-202`; `public/trace-kernel.js:19`, `:21-22`, `:49-67` | Register five object types, five collections, their relations and five trace layers (d.4). Through shared registries if another package provides them, else as static rows. | 0 B, or 430 B for the registries, or 650 B as static rows |
| H10 | `public/workspace-ux.js:396` (beside `CHAPTER_MODELS`) and its call at `public/entry.js:26` | `topologyReady(doc)`: when `doc.runtime?.topology` exists, await `CHAPTER_MODELS[10]()` before the studios open. The same call where the shell adopts another project in place. | 120 B |
| H11 | `public/workbench-domain.js:170` (`workspace.merge`) | After the commands apply, `TOPOLOGY.refuseMerge?.(input, p)` throws when the merge would newly fail a location gate. | 45 B |
| H12 | `public/runtime-domain.js:352` (`exportRuntimeMarkdownOf`) | Append `TOPOLOGY.register?.(p) || ''`. | 40 B |
| H13 | `public/desk-capacity.js:428-435` (`REGION_WORDS`, `hopFigure`) | Read `TOPOLOGY.scopeOf?.(p, zone)` first. Label a word-based answer "scope inferred from the failure-domain name". Remove the `\bzone [a-z0-9]\b` alternative (C10-42). | 40 B |
| H14 | `public/technology-domain.js:240`, `:266`, `:388-389` | One reader for a capability's domains: typed ids when present, else the trimmed lower-cased string in all three places. | about 0 B |
| H15 | `public/deploy-model.js:58`, `:88`, `:118`, `:212` | Use `failureDomainKey` and `hostingZone` in place of the private key. | about 30 B |
| H16 | `public/desk-vitals.js:135` (the availability vital) | When an in-scope declared failure covers the plan, show `TOPOLOGY.verdictFor?.(p, plan)` beside the budget reading, so the desk never says "holds" where the declared claim says it does not survive. | 50 B |

Hooks not on the client route (no size cost):

- `worker.js:101`: exact-type entries for `TOPOLOGY_COMMANDS`; a static `import './public/topology.js'`.
- `authorship.js:39`: add `runtime.failure-accept`, `runtime.gate-evidence`, `technology.domain-evidence`.
- `public/deploy-view.js:11`, `:49`, `:89`, `:134`: import `topology-ui.js`; a third own view; declared failures first in the scenario select. Nothing imports `deploy-view.js` statically; it is reached only through `CHAPTER_MODELS[10]`.
- `public/platform-view.js`: a link from the Chapter 6 model to the typed domains. It is reached only through `CHAPTER_MODELS[6]`.

No button is added to the Chapter 10 tools (`public/workbench-ui.js:107`). That module is on the route: `public/runtime-ui.js:25` and ten other studios import it statically. `public/workbench-domain.js` and `public/desk-vitals.js` are on the route for the same reason (`public/workbench-ui.js:2`, `public/chapter-reasoning.js:33`), which is why H11 and H16 are counted.

**Total on the route:** about 0.95 KB of own hooks (H1, H3 to H7, H10 to H16), plus H8 and H9.

**If the lead needs this package under 500 B,** drop in this order, each with its cost:
1. H12: the topology register becomes an export of its own from the lazy module.
2. H13: C10-42 is then deferred.
3. H5: a Failover plan whose standby is in a linked recovery environment keeps a false `standby` error.
4. H11: an alternative that breaks a gate can be merged, and the gate then fails as a finding instead of at the merge.

**Why a slot and not static imports.** `canonical-command.js`, `runtime-domain.js`, `deploy-model.js` and `desk-capacity.js` are all in the chapters route's closure. `public/chapter-reasoning.js:35` and `:43` import the first and third statically, and Sol's panel is preloaded (`public/entry.js:14-15`). A static import of the topology code from any of them would put all of it on the route.

**Why findings stay the same on client and server.** The server always has the module. The browser loads it before first render whenever the document holds the marker (H10), and the only way to create the marker is through the surface that lives in that chunk. Slice 6 tests this by opening a project without topology, switching in place to one with it, and comparing the Validate count with the server's.

### d.3 Lazy-load boundary and script count

- **Host:** the existing lazy entry `public/deploy-view.js`, loaded by `CHAPTER_MODELS[10]` (`public/workspace-ux.js:396`). `topology-ui.js`, `topology.js` and the five domain parts are imported statically from it and from nothing else on the client. esbuild therefore keeps them in that chunk.
- **Script files:** 148 before and after (`client-bundle.mjs:294`, gate at `:337`). The under-10 KB count (`:295`, `:338`) does not change.
- **The loader must not go in `entry.js`.** The route is measured as the static closure of `entry.js`'s own dynamic imports (`client-bundle.mjs:321-327`). A dynamic import of `deploy-view.js` written in `entry.js` would pull the whole chunk onto the route. `workspace-ux.js` already holds that dynamic import, so the loader goes there.
- **Chunk growth:** about 55 to 70 KB of hand-written code in the deploy-view chunk, against a per-chunk budget of 369 KB (`client-bundle.mjs:236`).
- **Fallback if the lead wants a cleaner boundary:** one new lazy entry `public/topology.js` (149 scripts). Justification: three lazy views would then share it without loading the Chapter 10 Model view. It is not my recommendation, because it spends one of the two script files the whole upgrade has.

### d.4 Trace registration (one reading)

New object types (type | label | chapter | level), in the form of `public/record-graph.js:15-58`:

```
failureDomain|Failure domain|6|capability
node|Deployment node|10|deployment
failure|Declared failure|10|deployment
gate|Location gate|10|deployment
copy|Data copy|10|deployment
```

New collections, in the form of `:70-79`: `failureDomain:technology.domains node:runtime.nodes failure:runtime.failures gate:runtime.gates copy:runtime.copies`.

Relations the emitter states (the `source` names the field, as at `:176-183`):

| Relation | From → to | Source |
|---|---|---|
| `sitsIn` | zone → node, and zone → each ancestor node (`derived: true`, `via` the parents) | `runtime.zones.nodeId` |
| `partOf` | node → parent node; domain → parent domain | `runtime.nodes.parentId`, `technology.domains.parentId` |
| `failsWith` | zone → domain; node → domain; capability → domain | `runtime.zones.domainIds`, `runtime.nodes.domainId`, `technology.capabilities.failureDomainIds` |
| `fallsBackTo` | capability → domain | `technology.capabilities.alternateDomainIds` |
| `covers` | failure → plan | `runtime.failures.mustSurvive`, `.mayDegrade` |
| `assumesLossOf` | failure → domain | `runtime.failures.domainIds` |
| `constrains` | gate → data | `runtime.gates.dataIds` |
| `copyOf` | copy → data | `runtime.copies.dataId` |
| `locatedIn` | copy → zone | `runtime.copies.zoneId` |
| `heldBy` | copy → plan | `runtime.copies.planId` |
| `recovers`, `promotesTo` | environment → environment | `runtime.environments.recoversIds`, `.promotesToId` |

New trace layers, appended after `path` in `TRACE_LAYERS` (`public/trace-kernel.js:19`), so every hop still runs from an earlier layer:

```
hop('node',    'sitsIn',     'zone')
hop('domain',  'failsWith',  'capability zone node')        // layer 'domain' holds type 'failureDomain'
hop('copy',    'copyOf',     'data', IN)
hop('gate',    'constrains', 'data', IN)
hop('failure', 'covers',     'plan', IN)
```

The evaluators and the surface read these through `forwardTrace`, `linkedVia` and `traceRecords` only. No module in this package walks the document's lists to find related records, except to look a record up by id.

### d.5 The surface

**Where.** Chapter 10, Model tab: a third own view, "Topology", beside "Deployment" and "If a zone fails" (the view state is `S.view`, `public/deploy-view.js:49`; the address parameter `model=topology` already selects a view, `:94`). The companion panel (`aside.cm-panel`, `:141`) carries five sections.

1. **What must survive.** The declared failures of the environment, each with its verdict, its bounds, what was not considered and its acceptance state. "Declare a failure" opens a dialog. "Evaluate" shows the cases. Selecting a case redraws the grid with the lost zones, as "If a zone fails" does today. "Record this walkthrough" uses the existing four-stage walk (`STAGES`, `:43`) and saves `runtime.simulation` with the `failureId`. "Accept this claim" is offered only to a signed-in person other than the one who recorded it, and says why when it is not offered.
2. **Where it runs.** The node tree with zones and placements, each node's jurisdiction and tier. Typed domains are drawn by scope. A zone without a typed domain is drawn "scope not stated".
3. **Where data rests.** The copy inventory per data definition, each copy with its location and each gate with its state. A failed gate names the copy, the location and the permitted set. Proposed copies are listed apart with Keep and Retire.
4. **Reference blueprints.** Released entries of wp1's deployment-blueprint kind, each with Understand, Compare and Apply. Candidate entries are listed under "Not released: reading only" with source and status, and have no Apply. Apply opens wp2's adoption proposal with this package's role targets.
5. **Rollout populations.** Per plan: steady, rollout and drain counts, each with its basis or "not stated".

**Scenario select.** The "Design scenario" select (`public/deploy-view.js:134`) lists declared failures first, then the zone and domain what-ifs it lists today, labelled "not declared".

**Editors.** Dialogs built inside `topology-ui.js` with `drawerDialog` (already imported at `public/deploy-view.js:15`). Their field descriptors live in the lazy module, not in `public/record-fields.js`, which is on the route.

**Other entry points.**
- The Model tab's view switcher and the address `?chapter=10&tab=model&model=topology` (no route bytes).
- Chapter 6 Model: a link "Typed failure domains" from `public/platform-view.js` (lazy chunk, no route bytes).
- The review desk's availability vital shows the declared verdict when one covers the plan (hook H16).
- The Work tab entry is wp8's, from `topologyGuidance`.

**First use.** The panel's first state is one explained choice: "Type this project's topology". It says what turns on (the topology checks listed in f.1) and sends `runtime.topology-start`. Until then the view shows today's zones read-only, and the project's findings are exactly today's.

**With no LLM provider.** Everything above is deterministic. `topologyGuidance(p, envId)` returns the next step in a fixed order: declare what must survive; type the failure domains; place zones in nodes and state jurisdictions; confirm the data copies; state the gates; evaluate; ask a second person to accept. wp8 shows it in the Work tab. Until wp8 lands it shows at the top of the panel.

**Sol.** Sol may draft nodes, declared failures, copies and gate text as proposals through the existing governed batch (`workspace.apply` with `authorKind: 'sol-draft'`, `public/workbench-domain.js:153-157`). It can never send the three person-only commands (`authorship.js:60-66`). It never sets `inScope`, never records gate evidence and never names a jurisdiction that no source states: the field drafters' rule against invented measured values applies to jurisdiction, counts and minutes.

**Output.** `TOPOLOGY.register(p)` appends "Topology", "Declared failures", "Location gates and data copies" and "Rollout populations" to the Chapter 10 register. `topologyDocument(p)` gives wp7 the same content as structured rows for the SDD (section f).

---

## e. What is retired, and the migration

| # | Retired | Consumers | Replacement | Parity test that allows it |
|---|---|---|---|---|
| R1 | `deploy-model.js`'s private failure-domain key (`:58`, `:88`, `:118`, `:212`) | `deployModel`, `domainsOf`, `fallbackSimulation`, `deployInsights`; read by `deploy-view.js`, `validation-models.js:14`, `chapter-reasoning.js:43` | `failureDomainKey` over `hostingZone` | For every fixture of `deploy-validate.mjs` in which every hosting zone states a failure domain, the grouping is identical before and after. New case: two zones with placeholder domains no longer read as two independent domains in the Model insight, matching Validate's `single-domain`. |
| R2 | `desk-capacity.js`'s word guess as the only source of zone scope (`:425-435`) | `hopFigure`, the latency chain | Typed scope first; the guess stays for untyped zones and is labelled inferred. The `zone x` alternative goes. | Every existing desk fixture whose domains do not match the removed alternative gives the same hop figures. New case: "Zone A" and "Zone B" read as one data centre and are labelled inferred. |
| R3 | Chapter 6's three separate string comparisons (`technology-domain.js:240`, `:266`, `:388`) | `isolation`, `shared-recovery-domain`, `simulateTechnology` | One reader; typed ids when present | `technology-validate.mjs` and `platform-validate.mjs` unchanged. New case: domains that differ only by letter case are one domain in all three places. |
| R4 | The isolate proposal's placeholder `alternateDomain: 'Independent recovery domain'` (`technology-domain.js:371`), which clears `isolation` on acceptance | `technology.proposal` | The proposal leaves `alternateDomain` open | New case: accepting the proposal leaves `isolation` raised until a person names a domain. |
| R5 | `deploy-model.js` `fallbackSimulation` (`:117-127`), a second propagation | `failureOf` when no `simulate` is supplied | `simulateRuntime` only | Retire only if `deploy-validate.mjs` passes unchanged with `simulate` supplied through `deploySource`. If an existing assertion depends on the fallback, it stays as a named temporary adapter, to retire in rc.10.73.45. |
| R6 | `failureScenarios` as the Model view's only scenario source (`deploy-model.js:94-98`) | `deploy-view.js` scenario select, `deployInsights` (`:230`) | Declared failures first; the zone and domain what-ifs remain as undeclared cases through the same evaluator | Without declared failures the select lists exactly today's scenarios. |

R3 and R4 change a reading on existing documents. Both are defect fixes the gap review names (C6-01). If an existing assertion encodes the old behaviour, the slice stops and escalates. The assertion is not edited.

**Not retired here, handed over:** the desk's project-wide `survive` assumption (`desk-capacity.js:35`). wp3 owns the capacity arithmetic. This package provides `survivalScope(p, envId)` for it.

**Migration of documents:** none is forced (b.4). **Migration of stored journals:** none; no command is renamed.

---

## f. Shared contracts

### f.1 Provided by this package

| Name | Shape | For |
|---|---|---|
| `failureDomainKey(zone)` | unchanged signature; now typed-id first | every reader of independence |
| `topologyReading(p, envId)` | `{zones:[{id, hosting, primaryDomainId, scope, chain[], sharedCauseIds[], nodeId, jurisdiction, unknowns[]}], domains, nodes}` | wp3, wp6, wp7 |
| `evaluateFailure(p, failureId)` | `{verdict, cases:[{id, title, lostDomainIds, lostZoneIds, rows, counterexample?}], bounds, considered[], notConsidered[], stamp, evidenceClass:'calculated'}` | wp4 (same result envelope), wp6, wp7 |
| `survivalScope(p, envId)` | the widest in-scope declared failure of scope zone or narrower, else `null` | wp3 (replaces the desk assumption) |
| `populationsFor(p, envId)` | rows `{planId, assetId, phase:'steady'|'rollout'|'drain'|'failover', failureId?, instances:{old, new, total}, basis, unknown[]}` | wp3 (multiplies by per-instance limits and compares with budgets) |
| `locationGateState(p, envId)` and `gateReading(p, gateId)` | `'pass'|'fail'|'unknown'`; rows `{copyId, dataId, zoneId, nodeId, jurisdiction, state, why}` | wp2 (adoption acceptance), wp5 (plan acceptance), wp9b |
| `hard: true` on findings `location-gate:*` | a finding that may never be dispositioned, waived or weighed | wp9b enforces; wp5 and Chapter 3 readings rule out on it |
| `topologyFacts(p, envId, bindings)` | a facts object for `evaluateApplicability`, e.g. `topology.hostingDomains.zone`, `topology.regions`, `topology.recoveryEnvironment`, `topology.jurisdictions`, `runtime.rto.max`, `failureSet.maxScope`; each `{value, status, source}` | wp2's fit reading |
| Adoption kind `deployment-blueprint` | `{roleTargets, fit:blueprintFit, propose:blueprintProposal, conformance:blueprintConformance}` | wp2 registers it |
| `blueprintProposal(p, entry, bindings, parameters)` | `{commands[], creates[], reuses[], obligations[], openRoles[], parts}`; at most 20 commands per part | wp2, wp5 |
| `topologyDocument(p)` | sections of rows, each row with its evidence class and status label | wp7 |
| `topologyGuidance(p, envId)` | ordered steps `{id, question, why, done, command?}` | wp8 |
| Record kinds, relations and trace layers of d.4 | as listed | wp7 and every trace reader |
| Finding codes | `failure-set`, `failure-unsurvived:*`, `failure-unknown:*`, `failure-acceptance:*`, `failure-minimum-service:*`, `domain-scope:*`, `domain-shared:*`, `domain-evidence:*`, `location-gate:*`, `location-unknown:*`, `copy-unlocated:*`, `node-address-overlap`, `node-data-exposure`, `node-shared-account`, `environment-recovers`, `transition:*`, `fallback-eligibility`, `fallback-capacity`, `exercise-age` | wp9b, wp9c, the desk |

Role target kinds a blueprint role may bind to: `environment`, `zone`, `node`, `failureDomain`, `runtime` (plan), `technology` (realization), `capability`, `component`, `data`.

### f.2 Needed from other packages

| From | What | Until it lands |
|---|---|---|
| **wp1-knowledge** | A released entry kind `deployment-blueprint`, with identity and version, source passages (file SHA-256, locator, passage hash), status, and a decision-bearing part: `roles[] {id, title, targetKind, min, max}`, `invariants[]` (typed, from this package's closed list: `distinct-domains`, `min-domains`, `same-jurisdiction`, `tier-private`, `standby-outside`, `has-recovery-environment`), `envelope[] {dimension, testedValue, unit}`, `failureSet[]`, `parameters[]`, `obligations[]`, `evidenceLevel`. And `releasedEntries(p, kind)`, which returns released and pinned entries only. | Slice 4 builds against a synthetic entry in the fixture. Without wp1 the Reference blueprints section lists nothing adoptable. |
| **wp2-adoption** | The adoption record with `roles[].binding`, `parameters`, `deviations[]`, a second-person acceptance, and a registry for adoption kinds that calls `fit`, `propose` and `conformance`. Acceptance must call `locationGateState` and refuse on `fail`. | The proposal can still be saved as an alternative. Fit, deviations and the adoption decision have no record. |
| **wp3-workload** | The shared workload record: per-instance resource limits, budgets, degraded demand, qualified per-instance capacity, and the business-service degraded mode that `minimumService.serviceRef` names. | Populations are shown as counts. No budget comparison. `serviceRef` stays empty and the three id lists carry the minimum service. |
| **wp5-change-plan** | One change-plan contract that takes a list of canonical commands with consequences. | Saved alternatives, as today. |
| **wp6-evidence** | An observation record bound to topology and environment, to back `independence: 'demonstrated'` and exercise recency. | Only `runtime.evidence` of kind `exercise` counts. |
| **wp7-views** | Placement of `topologyDocument` in the SDD; the question view "What survives this failure?" | The Chapter 10 register carries the content. |
| **wp8-guided** | Showing `topologyGuidance` in the Work tab. | The panel shows it. |
| **wp9b-governance** | Enforcement that a `hard` finding takes no disposition and no waiver; the residual-geography acceptance record. | The gate fails as an untreated error and refuses the three acceptance steps this package owns. A person could still record a disposition on it. That hole closes only with wp9b. |
| **wp9c-contexts-ops** | Nothing required. | |

### f.3 Shared hooks someone must own once

These three are worth sharing rather than adding once per package. If nobody else provides them, slice 1 adds them.

1. **Command extension map** in `public/canonical-command.js` (H8): a type registered with a handler is stageable and is applied by that handler.
2. **`registerRecordKinds({types, collections, relations})`** in `public/record-graph.js`.
3. **`registerTraceLayers(layers, hops)`** in `public/trace-kernel.js`.

---

## g. Slices

Slice 1 is the foundation. Slices 2, 3 and 5 can run in parallel after it. Slice 4 needs 2 and 3. Slice 6 is last.

**Suites.** `rc44-wp9a-deployment-validate.mjs` (plain node assertions in named blocks, as `rc42-g5-runtime-validate.mjs:58` does), registered as `test:rc44-wp9a-deployment`. `rc44-wp9a-deployment-browser-validate.mjs`, registered as `test:rc44-wp9a-deployment-browser`. One fixture module, `rc44-wp9a-deployment-fixtures.mjs`, builds the Tidewater project of section h. Slice 1 creates the suite with one block per slice, so later slices edit only their own block.

### Slice 1 — Typed failure domains, nodes and registration

- **Depends on:** nothing.
- **Owns:** `public/topology.js`, `public/topology-domain.js`, stub files for the other four parts, `public/runtime-model.js` (H1), `public/runtime-domain.js:280` (H3, Chapter 10 half), `public/record-lifecycle.js` (H6), `public/provenance.js` (H7), `public/canonical-command.js` (H8), `public/record-graph.js` and `public/trace-kernel.js` (H9), `worker.js` (dispatch and import), the suite skeleton and the fixture.
- **Tests first:**
  0. `runtime.topology-start` from a person writes the marker; from an agent account or a draft by Sol it is refused; every other topology command is refused before it.
  1. *Fails today:* `runtime.node` is refused with "Unknown Deployment / runtime action." (`public/runtime-domain.js:347`).
  2. *Fails today:* two zones named "AZ-1" and "az one", both located in `FD-002`, read as one hosting failure domain in `planFacts` and in `single-domain`. Today they are two keys.
  3. Parity: for the bank-payment and clinic-appointments references, `runtimeFindings`, `technologyFindings`, `recordGraph` object and relation counts, and `storageUpgradeNeeded` are identical with and without the module loaded.
  4. `technology.domain-proposals` creates proposals and binds nothing; the review stamp of Chapter 10 does not move.
  5. A domain named by a zone cannot be retired; `record.keep` on a proposed domain makes it authored.
  6. A `runtime.node` save writes a journal event and an authorship stamp.
  7. `forwardTrace` from a component reaches its zone's node and domain; the reverse walk from a domain reaches the requirement.
  8. A draft by Sol sending `runtime.node` arrives proposed and unreviewed; an agent account claiming `reviewed: true` is refused.
- **Done when:** block S1 is green; `runtime-validate.mjs`, `deploy-validate.mjs`, `technology-validate.mjs`, `rc42-g4-trace-kernel-validate.mjs` and `rc42-g5-runtime-validate.mjs` pass unchanged.

### Slice 2 — Declared failure set, evaluation and acceptance

- **Depends on:** slice 1.
- **Owns:** `public/topology-failures.js`, `public/runtime-domain.js` lines `:253`, `:299-305`, `:344` (H4, H5), `authorship.js` (`runtime.failure-accept`), suite block S2.
- **Tests first:**
  1. *Fails today:* two availability zones typed inside one region domain; the declared failure "the primary region is lost". Today no command can state it, and a walkthrough of either zone leaves the other running. Expected: `does-not-survive`, naming the plan and the case.
  2. `any-one` over scope `zone` yields one case per hosting zone domain; a 65th case returns `unknown` with the bound named.
  3. A shared cause attached to both zones makes the zone-loss claim `does-not-survive` when the cause is named in the failure, and raises `domain-shared` when it is not accepted.
  4. A production plan with no survivor, and a plan for the same asset in a linked recovery environment outside the lost domain: `recovers-conditionally`. The `standby` error is not raised for it.
  5. Acceptance: refused from the recording person, from an agent account, from a draft by Sol, without an actor, with a stale stamp, with verdict `does-not-survive`, and with an empty `mustSurvive`. Accepted from a second person. It lapses when a placement changes.
  6. `simulateRuntime` without the third argument returns deep-equal results for every existing fixture.
  7. Determinism: the same document gives the same result object twice, key order included.
- **Done when:** block S2 is green and `action-undo-validate.mjs` passes unchanged.

### Slice 3 — Location gates and data copies

- **Depends on:** slice 1.
- **Owns:** `public/topology-gates.js`, `public/workbench-domain.js:170` (H11), `authorship.js` (`runtime.gate-evidence`), suite block S3.
- **Tests first:**
  1. *Fails today:* a data definition with a residency gate permitting `NO`, and its backup zone located in a node whose jurisdiction is `SE`. Today no check reads residency in Chapter 10. Expected: error `location-gate:LG-001` with `hard: true`, naming the copy and the location.
  2. Unknown is never pass: a copy whose zone has no jurisdiction gives `unknown` and `location-unknown`; an unresolved proposed copy of gated data gives `unknown`.
  3. A residency gate takes no evidence: `runtime.gate-evidence` on it is refused.
  4. A `required-service` gate: `pass` from the gate's author is refused; from a second person it is recorded; an agent is refused.
  5. `workspace.merge` of an alternative that moves a standby into `SE` is refused, with the gate named.
  6. `runtime.failure-accept` is refused while a gate of that environment fails.
  7. `runtime.copy-proposals` proposes only from trail relations and records them in `derivedFrom`.
  8. Overlapping prefixes on two networks raise `node-address-overlap`; a `data`-tier subnet with `exposure: 'public'` raises `node-data-exposure`.
- **Done when:** block S3 is green.

### Slice 4 — Blueprint adoption glue and transitional populations

- **Depends on:** slices 2 and 3. Uses wp1 and wp2 contracts, or the fixture's stand-ins.
- **Owns:** `public/topology-blueprints.js`, suite block S4.
- **Tests first:**
  1. *Fails today:* a `reference-architecture` entry is refused for use (`public/workbench-domain.js:74`). Expected: `blueprintProposal` on a released entry returns at most 20 commands per part, each accepted by `applyCanonical`, creating nodes, domains, zone locations, standby placements and proposed declared failures.
  2. A candidate entry is refused ("released entries only") and never reaches `evaluateApplicability`.
  3. Fit: an envelope row with no local value reads `unknown`, never `inside`. A hard gate that fails gives `excluded` before any preference is read.
  4. An unbound role stays an open question in `openRoles`. Nothing is created for it.
  5. Populations: a plan with `maxReplicas` 12 and strategy `blue-green` gives a rollout row `{old: 12, new: 12, total: 24}`. With `maxReplicas` not stated the row is `unknown` and names the missing field. No number is invented.
  6. Conformance: after merge, moving a standby into the primary's domain makes `blueprintConformance` report the broken invariant.
- **Done when:** block S4 is green against the stand-ins, and again against wp1 and wp2 when they land.

### Slice 5 — Qualified fallback and the Chapter 6 migration

- **Depends on:** slice 1.
- **Owns:** `public/topology-fallback.js`, `public/technology-domain.js` lines `:212`, `:240`, `:266`, `:371`, `:388-389` (H3's Chapter 6 half, H14, R3, R4), suite block S5.
- **Tests first:**
  1. *Fails today:* a `bypass` capability with a continuity plan and no fallback record. Today the lab reads "degraded" and nothing is raised. Expected, once the project has the marker: `fallback-eligibility`, and a declared failure that depends on it evaluates `unknown`.
  2. `technology.fallback` with `authorisation-denied` in `eligibleErrors` is refused.
  3. Stated capacity below stated outage demand in the same unit raises `fallback-capacity`; different units raise nothing and read `unknown`.
  4. A fallback whose independence domains include the primary's domain is not qualified.
  5. R3 and R4 parity cases from section e.
  6. A document without the marker: `technologyFindings` and `simulateTechnology` results are deep-equal to today's.
- **Done when:** block S5 is green; `technology-validate.mjs` and `platform-validate.mjs` pass unchanged, or the slice has stopped and escalated.

### Slice 6 — Surface, output, retirements and the size gate

- **Depends on:** slices 1 to 5.
- **Owns:** `public/topology-ui.js`, `public/deploy-view.js`, `public/deploy-model.js` (H15, R1, R5, R6), `public/workspace-ux.js` and `public/entry.js:26` (H10), `public/desk-capacity.js` (H13, R2), `public/desk-vitals.js:135` (H16), `public/platform-view.js`, `public/runtime-domain.js:352` (H12), the browser suite.
- **Tests first (browser):**
  1. *Fails today:* `?chapter=10&tab=model&model=topology` shows the Topology view with the five panel sections.
  2. A project without the marker opens without requesting the deploy-view chunk.
  3. Open a project without the marker, switch in place to one with it: the Validate count equals the server's `runtime.review.findings`.
  4. Signed in as the recording person, "Accept this claim" is not offered and the reason is shown. Signed in as a second person, it is, and the acceptance appears with both names.
  5. A failed gate shows the copy, the location and the permitted set. No control offers to accept or waive it.
  6. A candidate blueprint shows its source and status and has no Apply.
  7. With no provider configured, the guidance steps are shown and every step can be completed.
- **Tests first (node):** the parity cases R1, R2, R5 and R6 of section e.
- **Size:** the client build reports the chapters route at or under 3,233,792 B (`client-bundle.mjs:230`), 148 scripts, and no new file under 10 KB.
- **Done when:** both suites are green; `deploy-validate.mjs`, `deploy-browser-validate.mjs`, `desk-validate.mjs` and `desk-fixes-validate.mjs` pass unchanged; the size report is inside its gates.

---

## h. The proof scenario

**System family:** transactional system. **Fixture:** "Tidewater Ferries — vehicle-deck reservation service". Every name, figure and record is synthetic. No client material is used.

**Records the fixture starts with.**
- Components: Reservation API, Allocation worker.
- Realizations: Reservation store (a stateful service, recovery strategy Failover), Identity service.
- Data: "Passenger booking record" (`DAT-001`), Confidential, personal data, owned by the Reservation API, with residency text "must stay in Norway".
- Environments: `ENV-001` Production design and `ENV-002` Recovery design.
- A quality driver: availability 99.9 % over 30 days on the Reservation API.

**1. Source concept.**
Cloud Infrastructure Master, "CIF-S003 Regional active service with qualified standby" (`/home/user/hb-review/Cloud_Infrastructure_Master.md:1463-1508`; file SHA-256 `a727234c…3fca`, `SRC/audit/rc42/handbook-source-hashes.json:52-54`). It is candidate knowledge. The fixture adds a synthetic released entry, `BP-REGIONAL-STANDBY@1`, written by one fixture account and released by another through wp1's path, and marked as a fixture. Nothing claims that the handbook passage itself was released.

**2. Explanation.**
In the Reference blueprints section the architect opens Understand. They read the definition, the mechanism ("transferring authority with coherent state", the handbook's wording) and the choice guidance, each labelled with its source, locator and status. A second, candidate entry (CIF-S002, single region across zones) is listed as reading only.

**3. Model application.**
The architect first chooses "Type this project's topology" (`runtime.topology-start`). Apply then opens wp2's adoption proposal. The roles and their bindings:

| Role | Bound to |
|---|---|
| primary region | new `DN-001`, region, jurisdiction `NO` |
| zones | `ZON-001` and `ZON-002`, as new availability-zone nodes under `DN-001` |
| recovery region | new `DN-004`, region, jurisdiction `SE` |
| active units | the plans of the Reservation API and the Allocation worker |
| authoritative store | the plan of the Reservation store |
| recovery coordinator | left open |

`blueprintProposal` returns two parts of commands. They create the nodes; four failure domains (`FD-001` primary region, `FD-002` and `FD-003` its zones, `FD-004` recovery region); the zone locations; a standby placement of the store in the recovery environment; the link `ENV-002` recovers `ENV-001`; and two proposed declared failures:
- `FS-001`: any one availability zone is lost;
- `FS-002`: the primary region `FD-001` is lost.

The open role is listed as an open question. The architect saves the parts as an alternative.

**4. Consequences.**
- The architect records `LG-001`: residency, subject `DAT-001`, permitted `NO`, source "Tidewater data-handling policy, clause 4 (synthetic)".
- `runtime.copy-proposals` proposes a primary copy in each production zone and a replica where the store's standby is placed. The architect keeps them.
- The gate reading **fails**: the replica rests in `DN-004`, jurisdiction `SE`. The finding is `hard`.
- The alternative cannot be merged, and the adoption cannot be accepted. The panel names the copy, the location and the permitted set. Nothing offers to weigh the failure against latency or cost.
- Rollout: the Reservation API states `maxReplicas` 12 and strategy blue-green. `populationsFor` gives twelve old and twelve new during rollout. wp3 multiplies by its per-instance connection limit (25 in its fixture) to 600 and compares with the store's recorded budget. The multiplication and the comparison are wp3's.
- The architect revises the alternative: the recovery region becomes `DN-005`, jurisdiction `NO`. The gate passes and the merge is allowed.

**5. Challenge.**
- Evaluate `FS-001`: three cases, one per zone domain that hosts something. The API keeps four of six copies against a minimum of four. The store's primary zone is lost in one case, and its standby in the other zone makes it conditional. Verdict: `recovers-conditionally`.
- Evaluate `FS-002`: one case. Every production zone is lost. The recovery environment's plans stand outside the lost domain, so the store and the API are conditional. But the Identity service's capability is bound to `FD-006` "Identity issuer", scope region, cause identity, parent `FD-001`. It is lost too, and the API requires it. Verdict: **`does-not-survive`**. The counterexample reads: `FD-001` lost → Identity service unavailable → Reservation API unavailable through its required need.
- The architect records the walkthrough of that case (simulated).
- They then give the identity capability a second issuer in the recovery region, with a qualified fallback (eligible errors `unavailable` and `timeout`, semantics `equivalent`, capacity stated). Re-evaluated, `FS-002` reads `recovers-conditionally`.
- Stated with the result: one failure at a time; counts only; promotion, data currency and activation time not considered.

**6. Evidence.**
- The verdicts are **calculated**. The walkthrough is **simulated**. There is no exercise evidence, so nothing is **observed**. `FD-001` and `FD-005` are independent by declaration only, and `domain-evidence` says so.
- A second fixture account accepts `FS-001` and `FS-002`. The acceptance records "accepted as a design claim; not demonstrated". The first account's attempt is refused.
- Moving one placement lapses both acceptances.

**7. SDD.**
The Chapter 10 register, and the SDD through wp7, print:
- the topology table with jurisdictions;
- the declared-failure matrix: verdict, cases, bounds, not considered, and the acceptance with both names;
- the gate table and the copy inventory;
- the rollout populations;
- the blueprint adoption with its open role as an unresolved condition.

Every row carries its evidence class. The document repeats that it establishes no live implementation and no production readiness.

---

## i. Gaps, risks and limits

### i.1 Gaps closed

| Gap | How |
|---|---|
| C10-01 | Declared failure set with must-survive plans, minimum service, exclusions, in-scope flag, evaluation and second-person acceptance. Degraded-mode detail is wp3's business service, linked by `serviceRef`. |
| C10-02 | Location gates, copy inventory, hard blocking, unknown never pass. The key-custody gate is recorded with evidence; the key register itself is F9's. |
| C10-05 | Shared causes as failure domains with treatment and recovery owner; single cut points; shared-cause findings. |
| C10-20, K-18 (deployment part) | Adoption through wp2's record with envelope fit, deviations and open roles. |
| C10-22 | `recovers` link, cross-environment recovery candidates, the `standby` correction. |
| C10-42 | Typed scope replaces the word guess; the `zone x` alternative is removed. |
| C6-01 | One typed failure-domain register shared by Chapters 6 and 10; one reader in Chapter 6; the placeholder proposal fixed. |
| C6-05 | Qualified fallback with eligibility, semantics, capacity, independence and exercise. |

### i.2 Gaps partly closed

| Gap | Closed | Left |
|---|---|---|
| C10-04 | account and network nodes, address overlap, data-tier exposure, shared-account warning | account readiness states; the address ledger with allocation states; subnet contracts; address-demand arithmetic |
| C10-41 | a reason per node and zone | placement roles beyond active and standby; the generalised quorum reading |
| C6-09 | an external supplier can be recorded as a failure domain of cause `supplier` and attached | concentration reading; supplier assessment |
| C6-13 | data placement checked against node tier and exposure through placement gates | a trust level on the trust boundary |

### i.3 Gaps deliberately deferred

| Gap | Why |
|---|---|
| C10-03 (flow atlas, deny invariants, per-layer evidence) | It needs `runtime.path` generalised into a flow record. That is a second model of its own size and would double this package. It should follow once nodes and zones are typed, because flows need typed endpoints. |
| C10-43 (DNS, hybrid links, facility envelopes) | Low severity, and it depends on C10-03's flow endpoints. |
| C6-10 (provider and consumer contract for shared platform capability) | A contract record, not topology. Closer to wp9b's standards and approved products. |
| C6-12 (typed parameter rows on capabilities) | wp2's adoption record carries parameters. A second parameter store here would be a parallel path. |
| C6-14, C8-35 (egress inventory, outbound naming) | Depend on C10-03. |
| C8-34 (supplier dependency assessment) | A governance record. Proposed for wp9b. |
| C6-M2 (design questions answered by any mapped need) | Belongs to how wp2 and wp8 close design questions. |
| C10-06 to C10-09 | wp3's. This package supplies populations and survival scope. |
| The rest of F5's environment bullet (environment contract, parity, stage-aware rules) | Only the promotion order and the recovers link are in. A parity contract needs the environment-contract record, and no gap in this package's list requires it. |

### i.4 Risks

1. **Route bytes.** 0.95 to 1.5 KB against about 5 KB for the whole upgrade. The drop order is in d.2. The three shared registries should be owned once.
2. **Findings parity between browser and server.** It rests on the loader (H10) running before first render on both the open path and the in-place switch. If the switch path is missed, the browser shows fewer findings than the server. Slice 6, browser test 3 is the guard.
3. **Readings that change on old documents.** R3 and R4 (Chapter 6) and the removed regex alternative (R2) change a reading for existing projects. They are defect fixes, but an existing assertion may encode the defect. The rule is to stop and escalate.
4. **`failureDomainKey` returning an id.** Every reader treats the key as opaque, and I checked the callers at `public/runtime-domain.js:252-254`, `public/design-reasoning.js:167`, `public/desk-capacity.js:145`, `public/desk-vitals.js:99` and `public/desk-fixes.js:43`, `:119`. A caller that prints the key as words would print an id. Slice 1 greps every use before changing it.
5. **Stamps move when a zone is located.** Giving a zone a node bumps its revision, so recorded evidence and walkthroughs of that environment read "Earlier environment". That is correct, and it will surprise people. The dialog says so before saving.
6. **Parallel contracts.** The blueprint entry shape and the adoption-kind registry are this package's proposals. If wp1 or wp2 chose different shapes, slice 4 adapts. Nothing else depends on them.
7. **The hard-gate hole until wp9b.** Without wp9b a person can still record a disposition on a `location-gate` finding through `review.disposition`. This package blocks its own three acceptance steps and the merge. It does not block that.
8. **Case explosion.** A project with many zone domains reaches the 64-case bound on `any-one` claims. The result is `unknown` with the reason, which is honest but may frustrate. The remedy is a narrower claim.

### i.5 What this package cannot honestly deliver yet

- **A released handbook blueprint.** The four-eyes knowledge approver and licence counsel have not acted. True status: pending for both. The package prepares the entry shape and the review content, and releases nothing.
- **Provider facts.** AIW has no record of which provider region offers which service, quota or key custody. Gates of those kinds are recorded by people with evidence. AIW never asserts them.
- **Demonstrated independence.** A failure domain is "demonstrated" only against a recorded exercise. Without wp6 that is `runtime.evidence`, which is a person's reference and is not verified by AIW.
- **Survivor capacity as a rate.** The evaluation counts copies. Whether the survivors carry the load needs wp3.
- **"Bind more of those declarations to concrete configuration and operational experiments"** (the target's Stage 10 improvement). Configuration binding and experiments are wp6's. This package gives them typed things to bind to.
- **Minimal cut sets.** Only single cut points and named correlated sets are evaluated.
- **The twelve-and-twelve example end to end.** This package supplies twenty-four instances with their basis. The 600 connections and the budget comparison appear only when wp3's workload record exists.
- **Environment-specific deployment diagrams beyond the Topology view.** The C4 deployment figure in the SDD (`public/sdd-architecture.js:1457`) is unchanged. wp7 decides how the typed topology is drawn there.
