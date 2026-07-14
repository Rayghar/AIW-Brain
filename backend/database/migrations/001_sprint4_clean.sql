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
