// Diagram-as-code exports of a standard diagram: Structurizr DSL, C4-PlantUML, Mermaid, draw.io
// (mxGraph XML with the arranged geometry), an ArchiMate 3 exchange file of the one scene with its
// view, and BPMN 2.0 XML for the process scene. Each export is built from the same diagram (D) and
// layout (L) the reader saw and returns {document, report}: the report says what the format could
// not carry. Identifiers are reversible (hex of the AIW id behind an `aiw_` prefix), so a file can be
// traced back to the records; round trips stay export-only. No LLM, no network, DOM-free.
import {KINDS, GROUP_KINDS, styleOf, archimateRelationship} from './notation-palette.js';
import {targetId} from './model-exchange.js';
import {diagramText} from './notation-svg.js';

const xml = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[c]));
const q = v => JSON.stringify(String(v ?? '').replace(/[\r\n]+/g, ' '));
const id = v => targetId(String(v));
const num = v => Math.round(Number(v) || 0);
const limits = {
  structurizr: ['Structurizr lays views out itself; the arranged positions travel as element properties (aiw.x, aiw.y) and are not applied.', 'Elements outside the C4 vocabulary (requirements, decisions, controls, threats, process steps) are omitted and listed.', 'Relationship families travel as the relationship description and the aiw.kind property; Structurizr draws one line style.'],
  plantuml: ['C4-PlantUML draws its own layout; the arranged positions are not carried.', 'Kinds outside the C4 vocabulary are drawn as containers with their kicker as technology, so nothing is lost but the type is approximate.'],
  mermaid: ['Mermaid draws its own layout; the arranged positions are not carried.', 'Relationship families are drawn with the three line styles Mermaid has (solid, dotted, thick); the family name is in the label where it differs.'],
  drawio: ['The arranged geometry, the containers and the connector waypoints are carried exactly; draw.io re-routes a connector only when an element is moved.', 'Kicker and reference are part of the label; the AIW identifier is the cell id.'],
  archimate: ['Relationship types follow the notation kit (realization, serving, flow, access, composition, assignment, influence, association, triggering); review them in the target tool.', 'The view carries the arranged geometry; element nesting travels as grouping.'],
  bpmn: ['Tasks, events and gateways follow the process scene: event positions and types, gateway types, sub-processes, data objects and message flows as recorded; an event with no recorded position is a start event when no flow enters it and an end event when none leaves it.', 'The BPMNDI section carries the arranged geometry; target tools may re-lay the diagram.']
};
// What the sequence and lifecycle pictures (round 6) carry in each format: the C4 and draw.io exports keep their shape
// and say so; Mermaid and PlantUML write the standard's own diagram.
const NEW_SCENE_LINES = {
  structurizr: 'A sequence or lifecycle picture travels as its lifelines or states and the relationships between them; the message order is in the relationship descriptions.',
  drawio: 'A sequence or lifecycle picture travels as its boxes and connectors with the arranged geometry; the message order is in the connector labels.',
  mermaid: 'The sequence picture is a sequenceDiagram and the lifecycle a stateDiagram-v2, in message or transition order.',
  plantuml: 'The sequence picture is a PlantUML sequence diagram and the lifecycle a state diagram, in message or transition order.',
  archimate: 'A sequence picture travels as application components and flows, a lifecycle as data objects and triggering, both typed by the rules.'
};
export const CODE_FORMATS = [
  {id: 'structurizr', title: 'Structurizr DSL', sub: 'workspace, model and C4 views', ext: 'dsl', mediaType: 'text/plain'},
  {id: 'plantuml', title: 'C4-PlantUML', sub: 'C4 context, container or deployment', ext: 'puml', mediaType: 'text/plain'},
  {id: 'mermaid', title: 'Mermaid', sub: 'flowchart, or C4Context for the context view', ext: 'mmd', mediaType: 'text/plain'},
  {id: 'drawio', title: 'draw.io', sub: 'diagrams.net XML with the exact geometry', ext: 'drawio', mediaType: 'application/xml'},
  {id: 'archimate', title: 'ArchiMate exchange (this view)', sub: 'elements, typed relationships and the view', ext: 'archimate.xml', mediaType: 'application/xml'},
  {id: 'bpmn', title: 'BPMN 2.0 XML', sub: 'pools, lanes, tasks, gateways, events', ext: 'bpmn', mediaType: 'application/xml', scenes: ['process']}
];

export function diagramCode(format, D, L, {project = null, chapter = null} = {}) {
  const fn = {structurizr, plantuml, mermaid, drawio, archimate, bpmn}[format];
  if (!fn) throw Error('Choose a supported diagram code format.');
  const out = fn(D, L, project, chapter);
  const lines = ['sequence', 'lifecycle'].includes(D.scene.id) && NEW_SCENE_LINES[format] ? [...limits[format], NEW_SCENE_LINES[format]] : limits[format];
  return {document: out.document, report: {format, scene: D.scene.id, arrangement: L.arrangement, chapter, project: project?.name || null, contentVersion: project?.contentVersion ?? null, elements: D.nodes.length, relationships: D.edges.length, containers: D.groups.length, omitted: out.omitted || [], limits: lines, identity: 'aiw_<hex of the AIW identifier>: decode the hex to find the record.'}};
}

