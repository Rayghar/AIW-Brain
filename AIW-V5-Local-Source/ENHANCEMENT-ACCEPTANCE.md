# AIW connected architecture journey — release acceptance

Release candidate 41 · 23 September 2026

The implementation starts with the unfinished pre-SEABaaS roadmap and uses the workbook as a real workload. It extends the existing eleven chapters, Work / Model / Validate / Output, Sol, Mind Factory and Cursor. Imported assertions, design acceptance, independent review and production observations remain separate records.

## Implemented scope and where it lives

| Capability | Delivered behaviour | Entry point |
| --- | --- | --- |
| Native requirements intake | XLSX upload; sheet/header/column mapping; 27 source columns retained; immutable original bytes, source versions and cell references | Chapter 1, Import requirements workbook |
| Safe re-import | Stable external identities, unchanged detection, per-record source conflicts, reviewed application and revision concurrency protection | Intake preview and re-import |
| Large requirement registers | Paged lists/findings, domain summaries, bounded graph projection, indexed search; segmented storage reuses unchanged chunks | Chapter 1 register/model and requirement API |
| Typed assurance | Capability/value, promise, change request, test result, defect, runtime observation and ethos assessment; source-sensitive history | Sol assurance context |
| Source contradictions | Source status conflicts, assurance gaps and repeated-statement candidates remain visible | Chapter 1 analysis and source inspector |
| Guided chapter continuity | One active question, prior open loops, answered/draft/review/accept steps, Met/Partial/Refused dispositions across all eleven chapters | Sol |
| Draft continuity | Companion text survives panel/context rerenders in the session; unsaved-page warning | Existing companion forms |
| Consistent Brain grounding | Original passages, source-scoped retrieval, explicit omissions, deterministic prerequisite blockers and second source checks for every provider mode | Sol / Mind Factory / Cursor |
| Existing architectural reasoning | Styles, patterns, tactics, mechanisms and compound proposals remain connected to project scenarios, component roles, obligations and traceability | Existing architectural design and composition flows |
| Ordinary edit review | Changed definitions, linked downstream work, explicit acceptance and retained rationale | Existing editors |
| Alternatives and merge | Named draft changes, independent snapshots, rebasing, field conflicts, keep-current/use-proposed resolutions, applied/set-aside history | Mind Factory |
| Canvas authoring | Draw reviewed connections in Chapters 4–6; create logical responsibility boundaries in Chapter 4 | Model canvas controls |
| Cross-model analysis | Boundary overlap candidates, dependency cycles, shared-component consequences and failure-domain inspection | Chapter-context companion |
| Whole-life cost | Comparative inputs for recurring cost, migration and exit; explicit currency/horizon/assumptions | Chapters 3 and 7, Mind Factory |
| Versioned project libraries | Technology, control, runbook and drafting/document templates; source-bound review eligibility, lifecycle status and retained revisions | Mind Factory |
| Contract exchange | OpenAPI 3.1.x and AsyncAPI 3.0.0 JSON import; original specification retained; mapped participants and draft contracts/payloads; original/model export | Chapter 8 |
| Nested data contracts | Bounded schema/sample validation, unsupported-keyword disclosure, schema comparison and JSON-pointer field lineage | Chapter 8 |
| Original attachments | Private original bytes with SHA-256, source excerpt or labelled non-text description, authenticated ownership and download isolation | Sol, attach evidence |
| Environment and capacity analysis | Environment comparison, capacity sensitivity with declared inputs/formula, saved assumptions and stale-source detection | Chapter 10 |
| Rollout and handoff | Walk through saved rollout steps; export a declarative design handoff with unresolved decisions | Chapter 10 |
| SDD review packs | Offline Word/PDF output, source-linked chapter registers, guidance, assurance and authenticated review appendix | Chapter 11 |
| Baseline comparison | Object field/relationship differences between the selected baseline and working graph | Chapter 11 |
| Delivery exchange | Portable JSON export and reviewed idempotent observation import linked to requirement IDs | Chapter 11 |
| Review queue | Consolidated findings/actions with ownership and due dates | Chapter 11 |
| Account-bound review | Owner/editor/reviewer/viewer roles, assigned scope, authenticated outcomes/discussions, revision conflicts and stale-scope rejection | Chapter 11 review assignments |
| Project lifecycle | Rename, archive, restore and reusable project templates; fresh projects reset evidence and prior approval authority | Projects |
| Named perspectives | Save and restore model location/view preferences within the project | Sol / existing model context |
| Shared storage safety | Revision-checked updates, atomic local transactions, private attachment/index ownership checks, migration-backed persistence | Backend |

