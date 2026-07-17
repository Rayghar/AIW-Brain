import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '..');
const evidence = resolve(root, 'release-evidence', 'rc10.73.8', 'prompt6g-planning');
const readJson = async (name: string) => JSON.parse(await readFile(resolve(evidence, name), 'utf8'));
const sha256 = (value: Buffer) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

describe('Prompt 6G denominator reconciliation and replay', () => {
  it('reconciles the exact Gate 6A transformation denominator', async () => {
    const receipt = await readJson('PROMPT_6G_CORPUS_DENOMINATOR_RECONCILIATION.json');
    expect(receipt.proposedTransformationUnits).toBe(42_953);
    expect(receipt.transformationUnitEquation).toMatchObject({ humanReviewRequiredPassages: 40_438, implementationExamplePassages: 2_515, sum: 42_953, matchesProposedTransformationUnits: true });
    expect(receipt.silentLoss).toBe(0);
  });
  it('replays every ignored index shard hash and record count', async () => {
    const manifest = await readJson('PROMPT_6G_TRANSFORMATION_UNIT_INDEX_MANIFEST.json');
    let records = 0;
    for (const shard of manifest.unitShards) {
      const payload = await readFile(resolve(root, shard.path));
      expect(sha256(payload)).toBe(shard.sha256);
      const count = payload.toString('utf8').trim().split('\n').filter(Boolean).length;
      expect(count).toBe(shard.records); records += count;
    }
    expect(records).toBe(42_953);
    expect(manifest.routingFingerprint).toBe(manifest.replayFingerprint);
  });
  it('has one assignment per unit and zero leakage', async () => {
    const receipt = await readJson('PROMPT_6G_ROUTING_INTEGRITY_RECEIPT.json');
    expect(receipt).toMatchObject({ expectedUnits: 42_953, classifiedUnits: 42_953, silentOmissions: 0, duplicateAssignments: 0, providerAuthorisedUnitsOutsideEnabledClasses: 0, gpt56SolCorpusAssignments: 0, deferredClassLeakageIntoRouteA: 0, deferredSemanticSynthesisByRouteC: 0, deterministicReplayIdentical: true, passed: true });
  });
});

describe('Prompt 6G Route A contracts', () => {
  it('keeps source examples class-specific and non-normative', async () => {
    const contract = await readJson('PROMPT_6G_ROUTE_A_SOURCE_EXAMPLE_CONTRACT.json');
    expect(contract.model).toBe('gpt-4.1-mini-2025-04-14');
    expect(contract.epistemicStatus).toBe('source-example');
    expect(contract.required).toContain('explicitConditions'); expect(contract.required).toContain('explicitLimitations');
    expect(contract.prohibited).toContain('normative-promotion'); expect(contract.designGraphMutation).toBe(false);
  });
  it('keeps observations scoped and distinct from examples', async () => {
    const observation = await readJson('PROMPT_6G_ROUTE_A_IMPLEMENTATION_OBSERVATION_CONTRACT.json');
    const example = await readJson('PROMPT_6G_ROUTE_A_SOURCE_EXAMPLE_CONTRACT.json');
    expect(observation.assetClass).not.toBe(example.assetClass);
    expect(observation.epistemicStatus).toBe('implementation-observation');
    expect(observation.prohibited).toContain('universal-best-practice-promotion');
  });
  it('allows no deferred class into provider-authorised units', async () => {
    const result = await readJson('PROMPT_6G_OFFLINE_ROUTING_RESULT.json');
    expect(result.providerCalls).toBe(0); expect(result.modelGenerationCalls).toBe(0);
    expect(result.integrity.providerOutsideEnabledClasses).toBe(0);
  });
});

describe('Prompt 6G Route C contract', () => {
  it('permits exact operations and prohibits semantic synthesis', async () => {
    const contract = await readJson('PROMPT_6G_ROUTE_C_DETERMINISTIC_CONTRACT.json');
    expect(contract.providerCalls).toBe(0); expect(contract.output.semanticSynthesisAllowed).toBe(false);
    expect(contract.permittedOperations).toContain('exact-duplicate-mapping');
    expect(contract.prohibitedOperations).toEqual(expect.arrayContaining(['pattern-dna','architecture-genome','contradiction-resolution','modernisation-knowledge']));
  });
  it('keeps all GPT-5.6 Sol corpus assignments at zero', async () => {
    const result = await readJson('PROMPT_6G_OFFLINE_ROUTING_RESULT.json');
    expect(result.integrity.gpt56Assignments).toBe(0);
  });
});

describe('Prompt 6G validation, Wave 1, and history reconciliation', () => {
  it('passes the frozen routing sample gates', async () => {
    const quality = await readJson('PROMPT_6G_ROUTER_QUALITY_EVALUATION.json');
    expect(quality.enabledRoutePrecision).toBeGreaterThanOrEqual(95);
    expect(quality).toMatchObject({ deferredClassLeakageIntoEnabledRoutes: 0, unsupportedRouteAAssignments: 0, unsupportedSemanticRouteCAssignments: 0, silentDenominatorLoss: 0, passed: true });
  });
  it('excludes deferred classes from the unexecuted Wave 1 plan', async () => {
    const wave = await readJson('PROMPT_6G_WAVE1_EXECUTION_PLAN.json');
    expect(wave.executionStatus).toBe('not-started'); expect(wave.deferredUnits).toBe(0);
    expect(wave.units.every((item: any) => item.route === 'route-a' || item.route === 'route-c')).toBe(true);
  });
  it('preserves incomplete cost telemetry as a range, not an exact bill', async () => {
    const cost = await readJson('GATE_6B_3_COST_EVIDENCE_RECONCILIATION.json');
    expect(cost.originalExecutionActualCostUsd).toBeNull(); expect(cost.billing.exactBilledTotalKnown).toBe(false);
    expect(cost.billing.conservativeUpperBoundUsd).toBeGreaterThan(cost.billing.observedUsageCostLowerBoundUsd);
    expect(cost.originalFilesPreserved).toBe(true);
  });
});
