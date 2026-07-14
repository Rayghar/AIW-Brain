import { describe, expect, it } from 'vitest';
import { knowledgeRepositoryConnectors, patternCorpusMetrics, sampleProject, sprint78PatternCorpus } from '@aiw/domain';
import {
  applyPatternComposition,
  buildRecommendationEvidencePack,
  buildRepositoryGovernancePolicies,
  composePatterns,
  generateArchitectureFitnessFunctions,
  governRepositoryOperation,
  normalizePatternCorpus,
  rollbackPatternComposition,
  runSprint78BenchmarkSuite,
  sprint78KnowledgeReleaseManifest,
} from '../src/index.js';

describe('Sprint 7.8 architecture pattern intelligence and composition', () => {
  it('ships a reviewed production corpus above the Sprint 7.8 gate', () => {
    const metrics = patternCorpusMetrics();
    expect(metrics.totalRecords).toBeGreaterThanOrEqual(200);
    expect(metrics.approvedRecords).toBe(metrics.totalRecords);
    expect(metrics.antiPatterns).toBeGreaterThanOrEqual(25);
    expect(metrics.topologyTemplates).toBeGreaterThanOrEqual(20);
    expect(metrics.evidenceCoverage).toBe(100);
    expect(metrics.reviewCoverage).toBe(100);
  });

  it('normalizes aliases and keeps provider realizations separate', () => {
    const normalized = normalizePatternCorpus();
    expect(normalized.aliases['transactional outbox']).toBe('PAT-TRANSACTIONAL-OUTBOX');
    expect(normalized.canonical.length).toBeLessThanOrEqual(sprint78PatternCorpus.length);
    expect(normalized.duplicateGroups.length).toBeGreaterThan(0);
    expect(normalized.providerRealizations.length).toBeGreaterThan(20);
  });

  it('prevents discovery-only repositories from driving recommendations', () => {
    const policies = buildRepositoryGovernancePolicies();
    const discovery = knowledgeRepositoryConnectors.find((item) => item.lifecycleStatus === 'discovery-only')!;
    const policy = policies.find((item) => item.connectorId === discovery.id)!;
    expect(policy.productionRecommendationAllowed).toBe(false);
    expect(policy.prohibitedOperations).toContain('recommend');
    expect(governRepositoryOperation(discovery.id, 'recommend', policies).allowed).toBe(false);
  });

  it('permits approved authoritative evidence only through governed controls', () => {
    const decision = governRepositoryOperation('GH-MICROSOFT-ARCH-CENTER', 'recommend');
    expect(decision.allowed).toBe(true);
    expect(decision.requiredControls).toContain('Retrieve only approved claims from a signed knowledge release.');
  });

  it('creates a reversible composition plan with topology and obligations', () => {
    const plan = composePatterns({ project: sampleProject, patternIds: ['PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    expect(plan.eligible).toBe(true);
    expect(plan.mutation.addNodes.length).toBeGreaterThan(0);
    expect(plan.obligations.length).toBeGreaterThan(0);
    expect(plan.rollback.removeNodeIds).toEqual(plan.mutation.addNodes.map((node) => node.id));
    expect(plan.completionSuggestions).toContain('PAT-IDEMPOTENT-CONSUMER');
  });

  it('blocks anti-pattern adoption', () => {
    const plan = composePatterns({ project: sampleProject, patternIds: ['ANTI-BIG-BALL-OF-MUD'], allowConditionalPrerequisites: true });
    expect(plan.eligible).toBe(false);
    expect(plan.conflicts.some((item) => item.patternId === 'ANTI-BIG-BALL-OF-MUD')).toBe(true);
  });

  it('applies and rolls back a deterministic plan without losing the baseline', () => {
    const plan = composePatterns({ project: sampleProject, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    const applied = applyPatternComposition(sampleProject, plan);
    expect(applied.nodes.length).toBe(sampleProject.nodes.length + plan.mutation.addNodes.length);
    expect(applied.patternSelections.some((item) => item.patternId === 'PAT-TRANSACTIONAL-OUTBOX')).toBe(true);
    const rolledBack = rollbackPatternComposition(applied, plan);
    expect(rolledBack.nodes.length).toBe(sampleProject.nodes.length);
    expect(rolledBack.edges.length).toBe(sampleProject.edges.length);
  });

  it('builds a bounded evidence pack with eligibility and counterfactuals', () => {
    const pack = buildRecommendationEvidencePack({ query: 'event driven reliable integration with idempotency', project: sampleProject, limit: 10 });
    expect(pack.knowledgeRelease).toBe('AKR-0.10.60');
    expect(pack.recommendations.length).toBeGreaterThan(0);
    expect(pack.recommendations.every((item) => item.counterfactuals.length > 0)).toBe(true);
    expect(pack.approvedEvidence.length).toBeGreaterThan(0);
  });

  it('generates reviewable architecture fitness functions', () => {
    const artifacts = generateArchitectureFitnessFunctions(['PAT-BOUNDED-CONTEXT','PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-GITOPS']);
    expect(artifacts.length).toBe(3);
    expect(artifacts.every((item) => item.reviewRequired)).toBe(true);
    expect(artifacts.some((item) => item.target === 'archunit')).toBe(true);
    expect(artifacts.some((item) => item.target === 'asyncapi')).toBe(true);
    expect(artifacts.some((item) => item.target === 'kubernetes')).toBe(true);
  });


  it('passes the calibrated Sprint 7.8 recommendation benchmark suite', () => {
    const results = runSprint78BenchmarkSuite(sampleProject);
    expect(results).toHaveLength(6);
    expect(results.every((result) => result.passed)).toBe(true);
    expect(results.flatMap((result) => result.missingExpectedCandidates)).toEqual([]);
  });

  it('publishes a reproducible release manifest', () => {
    const manifest = sprint78KnowledgeReleaseManifest();
    expect(manifest.status).toBe('approved');
    expect(manifest.recordIds.length).toBeGreaterThanOrEqual(200);
    expect(manifest.governance.liveGitHubRecommendations).toBe(false);
    expect(manifest.governance.discoverySourcesCanScore).toBe(false);
    expect(manifest.checksum).toMatch(/^SHA-/);
  });
});
