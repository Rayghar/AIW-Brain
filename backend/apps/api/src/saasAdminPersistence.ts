import { Pool, type PoolClient } from 'pg';
import type {
  AdminControlPlaneStore,
  BackupRestoreDrill,
  BillingEventReceipt,
  EnterpriseIdentityProvider,
  OperationalAcceptanceRun,
  OrganisationProfile,
  RoleMappingRule,
  TenantBudgetPolicy,
  TenantSubscription,
  TenantUsageEvent,
} from '@aiw/admin';

export interface SaasPersistenceHealth {
  adapter: 'memory' | 'postgresql';
  ready: boolean;
  durable: boolean;
  rlsCapable: boolean;
  detail: string;
}

export interface RlsIsolationAcceptance {
  executed: boolean;
  adapter: 'memory' | 'postgresql';
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  passed: boolean;
  productionProof: boolean;
}

export interface SaasAdminPersistence {
  health(): Promise<SaasPersistenceHealth>;
  listOrganisations(scope: { tenantId: string; platformAdmin: boolean }): Promise<OrganisationProfile[]>;
  getOrganisation(tenantId: string): Promise<OrganisationProfile | null>;
  saveOrganisation(value: OrganisationProfile, platformAdmin?: boolean): Promise<void>;
  getSubscription(tenantId: string): Promise<TenantSubscription | null>;
  saveSubscription(value: TenantSubscription, platformAdmin?: boolean): Promise<void>;
  listUsageEvents(tenantId: string, periodStart?: string, periodEnd?: string): Promise<TenantUsageEvent[]>;
  appendUsageEvent(value: TenantUsageEvent, platformAdmin?: boolean): Promise<{ inserted: boolean }>;
  getBudget(tenantId: string): Promise<TenantBudgetPolicy | null>;
  saveBudget(value: TenantBudgetPolicy, platformAdmin?: boolean): Promise<void>;
  listIdentityProviders(scope: { tenantId: string; platformAdmin: boolean }): Promise<EnterpriseIdentityProvider[]>;
  saveIdentityProvider(value: EnterpriseIdentityProvider, platformAdmin?: boolean): Promise<void>;
  listRoleMappingRules(scope: { tenantId: string; platformAdmin: boolean }): Promise<RoleMappingRule[]>;
  saveRoleMappingRule(value: RoleMappingRule, platformAdmin?: boolean): Promise<void>;
  getBillingEvent(provider: string, eventId: string, tenantId: string): Promise<BillingEventReceipt | null>;
  recordBillingEvent(value: BillingEventReceipt, platformAdmin?: boolean): Promise<{ inserted: boolean }>;
  listOperationalAcceptanceRuns(tenantId: string): Promise<OperationalAcceptanceRun[]>;
  recordOperationalAcceptanceRun(value: OperationalAcceptanceRun, platformAdmin?: boolean): Promise<void>;
  listBackupRestoreDrills(tenantId: string): Promise<BackupRestoreDrill[]>;
  recordBackupRestoreDrill(value: BackupRestoreDrill, platformAdmin?: boolean): Promise<void>;
  exportTenantSnapshot(tenantId: string): Promise<{
    organisation: OrganisationProfile | null;
    subscription: TenantSubscription | null;
    usageEvents: TenantUsageEvent[];
    budget: TenantBudgetPolicy | null;
    identityProviders: EnterpriseIdentityProvider[];
    roleMappingRules: RoleMappingRule[];
  }>;
  runRlsIsolationAcceptance(): Promise<RlsIsolationAcceptance>;
  close?(): Promise<void>;
}

function clone<T>(value: T): T { return structuredClone(value); }

type MemoryStore = Pick<AdminControlPlaneStore,
  'organisations' | 'subscriptions' | 'usageEvents' | 'budgets' | 'identityProviders' |
  'roleMappingRules' | 'billingEvents' | 'operationalAcceptanceRuns' | 'backupRestoreDrills'>;

export class MemorySaasAdminPersistence implements SaasAdminPersistence {
  constructor(private readonly store: MemoryStore) {}

