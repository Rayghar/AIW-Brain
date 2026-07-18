import type { FastifyInstance, FastifyRequest } from 'fastify';
import { createId } from '@aiw/domain';
import { hasPermission } from '@aiw/engine';
import {
  actorName,
  buildTenantUsageSummary,
  evaluateTenantEntitlements,
  normalizeBudgetPolicy,
  normalizeOrganisationProfile,
  normalizeRoleMappingRule,
  normalizeTenantSubscription,
  type AdminOperationalPosture,
  type EnterpriseIdentityProvider,
  type TenantUsageEvent,
  type UsageMetric,
} from '@aiw/admin';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { BillingBoundary, type BillingEventEnvelope } from '../billingBoundary.js';
import { runEnterpriseIdentityAcceptance, validateEnterpriseIdentityProvider } from '../enterpriseIdentityAcceptance.js';
import { runEnterpriseOperationalAcceptance } from '../enterpriseOperationalAcceptance.js';
import { type TelemetryRuntime } from '../observability.js';
import { createSaasAdminPersistence, type SaasAdminPersistence } from '../saasAdminPersistence.js';

interface RuntimePrincipal { tenantId: string; subject: string; email?: string; roles?: string[]; authMode?: string }
export interface SaasAdminDeps {
  principalFor: (request: FastifyRequest) => RuntimePrincipal;
  persistence?: SaasAdminPersistence;
  telemetry?: TelemetryRuntime;
}

const metricIds = new Set<UsageMetric>(['active-projects', 'reasoning-runs', 'input-tokens', 'output-tokens', 'storage-bytes', 'exports', 'collaborator-seats']);

function deny(principal: RuntimePrincipal, permission: string, roles: string[]) {
  adminRepositories.audit.push({ actor: actorName(principal), action: 'rbac.denied', subject: permission, at: new Date().toISOString(), detail: `roles: ${roles.join(',') || 'none'}`, tenantId: principal.tenantId });
  return { error: 'PERMISSION_DENIED', permission, roles };
}

function guard(request: FastifyRequest, permission: string, principalFor: SaasAdminDeps['principalFor']) {
  const principal = principalFor(request);
  const verdict = hasPermission(principal, permission);
  return { principal, verdict };
}

function requestedTenant(request: FastifyRequest, principal: RuntimePrincipal, body?: { tenantId?: string }): { ok: true; tenantId: string; crossTenant: boolean } | { ok: false; error: string } {
  const queryTenant = String((request.query as { tenantId?: string } | undefined)?.tenantId ?? '').trim();
  const bodyTenant = String(body?.tenantId ?? '').trim();
  const tenantId = bodyTenant || queryTenant || principal.tenantId;
  const crossTenant = tenantId !== principal.tenantId;
  if (crossTenant && !(principal.roles ?? []).includes('platform-admin')) return { ok: false, error: 'TENANT_BOUNDARY_VIOLATION' };
  return { ok: true, tenantId, crossTenant };
}

function currentPeriod() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

