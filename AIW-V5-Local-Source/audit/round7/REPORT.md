# Round-7 report: proportion — one header, the canvas in view, a companion that is classified

Baseline before this round: `69f1bff` (AIW v0.10.0-rc.10.73.11 candidate). Result: `36e13c8`. Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.12** (candidate; see §4).

Asked for: an AIW-wide UI polish from the owner's recording and two stills — the header oversized and eating the model canvas, so that a picture needed scrolling; Sol's review card to be collapsible and refined so that its information is classified; pages and text that were jarring, noisy and disproportional. The design (`audit/round7/DESIGN.md`) measured the recording and set the contracts.

## 1. What landed

### 1.1 One chapter header, one tabs row (A)

- The chapter header is one row: the kicker "Chapter 04", the title at 22 px serif (the same words), the subtitle beside it on one line, and at the right the readiness meter — "Chapter 4 readiness · 4 of 8", a 72 px track and "Next: Review inherited inputs →" on the same line. The breadcrumb went: the sidebar's project card names the project. The milestones are said once.
- The tabs row holds the studio's assistance bar beside the tabs: Ask Sol, Proposals and the explanations toggle, now "Explain · On" with its full sentence in the title; on Work the record's name and the guidance chip stand before them, on Model the companion carries the reading so they step aside. A studio's own control block in its assistance markup (Chapter 10's environment picker, Chapter 3's design question) takes one row under the tabs. "You are here" stays for screen readers only; the frame's own title names the view on screen. The top bar is 52 px.
- Phones keep their rules: the heading folds, the readiness disclosure closes to its count, the assistance bar wraps under the tabs.

### 1.2 The frame in view (B)

- The frame is sized to the stage column with a 440 px floor, so its status line is on screen and nothing scrolls to show a picture.
- In the side-by-side layout the frame's title row and its views row become one row while the frame is at least 1020 px wide (a container query on the frame); a narrower frame keeps the views on their own row, every view with its word, and shows the toolbar's export and zoom buttons as icons with their titles. The frame's "Chapter 4 · Model" title is for assistive technology only: the shell's tabs already say it.

### 1.3 The companion, classified (C)

- The docked companion folds what a view renders into sections under one summary style — a small-caps label, the count badge, a chevron: **What the model shows**, the chapter's **checks**, **Reading this view**, and **Sol** last. The selection's own parts (a specimen with its "Needed at", "Delivers" and its checks, a story, a trace) stay a card at the top.
- Every section is collapsible; a viewer's choice is remembered per section (`aiw.companion.<key>` in localStorage, a convenience: without storage the defaults stand). Defaults: open, except Sol.
- The fold runs after every render of the companion and is idempotent, so no view changed its render; each folded section keeps its heading in its own text, off screen, so what a suite or a reader reads is whole.

### 1.4 Sol's section (D)

