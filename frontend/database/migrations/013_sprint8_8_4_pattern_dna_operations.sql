-- Sprint 8.8.4 — Pattern DNA Operations
-- Governed pattern edits are staged as knowledge operations and must be
-- materialized into release candidates before they can affect production.

CREATE TABLE IF NOT EXISTS pattern_dna_staged_edits_v2 (
  tenant_id text NOT NULL DEFAULT 'default',
  edit_id text PRIMARY KEY,
  pattern_id text NOT NULL,
  field text NOT NULL,
  value_json jsonb NOT NULL,
  editor text NOT NULL,
  rationale text NOT NULL,
  status text NOT NULL CHECK (status IN ('staged','materialized','discarded')),
  staged_at timestamptz NOT NULL DEFAULT now(),
  materialized_candidate_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pattern_dna_staged_edits_tenant_status
  ON pattern_dna_staged_edits_v2 (tenant_id, status, staged_at DESC);

ALTER TABLE pattern_dna_staged_edits_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pattern_dna_staged_edits_tenant_policy ON pattern_dna_staged_edits_v2;
CREATE POLICY pattern_dna_staged_edits_tenant_policy ON pattern_dna_staged_edits_v2
  USING (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) IS NULL)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true) OR current_setting('app.tenant_id', true) IS NULL);
