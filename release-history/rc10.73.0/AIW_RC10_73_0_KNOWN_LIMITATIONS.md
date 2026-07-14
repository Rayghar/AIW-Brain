# rc.10.73.0 Known Limitations

1. **Compatibility projection remains.** The Design Graph is generated from accepted `ArchitectureProject` state. It is not yet the only write model.
2. **Materialisation is a foundation, not full migration.** Materialisation changes the graph posture to `materialized-canonical`, but existing feature commands still update legacy project fields before repository synchronisation.
3. **Parallel stores remain.** Decision, finding, review, synthesis and reasoning-run stores have not all been replaced by graph-backed repositories.
4. **Hash is deterministic, not cryptographic.** FNV-1a is used for fast state identity and freshness checks. Signed release manifests and enterprise KMS remain the trust mechanism for release authenticity.
5. **Repository transaction depth differs by adapter.** PostgreSQL uses transactions; in-memory and MongoDB preserve their existing adapter semantics.
6. **Materialisation authority uses `project.edit`.** Independent reviewer segregation and a dedicated graph-promotion permission remain future governance work.
7. **No automatic repair.** Integrity failures block materialisation but are not automatically remediated.
8. **Frontend acceptance depends on installable packages.** The packaged source and compiled output are provided; fresh installs require access to the configured npm registry.
9. **Production acceptance remains false.** Managed identity, RLS, KMS, durable queues, object storage, telemetry, live provider evaluation and enterprise pilot gates are not completed by this release.
