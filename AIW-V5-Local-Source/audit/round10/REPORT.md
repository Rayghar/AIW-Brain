# Round-10 report: fewer lines, every relationship kept

Baseline before this round: `4d94292` (AIW v0.10.0-rc.10.73.14 candidate, the round-9 style), with the round's design at
`2bcad4a` (`audit/round10/DESIGN.md`, `design-spec.json`). Branch `claude/dazzling-cerf-a3qshh`, never pushed. Release
notation after this round: **AIW v0.10.0-rc.10.73.15** (candidate). The controlling baseline stays rc.10.73.6 and
`productionAccepted` stays false.

Asked for: "Could you look at the number of lines visible in the diagrams. I am sure there is a way we can make it
cleaner and less noisy, by consolidating the lines. Think about it deeply and implement it in the best way."

## 1. What landed

The round was built in two parts. The sixteen workstreams of the design (N1–N6, T1–T2, V1–V8, R1) were implemented and
then reviewed by five independent readers of the code and the pictures; the review's 28 findings were verified one by
one and fixed in a second pass, each with an assertion that would have caught it. Part 1 was handed to the owner as a
work-in-progress archive when the review was cut short; part 2 is the difference between that archive and this commit.

### 1.1 The port snap (N2): routes meet their ports

A route is searched on cell centres, but its port stands up to half a cell off that line; before this round only the
first and last points moved, so a straight drop was drawn as a stair of 1–4 px jogs (72% of routed connectors carried
one). The whole straight run that leaves or enters a port now moves onto the port's line (`snapRoute`, `whole`), a
single-run route keeps one jog half way, and a wobble between two offset ports slides one port along its face
(`straighten`). A moved run that would enter an element or run on another connector keeps the round-9 snap for that
connector alone and is recorded (`L.snapReverted`, 50 connectors in 35 of the 355 evidence pictures).

Measured by `scripts/notation-lines-evidence.mjs` against the frozen pre-snap evidence
(`audit/round10/evidence/notation-lines-before-snap.csv`): on the 88 routed reference Diagram defaults, bends 5,367 →
2,837 (−47%) and short jog segments 1,338 → 74 (−94%); on the reference Layers views 19,570 → 13,266 and 3,295 → 119.
The design asked for −40% and −85%.

### 1.2 Lines drawn together (N1, N3–N6): one line for a fan, every relationship kept

