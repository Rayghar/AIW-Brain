# AIW · Architecture intelligence throughout the design journey

Release target: **AIW v0.10.0-rc.10.73.31+intelligence.20261020**  
Baseline: **AIW v0.10.0-rc.10.73.30+drivers.20261020**

**Verification:** the focused checks and complete production build described below have passed. The packaged Worker, client assets and original size/request-count gates have been verified. The separately issued publication receipt identifies the deployed version and exact source commit; this document records implementation and build evidence.

## What this change addresses

The preceding release connected architecture drivers, conditional design methods, logical placement, product configuration and accepted solution traces. The supplied repository contained additional structured knowledge that the chapter journey did not consistently use: conditions, prerequisites, exclusions, declared pattern relationships, component and interface roles, quality considerations, and verification hints. Several guidance surfaces still assembled their own narrower readings.

This release introduces one derived architecture reading over the current project and the existing knowledge supply. A chapter, its Companion, the validation workspace and an LLM request can now refer to the same design question and its source basis. The reading does not own a second project model. Editing, comparison, preview, acceptance and review continue through the existing commands and saved records.

The practical sequence is:

1. Resolve the selected requirement, driver, responsibility, component or operating option and its positively linked architectural intent.
2. Retrieve relevant source records using explicit identities and source-backed descriptive signals.
3. Distinguish an editorial consideration from a reviewed claim with executable, typed conditions.
4. Expose a question, missing condition, conflict, alternative or verification obligation in the current chapter.
5. Continue through the native editor, source reader, guided comparison or saved proposal.
6. Recheck the reading when the project facts, supporting source or interpretation changes.

This supplies architecture reasoning during the work. It does not turn every repository record into an approved design recipe or treat a relevant term as evidence of suitability.

## One shared reading

`public/architecture-intelligence.js` provides `architectureContext`, `architectureIntelligence`, its bounded source representation, and its currentness check. The result identifies the selected subject, linked requirements and drivers, source-backed insights, exact source references, native actions and a receipt for its captured basis.

The reading combines several existing capabilities:

| Input | What the reading can establish | What remains open |
| --- | --- | --- |
| Saved project records and positive driver scope | Which intent and declarations belong to the selected boundary; which recorded decision violates a hard constraint | Whether the declaration is correct or the implementation meets it |
| Editorial Pattern DNA | Conditions to examine, named complementary or conflicting concepts, possible roles, alternative approaches and verification questions | Project applicability, deployment topology and quality outcomes |
| Active, eligible reviewed claims | The exact reviewed interpretation, passage, source revision and typed conditions | Facts that have not been supplied and evidence of an implemented outcome |
| Typed project or option facts | A condition is consistent with declared context, missing, or explicitly contradicted | Measurements and operational proof unless independently recorded |
| Applied architecture solutions | The accepted placement and pending obligations already carried by the native task and specification | Verification, source reassessment and governance approval |

An unknown fact remains unknown. An explicit `false` or `0` remains a supplied value. Conditions are evaluated for the relevant operating option, including its own product identity and configuration; one option cannot borrow another option's configuration to obtain a positive finding. Product aliases use the existing canonical product identity function.

The new reading reuses the existing applicability evaluator, driver scope, decision reading, method receipts and accepted solution obligations. It does not introduce another mechanism evaluator, preference score or model mutation route. A conditional match is described as a match to the recorded context, with implementation and outcome verification still pending.

## Brain, repository, MindFactory, Pattern DNA and the LLM

| Capability | Responsibility in this implementation |
| --- | --- |
| **AIW Brain** | Reads the canonical project scope, retrieves relevant knowledge, assembles the current design question and retains its source and basis receipts. It connects the same question to chapter guidance and provider context. |
| **Knowledge Repository** | Supplies the existing lazy catalogue and eligible reviewed releases. Acquisition, exact passages, independent review, release, activation, withdrawal and change notices continue through the existing repository and governance lifecycle. |
| **MindFactory / guided design** | Turns a question into an editable comparison or proposal in the existing journey. Conditions, alternatives, placement and verification remain attached to the task and accepted design. |
| **Pattern DNA** | Supplies declared prerequisites, exclusions, relationships, roles, quality considerations and test hints. Its editorial relationships inform questions and comparison; they do not automatically add components or establish fit. |
| **LLM / Sol** | Explains, drafts and compares from a bounded disclosed packet. It receives the current scoped reading with its supporting sources when that complete basis fits. Model commands and review gates remain responsible for changing the saved design. |

