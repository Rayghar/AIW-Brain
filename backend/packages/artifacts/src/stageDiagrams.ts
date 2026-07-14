import type { ArchitectureEdge, ArchitectureNode, ArchitectureProject, ArchitectureStage, ArtifactFile } from '@aiw/domain';

const stageNames: Partial<Record<ArchitectureStage, string>> = {
  logicalApplication: 'Logical Application Architecture',
  applicationRealization: 'Application Realization Architecture',
  logicalTechnology: 'Logical Technology Architecture',
  physicalTechnology: 'Physical Deployment Architecture',
};

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character] ?? character));
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'view';

function positionedNodes(project: ArchitectureProject, stage: ArchitectureStage): Array<{ node: ArchitectureNode; x: number; y: number; width: number; height: number }> {
  return project.nodes.filter((node) => node.stage === stage && node.status !== 'deprecated').map((node, index) => {
    const stored = node.positions?.[stage];
    return {
      node,
      x: stored?.x ?? 80 + (index % 4) * 260,
      y: stored?.y ?? 100 + Math.floor(index / 4) * 170,
      width: 220,
      height: 96,
    };
  });
}

function edgeLines(edges: ArchitectureEdge[], nodeMap: Map<string, { x: number; y: number; width: number; height: number }>): string[] {
  return edges.flatMap((edge) => {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) return [];
    const x1 = source.x + source.width;
    const y1 = source.y + source.height / 2;
    const x2 = target.x;
    const y2 = target.y + target.height / 2;
    const midX = Math.round((x1 + x2) / 2);
    return [
      `<path d="M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}" fill="none" stroke="#5eead4" stroke-width="2" marker-end="url(#arrow)" opacity="0.82"/>`,
      `<text x="${midX}" y="${Math.round((y1 + y2) / 2) - 7}" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="11" fill="#b6cbd5">${esc(edge.label ?? edge.kind)}</text>`,
    ];
  });
}

export function renderStageDiagramSvg(project: ArchitectureProject, stage: ArchitectureStage, title = stageNames[stage] ?? stage): string {
  const positioned = positionedNodes(project, stage);
  const nodeMap = new Map(positioned.map(({ node, ...position }) => [node.id, position]));
  const ids = new Set(positioned.map(({ node }) => node.id));
  const edges = project.edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId));
  const maxX = Math.max(1100, ...positioned.map((entry) => entry.x + entry.width + 90));
  const maxY = Math.max(680, ...positioned.map((entry) => entry.y + entry.height + 100));
  const nodes = positioned.length ? positioned.map(({ node, x, y, width, height }) => [
    `<g data-node-id="${esc(node.id)}">`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="16" fill="#0b2131" stroke="#2dd4bf" stroke-width="1.5"/>`,
    `<rect x="${x}" y="${y}" width="6" height="${height}" rx="3" fill="#f2b84b"/>`,
    `<text x="${x + 20}" y="${y + 32}" font-family="Inter,Arial,sans-serif" font-size="15" font-weight="700" fill="#effcff">${esc(node.label)}</text>`,
    `<text x="${x + 20}" y="${y + 55}" font-family="Inter,Arial,sans-serif" font-size="11" fill="#8fb0c0">${esc(node.kind)}</text>`,
    `<text x="${x + 20}" y="${y + 76}" font-family="Inter,Arial,sans-serif" font-size="10" fill="#6ee7d7">${esc(String(node.properties?.owner ?? node.properties?.team ?? 'Owner not assigned'))}</text>`,
    `</g>`,
  ].join('')).join('\n') : `<g><rect x="80" y="120" width="420" height="120" rx="18" fill="#0b2131" stroke="#334a59"/><text x="110" y="175" font-family="Inter,Arial,sans-serif" font-size="18" fill="#b6cbd5">No architecture objects captured for this view.</text></g>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}" role="img" aria-labelledby="title description">`,
    `<title id="title">${esc(title)}</title>`,
    `<desc id="description">Model-derived ${esc(title)} for ${esc(project.name)}.</desc>`,
    `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#5eead4"/></marker></defs>`,
    `<rect width="100%" height="100%" fill="#06101b"/>`,
    `<text x="70" y="52" font-family="Inter,Arial,sans-serif" font-size="24" font-weight="700" fill="#effcff">${esc(title)}</text>`,
    `<text x="70" y="78" font-family="Inter,Arial,sans-serif" font-size="12" fill="#8fb0c0">${esc(project.name)} · revision ${project.revision} · generated from canonical model</text>`,
    ...edgeLines(edges, nodeMap),
    nodes,
    `</svg>`,
  ].join('\n');
}

export function architectureDiagramArtifacts(project: ArchitectureProject): ArtifactFile[] {
  return (Object.keys(stageNames) as ArchitectureStage[]).map((stage) => ({
    path: `handoff/diagrams/${slug(stageNames[stage] ?? stage)}.svg`,
    mediaType: 'image/svg+xml',
    content: renderStageDiagramSvg(project, stage, stageNames[stage]),
  }));
}
