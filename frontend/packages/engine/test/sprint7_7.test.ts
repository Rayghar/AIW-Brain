import { describe, expect, it } from 'vitest';
import { knowledgeRepositoryConnectors, seedKnowledgeClaims, type ArchitectureKnowledgeClaim } from '@aiw/domain';
import {
  assessKnowledgeMeshCoverage,
  createKnowledgeProposal,
  createKnowledgeSnapshot,
  decideKnowledgeProposal,
  detectClaimContradictions,
  extractionPromptContract,
  publishKnowledgeRelease,
  retrieveArchitectureKnowledge,
  sourcePathAllowed,
  submitKnowledgeProposal,
  validateExtractedClaim,
} from '../src/index.js';

describe('Sprint 7.7 dynamic architecture knowledge mesh', () => {
  it('classifies a deep GitHub source catalogue by trust and use', () => {
    const coverage = assessKnowledgeMeshCoverage();
    expect(knowledgeRepositoryConnectors.length).toBeGreaterThanOrEqual(40);
    expect(coverage.approvedConnectors).toBeGreaterThanOrEqual(30);
    expect(coverage.categories['pattern-library']).toBeGreaterThan(5);
    expect(coverage.uses['component-taxonomy']).toBeGreaterThan(5);
    expect(coverage.discoveryOnlyConnectors).toBeGreaterThan(0);
    expect(['GH-JMOLECULES','GH-SPRING-MODULITH','GH-CONTEXT-MAPPER-DSL','GH-CNCF-LANDSCAPE-GRAPH','GH-MESHERY'].every((id) => knowledgeRepositoryConnectors.some((item) => item.id === id))).toBe(true);
  });

  it('enforces repository path and file-size boundaries before quarantine', () => {
    const connector = knowledgeRepositoryConnectors.find((item) => item.id === 'GH-MICROSOFT-ARCH-CENTER')!;
    expect(sourcePathAllowed(connector, 'docs/patterns/circuit-breaker.md')).toBe(true);
    expect(sourcePathAllowed(connector, 'docs/patterns/media/diagram.png')).toBe(false);
    const snapshot = createKnowledgeSnapshot({
      connectorId: connector.id,
      repositoryRevision: 'abc123',
      fetchedAt: '2026-07-02T00:00:00.000Z',
      files: [
        { path: 'docs/patterns/circuit-breaker.md', blobSha: 'sha-1', sizeBytes: 5000, mediaType: 'text/markdown' },
        { path: 'docs/patterns/media/diagram.png', blobSha: 'sha-2', sizeBytes: 5000, mediaType: 'image/png' },
      ],
    });
    expect(snapshot.status).toBe('quarantined');
    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.contentHash).toMatch(/^km-/);
  });

  it('turns LLM output into a candidate claim, never an approved rule', () => {
    const contract = extractionPromptContract();
    const result = validateExtractedClaim({
      connectorId: 'GH-MICROSOFT-ARCH-CENTER', repositoryRevision: 'rev-1', sourcePath: 'docs/patterns/circuit-breaker.md',
      extractor: { provider: 'openai', model: 'test-model', promptVersion: contract.version }, candidates: [],
    }, {
      subjectId: 'PAT-CIRCUIT-BREAKER', subjectName: 'Circuit Breaker', claimType: 'benefit', predicate: 'mitigates', object: 'cascading failure',
      statement: 'Circuit breakers can reduce cascading failure risk when a remote dependency is repeatedly unavailable.', polarity: 'supports',
      conditions: ['remote dependency failures are detectable'], limitations: ['does not repair the dependency'], contextTags: ['resilience'], confidence: 90,
    }, '2026-07-02T00:00:00.000Z');
    expect(result.valid).toBe(true);
    expect(result.normalized?.reviewStatus).toBe('candidate');
    expect(result.normalized?.sourceLocations[0]?.path).toBe('docs/patterns/circuit-breaker.md');
    expect(result.normalized?.extraction.mode).toBe('llm');
  });

  it('retrieves approved evidence and separates provisional claims', () => {
    const result = retrieveArchitectureKnowledge({ query: 'architecture tests Java dependency rules', includeCandidateClaims: true });
    expect(result.approved.some((hit) => hit.claim.id === 'KCLM-ARCHUNIT-RULES')).toBe(true);
    expect(result.approved.every((hit) => hit.releaseStatus === 'approved')).toBe(true);
  });

  it('detects material/contextual claim disagreement instead of using last-write-wins', () => {
    const base = seedKnowledgeClaims[0]!;
    const opposite: ArchitectureKnowledgeClaim = {
      ...structuredClone(base), id: `${base.id}-OPPOSITE`, polarity: 'prohibits', object: `not ${base.object}`, reviewStatus: 'candidate',
      extraction: { mode: 'human', extractedAt: '2026-07-02T00:00:00.000Z' },
    };
    const contradictions = detectClaimContradictions([base, opposite]);
    expect(contradictions).toHaveLength(1);
    expect(['material','contextual']).toContain(contradictions[0]!.severity);
  });

  it('requires proposal review before publishing a knowledge release', () => {
    const candidate = structuredClone(seedKnowledgeClaims[0]!);
    candidate.id = `${candidate.id}-NEW`;
    candidate.reviewStatus = 'candidate';
    const draft = createKnowledgeProposal({ title: 'Add corroborated pattern claim', createdBy: 'architect-1', sourceSnapshotIds: ['KSNAP-1'], claims: [candidate], existingClaims: seedKnowledgeClaims, recommendationRegressionIds: ['REG-EDA-01'] });
    const pending = submitKnowledgeProposal(draft);
    expect(() => publishKnowledgeRelease({ version: '0.8.7-test', approvedProposals: [pending], createdBy: 'architect-1' })).toThrow('ONLY_APPROVED_PROPOSALS_CAN_BE_PUBLISHED');
    const approved = decideKnowledgeProposal(pending, 'approved', 'reviewer-1', 'Evidence and regression results accepted.', '2026-07-02T00:00:00.000Z');
    const release = publishKnowledgeRelease({ version: '0.8.7-test', approvedProposals: [approved], createdBy: 'reviewer-1', now: '2026-07-02T00:00:00.000Z' });
    expect(release.status).toBe('approved');
    expect(release.claimIds).toContain(candidate.id);
  });
});