For example, a repository relationship between a retry policy and repeat protection can prompt a question about business-effect safety at a particular caller boundary. A reviewed typed condition can then distinguish an explicitly repeatable operation from an unknown or contradictory declaration. The relationship alone cannot prove that the chosen retry policy is safe. The architect still supplies the boundary facts and uses the native proposal and verification process.

## Exact accounting of the supplied AKR material

The importer continues to generate the **same lazy catalogue module**. It now preserves additional source fields that were previously absent from the runtime projection, including category, applicable design stages, qualitative impacts and fitness-test hints. The normalizer in `public/knowledge-structure.js` exposes these fields with their exact source-field locations and receipts.

AKR's **1,326 knowledge objects** are accounted for as follows. The 328 DNA projections in the object file correspond to the same 328 catalogue records; these counts must not be added as though they represented separate knowledge sets.

| Supplied material | Count | Runtime treatment |
| --- | ---: | --- |
| Pattern DNA catalogue | 328 | Existing catalogue records, enriched in place: 240 patterns, 30 anti-patterns, 24 templates, 20 archetypes and 14 styles |
| Duplicate DNA/style/anti-pattern projections within the knowledge-object file | 328 | Reused through those catalogue identities; no duplicate import |
| Editorial lineage claims within the knowledge-object file | 984 | Their claim identities remain linked through the DNA lineage. The importer checks complete identity coverage. Their statements are not bulk-imported as active project claims or executable rules. |
| Atomic source-claim seeds within the knowledge-object file | 14 | Exact archive objects retained as **discovery-only review leads** in the same lazy supply, with their statements, polarity, conditions, limitations and provenance |

All 328 original full-record hashes and pointers are retained. The source projection preserves the publisher's file and manifest identities. Shared generated literals are interned losslessly and recursively frozen; this reduces bundle size without changing the exported records or permitting shared mutable state.

The 14 atomic seeds require special care. The archive records seed provenance, but it does not supply a retrievable original at an immutable revision with a verified passage hash for each seed. The discovery UI therefore shows the exact archived assertion and its limitations, and can prepare the existing acquisition form with the known connector and path. The immutable revision and passage hash remain unresolved. A seed does not enter generic reasoning sources, become a reviewed claim, or gain a score by being discovered.

The key archived identities are:

| Source identity | SHA-256 |
| --- | --- |
| Existing AKR catalogue source | `bdfb8975f8e1fad42ef30133c56413dfe3c9b385b49e7101b82555927ea919d6` |
| AKR release manifest | `c30e78c5249e7620b980079c2bbab8693a0c357301e305d4cf81db9333a44839` |
| `AKR-0.10.73.5/KNOWLEDGE-OBJECTS.json` | `68b03987ec4d161e67df84cfcb3201a7268d43d8a387fb714473a727742f96d0` |

Each atomic lead additionally retains its exact `/objects/N` pointer and object hash. Every normalized condition, obligation and verification hint points to its source field. Declared relations preserve their full short identifier lists in the bounded source representation so every relationship exposed by a reading is supported by the retained declaring source.

Existing curation marks remain effective. A named relationship whose target was not included in the archive remains an unavailable stub. It does not acquire an invented definition. Relationships are expanded one hop from explicit anchors; a related concept does not become another project-intent anchor.

## Reuse of the second-brain handoff

The current Node repository service already implements the principal acquisition, review, release and synchronization functions represented by the supplied Python pilot. This release reuses that service and its adapter instead of installing a second repository application or executing scripts from the handoff archive.

The actual supplied pilot packet contains **24 source files and 149 candidate passage records**. `repository-packet.js` now retains the exact passage identifiers, line ranges, excerpt hashes, source commits, file and manifest hashes, and original discovery cues in its read-only preview. A cue resolves to a catalogue concept only through the exact canonical concept identity; a display label cannot supply that identity.

These records remain unreviewed, unreleased and ineligible. The adapter does not emit a placeholder candidate statement as an architecture fact. Existing tenant, project, size, cursor, notice-range and identity checks remain in force.

