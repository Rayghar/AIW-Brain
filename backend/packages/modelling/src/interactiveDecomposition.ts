import type {
  ArchitectureDecompositionIssue,
  ArchitectureDecompositionLevel,
  ArchitectureDecompositionReport,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureScopeSummary,
} from '@aiw/domain';

const levelOrder: ArchitectureDecompositionLevel[] = ['landscape','system','container','component','code','deployment'];

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function inferArchitectureDecompositionLevel(node: ArchitectureNode): ArchitectureDecompositionLevel {
  const explicit = text(node.properties.decompositionLevel);
  if (explicit && levelOrder.includes(explicit as ArchitectureDecompositionLevel)) return explicit as ArchitectureDecompositionLevel;
  if (['logicalTechnology','physicalTechnology'].includes(node.stage) || ['DeploymentNode','Environment','Region','AvailabilityZone','NetworkZone','TechnologyProduct','Runtime'].includes(node.kind)) return 'deployment';
  if (['Actor','ExternalSystem'].includes(node.kind)) return 'landscape';
  if (['System','Domain','Capability'].includes(node.kind)) return 'system';
  if (['ApplicationComponent','DeployableUnit','DataStore'].includes(node.kind)) return 'container';
  if (['Module','Interface','API','Event','Control'].includes(node.kind)) return 'component';
  if (node.tags.some((tag) => ['code','class','function','package','repository-module'].includes(tag.toLowerCase())) || text(node.properties.implementationPath)) return 'code';
  if (node.stage === 'logicalApplication') return 'system';
  if (node.stage === 'applicationRealization') return 'container';
  if (node.stage === 'logicalTechnology') return 'container';
  return 'component';
}

function explicitParent(node: ArchitectureNode): string | undefined {
  return node.parentId ?? text(node.properties.parentScopeId) ?? text(node.properties.parentNodeId);
}

function lineageParent(project: ArchitectureProject, node: ArchitectureNode): string | undefined {
  const ancestors = node.lineageFrom.map((id) => project.nodes.find((candidate) => candidate.id === id)).filter(Boolean) as ArchitectureNode[];
  const level = inferArchitectureDecompositionLevel(node);
  const preferred = ancestors.find((candidate) => {
    const ancestorLevel = inferArchitectureDecompositionLevel(candidate);
    if (level === 'component') return ancestorLevel === 'container';
    if (level === 'container') return ancestorLevel === 'system';
    if (level === 'deployment') return ['container','component'].includes(ancestorLevel);
    return false;
  });
  return preferred?.id ?? ancestors[0]?.id;
}

export function resolveArchitectureParentId(project: ArchitectureProject, node: ArchitectureNode): string | undefined {
  const direct = explicitParent(node);
  if (direct && project.nodes.some((candidate) => candidate.id === direct)) return direct;
  return undefined;
}

export function architectureChildren(project: ArchitectureProject, nodeId: string): ArchitectureNode[] {
  return project.nodes.filter((node) => resolveArchitectureParentId(project, node) === nodeId);
}

export function architectureAncestors(project: ArchitectureProject, nodeId: string): ArchitectureNode[] {
  const result: ArchitectureNode[] = [];
  const visited = new Set<string>();
  let current = project.nodes.find((node) => node.id === nodeId);
  while (current) {
    const parentId = resolveArchitectureParentId(project, current);
    if (!parentId || visited.has(parentId)) break;
    const parent = project.nodes.find((node) => node.id === parentId);
    if (!parent) break;
    visited.add(parentId);
    result.unshift(parent);
    current = parent;
  }
  return result;
}

export function architectureDescendantIds(project: ArchitectureProject, nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const child of architectureChildren(project, current)) {
      if (result.has(child.id)) continue;
      result.add(child.id);
      queue.push(child.id);
    }
  }
  return result;
}

