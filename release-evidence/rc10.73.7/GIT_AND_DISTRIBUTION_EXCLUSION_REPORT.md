# Git and Distribution Exclusion Report

Generated: 2026-07-15T18:51:52.811Z  
Production accepted: **false**

## Result

| Check | Result |
|---|---:|
| Forbidden raw/cache paths tracked | 0 |
| Forbidden raw/cache paths staged | 0 |
| Files staged of any kind | 0 |
| Forbidden raw-vault entries in FULLDIST | 0 of 2,152 |
| Raw-vault markers in frontend bundle | 0 of 54 files |
| Runtime source files binding ordinary execution to the acquisition vault | 0 of 157 |

The exclusion gate passed. This is independent of the backup gate, which is explicitly deferred and not passed.

## Defense in depth

- Repository `.gitignore` excludes `knowledge-repository/AKR-*/github-live/`, safe/quarantine objects beneath it, journals/checkpoints by containment, large vault-derived indexes, local credentials and package/browser caches.
- Root, backend and frontend `.dockerignore` policies exclude the vault, snapshots, objects, quarantine, checkpoints, journals, node/package caches, Playwright caches and environment files.
- The FULLDIST builder records an explicit packaging allowlist and denylist. Its recorded file list contains no raw acquisition content.
- Frontend input and built output contain no raw-vault binding; the built bundle scan inspected 54 files.
- Ordinary API/engine/knowledge runtime source contains no `github-live`, release-vault-root or acquisition-snapshot binding. Acquisition traversal remains confined to offline acquisition/verification scripts.

Git may contain acquisition/verification code, schemas, policies, compact manifest roots, checksums, coverage summaries, release receipts and small deterministic fixtures. Immutable repository payloads, raw CAS, quarantine CAS, recovery journals/checkpoints and large rebuildable indexes remain local ignored data.

## Distribution truth

The existing FULLDIST archive is approximately 40 MB and intentionally excludes the 5,367,402,297-byte raw vault. It is an application/source distribution, not a vault backup and cannot recover raw acquired content. Closure changes made after the recorded archive will require a final allowlisted rebuild after the release commit is approved.
