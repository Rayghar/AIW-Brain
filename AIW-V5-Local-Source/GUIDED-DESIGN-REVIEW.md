# Guided application and technology design

Sol in Chapters 4–7 now starts from a saved requirement. It keeps partial answers and offers exact existing definitions for explicit reuse. Mind Factory compares a cohesive application boundary with a distinct coordination boundary. The selected approach returns to the established model alternative and impact review.

## Experience

- One native assistant dialog, one reading region, and one question group at a time. Chapter actions remain available through the return control.
- Source requirement, confirmation posture, acceptance, quality drivers, decisions and constraints are available on demand.
- The architect supplies boundary/exclusions, information authority, interaction semantics, owner, support category, trust policy and operating obligations. Missing evidence and unknowns stay visible.
- Exact saved values can fill unanswered fields on request. A unique recorded responsibility/application/capability/plan chain is offered for reuse. Other reuse choices remain explicit.
- Reusing a definition preserves its saved attributes; only missing source or allocation links are added. New records are editable and unconfirmed. An existing capability keeps its trust boundary.
- Both approaches use existing saved alternatives. Comparison, revision history, acceptance and Changes remain in the established workbench.
- The existing graph displays new and reused proposal objects as ghosts. Record edits return to the same Sol task. The acceptance review applies the complete design in one project write, with reviewer and rationale.
- Accepted records expose their task and source reasoning in the object context and Cursor. The SDD retains answers, alternatives, citations, acceptance and change references. Frozen SDD snapshots remain immutable.

## Scope and methodology

This increment uses the supplied `AIW_V5_FPA_MSA_COAUTHORING_QUESTION_CATALOG_V2.json`, particularly CMP-01/02/04, CMP-06/07/08/09/11/13/14. The SA Playbook/FPA-MSA question grammar guides the task. Agency Banking and the worked portal example are not injected as answers into unrelated projects.

This is bounded, deterministic drafting. It covers one primary responsibility, an optional separate coordinator, application allocation, one supporting capability, trust and an operating plan. It does not claim autonomous architecture, evidence verification, vendor selection, numeric performance/recovery targets or governance approval. Further interfaces, security and runtime obligations remain in their chapters and findings.

## Persistence and acceptance

`coauthoring.designTasks` retains stable DES IDs beside foundation source tasks. Design candidates use `modelAlternatives.records` with `kind: design`; there is no second alternatives store. Both documents use private owner/project-scoped object storage and compact references in the project row. Design-only tasks persist even when the project has no registered evidence excerpt.

Source changes block a fresh proposal until an explicit source review. Revised answers/source bases retain earlier proposals as history. Acceptance closes sibling drafts as unselected, preserves their reasoning, records each changed definition/link and prevents repeated application of the task. Already connected designs can record explicit reuse without duplicating records or changes.

The Worker checks the project revision, task/alternative revision, source basis and preview stamp. Failed storage leaves the working model and task unchanged. A conflict retains browser input. Reloading a separately changed task blocks overwriting its newer answers and requires opening the saved task; leaving the local input requires the discard decision.

The planner explicitly registers its new application components before technology normalization so the older reference-need seeding path cannot assign a banking trust boundary or extra support assumptions. It adds only the architect's chosen need. Existing unrelated needs retain their definition and confirmation state.

## Verification

| Check | Result |
| --- | --- |
| Bank Payment reference, cohesive reuse and separate coordination | Pass |
| Blank equipment-reservation project, both new-object topologies | Pass |
| Valid graph endpoints and allocations; no banking answers in blank proposals | Pass |
| New definitions, targets and implementation options remain unconfirmed/unselected | Pass |
| Partial task save, reload and next missing question | Pass |
| Existing and new ghost editing through Sol and common impact review | Pass |
| Explicit reviewer/rationale, acceptance, retained alternatives and change history | Pass |
| Source revision review and immutable SDD baseline | Pass |
| Owner isolation, optimistic conflicts, private object storage and failed-write recovery | Pass |
| Actual entry point/editor/store/Worker DOM integration in Chapters 4–7 | Pass |
| Existing model alternatives, model impact, evidence, Changes and final review regressions | Pass |
| Desktop/mobile pixel inspection | Incomplete: cloud browser tab discovery timed out before a page could be opened |

Primary checks: `design-task-validate.mjs`, `design-task-ui-validate.mjs`, `model-alternatives-validate.mjs`, `model-alternatives-ui-validate.mjs`, `model-impact-validate.mjs`, `evidence-validate.mjs`, `changes-validate.mjs`, `review-validate.mjs`, and the existing syntax gate. The DOM harness checks behavior, not browser layout. No screenshots or measured visual-QA claims are supplied for this increment.
