import type { ArchitectureEdge, ArchitectureNode, ArchitectureProject } from '@aiw/domain';
import type { ScenarioTemplate } from '@aiw/engine';

// Store slice (8.8.5): applyScenarioTemplate — extracted honoring the
// shrink-only store budget; dependencies injected, no store internals leaked.
interface TemplateActionState {
  project: ArchitectureProject;
  notice?: string | null;
}

export interface TemplateActionDeps {
  get: () => TemplateActionState;
  set: (fn: (state: TemplateActionState) => void) => void;
  createId: (prefix: string) => string;
  bump: (project: ArchitectureProject) => void;
  updateDerived: (state: TemplateActionState, reason: string, event: { kind: string; field?: string; nextValue?: unknown }) => void;
  validateProposedNode: (project: ArchitectureProject, node: ArchitectureNode) => { allowed: boolean };
}

export function applyScenarioTemplateAction(deps: TemplateActionDeps, template: ScenarioTemplate): void {
  const { get, set, createId, bump, updateDerived, validateProposedNode } = deps;

  const additions: ArchitectureNode[] = [];
  const skipped: string[] = [];
  const existingStageCount = get().project.nodes.filter((node) => node.stage === 'logicalApplication').length;
  for (const [seedIndex, seed] of template.seedNodes.entries()) {
    const node: ArchitectureNode = {
      id: createId('node'),
      kind: seed.kind as ArchitectureNode['kind'],
      stage: 'logicalApplication',
      label: seed.label,
      description: seed.description,
      properties: { templateId: template.id },
      lineageFrom: [],
      positions: { logicalApplication: { x: 160 + ((existingStageCount + seedIndex) % 4) * 180, y: 110 + Math.floor((existingStageCount + seedIndex) / 4) * 150 } },
      tags: ['template-seed'],
      status: 'draft',
    };
    const validation = validateProposedNode(get().project, node);
    if (validation.allowed) additions.push(node);
    else skipped.push(seed.label);
  }

  set((state) => {
    const project = state.project;
    if (!project.description?.trim()) project.description = template.brief;
    for (const [attributeId, weight] of Object.entries(template.drivers)) {
      const existing = project.qualityPriorities.find((priority) => priority.attributeId === attributeId);
      if (existing) existing.weight = Math.max(existing.weight, weight);
      else project.qualityPriorities.push({ attributeId, weight });
    }
    for (const scenario of template.scenarios) {
      project.qualityScenarios.push({ id: createId('qas'), attributeId: scenario.attributeId, source: 'template', environment: 'production', artifact: 'architecture scenario template', stimulus: scenario.stimulus, response: scenario.response, responseMeasure: scenario.responseMeasure, weight: template.drivers[scenario.attributeId] ?? 3 });
    }
    const existingLabels = new Set(project.nodes.map((node) => node.label));
    const committed: ArchitectureNode[] = [];
    for (const node of additions) {
      if (existingLabels.has(node.label)) continue;
      project.nodes.push(node);
      committed.push(node);
      existingLabels.add(node.label);
    }
    const edges: ArchitectureEdge[] = [];
    for (let index = 0; index < committed.length - 1; index += 1) {
      const source = committed[index]!;
      const target = committed[index + 1]!;
      edges.push({
        id: createId('edge'),
        sourceId: source.id,
        targetId: target.id,
        kind: target.kind === 'DataStore' ? 'writes' : target.kind === 'Event' ? 'publishes' : target.kind === 'ExternalSystem' ? 'dependsOn' : 'communicatesWith',
        stage: 'logicalApplication',
        label: 'Guided journey seed relationship',
        properties: { templateId: template.id, guidedJourneyGenerated: true, requiresReview: true },
      });
    }
    const existingPairs = new Set(project.edges.map((edge) => `${edge.sourceId}->${edge.targetId}`));
    for (const edge of edges) {
      const pair = `${edge.sourceId}->${edge.targetId}`;
      if (!existingPairs.has(pair)) project.edges.push(edge);
    }
    bump(project);
    updateDerived(state, 'canvas-change', { kind: 'state-recomputed' });
    state.notice = skipped.length
      ? `${template.name} applied; ${skipped.join(', ')} blocked by policy — the guide explains why.`
      : `${template.name} applied — drivers, scenarios, seed objects and review-required relationships are yours to edit. The Guided Journey continues from here.`;
  });
}