export function buildArchitectureScopeSummaries(project: ArchitectureProject): ArchitectureScopeSummary[] {
  return project.nodes.map((node) => {
    const parentNodeId = resolveArchitectureParentId(project, node);
    const breadcrumbNodeIds = [...architectureAncestors(project, node.id).map((ancestor) => ancestor.id), node.id];
    const sourceRepository = text(node.properties.sourceRepository) ?? text(node.properties.repository);
    const implementationPath = text(node.properties.implementationPath) ?? text(node.properties.sourcePath);
    return {
      nodeId: node.id,
      label: node.label,
      level: inferArchitectureDecompositionLevel(node),
      stage: node.stage,
      kind: node.kind,
      ...(parentNodeId ? { parentNodeId } : {}),
      childNodeIds: architectureChildren(project, node.id).map((child) => child.id),
      breadcrumbNodeIds,
      ...(sourceRepository ? { sourceRepository } : {}),
      ...(implementationPath ? { implementationPath } : {}),
    };
  });
}

export function architectureBreadcrumb(project: ArchitectureProject, nodeId?: string | null): ArchitectureNode[] {
  if (!nodeId) return [];
  const node = project.nodes.find((candidate) => candidate.id === nodeId);
  return node ? [...architectureAncestors(project, node.id), node] : [];
}

export function architectureScopesForLevel(project: ArchitectureProject, level: ArchitectureDecompositionLevel): ArchitectureNode[] {
  return project.nodes.filter((node) => inferArchitectureDecompositionLevel(node) === level);
}

export function resolveDecompositionVisibleNodeIds(
  project: ArchitectureProject,
  level: ArchitectureDecompositionLevel,
  scopeNodeId?: string | null,
): Set<string> {
  const visible = new Set<string>();
  const scope = scopeNodeId ? project.nodes.find((node) => node.id === scopeNodeId) : undefined;
  if (level === 'landscape') {
    project.nodes.filter((node) => ['landscape','system'].includes(inferArchitectureDecompositionLevel(node))).forEach((node) => visible.add(node.id));
    return visible;
  }
  if (level === 'deployment') {
    project.nodes.filter((node) => inferArchitectureDecompositionLevel(node) === 'deployment').forEach((node) => visible.add(node.id));
    if (scope) {
      visible.add(scope.id);
      architectureDescendantIds(project, scope.id).forEach((id) => visible.add(id));
      for (const node of project.nodes) if (node.lineageFrom.includes(scope.id)) visible.add(node.id);
    }
    return visible;
  }
  if (!scope) {
    project.nodes.filter((node) => inferArchitectureDecompositionLevel(node) === level).forEach((node) => visible.add(node.id));
    return visible;
  }
  visible.add(scope.id);
  const descendants = architectureDescendantIds(project, scope.id);
  descendants.forEach((id) => {
    const node = project.nodes.find((candidate) => candidate.id === id);
    if (!node) return;
    const nodeLevel = inferArchitectureDecompositionLevel(node);
    const targetIndex = levelOrder.indexOf(level);
    const nodeIndex = levelOrder.indexOf(nodeLevel);
    if (nodeIndex <= targetIndex + 1 || nodeLevel === level) visible.add(id);
  });
  for (const edge of project.edges) {
    if (visible.has(edge.sourceId) || visible.has(edge.targetId)) {
      const otherId = visible.has(edge.sourceId) ? edge.targetId : edge.sourceId;
      const other = project.nodes.find((node) => node.id === otherId);
      if (other && ['Actor','ExternalSystem'].includes(other.kind)) visible.add(otherId);
    }
  }
  return visible;
}

export function nextDecompositionLevel(level: ArchitectureDecompositionLevel): ArchitectureDecompositionLevel | null {
  const index = levelOrder.indexOf(level);
  return index >= 0 && index < levelOrder.length - 1 ? levelOrder[index + 1]! : null;
}

export function previousDecompositionLevel(level: ArchitectureDecompositionLevel): ArchitectureDecompositionLevel | null {
  const index = levelOrder.indexOf(level);
  return index > 0 ? levelOrder[index - 1]! : null;
}

