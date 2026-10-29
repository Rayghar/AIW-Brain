# Requirement change review

20 September 2026. Increment after project journeys and model-rich SDD output.

## What is usable

- Every chapter exposes **Review changes** in its project menu. A compact notice opens the latest unresolved change and filters to the current chapter where applicable. Hiding the notice keeps the review desk available.
- Editing an existing requirement retains a stable CHG reference, field and relationship differences, and the union of its prior and current downstream links. Removed requirements retain their earlier trail.
- The desk offers change history, chapter filters, before-and-after wording, affected-object explanations, explicit dependency references where available, and links back to the source models and complete review.
- Each record accepts a reviewer, rationale, evidence or analysis reference, explicit confirmation, and an outcome. Follow-ups additionally require an owner and next action and remain open. A revised-design outcome requires an actual change to the record or its immediate context.
- Later changes reopen affected assessments. Superseded requirement changes and prior assessments stay in history. Reviews do not silently modify designs, resolve source validation findings, or confer governance approval.
- Current review evidence appears in the SDD. Captured baselines retain their original history. Open reviews prevent the unconditional architecture-review outcome “Ready for governance.”
- The private project persists its journal in object storage with a compact database reference and the existing optimistic revision check. Failed writes preserve the saved revision.
- Unsaved-note protection covers closing, switching records, source navigation, and loading a newer project after a conflict. When the original change is superseded, notes remain visible and can be explicitly transferred to the same record in the latest change, with confirmation cleared.

## Verification

An isolated Bank Payment Journey copy was used; no production project records were changed for testing.

| Area | Evidence |
| --- | --- |
| Desktop review loop | Edited requirement acceptance, inspected 33 affected records across Chapters 2–10, recorded a follow-up, opened QD-002 in its model, revised its response, saw the review reopen, recorded a revised-design assessment, and reopened the saved result. |
| Concurrent edits | Edited the same requirement from a second tab while a review draft was open. The stale save was rejected. Loading the current project preserved the notes in the earlier change; explicit transfer retained them for the same record and cleared confirmation. |
| Mobile | Reviewed and saved an owned follow-up inside a 390 × 844 browser viewport. The page was 390 px wide with no horizontal document overflow; the dialog was 376 px wide with no horizontal overflow. The comparison can stay collapsed and the form retains its scroll position after saving. |
| Existing controls | Inspected the original Chapter 4 model controls, independently scrollable journey, eight persistent layers, flow controls, object lens, Sol, Mind Factory, and Cursor. Also checked Chapter 1/2 context and Chapter 11 output surfaces. Notice dismissal and the complete-review route remain available. |
| SDD | Opened the working HTML preview through Chapter 11. Current and earlier changes, exact wording, reviewers, rationale, and follow-ups appeared. API checks also covered HTML/Markdown inclusion and unchanged older baselines. |
| Data and authorization | Automated checks cover owner isolation, authentication, revision conflicts, record staleness, outcomes and evidence gates, removed requirements, preserved history, reopen, private journal references, injected write failure, and the unconditional-readiness gate. |
| Regression | Syntax checks, requirement/quality/decision suites, project journeys, Review & Realize, shared workspace checks, and the existing 1,536-layout model suite passed. The older requirements fixture was updated to supply the now-required private object-storage binding. |

## Scope and limits

The journal begins with edits to existing requirements and their root relationships. It is not a complete event log of every architecture command. New downstream records added after a change are not retroactively inserted into that change's captured affected-record list; current chapter validation and traceability still apply. Earlier notices without snapshots are explicitly labelled and do not fabricate previous wording.

Dependency explanations follow recorded links. They do not infer unseen technical effects or verify the truth of supplied evidence. Guidance remains rule-based. Browser checks used desktop and an embedded mobile viewport, not physical devices or assistive-technology certification. SDD content and preview were verified; a native browser download completion was not independently observed in this increment. Retained journal object versions are not yet garbage-collected; no large-scale performance claim is made.

The existing owner-private audience is preserved. Local fixtures and development storage are excluded from deployment.
