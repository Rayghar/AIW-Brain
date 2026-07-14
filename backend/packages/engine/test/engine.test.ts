import { describe, expect, it } from 'vitest';
import { sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import { addDiscussionComment, analyseImpact, applyCollaborationOperations, applyMergePlan, applySelectedProposals, assignReview, canPerform, compareBranches, createAuditEvent, createDiscussion, createMergePlan, evaluateGovernanceRulePacks, expireGovernanceItems, OptimisticConcurrencyError, principalCanAccessTenant, recommendArchitectureStyles, recommendInContext, resolveMergeConflict, runDeterministicAudit, validateProject, validateProjectSecurity, validateProposedEdge, validateSecretReference } from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'test', version: '0.1.0', status: 'draft', generatedAt: '', disclaimer: '',
  qualityAttributes: [], viewpoints: [], patterns: [
    { id: 'PAT-OUTBOX', name: 'Transactional Outbox', recordType: 'pattern', category: 'integration', status: 'draft', applicableStages: ['applicationRealization', 'logicalTechnology'], pairsWellWith: ['STYLE-EVENT-DRIVEN'], conflictsWith: [], obligations: ['Define outbox cleanup'], requires: [], qualityAttributeImpact: {}, risks: ['Duplicate delivery'], mitigations: ['Idempotent consumers'], evidence: [], owner: '', version: '', calibrationNote: '' },
    { id: 'PAT-IDEMPOTENT', name: 'Idempotent Consumer', recordType: 'pattern', category: 'messaging', status: 'draft', applicableStages: ['applicationRealization', 'logicalTechnology'], pairsWellWith: ['STYLE-EVENT-DRIVEN'], conflictsWith: [], obligations: ['Define idempotency key'], requires: [], qualityAttributeImpact: {}, risks: [], mitigations: [], evidence: [], owner: '', version: '', calibrationNote: '' },
  ],
  evidence: [{ id: 'EVID-1', title: 'Test baseline', publisher: 'Test Council', referenceType: 'internal-standard', summary: 'Test evidence', authorityLevel: 5, reviewedAt: '2026-07-02' }],
  rulePacks: [{ id: 'RULEPACK-ENTERPRISE-BASELINE', name: 'Baseline', version: '1.0.0', description: 'Test rules', status: 'approved', rules: [{ id: 'RULE-ENCRYPT', title: 'Encryption required', description: '', severity: 'SIGNIFICANT', predicate: 'REQUIRE_PROPERTY', parameters: { kind: 'TechnologyProduct', property: 'encryptedAtRest', expected: true }, rationale: 'Test', mitigations: ['Enable encryption'], evidenceIds: ['EVID-1'], enabled: true }] }],
  architectureStyles: [
    {
      id: 'STYLE-MODULAR-MONOLITH', name: 'Modular Monolith', recordType: 'architectureStyle', status: 'draft',
      applicableStages: ['logicalApplication', 'applicationRealization'],
      qualityAttributeRatings: { availability: 3, faultTolerance: 2, scalability: 3, modifiability: 4, simplicity: 5, costEfficiency: 5 },
      whenToConsider: [], whenToAvoidOrQuestion: [], requires: [], recommends: [], tensions: [], obligations: [], evidence: [], owner: '', version: '', calibrationNote: '',
    },
    {
      id: 'STYLE-EVENT-DRIVEN', name: 'Event-Driven Architecture', recordType: 'architectureStyle', status: 'draft',
      applicableStages: ['logicalApplication', 'applicationRealization'],
      qualityAttributeRatings: { availability: 5, faultTolerance: 5, scalability: 5, modifiability: 4, simplicity: 2, costEfficiency: 2 },
      whenToConsider: [], whenToAvoidOrQuestion: [], requires: [], recommends: [], tensions: [], obligations: ['Define delivery guarantees'], evidence: [], owner: '', version: '', calibrationNote: '',
    },
  ],
};

describe('recommendation engine', () => {
  it('ranks styles deterministically and explains trade-offs', () => {
    const scores = recommendArchitectureStyles(sampleProject, library);
    expect(scores).toHaveLength(2);
    expect(scores[0]?.styleId).toBe('STYLE-EVENT-DRIVEN');
    expect(scores[0]?.obligations).toContain('Define delivery guarantees');
  });
});

