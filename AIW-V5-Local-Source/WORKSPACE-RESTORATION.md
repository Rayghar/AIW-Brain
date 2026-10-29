# AIW workspace restoration and enhancement

This update restores useful guidance and review capabilities lost in the Round 28 workspace redesign. The implementation starts from published commit `0cc459081afd45f15611a741e10b951b2e3df73e`; the preceding workspace at `886d30982652a73a0a27c4523466202e6971220c` is the reference for the removed behaviours.

The goal is a coherent guided architecture journey: visible orientation and next steps, explanations that make model views meaningful, review tools that reveal connected problems, and inspection that preserves the user's working context. Existing chapter-specific tools, saved design data and governance authority remain the basis of these behaviours.

## Restoration acceptance

| Capability | Required behaviour |
| --- | --- |
| Model Questions | Explain the architectural question for each view; navigate to available views and explain prerequisites for unavailable ones. |
| Model reading context | Show the active lens/detail interpretation and provide access to connection information and chapter checks. |
| Grouped validation | Provide genuine collapsible groups by object and finding kind, group counts and remembered preferences alongside the prioritized queue. |
| Cause analysis | Show affected records and source access together; include Chapter 11 treatment totals. Respect the current scope and filters. |
| Assessment semantics | Include every inherited finding whose domain treatment is Needs assessment, including error-level findings. Preserve Chapter 1's meaningful content-gap classification. |
| Recommended actions | Restore the recommended step and related actions with their reasoning and native destinations. |
| Contextual inspection | Inspect canonical records from Validate and Output without leaving the current chapter/tab, including records inherited from another chapter. |
| Orientation and next task | Keep the current working context and next-task action visible without recreating repeated header bands. |
| Persistent Details | Remember the user's open/closed choice across reloads, open on explicit inspection and remain accessible in expanded Model views. |
| Output prerequisites | Explain what downstream deliverables need beside their availability; preserve native handoffs and generation formats. |
| Discoverability | Make connections, progress, source records and handoff guidance easy to find within the shared composition. |

## Verification record

### Implemented behaviour

The four tabs keep the shared workspace composition and their chapter-specific content. Restoration adds context at the point of use:

- Model **Questions** opens the corresponding native or shared view. Unavailable views retain an explanation of their prerequisites; saved perspectives retain their purpose. The footer explains the active lens/detail setting and exposes chapter checks and the actual connection state. Expanded models have an accessible Details control.
- Validate supports the priority queue and real collapsible **By object / By kind** groups. Group mode and open/closed choices survive reloads. The cause overview links affected records, explains checks and shows current Chapter 11 treatment totals. Search, source chapter and finding-category filters govern the displayed counts.
- **Awaiting assessment** uses the domain's current `Needs assessment` result, including errors and outdated treatments. **Content gaps** continues to include treated errors by severity. Chapter 1 ambiguity and test-objective warnings retain their content-gap classification.
- Validate and Output **Inspect** opens the canonical record without changing the chapter, tab, scope, selected output edition or preview. Foreign-chapter records use a readable shared dossier with an explicit route to their owning editor. Optional Details drawers preserve the working area; manual open/closed preferences survive reloads, including migration of the older preference.
- The visible location and native **Next task** action return on all four tabs. Output shows exact downstream-document prerequisites and direct access to existing source and handoff disclosures. Work's Connections summary exposes its picture and count.

### Focused checks

Passed before final integrated walkthrough:

| Check | Result |
| --- | --- |
| Syntax | 776 application, service, script and verification modules passed. |
| Core domain regression | Object references, layer toggles, chapter/tab continuity, Undo and journey guard checks passed. |
| Validation capabilities | Exact current/stale treatment membership, treated-error severity, Chapter 1 warning gaps, scoped cause totals, group persistence, active-cause visibility, canonical inspection and domain recommendations passed. Read-only interactions issued zero save commands. |
| Output restoration | 32 exact prerequisite cases, 141 canonical Inspect dispatches and 44 source/handoff entry actions passed. Document, edition, audience and preview selections were preserved. |
| Existing Output integration | 22 native chapter/fixture combinations plus preview, formats, frozen edition and guarded handoff checks passed. |
| Shell browser regression | Native Next task, legacy preference migration, reload persistence, foreign-chapter inspection and drawer behaviour passed at 1440, 1024 and 390px; zero page errors. |
| Model browser regression | All 11 chapter Questions guides, native/shared navigation, prerequisite explanations, reading context, view persistence and expanded Details passed: 18 grouped checks, 96 clicks and zero page errors. |
| Independent acceptance | No remaining release-blocking findings. Review caught and resolved hidden active-cause filtering, source-chapter explanation matching, expanded Details focus and missing Model Next task. |

### Production build

The supported production build passed, including packaged Worker imports and compressed/plain asset serving checks. It packages 224 server modules, 146 client scripts and one stylesheet from 51 inputs. The chapter route measures 3,108,906 bytes of code and the stylesheet measures 837,112 bytes. Hard budgets remain enforced at the next whole-KiB limits; the additional small shared record-card module is reflected in the exact small-chunk count limit.

The immutable client used for the final browser pass is `app-NK6SZLFO.js` with `app-32945c070bd2.css`.

### Final built-browser acceptance

**Passed:** 30 integrated checks covering all 44 chapter/tab surfaces, 18 focused Model checks and 8 built-shell checks. There were zero application exceptions. The pass exercised genuine object/kind groups and cause filters in all 11 chapters, canonical Output inspection in all 11 chapters, native Next task on all four tabs, and all seven chapter forwards from Chapter 4 through Chapter 11.

Working logical-model Markdown (4,927 bytes), working SDD Markdown (220,947 bytes), and frozen baseline BL-001 Markdown (220,250 bytes) were downloaded and hashed. The authored revision 82 design hash remained `e043582c032dc86eb406fafa5fd36f452124d8fb7b0566ae84f7d247d60470ed`. The baseline remained a working draft. A separate blank local project verified missing-input explanations and actionable Chapter 1 ambiguity/test-objective warning gaps.

The final receipt incorporates a bounded export retest against identical production assets after correcting an iframe-content readiness assumption in the harness. Other corrected harness assumptions concerned tab-state selectors, uppercase labels and native export menus; no production workaround was needed. Recorded aborted requests were navigation/preview replacements, and the requested downloads completed successfully.

Desktop and phone screenshots were visually reviewed for Questions, expanded Model Details, validation groups/causes and Output inspection. The final evidence and reproducible commands are in `audit/round29/BROWSER-RESTORATION.md` and `audit/round29/browser-restoration-evidence.json`.

### Verification limits

This restoration pass targets the identified capability losses and their integration with the existing chapter workflows. It does not claim every possible button/state combination in the application has been exhausted. Synthetic treatment records used by the regression suite remain isolated test fixtures; no authored project receives invented approval, review or delivery evidence. The prior Round 28 walkthrough and its limits remain documented separately in `STUDIO-RETHINK-REVIEW.md`.