- Sol's parts sit last under one folded section whose summary is the review's own heading: "Sol · review of Chapter 4" with the state in one chip — *not run*, *reviewing…*, *3 to consider*, *nothing left to consider*, *the chapter changed since*. It is closed until Sol is busy, has findings, or the viewer opened it; opening is remembered.
- Before a run it says in one line what Sol reads ("Sol reads the chapter's records, their checks and the connected model; you see the packet first and decide.") and offers "Review this chapter". After a run the findings are classified under **To consider** (with their actions), **Adopted** and **Set aside**, each with its count; the way in by record (the chapter's records with open checks) stands below the review. The same markup serves the Proposals panel.

### 1.5 Work, Validate and Output say it once (E · R7-W)

- Every Work inspector head says "Details" once, without the tab and without a "Chapter NN / tab" kicker, on Chapters 1–11; the guidance heading is 18 px serif with one paragraph; "A useful next thought" is one 13 px box.
- The Work stage's own card head on Chapters 4–11 loses its "CHAPTER NN / WORK" kicker; its heading is 20 px serif with a one-line lead and its stat row one 56 px row. The card kickers that only restated the chapter and the tab went on every tab of Chapters 4–11 and on the Output cards of Chapters 1–3; Chapters 1–3 keep their section numbering ("01 / Frame the problem").
- The note "Reference examples are labelled throughout …" shows once per project per viewer, on Chapter 1's Work tab, with a "Got it" that remembers the choice, and nowhere else; the "Reference example" badges keep their text.
- The Validate head's tiles are 64 px high and the rule sentence is the tile row's caption (beside the tiles where the header is wide enough, under them otherwise).

### 1.6 Proof (F)

- `ui-proportion-browser-validate.mjs` (`test:ui-proportion`) measures the bank project at 1894 × 960, 1440 × 900 and 1280 × 720 on Chapters 1, 4, 8 and 11: the canvas within 290 / 330 / 370 px, nothing scrolls to show the frame, the frame's bottom inside the viewport, the milestones said once, "You are here" off screen, the kicker and the 22 px title, the companion's sections in order, Sol closed by default and its choice kept across a reload, "Reading this view" keeping its state across views, the Explain toggle with its state, one next action per screen.
- The suites that read the old header, the companion's unfolded sections or Sol's controls were adapted, never weakened: co-author (the classified groups), shell (the kicker, the focus order through the actions), model views (the folded round and trace), browser (the kicker), desk (the overview while zoomed), exchange (the folded reading), and the eight suites that read Sol's part view it opened, as a viewer who opened it would.

## 2. Measured before and after

Taken in headless Chromium on the bank reference project and the walkthrough's drafted project, local servers with scratch databases and no API key; the bundle and build figures by the gates. "Canvas" is the top of the first picture's drawing area, in px from the top of the viewport.

| What | Before | After |
|---|---|---|
| Canvas at 1894 × 960 (the owner's window), Chapters 1 / 4 / 8 | 489 / 496 / 530 (51–55 % of the viewport above it) | 244 / 251 / 283 (25–29 %) |
| Canvas at 1440 × 900 | not measured before | 273 / 312 / 314 |
| Canvas at 1280 × 720 | not measured before | 306 / 347 / 347 |
| The frame's bottom at 1894 × 960 | 925 of 960 with the page's own scroll; the status line and the lower picture needed the stage column to scroll | inside the viewport on every chapter; the stage column and the page have nothing to scroll |
| Bands above the canvas, Chapter 4 · Model at 1894 × 960 | top bar 63 · heading 110 · tabs 35 · You are here 25 · assistance 50 · frame title 37 · views 33 · toolbar 35 | top bar 52 · heading 40 · tabs with the actions 47 · frame views and actions 36 · toolbar 36 |
| What is said twice on one screen | the milestones (readiness block and tabs row); the chapter and the tab (breadcrumb, tabs, "You are here", the frame's title, the Work card's kicker, the inspector's kicker); the reference note on every Work inspector | nothing: the chapter once in the kicker, the tab once in the tabs, the milestones once in the meter, the reference note once per project |
| The widest control | "Hover explanations · On", 212 px | "Explain · On", 104 px |
| Sol in the Model companion | first, a 125 px card with a four-line explanation whether or not Sol is connected | last, one 36 px summary line with the state in a chip; opened, one line and the button |
| The Work inspector head | "Details · Work", then "Chapter 01 / work", then a 24 px heading | "Details", then an 18 px heading |
| Validate head tiles | 74 px, the rule sentence a paragraph under them | 64 px, the sentence the row's caption |
| Walkthrough | 47 steps | 48 steps in one run (0 page errors, 0 failed requests), one new: the companion opened on Sol's section (`audit/round7/WALKTHROUGH.md`) |
| Client bundle | chapters route 2,267,038 B; Projects route 989,818 B; stylesheet 599,388 B; 133 script files | chapters 2,267,731 B of 2,314,240; Projects 990,000 B of 1,034,240; stylesheet 612,917 B of 634,880; 134 script files of 140 |

## 3. Commits of this round

- `36e13c8` feat(proportion): one chapter header, the frame in view, a classified companion with Sol folded
- `a797dfa` feat(chrome): Work, Validate and Output say the chapter and the tab once (R7-W)
- `f66faf4` docs(design): round 7, proportion — one header, the canvas in view, a classified companion
- the commit carrying this report, the walkthrough and the release field follows `36e13c8`

## 4. Discipline kept

- The integrated tree was verified by one full regression (147 of 149 suites under three workers; the browser suite's one assertion adapted and green alone, the scale budget suite green alone), the shell, model-view, desk, exchange, story, deploy, platform, stack, threat, trade-off, realise, responsibility, utility, anatomy, notation, validate, journey-draft, chapter-Sol, stewardship, knowledge-repository, Sol-coverage, brain-subject and co-author suites run singly beforehand, the new proportion suite at three viewports, and the walkthrough; committed as two units, the lead's chrome, frame, companion, Sol section and proof, and the workstream's Work, Validate and Output chrome, applied onto the lead's tree as a patch.
- Nothing a person could do before is lost: every control keeps its name, its keyboard path and its `data-` hook; only place and size changed. The one focus-order change — the assistance bar's actions now sit between the tabs and the "?" — follows the visual order.
- The authority chain is unchanged: this round moved and sized what the screen shows; no command, policy, scoring or storage of the project changed. The companion's and the note's remembered choices live in the viewer's browser only, as conveniences.
- No old and new path side by side: one summary style for every folded section; the per-studio assistance bars were not duplicated, they were placed; the frame's title is one element, hidden for sight, not a second heading.
- `productionAccepted` stays false. The release field advances to the candidate rc.10.73.12; the controlling baseline stays rc.10.73.6 until the owner records a release.

## 5. Gates at `36e13c8`

| Gate | Result |
| --- | --- |
| `node check-syntax.mjs` | 484 application, service, script and verification modules pass |
| `node validate.mjs` (shell state in a vm sandbox) | passes |
| `node client-bundle.mjs` | no violations: chapters route 2,267,731 B of 2,314,240 B; Projects route 990,000 B of 1,034,240 B; stylesheet 612,917 B of 634,880 B; 134 script files of 140 |
| `node build.mjs` (Worker build) | passes: 162 server modules, `@anthropic-ai/sdk` 0.131.0 vendored, packaged imports and asset serving verified |
| `node scripts/lint.mjs` | 0 new problems; baseline 187 unchanged |
| `npm run test:ui-proportion` (new) | passes at 1894 × 960, 1440 × 900 and 1280 × 720 on Chapters 1, 4, 8 and 11 |
| `node release-checks.mjs` (every `test` and `test:*` script, provider keys stripped, Chromium for the browser suites, three workers) | 147 of 149 suites pass on the integrated tree; the two not passing: `test:browser`, whose one assertion read the chapter kicker's `innerText` (upper-cased by the stylesheet) and now reads its text — it passes alone after that one-line suite change — and the load-sensitive scale budget suite (`test:scale --strict`), which passed alone (16 checks) on the same tree; `test:evidence` passes again with the release field at rc.10.73.12, and the release manifest records that notation at packaging (no suite asserts on the field's text; the round-6 report named two scripts for it that do not exist, corrected here) |
| Clean install of a fresh `git archive` of `36e13c8` (677 files) | `npm ci` completes (the four known moderate advisories in the migration tooling), 484 modules pass the syntax check, the client bundle builds within every budget, the Worker build packages 162 server modules with `@anthropic-ai/sdk` 0.131.0 vendored, 134 client script files and one stylesheet |

## 6. What remains, honestly

- **Mid-width frames**: at 1440 × 900 and 1280 × 720 the frame beside a 300 px companion is under 1020 px wide, so its views keep their own row and the canvas begins 30–60 px lower than on the owner's screen; folding the companion to a rail at those widths would recover it and is not done.
- **Chapter 10's and Chapter 3's control rows**: the environment picker and the design question take a row of their own under the tabs (40–50 px); a place in the stage's own card would save it.
- **Chapter 4's Work stat row** wraps to two lines at 1280 × 720 (three stats and a button in a 640 px column); nothing was hidden to force one line.
- **The Validate tiles** are a 64 px minimum, not a fixed height: a long run-state text in a narrow tile would grow the row rather than be cut short.
- **Sol's section** opens by itself only when Sol is busy or the latest run has findings; a finding adopted or set aside does not open it. The eight suites that drive Sol's controls view the section as a viewer who opened it.
- **Icons in a narrow frame**: the export and zoom buttons show their icon and keep their title; the view buttons keep their words and wrap instead.
- **Left from round 6 and still open**: the live Sol run (this environment denies api.openai.com); the model reader's edges; a model alone drafts Chapter 1's people only; the narrowed sequence; icons on drafted projects; plateaus and the desk; the narrative's cost at scale; the trade-off passages' approval; Chapter 5 Model and Chapter 10 Validate at 500 records per chapter; the hosted D1 row size; the four moderate npm advisories; SSO and roles, presence and comments, delivery-tool exports, knowledge connectors, locales, telemetry and plans.

## 7. What this report does not claim

- No model call was made in this round; nothing about Sol's wire, prompts or receipts changed. The owner's key was not used (this environment denies api.openai.com, as the round-6 report says).
- No production acceptance, licence approval, expert review, calibration or signing happened; `productionAccepted` stays false.
- Measurements were taken in headless Chromium on the bank reference project and the walkthrough's drafted project at three viewports; other viewports, browsers and real projects were not measured. The owner's own screen (1894 × 1086 window) is the first of the three.
