import { describe, expect, it } from 'vitest';
import { createDesignLibrary, sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import {
  applyLibraryDrop,
  computeCanvasCompliance,
  contextualLibrary,
  getSemanticConnectionOptions,
  previewLibraryDrop,
} from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'visual-test', version: '0.8.6', status: 'draft', generatedAt: '', disclaimer: '', qualityAttributes: [], viewpoints: [], evidence: [], rulePacks: [],
  architectureStyles: [{ id: 'STYLE-EVENT-DRIVEN', name: 'Event-Driven Architecture', recordType: 'architectureStyle', status: 'draft', applicableStages: ['logicalApplication','applicationRealization'], qualityAttributeRatings: { scalability: 5, availability: 5, simplicity: 2 }, whenToConsider: ['Independent processing'], whenToAvoidOrQuestion: ['Simple request-response only'], requires: [], recommends: ['PAT-OUTBOX'], tensions: [], obligations: ['Define event ownership'], evidence: [], owner: 'Test', version: '1.0.0', calibrationNote: '' }],
  patterns: [
    { id: 'PAT-OUTBOX', name: 'Transactional Outbox', recordType: 'pattern', category: 'integration', status: 'draft', applicableStages: ['applicationRealization','logicalTechnology'], pairsWellWith: ['STYLE-EVENT-DRIVEN'], conflictsWith: [], obligations: ['Define outbox retention'], requires: [], qualityAttributeImpact: { reliability: 4 }, risks: ['Duplicate delivery'], mitigations: ['Idempotent consumers'], evidence: [], owner: 'Test', version: '1.0.0', calibrationNote: '' },
    { id: 'PAT-IDEMPOTENT', name: 'Idempotent Consumer', recordType: 'pattern', category: 'integration', status: 'draft', applicableStages: ['applicationRealization','logicalTechnology'], pairsWellWith: [], conflictsWith: [], obligations: ['Define idempotency key'], requires: [], qualityAttributeImpact: { reliability: 4 }, risks: [], mitigations: [], evidence: [], owner: 'Test', version: '1.0.0', calibrationNote: '' },
  ],
};

describe('Sprint 7.5 intelligent visual design workbench', () => {
  it('builds components, patterns and styles into one rich library', () => {
    const records = createDesignLibrary(library);
    expect(records.filter((item) => item.recordType === 'component').length).toBeGreaterThanOrEqual(20);
    expect(records.some((item) => item.id === 'PAT-OUTBOX' && item.depiction.previewKind.includes('outbox'))).toBe(true);
    expect(records.some((item) => item.id === 'STYLE-EVENT-DRIVEN' && item.depiction.shape === 'boundary')).toBe(true);
  });

  it('previews and applies a typed component drop', () => {
    const project = { ...structuredClone(sampleProject), activeStage: 'logicalTechnology' as const };
    const preview = previewLibraryDrop(project, library, 'COMP-MESSAGE-BROKER', 'logicalTechnology', { x: 300, y: 220 });
    expect(preview.disposition).not.toBe('blocked');
    expect(preview.nodes[0]?.kind).toBe('LogicalTechnologyCapability');
    const updated = applyLibraryDrop(project, preview);
    expect(updated.nodes.some((node) => node.properties.libraryRecordId === 'COMP-MESSAGE-BROKER')).toBe(true);
    expect(updated.revision).toBe(project.revision + 1);
  });

  it('blocks a component in the wrong architecture view', () => {
    const preview = previewLibraryDrop(sampleProject, library, 'COMP-DEPLOYMENT-NODE', 'logicalApplication', { x: 10, y: 10 });
    expect(preview.disposition).toBe('blocked');
    expect(preview.findings.some((item) => item.title === 'Wrong architecture view')).toBe(true);
  });

  it('applies a scoped style decision without creating a fake canvas box', () => {
    const preview = previewLibraryDrop(sampleProject, library, 'STYLE-EVENT-DRIVEN', 'logicalApplication', { x: 200, y: 100 }, 'logical-order-service');
    expect(preview.nodes).toHaveLength(0);
    expect(preview.styleDecision?.scopeNodeId).toBe('logical-order-service');
    const updated = applyLibraryDrop(sampleProject, preview);
    expect(updated.styleDecisions.some((item) => item.styleId === 'STYLE-EVENT-DRIVEN' && item.scopeNodeId === 'logical-order-service')).toBe(true);
  });

  it('creates a structural pattern topology preview', () => {
    const project = { ...structuredClone(sampleProject), activeStage: 'applicationRealization' as const };
    const preview = previewLibraryDrop(project, library, 'PAT-OUTBOX', 'applicationRealization', { x: 360, y: 220 });
    expect(preview.nodes.map((node) => node.label)).toEqual(expect.arrayContaining(['Transactional Outbox','Outbox Publisher']));
    expect(preview.edges).toHaveLength(1);
    expect(preview.obligations).toContain('Define outbox retention');
  });


  it('instantiates a reusable topology template as typed nodes and relationships', () => {
    const project = { ...structuredClone(sampleProject), activeStage: 'logicalTechnology' as const };
    const preview = previewLibraryDrop(project, library, 'TPL-EVENT-PROCESSING', 'logicalTechnology', { x: 180, y: 140 });
    expect(preview.disposition).not.toBe('blocked');
    expect(preview.nodes.map((node) => node.label)).toEqual(expect.arrayContaining(['Message Broker Capability','Dead Letter Channel','Messaging Observability']));
    expect(preview.edges).toHaveLength(2);
    const updated = applyLibraryDrop(project, preview);
    expect(updated.nodes.filter((node) => node.properties.libraryRecordId === 'TPL-EVENT-PROCESSING')).toHaveLength(3);
  });

  it('suggests semantic relationship choices from object meaning', () => {
    const project = structuredClone(sampleProject);
    const options = getSemanticConnectionOptions(project, 'logical-order-service', 'logical-payment-service');
    expect(options.some((item) => item.kind === 'communicatesWith')).toBe(true);
  });

  it('returns contextual library ordering for the active design stage', () => {
    const records = contextualLibrary(sampleProject, library, 'logical-order-service');
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((item) => item.applicableStages.includes('logicalApplication'))).toBe(true);
    expect(records[0]!.recommendationScore).toBeGreaterThanOrEqual(records.at(-1)!.recommendationScore);
  });

  it('reports control coverage rather than an unexplained compliance percentage', () => {
    const metrics = computeCanvasCompliance(sampleProject, library);
    expect(metrics).toHaveLength(3);
    expect(metrics.every((item) => item.satisfiedControls <= item.applicableControls)).toBe(true);
    expect(metrics[0]).toHaveProperty('evidenceGaps');
  });
});
