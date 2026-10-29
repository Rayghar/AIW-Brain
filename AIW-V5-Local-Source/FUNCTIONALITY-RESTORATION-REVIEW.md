# AIW functionality restoration review

20 September 2026. Restoration of the original explorer's persistent exploration controls, applied to the existing eleven-chapter workbench.

## Reference and finding

Compared the exact first saved build (`5cb53a514d4c1b43d07c075ad816af9ea247bf53`) with the previously deployed focused-workspace release (`4da1a9ebf32f24173acf76c94185bdf85267196c`). The first build was opened from its preserved source in the managed browser. The user's Windows localhost was not accessible from that browser.

The density refinements hid useful controls and context. Layers moved from the persistent navigation rail into a collapsed Model-only disclosure. Canvas assistance, descriptive headings, selected context and next-step guidance were suppressed. Chapter 4's richer responsibility register also displaced the original architect's note editor. The underlying domain model largely survived, but access to capabilities regressed. This release restores that access while retaining the later chapters and shared project.

## Capability preservation

| Original capability or later chapter requirement | Restored or retained experience |
| --- | --- |
| Architecture journey | All eleven chapters remain reachable in an independently scrollable list. The current chapter is revealed and a scroll hint explains the remaining chapters. |
| Persistent model layers | All eight architecture layers are available beneath the chapter list on every Work, Model, Validate and Output surface in Chapters 4–11. Choosing a layer opens the same Model surface. |
| Chapter-aware exploration | Chapters 1–3 use the same rail for their native actors, journeys, requirements, outcomes, drivers, alternatives and responsibilities. Perspective choices persist in this browser. |
| Layer selection and reset | Individual switches, checked state, visible counts, Show all and Clear remain available. Empty-model recovery remains available. Following a linked object can reveal its layer. |
| Location, progress and next action | Descriptive chapter headings, current tab, content-based readiness, milestones and the model's next-step strip remain visible or directly reachable. |
| Object lens | Desktop users can place it Beside or Below the model. Placement persists per chapter. Chapters 1–5 initially use Beside; technology and subsequent chapters retain their contextual bottom-panel defaults. |
| Model understanding | Selection, related-object highlighting, attributes, upstream references, all relationships and chapter-specific evidence are retained. |
| Generative cursor | Pointer and keyboard explanations remain available with a persistent on/off preference. Mobile selection uses the pinned context panel. Guidance is still rule-based. |
| Sol and Mind Factory | Separate, chapter/tab-aware controls remain above every surface. Original canvas shortcuts are restored as well. |
| Reviewable ghosts | Preview, edit, dismiss and explicit reviewed acceptance remain intact. Inspecting an already-saved Chapter 4 proposal now closes its dialog and opens the model. |
| Flow animation and transport | Ambient motion switch, scenario selector, play/pause, step, restart and scenario-review actions remain. Successful payment, risk hold and uncertain settlement remain explicitly simulated. |
| Canvas navigation | Search, selection focus, grouping where supported, widening, zoom and fit remain available. Full-model overview and readable scroll/zoom exploration serve different scales. |
| Architect's note | Chapter 4's editor is restored; Chapter 5's existing editor remains. The original browser key is preserved, and existing Chapter 4/5 export code continues to include the note. |
| Saved architecture and exports | Existing project commands, stable references, validation, downstream handoffs, JSON/Markdown exports, frozen baselines and governance evidence are retained. |
| Small screens | The full journey and layer controls open in a closable navigation panel. Long chapter labels have their own rows. Escape closes navigation. The next-action row and assistance controls fit the workspace width. |

The first build's lightweight milestones are represented by the later, richer chapter-specific review workflows. They were not reintroduced as duplicate or misleading readiness calculations.

## Validation evidence

- Opened all 44 chapter/tab combinations on desktop and all 44 in the 390 × 844 mobile browser frame. Desktop review used a 1363 × 936 viewport. Checked shared navigation, controls, assistance and bounded layout. Later targeted checks covered the mobile fixes and context behavior.
- The mobile frame had no outer horizontal overflow in the 44-surface audit. Long work surfaces remain internally scrollable. The architecture journey has its own bounded scroll area.
- Exercised all eight architecture switches and the five/four/four native perspective switches in Chapters 1/2/3. Exercised Show all, Clear, recovery from an empty view, and routing from other tabs into Model.
- Verified panel placement and perspective persistence after reopening. Verified mobile layer selection closes navigation, Escape closes navigation, and ordinary foundation-tab clicks do not unexpectedly open the context panel.
- Verified the restored Chapter 4 note can be edited on mobile and reopened on desktop in the same browser profile.
- Verified Chapter 4 ghost preview, edited preview, dismissal, explicit reviewed acceptance into the local QA project, and reopening the saved candidate. Verified the already-saved proposal path closes its dialog.
- Verified model pointer and keyboard explanations contain the object's identity, owner, relationships, requirement and decision references, and relevant modelling gaps. Checked mobile Sol and contextual assistance.
- Verified ambient/transport controls remain reachable; exercised play/pause, restart, step, risk-hold and settlement-timeout outcomes, zoom and fit.
- Browser export action reported successful preparation. Existing domain/API tests validate export payloads and headers. The managed browser download monitor did not signal completion, so a completed downloaded file was not independently confirmed by that monitor.
- Syntax checks and the production build passed. Shared-model, workspace and all eleven chapter/domain/API suites passed during the restoration. The logical and workspace suites were rerun after the final interaction fixes. These cover saved references, conflicts, owner isolation, source invalidation, reviewable proposals, persistence, handoffs and exports; model suites also exercise generated desktop/mobile layer layouts.

QA edits used the local reference project. They are excluded from deployment; the production project is not replaced by QA data.

## Limits

Mobile validation used a live browser frame rather than physical phone hardware. No new load test or 100,000-user capacity claim is made. Guidance remains contextual rules, not an external LLM, and payment/failure behavior remains simulation. Existing reference assumptions, governance boundaries and unresolved project findings remain explicit.

## Preservation rule for later refinements

Before a later UI change is released, compare the capability table above and the chapter-specific README sections. Check every chapter's Work, Model, Validate and Output access, then exercise changed interactions. Reducing scrolling must preserve routes to the actual editing, exploration, guidance, simulation, validation and output capabilities. Do not suppress a capability with CSS merely to make a screenshot denser. A deliberate disclosure must keep a clear, reachable label, retain its controls and work with keyboard and mobile interaction.

Access remains owner-private. Publication uses the existing Site and the private deployment operation; this change does not add viewers or groups.
