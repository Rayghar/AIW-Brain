CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active','suspended')),
  data_region TEXT NOT NULL,
  security_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_identity_providers (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('oidc','saml','development')),
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  client_id TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, provider_id)
);

CREATE TABLE IF NOT EXISTS projects (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  active_stage TEXT NOT NULL CHECK (active_stage IN ('designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization')),
  current_revision INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, project_id)
);

CREATE TABLE IF NOT EXISTS architecture_branches (
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parent_branch_id TEXT,
  base_revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','candidate','merged','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, branch_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, parent_branch_id) REFERENCES architecture_branches(tenant_id, branch_id)
);

CREATE TABLE IF NOT EXISTS project_branch_documents (
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  current_revision INTEGER NOT NULL,
  canonical_model JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, project_id, branch_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES architecture_branches(tenant_id, branch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_snapshots (
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','reviewed','approved','superseded')),
  label TEXT NOT NULL,
  canonical_model JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, snapshot_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, branch_id) REFERENCES architecture_branches(tenant_id, branch_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_members (
  tenant_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','architect','reviewer','governance','contributor','viewer')),
  status TEXT NOT NULL CHECK (status IN ('active','invited','suspended')),
  joined_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, project_id, member_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_assignments (
  tenant_id TEXT NOT NULL,
  assignment_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  assignment_record JSONB NOT NULL,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, assignment_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS discussion_threads (
  tenant_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  thread_record JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, thread_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workbench_notifications (
  tenant_id TEXT NOT NULL,
  notification_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  notification_record JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, notification_id),
  FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, project_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS idempotency_receipts (
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed')),
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, scope, idempotency_key)
);

CREATE TABLE IF NOT EXISTS audit_events (
  tenant_id TEXT NOT NULL,
  audit_event_id TEXT NOT NULL,
  project_id TEXT,
  branch_id TEXT,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('success','denied','conflict','failure')),
  correlation_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, audit_event_id)
);

CREATE TABLE IF NOT EXISTS activity_events (
  tenant_id TEXT NOT NULL,
  activity_event_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  revision INTEGER NOT NULL,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, activity_event_id)
);

CREATE TABLE IF NOT EXISTS collaboration_presence (
  tenant_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  selected_node_id TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, connection_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_documents_tenant_project ON project_branch_documents(tenant_id, project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant_project ON project_snapshots(tenant_id, project_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_audit_retention ON audit_events(tenant_id, retention_until);
CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_events(tenant_id, project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_presence_expiry ON collaboration_presence(tenant_id, last_seen_at);

-- Tenant isolation. The API sets aiw.tenant_id in every transaction.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_branch_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE workbench_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_presence ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects','architecture_branches','project_branch_documents','project_snapshots','project_members','review_assignments','discussion_threads','workbench_notifications','idempotency_receipts','audit_events','activity_events','collaboration_presence']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;

INSERT INTO tenants(tenant_id,name,slug,status,data_region,security_settings)
VALUES ('tenant-reference','AIW Reference Tenant','reference','active','eu-west','{"requireSso":false,"auditRetentionDays":365}'::jsonb)
ON CONFLICT (tenant_id) DO NOTHING;
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

-- Sprint 6 operational intelligence extension.
\i migrations/003_sprint6_operational_intelligence.sql


-- Included migration: 006_sprint7_8_pattern_intelligence.sql
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
-- Sprint 7.9: production knowledge operations, provider-neutral LLM routing,
-- pgvector retrieval, conformance evidence and externally verifiable releases.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS llm_runtime_routes (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  route_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('knowledge-extraction','architecture-reasoning','recommendation-explanation','artifact-drafting','embedding')),
  provider_id TEXT NOT NULL CHECK (provider_id IN ('openai','xai','gemini','qwen','deepseek','custom-openai','local-openai')),
  model TEXT NOT NULL,
  base_url TEXT,
  api_key_environment_variable TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('responses','chat-completions','embeddings')),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  data_classification_allowlist JSONB NOT NULL DEFAULT '["public","internal"]'::jsonb,
  fallback_route_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, route_id)
);

CREATE TABLE IF NOT EXISTS llm_execution_audit (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  execution_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  route_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  model TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  data_classification TEXT NOT NULL,
  prompt_logged BOOLEAN NOT NULL DEFAULT FALSE,
  provider_content_retained BOOLEAN NOT NULL DEFAULT FALSE,
  fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER NOT NULL,
  usage JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('succeeded','failed','blocked')),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, execution_id)
);

CREATE TABLE IF NOT EXISTS knowledge_refresh_jobs (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  job_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled','manual','webhook')),
  status TEXT NOT NULL CHECK (status IN ('queued','running','quarantined','review-required','failed','cancelled','published')),
  requested_revision TEXT,
  resolved_revision TEXT,
  snapshot_id TEXT,
  object_manifest_uri TEXT,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, job_id)
);

