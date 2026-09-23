# AIW knowledge brain implementation plan

Controlling baseline: AIW v0.10.0-rc.10.73.6. This feature does not advance or certify the platform release.

Baseline checkpoint: 440e02a. Existing working-tree changes and acquisition archives are outside this implementation. The checkpoint records HEAD, not those uncommitted changes.

## Outcome

Build a local, read-only knowledge explorer, linked Markdown vault, original AIW guide, and deterministic maintenance tools inspired by the second-brain pattern. No upstream code or prose is copied. No automatic promotion, runtime reasoning entry point, or canonical Design Graph is introduced.

## Implementation

1. Implement explicit JSON/NDJSON input adapters for AIW knowledge objects and candidate semantic units. Hash inputs; preserve record locators; report coverage and missing lineage honestly. Never recursively ingest acquisition roots.
2. Build a local searchable site with source/class filtering, source receipts, relationship navigation, and Markdown notes. Use a derived navigation graph only. No cloud service or telemetry.
3. Supply a vault template and original guidance for capture, evidence, synthesis, retrieval, review, maintenance, and evaluation. Import chat text as untrusted candidate notes only.
4. Add deterministic statistics, link checking, graph export, site build and chat conversion commands. Default to an empty collection; data input requires an explicit path.
5. Test malformed data, hostile content, duplicate IDs, source hashing, authority isolation, link integrity, and browser workflows. Record unavailable platform gates without claiming production acceptance.
6. Package source only, verify SHA-256 and package contents, inspect diff, and commit only this feature.

## Boundaries

Local single-user access only. Source authority labels are historical metadata, never verified approval. Generated data remains ignored and must not be published by default. No project data is automatically collected. Live Sol integration, enterprise authentication, scheduled LLM extraction, legal approval, independent review, and production acceptance remain external integration work.
