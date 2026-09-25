# Coordinated model proposals and saved alternatives

This increment extends the existing impact review and Mind Factory. A model alternative is a proposed collection of changes to existing records across Chapters 4–7. Chapter 3 decision options and Chapter 7 product comparisons retain their existing purpose and controls.

## Working flow

1. Edit a saved responsibility, application component, logical technology capability or realization plan and select Preview impact.
2. In the existing review, add a related record through its usual editor. The proposed-record selector switches between each record's before-and-after values. Revisiting an editor preserves its staged values.
3. Inspect the shared model, recorded dependencies and existing definition checks. Proposed records use the established gold ghosts; linked records are outlined. The final combined model supplies the findings, including removed and proposed allocation paths.
4. Save a named alternative with its reasoning, or continue reviewing the working proposal. Saving the alternative leaves the working architecture unchanged. Updating an alternative retains its earlier revision snapshots; Save as new creates a distinct stable ALT reference.
5. Open Mind Factory in Chapters 4–7 to resume alternatives, compare two designs, inspect their reasoning and history, or set a draft aside with a reason. The comparison uses the current model, identifies overlapping edits and does not rank alternatives. Applied and archived reasoning remains inspectable.
6. Acceptance names the reviewer, records the acceptance reason and requires explicit review of all proposed records and their impact. One atomic save applies the bundle. Each changed record receives its own CHG entry with shared proposal provenance. Applying a working design does not establish governance approval or resolve linked review obligations.

There is no additional navigation section or permanent header row. The project switcher, three navigation sections, source drafting, chapter handoffs and contextual lens layout remain in place. Sol opens the active proposal review; Mind Factory retains its chapter patterns and adds a disclosure for saved model alternatives.

## Persistence and concurrent work

- Model alternatives use project-owned private object storage with a compact database reference. Existing projects need no database migration. Limits are 12 existing records per proposal and 60 retained alternatives per project.
- A saved alternative can be reopened after loading the project again. In-memory unsaved work is protected against replacement, discard and navigation. Closing a saved preview retains the saved alternative.
- Refresh preserves unrelated saved field and allocation edits, discloses overlapping edits, and resets acceptance confirmation. Records that already match the proposal are excluded from repeated application. Removed records remain visible in the alternative's saved history, but cannot be silently reconstructed or applied.
- Project revision checks and alternative revision checks prevent stale application. Storage failure leaves the working project unchanged. Save controls lock submitted fields until the request completes.
- Accepted proposal identity, reviewer, reason and CHG references appear in the existing Changes review and working SDD. Saved reasoning is included in the SDD; frozen baselines remain unchanged.
- The workflow checks exposed an existing logical-editor listener that treated other chapter forms as its own unsaved edits. The logical dialog now has an explicit scope for form events and closing.

## Verification

- Syntax checks pass for the client, domain and Worker modules.
- `model-alternatives-validate.mjs` verifies non-mutating drafts, comparison, coordinated application, unrelated-edit preservation, overlap disclosure, already-applied detection, explicit review, private storage, owner isolation, concurrent revision rejection, storage failure atomicity, retained reasoning and frozen SDD.
- `model-alternatives-ui-validate.mjs` runs the real four chapter editors and project store against the Worker with an in-memory database and a DOM implementation. It covers combined ghosts, save/reload/resume, prefilled editing, distinct alternatives, comparison, refresh, overlaps, explicit acceptance, shared CHG identity, history, setting aside, unsaved-switch/discard guards, already-applied detection and the shared Chapter 8 interface review.
- Existing model-impact, interface-impact, Changes, Review & Realize and workbench checks cover the affected integrations. The foundation Sol/source/pattern flow retains its same-dialog behavior.
- For DOM checks, supply an installed Happy DOM module through `AIW_DOM_MODULE`; no browser or production project data is used. These checks do not verify pixel layout, overflow or touch interactions.
- Supervised preview started, but browser control continued to time out. Visual desktop/mobile inspection remains incomplete; no passed visual walkthrough is claimed.

## Further work

This implements coordinated editing and durable model alternatives for existing Chapter 4–7 records. Evidence-grounded generation of an application/technology design, coordinated creation of new records, standalone relationship previews, a connected external LLM, team governance and integrations remain further work within the same workbench.
