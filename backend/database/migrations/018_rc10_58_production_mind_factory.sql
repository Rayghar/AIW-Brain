BEGIN;

CREATE TABLE IF NOT EXISTS production_jobs (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  queue_name text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('queued','leased','retry-wait','completed','failed','dead-letter','cancelled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts integer NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_by text,
  lease_expires_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  last_error text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS production_jobs_ready_idx ON production_jobs(queue_name, available_at, created_at) WHERE status IN ('queued','retry-wait');
CREATE INDEX IF NOT EXISTS production_jobs_tenant_idx ON production_jobs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id text PRIMARY KEY,
  release_version text NOT NULL,
  queues text[] NOT NULL DEFAULT '{}',
  active_job_id text,
  status text NOT NULL CHECK (status IN ('starting','running','draining','stopped','failed')),
  heartbeat_at timestamptz NOT NULL DEFAULT now(),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS evidence_objects (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id text,
  evidence_type text NOT NULL,
  title text NOT NULL,
  object_key text NOT NULL,
  object_uri text NOT NULL,
  sha256 text NOT NULL,
  media_type text NOT NULL,
  size_bytes bigint NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','deleted')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (tenant_id, object_key)
);

CREATE TABLE IF NOT EXISTS environment_promotions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  source_environment text NOT NULL,
  target_environment text NOT NULL,
  release_version text NOT NULL,
  pinned_knowledge_release_id text NOT NULL,
  requested_by text NOT NULL,
  status text NOT NULL CHECK (status IN ('requested','blocked','approved','promoted','rejected')),
  mandatory_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  acceptance_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS backup_restore_runs (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  environment text NOT NULL,
  backup_uri text,
  backup_sha256 text,
  restore_target text,
  status text NOT NULL CHECK (status IN ('started','backup-complete','restore-complete','verified','failed')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_restore_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE evidence_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE environment_promotions FORCE ROW LEVEL SECURITY;
ALTER TABLE backup_restore_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS production_jobs_tenant_isolation ON production_jobs;
CREATE POLICY production_jobs_tenant_isolation ON production_jobs USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS evidence_objects_tenant_isolation ON evidence_objects;
CREATE POLICY evidence_objects_tenant_isolation ON evidence_objects USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS environment_promotions_tenant_isolation ON environment_promotions;
CREATE POLICY environment_promotions_tenant_isolation ON environment_promotions USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
DROP POLICY IF EXISTS backup_restore_runs_tenant_isolation ON backup_restore_runs;
CREATE POLICY backup_restore_runs_tenant_isolation ON backup_restore_runs USING (tenant_id = current_setting('app.tenant_id', true)) WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

COMMIT;
