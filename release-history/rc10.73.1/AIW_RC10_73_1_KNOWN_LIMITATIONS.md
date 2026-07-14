# rc.10.73.1 Known Limitations

1. **Migration scope is deliberately bounded.** Graph-primary authority covers requirements, evidence, interfaces, decisions, findings and risk-bearing requirements. It does not yet cover every architecture object or workflow domain.
2. **Compatibility fields remain.** Existing consumers still read `requirementsIntelligence`, `interfaces`, `decisions` and `findings`. They are reconstructed projections after migration, not yet removed API fields.
3. **The compatibility adapter is transitional.** Legacy writes are translated into graph records and counted, but feature commands should progressively move to native graph commands so the adapter can be retired.
4. **Parallel stores remain.** Review cases, synthesis alternatives, reasoning runs and some decision/finding workflows retain specialised repositories or ledgers.
5. **Risk is represented through risk-bearing requirements.** A separate first-class risk aggregate and risk-treatment lifecycle have not yet been migrated.
6. **Migration authority uses `project.edit`.** Dedicated graph-promotion and independent reviewer permissions remain future governance work.
7. **Graph-native state API updates aggregates, not granular graph operations.** Fine-grained add/update/remove commands and affected-subgraph events are later work.
8. **Hash is deterministic, not cryptographic.** Fast fingerprints support freshness and reproducibility. Release authenticity still depends on signed manifests and enterprise KMS controls.
9. **Repository transaction semantics differ by adapter.** PostgreSQL retains transactional behaviour; in-memory and MongoDB preserve their existing adapter semantics.
10. **No automatic repair.** Integrity, stale fingerprint and empty-command failures are blocked but not silently remediated.
11. **Production infrastructure is not accepted.** Managed identity, RLS, KMS, durable queues, object storage, telemetry, live provider evaluation and controlled enterprise-pilot gates remain open.
12. **External validation remains open.** The deterministic Sol calibration is retained, but live-provider comparison and blinded independent expert scoring are not completed.
