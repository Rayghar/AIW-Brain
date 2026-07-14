export interface DiagramExportNode {
  id: string;
  position: { x: number; y: number };
  width?: number | null | undefined;
  height?: number | null | undefined;
  data?: { node?: { label?: string; kind?: string; stage?: string } } | Record<string, unknown>;
}
export interface DiagramExportEdge {
  id: string;
  source: string;
  target: string;
  label?: unknown;
}

function xml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' })[character]!);
}
function nodeLabel(node: DiagramExportNode): string {
  const data = node.data as { node?: { label?: string } } | undefined;
  return data?.node?.label ?? node.id;
}
function nodeKind(node: DiagramExportNode): string {
  const data = node.data as { node?: { kind?: string } } | undefined;
  return data?.node?.kind ?? 'Architecture object';
}
function bounds(nodes: DiagramExportNode[]) {
  if (!nodes.length) return { minX: 0, minY: 0, width: 1200, height: 700 };
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(...nodes.map((node) => node.position.x + (node.width ?? 230)));
  const maxY = Math.max(...nodes.map((node) => node.position.y + (node.height ?? 118)));
  return { minX, minY, width: Math.max(900, maxX - minX + 160), height: Math.max(600, maxY - minY + 220) };
}

export function buildArchitectureSvg(title: string, nodes: DiagramExportNode[], edges: DiagramExportEdge[]): string {
  const frame = bounds(nodes);
  const offsetX = 80 - frame.minX;
  const offsetY = 140 - frame.minY;
  const lookup = new Map(nodes.map((node) => [node.id, node]));
  const edgeMarkup = edges.map((edge) => {
    const source = lookup.get(edge.source); const target = lookup.get(edge.target);
    if (!source || !target) return '';
    const x1 = source.position.x + offsetX + (source.width ?? 230) / 2;
    const y1 = source.position.y + offsetY + (source.height ?? 118) / 2;
    const x2 = target.position.x + offsetX + (target.width ?? 230) / 2;
    const y2 = target.position.y + offsetY + (target.height ?? 118) / 2;
    const label = typeof edge.label === 'string' ? `<text x="${(x1+x2)/2}" y="${(y1+y2)/2-8}" text-anchor="middle" class="edge-label">${xml(edge.label)}</text>` : '';
    return `<g><path d="M ${x1} ${y1} L ${x2} ${y2}" class="edge" marker-end="url(#arrow)"/>${label}</g>`;
  }).join('');
  const nodeMarkup = nodes.map((node) => {
    const x=node.position.x+offsetX, y=node.position.y+offsetY, width=node.width??230, height=node.height??118;
    const label=nodeLabel(node), kind=nodeKind(node);
    const lines = label.length > 31 ? [label.slice(0,31), label.slice(31,62)] : [label];
    return `<g transform="translate(${x} ${y})"><rect width="${width}" height="${height}" rx="16" class="node"/><rect x="0" y="0" width="6" height="${height}" rx="3" class="accent"/><text x="20" y="30" class="kind">${xml(kind)}</text>${lines.map((line,index)=>`<text x="20" y="${60+index*22}" class="label">${xml(line)}</text>`).join('')}</g>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}">
<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#78d7c4"/></marker></defs>
<style>.bg{fill:#07111f}.title{font:700 30px Inter,Arial;fill:#f2f8ff}.meta{font:14px Inter,Arial;fill:#91a6bd}.node{fill:#102236;stroke:#35516b;stroke-width:1.5}.accent{fill:#68d5c0}.kind{font:600 11px Inter,Arial;letter-spacing:1px;text-transform:uppercase;fill:#9fb4c8}.label{font:700 16px Inter,Arial;fill:#f2f8ff}.edge{stroke:#78d7c4;stroke-width:2;fill:none;opacity:.85}.edge-label{font:12px Inter,Arial;fill:#c6d5e4;paint-order:stroke;stroke:#07111f;stroke-width:4}</style>
<rect width="100%" height="100%" class="bg"/><text x="48" y="54" class="title">${xml(title)}</text><text x="48" y="82" class="meta">AIW governed architecture view · ${nodes.length} objects · ${edges.length} relationships</text>${edgeMarkup}${nodeMarkup}</svg>`;
}

export async function svgToPngBlob(svg: string): Promise<Blob> {
  const source = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('Unable to render SVG to PNG.')); image.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, image.naturalWidth * 2); canvas.height = Math.max(1, image.naturalHeight * 2);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable.');
    context.scale(2,2); context.drawImage(image,0,0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to encode PNG.')), 'image/png'));
  } finally { URL.revokeObjectURL(url); }
}