## Verification completed

- All **33 pre-existing regression suites passed**, covering Chapters 1–11 and architecture/Brain/composition/source-grounding behaviour.
- **14 new integration groups passed**, covering reviewed changes, alternatives/rebase/conflicts, all eleven guided chapters, graph analysis/formulas, catalogue eligibility, standards/schema handling, assurance/delivery exchange, template resets, project roles, assigned reviews, attachments, lifecycle and concurrent saves.
- Actual workbook acceptance imported **1,400 requirements**, retaining **all 27 columns**, unique external IDs and original cell references. Re-import preserved IDs; source-change conflicts and manual edits retained provenance. The filtered indexed query returned the expected records.
- The source workload exposed **360 delivery gaps**, **20 additional assurance gaps** and **103 repeated-statement groups**. Repeated statements remain candidates for human review, not automatically merged requirements.
- Native DOM integration exercised XLSX file selection, header mapping, 1,400-row preview/application, original cells, ordinary-edit review and opening the cost comparison against real SQLite/file-backed API storage.
- Existing composition DOM integration passed the diagram, alternatives, preserved drafts, acceptance and source-bound measurement flows.
- A live OpenAI request returned a source-grounded draft, cited the supplied source and retained missing-owner/authority questions. The provider key was neither exposed nor packaged. This verifies a working provider request, not broad recommendation quality.
- Word and PDF fixtures rendered with Unicode currency/relationship text and readable page layout. Word tables retain table structure. These are focused export fixtures, not all possible user document lengths/glyph sets.

The workbook harness measured upload→preview→apply at approximately **1.18 s**, a single-record save at **0.67 s**, reload at **0.19 s** and a filtered page at **2 ms** on the local Node 24 test runtime. These are measurements of that workload/environment, not hosted latency commitments. The full harness held multiple project copies and reached approximately **389 MiB RSS**; it does not establish a hosted per-request memory bound.

## Explicit remaining boundaries

1. **Browser coverage:** the rendered desktop walkthrough reached project creation and the workbook uploader, then the browser file chooser stalled. The native DOM/import path passed separately. A complete rendered desktop/mobile journey is not claimed.
2. **Standards:** imports accept JSON OpenAPI 3.1.x / AsyncAPI 3.0.0. The bounded schema engine checks supported structural assertions; unsupported assertions and unresolved references prevent a verified-pass claim. YAML, the complete standards test suites and external-reference resolution are not implemented.
3. **Knowledge:** source and eligibility controls are implemented. The complete recovered repository catalogue has not been independently reviewed, calibrated or certified. Descriptive catalogue entries do not become reasoning-ready by being imported. Live repository access remains dependent on configured services and source permissions.
4. **Delivery and operations:** JSON exchange is implemented. Live Jira/Azure DevOps/CI/telemetry adapters, ongoing repository refresh schedules and provider-specific executable IaC require separate service configuration and adapter work. The runtime export is an architectural handoff, not infrastructure provisioning.
5. **People and authority:** account-bound review works for accounts with project and Site access. No invitation or sharing expansion was performed. Local mode intentionally has one local architect identity; it cannot establish independent review by different people.
6. **Scale:** register/graph rendering and indexed queries are bounded, with chunked source storage. Full project hydration remains; no enterprise concurrency, very large graph, hostile-load or hosted-memory certification is claimed.
7. **Quality and finance:** topology, cost and capacity results are declared analytical assumptions. They require real measurements and qualified review before being treated as production behaviour or financial outcomes.
8. **Visual/document scope:** the established rail and object lens remain. This release adds context-sensitive modelling actions; it does not claim a full visual redesign, unlimited document pagination QA or arbitrary image/OCR interpretation.

The implementation gates listed above are delivered. External evidence, independent approval and the explicitly unimplemented adapters/standards work remain visible follow-on work rather than implied completion.
