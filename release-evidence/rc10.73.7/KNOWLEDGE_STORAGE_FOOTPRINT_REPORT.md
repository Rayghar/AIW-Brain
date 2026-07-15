# Knowledge Storage Footprint Report

Generated: 2026-07-15T17:29:14.274Z  
Actor: Codex GPT-5.6 Sol  
Production accepted: **false**

## Raw vault

- Source root: `knowledge-repository/AKR-0.10.73.7/github-live`
- Logical bytes: **5,367,402,297 bytes (4.999 GiB)**
- Files: **285,542**
- Folders: **88,031**
- Minimum backup capacity: **5,367,402,297 bytes**
- Recommended destination capacity with 20% verification/headroom: **6,440,882,757 bytes**

## Top-level

| Path | Bytes | Files | Folders |
|---|---:|---:|---:|
| `knowledge-repository/AKR-0.10.73.7/github-live/checkpoints` | 155,381,147 | 69 | 2 |
| `knowledge-repository/AKR-0.10.73.7/github-live/snapshots` | 5,212,021,150 | 285,473 | 88,030 |

## Recursive classification

| Category | Path | Bytes | Files | Folders | Retention | Rebuildability | Authority | Backup | Compaction | Git | FULLDIST |
|---|---|---:|---:|---:|---|---|---|---|---|---|---|
| safe CAS | `knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/objects/sha256` | 1,706,842,680 | 72,567 | 5,631 | immutable-source-evidence | reacquirable only with external source availability; preserve | candidate evidence | mandatory before compaction | not eligible | excluded | excluded |
| quarantine CAS | `knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/quarantine/sha256` | 15,938,540 | 358 | 331 | restricted-immutable-security-evidence | not relied upon; preserve exact bytes and disposition | quarantined data only | mandatory encrypted restricted backup | not eligible | excluded | excluded |
| materialized snapshots | `knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/files` | 2,535,581,987 | 212,500 | 46,048 | immutable-source-view | rebuildable from verified CAS plus manifests | candidate evidence view | manifest-backed; include in first complete backup | eligible only after verified backup and restore proof | excluded | excluded |
| manifests | `knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/manifest.json` | 953,657,943 | 48 | 48 | immutable-provenance-and-denominator | not safely rebuildable without full acquisition replay | candidate provenance | mandatory | not eligible | compact indexes only | compact manifest index and verification receipt only |
| checkpoints | `knowledge-repository/AKR-0.10.73.7/github-live/checkpoints/*.json` | 46,173,376 | 47 | 1 | resumability-intermediate | rebuildable from complete manifests and journals | non-authoritative operational state | include until compaction approved | potentially eligible after backup | excluded | excluded |
| journals | `knowledge-repository/AKR-0.10.73.7/github-live/checkpoints/*.ndjson` | 109,207,771 | 22 | 1 | append-only-acquisition-history | superseded by complete verified manifests only after reviewed compaction | non-authoritative audit support | include before any compaction | review required | excluded | excluded |
| bounded evidence | `embedded in immutable snapshot manifests` | 953,657,943 | 48 | 48 | candidate-bounded-evidence | deterministically rebuildable from safe CAS and parser version | candidate only | covered by manifests and CAS | indexes rebuildable; provenance not removable | summary only | summary only |
| parser outputs | `embedded in immutable snapshot manifests` | 953,657,943 | 48 | 48 | deterministic-parser-metadata | rebuildable from safe CAS with pinned parser | candidate only | covered by manifests and CAS | derived indexes eligible after backup | summary only | summary only |
| candidate indexes | `release-evidence/rc10.73.7 (vault-derived candidate indexes)` | 209,481,415 | 15 | 1 | derived-candidate-index | rebuildable from manifests | candidate only | optional after source vault backup; retain current release copy | eligible after backup | excluded when large; compact root index permitted | excluded from normal application payload when ignored |
| release evidence | `release-evidence/rc10.73.7` | 251,406,270 | 51 | 1 | release-receipt | partially rebuildable; signed/observed receipts must be retained | release evidence, not production authority | mandatory release backup | duplicate generated reports reviewable | compact receipts and checksums permitted | compact receipts permitted |
| temporary data | `temporary test and browser output` | 2,047,043 | 19 | 11 | temporary | fully rebuildable | none | none | eligible after backup gate | excluded | excluded |
| rebuildable data | `rebuildable dependencies and compiled output` | 303,199,668 | 19,190 | 2,131 | local-build-cache | fully rebuildable from locks and source | none | none | eligible after backup gate | excluded | excluded |
| duplicate content | `knowledge-repository/AKR-0.10.73.7/github-live/snapshots/*/*/files` | 2,535,581,987 | 212,500 | 46,048 | rebuildable-source-view | rebuildable from CAS plus manifests | none beyond referenced CAS | preserve in first full backup | eligible only after backup and restore verification | excluded | excluded |
| historical releases | `knowledge-repository historical releases excluding AKR-0.10.73.7` | 14,015,064 | 23 | 0 | historical-release-evidence | varies; treat as non-rebuildable pending audit | release-pinned historical | mandatory under historical retention policy | not assessed in this gate | existing governed history only | release-specific |

Bounded evidence and parser-output byte values identify their physical manifest carrier and overlap manifest storage; they are not added again to the raw-vault total. Duplicate-content bytes represent the materialized source view that can be reconstructed from CAS plus manifests, but no duplicate was removed.

## Superseded physical snapshot

The 48 physical manifests comprise 47 release-pinned connector manifests plus one superseded Apache Camel snapshot at commit `5334c7647ca368e6fef6ffcb87de4d7fc86eae77`. The release-pinned Apache Camel manifest is commit `c29ea1effbdfe5d963075292c2b5068ec1f8f099`. Both remain in the measured vault total; the superseded snapshot is not eligible for removal until a complete backup, destination fingerprint replay and reviewed compaction receipt exist.
