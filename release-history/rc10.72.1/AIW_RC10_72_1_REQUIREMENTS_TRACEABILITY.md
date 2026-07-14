# rc.10.72.1 Requirements Traceability

| Requirement | Implementation | Automated evidence | Browser/visual evidence | Status |
|---|---|---|---|---|
| Provide an Auto/Smart arrange action | `ProCanvasViewSystem.tsx`, `smartCanvasLayout.ts` | `smartCanvasLayout.test.ts`; structural gate | Tree/radial/grid screenshots | Verified |
| Provide Tree left-to-right | `treeLayout(..., vertical=false)` | Unit tests and structural gate | Focused browser menu contract | Verified |
| Provide Tree top-to-bottom | `treeLayout(..., vertical=true)` | Unit tests and e2e | `canvas-tree-*` | Verified |
| Provide Radial view | `radialLayout` with high-degree centre and bounded rings | Unit tests and e2e | `canvas-radial-*` | Verified |
| Provide Grid view | `gridLayout` | Unit tests and structural gate | `canvas-grid-*` | Verified |
| Smart mode chooses a suitable layout | `chooseSmartMode` evaluates cycles, degree and density | Unit tests | Focused acceptance | Verified |
| Layout supports compound boundaries | `arrangeChildren` and boundary dimensions | Unit tests and gate | Tree/radial model evidence | Verified |
| Arrangement is reversible | Stage-studio snapshot and Undo command | Gate and e2e | Feedback assertion | Verified |
| Arrangement must not change architecture semantics | Presentation-only coordinate/dimension mutation | Source contract and unit tests | Model remains usable after undo and Viewbook transition | Verified |
| Navigation text is left justified | `rc10_72_1_signature_canvas_navigation.css` | Gate computed-style assertion | Desktop and laptop nav screenshots | Verified |
| Navigation must not jerk on hover | Explicit navigation state; no hover width rule | Geometry e2e assertion | Desktop/laptop screenshots | Verified |
| Remove rail-to-page gap | One shell width variable; grid gap 0 | E2E geometry assertion | Desktop navigation screenshot | Verified |
| Clear legacy navigation ownership | `aiw-journey-nav-v2`; legacy selectors removed | 36/36 structural gate | Source comparison | Verified |
| Responsive navigation should overlay, not squeeze | Fixed overlay below 1440 px | E2E laptop assertion | `navigation-overlay-*` | Verified |
| Architecture Viewbook opens its own workspace | Pending-open handoff and actual Viewbook mount | Gate and e2e | `viewbook-routing-*` | Verified |
| Lifecycle stage context must remain current | `lifecycleStatusService.ts` explicit active step | 4 lifecycle tests | Architecture Genesis/Brain regressions | Verified |
| Architecture Brain must use exact project context | `CoArchitectPanel.tsx` Project/Stage/Scope/Revision receipt | Gate and Brain Authority e2e | Focused Brain regression | Verified |
| Keyboard actions must not use stale candidate slots | `GenerativeCursorController.tsx` mode/action identity reset | Gate; desktop C4 regression | Desktop C4 co-creation | Verified desktop; inherited laptop harness open |
| Ghost preview must remain stable during review | Preview review lock and stale-response protection | Source gate; desktop Living Canvas regression | Desktop canvas regression | Verified desktop |
| Notifications must not cover the canvas | top-centre notification positioning | Source/visual inspection | Focused screenshots | Implemented; full cross-page visual regression open |
