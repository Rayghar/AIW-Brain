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
