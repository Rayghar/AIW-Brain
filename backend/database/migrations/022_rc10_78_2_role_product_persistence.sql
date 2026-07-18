-- rc.10.78.2 role-centred project/user persistence.
-- Extends the existing project and enterprise identity authorities; it does not
-- introduce a password store or a second authorisation model.

alter table projects add column if not exists organisation_id text;
alter table projects add column if not exists business_intent text;
alter table projects add column if not exists domain text;
alter table projects add column if not exists project_type text not null default 'architecture-design';
alter table projects add column if not exists lifecycle_status text not null default 'draft';
alter table projects add column if not exists owning_user_id text;
alter table projects add column if not exists solution_architect_user_id text;
alter table projects add column if not exists enterprise_architect_user_id text;
alter table projects add column if not exists archived_at timestamptz;
alter table projects add column if not exists created_at timestamptz not null default now();

create table if not exists tenant_user_profiles_v1 (
  tenant_id text not null,
  user_id text not null,
  organisation_id text,
  identity_subject text not null,
  email text not null,
  display_name text not null,
  roles text[] not null,
  status text not null default 'invited' check (status in ('invited','active','suspended','disabled')),
  default_profile text not null check (default_profile in ('solution-architect','enterprise-architect','platform-architect','architecture-reviewer','administrator','knowledge-curator')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null,
  primary key (tenant_id, user_id),
  constraint tenant_user_profile_roles_non_empty check (cardinality(roles) > 0),
  constraint tenant_user_profile_roles_known check (roles <@ array['platform-admin','solution-architect','platform-architect','knowledge-admin','knowledge-curator','architecture-reviewer','security-reviewer','compliance-reviewer','enterprise-architect','model-admin','repository-admin','security-admin','auditor']::text[])
);

create unique index if not exists idx_tenant_user_profiles_subject on tenant_user_profiles_v1(tenant_id, identity_subject);
create unique index if not exists idx_tenant_user_profiles_email on tenant_user_profiles_v1(tenant_id, lower(email));
create index if not exists idx_tenant_user_profiles_status on tenant_user_profiles_v1(tenant_id, status, updated_at desc);

create table if not exists tenant_user_invitations_v1 (
  tenant_id text not null,
  invitation_id text not null,
  user_id text not null,
  email text not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at timestamptz not null,
  sent_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_by text not null,
  primary key (tenant_id, invitation_id),
  foreign key (tenant_id, user_id) references tenant_user_profiles_v1(tenant_id, user_id) on delete cascade
);

create unique index if not exists idx_tenant_user_invitation_token on tenant_user_invitations_v1(token_hash);
create index if not exists idx_tenant_user_invitations_status on tenant_user_invitations_v1(tenant_id, status, expires_at);

alter table tenant_user_profiles_v1 enable row level security;
alter table tenant_user_profiles_v1 force row level security;
alter table tenant_user_invitations_v1 enable row level security;
alter table tenant_user_invitations_v1 force row level security;

drop policy if exists tenant_user_profiles_v1_isolation on tenant_user_profiles_v1;
create policy tenant_user_profiles_v1_isolation on tenant_user_profiles_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_user_invitations_v1_isolation on tenant_user_invitations_v1;
create policy tenant_user_invitations_v1_isolation on tenant_user_invitations_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

comment on table tenant_user_profiles_v1 is 'AIW tenant identity profile and role mapping. Authentication secrets remain with the configured enterprise identity provider.';
comment on table tenant_user_invitations_v1 is 'Hashed invitation lifecycle only; no password or raw invitation token is persisted.';
