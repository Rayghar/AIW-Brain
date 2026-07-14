import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import { analyseArchitectureGraph } from '../src/graphAnalysis.js';
import { simulateQualityScenarios } from '../src/scenarioSimulation.js';
import { composeSdd } from '../src/sddComposer.js';
import { evaluateGoldenPath } from '../src/goldenPath.js';
import { detectContradictionsV2, corroborationFor, type AtomicClaim } from '../src/claimAssembly.js';

const library: KnowledgeLibrary = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8'));
const proj = (over: Partial<ArchitectureProject>): ArchitectureProject => ({
  name: 'T', description: 'd', objectives: [], constraints: [], assumptions: [], activeStage: 'logicalApplication',
  qualityPriorities: [], qualityScenarios: [], nodes: [], edges: [], styleDecisions: [], patternSelections: [], decisions: [], context: {},
  ...over,
} as unknown as ArchitectureProject);
const node = (id: string, kind = 'LogicalService') => ({ id, kind, label: id, stage: 'logicalApplication', properties: {}, tags: [] });
const edge = (a: string, b: string, kind = 'invokes') => ({ id: `${a}-${b}`, sourceId: a, targetId: b, kind, stage: 'logicalApplication', properties: {} });

describe('graph analyzer (C3)', () => {
  it('detects cycles, hotspots and sync chain depth', () => {
    const p = proj({ nodes: [node('a'), node('b'), node('c'), node('x', 'ExternalSystem')] as never,
      edges: [edge('a','b'), edge('b','c'), edge('c','a'), edge('a','x')] as never });
    const g = analyseArchitectureGraph(p);
    expect(g.cycles.length).toBeGreaterThan(0);
    expect(g.cycles[0]!.labels.join()).toContain('a');
    expect(g.maxSyncChainDepth).toBeGreaterThanOrEqual(2);
    expect(g.failurePaths.length).toBeGreaterThan(0); // a depends on external x
  });
});

describe('scenario simulation (C5, heuristic)', () => {
  it('parses latency measures and assesses against chain depth', () => {
    const p = proj({
      qualityScenarios: [{ id: 's1', attributeId: 'performance', responseMeasure: 'p99 < 300ms at 2x peak' }] as never,
      nodes: [node('a'), node('b')] as never, edges: [edge('a','b')] as never,
    });
    const v = simulateQualityScenarios(p);
    expect(v).toHaveLength(1);
    expect(v[0]!.verdict).toBe('meets-likely');
    expect(v[0]!.reasoning).toContain('ms/hop');
  });
  it('is honest when no heuristic applies', () => {
    const p = proj({ qualityScenarios: [{ id: 's2', attributeId: 'privacy', responseMeasure: 'zero PII leaks' }] as never });
    expect(simulateQualityScenarios(p)[0]!.verdict).toBe('cannot-assess');
  });
});

describe('contradictions v2 (A6)', () => {
  const claim = (over: Partial<AtomicClaim>): AtomicClaim => ({
    claimId: Math.random().toString(36).slice(2), subjectId: 'PAT-X', subjectName: 'X', claimType: 'quality-impact',
    predicate: 'impacts:security', object: 'rating 4', polarity: 'supports', conditions: [], evidence: ['EVID-A'], reviewStatus: 'approved', ...over,
  });
  it('flags material rating disagreements as context-split-required', () => {
    const out = detectContradictionsV2([claim({ object: 'rating 4' }), claim({ object: 'rating 1' })]);
    expect(out.some((c) => c.kind === 'rating-disagreement' && c.resolution === 'context-split-required')).toBe(true);
  });
  it('conditions dissolve the conflict (context split accepted)', () => {
    const out = detectContradictionsV2([claim({ object: 'rating 4', conditions: ['managed platform'] }), claim({ object: 'rating 1', conditions: ['self-hosted'] })]);
    expect(out.filter((c) => c.kind === 'rating-disagreement')).toHaveLength(0);
  });
});

describe('corroboration independence (A4)', () => {
  const base: AtomicClaim = { claimId: 'c', subjectId: 'S', subjectName: 'S', claimType: 'quality-impact', predicate: 'impacts:security',
    object: 'rating 4', polarity: 'supports', conditions: [], evidence: ['EVID-ONE', 'EVID-TWO'], reviewStatus: 'approved' };
  it('same upstream lineage collapses to one independent source', () => {
    const shared = corroborationFor({ ...base, sourceMeta: { 'EVID-ONE': { upstream: 'ms-arch-center' }, 'EVID-TWO': { upstream: 'ms-arch-center' } } } as never, ['EVID-']);
    expect(shared.independentSources).toBe(1);
    expect(shared.sufficientForRatings).toBe(false);
    const distinct = corroborationFor({ ...base, sourceMeta: { 'EVID-ONE': { upstream: 'ms-arch-center' }, 'EVID-TWO': { upstream: 'aws-labs' } } } as never, ['EVID-']);
    expect(distinct.independentSources).toBe(2);
    expect(distinct.sufficientForRatings).toBe(true);
  });
});

describe('SDD composer (B6) + golden path (B3)', () => {
  it('composes a traceable SDD carrying the release pin', () => {
    const md = composeSdd(proj({ name: 'Payments', objectives: ['o1'] }), library);
    expect(md).toContain('# Payments — System Design Description');
    expect(md).toContain((library as { knowledgeReleaseId?: string }).knowledgeReleaseId ?? 'AKR');
    expect(md).toContain('Architecture direction, decisions and pattern obligations');
    expect(md).toContain('Interface, API and event contract register');
    expect(md).toContain('Migration, coexistence and transition plan');
    expect(md).toContain('Architecture review, risks, fitness tests and approvals');
  });
  it('golden path progresses with the model', () => {
    expect(evaluateGoldenPath(proj({})).completed).toBe(0 + 0); // nothing done
    const p = proj({ description: 'x', qualityPriorities: [{ attributeId: 'availability', weight: 5 }] as never });
    expect(evaluateGoldenPath(p).completed).toBeGreaterThanOrEqual(2);
  });
});
