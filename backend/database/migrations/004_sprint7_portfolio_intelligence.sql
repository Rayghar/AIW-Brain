-- AIW Sprint 7 / v0.8.0 enterprise portfolio intelligence and optimization.

CREATE TABLE IF NOT EXISTS architecture_portfolios (
  tenant_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  currency TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, portfolio_id)
);

CREATE TABLE IF NOT EXISTS project_portfolio_memberships (
  tenant_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  business_unit TEXT NOT NULL,
  owner TEXT NOT NULL,
  criticality TEXT NOT NULL CHECK (criticality IN ('low','medium','high','mission-critical')),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('invest','maintain','modernize','retire')),
  annual_change_budget NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  PRIMARY KEY (tenant_id, portfolio_id, project_id),
  FOREIGN KEY (tenant_id, portfolio_id) REFERENCES architecture_portfolios(tenant_id, portfolio_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_dependencies (
  tenant_id TEXT NOT NULL,
  dependency_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  source_project_id TEXT NOT NULL,
  target_project_id TEXT NOT NULL,
  dependency_kind TEXT NOT NULL CHECK (dependency_kind IN ('api','event','data','shared-technology','operational')),
  criticality TEXT NOT NULL CHECK (criticality IN ('low','medium','high')),
  interface_name TEXT NOT NULL,
  data_classification TEXT NOT NULL CHECK (data_classification IN ('public','internal','confidential','restricted')),
  status TEXT NOT NULL CHECK (status IN ('proposed','active','deprecated')),
  definition JSONB NOT NULL,
  PRIMARY KEY (tenant_id, dependency_id),
  FOREIGN KEY (tenant_id, portfolio_id) REFERENCES architecture_portfolios(tenant_id, portfolio_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, source_project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, target_project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enterprise_technology_standards (
  tenant_id TEXT NOT NULL,
  standard_id TEXT NOT NULL,
  category TEXT NOT NULL,
  technology_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preferred','allowed','restricted','prohibited','deprecated')),
  definition JSONB NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, standard_id)
);

CREATE TABLE IF NOT EXISTS technology_standard_exceptions (
  tenant_id TEXT NOT NULL,
  exception_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  standard_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  owner TEXT NOT NULL,
  rationale TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, exception_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, standard_id) REFERENCES enterprise_technology_standards(tenant_id, standard_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_building_blocks (
  tenant_id TEXT NOT NULL,
  building_block_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','deprecated')),
  definition JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, building_block_id, version)
);

CREATE TABLE IF NOT EXISTS building_block_usages (
  tenant_id TEXT NOT NULL,
  usage_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  building_block_id TEXT NOT NULL,
  version TEXT NOT NULL,
  scope_node_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('proposed','adopted','diverged','retired')),
  PRIMARY KEY (tenant_id, usage_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, building_block_id, version) REFERENCES architecture_building_blocks(tenant_id, building_block_id, version)
);

CREATE TABLE IF NOT EXISTS enterprise_reference_architectures (
  tenant_id TEXT NOT NULL,
  reference_architecture_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','deprecated')),
  definition JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, reference_architecture_id, version)
);

CREATE TABLE IF NOT EXISTS reference_architecture_assignments (
  tenant_id TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  reference_architecture_id TEXT NOT NULL,
  version TEXT NOT NULL,
  scope_node_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('proposed','applicable','compliant','non-compliant','waived')),
  PRIMARY KEY (tenant_id, assignment_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, reference_architecture_id, version) REFERENCES enterprise_reference_architectures(tenant_id, reference_architecture_id, version)
);

CREATE TABLE IF NOT EXISTS portfolio_technical_debt (
  tenant_id TEXT NOT NULL,
  debt_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('HARD','SIGNIFICANT','ADVISORY')),
  status TEXT NOT NULL CHECK (status IN ('open','planned','in-progress','resolved','accepted')),
  estimated_effort_days NUMERIC NOT NULL DEFAULT 0,
  annual_cost_impact NUMERIC NOT NULL DEFAULT 0,
  definition JSONB NOT NULL,
  due_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, debt_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_intelligence_reports (
  tenant_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  report JSONB NOT NULL,
  PRIMARY KEY (tenant_id, report_id),
  FOREIGN KEY (tenant_id, portfolio_id) REFERENCES architecture_portfolios(tenant_id, portfolio_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_dependencies_source ON project_dependencies(tenant_id, source_project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_dependencies_target ON project_dependencies(tenant_id, target_project_id, status);
CREATE INDEX IF NOT EXISTS idx_technology_standards_status ON enterprise_technology_standards(tenant_id, category, status);
CREATE INDEX IF NOT EXISTS idx_standard_exception_expiry ON technology_standard_exceptions(tenant_id, status, expires_at);
CREATE INDEX IF NOT EXISTS idx_technical_debt_project ON portfolio_technical_debt(tenant_id, project_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_portfolio_reports_latest ON portfolio_intelligence_reports(tenant_id, portfolio_id, generated_at DESC);

ALTER TABLE architecture_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_portfolio_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_technology_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE technology_standard_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_building_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_block_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_reference_architectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE reference_architecture_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_technical_debt ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_intelligence_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'architecture_portfolios','project_portfolio_memberships','project_dependencies','enterprise_technology_standards',
    'technology_standard_exceptions','architecture_building_blocks','building_block_usages','enterprise_reference_architectures',
    'reference_architecture_assignments','portfolio_technical_debt','portfolio_intelligence_reports'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;
