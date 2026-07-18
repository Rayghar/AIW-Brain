// Admin Control Plane repository facade.
// Sprint 8.8.8 cleanup: route modules share a single @aiw/admin-backed
// store for Admin, Knowledge Ops, Repository Conformance, Security/RBAC and
// Tenant Policy. No old/new admin security stores are active side-by-side.
import type { ReleasePin } from '@aiw/engine';
import { createAdminControlPlaneStore, normalizeBudgetPolicy, normalizeOrganisationProfile, normalizeRoleAssignment, normalizeTenantPolicy, normalizeTenantSubscription, referencePlanCatalog, type AdminAuditEvent } from '@aiw/admin';

export type { AdminAuditEvent };
export const adminRepositories: any = createAdminControlPlaneStore();
adminRepositories.releasePins = [] as ReleasePin[];
adminRepositories.reviewerAssignments = [] as unknown[];
adminRepositories.knowledgeOpsComments = [] as unknown[];
adminRepositories.sourceRefreshRequests = [] as unknown[];
adminRepositories.duplicateResolutions = [] as unknown[];
adminRepositories.synonymResolutions = [] as unknown[];
adminRepositories.corroborationAnalyses = [] as unknown[];
adminRepositories.sourceQuarantineSnapshots = [] as unknown[];
adminRepositories.quarantinedClaims = [] as unknown[];
adminRepositories.normalizedClaimRuns = [] as unknown[];
adminRepositories.releaseImpactPreviews = [] as unknown[];
adminRepositories.knowledgePackExports = [] as unknown[];
adminRepositories.knowledgePackImports = [] as unknown[];
adminRepositories.stageKnowledgeTraceability = [] as unknown[];
adminRepositories.mindFactoryWorkerJobs = [] as unknown[];
adminRepositories.knowledgePackActivations = [] as unknown[];
adminRepositories.mindFactoryPersistenceRecords = [] as unknown[];
adminRepositories.repositorySourceExecutions = [] as unknown[];
adminRepositories.kmsSignatures = [] as unknown[];
adminRepositories.providerBindingPlans = [] as unknown[];
adminRepositories.kmsBindingGuides = [] as unknown[];
adminRepositories.aiwKpackExports = [] as unknown[];
adminRepositories.aiwKpackImports = [] as unknown[];


const bootstrapActor = 'system-bootstrap';
const tenantPolicy = normalizeTenantPolicy({
  tenantId: 'tenant-reference',
  mode: 'pilot',
  requireSso: false,
  allowDevelopmentAuth: true,
  allowedIdentityProviderIds: ['idp-reference-development'],
  allowedEmailDomains: ['example.invalid'],
  auditRetentionDays: 365,
  maxSessionMinutes: 480,
  repositoryWritePolicy: 'deny',
  runtimeEvidencePolicy: 'evidence-only',
  candidateKnowledgePolicy: 'blocked-from-production',
}, bootstrapActor, 'tenant-reference');
if (tenantPolicy.ok) adminRepositories.tenantPolicies.set(tenantPolicy.policy.tenantId, tenantPolicy.policy);

const ownerAssignment = normalizeRoleAssignment({
  tenantId: 'tenant-reference',
  subject: 'user-owner',
  email: 'user-owner@example.invalid',
  roles: ['platform-admin'],
  source: 'development-token',
  active: true,
}, bootstrapActor, 'tenant-reference');
if (ownerAssignment.ok) adminRepositories.roleAssignments.set(ownerAssignment.assignment.assignmentId, ownerAssignment.assignment);

adminRepositories.audit.push({ actor: bootstrapActor, action: 'security.bootstrap', subject: 'tenant-reference', at: new Date().toISOString(), detail: 'Reference tenant policy and platform-admin development assignment created for local mode.', tenantId: 'tenant-reference' });


for (const plan of referencePlanCatalog()) adminRepositories.planCatalog.set(plan.planId, plan);
const organisation = normalizeOrganisationProfile({
  tenantId: 'tenant-reference',
  name: 'Reference Architecture Organisation',
  slug: 'reference-architecture-organisation',
  status: 'active',
  primaryRegion: 'reference-local',
  dataResidency: 'tenant-policy',
  billingEmail: 'billing@example.invalid',
}, bootstrapActor, 'tenant-reference');
if (organisation.ok) adminRepositories.organisations.set(organisation.organisation.tenantId, organisation.organisation);

const subscription = normalizeTenantSubscription({ tenantId: 'tenant-reference', planId: 'architect', status: 'active' }, bootstrapActor, 'tenant-reference');
if (subscription.ok) adminRepositories.subscriptions.set(subscription.subscription.tenantId, subscription.subscription);

const budget = normalizeBudgetPolicy({ tenantId: 'tenant-reference', monthlyBudgetUsd: 20, warningPercent: 80 }, bootstrapActor, 'tenant-reference');
if (budget.ok) adminRepositories.budgets.set(budget.budget.tenantId, budget.budget);

adminRepositories.usageEvents.push(
  { eventId: 'usage-reference-projects', tenantId: 'tenant-reference', metric: 'active-projects', quantity: 1, occurredAt: new Date().toISOString(), source: 'admin-reference' },
  { eventId: 'usage-reference-runs', tenantId: 'tenant-reference', projectId: 'project-reference', metric: 'reasoning-runs', quantity: 12, occurredAt: new Date().toISOString(), source: 'admin-reference' },
  { eventId: 'usage-reference-input', tenantId: 'tenant-reference', projectId: 'project-reference', metric: 'input-tokens', quantity: 24000, estimatedCostUsd: 0, occurredAt: new Date().toISOString(), source: 'admin-reference' },
  { eventId: 'usage-reference-output', tenantId: 'tenant-reference', projectId: 'project-reference', metric: 'output-tokens', quantity: 11000, estimatedCostUsd: 0, occurredAt: new Date().toISOString(), source: 'admin-reference' },
  { eventId: 'usage-reference-storage', tenantId: 'tenant-reference', projectId: 'project-reference', metric: 'storage-bytes', quantity: 12_582_912, occurredAt: new Date().toISOString(), source: 'admin-reference' },
);
