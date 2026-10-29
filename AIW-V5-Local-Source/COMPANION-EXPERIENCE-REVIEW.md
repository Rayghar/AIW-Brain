# AIW companion experience refinement

## Product decision

The v32/v33 assistance layer introduced capability names as extra modes and placed a generic design flow ahead of the established chapter guidance. That made the workbench harder to understand and hid useful existing actions.

The revised experience keeps three distinct companions: Ask Sol helps perform the current task, Mind Factory explores patterns and consequences, and Cursor explains the selected object. Co-design and co-authoring are capabilities used within that experience. They do not replace the companions or create another studio.

## Delivered

- Chapters 1–11 supply their existing Sol guidance, native actions and Mind Factory pattern proposals directly to the shared side panel. Action handlers and reviewed proposal workflows remain owned by their chapter.
- The assistance bar contains Ask Sol, Mind Factory and Cursor. The side panel has two companion selectors. Writing is a focused task inside Sol, with a return path, editable draft and explicit acceptance into the SDD.
- Chapter, surface, selected object and its recorded status stay visible. A compact diagram uses actual saved objects and connections, with links back to their model context. It is not a generated architecture or a completeness score.
- Sol follows selection changes. A writing task retains the passage's original object context while the architect explores the canvas. Existing saved work and model alternatives remain accessible.
- The natural-language composer is collapsed until needed in Sol and Mind Factory. Source inspection, server-side generation, saved responses and review-before-adoption remain intact. Output foregrounds writing the design explanation.
- The original application, contract/payload and protection guided tasks remain available through the same contextual workflow. Native chapter dialogs remain the editing surface when a task needs them.

## Verification

- DOM checks across all eleven chapters and all four surfaces verify native Sol/Mind routing, native task entry, retained three-section navigation and the three companion controls.
- Writing checks cover draft, edit, unsaved-change protection, accept and reopen. Guided application, interface and protection task entry remains functional.
- The LLM UI regression uses the actual Worker with a mocked provider to verify source inspection, saved generation, design adoption, writing review and reopening. No new live provider call was needed for this interface change; the v33 live provider verification remains documented separately.
- A narrow viewport DOM check covers modal state and writing interactions. DOM checks do not verify layout, clipping, contrast or rendered visual quality.
- The browser connection still times out while enumerating tabs. No rendered browser walkthrough or screenshot is claimed for this release.

## Remaining product work

The connected OpenAI provider and existing AKR pilot are preserved. This refinement does not add a full knowledge-repository connection or establish architecture-quality scores. Broader curated knowledge and evaluation of generated architectural reasoning remain the next intelligence work, inside these same companions.
