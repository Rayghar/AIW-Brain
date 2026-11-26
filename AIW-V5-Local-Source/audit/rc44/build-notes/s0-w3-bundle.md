# rc44 build s0-w3-bundle: one size check (AA2) and one shared first-draw entry (D10, Y1, U6) — build notes

Built on `rc44/s0-w3-bundle`, from `4349bb6` (rc44/integration with the build contract of 2026-11-26). Release line:
AIW v0.10.0-rc.10.73.44 (working number, not confirmed by the owner). A lead-owned build of wave 3 on S0's shared files,
by leave: `client-bundle.mjs`, the route stubs (`public/design-package-routes.js`) and the lazy loaders, the extension
registry, `rc44-s0-readings.mjs`, `rc44-s0-extensions-validate.mjs` where named, and the size and placement assertions
of the rc44 suites that the bookings and the per-package first-draw loading pinned. Rulings: AA2 (the owner's decision of
2026-11-26), D10, Y1, U6; contract rules 7, 37, 50 to 52. `productionAccepted` stays false. No external authority is
involved or impersonated: licence counsel not engaged, four-eyes knowledge approver not assigned, independent
architecture review not started, production acceptance authority not established, release number unconfirmed.

## State

- **Done:** part A (AA2) and part B (D10, Y1, with U6), each case first and seen red; every rc44 node suite green; the
  wp9a browser suite green; the related browser and UI suites run (below); syntax, lint (no new problem) and
  `node build.mjs` before and after.
- **In progress:** nothing.
- **Next (for the lead):** the one review and fix-up (AA1); the open questions at the end; merging beside the parallel
  builds (wp2-s2s3 and wp9a-s2s3 edit the same suites' size blocks; s0-w3-stamps edits S0's suite elsewhere).

## Plan (as recorded at the start)

(A) AA2 first: the cap +32 KB with a comment naming AA2; booking retired (`routeBookings`, `assertBookingsAddUp`,
`LEAD_BOOKINGS`, S0's block "O1 the bookings add up", every size assertion on bookings, an allowance or the old cap
literal) for one helper, `assertRouteWithinCap`, that reads every cap from `client-bundle.mjs`; the evidence kept as
history, the lead's file given one line. (B) D10 and Y1 with U6: measure "opens with records" at `4349bb6`; one shared
lazy entry of the first-draw readers that every stub loads, surfaces staying in their hosts; the per-package first-draw
loading retired; tests first in `rc44-s0-d10-validate.mjs`; the U6 contract row; wp3's design revised.

## Measurements

All with `node build.mjs` (dist/client-size-report.json; dist/client-metafile.json read with
`rc44-s0-readings.mjs opensWithRecords`). The base is an unchanged checkout of `4349bb6` (`git archive`, built there).
The figures and the commands are in `audit/rc44/evidence/s0-w3-bundle-size.json`.

