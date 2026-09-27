# The Chapter 4–8 model views — release report (v20.5)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source **v20.5**, on v20.4 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-model-views-4-8`, from `6ba454b` (v20.4) |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` is `false`. |

## In short

The sponsor asked for the model views of Chapters 4 to 8 to be analysed and fixed. The analysis found 31 gaps (`AIW-V5-Local-Source/MODEL-VIEWS-CHAPTERS-4-8-GAPS.md`), with rendered evidence from both source lines. 30 are closed and one (10) partly: 27 closed and 1 partly in this repository's line, in the commits listed under Verification; 3 belong to the private site's own modules and are handed over as `site-line.patch`, verified on this session's extract of the site's zip.

What the architect now has, on every one of the five models:

- **Room.** One title row; a lens row only when it has something to say; the Key and zoom controls in the footer beside the walk, never over the canvas or the label rail; a status line that wraps instead of cutting. The companion is a column on a wide window and a drawer over the canvas below 1200 px, where it starts closed; its toggle says *Hide the companion panel* or *Show the companion panel · N observations*. The stage's edges say where more of the model lies and move there.
- **Loading.** A placeholder in the model's frame while its modules load. Static files revalidated with an ETag (304 when unchanged) instead of re-sent on every navigation. The load time itself is not shorter on loopback: measured, and said so (gap 10).
- **Honesty.** A product is named only where Chapter 7 chose it; open candidates say so. A blank project's Chapters 5, 6 and 7 say what is missing and offer the next action; no observation is invented. When Sol is not connected, its round says so and stands last.
- **Defects.** *Propose a realisation* targets the capability it was asked for. Walk progress belongs to one project. A Chapter 7 family opens from its heading; the stack has no duplicate column; the options share the width. Every lane, bundle and proposal card selects and reads. Every selection, however made, reaches the address and Sol.
- **One vocabulary.** Every key explains every mark its model draws, and each chapter's key styles are scoped to that chapter.
- **Keyboard and phones.** Every selectable chip is a button. A card is a group whose label says what Enter does; a redraw keeps the keyboard's place. The phone fit keeps the cards' lens lines.

## The 31 gaps, and where each is closed

