import { describe, expect, it } from 'vitest';
import {
  PROMPT6G_X1_SCHEMA_VERSION,
  prompt6gX1ImplementationObservationSchema,
  prompt6gX1SourceExampleSchema,
  resolvePrompt6gX1Quote,
  validatePrompt6gX1Output,
} from '../src/prompt6gX1Contracts.js';
import { createHash } from 'node:crypto';

const excerpt = 'For example, use mode A when latency matters. However, mode A does not support feature B.';
const excerptHash = `sha256:${createHash('sha256').update(excerpt).digest('hex')}`;
const identity = { semanticUnitId: 'SEMU-test', evidenceId: 'BEV-test', excerptHash };
const isolation = { authority: 'candidate' as const, productionAccepted: false as const, automaticPromotionAllowed: false as const, designGraphMutationAllowed: false as const };

describe('Prompt 6G X1 Route A contracts', () => {
  it('accepts a source example only with exact condition and limitation support', () => {
    const output = prompt6gX1SourceExampleSchema.parse({
      schemaVersion: PROMPT6G_X1_SCHEMA_VERSION, routeClass: 'source-example-with-explicit-conditions-and-limitations', ...identity,
      disposition: 'candidate-asset', assetType: 'source-example', statement: 'Mode A is an example scoped to latency-sensitive use and lacks feature B.', epistemicStatus: 'source-example',
      support: [{ exactSupportText: 'For example, use mode A', supportRole: 'primary', occurrenceHint: null }],
      conditions: [{ exactSupportText: 'when latency matters', supportRole: 'condition', occurrenceHint: null }],
      limitations: [{ exactSupportText: 'mode A does not support feature B', supportRole: 'limitation', occurrenceHint: null }],
      additionalEvidenceRequired: [], sourceExampleUniversalised: false, promotedToNormativeRequirement: false, crossSourceSynthesis: false, ...isolation,
    });
    expect(validatePrompt6gX1Output(output, { ...identity, excerpt }).resolvedQuotes).toHaveLength(3);
  });

  it('rejects non-verbatim support', () => {
    expect(() => resolvePrompt6gX1Quote({ exactSupportText: 'latency is always improved', supportRole: 'primary', occurrenceHint: null }, { ...identity, excerpt }))
      .toThrow('PROMPT6G_X1_EXACT_SUPPORT_NOT_FOUND');
  });

  it('accepts an implementation observation without normative promotion', () => {
    const observationExcerpt = 'Version 2 uses a bounded queue. It does not preserve tasks after shutdown.';
    const observationHash = `sha256:${createHash('sha256').update(observationExcerpt).digest('hex')}`;
    const output = prompt6gX1ImplementationObservationSchema.parse({
      schemaVersion: PROMPT6G_X1_SCHEMA_VERSION, routeClass: 'direct-implementation-observation', semanticUnitId: 'SEMU-o', evidenceId: 'BEV-o', excerptHash: observationHash,
      disposition: 'candidate-asset', assetType: 'implementation-observation', statement: 'Version 2 uses a bounded queue and does not persist shutdown tasks.', epistemicStatus: 'implementation-observation',
      support: [{ exactSupportText: 'Version 2 uses a bounded queue', supportRole: 'primary', occurrenceHint: null }], versionOrProductScope: 'Version 2',
      scopeSupport: [{ exactSupportText: 'Version 2', supportRole: 'scope', occurrenceHint: null }],
      conditions: [],
      limitations: [{ exactSupportText: 'does not preserve tasks after shutdown', supportRole: 'limitation', occurrenceHint: null }],
      additionalEvidenceRequired: [], promotedToUniversalBestPractice: false, promotedToNormativeRequirement: false, crossSourceSynthesis: false, ...isolation,
    });
    expect(validatePrompt6gX1Output(output, { semanticUnitId: 'SEMU-o', evidenceId: 'BEV-o', excerptHash: observationHash, excerpt: observationExcerpt }).supportSpanValidity).toBe(true);
  });

  it('rejects authority and route-class drift through strict schemas', () => {
    expect(prompt6gX1SourceExampleSchema.safeParse({ schemaVersion: PROMPT6G_X1_SCHEMA_VERSION, authority: 'approved' }).success).toBe(false);
    expect(prompt6gX1ImplementationObservationSchema.safeParse({ schemaVersion: PROMPT6G_X1_SCHEMA_VERSION, routeClass: 'source-example-with-explicit-conditions-and-limitations' }).success).toBe(false);
  });
});
