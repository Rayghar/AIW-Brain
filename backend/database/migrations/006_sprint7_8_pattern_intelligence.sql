-- Sprint 7.8: Architecture Pattern Intelligence and Composition
-- Pattern DNA, deterministic composition, source governance and fitness-function generation.

CREATE TABLE IF NOT EXISTS architecture_pattern_records (
  tenant_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('style','pattern','anti-pattern','topology-template','component-archetype','reference-architecture')),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('candidate','approved','deprecated','retired')),
  version TEXT NOT NULL,
  release_id TEXT NOT NULL,
  pattern_dna JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, pattern_id, version)
);

CREATE TABLE IF NOT EXISTS architecture_pattern_relationships (
  tenant_id TEXT NOT NULL,
  source_pattern_id TEXT NOT NULL,
  target_pattern_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('requires','complements','conflicts','alternative','realizes','supersedes','mitigates')),
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, source_pattern_id, target_pattern_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS repository_governance_policies (
  tenant_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  acquisition_mode TEXT NOT NULL CHECK (acquisition_mode IN ('selected-files','commit-archive','controlled-clone')),
  monitoring_mode TEXT NOT NULL CHECK (monitoring_mode IN ('scheduled-poll','webhook','manual')),
  production_recommendation_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  immutable_snapshot_required BOOLEAN NOT NULL DEFAULT TRUE,
  quarantine_required BOOLEAN NOT NULL DEFAULT TRUE,
  human_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  permitted_operations JSONB NOT NULL,
  prohibited_operations JSONB NOT NULL,
  license_gate TEXT NOT NULL CHECK (license_gate IN ('verified','legal-review','metadata-only')),
  definition JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, connector_id),
  FOREIGN KEY (tenant_id, connector_id) REFERENCES knowledge_repository_connectors(tenant_id, connector_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pattern_composition_plans (
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  scope_node_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('preview','approved','applied','rolled-back','rejected')),
  eligible BOOLEAN NOT NULL,
  pattern_ids JSONB NOT NULL,
  composition_plan JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, plan_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_fitness_functions (
  tenant_id TEXT NOT NULL,
  fitness_id TEXT NOT NULL,
  pattern_id TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('archunit','jqassistant','spring-modulith','openapi','asyncapi','terraform','kubernetes','generic')),
  artifact_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  source_rule_ids JSONB NOT NULL,
  content TEXT NOT NULL,
  review_status TEXT NOT NULL CHECK (review_status IN ('generated','reviewed','approved','rejected')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, fitness_id)
);

CREATE TABLE IF NOT EXISTS pattern_recommendation_evidence_packs (
  tenant_id TEXT NOT NULL,
  evidence_pack_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  knowledge_release_id TEXT NOT NULL,
  request JSONB NOT NULL,
  response JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, evidence_pack_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pattern_benchmark_results (
  tenant_id TEXT NOT NULL,
  benchmark_run_id TEXT NOT NULL,
  scenario_id TEXT NOT NULL,
  knowledge_release_id TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  result JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, benchmark_run_id, scenario_id)
);

CREATE INDEX IF NOT EXISTS idx_pattern_records_category ON architecture_pattern_records(tenant_id, category, lifecycle);
CREATE INDEX IF NOT EXISTS idx_pattern_relationship_target ON architecture_pattern_relationships(tenant_id, target_pattern_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_composition_project ON pattern_composition_plans(tenant_id, project_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fitness_pattern ON architecture_fitness_functions(tenant_id, pattern_id, target);
CREATE INDEX IF NOT EXISTS idx_evidence_pack_project ON pattern_recommendation_evidence_packs(tenant_id, project_id, generated_at DESC);

ALTER TABLE architecture_pattern_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_pattern_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_governance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_composition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_fitness_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_recommendation_evidence_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_benchmark_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS architecture_pattern_records_tenant ON architecture_pattern_records;
CREATE POLICY architecture_pattern_records_tenant ON architecture_pattern_records USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_pattern_relationships_tenant ON architecture_pattern_relationships;
CREATE POLICY architecture_pattern_relationships_tenant ON architecture_pattern_relationships USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS repository_governance_policies_tenant ON repository_governance_policies;
CREATE POLICY repository_governance_policies_tenant ON repository_governance_policies USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS pattern_composition_plans_tenant ON pattern_composition_plans;
CREATE POLICY pattern_composition_plans_tenant ON pattern_composition_plans USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_fitness_functions_tenant ON architecture_fitness_functions;
CREATE POLICY architecture_fitness_functions_tenant ON architecture_fitness_functions USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS pattern_recommendation_evidence_packs_tenant ON pattern_recommendation_evidence_packs;
CREATE POLICY pattern_recommendation_evidence_packs_tenant ON pattern_recommendation_evidence_packs USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS pattern_benchmark_results_tenant ON pattern_benchmark_results;
CREATE POLICY pattern_benchmark_results_tenant ON pattern_benchmark_results USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
