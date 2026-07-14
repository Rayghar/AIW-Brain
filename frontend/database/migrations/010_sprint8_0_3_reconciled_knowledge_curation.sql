-- AIW v0.9.6 reconciled knowledge curation.
-- Persists LLM-drafted candidate records and named human promotion decisions.

CREATE TABLE IF NOT EXISTS knowledge_record_drafts (
  tenant_id text NOT NULL,
  draft_id text NOT NULL,
  record_id text NOT NULL,
  record_type text NOT NULL CHECK (record_type IN ('architectureStyle','pattern')),
  status text NOT NULL CHECK (status IN ('candidate','reviewed','approved','rejected')),
  owner text,
  source_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  record jsonb NOT NULL,
  reviewer_brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, draft_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_record_drafts_status
  ON knowledge_record_drafts(tenant_id, status, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_record_drafts_record
  ON knowledge_record_drafts(tenant_id, record_id, draft_id);

ALTER TABLE knowledge_record_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS knowledge_record_drafts_tenant ON knowledge_record_drafts;
CREATE POLICY knowledge_record_drafts_tenant ON knowledge_record_drafts
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
