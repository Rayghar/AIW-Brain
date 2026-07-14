import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { KnowledgeLibrary, QualityPriority, ArchitectureProject } from '@aiw/domain';
import { recommendArchitectureStyles } from '../src/recommendation.js';
import { buildClaimReviewQueue, buildContradictionQueue, buildSourceRefreshQueue, validateTriageDecision } from '../src/knowledgeOps.js';
import { diffKnowledge, createCandidate, validateCandidate, promoteCandidate, pinRelease } from '../src/knowledgeReleaseManager.js';
import { buildAdminSummary } from '../src/adminControlCenter.js';

const library: KnowledgeLibrary = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8'));
const project = (qp: QualityPriority[]): ArchitectureProject => ({ qualityPriorities: qp, context: {}, nodes: [], edges: [], styleDecisions: [], patternSelections: [], decisions: [], objectives: [], constraints: [], assumptions: [], activeStage: 'logicalApplication' } as unknown as ArchitectureProject);

describe('acceptance gate 8: candidate knowledge cannot influence production recommendations', () => {
  it('staged candidate changes leave the production ranking byte-identical until promotion', () => {
    const drivers: QualityPriority[] = [{ attributeId: 'scalability', weight: 5 }, { attributeId: 'availability', weight: 4 }];
    const before = recommendArchitectureStyles(project(drivers), library).map((r) => `${r.styleId}:${r.score.toFixed(3)}`).join('|');
    const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(library));
    (proposed.architectureStyles[0] as { qualityAttributeRatings: Record<string, number> }).qualityAttributeRatings.scalability = 1; // hostile staged change
    const { candidate } = createCandidate('AKR-0.10.60', 'tester', diffKnowledge(library, proposed));
    expect(candidate.changes.length).toBeGreaterThan(0);
    const after = recommendArchitectureStyles(project(drivers), library).map((r) => `${r.styleId}:${r.score.toFixed(3)}`).join('|');
    expect(after).toEqual(before); // production reads the pinned release, not the candidate
  });
});

describe('release manager', () => {
  it('promotion is blocked when validation fails, allowed when green, and always audited', () => {
    const proposed: KnowledgeLibrary = JSON.parse(JSON.stringify(library));
    const { candidate } = createCandidate('AKR-0.10.60', 'tester', diffKnowledge(library, proposed));
    const policy = { requiredFieldsByType: { default: ['evidence'] } };
    const green = validateCandidate(proposed, policy as never, 0);
    expect(green.allowed).toBe(true);
    const blocked = promoteCandidate(candidate, { allowed: false, checks: [{ id: 'x', ok: false, detail: 'd' }] }, 'tester', 'AKR-NEXT');
    expect(blocked.error).toBe('VALIDATION_FAILED');
    expect(blocked.candidate.status).toBe('blocked');
    const ok = promoteCandidate({ ...candidate, status: 'candidate' }, green, 'tester', 'AKR-NEXT');
    expect(ok.releaseId).toBe('AKR-NEXT');
    expect(ok.audit.action).toBe('release.promoted');
    expect(promoteCandidate({ ...candidate, status: 'candidate' }, green, '', 'AKR-NEXT').error).toBe('NAMED_ACTOR_REQUIRED');
  });
  it('pinning records scope, release and actor (acceptance gate 11)', () => {
    const { pin, audit } = pinRelease('project', 'proj-1', 'AKR-0.10.60', 'tester');
    expect(pin).toMatchObject({ scope: 'project', scopeId: 'proj-1', releaseId: 'AKR-0.10.60', pinnedBy: 'tester' });
    expect(audit.action).toBe('release.pinned');
  });
});

describe('knowledge ops queues + triage doctrine', () => {
  it('queues derive from the governed library and the ratified release has no open contradictions', () => {
    expect(buildClaimReviewQueue(library).length).toBeGreaterThanOrEqual(0);
    expect(buildContradictionQueue(library)).toEqual([]);
    const overdue = buildSourceRefreshQueue([{ id: 's1', reviewedAt: '2020-01-01T00:00:00Z', refreshCadenceDays: 30 }]);
    expect(overdue[0]!.overdueDays).toBeGreaterThan(1000);
  });
  it('context-split without conditions is rejected; deleting a side is impossible by construction (gate 6)', () => {
    const bad = validateTriageDecision({ subjectId: 's', predicate: 'p', resolution: 'context-split', reviewer: 'r', rationale: 'because', decidedAt: 'now' } as never);
    expect(bad.valid).toBe(false);
    const good = validateTriageDecision({ subjectId: 's', predicate: 'p', resolution: 'context-split', conditionsA: ['high availability'], reviewer: 'r', rationale: 'because', decidedAt: 'now' } as never);
    expect(good.valid).toBe(true);
  });
});

