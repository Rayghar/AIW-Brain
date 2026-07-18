-- rc.10.78: Enterprise/SaaS administration persistence foundation.
-- This migration defines tenant-scoped persistence and RLS contracts for the
-- Admin Portal. Applying it is not, by itself, production acceptance: the API
-- must run a deployment-specific PostgreSQL/RLS acceptance suite first.

create table if not exists saas_plan_catalog (
  plan_id text primary key check (plan_id in ('architect','enterprise')),
  name text not null,
  description text not null,
  monthly_price_usd numeric(12,4),
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '[]'::jsonb,
  metered_features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint saas_plan_non_negative_price check (monthly_price_usd is null or monthly_price_usd >= 0)
);

create table if not exists tenant_organisations_v1 (
  tenant_id text primary key,
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active','suspended')),
  primary_region text not null,
  data_residency text not null,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create table if not exists tenant_subscriptions_v1 (
  tenant_id text primary key,
  plan_id text not null references saas_plan_catalog(plan_id),
  status text not null check (status in ('trial','active','past-due','suspended','cancelled')),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  external_billing_reference text,
  updated_at timestamptz not null default now(),
  updated_by text not null,
  constraint tenant_subscription_period_valid check (current_period_end > current_period_start)
);

create table if not exists tenant_usage_events_v1 (
  event_id text primary key,
  tenant_id text not null,
  project_id text,
  metric text not null check (metric in ('active-projects','reasoning-runs','input-tokens','output-tokens','storage-bytes','exports','collaborator-seats')),
  quantity numeric(20,4) not null check (quantity >= 0),
  estimated_cost_usd numeric(16,8) check (estimated_cost_usd is null or estimated_cost_usd >= 0),
  occurred_at timestamptz not null,
  source text not null,
  correlation_id text
);

create table if not exists tenant_budget_policies_v1 (
  tenant_id text primary key,
  monthly_budget_usd numeric(16,4) check (monthly_budget_usd is null or monthly_budget_usd >= 0),
  warning_percent numeric(6,2) not null default 80 check (warning_percent between 1 and 100),
  mode text not null default 'notify-only' check (mode = 'notify-only'),
  semantic_acceptance_unaffected boolean not null default true check (semantic_acceptance_unaffected = true),
  updated_at timestamptz not null default now(),
  updated_by text not null
);

create index if not exists idx_tenant_usage_events_period
  on tenant_usage_events_v1(tenant_id, occurred_at desc);
create index if not exists idx_tenant_usage_events_project
  on tenant_usage_events_v1(tenant_id, project_id, occurred_at desc);

alter table tenant_organisations_v1 enable row level security;
alter table tenant_subscriptions_v1 enable row level security;
alter table tenant_usage_events_v1 enable row level security;
alter table tenant_budget_policies_v1 enable row level security;

alter table tenant_organisations_v1 force row level security;
alter table tenant_subscriptions_v1 force row level security;
alter table tenant_usage_events_v1 force row level security;
alter table tenant_budget_policies_v1 force row level security;

drop policy if exists tenant_organisations_isolation on tenant_organisations_v1;
create policy tenant_organisations_isolation on tenant_organisations_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_subscriptions_isolation on tenant_subscriptions_v1;
create policy tenant_subscriptions_isolation on tenant_subscriptions_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_usage_events_isolation on tenant_usage_events_v1;
create policy tenant_usage_events_isolation on tenant_usage_events_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

drop policy if exists tenant_budget_policies_isolation on tenant_budget_policies_v1;
create policy tenant_budget_policies_isolation on tenant_budget_policies_v1
  using (tenant_id = current_setting('aiw.tenant_id', true))
  with check (tenant_id = current_setting('aiw.tenant_id', true));

comment on table tenant_usage_events_v1 is
  'Usage and estimated-cost attribution only. Cost thresholds must not reduce evidence coverage, semantic acceptance, architecture completeness or continuation.';
comment on table tenant_budget_policies_v1 is
  'Notify-only operator budget policy. It cannot alter architecture acceptance or approved state.';
