-- Sprint 8.8.7 Repository and Conformance Pilot
-- PostgreSQL-ready schema for read-only repository onboarding evidence,
-- conformance control generation, CI fitness-loop planning and runtime
-- evidence ingestion planning. Repository writes remain disabled by default.

CREATE TABLE IF NOT EXISTS repository_conformance_scans_v2 (
  tenant_id text NOT NULL,
  scan_id text NOT NULL,
  connector_id text NOT NULL,
  scan_mode text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL,
  coverage jsonb NOT NULL,
  controls jsonb NOT NULL,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, scan_id)
);

CREATE TABLE IF NOT EXISTS repository_fitness_loop_plans_v2 (
  tenant_id text NOT NULL,
  connector_id text NOT NULL,
  generated_at timestamptz NOT NULL,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, connector_id, generated_at)
);

CREATE TABLE IF NOT EXISTS runtime_evidence_ingestion_plans_v2 (
  tenant_id text NOT NULL,
  connector_id text NOT NULL,
  generated_at timestamptz NOT NULL,
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, connector_id, generated_at)
);

ALTER TABLE repository_conformance_scans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_fitness_loop_plans_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_evidence_ingestion_plans_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS repository_conformance_scans_tenant_isolation ON repository_conformance_scans_v2;
CREATE POLICY repository_conformance_scans_tenant_isolation ON repository_conformance_scans_v2
  USING (tenant_id = current_setting('aiw.tenant_id', true));

DROP POLICY IF EXISTS repository_fitness_loop_plans_tenant_isolation ON repository_fitness_loop_plans_v2;
CREATE POLICY repository_fitness_loop_plans_tenant_isolation ON repository_fitness_loop_plans_v2
  USING (tenant_id = current_setting('aiw.tenant_id', true));

DROP POLICY IF EXISTS runtime_evidence_ingestion_plans_tenant_isolation ON runtime_evidence_ingestion_plans_v2;
CREATE POLICY runtime_evidence_ingestion_plans_tenant_isolation ON runtime_evidence_ingestion_plans_v2
  USING (tenant_id = current_setting('aiw.tenant_id', true));
