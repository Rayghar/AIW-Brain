# AIW rc.10.73.1 Release Report

## Release

**AIW v0.10.0-rc.10.73.1 — Canonical Brain Conformance Closure: Canonical Graph State Migration**

rc.10.73.1 continues the consolidation programme started in rc.10.73.0. The previous release established a deterministic Architecture Design Graph and graph-pinned Brain receipts. This release moves the first governed state domains from graph-as-projection to graph-primary authority.

## Problem addressed

Before this release, materialising the Design Graph changed its governance posture but feature commands still treated legacy `ArchitectureProject` fields as primary. The graph could represent decisions, findings, interfaces and requirements, yet it did not own their complete canonical values or reconstruct those fields. That left a risk of two truths: a graph receipt and mutable parallel project state.

## Implemented outcome

1. **Graph-primary authority marker** — a typed policy-gate record identifies the exact canonical state domains, migration actor and time, source fingerprint, canonical state fingerprint, latest write path and compatibility-write count.
2. **Complete canonical values** — source, evidence, requirement, stakeholder, journey, open-question, interface, decision and finding records retain the complete validated domain object needed for deterministic reconstruction.
3. **Explicit migration transaction** — the migration command requires a materialised graph, expected project revision, exact graph fingerprint, healthy graph integrity and an authenticated principal with `project.edit` authority.
4. **Graph-native state command** — migrated projects can update requirements intelligence, interfaces, decisions and findings through one schema-validated command pinned to the current graph fingerprint and project revision.
5. **Risk migration** — risk-bearing requirements are tracked as a canonical state kind and counted in the authority marker.
6. **Compatibility adapter** — remaining legacy feature writes are detected at the repository boundary, translated into graph records and counted rather than persisted as a second authority.
7. **Repository enforcement** — in-memory, PostgreSQL and MongoDB project and snapshot writes all use the graph-primary synchronisation path.
8. **Brain receipts** — knowledge manifests and proposal receipts expose authority mode, canonical state domains and latest write path.
9. **Sol governance action** — Sol presents an explicit architect action to promote materialised state to graph-primary and displays the resulting governance posture.
10. **Auditable operations** — migration and native state changes produce receipts and audit events with revisions, fingerprints and changed state kinds.

## Authority preserved

The LLM remains proposal-only and cannot perform migration or mutate accepted state. Both migration and graph-native updates are explicit architect operations protected by permission, optimistic revision control and graph fingerprint freshness. Repository persistence recomputes graph integrity and compatibility projections.

## Verification performed

- Full backend and frontend source builds were executed.
- The focused regression suite covers rc.10.73.1 migration/command behaviour, rc.10.73.0 graph foundations, rc.10.72.3 Sol calibration and rc.10.72.2 product recovery.
- The rc.10.73.1 source-and-behaviour gate verifies graph authority, canonical values, repository enforcement, API routes, Brain receipts, Sol actions and release identity.
- Internal dependency, release-integrity and security-source gates were executed.
- A fresh Vite production bundle was generated from the updated frontend source.

Final results and log paths are recorded in `AIW_RC10_73_1_TEST_EVIDENCE.json`.

## Deliberate boundary

This is a real authority migration, not whole-product graph-primary completion. The migrated state domains are requirements, evidence, interfaces, decisions, findings and risk-bearing requirements. Canvas objects and relationships, quality-driver weighting, styles, patterns, stage approvals, review cases, synthesis alternatives, reasoning runs and SDD projections remain compatibility or parallel paths. The adapter therefore remains transitional.

## Acceptance posture

`productionAccepted` remains **false**. Live provider acceptance, independent human expert scoring, organisation-owned KMS, managed PostgreSQL/RLS, protected remote GitHub, durable enterprise infrastructure and controlled enterprise-pilot acceptance remain external gates.
