# AIW V5 shared interaction refinement

14 September 2026. Bank Payment Journey prototype; private owner-only deployment.

## Changes

- Chapters 1–5 now use a broad Model canvas and a bottom context panel, consistent with the later studios. A compact selection bar explains the current object without scrolling away from the canvas. Open details and return-to-model controls make navigation deliberate.
- Chapters 4–11 expose all eight layer toggles beside the canvas. Toggling changes the same connected model. Responsive placement avoids overlapping cards and keeps logical group boundaries within the canvas.
- Sol, Mind Factory, and Cursor remain separate and chapter/tab-aware. Their desktop controls explain their roles as Act, Explore, and Explain. Cursor preference persists between chapters. Tooltips stop competing with active dialogs.
- New or edited ghosts reveal their review controls. Opening a contract, security, or runtime walkthrough reveals its controls. Ordinary selection and playback do not repeatedly reposition the page.
- Requirements and application walkthroughs, plus interface/security/runtime labs, retain transport controls as result content changes. Play/pause keyboard focus survives playback; exhausted or stale lab steps disable correctly.
- Mobile chapter navigation closes after selection. Toolbars wrap; the selected-object panel, model layers, and save status remain accessible. Progress uses the actual chapter milestone count.
- Save feedback follows pending, successful, and failed requests. Failed requests preserve the last successful project document and the chapter editor's existing input-protection behavior.

## Browser coverage

All 44 chapter/tab combinations were opened and checked on desktop, and all 44 in the live 390px mobile frame. Every surface retained its chapter/tab location and separate Sol/Mind Factory access. Model surfaces retained selected-object context and the shared project. Screenshots were inspected during the responsive walkthrough.

| Area | Direct checks in this pass |
| --- | --- |
| Requirements, Quality Drivers, Decisions | All four desktop/mobile surfaces; broad canvas and bottom context; selected-object navigation; keyboard selection; responsive requirements creation toolbar. Earlier functional chapter checks remain documented in README. |
| Logical / Physical Application | All surfaces; nearby layer switching; relationship selection; explicit Open details; mobile navigation closure; layout and walkthrough regressions. |
| Logical Technology | All surfaces; inherited support context; mobile visibility of actual save status. Earlier capability-creation and failure-simulation checks remain documented in README. |
| Technology Realization | Desktop edit, Keep editing protection, save/reopen and restoration; transparent option comparison; unsaved impact preview and dismissal. Mobile creation of a local TR record, reopen, edit/discard protection, and preserved stable identity. |
| Interfaces & Data | All surfaces; four-stage repeated-delivery sample, stable playback controls and design-review recording. Data-lifecycle ghost edited, previewed, explicitly accepted, and reopened. Its numerical/policy assumptions remained unresolved. |
| Security | All surfaces; planned and unavailable-control walkthroughs; enforcement and degraded-response stages; stable playback focus; mobile contextual Sol validation. |
| Deployment / Runtime | All surfaces; a clearly labelled zone-loss scenario with an assumed duration; affected plans and quality/recovery limits; desktop autoplay focus and disabled final Step; mobile restart/play/pause/step with incomplete review still disabled. |
| Review & Realize | All surfaces; existing frozen SDD visible after reopening; upstream changes shown as an earlier-design baseline; absent governance evidence stayed explicit. Baseline creation and printable preview were directly checked in the preceding Chapter 11 release. |

The browser checks used local preview records, including an illustrative technology draft and synthetic scenario reviews. These records are excluded from deployment and do not alter the hosted project or constitute architecture approval, bank evidence, or real failure exercises.

## Automated and build validation

The final syntax check, production build, and all 13 release suites passed: shared model, requirements, quality, decisions, logical application, application realization, logical technology, technology realization, interfaces/data, security, runtime, final review, and workspace save behavior. The shared layout suite covers 1,536 visibility/viewport combinations; logical checks additionally cover 1,024 grouped combinations and group-boundary containment.

Domain/API checks cover stable identities, source and handoff currency, reviewed proposal non-mutation and acceptance, owner isolation, authenticated persistence, revision conflicts, export content, immutable baselines, and preservation after storage failure. A compiled-Worker smoke check confirmed anonymous rejection, authenticated project loading, and complete Markdown/JSON/HTML SDD responses with the expected content types.

## Limits retained explicitly

- Contextual guidance and simulations are rule-based. No external LLM, bank, provider, control implementation, or operational exercise is connected.
- A passed tab walkthrough is not a claim that every possible editor or architecture combination was manually exercised. The table distinguishes this pass from earlier chapter checks and automated coverage.
- Export response content and attachment/inline headers pass. The managed browser download monitor did not report completed files during the preceding bounded download checks, so browser download completion remains unconfirmed.
- The mobile browser's field-attribute getter intermittently timed out; screenshots and successful reopen/discard interactions verified the affected technology form values. These tooling failures were not treated as passing assertions.
- The private access policy remains owner-only. This refinement does not broaden sharing.