async function operationalPosture(tenantId: string, persistence: SaasAdminPersistence): Promise<AdminOperationalPosture & Record<string, unknown>> {
  const deploymentMode = process.env.AIW_DEPLOYMENT_MODE === 'production' ? 'production' : process.env.AIW_DEPLOYMENT_MODE === 'pilot' ? 'pilot' : 'reference';
  const persistenceHealth = await persistence.health();
  const queueConfigured = Boolean(process.env.AIW_EVENT_TRANSPORT && process.env.AIW_EVENT_TRANSPORT !== 'memory');
  const objectStorageConfigured = Boolean(process.env.AIW_KNOWLEDGE_OBJECT_STORE === 's3' || process.env.AIW_KNOWLEDGE_S3_BUCKET);
  const telemetryConfigured = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
  const workerConfigured = process.env.AIW_WORKER_ENABLED === 'true';
  const acceptanceRuns = await persistence.listOperationalAcceptanceRuns(tenantId);
  const backupDrills = await persistence.listBackupRestoreDrills(tenantId);
  const latestAcceptance = acceptanceRuns[0] ?? null;
  const latestBackup = backupDrills[0] ?? null;
  const services: AdminOperationalPosture['services'] = [
    { service: 'api', status: 'healthy', evidence: 'Current request completed through the AIW API.', productionProof: false },
    { service: 'database', status: persistenceHealth.ready ? (persistenceHealth.durable ? 'healthy' : 'degraded') : 'not-configured', evidence: persistenceHealth.detail, productionProof: false },
    { service: 'worker', status: workerConfigured ? 'healthy' : 'not-configured', evidence: workerConfigured ? 'Worker runtime is enabled by configuration.' : 'Asynchronous worker runtime is not enabled.', productionProof: false },
    { service: 'queue', status: queueConfigured ? 'healthy' : 'degraded', evidence: queueConfigured ? `Event transport=${process.env.AIW_EVENT_TRANSPORT}.` : 'Local durable acceptance queue is available; deployment queue is not configured.', productionProof: false },
    { service: 'object-storage', status: objectStorageConfigured ? 'healthy' : 'degraded', evidence: objectStorageConfigured ? 'S3-compatible configuration is present.' : 'Local filesystem acceptance storage is available; deployment object storage is not configured.', productionProof: false },
    { service: 'telemetry', status: telemetryConfigured ? 'healthy' : 'degraded', evidence: telemetryConfigured ? 'OTLP exporter configuration is present.' : 'Local telemetry capture is available; external telemetry export is not configured.', productionProof: false },
  ];
  const blockers = services.filter((service) => service.status !== 'healthy').map((service) => `${service.service}: ${service.evidence}`);
  if (!latestAcceptance || latestAcceptance.status !== 'passed' || !latestAcceptance.productionProof) blockers.push('Target-environment operational acceptance is not independently verified.');
  if (!latestBackup?.matched || !latestBackup.productionProof) blockers.push('Target-environment backup and restore is not independently verified.');
  return {
    generatedAt: new Date().toISOString(), tenantId, deploymentMode, deterministicModeAvailable: true, services,
    backup: { status: latestBackup?.matched ? 'reference-only' : 'not-exercised', ...(latestBackup?.completedAt ? { lastExerciseAt: latestBackup.completedAt } : {}), productionProof: false },
    blockers, productionAccepted: false,
    persistence: persistenceHealth,
    latestAcceptance,
    latestBackup,
    billingBoundary: { configured: Boolean(process.env.AIW_BILLING_WEBHOOK_SECRET), posture: process.env.AIW_BILLING_WEBHOOK_SECRET ? 'signed-event-boundary-configured' : 'reference-only-not-configured', paymentInstrumentStorage: false },
  };
}

async function tenantSnapshot(tenantId: string, persistence: SaasAdminPersistence) {
  const period = currentPeriod();
  const [organisation, subscription, usageEvents, budget, operations] = await Promise.all([
    persistence.getOrganisation(tenantId), persistence.getSubscription(tenantId), persistence.listUsageEvents(tenantId, period.start, period.end), persistence.getBudget(tenantId), operationalPosture(tenantId, persistence),
  ]);
  const plan = subscription ? adminRepositories.planCatalog.get(subscription.planId) ?? null : null;
  const usage = buildTenantUsageSummary(usageEvents, tenantId, period.start, period.end);
  const entitlements = plan ? evaluateTenantEntitlements(plan, usage) : [];
  const budgetPercent = budget?.monthlyBudgetUsd && budget.monthlyBudgetUsd > 0 ? Math.round((usage.estimatedCostUsd / budget.monthlyBudgetUsd) * 10000) / 100 : 0;
  const access = [...adminRepositories.roleAssignments.values()].filter((assignment: { tenantId: string; active: boolean }) => assignment.tenantId === tenantId && assignment.active);
  const policy = adminRepositories.tenantPolicies.get(tenantId) ?? null;
  const blockers = [
    ...operations.blockers,
    ...(organisation ? [] : ['Organisation profile is not configured.']),
    ...(subscription ? [] : ['Subscription is not configured.']),
    ...(policy ? [] : ['Tenant security policy is not configured.']),
    ...(access.length ? [] : ['No active role assignment exists for the tenant.']),
  ];
  return {
    generatedAt: new Date().toISOString(), tenantId, organisation, subscription, plan, usage, entitlements, budget,
    budgetStatus: { percent: budgetPercent, warning: Boolean(budget?.monthlyBudgetUsd && budgetPercent >= budget.warningPercent), mode: budget?.mode ?? 'notify-only', semanticAcceptanceUnaffected: true },
    access: { activeAssignments: access.length, roleCount: new Set(access.flatMap((assignment: { roles: string[] }) => assignment.roles)).size },
    policy, operations, blockers, productionAccepted: false,
  };
}

