-- Sprint 8.0.2: integrated architecture journey, durable co-architect trace,
-- contextual guidance interactions and tenant-scoped model routing.

CREATE TABLE IF NOT EXISTS llm_runtime_policies (
  tenant_id TEXT PRIMARY KEY REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  policy JSONB NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((policy->>'redactSecrets')::boolean = true),
  CHECK (COALESCE((policy->>'logPrompts')::boolean, false) = false),
  CHECK (COALESCE((policy->>'retainProviderContent')::boolean, false) = false)
);

CREATE TABLE IF NOT EXISTS coarchitect_sessions (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  architecture_stage TEXT NOT NULL,
  scope_node_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','superseded')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, session_id)
);

CREATE TABLE IF NOT EXISTS coarchitect_messages (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  cited_record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_trace JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, session_id, message_id),
  FOREIGN KEY (tenant_id, session_id) REFERENCES coarchitect_sessions(tenant_id, session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_ai_reviews (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  review_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  architecture_stage TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('deterministic','llm-assisted')),
  summary TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposals JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_trace JSONB,
  reviewed_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, review_id)
);

CREATE TABLE IF NOT EXISTS design_guidance_interactions (
  tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  interaction_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL,
  suggestion_id TEXT NOT NULL,
  architecture_stage TEXT NOT NULL,
  placement TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('shown','opened','accepted','dismissed','deferred','completed')),
  knowledge_record_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  actor_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, interaction_id)
);

CREATE INDEX IF NOT EXISTS idx_coarchitect_project ON coarchitect_sessions(tenant_id, project_id, branch_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_coarchitect_messages ON coarchitect_messages(tenant_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_project ON architecture_ai_reviews(tenant_id, project_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guidance_project ON design_guidance_interactions(tenant_id, project_id, branch_id, occurred_at DESC);

ALTER TABLE llm_runtime_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE coarchitect_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coarchitect_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_ai_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_guidance_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llm_runtime_policies_tenant ON llm_runtime_policies;
CREATE POLICY llm_runtime_policies_tenant ON llm_runtime_policies USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS coarchitect_sessions_tenant ON coarchitect_sessions;
CREATE POLICY coarchitect_sessions_tenant ON coarchitect_sessions USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS coarchitect_messages_tenant ON coarchitect_messages;
CREATE POLICY coarchitect_messages_tenant ON coarchitect_messages USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS architecture_ai_reviews_tenant ON architecture_ai_reviews;
CREATE POLICY architecture_ai_reviews_tenant ON architecture_ai_reviews USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
DROP POLICY IF EXISTS design_guidance_interactions_tenant ON design_guidance_interactions;
CREATE POLICY design_guidance_interactions_tenant ON design_guidance_interactions USING (tenant_id = current_setting('aiw.tenant_id', true)) WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
