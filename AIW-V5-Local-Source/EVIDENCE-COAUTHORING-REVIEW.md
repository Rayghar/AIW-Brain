# Evidence-led co-authoring review

Date: 20 September 2026

## Delivered scope

| Area | Implemented behaviour |
| --- | --- |
| Evidence shelf | Stable SRC references; source title, location, document version, date, pasted excerpt, illustrative/unconfirmed/confirmed status, confirmation reviewer, retained revisions. |
| Sol task | Stable SOL reference; resumable answers; observable acceptance, owner, optional outcome, open questions; current step, next question, and progress. |
| Coordinated proposal | Three editable drafts; requirement → quality scenario → decision question; visible source citation, relationships, full draft review, and validation before atomic application. |
| Confirmation boundary | Application creates unconfirmed requirements/scenarios and a draft decision. Numerical targets are never automatically generated or confirmed. No alternative or governance status is automatically selected. |
| Mind Factory | Separate comparison of pattern prerequisites, benefits, trade-offs, and anti-patterns. Consideration/rejection reasons persist with the task. |
| Cursor and context | Applied records expose their source citation and current source-review status. Work/Model/Validate/Output guidance uses the active surface. |
| Source changes | Existing interpretations remain intact; a newer source flags linked records for review. Original application citations and subsequent review reasons remain available. |
| Revision and withdrawal | Prior proposal versions remain readable. Dismissal needs a reason. Withdrawal requires an unchanged bundle and no later model or active review dependencies; frozen baselines remain intact. |
| Output | Current and captured SDDs include sources, original application excerpt, created IDs, assumptions, pattern reasoning, and review history. JSON preserves the complete working state. |

## Validation completed

Automated integration checks use the actual Worker command route, SQLite adapter, and object-storage adapter. They cover:

- Pure preview behaviour and atomic creation of linked requirement, scenario, and decision records.
- No implicit source confirmation, target confirmation, decision selection, or governance approval.
- Stable IDs, existing outcome links, duplicate application rejection, and current-project concurrency checks.
- Source revisions, blocked stale application, explicit source refresh, and applied-record source review.
- Blank non-payment project isolation and incomplete numerical targets retained as open work.
- Proposal edits, pattern-rejection history, persistence and reopening, and bounded withdrawal.
- Owner isolation, private storage-key scoping, compact database pointers, and preservation of the last saved version during an object-storage failure.
- Working SDD inclusion and immutable captured SDD content after later source changes.
- Compatibility: adding the feature to a project without evidence does not invalidate its existing design-source stamp.

Existing requirements, quality, decisions, project workspace, project journey, change-review, interface-impact, and final-review suites passed. The existing model suite also passed its 1,536 layer-layout state combinations, focus/search, and simulation guards; that suite does not itself assert browser layout.

Browser validation used isolated local QA projects, not production project data:

- Desktop Bank Payment Journey: task creation, edited answers, proposal preparation, edits retained across proposal tabs, numerical target retained as an assumption, separate pattern rejection, explicit application, full reload/resumption, stable links into Chapter 1, and visible pinned source context.
- Mobile 390 × 844: source creation, unsaved-form guard, blank-project task creation, scenario editing, incomplete-target disclosure, explicit application, and handoff into Chapter 2. Dialog and content widths were checked for unintended horizontal overflow.
- Source concurrency: two browser tabs edited the same source; the stale save was blocked. Refresh retained the form, detected the changed source, and required explicit recovery rather than overwriting the newer revision.
- Changed source: the applied task displayed both source revisions and a review obligation across its linked records.
- Formatted SDD: verified source heading, current and original citations, created IDs, source-change status, and the saved pattern-rejection reason in the rendered HTML preview.
- The Chapter 11 and mobile browser runs had no application console errors. The deliberately stale save returned the expected conflict response.

## UX refinements made during validation

- Retained every existing chapter control; added a bounded shared task workspace.
- Removed redundant save banners to keep attention on the task.
- Mobile uses compact saved-source/task and proposed-record selectors, with four short stage controls and visible progress.
- Review shows the full proposed records, not just their titles. Historical proposals use labelled fields instead of raw JSON.
- Only one pattern-review form is open at a time, avoiding loss of another pattern's unfinished notes.
- Saving disables the form until completion, preserves it on failure, and provides conflict recovery.
- Unsaved navigation is explicit and keyboard focus remains within the leave/discard choice.

## Deliberate limits

- Guidance is deterministic and labelled as project rules. No external LLM is connected.
- Evidence accepts pasted excerpts and references, not uploaded-file extraction or independent source verification.
- One task proposes one new requirement, one quality scenario, and one draft decision question. It does not merge existing records, choose alternatives, or change downstream implementation automatically.
- The prototype supports 30 sources, 20 revisions per source, 40 tasks, and excerpts of up to 8,000 characters. Limits are enforced by the server.
- Task drafts are explicitly saved. Browser-only unsaved edits still require saving before closing or navigation.
- This is not a universal undo system, multi-user collaboration release, or evidence of capacity for 100,000 users.
- Browser export validation inspected the formatted preview; integration tests checked returned export data. No claim is made about an operating-system download dialog.

Deployment must preserve owner-only access. No test source excerpts, QA records, or local databases belong in the deployment archive.
