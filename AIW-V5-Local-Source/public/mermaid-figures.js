// The Mermaid text of a standard diagram for the Markdown edition of the SDD (round 6, Contract F). AIW emits Mermaid
// and never renders it: a figure written this way draws itself where Markdown is rendered (a repository, a wiki, a
// review tool), from the same diagram (D) and arrangement (L) the reader saw. Every scene takes the Mermaid emitter of
// notation-code.js (a flowchart with containers, or C4Context for the context view); the data scene is written as an
// erDiagram here instead, because an entity-relationship picture is what that scene is: each data definition an entity
// with its fields, its owner, the contracts that carry it and what it transforms into. Labels escape quotes, carry no
// raw newline and no tag but the line break Mermaid reads; identifiers are reversible (notation-code.js) or named in a
// comment. DOM-free; the server, the browser and the suites load it.
import {diagramCode} from './notation-code.js';
import {foldDiagram, FIGURE_BUDGET} from './figure-budget.js';

const clean = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
// A quoted Mermaid label: quotes become #quot;, angle brackets their entities, so no raw tag or quote reaches the text.
const label = v => clean(v, 200).replace(/"/g, '#quot;').replace(/</g, '#lt;').replace(/>/g, '#gt;');
// An erDiagram entity name: letters, digits and underscores, from the title, unique within the diagram.
function entityNames(D) {
  const names = new Map(), used = new Set();
  for (const n of D.nodes) {
    let base = clean(n.title, 60).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Entity';
    if (/^[0-9]/.test(base)) base = 'E_' + base;
    let name = base, k = 2; while (used.has(name)) name = base + '_' + k++;
    used.add(name); names.set(n.id, name);
  }
  return names;
}
const ATTR_TYPE = /^[A-Za-z][A-Za-z0-9_]*$/, ATTR_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
// The erDiagram of the data scene: entities with their fields, and the owning, using, carrying and transforming
// relationships in crow's-foot notation.
function erDiagram(D, project) {
  const names = entityNames(D), omitted = [], lines = ['erDiagram', `  %% ${label((project?.name || D.header?.model || '') + ' · ' + D.scene.title)} · AIW standard notation`];
  for (const n of D.nodes) {
    const name = names.get(n.id), kicker = n.kicker || n.kind;
    lines.push(`  %% ${name} = ${label(n.title)} (${label(kicker)}${n.ref ? ', ' + label(n.ref) : ''}; AIW id ${label(n.id)})`);
    const fields = Array.isArray(n.record?.fields) ? n.record.fields.slice(0, 40) : [];
    const attrs = fields.map(f => {
      const type = ATTR_TYPE.test(String(f.type || '')) ? f.type : 'string', fname = ATTR_NAME.test(String(f.name || '')) ? f.name : null;
      if (!fname) { omitted.push({id: n.id, kind: 'field', reason: `Field “${clean(f.name, 40)}” has a name Mermaid cannot carry.`}); return null; }
      const keys = [f.key ? 'PK' : ''].filter(Boolean).join(', '), comment = clean(f.description, 80).replace(/["<>]/g, '');
      return `    ${type} ${fname}${keys ? ' ' + keys : ''}${comment ? ' "' + comment + '"' : ''}`;
    }).filter(Boolean);
    if (fields.length > 40) omitted.push({id: n.id, kind: 'field', reason: `${fields.length - 40} fields beyond the first 40 are not written.`});
    if (attrs.length) lines.push(`  ${name} {`, ...attrs, '  }'); else lines.push(`  ${name}`);
  }
  // Crow's foot by relationship kind: an owner has many of its records; a component uses one store; a contract carries
  // many records and a record travels in many contracts; a transformation is one to one.
  const foot = {owns: '||--o{', uses: '}o--||', exchanges: '}o--o{', transforms: '||--||', carries: '}o--o{'};
  for (const e of D.edges) {
    const a = names.get(e.from), b = names.get(e.to); if (!a || !b) { omitted.push({id: e.id, kind: e.kind, reason: 'An end is not drawn.'}); continue; }
    const word = [e.label || e.kind, e.qualifier ? '(' + e.qualifier + ')' : ''].filter(Boolean).join(' ');
    lines.push(`  ${a} ${foot[e.kind] || '}o--o{'} ${b} : "${label(word)}"`);
  }
  return {document: lines.join('\n') + '\n', omitted};
}

// The bounds a Mermaid figure keeps (round 12, P). Mermaid refuses a diagram whose text is longer than its maxTextSize
// setting ("Maximum text size in diagram exceeded", 50,000 characters by default) or that has more edges than maxEdges
// ("Edge limit exceeded", 500 by default): both are its documented configuration defaults (MermaidConfig), and a reader
// rarely changes them. A figure stays well inside both: at most 100 elements, 200 relationships and 40,000 characters;
// above them it is folded into its groups (figure-budget.js, the overview the SDD draws), and a figure whose overview is
// still too large carries a one-line note instead of a block Mermaid would refuse.
export const MERMAID_LIMITS = Object.freeze({nodes: 100, edges: 200, text: 40000});
const within = (D, code = '') => D.nodes.length <= MERMAID_LIMITS.nodes && D.edges.length <= MERMAID_LIMITS.edges && code.length <= MERMAID_LIMITS.text;
// The Mermaid text of one figure: {code, kind, report}. `kind` is the diagram type on the first line. A folded figure's
// report says so (`folded`: the grouping and the groups); a noted one carries `note`.
export function mermaidFigure(D, L, {project = null, chapter = null} = {}) {
  if (!D || !D.nodes.length) return null;
  const out = emit(D, L, project, chapter);
  if (within(D, out.code)) return out;
  // Over a bound: the scene's overview (a sequence or a lifecycle overview is a flowchart of its groups).
  const F = foldDiagram(D, {project, budget: FIGURE_BUDGET, edges: MERMAID_LIMITS.edges}), X = F.folded ? F.overview : null;
  if (X) {
    const flat = ['sequence', 'lifecycle'].includes(D.scene?.id) ? {...X, scene: {...X.scene, id: X.scene.id + '-overview'}} : X, f = emit(flat, {...L, arrangement: 'tree', nodes: [], edges: []}, project, chapter);
    const code = f.code.replace(/\n/, `\n  %% Folded: ${D.nodes.length} elements and ${D.edges.length} relationships exceed what Mermaid draws reliably; this is the overview of ${F.groups.length} groups by ${F.by.join(' and ')}, the relationships between them counted.\n`);
    if (within(X, code)) return {...f, code, report: {...f.report, scene: D.scene.id, folded: {by: F.by, groups: F.groups.length, elements: D.nodes.length, relationships: D.edges.length}}};
  }
  const note = `${D.scene?.title || 'This figure'}: ${D.nodes.length} elements and ${D.edges.length} relationships, more than Mermaid draws reliably; the SVG figure draws it and the annexes list every element.`;
  return {code: `flowchart TB\n  note["${label(note)}"]\n`, kind: 'flowchart', note, report: {format: 'mermaid', scene: D.scene?.id, chapter, elements: D.nodes.length, relationships: D.edges.length, omitted: [], limits: [note]}};
}
function emit(D, L, project, chapter) {
  if (D.scene?.id === 'data') {
    const out = erDiagram(D, project);
    return {code: out.document, kind: 'erDiagram', report: {format: 'mermaid', scene: D.scene.id, chapter, elements: D.nodes.length, relationships: D.edges.length, omitted: out.omitted, limits: ['Mermaid draws its own layout; the arranged positions are not carried.', 'Entity names are the titles in letters, digits and underscores; the AIW identifier of each stands in a comment beside it.', 'Crow’s-foot cardinalities follow the relationship kind, not a recorded cardinality.'], identity: 'The comment beside each entity names the AIW identifier.'}};
  }
  const out = diagramCode('mermaid', D, L, {project, chapter});
  return {code: out.document, kind: out.document.split('\n')[0].split(/\s+/)[0] || 'flowchart', report: out.report};
}
// The text as it stands inside a fenced block: a line that would close the fence is softened, and the end is tidy.
export const mermaidFenced = code => String(code ?? '').replace(/^```/gm, "'''").replace(/\s+$/, '');
