-- AIW Sprint 6 / v0.7.0 operational intelligence, remediation and SLO controls.

ALTER TABLE runtime_inventories DROP CONSTRAINT IF EXISTS runtime_inventories_source_type_check;
ALTER TABLE runtime_inventories ADD CONSTRAINT runtime_inventories_source_type_check
  CHECK (source_type IN ('kubernetes','terraform-state','openapi','manual','aws','azure','gcp','telemetry'));

CREATE TABLE IF NOT EXISTS inventory_collectors (
  tenant_id TEXT NOT NULL,
  collector_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('aws','azure','gcp','kubernetes')),
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  secret_reference_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('configured','running','healthy','degraded','disabled')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  configuration JSONB NOT NULL,
  PRIMARY KEY (tenant_id, collector_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collector_runs (
  tenant_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  collector_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  inventory_id TEXT,
  resource_count INTEGER NOT NULL DEFAULT 0,
  relationship_count INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, run_id),
  FOREIGN KEY (tenant_id, collector_id) REFERENCES inventory_collectors(tenant_id, collector_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS operational_drift_reports (
  tenant_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  report JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, report_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drift_waivers (
  tenant_id TEXT NOT NULL,
  waiver_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  finding_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','expired','revoked')),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, waiver_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS remediation_plans (
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  source_report_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','pending-approval','approved','rejected','completed')),
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, plan_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_level_objectives (
  tenant_id TEXT NOT NULL,
  slo_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  target_node_id TEXT,
  indicator TEXT NOT NULL,
  target NUMERIC NOT NULL,
  "window" TEXT NOT NULL,
  definition JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (tenant_id, slo_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS alert_policies (
  tenant_id TEXT NOT NULL,
  alert_policy_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  slo_id TEXT NOT NULL,
  definition JSONB NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (tenant_id, alert_policy_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, slo_id) REFERENCES service_level_objectives(tenant_id, slo_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS repository_pull_requests (
  tenant_id TEXT NOT NULL,
  pull_request_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  binding_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  pull_request JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, pull_request_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_collectors_due ON inventory_collectors(tenant_id, status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_collector_runs_project ON collector_runs(tenant_id, project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_drift_project ON operational_drift_reports(tenant_id, project_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_waiver_expiry ON drift_waivers(tenant_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_remediation_project ON remediation_plans(tenant_id, project_id, created_at DESC);

ALTER TABLE inventory_collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_drift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE drift_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE remediation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_level_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_pull_requests ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['inventory_collectors','collector_runs','operational_drift_reports','drift_waivers','remediation_plans','service_level_objectives','alert_policies','repository_pull_requests']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;
