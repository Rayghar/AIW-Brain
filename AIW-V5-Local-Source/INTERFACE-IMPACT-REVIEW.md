# Interfaces & Data impact preview

20 September 2026. Extends the existing private AIW V5 project and its requirement change-review journal.

## Delivered behaviour

- Existing contracts, data definitions, and dictionary field additions, edits, and removals offer an unsaved preview before application. Creating a new contract or data definition retains the existing authoring flow.
- Saved/proposed switches use the same model. Proposed source definitions appear as ghosts; recorded dependent objects and relationships are highlighted. A changed provider redraws the actual endpoint.
- Review provides attribute-level before/after wording, stable field IDs, linked-record context, and separate sections for detected definition findings and potential compatibility implications.
- Dependencies follow recorded data exchanges and derivations, providers/consumers, data authority and application use, logical allocations, requirement/quality/decision rationale, targeted security controls, and operating plans. Unrecorded relationships are not invented.
- Apply requires explicit review. Dismissal leaves saved content unchanged. Proposal editing retains entered wording. Starting a different edit cannot silently replace a staged proposal.
- A stale save is rejected. Refresh merges the intended edits over the latest model, preserves unrelated concurrent edits, and discloses conflicting values for an explicit decision. Failed saves retain the proposal.
- Accepted edits append CHG entries, before/after differences, linked review obligations, and captured findings/prompts to the private journal. Existing requirement histories remain supported. Legacy direct Chapter 8 commands also record changes, explicitly marked as not interactively previewed.
- Review assessments, owned follow-ups, source links, and superseded histories use the existing review desk. The working SDD includes the history; frozen baselines retain their captured state.
- The contextual panel and cursor explain the active proposal. Sol acts on it; Mind Factory remains a separate pattern workspace. Existing layer, navigation, flow, search, focus, export, and lab controls are retained.
- The review dialog has bounded reading space. Desktop uses a paged record list; mobile uses a chapter filter and record selector, keeping details close to the selection. Unsaved proposals have a visible reminder when changing workspace tabs.

## Evidence

| Check | Result |
| --- | --- |
| Payment-reference rename | Pure preview reports four new correlation-definition findings across IF-001–004 and 36 recorded review items across Chapters 1, 2, 3, 4, 5, 8, 9 and 10. DF-001 remains stable. |
| Real model change | Desktop provider change from Payment service to Settlement worker redraws IF-001's provider relationship; Saved model restores the original relationship. |
| No premature mutation | Preview, editing, and dismissal leave saved definitions and history unchanged. Applying without explicit review is rejected. |
| Concurrency | Two browser sessions edit the same field. The stale save is rejected; refresh shows competing names and preserves the other session's new description. |
| Desktop authoring | Field edit, proposal revision, dependency filters, model inspection, saved/proposed switching, dismissal, acceptance, and contextual Sol actions exercised. |
| Mobile authoring | 390 × 844 embedded viewport: field editing, preview, acceptance, reopening, chapter/record filtering, inspecting a live object, dismissal, and earlier review history exercised. Review dialog has no horizontal content overflow. |
| Review and SDD | Accepted CHG-002 opens in change review; a requirement follow-up persists. Later CHG-003 preserves that earlier assessment. Browser-rendered SDD includes accepted changes, captured findings, reviewer, follow-up, and mobile-saved wording. |
| Persistence and access | Worker tests verify private object-storage journal, compact database reference, reopening, revision conflicts, owner isolation, stable IDs, and frozen baseline preservation. |
| Regression | Syntax check; interface impact, Interfaces & Data, change review, Review & Realize, projects, workspace, and original model suites pass. Original model suite covers 1,536 layer/layout combinations and simulated journey guards. |

## Practical limits

Guidance and impact analysis are deterministic model rules. Recorded dependencies identify review obligations; they do not establish production breakage or provider compatibility. No real banking system or external LLM is connected. Acceptance changes the working design, not runtime systems, validation outcomes, or governance approval.

Unsaved previews remain in the current browser session, with a leave-page warning; only accepted changes persist. This increment previews edits within Chapter 8; previews for other source chapters remain future work. Mobile validation used an embedded viewport in desktop Chrome, not a physical device. Export responses and rendered SDD content were verified; no claim is made about a particular operating system's download-save dialog. QA projects and data remain local and are excluded from deployment.
