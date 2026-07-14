# rc.10.73.6 Known Limitations

1. The build container cannot resolve GitHub hosts, so live immutable snapshots remain 0/30.
2. User authority does not supply a GitHub token, GitHub App installation or enterprise secret-manager binding.
3. Repository licence API evidence is not a legal approval. Path-specific notices and redistribution constraints still require accountable review.
4. Deterministic extraction creates candidate claims and does not replace LLM-assisted extraction or independent architecture review.
5. Candidate claims remain non-scoring and non-conformance until promotion and calibration.
6. A full TypeScript workspace rebuild could not run because installed workspace dependencies were absent and package-registry network access was unavailable.
7. Managed PostgreSQL/RLS, object storage, vector indexing, KMS signing and production worker scheduling require target-environment acceptance.