| # | Gap | Closed by | Checked by |
|---|---|---|---|
| 1 | The chapter models hidden behind the *Architecture diagram* family (site line) | `site-line.patch`: `model-location.js` opens the Model tab on the chapter's own model, keeping the family the reader last chose | The site-line probe on the extract: Chapters 5 and 7 open on their models |
| 2 | Chapters 5 and 7 open on another chapter's diagram; a carried selection changes the scene (site line) | `site-line.patch`: `architecture-diagram.js` labels a borrowed scene *(a Chapter 4 scene)* and never moves the reader to another chapter for a selection carried in the address | The probe: the heading is labelled; `?chapter=4&object=gateway` stays on Chapter 4 |
| 3 | Three families, three vocabularies (site line) | With 1, the chapter model is the default and the diagram a deliberate choice; the diagram's own toolbar is the site's | — |
| 4 | The canvas gets 427–439 px of 900 | `.cm-top` one line (44 px), `.cm-bar` hidden when empty, the walk and tools share one footer; the companion narrows at 1500 px and becomes a drawer at 1200 px | `model-views-browser` §3: stage ≥ 520 px, title row ≤ 56 px |
| 5 | Card text drawn at 0.7 scale | The room above; the fit floor unchanged so the overview stays whole; the edges (§7) show what lies beyond | §3, §7 |
| 6 | Key and zoom float over content | `toolsHTML` in the footer; the key opens as a popover above it | §3: none inside `.cm-stage`; §4: the key opens above the footer, inside the window |
| 7 | The status line truncates | `.cm-state` in the footer, two lines at most; announced only on change (`setState`) | §3: not clipped |
| 8 | Labels truncate where the content matters | Option titles two lines; obligation cells 11 px; Chapter 8 movements narrower than 110 px carry the reference only, the name in the title and companion; the status wraps | §11 |
| 9 | Chapter 7 wastes its width | Options columns share the stage (`optionsLayout(G, {viewW})`, 196–380 px); the *realises* column dropped, the rail says *REF · realises TC-…*; family headings are buttons | `model-views` §3, `model-views-browser` §9, `stack` and `stack-browser` |
| 10 | Seconds of blank canvas; `no-store`; a 29-deep import chain | **Partly.** The loading placeholder closes the blank. ETag + `no-cache` replaces `no-store` (neutral on loopback; a saving on a network). Preloading the closure was built, measured slower on loopback (`LOAD_TIMINGS.json`: the explorer-to-model switch ~1 s against ~0.45 s) and removed. The seconds themselves are the page's own boot and compile of 5.6 MB of unbundled modules; a bundle is the lever and is not part of this release | §1, §2; `LOAD_TIMINGS.json` |
| 11 | Chapter 5 shows products nobody chose | `productLabels` names only the selected option; `productCandidates` counts the open ones; the strip says *N candidate products in Chapter 7, none chosen* | `model-views` §2, `realise-browser` §1 (rewritten) |
| 12 | No empty state in Chapters 5, 6, 7 | `emptyCard` in each: *No component yet*, *No platform yet*, *No realisation yet*, with the next action; honest status lines | §14 |
| 13 | Sol's round takes the top when Sol is not connected | A lite round that says so, ordered last in the companion | §6 |
| 14 | *No score is calculated* above a weighed row | The sentence now says the weighing beneath the criteria (Σ priority × effect) is a lean, never a choice | — (wording) |
| 15 | *Propose a realisation* targets the wrong capability | `technologyRealisationProposal(p, 'missing', id)` targets the given open capability; the ghost carries the id | `model-views` §1 |
| 16 | Chapter 7's family scope unreachable | `.sk-mg` is a button with pointer events; the click handler no longer swallows it | §9 |
| 17 | Walk progress leaks between projects | `visited` keyed by project and scenario | (by construction; no rendered check) |
| 18 | Dead-end selections | Chapter 6 `MISSING:` rows read as the needs without support; Chapter 5's *Not placed in a module* and column lanes, and the bundled flow label in Chapter 4, select and read | `platform`, §5 |
| 19 | The unplaced lane labelled *Outside the system* | *Not placed in a module*, with its own note | — |
| 20 | The companion toggle named the same in both states | `panelToggle`: *Hide* / *Show · N observations*, with a badge | §3, §12 |
| 21 | A failed model leaves the previous drawing | `showFailure` clears the canvas, heads, rail, walk, companion and key | (model paths; no rendered check) |
| 22 | Selections that bypass `select()` | Each view announces once as it renders when the selection changed (`announced`, `announceObject`) | §5: a page-made selection is in the address |
| 23 | Different words for the grouping control | The control is shown by one rule (only when there is something to fold) in Chapters 4 and 5, as in 6 and 8 | — |
| 24 | Lenses mean different things | Out of scope for v20.5 (a Reasoning lens for 6 and 8 is design work); recorded in the plan | — |
| 25 | Walks differ | Out of scope except Escape, which now steps back one level in 4, 5 and 8 as before; Chapter 8's step button is always at hand | `exchange-browser` |
| 26 | Legends incomplete and leaking | Every key completed; `.k-*` rules scoped per chapter (`.lr`, `.rz`, `.pf`, `.sk`, `.tm`) | §4, §8, §10, §11 |
| 27 | Chapter 5's proposal card inert | The proposal card selects and reads (`specimenProposal`) with *Review & edit* and *Dismiss* | `realise-browser` §6 (the card is drawn; selection by construction) |
| 28 | 34 of 47 selectable things are `<i>` chips | Every chip is a `button.cm-chip`; Enter selects; Enter on the selected card opens it; a redraw keeps the focus | §5, §8 |
| 29 | Icon-only buttons without a name; `.cm-state` re-announced | The toolbar's icon buttons carry `aria-label`s, and the labels that fold to icons on narrow windows stay as visually hidden text; `setState` writes only on change | §3, §12 |
| 30 | On a phone the lens content is hidden from the first fit | `cm-far` begins below 0.58, under the phone floor of 0.6 | §13 |
| 31 | No rendered test for keyboard, `object=`, a blank project, legends, phones | `model-views-validate.mjs` (3 checks) and `model-views-browser-validate.mjs` (15 checks) | — |

