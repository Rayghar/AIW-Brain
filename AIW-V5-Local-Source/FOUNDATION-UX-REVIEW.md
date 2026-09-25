# AIW V5 Chapters 1–3 UI/UX review

14 September 2026. Follow-up to the shared interaction refinement, prompted by excessive scrolling in the opening chapters.

## Findings and changes

The problem was structural: the chapter rail included a long readiness checklist, full registers rendered every record, inspectors extended the page, and comparison/review tasks accumulated on the same surface.

| Area | Implemented refinement |
| --- | --- |
| Orientation | Screen-height workspace with persistent location, chapter tabs, next action, progress, and selected-context control. Milestones open from the progress indicator. The chapter rail has its own scroll region. |
| Registers and findings | Five records per page on desktop, three on mobile; counts and Previous/Next controls. Search/filter changes reset or clamp pagination. Long requirement wording remains in the selected context. |
| Selected context | A closable bottom panel, grouped into Overview, Definition, Connections, and Guidance where content exists. Definitions and links are retained, with independent content scrolling. |
| Quality drivers | Separate Inputs, Scenarios, Priority, Compare, and Conflicts tasks. Comparison switches among scenario, measurement, and rationale/traceability. Mobile comparisons show both drivers without horizontal table scrolling. |
| Decisions | Alternatives and quality evidence are separate views. One linked criterion is compared at a time. Benefits, assumptions, governance, revision history, and conflicts use labelled disclosures. |
| Live model | Full available width. More compact desktop tools; collapsible mobile layers/tracing. Decision preview actions open separately on mobile. The underlying model and preview/application distinction remain intact. |
| Output | Export and handoff controls precede expandable, paged registers. |

The forest-green, paper, and muted-gold styling, separate Sol/Mind Factory/Cursor roles, stable references, project commands, authentication, and storage behavior are preserved. Below 520px viewport height, natural page scrolling remains available for landscape and zoomed layouts rather than trapping content in an unusably short panel.

## Live browser review

The preview connection initially failed, then recovered. The completed walkthrough used the supervised desktop preview at 1363 × 936 and the live 390 × 844 mobile frame. Work, Model, Validate, and Output were opened in all three chapters on both sizes. Screenshots were inspected at the main changed surfaces, including requirement registers and definitions, quality priority/comparison/model/output, and decision alternatives, evidence, impact map, and mobile review.

Targeted interactions checked:

- Requirement register paging in both directions; mobile search and keyboard clearing; selection into Definition and Connections; closing the context panel.
- Requirements model opening, journey tracing, mobile layer toggling, and reopening/collapsing model controls.
- Quality priority, comparison, and conflicts navigation; comparison-aspect switching; desktop/mobile model, findings, and output access.
- Decision alternative/evidence switching and criterion selection; changed alternative preview on the live map; mobile preview-action disclosure and governance disclosure.
- Decision editor entry, unsaved input protection, Keep editing retaining the draft, and explicit Discard changes. No review draft was saved.
- Chapter navigation, readiness disclosure, and Chapter 3 Output-aware Sol actions.

Sample document-bound measurements matched their viewport dimensions: desktop Requirements Work/Model/Output and Quality Model/Validate/Output, and mobile Requirements Work/Validate/Output and Quality Compare/Model/Validate/Output. These checks establish that the page itself does not grow with the register in those sampled states. Long content and large models still scroll within the active region; this release does not claim that every individual task fits without scrolling.

The browser review caught and corrected inherited cross-axis alignment that left registers too narrow, inherited table-cell widths that squeezed mobile comparison text, and decision-preview controls that crowded out the mobile canvas.

## Automated checks and scope

- `npm run check` — source syntax.
- `npm test` — shared state interactions and 1,536 desktop/mobile layer layouts.
- `npm run test:requirements` — identities, validation, confirmation, durable create/edit/reopen, isolation, concurrency, handoff, and export content.
- `npm run test:quality` — scenarios, measurements, prioritisation, conflict/source invalidation, stable references, durable persistence, isolation, concurrency, and exports.
- `npm run test:decisions` — comparison evidence, state/governance distinctions, reviewed impacts, traceability, revisions, persistence, isolation, concurrency, and exports.

An earlier offline DOM component check covered 24 chapter/tab renderings and the initial pagination/disclosure implementation. Its temporary harness was no longer available after the preview recovery; the final visual refinements were checked in the live browser instead.

This pass concentrates on layout, navigation, disclosure, and comparison. It does not repeat every editor/save/export workflow from the earlier chapter releases. Browser download completion remains as documented in the preceding report; API export content and headers pass. Guidance is still rule-based, and model animation is illustrative. No model schema, banking targets, governance outcomes, or production project records were changed by this review. The deployment remains owner-private.
