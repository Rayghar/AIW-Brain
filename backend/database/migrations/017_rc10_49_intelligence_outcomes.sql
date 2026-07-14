-- rc.10.49 — Governed recommendation-outcome feedback.
-- Outcome evidence is tenant-scoped and can only produce reviewable calibration proposals.
-- It never changes production scoring directly.

CREATE TABLE IF NOT EXISTS recommendation_outcomes (
  tenant_id text NOT NULL,
  outcome_id text NOT NULL,
  project_id text NOT NULL,
  recommendation_id text NOT NULL,
  recommendation_type text NOT NULL CHECK (recommendation_type IN ('style','pattern','tactic','finding','decision')),
  record_id text,
  stage text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('accepted','rejected','deferred','implemented','superseded')),
  reason text NOT NULL,
  decided_by text NOT NULL,
  decided_at timestamptz NOT NULL,
  implemented_at timestamptz,
  review_result text CHECK (review_result IS NULL OR review_result IN ('passed','conditional','failed')),
  conformance_result text CHECK (conformance_result IS NULL OR conformance_result IN ('conformant','partial','non-conformant')),
  observed_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  knowledge_release_id text NOT NULL,
  auto_learning_applied boolean NOT NULL DEFAULT false CHECK (auto_learning_applied = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, outcome_id)
);

CREATE INDEX IF NOT EXISTS recommendation_outcomes_record_idx
  ON recommendation_outcomes(tenant_id, record_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS recommendation_outcomes_project_idx
  ON recommendation_outcomes(tenant_id, project_id, decided_at DESC);

ALTER TABLE recommendation_outcomes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recommendation_outcomes_tenant_isolation ON recommendation_outcomes;
CREATE POLICY recommendation_outcomes_tenant_isolation ON recommendation_outcomes
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
