import { describe, expect, it } from 'vitest';
import { deterministicRouteCFact, evaluatePrompt6gX1Wave, reconcilePrompt6gX1Manifest, tokenEnvelope } from '../src/prompt6gX1Execution.js';
import { createHash } from 'node:crypto';

function record(id: string, disposition: string, asset: string, specialist = false): any {
  return {
    semanticUnitId: id, canonicalEvidenceId: `BEV-${id}`, connectorId: 'GH-X', repository: 'x/y', immutableCommit: 'a'.repeat(40), path: `${id}.json`, heading: '', structuralRange: 'lines 1-1', excerptHash: `sha256:${'0'.repeat(64)}`,
    sourceAuthorityClass: 'official-reference-architecture', format: 'json', parserType: 'json-structural-parser-v1',
    features: { evidenceLength: 2, hasConditionMarkers: false, hasLimitationMarkers: false, specialistParserRequirement: specialist },
    decision: { primaryDisposition: disposition, proposedAssetClass: asset, approvedRoute: disposition === 'route-a-transform' ? 'route-a' : 'route-c', providerExecutionPermitted: disposition === 'route-a-transform', exactModel: disposition === 'route-a-transform' ? 'gpt-4.1-mini-2025-04-14' : null },
  };
}

describe('Prompt 6G X1 execution controls', () => {
  it('replaces historical specialist slots with exact Route C facts', () => {
    const routeA = Array.from({ length: 64 }, (_, i) => record(`A${i}`, 'route-a-transform', i < 14 ? 'source-example-with-explicit-conditions-and-limitations' : 'direct-implementation-observation'));
    const exact = Array.from({ length: 110 }, (_, i) => record(`C${String(i).padStart(3, '0')}`, 'route-c-deterministic', 'non-semantic-machine-readable-fact'));
    const specialists = Array.from({ length: 96 }, (_, i) => record(`S${i}`, 'specialist-parser-required', 'specialist-parser-required', true));
    const historical = { units: [...routeA.map((item) => ({ semanticUnitId: item.semanticUnitId, route: 'route-a', assetClass: item.decision.proposedAssetClass })), ...specialists.map((item) => ({ semanticUnitId: item.semanticUnitId, route: 'route-c', assetClass: 'specialist-parser-required' })), ...exact.slice(0, 4).map((item) => ({ semanticUnitId: item.semanticUnitId, route: 'route-c', assetClass: item.decision.proposedAssetClass }))] };
    const result = reconcilePrompt6gX1Manifest([...routeA, ...exact, ...specialists], historical);
    expect(result.wave).toHaveLength(164);
    expect(result.routeC).toHaveLength(100);
    expect(result.routeC.every((item) => item.decision.primaryDisposition === 'route-c-deterministic')).toBe(true);
    expect(result.historicalPlanDefect.specialistParserUnitsMisclassifiedAsWaveRouteC).toBe(96);
  });

  it('Route C emits exact metadata and no semantic synthesis', () => {
    const excerpt = '{}';
    const item = record('C', 'route-c-deterministic', 'non-semantic-machine-readable-fact');
    item.excerptHash = `sha256:${createHash('sha256').update(excerpt).digest('hex')}`;
    const output = deterministicRouteCFact({ ...item, excerpt });
    expect(output.semanticSynthesisCount).toBe(0);
    expect(output.productionAccepted).toBe(false);
  });

  it('computes retry-inclusive token envelope', () => {
    const result = tokenEnvelope([{ system: 'a'.repeat(100), user: 'b'.repeat(300) }], 1000, 4);
    expect(result.projectedMaximumIncludingRetryReserve).toBe(5500);
  });

  it('fails a wave with denominator loss', () => {
    const expected = [record('A', 'route-a-transform', 'direct-implementation-observation')];
    expect(evaluatePrompt6gX1Wave(expected, [], 0).passed).toBe(false);
  });
});
