-- Sprint 8.8.8: Enterprise Security, RBAC and Scale Hardening
-- PostgreSQL-ready schema and RLS contracts for production deployment.

create table if not exists tenant_security_policies_v2 (
  tenant_id text primary key,
  mode text not null check (mode in ('development','pilot','production')),
  require_sso boolean not null default true,
  allow_development_auth boolean not null default false,
  allowed_identity_provider_ids text[] not null default '{}',
  allowed_email_domains text[] not null default '{}',
  default_knowledge_release_id text,
  data_residency text,
  max_session_minutes integer not null default 480 check (max_session_minutes between 15 and 1440),
  audit_retention_days integer not null default 365 check (audit_retention_days >= 90),
  repository_write_policy text not null default 'deny' check (repository_write_policy in ('allow','deny','review-required')),
  runtime_evidence_policy text not null default 'evidence-only' check (runtime_evidence_policy in ('evidence-only','mutation-review-required')),
  candidate_knowledge_policy text not null default 'blocked-from-production' check (candidate_knowledge_policy in ('blocked-from-production','advisory-only')),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  constraint production_blocks_dev_auth check (mode <> 'production' or (require_sso = true and allow_development_auth = false and cardinality(allowed_identity_provider_ids) > 0))
);

create table if not exists tenant_role_assignments_v2 (
  assignment_id text primary key,
  tenant_id text not null,
  subject text not null,
  email text,
  roles text[] not null,
  source text not null check (source in ('oidc','manual','development-token','proxy-verified')),
  active boolean not null default true,
  expires_at timestamptz,
  updated_by text not null,
  updated_at timestamptz not null default now(),
  constraint non_empty_roles check (cardinality(roles) > 0),
  constraint expiry_in_future check (expires_at is null or expires_at > updated_at)
);

create table if not exists tenant_role_mapping_rules_v2 (
  rule_id text primary key,
  tenant_id text not null,
  claim text not null,
  match text not null,
  roles text[] not null,
  enabled boolean not null default true,
  updated_by text not null,
  updated_at timestamptz not null default now(),
  constraint non_empty_mapping_roles check (cardinality(roles) > 0)
);

create table if not exists admin_audit_exports_v2 (
  export_id text primary key,
  tenant_id text not null,
  generated_at timestamptz not null default now(),
  generated_by text not null,
  format text not null check (format in ('csv','json')),
  row_count integer not null default 0,
  checksum_sha256 text not null,
  retention_warning text not null
);

alter table tenant_security_policies_v2 enable row level security;
alter table tenant_role_assignments_v2 enable row level security;
alter table tenant_role_mapping_rules_v2 enable row level security;
alter table admin_audit_exports_v2 enable row level security;

drop policy if exists tenant_security_policy_isolation on tenant_security_policies_v2;
create policy tenant_security_policy_isolation on tenant_security_policies_v2
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_role_assignment_isolation on tenant_role_assignments_v2;
create policy tenant_role_assignment_isolation on tenant_role_assignments_v2
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_role_mapping_isolation on tenant_role_mapping_rules_v2;
create policy tenant_role_mapping_isolation on tenant_role_mapping_rules_v2
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_audit_export_isolation on admin_audit_exports_v2;
create policy tenant_audit_export_isolation on admin_audit_exports_v2
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));
