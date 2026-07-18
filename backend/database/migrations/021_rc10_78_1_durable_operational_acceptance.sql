-- rc.10.78.1: durable SaaS administration, explicit platform scope,
-- identity configuration, billing-event boundary and operational acceptance.
-- Applying this migration is not production acceptance. The deployment must
-- execute the active RLS, identity, queue, object-store and restore drills.

create schema if not exists aiw;

create or replace function aiw.tenant_row_visible(row_tenant_id text)
returns boolean
language sql
stable
as $$
  select row_tenant_id = current_setting('aiw.tenant_id', true)
      or current_setting('aiw.platform_admin', true) = 'true'
$$;

-- Replace earlier tenant-only policies with one explicit tenant/platform rule.
-- Normal requests set aiw.platform_admin=false; platform scope is never inferred.
drop policy if exists tenant_organisations_isolation on tenant_organisations_v1;
drop policy if exists tenant_organisations_v1_isolation on tenant_organisations_v1;
create policy tenant_organisations_v1_isolation on tenant_organisations_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_subscriptions_isolation on tenant_subscriptions_v1;
drop policy if exists tenant_subscriptions_v1_isolation on tenant_subscriptions_v1;
create policy tenant_subscriptions_v1_isolation on tenant_subscriptions_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_usage_events_isolation on tenant_usage_events_v1;
drop policy if exists tenant_usage_events_v1_isolation on tenant_usage_events_v1;
create policy tenant_usage_events_v1_isolation on tenant_usage_events_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_budget_policies_isolation on tenant_budget_policies_v1;
drop policy if exists tenant_budget_policies_v1_isolation on tenant_budget_policies_v1;
create policy tenant_budget_policies_v1_isolation on tenant_budget_policies_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

-- Reuse the canonical enterprise-security tables from migration 015 rather
-- than introducing a second role-mapping or tenant-policy truth.
alter table tenant_security_policies_v2 force row level security;
alter table tenant_role_assignments_v2 force row level security;
alter table tenant_role_mapping_rules_v2 force row level security;
alter table admin_audit_exports_v2 force row level security;

drop policy if exists tenant_security_policy_isolation on tenant_security_policies_v2;
drop policy if exists tenant_security_policies_v2_isolation on tenant_security_policies_v2;
create policy tenant_security_policies_v2_isolation on tenant_security_policies_v2
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_role_assignment_isolation on tenant_role_assignments_v2;
drop policy if exists tenant_role_assignments_v2_isolation on tenant_role_assignments_v2;
create policy tenant_role_assignments_v2_isolation on tenant_role_assignments_v2
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_role_mapping_isolation on tenant_role_mapping_rules_v2;
drop policy if exists tenant_role_mapping_rules_v2_isolation on tenant_role_mapping_rules_v2;
create policy tenant_role_mapping_rules_v2_isolation on tenant_role_mapping_rules_v2
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

drop policy if exists tenant_audit_export_isolation on admin_audit_exports_v2;
drop policy if exists admin_audit_exports_v2_isolation on admin_audit_exports_v2;
create policy admin_audit_exports_v2_isolation on admin_audit_exports_v2
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

create table if not exists tenant_identity_providers_v1 (
  provider_id text primary key,
  tenant_id text not null,
  provider_type text not null check (provider_type in ('oidc','saml')),
  name text not null,
  issuer text not null,
  client_id text not null,
  metadata_url text,
  scopes jsonb not null default '[]'::jsonb,
  enabled boolean not null default false,
  role_claim_path text,
  signing_certificate_reference text,
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table if not exists billing_event_inbox_v1 (
  provider text not null,
  event_id text not null,
  tenant_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  signature_verified boolean not null,
  disposition text not null check (disposition in ('accepted','ignored','rejected')),
  external_customer_reference text,
  external_subscription_reference text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_detail text not null,
  primary key (provider, event_id)
);

create table if not exists operational_acceptance_runs_v1 (
  run_id text primary key,
  tenant_id text not null,
  environment text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  status text not null check (status in ('passed','partial','failed')),
  checks jsonb not null,
  evidence_sha256 text not null,
  production_proof boolean not null default false,
  executed_by text not null
);

create table if not exists backup_restore_drills_v1 (
  drill_id text primary key,
  tenant_id text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  source_adapter text not null,
  backup_uri text not null,
  backup_sha256 text not null,
  restore_target text not null,
  restored_sha256 text not null,
  matched boolean not null,
  production_proof boolean not null default false,
  executed_by text not null
);

create index if not exists idx_identity_providers_tenant on tenant_identity_providers_v1(tenant_id, enabled);
create index if not exists idx_role_mapping_rules_v2_tenant on tenant_role_mapping_rules_v2(tenant_id, enabled);
create index if not exists idx_billing_event_inbox_tenant on billing_event_inbox_v1(tenant_id, received_at desc);
create index if not exists idx_operational_acceptance_tenant on operational_acceptance_runs_v1(tenant_id, completed_at desc);
create index if not exists idx_backup_restore_tenant on backup_restore_drills_v1(tenant_id, completed_at desc);

alter table tenant_identity_providers_v1 enable row level security;
alter table billing_event_inbox_v1 enable row level security;
alter table operational_acceptance_runs_v1 enable row level security;
alter table backup_restore_drills_v1 enable row level security;

alter table tenant_identity_providers_v1 force row level security;
alter table billing_event_inbox_v1 force row level security;
alter table operational_acceptance_runs_v1 force row level security;
alter table backup_restore_drills_v1 force row level security;

create policy tenant_identity_providers_v1_isolation on tenant_identity_providers_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));
create policy billing_event_inbox_v1_isolation on billing_event_inbox_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));
create policy operational_acceptance_runs_v1_isolation on operational_acceptance_runs_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));
create policy backup_restore_drills_v1_isolation on backup_restore_drills_v1
  using (aiw.tenant_row_visible(tenant_id)) with check (aiw.tenant_row_visible(tenant_id));

comment on table billing_event_inbox_v1 is
  'Idempotent provider-event boundary. No card, bank-account or payment-instrument data may be stored.';
comment on table operational_acceptance_runs_v1 is
  'Environment acceptance evidence only. A passed reference/local run is not production acceptance.';
comment on table backup_restore_drills_v1 is
  'Backup/restore drill evidence. production_proof is true only for an independently exercised target deployment.';