Items 24 and 25 name design work that a fix could not settle honestly (which lens vocabulary should be one, whether Chapter 7 should walk); they are recorded, not claimed.

## Verification

The branch, from the v20.4 baseline `e4162e6`:

| Commit | What |
|---|---|
| `e04ba46` | feat(models): one shell — tools and status in the footer, edges, companion drawer, chips as buttons |
| `c786252` | feat(models): Chapters 4–8 on the shared shell — complete keys, keyboard chips, honest empty states, no dead-end selections |
| `9899660` | fix(technology): a proposal for a missing realisation targets the capability it was asked for |
| `6436129` | perf(models): a loading placeholder, ETag revalidation and import-closure preloading |
| `ad24152` | docs: v20.5 |
| `cfc7601` | evidence: the site line's patch |
| `951edae` | test(models): model checks and a rendered suite for the shared behaviour |
| `337a333` | fix(models): keep the untouched chapters' placements, drop the preload the measurements refused, wait for the model in two suites |

- **Builds and checks.** `node check-syntax.mjs` (341 modules) and `node build.mjs` pass on the working tree.
- **Focused suites.** The five chapter model suites (`test:responsibility`, `test:realise`, `test:platform`, `test:stack`, `test:exchange`), `test:technology-realisation`, the new `test:model-views` (3 checks), and the six rendered suites (`…-browser`, with `test:model-views-browser`, 15 checks) pass on the final code.
- **Full regression.** `node release-checks.mjs` on `337a333`: **92 of 92 suites passed**, 19 of them rendered in headless Chromium (Playwright 1.56.0, `AIW_REGRESSION_CONCURRENCY=2`, `AIW_REGRESSION_TIMEOUT_MS=1500000`), 2026-09-27T19:13:07Z → 2026-09-27T19:29:53Z. The run before it, on `951edae`, failed three rendered suites; the fix commit answers each (its message says how), and the run was repeated in full. `REGRESSION_RESULTS.json` is the final run. Slowest: test:model-views-browser 135 s, test:chapter-sol-browser 125 s, test:sol-coverage-browser 107 s.
- **Load timings.** `LOAD_TIMINGS.json`: baseline, revalidation only, preload only, both. Revalidation is neutral on loopback; preloading is slower; neither shortens the 2–3 s a warm navigation takes, which is the page's own boot and compile. The preload was removed before the final regression.
- **Package.** `AIW-V5-Local-Source-v20.5.zip`, built with `git archive` from `337a333`: 3,380,876 bytes, 506 files, SHA-256 `387e3447f74e2cd897401f96f7dffcd975b773548b2838b509b5aefd762abe64`, reproducible byte for byte; every file byte-identical with the commit's blobs; no forbidden path, no secret, no personal data; the suites listed in `PACKAGE_SHA256.json` pass from a clean extract without `node_modules`, then `npm ci --offline` installs the lockfile's tools. Delta from v20.4: 3 files added, 24 changed, 0 removed, 479 unchanged.
- **Secret scan.** The branch diff `e4162e6..HEAD`: every rule 0 (API keys, tokens, private keys, JWKs, bearer literals, credential assignments, e-mail, user paths).
- **Site line.** `site-line.patch` applied to this session's extract of the site's zip and probed (`SITE_LINE_PROBE.json`): Chapters 5 and 7 open on their models; a borrowed scene is labelled; a carried selection stays on its chapter.
- **`TEST_EVIDENCE.json`** gathers the above, machine-readable, with `productionAccepted: false`.

## Unresolved

- The site line's two fixes are a patch, verified on this session's extract of `AIW-V5-Full-Source-2026-09-27.zip`, not on the site. The site's owner applies it with `git apply -p1 release-evidence/model-views-4-8/site-line.patch` and takes the shared files from this branch.
- Gaps 24 and 25 (lens vocabulary across chapters; a Chapter 7 walk) are design questions left to the sponsor.
- Chapters 1–3 and 9–11 are not on the new shell: their status line stays in the lens bar and their key and zoom in the stage, placed as before (scoped rules in `exchange.css`). Moving them is the same work again, chapter by chapter.
- No external authority has reviewed this release: no independent architecture review, no licence counsel, no production acceptance. `productionAccepted` is `false`.
- The branch is not pushed; pushing needs the sponsor's word.
