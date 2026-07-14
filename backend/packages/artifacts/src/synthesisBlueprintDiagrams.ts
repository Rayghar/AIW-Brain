import type {
  ArchitectureAlternative,
  ArchitectureBlueprintViewId,
  ArchitectureNode,
  BlueprintInterfaceContract,
} from '@aiw/domain';

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] ?? character));
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'view';

interface PositionedNode {
  node: ArchitectureNode;
  x: number;
  y: number;
  width: number;
  height: number;
}

function stageRank(stage: ArchitectureNode['stage']): number {
  return ['designIntent','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','validationRealization'].indexOf(stage);
}

function positionNodes(nodes: ArchitectureNode[], viewId: ArchitectureBlueprintViewId): PositionedNode[] {
  const width = 220;
  const height = 92;
  if (viewId === 'cross-stage-traceability') {
    const groups = new Map<number, ArchitectureNode[]>();
    nodes.forEach((node) => groups.set(stageRank(node.stage), [...(groups.get(stageRank(node.stage)) ?? []), node]));
    return [...groups.entries()].flatMap(([rank, group]) => group.map((node, index) => ({
      node,
      x: 80 + Math.max(0, rank) * 270,
      y: 130 + index * 125,
      width,
      height,
    })));
  }
  return nodes.map((node, index) => ({
    node,
    x: 80 + (index % 4) * 270,
    y: 130 + Math.floor(index / 4) * 135,
    width,
    height,
  }));
}

function interfaceEdges(contracts: BlueprintInterfaceContract[], nodeIds: Set<string>): Array<{ sourceId: string; targetId: string; label: string }> {
  return contracts.flatMap((contract) => contract.consumerNodeIds.filter((consumer) => nodeIds.has(contract.providerNodeId) && nodeIds.has(consumer)).map((consumer) => ({
    sourceId: contract.providerNodeId,
    targetId: consumer,
    label: `${contract.interactionStyle} · ${contract.protocol}`,
  })));
}

