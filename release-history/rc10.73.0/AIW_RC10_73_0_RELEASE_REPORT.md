# AIW rc.10.73.0 Release Report

## Release

**AIW v0.10.0-rc.10.73.0 — Canonical Brain Conformance Closure: Design Graph Foundation**

rc.10.73.0 starts the consolidation programme identified by the Brain architecture audit. It uses rc.10.72.3 as the implementation baseline and introduces a deterministic Architecture Design Graph without creating another reasoning authority.

## Problem addressed

Prior releases contained substantial architecture-intelligence assets, but accepted state was still distributed across project fields, canvas structures, decisions, findings, stage data and generated artefacts. Brain runs could identify a project revision, but not a stable canonical graph fingerprint representing the exact architecture state evaluated.

## Implemented outcome

1. **Canonical graph contract** — a typed graph schema covering project intent, sources, evidence, requirements, stakeholders, journeys, quality drivers, styles, patterns, architecture nodes and edges, interfaces, decisions, findings, policy gates and approvals.
2. **Deterministic identity** — stable record IDs, relationship IDs, sorted payloads, record fingerprints and one graph fingerprint.
3. **Integrity verification** — duplicate record, duplicate relationship, dangling relationship and graph-fingerprint checks.
4. **Persistence-boundary synchronisation** — every project and snapshot write in the in-memory, PostgreSQL and MongoDB repositories receives a fresh Design Graph projection.
5. **Brain pinning** — knowledge manifests and proposal receipts now record graph revision, graph fingerprint, projection mode and integrity status.
6. **Governed materialisation** — new preview and materialisation APIs require the expected revision, reject stale previews, preserve proposal-only Brain authority and require explicit architect-authorised commit.
7. **Visible governance** — Sol exposes whether the current graph is a legacy compatibility projection or an architect-materialised canonical graph.

## Authority preserved

The Brain does not directly mutate accepted architecture state. A preview is generated deterministically, the exact fingerprint is returned, and the user must explicitly materialise that fresh preview. Repository concurrency controls remain active and the materialisation produces an audit event and receipt.

## Verification performed

- Domain, intelligence and API TypeScript builds passed during implementation.
- Focused backend test suite passed: 3 files and 8 tests.
- New graph tests cover deterministic projection, persistence synchronisation, graph pinning, explicit materialisation, revision increment, stale-preview rejection, semantic fingerprint changes and dangling-lineage detection.
- rc.10.72.2 Brain recovery and rc.10.72.3 Sol calibration regression tests remained green in the focused suite.

Final package verification results are recorded in `AIW_RC10_73_0_TEST_EVIDENCE.json`.

## Deliberate boundary

This release establishes and persists the Design Graph, but does not claim that it is already the only mutation model. Existing `ArchitectureProject` fields remain a compatibility projection. Graph-primary commands, migration of parallel ledgers and complete SDD/canvas projection retirement continue in later rc.10.73.x releases.

## Acceptance posture

`productionAccepted` remains **false**. Live provider acceptance, independent human expert scoring, organisation-owned KMS, managed PostgreSQL/RLS, protected GitHub, durable enterprise infrastructure and controlled enterprise pilot acceptance remain external gates.