describe('validation engine', () => {
  it('warns rather than hard-blocking synchronous interactions in event-driven scopes', () => {
    const edge = {
      id: 'candidate-sync', sourceId: 'logical-order-service', targetId: 'logical-payment-service',
      kind: 'communicatesWith' as const, stage: 'logicalApplication' as const, properties: { protocolStyle: 'synchronous' },
    };
    const result = validateProposedEdge(sampleProject, edge);
    expect(result.allowed).toBe(true);
    expect(result.findings.some((item) => item.ruleId === 'STYLE-EDA-SYNC-TENSION')).toBe(true);
  });

  it('detects missing messaging, access control and HA realization in a deliberately incomplete model', () => {
    const incompleteProject = structuredClone(sampleProject);
    incompleteProject.nodes = incompleteProject.nodes.filter((node) => node.id !== 'logical-event-streaming' && node.kind !== 'Control');
    const findings = validateProject(incompleteProject);
    expect(findings.some((item) => item.ruleId === 'INT-ASYNC-NO-MESSAGING-CAPABILITY')).toBe(true);
    expect(findings.some((item) => item.ruleId === 'SEC-PUBLIC-NO-ACCESS-CONTROL')).toBe(true);
    expect(findings.some((item) => item.ruleId === 'DEPLOY-HA-SINGLE-FAILURE-DOMAIN')).toBe(true);
  });
});

describe('audit and change sets', () => {
  it('creates reversible proposals and applies only selected proposals', () => {
    const audit = runDeterministicAudit(sampleProject, library);
    expect(audit.proposals.length).toBeGreaterThan(0);
    const selected = audit.proposals.map((proposal, index) => ({ ...proposal, selected: index === 0 }));
    const updated = applySelectedProposals(sampleProject, selected);
    expect(updated.revision).toBe(sampleProject.revision + 1);
    expect(updated.nodes.length).toBeGreaterThan(sampleProject.nodes.length);
  });
});


describe('contextual recommendation engine', () => {
  it('updates associated patterns and ADR-ready decisions from current selections', () => {
    const result = recommendInContext(sampleProject, library, {
      stage: 'applicationRealization',
      scopeNodeId: 'deployable-order-api',
      trigger: 'canvas-change',
    });
    expect(result.patterns[0]?.patternId).toBe('PAT-OUTBOX');
    expect(result.patterns[0]?.reasons.join(' ')).toContain('selected style');
    expect(result.decisions.some((item) => item.title.includes('deployable boundaries'))).toBe(true);
    expect(result.obligations.some((item) => item.sourceRecordId === 'PAT-OUTBOX')).toBe(true);
  });
});


describe('Sprint 2 governance and alternatives', () => {
  it('evaluates enterprise rule packs as deterministic findings', () => {
    const project = structuredClone(sampleProject);
    project.nodes.find((node) => node.id === 'physical-postgres')!.properties.encryptedAtRest = false;
    const findings = evaluateGovernanceRulePacks(project, library);
    expect(findings.some((item) => item.ruleId === 'RULE-ENCRYPT')).toBe(true);
  });

  it('traces downstream architecture impact across lineage and relationships', () => {
    const impact = analyseImpact(sampleProject, ['logical-order-service']);
    expect(impact.affectedNodes.some((item) => item.nodeId === 'deployable-order-api')).toBe(true);
    expect(impact.affectedApprovalStages).toContain('applicationRealization');
  });

  it('compares alternative branches without mutating either model', () => {
    const alternative = structuredClone(sampleProject);
    alternative.branch = { ...alternative.branch, id: 'branch-alt', name: 'Alternative' };
    alternative.nodes.push({ ...structuredClone(alternative.nodes[0]!), id: 'actor-partner', label: 'Partner' });
    const comparison = compareBranches(sampleProject, alternative);
    expect(comparison.summary.added).toBeGreaterThan(0);
    expect(sampleProject.nodes.some((node) => node.id === 'actor-partner')).toBe(false);
  });
});