function pdfEscape(value: string): string { return value.replace(/([\\()])/g, '\\$1').replace(/[^\x20-\x7E]/g, '?'); }
function byteLength(value: string): number { return new TextEncoder().encode(value).length; }
export function buildArchitecturePdf(title: string, nodes: DiagramExportNode[], edges: DiagramExportEdge[]): Uint8Array {
  const pageWidth=842, pageHeight=595;
  const frame=bounds(nodes); const scale=Math.min(0.72, (pageWidth-80)/frame.width, (pageHeight-120)/frame.height);
  const offsetX=40-frame.minX*scale, offsetY=70-frame.minY*scale;
  const lookup=new Map(nodes.map((node)=>[node.id,node]));
  const commands:string[]=['0.03 0.07 0.12 rg 0 0 842 595 re f','0.95 0.98 1 rg BT /F1 22 Tf 40 552 Td ('+pdfEscape(title)+') Tj ET','0.56 0.66 0.75 rg BT /F1 10 Tf 40 532 Td (AIW governed architecture view - '+nodes.length+' objects - '+edges.length+' relationships) Tj ET'];
  for (const edge of edges) { const s=lookup.get(edge.source),t=lookup.get(edge.target); if(!s||!t) continue; const x1=offsetX+(s.position.x+(s.width??230)/2)*scale, y1=pageHeight-(offsetY+(s.position.y+(s.height??118)/2)*scale); const x2=offsetX+(t.position.x+(t.width??230)/2)*scale, y2=pageHeight-(offsetY+(t.position.y+(t.height??118)/2)*scale); commands.push(`0.4 0.82 0.74 RG 1.4 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`); }
  for (const node of nodes) { const x=offsetX+node.position.x*scale, h=(node.height??118)*scale, w=(node.width??230)*scale, y=pageHeight-(offsetY+node.position.y*scale)-h; commands.push(`0.06 0.13 0.21 rg 0.2 0.32 0.42 RG 1 w ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`); commands.push(`0.4 0.82 0.74 rg ${x.toFixed(2)} ${y.toFixed(2)} 4 ${h.toFixed(2)} re f`); commands.push(`0.62 0.71 0.79 rg BT /F1 7 Tf ${(x+12).toFixed(2)} ${(y+h-18).toFixed(2)} Td (${pdfEscape(nodeKind(node))}) Tj ET`); commands.push(`0.95 0.98 1 rg BT /F1 10 Tf ${(x+12).toFixed(2)} ${(y+h-38).toFixed(2)} Td (${pdfEscape(nodeLabel(node).slice(0,48))}) Tj ET`); }
  const stream=commands.join('\n');
  const objects=[
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >> endobj',
    `4 0 obj << /Length ${byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let pdf='%PDF-1.4\n'; const offsets=[0];
  for(const object of objects){ offsets.push(byteLength(pdf)); pdf+=object+'\n'; }
  const xref=byteLength(pdf); pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map((offset)=>String(offset).padStart(10,'0')+' 00000 n \n').join(''); pdf+=`trailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url=URL.createObjectURL(blob); const anchor=document.createElement('a'); anchor.href=url; anchor.download=filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