  async health(): Promise<SaasPersistenceHealth> {
    return { adapter: 'memory', ready: true, durable: false, rlsCapable: false, detail: 'Reference in-memory SaaS administration store.' };
  }
  async listOrganisations(scope: { tenantId: string; platformAdmin: boolean }): Promise<OrganisationProfile[]> {
    return [...this.store.organisations.values()].filter((item) => scope.platformAdmin || item.tenantId === scope.tenantId).map(clone);
  }
  async getOrganisation(tenantId: string) { return clone(this.store.organisations.get(tenantId) ?? null); }
  async saveOrganisation(value: OrganisationProfile) { this.store.organisations.set(value.tenantId, clone(value)); }
  async getSubscription(tenantId: string) { return clone(this.store.subscriptions.get(tenantId) ?? null); }
  async saveSubscription(value: TenantSubscription) { this.store.subscriptions.set(value.tenantId, clone(value)); }
  async listUsageEvents(tenantId: string, periodStart?: string, periodEnd?: string) {
    const start = periodStart ? Date.parse(periodStart) : Number.NEGATIVE_INFINITY;
    const end = periodEnd ? Date.parse(periodEnd) : Number.POSITIVE_INFINITY;
    return this.store.usageEvents.filter((item) => item.tenantId === tenantId && Date.parse(item.occurredAt) >= start && Date.parse(item.occurredAt) < end).map(clone);
  }
  async appendUsageEvent(value: TenantUsageEvent) {
    if (this.store.usageEvents.some((item) => item.eventId === value.eventId)) return { inserted: false };
    this.store.usageEvents.push(clone(value)); return { inserted: true };
  }
  async getBudget(tenantId: string) { return clone(this.store.budgets.get(tenantId) ?? null); }
  async saveBudget(value: TenantBudgetPolicy) { this.store.budgets.set(value.tenantId, clone(value)); }
  async listIdentityProviders(scope: { tenantId: string; platformAdmin: boolean }) { return [...this.store.identityProviders.values()].filter((item) => scope.platformAdmin || item.tenantId === scope.tenantId).map(clone); }
  async saveIdentityProvider(value: EnterpriseIdentityProvider) { this.store.identityProviders.set(value.providerId, clone(value)); }
  async listRoleMappingRules(scope: { tenantId: string; platformAdmin: boolean }) { return [...this.store.roleMappingRules.values()].filter((item) => scope.platformAdmin || item.tenantId === scope.tenantId).map(clone); }
  async saveRoleMappingRule(value: RoleMappingRule) { this.store.roleMappingRules.set(value.ruleId, clone(value)); }
  async getBillingEvent(provider: string, eventId: string, tenantId: string) { const item = this.store.billingEvents.get(`${provider}:${eventId}`); return item?.tenantId === tenantId ? clone(item) : null; }
  async recordBillingEvent(value: BillingEventReceipt) { const key = `${value.provider}:${value.eventId}`; if (this.store.billingEvents.has(key)) return { inserted: false }; this.store.billingEvents.set(key, clone(value)); return { inserted: true }; }
  async listOperationalAcceptanceRuns(tenantId: string) { return this.store.operationalAcceptanceRuns.filter((item) => item.tenantId === tenantId).map(clone); }
  async recordOperationalAcceptanceRun(value: OperationalAcceptanceRun) { const index = this.store.operationalAcceptanceRuns.findIndex((item) => item.runId === value.runId); if (index >= 0) this.store.operationalAcceptanceRuns[index] = clone(value); else this.store.operationalAcceptanceRuns.push(clone(value)); }
  async listBackupRestoreDrills(tenantId: string) { return this.store.backupRestoreDrills.filter((item) => item.tenantId === tenantId).map(clone); }
  async recordBackupRestoreDrill(value: BackupRestoreDrill) { const index = this.store.backupRestoreDrills.findIndex((item) => item.drillId === value.drillId); if (index >= 0) this.store.backupRestoreDrills[index] = clone(value); else this.store.backupRestoreDrills.push(clone(value)); }
  async exportTenantSnapshot(tenantId: string) { return { organisation: await this.getOrganisation(tenantId), subscription: await this.getSubscription(tenantId), usageEvents: await this.listUsageEvents(tenantId), budget: await this.getBudget(tenantId), identityProviders: await this.listIdentityProviders({ tenantId, platformAdmin: false }), roleMappingRules: await this.listRoleMappingRules({ tenantId, platformAdmin: false }) }; }