The lifecycle is still explicit: discover a lead, retrieve the versioned original, preserve the exact passage, interpret its conditions and limits, independently review the interpretation and reuse rights, release it, and activate the eligible release. A later withdrawal or source change removes current support while retaining the historical record. Neither a packet preview nor a catalogue badge skips that process.

## Positive scope and source currentness

All eight architectural driver kinds participate in the canonical scope. Quality scenarios keep their numerical fields. Business, functional, constraint, operational, data, technology-evolution and business-continuity drivers retain their own description and impact; a numerical target is not invented for them.

A selected requirement or responsibility keeps its own upstream intent. Sharing an implementation component with another requirement does not import that other requirement's drivers by walking down to the component and back up again. Selecting the shared component itself legitimately exposes the requirements and drivers it must realize. A driver linked directly to the component is additive where that explicit scope applies. Group links continue through the canonical requirement-group resolver.

The derived receipt records the model basis, knowledge supply, structure version and interpretation revision. A source claim, catalogue concept or release withdrawal invalidates dependent readings. An obsolete method interpretation also requires review even if the publisher's original bytes have not changed. Original source hashes are never rewritten to stand for executable interpretation changes.

Drafting or answering the task suggested by a reading does not invalidate that reading merely because a draft task now exists. Applied tasks that supply solution obligations remain real dependencies. Changed support does not erase an adopted decision or silently refresh its approval; it leaves the earlier trace available and asks for a current review.

## Existing user-interface surfaces

The implementation adds source-backed questions and actions to the current chapter header, Work and Model guidance, Co-design, Validate and Output. The same insight identity and receipt are available in the existing “why” and source disclosures. Sources open at the exact catalogue record or reviewed passage; unavailable references lead to an honest source state.

Actions use native commands and routes: open a saved record, inspect a source, continue a saved task, or enter an existing comparison. Before an asynchronous action proceeds, its project, selected context and captured basis are rechecked. Detached buttons, changed sources and navigation changes cannot launch stale actions. Existing unsaved-answer and comparison-step guards are retained.

Loading the full knowledge workspace is deferred to its existing disclosure. Saved design provenance and cursor explanations remain synchronous project readings. The full design-task UI now loads through the existing readiness function when an architect opens it. Disposal or a project/context change cancels a pending load. The shell reads the actual loaded task's busy state and disposes it with the project. Editing a saved proposal reopens the native design task only while the captured proposal and host are still current.

The loading changes preserve the original client budgets. No data store, navigation destination or larger bundle allowance is introduced.

## Provider packets and disclosure

Native guidance, Brain retrieval and provider contexts consume the same normalized source representation. Reviewed claims preserve their conditions, limitations and original passages; editorial sources identify their lesser authority. Generic source examples cannot supply a customer's numerical target.

A derived insight is packed with its complete retained source dependencies. If a complete bundle cannot fit the existing source and character bounds, the packer reports omissions instead of retaining an unsupported conclusion. Exact source references are validated at the provider boundary. The selected record and required project evidence remain distinct from a general repository reference.

Exclusion applies to nested records as well as top-level objects. In the tested parent-realisation case, excluding one operating option removed its title, identifier and private rationale from the packet and withheld readings that depended on it. A derived source cannot reintroduce a hidden option through its dependency references.

## Verification recorded at this checkpoint

The following are observed results from this implementation session. They are not claims of a rendered browser review or a production-provider evaluation.

