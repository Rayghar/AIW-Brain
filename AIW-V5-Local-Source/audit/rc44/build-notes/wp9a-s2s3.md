# rc44 wp9a slices 2 and 3 (one build, owner decision AA3): the declared failure set, its evaluation and acceptance; location gates and data copies — build notes

Branch `rc44/wp9a-s2s3`, from `4349bb6` (rc44/integration: S0, S0-D12, wp1 S1 to S3, wp2 S1 and S5, wp9a S1 merged; the
build contract). Release line AIW v0.10.0-rc.10.73.44 (proposed; the owner has not confirmed it). `productionAccepted`
stays false. Package `p30-deployment`; host entry `public/deploy-view.js` (unchanged, ruling A3).
Binding: `audit/rc44/BUILD-CONTRACT-2026-11-26.md`; rulings L, M, O, R, T (wp9a) and the carried items L2, L3, L8,
L11(d), M9(f); design `audit/rc44/design/wp9a-deployment.md` section g (Slices 2 and 3) with b.1, b.3, c.2 to c.5, d.1,
d.2 (H4, H5, H11), d.4 and f.1; slice 1's notes `audit/rc44/build-notes/wp9a-s1-topology.md`.
No external authority is involved: nothing here is approved, released or promoted; a declared failure's acceptance and
a gate's evidence are steps of signed-in persons of a project, which this build records and never takes itself.

## State

- **Done:** the plan; the goldens of S2's parity case; the cases of blocks S2 (S2.0 to S2.11) and S3 (S3.0 to S3.10),
  each "fails today" case seen to fail on `4349bb6`; the two parts (`public/topology-failures.js`,
  `public/topology-gates.js`); the hooks H4, H5, H11 and the slot; ruling L2's retirement of the shared-cause reading
  (S1.13's marked case flipped); recovery import; slice 1's placeholder assertions replaced (old -> new below); the size
  evidence; the suites (below).
- **Fix-up:** the adversarial review (changes needed) and its one fix-up (AA1) are done: section "Fix-up" at the end.
- **Next:** the lead's merge with `s0-w3-bundle`, which retires the
  booking cases that fail here as AA2 expects (S0's "O1", wp1's S2.12 and S3.10, wp2's "size" and "S5 size": see
  "Suites").

## What was built

| File | What |
|---|---|
| `public/topology-failures.js` | Slice 2's part: `runtime.failure` (declared failure fs-NNN / FS-NNN), `runtime.environment-link` (a recovery design environment's `recoversIds`, C10-22), `runtime.failure-accept` (a second person's step through S0's `second` row); `lossCases`, `evaluateFailure`, `failureStamp`, `failureAccepted`, `survivalScope`, `standbyElsewhere` (H5), `lostFor` (H4 at `runtime.simulation`); Chapter 10's `domain-shared`, `failure-unsurvived` (error), `failure-unknown`; the record graph (`covers`, `assumesLossOf`, `recovers`), the layer `failure`. |
| `public/topology-gates.js` | Slice 3's part: `runtime.gate` (lg-NNN / LG-NNN, six kinds), `runtime.copy` (dcp-NNN / DCP-NNN), `runtime.copy-proposals` (from the trail only), `runtime.gate-evidence` (a second person's step); `gateReading`, `locationGateState`, `failingGate`, `copyInventory`, `derivedCopies`, `gateEvidenceStamp`, `refuseMerge` (H11); Chapter 10's `location-gate` (error, `hard: true`), `location-unknown`, `node-address-overlap`, `node-data-exposure`; the record graph (`restricts`, `copyOf`, `restsIn`, `heldBy`, `backsUpTo`), the layers `copy` and `gate`. |
| `public/topology-domain.js` | `hostingComparison` extended (ruling L2: one reader): `groups` (zones that fail together: one domain, domains one inside the other, a shared stated cause, over the ancestors, transitively) and `shared`; memoised per settled document; `zoneFails`, `groupKey`, `requireTyped`, `storeWritten` (who wrote each revision, never trimmed); `TRACKED` and `LABELS` exported so the parts journal their records; helpers exported to the parts. |
| `public/runtime-model.js` | H1's slot `TOPOLOGY` (filled by the two parts when the lazy module loads) and `zoneKey(p, z)`: the group key in a typed project, else `failureDomainKey` as before. |
| `public/runtime-domain.js` | H4: `simulateRuntime(p, raw, L)` with the lost set of a declared case (`zones`, `placements`, `elsewhere`, `failureId`, `caseId`); without `L` it answers as at `4349bb6` (S2.6, goldens). `runtime.simulation` passes `TOPOLOGY.lostFor?.(p, raw)`. H5: no `standby` error when `TOPOLOGY.standbyElsewhere` finds an independent standby in a linked recovery environment. L2: `single-domain`, `standby`, `backup-domain` and the isolate proposal compare `zoneKey`. |
| `public/design-reasoning.js`, `public/desk-capacity.js`, `public/desk-vitals.js`, `public/desk-fixes.js` | L2: planFacts' domains, the desk's Z, the quorum vital and the desk's fixes read `zoneKey` (the retirement list of slice 1 named "planFacts and the desk"). |
| `public/workbench-domain.js` | H11: after a merge's commands apply, `TOPOLOGY.refuseMerge?.(input, p)` refuses a merge that would newly fail a location gate, before anything is kept. |
| `recovery-service.js` | A recovery import moves a declared failure's and a gate's `review` aside (`importedReview`), before its early return (contract rule 24). |
| `rc44-wp9a-deployment-validate.mjs` | Blocks S2.0 to S2.11 and S3.0 to S3.10; slice 1's placeholders replaced (below). |
| `rc44-wp9a-simulations.mjs`, `rc44-wp9a-simulations-baseline.json` | The walkthrough goldens of S2.6, captured from an unchanged checkout of `4349bb6` (`node rc44-wp9a-simulations.mjs --capture 4349bb6`); never captured again. |
| `audit/rc44/evidence/wp9a-s2s3-route.json` | The route before and after (owner decision AA2: no booking), itemised, with the package's share of its lazy entry and "opens with records". |

