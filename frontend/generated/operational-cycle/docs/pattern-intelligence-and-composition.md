# Architecture Pattern Intelligence and Composition

Knowledge release: **AKR-0.8.8**
Pattern DNA records: **328**
Approved records: **328**
Anti-patterns: **30**
Topology templates: **24**
Records with topology: **118**
Evidence coverage: **100%**
Conformance coverage: **100%**

## Repository-use boundary

AIW connects to registered repositories for change detection, downloads allowlisted content into immutable commit-pinned snapshots, quarantines it, extracts candidate claims, normalizes and reviews those claims, and publishes signed internal knowledge releases. Production recommendations never query GitHub live.

## Source-governance posture

- Registered policies: 43
- Production recommendation sources: 23
- Discovery or restricted sources: 20
- Discovery-only repositories cannot contribute recommendation scores.
- Provider realizations remain separate from vendor-neutral Pattern DNA.
- Every architecture mutation is previewed, validated and reversible.

## Pattern DNA categories

- **ai**: 24
- **application**: 34
- **data**: 39
- **deployment**: 24
- **domain**: 18
- **governance**: 12
- **integration**: 48
- **observability**: 19
- **platform**: 35
- **resilience**: 35
- **security**: 40

## Release checksum

`SHA-0474aabe`

## Architecture fitness functions

- **archunit** — fitness/archunit/pat-bounded-context-rule-bounded-context-01.java; human review required.
- **asyncapi** — fitness/contracts/pat-event-driven-architecture-rule-event-driven-architecture-01.yaml; human review required.
- **kubernetes** — fitness/kubernetes/pat-gitops-rule-gitops-01.rego; human review required.
- **generic** — fitness/pat-retrieval-augmented-generation-rule-retrieval-augmented-generation-01.txt; human review required.

## Governance rule

Repository popularity, stars, forks and search ranking are discovery signals only. They do not determine architectural suitability or production recommendation scores.