// The file a reader downloads: the document with its report as a leading comment in the format's own
// comment syntax, so one click gives one file that says what it could not carry.
const COMMENT = {structurizr: ['/*', ' *', ' */'], plantuml: ["/'", "'", "'/"], mermaid: ['%%', '%%', '%%'], drawio: ['<!--', '', '-->'], archimate: ['<!--', '', '-->'], bpmn: ['<!--', '', '-->']};
export function codeFile(format, D, L, opts = {}) {
  const {document, report} = diagramCode(format, D, L, opts), [open, mid, close] = COMMENT[format];
  const lines = [`AIW ${report.format} export of “${report.scene}” (${report.arrangement}), ${report.elements} elements, ${report.relationships} relationships, ${report.containers} containers${report.contentVersion != null ? ', content v' + report.contentVersion : ''}.`, ...report.limits.map(l => 'Limit: ' + l), ...report.omitted.slice(0, 40).map(o => `Omitted: ${o.id}${o.kind ? ' (' + o.kind + ')' : ''}: ${o.reason}`), ...(report.omitted.length > 40 ? [`Omitted: ${report.omitted.length - 40} more.`] : []), 'Identity: ' + report.identity].map(l => l.replace(/\*\/|-->|'\//g, ' ').replace(/--/g, '—'));
  const block = open === '%%' ? lines.map(l => '%% ' + l).join('\n') : [open, ...lines.map(l => (mid ? mid + ' ' : '') + l), close].join('\n');
  // XML keeps its declaration first; everything else starts with the comment.
  // Mermaid keeps its diagram type on the first line.
  const text = document.startsWith('<?xml') ? document.replace(/^(<\?xml[^>]*\?>\n?)/, `$1${block}\n`) : format === 'mermaid' ? document.replace(/^([^\n]*\n)/, `$1${block}\n`) : `${block}\n${document}`;
  return {text, report};
}

// ---------------------------------------------------------------- C4 reading of a scene
const c4Of = n => (n.type === 'system' ? 'softwareSystem' : n.type === 'party' ? 'externalSystem' : n.kind === 'actor' ? 'person' : ['physicalApp', 'physicalTech', 'physicalData', 'logicalTech', 'techService', 'placement'].includes(n.kind) ? 'container' : ['logicalApp', 'appService', 'logicalData', 'dataEntity'].includes(n.kind) ? 'component' : null);
const relWord = e => (e.label || styleOf(e.kind).label) + (e.qualifier ? ' (' + e.qualifier + ')' : '');

function structurizr(D, L, project) {
  const omitted = [], lines = [], sysId = D.nodes.find(n => n.type === 'system')?.id || null;
  lines.push(`workspace ${q((project?.name || D.header.model) + ' · ' + D.scene.title)} ${q(D.scene.purpose)} {`, '  !identifiers hierarchical', '  model {');
  const pos = new Map(L.nodes.map(b => [b.id, b]));
  const props = n => { const b = pos.get(n.id); return `properties { "aiw.id" ${q(n.id)} "aiw.kind" ${q(n.kind)} ${n.ref ? `"aiw.ref" ${q(n.ref)} ` : ''}${b ? `"aiw.x" "${num(b.x)}" "aiw.y" "${num(b.y)}" ` : ''}}`; };
  const inside = [], outside = [], ids = new Map();
  for (const n of D.nodes) { const c = c4Of(n); if (!c) { omitted.push({id: n.id, kind: n.kind, reason: 'No C4 element for this kind.'}); continue; } if (c === 'person') outside.push(`    ${id(n.id)} = person ${q(n.title)} ${q(n.sub)} { ${props(n)} }`); else if (c === 'externalSystem') outside.push(`    ${id(n.id)} = softwareSystem ${q(n.title)} ${q(n.sub || 'External system')} { tags "External" ${props(n)} }`); else if (c === 'softwareSystem') { ids.set(n.id, id(n.id)); } else inside.push(n); }
  const sys = sysId ? id(sysId) : 'aiw_system';
  lines.push(...outside);
  lines.push(`    ${sys} = softwareSystem ${q(sysId ? D.nodes.find(n => n.id === sysId).title : (project?.name || D.header.model))} ${q('The application as a whole')} {`);
  for (const n of inside) { const c = c4Of(n); lines.push(`      ${id(n.id)} = ${c === 'component' ? 'container' : 'container'} ${q(n.title)} ${q(n.sub || n.kicker)} ${q(n.kicker)} { tags ${q(n.kind)}${n.hatched ? ' "Open"' : ''} ${props(n)} }`); }
  lines.push('    }');
  const ref = n => (n.type === 'system' ? sys : c4Of(n) === 'person' || c4Of(n) === 'externalSystem' ? id(n.id) : `${sys}.${id(n.id)}`);
  const byId = new Map(D.nodes.map(n => [n.id, n]));
  for (const e of D.edges) { const a = byId.get(e.from), b = byId.get(e.to); if (!a || !b || !c4Of(a) || !c4Of(b)) { omitted.push({id: e.id, kind: e.kind, reason: 'An end is not a C4 element.'}); continue; } lines.push(`    ${ref(a)} -> ${ref(b)} ${q(relWord(e))} ${q(styleOf(e.kind).family)} { properties { "aiw.id" ${q(e.id)} "aiw.kind" ${q(e.kind)} } }`); }
  lines.push('  }', '  views {');
  const viewKey = D.scene.id.replace(/[^a-z0-9]/gi, '');
  lines.push(`    systemContext ${sys} ${q('context-' + viewKey)} ${q(D.scene.title + ' · context')} { include * autoLayout }`);
  if (inside.length) lines.push(`    container ${sys} ${q('container-' + viewKey)} ${q(D.scene.title + ' · containers')} { include * autoLayout }`);
  lines.push('    styles { element "External" { background #d9dfd8 color #1e2b26 } element "Open" { border dashed } }', '  }', '}');
  return {document: lines.join('\n') + '\n', omitted};
}

// A PlantUML sequence diagram (round 6): participants in lifeline order, messages in step order, a response dashed.
function plantumlSequence(D, project) {
  const lines = ['@startuml', `title ${(project?.name || D.header.model)} · ${D.scene.title}`];
  for (const n of D.nodes) lines.push(`${n.type === 'party' ? 'participant' : n.type === 'data' ? 'database' : 'participant'} ${q(n.title)} as ${id(n.id)}`);
  for (const e of D.edges.slice().sort((a, b) => (a.step || 0) - (b.step || 0))) lines.push(`${id(e.from)} ${e.reply ? '-->' : '->'} ${id(e.to)} : ${String(e.step ? e.step + '. ' : '') + String(e.fullLabel || e.label || '').replace(/[\r\n]+/g, ' ')}`);
  lines.push('@enduml');
  return {document: lines.join('\n') + '\n', omitted: []};
}
// A PlantUML state diagram (round 6): the first state of each data definition from [*], a transition labelled by its contract.
function plantumlState(D, project) {
  const lines = ['@startuml', `title ${(project?.name || D.header.model)} · ${D.scene.title}`];
  const groupsOf = new Map(); for (const n of D.nodes) { const g = n.group || ''; if (!groupsOf.has(g)) groupsOf.set(g, []); groupsOf.get(g).push(n); }
  for (const [gid, nodes] of groupsOf) {
    const g = D.groups.find(x => x.id === gid), pad = g ? '  ' : '';
    if (g) lines.push(`state ${q(g.title)} as ${id(g.id)} {`);
    for (const n of nodes) lines.push(`${pad}state ${q(n.title)} as ${id(n.id)}`);
    if (nodes[0]) lines.push(`${pad}[*] --> ${id(nodes[0].id)}`);
    if (g) lines.push('}');
  }
  for (const e of D.edges) lines.push(`${id(e.from)} --> ${id(e.to)} : ${String(e.fullLabel || e.label || '').replace(/[\r\n]+/g, ' ')}`);
  lines.push('@enduml');
  return {document: lines.join('\n') + '\n', omitted: []};
}
function plantuml(D, L, project) {
  if (D.scene.id === 'sequence') return plantumlSequence(D, project);
  if (D.scene.id === 'lifecycle') return plantumlState(D, project);
  const omitted = [], byId = new Map(D.nodes.map(n => [n.id, n])), deployment = D.scene.id === 'deployment';
  const lines = ['@startuml', `!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/${deployment ? 'C4_Deployment' : 'C4_Container'}.puml`, `title ${(project?.name || D.header.model)} · ${D.scene.title}`];
  const inGroup = new Map(); for (const n of D.nodes) { const g = n.group || ''; if (!inGroup.has(g)) inGroup.set(g, []); inGroup.get(g).push(n); }
  const el = n => { const c = c4Of(n); if (c === 'person') return `Person(${id(n.id)}, ${q(n.title)}, ${q(n.sub)})`; if (c === 'externalSystem') return `System_Ext(${id(n.id)}, ${q(n.title)}, ${q(n.sub || 'External system')})`; if (c === 'softwareSystem') return `System(${id(n.id)}, ${q(n.title)}, ${q(n.sub)})`; if (['physicalData', 'logicalData', 'dataEntity'].includes(n.kind)) return `ContainerDb(${id(n.id)}, ${q(n.title)}, ${q(n.kicker)}, ${q(n.sub)})`; if (n.kind === 'placement' && deployment) return `Deployment_Node(${id(n.id)}, ${q(n.title)}, ${q(n.sub)})`; return `Container(${id(n.id)}, ${q(n.title)}, ${q(n.kicker || KINDS[n.kind]?.short || n.kind)}, ${q(n.sub)})`; };
  const emitGroup = (gid, indent) => { const g = D.groups.find(x => x.id === gid); const members = inGroup.get(gid) || [], kids = D.groups.filter(x => x.parent === gid); if (g) lines.push(`${indent}${deployment ? 'Deployment_Node' : g.kind === 'external' || g.kind === 'system' ? 'System_Boundary' : 'Boundary'}(${id(g.id)}, ${q(g.title)}${deployment ? ', ' + q(g.sub || GROUP_KINDS[g.kind]?.label || g.kind) : ''}) {`); for (const n of members) lines.push(`${indent}  ${el(n)}`); for (const k of kids) emitGroup(k.id, indent + '  '); if (g) lines.push(`${indent}}`); };
  for (const n of inGroup.get('') || []) lines.push(el(n));
  for (const g of D.groups.filter(g => !g.parent)) emitGroup(g.id, '');
  for (const e of D.edges) { const a = byId.get(e.from), b = byId.get(e.to); if (!a || !b) { omitted.push({id: e.id, reason: 'Missing end.'}); continue; } const st = styleOf(e.kind); lines.push(`${st.dash ? 'Rel_D' : 'Rel'}(${id(e.from)}, ${id(e.to)}, ${q(relWord(e))}, ${q(st.family)})`); }
  lines.push('SHOW_LEGEND()', '@enduml');
  return {document: lines.join('\n') + '\n', omitted};
}

function mermaid(D, L, project) {
  const omitted = [], byId = new Map(D.nodes.map(n => [n.id, n]));
  const esc = s => String(s).replace(/"/g, '#quot;');
  const plain = s => String(s ?? '').replace(/[\r\n]+/g, ' ').replace(/[:;#]/g, ' ').trim();
  // The sequence picture (round 6): participants in lifeline order, messages in step order, a response dashed.
  if (D.scene.id === 'sequence') {
    const lines = ['sequenceDiagram', `  title ${plain((project?.name || D.header.model) + ' · ' + D.scene.title)}`];
    for (const n of D.nodes) lines.push(`  participant ${id(n.id)} as ${plain(n.title)}`);
    for (const e of D.edges.slice().sort((a, b) => (a.step || 0) - (b.step || 0))) lines.push(`  ${id(e.from)}${e.reply ? '-->>' : '->>'}${id(e.to)}: ${plain((e.step ? e.step + '. ' : '') + (e.fullLabel || e.label || 'message'))}`);
    return {document: lines.join('\n') + '\n', omitted};
  }
  // The lifecycle picture (round 6): each data definition's states, the first from [*], transitions labelled by contract.
  if (D.scene.id === 'lifecycle') {
    const lines = ['stateDiagram-v2'];
    const groupsOf = new Map(); for (const n of D.nodes) { const g = n.group || ''; if (!groupsOf.has(g)) groupsOf.set(g, []); groupsOf.get(g).push(n); }
    for (const [gid, nodes] of groupsOf) {
      const g = D.groups.find(x => x.id === gid), pad = g ? '    ' : '  ';
      if (g) lines.push(`  state "${esc(g.title)}" as ${id(g.id)} {`);
      for (const n of nodes) lines.push(`${pad}state "${esc(n.title)}" as ${id(n.id)}`);
      if (nodes[0]) lines.push(`${pad}[*] --> ${id(nodes[0].id)}`);
      if (g) lines.push('  }');
    }
    for (const e of D.edges) lines.push(`  ${id(e.from)} --> ${id(e.to)}: ${plain(e.fullLabel || e.label || 'moves to')}`);
    return {document: lines.join('\n') + '\n', omitted};
  }
  if (D.scene.id === 'context') {
    const lines = ['C4Context', `  title ${esc((project?.name || D.header.model) + ' · ' + D.scene.title)}`];
    for (const n of D.nodes) { const c = c4Of(n); if (c === 'person') lines.push(`  Person(${id(n.id)}, "${esc(n.title)}", "${esc(n.sub)}")`); else if (c === 'externalSystem') lines.push(`  System_Ext(${id(n.id)}, "${esc(n.title)}", "${esc(n.sub)}")`); else lines.push(`  System(${id(n.id)}, "${esc(n.title)}", "${esc(n.sub)}")`); }
    for (const e of D.edges) lines.push(`  Rel(${id(e.from)}, ${id(e.to)}, "${esc(relWord(e))}")`);
    return {document: lines.join('\n') + '\n', omitted};
  }
  const lines = [`flowchart ${L.arrangement === 'orthogonal' || L.arrangement === 'lanes' ? 'LR' : 'TB'}`, `  %% ${esc((project?.name || D.header.model) + ' · ' + D.scene.title)} · AIW standard notation`];
  const shape = n => { const label = esc([n.kicker ? n.kicker.toUpperCase() : '', n.title, n.sub].filter(Boolean).join('<br/>')); if (n.kind === 'event') return `${id(n.id)}(("${label}"))`; if (n.kind === 'gateway') return `${id(n.id)}{"${label}"}`; if (['physicalData', 'logicalData', 'dataEntity'].includes(n.kind)) return `${id(n.id)}[("${label}")]`; if (n.kind === 'appService') return `${id(n.id)}(["${label}"])`; if (n.kind === 'actor') return `${id(n.id)}>"${label}"]`; return `${id(n.id)}["${label}"]`; };
  const inGroup = new Map(); for (const n of D.nodes) { const g = n.group || ''; if (!inGroup.has(g)) inGroup.set(g, []); inGroup.get(g).push(n); }
  const emit = (gid, indent) => { const g = D.groups.find(x => x.id === gid); if (g) lines.push(`${indent}subgraph ${id(g.id)} ["${esc(g.title)}"]`); for (const n of inGroup.get(gid) || []) lines.push(`${indent}  ${shape(n)}`); for (const k of D.groups.filter(x => x.parent === gid)) emit(k.id, indent + '  '); if (g) lines.push(`${indent}end`); };
  for (const n of inGroup.get('') || []) lines.push('  ' + shape(n));
  for (const g of D.groups.filter(g => !g.parent)) emit(g.id, '  ');
  for (const e of D.edges) { const a = byId.get(e.from), b = byId.get(e.to); if (!a || !b) continue; const st = styleOf(e.kind), arrow = st.head === 'none' ? (st.dash ? '-.-' : '---') : st.dash && st.dash.startsWith('1') || st.dash === '2 2' ? '-.->' : st.dash ? '-.->' : e.kind === 'path' ? '==>' : '-->'; const word = relWord(e); lines.push(`  ${id(e.from)} ${arrow}${word ? `|"${esc(word)}"|` : ''} ${id(e.to)}`); }
  const fills = {}; for (const n of D.nodes) fills[n.kind] = true;
  lines.push(...Object.keys(fills).map(k => `  classDef ${k} fill:${({physicalApp: '#c7d3e6', logicalApp: '#8ea6c8', appService: '#d4e7ee', logicalData: '#b9a9d0', physicalData: '#f4c9a4', logicalTech: '#bcd4a6', physicalTech: '#9fc487', techService: '#e6e79a', control: '#e7d2df', threat: '#f0d2c8'})[k] || '#eeeeee'},stroke:#5a6a63,color:#1e2b26`));
  for (const n of D.nodes) lines.push(`  class ${id(n.id)} ${n.kind}`);
  return {document: lines.join('\n') + '\n', omitted};
}

function drawio(D, L) {
  const omitted = [], cells = [], pos = new Map(L.nodes.map(b => [b.id, b])), G = new Map(L.groups.map(g => [g.id, g]));
  const fill = {application: '#c7d3e6', 'application-logical': '#8ea6c8', service: '#d4e7ee', 'data-logical': '#b9a9d0', data: '#f4c9a4', 'data-entity': '#dbe3ee', technology: '#bcd4a6', 'technology-physical': '#9fc487', 'technology-service': '#e6e79a', business: '#f2c9a3', 'business-dark': '#3d6fb0', process: '#d9e7f2', intent: '#e6e2f2', decision: '#e2d6ea', security: '#e7d2df', threat: '#f0d2c8', deployment: '#cfdce8', 'bpmn-task': '#eef1ee', 'bpmn-event': '#ffffff', 'bpmn-gateway': '#ffffff'};
  const parentOf = gid => (gid && G.has(gid) ? gid : '1'), origin = gid => (gid && G.has(gid) ? G.get(gid) : {x: 0, y: 0});
  const depth = g => { let d = 0, p = g.parent; while (p) { d++; p = D.groups.find(x => x.id === p)?.parent; } return d; };
  for (const g of L.groups.slice().sort((a, b) => depth(a) - depth(b))) { const o = origin(g.parent); cells.push(`<mxCell id="${xml(g.id)}" value="${xml(g.title + (g.sub ? ' — ' + g.sub : ''))}" style="swimlane;startSize=${num(30)};whiteSpace=wrap;html=1;fillColor=#f7f8f4;strokeColor=#9aa79e;fontStyle=1;fontSize=12;${g.kind === 'external' ? 'dashed=1;' : ''}container=1;collapsible=0;" vertex="1" parent="${xml(parentOf(g.parent))}"><mxGeometry x="${num(g.x - o.x)}" y="${num(g.y - o.y)}" width="${num(g.w)}" height="${num(g.h)}" as="geometry"/></mxCell>`); }
  for (const n of D.nodes) {
    const b = pos.get(n.id); if (!b) { omitted.push({id: n.id, reason: 'Not placed.'}); continue; }
    const o = origin(n.group), k = KINDS[n.kind];
    const style = n.kind === 'event' ? 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;strokeColor=#2f6b4f;strokeWidth=2;fillColor=#ffffff;' : n.kind === 'gateway' ? 'rhombus;whiteSpace=wrap;html=1;strokeColor=#a8741f;fillColor=#ffffff;' : `rounded=${n.kind === 'task' ? 1 : 0};whiteSpace=wrap;html=1;verticalAlign=top;fillColor=${n.hatched ? '#fff8ea' : fill[k.family] || '#eeeeee'};strokeColor=#5a6a63;${n.hatched ? 'dashed=1;' : ''}fontSize=11;`;
    const label = n.kind === 'event' || n.kind === 'gateway' || n.kind === 'task' ? n.title : `<b style="font-size:8px;letter-spacing:.04em">${xml(n.kicker.toUpperCase())}</b><br>${xml(n.title)}${n.sub ? `<br><font style="font-size:9px">${xml(n.sub)}</font>` : ''}${n.ref ? `<br><font style="font-size:8px"><b>${xml(n.ref)}</b></font>` : ''}`;
    cells.push(`<mxCell id="${xml(n.id)}" value="${xml(label)}" style="${style}" vertex="1" parent="${xml(parentOf(n.group))}"><mxGeometry x="${num(b.x - o.x)}" y="${num(b.y - o.y)}" width="${num(b.w)}" height="${num(b.h)}" as="geometry"/></mxCell>`);
  }
  const arrow = {filled: 'block;endFill=1', hollow: 'block;endFill=0', open: 'open', small: 'open;endSize=4', half: 'halfCircle', dot: 'oval;endFill=1', diamond: 'diamond;startFill=1', 'diamond-open': 'diamond;startFill=0', circle: 'oval;startFill=0', none: 'none'};
  for (const e of L.edges) {
    const st = styleOf(e.kind), pts = e.pts.slice(1, -1);
    const style = `edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${st.stroke};${st.dash ? `dashed=1;dashPattern=${st.dash.replace(' ', ' ')};` : ''}endArrow=${arrow[e.ends === 'none' ? 'none' : st.head] || 'none'};startArrow=${arrow[e.ends === 'both' ? st.head : st.tail] || 'none'};${e.weak ? 'opacity=55;' : ''}fontSize=9;fontStyle=2;`;
    cells.push(`<mxCell id="${xml(e.id)}" value="${xml((e.step ? e.step + ' ' : '') + (e.label || '') + (e.qualifier ? ' (' + e.qualifier + ')' : ''))}" style="${style}" edge="1" parent="1" source="${xml(e.from)}" target="${xml(e.to)}"><mxGeometry relative="1" as="geometry">${pts.length ? `<Array as="points">${pts.map(([x, y]) => `<mxPoint x="${num(x)}" y="${num(y)}"/>`).join('')}</Array>` : ''}</mxGeometry></mxCell>`);
  }
  const doc = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="AIW" type="device"><diagram id="${xml(D.scene.id)}" name="${xml(D.scene.title)}"><mxGraphModel dx="0" dy="0" grid="1" gridSize="8" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${num(L.W)}" pageHeight="${num(L.H)}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram></mxfile>\n`;
  return {document: doc, omitted};
}

function archimate(D, L, project) {
  const edgeType = new Map(), omitted = [], pos = new Map(L.nodes.map(b => [b.id, b])), G = new Map(L.groups.map(g => [g.id, g]));
  const prop = (k, v) => `<property propertyDefinitionRef="${k}"><value xml:lang="en">${xml(v)}</value></property>`;
  const elements = [];
  for (const n of D.nodes) elements.push(`<element identifier="${id(n.id)}" xsi:type="${KINDS[n.kind].archimate}"><name xml:lang="en">${xml(n.title)}</name>${n.sub ? `<documentation xml:lang="en">${xml(n.sub)}</documentation>` : ''}<properties>${prop('aiw-id', n.id)}${prop('aiw-kind', n.kind)}${n.ref ? prop('aiw-ref', n.ref) : ''}</properties></element>`);
  for (const g of D.groups) elements.push(`<element identifier="${id('group:' + g.id)}" xsi:type="${GROUP_KINDS[g.kind]?.archimate || 'Grouping'}"><name xml:lang="en">${xml(g.title)}</name><properties>${prop('aiw-id', g.id)}${prop('aiw-kind', 'group:' + g.kind)}</properties></element>`);
  const rels = [], typeOf = new Map([...D.nodes.map(n => [n.id, KINDS[n.kind].archimate]), ...D.groups.map(g => ['group:' + g.id, GROUP_KINDS[g.kind]?.archimate || 'Grouping'])]), downgraded = [];
  // Each relationship keeps its ArchiMate type where the specification allows it between the two element types; otherwise an Association that says so.
  const typed = (wanted, s, t, ref) => { const r = archimateRelationship(wanted, typeOf.get(s), typeOf.get(t)); if (!r.kept) downgraded.push({id: ref, wanted, source: typeOf.get(s), target: typeOf.get(t)}); return r.type; };
  for (const e of D.edges) { const st = styleOf(e.kind), rev = !!st.reverse, src = rev ? e.to : e.from, tgt = rev ? e.from : e.to, t = typed(st.archimate || 'Association', src, tgt, e.id); rels.push(`<relationship identifier="${id(e.id)}" xsi:type="${t}" source="${id(src)}" target="${id(tgt)}"${t === 'Access' ? ' accessType="Write"' : ''}><name xml:lang="en">${xml(e.label)}</name><properties>${prop('aiw-id', e.id)}${prop('aiw-kind', e.kind)}${e.qualifier ? prop('aiw-qualifier', e.qualifier) : ''}</properties></relationship>`); edgeType.set(e.id, t); }
  for (const n of D.nodes) if (n.group) rels.push(`<relationship identifier="${id('in:' + n.id)}" xsi:type="${typed('Aggregation', 'group:' + n.group, n.id, 'in:' + n.id)}" source="${id('group:' + n.group)}" target="${id(n.id)}"/>`);
  for (const g of D.groups) if (g.parent) rels.push(`<relationship identifier="${id('in:' + g.id)}" xsi:type="${typed('Aggregation', 'group:' + g.parent, 'group:' + g.id, 'in:' + g.id)}" source="${id('group:' + g.parent)}" target="${id('group:' + g.id)}"/>`);
  for (const d of downgraded) omitted.push({id: d.id, kind: 'relationship type', reason: `${d.wanted} is not allowed from ${d.source} to ${d.target} in ArchiMate 3.1; written as Association with the AIW kind as a property.`});
  const nodeXML = (ref, b, children = '') => `<node identifier="${id('view:' + ref)}" elementRef="${id(ref)}" xsi:type="Element" x="${num(b.x)}" y="${num(b.y)}" w="${num(b.w)}" h="${num(b.h)}">${children}</node>`;
  const tree = gid => [...D.groups.filter(g => g.parent === gid).map(g => nodeXML('group:' + g.id, G.get(g.id) || {x: 0, y: 0, w: 200, h: 100}, tree(g.id))), ...D.nodes.filter(n => (n.group || null) === gid && pos.has(n.id)).map(n => nodeXML(n.id, pos.get(n.id)))].join('');
  const viewNodes = L.groups.length ? tree(null) : D.nodes.filter(n => pos.has(n.id)).map(n => nodeXML(n.id, pos.get(n.id))).join('');
  const conns = L.edges.map(e => { const st = styleOf(e.kind), rev = !!st.reverse; const pts = e.pts.slice(1, -1).map(([x, y]) => `<bendpoint x="${num(x)}" y="${num(y)}"/>`).join(''); return `<connection identifier="${id('view:' + e.id)}" relationshipRef="${id(e.id)}" xsi:type="Relationship" source="${id('view:' + (rev ? e.to : e.from))}" target="${id('view:' + (rev ? e.from : e.to))}">${pts}</connection>`; }).join('');
  const doc = `<?xml version="1.0" encoding="UTF-8"?>\n<model xmlns="http://www.opengroup.org/xsd/archimate/3.0/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" identifier="${id('model:' + D.scene.id)}"><name xml:lang="en">${xml((project?.name || D.header.model) + ' · ' + D.scene.title)}</name><documentation xml:lang="en">${xml(D.scene.purpose)} Exported from the AIW standard diagram; relationship types follow the notation kit and need architect review in the target tool.</documentation><elements>${elements.join('')}</elements><relationships>${rels.join('')}</relationships><propertyDefinitions>${['aiw-id', 'aiw-kind', 'aiw-ref', 'aiw-qualifier'].map(k => `<propertyDefinition identifier="${k}" type="string"><name>${k}</name></propertyDefinition>`).join('')}</propertyDefinitions><views><diagrams><view identifier="${id('diagram:' + D.scene.id)}" xsi:type="Diagram"><name xml:lang="en">${xml(D.scene.title)}</name><documentation xml:lang="en">${xml(diagramText(D, L).split('\n')[0])}</documentation>${viewNodes}${conns}</view></diagrams></views></model>\n`;
  return {document: doc, omitted};
}

function bpmn(D, L, project) {
  const omitted = [], pos = new Map(L.nodes.map(b => [b.id, b])), G = new Map(L.groups.map(g => [g.id, g]));
  const pools = D.groups.filter(g => g.kind === 'pool'), laneGroups = D.groups.filter(g => g.kind === 'lane'), subGroups = D.groups.filter(g => g.kind === 'subprocess');
  const parentGroup = gid => D.groups.find(x => x.id === gid);
  const poolOf = n => { let g = parentGroup(n.group); while (g && g.kind !== 'pool') g = parentGroup(g.parent); return g?.id || (pools[0]?.id ?? 'main'); };
  const poolOfGroup = gid => { let g = parentGroup(gid); while (g && g.kind !== 'pool') g = parentGroup(g.parent); return g?.id || (pools[0]?.id ?? 'main'); };
  const inc = new Map(), outg = new Map(); for (const e of D.edges) { if (e.kind !== 'sequence') continue; outg.set(e.from, (outg.get(e.from) || 0) + 1); inc.set(e.to, (inc.get(e.to) || 0) + 1); }
  // The flow node's tag (round 6, Contract T): the recorded gateway type and event position, else the degree reading.
  const GATE = {exclusive: 'exclusiveGateway', parallel: 'parallelGateway', inclusive: 'inclusiveGateway', event: 'eventBasedGateway'};
  const position = n => n.glyph?.position || (!inc.get(n.id) ? 'start' : !outg.get(n.id) ? 'end' : 'intermediate');
  const tag = n => (n.kind === 'gateway' ? GATE[n.glyph?.gatewayType] || 'exclusiveGateway' : n.kind === 'event' ? ({start: 'startEvent', end: 'endEvent', boundary: 'boundaryEvent', intermediate: 'intermediateThrowEvent'})[position(n)] : n.kind === 'subprocess' ? 'subProcess' : n.kind === 'dataEntity' ? 'dataObjectReference' : 'task');
  const EVENT_DEF = {message: 'messageEventDefinition', timer: 'timerEventDefinition', error: 'errorEventDefinition', signal: 'signalEventDefinition'};
  const definition = n => (n.kind === 'event' && EVENT_DEF[n.glyph?.eventType] ? `<${EVENT_DEF[n.glyph.eventType]} id="${id('def:' + n.id)}"/>` : '');
  const flowNode = (n, flows, members) => {
    const t = tag(n), ins = flows.filter(e => e.to === n.id).map(e => `<incoming>${id(e.id)}</incoming>`).join(''), outs = flows.filter(e => e.from === n.id).map(e => `<outgoing>${id(e.id)}</outgoing>`).join('');
    if (t === 'dataObjectReference') return `<dataObject id="${id('data:' + n.id)}" name="${xml(n.title)}"/><dataObjectReference id="${id(n.id)}" name="${xml(n.title)}" dataObjectRef="${id('data:' + n.id)}"/>`;
    const attach = t === 'boundaryEvent' && n.attachedTo && members.some(m => m.id === n.attachedTo) ? ` attachedToRef="${id(n.attachedTo)}" cancelActivity="true"` : '';
    const access = n.kind === 'task' ? D.edges.filter(e => e.kind === 'accesses' && e.from === n.id && members.some(m => m.id === e.to)).map(e => `<dataOutputAssociation id="${id(e.id)}"><targetRef>${id(e.to)}</targetRef></dataOutputAssociation>`).join('') : '';
    return `<${t} id="${id(n.id)}" name="${xml(n.title)}"${attach}>${ins}${outs}${definition(n)}${access}</${t}>`;
  };
  const processes = (pools.length ? pools : [{id: 'main', title: project?.name || D.header.model}]).map(pool => {
    const members = D.nodes.filter(n => poolOf(n) === pool.id), lanes = laneGroups.filter(l => poolOfGroup(l.id) === pool.id), subs = subGroups.filter(g => poolOfGroup(g.id) === pool.id);
    const memberIds = new Set(members.map(n => n.id)), inSub = new Set(members.filter(n => subs.some(g => g.id === n.group)).map(n => n.id));
    const laneSet = lanes.length ? `<laneSet id="${id('laneset:' + pool.id)}">${lanes.map(l => `<lane id="${id(l.id)}" name="${xml(l.title)}">${members.filter(n => n.group === l.id).map(n => `<flowNodeRef>${id(n.id)}</flowNodeRef>`).join('')}</lane>`).join('')}</laneSet>` : '';
    const flows = D.edges.filter(e => e.kind === 'sequence' && memberIds.has(e.from) && memberIds.has(e.to));
    // An open sub-process (round 6) holds its flow nodes and the flows among them; a flow across its edge stays in the process.
    const subXML = subs.map(g => { const inside = members.filter(n => n.group === g.id), ids = new Set(inside.map(n => n.id)), own = flows.filter(e => ids.has(e.from) && ids.has(e.to)); return `<subProcess id="${id('group:' + g.id)}" name="${xml(g.title)}">${inside.map(n => flowNode(n, flows, members)).join('')}${own.map(e => seqXML(e)).join('')}</subProcess>`; }).join('');
    const nodes = members.filter(n => !inSub.has(n.id)).map(n => flowNode(n, flows, members)).join('');
    const subFlowIds = new Set(subs.flatMap(g => { const ids = new Set(members.filter(n => n.group === g.id).map(n => n.id)); return flows.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => e.id); }));
    const seq = flows.filter(e => !subFlowIds.has(e.id)).map(e => seqXML(e)).join('');
    return {pool, xml: `<process id="${id('process:' + pool.id)}" name="${xml(pool.title)}" isExecutable="false">${laneSet}${subXML}${nodes}${seq}</process>`};
  });
  function seqXML(e) { return `<sequenceFlow id="${id(e.id)}" sourceRef="${id(e.from)}" targetRef="${id(e.to)}"${e.label ? ` name="${xml(e.label)}"` : ''}>${e.qualifier ? `<conditionExpression xsi:type="tFormalExpression">${xml(e.qualifier)}</conditionExpression>` : ''}</sequenceFlow>`; }
  const messages = D.edges.filter(e => e.kind === 'message');
  const collab = `<collaboration id="${id('collab:' + D.scene.id)}">${processes.map(p => `<participant id="${id('participant:' + p.pool.id)}" name="${xml(p.pool.title)}" processRef="${id('process:' + p.pool.id)}"/>`).join('')}${messages.map(e => `<messageFlow id="${id(e.id)}" sourceRef="${id(e.from)}" targetRef="${id(e.to)}" name="${xml(e.label)}"/>`).join('')}</collaboration>`;
  const shape = (ref, b, extra = '') => `<bpmndi:BPMNShape id="${id('shape:' + ref)}" bpmnElement="${id(ref)}"${extra}><dc:Bounds x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}"/></bpmndi:BPMNShape>`;
  const shapes = [...processes.map(p => G.has(p.pool.id) ? shape('participant:' + p.pool.id, G.get(p.pool.id), ' isHorizontal="true"') : ''), ...laneGroups.map(l => G.has(l.id) ? shape(l.id, G.get(l.id), ' isHorizontal="true"') : ''), ...subGroups.map(g => G.has(g.id) ? shape('group:' + g.id, G.get(g.id), ' isExpanded="true"') : ''), ...D.nodes.map(n => pos.has(n.id) ? shape(n.id, pos.get(n.id)) : '')].join('');
  const edgesDI = L.edges.filter(e => ['sequence', 'message', 'accesses'].includes(e.kind)).map(e => `<bpmndi:BPMNEdge id="${id('edge:' + e.id)}" bpmnElement="${id(e.id)}">${e.pts.map(([x, y]) => `<di:waypoint x="${num(x)}" y="${num(y)}"/>`).join('')}</bpmndi:BPMNEdge>`).join('');
  for (const e of D.edges) if (!['sequence', 'message', 'accesses'].includes(e.kind)) omitted.push({id: e.id, kind: e.kind, reason: 'BPMN carries sequence flows, message flows and data associations only.'});
  const doc = `<?xml version="1.0" encoding="UTF-8"?>\n<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="${id('definitions:' + D.scene.id)}" targetNamespace="urn:aiw:bpmn" exporter="AIW" exporterVersion="v5">${collab}${processes.map(p => p.xml).join('')}<bpmndi:BPMNDiagram id="${id('diagram:' + D.scene.id)}"><bpmndi:BPMNPlane id="${id('plane:' + D.scene.id)}" bpmnElement="${id('collab:' + D.scene.id)}">${shapes}${edgesDI}</bpmndi:BPMNPlane></bpmndi:BPMNDiagram></definitions>\n`;
  return {document: doc, omitted};
}