## Cases (each with the failure seen on `4349bb6`)

Logs under `.aiw-local/wp9a-s2s3/` (git-ignored): `before-s2s3.log` is the run of every new block on `4349bb6`'s product
code with the new suite.

| Case | Design case | Seen on `4349bb6` |
|---|---|---|
| S2.0 the record | c.2 `runtime.failure` | "Unknown Deployment / runtime action." |
| S2.1 the primary region lost | S2 case 1 (fails today) | "Unknown Deployment / runtime action." (no command states the claim) |
| S2.2 any one zone, and the bound | S2 case 2 | the same |
| S2.3 a shared cause | S2 case 3; L2 | the same |
| S2.4 a linked recovery environment | S2 case 4; H5 | the same |
| S2.5 acceptance, through the server | S2 case 5 | 400 `unknown_command` |
| S2.6 the walkthrough as at 4349bb6 | S2 case 6 (parity) | passes on the base, by construction (the goldens are the base's) |
| S2.7 determinism | S2 case 7 | "Unknown Deployment / runtime action." |
| S2.8 the walkthrough of a declared case | c.5, H4 at `:344` | the same |
| S2.9 S0's helpers with declared failures | contract rule 54 | the same |
| S2.10 no verdict confirms a chain a draft changed (server) | L11 (d) | written after the code; seen to fail with the refusal disabled (200 !== 400; `s210-mutated.log`) |
| S2.11 the tracker stays in its paths | contract rule 28 | written after the code (the helper reads only the package's own tracker) |
| S3.0 the records | c.2 `runtime.gate`, `runtime.copy` | "Unknown Deployment / runtime action." |
| S3.1 a residency gate and a backup in SE | S3 case 1 (fails today) | the same (no check of Chapter 10 reads residency) |
| S3.2 unknown is never pass | S3 case 2 | the same |
| S3.3 no evidence for residency and placement | S3 case 3 | the same |
| S3.4 a required-service gate's evidence (server) | S3 case 4 | 400 `unknown_command` |
| S3.5 a merge, and an acceptance while a gate fails (server) | S3 cases 5 and 6 | 400 `unknown_command` |
| S3.7 copy proposals from the trail | S3 case 7 | "Unknown Deployment / runtime action." |
| S3.8 overlap and exposure | S3 case 8 | `undefined` (no such finding) |
| S3.9 S0's helpers; the document at the new limits | contract rule 54; M9 (f) | "Unknown Deployment / runtime action." |
| S3.10 candidate knowledge inert | contract rule 40 | written after the code |

## Decisions taken while building, each with its case

1. **A loss case is a set of failure domains** (`lossCases`). `any-one` over a location scope: one case per domain of
   that scope that a hosting zone holding a placement of the environment fails with (its domains, the domains its
   nodes are, and all they lie in); over `shared-cause`: one per stated cause. Each named domain is a case of its own;
   a `correlated` claim is one case of all it names. A case loses every hosting zone of any environment that fails
   with a lost domain, and every placement whose own nodes (below its zone's) do. S2.1 to S2.3.
2. **The walkthrough is the one propagation** (H4): each case calls `simulateRuntime` with its lost set; a plan of the
   same asset in a linked recovery environment, outside what the case loses, with a declared recovery, its state known,
   its authority written and stated copies enough, is passed as `elsewhere` and reads `conditional` (S2.4). Without the
   third argument the function answers as at `4349bb6` (S2.6, five fixtures, every zone and mode).
3. **Verdicts**: does-not-survive when a case leaves a must-survive plan degraded or unavailable (it names the case,
   the plan and the walkthrough's reason); otherwise unknown when anything is not known (the zones cannot be compared,
   a zone has no domain of the scope, a plan's placement has no stated role or count, nothing must survive, no case,
   past the bound); otherwise recovers-conditionally or survives. Envelope: `evidenceClass: 'calculated'`, `method`,
   `bounds`, `considered`, `notConsidered`, `stamp`; the same object for the same document, key order included (S2.7).
4. **The acceptance is the claim's `review`** (contract rules 14 to 17): `runtime.failure-accept` states `second` (the
   boundary asks `verifierRefusal` on the claim, which keeps `actor` and a never-trimmed `history` of writers, and two
   persons); `apply` refuses an unreviewed step, a stale stamp, an empty mustSurvive, an accepted does-not-survive, a
   chain a draft changed (L11 (d)) and a failing location gate of the environment; it stores `{actor, at, account,
   decision, stamp, verdict, cases, reviewer, reference, observations}` and moves the evidence version only (no design
   stamp: S2.5, S2.9). `failureAccepted` re-asks `verifierRefusal` at read time with `account === 'person'` and the
   current stamp, so a moved placement lapses it (S2.5).
5. **The acceptance stamp** reads the environment and the recovery environments linked to it as
   `runtimeEnvironmentStamp` reads them, a fingerprint of what every standing failure domain and node says, and the
   claim at its revision (design b.3 names "the domains and nodes the cases read": all of them is the stricter reading).
6. **L2: zones that fail together are one failure domain to the built-in checks** (`zoneKey`): one domain, a domain
   inside another's, or a shared stated cause, over the ancestors, taken together transitively, so the reading errs
   towards no independence (zone A shares c1 with B and B c2 with C: all three read as one). The key is the smallest
   hosting domain id of the group, so a zone alone reads as before. `domain-shared` (a warning, per cause) stands until
   a declared failure in scope that lists the cause in `acceptedCauseIds` is accepted by a second person; listing it is
   no acceptance (S2.3). S1.13's marked case is flipped there.
7. **The gate reads every copy, recorded or not** (S3.1, S3.2, S3.5): a recorded copy where it rests (the nearest
   jurisdiction its node or a node above it states), a proposal as unknown, and each copy the trail places that no copy
   records (`derivedCopies`, the same derivation `runtime.copy-proposals` proposes from) as a fail where its location is
   not permitted and as unknown where it is. So a merge that moves a standby into SE fails the gate though no copy was
   moved with it, and the merge is refused (H11). A dismissed proposal does not silence a derived location (fail closed).
8. **Which plans hold a data definition's copies**: the plans that say they keep state (`Stateful service`) on the trail
   of the definition's authority (`forwardTrace`): a primary per active placement, a replica per standby, a backup per
   backup zone by `backsUpTo`, a relation this part states from `runtime.plans.backupZoneId` in a typed document only.
   A stateless or provider-managed plan, or one the trail does not reach, is not proposed (S3.7).
9. **Gate evidence is a second person's step for both states** (stricter than design c.4, which asks a second person for
   a pass only): S0's `second` row cannot ask for a second person by the payload's state, and a package writes no
   check of its own (contract rule 14). It is kept under the gate's `review` (`{actor, at, account, evidence: {nodeId:
   step}}`) and lapses when the gate or the node changes (S3.4).
10. **Findings (contract rules 10 to 12)**: `location-gate:<lg id>` is an error with `hard: true` (the rc.10.73.42
    non-waivable class; no waiver is offered: S3.1); `failure-unsurvived:<fs id>` an error and `failure-unknown:<fs id>`
    a warning, for a claim in scope; `domain-shared:<fd id>`, `location-unknown:<lg id>`, `node-address-overlap:<dn id>`
    (each overlapping pair once, under the earlier node; a node inside the other is no overlap; parsed parts compared,
    ruling L8) warnings; `node-data-exposure:<dn id>` an error. Each arises only in a typed document after a person
    acted on this build (the exception of rule 11). (Corrected in the fix-up, should-fix 4: not so for
    `node-address-overlap`, `node-data-exposure` and `domain-shared`, which a slice-1-typed document gains at its first
    read: "Which documents change, and why" below.)

## Deviations from the design, the task and the contract

1. **No `runtime.failureAcceptances[]` and no `runtime.gateEvidence[]`** (design b.1): a person's or second person's
   step is kept under the record's key `review` (contract rules 16 and 17, rulings F3 and D7.1), which a template copy
   clears and a recovery import moves aside. The acceptance has no FA id; the journal and the activity keep each step.
2. **Finding ids name the record id** (`location-gate:lg-001`), as every finding of the package does (`<code>:<record
   id>`, rule 12); the title names the reference (`LG-001 … fails`). The task's "location-gate:LG-001" is read so.
3. **The evaluation bound is not reachable through the commands**: this build writes at most 60 failure domains
   (slice 1's limit, L8), and a case is a domain, so through the commands the domain bound binds before the 64 cases.
   S2.2 holds the bound on a document that holds 65 more zone domains than the commands write (a recovery package of
   another build, which the import does not bound), and states that the domain bound binds first. Open question 1.
4. **`runtime.environment-link` takes `recoversIds` only**: `promotesToId` and `accountNodeId` (design c.2) are refused
   in words until the build that reads them (contract rule 36). A draft by Sol and an agent account link nothing.
5. **`minimumService` names requirements and responsibilities**, not journey steps (design b.1): no reader of journey
   steps in this build; `serviceRef` must stay empty until wp3's business service exists (refused in words).
6. **`technology.domain-evidence`, `runtime.transition`, `technology.capability-domains`, `technology.fallback`** are not
   built (slices 4 and 5); S1.9 still holds them free. `cutPoints` and `topologyReading` (design d.1) are not exported:
   no reader in this build (J6). `soft` and `plans` of H4's lost set wait for slice 5's qualified fallback and its
   capability binding; a placement's own nodes are read instead of plans lost outright.
7. **Relation names**: the copy's location is `restsIn` and a gate's data `restricts` (design d.4: `locatedIn`,
   `constrains`, both types built-in hops read; rule 8 keeps them off records a built-in reader might take). `backsUpTo`
   is new (decision 8).
8. **`authorship.js` is not edited** (design c.1, task "authorship.js (runtime.failure-accept)"): S0's boundary registers
   every package type that states `person` or `second` as a review type (`registerReviewTypes`), so an agent account and
   a draft by Sol are refused before the project is read (S2.5, S3.4: 400 `authorship`).
9. **H11 is on the server only**: the merge's branch is not in the client bundle (0 B on the route). A reviewed batch
   (`workspace.apply`) or a single command that fails a gate is not refused; the hard finding then blocks the review.
10. **Gate evidence of a `fail` needs a second person too** (decision 9).
11. **The Model view still groups zones by `failureDomainKey`**, not by the shared-cause groups (`deploy-model.js` has no
    document in `deployModel`): slice 6 (H15, R1) with the surface. Retirement list.
12. **The document at the new limits** (M9 (f)): 24 claims, 24 gates and 200 copies with every field at its limit and a
    stamp each take 482,876 characters; with slice 1's 3,740,000 the package's worst case is about 4,222,876 of the
    8,000,000-character bound (S3.9; slice 1 held its own records under half). A person's step and every save add a
    history entry (about 120 characters) that is never trimmed (rule 48), so many saves of one record can reach the
    document bound first. Open question 2.

## Retirement list (J6)

| Earlier reader | Where | State |
|---|---|---|
| ~~Two zones that share a stated cause read as independent in the built-in checks, planFacts and the desk~~ | `runtime-domain.js`, `design-reasoning.js`, `desk-*.js` | **retired here** (L2): `zoneKey` over `hostingComparison`'s groups; S1.13's marked case flipped (old -> new below) |
| ~~A zone in a domain inside another zone's hosting domain is not compared~~ | `topology-domain.js hostingComparison` | **compared here** (the two read as one failure domain); the error `topology-incomparable` (`nested`) still stands, which is stricter; whether it may go is the lead's call (open question 3) |
| The Chapter 10 Model view groups zones by `failureDomainKey` | `deploy-model.js` | slice 6 (H15, R1) |
| `simulateRuntime`'s "lose a failure domain" mode loses zones by `failureDomainKey` equality (a zone in a domain inside the lost one, or sharing a stated cause, keeps running) | `runtime-domain.js` | slice 6, with R5 (the fix-up's should-fix 5) |
| H5's own pairwise reading of independence | `topology-failures.js independent()` | **retired in the fix-up** (must-fix 5): H5 reads `zoneGroups`, the one grouping |
| The Model view's second propagation and scenario list; the desk's region guess; Chapter 6's string comparisons; the register's typed location | as slice 1's list | slices 5 and 6, unchanged |

## Held back until their surface exists (contract rule 11)

`failure-acceptance:*` (asks for the second person's step; S6's "Accept this claim"), `failure-set` (asks to declare
what must survive), `failure-minimum-service:*`, `domain-scope:*`, `domain-evidence:*` (no `technology.domain-evidence`
yet), `copy-unlocated:*`, `node-shared-account`, `environment-recovers`, and a review-plan step for AIW's own copy
proposals (L11 (c), now also for copies). The readings state the standing meanwhile (`evaluateFailure`,
`gateReading`, `copyInventory`).

## Replaced assertions (old -> new), each at least as strict unless a ruling names the change

- S1.0: `[evidenceKeys, designKeys, keys of design]` = `[undefined, [3 keys of slice 1], [the same]]` -> `[undefined, [the
  3 keys and runtime.failures, runtime.gates, runtime.copies], [the same]]` (exact).
- S1.9: eleven types `extensionCommand(type) === null`, "waits for its slice" -> the four of slices 4 and 5 still null and
  free; the seven of slices 2 and 3 each the package's command, not built-in, the four design edits staged with a
  `validate` and neither `person` nor `second`, the three others not staged, the two steps stating `second`.
  `Object.keys(commands)` = the five of slice 1 -> the twelve (exact).
- S1.11: `FAILURES_PART` and `GATES_PART` deep-equal `{}` -> each states exactly its eleven rows and its record kinds
  (`failure`; `gate`, `copy`); `BLUEPRINTS_PART` and `FALLBACK_PART` still `{}`. `quietProposals` = the two collections
  of slice 1 -> the five (exact).
- S1.23: `Object.keys(quietProposals)` = `['runtime.nodes', 'technology.domains']` -> the five, sorted (exact).
- S1.13 (ruling L2, which marks this case for slice 2 to flip; contract rule 3's "no assertion is inverted" yields to the
  ruling): `standby:<store plan>` undefined, "SLICE 2 FLIPS THIS", and planFacts' domains `[fd, other]` -> `standby` an
  error, planFacts one domain `[min(fd, other)]`, and `domain-shared:<power>` a warning (new).
- S1.10 (owner decision AA2, the one owner-decided exception: a size case written for the bookings): "this build is
  inside the allowance of wp9a" (`mine > 0 && mine <= 500`) -> this build's chapters route under the cap, its script
  files at the gate, its stylesheet as at the base, and the build's evidence (`wp9a-s2s3-route.json`) reporting before
  and after, itemised, booking nothing, with the package's share. The share of this build (ruling R4): modules pinned to
  slice 1's `LAZY_SHARE` -> pinned to this build's measurement `BUILD_SHARE` (exact, as before); lists at most 168 B ->
  at most 254 B (the measured growth with two parts filled); `LAZY_SHARE` stays slice 1's record against its evidence.
- S2.1 (a new case, edited before it ran green): the premise "a zone lost leaves the API running" (wrong: the API
  requires the store and the issuer) -> the walkthrough of one zone loses that zone only.

## Size (owner decision AA2; no booking)

Measured with `node build.mjs` in a checkout of each tree (`dist/client-size-report.json`); `audit/rc44/evidence/wp9a-s2s3-route.json`.

| | `4349bb6` | this build |
|---|---|---|
| chapters route (`routes.chapters.code`) | 3,228,938 B | 3,229,341 B (+403 B; re-measured at the final head) |
| projects route | 508,466 B | 508,530 B |
| script files | 148 | 148 |
| buckets (under 10 KB / 10-50 KB / over 50 KB) | 52 / 51 / 45 | 52 / 51 / 45 |
| stylesheet | 901,873 B | 901,873 B |
| violations | none | none |

Cap 3,233,792 B on this base (3,266,560 B once `s0-lead-w3` lands). Opens with records (rule 52): 4,084,742 B at the
base, 4,125,495 B here: the two parts add 40,350 B to the deploy-view chunk (12 scripts, as before); ruling Y1's
shared first-draw entry (S0-D10) takes them with the other first-draw readers.

## Suites

On the final product code (logs under `.aiw-local/wp9a-s2s3/`, git-ignored; servers on their own port from 4100 and
their own database under `.aiw-local`, stopped; no tracked file left rewritten):
- `rc44-wp9a-deployment-validate.mjs`: 47 of 47 (slice 1's 25, S2.0 to S2.11, S3.0 to S3.10), `final-wp9a.log`.
- `rc44-wp9a-deployment-browser-validate.mjs` (`node build.mjs` first, `AIW_BROWSER_EXECUTABLE` set): 1 of 1.
- `action-undo-validate.mjs` unchanged: green. Also green on the final head: `runtime`, `rc42-g5-runtime`, `deploy`,
  `desk`, `desk-fixes`, `workspace`, `provenance`, `recovery-authority`, `rc42-g4-trace-kernel`, `technology`
  (`suites-final/`).
- Every non-browser suite that imports a changed file and is not red on this runner at the base: 86 run
  (`suites-broad/summary.json`); 83 exit 0. The other three: S0's suite and wp9a's own (below; wp9a's S1.10 then failed
  only because its pins were re-measured after that run started, green on the final head), and `scale-validate.mjs`,
  which is red at the base (`test:scale`, 1,169 s there) and was stopped by the runner's 600 s bound with every block it
  reached passing (the runner did not match its script, which runs with `--expose-gc`).
- The nine suites red at the base that import a changed file (`architecture-ui`, `brain-reasoning`,
  `chapter-reasoning`, `command-equivalence`, `composition-ui`, `knowledge`, `round27-model`, `sol-checks`,
  `sol-disclosure`): each run in an archive of `4349bb6` and here; each fails the same way in both (exit code and the
  lines that name the failure; `command-equivalence` differs only by the time in its message), `red/summary.json`.
- `node check-syntax.mjs`: 946 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, 0 new.
- `node build.mjs`: chapters route 3,229,341 B (cap 3,233,792 B), 148 script files, buckets 52/51/45, stylesheet
  901,873 B, no violation.
- Not run: the full regression (the lead's), the browser suites other than wp9a's (the browser run that closes the wave).

**Failing assertions of other slices' suites, for the lead (contract rule 55; none edited here).** Each is a size case
written for the per-slice bookings, which AA2 retires; each fails by exactly this build's 403 B, which it books nowhere
as the task says ("Book nothing per slice"); each suite is green at `4349bb6` (S0 28 of 28; wp1 87 cases, 2 pending;
wp2 45 checks, run in the archive of `4349bb6`):
- `rc44-s0-extensions-validate.mjs`, block "O1 the bookings add up" (`assertBookingsAddUp`): "The bookings do not add
  up: the chapters route grew -499 B against 9673661 (3229341 - 3229840), and the size files book -902 B …". AA2
  names this block as retired; the lead's `s0-w3-bundle` removes it. Every other block of S0's suite is green.
- `rc44-wp1-knowledge-validate.mjs`, "S2.12 (size, ruling A4 and M4)": "this build: S2 is 521 B of its 250 B" (118 B
  booked + 403 B), and "S3.10 (size, rulings A4, M4, O1)", the same arithmetic.
- `rc44-wp2-adoption-validate.mjs`, block "size" (`rc44-wp2-adoption-cases/record.mjs:891`): "what this build leaves for
  S1 is exactly what S1's evidence books: 728 B" (728 !== 325), and block "S5 size" (`selection.mjs:1096`): 1592 !== 1189.

## Open questions (for the lead)

1. The evaluation bound of 64 cases sits above the 60 failure domains a workspace keeps, so it binds only for a
   document that holds more than the commands write (a recovery package). Keep it as a guard, or lower it below the
   domain bound so that a person can reach it?
2. The package's worst case at its limits is about 4.22 M of the 8 M characters (slice 1 alone was about 3.74 M). Lower
   the counts (slice 1's nodes or this build's 200 copies), or accept it as measured? Histories of claims and gates grow
   with every save and are never trimmed (rule 48).
3. `topology-incomparable` (`nested`) still stands for a zone whose hosting domain lies in another's, though the checks
   now read the two as one failure domain. Keep the error (stricter), or retire that kind with its S1.13 assertions?
4. L3 (a lifecycle rule for a package on built-in collections, ruled "when slice 2 starts"): assumed NO, as the task
   says: the tracker's mend of slice 1 and the error `topology-incomparable` (L2 (c)) stand; this build adds no
   `canRestore` row on a built-in collection. A recovery link that names an environment no longer there recovers
   nothing (S2.4); no mend is written for it.
5. A dismissed copy proposal does not silence the location the trail derives (decision 7): a wrong derivation is
   changed in the design (the plan's state, its placements), never by dismissing it. Confirm, or rule that a person's
   dismissal stands for the gate too.
6. An agent account retires and restores a person's claim, gate or copy as it does a node (L11 (b), wp9b's).

## Fix-up (owner decision AA1: one review, one fix-up)

Branch `rc44/wp9a-s2s3-fix`, from `10b97b7` (the build's head). The review's verdict was "changes needed": six must-fix
items, nine should-fix items, nine design concerns. Each must-fix item got a case seen to fail on `10b97b7` first, then
the fix; each small should-fix item inside the build's files is fixed with its case; every other should-fix item and every
design concern is carried ("Carried forward" below). Logs under `.aiw-local/fixup/` (git-ignored): `before-10b97b7.log` is
every new case run on an archive of `10b97b7`'s tree (node_modules linked) with the new suite; `mf*-before.log` and
`sf*-before.log` the same, case by case, on this branch before each fix.

- **State:** done. Every item below is done with its case or carried; none is disputed. Suites: "Fix-up suites" below.
- **The rule chosen for must-fix 1 and 2 (rule 39), in two parts, each one function.** (a) At the door, `standingOf`
  (topology-domain.js), asked by both parts' `validate`: a draft by Sol or an agent account changes only its own
  proposals; a declared failure, a location gate or a data copy that stands is a person's to change, in any field
  (stricter than the review asked: its words too). A node's jurisdiction is not cleared by a draft either (slice 1's
  `refuseDraft`, extended). (b) In the reading, `draftedIds`/`draftedOf` (topology-domain.js, ruling L11 (d)): a record
  that a draft by Sol, an import or an agent account changed last and no person has reviewed since (a person's save,
  keep, confirmation or merge, or a judgement "kept" through the review plan) is named by the readings that read it. A
  claim's verdict still reads (S2.10 holds that) and its acceptance is refused; a location gate, a hard constraint, fails
  closed: each row that reads such a record fails naming it, and so does the gate for every other such record it reads
  (itself, its data, every definition where it names a classification or personal data, the copies of its data and their
  zones, and each zone, placement and plan of the environments it applies to). So no draft turns a fail into unknown or
  pass, whichever command it came by, built-in ones included (S3.11: a placement an agent moved by a built-in command).
  The review's option (i) alone could not hold slice 1's S1.8 and S1.15, which take a draft's `runtime.locate`.

| Item | What | State, with its case |
|---|---|---|
| must-fix 1 | a draft or agent account takes a person's claim out of scope, empties what must survive, clears its minutes | done: S2.12 (server, Sol and agent, alone and in a drafted batch; the error stands); seen to fail on 10b97b7: 200 !== 400 |
| must-fix 2 | a draft or agent account lifts a failing location gate (gate, copy, zone, node) | done: S3.11 (server, Sol and agent: (b), (c), (c2), the gate's words, (d) twice and (e) twice refused in words; (f), (f2) and a placement moved read as failing, naming the record, until a person locates or moves it; the hard finding stands throughout); seen to fail on 10b97b7: 200 !== 400 |
| must-fix 3 | L11 (d): zones and placements a draft changed are not named, and the acceptance is taken | done: S2.13 (server: Sol and agent relocate zone 2 out of the region, an agent changes a placement; refused naming ZON-002 and the placement; a person's own location then accepted); `drafted` reads the claim, its environment and the linked recovery environments, their hosting zones, plans and placements, the domains and nodes those stand in, and what each case loses; the copies a gate reads reach it through the failing gate (S3.5); seen to fail on 10b97b7: drafted `[]` |
| must-fix 4 | a restore after a recovery import brings back an acceptance and a gate's evidence | done: S2.14 (retired claim and gate, import, restore by a person and by an agent: not accepted, unknown); recovery-service.js moves `review` aside on `retired.records[].record` of `runtime.failures` and `runtime.gates` too; seen to fail on 10b97b7: the retired records kept `review` |
| must-fix 5 | H5 compares independence pairwise beside hostingComparison's groups (L2, rule 39) | done: S2.15 (the transitive chain across the link reads one group: the standby error as in one environment; a recovery zone sharing nothing stands apart); `failGroups` is the one grouping, `hostingComparison` and `zoneGroups` read it, `independent()` is deleted; seen to fail on 10b97b7: no standby error |
| must-fix 6 | Chapter 10's checks with declared failures cost O(placements x zones) per case | done: S2.16 (2,000 zones, 2,000 placements, 60 domains, 24 in-scope claims of 58 cases: at most 3 times the same document's checks without the claims; 409 ms against 338 ms here); `failIndex` (what each zone and placement fails with, once a pass), `losing` and the walk of a case remembered once a pass (a case two claims share is walked once), each evaluation and each check one pass, and the comparison's nested test read through an index; seen to fail on 10b97b7: 30,441 ms against 2,768 ms |
| should-fix 1 | rule 38: a case per caller of zoneKey | in part: S2.19 (the isolate proposal and backup-domain, each also read with the old key, which answers otherwise); the desk's Z, the quorum vital and the desk fixes' zone choice are carried |
| should-fix 2 | H11 compares the gate's state, not its failing rows | done: S3.12 (server: a merge that adds a failing row to a gate failing already is refused naming the row; one adding none merges); seen to fail on 10b97b7: 200 |
| should-fix 3 | an acceptance does not lapse when a gate of its environment starts failing | done: S3.13 (`failureAccepted` reads `failingGate`); seen to fail on 10b97b7: true !== false |
| should-fix 4 | the notes' rule-11 sentence is wrong for three findings; backsUpTo in every typed document | done in the notes ("Which documents change", below); whether to hold the three findings back is carried to the lead |
| should-fix 5 | simulateRuntime's "lose a failure domain" mode still reads failureDomainKey | done in the notes: added to the retirement list (slice 6, with R5) |
| should-fix 6 | the bound is tested at 67 cases only | done: S2.17 (64 evaluated, 65 unknown with the bound named); passes on 10b97b7, which bounds correctly: coverage only |
| should-fix 7 | the design statement keeps importedReview | done: S3.14 (`DESIGN_OFF` of both parts leaves it out); seen to fail on 10b97b7 |
| should-fix 8 | derive() reads backsUpTo from the graph's adjacency, not through the trace | carried (below) |
| should-fix 9 | lossCases counts a zone that holds only a proposed placement | done: S2.18 (proposed placements filtered, as plansOf does); seen to fail on 10b97b7 |

### Which documents change, and why (should-fix 4; contract rules 4 and 11)

The build's decision 10 said each finding arises only in a typed document after a person acted on this build. That is
wrong for three findings, as the review measured: a document typed with slice-1 commands only gains
`node-address-overlap` (a warning) where two networks' prefixes overlap, `node-data-exposure` (an error) where a data-tier
subnet is public, and `domain-shared` (a warning) where two hosting zones share a stated cause, at its first read after
this build; its readiness, registers and SDD digests change with them. Its built-in checks read zones that share a stated
cause as one failure domain (ruling L2, the retirement this build was asked to make), so `single-domain`, `standby` and
`backup-domain` may change for such a document too. Every typed document whose plan names a backup zone also gains one
`backsUpTo` relation in its record graph and model; its findings, stamps and SDD are unchanged by it. Documents that are
not typed (no `runtime.topology`) read byte for byte as at 94dbd4f (S1.3) and walk as at 4349bb6 (S2.6). For the merge
evidence (rule 4): "slice-1-typed documents: the three findings above where their records say so, the L2 grouping in the
built-in checks, and one backsUpTo relation for each plan with a backup zone". Whether the three findings wait for a
record of this build in the document is the lead's call (carried).

### Fix-up deviations

1. Must-fix 1 and 2 are met by refusing every change a draft or agent account makes to a standing claim, gate or copy,
   words included, and by failing a gate closed on every record a draft changed that it reads (above); a benign draft of
   a record a gate reads therefore raises the hard finding until a person reviews it (carried below).
2. S1.10's share (ruling R4) is re-measured and pinned as the build pinned it (owner decision AA2, read as the build
   read it): each module exact as before; the lists at most 254 B -> at most 271 B and the share at most 62,956 B -> at
   most 66,855 B. A larger bound is no stricter assertion: it is recorded under AA2's exception for size cases, as the
   build recorded 168 -> 254 B, and is for the lead to confirm.
3. S2.17 and S2.19 pass on 10b97b7 (should-fix 6 and 1 ask for coverage of what the build already reads); S2.19 holds its
   own failing reading (the old key, with the slot's zoneKey unset, answers otherwise).
4. The jurisdiction refusal's sentence gains ", and clears none a person stated" (its existing matches in S1.8 read the
   sentence's start, unchanged).

### Carried forward (one line each: what, where, which build)

- Should-fix 1 (rest): a shared-cause case for the desk's Z (`desk-capacity.js` capacityPlan), the quorum vital
  (`desk-vitals.js` quorumLoss) and the desk fixes' zone choice (`desk-fixes.js` domainZones) — wp9a S4+S5+S6.
- Should-fix 4: whether `node-address-overlap`, `node-data-exposure` and `domain-shared` wait for a record of this build
  in the document (rule 11) — the lead, at the merge (the merge evidence states the change either way).
- Should-fix 5: `simulateRuntime`'s "lose a failure domain" mode loses zones by `failureDomainKey` equality, so a zone in
  a zone domain inside the lost region domain, or sharing a stated cause, keeps running — wp9a S6 with R5 (retirement list).
- Should-fix 8: `derive()` reads the `backsUpTo` edge from the kernel's adjacency; `linkedVia` answers no relation id
  (which `derivedFrom.via` records) and a hop onto the built-in zone layer is refused (rule 9) — wp9a S6, or the trace
  kernel's owner with an edge reader that answers relation ids.
- Design concern 1: a claim whose verdict is unknown (past the bound, environment not standing, zones not comparable) can
  be accepted; design c.4 refuses only does-not-survive — the lead (refuse or label it), with wp9a S6's surface.
- Design concern 2: gate evidence of a fail needs a second person, so the gate's author cannot record a known fail, and an
  unknown gate blocks nothing — the lead (S0's `second` row reading the payload), or wp9b's hard gates.
- Design concern 3: acceptance reads the gates of the claim's own environment and every-environment gates, not those of a
  linked recovery environment a recovers-conditionally verdict rests on — wp9a S4+S5+S6.
- Design concern 4: the 64-case bound sits above the 60 domains a workspace keeps (open question 1); a total budget per
  document reading — the lead (S2.16 now measures the checks at the limits).
- Design concern 5: the transitive grouping (A~B by c1, B~C by c2 reads all three as one) errs towards no independence;
  L2 does not require it, and H5 now reads the same grouping — the lead's ruling.
- Design concern 6: H11 is server-only and covers workspace.merge; a reviewed batch or a single command that makes a gate
  fail is not refused (the build's deviation 9) — wp9b's hard gates, or wp9a S6.
- Design concern 7: the package's worst case is about 4.22 M of 8 M characters and claim and gate histories are never
  trimmed (open question 2) — the lead.
- Design concern 8: a dismissed copy proposal does not silence the location the trail derives (open question 5) — the lead.
- Design concern 9: L3 assumed NO and recorded (open question 4); a link to an environment that has gone recovers
  nothing, no mend — the lead.
- From the fix-up: a gate fails closed on a benign draft of a record it reads until a person reviews it (a save, a keep,
  a confirmation, a merge, or a judgement "kept" through the review plan) — the lead; wp9a S6 surfaces the review.
- From the fix-up: a draft's change by a built-in command that takes a record out of everything a gate reads (a placement
  moved to a plan of another environment) is not seen; a zone moved to another environment is (its copies' zones are
  read), and so is a data definition reclassified (every definition is read for a classification gate) — wp9b, the
  lifecycle and governance family, with L11 (b).
- From the fix-up: `hostingComparison`'s nested test is still a pair loop over the typed zones (through an index now,
  about 350 ms at 2,000 zones, near the base's cost of the document without claims) — wp9a S6 or the lead's S0 work.

### Fix-up size (owner decision AA2; no booking)

Measured with `node build.mjs` in an archive of `10b97b7` and in the fix-up's tree (`dist/client-size-report.json`):
chapters route 3,229,341 B -> 3,229,350 B (+9 B: the route script that holds provenance.js exports `judgementOf`, which
the lazy entry now reads), projects route 508,530 B -> 508,539 B, script files 148 -> 148, buckets 52/51/45 -> 52/51/45,
stylesheet 901,873 B -> 901,873 B, no violation. Against 4349bb6: +412 B. Cap 3,233,792 B on this base (3,266,560 B once
`s0-lead-w3` lands). Opens with records (rule 52): 4,125,495 B -> 4,129,423 B (the package's share 62,946 B -> 66,855 B).
Evidence: `audit/rc44/evidence/wp9a-s2s3-route.json` (`after` and `fixUp`).

### Replaced assertions in the fix-up (old -> new)

- rc44-wp9a-deployment-validate.mjs S1.10 (`BUILD_SHARE`, owner decision AA2 as the build read it): topology-domain.js
  22,697 B, topology-failures.js 19,382 B, topology-gates.js 19,064 B (exact), lists at most 254 B, share at most
  62,956 B -> 24,498 B, 19,695 B, 20,842 B (exact), lists at most 271 B, share at most 66,855 B; the route evidence's
  `packageShare` deep-equal to it, as before. No other assertion of the start commit is changed.
