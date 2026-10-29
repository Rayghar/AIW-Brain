# Round-8 report: the round-6 header, shorter; a panel that folds; the journey audited

Baseline before this round: `e07235a` (AIW v0.10.0-rc.10.73.12 candidate), with the round's design at `f88db53`.
Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.13** (candidate;
see §4). The controlling baseline stays rc.10.73.6 and `productionAccepted` stays false.

Asked for, in order:

1. Proceed with round 8, and while at it walk the user journey from a new project to SDD generation in depth and note
   the improvement recommendations.
2. Mid-round, after checking round 7 on their own screen: the round-7 header layout is worse than round 6's. Keep the
   round-6 header layout, only reduce its height to make space for the canvas, make the panel on the right collapsible
   so the canvas can take the width, then continue with the rest of the refinements.

The design's contract A (round 7's header finished at mid widths) was replaced by A′ (DESIGN.md §4). The scale and
hardening workstreams were stopped when the owner interrupted the round; their partial work is not integrated (§5).

## 1. What landed

### 1.1 The round-6 header, shorter (A′)

- The round-6 markup is back unchanged: the breadcrumb naming the project and the chapter, the title and the
  subtitle on their own lines, the readiness meter at the right; the tabs row with the milestones, the next action and
  the "?"; "You are here" on screen; the studio's assistance bar (Ask Sol, Proposals, Explain) in its own row above the
  studio. Round 7's chapter kicker, its one-row title and its assistance-in-the-tabs-row are retired, not kept beside.
- Only height changed: the title is 24 px, the breadcrumb, subtitle and labels 12–13 px, the readiness figure 20 px,
  the tabs 38 px, the assistance row 36 px. Chapter 3's design question and Chapter 10's environment picker are each
  one 36 px line with the label inline.
- In a window 800 px high or less the subtitle steps aside and the docked model frame fits its column (down to 340 px)
  so its status line stays in view.
- "Explain" keeps its round-7 label with its On/Off state; the round-7 work on Work, Validate and Output (one
  "Details", the reference note once, 64 px tiles) and the classified companion with Sol folded stay.

### 1.2 The panel that folds

- The panel at the right — object details on Work, Validate and Output, the model companion on Model — has one toggle
  at its top right. Folded, it is a 36 px rail carrying its name ("Details" or "Companion"); the stage, with the model
  frame in it, takes the width it frees. The choice is kept in the browser (`aiw.panel.collapsed`) and survives a
  reload; a second click brings the panel back. Without storage the panel opens.
- The first-steps card moved to the bottom right, as wide as the panel, so the header's rows stay reachable while the
  tour is open. The shorter header had put the card over Ask Sol, which the regression caught.

### 1.3 The journey audited

- `audit/round8/JOURNEY-AUDIT.md`, published as a page with its screens:
  https://claude.ai/artifact/4GEnjgnNpZGnnDgi5QHKmf
- A headless probe drove a blank project from a brief file through Chapter 1's draft, the whole journey to Chapter 11,
  four chapters on every tab, Chapter 11's stages and views, the SDD editions, Sources, Changes, the help map, Ask Sol,
  Proposals and the gallery: 86 steps and 77 screens at 1894 × 960, with 0 page errors, 0 console errors and 0 failed
  API calls.
- 58 findings: none blocks the journey, 12 slow it, 24 jar and 22 are polish. Each has a phase, a severity, an effort
  and a recommendation, and the audit ends with a recommended order. The six biggest: three counts for one thing; a
  readiness meter that does not move when a chapter is drafted; a 45-card draft in one scroll; Output burying its
  export; drafted names by concatenation and placeholder alternatives; a selection that follows the person across
  chapters.
- Twelve were taken in this round: J-01, J-05 (Chapter 1), J-07, J-09, J-12, J-13, J-16, J-20, J-24, J-32, J-40 (one
  row) and J-58 (the header). The other 46 are the owner's to order.

### 1.4 Proof

- `ui-proportion-browser-validate.mjs` (`test:ui-proportion`) is rewritten for A′: on the bank project at 1894 × 960,
  1440 × 900 and 1280 × 720, Chapters 1, 4, 8 and 11, the round-6 rows are present (the breadcrumb names the chapter,
  the readiness meter in the heading, the milestones and the next action in the tabs row, "You are here" on screen,
  the assistance bar in its own row), the heading is at most 80 px and the title at most 24 px, the canvas begins
  within 380, 390 and 410 px on Chapters 1, 4 and 8, nothing scrolls to show the frame and its bottom is inside the
  viewport; the panel folds on Model and Work, the frame widens by at least 200 px and still fits, the choice survives
  a reload and a second click restores the panel; Sol's section and the Work tab's checks stand as in round 7.
- `journey-audit-validate.mjs` (`test:journey-audit`, new) checks the taken findings where they live: cut titles end
  with an ellipsis within 120 characters; a blank project gets no reference note and is pointed at the draft; singular
  counts read singular; the story map waits for Chapter 4 before reporting coverage missing; the product name, the
  brief's line breaks, the short hash, the fill bar's wording, one primary on an empty chapter, the accept label.