| | 4349bb6 (before) | this build (after) |
|---|---|---|
| chapters route `routes.chapters.code` | 3,228,938 B (72 files) | 3,228,967 B (72 files), +29 B |
| chapters route cap | 3,233,792 B (3158 KB) | 3,266,560 B (3190 KB, AA2) |
| projects route | 508,466 B | 508,526 B (+60 B, the stubs' chunk), cap 1,242,112 B unchanged |
| script files (gate) | 148 (148) | 150 (150, ruling Y1) |
| buckets under 10 KB / 10 to 50 KB / over 50 KB | 52 / 51 / 45 | 53 / 51 / 46 (gate under 10 KB 61, ceiling 54) |
| stylesheet (cap) | 901,873 B (902,144 B) | 901,873 B (902,144 B, unchanged) |

"Opens with records" (the route plus the static closure of the entry the stubs load):

| Document | 4349bb6 | this build |
|---|---|---|
| knowledge records (`public/knowledge-workspace-ui.js` then) | +147,315 B in 2 scripts | +69,723 B in 2 (`public/design-package-readers.js`) |
| adoptions (`public/architecture-task-ui.js` then) | +133,719 B in 2 | +69,723 B in 2 |
| typed topology (`public/deploy-view.js` then) | +855,804 B in 12 | +69,723 B in 2 |
| a selection and no adoption | nothing loaded (the stub asked for adoptions only) | +69,723 B in 2 |
| all three packages' records | (+1,003 KB, the three entries) | +69,723 B in 2 |
| no package records | exactly the route | exactly the route |

(Y1 had measured +147,315 B, about +133,700 B and +855,689 B at the close of wave 2.)

What a surface's host entry loads when it is opened grew, because each host imports the shared entry: the knowledge
workspace +147,315 -> +214,170 B, the comparison tools +133,719 -> +158,991 B, the Chapter 10 Model view +855,804 ->
+902,275 B (each now loads the other packages' readers too). This is the price of one script for the readers: a host
that imported only its own package's reader module would split the shared chunk (measured: 3 to 4 more script files).

## What was built

| File | What |
|---|---|
| `client-bundle.mjs` | `CHAPTERS_ROUTE_BUDGET` 3158 KB -> 3190 KB (3,266,560 B) with the comment naming the owner's decision AA2 of 2026-11-26; `BUDGET.scripts` 148 -> 150, the measured count, with ruling Y1 named. No other gate moved. |
| `rc44-s0-readings.mjs` | `routeBookings`, `assertBookingsAddUp`, `LEAD_BOOKINGS` retired; `assertRouteWithinCap(measured, base)` (async; reads `BUDGET` from `client-bundle.mjs`; the route within the cap, the script files at or under the gate and the gate at most 150, the bucket under 10 KB a ceiling through `assertUnder10kCeiling`, the stylesheet within its cap and the cap equal to the one rc44 started with, `audit/rc44/build-notes/s0-size.json` caps.css; answers the figures); `opensWithRecords` takes a list of entries too. |
| `public/design-package-readers.js` (new) | The one shared lazy entry: imports that take no name of `knowledge-package.js`, `topology.js`, `adoption-package.js`, in id order, and of `review-domain.js` (on the route already; see "Deviations" 2). |
| `public/design-package-routes.js` | Every stub's `load` imports `./design-package-readers.js` (was: each package's surface host); the p40 stub's `needs` also holds for a decision with a selection (U6, below); the header says how a package is added. |
| `public/deploy-view.js`, `public/architecture-task-ui.js`, `public/knowledge-workspace-ui.js` | Each host imports `./design-package-readers.js` in place of its package's registration module; the comparison tools' entry imports the selection view (`./adoption-ui.js`) itself. |
| `public/adoption-package.js` | Imports no surface (was: `import './adoption-ui.js'`); its header says where it loads. |
| `adoption-server.js` | Imports `./public/adoption-ui.js`, so the server's import graph is what it was (278 modules) and S0's suite still tells the package's modules from the workbench's by who imports them (`packageModules`). |
| `audit/rc44/evidence/lead-bookings-size.json` | One line (`retired`): booking retired by AA2 at this build. Nothing else of the evidence or the size files changed. |
| `audit/rc44/evidence/s0-w3-bundle-size.json` (new) | This build's size evidence: before and after, the commands, "opens with records", the surfaces' entries. |
| `audit/rc44/build-notes/s0-extensions.md` | S0's contract amended in place, each amendment dated: four things a package adds (2a, its line in the shared entry), the U6 row, the shared entry under "Loading on the client", the allowances retired by AA2, the size case's helper. |
| `audit/rc44/design/wp3-workload.md` | Revised by Y1: wp3's readers join the shared entry and it adds no entry of its own (a revision section at the top, each superseded passage marked). |

The old path is retired: no stub loads a surface's host entry, and no host imports a package's registration module for
registration alone (`knowledge-workspace-ui.js` keeps its named import of `packageStep`, a reader its surface uses).

## Cases (each seen to fail first)

New suite `rc44-s0-d10-validate.mjs`, `test:rc44-s0-d10` (goldens `rc44-s0-d10-baseline.json`, captured with
`node rc44-s0-d10-validate.mjs --capture 4349bb6` in an unchanged checkout of `4349bb6` with only the suite file added,
twice, byte-identical; never recaptured). The documents are built through the base's commands from the packages'
fixtures and must be the base's byte for byte before their readings are compared (the adoption document carries a 4 MB
change journal, too much to store). On `4349bb6` with only the suite added (commit 129d624), six of seven failed:

