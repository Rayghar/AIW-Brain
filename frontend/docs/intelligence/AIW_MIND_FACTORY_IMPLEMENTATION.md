# AIW Mind Administration and Knowledge Ingestion Factory

Sprint 8.9.5 turns the Intelligence Constitution into an operational factory. The factory does not make the LLM authoritative. It makes source intake, quarantine, claim extraction, normalization, contradiction/corroboration, release-impact preview and knowledge-pack activation inspectable and auditable.

## Pipeline

1. **Register source** in the Admin Control Plane.
2. **Capture pinned snapshot** with source id, provenance URL, commit SHA or content hash.
3. **Quarantine snapshot** before any claim can influence AIW.
4. **Extract candidate claims** as non-scoring, reviewer-required records.
5. **Normalize duplicates and synonyms** to prevent noisy knowledge growth.
6. **Detect contradictions** and split by context rather than deleting inconvenient claims.
7. **Calculate corroboration** by independent source lineage.
8. **Preview release impact** before promotion so recommendation movement is visible.
9. **Export/import signed knowledge packs** for Essential offline and Sovereign deployments.
10. **Trace stage-to-knowledge receipts** so every design-stage experience can say what knowledge powered it.

## Non-negotiable rules

- candidate claims are non-scoring. Candidate claims are always non-scoring.
- LLM extraction cannot approve, weigh, promote or mutate architecture.
- Release-impact preview is required before production promotion.
- Unsigned or checksum-invalid knowledge packs cannot activate.
- Stage intelligence must render receipts, release id and offline/online capability posture.

## Cambridge/SDD reference use

The Cambridge project and SDD materials are used as grammar references for stakeholders, motivations, wishes, concerns, drivers, decisions, assumptions, risks, scaling factors, trade-offs, components, interfaces, properties, composition and model views. They are not blindly copied into production knowledge. They enter through the same source/snapshot/claim/review/release path as any other knowledge source.
