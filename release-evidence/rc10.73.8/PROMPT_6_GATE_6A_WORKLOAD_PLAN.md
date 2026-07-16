# Prompt 6 Gate 6A corpus analysis and workload plan

Generated: 2026-07-15T22:09:46.784Z
Release line: AIW v0.10.0-rc.10.73.8
Disposition: **Gate 6A completed; Gate 6B not started; Gate 6C blocked**

## Execution boundary

This run read only the ten compact rc.10.73.7 release-evidence files fingerprinted in the machine-readable corpus analysis. It performed zero recursive filesystem scans, zero raw-vault object reads, zero network requests, zero model calls and zero semantic transformations. Repository content was not executed. All carried knowledge remains candidate-only and productionAccepted remains false.

## Reconciled corpus

| Measure | Count |
|---|---:|
| Governed repositories | 47 |
| Completed repositories | 47 |
| Review-required repositories | 23 |
| Verified manifests | 47 |
| Total tree files | 186219 |
| Governed eligible files | 106350 |
| Accepted files | 105802 |
| Quarantined files | 294 |
| Parsed files | 103497 |
| Awaiting specialist parser | 2305 |
| Bounded evidence passages | 147239 |
| Initial candidate claims | 315621 |
| Whole-architecture artefacts | 91358 |
| Cross-file architecture groups | 5253 |

The five differentiated source-authority classes remain intact: architecture-conformance-implementation (6), educational-or-discovery-source (8), official-reference-architecture (17), official-specification-or-standard (3), reviewed-practitioner-or-implementation-source (13).

## Gate 6B representative-pilot proposal

Gate 6B is not approved or executed by this plan. The proposed pilot is ten transformations: two bounded evidence passages from each of the five source-authority classes. Selection should cover one normal and, where available, one review-sensitive passage per class; preserve immutable provenance; include instruction-shaped evidence as inert data; and emit strict-schema candidate proposals only.

The preliminary pilot workload is 14,500 to 23,000 combined input/output tokens across 10 transformations. Before Gate 6B, rerun the storage-capacity gate, resolve the actual configured runtime model, freeze the sample manifest and prompt/schema versions, and obtain explicit product-owner approval.

## Gate 6C planning boundary

Gate 6C remains blocked. A deliberately conservative first-pass estimate treats each of the 147,239 bounded evidence passages as one potential transformation. That implies approximately 213,496,550 to 338,649,700 combined tokens before batching, deduplication or review-driven elimination. Candidate output storage based on 315,621 initial claims is approximately 646,391,808 to 2,585,567,232 uncompressed bytes.

These are planning bounds, not authorization or a quotation. Before Gate 6C, AIW requires a new capacity assessment, a frozen projected output size, a projected token count and model workload based on the approved transformation schema, and explicit product-owner approval. The deferred independent vault backup remains a visible risk and is not a passed gate.