describe('Sprint 3 enterprise collaboration', () => {
  it('enforces role-based permissions', () => {
    expect(canPerform(sampleProject, 'user-owner', 'member.manage')).toBe(true);
    expect(canPerform(sampleProject, 'user-reviewer', 'project.edit')).toBe(false);
  });

  it('assigns an independent review and notifies the reviewer without mutating the source project', () => {
    const originalAssignments = sampleProject.reviewAssignments.length;
    const updated = assignReview(sampleProject, { stage: 'logicalApplication', assignedTo: 'user-reviewer', assignedBy: 'user-owner', priority: 'high' });
    expect(updated.reviewAssignments).toHaveLength(originalAssignments + 1);
    expect(updated.reviewAssignments.some((item) => item.assignedTo === 'user-reviewer' && item.stage === 'logicalApplication')).toBe(true);
    expect(updated.notifications.some((item) => item.type === 'review-assigned')).toBe(true);
    expect(sampleProject.reviewAssignments).toHaveLength(originalAssignments);
  });

  it('maintains threaded discussions and participant notifications', () => {
    const created = createDiscussion(sampleProject, { actorId: 'user-owner', targetType: 'stage', targetId: 'logicalApplication', title: 'Review concern', body: '@Lena Adeyemi please review this boundary.' });
    const thread = created.discussionThreads[0]!;
    const replied = addDiscussionComment(created, thread.id, 'user-reviewer', 'Reviewed; one dependency needs an ADR.');
    expect(replied.discussionThreads[0]?.comments).toHaveLength(2);
    expect(replied.notifications.some((item) => item.type === 'mention')).toBe(true);
  });

  it('expires approvals and overdue reviews deterministically', () => {
    const project = structuredClone(sampleProject);
    project.stageApprovals.push({ id: 'approval-old', stage: 'logicalApplication', status: 'approved', comments: [], expiresAt: '2026-01-01T00:00:00.000Z', assignedReviewerId: 'user-reviewer' });
    project.reviewAssignments.push({ id: 'review-old', stage: 'logicalApplication', branchId: project.branch.id, assignedTo: 'user-reviewer', assignedBy: 'user-owner', status: 'open', priority: 'normal', instructions: 'Review', dueAt: '2026-01-01T00:00:00.000Z', createdAt: '2025-12-01T00:00:00.000Z' });
    const expired = expireGovernanceItems(project, new Date('2026-07-02T00:00:00.000Z'));
    expect(expired.stageApprovals.find((item) => item.id === 'approval-old')?.status).toBe('changes-requested');
    expect(expired.reviewAssignments.find((item) => item.id === 'review-old')?.status).toBe('overdue');
  });

  it('creates and applies explicit merge conflict resolutions', () => {
    const source = structuredClone(sampleProject);
    source.branch = { ...source.branch, id: 'branch-source', name: 'Source' };
    source.nodes[0]!.label = 'Source customer';
    const target = structuredClone(sampleProject);
    target.nodes[0]!.label = 'Target customer';
    let plan = createMergePlan(source, target);
    expect(plan.conflicts.length).toBeGreaterThan(0);
    for (const conflict of plan.conflicts) plan = resolveMergeConflict(plan, conflict.id, 'source');
    const merged = applyMergePlan(source, target, plan);
    expect(merged.nodes[0]?.label).toBe('Source customer');
  });

  it('rejects stale collaboration operation batches', () => {
    expect(() => applyCollaborationOperations(sampleProject, { operationId: 'op-stale', idempotencyKey: 'idem-stale-0001', tenantId: sampleProject.tenantId, projectId: sampleProject.id, branchId: sampleProject.branch.id, baseRevision: 0, actorId: 'user-owner', operations: [{ type: 'DELETE_NODE', nodeId: 'logical-order-service' }] })).toThrow(OptimisticConcurrencyError);
  });
});


describe('Sprint 4 tenant security and audit controls', () => {
  it('enforces tenant alignment for principals', () => {
    const principal = { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId, providerId: 'idp-reference-development', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString() };
    expect(principalCanAccessTenant(principal, sampleProject.tenantId)).toBe(true);
    expect(principalCanAccessTenant(principal, 'tenant-other')).toBe(false);
  });

  it('rejects plaintext-looking secret material and accepts provider references', () => {
    expect(validateSecretReference({ id: 'good', provider: 'environment', locator: 'env://OPENAI_API_KEY', purpose: 'AI provider' })).toHaveLength(0);
    expect(validateSecretReference({ id: 'bad', provider: 'environment', locator: 'plaintextcredentialvalue', purpose: 'Unsafe' }).length).toBeGreaterThan(0);
  });

  it('detects invalid SSO posture and creates redacted audit events', () => {
    const project = structuredClone(sampleProject);
    project.securitySettings.requireSso = true;
    project.identityProviders = project.identityProviders.map((provider) => ({ ...provider, type: 'development' as const }));
    expect(validateProjectSecurity(project).some((finding) => finding.ruleId === 'SEC-SSO-PROVIDER')).toBe(true);
    const event = createAuditEvent({ tenantId: project.tenantId, actorId: 'user-owner', eventType: 'security', action: 'test', targetType: 'project', outcome: 'success', correlationId: 'corr-1', retentionDays: 30, metadata: { authorization: 'Bearer secret', safe: 'value' } });
    expect(event.metadata.authorization).toBe('[REDACTED]');
    expect(event.metadata.safe).toBe('value');
  });
});
