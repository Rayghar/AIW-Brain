-- rc.10.73.3: durable Architecture Brain proposal, review and waiver transactions.
-- These tables are append-only where practical and tenant scoped through RLS.

CREATE TABLE IF NOT EXISTS architecture_brain_transactions (
  tenant_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  project_revision INTEGER NOT NULL CHECK (project_revision >= 0),
  graph_revision INTEGER NOT NULL CHECK (graph_revision >= 0),
  graph_fingerprint TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('proposed','verified','review-pending','approved','approved-with-waiver','changes-requested','rejected','committed','superseded')),
  version INTEGER NOT NULL CHECK (version >= 1),
  created_by TEXT NOT NULL,
  assigned_reviewer_id TEXT,
  correlation_id TEXT NOT NULL,
  receipt JSONB NOT NULL,
  summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  last_event_hash TEXT NOT NULL,
  PRIMARY KEY (tenant_id, transaction_id)
);

CREATE TABLE IF NOT EXISTS architecture_brain_transaction_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  event_type TEXT NOT NULL CHECK (event_type IN ('proposal-recorded','deterministic-verified','review-assigned','review-started','review-approved','review-rejected','changes-requested','waiver-granted','waiver-revoked','committed','superseded')),
  actor_id TEXT NOT NULL,
  actor_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  rationale TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, event_id),
  UNIQUE (tenant_id, transaction_id, sequence),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES architecture_brain_transactions(tenant_id, transaction_id)
    ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS architecture_rule_waivers (
  tenant_id TEXT NOT NULL,
  waiver_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  transaction_id TEXT,
  finding_id TEXT NOT NULL,
  rule_id TEXT NOT NULL,
  scope_ref TEXT,
  reason TEXT NOT NULL,
  compensating_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  owner_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','expired','revoked')),
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revocation_reason TEXT,
  PRIMARY KEY (tenant_id, waiver_id),
  FOREIGN KEY (tenant_id, transaction_id)
    REFERENCES architecture_brain_transactions(tenant_id, transaction_id)
    ON DELETE RESTRICT,
  CHECK (owner_id <> approved_by),
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_brain_transactions_project
  ON architecture_brain_transactions(tenant_id, project_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_transactions_review
  ON architecture_brain_transactions(tenant_id, assigned_reviewer_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_transaction_events
  ON architecture_brain_transaction_events(tenant_id, transaction_id, sequence);
CREATE INDEX IF NOT EXISTS idx_architecture_rule_waivers
  ON architecture_rule_waivers(tenant_id, project_id, branch_id, status, expires_at);

ALTER TABLE architecture_brain_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_brain_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE architecture_rule_waivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS architecture_brain_transactions_tenant ON architecture_brain_transactions;
CREATE POLICY architecture_brain_transactions_tenant ON architecture_brain_transactions
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));

DROP POLICY IF EXISTS architecture_brain_transaction_events_tenant ON architecture_brain_transaction_events;
CREATE POLICY architecture_brain_transaction_events_tenant ON architecture_brain_transaction_events
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));

DROP POLICY IF EXISTS architecture_rule_waivers_tenant ON architecture_rule_waivers;
CREATE POLICY architecture_rule_waivers_tenant ON architecture_rule_waivers
  USING (tenant_id = current_setting('aiw.tenant_id', true))
  WITH CHECK (tenant_id = current_setting('aiw.tenant_id', true));
