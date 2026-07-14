import type {
  AiwLifecycleStage,
  ArchitectureObjectInput,
  ArchitectureStyleInput,
  BrainContext,
  PatternInput,
  QualityDriverInput,
} from '@aiw/brain-runtime';

function mapStage(stage?: string): AiwLifecycleStage {
  switch (stage) {
    case 'designIntent':
      return 'requirements-intent';
    case 'logicalApplication':
      return 'logical-application';
    case 'applicationRealization':
      return 'application-realization';
    case 'logicalTechnology':
      return 'logical-technology';
    case 'physicalTechnology':
      return 'physical-technology';
    case 'validationRealization':
      return 'review-assurance';
    default:
      return 'logical-application';
  }
}

function readableDriverName(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function driverInputs(workspace: any): QualityDriverInput[] {
  const project = workspace.project ?? workspace;
  const scenarios = new Set((project.qualityScenarios ?? []).map((scenario: any) => scenario.attributeId));
  return (project.qualityPriorities ?? workspace.qualityDrivers ?? []).map((driver: any) => {
    const id = driver.attributeId ?? driver.id ?? driver.name ?? 'quality-driver';
    return {
      id,
      name: driver.name ?? readableDriverName(id),
      weight: Number(driver.weight ?? 0),
      target: driver.rationale ?? driver.target,
      scenarioComplete: scenarios.has(id) || Boolean(driver.scenarioComplete),
    };
  });
}

function styleInputs(workspace: any): ArchitectureStyleInput[] {
  const project = workspace.project ?? workspace;
  const library = workspace.library ?? {};
  const records = library.architectureStyles ?? workspace.candidateStyles ?? workspace.architectureStyles ?? [];
  return records.map((style: any) => ({
    id: style.id,
    name: style.name ?? style.id,
    fitScore: style.fitScore ?? style.recommendationScore,
    driverAffinity: style.driverAffinity ?? style.qualityAttributeImpact ?? style.driverFit,
    requiredPatterns: style.requiredPatterns ?? style.recommends ?? style.requires ?? [],
    discouragedPatterns: style.discouragedPatterns ?? style.conflictsWith ?? [],
    requiredObjectFamilies: style.requiredObjectFamilies ?? [],
  }));
}

function patternInputs(workspace: any): PatternInput[] {
  const project = workspace.project ?? workspace;
  const library = workspace.library ?? {};
  const selected = new Map((project.patternSelections ?? []).map((selection: any) => [selection.patternId, selection]));
  const source = library.patterns ?? workspace.candidatePatterns ?? workspace.patterns ?? [];
  return source.map((pattern: any) => {
    const selection = selected.get(pattern.id) as any;
    const accepted = selection?.status === 'accepted' || Boolean(pattern.accepted);
    return {
      id: pattern.id,
      name: pattern.name ?? pattern.id,
      accepted,
      candidate: accepted || Boolean(selection) || Boolean(pattern.candidate),
      obligations: (pattern.obligations ?? []).map((obligation: any, index: number) => {
        const label = typeof obligation === 'string' ? obligation : obligation.label ?? obligation.title ?? `Obligation ${index + 1}`;
        const lower = label.toLowerCase();
        return {
          id: typeof obligation === 'string' ? `${pattern.id}:obligation:${index}` : obligation.id ?? `${pattern.id}:obligation:${index}`,
          label,
          domain: lower.includes('security') || lower.includes('auth') ? 'security'
            : lower.includes('resilien') || lower.includes('fail') || lower.includes('recover') ? 'resilience'
            : lower.includes('observ') || lower.includes('telemetry') ? 'observability'
            : lower.includes('data') ? 'data'
            : lower.includes('deploy') ? 'deployment'
            : lower.includes('review') || lower.includes('evidence') ? 'review'
            : 'integration',
          severity: lower.includes('must') || lower.includes('required') ? 'warning' : 'hint',
          evidenceRequired: lower.includes('evidence') || lower.includes('test') || lower.includes('prove'),
        };
      }),
      requires: pattern.requires ?? [],
      conflictsWith: pattern.conflictsWith ?? [],
      pairsWith: pattern.pairsWellWith ?? pattern.pairsWith ?? [],
    };
  });
}

function objectInputs(workspace: any): ArchitectureObjectInput[] {
  const project = workspace.project ?? workspace;
  const stage = mapStage(project.activeStage ?? workspace.activeLifecycleStage ?? workspace.designStage);
  return (project.nodes ?? workspace.architectureObjects ?? workspace.nodes ?? []).map((node: any) => {
    const ports = node.properties?.ports ?? node.ports ?? [];
    const semanticInterfaces = node.properties?.interfaces ?? node.interfaces ?? [];
    return {
      id: node.id,
      name: node.label ?? node.name ?? node.id,
      family: node.kind ?? node.family ?? 'ArchitectureObject',
      stage: mapStage(node.stage) ?? stage,
      attributes: node.properties ?? node.attributes ?? {},
      inboundInterfaces: [...ports, ...semanticInterfaces]
        .filter((item: any) => item.direction === 'inbound' || item.direction === 'input')
        .map((item: any, index: number) => ({
          id: item.id ?? `${node.id}:in:${index}`,
          name: item.label ?? item.name ?? `Inbound ${index + 1}`,
          kind: item.kind ?? item.semanticTypes?.[0] ?? 'api',
          direction: 'inbound',
          contractDefined: Boolean(item.contractDefined ?? item.schema ?? item.contract),
          owner: item.owner,
        })),
      outboundInterfaces: [...ports, ...semanticInterfaces]
        .filter((item: any) => item.direction === 'outbound' || item.direction === 'output')
        .map((item: any, index: number) => ({
          id: item.id ?? `${node.id}:out:${index}`,
          name: item.label ?? item.name ?? `Outbound ${index + 1}`,
          kind: item.kind ?? item.semanticTypes?.[0] ?? 'api',
          direction: 'outbound',
          contractDefined: Boolean(item.contractDefined ?? item.schema ?? item.contract),
          owner: item.owner,
        })),
      owner: node.properties?.owner as string | undefined,
      acceptedPatternIds: (project.patternSelections ?? [])
        .filter((selection: any) => selection.status === 'accepted' && (!selection.scopeNodeId || selection.scopeNodeId === node.id))
        .map((selection: any) => selection.patternId),
    };
  });
}

/**
 * Adapter seam from the existing AIW workspace store to the brain runtime.
 * The UI remains dumb; this file only translates project/library state to the runtime contract.
 */
export function adaptWorkspaceToBrainContext(workspace: any): BrainContext {
  const project = workspace.project ?? workspace;
  const activeStage = mapStage(workspace.activeLifecycleStage ?? project.activeStage ?? workspace.designStage);
  const selectedStyleId = workspace.selectedStyleId
    ?? (project.styleDecisions ?? []).find((decision: any) => decision.status === 'accepted' && decision.stage === project.activeStage)?.styleId
    ?? (project.styleDecisions ?? []).find((decision: any) => decision.status === 'accepted')?.styleId;

  return {
    projectId: project.id ?? workspace.activeProjectId ?? 'local-project',
    activeStage,
    selectedObjectId: workspace.selectedObjectId ?? workspace.selectedNodeId,
    selectedStyleId,
    qualityDrivers: driverInputs(workspace),
    candidateStyles: styleInputs(workspace),
    acceptedPatterns: patternInputs(workspace).filter((pattern) => pattern.accepted),
    candidatePatterns: patternInputs(workspace),
    architectureObjects: objectInputs(workspace),
    mindFactory: workspace.mindFactory ?? {
      activeReleaseId: workspace.library?.knowledgeReleaseId,
      releaseConfidence: workspace.library?.knowledgeReleaseId ? 0.82 : 0.58,
      staleRecords: workspace.knowledgeOps?.staleRecords,
      contradictionsOpen: workspace.knowledgeOps?.contradictionsOpen,
    },
    dismissedSignalIds: workspace.dismissedBrainSignalIds ?? [],
  };
}
