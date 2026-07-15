# Knowledge Vault Production Architecture

Generated: 2026-07-15T18:51:52.811Z  
Release: AIW v0.10.0-rc.10.73.7  
Production accepted: **false**

## Decision

The 5,367,402,297-byte local acquisition vault is evidence infrastructure, not an application database and not part of the normal application distribution. Ordinary Brain execution is bound only to release-pinned approved metadata and approved retrieval indexes. Raw evidence is fetched lazily by a governed evidence reference when a reviewer or bounded transformation explicitly requests it.

The product owner deferred an independent backup and accepted the risk of loss or corruption of the local raw acquisition vault at 2026-07-15T18:51:52.811Z. `backupCompleted=false`; this is not a passed backup gate. The approximately 40 MB FULLDIST archive excludes the vault and cannot recover it.

## Enforceable storage boundaries

| Boundary | Stored material | Authority and access rule |
|---|---|---|
| Object storage | Immutable raw evidence, safe CAS, quarantine CAS, opaque diagrams/binaries, historical acquisition releases | Content-addressed objects; immutable revision and digest verification; quarantine is a separate restricted namespace; never traversed during ordinary Brain retrieval. Local filesystem is a development adapter only. |
| PostgreSQL or equivalent | Connector identity, repository identity, immutable revision, evidence references, claim/graph metadata, review and authority state, release pins, withdrawal dependencies | Transactional constraints, tenant keys and row-level security. A filesystem path is never an authoritative identity. |
| Candidate retrieval store | Candidate passages, embeddings, graph indexes and review queues | Candidate-only namespace; explicit opt-in for review; excluded from scoring, conformance, hard constraints and approved Brain routes. |
| Approved retrieval store | Approved claims, Pattern DNA, Architecture Genomes, rules, fitness tests and signed release-pinned indexes | Only independently reviewed, promoted and release-pinned records. Queries must include tenant and approved release predicates. |
| Canonical Design Graph | Evidence references, decision state and governed graph metadata | References evidence IDs and immutable provenance; does not copy raw repository payloads. Mutations remain transactional and human-governed. |

## Identity and retrieval contract

An evidence identity is a governed tuple containing connector ID, repository identity, immutable commit, source path, source range, content digest and object digest. Storage URI and local path are replaceable projections. They must not be used as source identity, authority, tenant identity or release identity.

The API `ProductionOperationsRepository` lists evidence metadata without calling the object store. `getEvidence(tenantId, evidenceId)` resolves a tenant-scoped metadata record and performs exactly one object-key fetch. The focused acceptance used an instrumented object store and observed zero object reads during metadata listing, one read during ID lookup and zero recursive raw-filesystem scans.

## Withdrawal and lifecycle

Source withdrawal marks the connector/revision unavailable for new candidate generation, invalidates dependent candidate passages, embeddings and graph indexes, and creates review work for any promoted dependent knowledge. Immutable evidence and denominator records remain preserved for audit unless a separately governed legal or security deletion duty applies. Approved release indexes are changed only through a new signed release decision.

## Distribution and deployment controls

- `.gitignore` excludes the entire `knowledge-repository/AKR-*/github-live/` estate and rebuildable large candidate indexes.
- Root, backend and frontend Docker ignore policies exclude snapshots, CAS, quarantine, checkpoints, journals, caches and environment files.
- FULLDIST packaging uses an explicit allowlist plus raw-vault deny rules.
- Frontend bundling has no input path to the evidence vault; focused inspection found no raw-vault markers in 54 built files.
- Application runtime source inspection found no raw-vault binding in 157 API/engine/knowledge source files.

## Capacity safety for rc.10.73.8

`backend/scripts/rc10-73-8-storage-capacity-gate.mjs` is a mandatory pre-stage control. Every major Prompt 6 stage must supply projected temporary and permanent bytes and record current free bytes. It returns a controlled stop when current or projected peak free space is below 8 GiB and never deletes evidence. Gate 6C additionally fails closed unless projected token count, projected model workload and explicit product-owner approval are present.

No semantic-transformation stage is authorized by this document.
