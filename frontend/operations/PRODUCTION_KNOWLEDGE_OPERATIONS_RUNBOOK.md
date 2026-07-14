# Production Knowledge Operations Runbook

## 1. Prepare infrastructure

1. Provision PostgreSQL 17 with the pgvector extension.
2. Create a dedicated AIW database and application role.
3. Apply `database/schema.sql` or migrations in sequence through `007`.
4. Provision a private S3-compatible bucket with versioning, encryption, blocked public access and lifecycle retention.
5. Provision a secrets manager for provider keys, GitHub token/App credentials and Ed25519 signing key.

## 2. Configure the LLM Brain

Choose one route per purpose and optional fallback routes. Set `AIW_LLM_CONFIG_JSON` to the governed policy. Do not include key values in the JSON; include only environment-variable names. Inject actual secrets at runtime.

Before enabling a route:

- Validate account/region/data-processing posture.
- Confirm the selected model is available.
- Restrict allowed data classifications.
- Run `/api/llm-brain/active-probe` with public data.
- Record architecture and security approval.

## 3. Configure GitHub acquisition

1. Prefer a read-only GitHub App for organization-owned repositories.
2. For external public sources, use a read-only token only when higher rate limits are required.
3. Set `AIW_ENABLE_GITHUB_KNOWLEDGE=true`.
4. Start with the approved pilot connector list.
5. Execute a manual refresh and inspect manifest/quarantine results.
6. Enable scheduled refresh only after the first review succeeds.

## 4. Enable live extraction

Set:

```text
AIW_ENABLE_LLM_EXTRACTION=true
AIW_EXTRACTION_MAX_FILES_PER_REFRESH=20
AIW_EXTRACTION_FAIL_FAST=false
```

Extraction creates candidate claims only. Review source locations, conditions, limitations, provider/model audit and contradictions before promotion.

## 5. Build the approved vector index

1. Publish or select an approved knowledge release.
2. Set `AIW_ENABLE_VECTOR_INDEXING=true`.
3. Configure an approved embedding route, or use deterministic mode only for development verification.
4. POST to `/api/knowledge-vector/reindex` with the release ID.
5. Run relevance and tenant-isolation checks.
6. Pin production recommendation retrieval to that release ID.

## 6. Deliver fitness functions

1. Configure the target repository binding.
2. Set `AIW_ENABLE_REPOSITORY_WRITES=true` only for the controlled delivery job.
3. Use a short-lived repository token.
4. Generate and inspect the bundle.
5. Open a pull request; never push directly to the protected branch.
6. Add project-specific commands and result adapters.
7. Configure `AIW_CONFORMANCE_URL` and token/workload identity in CI.
8. Confirm evidence reaches AIW and findings map to the expected design objects.

## 7. Sign and verify a release

Generate the Ed25519 key outside the repository. Mount the private key read-only and set `AIW_RELEASE_PRIVATE_KEY_PATH`. Sign the immutable release JSON. Transfer the release, signature and public key to an independent host and run the verifier. Publish only after the independent checksum and signature pass.

## 8. Incident actions

- **Suspected repository compromise:** suspend connector, retain snapshots, block proposals and pin the last approved release.
- **Provider compromise or policy breach:** disable route, open circuit, revoke key and use approved fallback only after review.
- **Snapshot secret finding:** keep file rejected, notify source owner and never persist or extract the content.
- **Vector poisoning:** disable search, drop/rebuild affected release index from signed approved records.
- **Invalid release signature:** block promotion, investigate key/release provenance and rotate the signing key if required.
- **False conformance finding:** mark false-positive with evidence; do not delete the original evidence envelope.

## 9. Required production acceptance tests

- Cross-tenant RLS denial for every Sprint 7.9 table.
- Object-store encryption, versioning and restore.
- Real GitHub refresh against each pilot connector.
- At least two provider routes and one controlled fallback.
- Approved-release vector reindex and search relevance.
- Fitness pull request and CI evidence round trip.
- Runtime/OpenTelemetry drift ingestion.
- Independent Ed25519 verification from a separate host.
