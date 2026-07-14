-- Sprint 7.7: Dynamic Architecture Knowledge Mesh
-- Tenant-scoped knowledge governance. External content remains quarantined until approved.

CREATE TABLE IF NOT EXISTS knowledge_repository_connectors (
  tenant_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  repository TEXT NOT NULL,
  trust_tier INTEGER NOT NULL CHECK (trust_tier BETWEEN 1 AND 4),
  lifecycle_status TEXT NOT NULL CHECK (lifecycle_status IN ('approved','candidate','discovery-only','frozen','deprecated')),
  ingestion_mode TEXT NOT NULL CHECK (ingestion_mode IN ('content-reviewed','metadata-only','adapter-only','discovery-only')),
  definition JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, connector_id)
);

CREATE TABLE IF NOT EXISTS knowledge_source_snapshots (
  tenant_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  repository_revision TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('quarantined','analysed','rejected','accepted')),
  fetched_at TIMESTAMPTZ NOT NULL,
  etag TEXT,
  manifest JSONB NOT NULL,
  created_by TEXT NOT NULL,
  PRIMARY KEY (tenant_id, snapshot_id),
  FOREIGN KEY (tenant_id, connector_id) REFERENCES knowledge_repository_connectors(tenant_id, connector_id)
);

CREATE TABLE IF NOT EXISTS architecture_knowledge_claims (
  tenant_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object_value TEXT NOT NULL,
  polarity TEXT NOT NULL CHECK (polarity IN ('supports','limits','requires','prohibits','neutral')),
  review_status TEXT NOT NULL CHECK (review_status IN ('candidate','verified','disputed','rejected','superseded')),
  source_confidence NUMERIC NOT NULL CHECK (source_confidence BETWEEN 0 AND 100),
  corroboration_score NUMERIC NOT NULL CHECK (corroboration_score BETWEEN 0 AND 100),
  definition JSONB NOT NULL,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, claim_id)
);

CREATE TABLE IF NOT EXISTS knowledge_claim_evidence (
  tenant_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  connector_id TEXT NOT NULL,
  repository_path TEXT NOT NULL,
  repository_revision TEXT NOT NULL,
  excerpt_hash TEXT NOT NULL,
  location JSONB NOT NULL,
  PRIMARY KEY (tenant_id, claim_id, snapshot_id, repository_path, excerpt_hash),
  FOREIGN KEY (tenant_id, claim_id) REFERENCES architecture_knowledge_claims(tenant_id, claim_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, snapshot_id) REFERENCES knowledge_source_snapshots(tenant_id, snapshot_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, connector_id) REFERENCES knowledge_repository_connectors(tenant_id, connector_id)
);

CREATE TABLE IF NOT EXISTS knowledge_claim_contradictions (
  tenant_id TEXT NOT NULL,
  contradiction_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('contextual','material','blocking')),
  resolution_status TEXT NOT NULL CHECK (resolution_status IN ('open','context-separated','resolved','accepted-divergence')),
  definition JSONB NOT NULL,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, contradiction_id)
);

CREATE TABLE IF NOT EXISTS knowledge_change_proposals (
  tenant_id TEXT NOT NULL,
  proposal_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','pending-review','approved','changes-requested','rejected','published')),
  definition JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, proposal_id)
);

CREATE TABLE IF NOT EXISTS knowledge_recommendation_regressions (
  tenant_id TEXT NOT NULL,
  regression_id TEXT NOT NULL,
  name TEXT NOT NULL,
  project_fixture JSONB NOT NULL,
  expected_outcome JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','retired')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, regression_id)
);

CREATE TABLE IF NOT EXISTS knowledge_releases (
  tenant_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','retired')),
  checksum TEXT NOT NULL,
  manifest JSONB NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, release_id),
  UNIQUE (tenant_id, version)
);

CREATE TABLE IF NOT EXISTS knowledge_release_claims (
  tenant_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, release_id, claim_id),
  FOREIGN KEY (tenant_id, release_id) REFERENCES knowledge_releases(tenant_id, release_id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id, claim_id) REFERENCES architecture_knowledge_claims(tenant_id, claim_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_knowledge_snapshot_connector ON knowledge_source_snapshots(tenant_id, connector_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_claim_subject ON architecture_knowledge_claims(tenant_id, subject_id, claim_type, review_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_claim_review ON architecture_knowledge_claims(tenant_id, review_status, source_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_contradictions_open ON knowledge_claim_contradictions(tenant_id, resolution_status, severity);
CREATE INDEX IF NOT EXISTS idx_knowledge_proposals_status ON knowledge_change_proposals(tenant_id, status, created_at DESC);

ALTER TABLE knowledge_repository_connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_knowledge_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_claim_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_claim_contradictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_change_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_recommendation_regressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_release_claims ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'knowledge_repository_connectors','knowledge_source_snapshots','architecture_knowledge_claims',
    'knowledge_claim_evidence','knowledge_claim_contradictions','knowledge_change_proposals',
    'knowledge_recommendation_regressions','knowledge_releases','knowledge_release_claims'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;