export function renderBlueprintViewSvg(alternative: ArchitectureAlternative, viewId: ArchitectureBlueprintViewId): string {
  const blueprint = alternative.blueprint;
  const view = blueprint.views.find((item) => item.id === viewId);
  if (!view) throw new Error(`BLUEPRINT_VIEW_NOT_FOUND:${viewId}`);
  const project = alternative.projectedProject;
  const nodes = project.nodes.filter((node) => view.nodeIds.includes(node.id) && node.status !== 'deprecated');
  const positioned = positionNodes(nodes, viewId);
  const map = new Map(positioned.map(({ node, ...position }) => [node.id, position]));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const canonicalEdges = project.edges.filter((edge) => view.edgeIds.includes(edge.id) && nodeIds.has(edge.sourceId) && nodeIds.has(edge.targetId)).map((edge) => ({ sourceId: edge.sourceId, targetId: edge.targetId, label: edge.label ?? edge.kind }));
  const contractEdges = interfaceEdges(blueprint.interfaceContracts.filter((contract) => view.interfaceIds.includes(contract.id)), nodeIds);
  const edges = [...canonicalEdges, ...contractEdges];
  const maxX = Math.max(1180, ...positioned.map((entry) => entry.x + entry.width + 100));
  const maxY = Math.max(720, ...positioned.map((entry) => entry.y + entry.height + 140));
  const arrow = edges.flatMap((edge, index) => {
    const source = map.get(edge.sourceId);
    const target = map.get(edge.targetId);
    if (!source || !target) return [];
    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;
    const mid = (x1 + x2) / 2;
    return [
      `<path d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" fill="none" stroke="${index % 2 ? '#7dd3fc' : '#5eead4'}" stroke-width="2" marker-end="url(#arrow)" opacity="0.88"/>`,
      `<text x="${mid}" y="${(y1 + y2) / 2 - 7}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="10" fill="#c4d9e3">${esc(edge.label)}</text>`,
    ];
  }).join('\n');
  const zoneBoxes = viewId === 'security-trust-boundaries' ? blueprint.trustZones.filter((zone) => view.trustZoneIds.includes(zone.id)).map((zone, index) => {
    const zoneNodes = positioned.filter((entry) => zone.nodeIds.includes(entry.node.id));
    if (!zoneNodes.length) return '';
    const x = Math.min(...zoneNodes.map((item) => item.x)) - 24;
    const y = Math.min(...zoneNodes.map((item) => item.y)) - 38;
    const right = Math.max(...zoneNodes.map((item) => item.x + item.width)) + 24;
    const bottom = Math.max(...zoneNodes.map((item) => item.y + item.height)) + 24;
    return `<g><rect x="${x}" y="${y}" width="${right - x}" height="${bottom - y}" rx="22" fill="none" stroke="${index % 2 ? '#f2b84b' : '#a78bfa'}" stroke-width="2" stroke-dasharray="8 7" opacity="0.85"/><text x="${x + 16}" y="${y + 24}" font-family="Inter,Arial,sans-serif" font-size="12" font-weight="700" fill="#f4d28c">${esc(zone.name)}</text></g>`;
  }).join('\n') : '';
  const nodeMarkup = positioned.length ? positioned.map(({ node, x, y, width, height }) => {
    const lineage = blueprint.componentLineage.find((item) => item.nodeId === node.id);
    return [
      `<g data-node-id="${esc(node.id)}">`,
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="15" fill="#0b2131" stroke="#2dd4bf" stroke-width="1.4"/>`,
      `<rect x="${x}" y="${y}" width="7" height="${height}" rx="4" fill="#f2b84b"/>`,
      `<text x="${x + 20}" y="${y + 29}" font-family="Inter,Arial,sans-serif" font-size="14" font-weight="700" fill="#effcff">${esc(node.label)}</text>`,
      `<text x="${x + 20}" y="${y + 51}" font-family="Inter,Arial,sans-serif" font-size="10.5" fill="#9fc1d0">${esc(node.kind)} · ${esc(node.stage)}</text>`,
      `<text x="${x + 20}" y="${y + 72}" font-family="Inter,Arial,sans-serif" font-size="9.5" fill="#6ee7d7">${esc((lineage?.requirementRefs ?? []).slice(0,2).join(', ') || 'Trace review required')}</text>`,
      `</g>`,
    ].join('\n');
  }).join('\n') : `<g><rect x="80" y="140" width="480" height="110" rx="18" fill="#0b2131" stroke="#334a59"/><text x="110" y="195" font-family="Inter,Arial,sans-serif" font-size="18" fill="#c4d9e3">No canonical objects currently project into this view.</text></g>`;
  const footer = [
    `Pattern DNA: ${alternative.patternIds.length}`,
    `Interfaces: ${view.interfaceIds.length}`,
    `Traceability: ${blueprint.completeness.componentTraceabilityPercent}%`,
    `Provider-neutral first`,
  ].map((item, index) => `<text x="${80 + index * 250}" y="${maxY - 38}" font-family="Inter,Arial,sans-serif" font-size="11" fill="#8fb0c0">${esc(item)}</text>`).join('\n');
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}" role="img" aria-labelledby="title description">`,
    `<title id="title">${esc(view.title)}</title>`,
    `<desc id="description">${esc(view.purpose)} Generated from the AIW canonical architecture blueprint.</desc>`,
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#5eead4"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#06101b"/>`,
    `<text x="70" y="48" font-family="Inter,Arial,sans-serif" font-size="25" font-weight="700" fill="#effcff">${esc(view.title)}</text>`,
    `<text x="70" y="75" font-family="Inter,Arial,sans-serif" font-size="12" fill="#8fb0c0">${esc(alternative.name)} · ${esc(view.purpose)}</text>`,
    `<text x="70" y="99" font-family="Inter,Arial,sans-serif" font-size="10.5" fill="#f4d28c">Blueprint ${esc(blueprint.id)} · canonical fingerprint ${esc(blueprint.canonicalModelFingerprint)}</text>`,
    zoneBoxes,
    arrow,
    nodeMarkup,
    footer,
    `</svg>`,
  ].join('\n');
}

export function synthesisBlueprintDiagramArtifacts(alternative: ArchitectureAlternative) {
  return alternative.blueprint.views.map((view) => ({
    path: `diagrams/${slug(view.title)}.svg`,
    mediaType: 'image/svg+xml',
    content: renderBlueprintViewSvg(alternative, view.id),
    sourceAlternativeId: alternative.id,
    reviewRequired: true,
  }));
}
