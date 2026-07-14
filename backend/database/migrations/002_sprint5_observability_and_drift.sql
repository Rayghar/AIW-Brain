CREATE TABLE IF NOT EXISTS durable_events (
  event_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','published','failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS runtime_inventories (
  tenant_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('kubernetes','terraform-state','openapi','manual')),
  source_revision TEXT,
  raw_fingerprint TEXT NOT NULL,
  inventory JSONB NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, inventory_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES architecture_branches(tenant_id, branch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_drift_reports (
  tenant_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  inventory_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  report JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, report_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, inventory_id) REFERENCES runtime_inventories(tenant_id, inventory_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_policy_gate_results (
  tenant_id TEXT NOT NULL,
  result_id UUID NOT NULL DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  gate_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  result JSONB NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, result_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_repository_bindings (
  tenant_id TEXT NOT NULL,
  binding_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('local','github','gitlab','azure-devops')),
  repository_url TEXT NOT NULL,
  default_branch TEXT NOT NULL,
  architecture_path TEXT NOT NULL,
  inventory_path TEXT NOT NULL,
  gate_path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('configured','connected','error')),
  last_synced_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, binding_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_durable_events_pending ON durable_events(tenant_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_runtime_inventory_project ON runtime_inventories(tenant_id, project_id, branch_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_drift_report_project ON architecture_drift_reports(tenant_id, project_id, branch_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_gate_project ON architecture_policy_gate_results(tenant_id, project_id, evaluated_at DESC);

ALTER TABLE durable_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_inventories ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_drift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_policy_gate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_repository_bindings ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['durable_events','runtime_inventories','architecture_drift_reports','architecture_policy_gate_results','architecture_repository_bindings']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;