| Command or check | Observed result |
| --- | --- |
| `node knowledge-structure-validate.mjs` | Pass: original record identities, exact conditions and relation support, immutable generated sharing, 14 seed objects, reviewed-claim lifecycle, withdrawal and no mutation |
| `AIW_PACKET_PATH=<supplied-packet.json> node repository-packet-validate.mjs` | 19/19 pass against the actual 24-source metadata packet |
| `node architecture-intelligence-validate.mjs` | 7 groups pass: positive scope, generic retrieval and all chapters, typed facts and option isolation, source relationships, applied obligations/currentness, nested exclusions |
| `node embedded-intelligence-validate.mjs` | 5/5 pass |
| `node intelligence-validate.mjs` | 11/11 pass using both provider doubles |
| `node field-spark-validate.mjs` | 23 checks pass |
| `node journey-drafter-validate.mjs` | 21 checks pass, including three briefs through all eleven chapters and model imports |
| `node brain-integration-validate.mjs` | Pass |
| `node brain-reasoning-validate.mjs` | 8 groups pass |
| `node brain-synthesis-retrieval-validate.mjs` | Pass |
| `node intelligence-continuity-validate.mjs` | Pass |
| `node chapter-reasoning-validate.mjs` | 12 groups pass |
| `node driver-applicability-validate.mjs` | 7 groups pass, including shared-component and component-only driver scope |
| `node contextual-intelligence-ui-validate.mjs` with the supplied packet fixture | 7 groups pass: native disclosures/actions, stale and dirty guards, exact 24-source/149-passage preview, 14 seed leads, and no saved writes or generation requests |
| `node co-design-guide-validate.mjs` | All eleven chapter checks pass |
| `node design-task-ui-validate.mjs` and `AIW_BLANK=1 node design-task-ui-validate.mjs` | Both pass: lazy first open, disposal/project cancellation, native task flow, proposal acceptance, saved provenance reopening, kind-aware source review and unsaved-input handling. The reference flow explicitly reviews its newly applicable driver while retaining the adoption. |
| `node architecture-knowledge-unit-validate.mjs` and `node architecture-evaluation-validate.mjs` | Pass: knowledge-unit contracts and typed architecture evaluations |

Independent packet probes retained complete source-reference closure for main guidance and review chapters 2, 4, 5 and 7 after loading the catalogue. The chapter 7 probe retained a derived reading within the original 48,000-character cap. Some larger record readings are deliberately omitted when their complete supporting basis does not fit; the omission is retained in coverage rather than presented as a complete assessment.

The final production build passed its 233-module Worker import graph, packaged import and plain/gzip/ETag asset checks. It contains 146 scripts and one stylesheet, with approximately 8.85 MB of embedded assets and 3.58 MB after gzip. The final client report records 3,085,821 bytes of chapter-opening code against the unchanged 3,109,888-byte cap; 146 scripts against 146; 61 scripts below 10 KB against 61; 836,993 stylesheet bytes against 837,632; and a 1,523,095-byte catalogue against the 1,576,960-byte data cap. No budget violations remain. The release owner also verified syntax for 802 JavaScript modules, parsed both Python importers and passed the final whitespace/diff check. Machine-readable evidence is retained in `audit/embedded-intelligence/verification.json` and `audit/embedded-intelligence/client-size-report.json`.

**Verified source-currentness case:** in the reference separate-coordinator proposal, attaching ADR-003 to the new coordination responsibility makes QD-004 newly relevant to REQ-001 through that responsibility and its coordinator component. QD-004 was absent from the original captured driver set. AIW retains the adopted design and asks for explicit source review of that new obligation. The native DOM/Worker test records that review, resumes the accepted trail, and verifies that the original basis, adoption receipt and accepted records were neither rewritten nor reapplied. This is intentional scope currentness after a real new relationship, not a failed adoption.

## Limits and follow-up responsibilities

- The shared reading is a bounded architecture aid. It is not a complete automated architecture synthesis or verification engine.
- Descriptive DNA, the 984 editorial lineage identities and the 14 archive seeds have not been promoted into universally applicable engineering rules. The 984 statements remain lineage-only; the 14 seeds still require immutable original acquisition and independent review.
- A reviewed claim can be current and conditionally applicable while its engineering outcome remains unverified. Source authority, project suitability, working-design adoption and governance approval remain distinct.
- Full catalogue retrieval uses the existing lazy-loading seam. A reading made before that supply arrives discloses the coverage limit and can refresh when the catalogue becomes available.
- The checks used synthetic project facts and in-process DOM/Worker integration. No fresh rendered desktop/mobile browser review was performed in this environment, and no live LLM provider was used to validate the release. Historical screenshots do not establish the appearance of this revision.
- The supplied repository artifacts do not contain every referenced upstream original or a complete immutable evidence store. The UI exposes those gaps through the existing acquisition/review path.

Implementation references: `public/architecture-intelligence.js`, `public/driver-scope.js`, `public/knowledge-relevance.js`, `public/knowledge-structure.js`, `public/architecture-brain.js`, `public/intelligence-context.js`, `intelligence-service.js`, `intelligence-provider.js`, `repository-packet.js`, and `scripts/import-brain-catalogue.py`. The previous release's driver-led mechanisms, product configuration and accepted solution trace are described in `DRIVER_LED_DESIGN_RELEASE.md`.
