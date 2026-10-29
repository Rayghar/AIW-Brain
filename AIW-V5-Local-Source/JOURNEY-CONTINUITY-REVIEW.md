# Workbench continuity — 20 September 2026

## Why this refinement

Chapter changes replaced the selected object with a hard-coded example. This interrupted the original vision of a single live workbench. The change preserves the saved selected object when switching Chapters 4–11, reveals its layer, and updates the URL when selecting through the canvas or inspector. Runtime context follows the selected environment; entering final review keeps the object in the complete model.

The existing inspectors now contain a compact, expandable Connected journey. It uses actual saved definitions and links across Chapters 1–10, including upstream rationale, application allocations, technology support, interfaces/data, security and runtime. Chapter 11 uses the same context. A single linked next-chapter object has a direct continuation link. Multiple destinations are listed explicitly; missing paths stay missing. Chapters 1–3 place this under their existing Connections tab. No new authoring workspace or model records are introduced.

Paths move toward the destination chapter. They cannot travel through shared technology and then backwards into an unrelated application's requirements. Direct links and paths via intermediate references are distinguished. Draft and illustrative status remains visible. Unknown or unsaved ghost IDs do not acquire saved provenance. Blank projects have no bank reference leakage.

## Validation

- Pure-domain checks: actual allocations, upstream links, downstream security/runtime, URL references, non-mutation, removed mappings, ghost exclusion, blank projects, and isolation of unrelated consumers of shared compute.
- Existing workspace persistence/conflict tests and 1,536 model/layout state combinations pass.
- Desktop browser: selected Core ledger survives Chapter 4 → 5 and reopening; its actual APP-003 mapping opens correctly; APP-003 remains selected in Chapter 6; TC-002 → TR-002 opens the linked realization; TR-002 remains selected through Chapters 8, 9, 10 and 11.
- Mobile browser at 390 × 844: chapter menu preserves the logical selection; the connected journey opens in the existing inspector, uses a 230px scrolling body, and has no horizontal page overflow (390px document / 390px viewport). REQ-003 → QD-001 → ADR-002 navigation selects the intended saved artefacts in Chapters 1–3.
- Retained controls: Mind Factory opens existing patterns; an idempotency ghost appears on the same canvas and dismisses back to saved context; risk-hold scenario and Step respond. Desktop and mobile preview logs contain no application errors.
- Source and deployed revision are managed through the existing private Site. No audience or model-data changes are part of this refinement.

## Boundaries

This is a navigation and continuity refinement. It does not implement new coordinated application/technology co-authoring, save local legacy ghosts, add external AI, change approval states, prove runtime capacity, or complete the full product roadmap. All chapter editors, assistants, layer controls, flow controls, previews, validation and export surfaces remain part of the existing application.