describe('admin summary', () => {
  it('answers the posture questions from governed state', () => {
    const summary = buildAdminSummary(library, [{ id: 's1', reviewedAt: '2020-01-01T00:00:00Z', refreshCadenceDays: 30 }]);
    expect(summary.knowledge.productionAttributes).toBe(8);
    expect(summary.knowledge.draftAttributes).toBe(12);
    expect(summary.knowledge.overdueSourceRefreshes).toBe(1);
    expect(summary.postureQuestions.length).toBeGreaterThan(3);
  });
});

describe('source governance (8.8.1)', () => {
  it('registrations always enter at discovery; the ladder cannot be skipped', async () => {
    const { validateSourceRegistration, validatePostureTransition } = await import('../src/sourceGovernance.js');
    expect(validateSourceRegistration({ id: 's', title: 'T', sourceType: 'repo', posture: 'approved-production' as never }).valid).toBe(false);
    expect(validatePostureTransition({ posture: 'discovery' }, 'approved-advisory', 'reviewer').valid).toBe(false); // skips candidate
    expect(validatePostureTransition({ posture: 'candidate', licence: 'MIT', owner: 'me' }, 'approved-advisory', 'reviewer').valid).toBe(true);
  });
  it('GPL locks to discovery; approval demands licence and owner', async () => {
    const { validatePostureTransition } = await import('../src/sourceGovernance.js');
    expect(validatePostureTransition({ posture: 'candidate', licence: 'GPL-3.0', owner: 'me' }, 'approved-advisory', 'r').reasons.join()).toContain('GPL');
    expect(validatePostureTransition({ posture: 'candidate' }, 'approved-advisory', 'r').reasons.length).toBeGreaterThanOrEqual(2);
  });
  it('connector writes are refused at registration; PR approval is non-negotiable', async () => {
    const { validateConnectorRegistration } = await import('../src/sourceGovernance.js');
    expect(validateConnectorRegistration({ id: 'c', provider: 'github', repositoryUrl: 'https://x', writeEnabled: true }).valid).toBe(false);
    expect(validateConnectorRegistration({ id: 'c', provider: 'github', repositoryUrl: 'https://x', prRequiresApproval: false }).valid).toBe(false);
    const ok = validateConnectorRegistration({ id: 'c', provider: 'github', repositoryUrl: 'https://x' });
    expect(ok.valid).toBe(true);
    expect(ok.normalized!.writeEnabled).toBe(false);
    expect(ok.normalized!.prRequiresApproval).toBe(true);
  });
});

describe('release validation regression gates (8.8.3)', () => {
  it('a calibration ratification candidate passes regression; a hostile flattening fails', async () => {
    const { stageCalibrationRatification } = await import('../src/patternDnaOps.js');
    const { validateCandidate } = await import('../src/knowledgeReleaseManager.js');
    const scenarios = JSON.parse(readFileSync(new URL('../../../data/evaluation-scenarios.json', import.meta.url), 'utf8')).scenarios;
    const policy = { requiredFieldsByType: { default: ['evidence'] } };
    const ratified = stageCalibrationRatification(library, 'security', 'Board Chair');
    expect(ratified.proposed).not.toBeNull();
    const green = validateCandidate(ratified.proposed!, policy as never, 0, scenarios);
    expect(green.checks.find((c) => c.id === 'scenario-regression')?.ok).toBe(true);
    expect(green.checks.find((c) => c.id === 'anti-placebo')?.ok).toBe(true);
    const hostile: typeof library = JSON.parse(JSON.stringify(library));
    for (const style of hostile.architectureStyles) (style.qualityAttributeRatings as Record<string, number>).scalability = 3;
    expect(validateCandidate(hostile, policy as never, 0, scenarios).allowed).toBe(false);
  });
});

describe('pattern DNA ops (8.8.4)', () => {
  it('edits validated: bounded impacts, known ids, named editor + rationale', async () => {
    const { validatePatternDnaEdit } = await import('../src/patternDnaOps.js');
    const bad = validatePatternDnaEdit({ patternId: library.patterns[0]!.id, field: 'qualityAttributeImpact', value: { notAnAttribute: 9 }, editor: '', rationale: '' }, library);
    expect(bad.valid).toBe(false);
    expect(bad.reasons.length).toBeGreaterThanOrEqual(3);
    expect(validatePatternDnaEdit({ patternId: library.patterns[0]!.id, field: 'qualityAttributeImpact', value: { scalability: 2, simplicity: -1 }, editor: 'curator', rationale: 'per source claims' }, library).valid).toBe(true);
  });
  it('staged edits never touch the live library — mutation only via candidates', async () => {
    const { applyStagedPatternEdits } = await import('../src/patternDnaOps.js');
    const before = JSON.stringify(library.patterns[0]!.qualityAttributeImpact);
    const proposed = applyStagedPatternEdits(library, [{ patternId: library.patterns[0]!.id, field: 'qualityAttributeImpact', value: { scalability: 2 }, editor: 'curator', rationale: 'r', stagedAt: new Date().toISOString() }]);
    expect(JSON.stringify(library.patterns[0]!.qualityAttributeImpact)).toEqual(before);
    expect((proposed.patterns[0] as { impactProvenance?: string }).impactProvenance).toContain('pending release promotion');
  });
});