`public/notation-layout.js` declares, before routing, the bundles a picture may draw (`formBundles`): a fan of
relationships of one line style to one element by one of its sides, and a fact recorded more than once. Members of a
fan share one port, leave by one stem and ride each other's cells; the picture is routed twice, the control (without
bundles) and the picture as drawn, and `consolidate` checks every bundle after routing against the same rules the
metrics checker holds (`notation-metrics.mjs bundleIntegrity`): one port, no element crossed, a root of at least 12 px,
a tree (no member ending on another's route, no two members running together again once they part), a plain T where a
dot would read as a mark, no foreign line along a trunk, at a join or with a point on one, and, from the review, no
member round its shared element, no detour, no join at an element, no two joins that touch and no step at a join
(§2). A bundle that fails is repaired in place (the foreign line re-routed off it; a step at a join closed by sliding
a run along the trunk), else its failing members are drawn apart, else the bundle; a pass that draws more ink than the
control draws apart the bundle that saves least; when nothing holds the picture is the control. What is returned
always passes every check and never draws more marks, line ends or ink than the control (`defaultsWhereAfterExceedsControl: []`).

The renderer (`public/notation-svg.js`) draws each bundle as one `g.nt-bundle` of trunk runs with a join dot where
each branch leaves (none for composition, aggregation and dot-ended kinds, which split as a plain T under one mark),
then each relationship's own branch in its own `g.nt-edge`; every relationship keeps its full-route hit, Tab stop and
accessible name (`tabStopsEqualRelationships: true` across the evidence), its reading says which line it is drawn on
and with which others, a click on a trunk selects the shared element and lists the line's relationships as buttons,
and the Key explains the dot as a drawing join, not an ArchiMate junction. Words are bundle-aware (`placeLabels`): a
bundle writes its word once, on its root run first. The reading packet and the exported SVG name a line by an opaque
id (`line:…`), never by the element's side or the style tuple.

Measured on the 355 evidence pictures (307 routed; 48 drawn straight, unchanged by design):

| Group | Pictures | Heads | Line ends | Ink | Crossing points | Foreign shared runs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A · reference Diagram defaults | 88 | 1,245 → 1,067 (−14%) | 2,584 → 2,347 (−9%) | −5.1% | 809 → 564 (−30%) | −77% |
| B · bank-payment Diagram defaults | 18 | 285 → 194 (−32%) | 580 → 482 (−17%) | −7.9% | 458 → 285 (−38%) | −75% |
| C · reference Layers views | 64 | 3,116 → 2,925 (−6%) | 6,376 → 5,707 (−10%) | −7.2% | 21,894 → 18,211 (−17%) | −10% |
| D · reference Grouped alternatives | 84 | 1,114 → 933 (−16%) | 2,226 → 1,976 (−11%) | −6.2% | 988 → 732 (−26%) | −14% |
| E · stress-44 and scale-300 | 76 | 2,464 → 1,968 (−20%) | 4,976 → 4,348 (−13%) | −7.0% | 14,538 → 12,237 (−16%) | −1% |

The design's success lines: heads on the reference defaults at most 1,080 (1,067), on bank-payment at most 200 (194),
Chapter 6 Solution 32 → at most 16 (14), Chapter 7 Stack 41 → at most 24 (22); crossing points on Chapter 6 Solution
118 → 64. In all, 1,106 bundles with 1,529 joins; 16 pictures fall back and say why (10 Layers views to the records
of one fact drawn once, 6 pictures to their control), 164 pictures are their control unchanged. Every routed picture
passes the integrity checker, draws no foreign line on a trunk or at a join, no T-contact, no through-pass and no word
on a word or on a tag (`gates` in `notation-lines.json`).

### 1.3 The chapter views (V1–V8)

One pure wire module, `public/wire-merge.js` (`mergeWires`, `assignTracks`, `roundPath`, `headPath`), draws shared
lines once in the chapter models, measured by `scripts/chapter-lines-evidence.mjs` into `chapter-lines.json`:
Chapter 1 story fan-out trees, Chapter 2 utility combs (one per parent, with a fork cue where a child runs straight
on through the spine), Chapter 3 trade-off combs and driver tracks, Chapter 6 brackets, Chapter 9 threat trunks drawn
once, Chapter 10 "needs" rails (one rail per needed part, a mark per dependent, about half of today's ink) and the
Whole-design anatomy spines. Each chapter's own suite asserts the structure; `chapter-lines-validate.mjs` holds the
evidence to what the source draws.

### 1.4 The night theme and forced colours (T1–T2)

State colours (selected, lit, traced, added, removed, changed) reach 3:1 on the night canvas for lines, trunks and
join dots, the lift is recoloured with them, and under forced colours the lines, heads, joins and the Key's samples
draw in CanvasText (`theme-browser-validate.mjs`).

## 2. The review: 28 findings, what each became

The five review readers (engine, renderer and interaction, chapter views, visual, tests and evidence) were cut off by
the usage limit after reporting, so nothing had been verified or fixed when the archive was handed over. Each finding
was then verified against the code and the pictures and fixed; the assertion named is the one that fails without the fix.

Blockers.

1. **A member encircles its target** (parcel-lockers and bank Chapter 9: a red dashed line framed the service it
   threatens, to reach a shared port on its far side). `consolidate` rules `encircle` (a member along two sides of its
   shared element, within 12 px, 16 px each) and `detour` (a member 1.5 × its control route + 40 px); mirrored in
   `bundleIntegrity` (`detour` when the caller gives the control, as the evidence and the layout suite do); the member
   is drawn apart with its fact. Tests: `notation-metrics-validate.mjs` 4b; every evidence picture.
2. **Join dots at a foreign element's border** (Layers views in five journeys), and under mark badges. Rule
   `join-near-element`: no join within 12 px of an element (an undotted bundle's plain T may stand where the trunk
   drops into the element a party enters, the comb a tree draws; a dot there would sit in the branch's own head).
   The router keeps a dotted fan's members off the rim of every element (`makeGrid rim`, `astar`, BUNDLE.AVOID along a
   side within 12 px), so the joins stand clear by construction and the rule rarely fires (16 of 1,106 bundles are
   drawn apart by it). ROOT 10 → 12 so the first join keeps the same distance from the shared element. The badge
   stands 8 px below an element's bottom edge; 12 px clears it at the default zoom.
3. **Culling hid every element once the reader zoomed or panned** (Chapter 1 and 8 Layers of the large project crossed
   the 150-child threshold with the new trunk groups; `getBBox` measured each element before its transform). The box
   is carried through the part's own transform, and a part that takes the keyboard (`tabindex`) is never culled, as
   the hits were not. Test: `scale-browser-validate.mjs` 2c asserts no part whose box meets the stage is hidden and no
   keyboard part is hidden.
4. **"Recorded more than once" decided on the shortened word and qualifier.** `fullQualifier` joins `fullLabel` in the
   model; one `lineStyle`/`sameFact` in `notation-layout.js` is read by the renderer, the view and the metrics (the
   three diverging copies are gone). Test: `notation-validate.mjs`, two relationships that differ only beyond the
   shortened word and qualifier stay two lines.

Majors.

5. **The Layers budget gate flaked at 3×.** The gate is three times the control plus 100 ms (a small picture is timed
   in tens of milliseconds, where the ratio alone is noise), still under 900 ms.
6. **Every selection re-ran the consolidating layout** (about 0.7 s a click on the heaviest Layers views). The view
   keeps its layout while the picture and its options are unchanged (`build`, keyed on the picture and the layout
   options); a selection, a trace or a mark repaints only.
7. **A composition fan showed no diamond** (the start marks stood inside the source box: refX 1 and 2 with
   `orient="auto-start-reverse"`). Diamonds refX 9, the circle refX 8. Test: every marker's shape lies at or before
   its refX.
8. **Words on qualifiers** (Chapter 5). Qualifier and cardinality tags are placed first and are obstacles for the
   words; a word on a tag counts as a word on a word in the metrics (`tagBoxes`), the evidence gate `labelOnLabel`
   is 0, and the last resort ranks another word worst, then an element's box, then a tag, then a title.
9. **Chapter 2: a child level with its parent drew a plain + crossing.** The comb carries a fork cue (`fork`) and the
   view draws a dot where the stub meets the spine. Tests: `utility-validate.mjs`, `utility-browser-validate.mjs`.
10. **A pass with every bundle dissolved returned unchecked** (could draw more ink than the control). It now falls
    through to the fallbacks, so the control is what is drawn; the layout suite asserts a picture with bundles
    dissolved and none left is the control, named as the fallback.
11. **Removed lines below 3:1** (opacity .55 on a grey). Removed lines are drawn at full opacity in sage-9
    (`#6a786d` light, 4.6:1; `#667970` night, 3.6:1) with their dash; attenuated lines at opacity .7 (about 4:1 over
    either canvas). The theme suite composites each state's colour over the canvas at the opacity the line is drawn
    with, in both themes. The light "changed" gold moved from `#bb8628`'s predecessor `#c08a2b` (2.98:1) to `#bb8628`
    (3.16:1), the one colour change of this pass.
12. **Ordinary chapter lines below 3:1** (`.um-edge`, `.sm-route`, `.dx-route`, `.tm-route.uses` at .75). All on
    sage-9 at full opacity, in both themes.

Minors, each done: a stable opaque bundle id (`line:` + a hash of its key); the Key's "recorded more than once" sample
is a plain line (no ×2 mark exists on the picture) and its plain-T text no longer claims a shared end mark; a column of
the exported Key that begins inside a section repeats the section's heading; two joins closer than 10 px and a bend
within 10 px of a join (`join-gap`) are first closed by sliding a run along the trunk (131 slides across the evidence,
each kept only when the bundle then passes and no other bundle fails) and otherwise drawn apart; one `recordName` in
plain words (a reference, an id, or where the model records it) is shared by the hits' accessible names and the
companion, and two records that read alike are told apart by it; the trunk's pointer layer leaves the runs where
members end, so a relationship drawn wholly on runs can still be pointed at; a trunk click scrolls the companion to
"Lines drawn together"; the Key's samples draw under forced colours; pointer-only hover readings of lines are no
longer `aria-live`; dead paths removed (`arrowMarkerStyled`, the lane layout's undrawn `joins`, the deploy layout's
`trunks` alias and its test, the lift's unused `state` option, a stale comment on the Chapter 3 tracks).

The test-and-evidence integrity check the review never ran: the diff of every `*-validate.mjs` since `2bcad4a`
removes one assertion (`story-browser-validate.mjs`, `.sm-route` count ≥ 11), replaced by assertions on the exact
relationships each drawn line carries; the new suites (`notation-metrics`, `wire-merge`, `chapter-lines`) fail on
hand-built pictures that break each rule; both evidence generators are deterministic for the same documents and source
(the timing file differs by design); `package.json` registers all 154 suites; `notation-lines.json` is 525 KB for 355
pictures and is kept as the round's machine-readable evidence.

### 2.1 The cost of the review's rules

Against the handed-over archive, the shape rules draw 87 fewer bundles (1,193 → 1,106) and 105 fewer joins
(1,634 → 1,529), and 9 more pictures fall back (7 → 16); heads on the reference defaults are 1,067 against the archive's
lower count, still under the design's 1,080. Every one of those bundles would have framed an element, put a dot at a
foreign element or in a branch's head, or drawn a step at a join. The slide repair (`align`) keeps 131 bundles that
the rules alone would have drawn apart.

## 3. Verification

Run on this commit, in order: `node check-syntax.mjs` (496 modules); `npm run lint` (186 problems, baseline 186, new
0; the baseline lowered by one); `npm run build:client` (CSS 676 KB of the 685 KB budget); `npm run build` (the
Worker, 162 server modules); the unit suites notation, notation-layout, notation-metrics, notation-code, utility,
deploy, wire-merge, chapter-lines, story, threat, tradeoff, anatomy, scale; the browser suites theme, scale, utility,
notation, desk, model-views, story; `node scripts/notation-lines-evidence.mjs --check` (structural gates hold) and
`npm run evidence:chapter-lines`; then the full regression.

### 3.1 The regression runs, in order

| Run | Result | What failed, and what was done |
| --- | --- | --- |
| 1 | 154 of 155 | `test:scale`: the readiness board measured 557 ms against its 500 ms bound (best of three) under three concurrent browser suites; alone it measures 351 ms. Nothing changed; re-run. |
| 2 | 154 of 155 | `test:scale` again, a different budget line: Chapter 11's checks with a review recorded, 335 ms against 300 (175 ms alone). Re-run once more to see whether the load was passing. |
| 3 | 153 of 155 | `test:scale` (377 ms against 300) and `stack-browser`: the Chapter 7 assessment editor had not opened 500 ms after the click. The budget suite's measurements are of the machine, not the code: the runner now gives a suite that measures budgets the machine to itself (`release-checks.mjs` EXCLUSIVE: the other workers finish what they run and wait), and the editor is waited for, up to 5 s, rather than given a fixed pause. No bound or assertion changed. |
| 4 | **155 of 155** | Green. `test:scale` ran with the machine to itself (109 s). The per-suite results are `audit/round10/evidence/regression-run4.json`. |

The release field was set and the evidence regenerated under it after run 4; `chapter-lines`, `notation-code` and `service-routes` were re-run on the final tree (the release string is read from `package.json` at run time, never hard-coded).


## 4. Not changed, and open

- The fourteen owner decisions of `DESIGN.md` §4 are implemented as recommended and remain **owner acceptance
  pending**, among them the redefinition of the round-2 shared-run guard for validated bundles, the join glyph and the
  Chapter 10 rails.
- The independent ArchiMate junction review is an external authority and is outstanding; the Key claims no junction.
- The 48 pictures drawn with straight lines (above 400 lines, or Layers above 160 lines or 120 elements) are unchanged
  by design; summarising them is for a later round.
- The arrangement `radial` of Chapter 6 Solution draws two words farther from their lines than before (a dense ring
  where the only room is beyond the tags); no word stands on another word or on a tag there now.
- One Layers view (bank-payment Chapter 3) still falls back to the records of one fact drawn once after its passes;
  the Layers views keep their budget (slowest 588 ms, three fall back and say why).
- `productionAccepted` stays false; no licence, expert-review, calibration, signing or production acceptance is
  claimed. The branch has never been pushed: `git push -u origin claude/dazzling-cerf-a3qshh` is the owner's.

## 5. Commits

- `5e74d53` feat(lines): round 10, lines drawn together, every relationship kept — the sixteen workstreams as handed over.
- `416698c` fix(lines): the review's 28 findings, each with the assertion that catches it — including the runner's exclusive scheduling of the budget suite and the Chapter 7 editor wait.
- this commit: docs(round10): the report, the regression evidence and the release field rc.10.73.15.

The branch `claude/dazzling-cerf-a3qshh` has never been pushed; `git push -u origin claude/dazzling-cerf-a3qshh` is the owner's step.
