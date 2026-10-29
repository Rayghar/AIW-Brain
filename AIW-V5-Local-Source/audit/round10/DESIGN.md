# Round 10 · Fewer lines, every relationship kept

Baseline `4d94292` (AIW v0.10.0-rc.10.73.14 candidate). Branch `claude/dazzling-cerf-a3qshh`; this environment develops
on that one branch, so no separate release branch is cut. The clean tree at the baseline is the checkpoint. Release
field for this round: AIW v0.10.0-rc.10.73.15 (candidate). The controlling baseline stays rc.10.73.6;
`productionAccepted` stays false.

The full technical specification (every workstream's mechanism, files, acceptance numbers and test plan) is
`design-spec.json` beside this file. This page is the readable contract.

## 1. Why

The owner asked: look at the number of lines in the diagrams; consolidating them should make the pictures cleaner and
less noisy. Five investigators read the drawing code and measured 472 pictures (bank-payment, five reference journeys,
a 300-responsibility scale project and a stress project). Four designers then proposed independent approaches, three
judges scored them (an architect's truth, engineering contracts, notation standards and accessibility), and one
synthesis was drawn from the winner. All three judges gave the engine-first design 8 of 10.

What the measurements show:

- **A drawing defect.** 72% of routed lines carry a 1–4 px jog near a port. Only the first and last route points are
  snapped to the port; the rest of the run stays on the grid cell centre. A straight drop is drawn as five segments.
- **One port per line end.** Every relationship gets its own port, its own line and its own arrowhead, and the router
  deliberately keeps parallel runs apart. A fan of relationships of one kind becomes a ribbon of parallel lines with
  stacked arrowheads and repeated words. Fans hold 52.8% of bank-payment's diagram lines. On Chapter 6 Solution, 9
  technology parts serve 5 components: 32 arrowheads, and 110 of its 114 crossings are serves crossing serves.
- **The same fact drawn twice.** The Layers view draws a fact recorded in two places as two lines (61 pairs in
  bank-payment, 12 in Chapter 4).
- **Chapter views.** Chapter 10 draws every dependency trunk once per link (2.24 times the ink, 37 arrowheads on 15
  tips). Chapter 9 stacks arrowheads at shared entries. Chapter 3 orders its driver tracks by priority, not by
  crossings. Chapter 2 draws its tree once per edge. Whole design draws one pillar per need.

## 2. Principles

1. **A picture is a reading, never a fact.** Consolidation merges ink, never records. One recorded relationship stays
   one layout edge with its full route, one `g.nt-edge`, one full-route hit with its own Tab stop and accessible name,
   one companion reading and one connection in every code export. No bundle id reaches draw.io, the ArchiMate
   exchange, BPMN, Structurizr, PlantUML or Mermaid.
2. **Ink is shared only along a declared tree** from one shared element and one side of it. The relationships on it
   are drawn identically (kind, word, ends, weak, reply, change). Relationships that share no endpoint never share
   ink, so the shared bus the round-2 audit forbade (D2-12, "which serves which cannot be read") cannot return.
3. **Every bundle is validated.** A bundle that rides a foreign line, has a foreign line through or near a join, has a
   foreign corner on its trunk, crosses an element or splits four ways where a T is required is repaired or drawn
   apart, and every fallback is recorded.
4. **No implied semantics.** No joins on flows, triggering, messages, paths or sequences; none in BPMN or sequence
   pictures; none on numbered, cardinality or trust-crossing lines. Composition and aggregation split as a plain T
   under one diamond. The Key calls a dot a drawing join and makes no ArchiMate junction claim until an independent
   reviewer has checked the standard.
5. **One engine, one renderer.** The notation changes live in `notation-layout.js` and `notation-svg.js`, so the
   Diagram, the Layers view, exports, SDD figures, record pictures, the Running board and the perspectives improve
   together. The chapter views share one pure wires module.
6. **Deterministic geometry.** Nothing depends on zoom, viewport, selection or theme. Exports stay byte-identical at
   any width and in both themes; SDD figures equal fresh renders.
7. **Disclosure without moving anything.** Hover, focus, selection and trace show a relationship's whole route, trunk
   included, drawn on top. A selection lights exactly its own route.
8. **State visible in every theme.** The round-9 dark-theme regression (selected, lit, traced and diff lines lose their
   colour) is fixed.
9. **Evidence over claims.** Every gain is measured against a `consolidate:false` control computed in the same run.

## 3. Workstreams

| Id | What | Depends on |
|---|---|---|
| W0 | This plan, the frozen baseline (`evidence/baseline-measure.csv`) and the spec | — |
| N1 | Drawn metrics (heads, line ends, ink, visual crossing points, bends, foreign-on-trunk, foreign-at-join, T-contacts) and the bundle-integrity checker, before any geometry change; the notation evidence generator | W0 |
| N2 | Whole-run port snap: the jog fix | N1 |
| N3 | Declared bundles in the layout: exact duplicates, same-style fans, validation, local repair, recorded fallback | N2 |
| N4 | Bundle-aware words: one word per line, distinct words on branches | N3 |
| N5 | Renderer, Key and reading packet: trunks drawn once, branches per relationship, per-relationship hits kept | N3 |
| N6 | Screen interaction: trunk click selects the shared element, hover readings, the lift layer, camera follows keyboard focus, zoom-following widths, culling | N5, T1 |
| T1 | Dark theme: fix the round-9 state-colour regression | W0 |
| T2 | Dark theme for trunks, joins and the lift; forced colours | T1, N5 |
| V1 | Pure wires module for the chapter views; one shared `roundPath` | W0 |
| V2 | Crossing-aware tracks in the lane engine and platform brackets | V1 |
| V3 | Chapter 3: crossing-aware driver tracks, port rule, option combs | V1 |
| V4 | Chapter 9 entry trunks drawn once; Chapter 2 utility combs | V1, V2 |
| V5 | Chapter 1 Context fan-out trees (no buses) | V2 |
| V6 | Chapter 10 "needs" rails instead of trunks drawn once per link | V1 |
| V7 | Whole design: one spine per component | V1 |
| V8 | Chapter-lines evidence harness, gated on in-run baselines | W0 |
| R1 | Verification, evidence inspection, report and package | all |

## 4. Owner decisions, with the defaults this round uses

Each is implemented as recommended and recorded as **owner acceptance pending**.

1. **The round-2 shared-run guard.** A declared bundle that passes the integrity checker is exempt from the
   `sharedRuns ≤ 3` gate. Foreign shared runs stay at most 3 per default picture, and foreign-on-trunk,
   foreign-at-join and T-contacts must be 0 in every routed picture, which is stricter where it matters.
2. **The join glyph.** A filled dot (r 2.4, line colour) where branches leave a trunk; a plain T with no dot for
   composition and aggregation and for kinds whose ends already use a dot. The Key: "each branch is one recorded
   relationship; the dot is a drawing join, not an ArchiMate junction."
3. **Composition and aggregation fans.** One diamond at the whole, with a plain T-tree. Nesting is deferred.
4. **The Layers view.** Fan bundles apply there too, under the same integrity rules, an early bail-out and a budget.
5. **Duplicate facts.** Merged visually only. Both records keep their edge, hit, Tab stop and accessible name; the
   companion says "Also recorded as".
6. **A click on a shared trunk** selects the shared element; the companion lists its lines with a button per
   relationship, and hovering the trunk lists exactly its members.
7. **No reader setting for joining lines** this round, so exports never depend on a reader preference.
8. **Straight-line pictures** (above 400 lines, or Layers above 160 lines or 120 elements) stay unchanged. Summarising
   them changes the one-line-per-relationship contract and is for a later round.
9. **Chapter 10 "needs" rails** replace the trunks: one rail per needed part, a mark per dependent.
10. **Exact-biclique buses and ArchiMate And-junctions** are not built: the prototype's "exact" bus implied a
    relationship that is not recorded.
11. **Track budget:** interval-colouring levels plus max(2, 15%) in lane gutters and Chapter 10; none extra for the
    Chapter 6 brackets.
12. **Lines that cards restate** (Chapter 3 weighs, Chapter 1 participates, Whole design implement threads) stay drawn.
13. **The picture's `role=img`** stays until a screen-reader-tested accessibility pass.
14. **Chapter 8 return messages** stay drawn (UML reply semantics).

## 5. Deferred, with reasons

Summaries for the straight-line giants; buses and junctions; nesting for composition; corridors for the by-layer
arrangement (the structural root of Layers noise); module-pair flow trunks (flows would read as forks); security
picture ordering; a reader "join lines" setting; roving tabindex; relationship readings in the chapter tips; fading
restated lines; edge concentration in the ordering; folding Chapter 8 returns (rejected). The independent ArchiMate
junction review is an external authority and is recorded as outstanding.

## 6. Success

- Heads drawn on the 88 routed reference Diagram defaults fall from 1,245 to at most 1,080, and on bank-payment from
  285 to at most 200 (Chapter 6 Solution 32 → ≤16, Chapter 7 Stack 41 → ≤24).
- Distinct visual crossing points fall from 768 to at most 610 on the reference defaults, and from 114 to at most 75
  on Chapter 6 Solution.
- The snap fix cuts bends by 40% or more and short jog segments by 85% or more.
- Foreign-on-trunk, foreign-at-join and T-contacts are 0 in every routed picture; through-passes and words on words
  stay 0.
- Nothing lost: in every picture the counts of `g.nt-edge`, full-route hits and Tab stops equal the relationships;
  code exports carry the same relationship sets; exports stay deterministic.
- Budgets held, every fallback named, the dark theme's state lines at 3:1 or better.
- Chapter views: Chapter 10 heads 37 → ≤15 and crossings 42 → ≤12; Chapter 9 heads 22 → 11; Chapter 3 crossings
  21 → ≤14; Chapter 1 parcel-lockers crossings 134 → ≤33; Whole design Chapter 6 lines 40 → ≤17.
- The full regression passes; tests only get stronger.
