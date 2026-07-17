import { describe, expect, it } from 'vitest';
import { routePrompt6gUnit, validatePrompt6gRoutingIntegrity, type Prompt6gRoutingFeatures } from '../src/prompt6gCapabilityRouter.js';

const base: Prompt6gRoutingFeatures = {
  semanticUnitId: 'SEMU-1', evidenceId: 'BEV-1', sourceAuthorityClass: 'official-reference-architecture', repository: 'example/repo', path: 'docs/design.md', format: 'markdown', parserType: 'markdown-structural-parser-v1', heading: 'Example', evidenceLength: 200, tokenCount: 40, hasNormativeLanguage: false, hasConditionMarkers: false, hasLimitationMarkers: false, hasSourceExampleIndicators: false, hasImplementationObservationIndicators: false, metadataOnly: false, machineReadableStructural: false, noEvidence: false, exactDuplicateOccurrenceCount: 1, normalizedVariantCount: 1, nearDuplicateCluster: false, crossFileGroupIds: [], ambiguity: false, risk: 'low', specialistParserRequirement: false, processingFailure: null, semanticSignals: { contradiction: false, security: false, performance: false, causalPattern: false, architectureGenome: false, modernisation: false, productDescription: false, complexEpistemic: false },
};

describe('Prompt 6G capability-aware router', () => {
  it('routes only fully bounded examples to Route A1', () => expect(routePrompt6gUnit({ ...base, hasSourceExampleIndicators: true, hasConditionMarkers: true, hasLimitationMarkers: true }).proposedAssetClass).toBe('source-example-with-explicit-conditions-and-limitations'));
  it('defers an example missing a limitation', () => expect(routePrompt6gUnit({ ...base, hasSourceExampleIndicators: true, hasConditionMarkers: true }).approvedRoute).toBe('deferred'));
  it('routes a direct non-normative observation to Route A2', () => expect(routePrompt6gUnit({ ...base, hasImplementationObservationIndicators: true }).proposedAssetClass).toBe('direct-implementation-observation'));
  it('does not universalise a normative observation', () => expect(routePrompt6gUnit({ ...base, hasImplementationObservationIndicators: true, hasNormativeLanguage: true }).approvedRoute).toBe('deferred'));
  it('routes exact metadata-only structured facts to Route C', () => expect(routePrompt6gUnit({ ...base, metadataOnly: true, machineReadableStructural: true }).approvedRoute).toBe('route-c'));
  it('never lets Route C perform semantic synthesis', () => expect(routePrompt6gUnit({ ...base, metadataOnly: true, machineReadableStructural: true, semanticSignals: { ...base.semanticSignals, security: true } }).approvedRoute).toBe('deferred'));
  it('handles no evidence deterministically', () => expect(routePrompt6gUnit({ ...base, evidenceLength: 0, noEvidence: true })).toMatchObject({ primaryDisposition: 'insufficient-evidence', providerExecutionPermitted: false }))
  it('preserves specialist parser backlog without provider execution', () => expect(routePrompt6gUnit({ ...base, specialistParserRequirement: true })).toMatchObject({ primaryDisposition: 'specialist-parser-required', providerExecutionPermitted: false }));
  it('defers cross-file architecture context', () => expect(routePrompt6gUnit({ ...base, hasImplementationObservationIndicators: true, crossFileGroupIds: ['ACFG-1'] }).approvedRoute).toBe('deferred'));
  it('does not assign GPT-5.6 Sol as a corpus route', () => expect(routePrompt6gUnit({ ...base, hasImplementationObservationIndicators: true }).exactModel).toBe('gpt-4.1-mini-2025-04-14'));
  it('detects duplicate unit assignments and denominator loss', () => expect(validatePrompt6gRoutingIntegrity([routePrompt6gUnit(base), routePrompt6gUnit(base)], 3)).toMatchObject({ duplicateAssignments: 1, silentOmissions: 1, passed: false }));
});
