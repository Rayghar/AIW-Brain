# Round-9 report: the approved style, refined paper with a night theme

Baseline before this round: `216c288` (AIW v0.10.0-rc.10.73.13 candidate), with the round's design at `a9701d9`.
Branch `claude/dazzling-cerf-a3qshh`. Release notation after this round: **AIW v0.10.0-rc.10.73.14** (candidate).
The controlling baseline stays rc.10.73.6 and `productionAccepted` stays false.

Asked for: "I approve A and C as dark theme. Ensure zero functionality is lost. The AIW product vision must become
even more strengthened." A is the refined-paper direction of the style canvas; C, the night console, is its dark theme.

## 1. What landed

### 1.1 One token system (contract A)

- `public/theme.css` is the first stylesheet and the one source of colour and type. Seven hue scales (sage, the
  neutral biased towards AIW's green; green, the accent; gold; red; blue; violet; teal) have twelve steps each, one
  role per step in both themes, with a light and a dark value. The dark values apply when the viewer chooses Dark,
  or System on a dark operating system. Print is always light.
- Step 9 is a solid that carries white text at 4.5:1 or better in both themes. Measuring this changed nine values
  from the design sheet: in the dark theme every hue's 9 is deeper (amber most: `#c99a3b` → `#996c00`), and in the
  light theme amber-9 and sage-9 are deeper. The register's "to confirm" bar is therefore a deeper ochre than round
  8's light gold, which also lifts it from about 2.4:1 against the card to 4.6:1.
- Semantic names sit above the scales: `--ui-*` for the interface; each of the five states (to fix, to confirm,
  proposed, draft, passing) has a wash, a chip background, a line, a solid and a text step; the provenance marks
  (stated, inferred, open question) and Sol's violet (`--prov-sol*`).

### 1.2 Every colour a token (contract B)

- 5,553 colour literals in the 42 round-8 stylesheets became references to 78 scale tokens. Each colour went to the
  nearest step of its own hue family, measured in OKLab, by the role of the property using it: text to text steps,
  backgrounds to surfaces or solids, lines to border steps. A shadow layer with no blur (an inset state bar, a focus
  ring) is a line and keeps its hue; a blurred one follows `--shadow`. A colour with transparency became a mix of its
  token. No hex, `rgb()` or named colour is left in a declaration outside `theme.css`.
- The local palettes (`--r-*`, `--cm-*`, `--cream-*`, `--sk-*` and the others) keep their names and resolve to the
  tokens. No parallel palette is left.
- Dark islands stay dark in both themes. The review desk's monitor strip, the tooltips, the toast and the dialog and
  Brain headers were drawn on a near-black ground in the light interface. Their ground is the neutral solid, and
  their text and strokes are white or a light tint of their state's colour (35 tinted or dimmed declarations).
- The migration is reproducible: `audit/round9/tools/` holds the scripts. Run on round 8's sources, they rebuild all
  44 stylesheets byte for byte (README there).

### 1.3 Type (contract C)

- The interface is set in IBM Plex Sans (400, 500, 600) and record IDs and code in IBM Plex Mono (400, 500). The
  fonts are served by the app from `public/fonts/` with their SIL Open Font License. The client bundle copies them
  and the Worker packs `font/woff2`, so the policy stays `font-src 'self'`.
- Georgia moved off 170 interface rules (headings take Plex Sans 600) and stays in the four document rules: the SDD
  cover and document titles, the anatomy narrative, the Projects page's principle. 27 sans stacks (including bare
  `system-ui`) and 9 monospace stacks now name the tokens.

### 1.4 The theme setting (contract D)

- Light (the default), Dark and System sit in the top bar of the chapters and of the Projects page as a labelled
  group of buttons. The choice is kept per viewer in this browser (`aiw.theme`).
- On a phone (700 px or narrower) the words give way to a sun, a moon and a half-filled circle. The words stay as
  each button's name and title, so the control fits beside the brand and the save status, with no sideways scroll.
- `theme-boot.js`, a classic script served by the app, applies the choice before the body is parsed, so the first
  paint is already in the chosen theme. There is no inline script, and the policy stays `script-src 'self'`.
- Without storage the page is light and the setting still works for the page. Printing is light and hides the
  control.

### 1.5 The model in the dark theme (contract E)

- The canvas ground and its grid follow the theme. In the dark theme the page re-colours the pictures' furniture
  (header, group frames, bands, edge labels and their halos, the key) and the edges. The edges are matched by the
  colour the notation draws them with and mapped to the scale step of the same role, under Dark and under System on
  a dark operating system.
- The notation's own fills, node boxes and node text keep their colours, so a picture means the same thing in both
  themes. An SVG exported in the dark theme is byte-identical to the light export.

### 1.6 One state and provenance language (contract F)