  async runRlsIsolationAcceptance(): Promise<RlsIsolationAcceptance> {
    const tenantA = `rls-memory-a-${Date.now()}`;
    const tenantB = `rls-memory-b-${Date.now()}`;
    const now = new Date().toISOString();
    await this.saveOrganisation({ tenantId: tenantA, name: 'RLS A', slug: tenantA.slice(0, 63), status: 'active', primaryRegion: 'test', dataResidency: 'test', createdAt: now, updatedAt: now, updatedBy: 'rls-test' });
    await this.saveOrganisation({ tenantId: tenantB, name: 'RLS B', slug: tenantB.slice(0, 63), status: 'active', primaryRegion: 'test', dataResidency: 'test', createdAt: now, updatedAt: now, updatedBy: 'rls-test' });
    const tenantAList = await this.listOrganisations({ tenantId: tenantA, platformAdmin: false });
    const tenantBList = await this.listOrganisations({ tenantId: tenantB, platformAdmin: false });
    const platformList = await this.listOrganisations({ tenantId: tenantA, platformAdmin: true });
    this.store.organisations.delete(tenantA); this.store.organisations.delete(tenantB);
    const checks = [
      { id: 'tenant-a-sees-self', ok: tenantAList.length === 1 && tenantAList[0]?.tenantId === tenantA, detail: 'Tenant scope returns only the active tenant.' },
      { id: 'tenant-a-cannot-see-b', ok: !tenantAList.some((item) => item.tenantId === tenantB), detail: 'Cross-tenant row is hidden.' },
      { id: 'tenant-b-cannot-see-a', ok: tenantBList.length === 1 && tenantBList[0]?.tenantId === tenantB && !tenantBList.some((item) => item.tenantId === tenantA), detail: 'Reverse tenant scope also hides cross-tenant rows.' },
      { id: 'platform-admin-explicit-scope', ok: platformList.some((item) => item.tenantId === tenantA) && platformList.some((item) => item.tenantId === tenantB), detail: 'Platform scope is explicit rather than implicit.' },
    ];
    return { executed: true, adapter: 'memory', checks, passed: checks.every((item) => item.ok), productionProof: false };
  }
}

