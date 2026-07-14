-- Sprint 8.9.7 — Production Mind Factory Persistence, KMS Signing and Repository Source Execution
-- Tenant-scoped tables for source snapshots, candidate claims, worker jobs,
-- repository executions, KMS signatures, pack activations and audit timeline.

CREATE TABLE IF NOT EXISTS mind_factory_source_snapshots (
  tenant_id text NOT NULL,
  snapshot_id text PRIMARY KEY,
  source_id text NOT NULL,
  source_title text NOT NULL,
  source_type text NOT NULL,
  commit_sha text,
  content_hash text NOT NULL,
  status text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_candidate_claims (
  tenant_id text NOT NULL,
  claim_id text PRIMARY KEY,
  snapshot_id text NOT NULL REFERENCES mind_factory_source_snapshots(snapshot_id),
  predicate text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  non_scoring boolean NOT NULL DEFAULT true,
  reviewer_required boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_worker_jobs (
  tenant_id text NOT NULL,
  job_id text PRIMARY KEY,
  operation text NOT NULL,
  status text NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  queued_by text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_repository_executions (
  tenant_id text NOT NULL,
  execution_id text PRIMARY KEY,
  connector_id text NOT NULL,
  mode text NOT NULL,
  status text NOT NULL,
  executed_at timestamptz NOT NULL DEFAULT now(),
  read_only boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_kms_signatures (
  tenant_id text NOT NULL,
  signature_id text PRIMARY KEY,
  provider text NOT NULL,
  key_ref text NOT NULL,
  manifest_pack_id text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_pack_activations (
  tenant_id text NOT NULL,
  project_id text,
  record_id text PRIMARY KEY,
  release_id text NOT NULL,
  pack_id text NOT NULL,
  pin_status text NOT NULL,
  persisted_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mind_factory_audit_timeline (
  tenant_id text NOT NULL,
  event_id bigserial PRIMARY KEY,
  actor text NOT NULL,
  action text NOT NULL,
  subject text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  detail text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE mind_factory_source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_candidate_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_worker_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_repository_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_kms_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_pack_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mind_factory_audit_timeline ENABLE ROW LEVEL SECURITY;