function normalizeIdentityProvider(input: Partial<EnterpriseIdentityProvider>, actor: string, tenantId: string): { ok: true; provider: EnterpriseIdentityProvider } | { ok: false; reasons: string[] } {
  const type = input.type === 'saml' ? 'saml' : input.type === 'oidc' ? 'oidc' : null;
  const provider: EnterpriseIdentityProvider = {
    providerId: input.providerId?.trim() || createId('idp'), tenantId, type: type ?? 'oidc', name: input.name?.trim() || '', issuer: input.issuer?.trim() || '', clientId: input.clientId?.trim() || '',
    ...(input.metadataUrl?.trim() ? { metadataUrl: input.metadataUrl.trim() } : {}), scopes: Array.isArray(input.scopes) ? input.scopes.map(String).map((item) => item.trim()).filter(Boolean) : type === 'oidc' ? ['openid'] : [],
    enabled: input.enabled ?? false, ...(input.roleClaimPath?.trim() ? { roleClaimPath: input.roleClaimPath.trim() } : {}),
    ...(input.signingCertificateReference?.trim() ? { signingCertificateReference: input.signingCertificateReference.trim() } : {}), updatedAt: new Date().toISOString(), updatedBy: actor,
  };
  const reasons = [
    ...(type ? [] : ['Identity provider type must be oidc or saml.']), ...(provider.name ? [] : ['Provider name is required.']), ...(provider.issuer ? [] : ['Issuer is required.']), ...(provider.clientId ? [] : ['Client/entity identifier is required.']),
  ];
  if (!reasons.length) reasons.push(...validateEnterpriseIdentityProvider(provider).filter((item) => !item.ok && item.id !== 'provider-enabled').map((item) => item.detail));
  return reasons.length ? { ok: false, reasons } : { ok: true, provider };
}

