import { describe, expect, it } from 'vitest';
import type { ArchitectureProject, ArchitectureStyleRecord, KnowledgeLibrary, QualityAttributeRecord } from '@aiw/domain';
import { sampleProject } from '@aiw/domain';
import { deriveDesignGuidance, recommendArchitectureStyles, recommendInContext, validateProject } from '../src/index.js';

const qa = (id: string, calibrated = true): QualityAttributeRecord => ({
  id,
  name: id,
  definition: id,
  measures: id,
  exampleTactics: id,
  calibrated,
  calibrationConfidence: calibrated ? 0.9 : 0,
  calibrationStatus: calibrated ? 'approved' : 'pending-expert-calibration',
});

const style = (input: Partial<ArchitectureStyleRecord> & Pick<ArchitectureStyleRecord, 'id'|'name'|'qualityAttributeRatings'>): ArchitectureStyleRecord => ({
  id: input.id,
  name: input.name,
  qualityAttributeRatings: input.qualityAttributeRatings,
  recordType: 'architectureStyle',
  status: 'approved',
  applicableStages: ['logicalApplication','applicationRealization'],
  whenToConsider: [],
  whenToAvoidOrQuestion: [],
  requires: [],
  recommends: [],
  tensions: [],
  obligations: [],
  evidence: [],
  owner: 'test',
  version: '1.0.0',
  calibrationNote: 'test',
  traits: [],
  applicability: {},
  requiredTechnologies: [],
  technologyRealizations: [],
  ...input,
});

function library(styles: ArchitectureStyleRecord[], attributes = [qa('availability'), qa('scalability'), qa('security', false)]): KnowledgeLibrary {
  return { libraryId: 'test', version: '0.9.1', status: 'approved', generatedAt: new Date().toISOString(), disclaimer: '', qualityAttributes: attributes, architectureStyles: styles, patterns: [], viewpoints: [], evidence: [], rulePacks: [] };
}

function project(priorities: ArchitectureProject['qualityPriorities']): ArchitectureProject {
  const value = structuredClone(sampleProject);
  value.activeStage = 'logicalApplication';
  value.qualityPriorities = priorities;
  value.context.teamSize = 20;
  value.context.operationalMaturity = 4;
  return value;
}

describe('v0.9.1 recommendation correctness', () => {
  const scalable = style({ id: 'STYLE-A', name: 'Renamable A', qualityAttributeRatings: { scalability: 5, availability: 2 }, traits: ['distributed'] });
  const available = style({ id: 'STYLE-B', name: 'Renamable B', qualityAttributeRatings: { scalability: 2, availability: 5 }, traits: ['cohesive-deployment'] });

  it('lets calibrated drivers change the ranking', () => {
    const kb = library([scalable, available]);
    expect(recommendArchitectureStyles(project([{ attributeId: 'scalability', weight: 5 }]), kb)[0]?.styleId).toBe('STYLE-A');
    expect(recommendArchitectureStyles(project([{ attributeId: 'availability', weight: 5 }]), kb)[0]?.styleId).toBe('STYLE-B');
  });

  it('does not let pending attributes become placebo score inputs', () => {
    const kb = library([scalable, available]);
    const base = recommendArchitectureStyles(project([{ attributeId: 'scalability', weight: 5 }]), kb).map((item) => [item.styleId,item.score]);
    const pending = recommendArchitectureStyles(project([{ attributeId: 'scalability', weight: 5 }, { attributeId: 'security', weight: 5 }]), kb);
    expect(pending.map((item) => [item.styleId,item.score])).toEqual(base);
    expect(pending[0]?.ignoredPriorityIds).toContain('security');
  });

  it('is invariant to display-name changes', () => {
    const kbA = library([scalable, available]);
    const kbB = library([{ ...scalable, name: 'Completely translated display label' }, available]);
    const p = project([{ attributeId: 'scalability', weight: 5 }]);
    expect(recommendArchitectureStyles(p, kbA).map((item) => [item.styleId,item.score,item.eligible]))
      .toEqual(recommendArchitectureStyles(p, kbB).map((item) => [item.styleId,item.score,item.eligible]));
  });

  it('uses applicability gates to disqualify unsuitable styles', () => {
    const micro = style({ id: 'STYLE-MICRO', name: 'Any label', qualityAttributeRatings: { scalability: 5 }, traits: ['distributed'], applicability: { minTeamSize: 10, minOperationalMaturity: 3 } });
    const p = project([{ attributeId: 'scalability', weight: 5 }]);
    p.context.teamSize = 4;
    const result = recommendArchitectureStyles(p, library([micro], [qa('scalability')]))[0]!;
    expect(result.eligible).toBe(false);
    expect(result.disqualifiers.join(' ')).toContain('team size');
  });

  it('evaluates prohibited technology against realizations rather than style labels', () => {
    const bound = style({ id: 'STYLE-BOUND', name: 'Neutral label', qualityAttributeRatings: { availability: 4 }, requiredTechnologies: ['Kafka'] });
    const p = project([{ attributeId: 'availability', weight: 5 }]);
    p.context.prohibitedTechnologies = ['Kafka'];
    const result = recommendArchitectureStyles(p, library([bound], [qa('availability')]))[0]!;
    expect(result.eligible).toBe(false);
    expect(result.disqualifiers[0]).toContain('Kafka');
  });

  it('produces stage-aware, knowledge-linked visual guidance', () => {
    const kb = library([scalable, available]);
    const p = project([{ attributeId: 'scalability', weight: 5 }]);
    p.styleDecisions = [];
    const contextual = recommendInContext(p, kb, { stage: p.activeStage, trigger: 'initial' });
    const guidance = deriveDesignGuidance(p, kb, contextual, validateProject(p, kb), null);
    expect(guidance.some((item) => item.placement === 'canvas' && item.linkedRecordIds.includes('STYLE-A'))).toBe(true);
  });
});