type Row = Record<string, unknown>;
function dateValue(value: unknown): string { return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString(); }
function opt(value: unknown): string | undefined { return value === null || value === undefined || String(value) === '' ? undefined : String(value); }
function organisationFromRow(row: Row): OrganisationProfile {
  const billingEmail = opt(row.billing_email);
  return { tenantId: String(row.tenant_id), name: String(row.name), slug: String(row.slug), status: row.status as OrganisationProfile['status'], primaryRegion: String(row.primary_region), dataResidency: String(row.data_residency), ...(billingEmail ? { billingEmail } : {}), createdAt: dateValue(row.created_at), updatedAt: dateValue(row.updated_at), updatedBy: String(row.updated_by) };
}
function subscriptionFromRow(row: Row): TenantSubscription {
  const externalBillingReference = opt(row.external_billing_reference);
  return { tenantId: String(row.tenant_id), planId: row.plan_id as TenantSubscription['planId'], status: row.status as TenantSubscription['status'], currentPeriodStart: dateValue(row.current_period_start), currentPeriodEnd: dateValue(row.current_period_end), ...(externalBillingReference ? { externalBillingReference } : {}), updatedAt: dateValue(row.updated_at), updatedBy: String(row.updated_by) };
}
function usageFromRow(row: Row): TenantUsageEvent {
  const projectId = opt(row.project_id); const correlationId = opt(row.correlation_id);
  return { eventId: String(row.event_id), tenantId: String(row.tenant_id), ...(projectId ? { projectId } : {}), metric: row.metric as TenantUsageEvent['metric'], quantity: Number(row.quantity), ...(row.estimated_cost_usd === null || row.estimated_cost_usd === undefined ? {} : { estimatedCostUsd: Number(row.estimated_cost_usd) }), occurredAt: dateValue(row.occurred_at), source: row.source as TenantUsageEvent['source'], ...(correlationId ? { correlationId } : {}) };
}
function budgetFromRow(row: Row): TenantBudgetPolicy { return { tenantId: String(row.tenant_id), monthlyBudgetUsd: row.monthly_budget_usd === null ? null : Number(row.monthly_budget_usd), warningPercent: Number(row.warning_percent), mode: 'notify-only', semanticAcceptanceUnaffected: true, updatedAt: dateValue(row.updated_at), updatedBy: String(row.updated_by) }; }
function identityFromRow(row: Row): EnterpriseIdentityProvider {
  const metadataUrl = opt(row.metadata_url); const roleClaimPath = opt(row.role_claim_path); const signingCertificateReference = opt(row.signing_certificate_reference);
  return { providerId: String(row.provider_id), tenantId: String(row.tenant_id), type: row.provider_type as EnterpriseIdentityProvider['type'], name: String(row.name), issuer: String(row.issuer), clientId: String(row.client_id), ...(metadataUrl ? { metadataUrl } : {}), scopes: Array.isArray(row.scopes) ? row.scopes.map(String) : [], enabled: Boolean(row.enabled), ...(roleClaimPath ? { roleClaimPath } : {}), ...(signingCertificateReference ? { signingCertificateReference } : {}), updatedAt: dateValue(row.updated_at), updatedBy: String(row.updated_by) };
}
function mappingFromRow(row: Row): RoleMappingRule { return { ruleId: String(row.rule_id), tenantId: String(row.tenant_id), claim: String(row.claim), match: String(row.match), roles: Array.isArray(row.roles) ? row.roles as RoleMappingRule['roles'] : [], enabled: Boolean(row.enabled), updatedAt: dateValue(row.updated_at), updatedBy: String(row.updated_by) }; }
function billingFromRow(row: Row): BillingEventReceipt {
  const externalCustomerReference = opt(row.external_customer_reference); const externalSubscriptionReference = opt(row.external_subscription_reference);
  return { provider: String(row.provider), eventId: String(row.event_id), tenantId: String(row.tenant_id), eventType: String(row.event_type), payloadSha256: String(row.payload_sha256), signatureVerified: Boolean(row.signature_verified), disposition: row.disposition as BillingEventReceipt['disposition'], ...(externalCustomerReference ? { externalCustomerReference } : {}), ...(externalSubscriptionReference ? { externalSubscriptionReference } : {}), receivedAt: dateValue(row.received_at), ...(row.processed_at ? { processedAt: dateValue(row.processed_at) } : {}), processingDetail: String(row.processing_detail) };
}
function operationalFromRow(row: Row): OperationalAcceptanceRun { return { runId: String(row.run_id), tenantId: String(row.tenant_id), environment: String(row.environment), startedAt: dateValue(row.started_at), completedAt: dateValue(row.completed_at), status: row.status as OperationalAcceptanceRun['status'], checks: Array.isArray(row.checks) ? row.checks as OperationalAcceptanceRun['checks'] : [], evidenceSha256: String(row.evidence_sha256), productionProof: Boolean(row.production_proof), executedBy: String(row.executed_by) }; }
function drillFromRow(row: Row): BackupRestoreDrill { return { drillId: String(row.drill_id), tenantId: String(row.tenant_id), startedAt: dateValue(row.started_at), completedAt: dateValue(row.completed_at), sourceAdapter: String(row.source_adapter), backupUri: String(row.backup_uri), backupSha256: String(row.backup_sha256), restoreTarget: String(row.restore_target), restoredSha256: String(row.restored_sha256), matched: Boolean(row.matched), productionProof: Boolean(row.production_proof), executedBy: String(row.executed_by) }; }

