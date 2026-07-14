import type {
  AccessibleDocumentProfile,
  ArchitectureProject,
  ArchitectureStage,
  ArchitectureViewpointKind,
  ArtifactFile,
  KnowledgeLibrary,
} from '@aiw/domain';
import { AIW_RELEASE } from '@aiw/domain';
import { buildSddSections } from '@aiw/engine';
import { architectureViewpointDefinitions, materializeArchitectureViewpoint } from '@aiw/modelling';

type Orientation = 'portrait' | 'landscape';
type TextKind = 'h1' | 'h2' | 'h3' | 'paragraph' | 'bullet' | 'callout';
interface TextBlock { kind: TextKind; text: string; bookmark?: string | undefined; }
interface TableBlock { kind: 'table'; headers: string[]; rows: string[][]; bookmark?: string | undefined; continued?: boolean | undefined; }
interface DiagramBlock { kind: 'diagram'; text: string; viewId: ArchitectureViewpointKind; bookmark?: string | undefined; }
type PdfBlock = TextBlock | TableBlock | DiagramBlock;
interface PdfPage { orientation: Orientation; blocks: PdfBlock[]; sectionTitle: string; cover?: boolean; toc?: boolean; }
interface Bookmark { title: string; pageIndex: number; level: number; }

const PORTRAIT = { width: 595, height: 842 } as const;
const LANDSCAPE = { width: 842, height: 595 } as const;
const MARGIN = 46;
const BODY_TOP = 762;
const BODY_BOTTOM = 58;

function ascii(value: string): string {
  return value.normalize('NFKD').replace(/[^\x20-\x7E\n]/g, (character) => ({
    '–': '-', '—': '-', '→': '->', '•': '*', '“': '"', '”': '"', '’': "'", '…': '...', '‑': '-',
  }[character] ?? '?'));
}