This is the part that strengthens the product's story. Its authority chain (rules and Sol propose, people confirm and
decide) is now drawn in one language on every screen:

- **Proposed is blue, no longer amber.** Round 8 drew a proposal in the same amber as "to confirm", so a suggestion
  waiting for a decision looked like a gap in the person's own work. 67 picture rules (the dashed proposal cards,
  routes, cells and labels in Chapters 3–10, their keys, the ghost changes) read `--state-proposed-*`, and none is
  left in amber.
- **The five states read the same everywhere.** Validate's counts, words and group chips; the Output register's
  status chips and row bars; the companion's severity chips; the review desk's verdicts, pills and monitor; the
  pictures' state markers and their key all read `--state-{fix,confirm,proposed,draft,pass}-*`. In total, 270 rules
  and 411 references. The desk's "bad" is the language's "to fix".
- **Sol keeps its violet.** Before the round, Sol's indigo (`#5b4d8f`) sat on the blue side of the converter's
  hue boundary, and the field spark's "Sol draft" band was amber, a third colour for the same origin. Now 97 Sol
  rules read `--prov-sol*`: the companion's Sol section, the desk's Sol reviews and badges, the journey draft's Sol
  tag and Sol row, the spark's Sol band, and "Sol would lean to…" advice. Nothing of Sol's is blue or amber. This is
  the deliberate departure from the mockup sheet recorded in DESIGN.md: AI disclosure outranks a single colour.
- **Provenance in the journey draft:** stated, inferred and open question read `--prov-*`. Inferred moved from blue
  to the neutral, so blue means one thing: proposed.

### 1.7 Proof (contract G)

- `style-tokens-validate.mjs` (`test:style-tokens`, new, static) makes seven checks:
  - the theme first and every sheet linked;
  - no colour literal in any declaration outside `theme.css`;
  - every `var()` defined (one retired rule is accounted for);
  - light and dark define the same scale tokens, with System and print wired;
  - 196 token pairs reach 4.5:1 in both themes;
  - fonts: Plex served by the app under the OFL and packed by both builds, and no font stack outside the tokens;
  - the state, provenance and Sol rules read their semantic tokens, with no proposal in amber and nothing of Sol's
    in blue or amber.
- `theme-browser-validate.mjs` (`test:theme`, new, browser) checks:
  - the setting on both pages, kept and applied before the first paint, answering the keyboard;
  - on a 390 px phone, three glyphs inside the top bar with the buttons keeping their names and targets of 24 px or
    more;
  - System on a dark and a light operating system, the picture's furniture included;
  - print light;
  - blocked storage;
  - on six representative screens in each theme (760 texts each), every text at 4.5:1 (3:1 when large), no large
    light surface in the dark theme, Georgia only in documents, Plex loaded from the app;
  - the canvas ground following the theme while a notation fill keeps its colour;
  - the dark-theme SVG export byte-identical to the light one.
- A wider probe (scratch, not a suite) read all 45 screens in both themes: the Projects page and Chapters 1–11 on
  Work, Model, Validate and Output. Light had no text under 4.5:1. Dark had no large light surface and one case of
  text under 4.5:1, Chapter 2's count chips (4.24:1), fixed in this round.
- The full regression: see §3.

## 2. What the conversion found, and what was fixed

The first conversion was checked against screenshots of the round-8 baseline and against the probe. Seven issues
showed. Each was fixed at its source, the colour ones in the migration scripts themselves, so the migration stays
one reproducible pass:

| Found | Fix |
|---|---|
| The register's red, amber and green row bars (inset shadows) became the shadow colour | a shadow layer with no blur is a line and keeps its hue; the gold highlight and focus rings came back with it |
| Sol's indigo sat on the blue side of the hue boundary | the blue–violet boundary moved from 255° to 245°; only Sol's family lies between |
| The desk's dark monitor strip drew dark text on its dark ground in light | dark islands: neutral solid ground, white or tinted light text |
| White text on step 9 fell short (to 2.6:1 on dark amber) | nine step-9 values deepened (§1.1) |
| `color:white`, two `rgb()` shadows and six bare `system-ui` stacks were missed | named colours, `rgb()` and bare family names handled; the suite now rejects any family that is not a token |
| A count chip in the journey context read faint text from its heading (4.24:1 in dark) | the chip's text is its own family's text step |
| On a phone the theme switch was pushed out of the chapters' top bar | glyphs with their words kept as names (§1.4) |

The first full regression (150 of 152) caught two more, both in the round's new code, and both were fixed rather
than worked around:

| Suite | Found | Fix |
|---|---|---|
| `test:xss-browser` | `theme.js` had its own HTML escaper | it imports the workbench's one escaper, `html-escape.js` |
| `test:bundle-browser` | the production page loaded `theme-boot.js` outside the bundle | the client bundle emits it as a content-hashed `/assets/theme-boot-<hash>.js`, cached as immutable like every other bundle file |

