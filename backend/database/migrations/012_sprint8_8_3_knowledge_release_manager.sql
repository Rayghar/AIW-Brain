-- Sprint 8.8.3: Knowledge Release Manager + durable Knowledge Ops persistence.
-- Candidate knowledge remains isolated from production scoring until a governed
-- validation + promotion transition writes an immutable release manifest.

CREATE TABLE IF NOT EXISTS knowledge_release_candidates_v2 (
  tenant_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  base_release_id TEXT NOT NULL,
  proposed_release_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft','candidate','under-review','approved','released','superseded','rolled-back','blocked')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  proposed_library JSONB NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  promoted_by TEXT,
  promoted_at TIMESTAMPTZ,
  rolled_back_by TEXT,
  rolled_back_at TIMESTAMPTZ,
  rollback_reason TEXT,
  PRIMARY KEY (tenant_id, candidate_id)
);

CREATE TABLE IF NOT EXISTS knowledge_release_manifests_v2 (
  tenant_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  base_release_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  promoted_by TEXT NOT NULL,
  promoted_at TIMESTAMPTZ NOT NULL,
  change_count INTEGER NOT NULL,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation JSONB NOT NULL,
  provenance JSONB NOT NULL,
  manifest JSONB NOT NULL,
  PRIMARY KEY (tenant_id, release_id),
  FOREIGN KEY (tenant_id, candidate_id) REFERENCES knowledge_release_candidates_v2(tenant_id, candidate_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS knowledge_release_pins_v2 (
  tenant_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('tenant','project')),
  scope_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  pinned_by TEXT NOT NULL,
  pinned_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, scope, scope_id)
);

CREATE TABLE IF NOT EXISTS knowledge_ops_events_v2 (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject TEXT NOT NULL,
  detail TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_krc_v2_status ON knowledge_release_candidates_v2(tenant_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_krm_v2_promoted ON knowledge_release_manifests_v2(tenant_id, promoted_at DESC);
CREATE INDEX IF NOT EXISTS idx_kop_events_v2_created ON knowledge_ops_events_v2(tenant_id, created_at DESC);

ALTER TABLE knowledge_release_candidates_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_release_manifests_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_release_pins_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_ops_events_v2 ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'knowledge_release_candidates_v2',
    'knowledge_release_manifests_v2',
    'knowledge_release_pins_v2',
    'knowledge_ops_events_v2'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = current_setting(''aiw.tenant_id'', true)) WITH CHECK (tenant_id = current_setting(''aiw.tenant_id'', true))', tbl);
  END LOOP;
END $$;
