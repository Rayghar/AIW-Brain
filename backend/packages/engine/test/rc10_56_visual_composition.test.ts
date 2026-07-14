import { describe, expect, it } from 'vitest';
import { architectureStages, sampleProject, sprint78PatternCorpus, type ArchitectureProject } from '@aiw/domain';
import { applyPatternComposition, composePatterns, rollbackPatternComposition } from '../src/index.js';

function cloneProject(): ArchitectureProject {
  return structuredClone(sampleProject);
}

describe('rc.10.56 Visual Architecture Composition Studio', () => {
  it('builds a canonical preview with objects, relationships, interfaces, boundaries, obligations and a named view', () => {
    const plan = composePatterns({
      project: cloneProject(),
      patternIds: ['PAT-EVENT-DRIVEN-ARCHITECTURE', 'PAT-TRANSACTIONAL-OUTBOX'],
      allowConditionalPrerequisites: true,
    });
    expect(plan.eligible).toBe(true);
    expect(plan.applicationKey).toMatch(/^PCAPP-/);
    expect(plan.mutation.addNodes.length).toBeGreaterThan(0);
    expect(plan.mutation.addEdges.length).toBeGreaterThan(0);
    expect(plan.mutation.addInterfaces.length).toBeGreaterThan(0);
    expect(plan.mutation.addNodes.some((node) => node.tags.includes('trust-boundary'))).toBe(true);
    expect(plan.obligations.length).toBeGreaterThan(0);
    expect(plan.mutation.addArchitectureViews).toHaveLength(1);
    expect(plan.canonicalChecks.every((check) => check.passed)).toBe(true);
  });

  it('applies explicit acceptance to the canonical model and retains Pattern DNA lineage', () => {
    const project = cloneProject();
    const plan = composePatterns({ project, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    const applied = applyPatternComposition(project, plan);
    expect(applied.nodes.length).toBe(project.nodes.length + plan.mutation.addNodes.length);
    expect((applied.interfaces ?? []).length).toBe((project.interfaces ?? []).length + plan.mutation.addInterfaces.length);
    expect((applied.architectureViews ?? []).some((view) => view.id === plan.mutation.addArchitectureViews[0]?.id)).toBe(true);
    expect(applied.patternSelections.some((item) => item.patternId === 'PAT-TRANSACTIONAL-OUTBOX' && item.status === 'accepted')).toBe(true);
    expect(plan.mutation.addNodes.every((node) => node.properties.patternId && node.properties.knowledgeReleaseId)).toBe(true);
  });

  it('is idempotent and does not create uncontrolled duplicates when the same pattern is applied again', () => {
    const firstPlan = composePatterns({ project: cloneProject(), patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    const once = applyPatternComposition(cloneProject(), firstPlan);
    const secondPlan = composePatterns({ project: once, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    const twice = applyPatternComposition(once, secondPlan);
    expect(secondPlan.duplicateSkips.length).toBeGreaterThan(0);
    expect(twice.nodes.length).toBe(once.nodes.length);
    expect(twice.edges.length).toBe(once.edges.length);
    expect((twice.interfaces ?? []).length).toBe((once.interfaces ?? []).length);
    expect(twice.patternSelections.filter((item) => item.patternId === 'PAT-TRANSACTIONAL-OUTBOX')).toHaveLength(1);
  });

  it('rolls back only the selected composition without removing unrelated model content', () => {
    const project = cloneProject();
    const baselineNodeIds = new Set(project.nodes.map((node) => node.id));
    const plan = composePatterns({ project, patternIds: ['PAT-TRANSACTIONAL-OUTBOX'], allowConditionalPrerequisites: true });
    const applied = applyPatternComposition(project, plan);
    const rolledBack = rollbackPatternComposition(applied, plan);
    expect(rolledBack.nodes.map((node) => node.id).filter((id) => baselineNodeIds.has(id))).toHaveLength(project.nodes.length);
    expect(rolledBack.nodes.length).toBe(project.nodes.length);
    expect(rolledBack.edges.length).toBe(project.edges.length);
    expect((rolledBack.interfaces ?? []).length).toBe((project.interfaces ?? []).length);
    expect(rolledBack.patternSelections.some((item) => plan.rollback.removePatternSelectionIds.includes(item.id))).toBe(false);
  });

  it('refuses candidate or unreviewed knowledge as a canonical mutation authority', () => {
    const approved = sprint78PatternCorpus.find((record) => record.id === 'PAT-TRANSACTIONAL-OUTBOX')!;
    const candidate = structuredClone(approved);
    candidate.id = 'PAT-CANDIDATE-NON-SCORING';
    candidate.name = 'Candidate non-scoring pattern';
    candidate.lifecycle = 'candidate';
    const plan = composePatterns({ project: cloneProject(), patternIds: [candidate.id], allowConditionalPrerequisites: true }, [candidate]);
    expect(plan.eligible).toBe(false);
    expect(plan.canonicalChecks.find((check) => check.id === 'approved-authority')?.passed).toBe(false);
  });

  it('can produce a persistent visible composition view for every modelling stage using an applicable topology record', () => {
    for (const stage of architectureStages) {
      const record = sprint78PatternCorpus.find((item) => item.lifecycle === 'approved' && item.topology?.nodes.length && item.applicableStages.includes(stage));
      if (!record) continue;
      const project = cloneProject();
      project.activeStage = stage;
      const plan = composePatterns({ project, patternIds: [record.id], stage, allowConditionalPrerequisites: true });
      expect(plan.eligible, `${stage} should be eligible with ${record.id}`).toBe(true);
      expect(plan.mutation.addArchitectureViews[0]?.name).toContain(stage.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (value) => value.toUpperCase()));
      expect(plan.mutation.addArchitectureViews[0]?.filters.includeNodeIds?.length).toBeGreaterThan(0);
    }
  });
});
