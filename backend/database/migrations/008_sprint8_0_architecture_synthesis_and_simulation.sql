-- Sprint 8.0: governed architecture synthesis, deterministic simulation,
-- alternative decisions and conformance handoff.

CREATE TABLE IF NOT EXISTS architecture_synthesis_runs (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  knowledge_release_id TEXT NOT NULL,
  input_fingerprint TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('deterministic','llm-enriched')),
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated','in-review','accepted','rejected','superseded')),
  assessment JSONB NOT NULL,
  pareto_alternative_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_alternative_id TEXT,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_trace JSONB,
  requested_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, run_id),
  UNIQUE (tenant_id, project_id, branch_id, project_revision, input_fingerprint)
);

CREATE TABLE IF NOT EXISTS architecture_synthesis_alternatives (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  run_id TEXT NOT NULL,
  alternative_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  name TEXT NOT NULL,
  overall_score NUMERIC(6,2) NOT NULL,
  pattern_ids JSONB NOT NULL,
  alternative JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, run_id, alternative_id),
  FOREIGN KEY (tenant_id, run_id) REFERENCES architecture_synthesis_runs(tenant_id, run_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_simulation_results (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  simulation_result_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  alternative_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  scenario_type TEXT NOT NULL,
  deterministic_model_version TEXT NOT NULL,
  result JSONB NOT NULL,
  simulated_by TEXT NOT NULL,
  simulated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, simulation_result_id),
  FOREIGN KEY (tenant_id, run_id, alternative_id) REFERENCES architecture_synthesis_alternatives(tenant_id, run_id, alternative_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_synthesis_decisions (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  decision_package_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  alternative_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed','accepted','rejected')),
  decision_package JSONB NOT NULL,
  decided_by TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, decision_package_id),
  FOREIGN KEY (tenant_id, run_id, alternative_id) REFERENCES architecture_synthesis_alternatives(tenant_id, run_id, alternative_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS synthesis_artifact_manifests (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  manifest_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  alternative_id TEXT NOT NULL,
  manifest JSONB NOT NULL,
  object_storage_prefix TEXT,
  generated_by TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, manifest_id),
  FOREIGN KEY (tenant_id, run_id, alternative_id) REFERENCES architecture_synthesis_alternatives(tenant_id, run_id, alternative_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_synthesis_project ON architecture_synthesis_runs(tenant_id, project_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthesis_status ON architecture_synthesis_runs(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthesis_alternative_score ON architecture_synthesis_alternatives(tenant_id, run_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_simulation_alternative ON architecture_simulation_results(tenant_id, run_id, alternative_id, simulated_at DESC);
CREATE INDEX IF NOT EXISTS idx_synthesis_decision_status ON architecture_synthesis_decisions(tenant_id, run_id, status, created_at DESC);

ALTER TABLE architecture_synthesis_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_synthesis_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_simulation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_synthesis_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE synthesis_artifact_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS architecture_synthesis_runs_tenant ON architecture_synthesis_runs;
CREATE POLICY architecture_synthesis_runs_tenant ON architecture_synthesis_runs USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_synthesis_alternatives_tenant ON architecture_synthesis_alternatives;
CREATE POLICY architecture_synthesis_alternatives_tenant ON architecture_synthesis_alternatives USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_simulation_results_tenant ON architecture_simulation_results;
CREATE POLICY architecture_simulation_results_tenant ON architecture_simulation_results USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_synthesis_decisions_tenant ON architecture_synthesis_decisions;
CREATE POLICY architecture_synthesis_decisions_tenant ON architecture_synthesis_decisions USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS synthesis_artifact_manifests_tenant ON synthesis_artifact_manifests;
CREATE POLICY synthesis_artifact_manifests_tenant ON synthesis_artifact_manifests USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