export class PostgresSaasAdminPersistence implements SaasAdminPersistence {
  private readonly pool: Pool;
  constructor(connectionString = process.env.DATABASE_URL, pool?: Pool) {
    if (!connectionString && !pool) throw new Error('DATABASE_URL_REQUIRED');
    this.pool = pool ?? new Pool({ connectionString, max: Number(process.env.AIW_SAAS_DB_POOL_MAX ?? 10), statement_timeout: Number(process.env.AIW_SAAS_DB_STATEMENT_TIMEOUT_MS ?? 15_000) });
  }
  private async withScope<T>(tenantId: string, platformAdmin: boolean, operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('aiw.tenant_id', $1, true)", [tenantId]);
      await client.query("SELECT set_config('aiw.platform_admin', $1, true)", [platformAdmin ? 'true' : 'false']);
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
  async health(): Promise<SaasPersistenceHealth> { try { const r = await this.pool.query<{ database: string }>('SELECT current_database() AS database'); await this.pool.query('SELECT 1 FROM tenant_organisations_v1 LIMIT 1'); return { adapter: 'postgresql', ready: true, durable: true, rlsCapable: true, detail: `Connected to ${r.rows[0]?.database ?? 'PostgreSQL'}; SaaS tables available.` }; } catch (error) { return { adapter: 'postgresql', ready: false, durable: true, rlsCapable: true, detail: error instanceof Error ? error.message : String(error) }; } }
  async listOrganisations(scope: { tenantId: string; platformAdmin: boolean }) { return this.withScope(scope.tenantId, scope.platformAdmin, async (c) => (await c.query<Row>('SELECT * FROM tenant_organisations_v1 ORDER BY name, tenant_id')).rows.map(organisationFromRow)); }
  async getOrganisation(tenantId: string) { return this.withScope(tenantId, false, async (c) => { const r = await c.query<Row>('SELECT * FROM tenant_organisations_v1 WHERE tenant_id=$1', [tenantId]); return r.rows[0] ? organisationFromRow(r.rows[0]) : null; }); }
  async saveOrganisation(v: OrganisationProfile, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO tenant_organisations_v1 (tenant_id,name,slug,status,primary_region,data_residency,billing_email,created_at,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (tenant_id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,status=EXCLUDED.status,primary_region=EXCLUDED.primary_region,data_residency=EXCLUDED.data_residency,billing_email=EXCLUDED.billing_email,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`, [v.tenantId, v.name, v.slug, v.status, v.primaryRegion, v.dataResidency, v.billingEmail ?? null, v.createdAt, v.updatedAt, v.updatedBy]).then(() => undefined)); }
  async getSubscription(tenantId: string) { return this.withScope(tenantId, false, async (c) => { const r = await c.query<Row>('SELECT * FROM tenant_subscriptions_v1 WHERE tenant_id=$1', [tenantId]); return r.rows[0] ? subscriptionFromRow(r.rows[0]) : null; }); }
  async saveSubscription(v: TenantSubscription, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO tenant_subscriptions_v1 (tenant_id,plan_id,status,current_period_start,current_period_end,external_billing_reference,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (tenant_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,status=EXCLUDED.status,current_period_start=EXCLUDED.current_period_start,current_period_end=EXCLUDED.current_period_end,external_billing_reference=EXCLUDED.external_billing_reference,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`, [v.tenantId, v.planId, v.status, v.currentPeriodStart, v.currentPeriodEnd, v.externalBillingReference ?? null, v.updatedAt, v.updatedBy]).then(() => undefined)); }
  async listUsageEvents(tenantId: string, periodStart?: string, periodEnd?: string) { return this.withScope(tenantId, false, async (c) => (await c.query<Row>(`SELECT * FROM tenant_usage_events_v1 WHERE tenant_id=$1 AND ($2::timestamptz IS NULL OR occurred_at >= $2::timestamptz) AND ($3::timestamptz IS NULL OR occurred_at < $3::timestamptz) ORDER BY occurred_at`, [tenantId, periodStart ?? null, periodEnd ?? null])).rows.map(usageFromRow)); }
  async appendUsageEvent(v: TenantUsageEvent, platformAdmin = false) { return this.withScope(v.tenantId, platformAdmin, async (c) => { const r = await c.query(`INSERT INTO tenant_usage_events_v1 (event_id,tenant_id,project_id,metric,quantity,estimated_cost_usd,occurred_at,source,correlation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (event_id) DO NOTHING`, [v.eventId, v.tenantId, v.projectId ?? null, v.metric, v.quantity, v.estimatedCostUsd ?? null, v.occurredAt, v.source, v.correlationId ?? null]); return { inserted: (r.rowCount ?? 0) === 1 }; }); }
  async getBudget(tenantId: string) { return this.withScope(tenantId, false, async (c) => { const r = await c.query<Row>('SELECT * FROM tenant_budget_policies_v1 WHERE tenant_id=$1', [tenantId]); return r.rows[0] ? budgetFromRow(r.rows[0]) : null; }); }
  async saveBudget(v: TenantBudgetPolicy, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO tenant_budget_policies_v1 (tenant_id,monthly_budget_usd,warning_percent,mode,semantic_acceptance_unaffected,updated_at,updated_by) VALUES ($1,$2,$3,'notify-only',true,$4,$5) ON CONFLICT (tenant_id) DO UPDATE SET monthly_budget_usd=EXCLUDED.monthly_budget_usd,warning_percent=EXCLUDED.warning_percent,mode='notify-only',semantic_acceptance_unaffected=true,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`, [v.tenantId, v.monthlyBudgetUsd, v.warningPercent, v.updatedAt, v.updatedBy]).then(() => undefined)); }
  async listIdentityProviders(scope: { tenantId: string; platformAdmin: boolean }) { return this.withScope(scope.tenantId, scope.platformAdmin, async (c) => (await c.query<Row>('SELECT * FROM tenant_identity_providers_v1 ORDER BY name, provider_id')).rows.map(identityFromRow)); }
  async saveIdentityProvider(v: EnterpriseIdentityProvider, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO tenant_identity_providers_v1 (provider_id,tenant_id,provider_type,name,issuer,client_id,metadata_url,scopes,enabled,role_claim_path,signing_certificate_reference,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13) ON CONFLICT (provider_id) DO UPDATE SET provider_type=EXCLUDED.provider_type,name=EXCLUDED.name,issuer=EXCLUDED.issuer,client_id=EXCLUDED.client_id,metadata_url=EXCLUDED.metadata_url,scopes=EXCLUDED.scopes,enabled=EXCLUDED.enabled,role_claim_path=EXCLUDED.role_claim_path,signing_certificate_reference=EXCLUDED.signing_certificate_reference,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`, [v.providerId, v.tenantId, v.type, v.name, v.issuer, v.clientId, v.metadataUrl ?? null, JSON.stringify(v.scopes), v.enabled, v.roleClaimPath ?? null, v.signingCertificateReference ?? null, v.updatedAt, v.updatedBy]).then(() => undefined)); }
  async listRoleMappingRules(scope: { tenantId: string; platformAdmin: boolean }) { return this.withScope(scope.tenantId, scope.platformAdmin, async (c) => (await c.query<Row>('SELECT * FROM tenant_role_mapping_rules_v2 ORDER BY rule_id')).rows.map(mappingFromRow)); }
  async saveRoleMappingRule(v: RoleMappingRule, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO tenant_role_mapping_rules_v2 (rule_id,tenant_id,claim,match,roles,enabled,updated_at,updated_by) VALUES ($1,$2,$3,$4,$5::text[],$6,$7,$8) ON CONFLICT (rule_id) DO UPDATE SET claim=EXCLUDED.claim,match=EXCLUDED.match,roles=EXCLUDED.roles,enabled=EXCLUDED.enabled,updated_at=EXCLUDED.updated_at,updated_by=EXCLUDED.updated_by`, [v.ruleId, v.tenantId, v.claim, v.match, v.roles, v.enabled, v.updatedAt, v.updatedBy]).then(() => undefined)); }
  async getBillingEvent(provider: string, eventId: string, tenantId: string) { return this.withScope(tenantId, false, async (c) => { const r = await c.query<Row>('SELECT * FROM billing_event_inbox_v1 WHERE provider=$1 AND event_id=$2', [provider, eventId]); return r.rows[0] ? billingFromRow(r.rows[0]) : null; }); }
  async recordBillingEvent(v: BillingEventReceipt, platformAdmin = false) { return this.withScope(v.tenantId, platformAdmin, async (c) => { const r = await c.query(`INSERT INTO billing_event_inbox_v1 (provider,event_id,tenant_id,event_type,payload_sha256,signature_verified,disposition,external_customer_reference,external_subscription_reference,received_at,processed_at,processing_detail) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (provider,event_id) DO NOTHING`, [v.provider, v.eventId, v.tenantId, v.eventType, v.payloadSha256, v.signatureVerified, v.disposition, v.externalCustomerReference ?? null, v.externalSubscriptionReference ?? null, v.receivedAt, v.processedAt ?? null, v.processingDetail]); return { inserted: (r.rowCount ?? 0) === 1 }; }); }
  async listOperationalAcceptanceRuns(tenantId: string) { return this.withScope(tenantId, false, async (c) => (await c.query<Row>('SELECT * FROM operational_acceptance_runs_v1 WHERE tenant_id=$1 ORDER BY completed_at DESC', [tenantId])).rows.map(operationalFromRow)); }
  async recordOperationalAcceptanceRun(v: OperationalAcceptanceRun, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO operational_acceptance_runs_v1 (run_id,tenant_id,environment,started_at,completed_at,status,checks,evidence_sha256,production_proof,executed_by) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) ON CONFLICT (run_id) DO UPDATE SET completed_at=EXCLUDED.completed_at,status=EXCLUDED.status,checks=EXCLUDED.checks,evidence_sha256=EXCLUDED.evidence_sha256,production_proof=EXCLUDED.production_proof,executed_by=EXCLUDED.executed_by`, [v.runId, v.tenantId, v.environment, v.startedAt, v.completedAt, v.status, JSON.stringify(v.checks), v.evidenceSha256, v.productionProof, v.executedBy]).then(() => undefined)); }
  async listBackupRestoreDrills(tenantId: string) { return this.withScope(tenantId, false, async (c) => (await c.query<Row>('SELECT * FROM backup_restore_drills_v1 WHERE tenant_id=$1 ORDER BY completed_at DESC', [tenantId])).rows.map(drillFromRow)); }
  async recordBackupRestoreDrill(v: BackupRestoreDrill, platformAdmin = false) { await this.withScope(v.tenantId, platformAdmin, (c) => c.query(`INSERT INTO backup_restore_drills_v1 (drill_id,tenant_id,started_at,completed_at,source_adapter,backup_uri,backup_sha256,restore_target,restored_sha256,matched,production_proof,executed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (drill_id) DO UPDATE SET completed_at=EXCLUDED.completed_at,restored_sha256=EXCLUDED.restored_sha256,matched=EXCLUDED.matched,production_proof=EXCLUDED.production_proof,executed_by=EXCLUDED.executed_by`, [v.drillId, v.tenantId, v.startedAt, v.completedAt, v.sourceAdapter, v.backupUri, v.backupSha256, v.restoreTarget, v.restoredSha256, v.matched, v.productionProof, v.executedBy]).then(() => undefined)); }
  async exportTenantSnapshot(tenantId: string) { return { organisation: await this.getOrganisation(tenantId), subscription: await this.getSubscription(tenantId), usageEvents: await this.listUsageEvents(tenantId), budget: await this.getBudget(tenantId), identityProviders: await this.listIdentityProviders({ tenantId, platformAdmin: false }), roleMappingRules: await this.listRoleMappingRules({ tenantId, platformAdmin: false }) }; }

  async runRlsIsolationAcceptance(): Promise<RlsIsolationAcceptance> {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantA = `rls-a-${suffix}`;
    const tenantB = `rls-b-${suffix}`;
    const checks: RlsIsolationAcceptance['checks'] = [];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('aiw.tenant_id', $1, true)", [tenantA]);
      await client.query("SELECT set_config('aiw.platform_admin', 'true', true)");
      await client.query(`INSERT INTO tenant_organisations_v1 (tenant_id,name,slug,status,primary_region,data_residency,updated_by) VALUES ($1,'RLS A',$2,'active','test','test','rls-acceptance'),($3,'RLS B',$4,'active','test','test','rls-acceptance')`, [tenantA, tenantA.slice(0, 63), tenantB, tenantB.slice(0, 63)]);
      await client.query('COMMIT');
      const a = await this.withScope(tenantA, false, (c) => c.query<{ tenant_id: string }>('SELECT tenant_id FROM tenant_organisations_v1'));
      const b = await this.withScope(tenantB, false, (c) => c.query<{ tenant_id: string }>('SELECT tenant_id FROM tenant_organisations_v1'));
      const platform = await this.withScope(tenantA, true, (c) => c.query<{ tenant_id: string }>('SELECT tenant_id FROM tenant_organisations_v1 WHERE tenant_id=ANY($1::text[])', [[tenantA, tenantB]]));
      checks.push(
        { id: 'tenant-a-row-visible', ok: a.rows.some((row) => row.tenant_id === tenantA), detail: 'Tenant A can read its own row.' },
        { id: 'tenant-a-cross-row-hidden', ok: !a.rows.some((row) => row.tenant_id === tenantB), detail: 'Tenant A cannot read tenant B.' },
        { id: 'tenant-b-cross-row-hidden', ok: !b.rows.some((row) => row.tenant_id === tenantA), detail: 'Tenant B cannot read tenant A.' },
        { id: 'platform-admin-explicit-scope', ok: platform.rows.length === 2, detail: 'Explicit platform scope can enumerate both acceptance rows.' },
      );
      await this.withScope(tenantA, false, (c) => c.query("UPDATE tenant_organisations_v1 SET name='forbidden' WHERE tenant_id=$1", [tenantB]));
      const unchanged = await this.withScope(tenantB, false, (c) => c.query<{ name: string }>('SELECT name FROM tenant_organisations_v1 WHERE tenant_id=$1', [tenantB]));
      checks.push({ id: 'cross-tenant-write-blocked', ok: unchanged.rows[0]?.name === 'RLS B', detail: 'Cross-tenant update affected no visible row.' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      checks.push({ id: 'rls-execution', ok: false, detail: error instanceof Error ? error.message : String(error) });
    } finally {
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('aiw.tenant_id', $1, true)", [tenantA]);
        await client.query("SELECT set_config('aiw.platform_admin', 'true', true)");
        await client.query('DELETE FROM tenant_organisations_v1 WHERE tenant_id=ANY($1::text[])', [[tenantA, tenantB]]);
        await client.query('COMMIT');
      } catch { await client.query('ROLLBACK').catch(() => undefined); }
      client.release();
    }
    const passed = checks.length >= 5 && checks.every((item) => item.ok);
    return { executed: true, adapter: 'postgresql', checks, passed, productionProof: false };
  }
  async close() { await this.pool.end(); }
}

const instances = new WeakMap<object, SaasAdminPersistence>();
export function createSaasAdminPersistence(store: AdminControlPlaneStore): SaasAdminPersistence {
  const current = instances.get(store as object); if (current) return current;
  const persistence = process.env.AIW_SAAS_PERSISTENCE === 'postgresql' || (process.env.AIW_SAAS_PERSISTENCE !== 'memory' && Boolean(process.env.DATABASE_URL))
    ? new PostgresSaasAdminPersistence()
    : new MemorySaasAdminPersistence(store);
  instances.set(store as object, persistence); return persistence;
}
