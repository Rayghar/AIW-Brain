# rc.10.71.0 Known Limitations

## Source intake

1. Binary XLSX ingestion is not enabled. Requirements registers should be exported as CSV.
2. Scanned or image-only PDFs are not OCR-processed; a text-enabled PDF or source document is required.
3. DOCX extraction currently focuses on raw textual content. Complex layout, embedded diagrams, tracked changes and semantic table reconstruction are not fully preserved.
4. The extraction endpoint has a 7 MB per-file limit and the distillation request accepts at most twenty sources.

## Requirements intelligence

5. Duplicate and contradiction handling is an initial deterministic implementation, not a complete atomic-claim semantic diff and adjudication workspace.
6. Requirements-health scores are decision support, not proof that a specification is correct or complete.
7. The optional live LLM route was not rerun inside the final packaging environment. Deterministic and hybrid authority contracts were tested.
8. Inline editing before acceptance remains more complete for textual requirements than for every complex structured field.
9. Semantic downstream staleness is not yet granular at every individual field and interaction; revision-level protection is authoritative in this release.

## Journey modelling

10. Journeys support semantic happy, alternate, failure and recovery paths, but advanced branch authoring, loops, timing constraints, BPMN editing and interactive simulation remain open.
11. Mermaid, PlantUML and Structurizr dynamic-view exports are not complete in this increment.
12. The initial journey templates are strongest for transactional and agency-banking-like flows; broader-domain calibration remains necessary.

## System Context and lifecycle

13. System Context is a distinct lifecycle stage in the UI and intelligence model, while some inherited project-stage storage remains mapped through backward-compatible logical-application structures.
14. The System Context preview is not yet a directly editable React Flow canvas.
15. Journey-to-logical-responsibility, interface and component co-creation is foundational rather than complete.
16. Security, data and resilience overlays are obligations and annotations, not yet full first-class design models in this increment.

## Knowledge and validation

17. `CAMBRIDGE-SA-1.0` is an initial executable subset for Architecture Genesis. Full source-by-source, claim-level operationalisation, independent approval and release calibration remain open.
18. The programme-wide 396-requirement implementation/evidence audit is not complete.
19. The Agency Banking golden benchmark, blinded comparison and independent expert review have not been executed.
20. AIW has not yet proven superior architecture outcomes on authorised enterprise initiatives.

## Engineering and production acceptance

21. The production bundle still reports large-chunk warnings: product shell approximately 655.51 kB and artifact core approximately 1.752 MB minified.
22. Chromium acceptance was executed at 1600×900 and 1100×760. Edge, Firefox, WebKit, keyboard-only, screen-reader, 200% zoom and WCAG 2.2 AA acceptance remain open.
23. Large-model acceptance at 1,500 nodes and 5,000 relationships remains open.
24. Managed identity, PostgreSQL tenant RLS, durable queues, object storage, KMS signing, telemetry and backup/recovery require external enterprise acceptance.
25. `productionAccepted`, `expertOutcomeValidated` and `controlledEnterprisePilotCompleted` remain false.
