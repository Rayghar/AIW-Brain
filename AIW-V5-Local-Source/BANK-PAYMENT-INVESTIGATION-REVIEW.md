# Bank Payment Journey · uncertain settlement investigation

This is an AIW capability check using the existing illustrative Bank Payment Journey. It does not assert that a provider implements the sample contract or that the solution is approved.

## Walkthrough of the connected model

Open the Bank Payment Journey, Chapter 4, Model, and choose **Investigate on this model**. The question is what happens if the external settlement may have succeeded but its response was lost. Eight stage buttons stay visible on desktop and remain scrollable on narrow screens. Each stage selects a canonical object in its own chapter perspective; the scope and selected object are carried through the journey.

| Chapter | Object followed | Question made visible |
| --- | --- | --- |
| 4 · Logical application | Settlement hub | Who owns the uncertain outcome? |
| 5 · Application realization | Settlement worker | Which implementation submits and investigates it? |
| 6 · Logical technology | Service connectivity | Which shared capability carries the request? |
| 7 · Technology realization | Service connectivity realization | What technology choice is recorded? |
| 8 · Interfaces & Data | Settlement submission and enquiry | What does the external agreement actually promise? |
| 9 · Security | Audit trail | Where is the investigation recorded and verified? |
| 10 · Deployment / Runtime | Settlement worker placement | Where would recovery run, and what failure domain is assumed? |
| 11 · Review & Realize | ADR-003 | Which requirement and quality scenario motivate the recovery decision? |

The stage changes the semantic perspective, not the underlying identity. The Chapter 11 case view reduces a larger rationale view to REQ-004, QD-004, ADR-003 and Settlement hub. Select a node for its saved definition, source state, questions, and links to Chapters 1–3. Select a relationship for its source, meaning, endpoints, obligations, and underlying records. The generative cursor offers a case-specific question and opens Sol with the selected object and model context; the UI discloses when an LLM connection is absent.

**Compare responses** uses ADR-003's existing enquiry-first and immediate-retry alternatives. The selected approach marks its affected objects on the canvas. The comparison identifies the quality scenario, provider assumptions, duplicate risk, and explicit recovery and verification obligations. The comparison panel is bounded to the canvas and yields to the object inspector. An immediate retry has no automatic contract proposal while repeat safety is unproven.

The enquiry-first action stages a Chapter 8 contract definition through AIW's existing impact review. The review shows exact before/after fields, linked records, and findings before acceptance. In a browser trial on the reference project, four fields were reviewed and applied, generating CHG-001, 21 linked review notices, and an updated working SDD. The policy says to keep the outcome pending and enquire with the original reference before safe replay. ADR-003 remains draft; provider guarantees, duplicate handling, and recovery verification remain open. A working contract definition does not prove provider behaviour.

## Canvas and navigation decisions

- Chapter guided modes use different object kinds and bounded mappings; broader perspectives remain available through **Explore perspectives**.
- Type icons and distinct shapes mark responsibility, component, capability, contract, data, control, placement, and decision. Visible links are scoped; hidden links remain countable and accessible on selection.
- **Move**, **Resize**, and **Smart arrange** operate on view occurrences. Held placements survive reflow; changing the view arrangement does not change a model definition. Chapter scoped positions preserve spatial continuity.
- All eight investigation stages remain in view on desktop in two rows. The comparison stays within the canvas, leaves the footer operable, and closes when the object or relationship inspector opens. The chosen option's annotations remain visible.

## Verification and remaining acceptance gates

`npm run test:investigation`, `npm run test:connected-model`, `npm run check`, and `npm run build` passed. The browser walkthrough covered Chapters 4–11, both canvas and inspector, proposal review and acceptance, the live SDD, cursor-to-Sol context, a desktop viewport and a narrow preview. The connected-model regression still uses a synthetic Orbus mapping. A real Orbus tenant import/update, an independent review of knowledge claims, an active LLM provider evaluation, and novice/practitioner usability trials remain separate release evidence.