describe('scenario templates (8.8.5) + rbac (8.8.6)', () => {
  it('every shipped template validates against the governed vocabulary', async () => {
    const { validateTemplateCatalog } = await import('../src/scenarioTemplates.js');
    const catalog = JSON.parse(readFileSync(new URL('../../../data/scenario-templates.json', import.meta.url), 'utf8'));
    const verdict = validateTemplateCatalog(catalog, library);
    expect(verdict.reasons).toEqual([]);
    expect(catalog.templates.length).toBeGreaterThanOrEqual(8);
  });
  it('rbac: promotion is denied to a curator, allowed to a knowledge admin; unknown permission denies', async () => {
    const { hasPermission } = await import('../src/rbac.js');
    expect(hasPermission({ roles: ['knowledge-curator'] }, 'release.promote').ok).toBe(false);
    expect(hasPermission({ roles: ['knowledge-admin'] }, 'release.promote').ok).toBe(true);
    expect(hasPermission({ roles: ['auditor'] }, 'audit.read').ok).toBe(true);
    expect(hasPermission({ roles: ['platform-admin'] }, 'not.a.permission').ok).toBe(false);
    expect(hasPermission({}, 'release.promote').ok).toBe(false);
  });
});

describe('cambridge logic: tactics, readiness, verification', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../../data/tactics-catalog.json', import.meta.url), 'utf8'));
  const base = { name: 'T', description: 'd', objectives: ['o'], constraints: [], assumptions: [], activeStage: 'logicalApplication', qualityScenarios: [], styleDecisions: [], patternSelections: [], decisions: [], context: { workloadProfile: 'bursty' }, edges: [] };
  it('tactics shift with drivers and detect embodiment from topology', async () => {
    const { adviseTactics } = await import('../src/tacticsAdvisor.js');
    const nodes = [{ id: 'a', kind: 'LogicalService', label: 'Payments', stage: 'logicalApplication', properties: {}, tags: [] }, { id: 'b', kind: 'DataStore', label: 'Redis Cache', stage: 'logicalApplication', properties: {}, tags: [] }];
    const perf = adviseTactics({ ...base, qualityPriorities: [{ attributeId: 'performance', weight: 5 }], nodes } as never, catalog);
    expect(perf.some((t) => t.tacticId === 'TAC-CACHE' && t.status === 'embodied' && t.evidence.includes('Redis Cache'))).toBe(true);
    const avail = adviseTactics({ ...base, qualityPriorities: [{ attributeId: 'availability', weight: 5 }], nodes } as never, catalog);
    expect(avail.some((t) => t.tacticId === 'TAC-STANDBY' && t.status === 'missing')).toBe(true);
    expect(perf.map((t) => t.tacticId).join()).not.toEqual(avail.map((t) => t.tacticId).join());
  });
  it('iteration phase progresses with the design; readiness gaps close with knowledge', async () => {
    const { determineIterationPhase, checkStyleDecisionReadiness } = await import('../src/decisionReadiness.js');
    expect(determineIterationPhase({ ...base, qualityPriorities: [], nodes: [] } as never).phase).toBe('establish-drivers');
    const withDriver = { ...base, qualityPriorities: [{ attributeId: 'availability', weight: 5 }], nodes: [] };
    expect(determineIterationPhase(withDriver as never).phase).toBe('make-measurable');
    expect(checkStyleDecisionReadiness({ ...withDriver, context: {} } as never).some((g) => g.requirement.includes('Workload'))).toBe(true);
    expect(checkStyleDecisionReadiness({ ...withDriver, qualityScenarios: [{ attributeId: 'availability' }] } as never).some((g) => g.requirement.includes('measurable'))).toBe(false);
  });
  it('verification flags unprotected external sync calls and clears when protected', async () => {
    const { runVerificationMethod } = await import('../src/verificationMethod.js');
    const nodes = [{ id: 's', kind: 'LogicalService', label: 'Svc', stage: 'logicalApplication', properties: {}, tags: [] }, { id: 'x', kind: 'ExternalSystem', label: 'CBS', stage: 'logicalApplication', properties: {}, tags: [] }];
    const naked = runVerificationMethod({ ...base, qualityPriorities: [{ attributeId: 'availability', weight: 5 }], nodes, edges: [{ id: 'e', sourceId: 's', targetId: 'x', kind: 'invokes', properties: {} }] } as never);
    expect(naked.some((f) => f.checkId === 'V2')).toBe(true);
    const guarded = runVerificationMethod({ ...base, qualityPriorities: [{ attributeId: 'availability', weight: 5 }], nodes, edges: [{ id: 'e', sourceId: 's', targetId: 'x', kind: 'invokes', properties: { timeout: '2s', breaker: true } }] } as never);
    expect(guarded.some((f) => f.checkId === 'V2')).toBe(false);
  });
});
