# Full acquired collection integration

Controlling baseline: AIW v0.10.0-rc.10.73.6. Baseline checkpoint: 47c1f0d.

## Scope

Expose the 47 snapshots selected by the acquisition manifest index, together with all 16 newer transformation candidate shards. Reconcile the relocated `AKR-0.10.73.7_` snapshot root explicitly. Record extra historical snapshots rather than silently counting them twice. Archives remain immutable backups; do not extract or republish them when matching unpacked content is available.

## Implementation

1. Build a disposable SQLite/FTS index from every selected manifest file entry and candidate record; no browser-side corpus cap. Preserve policy-excluded, rejected, quarantined, opaque, missing and integrity-failed counts.
2. Verify available accepted source bytes against manifest SHA-256 before indexing their text. Record each source receipt and selected-file denominator. Never index quarantined source bytes. Do not grant approval based on acquisition labels.
3. Add paginated local search and safe, on-demand text previews linked by record IDs. Resolve file paths beneath the explicitly selected snapshot root; block arbitrary paths, stale content, traversal and quarantine access. Reuse the existing explorer and single local serving command.
4. Preserve the small explicit-file build workflow, guide and vault, through one explorer UI. Full collection mode serves only local JSON endpoints and escaped text; no raw download or external publishing.
5. Test schema validation, duplicate records, complete pagination, file integrity and path boundaries, quarantine isolation, source/candidate linkage, and browser workflows. Run all tool regression checks, inspect coverage, review diff, package source only and verify SHA-256.

## Acceptance boundaries

This is a local, single-user discovery projection. It creates no AIW authority path or canonical graph mutations. Upstream acquisition receipts and content hashes are verifiable; licences, semantic correctness and human promotion remain separate authorities. Platform clean installs/builds/regressions and production acceptance are not implied by standalone tool tests. productionAccepted remains false.
