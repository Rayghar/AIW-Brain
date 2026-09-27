# Chapter 4–8 model views — implementation plan (v20.5)

| | |
|---|---|
| Controlling baseline | AIW v0.10.0-rc.10.73.6 |
| Product package | AIW V5 Local Source v20.5, on v20.4 |
| Branch | `release/aiw-v0.10.0-rc.10.73.6-model-views-4-8`, from `6ba454b` |
| Date | 27 September 2026 |
| Production acceptance | Not claimed. `productionAccepted` stays `false`. |

## What the sponsor asked

"Fix up the model views for Chapters 4, 5, 6, 7 and 8": analyse the gaps, then fix all of them. The analysis is `AIW-V5-Local-Source/MODEL-VIEWS-CHAPTERS-4-8-GAPS.md` (31 items, with evidence from rendered walks of the site line and of v20.4, and a code inventory).

## Two source lines

The private site runs its own line (its commit `664b974`, supplied as `AIW-V5-Full-Source-2026-09-27.zip`). The five views and the shared `cm-*` layer are byte-identical in both lines, so items 1–6 and 8 below are made here and handed to the site as a diff. Item 7 changes files only the site has (`model-location.js`, `architecture-diagram.js`); those are delivered as a separate patch against the zip's files, in this folder.

## Order of work, one commit each

1. **Room and legibility** (gaps 4–9): the controls in one compact row; the companion as a drawer below 1500 px; the key and zoom controls out of the canvas; a status line that never truncates; Chapter 7's rail and columns rebalanced; labels that wrap instead of cutting.
2. **Loading** (10): `ETag` with revalidation instead of `no-store`; `modulepreload` for the entry closure; a loading state in the stage until the chapter model mounts.
3. **Honesty** (11–14): only chosen products on a component's foot; empty states in Chapters 5, 6 and 7 with the next action; Sol's round demoted when Sol is not connected; the Options scoring sentence corrected.
4. **Defects** (15–22): the proposal's target capability; the family scope; walk progress per project; the dead-end selections; the unplaced lane's label; the companion toggle's name; a failed model clears the stage; selections that bypass `select()`.
5. **One vocabulary and complete legends** (23–27): the grouping control shown by one rule; Escape steps back one level everywhere; every key lists every mark it draws; legend styles scoped per chapter; a proposal card that can be selected in Chapter 5.
6. **Keyboard and phones** (28–30): chips as buttons; names on icon-only buttons; live status announced only on change; lens lines kept at the phone's first fit; Enter opens, Escape steps back.
7. **Landing** (1–3, site line): the Model tab opens on the chapter model unless the reader chose otherwise; a chapter without a diagram scene says whose scene is shown; a carried selection does not change the scene away from the chapter's own.
8. **Tests** (31): model and rendered checks for each item above.

## Verification

- The existing suites for the five chapters (`test:responsibility`, `test:realise`, `test:platform`, `test:stack`, `test:exchange` and their browser counterparts), updated where behaviour changed.
- A new rendered suite for the shared behaviour (keyboard, `object=`, a blank project, the failed-model path, legends, the phone fit).
- The full regression with the browser suites, the package with SHA-256 and a clean extract, and a secret scan of the diff.

## Not in scope

New lenses (Reasoning in Chapters 6 and 8), a walk for Chapter 7, and the shell outside the model views (the app header, the chapter tabs), except the loading state.