export async function saasAdminRoutes(app: FastifyInstance, deps: SaasAdminDeps): Promise<void> {
  const { principalFor } = deps;
  const persistence = deps.persistence ?? createSaasAdminPersistence(adminRepositories);

  app.get('/api/admin/saas/overview', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.read', principalFor);
    if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.read', verdict.roles));
    const scope = requestedTenant(request, principal); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    if (scope.crossTenant) adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.cross-tenant-read', subject: scope.tenantId, at: new Date().toISOString(), detail: 'Platform admin opened a tenant-scoped admin overview.', tenantId: scope.tenantId });
    return tenantSnapshot(scope.tenantId, persistence);
  });

  app.get('/api/admin/saas/tenants', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.read', verdict.roles));
    const isPlatformAdmin = verdict.roles.includes('platform-admin');
    const organisations = await persistence.listOrganisations({ tenantId: principal.tenantId, platformAdmin: isPlatformAdmin });
    const tenants = await Promise.all(organisations.map(async (organisation) => ({ ...organisation, subscription: await persistence.getSubscription(organisation.tenantId), policy: adminRepositories.tenantPolicies.get(organisation.tenantId) ?? null })));
    return { tenants, platformScope: isPlatformAdmin };
  });

  app.put('/api/admin/saas/organisation', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.organisation.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.organisation.write', verdict.roles));
    const body = (request.body ?? {}) as Record<string, unknown> & { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const normalized = normalizeOrganisationProfile({ ...body, tenantId: scope.tenantId } as never, actorName(principal), scope.tenantId); if (!normalized.ok) return reply.code(400).send({ error: 'ORGANISATION_INVALID', reasons: normalized.reasons });
    const organisations = await persistence.listOrganisations({ tenantId: principal.tenantId, platformAdmin: true });
    const slugOwner = organisations.find((organisation) => organisation.slug === normalized.organisation.slug && organisation.tenantId !== scope.tenantId); if (slugOwner) return reply.code(409).send({ error: 'ORGANISATION_SLUG_CONFLICT', slug: normalized.organisation.slug });
    const before = await persistence.getOrganisation(scope.tenantId); await persistence.saveOrganisation(normalized.organisation, scope.crossTenant);
    adminRepositories.audit.push({ actor: actorName(principal), action: before ? 'saas.organisation.updated' : 'saas.organisation.created', subject: scope.tenantId, at: normalized.organisation.updatedAt, detail: normalized.organisation.name, tenantId: scope.tenantId, before, after: normalized.organisation });
    return { saved: true, organisation: normalized.organisation };
  });

  app.get('/api/admin/saas/plans', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.read', verdict.roles));
    return { plans: [...adminRepositories.planCatalog.values()], commercialStatus: 'reference-catalogue-signed-billing-event-boundary-available' };
  });

  app.put('/api/admin/saas/subscription', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.subscription.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.subscription.write', verdict.roles));
    const body = (request.body ?? {}) as Record<string, unknown> & { tenantId?: string; planId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    if (!body.planId || !adminRepositories.planCatalog.has(body.planId)) return reply.code(400).send({ error: 'UNKNOWN_PLAN' });
    const normalized = normalizeTenantSubscription({ ...body, tenantId: scope.tenantId } as never, actorName(principal), scope.tenantId); if (!normalized.ok) return reply.code(400).send({ error: 'SUBSCRIPTION_INVALID', reasons: normalized.reasons });
    const before = await persistence.getSubscription(scope.tenantId); await persistence.saveSubscription(normalized.subscription, scope.crossTenant);
    adminRepositories.audit.push({ actor: actorName(principal), action: before ? 'saas.subscription.updated' : 'saas.subscription.created', subject: scope.tenantId, at: normalized.subscription.updatedAt, detail: `${normalized.subscription.planId}:${normalized.subscription.status}`, tenantId: scope.tenantId, before, after: normalized.subscription });
    return { saved: true, subscription: normalized.subscription, billingProviderMutation: false, posture: 'manual-reference-administration' };
  });

  app.get('/api/admin/saas/usage', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.usage.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.usage.read', verdict.roles));
    const scope = requestedTenant(request, principal); if (!scope.ok) return reply.code(403).send({ error: scope.error }); const period = currentPeriod();
    const events = await persistence.listUsageEvents(scope.tenantId, period.start, period.end); const usage = buildTenantUsageSummary(events, scope.tenantId, period.start, period.end);
    const subscription = await persistence.getSubscription(scope.tenantId); const plan = subscription ? adminRepositories.planCatalog.get(subscription.planId) : undefined;
    return { usage, entitlements: plan ? evaluateTenantEntitlements(plan, usage) : [], budget: await persistence.getBudget(scope.tenantId), accountingPosture: 'tenant-attribution-no-payment-instrument-storage' };
  });

  app.post('/api/admin/saas/usage/events', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.usage.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.usage.write', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string; projectId?: string; metric?: UsageMetric; quantity?: number; estimatedCostUsd?: number; correlationId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    if (!body.metric || !metricIds.has(body.metric)) return reply.code(400).send({ error: 'USAGE_METRIC_INVALID' }); if (!Number.isFinite(body.quantity) || Number(body.quantity) < 0) return reply.code(400).send({ error: 'USAGE_QUANTITY_INVALID' });
    if (body.estimatedCostUsd !== undefined && (!Number.isFinite(body.estimatedCostUsd) || body.estimatedCostUsd < 0)) return reply.code(400).send({ error: 'USAGE_COST_INVALID' });
    const event: TenantUsageEvent = { eventId: createId('usage'), tenantId: scope.tenantId, ...(body.projectId ? { projectId: body.projectId } : {}), metric: body.metric, quantity: Number(body.quantity), ...(body.estimatedCostUsd !== undefined ? { estimatedCostUsd: body.estimatedCostUsd } : {}), occurredAt: new Date().toISOString(), source: 'admin-reference', ...(body.correlationId ? { correlationId: body.correlationId } : {}) };
    const inserted = await persistence.appendUsageEvent(event, scope.crossTenant); adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.usage.recorded', subject: event.metric, at: event.occurredAt, detail: `${event.quantity}${event.projectId ? `; project=${event.projectId}` : ''}`, tenantId: scope.tenantId, after: event });
    return reply.code(inserted.inserted ? 201 : 200).send({ recorded: inserted.inserted, replayed: !inserted.inserted, event, semanticAcceptanceUnaffected: true });
  });

  app.put('/api/admin/saas/budget', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.budget.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.budget.write', verdict.roles));
    const body = (request.body ?? {}) as Record<string, unknown> & { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const normalized = normalizeBudgetPolicy({ ...body, tenantId: scope.tenantId } as never, actorName(principal), scope.tenantId); if (!normalized.ok) return reply.code(400).send({ error: 'BUDGET_INVALID', reasons: normalized.reasons });
    const before = await persistence.getBudget(scope.tenantId); await persistence.saveBudget(normalized.budget, scope.crossTenant); adminRepositories.audit.push({ actor: actorName(principal), action: before ? 'saas.budget.updated' : 'saas.budget.created', subject: scope.tenantId, at: normalized.budget.updatedAt, detail: `monthly=${normalized.budget.monthlyBudgetUsd ?? 'unset'}; warning=${normalized.budget.warningPercent}%; notify-only`, tenantId: scope.tenantId, before, after: normalized.budget });
    return { saved: true, budget: normalized.budget, semanticAcceptanceUnaffected: true };
  });

  app.get('/api/admin/saas/identity/providers', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.identity.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.identity.read', verdict.roles));
    const scope = requestedTenant(request, principal); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    return { providers: await persistence.listIdentityProviders({ tenantId: scope.tenantId, platformAdmin: false }), mappingRules: await persistence.listRoleMappingRules({ tenantId: scope.tenantId, platformAdmin: false }), productionAccepted: false };
  });

  app.put('/api/admin/saas/identity/providers', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.identity.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.identity.write', verdict.roles));
    const body = (request.body ?? {}) as Partial<EnterpriseIdentityProvider> & { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const normalized = normalizeIdentityProvider(body, actorName(principal), scope.tenantId); if (!normalized.ok) return reply.code(400).send({ error: 'IDENTITY_PROVIDER_INVALID', reasons: normalized.reasons });
    await persistence.saveIdentityProvider(normalized.provider, scope.crossTenant); adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.identity-provider.saved', subject: normalized.provider.providerId, at: normalized.provider.updatedAt, detail: `${normalized.provider.type}; enabled=${normalized.provider.enabled}`, tenantId: scope.tenantId, after: { ...normalized.provider, signingCertificateReference: normalized.provider.signingCertificateReference ? '[configured-reference]' : undefined } });
    return { saved: true, provider: normalized.provider, liveAuthenticationPerformed: false };
  });

  app.put('/api/admin/saas/identity/role-mappings', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.identity.write', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.identity.write', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const normalized = normalizeRoleMappingRule(body as never, actorName(principal), scope.tenantId); if (!normalized.ok) return reply.code(400).send({ error: 'ROLE_MAPPING_RULE_INVALID', reasons: normalized.reasons });
    await persistence.saveRoleMappingRule(normalized.rule, scope.crossTenant); adminRepositories.roleMappingRules.set(normalized.rule.ruleId, normalized.rule); adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.identity-role-mapping.saved', subject: normalized.rule.ruleId, at: normalized.rule.updatedAt, detail: `${normalized.rule.claim}=${normalized.rule.match}`, tenantId: scope.tenantId, after: normalized.rule });
    return { saved: true, rule: normalized.rule };
  });

  app.post('/api/admin/saas/identity/acceptance', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.identity.test', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.identity.test', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const result = runEnterpriseIdentityAcceptance({ tenantId: scope.tenantId, policy: adminRepositories.tenantPolicies.get(scope.tenantId) ?? null, providers: await persistence.listIdentityProviders({ tenantId: scope.tenantId, platformAdmin: false }), mappingRules: await persistence.listRoleMappingRules({ tenantId: scope.tenantId, platformAdmin: false }) });
    adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.identity-acceptance.executed', subject: scope.tenantId, at: result.generatedAt, detail: `passed=${result.passed}; productionProof=false`, tenantId: scope.tenantId });
    return { ...result, liveAuthenticationPerformed: false };
  });

  app.post('/api/admin/saas/billing/events', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.billing.ingest', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.billing.ingest', verdict.roles));
    const envelope = (request.body ?? {}) as BillingEventEnvelope; const scope = requestedTenant(request, principal, envelope); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    if (!envelope.provider?.trim() || !envelope.eventId?.trim() || !envelope.eventType?.trim()) return reply.code(400).send({ error: 'BILLING_EVENT_INVALID' });
    const existing = await persistence.getBillingEvent(envelope.provider, envelope.eventId, scope.tenantId); if (existing) return { receipt: existing, replayed: true, paymentInstrumentStored: false };
    const boundary = new BillingBoundary(); if (!boundary.configured()) return reply.code(503).send({ error: 'BILLING_BOUNDARY_NOT_CONFIGURED', productionAccepted: false });
    const signature = String(request.headers['x-aiw-billing-signature'] ?? '');
    try {
      const result = boundary.process({ ...envelope, tenantId: scope.tenantId }, signature, actorName(principal)); await persistence.recordBillingEvent(result.receipt, scope.crossTenant); if (result.subscription) await persistence.saveSubscription(result.subscription, scope.crossTenant);
      adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.billing-event.processed', subject: result.receipt.eventId, at: result.receipt.receivedAt, detail: `${result.receipt.eventType}:${result.receipt.disposition}`, tenantId: scope.tenantId });
      return { ...result, paymentInstrumentStored: false };
    } catch (error) {
      const receipt = (error as { receipt?: { eventId?: string; payloadSha256?: string } }).receipt;
      adminRepositories.audit.push({
        actor: actorName(principal), action: 'saas.billing-event.rejected', subject: receipt?.eventId ?? envelope.eventId,
        at: new Date().toISOString(), detail: `${error instanceof Error ? error.message : 'BILLING_EVENT_REJECTED'}; payloadSha256=${receipt?.payloadSha256 ?? 'unavailable'}`,
        tenantId: scope.tenantId,
      });
      // Never let an unauthenticated event reserve a trusted provider/event id.
      // Rejections remain in the security audit, not the idempotent billing inbox.
      return reply.code(401).send({ error: error instanceof Error ? error.message : 'BILLING_EVENT_REJECTED', paymentInstrumentStored: false });
    }
  });

  app.get('/api/admin/saas/operations', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.operations.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.operations.read', verdict.roles));
    const scope = requestedTenant(request, principal); if (!scope.ok) return reply.code(403).send({ error: scope.error }); return operationalPosture(scope.tenantId, persistence);
  });

  app.get('/api/admin/saas/operations/acceptance', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.operations.read', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.operations.read', verdict.roles));
    const scope = requestedTenant(request, principal); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    return { runs: await persistence.listOperationalAcceptanceRuns(scope.tenantId), backupRestoreDrills: await persistence.listBackupRestoreDrills(scope.tenantId), productionAccepted: false };
  });

  app.post('/api/admin/saas/operations/acceptance', async (request, reply) => {
    const { principal, verdict } = guard(request, 'saas.operations.execute', principalFor); if (!verdict.ok) return reply.code(403).send(deny(principal, 'saas.operations.execute', verdict.roles));
    const body = (request.body ?? {}) as { tenantId?: string }; const scope = requestedTenant(request, principal, body); if (!scope.ok) return reply.code(403).send({ error: scope.error });
    const result = await runEnterpriseOperationalAcceptance({ tenantId: scope.tenantId, actor: actorName(principal), persistence, policy: adminRepositories.tenantPolicies.get(scope.tenantId) ?? null, ...(deps.telemetry ? { telemetry: deps.telemetry } : {}) });
    adminRepositories.audit.push({ actor: actorName(principal), action: 'saas.operational-acceptance.executed', subject: result.run.runId, at: result.run.completedAt, detail: `${result.run.status}; productionProof=false`, tenantId: scope.tenantId, after: result.run });
    return reply.code(result.run.status === 'failed' ? 409 : 200).send({ ...result, productionAccepted: false });
  });
}