function pdfText(value: string): string {
  return ascii(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function cleanMarkdown(value: string): string {
  return value.replace(/\*\*/g, '').replace(/`/g, '').replace(/^>\s*/, '').trim();
}

function wrap(value: string, maxChars: number): string[] {
  const words = ascii(value).replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function wrapPoints(value: string, width: number, fontSize: number): string[] {
  return wrap(value, Math.max(8, Math.floor(width / Math.max(3.5, fontSize * 0.52))));
}

function parseMarkdown(lines: string[]): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: 'paragraph', text: cleanMarkdown(paragraph.join(' ')) });
    paragraph = [];
  };
  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index]!.trim();
    if (!trimmed) { flush(); continue; }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      const level = heading[1]!.length;
      const text = cleanMarkdown(heading[2]!);
      blocks.push({ kind: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3', text, bookmark: level <= 2 ? text : undefined });
      continue;
    }
    if (/^\|.*\|$/.test(trimmed)) {
      flush();
      const tableLines: string[] = [];
      while (index < lines.length && /^\|.*\|$/.test(lines[index]!.trim())) {
        tableLines.push(lines[index]!.trim());
        index += 1;
      }
      index -= 1;
      const parsed = tableLines
        .filter((line) => !/^\|[-:| ]+\|$/.test(line))
        .map((line) => line.split('|').slice(1, -1).map((cell) => cleanMarkdown(cell)));
      if (parsed.length) blocks.push({ kind: 'table', headers: parsed[0]!, rows: parsed.slice(1) });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flush(); blocks.push({ kind: 'bullet', text: cleanMarkdown(trimmed.replace(/^[-*]\s+/, '')) }); continue;
    }
    if (/^\*\*.*\*\*/.test(trimmed) || /^>\s*/.test(trimmed)) {
      flush(); blocks.push({ kind: 'callout', text: cleanMarkdown(trimmed) }); continue;
    }
    if (/^```/.test(trimmed)) { flush(); continue; }
    paragraph.push(trimmed);
  }
  flush();
  return blocks;
}

function buildBlocks(project: ArchitectureProject, library: KnowledgeLibrary): PdfBlock[] {
  const blocks: PdfBlock[] = [];
  for (const section of buildSddSections(project, library)) {
    blocks.push({ kind: 'h1', text: section.title, bookmark: section.title });
    blocks.push(...parseMarkdown(section.markdown));
  }
  blocks.push({ kind: 'h1', text: 'Architecture Viewbook', bookmark: 'Architecture Viewbook' });
  blocks.push({
    kind: 'callout',
    text: 'Each view is a governed projection of the same canonical architecture model. Elements retain stable identity across viewpoints; omitted elements are intentionally outside the active concern.',
  });
  for (const definition of architectureViewpointDefinitions) {
    const view = materializeArchitectureViewpoint(project, definition);
    const nodeIds = view.filters.includeNodeIds ?? [];
    const edgeIds = (view.layers ?? []).flatMap((layer) => layer.edgeIds);
    const labels = nodeIds.slice(0, 10).map((id) => project.nodes.find((node) => node.id === id)?.label ?? id);
    const alt = `${definition.name} view with ${nodeIds.length} elements and ${edgeIds.length} relationships. Principal elements: ${labels.join(', ')}${nodeIds.length > labels.length ? ', plus additional elements' : ''}.`;
    blocks.push({ kind: 'diagram', text: `${definition.intent} ${alt}`, viewId: definition.id, bookmark: definition.name });
  }
  return blocks;
}

function textHeight(text: string, width: number, fontSize: number, lineHeight: number): number {
  return wrapPoints(text, width, fontSize).length * lineHeight;
}

function estimateTableRowHeight(row: string[], widths: number[], fontSize = 7.4): number {
  const maxLines = Math.max(1, ...row.map((cell, index) => wrapPoints(cell, Math.max(28, widths[index]! - 10), fontSize).length));
  return Math.max(22, maxLines * (fontSize + 3.4) + 8);
}

function tableWidths(block: TableBlock, availableWidth: number): number[] {
  const weights = block.headers.map((header, index) => {
    const sample = [header, ...block.rows.slice(0, 8).map((row) => row[index] ?? '')];
    return Math.min(34, Math.max(7, ...sample.map((value) => value.length)));
  });
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((weight) => availableWidth * weight / total);
}

function estimateBlockHeight(block: PdfBlock, orientation: Orientation): number {
  const page = orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const width = page.width - MARGIN * 2;
  if (block.kind === 'diagram') return page.height - 40;
  if (block.kind === 'h1') return textHeight(block.text, width, 18, 23) + 18;
  if (block.kind === 'h2') return textHeight(block.text, width, 14, 19) + 13;
  if (block.kind === 'h3') return textHeight(block.text, width, 11.5, 16) + 9;
  if (block.kind === 'callout') return textHeight(block.text, width - 28, 9.2, 13.5) + 22;
  if (block.kind === 'bullet') return textHeight(block.text, width - 20, 9.2, 13.2) + 5;
  if (block.kind === 'paragraph') return textHeight(block.text, width, 9.4, 13.5) + 7;
  const tableBlock = block as TableBlock;
  const widths = tableWidths(tableBlock, width);
  return 27 + tableBlock.rows.reduce((sum: number, row: string[]) => sum + estimateTableRowHeight(row, widths), 0) + 8;
}

function splitTable(block: TableBlock, orientation: Orientation): TableBlock[] {
  const page = orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const availableWidth = page.width - MARGIN * 2;
  const widths = tableWidths(block, availableWidth);
  const maxHeight = page.height - 150;
  const parts: TableBlock[] = [];
  let rows: string[][] = [];
  let used = 29;
  for (const row of block.rows) {
    const rowHeight = estimateTableRowHeight(row, widths);
    if (rows.length && used + rowHeight > maxHeight) {
      parts.push({ ...block, rows, continued: parts.length > 0 });
      rows = []; used = 29;
    }
    rows.push(row); used += rowHeight;
  }
  parts.push({ ...block, rows, continued: parts.length > 0 });
  return parts;
}

function paginateBody(blocks: PdfBlock[]): PdfPage[] {
  const pages: PdfPage[] = [];
  let current: PdfPage = { orientation: 'portrait', blocks: [], sectionTitle: 'System Design Description' };
  let used = 0;
  const maxPortrait = BODY_TOP - BODY_BOTTOM;
  const flush = () => {
    if (current.blocks.length) pages.push(current);
    current = { orientation: 'portrait', blocks: [], sectionTitle: current.sectionTitle };
    used = 0;
  };
  for (const block of blocks) {
    if (block.kind === 'h1') current.sectionTitle = block.text;
    if (block.kind === 'diagram') {
      flush();
      pages.push({ orientation: 'landscape', blocks: [block], sectionTitle: block.bookmark ?? 'Architecture Viewbook' });
      continue;
    }
    if (block.kind === 'table') {
      const wide = block.headers.length >= 6 || block.headers.some((header) => header.length > 20);
      if (wide) {
        flush();
        for (const part of splitTable(block, 'landscape')) pages.push({ orientation: 'landscape', blocks: [part], sectionTitle: current.sectionTitle });
        continue;
      }
      const parts = splitTable(block, 'portrait');
      for (const part of parts) {
        const height = estimateBlockHeight(part, 'portrait');
        if (current.blocks.length && used + height > maxPortrait) flush();
        current.blocks.push(part); used += height;
        if (part !== parts.at(-1)) flush();
      }
      continue;
    }
    const height = estimateBlockHeight(block, 'portrait');
    if (current.blocks.length && (used + height > maxPortrait || (block.kind === 'h1' && used > maxPortrait * 0.72))) flush();
    current.blocks.push(block); used += height;
  }
  flush();
  return pages;
}

class PdfObjects {
  private values: string[] = [];
  reserve(): number { this.values.push(''); return this.values.length; }
  add(value: string): number { this.values.push(value); return this.values.length; }
  set(id: number, value: string): void { this.values[id - 1] = value; }
  build(rootId: number, infoId: number): Uint8Array {
    let body = '%PDF-1.7\n%AIW\n';
    const offsets = [0];
    this.values.forEach((value, index) => { offsets.push(body.length); body += `${index + 1} 0 obj\n${value}\nendobj\n`; });
    const xref = body.length;
    body += `xref\n0 ${this.values.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index < offsets.length; index += 1) body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    body += `trailer\n<< /Size ${this.values.length + 1} /Root ${rootId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(body);
  }
}

function colour(hex: string): string {
  const clean = hex.replace('#', '');
  const parts = [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16) / 255);
  return parts.map((value) => value.toFixed(3)).join(' ');
}

function textCommand(text: string, x: number, y: number, size: number, bold = false, hex = '#102A3A'): string {
  return `${colour(hex)} rg BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td (${pdfText(text)}) Tj ET`;
}

function rectCommand(x: number, y: number, width: number, height: number, fill: string, stroke?: string, radius = 0): string[] {
  if (!radius) return [`${colour(fill)} rg${stroke ? ` ${colour(stroke)} RG 0.8 w` : ''}`, `${x} ${y} ${width} ${height} re ${stroke ? 'B' : 'f'}`];
  const r = Math.min(radius, width / 2, height / 2);
  const k = 0.55228475;
  const commands = [
    `${x + r} ${y} m`, `${x + width - r} ${y} l`, `${x + width - r + r * k} ${y} ${x + width} ${y + r - r * k} ${x + width} ${y + r} c`,
    `${x + width} ${y + height - r} l`, `${x + width} ${y + height - r + r * k} ${x + width - r + r * k} ${y + height} ${x + width - r} ${y + height} c`,
    `${x + r} ${y + height} l`, `${x + r - r * k} ${y + height} ${x} ${y + height - r + r * k} ${x} ${y + height - r} c`,
    `${x} ${y + r} l`, `${x} ${y + r - r * k} ${x + r - r * k} ${y} ${x + r} ${y} c`, 'h', stroke ? 'B' : 'f',
  ];
  return [`${colour(fill)} rg${stroke ? ` ${colour(stroke)} RG 0.8 w` : ''}`, ...commands];
}

function stageColour(stage: ArchitectureStage): string {
  return ({
    designIntent: '#64748B', logicalApplication: '#0F766E', applicationRealization: '#0369A1',
    logicalTechnology: '#7C3AED', physicalTechnology: '#C2410C', validationRealization: '#9F1239',
  } as Record<ArchitectureStage, string>)[stage] ?? '#334155';
}

function diagramCommands(project: ArchitectureProject, viewId: ArchitectureViewpointKind, width: number, height: number): string[] {
  const definition = architectureViewpointDefinitions.find((item) => item.id === viewId)!;
  const view = materializeArchitectureViewpoint(project, definition);
  const nodeIds = view.filters.includeNodeIds ?? [];
  const edgeIds = new Set((view.layers ?? []).flatMap((layer) => layer.edgeIds));
  const nodes = nodeIds.map((id) => project.nodes.find((node) => node.id === id)).filter((node): node is NonNullable<typeof node> => Boolean(node));
  const edges = project.edges.filter((edge) => edgeIds.has(edge.id));
  const commands: string[] = [];
  commands.push(...rectCommand(0, 0, width, height, '#F6F9FB'));
  commands.push(...rectCommand(0, height - 82, width, 82, '#071B2A'));
  commands.push(textCommand(definition.name, 40, height - 38, 21, true, '#F4FBFC'));
  const intentLines = wrapPoints(definition.intent, width - 360, 9.4).slice(0, 2);
  intentLines.forEach((line, index) => commands.push(textCommand(line, 40, height - 58 - index * 12, 9.4, false, '#B9D1DB')));
  commands.push(textCommand(`${nodes.length} elements | ${edges.length} relationships | canonical view`, width - 285, height - 43, 9, true, '#71E1D2'));

  const area = { x: 38, y: 54, width: width - 76, height: height - 156 };
  if (!nodes.length) {
    commands.push(...rectCommand(area.x, area.y + area.height / 2 - 45, area.width, 90, '#FFFFFF', '#CBD5E1', 12));
    commands.push(textCommand('No architecture elements are represented in this viewpoint.', area.x + 28, area.y + area.height / 2, 13, false, '#475569'));
    return commands;
  }

  const positions = new Map<string, { x: number; y: number; w: number; h: number }>();
  const stageOrder: ArchitectureStage[] = ['designIntent', 'logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology', 'validationRealization'];
  const crossStage = viewId === 'cross-stage-traceability';
  if (crossStage) {
    const groups = stageOrder.map((stage) => ({ stage, nodes: nodes.filter((node) => node.stage === stage) })).filter((group) => group.nodes.length);
    const columnGap = 12;
    const columnWidth = (area.width - columnGap * Math.max(0, groups.length - 1)) / groups.length;
    groups.forEach((group, groupIndex) => {
      const x = area.x + groupIndex * (columnWidth + columnGap);
      commands.push(textCommand(group.stage.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase()), x + 4, area.y + area.height - 12, 8, true, stageColour(group.stage)));
      const nodeGap = 10;
      const h = Math.min(54, Math.max(34, (area.height - 34 - nodeGap * Math.max(0, group.nodes.length - 1)) / Math.max(1, group.nodes.length)));
      group.nodes.forEach((node, index) => positions.set(node.id, { x, y: area.y + area.height - 36 - (index + 1) * h - index * nodeGap, w: columnWidth, h }));
    });
  } else {
    const columns = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(nodes.length * 1.55))));
    const rows = Math.ceil(nodes.length / columns);
    const gapX = 14; const gapY = 14;
    const nodeWidth = (area.width - gapX * (columns - 1)) / columns;
    const nodeHeight = Math.min(66, Math.max(42, (area.height - gapY * (rows - 1)) / rows));
    nodes.forEach((node, index) => {
      const column = index % columns; const row = Math.floor(index / columns);
      positions.set(node.id, { x: area.x + column * (nodeWidth + gapX), y: area.y + area.height - (row + 1) * nodeHeight - row * gapY, w: nodeWidth, h: nodeHeight });
    });
  }

  commands.push(`${colour('#94A3B8')} RG 0.75 w`);
  for (const edge of edges) {
    const source = positions.get(edge.sourceId); const target = positions.get(edge.targetId);
    if (!source || !target) continue;
    const leftToRight = source.x <= target.x;
    const x1 = leftToRight ? source.x + source.w : source.x;
    const x2 = leftToRight ? target.x : target.x + target.w;
    const y1 = source.y + source.h / 2; const y2 = target.y + target.h / 2;
    const mid = (x1 + x2) / 2;
    commands.push(`${x1.toFixed(1)} ${y1.toFixed(1)} m ${mid.toFixed(1)} ${y1.toFixed(1)} l ${mid.toFixed(1)} ${y2.toFixed(1)} l ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    const direction = leftToRight ? 1 : -1;
    commands.push(`${colour('#64748B')} rg ${(x2 - direction * 7).toFixed(1)} ${(y2 + 3.5).toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l ${(x2 - direction * 7).toFixed(1)} ${(y2 - 3.5).toFixed(1)} l h f`);
    if (edges.length <= 12 && edge.label) commands.push(textCommand(edge.label.slice(0, 28), mid - 34, Math.min(y1, y2) + Math.abs(y1 - y2) / 2 + 5, 6.5, false, '#475569'));
  }

  for (const node of nodes) {
    const box = positions.get(node.id)!;
    commands.push(...rectCommand(box.x, box.y, box.w, box.h, '#FFFFFF', '#CBD5E1', 8));
    commands.push(...rectCommand(box.x, box.y, 5, box.h, stageColour(node.stage), undefined, 2));
    const labelLines = wrapPoints(node.label, box.w - 20, 8.6).slice(0, 2);
    labelLines.forEach((line, index) => commands.push(textCommand(line, box.x + 12, box.y + box.h - 18 - index * 11, 8.6, true, '#0F2534')));
    commands.push(textCommand(`${node.kind} | ${node.stage}`.slice(0, 42), box.x + 12, box.y + 9, 6.6, false, '#64748B'));
  }
  commands.push(textCommand('Viewpoint filter: ' + definition.shortName + ' | Stable identities retained across views', 40, 24, 7.5, false, '#64748B'));
  return commands;
}

function renderTable(block: TableBlock, page: PdfPage, commands: string[], y: number): number {
  const dims = page.orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const width = dims.width - MARGIN * 2;
  const widths = tableWidths(block, width);
  const fontSize = page.orientation === 'landscape' ? 7.2 : 7.4;
  const headerHeight = 27;
  let currentY = y;
  if (block.continued) {
    commands.push(textCommand('Table continued', MARGIN, currentY, 8, true, '#64748B'));
    currentY -= 14;
  }
  commands.push(...rectCommand(MARGIN, currentY - headerHeight, width, headerHeight, '#0F4C5C'));
  let x = MARGIN;
  block.headers.forEach((header, index) => {
    const lines = wrapPoints(header, widths[index]! - 10, 7.2).slice(0, 2);
    lines.forEach((line, lineIndex) => commands.push(textCommand(line, x + 5, currentY - 11 - lineIndex * 9, 7.2, true, '#FFFFFF')));
    x += widths[index]!;
  });
  currentY -= headerHeight;
  block.rows.forEach((row, rowIndex) => {
    const rowHeight = estimateTableRowHeight(row, widths, fontSize);
    commands.push(...rectCommand(MARGIN, currentY - rowHeight, width, rowHeight, rowIndex % 2 ? '#F8FAFC' : '#EEF4F7', '#D6E0E5'));
    let cellX = MARGIN;
    row.forEach((cell, index) => {
      const cellWidth = widths[index] ?? 40;
      const lines = wrapPoints(cell, cellWidth - 10, fontSize).slice(0, Math.max(1, Math.floor((rowHeight - 7) / (fontSize + 3.4))));
      lines.forEach((line, lineIndex) => commands.push(textCommand(line, cellX + 5, currentY - 11 - lineIndex * (fontSize + 3.4), fontSize, false, '#213B49')));
      cellX += cellWidth;
    });
    currentY -= rowHeight;
  });
  return currentY - 10;
}

function renderBodyBlock(block: PdfBlock, page: PdfPage, project: ArchitectureProject, commands: string[], y: number, mcid: number): { y: number; mcid: number } {
  const dims = page.orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
  const width = dims.width - MARGIN * 2;
  if (block.kind === 'table') {
    commands.push(`/Table <</MCID ${mcid}>> BDC`);
    const nextY = renderTable(block, page, commands, y);
    commands.push('EMC');
    return { y: nextY, mcid: mcid + 1 };
  }
  if (block.kind === 'diagram') {
    commands.push(`/Figure <</MCID ${mcid} /Alt (${pdfText(block.text)})>> BDC`);
    commands.push(...diagramCommands(project, block.viewId, dims.width, dims.height));
    commands.push('EMC');
    return { y: BODY_BOTTOM, mcid: mcid + 1 };
  }
  const specs: Record<TextKind, { size: number; line: number; colour: string; bold: boolean; tag: string }> = {
    h1: { size: 18, line: 23, colour: '#0B3345', bold: true, tag: '/H1' },
    h2: { size: 14, line: 19, colour: '#0F766E', bold: true, tag: '/H2' },
    h3: { size: 11.5, line: 16, colour: '#1E4B5E', bold: true, tag: '/H3' },
    paragraph: { size: 9.4, line: 13.5, colour: '#243F4D', bold: false, tag: '/P' },
    bullet: { size: 9.2, line: 13.2, colour: '#243F4D', bold: false, tag: '/LI' },
    callout: { size: 9.2, line: 13.5, colour: '#123A45', bold: false, tag: '/Note' },
  };
  const spec = specs[block.kind];
  const inset = block.kind === 'bullet' ? 18 : block.kind === 'callout' ? 14 : 0;
  const lines = wrapPoints(block.text, width - inset * 2, spec.size);
  let currentY = y;
  if (block.kind === 'h1') {
    commands.push(...rectCommand(MARGIN, currentY - 3, 34, 4, '#2DD4BF'));
    currentY -= 13;
  }
  if (block.kind === 'callout') {
    const height = lines.length * spec.line + 18;
    commands.push(...rectCommand(MARGIN, currentY - height + 5, width, height, '#E8F7F5', '#A7DAD3', 8));
    commands.push(...rectCommand(MARGIN, currentY - height + 5, 5, height, '#0F766E', undefined, 2));
    currentY -= 8;
  }
  commands.push(`${spec.tag} <</MCID ${mcid}>> BDC`);
  lines.forEach((line, index) => {
    const prefix = block.kind === 'bullet' && index === 0 ? '* ' : '';
    commands.push(textCommand(`${prefix}${line}`, MARGIN + inset, currentY, spec.size, spec.bold, spec.colour));
    currentY -= spec.line;
  });
  commands.push('EMC');
  currentY -= block.kind.startsWith('h') ? 10 : 7;
  return { y: currentY, mcid: mcid + 1 };
}

function coverPage(project: ArchitectureProject, library: KnowledgeLibrary): PdfPage {
  return {
    orientation: 'portrait', cover: true, sectionTitle: 'Document cover', blocks: [
      { kind: 'h1', text: project.name, bookmark: 'Document cover' },
      { kind: 'h2', text: 'System Design Description & Architecture Viewbook' },
      { kind: 'paragraph', text: `Project ${project.id} | ${project.branch.name} | revision ${project.revision}` },
      { kind: 'paragraph', text: `Knowledge release ${(library as { knowledgeReleaseId?: string }).knowledgeReleaseId ?? 'AKR-unversioned'}` },
      { kind: 'callout', text: 'Draft generated evidence. This document becomes authoritative only after the required architecture, security and delivery approvals are recorded.' },
    ],
  };
}

function tocPages(entries: Array<{ title: string; page: number }>): PdfPage[] {
  const perPage = 27;
  const pages: PdfPage[] = [];
  for (let offset = 0; offset < entries.length; offset += perPage) {
    const chunk = entries.slice(offset, offset + perPage);
    pages.push({ orientation: 'portrait', toc: true, sectionTitle: 'Contents', blocks: [
      { kind: 'h1', text: offset ? 'Contents (continued)' : 'Contents', bookmark: offset ? undefined : 'Contents' },
      { kind: 'table', headers: ['Section', 'Page'], rows: chunk.map((entry) => [entry.title, String(entry.page)]) },
    ] });
  }
  return pages;
}

function collectBookmarks(pages: PdfPage[], offset: number): Array<{ title: string; page: number }> {
  const entries: Array<{ title: string; page: number }> = [];
  pages.forEach((page, pageIndex) => page.blocks.forEach((block) => {
    if (block.bookmark) entries.push({ title: block.bookmark, page: pageIndex + offset + 1 });
  }));
  return entries;
}

function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let base64 = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0; const b = bytes[index + 1] ?? 0; const c = bytes[index + 2] ?? 0;
    const triplet = (a << 16) | (b << 8) | c;
    base64 += alphabet.charAt((triplet >> 18) & 63) + alphabet.charAt((triplet >> 12) & 63)
      + (index + 1 < bytes.length ? alphabet.charAt((triplet >> 6) & 63) : '=')
      + (index + 2 < bytes.length ? alphabet.charAt(triplet & 63) : '=');
  }
  return base64;
}

export interface AccessiblePdfResult {
  bytes: Uint8Array;
  base64: string;
  pageCount: number;
  profile: AccessibleDocumentProfile;
  bookmarkCount: number;
}

export function renderAccessibleSddPdf(project: ArchitectureProject, library: KnowledgeLibrary, language = 'en-GB'): AccessiblePdfResult {
  const bodyPages = paginateBody(buildBlocks(project, library));
  const provisionalTocCount = Math.max(1, Math.ceil(collectBookmarks(bodyPages, 2).length / 27));
  const entries = collectBookmarks(bodyPages, 1 + provisionalTocCount);
  const pages = [coverPage(project, library), ...tocPages(entries), ...bodyPages];

  const objects = new PdfObjects();
  const catalogId = objects.reserve(); const pagesId = objects.reserve();
  const fontId = objects.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldId = objects.add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const structRootId = objects.reserve(); const parentTreeId = objects.reserve(); const outlineRootId = objects.reserve();
  const pageIds: number[] = []; const pageStructIds: number[] = []; const bookmarks: Bookmark[] = [];
  const knowledgeRelease = (library as { knowledgeReleaseId?: string }).knowledgeReleaseId ?? 'AKR-unversioned';

  pages.forEach((page, pageIndex) => {
    const dims = page.orientation === 'portrait' ? PORTRAIT : LANDSCAPE;
    const commands: string[] = [];
    let y = BODY_TOP; let mcid = 0;
    if (page.cover) {
      commands.push(...rectCommand(0, 0, dims.width, dims.height, '#071B2A'));
      commands.push(...rectCommand(0, dims.height - 14, dims.width, 14, '#2DD4BF'));
      commands.push(textCommand('AIW STUDIO', 54, 770, 10, true, '#6EE7D7'));
      commands.push(textCommand(project.name, 54, 690, 27, true, '#FFFFFF'));
      commands.push(textCommand('System Design Description', 54, 645, 19, true, '#CFE8EE'));
      commands.push(textCommand('& Architecture Viewbook', 54, 617, 19, true, '#CFE8EE'));
      commands.push(...rectCommand(54, 500, 487, 86, '#0C2A3B', '#1F5968', 12));
      commands.push(textCommand(`Project  ${project.id}`, 72, 557, 9, true, '#7DE4D6'));
      commands.push(textCommand(`Branch  ${project.branch.name}`, 72, 535, 10, false, '#EAF7F8'));
      commands.push(textCommand(`Revision  ${project.revision}   |   Knowledge  ${knowledgeRelease}`, 72, 513, 9, false, '#B9D1DB'));
      commands.push(...rectCommand(54, 330, 487, 118, '#F5FBFA', undefined, 12));
      const authority = 'Draft generated evidence. Human architecture, security and delivery approvals are required before this document becomes authoritative.';
      wrapPoints(authority, 445, 11).forEach((line, index) => commands.push(textCommand(line, 74, 411 - index * 16, 11, index === 0, '#123A45')));
      commands.push(textCommand(`Generated ${new Date().toISOString().slice(0, 10)} | ${AIW_RELEASE.version}`, 54, 84, 8.5, false, '#8FB3C0'));
      commands.push(textCommand('Controlled architecture evidence - validate approval status before implementation.', 54, 62, 8.5, false, '#8FB3C0'));
      bookmarks.push({ title: 'Document cover', pageIndex, level: 1 });
    } else {
      commands.push(...rectCommand(0, 0, dims.width, dims.height, '#FFFFFF'));
      commands.push(...rectCommand(0, dims.height - 28, dims.width, 28, '#071B2A'));
      commands.push(textCommand(project.name.slice(0, 70), MARGIN, dims.height - 18, 8, true, '#DDF8F4'));
      commands.push(textCommand(page.sectionTitle.slice(0, 72), dims.width - 330, dims.height - 18, 8, false, '#A9C6D0'));
      commands.push(...rectCommand(MARGIN, 40, dims.width - MARGIN * 2, 1, '#D9E4E8'));
      commands.push(textCommand(`AIW ${AIW_RELEASE.version} | ${knowledgeRelease}`, MARGIN, 22, 7.5, false, '#64748B'));
      commands.push(textCommand(`Page ${pageIndex + 1} of ${pages.length}`, dims.width - 105, 22, 7.5, false, '#64748B'));
      for (const block of page.blocks) {
        if (block.bookmark) bookmarks.push({ title: block.bookmark, pageIndex, level: block.kind === 'h1' ? 1 : 2 });
        const rendered = renderBodyBlock(block, page, project, commands, y, mcid);
        y = rendered.y; mcid = rendered.mcid;
      }
    }
    const stream = commands.join('\n');
    const contentId = objects.add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pageId = objects.reserve(); pageIds.push(pageId);
    const structId = objects.reserve(); pageStructIds.push(structId);
    objects.set(pageId, `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${dims.width} ${dims.height}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldId} 0 R >> >> /Contents ${contentId} 0 R /StructParents ${pageIndex} >>`);
    objects.set(structId, `<< /Type /StructElem /S /Sect /P ${structRootId} 0 R /Pg ${pageId} 0 R /K [${Array.from({ length: Math.max(1, mcid) }, (_, index) => index).join(' ')}] >>`);
  });

  objects.set(pagesId, `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  objects.set(parentTreeId, `<< /Nums [${pageStructIds.map((id, index) => `${index} [${id} 0 R]`).join(' ')}] >>`);
  objects.set(structRootId, `<< /Type /StructTreeRoot /K [${pageStructIds.map((id) => `${id} 0 R`).join(' ')}] /ParentTree ${parentTreeId} 0 R /ParentTreeNextKey ${pageStructIds.length} >>`);
  const outlineIds = bookmarks.map(() => objects.reserve());
  bookmarks.forEach((bookmark, index) => {
    const previous = index ? `/Prev ${outlineIds[index - 1]} 0 R` : '';
    const next = index < bookmarks.length - 1 ? `/Next ${outlineIds[index + 1]} 0 R` : '';
    objects.set(outlineIds[index]!, `<< /Title (${pdfText(bookmark.title)}) /Parent ${outlineRootId} 0 R ${previous} ${next} /Dest [${pageIds[bookmark.pageIndex]} 0 R /Fit] >>`);
  });
  objects.set(outlineRootId, bookmarks.length ? `<< /Type /Outlines /First ${outlineIds[0]} 0 R /Last ${outlineIds[outlineIds.length - 1]} 0 R /Count ${bookmarks.length} >>` : '<< /Type /Outlines /Count 0 >>');
  objects.set(catalogId, `<< /Type /Catalog /Pages ${pagesId} 0 R /Lang (${pdfText(language)}) /MarkInfo << /Marked true >> /StructTreeRoot ${structRootId} 0 R /Outlines ${outlineRootId} 0 R /PageMode /UseOutlines >>`);
  const generatedAt = new Date().toISOString();
  const infoId = objects.add(`<< /Title (${pdfText(`${project.name} - System Design Description`)}) /Subject (${pdfText('Governed System Design Description and Architecture Viewbook')}) /Author (AIW Studio) /Creator (${pdfText(`AIW ${AIW_RELEASE.version} Professional Delivery Engine`)}) /Producer (AIW deterministic PDF writer) /CreationDate (D:${generatedAt.replace(/[-:TZ.]/g, '').slice(0, 14)}Z) >>`);
  const bytes = objects.build(catalogId, infoId);
  const profile: AccessibleDocumentProfile = {
    title: `${project.name} - System Design Description`, subject: 'Governed System Design Description and Architecture Viewbook', author: 'AIW Studio', language,
    tagged: true, bookmarks: true, pageNumbers: true, headersAndFooters: true, alternativeTextForDiagrams: true, generatedAt,
  };
  return { bytes, base64: encodeBase64(bytes), pageCount: pages.length, profile, bookmarkCount: bookmarks.length };
}

export function accessibleSddPdfArtifact(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  const result = renderAccessibleSddPdf(project, library);
  return {
    path: 'handoff/system-design-description-accessible.pdf', mediaType: 'application/pdf', content: result.base64, encoding: 'base64',
    accessibility: { tagged: true, language: result.profile.language, alternativeText: 'Professional paginated System Design Description with a ten-view Architecture Viewbook and textual alternatives for each diagram.' },
  };
}
