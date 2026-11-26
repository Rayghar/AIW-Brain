# wp3-workload — One workload and assumption model (Change 4, feature F7)

Design document for the rc44 upgrade. Status: design only. Nothing was built, run or measured while writing it
(a regression run owned the machine), so every byte figure below is an estimate to be measured in the slice that
introduces it, and every golden value is captured by the first step of the slice that needs it.
`productionAccepted` stays false.

Paths are relative to the product source root
`` (release rc.10.73.42) unless they start with `/`.

Contents: 0 decisions and things the lead must settle · a what exists · b records · c commands · d modules, hooks, UI ·
e retirement and migration · f shared contracts · g slices · h proof scenario · i gaps, risks, limits.

---

## Revision by ruling Y1 (the lead's build S0-D10, rc44/s0-w3-bundle, 2026-11-26): where wp3's readers load

This revision stands over every passage of this design that gives wp3 a lazy entry of its own (0 item 3, L2, d.1's rows
for `workload-hook.js` and `workload-engine.js`, d.2's row for `client-bundle.mjs`, d.3, d.4's `workload-hook.js` row,
f.1 P-1, S1's ownership, i.3 risk 2). Those passages are marked "superseded by Y1" where they stand; the rest of the
design is unchanged. The package is `p50-workload` (ruling D8: after `p30-deployment`, whose topology it reads).

- **No entry of its own.** wp3 adds no lazy entry and no script file. The design packages' first-draw readers live in
  the one shared lazy entry `public/design-package-readers.js`, which every route stub loads before a document that
  holds any package's records is first drawn (rulings D10 and Y1; build contract rules 50 to 52). The script gate stays
  where S0-D10 moved it (150, `client-bundle.mjs`); going beyond 150 is the owner's decision.
- **What joins the shared entry** (its first-draw readers: registration rows, readers, checks, design rows; no surface):
  the module that registers the package (`public/workload-package.js`, `registerExtension({id: 'p50-workload', …})`,
  one line in `design-package-readers.js`: `import './workload-package.js';`) and what it imports: the records' model and
  normalisers (`workload-model.js`), the derivation (`workload-derive.js`), the calculation cards (`workload-cards.js`),
  the bindings' readers (`workload-bindings.js`) and the checks. They are read through S0's registry (`EXTENSIONS`:
  `objectTypes`, `records`, `layers`/`hops`, `checks`, `commands` with `staged`, `lifecycle`, `provenance`, `design`,
  `designKeys`/`evidenceKeys`, `sections`), not through an accessor of the package's own: the registry is the "one
  registration point on the route" this design asked for (L1, N-1).
- **The route stub** `p50-workload-route` in `public/design-package-routes.js`: `needs` is what d.3 states for
  `needsWorkloadEngine(p)` (any of the four collections, or `workloadMigration` as d.3 says), and `load` imports
  `./design-package-readers.js`, like every stub. `project-store.js` already awaits `ensureExtensions` where it reads a
  project and where a save answers, so there is never a frame in which a recorded workload is drawn without its
  readings; the accessor `workload-hook.js` with its own `import('./workload-engine.js')` is not built.
- **On the server** the package registers from its line of `design-packages.js` (a server module may add what only the
  server runs, as `adoption-server.js` and `knowledge-package-server.js` do); `worker.js` imports no workload module of
  its own.
- **Each surface stays in its host entry**: the Workload view in the Chapter 2 utility view's entry, the Envelopes
  section in the Chapter 10 Model view's, the desk's "What it takes" in the Chapter 11 desk's, the bindings in the
  design-task surface and the alternative editor (d.2, d.5). A host entry that needs the package registered for its
  surface imports `./design-package-readers.js` by an import that takes no name, as the three hosts of S0-D10 do; it
  imports no reader module of its own for registration alone (that would split the shared chunk and add script files).
- **Size.** The route bytes of the stub and the registry rows count against the chapters route cap (3,266,560 B, the
  owner's decision AA2; one size check at each merge, no per-slice booking). What a document with any package's records
  opens with is the route plus the shared entry's static closure (`rc44-s0-readings.mjs opensWithRecords(metafile,
  'public/design-package-readers.js', …)`): 69,723 B at S0-D10 for the three packages there, held to at most 160 KB
  (163,840 B) by `rc44-s0-d10-validate.mjs` (D10.2). wp3's readers are estimated at 45 to 60 KB (d.3), which would bring
  the shared entry to about 115 to 130 KB: each wp3 build measures and reports it, and a build that would take a
  document with records past the route plus 160 KB names it to the lead before it merges.
- **Fallback** (d.3's, folding the engine into `desk-view.js`) is withdrawn: it would load the desk before a first draw.

## 0. The design in one page, and what the lead must settle

**The design.**

1. Four new record kinds in the one project document, created only when a person first writes one (an old document
   gains no key):
   `quality.workloads[]` (WL-nnn, the workload and assumption model), `quality.services[]` (BSV-nnn, business
   service), `quality.objectives[]` (SLO-nnn, objective with error budget and budget allocations) and
   `runtime.limits[]` (LIM-nnn, shared-resource envelope / dependency budget). Migration bookkeeping lives beside the
   design in `workloadMigration`.
2. Every number is a **quantity** `{v, u, b, by, src, ev?, open?}`: value, unit from a closed list, basis
   `stated | assumed | measured`, owner, source, evidence passage for a measured value, and an explicit open state
   when the value is not known. A missing value is never defaulted: results that need it read `unknown` and name it.
3. **One arithmetic.** The formulas that exist today in three files are moved, unchanged, into one small kernel
   (`public/demand-kernel.js`, on the route, byte-neutral because it is moved code). Every consumer calls it. The
   recorded model, the named conditions, the new calculations and the new checks live in **one lazily loaded entry**
   (`public/workload-engine.js`), installed synchronously on the server. (Superseded by Y1: they join the one shared
   first-draw entry, `public/design-package-readers.js`, and wp3 adds no entry of its own; see the revision above.)
4. **One input authority per scope.** A recorded workload is the only input the calculations read for its scope. A
   document that records none is read through one adapter (`legacyWorkload`) that presents today's inputs (the saved
   review objective, the drivers' target text, the desk's planning assumptions) in the workload shape, labelled
   "inferred, not a recorded workload". The adapter has a stated retirement (section e).
5. Eight consumers are migrated, each behind a parity test whose golden values are captured from the unchanged code.
6. One new acceptance step (agreeing an objective and its error-budget policy) takes a second signed-in person;
   Sol and agent accounts are refused centrally (`authorship.js` REVIEW_TYPES) and never write a number.

**What the lead must settle (stated plainly, because the code makes two parts of the frame tight).**

- **L1. Route bytes.** The frame allows "a few hundred bytes of hook on the route per package". The hooks this package
  cannot avoid if it adds its registration rows statically (record collections, object types, lifecycle collections,
  provenance nouns and paths, trace layers and hops, staging, the readiness hook) come to an estimated **1.7 to
  1.9 KB**. About 0.9 KB of that is registration rows every package that adds a record kind will also pay; eleven
  packages cannot each pay it inside 4.9 KB of headroom (`dist/client-size-report.json`: chapters route 3,228,863 B of
  3,233,792 B). I need ONE shared registration point on the route from the lead (or wp7, which owns the trace reading).
  With it this package's own route cost is an estimated **0.4 to 0.6 KB**. Section d.4 gives both tables.
- **L2. Script count.** The gate is exact (148 of 148, `client-bundle.mjs:294`). This package asks for the ONE new lazy
  entry the frame allows: `workload-engine.js` (149). The justification and the fallback are in d.3. (Superseded by Y1:
  settled. wp3 adds no script file; the gate is 150 since S0-D10, which the shared entry took.)
- **L3. Stylesheet.** `css` measures 901,873 B of 902,144 B (271 B spare). The workload surface adds **no** stylesheet
  rules; it reuses the classes of the views that host it. Any package that needs CSS needs a decision from the lead.
- **L4. The legacy adapter retires one release later** (rc.10.73.45), not in rc44, because existing suites feed
  driver-only fixtures straight to `scaleReadings` and `capacityObjective` and their assertions may not be loosened
  (section e.3).
- **L5. Chapter 8 timing authority (C8-15).** Switching the desk's latency vital to the execution agreement's envelope
  can change an existing reading where a contract states both `timeoutMs` and execution timing that disagree. I deliver
  the one reader and a to-confirm finding in rc44 and switch the vital only where the parity suite shows no asserted
  reading moves (section e.2, consumer C5).

---

## a. What exists today, and what is missing

### a.1 Capacity and demand arithmetic today (every place found)

| # | Where | What it computes | Its inputs | Evidence |
|---|---|---|---|---|
| 1 | Review desk "What it takes" | Arrival rate by Little's law, carried along Chapter 5 interactions; replicas at a target utilisation; connections = replicas × pool; store reads and writes; cache offload; queue backlog for a consumer outage; telemetry; cluster nodes | The saved review objective `finalReview.capacity`, else a scalability driver read by unit regex, else nothing; 19 planning assumptions with defaults; per-part overrides saved with the objective | `public/desk-capacity.js:32-52` (ASSUMPTIONS), `:80-99` (`capacityObjective`), `:137-358` (`capacityPlan`); rate propagation `:166-171`; connections `:218`; store arithmetic `:268-271`; backlog `:291` |
| 2 | Chapter 10 scale readings (the SCALE-* findings) | The same propagation, written a second time; peak = rate × factor; replicas needed against placed copies; storage; bandwidth; a latency budget from reference figures | Drivers only, read by regex from unit and text; **default** assumptions only (never the saved ones); default peak factor 3 | `public/desk-capacity.js:381` (`SCALE_PEAK_FACTOR`), `:403-417` (`scaleTarget`), `:437-543` (`scaleReadings`); second propagation `:491-497`; raised from `public/runtime-domain.js:278` |
| 3 | Design-task calculators | Six calculation schemas: backlog drain, read cost and source demand, restore time, retry budget, replica and bottleneck capacity, transport budget | Numbers typed into each task (`answers.analysis`), one arrival rate per task | `public/quality-analysis.js:4-13` (schemas, `ANALYSIS_VERSION`), `:21-45` (`analyseQuality`), `:93-111` (measurements with an immutable source passage) |
| 4 | Workbench alternatives and "Explore capacity sensitivity" | capacity = min((replicas − failed) × per-replica, downstream) over growth cases | Per-alternative per-replica and downstream rates; per-comparison demand, growth, failed replicas | `public/architecture-analysis.js:12-24` (normalisers), `:27-32` (`alternativeMetrics`), `:48-52` (`capacitySensitivity`) |
| 5 | Contract journeys (execution agreements) | Caller envelope = attempts × attempt timeout + backoff against the caller budget; child envelope inside one parent attempt; nested attempts per root request | Chapter 8 execution fields | `public/architecture-applicability.js:163-168`, `:237-240`, `:259-265`; fields `public/composition-manifest.js:81-84` |
| 6 | Latency and availability readings | Equal share of a latency target per synchronous level; timeout nesting; availability minutes per part | Contract `timeoutMs`; driver targets; placements | `public/desk-vitals.js:108-126`, `:154-172`; `public/design-reasoning.js:272-275`, `:287-312`, `:320-324` |
| 7 | Chapter 10 plan checks | Active copies against `maxReplicas`; capacity basis present and confirmed | Plan fields | `public/runtime-domain.js:236`, `:242`; plan keys `:120` |
| 8 | Technology comparison (Chapter 7) | Single-unit ceilings against demand; the choice reading's load | Through reading 1 | `public/desk-capacity.js:195-207` (`ceilingFor`); `public/product-choice.js:17`, `:168` |
| 9 | SDD and ARS | "Performance specification" from reading 1; design-task calculations as Markdown; the ARS item "no load stated" | Through readings 1 and 3 | `public/review-domain.js:181`, `:187`, `:623`; `public/desk-capacity.js:361-366`; `public/quality-analysis.js:112-115`; `public/readiness-model.js:220-222` |

The same design therefore answers the same question from different inputs: the desk reads the saved objective with a
surge switch and saved assumptions; the Chapter 10 findings read driver text with default assumptions and a peak of 3;
each design task and each alternative types its own rate; the execution agreement's attempt count never reaches any
demand figure (`public/desk-capacity.js:357`: "Each recorded interaction is taken to happen once for each request").

### a.2 Machinery that exists and is reused

| Need | Existing mechanism | Evidence |
|---|---|---|
| Command boundary | One server path: shape check, author, refusal for agents and Sol drafts, handler by prefix, authorship stamps, provenance blocks, change tracking, journal fold, undo receipt, save, activity row | `worker.js:101` (COMMAND_HANDLERS), `:107`, `:603`, `:638-659`; `authorship.js:25-36`, `:39-66` |
| Staged (batched) design edits | `STAGED_COMMANDS` and `applyCanonical` | `public/canonical-command.js:30`, `:55-70` |
| Lifecycle (proposed, authored, retired; keep, retire, restore) | One family over `COLLECTIONS` | `public/record-lifecycle.js:50`, `:190-200` |
| Who wrote, who reviewed; four eyes on a confirmation | `stampAuthorship`, `settle` | `public/provenance.js:336` (paths by prefix), `:382-405`, `:410-423` |
| Second-person rules introduced by rc.10.73.42 | Per-domain readers and refusals: `approvalIndependent`, `independentRiskApproval`, `independentApproval`, `verifierRefusal`, `fourEyesOn`; the central refusal for agent accounts and Sol drafts | `public/technology-realisation-domain.js:104`; `public/security-domain.js:68-69`; `public/review-domain.js:315-319`, `:491`; `public/architecture-obligations.js:38-39`; `public/changes-domain.js:213`; `authorship.js:39-66` |
| Open and unknown fields | `record.open[field]` | `public/record-lifecycle.js:29-41` |
| Fingerprints and staleness | `sourceSnapshot`, `recordStamp`, `analysisModelStamp`, `measurementCurrent` | `public/quality-domain.js:109-110`; `public/quality-analysis.js:86-92` |
| Immutable source passage for a measured number | Source id, revision, SHA-256, line range, excerpt hash | `public/quality-analysis.js:102-109` |
| Change journal with affected records to review | Change events and items; server trackers | `public/changes-domain.js:86-91`, `:270-281`; `worker.js:257-275` |
| Upgrade on read, stored once, design stamps untouched | `registerReadingsUpgrade`; the D9 ownership upgrade keeps its record beside the design | `public/readings-upgrade.js:294`; `public/ownership-upgrade.js:14-22`; `storage-upgrade.js:21-36`; `public/review-domain.js:50` (keys left out of the design fingerprint) |
| Trace | Record graph and the kernel's layers and hops | `public/record-graph.js:15-58`, `:70-79`, `:108-202`; `public/trace-kernel.js:19`, `:49-67` |
| A lazily loaded part with a synchronous install on the server | The catalogue store; the registered SDD builder and change section | `public/catalogue-store.js:10-34`; `public/review-domain.js:584-589`; `public/workspace-ux.js:27-41` |
| Lazy Model views per chapter | Chapter 2 utility view, Chapter 10 deployment view, Chapter 11 desk | `public/workspace-ux.js:396` |

### a.3 What the target attributes to RC43 that is not in this source

`public/design-contracts.js` does not exist. There is no "demand contract", "operating-envelope contract", "operating
population" or "resource budget" record: a search of `public/` for those terms finds nothing, and no
`public/workload*.js` or `public/demand-*.js` file exists. The foundation here is the nine readings in a.1. This design
builds the workload model from those, not from RC43 methods.

### a.4 What is genuinely missing

- No recorded workload: no operations, mix, burst, route probability, fan-out, cache-miss ratio, retry multiplier,
  service rate with provenance, retention, skew, recovery work or named operating condition (gaps C2-03, C10-07, X-16).
- No shared-resource envelope: nothing budgets `maxReplicas`, surge, draining, jobs and operations sessions against a
  dependency limit with a reserve (C10-08, C8-10). The desk multiplies replicas it sized itself by one global pool of
  10 (`public/desk-capacity.js:41`, `:218`), so "12 old + 12 new × 25 = 600" cannot be said or checked.
- No burst or outage backlog against a quota and a completion promise; an infeasible promise raises nothing (C10-09).
- Survivor capacity is read by counts, not by capacity per failure domain (C10-06; `public/design-reasoning.js:296-302`).
- No business-service record (C2-09) and no objective with a population, an error budget or owned allocations
  (quality-method deep dive; X-17).
- Two timing authorities per contract that nothing reconciles (C8-15).
- No calculation carries a version, validity conditions, "not considered" and an uncertainty statement together;
  the six schemas carry assumptions and a version (`public/quality-analysis.js:4`, `:44`) and that pattern is extended.

---

## b. The records

All four collections sit under existing chapter roots so the chapter's own version, review and handoff mechanics apply
(`public/record-lifecycle.js:120-126` `touch`). None is created on read. A document that has none reads exactly as
before, and its design fingerprint (`public/review-domain.js:50`, `:87-88`) does not move.

### b.1 Quantity (the shape of every number)

```
Q = {
  v:   number | null,            // finite, >= 0 unless the field says otherwise
  u:   unit,                     // one of UNITS; fixed per field, never converted implicitly
  b:   'stated' | 'assumed' | 'measured',
  by:  text <= 180,              // who owns the value (required for 'assumed')
  src: text <= 600,              // what states it (required for 'stated')
  lo?: number, hi?: number,      // an optional plausible range, for sensitivity only
  ev?: {sourceId, revision, hash, lineStart, lineEnd, excerptHash},   // required for 'measured'
  open?: {state: 'not-stated' | 'open-question', question?}           // required when v is null
}
UNITS = ['/s','/min','/h','/day','users','s','ms','min','days','bytes','%','ratio','x','attempts',
         'per-unit','items','connections','instances','fte']
```

Rules, enforced by the handler:

- `v: null` without `open` is refused ("say that it is not known"). A null value is **unknown**; nothing substitutes
  a default. A person may choose "use the planning default", which writes a `b: 'assumed'` quantity with
  `src: 'AIW planning default'` and their name in `by`.
- `b: 'measured'` requires `ev`, checked exactly as a design-task measurement is checked today (source exists, its
  SHA-256 matches, it is not withdrawn, at most 81 lines, non-empty excerpt): the check is the code now at
  `public/quality-analysis.js:102-107`, exported as `evidencePassage(p, raw)` and called from both places. That is the
  immutable source passage the doctrine asks for (file SHA-256, locator, passage hash).
- A unit that does not fit the field is refused. Rates are stored in the unit the person chose; the kernel converts
  with one table (the `PER_SECONDS` table now at `public/desk-capacity.js:387`).
- A Sol draft or an agent account may not send any non-null `v` (see c.2).

### b.2 `quality.workloads[]` — workload model, id `WL-nnn` (new)

Counter `quality.counters.workload`. At most 12 per project.

```
{
  id, title (required, <=160), purpose, source (<=2400), owner (<=180),
  serviceId: 'BSV-nnn' | '',  environmentId: 'ENV-nnn' | '' ('' = every environment),
  requirementIds[], requirementGroupIds[], driverIds[],        // the drivers whose targets presuppose it
  operations: [{ id:'OP-nn', title, class, unitOfWork,
                 entry: {kind:'component'|'contract', id},
                 arrival: Q('/s'|'/min'|'/h'|'/day'),
                 population?: {users: Q('users'), think: Q('s')},   // closed population; arrival is then derived
                 payload: Q('bytes'), driverIds[] }],               // <= 40
  routes: [{ id:'RT-nnn', operationId | '*', edge: {kind:'interaction'|'contract', id},
             probability: Q('ratio'),                               // conditional route, 0..1
             fanOut: Q('per-unit'),                                 // visits per arriving unit
             attempts: Q('attempts') | {from:'execution'} }],       // retry multiplier; 'execution' reads Chapter 8
                                                                    // <= 400
  uses: [{ id:'US-nnn', componentId, targetId, kind:'store'|'cache'|'queue'|'external', operationId | '*',
           opsPerUnit: Q('per-unit'), readShare: Q('%'), cacheMiss: Q('%'),
           recordSize: Q('bytes'), retention: Q('days'), hotShare: Q('%') }],   // <= 200; hotShare = partition skew
  rates: [{ id:'SR-nnn', targetId, unit:'requests'|'messages'|'ops'|'cases',
            perInstance: Q('/s'), utilisation: Q('%'),
            handling?: Q('s'), staffed?: Q('fte') }],               // <= 200; handling+staffed describe a human stage
  conditions: [{ id, kind:'normal'|'peak'|'degraded'|'recovery'|'rollout'|'custom', title, note,
                 arrivalFactor: Q('x'), factors: {[operationId]: Q('x')},
                 burst?: {operationId, rate: Q('/s'), duration: Q('s')},
                 cacheMiss?: Q('%'), attemptsFactor?: Q('x'),
                 unavailable: [{kind:'zone'|'domain'|'plan'|'capability'|'realization', id}],
                 populations: [{planId, instances?: Q('instances'), old?: Q('instances'), new?: Q('instances'),
                                processes?: Q('per-unit')}],        // <= 60
                 recovery?: {backlog: Q('items'), replayRate: Q('/s'), detection: Q('s')} }],   // <= 12
  open: {title|purpose|owner|source: …},
  origin: 'user' | 'suggestion' | 'migrated',  state?: 'proposed',
  confirmed: boolean,          // a person's review, not approval; lapses when anything a reader reads changes
  sourceSnapshot: {…},         // fingerprints of the drivers, requirements, contracts, components and plans it names
  provenance: {…}              // server stamps (author, reviewed), as on every record
}
```

- The four named conditions `normal`, `peak`, `degraded`, `recovery` always exist once a workload is saved. `normal`
  starts with `arrivalFactor` 1 (assumed, by the author); the other three start with every quantity unknown, so they
  stay visible as unknown until someone states them. `rollout` is the fifth kind and carries the operating population
  of a release in progress (old and new instances).
- Where the task's list maps: operations and mix → `operations` (mix is derived from arrivals and shown, never typed);
  arrival rates → `arrival`/`population`; bursts → `conditions[].burst`; conditional routes → `routes[].probability`;
  fan-out → `routes[].fanOut`; payload sizes → `operations[].payload`; cache-miss ratio → `uses[].cacheMiss` and a
  condition's override; retries → `routes[].attempts`; service rates → `rates[]`; retention → `uses[].retention`;
  partition skew → `uses[].hotShare`; recovery work → `conditions[].recovery`.
- An edge with no route row is read as probability 1, fan-out 1, attempts 1: today's rule
  (`public/desk-capacity.js:357`), now listed on every result as a default assumption that was applied.
- **One authority per scope.** Two authored workloads may not claim the same entry (component or contract) in
  overlapping environments; the save is refused and names the other workload.
- States: `proposed` (a deterministic draft or a Sol proposal: every quantity null, counted in no check, one
  "Review the proposals" finding), `authored`, `retired` (through `record.retire`, restorable).

### b.3 `quality.services[]` — business service, id `BSV-nnn` (new; closes C2-09)

Counter `quality.counters.service`. At most 40.

```
{ id, title (required), outcome, owner, alternateOwner, acceptanceMeaning, authorityId (component or data id),
  criticality: {tier: 'tier-1'|'tier-2'|'tier-3'|'tier-4'|'', basis},
  harmWindows: [{when, harm, basis}],                                    // time-dependent harm
  degradedModes: [{id:'DM-nn', trigger, behaviour, customerWording, maxDuration: Q('min'), conditionId?}],
  continuity: {recoveryTime: Q('min'), recoveryPoint: Q('min')},
  dependencies: {partyIds[], capabilityIds[], componentIds[]},
  journeyIds[], outcomeIds[], driverIds[], requirementIds[], requirementGroupIds[],
  source, open, origin, state?, confirmed, sourceSnapshot, provenance }
```

The business service is the one owner of degraded-mode records (gap review, F7). A workload condition of kind
`degraded` and a limit's overload policy point at `{serviceId, modeId}`; they do not restate the mode.

### b.4 `quality.objectives[]` — objective with error budget and allocations, id `SLO-nnn` (new)

Counter `quality.counters.objective`. At most 100.

```
{ id, title (required), serviceId, driverId (a quality-kind driver), workloadId, operationIds[], planIds[],
  indicator: {population, good, boundary, exclusions, missingData: 'unknown'|'bad'|'excluded'},   // default 'unknown'
  basis: 'event' | 'time',  objective: Q('%'),  window: Q('days'),
  burn: {fast: {factor: Q('x'), over: Q('min')}, slow: {factor: Q('x'), over: Q('min')}},
  burnOwner, drives: 'page' | 'restrict-release' | 'capacity-action' | 'review',
  allocations: [{id:'BA-nn', segment: {kind:'component'|'contract'|'realization'|'party', id},
                 value: Q('ms'|'%'), owner}],                                                      // <= 40
  combination: 'serial-sum' | 'parallel-max' | 'percentile-bound' | 'series-availability',
  margin: Q('ms'|'%'),
  owner, source, open, origin, state?, confirmed, sourceSnapshot, provenance,
  actor,                                                   // the account that last wrote its content (server)
  status: 'candidate' | 'agreed',
  agreement?: {at, actor, account?, reviewer, reference, stamp}    // written only by workload.objective-agree
}
```

- The error budget is derived, never stored: time basis `(1 − objective) × window`; event basis
  `(1 − objective) × eligible events in the window`, where eligible events come from the derived demand of
  `operationIds` under `normal`. With no workload the event budget reads `unknown`.
- `agreed` holds only while `agreement.stamp` equals the content stamp of the objective and the agreement is
  independent (c.2). A content change returns it to `candidate` without deleting the earlier agreement.
- An objective on a constraint-kind driver is refused: a hard constraint is never spendable from an error budget.

### b.5 `runtime.limits[]` — shared-resource envelope / dependency budget, id `LIM-nnn` (new; closes C10-08, C8-10)

Counter `runtime.counters.limit` (the runtime counters are outside the design fingerprint:
`public/review-domain.js:72`). At most 100.

```
{ id, title (required), environmentId,
  dependency: {kind: 'realization'|'party'|'contract'|'capability', id},
  resource: 'connections'|'requests'|'concurrency'|'sessions'|'messages'|'addresses'|'quota'|'retry-share',
  limit: Q,  reserve: Q,  reservePurpose,  owner,
  enforcement: {mechanism: 'application-pool'|'proxy'|'database-role-limit'|'provider-quota'|'admission-cap'|'',
                scope: 'process'|'instance'|'gateway'|'region'|'coordinated'|''},
  saturation,                                               // what happens above it
  allocations: [{id:'AL-nn', planId | '', label, role: 'service'|'worker'|'job'|'operations'|'recovery'|'other',
                 perProcess: Q, fixed: Q}],                 // <= 40; a row is per-plan (perProcess) or flat (fixed)
  overload: {policy: ''|'shed'|'defer'|'degrade', owner, mode: {serviceId, modeId}},
  workloadId, driverIds[], requirementIds[], requirementGroupIds[],
  source, open, origin, state?, confirmed, sourceSnapshot, provenance }
```

The population of a per-plan row under a condition is read from the workload, not typed on the limit:
`instances = condition.populations[planId]` (`old + new`, or `instances`), else the plan's `maxReplicas` for the
steady conditions, else unknown; `processes = condition.populations[planId].processes`, else the `normal` condition's,
else 1 as a listed default. So a rollout's parameters are stated once and every limit the plan consumes reads them.

### b.6 `workloadMigration` — beside the design (new, written only by the server upgrade and two commands)

```
{ definition: 1, at,
  toConfirm: [{id:'LW-nnn', kind:'review-objective'|'driver-target'|'task-input'|'alternative-input',
               ref: {path} | {driverId} | {taskId, key} | {alternativeId},
               reading: {…as the old code read it…}, stamp,
               resolved?: {how:'adopted'|'dismissed', at, actor, workloadId?, reason?}}] }
```

Added to the keys `reviewSource` leaves out (`public/review-domain.js:50`), as `dataOwnership` is, so no stamp moves.

### b.7 Extensions to existing records (all optional; an old record reads as before)

| Record | Addition | Why |
|---|---|---|
| Design-task analysis (`coauthoring.designTasks[].answers.analysis`, JSON) | `bindings: {[inputKey]: {workloadId, ref, conditionId}}` | A calculator input is a reference into the workload instead of a typed number. Absent on every existing task: `normaliseAnalysis` then emits exactly today's JSON, so stamps and measurements stay current. |
| Workbench alternative scenario and comparison (`workbench.alternatives[]`, `workbench.analyses[]`) | `capacity.ref: {workloadId, conditionId}` beside the typed numbers | The comparison's demand, per-replica rate and downstream ceiling are read from the workload and the limit. |
| Chapter 7 option (`technologyRealisation.records[].options[]`) | `workloadRef: {workloadId, conditionId}` beside the free-text `workloadProfile` | "Qualified for which workload" becomes a reference. Free text stays valid. |

No field is added to `runtime.plan`, `interfaces.contract` or `quality.driver`.

---

## c. The commands

### c.1 Where they plug in

A new prefix `workload.` routed in `worker.js:101` (`COMMAND_HANDLERS`, before nothing it could shadow):
`['workload.', applyWorkloadCommand]`. `COMMAND_PREFIXES` (`worker.js:102`) is derived from that table, so
`commandShape` (`worker.js:108-115`) accepts the prefix with no further change. `'workload.'` joins
`LARGE_COMMAND_PREFIXES` (`worker.js:106`) because a model with 400 routes exceeds 40 KB.

Handler signature, as every handler has: `applyWorkloadCommand(input, command, at, actor, {author, revision})`,
called at `worker.js:638`. It works on the copy it is handed (`documentCopy`), returns
`{document, selected, created?}`, and bumps the owning chapter's version and clears its review and handoff exactly as
`touch` does (`public/record-lifecycle.js:120-126`).

Everything after the handler is the existing boundary, unchanged: `carryProvenance`, `stampAuthorship` (who wrote, who
confirmed, four eyes on a confirmation when the project switches it on), `trackCommandChanges`, the journal with
actor, author kind and reason, `attachActionUndo`, the revision check, the activity row (`worker.js:638-659`).

### c.2 The commands

| Type | Payload | Who may send it | Validation (refusals) | Audit and reversal |
|---|---|---|---|---|
| `workload.model` | `{id?, …fields of b.2}` as a patch: a field left out keeps what is stored, `null` clears, a list replaces the list | A signed-in person. A Sol draft or an agent account only as a proposal: `state` forced to `proposed`, `confirmed` false, **every `Q.v` must be null** (refused otherwise: "Sol proposes operations and routes; a person states the figures") | Title required; bounds of b.2 (refused past a bound, never cut); every id it names exists (entry, edge, target, plan, driver, requirement, service); unit fits the field; ranges (`probability` 0..1, percentages 0..100, `attempts` >= 1); `Q` rules of b.1; one authority per scope; `confirmed: true` refused while any quantity lacks a basis | Journal event by the worker; change event with affected records (c.3); reversed by saving the earlier values (journalled) or `record.retire` / `record.restore`; stageable in `workspace.apply` |
| `workload.service` | `{id?, …fields of b.3}` patch | Person; Sol or agent as a proposal with no quantity | Title required; ids exist; a degraded mode needs a trigger and behaviour; mode ids unique and never reused | As above |
| `workload.objective` | `{id?, …fields of b.4 except status, agreement, actor}` patch | Person; Sol or agent as a proposal with no quantity | Driver exists and is a quality-kind driver, not a constraint; `objective` 0..100; window > 0; allocation segments exist; `status` or `agreement` in the payload refused | As above; a content change returns `status` to `candidate` |
| `workload.limit` | `{id?, …fields of b.5}` patch | Person; Sol or agent as a proposal with no quantity | Environment and dependency exist; each allocation's plan is in that environment; `reserve` <= `limit` when both are known; an overload policy needs an owner | As above |
| `workload.objective-agree` | `{id, reviewer, reference, reviewed: true, stamp}` | **A second signed-in person.** Listed in `REVIEW_TYPES` (`authorship.js:39`), so `refuseUnreviewable` (`authorship.js:60-66`) refuses an agent account and a Sol draft before anything is applied | Signed in; `stamp` equals the objective's current content stamp; objective and window known; `actor` is neither the objective's `actor` nor its `provenance.author.by` ("A second signed-in person agrees SLO-003: <name> wrote it."); reviewer and reference stated | Writes `agreement {at, actor, account?, reviewer, reference, stamp}` and `status: 'agreed'`. Not undoable; a later agreement supersedes, the earlier one stays in the journal |
| `workload.adopt` | `{ids: ['LW-nnn', …], reviewed: true}` | A signed-in person (in `REVIEW_TYPES`: never an agent or a Sol draft) | Entries exist and are unresolved; their `stamp` still matches what the old inputs say | Creates one authored workload (`origin: 'migrated'`) from the entries by the deterministic rule of e.4, marks them `adopted`. It is a design change, journalled as one. Reversed by `record.retire` of that workload, which reopens the entries |
| `workload.dismiss` | `{ids, reason (4..2000), reviewed: true}` | A signed-in person (in `REVIEW_TYPES`) | Entries exist and are unresolved | Marks them `dismissed` with who, when and why; the adapter stops reading those inputs. No design record changes |
| `record.retire`, `record.restore`, `record.keep` | existing | existing | The four collections join `COLLECTIONS` (`public/record-lifecycle.js:50`); a workload a limit or an objective still names cannot be retired (the existing "still named by" refusal, `:152-153`) | existing |
| `review.objective` (existing) | unchanged | unchanged | **New refusal only where a workload is authored:** "This project records its workload in Chapter 2 (WL-001). Change it there." With no authored workload it behaves exactly as today (`public/review-domain.js:481`) | unchanged |

**The second-person rule, and which helper it reuses.** rc.10.73.42 did not introduce one shared helper; it introduced
the same three-part rule in each domain: a signed-in actor, a different person from the author, never an agent
(`public/security-domain.js:68-69`, `public/review-domain.js:315-319` and `:491`,
`public/architecture-obligations.js:38-39`, `public/technology-realisation-domain.js:104`), over the central refusal
in `authorship.js`. `workload.objective-agree` uses exactly that: the central refusal by listing the command in
`REVIEW_TYPES`, and a reader `agreementIndependent(o)` written like `independentRiskApproval`
(`!!(o.agreement?.actor && o.actor && o.agreement.actor !== o.actor && o.agreement.account !== 'agent')`), with the
author read as `provenance.author.by`, the way `personWriter` reads it (`public/review-domain.js:390`). If wp9b
consolidates these into one shared helper, this command calls it and the local reader is deleted (section f).

**What is not an acceptance step here.** Confirming a workload, a service or a limit is the existing "a person's
review, not governance approval" flag; with the project's four-eyes setting on, `settle` already refuses a person
confirming what they wrote (`public/provenance.js:396-398`), because the four collections are added to
`PATHS_BY_PREFIX`. Accepting a capacity shortfall is a treatment of a finding: it goes through the existing
`review.disposition` path and wp9b's waiver record, not through a command of this package.

### c.3 Change tracking (server only)

`trackWorkloadChange(prior, next, command, at)` is called from `trackCommandChanges` beside the three existing
trackers (`worker.js:267-270`). When a `workload.*` command changes any quantity or structure, it derives demand for
both documents under every condition and records **one** change event:

- `source: {chapter: 2, id: 'WL-001', ref, kind: 'workload', title}`; `fields`: each changed quantity with before and
  after (at most 20, then a count);
- `items`: the records whose derived figures changed, each with a `why` in words and its `capturedStamp`: runtime
  plans (Chapter 10), realisations (Chapter 7), contracts to external parties (Chapter 8), the drivers the workload
  names (Chapter 2) and the decisions that weigh those drivers (Chapter 3). At most 60, as a requested review is
  (`public/changes-domain.js:275`), then "and n more" in the title.

These are ordinary change items: each is reviewed through `change.review`, one judgement may cover the cause, and the
project's four-eyes setting applies (`public/changes-domain.js:213-214`). `changeSource` and `quietChanges` already
accept a source that is not in `TARGET_LISTS` (`public/changes-domain.js:153`, `:188-197`); no route change is needed.

---

## d. Modules, hooks and the UI surface

### d.1 Modules to add

| Path | Loaded | Purity | Exports (what an engineer writes) |
|---|---|---|---|
| `public/demand-kernel.js` | On the route (moved code, byte-neutral; it takes the place of the lines it replaces) | Pure, no document access | `demandFlow(F, ids, entries, factor)` — the one propagation, moved from `public/desk-capacity.js:166-171` and `:491-497`; `replicasFor(rate, perInstance, utilisation)` — from `:214` and `:509`; `storeDemand(rate, {opsPerUnit, readShare, miss, cached})` — from `:270`; `poolCapacity(instances, perInstance, efficiency, downstream)` — from `public/quality-analysis.js:37` and `public/architecture-analysis.js:51`; `backlogDrain(backlog, service, arrival)` — from `public/quality-analysis.js:41`; `perSecond(v, unit)` — the table at `public/desk-capacity.js:387`; `KERNEL_VERSION = 'demand-kernel-1'` |
| `public/workload-hook.js` (superseded by Y1: not built; the route stub and S0's registry take its place) | On the route (about 0.4 KB) | Pure accessor | `workloadEngine()`, `installWorkloadEngine(api)`, `needsWorkloadEngine(p)`, `loadWorkloadEngine()` (the one `import('./workload-engine.js')`), `workloadReady(p)`, `workloadChecks(p, chapter)` (the engine's findings, or `[]` when the document needs no engine) |
| `public/workload-engine.js` (superseded by Y1: no entry of its own; `workload-package.js` registers the package and joins `design-package-readers.js`) | **The one new lazy entry**; imported statically by `worker.js` (server) and by the rc44 suites | Assembles the parts; at the end calls `installWorkloadEngine({…})` | Re-exports the API of section f.1 |
| `public/workload-model.js` | In the engine chunk | Pure | `WORKLOAD_ENGINE = 'workload-1'`, `UNITS`, `LIMITS`, `quantity(raw, spec)`, `normaliseWorkload/Service/Objective/Limit(p, raw, old)`, `workloads(p)`, `effectiveWorkload(p, {envId, profile})`, `legacyWorkload(p, profile)`, `conditionOf(W, id)`, `resolve(p, {workloadId, ref, conditionId})`, `workloadStamp(p, scope)` |
| `public/workload-derive.js` | In the engine chunk | Pure, deterministic, bounded | `deriveDemand(p, {conditionId, envId, workloadId?}) → Demand` (f.1); `deskObjective(R, p, cond)` — the recorded model projected onto the objective shape `capacityPlan` already takes |
| `public/workload-cards.js` | In the engine chunk | Pure | `CARDS` (the calculation registry: the six existing schemas referenced by topic, plus `demand`, `fleet-envelope`, `burst-backlog`, `outage-backlog`, `survivor-capacity`, `cache-fallback`, `human-capacity`; later files add theirs with `registerCard`), `registerCard(card)`, `evaluate(cardId, inputs) → Result`, `sensitivity(cardId, inputs)` |
| `public/workload-bindings.js` | In the engine chunk | Pure | `boundAnalysis(p, task)`, `resolveComparison(p, comparison)`, the `deadline-envelope` card |
| `public/workload-changes.js` | In the engine chunk (used on the server) | Pure | `trackWorkloadChange(prior, next, command, at)`, `affected(prior, next)` |
| `public/workload-checks.js` | In the engine chunk | Pure | `limitReading(p, limitId, conditionId)`, `backlogReading`, `survivorReading(p, planId, conditionId)`, `divergence(p)`, `findings(p, chapter)`, `limitingStage(p, conditionId)` |
| `public/workload-objectives.js` | In the engine chunk | Pure | `serviceReading(p, id)`, `objectiveReading(p, id)`, `agreementIndependent(o)`, `objectiveStamp(o)`, `agreeObjective(p, raw, at, actor, author)`, the `error-budget` and `budget-allocation` cards |
| `public/workload-domain.js` | In the engine chunk | Pure (works on the copy it is given) | `applyWorkloadCommand(input, command, at, actor, options)`: validates and saves the four record commands itself and dispatches `workload.adopt`, `workload.dismiss` (in `workload-upgrade`'s client-safe half, `public/workload-adopt.js`) and `workload.objective-agree` (in `workload-objectives.js`) through one table S1 writes, so later slices never edit this file |
| `public/workload-document.js` | In the engine chunk | Pure | `performanceSection(p)` (registered with `registerPerformanceSection`), `workloadRegisterMarkdown(p)`, `openItems(p)` |
| `public/workload-ui.js` | In the engine chunk | DOM | `mountWorkload(host, {store, chapter, view})`, `bindingPicker(host, {…})` |
| `public/workload-adopt.js` | In the engine chunk | Pure | `adoptLegacy(p, raw, at, actor)`, `dismissLegacy(p, raw, at, actor)`, `openMigration(p)` (an entry whose adopted workload has since been retired reads as open again), `workloadFromEntries(p, entries)` — the deterministic rule of e.4 |
| `public/workload-upgrade.js` | **Server only** (imported by `public/readings-upgrade.js`, which only the server loads: its own header, lines 3-5) | Pure | `WORKLOAD_DEFINITION = 1`, `needsWorkloadUpgrade(p)`, `upgradeWorkload(p)` (finds the old inputs with the readers that exist today: `scaleTarget`, `capacityObjective`) |

### d.2 Existing files touched (each a narrow hook)

| File · function · line | The change |
|---|---|
| `worker.js:101` `COMMAND_HANDLERS` | Add `['workload.', applyWorkloadCommand]`; import `./public/workload-engine.js` beside the `readings-upgrade` import (`worker.js:92`) so the engine is installed before any request |
| `worker.js:106` | Add `'workload.'` to `LARGE_COMMAND_PREFIXES` |
| `worker.js:267-270` `trackCommandChanges` | Add `trackWorkloadChange(prior,next,command,at);` and the same inside the `workspace.apply` loop at `:271` |
| `authorship.js:39` `REVIEW_TYPES` | Add `'workload.objective-agree'`, `'workload.adopt'`, `'workload.dismiss'` |
| `public/canonical-command.js:30` `STAGED_COMMANDS`; `:59` handlers | Add `'workload.model'`, `'workload.service'`, `'workload.objective'`, `'workload.limit'`; handler `workload: (...a) => { const e = workloadEngine(); if (!e) throw Error('Open the workload workspace before staging a workload change.'); return e.apply(...a); }` (the module imports only `workload-hook.js`) |
| `public/record-lifecycle.js:50` `COLLECTIONS` | Add `['quality.workloads',2]`, `['quality.services',2]`, `['quality.objectives',2]`, `['runtime.limits',10]` |
| `public/record-graph.js:15-58` `OBJECT_TYPES` | Add `workload|Workload model|2|intent`, `service|Business service|2|intent`, `objective|Service objective|2|intent`, `limit|Resource limit|10|deployment` |
| `public/record-graph.js:74-78` `RECORD_COLLECTIONS` | **Append** (after `view:workbench.views`, so the registration order of every existing record is unchanged and the `COMPONENTS` slice at `:225` is unaffected): `workload:quality.workloads service:quality.services objective:quality.objectives limit:runtime.limits` |
| `public/record-graph.js:200` `recordRelations` (before "Preserve declared context edges") | One line: `workloadEngine()?.relations(p, {rel, objects});` The engine states the relations of f.2. Skipped on the driver-scope graph (`part`), which returns at `:146` |
| `public/trace-kernel.js:19` `TRACE_LAYERS`; `:49-67` `TRACE_HOPS` | The layers and hops of f.2 (all marked context, so no spine and no governance check changes) |
| `public/provenance.js:56` `RECORD_NOUNS`; `:336` `PATHS_BY_PREFIX` | Nouns for the four paths; `workload: ['quality.workloads','quality.services','quality.objectives','runtime.limits']` |
| `public/review-domain.js:50` `reviewSource` | Add `'workloadMigration'` to the keys left out of the design |
| `public/review-domain.js:187` `performanceMarkdown`; `:588-589` | `registerPerformanceSection(section)` beside `registerChangeSection`; `performanceMarkdown` returns `performanceSection(p)` when one is registered, else today's text. The registered section calls `capacityMarkdown` (which stays where it is, `public/desk-capacity.js:361`, because `desk-validate.mjs:12` imports it) for the table and adds its own parts |
| `public/review-domain.js:481` `review.objective` | The refusal of c.2, one condition |
| `public/quality-domain.js:194` end of `qualityFindingsOf` | `result.push(...workloadChecks(p, 2));` |
| `public/runtime-domain.js:278-279` beside the scale readings | `fs.push(...workloadChecks(p, 10));` |
| `public/desk-capacity.js:80-99` `capacityObjective` | First branch: when `effectiveWorkload` finds an authored workload, return `workloadEngine().deskObjective(R, p, cond)`; otherwise today's code, unchanged, which is the legacy adapter for the desk profile |
| `public/desk-capacity.js:166-171`, `:214`, `:270`, `:491-497`, `:509` | Call `demand-kernel.js` instead of the inline arithmetic. With `factor = () => 1` and the roots as entries the figures are bit-identical (`x * 1 === x`) |
| `public/desk-capacity.js:437` `scaleReadings` | First branch for an authored workload: base, peak and per-replica rates from the engine at `peak`; otherwise today's driver reading, unchanged (the legacy adapter for the scale profile) |
| `public/quality-analysis.js:14-20` `normaliseAnalysis` | Accept and keep `bindings` when present (absent → byte-identical output). `:37`, `:41` call the kernel. `:87-92` `measurementCurrent`, `:96` and `:113`: pass `workloadEngine()?.boundAnalysis(p, t) ?? t.answers.analysis` so a bound input is resolved before the calculation. `:102-107` exported as `evidencePassage` |
| `public/architecture-analysis.js:48-52` `capacitySensitivity` | Call `poolCapacity`; `:12-24` normalisers accept `capacity.ref`; `:27-32` `alternativeMetrics` resolves a `ref` through the engine |
| `public/architecture-applicability.js:165`, `:237` | The envelope arithmetic written twice becomes one exported `callEnvelope(execution)`; export `declaredAttempts(contract)` (the count rule at `:261`). No reading changes |
| `public/technology-realisation-domain.js` option normaliser (the `workloadProfile` handling at `:192`, `:227-230`) | Accept and keep `workloadRef` |
| `public/project-store.js:173`, `:178`, `:192` | `await workloadReady(document)` before each `settleDocument`, so a document that holds workload records is never drawn before the engine is installed |
| `public/readings-upgrade.js:294` | Chain `upgradeWorkload`: `registerReadingsUpgrade(p => upgradeWorkload(upgradeOwnership(upgradeReadings(p))))` |
| `storage-upgrade.js:21-36` `storageUpgradeNeeded` | `if (needsWorkloadUpgrade(stored.document)) return true;` and one clause in the activity summary at `:46` |
| `public/utility-view.js` (lazy; crumbs at `:352-355`) | A third view of Chapter 2's Model tab, "Workload", that mounts `mountWorkload` |
| `public/deploy-view.js` (lazy; `reading()` at `:436-444`) | An "Envelopes" section and the survivor line beside "If a zone fails" |
| `public/desk-view.js` (lazy; `render()` at `:241`) | "What it takes" names its source (workload and condition, or "inferred"), offers the condition switch, and replaces "Save objective" with "Open the workload" where one is recorded |
| `public/quality-analysis-ui.js` (in the lazy design-task surface) | "Bind to the workload" on each input the workload can state |
| `public/alternative-editor.js` (lazy) | The same binding for a comparison's demand |
| `package.json` | `test:rc44-wp3-workload`, `test:rc44-wp3-workload-browser` |
| `client-bundle.mjs:294` (superseded by Y1: not touched; the gate is 150 since S0-D10) | `scripts: 149` with the dated note (lead's decision L2) |

### d.3 The lazy boundary, and why one new entry

(Superseded by Y1, see the revision at the top: the "needs" predicate below becomes the `needs` of the route stub
`p50-workload-route`, and "what loads on demand" is the shared first-draw entry, not an entry of wp3's own.)

- **What is on the route:** the kernel (moved code), the accessor, and the hooks of d.2. No validation, no card, no
  check, no editor, no document builder.
- **What loads on demand:** everything else, as one script. `needsWorkloadEngine(p)` is true when the document holds
  any of the four collections, or holds `workloadMigration` with an unresolved entry, or holds `workloadMigration`
  and a driver in the performance, scalability or capacity category (so the nudge to record a workload can be shown).
  `project-store.js` awaits the engine before it settles such a document, so there is never a frame in which a
  recorded workload is drawn without its readings, and the per-document caches (`public/document-memo.js:7-9`) are
  never filled without it.
- **On the server and in the suites** the engine is installed when `worker.js` (or a suite) imports
  `workload-engine.js`; nothing there ever sees it missing. This is the catalogue store's arrangement
  (`public/catalogue-store.js:30-34`) and the registered SDD builder's (`public/review-domain.js:580-589`).
- **Why a new entry and not an existing chunk.** The surface is mounted from three existing lazy views (Chapters 2,
  10, 11) and the design-task surface, and the route's accessor must be able to load the engine without loading a
  view. A module shared by several lazy entries becomes a chunk of its own under esbuild's splitting whichever entry
  "hosts" it, so hosting it in one view would not save the script; making it the entry gives exactly one script and
  one request. Estimated size 45 to 60 KB (above the 10 KB "tiny" line, so the `tiny` gate is untouched).
- **Fallback if the lead refuses a 149th script:** fold the engine into `desk-view.js` (the Chapter 11 view,
  112,113 B today) and have the accessor load that view's entry. Same script count as today, at the price of loading
  the desk for every project that records a workload. I do not recommend it.

### d.4 Estimated bytes on the route (to be measured in S1, S2 and S6)

(Y1 and AA2: the `workload-hook.js` row is not built, its place taken by one route stub of about 0.1 KB; the "shared
registration point" column is the one that applies; the bytes count against the chapters route cap of 3,266,560 B in the
one size check at each merge, with no allotment per package.)

| Hook | Static rows (fallback) | With a shared registration point (L1) |
|---|---|---|
| `workload-hook.js` | +430 | +430 (or +150 if the registry carries load and readiness) |
| `demand-kernel.js` and its callers (moved code, one propagation instead of two, one envelope instead of two) | −350 to −150 | the same |
| Engine branches in `capacityObjective` and `scaleReadings` | +230 | +230 |
| `quality-analysis.js` bindings | +110 | +110 |
| `review-domain.js` (key left out, registered section, objective refusal) | +230 | +230 |
| Findings hooks (two lines) and `project-store.js` (three awaits) | +170 | 0 |
| `canonical-command.js` staging | +200 | 0 |
| `record-graph.js` types, collections, relations hook | +330 | 0 |
| `record-lifecycle.js`, `provenance.js` | +300 | 0 |
| `trace-kernel.js` layers and hops | +260 | 0 |
| `technology-realisation-domain.js`, `architecture-analysis.js` (lazy or partly lazy) | +60 | +60 |
| **Total (estimate)** | **about +1.7 to +1.9 KB** | **about +0.4 to +0.6 KB** |

"Done" for S6 is a measurement, not this table: `node client-bundle.mjs` reports no violation, the chapters route delta
is recorded in the evidence file, and it is within what the lead allotted this package.

### d.5 The UI surface

No new tab, no new route, no new stylesheet rule. No LLM is needed for any of it.

**Chapter 2 · Model · "Workload"** (third view beside "Utility tree" and "What if", `public/utility-view.js`).

- Left: the model as five plain tables that reuse the Model views' table classes — Operations (with the derived mix
  beside each arrival), Routes (every Chapter 5 interaction and Chapter 8 contract is listed; a row with nothing
  recorded reads "once per unit · default"), Uses, Service rates, Conditions. Each cell is a quantity editor: value,
  unit (fixed by the column), basis chip (stated, assumed, measured), owner, source; "Not known" writes the open
  state; "Measured" opens the passage picker the design-task measurement form already uses.
- Top: the condition switch — Normal, Peak, Degraded, Recovery, then Rollout and any custom condition.
- Right: derived demand for the chosen condition, per component and per capability. Every figure opens its
  calculation card: the formula, the inputs with their basis, the defaults that were applied, the validity conditions
  with their state, what was not considered, the kernel and card versions, and the weakest basis the figure rests on.
  A figure that needs an unknown input reads "unknown" and names the input.
- Two further sections on the same view: Business services, and Objectives (the budget arithmetic shown as
  arithmetic; "Agree" asks for a second person and says who wrote the objective).
- Deterministic guidance (no provider): "Draft operations from the entry contracts" (one proposed operation per
  request contract from a party to a component, titled from the contract, every quantity not known); "Use the
  planning default" per cell; "Adopt the workload this design implied" where the migration left entries.

**Chapter 10 · Model · "Envelopes"** (a section of `reading()` in `public/deploy-view.js`): one worksheet per limit
and condition — each consumer row as `instances × processes × per-process`, the flat rows, the reserve, the total
against the limit, the pool size and the instance count that would break it, the enforcement mechanism or "none
stated". Under "If a zone fails": surviving capacity against the degraded demand for each hosting failure domain, in
the words "available by count; capacity short by …" when capacity is known.

**Chapter 11 · Model · "What it takes"** (`public/desk-view.js`): the source line names the workload and condition,
or says "inferred from the review objective / from QD-007's target text — not a recorded workload" with "Adopt".

**Design task calculation and workbench comparison:** "Bind to the workload" beside each input the workload states.

**Finding links** open the view at the record: `reviewSourceUrl(chapter, id, 'model')`
(`public/review-domain.js:189`). The Work tab gains no form: the four record types are deliberately not added to
`RECORD_FIELDS` (`public/record-fields.js`, 79,665 B on the route), which also means the field spark can never offer
a Sol draft for them (`worker.js:128`, `:146`).

**Sol.** No new mode. Sol may propose operations, classes, entries and routes as a `proposed` record in a reviewed
batch; the server refuses any figure from it. Sol may explain a calculation card. It never agrees, adopts, dismisses
or confirms (`authorship.js:60-66`).

---

## e. What is retired, and the migration

### e.1 One authority path per concern

| Concern | Authority after this package | Retired |
|---|---|---|
| The formulas (propagation, replicas, store demand, pool capacity, backlog drain, call envelope) | `public/demand-kernel.js` and `callEnvelope` | The second propagation in `scaleReadings` (`public/desk-capacity.js:491-497`); the replica arithmetic at `:509`; the pool formula in `capacitySensitivity` (`public/architecture-analysis.js:51`); the second envelope at `public/architecture-applicability.js:237` |
| The inputs, where a workload is recorded | `quality.workloads` (and `runtime.limits` for ceilings) | For that scope: the saved review objective, the regex reading of driver text, the desk's global assumptions, typed calculator inputs the workload states, typed comparison demand |
| The inputs, where none is recorded | `legacyWorkload(p, profile)`: one adapter, two profiles (`desk`, `scale`) because today's two readings differ and parity must hold | Nothing yet; see e.3 |
| The planning objective | A workload's entry operations | `review.objective` is refused once a workload is authored (c.2) |
| SDD "Performance specification" | The registered `performanceSection` | The direct call at `public/review-domain.js:187` |

### e.2 The consumers, each with its parity test

Golden values are captured from the **unchanged** code by the first step of S2 (`node rc44-wp3-workload-validate.mjs
--capture`, on the baseline commit), written to `audit/rc44/wp3/parity-golden.json` with the commit id and the SHA-256
of each source file read. Fixtures: the Bank Payment reference (`seedProject`), the same with a saved objective, the
five reference journeys (`public/reference-projects.js`), the `service-permits` and blank templates, and the driver
fixtures `scale-readings-validate.mjs` builds. Each parity case has two halves: **(i) untouched** — the same call
returns the golden value; **(ii) adopted** — after `workload.adopt` of the migration proposal the figures and states
are equal (labels that now name the workload are compared apart).

| # | Consumer (file · function) | Today's local path | After | Parity case |
|---|---|---|---|---|
| C1 | Review desk: `capacityObjective`, `capacityPlan` (`public/desk-capacity.js:80`, `:137`); read by `deskSource` (`public/desk-vitals.js:75-76`), `reviewCapacity` (`public/review-domain.js:181`), `public/product-choice.js:168`, `public/readiness-model.js:220` | Saved objective or driver; global assumptions; inline arithmetic | Objective projected from the workload at the chosen condition; per-part rates from `rates`; connections from the limit's allocations where a limit exists; kernel arithmetic | P1: `lambda`, `base`, `zones`, `hops`, every row's demand, replicas, connections, verdict state and words, totals, counts, `lambdaMath`, notes |
| C2 | Chapter 10 scale readings: `scaleReadings` (`public/desk-capacity.js:437`), raised at `public/runtime-domain.js:278`, drawn by `public/deploy-view.js:25` and `public/desk-view.js:40` | Drivers by regex, default assumptions, peak 3 | Workload at `peak`; SCALE-UNCONFIRMED names the assumed and unknown quantities | P2: `inputs`, `derived`, `findings`, `figures`, `peak`, `base`, `budget`, `assumptions`, `summary`; and `runtimeFindings` codes and ids |
| C3 | Design-task calculators: `analyseQuality` (`public/quality-analysis.js:21`); read by `public/architecture-knowledge.js:3`, `public/quality-analysis-ui.js:2`, `public/design-task-state.js:1`, `public/architecture-design.js:4`, `public/architecture-case.js:5`, `public/review-domain.js:8` | Inputs typed per task | Inputs may be bound; a bound input is resolved from the workload before the unchanged formula | P3: outputs, warnings, assumptions and **stamp** for all seven topics and their option variants; `normaliseAnalysis` byte-identical for an unbound input; `measurementCurrent` unchanged for every existing measurement fixture; a bound analysis equals the typed one when the workload states the same numbers |
| C4 | Workbench alternatives: `capacitySensitivity`, `alternativeMetrics` (`public/architecture-analysis.js:48`, `:27`); read by `public/workbench-domain.js:4`, `public/workbench-actions.js:3` | Typed per alternative and per comparison; its own pool formula | Kernel formula; demand, rate and ceiling by reference | P4: a grid of inputs including failed = replicas and growth 0 and 1000; the fixture comparison |
| C5 | Execution agreements and journeys: `assessContractExecution`, `executionJourney` (`public/architecture-applicability.js:163-168`, `:237-240`, `:259-265`); and the latency readers `timeoutPath` (`public/desk-vitals.js:108`), `syncPath` (`public/design-reasoning.js:320`) | Attempts never reach demand; `timeoutMs` and the execution timing are separate | `routes[].attempts: {from: 'execution'}` reads `declaredAttempts`; one `callEnvelope`; the new `deadline-envelope` card reads the execution timing where declared and `timeoutMs` otherwise and raises `timeout-mismatch` when both exist and disagree | P5: `declared-envelope`, `nested-wait`, `nested-attempts` for the fixtures of `execution-journey-validate.mjs`; the engine's multiplier equals `nested-attempts` on the same chain; `timeoutPath` output unchanged for every fixture (the vital is switched to `callEnvelope` only for contracts where P5 shows no asserted reading moves; otherwise it stays and the finding explains) |
| C6 | Technology comparison: `ceilingFor` (`public/desk-capacity.js:195`), `public/product-choice.js:17` | Demand from reading 1 | The same, now fed by the workload; hottest-unit demand = demand × `hotShare` where stated (1 by default: today's figure) | P6: the choice reading's ceilings for fixtures with a load |
| C7 | Runtime budgets: `public/runtime-domain.js:236`, `:242` | Counts and a basis flag | Unchanged checks, plus the limit readings as new findings | P7: `runtimeFindings` equal to golden for every fixture without the new records |
| C8 | SDD and ARS: `performanceMarkdown` (`public/review-domain.js:187`), `qualityAnalysisMarkdown` (`public/quality-analysis.js:112`), `public/readiness-model.js:220-222` | Reading 1 and 3 | The registered section | P8: the section text for the untouched fixtures; the table rows after adoption |
| P0 | Stamp safety | — | — | `reviewSourceStamp`, every chapter stamp and `traceStamp` (`public/review-domain.js:255`) are unchanged by loading the engine and by `upgradeWorkload` for every fixture |

### e.3 The legacy adapter and its stated retirement

In rc44 a document with no authored workload is still read from its old inputs, through `legacyWorkload`. That is an
input adapter, not a second calculation: both profiles run the kernel.

It retires in **rc.10.73.45**, when all of these hold:

1. half (ii) of P1, P2, P6 and P8 is green for every fixture (an adopted workload reproduces the legacy reading);
2. the existing suites that pass driver-only or objective-only fixtures to `scaleReadings`, `capacityObjective` and
   `deskSource` (`scale-readings-validate.mjs`, `desk-validate.mjs`, `rc42-g5-runtime-validate.mjs`,
   `round27-model-validate.mjs`, and those listed by a search for those three calls) are changed, in a reviewed
   change audited like every change to a pre-existing suite, to pass their fixture through the migration first, with
   every assertion unchanged;
3. the owner decides, on a read-only report of stored projects with unresolved `workloadMigration` entries, that an
   unresolved entry then reads "no load stated" with its migration finding.

Until then the adapter's existence is itself visible: every reading it feeds says "inferred, not a recorded workload".

### e.4 Old documents

- **They keep loading.** Nothing reads a key that may be absent without a guard; `withQuality`
  (`public/quality-domain.js:138`) is unchanged.
- **The upgrade** (`public/workload-upgrade.js`, on read, stored once, like D9): writes `workloadMigration` with one
  entry per old input found — the saved review objective; each driver `scaleTarget` reads as a rate, users or surge;
  each applied design task whose calculation types an arrival, hit ratio, service rate or attempt count; each
  alternative with capacity evidence. It changes **no** design record and sits outside the design fingerprint, so no
  review, baseline, approval or handoff lapses. A document with no such input gets an empty record, so nothing
  written later is read as an old claim.
- **No new guarantee.** An adopted workload carries `origin: 'migrated'`; the reviewed objective's figure becomes
  `stated` with the reviewer as owner and "migrated from the review objective saved <date>" as source; every desk
  assumption and every figure read from a driver's wording becomes `assumed`. The record is unconfirmed. Findings
  computed from it are to-confirm, as SCALE-UNCONFIRMED is today.
- **Adoption is a design change** and behaves as one: Chapter 2's checks, the Chapter 3 intake and the final review
  checks must be run again. The dialog says so before the person confirms.
- **New findings never appear on a document that holds none of the new records and no migration record**
  (`workloadChecks` returns `[]`), so the exact finding lists existing suites assert are unchanged.

---

## f. Shared contracts

### f.1 What this package PROVIDES

**P-1 The engine API** (`workloadEngine()` from `public/workload-hook.js`; `null` only in a browser that holds no
document needing it; superseded by Y1 for where it loads: the API is exported by the package's modules, which the shared
first-draw entry holds, and the browser reaches the package through S0's registry, not through an accessor of its own):

```
deriveDemand(p, {conditionId, envId?, workloadId?}) → Demand
conditions(p, envId?) → [{id, kind, title, workloadIds}]
resolve(p, {workloadId, ref, conditionId?}) → Q | null          // ref e.g. 'operations/OP-01/arrival'
evaluate(cardId, inputs) → Result        cards() → [{id, version, title, inputs, formula, …}]
limitReading(p, limitId, conditionId) → Result & {rows, used, available, breaks}
survivorReading(p, planId, conditionId) → Result & {domains}
objectiveReading(p, objectiveId) → Result & {budget, allocations, agreed}
serviceReading(p, serviceId) → {drivers, plans, limits, objectives, modes}
limitingStage(p, conditionId) → {targetId, headroom, …} | {state: 'unknown', unknown}
findings(p, chapter) → finding[]         affected(prior, next) → [{chapter, id, why}]
stamp(p, {workloadId?, limitId?, objectiveId?, conditionId?}) → string
boundAnalysis(p, task) → analysis JSON with bound inputs resolved
performanceSection(p) → markdown        openItems(p) → [{recordId, ref, question}]
apply(input, command, at, actor, options) → {document, selected}
relations(p, {rel, objects})
```

**P-2 `Demand`.**

```
{ engine: 'workload-1', kernel: 'demand-kernel-1', legacy: boolean, workloadIds, conditionId, envId,
  operations: [{id, title, arrival, share, state}],
  components: Map<id, {rate, unit, byOperation, state, unknown: [ref]}>,
  edges:      Map<edgeId, {rate, probability, fanOut, attempts, defaults: ['probability'|'fanOut'|'attempts']}>,
  capabilities: Map<capabilityId, {category, rate, unit, from: [componentId]}>,
  targets:    Map<targetId, {ops, reads, sourceReads, cacheReads, writes, messages, hottest, growthPerDay, retained}>,
  external:   Map<contractId, {rate, attemptsBound}>,
  assumptions: [text], defaults: [text], unknown: [ref], notConsidered: [text], stamp }
```

**P-3 `Result`** (every calculated figure anywhere in AIW that comes from this package):

```
{ id, evidenceClass: 'calculated',
  card: {id, version}, engine: 'workload-1', kernel: 'demand-kernel-1',
  scope: {workloadId?, conditionId?, targetId?, limitId?, objectiveId?},
  state: 'computed' | 'unknown' | 'invalid' | 'bounded-out',
  value, unit, formula,
  inputs: [{ref, v, u, b, by, src}],
  assumptions: [text], defaults: [text],
  validity: [{id, text, holds: true | false | null}],
  uncertainty: {basis: 'measured' | 'stated' | 'assumed' | 'unknown', unknown: [ref],
                sensitive: [{ref, lo, hi, crosses: boolean}]},
  notConsidered: [text], bounds: {evaluations, limit}, stamp }
```

`evidenceClass` is always `calculated`. A result is never `simulated`, `observed` or `approved`, whatever the basis of
its inputs; a `measured` input makes the *input* measured, not the result observed.

**P-4 Record ids and shapes:** WL-nnn, BSV-nnn (with degraded modes DM-nn, the one home of degraded-mode records),
SLO-nnn, LIM-nnn, and `Q`, as in section b.

**P-5 Named conditions:** ids `normal`, `peak`, `degraded`, `recovery`, kind `rollout`. Any package that describes a
failure, recovery, release or load case refers to a condition by `{workloadId, conditionId}`.

**P-6 The binding shape** `{workloadId, ref, conditionId}` for any record that wants a figure by reference.

**P-7 Finding codes** (chapter, level):

- Chapter 2: `workload-definition` E, `workload-source-change` E, `workload-unknown` W, `workload-unconfirmed` W,
  `workload-missing` W (a performance, scalability or capacity driver with a measurable target that no workload
  names), `workload-divergence` W (two old inputs, or a typed calculator input and the workload, state different
  values for one scope), `workload-migration` W, `service-definition` E, `service-continuity` W, `service-weaker` W
  (a plan's or capability's recovery figure weaker than its service's), `objective-definition` E, `objective-hard` E,
  `objective-unagreed` W, `budget-overrun` E when computed only from confirmed inputs else W, `budget-percentile` W
  (a percentile metric allocated by sum).
- Chapter 8: `timeout-mismatch` W, `deadline-overrun` W.
- Chapter 10: `limit-definition` E, `limit-breach` E (a stated or measured limit exceeded by confirmed figures),
  `limit-exceeded` W (the same with any assumed or unconfirmed figure), `limit-unenforced` W, `limit-unknown` W,
  `backlog-infeasible` W ("Completion promise infeasible under burst"; names admission, contract revision or
  qualified capacity), `capacity-infeasible` W, E when computed only from confirmed inputs, `survivor-short` W
  (never passes anything), `overload-undecided` W.
- No finding of this package ever reads "met", "passed" or "holds". The strongest positive wording is "fits by the
  recorded figures; not measured".
- **Claimed non-waivable:** `C10:limit-breach`. wp9b decides and adds it to its class list (today
  `public/review-domain.js:122`).

**P-8 Stageable command types** for a change plan: `workload.model`, `workload.service`, `workload.objective`,
`workload.limit`; and `affected(prior, next)` for the consequences of a staged change before it is saved.

### f.2 What this package provides for the one trace reading

Object types: `workload`, `service`, `objective`, `limit`. Relations stated by the engine through the one emitter:

| Relation | From → to | Source |
|---|---|---|
| `fulfils` | requirement → workload, service, objective, limit | `<path>.requirementIds` (and groups), as every record |
| `assumes` | driver → workload | `quality.workloads.driverIds` |
| `loads` | workload → entry component or contract | `quality.workloads.operations.entry` |
| `describes` | workload → service | `quality.workloads.serviceId` |
| `groups` | service → driver, component, capability, party | `quality.services.*Ids` |
| `measures` | objective → driver | `quality.objectives.driverId` |
| `partOf` | objective → service | `quality.objectives.serviceId` |
| `allocates` | objective → segment | `quality.objectives.allocations` |
| `limits` | limit → dependency | `runtime.limits.dependency` |
| `budgets` | limit → consuming plan | `runtime.limits.allocations.planId` |

Layers and hops for `public/trace-kernel.js` (all context hops, so `requirementSpine` and every governance check that
reads it are unchanged; `traceStamp` at `public/review-domain.js:255` enumerates its own layers and is unchanged):

```
TRACE_LAYERS: … 'driver', 'service', 'workload', 'objective', 'decision', … 'plan', 'limit', 'placement', …
named('service'), named('workload'), named('objective'), named('limit')
hop('service',   'groups',   'driver', {dir:'in', ctx:1})
hop('workload',  'assumes',  'driver', {ctx:1}),  hop('workload', 'describes', 'service', {dir:'in', ctx:1})
hop('objective', 'measures', 'driver', {dir:'in', ctx:1}),  hop('objective', 'partOf', 'service', {dir:'in', ctx:1})
hop('limit',     'budgets',  'plan',   {dir:'in', ctx:1}),  hop('limit', 'limits', 'capability realization contract', {dir:'in', ctx:1})
```

### f.3 What this package NEEDS

| From | What | If it does not arrive |
|---|---|---|
| Lead (or wp7) | **N-1** One registration point on the route for record kinds, relations, layers and hops, check families, staged handlers and the "document needs this lazy part" predicate (L1) | I add the static rows of d.2 at about 1.8 KB |
| Lead | **N-2** The 149th script (L2) and a ruling that no package adds CSS (L3) | Fallback of d.3 |
| wp7-views | **N-3** Labels and columns for the four new trace layers wherever a view lists layers; the SDD placement of `performanceSection`, `workloadRegisterMarkdown` and `openItems` (Appendix B); the evidence-class label next to every `Result` it prints | The layers are walked but a view that lists layers by a fixed table will not show them |
| wp9b-governance | **N-4** The shared second-person helper if it consolidates the per-domain rules; `C10:limit-breach` in the non-waivable class; a decision outcome "infeasible" that `capacity-infeasible` can point to; the waiver record for an accepted shortfall | Local reader of c.2; the finding stays an ordinary error |
| wp9a-deployment | **N-5** Stable ids for failure sets and topology elements that `conditions[].unavailable` can name (today only zones and their `failureDomainKey`, `public/runtime-model.js`); the release strategy's instance counts written into the `rollout` condition's `populations` through `workload.model`, not kept as a second number | Survivor readings stay per hosting failure domain; rollout numbers are typed in the workload view |
| wp9c-contexts-ops | **N-6** Alert and runbook records that cite `SLO-nnn`; partition records that `uses[].hotShare` can cite | Objectives carry `burnOwner` and `drives` only |
| wp6-evidence | **N-7** An observation record that binds `{workloadId, conditionId, stamp}`; then `Q.ev` may cite an observation instead of a raw passage | `Q.ev` stays a source passage |
| wp1-knowledge | **N-8** A way to link a concept's "calculation" form to a card id for explanation. No candidate or unreleased value ever enters the engine; a released default arrives as a proposal a person keeps, with basis `assumed` | Cards carry only their own built-in text |
| wp2-adoption | **N-9** If the adoption record carries parameters, it uses binding shape P-6; it keeps `answers.analysis` (or its successor) compatible with `bindings` | Adoption parameters stay typed |
| wp4-behaviour | **N-10** Its retry, timeout and uncertain-outcome evaluators read `declaredAttempts` and `callEnvelope` (`public/architecture-applicability.js`) and refer to conditions by P-5 | Two readings of attempts could appear |
| wp5-change-plan | **N-11** Calls `affected(prior, next)` for workload consequences; stages the four command types | Consequences appear only after the save |
| wp8-guided | **N-12** Shows the deterministic guidance of d.5 in its question-led stage frame | It stays inside the Workload view |

---

## g. Slices

Suite: `rc44-wp3-workload-validate.mjs`, registered once as `test:rc44-wp3-workload`. It is a runner over part files so
parallel slices never edit the same lines: `rc44-wp3-workload/s1-records.mjs` … `s5-objectives.mjs`, with shared
synthetic fixtures in `rc44-wp3-workload/fixtures.mjs` (owned by S1; later slices add exports at the end). Plain node
assertions, as the neighbouring suites. Browser suite: `rc44-wp3-workload-browser-validate.mjs` (S6).

```
S1 ──► S2 ──► S3 ─┐
        │         ├──► S6
        ├──► S4 ──┤
        └──► S5 ──┘
```

### S1 — Records, commands, registration, the engine shell

- **Depends on:** nothing.
- **Owns** (superseded by Y1 for the first two files: S1 owns `public/workload-package.js`, its line in
  `public/design-package-readers.js`, its route stub and its line of `design-packages.js` instead; see the revision at
  the top): `public/workload-hook.js`, `public/workload-engine.js` (it imports every part by name from the start;
  parts not yet written are stubs that refuse with "not available yet", so no later slice edits it),
  `public/workload-model.js`, `public/workload-domain.js` (the four record commands and the dispatch table), the hooks in
  `worker.js:101`/`:106`, `authorship.js:39`, `public/canonical-command.js`, `public/record-lifecycle.js:50`,
  `public/record-graph.js`, `public/trace-kernel.js`, `public/provenance.js`, `public/review-domain.js:50`,
  `public/quality-domain.js:194`, `public/project-store.js`, `public/quality-analysis.js:102-107`
  (`evidencePassage` export only), `package.json` (the one test line), `s1-records.mjs`, `fixtures.mjs`.
- **Tests first** (`s1-records.mjs`):
  1. each command creates, patches and refuses as c.2 says (bounds, unknown ids, unit, ranges, null without open,
     measured without a passage, a passage whose SHA-256 does not match, a second workload on the same entry);
  2. a Sol draft and an agent account: any non-null figure refused; the record is proposed and counted in no check;
     `confirmed: true` refused by `refuseUnreviewable`;
  3. `record.retire` refused while a limit names the workload; retire and restore round-trip;
  4. the four record kinds appear in `recordGraph`, each relation of f.2 is stated once, `forwardTrace` from a driver
     reaches its workload and from a plan its limit, and `requirementSpine` of every fixture is unchanged;
  5. `reviewSourceStamp` of every fixture is unchanged by importing the engine;
  6. with four eyes on, the author's own `confirmed: true` is refused by `settle`.
  **Fails today:** case 1's first line — `commandShape` answers `unknown_command` for `workload.model`
  (`worker.js:113`).
- **Done when:** the part is green; every pre-existing suite is unchanged and green; `node client-bundle.mjs` passes
  with the route delta recorded.

### S2 — The kernel, the derivation, the adapter, the desk and the scale readings

- **Depends on:** S1.
- **Owns:** `public/demand-kernel.js`, `public/workload-derive.js`, `public/workload-upgrade.js`,
  `public/workload-adopt.js`, `public/desk-capacity.js`, `public/readings-upgrade.js:294`, `storage-upgrade.js`,
  `public/review-domain.js:481`, `audit/rc44/wp3/parity-golden.json`, `s2-derive.mjs`.
- **First step:** capture the goldens on the baseline commit, before any other edit.
- **Tests first** (`s2-derive.mjs`): P0, P1, P2, P6 (both halves); derivation on the synthetic fixture of section h
  for all four conditions; **the cache-miss case** — changing `uses[US-001].cacheMiss` from 20 % to 35 % changes the
  store's source reads from 48 to 84 a second under `normal` in `deriveDemand`, in the desk row for the store
  (`capacityPlan`), and in the scale reading for the store's plan, and changes nothing else; an unknown arrival makes
  every figure downstream of that operation `unknown` and names it; a route with no row is listed under `defaults`;
  `attempts: {from: 'execution'}` equals `declaredAttempts`; the upgrade writes `workloadMigration` and moves no
  stamp; adopt and dismiss; `review.objective` refused once a workload is authored and unchanged before.
  **Fails today:** the cache-miss case — the desk reads one global `cacheHitRatio` from the saved objective
  (`public/desk-capacity.js:44`, `:268`), the scale readings ignore the cache altogether (`:503-511`), and no record
  holds a miss ratio.
- **Done when:** the part is green; `test:scale-readings`, `test:desk`, `test:desk-fixes`, `test:rc42-g5-runtime`,
  `test:scale`, `test:runtime` are unchanged and green; the route delta is recorded.

### S3 — Limits, populations, backlog, survivors, Chapter 10 findings, change tracking

- **Depends on:** S2.
- **Owns:** `public/workload-cards.js` (the registry and the cards `fleet-envelope`, `burst-backlog`,
  `outage-backlog`, `survivor-capacity`, `cache-fallback`, `human-capacity`), `public/workload-checks.js`,
  `public/workload-changes.js`, `public/runtime-domain.js:278-279`, `worker.js:267-271`, `s3-limits.mjs`.
- **Tests first** (`s3-limits.mjs`):
  1. **the rollout case** — LIM-001 (connections, limit 500 stated, reserve 50) with a row for the API plan at 25 per
     process: under `normal` 12 instances → 300; under the `rollout` condition with `old 12` and `new 12` →
     **600**, plus the worker row (4 × 10 = 40) and the flat operations row (10) = 650 against 450 available →
     `limit-breach` once the figures are confirmed, `limit-exceeded` while any is assumed; changing the condition's
     `new` to 3 gives 15 × 25 + 50 = 425 → no finding, with "25 spare" in the reading; the change is journalled with
     LIM-001's consuming plan among the affected records;
  2. the sensitivity line names what breaks the envelope: under `normal`, with 50 taken by the other rows, a pool
     above 33 per process at 12 instances, or more than 16 instances at 25 per process;
  3. burst 180 a second for 600 s against a budget of 90 → backlog 54,000, drain 1,800 s at a steady 60, and
     `backlog-infeasible` against a 120 s promise, naming the three remedies; no surplus → "never drains";
  4. placements [6, 1, 1] over three failure domains: survivors after the largest domain = 2 × per-instance rate ×
     utilisation against degraded demand × attempts → `survivor-short`; with no service rate → `unknown`, never a pass;
  5. a quota on a party: demand × declared attempts against the limit;
  6. bounded evaluation: a model at every bound completes within the evaluation limit, and one over it answers
     `bounded-out` with what was not evaluated.
  **Fails today:** case 1 — nothing can state 25 connections per process or a rollout population, and the desk's
  figure is desk-sized replicas × 10 (`public/desk-capacity.js:218`).
- **Done when:** the part is green; `test:runtime`, `test:rc42-g5-runtime` unchanged and green.

### S4 — Calculators, alternatives, execution timing, technology reference

- **Depends on:** S2 (parallel with S3 and S5).
- **Owns:** `public/quality-analysis.js` (except the lines S1 exported), `public/architecture-analysis.js`,
  `public/architecture-applicability.js`, `public/technology-realisation-domain.js` (`workloadRef` only),
  `boundAnalysis` and the `deadline-envelope` card in `public/workload-bindings.js` (a new file in the engine chunk,
  so S3's `workload-cards.js` is not edited), `s4-bindings.mjs`.
- **Tests first** (`s4-bindings.mjs`): P3, P4, P5; a task whose read calculation is bound to US-001 follows the
  cache-miss change of S2 (its `source-demand` output moves from 48 to 84) and its earlier measurement reads
  "Earlier model or source; review required" through the existing `measurementCurrent`; `workload-divergence` for a
  task that types 400 reads a second where the workload derives 240; `timeout-mismatch` for a contract with
  `timeoutMs` 2000 and an attempt timeout of 9000.
  **Fails today:** the bound-calculation case — `normaliseAnalysis` drops everything but `inputs` and `scenario`
  (`public/quality-analysis.js:19`).
- **Done when:** the part is green; `test:execution-journey`, `test:execution-composition`, `test:composition`,
  `architecture-design-validate.mjs` and `architecture-knowledge-unit-validate.mjs` unchanged and green.

### S5 — Business services, objectives, error budgets, the document section

- **Depends on:** S2 (parallel with S3 and S4).
- **Owns:** `public/workload-objectives.js` (with `agreeObjective`), `public/workload-document.js`,
  `public/review-domain.js:187` and `:588-589`, `s5-objectives.mjs`. Its cards register through `registerCard`, so
  S3's `workload-cards.js` is not edited.
- **Tests first** (`s5-objectives.mjs`): time budget 99.9 % over 30 days = 43.2 minutes shown as arithmetic; event
  budget from the demand of the linked operations, `unknown` without a workload; an objective on a constraint driver
  refused; agree refused for the author, for an agent account, for a Sol draft, without sign-in and on a stale stamp,
  accepted for a second person, and lapsed by a content change; allocations 60 + 70 + 40 with margin 30 against 200 ms
  fit, 60 + 70 + 60 overrun; a percentile metric with `serial-sum` raises `budget-percentile`; `service-weaker` when a
  plan's recovery minutes exceed its service's; P8.
  **Fails today:** the agree case — there is no objective record and no command.
- **Done when:** the part is green; `test:quality`, `ars-validate.mjs` and the SDD suites unchanged and green.

### S6 — The surface, the browser suite, the gates, the evidence

- **Depends on:** S3, S4, S5.
- **Owns:** `public/workload-ui.js`, the mounts in `public/utility-view.js`, `public/deploy-view.js`,
  `public/desk-view.js`, `public/quality-analysis-ui.js`, `public/alternative-editor.js`, `client-bundle.mjs:294`,
  `rc44-wp3-workload-browser-validate.mjs`, `audit/rc44/wp3/evidence.json`.
- **Tests first** (browser): open the synthetic project; the Workload view lists the operations and the four
  conditions; set the cache-miss ratio and watch the store's figure change on Chapter 2, Chapter 10 and the desk
  without a reload; switch to Rollout and read 600 on the envelope; a second account agrees the objective and the
  first is refused in words; with no provider configured every step works; no stylesheet rule was added (the built CSS
  size is unchanged); a project with none of the new records never requests the engine script.
- **Done when:** both suites are green; `node client-bundle.mjs` reports no violation and the report is kept;
  `audit/rc44/wp3/evidence.json` records the suites, the golden file's SHA-256, the size deltas, the open external
  dependencies and `productionAccepted: false`.

---

## h. The proof scenario

**System family:** transactional. **Fixture:** "Harbourline Ferry Reservations", synthetic, written for this suite
(`rc44-wp3-workload/fixtures.mjs`); it contains no client material.

Design in the fixture: a booking API component, an availability service, a reservation worker, a transactional store
realisation "reservations database" with a cache in front of availability reads, a queue, and a payment provider as an
external party; one production environment with three zones in three failure domains; the API's runtime plan with
`maxReplicas` 12.

| Step | What happens | What proves it |
|---|---|---|
| 1 Source concept | The candidate teaching passage "Budget database connections across processes" from the first handbook slice (`/home/user/hb-review/Application_Architecture_Master.md:461-465`; source file `Application_Architecture_Master.docx`, SHA-256 `64c3e5aa5bfd9cc66db328a7b676fea0affb6f5c9fe3af483b1810640f185d8c` as recorded in `audit/rc42/handbook-source-hashes.json:12-14`), and "Calculate a capacity contradiction" (`:371-377`) | Shown with source, locator and status "candidate · not released". The suite asserts that with the passage present or absent every `Result` and finding is identical: it feeds nothing |
| 2 Explanation | The `fleet-envelope` and `burst-backlog` cards: formula, inputs, validity, what is not considered. Their text is AIW's own built-in card text; the passage is linked as teaching only (N-8) | Card output for the fixture's inputs |
| 3 Model application | A person records BSV-001 "Book a sailing"; WL-001 with OP-01 Search sailings 240 a second (stated, with a passage in a synthetic source), OP-02 Hold a seat 40 a second (assumed), OP-03 Confirm booking 12 a second (assumed); the availability read with cache miss 20 % (assumed); `peak` × 3; `degraded` with the cache unavailable (miss 100 %) and one failure domain lost; `rollout` with 12 old and 12 new API instances; LIM-001 database connections 500 (stated) less 50 reserve, the API at 25 per process, the worker at 10 × 4, operations 10; LIM-002 provider quota 30 a second (stated); SLO-001 on the acknowledgement driver | The commands of c.2 through the boundary; the journal shows who wrote each |
| 4 Consequences | Normal: source reads 48 a second; peak: 144; degraded at normal arrival: 240. Envelope: steady 350 of 450; rollout **650 of 450**. Confirmations at peak: 36 a second against a quota of 30, before retries; with the execution agreement's 3 attempts the exposure bound is 108 | `deriveDemand`, `limitReading`; findings `limit-exceeded` / `limit-breach`, `capacity-infeasible`; each names its assumptions and unknowns |
| 5 Challenge | (a) Cache miss 20 → 35 %: 48 → 84 on Chapter 2, Chapter 10, the desk, the bound read calculation and the SDD section, and nowhere else. (b) Rollout `new` 12 → 3: 425 of 450, the finding clears, the change lists the plan. (c) Burst on OP-03 against the quota: a backlog that the stated promise cannot survive. (d) The recovery condition's backlog is left "not known": every recovery figure reads `unknown` and names it | The suite's S2, S3 and S4 cases on this fixture |
| 6 Evidence | Every figure is `calculated`. One input (the API's rate per instance) is entered as `measured` with a passage of a synthetic load-test note; the result that uses it stays `calculated` and says its weakest basis is `assumed`. A second person agrees SLO-001; the author's attempt is refused. Nothing is marked observed or approved | `Result.evidenceClass`, `uncertainty.basis`; the agree refusals |
| 7 SDD | "Performance specification" from the registered section: the workload table with basis, owner and unknowns; derived demand per condition; the envelope worksheet with 600 in the rollout row; the objective and its budget arithmetic; the calculation cards with versions; the unknown inputs in the open-items list | P8 and a text assertion on the built section |

---

## i. Gaps, risks, and what cannot honestly be delivered yet

### i.1 Gap ids closed

| Gap | How |
|---|---|
| C2-03 | The workload record; readers use it first; inference is labelled; `workload-missing`; burst arithmetic against a promise |
| C2-09 | The business-service record, with degraded modes, continuity targets, dependencies and `service-weaker` |
| C10-07 | Work classes and mix, visits per interaction (fan-out, probability, attempts), a basic human stage, `limitingStage` |
| C10-08 | `runtime.limits` with reserve, allocations per role, surge and draining through the rollout population, enforcement, `limit-unenforced`, sensitivity. **Not** the structured autoscaling block or the capacity-change record |
| C10-09 | `burst-backlog`, `outage-backlog`, `backlog-infeasible` with the three remedies; a basis on every figure |
| C10-06 | `survivor-capacity` per hosting failure domain from recorded placements × rate × utilisation × attempts, capped by a limit; `survivor-short`; `overload-undecided`. **Not** the maintenance-plus-failure case |
| C8-10 | A limit on a party or realisation with caller populations at their maximum and the declared attempt exposure; `retry-share` as a resource. **Not** hedging, durable attempt state or the idempotency-horizon comparison |
| C8-15 | One `callEnvelope`, the `deadline-envelope` card, `timeout-mismatch`, `deadline-overrun`. **Not** the new contract fields (response reserve, minimum useful attempt, deadline propagation) or intermediary hop timers |
| X-16 | One assumption set referenced by every calculation; the divergence finding; new calculation cards; comparison with the limit and the promise; one-at-a-time sensitivity; cards with validity and "not considered" |
| X-17 | Allocations with owners, margin and a combination rule on the objective; `budget-overrun`; `budget-percentile`; `cache-fallback`. **Not** composite availability over shared dependencies |
| Quality-method deep dive | The objective record: indicator with population and exclusions, event or time basis, error budget as arithmetic, burn policy and owner, owned allocations |

### i.2 Deliberately deferred

| Item | Why |
|---|---|
| The structured autoscaling block and the capacity-change record (C10-08), the maintenance-plus-failure case (C10-06) | They need typed deployment and release parameters that wp9a and wp9c own; adding plan fields here would cost route bytes and a second definition |
| Composite availability with correlated dependencies (X-17, C2-04) | Needs wp9a's shared-cause records; multiplying availabilities over string-compared failure domains would be a false calculation |
| Contract timing fields and hop timers (C8-15), hedging and durable retry state (C8-10) | New Chapter 8 fields live in `RECORD_FIELDS` on the route; not affordable in this package |
| Clock anchors and the metric contract on drivers (C2-06, X-15) | Not assigned here. The objective's `indicator` holds population and exclusions; a driver's statistic and clocks remain free text, which limits X-17 to planning bounds |
| Qualification states of a target (C2-08) | wp6 |
| Staffing calendars for human stages (C10-07) | The basic card takes handling time and staffed capacity only |
| Retiring the legacy adapter | rc.10.73.45, on the three conditions of e.3 |

### i.3 Risks

1. **Route bytes** (L1): about 1.8 KB with static rows against "a few hundred". Needs the lead's shared registration
   point or an explicit allotment.
2. **Script count and CSS** (L2, L3): exact gates with no headroom. (Y1: wp3 adds no script file, so the script gate
   is no risk of wp3's; the stylesheet cap stays as it is, AA2.)
3. **Exact finding lists in existing suites.** Mitigated by raising nothing on a document without the new records or
   the migration record; the upgrade runs only on the server. A suite that reads a stored, upgraded fixture and asserts
   an exact list would see `workload-migration`; S2 searches for such a suite before merging and reports it rather
   than changing an assertion.
4. **Two input paths remain in rc44** (the adapter). Visible in every reading; retirement is dated and conditional.
5. **The latency vital and the execution timing** (L5): the single-authority switch may be held back to keep an
   asserted reading; the finding is delivered either way.
6. **Adoption lapses reviews.** Recording or adopting a workload is a design change: Chapter 2's review, Chapter 3's
   intake and the final checks lapse. Intended, and said in the dialog, but a project near a baseline will notice.
7. **Coarse invalidation.** Any workload edit bumps `quality.version`, which marks Chapter 3's intake stale even when
   no decision is affected. The change event's affected list is precise; the intake flag is not.
8. **One extra request on project open** for most projects once the nudge exists (the engine script). Off the route
   budget, but real latency; the predicate in d.3 keeps projects with no load-related driver from paying it.
9. **Hot files shared with other packages:** `public/record-graph.js`, `public/trace-kernel.js`,
   `public/provenance.js`, `public/canonical-command.js`, `worker.js:101`, `public/record-lifecycle.js:50`,
   `authorship.js:39`. I list exact lines so the lead can sequence the merges.
10. **Floating point and rounding.** Parity depends on keeping the order of operations; the kernel keeps the existing
    `ceil` with its epsilon (`public/desk-capacity.js:28`) and `x * 1` for the legacy factor.
11. **Model fidelity.** This is steady-state arithmetic over declared rates. It can show that a design cannot work; it
    cannot show that one will.
12. **Unverified estimates.** No build or test was run for this design. Every size and every "unchanged" claim is
    checked by the slice that makes it.

### i.4 What the target description asks that this package cannot honestly deliver yet

- **"RC43 already has demand and operating-envelope contracts."** Not in this source (a.3). They are built here.
- **"Calculation or simulation version."** There is no simulator. Every result is `calculated`; the version is the
  kernel's and the card's. The existing walkthroughs stay count-based and stay labelled simulated.
- **"Updates … affected claims."** Until wp6 gives claims a record that cites a workload stamp, "affected" means the
  change journal's items, the findings, and stale measurements; there is no claim record to reopen.
- **"Supporting document sections consistently."** The SDD section is rebuilt from the same engine on every build.
  A frozen baseline keeps what it was frozen with.
- **Stage 6: "useful service, bottlenecks, queued work and surviving dependencies" under each condition.** Delivered
  for demand, envelopes, backlog and per-domain survivors. Surviving *dependencies* under correlated failure waits
  for wp9a.
- **Stage 10: "bind more of those declarations to concrete configuration and operational experiments."** A measured
  input with its source passage is as far as this goes. AIW measures nothing and reads no live configuration.
- **Stage 11: "traffic more concentrated on a subset of keys → the affected partitioning decision and capacity
  claim."** Changing `hotShare` re-derives the hottest-unit demand and lists the decisions linked through the
  workload's drivers. The partitioning decision as a typed record is wp9c's.
- **Tail latency.** No percentile is computed anywhere. Latency allocations are planning bounds and say so.
- **External authorities.** Nothing here is licence approval, independent review, four-eyes knowledge approval or
  production acceptance. The handbook passages used in the proof are candidate teaching content awaiting the owner's
  provenance record and a second person's release; an agreed objective is two project members' agreement, not an
  operational acceptance.