- Suites adapted, not weakened: shell and browser read the breadcrumb and find the "?" right after the tabs again, as
  in round 6; the browser suite allows the toggle in the companion column; the desk suite stops counting a 1 px
  visually hidden icon label as cut text; the model-views suite deselects by clicking the stage's corner, because the
  taller canvas put a card under its centre; the co-author suite reads the fill bar's new wording.

## 2. Measured before and after

Headless Chromium on the bank reference project, local servers with scratch databases and no API key. "Canvas" is the
top of the model frame's drawing area, in px from the top of the viewport. Round 6 and round 7 figures are from round
7's report.

| What | Round 6 | Round 7 | Round 8 |
|---|---|---|---|
| Header layout | breadcrumb, title, subtitle; tabs with milestones and Next; You are here; assistance row | one compact row; assistance in the tabs row; You are here hidden | round 6's, shorter |
| Studio top at 1894 × 960 | about 360 | 159 | 254 |
| Canvas at 1894 × 960, Chapters 1 / 4 / 8 | 489 / 496 / 530 | 244 / 251 / 283 | 339 / 346 / 378 |
| Canvas at 1440 × 900, Chapters 1 / 4 / 8 | not measured | 273 / 312 / 314 | 339 / 378 / 380 |
| Canvas at 1280 × 720, Chapters 1 / 4 / 8 | not measured | 306 / 347 / 347 | 369 / 408 / 380 |
| Frame bottom at 1280 × 720 | the page scrolled | 682 of 720 | 682 of 720 |
| Frame width, panel open → folded | no fold | no fold | 1,250 → 1,514 (1894); 796 → 1,060 (1440); 636 → 900 (1280) |
| Bands above the canvas, Chapter 4 · Model at 1894 × 960 | top bar 63 · heading 110 · tabs 35 · You are here 25 · assistance 50 · frame 105 | top bar 52 · heading 40 · tabs and actions 47 · frame 72 | top bar 52 · heading 67 · tabs and You are here 73 · assistance 44 · frame 92 |

The canvas sits about 95 px lower than round 7 because the round-6 rows the owner asked for are back, and about
150 px higher than round 6. Folding the panel is how the canvas takes the length of the screen. Two figures sit 2 px
inside their targets (Chapter 8 at 1894 × 960, Chapter 4 at 1280 × 720): the layout is deterministic in the suite's
Chromium, but a machine whose fallback fonts differ could cross them.

## 3. Gates

| Gate | Result |
| --- | --- |
| `node check-syntax.mjs` | 485 application, service, script and verification modules pass |
| `node validate.mjs` | passes |
| `node client-bundle.mjs` | within every budget: chapters route 2,269,639 B of 2,314,240; Projects route 990,249 B of 1,034,240; stylesheet 615,374 B of 634,880; 134 script files of 140 |
| `node build.mjs` (Worker build) | passes: 162 server modules, `@anthropic-ai/sdk` 0.131.0 vendored, packaged imports and asset serving verified |
| `node scripts/lint.mjs` | 0 new problems; baseline 187 unchanged |
| `npm run test:ui-proportion` | 4 checks pass at 1894 × 960, 1440 × 900 and 1280 × 720 |
| `npm run test:journey-audit` (new) | 4 checks pass |
| `npm run test:evidence` with the release field at rc.10.73.13 | passes |
| `node release-checks.mjs`, first run (every `test` and `test:*` script, provider keys stripped, Chromium, three workers) | 147 of 149. `test:brain-subject-browser` failed because the first-steps card, fixed at the top right, now lay over Ask Sol under the shorter header; the card moved to the bottom right and the suite passes. `test:scale` exceeded one budget under load (366 ms against 300 ms) and passed alone, as in round 7. |
| `node release-checks.mjs`, second run, on the tree as committed | 150 of 150, with the moved card and the new suite registered |
| Clean install of a fresh `git archive` of `f645bdf` (681 files) | `npm ci` completes with the four known moderate advisories in the migration tooling; 485 modules pass the syntax check; the client bundle builds within every budget; the Worker build packages 162 server modules |
| Walkthrough (`audit/round8/WALKTHROUGH.md`) | 49 steps in one run at 1440 × 900 with 0 page errors; one new step shows the panel folded |

## 4. Release field and evidence

`package.json`'s release field reads **AIW v0.10.0-rc.10.73.13**, a candidate. The controlling baseline remains
rc.10.73.6. `productionAccepted` stays false: no mandatory external gate passed in this round.

## 5. Not done, withdrawn and external

- **Scale (R8-S) and hardening (R8-H), withdrawn.** Both were stopped when the owner interrupted the round and are not
  integrated. They stand as round 7 left them: Chapter 5's Model and Chapter 10's Validate over 3 s at 500 records per
  chapter, the narrative trace's cost on large documents, four moderate npm advisories in the migration tooling
  (drizzle-kit's esbuild), and the hosted D1 row size unmeasured.
- **The audit's 46 open findings** are the owner's to order; the audit recommends one.
- **The live Sol check** was not run: this environment denies api.openai.com. The owner can run `npm run
  sol:live-check` locally with their own key, and should rotate the credentials shared in the uploaded `.env`.
- **External authorities** are unchanged: licence counsel, an independent architecture reviewer, a four-eyes knowledge
  approver, an enterprise KMS authority and a production acceptance authority have not acted, and nothing here claims
  they did.
