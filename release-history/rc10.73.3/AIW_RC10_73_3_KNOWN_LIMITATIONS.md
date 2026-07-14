# rc.10.73.3 Known Limitations

1. **Managed persistence is not accepted.** PostgreSQL/RLS and MongoDB adapters compile but were not exercised against managed services in this execution environment.
2. **Cross-repository atomicity is incomplete.** The transaction ledger is authoritative, but its event append and the legacy project review projection are not committed in one physical transaction when separate repositories are used.
3. **Legacy review projection remains.** Existing project review fields are retained for UI and downstream compatibility.
4. **Dedicated browser workflow remains.** The canonical transaction/review/waiver APIs are present, but no new end-to-end browser workspace is claimed in this release.
5. **Commit is governance recording, not arbitrary mutation.** Commit validates the current project revision, project/branch binding and semantic Design Graph fingerprint before recording approval. Mutation-specific change-set application remains governed by the existing graph command paths.
6. **Other specialist stores remain.** Synthesis alternatives, reasoning-run details and additional non-graph-primary domains still require consolidation.
7. **Managed identity and reviewer directory acceptance remain.** Reviewer separation is enforced by authenticated subject identifiers and permissions, but enterprise-directory integration is environment dependent.
8. **Live LLM and expert acceptance remain open.** No live provider or independent external expert result is claimed.
9. **Production acceptance remains false.** Enterprise KMS, managed queues/storage/telemetry, backup/restore and controlled enterprise-pilot gates remain open.
