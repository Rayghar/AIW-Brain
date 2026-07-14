-- AIW rc.10.2 ArchitectureView separation foundation.
CREATE TABLE IF NOT EXISTS architecture_views (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  project_id text NOT NULL,
  branch_id text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL,
  density text NOT NULL,
  view_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
