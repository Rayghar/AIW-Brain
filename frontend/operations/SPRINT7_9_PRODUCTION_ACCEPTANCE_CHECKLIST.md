# Sprint 7.9 Production Acceptance Checklist

This checklist converts the delivered implementation into credentialed production evidence.

## A. GitHub and snapshot operations

- [ ] Install or authorize a read-only GitHub App/token.
- [ ] Enable `AIW_ENABLE_GITHUB_KNOWLEDGE=true`.
- [ ] Refresh each pilot connector.
- [ ] Confirm exact commit SHA, complete tree, path policy and file count.
- [ ] Confirm files and manifest are persisted in the private object store.
- [ ] Confirm an upstream change creates review-required candidate state only.

## B. LLM Brain

- [ ] Configure at least two approved provider routes.
- [ ] Verify each with `/api/llm-brain/active-probe` using public data.
- [ ] Force a primary failure and observe the approved fallback.
- [ ] Confirm restricted data is rejected by routes without permission.
- [ ] Run extraction on a quarantined snapshot.
- [ ] Confirm output is persisted as candidate claims and cannot enter the approved release automatically.

## C. PostgreSQL, RLS and vector retrieval

- [ ] Apply migration 007 to PostgreSQL with pgvector.
- [ ] Confirm all nine Sprint 7.9 tables have row-level security enabled.
- [ ] Attempt cross-tenant read/write and confirm denial.
- [ ] Reindex `AKR-0.8.9` into `approved_knowledge_embeddings`.
- [ ] Run semantic/lexical relevance scenarios and confirm release pinning.
- [ ] Perform backup and restore of database plus object-store manifest references.

## D. Fitness delivery and conformance

- [ ] Open a generated fitness-function pull request in a controlled repository.
- [ ] Review and merge project-specific execution changes.
- [ ] Execute CI and post evidence to AIW.
- [ ] Validate ArchUnit/jQAssistant/Spring Modulith or contract findings.
- [ ] Validate Terraform and Kubernetes findings.
- [ ] Import runtime/OpenTelemetry drift and trace it to the intended architecture.

## E. Release verification

- [ ] Generate/hold the Ed25519 private key in an enterprise secret manager or HSM boundary.
- [ ] Sign the immutable release.
- [ ] Transfer release, public key and signature to an independent host.
- [ ] Verify checksum and signature.
- [ ] Modify a copy and confirm verification fails.
- [ ] Register the approved public-key ID in the release trust store.

## Acceptance decision

The Sprint 7.9 implementation may be promoted only when all mandatory controls above have evidence, owners and exception expiry dates. External provider/repository access must remain disabled in environments that have not completed acceptance.
