# AIW Database Migrations

Run migrations in lexical order with `npm run migrate:db`.

- `001_sprint4_clean.sql` creates the tenant-aware collaboration, security, audit and project repository baseline.
- `002_sprint5_observability_and_drift.sql` adds the durable event outbox, runtime inventories, architecture drift reports, policy-gate results and architecture repository bindings.

The migration runner uses a PostgreSQL advisory lock and records applied files in `aiw_schema_migrations`. Every tenant-scoped table has row-level security enabled. Before deployment, run the backup/restore verification script against a non-production database.

## 003_sprint6_operational_intelligence.sql

Adds scheduled inventory collectors, collector runs, operational drift, time-bound waivers, remediation plans, SLOs, alert policies and repository pull-request records. It also expands runtime inventory sources to AWS, Azure, GCP and telemetry-derived topology.

## 005_sprint7_7_dynamic_knowledge_mesh.sql
Adds tenant-isolated repository connectors, quarantined source snapshots, atomic architecture claims, evidence locations, contradictions, knowledge pull requests, recommendation regression fixtures and versioned knowledge releases. External content and LLM output cannot enter an approved release without an explicit proposal and review state.

## 006_sprint7_8_pattern_intelligence.sql
Adds reviewed Pattern DNA records and relationships, repository-governance policies, reversible pattern-composition plans, generated architecture fitness functions, recommendation evidence packs and benchmark results. Production recommendations remain pinned to signed knowledge releases and cannot query live GitHub content.

## 007_sprint7_9_production_knowledge_operations.sql
Adds configurable LLM routes and audit records, scheduled repository refresh jobs, immutable knowledge-object references, approved pgvector embeddings, fitness delivery, code/deployment/runtime conformance evidence and externally verifiable knowledge-release signatures. Tenant RLS protects every operational table.

## 008_sprint8_0_architecture_synthesis_and_simulation.sql
Adds synthesis runs, typed alternatives, deterministic simulation results, architecture synthesis decisions and artifact manifests. Every table is tenant scoped with row-level security. Synthesis runs retain the source project revision and pinned knowledge release so stale or non-reproducible decisions can be rejected.

## 009_sprint8_0_2_integrated_architecture_journey.sql
Adds tenant-scoped model-routing policies, durable co-architect sessions and messages, architecture AI review traces and contextual-guidance interaction history. Safety checks prevent prompt logging, provider-content retention and secret exposure in persisted model policy. All tables use row-level security.

## 011_sprint8_7_2_enterprise_runtime_acceptance.sql
Persists tenant-scoped enterprise runtime acceptance reports and active-probe evidence for Sprint 8.7.2.