export function validateArchitectureDecomposition(project: ArchitectureProject): ArchitectureDecompositionReport {
  const scopes = buildArchitectureScopeSummaries(project);
  const issues: ArchitectureDecompositionIssue[] = [];
  const countsByLevel = Object.fromEntries(levelOrder.map((level) => [level, 0])) as Record<ArchitectureDecompositionLevel, number>;
  for (const scope of scopes) countsByLevel[scope.level] += 1;

  for (const node of project.nodes) {
    const level = inferArchitectureDecompositionLevel(node);
    const parentId = resolveArchitectureParentId(project, node);
    if (['container','component','code'].includes(level) && !parentId) {
      issues.push({
        id: `missing-parent-${node.id}`,
        kind: 'missing-parent',
        severity: level === 'container' ? 'warning' : 'blocker',
        nodeIds: [node.id],
        message: `${node.label} is a ${level} without a parent scope.`,
        remediation: `Assign ${node.label} to an explicit ${level === 'container' ? 'software system' : level === 'component' ? 'container' : 'component'} scope.`,
      });
    }
    if (parentId) {
      const parent = project.nodes.find((candidate) => candidate.id === parentId);
      if (parent) {
        const parentLevel = inferArchitectureDecompositionLevel(parent);
        const parentIndex = levelOrder.indexOf(parentLevel);
        const childIndex = levelOrder.indexOf(level);
        if (parentIndex >= childIndex && level !== 'deployment') {
          issues.push({
            id: `invalid-parent-${node.id}`,
            kind: 'invalid-parent-level',
            severity: 'blocker',
            nodeIds: [parent.id, node.id],
            message: `${node.label} (${level}) cannot be contained by ${parent.label} (${parentLevel}).`,
            remediation: 'Choose a parent at a higher decomposition level or update the object classification.',
          });
        }
      }
    }
    if (level === 'code' && !text(node.properties.implementationPath)) {
      issues.push({
        id: `missing-code-path-${node.id}`,
        kind: 'missing-implementation-path',
        severity: 'warning',
        nodeIds: [node.id],
        message: `${node.label} is modelled at code level without a repository implementation path.`,
        remediation: 'Link the element to a repository, package, directory or symbol.',
      });
    }
    if (level === 'deployment' && node.lineageFrom.length === 0 && !parentId) {
      issues.push({
        id: `orphan-deployment-${node.id}`,
        kind: 'orphan-deployment',
        severity: 'warning',
        nodeIds: [node.id],
        message: `${node.label} has no logical realization lineage.`,
        remediation: 'Map the deployment element to the logical capability, container or component it realizes.',
      });
    }
  }

  const contractPairs = new Set((project.interfaces ?? []).flatMap((contract) => contract.consumerNodeIds.map((consumerId) => `${contract.providerNodeId}->${consumerId}`)));
  for (const edge of project.edges) {
    const source = project.nodes.find((node) => node.id === edge.sourceId);
    const target = project.nodes.find((node) => node.id === edge.targetId);
    if (!source || !target) continue;
    const sourceParent = resolveArchitectureParentId(project, source) ?? source.id;
    const targetParent = resolveArchitectureParentId(project, target) ?? target.id;
    if (sourceParent !== targetParent && ['communicatesWith','exposes','consumes','publishes','subscribes'].includes(edge.kind)) {
      const hasContract = contractPairs.has(`${source.id}->${target.id}`) || contractPairs.has(`${target.id}->${source.id}`);
      if (!hasContract) {
        issues.push({
          id: `uncontracted-${edge.id}`,
          kind: 'uncontracted-boundary-crossing',
          severity: 'warning',
          nodeIds: [source.id, target.id],
          message: `${source.label} crosses a scope boundary to ${target.label} without a governed interface contract.`,
          remediation: 'Create an API, event, stream, batch or data contract and assign ownership and failure semantics.',
        });
      }
    }
  }

  return { generatedAt: new Date().toISOString(), scopes, issues, countsByLevel, valid: !issues.some((issue) => issue.severity === 'blocker') };
}
