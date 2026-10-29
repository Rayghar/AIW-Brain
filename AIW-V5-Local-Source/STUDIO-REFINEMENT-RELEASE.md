# AIW · Driver-led design and result-read continuity

Release: **AIW v0.10.0-rc.10.73.35+studio.20261020**
Source baseline: **rc.10.73.34**, commit `a38d851793b67de5494e5ad0e7a0b80fbfbec3e3`.

This release follows an architecture decision from its drivers through an accepted approach, pattern placement, product comparison, model, SDD and subsequent change review. It closes gaps exposed by that journey in the existing Work, Model, Validate, Output, Companion and Sol surfaces. The accepted task, source receipts, native model records and review history remain the shared basis of the experience.

## 1. Two complete authored customer journeys

The main scenario is order fulfilment: a business requirement, a measurable result-freshness driver and a hard operating constraint shape a read comparison and a persistence comparison. The accepted recipes carry placement and implementation duties into the native model. PostgreSQL and MySQL are compared against that specific specification, followed by a recorded working choice and runtime placement. The result contract links back to the accepted read design.

A second payment scenario uses an authoritative direct read and a different scoped persistence/product choice. The tests also retain the simpler direct-read alternative, prohibited-cache conditions, missing evidence and a product excluded by a hard constraint. Product names do not determine the outcome: the declarations, applicable constraints and evidence do.

The journey proceeds through reviewed native proposals and acceptance, model relationships, current validation and SDD output. Changing the freshness driver reopens the affected reasoning and review without rewriting the earlier decision. Reversal retains the existing history protections. An accepted architecture is not a measured implementation: the journey deliberately leaves the real verification exercise open.

These scenarios are authored synthetic acceptance fixtures. They are not customer production data, a live LLM evaluation or measured payment/fulfilment performance.

## 2. A result contract can reuse its accepted read design

The existing contract Behaviour editor adds one optional disclosure, **Freshness of the result read**. It contains three facts:

| Native field | Meaning |
| --- | --- |
| Accepted read design for this result | The exact accepted read comparison, retaining its existing authority, approach, placement, sources and verification duties. |
| Required result freshness | Whether the result must reflect the latest committed state or may be an explicitly bounded older value. |
| Maximum result age | For a bounded result, the maximum permitted source-value age in seconds. This is a declared requirement, not a measurement. |

For example, a cache-aside design permitting a 30-second-old result conflicts with a result consumer requiring at most 5 seconds. AIW identifies that exact discrepancy and opens the relevant native field for review. It does not silently change the requirement or the accepted read design.

The interpretation checks that the read task is accepted and current, belongs to the original caller, names the same result authority, and reads the exact dictionary containing the declared business-state field. It supports one explicitly linked status request and the existing direct-read/cache-aside recipes. A result event requires a separate freshness interpretation; a missing or unrelated task cannot supply the evidence.

For a strict latest-committed requirement, the accepted cache-aside recipe does not establish compliance. An authoritative direct-read declaration still requires proof of its actual consistency contract. For a bounded requirement, the declared source-value age must fit the consumer's bound. Cache TTL alone is not promoted to an achieved freshness guarantee.

The native editor, saved operation drafts, combined change preview and explicit acceptance use the same fields. Numeric values remain numeric in the saved contract. Editing this consumer requirement preserves the accepted read design and its history. Older drafts that omit the new optional fields retain the saved values rather than clearing them.

The method remains `AIW-EXECUTION-COMPOSITION-1`, now interpretation version **5**. Its precise scope and primary-source mapping are in [ARCHITECTURE-EXECUTION-COVERAGE.md](ARCHITECTURE-EXECUTION-COVERAGE.md).

## 3. Reasoning, currentness and disclosure remain connected

The result reading uses the read task's canonical requirement and model context. Changes to its drivers, decisions, source interpretations, placements, dictionary, authority or supporting relationships reopen review. The same dependencies participate in native contract review and saved operation currentness; an older operation draft cannot evade the linked read design's changed basis by omitting the new fields.

Sol receives a bounded, complete deduction and the facts actually used by that deduction. The accepted task projection contains its current answers, accepted option and placement, compact method identity and full dependency identities. Its version stamp still reads the complete canonical basis and context. Excluding any of those dependencies suppresses the affected task source and deduction, including dependencies that do not need a separate repeated passage in the provider packet.

For a native result-read explanation, this exact composition takes priority over a duplicate automatic full alternatives comparison. A question about a different recognized concern, such as persistence, retains that concern's grounding. Explicitly opening a saved architecture task still supplies its full comparison and drafting contract. Selected requirements, scoped architecture drivers and project constraints remain critical context.

The architecture comparison encoding now pools repeated driver-scope paths losslessly. The decoder restores every path tuple; driver kind, force, target, confirmation and scope are preserved. This lets the realistic combined journeys fit the existing review allowance without dropping governing constraints.

