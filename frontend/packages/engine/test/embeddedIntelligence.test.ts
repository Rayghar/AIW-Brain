import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import {
  applyOutcomeToPreferences,
  evaluateArchitectureEvent,
} from '../src/index.js';

const loadLibrary = (): KnowledgeLibrary => JSON.parse(
  readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8'),
) as KnowledgeLibrary;

describe('v0.9.9 embedded architecture intelligence kernel', () => {
  it('returns one governed response contract for a design-state event', () => {
    const response = evaluateArchitectureEvent(
      structuredClone(sampleProject),
      loadLibrary(),
      { kind: 'state-recomputed', eventId: 'trace-state-001' },
    );

    expect(response.trace.id).toBe('trace-state-001');
    expect(response.trace.rulesFired).toContain('context-assembled');
    expect(response.trace.rulesFired).toContain('approved-knowledge-retrieved');
    expect(response.evidence.knowledgeReleaseId).toBe('AKR-0.10.60');
    expect(response.evidence.origin).toBe('approved-release');
    expect(response.evidence.candidateKnowledgeUsed).toBe(false);
    expect(response.suggestedComponents.length).toBeGreaterThan(0);
    expect(response.nextBestActions.length).toBeGreaterThan(0);
    expect(response.health.score).toBeGreaterThan(0);
    expect(response.explanation.basedOn[0]).toContain('AKR-0.10.60');
  });

  it('reviews a connection intent before proposing a reversible semantic relationship', () => {
    const response = evaluateArchitectureEvent(
      structuredClone(sampleProject),
      loadLibrary(),
      {
        kind: 'connection-intent',
        sourceId: 'logical-order-service',
        targetId: 'logical-payment-service',
        relationshipKind: 'communicatesWith',
        eventId: 'trace-connection-001',
      },
    );

    expect(response.trace.rulesFired).toContain('connection-semantics-evaluated');
    expect(response.affectedObjects).toEqual(expect.arrayContaining(['logical-order-service', 'logical-payment-service']));
    expect(response.suggestedRelationships.length).toBeGreaterThan(0);
    expect(response.suggestedRelationships.some((item) => item.recommended)).toBe(true);
    expect(response.proposedChangeSets.some((set) => set.operations.some((operation) => operation.type === 'create-relationship'))).toBe(true);
    expect(response.questions.length + response.missingAttributes.length).toBeGreaterThan(0);
    expect(response.confidence).toBe('medium');
  });

  it('propagates an attribute change through impact analysis', () => {
    const project = structuredClone(sampleProject);
    const response = evaluateArchitectureEvent(
      project,
      loadLibrary(),
      {
        kind: 'attribute-changed',
        subjectIds: ['logical-payment-service'],
        field: 'consistency',
        previousValue: 'eventual',
        nextValue: 'strong',
        eventId: 'trace-attribute-001',
      },
    );

    expect(response.trace.rulesFired).toContain('attribute-consequence-evaluated');
    expect(response.affectedObjects).toContain('logical-payment-service');
    expect(response.findings.some((finding) => finding.category === 'trade-off' || finding.category === 'recommendation')).toBe(true);
  });

  it('learns presentation preference without mutating governed knowledge', () => {
    const library = loadLibrary();
    const event = { kind: 'state-recomputed' as const };
    const initial = evaluateArchitectureEvent(structuredClone(sampleProject), library, event);
    const top = initial.nextBestActions[0]!;
    const preferences = applyOutcomeToPreferences({ demoted: {} }, top.kind, 'dismissed');
    const after = evaluateArchitectureEvent(structuredClone(sampleProject), library, event, preferences);
    const reranked = after.nextBestActions.find((item) => item.kind === top.kind);

    expect(preferences.demoted[top.kind]).toBe(1);
    if (reranked) expect(reranked.score).toBeLessThan(top.score);
    expect(library.knowledgeReleaseId).toBe('AKR-0.10.60');
  });

  it('projects a visual model for every migrated lifecycle workspace', () => {
    const project = structuredClone(sampleProject);
    const library = loadLibrary();
    const workspaces = ['design-brief','quality','design-canvas','synthesis','patterns','governance','realization'] as const;

    for (const workspace of workspaces) {
      const response = evaluateArchitectureEvent(project, library, {
        kind: 'workspace-entered',
        workspace,
        eventId: `trace-${workspace}`,
      });
      expect(response.context.workspace).toBe(workspace);
      expect(response.trace.rulesFired).toContain('visual-model-projected');
      expect(response.visualModel.workspace).toBe(workspace);
      expect(response.visualModel.generatedFrom).toBe('canonical-project-and-intelligence-kernel');
      expect(response.visualModel.nodes.length).toBeGreaterThan(1);
      expect(response.visualModel.edges.length).toBeGreaterThan(0);
    }
  });

  it('connects quality drivers, scenarios and style alternatives in the visual projection', () => {
    const response = evaluateArchitectureEvent(structuredClone(sampleProject), loadLibrary(), {
      kind: 'workspace-entered',
      workspace: 'quality',
      eventId: 'trace-quality-map',
    });

    expect(response.visualModel.nodes.some((node) => node.kind === 'driver')).toBe(true);
    expect(response.visualModel.nodes.some((node) => node.kind === 'scenario')).toBe(true);
    expect(response.visualModel.nodes.some((node) => node.kind === 'style')).toBe(true);
    expect(response.visualModel.edges.some((edge) => edge.kind === 'measures')).toBe(true);
    expect(response.visualModel.edges.some((edge) => edge.kind === 'supports' || edge.kind === 'conflicts')).toBe(true);
  });

});