| Case | Failed first with | Holds |
|---|---|---|
| D10.1 readings | the client registered only `p10-knowledge` for the knowledge document (the shared entry did not exist) | graph, model, trails, findings, stamps (the design fingerprint), readiness, provenance, registers, SDD, ARS of five documents (none, knowledge, adoption, selection, deployment) byte for byte as at 4349bb6, client and server, each side in its own process; the client registers every package for a document with any package's records and none otherwise |
| D10.6 a package step kept on a built-in record | client and server read a chosen selection with no adoption differently (the client had not loaded p40, so the decision's error `selection-confirm` was missing on the client) | the client reads every document as the server does but for the SDD's package sections (server-only) |
| D10.2 opens with records | `opensWithRecords` took one entry only | knowledge, adoption, selection, chosen selection, deployment and all three: at most the route plus 160 KB |
| D10.3 no package records | the same | exactly the route |
| D10.4 the route | no size evidence of this build (first form: passed on the base, 0 B) | +29 B for this part, at most 1 KB |
| D10.5 script files and gates | the gate named no ruling Y1 | 150 files (+2), gate 150 with Y1 named, no other gate moved |
| AA2 the cap | the cap was 3,233,792 B | the cap is the base's +32 KB with AA2 named above it; the build passes `assertRouteWithinCap` |

D10.4 and D10.5 read this part's size evidence (`audit/rc44/evidence/s0-w3-bundle-size.json`) always and hold the live
build to it at this build's own commit (`AIW_D10_MEASURE=1`, run green at the head), so that later builds, which move
the route, are held by the one size check and do not turn this suite red; D10.2, D10.3 and AA2 hold on every build.
D10.1 holds the client to the packages the server holds (not to a fixed list), for the same reason.

In `rc44-s0-extensions-validate.mjs`, block "AA2 one size check" replaces "O1 the bookings add up": no booking reader in
`rc44-s0-readings.mjs`, none read or written in any rc44 suite file (17 files), the lead's file's line, the cap equal
to the books' cap +32 KB, and `assertRouteWithinCap` holding on the build and refusing, in its words, a route one byte
over the cap, a script file over the gate, a gate of 151, a small file beyond the ceiling, a stylesheet over its cap, a
moved stylesheet cap, a measurement with no route and no base. It failed first on the start (the helpers did not exist).

Re-pointed placement cases failed first on the change and pass after it: wp1 S2.10 and S3.17 (the stub's load), wp2
"browser load" and "S5 surface", wp9a S1.10 (the modules' pins), wp9a browser S1.b1 (the entry the stub loads).

## Replaced assertions (old -> new), each naming the ruling

AA2 (the owner's decision, the one exception the contract names for size bookings):
- `rc44-s0-extensions-validate.mjs` block 8: `BUDGET.routes.chapters === 3233792` ('the chapters route cap is the one
  it was') and `BUDGET.scripts === 148` -> `await R.assertRouteWithinCap(report, BASELINE)`; the projects, bucket and
  stylesheet gates held as they were.
- block 8: `size.allowance.chapters === 915` and `0 < size.delta <= 915` -> `size.delta` as recorded and
  `assertRouteWithinCap(size.slice, BASELINE)`; the `--measure` writer no longer writes an allowance.
- block 8: `measured.chapters >= size.slice.chapters - 700 - saved` (the lead's booked savings) -> the one size check
  above.
- block "O1 the bookings add up" (routeBookings' refusals, assertBookingsAddUp on the build, the stale-figure,
  foreign-file and foreign-pool-item cases) -> block "AA2 one size check".
- `rc44-wp1-cases-crosswalk.mjs` S2.12: own bytes in [0, 250], allowance 250, routeBookings (wp9a 342 B),
  bookingsAtStart still on the books, start = base + bookings, slice - base - bookings = own bytes ->
  `assertRouteWithinCap(size.slice, size.base)`; on a build, route - base - every booking <= 250 B, 148 script files and
  `under10k <= base` -> `assertRouteWithinCap(report, size.base)`.
- `rc44-wp1-cases-pins.mjs` S3.10: own bytes in [0, 477], allowance 477, routeBookings (wp1 S2 118 B), bookingsAtStart
  and atMerge bookings still on the books, the head's route less base and bookings = own bytes, atMerge 148 scripts ->
  `assertRouteWithinCap(size.slice, size.base)` and `assertRouteWithinCap(size.atMerge, size.base)`; on a build,
  route - base - bookings <= 477 B, 148 script files, the bucket ceiling -> `assertRouteWithinCap(report, size.base)`.
- `rc44-wp9a-deployment-validate.mjs` S1.10: `[cap, projects, scripts, tiny, css] === [3233792, 1213 KB, 148, 61,
  881 KB]` ('no gate is raised') -> `assertRouteWithinCap(report, BASE)` and `[projects, tiny, css]` as they were; the
  shared-pool items, own bytes in (0, 500], routeBookings on the build (mine in (0, 500]), allowance 500 ->
  `assertRouteWithinCap(size.slice, BASE)`; the `--measure` writer no longer writes allowance, ownBytes or pool items.
- `rc44-wp2-adoption-cases/record.mjs` size: cap 3233792, gate 148, 148 files -> `assertRouteWithinCap(report,
  INTEGRATED)`; delta in (0, 600] -> delta > 0 and `assertRouteWithinCap(size.slice, INTEGRATED)`; routeBookings,
  wp2 <= 1,200 B, S1 = its booking -> the one size check; the writer no longer writes an allowance.
- `rc44-wp2-adoption-cases/selection.mjs` S5 size: cap 3233792, gate 148, 148 files -> `assertRouteWithinCap(report,
  size.bases.start)`; S5's own bytes (put-back less start), S1 + S5 <= 1,200 B, the lead's negative pool item, wp2 on
  the build = S1 + S5 within 1,200 B, the O1 merge check on the branch's files, the atMerge restatement of own bytes,
  other packages and pool -> the put-back, the delta and the saving as recorded, `assertRouteWithinCap` on the slice,
  on atMerge and on the build, and atMerge's build compared with this build where it names it; the `--measure-merge`
  mode (it read routeBookings) retired; the `--measure` writer no longer writes allowance or ownBytes.

Y1 (ruling, built here; the lead's leave for the per-package first-draw loading this build retires), each at least as
strict, pinning the new place exactly:
- wp2 record.mjs size and selection.mjs S5 size: every adoption module in the script of the comparison tools' entry and
  nowhere else -> the readers (adoption-domain, adoption-selection, adoption-package) in one script that the shared entry
  and the comparison tools' entry reach and the route does not, and the view (adoption-ui) in the comparison tools'
  script and nowhere else.
- wp2 selection.mjs S5 surface: adoption-package.js imports adoption-ui.js, and the comparison tools' entry names no
  adoption-ui -> the package imports no surface; the comparison tools' entry imports `./adoption-ui.js` and
  `./design-package-readers.js` by imports that take no name; adoption-server.js reaches the view; no other public
  module imports it.
- wp2 record.mjs browser load: after ensureExtensions the registry holds the stubs and this package -> the stubs and
  every stub's package, exactly.
- wp1 crosswalk S2.10 and pins S3.17: the stub loads `./knowledge-workspace-ui.js`, and the host imports
  `./knowledge-package.js` -> the stub loads `./design-package-readers.js`, the shared entry imports
  `./knowledge-package.js`, and the host imports the shared entry.
- wp9a S1.10: the package's modules in one script, the script of the Model view -> in one script that the shared entry
  and the Model view's entry reach, off the route; the stub loads deploy-view.js -> loads design-package-readers.js;
  each module pinned to LAZY_SHARE.modules -> each pinned to SHARED_MODULES, measured in the shared chunk
  (topology-domain.js 20,937 -> 20,892 B, topology.js 1,529 -> 1,528 B: the minifier's names in another chunk), with the
  share's lists and total held to LAZY_SHARE's as before and the evidence's LAZY_SHARE unchanged; a document with the
  package's records opens with at most the route plus 160 KB (new).
- wp9a browser S1.b1: a project with the marker loads the Model view's entry before it is drawn -> it loads the shared
  entry, and not the Model view's, before Chapter 1 is drawn; on Chapter 10 the shared entry is asked for once.
- wp2 selection.mjs S5 Q9 the rest (6): `/adoption-package\.js imports this module/` in the view's header -> `/The
  comparison tools' entry, architecture-task-ui\.js, imports this module/` (the header says where the view loads now;
  it failed when the header was corrected, then passed).

## U6: package steps kept on built-in records

Added as a contract row in S0's parts table (`audit/rc44/build-notes/s0-extensions.md`), marked "a contract row, no
registered part". Why not a registered part: the steps a package keeps on a built-in record have the package's own
shape (wp2's selection keeps content, the candidates, beside steps, the judgements, the choice, the confirm and the
instantiation, and moves the candidates' outcomes with the choice), so a generic mover could not tell content from steps;
and wp2's own edits of `recovery-service.js` and `project-lifecycle.js` already hold them, which a registered part
would duplicate (two paths) unless wp2's edits were retired, which is wp2's code and is being edited by wp2-s2s3 now.
The row names the edits that hold them, the helpers that prove them (`assertRecoveryClearsSteps`,
`assertTemplateCopyClearsSteps`, `assertStepsMoveNoStamp`) and one rule found by this build: the stub's `needs` must hold
for a document that holds such a step. The p40 stub asked for adoptions only, so a document with a chosen selection and
no adoption was drawn on the client without the selection's error on its decision (`selection-confirm`, which blocks
acceptance); the stub now also asks for a decision with a selection (case D10.6, which failed first).

## Deviations from the task, the design and the rulings

1. **The p40 stub's `needs` changed** (U6 above). Not named in the task; within the leave (the route stubs), found by
   D10.1's documents, with a case seen to fail first. The goldens hold: for the stored selection document (a selection
   started, no choice) the client's readings are the base's (no finding then, and the SDD's sections are the server's).
2. **The shared entry imports `review-domain.js`.** Without it, the entry reached part of one route chunk (the modules
   adoption-domain.js reaches through design-task-state.js) and not `model-alternatives-state.js`, so esbuild split that
   module into a script of its own: 151 script files and +470 B on the route. Importing the route's reader of findings
   and of the design, which every chapter's studio reaches, gives the entry the reach a studio has: 150 files, +29 B.
   It fetches nothing (it is on the route). Importing `model-alternatives-state.js` itself measured the same; the reader
   was chosen as the less arbitrary. A later package whose readers reach another route chunk in part can split the route
   again; D10.5 (at most 150) catches it.
3. **The surfaces' entries grew** by the other packages' readers (measurements above), because each host imports the
   shared entry. Y1 keeps each surface in its host entry and asks for one shared entry within +2 files; a host importing
   only its own package's readers would split the readers into one chunk per host (3 to 4 more script files).
4. **The task's helper name** (`assertRouteWithinCap`) is used; it is async (it imports `client-bundle.mjs` when asked,
   so suites that only read documents do not load esbuild). The "CSS cap unchanged" is read against the cap rc44
   started with in S0's size file (902,144 B), not a literal.
5. **wp1 S2.12 and S3.10 read `dist/`** as before: the one size check runs on a build only when `node build.mjs` has
   been run (as at the start).
6. **D10.1 compares each side with its own goldens.** Client and server differ at 4349bb6 in the SDD for documents
   whose package prints a section (knowledge, selection), since only the server prints the SDD; D10.6 holds that this is
   the only difference.

## Suites (this build's head; the machine was shared, load 7 to 12)

- `rc44-s0-d10-validate.mjs` (with `AIW_D10_MEASURE=1`): 7 of 7.
- `rc44-s0-extensions-validate.mjs`: 36 of 36 (block O1 replaced by "AA2 one size check"); green at the start.
- `rc44-wp1-knowledge-validate.mjs`: 87 passed, 2 pending (S4, S5 not yet built), as at the start.
- `rc44-wp2-adoption-validate.mjs`: 45 blocks, none failed.
- `rc44-wp9a-deployment-validate.mjs`: 25 of 25.
- `rc44-wp9a-deployment-browser-validate.mjs`: 1 of 1 (on the built client).
- Green at the start and green here: module-scope-browser, requirements-browser, rc42-lazy-dossier-browser,
  knowledge-repository-browser, stewardship-browser, architecture-whatif-browser, model-views-browser,
  canvas-draft-browser, tradeoff-browser (failed once under load at a 500 ms wait, l.151 "All decisions › QD-004"; green
  run alone), technology-selection-ux-browser, technology-choice-browser, field-kit-browser, model-alternatives-ui,
  driver-design-ui, driver-product-ui, architecture-scenarios-ui, architecture-verification-ui,
  connected-architecture-ui, design-task-ui, exchange-task-ui; and the node suites that name the moved entries:
  knowledge-coverage, native-connection-ui, repository-sync, rc42-g1-tech-approval (it reads comments).
- Red at the start (merge-d12 evidence) and red here the same way, each run on this tree and on an unchanged checkout of
  4349bb6: design-concern (l.199, 'QD-002'), deploy-browser (l.48, "unplaced parts wait in Not placed"), architecture-ui
  (l.36, "Architecture choices are inside Proposals"), composition-ui (l.37, the same), bundle-browser (l.58, the Work
  tab of Chapter 1 loads the pattern catalogue).
- `node check-syntax.mjs`: 947 modules pass. `node scripts/lint.mjs --summary`: 162 problems, baseline 162, new 0.
- `node build.mjs`: passes before (148 files) and after (150 files), no violation.
- Not done: a clean install (`node_modules` is the main checkout's, linked, which this build may not change); the full
  regression (the lead's).

## Retirement list (J6)

- Per-slice byte booking: `routeBookings`, `assertBookingsAddUp`, `LEAD_BOOKINGS`, S0's block O1, every suite's booking
  and allowance assertions, wp2's `--measure-merge` mode: retired here (AA2).
- Per-package first-draw loading (each stub loading its surface's host entry, each host importing its package's
  registration module, the adoption package importing its surface): retired here (Y1).

## Logged for later builds (AA1), and open questions for the lead

1. **The 160 KB bound and later packages.** The shared entry holds every package, so a document with any one package's
   records loads all of them: 69,723 B now. wp3 estimates 45 to 60 KB of readers, wp4 and later more; the bound is
   reached within a few packages. The lead may want to rule early whether the bound stays per document (then the entry
   splits again later, against the 150 files) or is re-measured per wave.
2. **Script files at the plan's 150.** Any later lazy entry or route split needs the owner's decision.
3. **Surfaces' entries carry every package's readers** (deviation 3); acceptable now (25 to 67 KB), to watch as the shared
   chunk grows.
4. **The wp9a share's lists** are still read from the Model view's script (the R4 measure), which no longer holds the
   package; they can only shrink there now. A measure of the package's own lists inside the shared chunk needs a build
   without the package; not built.
5. **Parallel builds.** wp2-s2s3 and wp9a-s2s3 edit the same size blocks (wp2's record and selection size, wp9a S1.10);
   at their merge every booking assertion they add must also become the one size check, or S0's block "AA2 one size
   check" fails (it scans the rc44 suites for a booking read or written).
6. The external authorities stay as they are: counsel not engaged, approver not assigned, review not started,
   acceptance authority not established; the release number is unconfirmed.

## Fix-up (AA1: the one review and the one fix-up)

On `rc44/s0-w3-bundle-fix-c2`, from `629a005` (the build's head, as reviewed; an earlier fix-up session made the branch
`rc44/s0-w3-bundle-fix` and committed nothing, so this one continues from it). The review's verdict: changes needed;
two must-fix items, seven should-fix items, six design concerns.

- **State:** in progress.
- **Plan:** must-fix 1 (the p10 stub's `needs` holds for every key the package states), must-fix 2 (wp9a S1.10 reads
  the package's own import and export lists in the script that holds it), each with a case seen to fail on `629a005`
  first; the small should-fix items inside this build's files, each with its case; every other item carried forward
  (below); then the suites, syntax, lint and `node build.mjs` before and after.
