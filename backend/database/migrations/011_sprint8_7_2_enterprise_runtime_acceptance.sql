-- Sprint 8.7.2: enterprise runtime activation and retained acceptance evidence.
CREATE TABLE IF NOT EXISTS platform_acceptance_runs (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  platform_version TEXT NOT NULL,
  environment TEXT NOT NULL,
  production_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  verified_count INTEGER NOT NULL DEFAULT 0,
  configured_count INTEGER NOT NULL DEFAULT 0,
  open_count INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, run_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_acceptance_generated
  ON platform_acceptance_runs(tenant_id, generated_at DESC);

ALTER TABLE platform_acceptance_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_acceptance_runs_tenant ON platform_acceptance_runs;
CREATE POLICY platform_acceptance_runs_tenant ON platform_acceptance_runs
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
