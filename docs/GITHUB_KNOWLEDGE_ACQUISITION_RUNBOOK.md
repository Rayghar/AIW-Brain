# GitHub Knowledge Acquisition Runbook

## Purpose

Acquire the complete governed scope of every approved public GitHub source into immutable, quarantined AIW snapshots. The acquisition process never promotes claims automatically.

## Prerequisites

- Node.js 22–24.
- Outbound HTTPS access to `api.github.com`.
- A least-privilege token stored in a secret manager for stable rate limits.
- Durable storage for snapshots, checkpoints and evidence.
- A named licence reviewer and Architecture Knowledge Council review queue.

## Execute

```powershell
$env:AIW_GITHUB_TOKEN = "<secret-manager-injected-token>"
./RUN_GITHUB_KNOWLEDGE_ACQUISITION.ps1
```

Linux/container:

```bash
export AIW_GITHUB_TOKEN="${SECRET_MANAGER_VALUE}"
cd backend
node scripts/rc10-73-6-preflight.mjs
node scripts/rc10-73-6-run-live-github-acquisition.mjs
```

Leave `AIW_REFRESH_CONNECTORS` empty to process all approved repositories. Use a comma-separated connector list only for retries or controlled diagnostics.

## Required review sequence

1. Confirm every repository is pinned to an immutable commit.
2. Verify 100% governed-scope file disposition: accepted, rejected with reason, or explicit policy exclusion.
3. Resolve blocking quarantine findings.
4. Complete path-specific licence review.
5. Review and normalize candidate claims.
6. Resolve contradictions and duplicates.
7. Approve Pattern DNA lineage changes.
8. Calibrate any scoring or conformance rule with independent architects.
9. Sign and promote a new knowledge release.
10. Verify Brain retrieval uses only the signed release.

## Evidence

- `release-evidence/rc10.73.6/GITHUB_CONNECTIVITY_PREFLIGHT.json`
- `release-evidence/rc10.73.6/LIVE_GITHUB_ACQUISITION_SUMMARY.json`
- `knowledge-repository/AKR-0.10.73.6/github-live/snapshots/**/manifest.json`
- `knowledge-repository/AKR-0.10.73.6/github-live/checkpoints/*.json`

## Failure policy

A failed repository or rejected file prevents 100% acquisition acceptance. It does not silently disappear from the denominator. Candidate claims remain non-authoritative until independent promotion.