## 3. Verification

| Gate | Result |
|---|---|
| `npm run lint` | 0 new problems; 187, at the baseline |
| `npm run check` | syntax checks passed for 489 modules |
| `node client-bundle.mjs` | passed; one stylesheet from 44; CSS 665,627 B raw, 106,795 B gzipped (112,067 B before the round); budget 685 KB |
| `node build.mjs` | passed; packaged imports and byte-for-byte asset serving verified, fonts included |
| `test:style-tokens` | 7 checks passed |
| `test:theme` | 7 checks passed |
| Full regression (`release-checks.mjs`, 152 suites) | **152 of 152** on the final tree (run 5, `evidence/regression-run5.json`); the history is below |
| Walkthrough, light and dark | the same 49 steps in each theme, from a brief and a model to the SDD preview; 0 page errors and 0 failed API calls in each; the records drafted per chapter identical; the exported SDD the same 1,053,651 bytes in both; compared side by side |

Both walkthroughs ran on the round's tree before the last two fixes the regression asked for: the shared escaper in
the theme module, and the content-hashed boot script, which only the production bundle uses. Neither changes what a
page shows. The theme suite and the full regression ran after both.

### 3.1 The regression runs, in order

All runs were at concurrency 3 on a 4-core container with no API key.

1. **150 of 152.** Two real failures in the round's new code, fixed (§2): the theme module's own escaper, and the
   boot script loaded outside the bundle.
2. **149 of 152, on the final tree.** This run shared the machine with the dark walkthrough (load about 4 on 4
   cores). Three timing-bound suites failed: `test:scale` (a 300 ms bound met in 319 ms), `test:scale-browser` (the
   off-stage culling not yet applied when read) and `test:responsibility-browser` (a 30 s click wait). Each passed
   when run alone on the same tree, and each passed in runs 1 and 3.
3. **151 of 152, on an idle machine.** `test:utility-browser` read the companion 250 ms after a click that followed
   a closing dialog, before the selection had rendered. It passed in runs 1 and 2, and 5 of 5 alone on this tree and
   5 of 5 on the round-8 baseline, so the race predates the round. The test now waits for the selection to reach
   the companion (up to 5 s) instead of a fixed 250 ms. Its assertion is unchanged.
4. **151 of 152, on an idle machine.** `test:scale-browser` read the 300-responsibility Chapter 4 model and found
   none of its 615 picture elements hidden off the stage. The same read had failed in run 2. A probe on both trees
   showed one draw and the culling settled at 263 of 615 within the first sample after it. On round 9 the fonts
   load about 800 ms before that draw, so they are not involved. The test had read in the frame between a draw and
   its cull. It now waits up to 3 s for the culling to settle before reading, and does the same after the camera
   moves. Its assertions are unchanged, and it passed 3 of 3 alone.
5. **152 of 152, on an idle machine, on the final tree.** `test:theme` took 50 s and `test:style-tokens` 0.3 s;
   the longest suite took 213 s.

## 4. Not changed, and open

- **Not changed:** routes, controls, records, governance and the authority chain; the security headers; the notation
  palette and every export; the round-8 layout.
- **Seen and left as they were in round 8:** these are present in the baseline screenshots and are not caused by
  the style.
  - The Details panel's "Back" button draws its icon over the word.
  - At 1440 px the Details heading on Output wraps ("Details · LR-001").
  - About 100 rules set 10 px text. Almost all are micro-labels inside the pictures of Chapters 3–10; three are
    interface labels (`.v5`, the lens options' heading, the Projects brand's superscript). The 12 px rule covers the
    chrome, and the probe found every such label in view at 4.5:1 or better.
  - `--q-color` is named by a dead rule for Chapter 2's retired driver strip (`test:style-tokens` accounts for it).
- **Evidence:** `evidence/regression-run5.json` (every suite's status and time) and
  `evidence/light-dark-walkthrough.json` (the two walkthroughs compared). The side-by-side screens are in the round's
  package.
- **External authorities:** nothing in this round needs licence counsel. IBM Plex is distributed under the SIL Open
  Font License 1.1, whose text ships beside the fonts. No independent reviewer, four-eyes approver, KMS authority or
  production acceptance authority was involved or impersonated. `productionAccepted` stays false.

## 5. Commits

- `e145784` feat(style): the approved style, refined paper with a night theme, in one token system
- `859f101` test(browser): wait for the companion and for the culling to settle instead of a fixed pause
- this report, its evidence and the release field `AIW v0.10.0-rc.10.73.14` (candidate)

Nothing was pushed. `productionAccepted` stays false.
