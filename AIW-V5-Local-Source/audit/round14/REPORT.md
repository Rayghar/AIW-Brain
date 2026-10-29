# Round 14 · Functionality and usability remediation

This report covers the local source candidate derived from the supplied Round 13 ZIP. It records implemented changes and checks, not a hosted release. `productionAccepted` remains false.

## Findings addressed

| Area | Finding and remediation | Evidence |
| --- | --- | --- |
| Shell navigation | Moving between chapters, tabs and in-app links could leave keyboard focus behind or make the mobile coach intercept the intended click. Route changes now place focus on the destination heading or tab; the coach dismisses after the destination click. The view rail brings the pressed view into sight on a phone. | `public/app.js`, `public/workspace-ux.js`, `public/instrument-tray.js`, `public/perspective-view.js`, `shell-focus-browser-validate.mjs` |
| Small-screen workspace | A floating guide and a separately scrolling studio compressed the useful area on short phones. The guide joins the page flow and the chapter scrolls as one surface. The notation toolbar keeps scene, environment, Find and camera visible while secondary tools open on demand. | `public/workspace-ux.css`, `public/notation-view.js`, `public/notation.css` |
| Validate | Readers needed the existing chapter SDD readiness checks and a distinct way to inspect model structure. Validate now switches between **SDD readiness** and **Model integrity**. The latter reports duplicate identities, missing relationship endpoints, invalid recorded relationship types and chapter model prompts. Its copy says explicitly that prompts and a clear structural result do not approve the architecture or its diagram. | `public/validate-view.js`, `public/validate.css`, `validate-browser-validate.mjs` |
| Guided drafting and review | Unfinished chapter answers and skipped records disappeared on reload; rerenders could drop focus; replacing a reviewed preview could discard review progress unexpectedly. Answers now persist within the browser tab against the draft stamp, focus returns to the active control, and replacing a reviewed preview asks for an explicit choice. The 20-record proposal review pages and final apply gate remain in force. | `public/journey-draft-ui.js`, `public/journey-draft.css`, `journey-draft-browser-validate.mjs`, `architecture-model-browser-validate.mjs` |
| Chapter 11 output | The SDD content report was difficult to navigate when it contained many findings. Its findings are now searchable, rendered in bounded section pages, and link to source records in Work. The report dialog opens at its title. Chapter 11 Output no longer repeats a generic documents stage before its readiness and working SDD. | `public/review-ui.js`, `public/review.css`, `public/validate-view.js`, `validate-browser-validate.mjs` |
| Model interaction | Selected Story and Tradeoff cards now have clearer keyboard semantics and selection instructions. View spacing and control layout were refined alongside the functional changes. | `public/story-view.js`, `public/tradeoff-view.js`, their browser suites, `public/workspace-ux.css` |

## Verification in this candidate

| Check | Result |
| --- | --- |
| Syntax and release build | Syntax passed across 600 modules. Release build passed with the chapter-route limit set to 2,660 KiB: 2,723,129 bytes, 711 bytes below the bound. This is narrow headroom, not a performance acceptance. |
| Browser behavior | Model views 26/26; Validate 17; Story 11; Tradeoff 10; guided journey 15; architecture model draft/review 7/6; whole-workspace shell 27/27 across all eleven chapters and four tabs, with no page errors. The journey run checked report search and bounded reveal after a 1,400-requirement import, with no page or API errors. Shell focus, 390 px and 320 px coach behavior, UI proportions and review/style checks passed in the reported local runs. |
| `npm test`, `test:sdd-content`, lint | The shell state suite passes after its VM fixture loaded the shared chapter names and timer; SDD diagnostic reports 8/31 substantive records. Lint checks 602 files, with 183 existing problems against a baseline of 184 and no new issues. |
| Chapter 5 strict layout timing | **Open.** A measured run took 1,330 ms against the 900 ms gate, with about 2.6 million A* expansions. The previous round also had repeated failures despite one 852 ms diagnostic run. No timing acceptance is claimed. |
| Source integrity | The manifest verifies all 854 source files. The packaged ZIP was checked entry by entry against their SHA-256 hashes. |

## Remaining product and release gaps

1. **Diagram latency:** reduce Chapter 5 route work and rerun the unchanged 900 ms gate on representative hardware. The passing build size does not resolve this runtime failure.
2. **SDD substance:** the rich synthetic SDD still has only **8 of 31** records meeting the prose standard. Sections 2 and 3 remain skeletons where descriptions, impacts, alternatives and justifications are absent. Search and source links make those omissions actionable; they do not supply missing client facts.
3. **Architecture quality:** no real architecture provider and client-specific project were evaluated by an architect in this round. Structural checks, grounded proposals and browser flows cannot establish that recommended decisions are sound or that the Architecture Brain fulfils the product promise.
4. **Operations and publication:** hosted Worker execution, unattended continuation, private-site deployment and a live multiuser acceptance run remain unverified. Browser-driven job continuation still needs an open session; an unattended queue requires its own design and trial.

This is a more usable, locally verified source candidate. It is not a production acceptance or evidence of a private-site deployment.