No limits were increased: contextual provider packets remain bounded to **22 sources / 28,000 characters**, and an individual architecture comparison remains bounded to **20,000 characters**. A deduction is withheld if its complete source basis cannot fit or cannot be disclosed. This release does not establish live model response quality.

## 4. The SDD follows the accepted architecture

The main SDD now includes **Accepted architecture obligations**, reading the same native obligations as component specifications and Chapter 11 delivery actions. The section names the accepted task/pattern, decision, requirements, drivers, target components, required evidence and current verification state. It works in flat and module output; a scoped export reads only its supplied component targets.

The execution-agreement section also explains the linked read task, accepted approach, required freshness, current support and any missing or conflicting declarations. The 30-second/5-second conflict therefore stays visible in the design document.

Verification states preserve their existing meaning: **Current verification recorded** describes a current architect-recorded evidence review. It does not mean AIW ran or certified an implementation test. Changed support or evidence reopens review while the original accepted receipt remains historical.

## 5. Refinement within the existing model experience

The pass fixes specific continuity and accessibility gaps within the existing model surfaces:

- Model details distinguish business, quality, constraint, data and operational drivers. A business driver is no longer presented as an incomplete numeric quality scenario.
- Current hard-constraint failures are shown as exclusions. An assessment made against an earlier basis is shown as requiring review; its earlier evidence and judgment remain historical.
- The journey's quality-target action opens the relevant quality driver in a mixed set, rather than the first driver in the list.
- Arrange selection, clearing, releasing pinned elements and undo restore keyboard focus to the appropriate live control, or to the Arrange trigger when that control becomes disabled.
- Diagram exports use the originating document, diagram, geometry and filename together. PNG image decoding and canvas encoding callbacks cancel output after the relevant project, revision, selection, route or diagram context changes, and release their image URLs. A failed PNG decode offers a retry action.
- The existing editable formats, synchronous file-set API, SVG export and Manifest remain on their established model-view loading path. The format generators were already outside chapter opening, so a proposed extra loading layer was removed after measurement showed it added chunks without improving that gate.

The existing controls remain: Smart arrange, alignment, distribution, matching sizes, snapping, pinning, reset sizes, undo, Fit whole, Fit selection, Readable view, 100%, zoom, pan and Table/Matrix Fit width. Arrangement changes presentation preferences; architecture grouping continues to follow saved layers, boundaries and relationships. The rc34 continuity refinements for per-view scale/scroll, held hidden subjects, saved perspectives and cancelled gestures remain in place.

No stylesheet layer, separate decision register or new navigation workspace was added. The canonical requirement/model context was extracted without changing its output: 27 basis cases and 14 context cases match the previous release exactly.

The exchange model previously imported the full anatomy geometry engine just to order its objects. Its unchanged ordering helpers now live in the shared anatomy model; geometry stays with the existing deferred anatomy view. The original layout exports remain compatible. Before/after comparisons retain 252 complete layouts, four exchange projections and 928 routes exactly.

The final production build loads **3,101,082 bytes** of chapter-opening code against the unchanged **3,109,888-byte** limit, with **146 scripts** and **837,537 bytes** of CSS. Chapter opening is 8,749 bytes smaller than rc34. These are build measurements, not browser latency measurements. The packaged Worker resolves 237 server modules and verifies its compressed/plain asset responses and revalidation behavior.

## 6. Verification and remaining acceptance

Exact command outcomes and production size measurements are recorded in [verification.json](audit/studio-refinement/verification.json), with the detailed focused gate and client-size report beside it. The checks cover authored domain journeys, typed native fields, source closure and exclusion, changed-source review, native DOM behavior, deterministic diagram geometry, code exports and the packaged private Worker. The complete historical test corpus is not represented as rerun.

Happy DOM's authored selected-option attributes are restored by the established test harness. That accommodation is explicitly documented in the tests; it is not a production form workaround or browser-rendering evidence.

**Rendered browser, mobile and touch acceptance remain unperformed.** The supported browser-control capability was absent. The Sites workflow requires skipping an improvised browser path in this managed environment. Native DOM and geometry checks do not establish pixel quality or cross-browser behavior.

**Live-provider architectural quality remains unmeasured.** No authorized live customer-session route was available for this pass. The source-packet and authored-response checks demonstrate workflow, provenance and safeguards, not the quality of a live model's answer.

**Orbus remains a quality target.** A rendered task comparison on representative customer models is still required before claiming parity or superiority.

The earlier unrelated SDD module fixture mismatch remains documented in `audit/studio-refinement/rc34-sdd-baseline.log`: its section-5 assertion expects only five C4 headings, although the unchanged baseline also includes eight chapter-model headings. The rc35 journey separately verifies current obligations and execution content in flat and scoped module output.

The publication receipt and matching Git source archive identify the delivered commit. `SOURCE-MANIFEST.json` verifies every included source file; its commit field is the checkout parent at generation, avoiding a self-referential commit hash.