CREATE TABLE IF NOT EXISTS knowledge_object_references (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  object_key TEXT NOT NULL,
  object_uri TEXT NOT NULL,
  media_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  quarantine_status TEXT NOT NULL CHECK (quarantine_status IN ('quarantined','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, object_id),
  UNIQUE (tenant_id, object_key)
);

CREATE TABLE IF NOT EXISTS approved_knowledge_embeddings (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  embedding_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('claim','pattern','anti-pattern','topology-template','rule')),
  record_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_text TEXT NOT NULL,
  embedding_model TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, embedding_id),
  UNIQUE (tenant_id, release_id, record_type, record_id, embedding_model)
);

CREATE TABLE IF NOT EXISTS fitness_delivery_jobs (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  delivery_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  repository_url TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('github','gitlab')),
  branch_name TEXT NOT NULL,
  pull_request_url TEXT,
  artifact_ids JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('preview','approved','pushed','pull-request-opened','failed','cancelled')),
  requested_by TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, delivery_id)
);

CREATE TABLE IF NOT EXISTS conformance_evidence (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  evidence_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('archunit','jqassistant','spring-modulith','openapi','asyncapi','terraform','kubernetes','runtime-inventory','opentelemetry','generic')),
  repository_url TEXT,
  commit_sha TEXT,
  workflow_run_id TEXT,
  environment TEXT,
  raw_evidence JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  collected_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, evidence_id)
);

CREATE TABLE IF NOT EXISTS conformance_findings (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  architecture_object_id TEXT,
  decision_id TEXT,
  rule_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','high','critical')),
  status TEXT NOT NULL CHECK (status IN ('open','accepted','remediated','waived','false-positive')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  remediation TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, finding_id),
  FOREIGN KEY (tenant_id, evidence_id) REFERENCES conformance_evidence(tenant_id, evidence_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_release_signatures (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  release_id TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  signature_algorithm TEXT NOT NULL CHECK (signature_algorithm IN ('Ed25519')),
  public_key_id TEXT NOT NULL,
  public_key_pem TEXT NOT NULL,
  signature_base64 TEXT NOT NULL,
  signed_by TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('valid','invalid','unverified')),
  external_verification_uri TEXT,
  PRIMARY KEY (tenant_id, release_id, public_key_id)
);

CREATE INDEX IF NOT EXISTS idx_llm_execution_created ON llm_execution_audit(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refresh_connector ON knowledge_refresh_jobs(tenant_id, connector_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_snapshot ON knowledge_object_references(tenant_id, snapshot_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_record ON approved_knowledge_embeddings(tenant_id, release_id, record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_conformance_project ON conformance_evidence(tenant_id, project_id, branch_id, collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_conformance_findings_open ON conformance_findings(tenant_id, project_id, status, severity);

ALTER TABLE llm_runtime_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_execution_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_refresh_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_object_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_delivery_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conformance_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE conformance_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_release_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llm_runtime_routes_tenant ON llm_runtime_routes;
CREATE POLICY llm_runtime_routes_tenant ON llm_runtime_routes USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS llm_execution_audit_tenant ON llm_execution_audit;
CREATE POLICY llm_execution_audit_tenant ON llm_execution_audit USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS knowledge_refresh_jobs_tenant ON knowledge_refresh_jobs;
CREATE POLICY knowledge_refresh_jobs_tenant ON knowledge_refresh_jobs USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS knowledge_object_references_tenant ON knowledge_object_references;
CREATE POLICY knowledge_object_references_tenant ON knowledge_object_references USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS approved_knowledge_embeddings_tenant ON approved_knowledge_embeddings;
CREATE POLICY approved_knowledge_embeddings_tenant ON approved_knowledge_embeddings USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS fitness_delivery_jobs_tenant ON fitness_delivery_jobs;
CREATE POLICY fitness_delivery_jobs_tenant ON fitness_delivery_jobs USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS conformance_evidence_tenant ON conformance_evidence;
CREATE POLICY conformance_evidence_tenant ON conformance_evidence USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS conformance_findings_tenant ON conformance_findings;
CREATE POLICY conformance_findings_tenant ON conformance_findings USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS knowledge_release_signatures_tenant ON knowledge_release_signatures;
CREATE POLICY knowledge_release_signatures_tenant ON knowledge_release_signatures USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
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
