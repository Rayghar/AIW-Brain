// One renderer for every picture of a standard diagram: the on-screen Diagram, the SVG and PNG
// export, the SDD figures and the baseline diff all draw from this module, so what the reviewer
// saw is what the document carries. DOM-free: it writes markup from a diagram (notation-model.js)
// and its layout (notation-layout.js), and runs in the browser, in Node and under the Worker.
import {KINDS, GROUP_KINDS, STYLES, STYLE_FAMILIES, styleOf, FAMILY_FILL, ICONS, TYPE_INK, markerDefs, markerRef} from './notation-palette.js';
import {wrapText, charW, NL, LANE_TITLES, groupSubShown, sameFact, isListBox, listBox, listOf} from './notation-layout.js';
import {describeNode, describeEdge, viewpointOf, glyphWords} from './notation-model.js';
import {sha256} from './brain-integrity.js';
import {esc} from './html-escape.js';
import {fileSafe as safe} from './util.js';

const FONT = '"IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const num = v => (Number.isFinite(v) ? Math.round(v * 10) / 10 : 0);
const pathD = pts => pts.map(([x, y], i) => (i ? 'L' : 'M') + num(x) + ' ' + num(y)).join('');
const polyLen = P => { let t = 0; for (let i = 1; i < (P || []).length; i++) t += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return t; };

// Round 10: the bundles a layout draws (L.bundles, notation-layout.js consolidate), each kept only when it names its
// members and every member names it back, so a hand-made or partial layout draws every relationship on its own.
export const drawnBundles = L => { const E = new Map((L?.edges || []).map(e => [e.id, e])); return (L?.bundles || []).filter(b => b?.members?.length && b.members.every(id => E.get(id)?.bundle === b.id)); };
// Where two independent orthogonal lines cross, a short break in the horizontal line lets the eye follow each
// route. It changes only the ink: the relationship, its full-route hit and the layout's geometry stay intact. The
// sweep is indexed by x, and deliberately leaves very large or very congested pictures to their layer/focus tools.
// A crossing close to an end, corner or another crossing is left untouched, so a branch or a cluster cannot look
// like a severed relationship. Cached for the Key, the screen and export of the same layout.
const gapCache = new WeakMap(), GAP = Object.freeze({edgeCap: 96, segmentCap: 320, crossingCap: 240, end: 8, cluster: 10, radius: 3.4});
export function crossingSeparations(L) {
  if (!L || typeof L !== 'object') return [];
  if (gapCache.has(L)) return gapCache.get(L);
  const none = () => (gapCache.set(L, []), []);
  if ((L.edges?.length || 0) > GAP.edgeCap) return none();
  const B = drawnBundles(L), E = new Map((L.edges || []).map(e => [e.id, e])), bundled = new Set(B.flatMap(b => b.members)), pieces = [];
  for (const b of B) {
    for (const r of b.runs || []) pieces.push({owner: r, group: b.id, pts: r.pts});
    for (const id of b.members) { const e = E.get(id); if (e?.branch?.length > 1) pieces.push({owner: e, group: b.id, pts: e.branch}); }
  }
  for (const e of L.edges || []) if (!bundled.has(e.id)) pieces.push({owner: e, group: e.id, pts: e.pts});
  const horizontal = [], vertical = [];
  for (const p of pieces) for (let i = 1; i < (p.pts?.length || 0); i++) {
    const [a, z] = [p.pts[i - 1], p.pts[i]];
    if (a[1] === z[1] && Math.abs(a[0] - z[0]) > GAP.end * 2) horizontal.push({...p, at: i, y: a[1], lo: Math.min(a[0], z[0]), hi: Math.max(a[0], z[0])});
    else if (a[0] === z[0] && Math.abs(a[1] - z[1]) > GAP.end * 2) vertical.push({...p, at: i, x: a[0], lo: Math.min(a[1], z[1]), hi: Math.max(a[1], z[1])});
    if (horizontal.length + vertical.length > GAP.segmentCap) return none();
  }
  vertical.sort((a, b) => a.x - b.x);
  const candidates = new Map(); let total = 0;
  for (const h of horizontal) {
    let lo = 0, hi = vertical.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (vertical[mid].x < h.lo + GAP.end) lo = mid + 1; else hi = mid; }
    for (let i = lo; i < vertical.length && vertical[i].x <= h.hi - GAP.end; i++) {
      const v = vertical[i];
      if (h.group === v.group || h.y <= v.lo + GAP.end || h.y >= v.hi - GAP.end) continue;
      const list = candidates.get(h.owner) || []; list.push({x: v.x, y: h.y, segment: h.at, crossing: v.owner.members || [v.owner.id]}); candidates.set(h.owner, list);
      if (++total > GAP.crossingCap) return none();
    }
  }
  const gaps = [];
  for (const [owner, points] of candidates) {
    points.sort((a, b) => a.segment - b.segment || a.x - b.x);
    const clear = points.filter((p, i) => !(points[i - 1]?.segment === p.segment && p.x - points[i - 1].x < GAP.cluster) && !(points[i + 1]?.segment === p.segment && points[i + 1].x - p.x < GAP.cluster));
    if (clear.length) gaps.push({owner, points: clear});
  }
  gapCache.set(L, gaps);
  return gaps;
}
// The record a relationship was drawn from, as the reader knows it: its reference or its id; else, from the
// relationship's own id, where the model records it in plain words (a 'rel:<source>:' segment as words, an exchange by
// its own reference), never an internal key.
export const recordName = e => {
  const r = e?.record; if (r?.ref || r?.id) return String(r.ref || r.id);
  const id = String(e?.id ?? '').replace(/^c:/, ''), m = /^rel:([^:]+):/.exec(id), x = /^payload:[^/]+\/exchange\/(.+)$/.exec(id);
  if (x) return x[1];
  if (m) return m[1].replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\./g, ' › ').toLowerCase();
  return id.includes(':') ? id.slice(id.lastIndexOf(':') + 1) : id;
};

// The Key, built from what is drawn: the element kinds present, the relationship styles in use with
// the words that use them, the containers, and the marks (hatched, attenuated, crossing, numbered).
// `L` (round 10), when given, adds the marks of the lines drawn together (L.bundles): the drawing join, the plain T and
// the line drawn once for a relationship recorded more than once, each only when the picture draws it.
export function legendData(D, L = null) {
  if (!D) return {elements: [], relationships: [], groups: [], marks: []};
  const count = (list, key) => { const m = new Map(); for (const x of list) { const k = key(x); if (!k) continue; m.set(k, (m.get(k) || 0) + 1); } return m; };
  const kinds = count(D.nodes, n => n.kind), elements = [...kinds].map(([kind, n]) => ({kind, kicker: KINDS[kind].kicker || KINDS[kind].short, family: KINDS[kind].family, count: n, bpmn: KINDS[kind].family.startsWith('bpmn')}));
  const byFamily = new Map();
  for (const e of D.edges) { const st = styleOf(e.kind); if (!byFamily.has(st.family)) byFamily.set(st.family, {family: st.family, title: STYLE_FAMILIES.find(([f]) => f === st.family)?.[1] || st.family, style: st, kinds: new Map(), words: new Map()}); const f = byFamily.get(st.family); f.kinds.set(e.kind, (f.kinds.get(e.kind) || 0) + 1); const w = e.kind === 'flow' || e.kind === 'sequence' || e.kind === 'path' ? null : (e.label || st.label); if (w) f.words.set(w, (f.words.get(w) || 0) + 1); }
  // The ArchiMate type word of each kind (round 6, Contract T): the connected model's typing where the edge carries it
  // (several types read "Realization, Association"), else the kind's own.
  const typeWords = kind => { const typed = [...new Set(D.edges.filter(e => e.kind === kind && e.archimate?.type).map(e => e.archimate.type))]; return typed.length ? typed.join(', ') : (STYLES[kind]?.archimate || 'Association'); };
  const relationships = STYLE_FAMILIES.map(([f]) => byFamily.get(f)).filter(Boolean).map(f => ({family: f.family, title: f.title, style: f.style, kinds: [...f.kinds].map(([kind, n]) => ({kind, label: STYLES[kind]?.label || kind, count: n, archimate: typeWords(kind)})), words: [...f.words.keys()].slice(0, 6), flowWords: f.family === 'flow' || f.family === 'sequence' ? [...new Set(D.edges.filter(e => styleOf(e.kind).family === f.family && e.label).map(e => e.label))].slice(0, 6) : [], invalid: D.edges.filter(e => styleOf(e.kind).family === f.family && e.archimate?.valid === false).length}));
  const groups = [...count(D.groups, g => g.kind)].map(([kind, n]) => ({kind, label: GROUP_KINDS[kind]?.label || kind, count: n}));
  // The BPMN glyphs drawn (round 6): each event position and type, each gateway type, with its words; and the icons.
  const glyphs = [...count(D.nodes, n => (n.glyph ? glyphKey(n.glyph) : null))].map(([id, n]) => ({id, text: GLYPH_WORDS[id] || id, count: n}));
  const icons = [...count(D.nodes, n => n.icon || null)].map(([id, n]) => ({id, title: D.icons?.[id]?.title || id, path: D.icons?.[id]?.path || '', count: n}));
  const marks = [];
  if (D.nodes.some(n => n.hatched)) marks.push({id: 'hatched', text: 'Not chosen, not placed, or not selected'});
  if (D.edges.some(e => e.weak)) marks.push({id: 'weak', text: 'Attenuated: not essential, not critical or not selected'});
  if (D.edges.some(e => e.crossing)) marks.push({id: 'crossing', text: 'Crosses a trust boundary'});
  if (D.edges.some(e => e.step)) marks.push({id: 'step', text: 'Numbered runtime path, in call order'});
  if (D.edges.some(e => e.qualifier)) marks.push({id: 'qualifier', text: 'Qualifier at the source end: protocol, operation or criticality'});
  if (D.edges.some(e => e.cardinality)) marks.push({id: 'cardinality', text: 'Cardinality at the ends: copies on copies'});
  if (crossingSeparations(L).length) marks.push({id: 'separation', text: 'A small gap separates two lines that cross; it is not a junction.'});
  // A diff is drawn against a frozen baseline, or (round 5) against the saved design while an alternative is previewed.
  const by = D.diffBy === 'alternative' ? 'by this alternative' : 'since the baseline';
  // Against an alternative, what it changes is ringed as a mark (Contract M), so the Key lists it there, once.
  if (D.diff) marks.push({id: 'added', text: 'Added ' + by}, {id: 'removed', text: 'Removed ' + by}, ...(D.diffBy === 'alternative' ? [] : [{id: 'changed', text: 'Changed ' + by}]));
  if (D.edges.some(e => e.reply)) marks.push({id: 'reply', text: 'A response, drawn dashed'});
  if (D.edges.some(e => e.archimate?.valid === false)) marks.push({id: 'untyped', text: 'The recorded kind is not an ArchiMate relationship between these two types; written as an association'});
  // Round 10: lines drawn together. A fan with join dots, a fan that splits as a plain T (its own end mark is a diamond
  // or a dot), and one line for a fact recorded more than once (a bundle of its own, or two records riding one branch of
  // a fan). The dot is a drawing join: no ArchiMate junction is claimed until an independent reviewer has checked the
  // ArchiMate 3.2 junction text.
  const B = drawnBundles(L);
  if (B.some(b => b.end !== 'both' && b.dotted)) marks.push({id: 'bundle', text: 'One line for relationships of one kind to or from one element; a dot marks where each leaves it, and each branch is one recorded relationship. A drawing join: AIW does not claim it as an ArchiMate junction.'});
  if (B.some(b => b.end !== 'both' && !b.dotted)) marks.push({id: 'tree', text: 'A fan of composition, aggregation, assignment, protects or evidences relationships splits as a plain T, with no dot; each end mark stays where the standard draws it.'});
  if (B.some(b => b.end === 'both' || b.runs.some(r => r.far && r.members.length > 1))) marks.push({id: 'duplicate', text: 'One line for a relationship recorded more than once; the reading lists each record.'});
  return {elements, relationships, groups, marks, glyphs, icons};
}
// The BPMN glyphs (round 6, Contract T): an event ring by its position (start thin, intermediate and boundary double,
// end thick) with a mark by its type (a clock for a timer, an envelope for a message, a flash for an error, a triangle
// for a signal); a gateway diamond with a mark by its type (+ parallel, O inclusive, a plain diamond exclusive, a ringed
// pentagon event-based).
export const glyphKey = g => (g.gatewayType ? 'gateway:' + g.gatewayType : 'event:' + (g.position || 'intermediate') + ':' + (g.eventType || 'none'));
export const GLYPH_WORDS = {'gateway:exclusive': 'Exclusive gateway ◇ · one path', 'gateway:parallel': 'Parallel gateway + · every path', 'gateway:inclusive': 'Inclusive gateway O · one or more paths', 'gateway:event': 'Event-based gateway · the first event decides', 'event:start:none': 'Start event', 'event:start:message': 'Start event · a message arrives', 'event:start:timer': 'Start event · a timer fires', 'event:start:signal': 'Start event · a signal', 'event:start:error': 'Start event · an error', 'event:intermediate:none': 'Intermediate event', 'event:intermediate:message': 'Intermediate event · a message', 'event:intermediate:timer': 'Intermediate event · a timer', 'event:intermediate:error': 'Intermediate event · an error', 'event:intermediate:signal': 'Intermediate event · a signal', 'event:boundary:none': 'Boundary event · on its task', 'event:boundary:message': 'Boundary event · a message interrupts the task', 'event:boundary:timer': 'Boundary event · a timer interrupts the task', 'event:boundary:error': 'Boundary event · an error ends the task', 'event:boundary:signal': 'Boundary event · a signal interrupts the task', 'event:end:none': 'End event', 'event:end:message': 'End event · a message is sent', 'event:end:error': 'End event · an error is thrown', 'event:end:signal': 'End event · a signal is sent', 'event:end:timer': 'End event'};
// The marks inside an event ring or a gateway diamond, centred on (cx, cy) at size r (half the symbol).
function eventMark(type, cx, cy, r) {
  const k = r * 0.5;
  if (type === 'timer') return `<g class="nt-glyph" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="${num(cx)}" cy="${num(cy)}" r="${num(k)}"/><path d="M${num(cx)} ${num(cy - k * 0.6)}V${num(cy)}H${num(cx + k * 0.5)}"/></g>`;
  if (type === 'message') return `<g class="nt-glyph" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="${num(cx - k)}" y="${num(cy - k * 0.65)}" width="${num(2 * k)}" height="${num(1.3 * k)}"/><path d="M${num(cx - k)} ${num(cy - k * 0.65)}L${num(cx)} ${num(cy + k * 0.1)}L${num(cx + k)} ${num(cy - k * 0.65)}"/></g>`;
  if (type === 'error') return `<path class="nt-glyph" d="M${num(cx - k)} ${num(cy + k)}L${num(cx - k * 0.3)} ${num(cy - k * 0.5)}L${num(cx + k * 0.2)} ${num(cy + k * 0.3)}L${num(cx + k)} ${num(cy - k)}L${num(cx + k * 0.3)} ${num(cy + k * 0.5)}L${num(cx - k * 0.2)} ${num(cy - k * 0.3)}z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>`;
  if (type === 'signal') return `<path class="nt-glyph" d="M${num(cx)} ${num(cy - k)}L${num(cx + k)} ${num(cy + k * 0.7)}H${num(cx - k)}z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>`;
  return '';
}
function gatewayMark(type, cx, cy, r) {
  const k = r * 0.42;
  if (type === 'parallel') return `<path class="nt-glyph" d="M${num(cx)} ${num(cy - k)}V${num(cy + k)}M${num(cx - k)} ${num(cy)}H${num(cx + k)}" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`;
  if (type === 'inclusive') return `<circle class="nt-glyph" cx="${num(cx)} " cy="${num(cy)}" r="${num(k * 0.9)}" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
  if (type === 'event') { const pts = [0, 1, 2, 3, 4].map(i => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return `${num(cx + k * 0.75 * Math.cos(a))} ${num(cy + k * 0.75 * Math.sin(a))}`; }); return `<g class="nt-glyph" fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="${num(cx)}" cy="${num(cy)}" r="${num(k * 1.15)}"/><path d="M${pts.join('L')}z"/></g>`; }
  return '';
}

// A text alternative in reading order (top to bottom, left to right): what a screen reader, the
// SDD figure's alt text and Sol's packet read.
export function diagramText(D, L) {
  if (!D || !D.nodes.length) return `${D?.scene?.title || 'Diagram'}: nothing is drawn. ${(D?.notes || []).join(' ')}`.trim();
  const pos = new Map((L?.nodes || []).map(n => [n.id, n]));
  const order = D.nodes.slice().sort((a, b) => { const p = pos.get(a.id) || {x: 0, y: 0}, q = pos.get(b.id) || {x: 0, y: 0}; return Math.round(p.y / 40) - Math.round(q.y / 40) || p.x - q.x; });
  const vp = viewpointOf(D);
  const index = D.layerSummary, head = index
    ? `${vp.title} (${vp.standard}): ${index.total} recorded relationships among ${(D.fold?.total?.nodes ?? D.nodes.length)} elements, shown as ${D.nodes.length} type groups or records and ${index.pairs.length} directional relationship summaries. Select a summary in AIW to inspect its exact records. ${vp.purpose}`
    : `${vp.title} (${vp.standard}): ${D.counts?.nodes ?? D.nodes.length} elements, ${D.edges.length} relationships${D.groups.length ? `, ${D.groups.length} containers` : ''}. ${vp.purpose}`;
  const groups = D.groups.map(g => `${GROUP_KINDS[g.kind]?.label || g.kind} “${g.title}”${g.parent ? ' inside ' + (D.groups.find(x => x.id === g.parent)?.title || g.parent) : ''}: ${D.nodes.filter(n => n.group === g.id).map(n => n.title).join(', ') || 'empty'}.`);
  const lines = order.map((n, i) => `${i + 1}. ${describeNode(D, n.id)}`);
  const summaries = index?.pairs.map(p => `${p.fromTitle || LANE_TITLES[p.from] || p.from} ${p.from === p.to ? 'within this band' : 'to ' + (p.toTitle || LANE_TITLES[p.to] || p.to)}: ${p.count} recorded relationship${p.count === 1 ? '' : 's'} (${p.families.map(f => `${f.family} ${f.count}`).join(', ')}).`) || [];
  return [head, ...groups, ...lines, ...summaries, ...(D.notes || []).map(t => 'Note: ' + t)].join('\n');
}

// What a picture says, as a structured packet: the hook a reader's assistant (Sol) reads to explain
// or critique the picture the reader is looking at. It carries the scene and its viewpoint, the
// arrangement and what is hidden, every element and relationship with its kind and words, the
// containers, the notes, the selection and the callouts, and the text alternative. It is a reading:
// nothing in it can change the picture or the model, and positions are the reader's, never facts.
// Round 10: a relationship drawn on one line with others says which line and which others (`bundle`: the line's id, the
// end it shares, the relationships with it), and the measures say how many lines were drawn together; no route or
// position is offered.
export function explainDiagram(D, L, {chapter = null, arrangement = L?.arrangement || null, hiddenLayers = [], focus = null, baseline = null, selection = null, selectedEdge = null, callouts = []} = {}) {
  if (!D) return null;
  const vp = viewpointOf(D), K = legendData(D, L), lineOf = new Map();
  for (const b of drawnBundles(L)) for (const id of b.members) lineOf.set(id, b);
  const together = id => { const b = lineOf.get(id); return b ? {id: b.id, end: b.end, with: b.members.filter(m => m !== id)} : null; };
  const C = L?.consolidation;
  return {schema: 'aiw.diagram-reading/1', chapter, scene: D.scene.id, title: D.scene.title, standard: D.scene.standard, viewpoint: vp, arrangement, hiddenLayers, focus, baseline, counts: {nodes: D.nodes.length, edges: D.edges.length, groups: D.groups.length, ...(D.layerSummary ? {underlyingRelationships: D.layerSummary.total} : {})}, relationIndex: D.layerSummary?.pairs.map(p => ({from: p.from, to: p.to, count: p.count, families: p.families, relationshipIds: p.members})) || null,
    nodes: D.nodes.map(n => ({id: n.id, kind: n.kind, kicker: n.kicker || KINDS[n.kind]?.short, title: n.fullTitle || n.title, ref: n.ref, sub: n.sub, group: n.group, hatched: n.hatched, change: n.change || null, type: n.type, concern: n.viewBand || null, role: D.viewLevels?.find(b => b.level === n.level)?.title || null, members: n.fold?.members || null, glyph: n.glyph || null, icon: n.icon || null, reading: describeNode(D, n.id)})),
    edges: D.edges.map(e => ({id: e.id, from: e.from, to: e.to, kind: e.kind, family: e.family, archimate: e.archimate?.type || styleOf(e.kind).archimate, archimateValid: e.archimate ? e.archimate.valid : null, label: e.fullLabel || e.label, qualifier: e.qualifier, step: e.step, reply: !!e.reply, weak: e.weak, crossing: e.crossing, cardinality: e.cardinality || null, change: e.change || null, members: e.fold?.members || null, bundle: together(e.id), reading: describeEdge(D, e.id)})),
    groups: D.groups.map(g => ({id: g.id, kind: g.kind, label: GROUP_KINDS[g.kind]?.label || g.kind, title: g.title, parent: g.parent})),
    key: {elements: K.elements.map(e => e.kicker), relationships: K.relationships.map(r => r.title), marks: K.marks.map(m => m.text)},
    notes: D.notes, selection, selectedEdge, callouts: callouts.map(c => ({n: c.n, targetId: c.targetId, text: c.text, severity: c.severity, proposed: !!c.proposed})),
    measures: L ? {width: L.W, height: L.H, throughPasses: L.through || 0, droppedPins: L.droppedPins || [], consolidation: C ? {bundles: C.bundles || 0, joins: C.joins || 0, duplicates: C.duplicates || 0, fallback: C.fallback || false} : null} : null,
    text: diagramText(D, L), disclosure: 'A reading of the picture: elements are saved records or explicitly counted record groups; positions are the reader’s, never facts. An assistant may explain and propose; it never changes the picture or the model.'};
}

// The styles the markup relies on. Font sizes keep a print floor (nothing under 9 px at 100 %).
export const SVG_STYLE = `.nt-hd{fill:#fbfbf6;stroke:#c9d3c4}.nt-ht{font:600 15px Georgia,serif;fill:#1e2b26}.nt-hk{font:9.5px ${FONT};fill:#4c5852}.nt-hv{font:600 9.5px ${FONT};fill:#2b3a33}
.nt-group rect{fill:#f7f8f4;stroke:#9aa79e;stroke-width:1.2}.nt-g-external rect{stroke-dasharray:5 4}.nt-g-boundary rect{stroke:#a06f92;fill:#faf5f8}.nt-g-zone rect,.nt-g-environment rect{fill:#f5f1ea;stroke:#a5947a}.nt-g-lane rect{fill:#fafaf7;stroke:#7d8b83}.nt-g-pool rect{fill:#f4f6f3;stroke:#4d6a5c;stroke-width:1.4}.nt-g-unplaced rect{fill:#fff8ea;stroke:#d09a4e;stroke-dasharray:4 3}.nt-g-family rect{fill:#f3f6ef;stroke:#b9c7b0}.nt-g-module rect{fill:#f2f6f1;stroke:#8fa89b}.nt-g-system rect{stroke:#4d6a5c;stroke-width:1.6;fill:#f6f8f5}.nt-g-node rect{fill:#eef2ee;stroke:#6f8577}
.nt-gtitle{font:600 12px ${FONT};fill:#2b3a33}.nt-gsub{font:10px ${FONT};fill:#66736c}
.nt-band rect{fill:#f5f7f2;stroke:#e0e6dc}.nt-band text{font:600 10px ${FONT};fill:#5d6b57;letter-spacing:.06em;text-transform:uppercase}.nt-lane:nth-of-type(even) rect{fill:#f9faf6}.nt-band-collapsed rect{fill:#fbfbf7;stroke:#c9d1c3;stroke-dasharray:4 3}.nt-band-collapsed text{fill:#6c7867}
.nt-band text.nt-lane-title{font-size:11px}.nt-aspect{font:600 8.5px ${FONT};fill:#8a958b;letter-spacing:.08em;text-transform:uppercase}.nt-aspect-line{fill:none;stroke:#dfe5dc;stroke-dasharray:2 3}
.nt-band.nt-lane-motivation rect{fill:#f4eef6;stroke:#dbc8e1}.nt-band.nt-lane-business rect{fill:#fbf3e1;stroke:#ecd5a3}.nt-band.nt-lane-application rect{fill:#edf3fb;stroke:#c4d6ee}.nt-band.nt-lane-information rect{fill:#f6f9fd;stroke:#d6e3f4}.nt-band.nt-lane-technology rect{fill:#ebf2ea;stroke:#c6dccc}.nt-band.nt-lane-deployment rect{fill:#f4f8f3;stroke:#d6e6dc}.nt-band.nt-lane-security rect{fill:#fbefec;stroke:#efc5bd}.nt-band.nt-lane-strategy rect{fill:#faf4e4;stroke:#eadcb6}.nt-band.nt-lane-implementation rect{fill:#fcf3f0;stroke:#efd6cf}
.nt-edge path.nt-line,.nt-trunk path.nt-line{fill:none;stroke-width:1.3}.nt-edge.weak path.nt-line,.nt-trunk.weak path.nt-line{opacity:.7}.nt-edge.lit path.nt-line,.nt-trunk.lit path.nt-line{stroke:#b18d42;stroke-width:2.2}.nt-edge.dim,.nt-trunk.dim{opacity:.3}.nt-edge.sel path.nt-line,.nt-trunk.sel path.nt-line{stroke:#b18d42;stroke-width:2.4}.nt-trunk.lit .nt-join,.nt-trunk.sel .nt-join{fill:#b18d42}
.nt-hit{fill:none;stroke:transparent;stroke-width:12px;cursor:pointer}.nt-hit:focus{outline:none}.nt-hit:focus-visible,.nt-hit:hover{stroke:#b18d4244}.nt-bhit{fill:none;stroke:transparent;stroke-width:12px;cursor:pointer}.nt-bhit:hover{stroke:#b18d4233}
.nt-lift{pointer-events:none}.nt-lift path{fill:none;stroke-width:2.4}.nt-lift path.sel,.nt-lift path.lit{stroke:#b18d42}.nt-lift path.lit{stroke-width:2.2}.nt-lift path.nt-mk-lit{stroke:#7a4fb0;stroke-width:2.6}.nt-end{fill:none;stroke:#b18d42;stroke-width:2}
.nt-elabel{font:600 10px ${FONT};fill:#3c4a44;paint-order:stroke;stroke:#fff;stroke-width:3.5px;stroke-linejoin:round}.nt-elabel .nt-step{font-weight:700;fill:#b0493a}
.nt-qual{font:9px ${FONT};fill:#5d6b57;paint-order:stroke;stroke:#fff;stroke-width:3px}.nt-card{font:600 9px ${FONT};fill:#3c4a44;paint-order:stroke;stroke:#fff;stroke-width:3px}
.nt-cross{fill:#fff;stroke:#a06f92;stroke-width:1.4}
.nt-node rect.nt-box{stroke:#5a6a63;stroke-width:1}.nt-node.nt-fold rect.nt-box{stroke:#3b4741;stroke-width:2.2}.nt-node.hatched rect.nt-box{stroke-dasharray:4 3}.nt-node rect.nt-kband{fill:#fff;fill-opacity:.55}
.nt-li-rule{fill:none;stroke:#3b4741;stroke-opacity:.35;stroke-width:1}.nt-li-ref{font-weight:600}.nt-li-more{font-style:italic}.nt-li-n{font-variant-numeric:tabular-nums}.nt-li-own,.nt-title-start{font-weight:600}
.nt-kicker{font:600 9.5px ${FONT};fill:#3b4741;letter-spacing:.04em;text-transform:uppercase}.nt-title{font:12px ${FONT};fill:#1e2b26}.nt-sub{font:10px ${FONT};fill:#2b3a33}.nt-ref{font:600 9px ${FONT};fill:#3b4741}.nt-refbg{fill:#fff;fill-opacity:.75}
.nt-business-dark .nt-kicker,.nt-business-dark .nt-title,.nt-business-dark .nt-sub{fill:#fff}.nt-business-dark rect.nt-kband{fill-opacity:.2}
.nt-cap{font:10px ${FONT};fill:#2b3a33}.nt-ev{fill:#fff;stroke:#2f6b4f;stroke-width:2}.nt-ev-inner{fill:none}.nt-gw{fill:#fff;stroke:#a8741f;stroke-width:1.6}.nt-task rect.nt-box{rx:8}
.nt-glyph{color:#2b3a33}.nt-bpmn-gateway .nt-glyph{color:#a8741f}.nt-bpmn-event .nt-glyph{color:#2f6b4f}.nt-subbox{fill:#fff;stroke:#3b4741;stroke-width:1.2}
.nt-lifeline line{stroke:#7d8b83;stroke-width:1.2;stroke-dasharray:5 4}.nt-edge.reply path.nt-line,.nt-trunk.reply path.nt-line{opacity:.85}rect.nt-state{stroke:#6f5a93}
.nt-node.sel rect.nt-box{stroke:#b18d42;stroke-width:2.5}.nt-node.pinned rect.nt-box{stroke:#b18d42}.nt-node.added rect.nt-box{stroke:#2f6b4f;stroke-width:2.2}.nt-node.removed rect.nt-box{stroke:#8a8f8c;stroke-dasharray:3 3}.nt-node.removed text{fill:#7d8580}.nt-node.changed rect.nt-box{stroke:#bb8628;stroke-width:2.2}
.nt-edge.added path.nt-line,.nt-trunk.added path.nt-line{stroke:#2f6b4f}.nt-edge.removed path.nt-line,.nt-trunk.removed path.nt-line{stroke:#6a786d;stroke-dasharray:3 3;opacity:1}.nt-edge.changed path.nt-line,.nt-trunk.changed path.nt-line{stroke:#bb8628}.nt-trunk.added .nt-join{fill:#2f6b4f}.nt-trunk.removed .nt-join{fill:#6a786d}.nt-trunk.changed .nt-join{fill:#bb8628}
.nt-v-bad rect.nt-box{stroke:#b0493a;stroke-width:3}.nt-v-warn rect.nt-box{stroke:#bb8628;stroke-width:3}.nt-v-none rect.nt-box{stroke:#8a8f8c;stroke-width:3;stroke-dasharray:2 3}.nt-v-ok rect.nt-box{stroke:#2f6b4f;stroke-width:2.5}
.nt-vbadge{font:700 9px ${FONT};fill:#fff}.nt-vbadge-bg.bad{fill:#b0493a}.nt-vbadge-bg.warn{fill:#bb8628}.nt-vbadge-bg.none{fill:#8a8f8c}.nt-vbadge-bg.ok{fill:#2f6b4f}
.nt-callout circle{fill:#fff;stroke:#b0493a;stroke-width:1.6}.nt-callout.sev-low circle{stroke:#bb8628}.nt-callout.sev-info circle{stroke:#3f6d86}.nt-callout.proposed circle{stroke-dasharray:2 2}.nt-callout text{font:700 9px ${FONT};fill:#1e2b26}.nt-callout line{stroke:#b0493a;stroke-width:1}.nt-callout.sev-low line{stroke:#bb8628}.nt-callout.sev-info line{stroke:#3f6d86}
.nt-note{font:11px ${FONT};fill:#8b5e12}.nt-key-h{font:600 11px ${FONT};fill:#2b3a33;letter-spacing:.06em;text-transform:uppercase}.nt-key{font:10.5px ${FONT};fill:#2b3a33}.nt-key-s{font:10px ${FONT};fill:#66736c}.nt-keybox{fill:#fcfcf9;stroke:#dde3d9}
.nt-foot{font:9.5px ${FONT};fill:#66736c}
.nt-ftitle{display:none;font-family:${FONT};font-weight:600;fill:#1e2b26}.nt-business-dark .nt-ftitle{fill:#fff}.nt-ghost .nt-ftitle{fill:#6d4a12}
.nt-mk-ring{fill:none;stroke-width:2.6}.nt-mk-ring.changed{stroke:#2c6f9c}.nt-mk-ring.traced{stroke:#7a4fb0;stroke-width:3}
.nt-mk-ghostline{fill:none;stroke-width:5}.nt-ghost rect{stroke:#a8741f;stroke-dasharray:4 3}.nt-ghost line{stroke:#a8741f;stroke-dasharray:3 3}
.nt-mk-bg{stroke:#fff;stroke-width:1.2}.nt-mk-badge.fix .nt-mk-bg{fill:#b0493a}.nt-mk-badge.confirm .nt-mk-bg{fill:#94650f}.nt-mk-badge.pass .nt-mk-bg{fill:#2f6b4f}
.nt-mk-glyph{font:700 10.5px ${FONT};fill:#fff}.nt-mk-word{font:600 9.5px ${FONT};fill:#fff}.nt-mk-far{display:none}
.nt-node.nt-mk-traced rect.nt-box{stroke:#7a4fb0;stroke-width:2.2}.nt-edge.nt-mk-lit path.nt-line,.nt-trunk.nt-mk-lit path.nt-line{stroke:#7a4fb0;stroke-width:2.6;opacity:1}.nt-trunk.nt-mk-lit .nt-join{fill:#7a4fb0}
.nt-mk-dimmed,.nt-edge.nt-mk-dim,.nt-trunk.nt-mk-dim{opacity:.22}`;

// The print floor (round 12, P): a figure of the SDD is drawn at the A4 text width (sdd-figures.js PRINT), and every
// word on it is at least this size, so that no label prints under 7 pt; the type and the reference lose their spacing.
export const PRINT_FLOOR = 10.5;
export const PRINT_STYLE = `.nt-hk,.nt-hv,.nt-ref,.nt-qual,.nt-card,.nt-sub,.nt-gsub,.nt-cap,.nt-elabel,.nt-key,.nt-key-s,.nt-foot,.nt-band text,.nt-vbadge,.nt-callout text,.nt-mk-word,.nt-mk-glyph{font-size:${PRINT_FLOOR}px}.nt-kicker{font-size:${PRINT_FLOOR}px;letter-spacing:0}.nt-band text{letter-spacing:0}`;

const defs = (prefix, kinds = null, gaps = [], L = null, clips = new Map()) => `<defs>${markerDefs(prefix, kinds)}<pattern id="${prefix}-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fff8ea"/><path d="M0 0v8" stroke="#d8c39a" stroke-width="3"/></pattern>${gaps.map((g, i) => `<mask id="${prefix}-separation-${i}" maskUnits="userSpaceOnUse" mask-type="luminance" x="0" y="0" width="${num(L.W)}" height="${num(L.H)}"><rect width="${num(L.W)}" height="${num(L.H)}" fill="#fff"/>${g.points.map(p => `<circle cx="${num(p.x)}" cy="${num(p.y)}" r="${GAP.radius}" fill="#000" data-nt-gap-members="${esc(JSON.stringify(p.crossing))}"/>`).join('')}</mask>`).join('')}${[...clips].map(([id, [w, h]]) => `<clipPath id="${id}"><rect width="${num(w)}" height="${num(h)}"/></clipPath>`).join('')}</defs>`;
// One SVG root per picture (round 24, D-24-07): what the screen may enlarge to keep legible (a container's title and
// sub-line, an element's type and sub-line, a list box's members) sits in a clip of its box drawn from a clipPath, never
// a nested <svg>, so a tool that reads a figure to its first </svg> reads all of it and a page's `figure svg` rule reaches
// the figure alone. A clip is in the box's own coordinates and its id carries the box's size: one per size in a picture,
// and two pictures that share a prefix share identical definitions.
const clipId = (prefix, w, h) => `${prefix}-clip-${num(w)}x${num(h)}`.replace(/\./g, '_');
const icon = (family, x, y, size = 12) => (ICONS[family] ? `<g transform="translate(${num(x)} ${num(y)}) scale(${num(size / 24)})" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[family]}"/></g>` : '');
const tspans = (lines, x, y, lh) => lines.map((l, i) => `<tspan x="${num(x)}" y="${num(y + i * lh)}">${esc(l)}</tspan>`).join('');
// A relationship's line as drawn: its style, except that a sequence picture's messages read as UML draws them (a request
// solid with a filled head, a response dashed with an open head).
const drawStyle = (e, seq) => { const base = styleOf(e.kind); return seq && e.kind === 'message' ? (e.reply ? {...base, dash: '5 3', head: 'open', tail: 'none'} : {...base, dash: '', head: 'filled', tail: 'none'}) : base; };
// The marks at its two ends: a head unless it has none, a tail when it reads both ways or its style has one.
const endRefs = (e, st, prefix) => ({head: e.ends === 'none' ? '' : markerRef(prefix, st.head, st.stroke), tail: markerRef(prefix, e.ends === 'both' ? (st.head === 'none' ? 'open' : st.head) : st.tail, st.stroke)});
// Round 10: the dash offset that keeps a path drawn towards a bundle's shared port, starting `d0` px from it, in step
// with the runs drawn away from the port (each dashed from its own length from the port): the pattern mirrored about the
// port. Every palette dash is one dash and one gap (notation-palette.js STYLES), whose mirror is itself; any other
// pattern is left unshifted.
function inwardPhase(dash, d0) {
  const v = String(dash || '').trim().split(/[\s,]+/).map(Number);
  if (v.length !== 2 || !v.every(x => Number.isFinite(x) && x >= 0) || !(v[0] + v[1] > 0)) return 0;
  const P = v[0] + v[1], o = ((v[0] - d0) % P + P) % P;
  return Math.round(o * 10) / 10;
}

// What an exported element's title says (round 24): its type, reference, name and sub-line, as its reading begins
// (notation-model.js describeNode); a list box adds the members it names and how many more it holds.
function nodeSaid(n) {
  const f = listOf(n), more = f?.list?.length ? Math.max(0, f.count - f.list.length) : 0;
  const listed = f?.list?.length ? ` It holds ${f.list.map(x => (x.ref && x.ref !== x.title ? x.ref + ' ' : '') + x.title + (x.n != null && x.n !== '' ? ' (' + (typeof x.n === 'number' ? x.n.toLocaleString('en-GB') : x.n) + ')' : '')).join(', ')}${more ? ` and ${more.toLocaleString('en-GB')} more` : ''}.` : '';
  return `${n.kicker || KINDS[n.kind]?.short || 'Element'}${n.ref ? ' ' + n.ref : ''}: ${n.fullTitle || n.title}${n.sub ? ' (' + n.sub + ')' : ''}.${listed}`;
}

// The marked-up parts of a picture; the screen composes some, the export composes all.
// `marks` (round 5, Contract M) is a Map of element id → merged mark (model-marks.js mergeMarks); `far` is the size of
// the far titles the screen shows while zoomed out (semantic zoom: hidden in an export), `farText` 'ref' writes the
// reference instead of the name there (the small record picture).
export function svgParts(D, L, {prefix = 'nt', sel = null, selEdge = null, interactive = false, vitals = null, callouts = [], diff = false, marks = null, far = FAR, farText = 'title', print = false} = {}) {
  if (!D || !L) return null;
  // A printed figure (round 12, P) sets its small words at the print floor (PRINT_STYLE): they are measured at that size.
  const SUBPX = print ? PRINT_FLOOR : 10, REFPX = print ? 6.6 : 5.6;
  const kickerOf = (n, w) => { const full = (n.kicker || '').toUpperCase(); return !print || charW(full, PRINT_FLOOR) * 1.12 <= w - 28 ? full : String(KINDS[n.kind]?.short || n.kicker || '').toUpperCase(); };
  const nodeOf = new Map(D.nodes.map(n => [n.id, n])), mk = marks instanceof Map && marks.size ? marks : null;
  // A band is a level (layered), an ungrouped lane (swimlanes) or a model layer's lane (by layer); a lane whose layer is
  // hidden is drawn collapsed, with what it holds in its title.
  // A lane's aspect columns (rc40, W1: notation-layout.js byLayer `columns`) stand under its title as faint headers, each
  // over its column, a hairline between two columns; a lane without columns is drawn as before.
  const columnsOf = b => (b.columns?.length ? `<g class="nt-aspects">${b.columns.map((c, i) => `${i ? `<path class="nt-aspect-line" d="M${num(c.x - 36)} ${num(c.y + 2)}v${num(Math.max(0, b.y + b.h - c.y - 6))}"/>` : ''}<text class="nt-aspect" x="${num(c.x)}" y="${num(c.y + 11)}" data-nt-aspect="${esc(c.id)}">${esc(c.title)}</text>`).join('')}</g>` : '');
  const bands = L.bands.map(b => `<g class="nt-band${b.layer ? ' nt-lane nt-lane-' + esc(b.layer) : ''}${b.collapsed ? ' nt-band-collapsed' : ''}"${b.layer ? ` data-nt-lane="${esc(b.layer)}"` : ''}><rect x="${num(b.x)}" y="${num(b.y)}" width="${num(b.w)}" height="${num(b.h)}"/><text class="nt-lane-title" x="${num(b.x + 8)}" y="${num(b.y + (b.collapsed ? 19 : 15))}">${esc(b.title)}</text>${columnsOf(b)}</g>`).join('');
  // A container's title and sub-line sit in a clip of its header, so a title the screen enlarges to stay legible while
  // zoomed out never runs past its container. The clips a picture draws (round 24: clipPaths, one per box size).
  const clips = new Map(), clip = (w, h) => { const id = clipId(prefix, w, h); if (!clips.has(id)) clips.set(id, [w, h]); return id; };
  const groups = L.groups.map(g => { const narrow = !groupSubShown(g); return `<g class="nt-group nt-g-${esc(g.kind)}" data-nt-group="${esc(g.id)}"><rect x="${num(g.x)}" y="${num(g.y)}" width="${num(g.w)}" height="${num(g.h)}" rx="6"/><g transform="translate(${num(g.x)} ${num(g.y)})"><g class="nt-clip" clip-path="url(#${clip(g.w, Math.min(g.h, NL.GHEAD))})"><text x="10" y="19" class="nt-gtitle">${esc(g.title)}</text>${g.sub && !narrow ? `<text x="${num(g.w - 10)}" y="19" class="nt-gsub" text-anchor="end">${esc(g.sub)}</text>` : ''}</g></g></g>`; }).join('');
  const hitList = [];
  // Lifelines (round 6): the dashed line each lifeline of a sequence picture runs down the page.
  const lifelines = (L.lifelines || []).map(l => `<g class="nt-lifeline" data-nt-lifeline="${esc(l.id)}"><line x1="${num(l.x)}" y1="${num(l.y1)}" x2="${num(l.x)}" y2="${num(l.y2)}"/></g>`).join('');
  const seq = D.scene?.id === 'sequence';
  // Round 10: lines drawn together (L.bundles). A bundle's runs are drawn once, in one top-level g.nt-bundle placed just
  // before its first member: each run a g.nt-trunk with the relationships that travel it (its state derived from theirs:
  // selected or lit when any of them is, dimmed only when all are; traced when any is, dimmed by the marks only when
  // all are), the shared end's mark once at the start of the root run, the far end's mark on a run two records of one
  // fact share to the end, and a join dot where a branch leaves (a dotted bundle only; a composition, aggregation or
  // dot-ended fan splits as a plain T). Every member keeps its own g.nt-edge with its own branch (an empty path when it
  // ends on a run), only its far end's mark, its word, qualifier, cardinality and crossing mark, and on screen its own
  // full-route hit, Tab stop and reading, which says which line it is drawn on. After the members' hits, each fan has one
  // pointer-only hit along its runs that selects the shared element (N6); it is hidden from assistive technology and takes
  // no Tab stop. The members of a run are written as a JSON list (relationship ids may hold spaces).
  const E = new Map(L.edges.map(e => [e.id, e])), lineOf = new Map(), bhits = [], started = new Set();
  for (const b of drawnBundles(L)) for (const id of b.members) lineOf.set(id, b);
  const gaps = crossingSeparations(L), gapOf = new Map(gaps.map((g, i) => [g.owner, ` mask="url(#${prefix}-separation-${i})"`]));
  const name = id => nodeOf.get(id)?.title || id;
  const stateOf = e => (selEdge === e.id ? 'sel' : sel && (e.from === sel || e.to === sel) ? 'lit' : sel || selEdge ? 'dim' : '');
  const mkOf = e => (mk ? edgeMarkClass(mk.get(e.from), mk.get(e.to)) : '');
  const drawingNote = (e, b) => {
    if (b.end === 'both') return ` Recorded more than once; this record: ${recordName(e)}.`;
    const n = b.members.length - 1, twin = b.members.some(id => id !== e.id && sameFact(E.get(id), e));
    return ` Drawn on one line with ${n} other ${e.label || styleOf(e.kind).label} relationship${n === 1 ? '' : 's'} ${b.end === 'to' ? 'to' : 'from'} ${name(b.node)}.${twin ? ` Recorded more than once; this record: ${recordName(e)}.` : ''}`;
  };
  const bundleSaid = b => {
    const rep = E.get(b.members[0]);
    if (b.end === 'both') return `One line for ${b.members.length} records of one relationship: ${describeEdge(D, rep.id)} Records: ${b.members.map(id => recordName(E.get(id))).join(', ')}.`;
    const other = new Map(); for (const id of b.members) { const m = E.get(id), o = b.end === 'to' ? m.from : m.to; other.set(o, (other.get(o) || 0) + 1); }
    return `One line for ${b.members.length} ${rep.label || styleOf(rep.kind).label} relationships ${b.end === 'to' ? 'to' : 'from'} ${name(b.node)}, ${b.end === 'to' ? 'from' : 'to'} ${[...other].map(([o, k]) => name(o) + (k > 1 ? ` (recorded ${k} times)` : '')).join(', ')}.`;
  };
  const bundleSVG = b => {
    // Runs are oriented away from the shared end (one fact's line from its source), each dashed from its length from the
    // shared port, so the dashes run on across every join.
    const rep = E.get(b.members[0]), st = drawStyle(rep, seq), {head, tail} = endRefs(rep, st, prefix), atShared = b.end === 'to' ? head : tail, atFar = b.end === 'to' ? tail : head;
    const at = (p, q) => !!p && !!q && p[0] === q[0] && p[1] === q[1], owner = new Map(), said = bundleSaid(b);
    // Each join dot sits in the run that arrives at it (the one with the most members).
    if (b.dotted && b.end !== 'both') for (const j of b.joins || []) {
      let best = -1;
      b.runs.forEach((r, i) => { if (at(r.pts[r.pts.length - 1], j) && (best < 0 || r.members.length > b.runs[best].members.length)) best = i; });
      if (best >= 0) { if (!owner.has(best)) owner.set(best, []); owner.get(best).push(j); }
    }
    // (along the runs between joins; a run that ends at its members' element stays under their own hits, so a
    // relationship drawn wholly on runs can still be pointed at)
    if (interactive && b.end !== 'both' && b.runs.some(r => !r.far)) bhits.push(`<path class="nt-bhit" d="${b.runs.filter(r => !r.far).map(r => pathD(r.pts)).join('')}" data-nt-bundle="${esc(b.id)}" data-nt-select="${esc(b.node)}" aria-hidden="true"><title>${esc(said)}</title></path>`);
    const runs = b.runs.map((r, i) => {
      const ms = r.members.map(id => E.get(id)).filter(Boolean), states = ms.map(stateOf), mks = ms.map(mkOf);
      const state = states.includes('sel') ? ' sel' : states.includes('lit') ? ' lit' : states.length && states.every(s => s === 'dim') ? ' dim' : '';
      const mkc = mks.includes(' nt-mk-lit') ? ' nt-mk-lit' : mks.length && mks.every(m => m === ' nt-mk-dim') ? ' nt-mk-dim' : '';
      const cls = `nt-trunk nt-e-${esc(rep.kind)} nt-f-${esc(st.family)}${rep.weak ? ' weak' : ''}${rep.reply ? ' reply' : ''}${state}${diff && rep.change ? ' ' + rep.change : ''}${mkc}`;
      const start = r.root ? atShared : '', end = r.far ? atFar : '';
      const dots = (owner.get(i) || []).map(j => `<circle class="nt-join" cx="${num(j[0])}" cy="${num(j[1])}" r="2.4" fill="${st.stroke}"/>`).join('');
      return `<g class="${cls}" data-nt-members="${esc(JSON.stringify(r.members))}"><path class="nt-line" d="${pathD(r.pts)}" stroke="${st.stroke}"${gapOf.get(r) || ''}${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${st.dash && r.offset ? ` stroke-dashoffset="${num(r.offset)}"` : ''}${end ? ` marker-end="${end}"` : ''}${start ? ` marker-start="${start}"` : ''}/>${dots}${!interactive && r.root ? `<title>${esc(said)}</title>` : ''}</g>`;
    }).join('');
    return `<g class="nt-bundle" data-nt-bundle="${esc(b.id)}">${runs}</g>`;
  };
  const edges = L.edges.map(e => {
    const st = drawStyle(e, seq), d = pathD(e.pts), state = stateOf(e), b = lineOf.get(e.id) || null;
    const cls = `nt-edge nt-e-${esc(e.kind)} nt-f-${esc(st.family)}${e.weak ? ' weak' : ''}${e.reply ? ' reply' : ''}${state ? ' ' + state : ''}${diff && e.change ? ' ' + e.change : ''}${mkOf(e)}`;
    let {head, tail} = endRefs(e, st, prefix), line = d, phase = 0;
    if (b) {
      // A member draws its own branch in its route's direction, with only its far end's mark, dashed in step with the
      // trunk (a fan-out's branch runs on from the join; a fan-in's runs towards it).
      const br = e.branch || [], own = b.end !== 'both' && br.length > 1 && polyLen(br) > 0;
      line = own ? pathD(br) : '';
      if (!own) head = tail = ''; else if (b.end === 'to') head = ''; else tail = '';
      if (own && st.dash) phase = b.end === 'from' ? polyLen(e.pts) - polyLen(br) : inwardPhase(st.dash, polyLen(e.pts));
    }
    const label = (e.label || e.step) && !e.labelHidden ? `<text x="${num(e.lx)}" y="${num(e.ly - 4)}" class="nt-elabel" text-anchor="middle">${e.step ? `<tspan class="nt-step">${e.step}</tspan> ` : ''}${esc(e.label)}</text>` : '';
    // The second record of one fact drawn as one line carries the first's qualifier, hidden (notation-layout.js placeLabels).
    const qual = e.qualifier && !e.qualifierHidden ? `<text x="${num(e.qx)}" y="${num(e.qy)}" class="nt-qual" text-anchor="${e.qAnchor || 'start'}">${esc(e.qualifier)}</text>` : '';
    const card = e.cardinality ? `<text x="${num(e.cfx)}" y="${num(e.cfy)}" class="nt-card">${esc(e.cardinality.from)}</text><text x="${num(e.ctx)}" y="${num(e.cty)}" class="nt-card">${esc(e.cardinality.to)}</text>` : '';
    const cross = e.crossing && Number.isFinite(e.mx) ? `<circle cx="${num(e.mx)}" cy="${num(e.my)}" r="4.5" class="nt-cross"/><path d="${e.mh ? `M${num(e.mx - 3)} ${num(e.my - 3)}L${num(e.mx + 3)} ${num(e.my + 3)}` : `M${num(e.mx - 3)} ${num(e.my + 3)}L${num(e.mx + 3)} ${num(e.my - 3)}`}" stroke="#a06f92" stroke-width="1.4"/>` : '';
    const said = describeEdge(D, e.id) + (b ? drawingNote(e, b) : '');
    // On screen the hit area is drawn after the elements (see `hits`), so the keyboard reaches the
    // elements first and the relationships after them; the picture itself carries the reading as a title.
    if (interactive) hitList.push(`<path class="nt-hit" d="${d}" data-nt-edge="${esc(e.id)}" role="button" tabindex="0" aria-label="${esc(said)}"><title>${esc(said)}</title></path>`);
    const hit = interactive ? '' : `<title>${esc(said)}</title>`;
    const trunk = b && !started.has(b.id) ? (started.add(b.id), bundleSVG(b)) : '';
    // Its two ends as the picture draws them (round 24): a reader of the file finds both among the elements it draws.
    return `${trunk}<g class="${cls}" data-nt-edge="${esc(e.id)}" data-nt-from="${esc(e.from)}" data-nt-to="${esc(e.to)}"${b ? ` data-nt-bundle="${esc(b.id)}"` : ''}><path class="nt-line" d="${line}" stroke="${st.stroke}"${gapOf.get(e) || ''}${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${phase ? ` stroke-dashoffset="${num(phase)}"` : ''}${head ? ` marker-end="${head}"` : ''}${tail ? ` marker-start="${tail}"` : ''}/>${hit}${label}${qual}${card}${cross}</g>`;
  }).join('');
  const nodes = L.nodes.map(b => {
    const n = nodeOf.get(b.id); if (!n) return '';
    const k = KINDS[n.kind], fam = n.fold && n.kind === 'outcome' ? 'intent' : k.family, v = vitals?.get?.(n.id) || null, m = mk?.get(n.id) || null, paint = m ? nodeMarkSVG(m, b.w, b.h, prefix) : null;
    const change = diff && n.change && !(D.diffBy === 'alternative' && n.change === 'changed') ? n.change : null;
    const cls = `nt-node nt-${fam}${n.fold ? ' nt-fold' : ''}${n.hatched ? ' hatched' : ''}${sel === n.id ? ' sel' : ''}${b.pinned ? ' pinned' : ''}${change ? ' ' + change : ''}${v ? ' nt-v-' + v.state : ''}${n.kind === 'task' ? ' nt-task' : ''}${m ? ' ' + nodeMarkClass(m) : ''}`;
    // Far out the screen draws only the name, large enough to read (semantic zoom); an export never shows it. A part that
    // carries vitals keeps its state line too (the Running board's state in words).
    const ftext = farText === 'ref' && n.ref ? n.ref : n.title, flh = far * 1.08;
    const farTitle = (w, top, h) => { const max = Math.max(1, Math.min(3, Math.floor((h - 4) / flh))), lines = wrapText(ftext, w, far, max); return `<text class="nt-ftitle" text-anchor="middle" font-size="${num(far)}">${tspans(lines, b.w / 2, top + h / 2 - (lines.length - 1) * flh / 2 + far * 0.36, flh)}</text>`; };
    const marked = paint ? paint.badge : '', ring = paint ? paint.ring : '';
    const attrs = interactive ? ` role="button" tabindex="0" aria-label="${esc((n.kicker || k.short) + ' ' + n.title + (n.ref ? ' ' + n.ref : ''))}" aria-describedby="${prefix}-d-${esc(cssId(n.id))}" data-sel="${esc(n.id)}"${n.sol ? ` data-sol="${esc(n.sol)}"` : ''}` : '';
    const open = `<g class="${cls}" data-nt-node="${esc(n.id)}"${attrs} transform="translate(${num(b.x)} ${num(b.y)})">${ring}`;
    const glyphTitle = n.glyph ? `<title>${esc(glyphWords(n).replace(/\.$/, '') + ': ' + n.title)}</title>` : '';
    // An exported picture names every element it draws in a title (round 24: a reader of the file finds one on each); on
    // screen the element's label and description carry its name, and a title says only what the box shortens.
    const named = (shown = '') => (interactive ? shown : `<title>${esc(nodeSaid(n))}</title>`);
    if (isListBox(n)) {
      // A folded group (round 24, D-24-07): a list box with its kind band, its title, its counts and up to six of its
      // members, then "and N more" (notation-layout.js listBox: the lines and where they stand, as the layout sized them).
      const B = listBox(n, SUBPX, b.w), fill = FAMILY_FILL[fam] || '#eee', left = B.compact ? 8 : 10;
      // (an item's count at the right of its line: a sub-module's requirements, round 24)
      const items = B.items.map((x, i) => `<text x="${left}" y="${num(B.at(i))}" class="nt-sub nt-li">${x.ref ? `<tspan class="nt-li-ref">${esc(x.ref)}</tspan>${esc(x.text.slice(x.ref.length))}` : esc(x.text)}</text>${x.n ? `<text x="${num(b.w - 8)}" y="${num(B.at(i))}" class="nt-sub nt-li-n" text-anchor="end">${esc(x.n)}</text>` : ''}`).join('') + (B.more ? `<text x="${left}" y="${num(B.at(B.items.length))}" class="nt-sub nt-li nt-li-more">${esc(B.more)}</text>` : '');
      // A compact listing (the module map's modules): no kind band; the title and its count on the first line, a rule, the
      // parts, and its note (what a platform module serves) as a last line.
      const note = B.note ? `<text x="${left}" y="${num(B.at(B.items.length + (B.more ? 1 : 0)))}" class="nt-sub nt-li nt-li-more">${esc(B.note)}</text>` : '';
      if (B.compact) return `${open}<rect class="nt-box" width="${num(b.w)}" height="${num(b.h)}" rx="3" fill="${fill}"/><g class="nt-clip" clip-path="url(#${clip(b.w, b.h)})">${B.own ? `<text x="${num(b.w - 8)}" y="${num(B.titleY)}" class="nt-sub nt-li-n nt-li-own" text-anchor="end">${esc(B.own)}</text>` : ''}${B.rule ? `<path class="nt-li-rule" d="M6 ${num(B.rule)}H${num(b.w - 6)}"/>` : ''}${items}${note}</g><text class="nt-title nt-title-start">${tspans(B.lines, 8, B.titleY, 14)}</text>${farTitle(b.w - 12, 2, b.h - 4)}${marked}${named(n.fullTitle && n.fullTitle !== n.title ? `<title>${esc(n.fullTitle)}</title>` : '')}</g>`;
      // A type group far out (rc39, the Layers overview): its name in the upper half and its counts in the lower half, so a
      // lane reads its groups and their sizes at the overview's scale; nearer, the members list as the layout sized them.
      return `${open}<rect class="nt-box" width="${num(b.w)}" height="${num(b.h)}" rx="3" fill="${fill}"/><rect class="nt-kband" y="3" width="${num(b.w)}" height="14"/>${icon(fam, 5, 2, 12)}<g class="nt-clip" clip-path="url(#${clip(b.w, b.h)})"><text x="20" y="11.5" class="nt-kicker">${esc(kickerOf(n, b.w))}</text>${n.sub ? `<text x="${num(b.w / 2)}" y="${num(B.subY)}" class="nt-sub" text-anchor="middle">${esc(wrapText(n.sub, b.w - 16, SUBPX, 1)[0])}</text>` : ''}<path class="nt-li-rule" d="M8 ${num(B.rule)}H${num(b.w - 8)}"/>${items}</g><text class="nt-title" text-anchor="middle">${tspans(B.lines, b.w / 2, 32, 14)}</text>${(n.fold && n.sub ? farTitle(b.w - 12, 2, b.h / 2 + 2) + `<text class="nt-ftitle nt-fsub nt-fgsub" text-anchor="middle" font-size="${num(far * 0.78)}">${tspans(wrapText(n.sub, b.w - 12, far * 0.78, 1), b.w / 2, b.h * 0.78 + far * 0.28, flh)}</text>` : farTitle(b.w - 12, 2, b.h - 4))}${marked}${named(n.fullTitle && n.fullTitle !== n.title ? `<title>${esc(n.fullTitle)}</title>` : '')}</g>`;
    }
    if (n.kind === 'event') {
      // The ring says where the event sits (start thin, intermediate and boundary double, end thick); the mark inside says what kind it is.
      const g = n.glyph || {}, r = b.w / 2 - 2, cx = b.w / 2, cy = b.h / 2, pos = g.position || 'intermediate';
      const ring = pos === 'end' ? `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" class="nt-ev nt-ev-end" stroke-width="3.5"/>` : pos === 'start' ? `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" class="nt-ev nt-ev-start" stroke-width="1.4"/>` : `<circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r)}" class="nt-ev nt-ev-${pos}" stroke-width="1.4"/><circle cx="${num(cx)}" cy="${num(cy)}" r="${num(r - 3.5)}" class="nt-ev nt-ev-inner" stroke-width="1.4"${pos === 'boundary' ? ' stroke-dasharray="3 2"' : ''}/>`;
      return `${open}${ring}${eventMark(g.eventType, cx, cy, r)}<text x="${num(b.w / 2)}" y="${num(b.h + 13)}" class="nt-cap" text-anchor="middle">${tspans(wrapText(n.title, 130, 10, 2), b.w / 2, b.h + 13, 12)}</text>${farTitle(160, b.h + 2, flh * 2 + 6)}${marked}${glyphTitle || named()}</g>`;
    }
    if (n.kind === 'gateway') return `${open}<path d="M${num(b.w / 2)} 0L${num(b.w)} ${num(b.h / 2)}L${num(b.w / 2)} ${num(b.h)}L0 ${num(b.h / 2)}z" class="nt-gw"/>${gatewayMark(n.glyph?.gatewayType, b.w / 2, b.h / 2, b.w / 2)}<text x="${num(b.w / 2)}" y="${num(b.h + 13)}" class="nt-cap" text-anchor="middle">${tspans(wrapText(n.title, 130, 10, 2), b.w / 2, b.h + 13, 12)}</text>${farTitle(160, b.h + 2, flh * 2 + 6)}${marked}${glyphTitle || named()}</g>`;
    const fill = n.hatched ? `url(#${prefix}-hatch)` : (FAMILY_FILL[fam] || '#eee');
    if (n.kind === 'task') { const lines = wrapText(n.title, b.w - 16, 11.5, 2); return `${open}<rect class="nt-box" width="${num(b.w)}" height="${num(b.h)}" rx="8" fill="${fill}"/><text class="nt-title" text-anchor="middle">${tspans(lines, b.w / 2, b.h / 2 + 4 - (lines.length - 1) * 7, 14)}</text>${farTitle(b.w - 10, 0, b.h)}${marked}${named(n.sub ? `<title>${esc(n.sub)}</title>` : '')}</g>`; }
    // A collapsed sub-process (round 6): a task with the standard's + marker at its foot and its count in the sub-line.
    if (n.kind === 'subprocess') { const lines = wrapText(n.title, b.w - 16, 11.5, 2); return `${open}<rect class="nt-box" width="${num(b.w)}" height="${num(b.h)}" rx="8" fill="${fill}"/><text class="nt-title" text-anchor="middle">${tspans(lines, b.w / 2, b.h / 2 - 2 - (lines.length - 1) * 7, 14)}</text>${n.sub ? `<text x="${num(b.w / 2)}" y="${num(b.h - 15)}" class="nt-sub" text-anchor="middle">${esc(wrapText(n.sub, b.w - 40, SUBPX, 1)[0])}</text>` : ''}<rect x="${num(b.w / 2 - 7)}" y="${num(b.h - 13)}" width="14" height="12" rx="2" class="nt-subbox"/><path d="M${num(b.w / 2)} ${num(b.h - 11)}v8M${num(b.w / 2 - 4)} ${num(b.h - 7)}h8" stroke="#3b4741" stroke-width="1.4"/>${farTitle(b.w - 10, 0, b.h)}${marked}${named()}</g>`; }
    // A state (round 6): a rounded box with the state word, its data definition's field in the sub-line.
    if (n.kind === 'state') { const lines = wrapText(n.title, b.w - 20, NL.TITLE, 2); return `${open}<rect class="nt-box nt-state" width="${num(b.w)}" height="${num(b.h)}" rx="${num(Math.min(18, b.h / 2))}" fill="${fill}"/><text class="nt-title" text-anchor="middle">${tspans(lines, b.w / 2, b.h / 2 + 4 - (lines.length - 1) * 7 - (n.sub ? 5 : 0), 14)}</text>${n.sub ? `<text x="${num(b.w / 2)}" y="${num(b.h / 2 + 15)}" class="nt-sub" text-anchor="middle">${esc(wrapText(n.sub, b.w - 20, SUBPX, 1)[0])}</text>` : ''}${farTitle(b.w - 12, 2, b.h - 4)}${marked}${named()}</g>`; }
    const lines = wrapText(n.title, b.w - 16, NL.TITLE, 3), titleY = 20 + 12;
    const subY = titleY + (lines.length - 1) * 14 + 13, refW = n.ref ? Math.round(n.ref.length * REFPX + 8) : 0;
    const badge = v ? `<g class="nt-vbadge-g" transform="translate(${num(b.w - 10)} -1)"><g class="nt-vbadge-s"><rect class="nt-vbadge-bg ${esc(v.state)}" x="-10" y="-7" width="20" height="14" rx="7"/><text class="nt-vbadge" x="0" y="4" text-anchor="middle">${esc(String(v.count ?? ''))}</text></g><title>${esc(v.text || '')}</title></g>` : '';
    // The standard's fill, with the record type's ink as the top edge (the colour the explorer, the anatomy and the chapter maps give the same record).
    const ink = TYPE_INK[n.type] ? `<rect class="nt-ink" x="0.5" y="0.5" width="${num(b.w - 1)}" height="3" fill="${TYPE_INK[n.type]}"/>` : '';
    // A technology icon (round 6, Contract F) stands in the glyph slot when the node names one the picture carries; the
    // screen shows it from zoom 0.8 (notation.css), an export always.
    const iconPath = n.icon && D.icons?.[n.icon]?.path ? D.icons[n.icon].path : null;
    const glyphSlot = iconPath ? `<g class="nt-icon" transform="translate(5 2) scale(0.5)" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${esc(iconPath)}"/><title>${esc(D.icons[n.icon].title || n.icon)}</title></g>` : icon(fam, 5, 2, 12);
    // The element type and the sub-line sit in a clip of the box: the screen may enlarge them to stay legible.
    return `${open}<rect class="nt-box" width="${num(b.w)}" height="${num(b.h)}" rx="3" fill="${fill}"/><rect class="nt-kband" y="3" width="${num(b.w)}" height="14"/>${ink}${glyphSlot}<g class="nt-clip" clip-path="url(#${clip(b.w, b.h)})"><text x="20" y="11.5" class="nt-kicker">${esc(kickerOf(n, b.w))}</text>${n.sub ? `<text x="${num(b.w / 2)}" y="${num(subY)}" class="nt-sub" text-anchor="middle">${esc(wrapText(n.sub, b.w - 16, SUBPX, 1)[0])}</text>` : ''}</g><text class="nt-title" text-anchor="middle">${tspans(lines, b.w / 2, titleY, 14)}</text>${v && n.sub ? farTitle(b.w - 12, 2, b.h / 2 - 2) + `<text class="nt-ftitle nt-fsub" text-anchor="middle" font-size="${num(far)}">${tspans(wrapText(n.sub, b.w - 12, far, 1), b.w / 2, b.h * 0.75 + far * 0.36, flh)}</text>` : farTitle(b.w - 12, 2, b.h - 4)}${n.ref ? `<rect class="nt-refbg" x="${num(b.w - refW - 3)}" y="${num(b.h - 13)}" width="${refW}" height="11" rx="2"/><text x="${num(b.w - 5)}" y="${num(b.h - 4)}" class="nt-ref" text-anchor="end">${esc(n.ref)}</text>` : ''}${badge}${marked}${named(n.fullTitle && n.fullTitle !== n.title ? `<title>${esc(n.fullTitle)}</title>` : '')}</g>`;
  }).join('');
  // Callouts: numbered marks anchored to an element with a leader, by severity.
  const perTarget = new Map();
  const co = callouts.map(c => { const b = L.nodes.find(n => n.id === c.targetId); if (!b) return ''; const k = perTarget.get(c.targetId) || 0; perTarget.set(c.targetId, k + 1); const cx = b.x + b.w + 10 - k * 20, cy = b.y - 6; return `<g class="nt-callout sev-${esc(c.severity || 'high')}${c.proposed ? ' proposed' : ''}" data-nt-callout="${esc(c.id)}"><line x1="${num(b.x + b.w - 4)}" y1="${num(b.y + 4)}" x2="${num(cx - 7)}" y2="${num(cy + 5)}"/><g class="nt-co-s"><circle cx="${num(cx)}" cy="${num(cy)}" r="8"/><text x="${num(cx)}" y="${num(cy + 3)}" text-anchor="middle">${esc(String(c.n))}</text></g><title>${esc(c.text)}</title></g>`; }).join('');
  const descs = interactive ? `<g class="nt-descs" aria-hidden="false">${D.nodes.map(n => `<desc id="${prefix}-d-${esc(cssId(n.id))}">${esc(describeNode(D, n.id))}</desc>`).join('')}</g>` : '';
  // The lift (round 10, interactive only, never in an export): the whole route of every selected, lit or traced
  // relationship, for the screen to draw over the picture (N6 composes it).
  const lift = interactive ? liftSVG(D, L, L.edges.filter(e => stateOf(e) === 'sel' || stateOf(e) === 'lit' || mkOf(e) === ' nt-mk-lit').map(e => e.id), {sel, selEdge, marks: mk}) : '';
  return {defs: defs(prefix, new Set([...D.edges.map(e => e.kind), ...(seq ? ['sequence'] : [])]), gaps, L, clips), bands, groups: lifelines + groups, edges, nodes, hits: hitList.length ? `<g class="nt-hits">${hitList.join('')}${bhits.join('')}</g>` : '', callouts: co, descs, ghosts: mk ? ghostsSVG(mk, L, D, {prefix, far}) : '', lift};
}
export const FAR = 19;

// The lift (round 10): the whole route of each relationship named, over the picture in its state colour (selected or lit
// gold, traced violet), with its own dash in step with the lines beneath it, so a relationship drawn partly on a shared
// trunk shows all of its way; a selected one is ringed at both ends (a cue beyond colour). Nothing in it takes the
// pointer or speaks (the relationship's own hit carries its reading), and it never reaches an export. Selected ones come
// last, on top.
export function liftSVG(D, L, ids, {sel = null, selEdge = null, marks = null} = {}) {
  if (!D || !L || !ids?.length) return '';
  const want = new Set(ids), seq = D.scene?.id === 'sequence', mk = marks instanceof Map && marks.size ? marks : null, lineOf = new Map();
  for (const b of drawnBundles(L)) for (const id of b.members) lineOf.set(id, b);
  const out = [];
  for (const e of L.edges) {
    if (!want.has(e.id) || !(e.pts?.length > 1)) continue;
    const st = drawStyle(e, seq), traced = mk && edgeMarkClass(mk.get(e.from), mk.get(e.to)) === ' nt-mk-lit', isSel = selEdge === e.id;
    const cls = [isSel ? 'sel' : sel && (e.from === sel || e.to === sel) ? 'lit' : '', traced ? 'nt-mk-lit' : ''].filter(Boolean).join(' ') || 'lit';
    // A fan-in member's route runs towards its bundle's shared port: its dash is mirrored to meet the trunk's.
    const phase = st.dash && lineOf.get(e.id)?.end === 'to' ? inwardPhase(st.dash, polyLen(e.pts)) : 0, [a, z] = [e.pts[0], e.pts[e.pts.length - 1]];
    out.push([isSel ? 1 : 0, `<path class="${esc(cls)}" d="${pathD(e.pts)}" data-nt-lift="${esc(e.id)}"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${phase ? ` stroke-dashoffset="${num(phase)}"` : ''}/>${isSel ? `<circle class="nt-end" cx="${num(a[0])}" cy="${num(a[1])}" r="4"/><circle class="nt-end" cx="${num(z[0])}" cy="${num(z[1])}" r="4"/>` : ''}`]);
  }
  return out.length ? `<g class="nt-lift" aria-hidden="true" pointer-events="none">${out.filter(o => !o[0]).concat(out.filter(o => o[0])).map(o => o[1]).join('')}</g>` : '';
}

// ---------------------------------------------------------------- marks on the picture (round 5, Contract M)
// One painting for every picture and the export: a check state is its glyph (and, near enough, its word) in the
// shared colours; changed is a ring; traced is a ring with its relationships lit; dimmed lowers the opacity; a ghost is
// a hatched outline, or — for a proposal the picture does not hold — a hatched element of its own beside its anchor.
// The glyph and word come with the mark (model-marks.js takes them from readiness-model.js).
const MARK_CLASSES = ['nt-mk-traced', 'nt-mk-changed', 'nt-mk-fix', 'nt-mk-confirm', 'nt-mk-pass', 'nt-mk-dimmed', 'nt-mk-ghost'];
export const markClassList = MARK_CLASSES;
export function nodeMarkClass(m) { return [m?.state ? 'nt-mk-' + m.state : '', m?.dimmed ? 'nt-mk-dimmed' : '', m?.ghost ? 'nt-mk-ghost' : ''].filter(Boolean).join(' '); }
export function edgeMarkClass(a, b) { return a?.state === 'traced' && b?.state === 'traced' ? ' nt-mk-lit' : a?.dimmed || b?.dimmed ? ' nt-mk-dim' : ''; }
const markTitle = m => [m.glyph ? m.glyph + ' ' + m.word : m.word, ...m.notes.map(n => n.note).filter(Boolean)].filter(Boolean).join(' · ');
export function nodeMarkSVG(m, w, h, prefix = 'nt') {
  if (!m) return {ring: '', badge: ''};
  const ring = (m.state === 'changed' || m.state === 'traced' ? `<rect class="nt-mk nt-mk-ring ${m.state}" x="-5" y="-5" width="${num(w + 10)}" height="${num(h + 10)}" rx="7"/>` : '')
    + (m.ghost ? `<rect class="nt-mk nt-mk-ghostline" x="-6" y="-6" width="${num(w + 12)}" height="${num(h + 12)}" rx="8" stroke="url(#${prefix}-hatch)"/>` : '');
  if (!m.glyph) return {ring, badge: ''};
  const word = m.word || '', ww = Math.round(charW(word, 9.5) + 26), t = `<title>${esc(markTitle(m))}</title>`;
  // Far out the glyph alone; nearer, the glyph and its word — both at the bottom-left corner (rc41, W1; PLAN §2 W1.6: was
  // the far glyph at the top-left corner, over the element's type and title), one of them drawn at a time (notation.css by
  // zoom level). The screen keeps both at a legible size whatever the zoom; an export draws the nearer one.
  const badge = `<g class="nt-mk nt-mk-badge nt-mk-far ${m.state}" data-nt-mark="${esc(m.state)}" transform="translate(0 ${num(h)})"><g class="nt-mk-s"><circle class="nt-mk-bg" r="8"/><text class="nt-mk-glyph" y="3.8" text-anchor="middle">${esc(m.glyph)}</text></g>${t}</g>`
    + `<g class="nt-mk nt-mk-badge nt-mk-near ${m.state}" data-nt-mark="${esc(m.state)}" transform="translate(0 ${num(h)})"><g class="nt-mk-s"><rect class="nt-mk-bg" x="-6" y="-8" width="${ww}" height="16" rx="8"/><text class="nt-mk-glyph" x="2" y="3.8" text-anchor="middle">${esc(m.glyph)}</text><text class="nt-mk-word" x="11" y="3.4">${esc(word)}</text></g>${t}</g>`;
  return {ring, badge};
}
// Proposals not yet saved that the picture does not hold: a hatched element below the element they concern.
export function ghostsSVG(marks, L, D, {prefix = 'nt', far = FAR} = {}) {
  const drawn = new Set(D.nodes.map(n => n.id)), at = new Map(L.nodes.map(b => [b.id, b])), out = [], below = new Map();
  for (const m of marks.values()) {
    if (!m.ghost || drawn.has(m.id) || !m.anchor || !at.has(m.anchor)) continue;
    const b = at.get(m.anchor), k = below.get(m.anchor) || 0; below.set(m.anchor, k + 1);
    const x = b.x + 10 + k * 14, y = b.y + b.h + 12 + k * 8, w = Math.max(120, b.w - 20), h = 38, title = m.title || m.note || 'Proposal';
    out.push(`<g class="nt-ghost" data-nt-ghost="${esc(m.id)}"><line x1="${num(b.x + b.w / 2)}" y1="${num(b.y + b.h)}" x2="${num(x + w / 2)}" y2="${num(y)}"/><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${h}" rx="4" fill="url(#${prefix}-hatch)"/><text class="nt-title" text-anchor="middle">${tspans(wrapText(title, w - 12, 11.5, 2), x + w / 2, y + 16, 13)}</text><text class="nt-ftitle" text-anchor="middle" font-size="${num(far)}">${tspans(wrapText(title, w - 8, far, 1), x + w / 2, y + h / 2 + far * 0.36, far)}</text><title>${esc('Proposed, not saved: ' + title + (m.note && m.note !== title ? ' · ' + m.note : ''))}</title></g>`);
  }
  return out.length ? `<g class="nt-ghosts">${out.join('')}</g>` : '';
}
// The marks the Key lists: each state drawn, with its glyph, its words and how many elements carry it. A source may name
// its own words (an alternative's "Changed by this alternative", a trace's "On the trace from REQ-001").
export function marksLegend(marks, D, words = {}) {
  if (!(marks instanceof Map) || !marks.size || !D) return [];
  const drawn = new Set(D.nodes.map(n => n.id)), count = {}, ghostsAway = [...marks.values()].filter(m => m.ghost && !drawn.has(m.id) && m.anchor && drawn.has(m.anchor)).length;
  for (const id of drawn) { const m = marks.get(id); if (!m) continue; if (m.state) count[m.state] = (count[m.state] || 0) + 1; if (m.dimmed) count.dimmed = (count.dimmed || 0) + 1; if (m.ghost) count.ghost = (count.ghost || 0) + 1; }
  if (ghostsAway) count.ghost = (count.ghost || 0) + ghostsAway;
  const say = {pass: 'passing', fix: 'to fix', confirm: 'to confirm', changed: 'Changed', traced: 'On the trace', dimmed: 'Off the trace, dimmed', ghost: 'Proposed, not saved', ...words};
  return ['traced', 'changed', 'fix', 'confirm', 'pass', 'ghost', 'dimmed'].filter(s => count[s]).map(state => ({state, count: count[state], glyph: [...marks.values()].find(m => m.state === state)?.glyph || '', text: say[state]}));
}
export const cssId = id => String(id).replace(/[^\w-]/g, ch => '_' + ch.charCodeAt(0).toString(16));

// The Key as SVG, under the picture, from the legend data: one entry per element kind drawn, per
// relationship family drawn (with its line and ends), the containers and the marks in use, set in
// as many columns as the page width holds.
const KEY_WRAP = new Set(['bundle', 'tree', 'duplicate']), KEY_LINE = 380;
function keySVG(D, x, y, w, prefix, marks = null, markWords = {}, L = null) {
  const K = legendData(D, L), entries = [], ROW = 16, MK = marksLegend(marks, D, markWords);
  const head = t => entries.push({h: ROW + 2, head: true, draw: (cx, cy) => `<text x="${num(cx)}" y="${num(cy)}" class="nt-key-h">${esc(t)}</text>`});
  // A scene whose boxes say what they are (round 24: the C4 component level by module, whose boxes carry their kind) keys
  // its lines and marks alone (D.key 'lines'), and one whose bands name every box (the module map, the container level by
  // module) its lines alone (D.key 'relationships'), so that its page holds the boxes.
  const only = D.key === 'lines' || D.key === 'relationships', bare = D.key === 'relationships';
  if (!only) head('Elements');
  for (const el of only ? [] : K.elements) entries.push({h: ROW, w: 34 + charW(el.kicker + ' ×00', 10.5), draw: (cx, cy) => (el.bpmn ? (el.kind === 'event' ? `<circle cx="${num(cx + 9)}" cy="${num(cy - 4)}" r="5" class="nt-ev"/>` : el.kind === 'gateway' ? `<path d="M${num(cx + 9)} ${num(cy - 10)}l6 6-6 6-6-6z" class="nt-gw"/>` : `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="4" fill="${FAMILY_FILL['bpmn-task']}" stroke="#5a6a63"/>`) : `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="${FAMILY_FILL[el.family] || '#eee'}" stroke="#5a6a63"/>${icon(el.family, cx + 4, cy - 9, 10)}`) + `<text x="${num(cx + 24)}" y="${num(cy)}" class="nt-key">${esc(el.kicker)}${el.count > 1 ? ` <tspan class="nt-key-s">×${el.count}</tspan>` : ''}</text>`});
  if (K.groups.length && !only) entries.push({h: ROW, w: 40 + charW('Containers: ' + K.groups.map(g => g.label).join(', '), 10.5), draw: (cx, cy) => `<rect x="${num(cx)}" y="${num(cy - 10)}" width="22" height="12" rx="3" fill="#f7f8f4" stroke="#9aa79e"/><text x="${num(cx + 28)}" y="${num(cy)}" class="nt-key">Containers: ${esc(K.groups.map(g => g.label).join(', '))}</text>`});
  if (D.layerSummary) {
    head('Between the lanes');
    entries.push({h: ROW, w: 600, draw: (cx, cy) => `<text x="${num(cx)}" y="${num(cy)}" class="nt-key">${esc(`${D.layerSummary.total} recorded relationships drawn as ${D.edges.length} counted lines between ${D.nodes.length} type groups. Show every element opens individual records in AIW.`)}</text>`});
  }
  if (K.relationships.length) head('Relationships');
  for (const r of K.relationships) {
    const st = r.style, hd = markerRef(prefix, st.head, st.stroke), tl = markerRef(prefix, st.tail, st.stroke);
    const words = r.kinds.map(k => k.label).join(', '), extra = r.flowWords.length ? ` (${r.flowWords.join(' · ')})` : '', types = [...new Set(r.kinds.map(k => k.archimate))].join(', ');
    entries.push({h: ROW, w: 50 + charW(words, 10.5) + charW(' · ' + (r.title.split(' · ')[1] || r.title) + extra + ' · ' + types, 10), draw: (cx, cy) => `<path d="M${num(cx + 4)} ${num(cy - 4)}H${num(cx + 36)}" fill="none" stroke="${st.stroke}" stroke-width="1.3"${st.dash ? ` stroke-dasharray="${st.dash}"` : ''}${hd ? ` marker-end="${hd}"` : ''}${tl ? ` marker-start="${tl}"` : ''}/><text x="${num(cx + 44)}" y="${num(cy)}" class="nt-key">${esc(words)}<tspan class="nt-key-s"> · ${esc(r.title.split(' · ')[1] || r.title)}${esc(extra)} · ${esc(types)}</tspan></text>`});
  }
  // The BPMN glyphs and the technology icons drawn (round 6), each with its words.
  if (K.glyphs?.length && !only) head('Glyphs');
  for (const g of only ? [] : K.glyphs || []) {
    const [what, a, b] = g.id.split(':');
    const sample = (cx, cy) => (what === 'gateway' ? `<path d="M${num(cx + 9)} ${num(cy - 11)}l7 7-7 7-7-7z" class="nt-gw"/><g class="nt-bpmn-gateway">${gatewayMark(a, cx + 9, cy - 4, 7)}</g>` : `<circle cx="${num(cx + 9)}" cy="${num(cy - 4)}" r="6.5" class="nt-ev" stroke-width="${a === 'end' ? 2.6 : 1.2}"/>${a === 'intermediate' || a === 'boundary' ? `<circle cx="${num(cx + 9)}" cy="${num(cy - 4)}" r="4.5" class="nt-ev nt-ev-inner" stroke-width="1.2"${a === 'boundary' ? ' stroke-dasharray="2 1.5"' : ''}/>` : ''}<g class="nt-bpmn-event">${eventMark(b, cx + 9, cy - 4, 6.5)}</g>`);
    entries.push({h: ROW, w: 34 + charW(g.text + ' ×00', 10.5), draw: (cx, cy) => `${sample(cx, cy)}<text x="${num(cx + 24)}" y="${num(cy)}" class="nt-key">${esc(g.text)}${g.count > 1 ? ` <tspan class="nt-key-s">×${g.count}</tspan>` : ''}</text>`});
  }
  if (K.icons?.length && !only) head('Icons');
  for (const i of only ? [] : K.icons || []) entries.push({h: ROW, w: 34 + charW(i.title + ' ×00', 10.5), draw: (cx, cy) => `${i.path ? `<g transform="translate(${num(cx + 2)} ${num(cy - 12)}) scale(0.55)" fill="none" stroke="#3b4741" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${esc(i.path)}"/></g>` : ''}<text x="${num(cx + 24)}" y="${num(cy)}" class="nt-key">${esc(i.title)}${i.count > 1 ? ` <tspan class="nt-key-s">×${i.count}</tspan>` : ''}</text>`});
  if (K.marks.length && !bare) head('Marks');
  for (const m of bare ? [] : K.marks) {
    const sample = (cx, cy) => (m.id === 'separation' ? `<path d="M${num(cx)} ${num(cy - 4)}h7m6 0h6M${num(cx + 10)} ${num(cy - 10)}v12" fill="none" stroke="#3c4a44" stroke-width="1.3"/>` : m.id === 'hatched' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="url(#${prefix}-hatch)" stroke="#5a6a63" stroke-dasharray="3 2"/>` : m.id === 'reply' ? `<path d="M${num(cx + 2)} ${num(cy - 4)}H${num(cx + 18)}" stroke="#3c4a44" stroke-width="1.3" stroke-dasharray="5 3"/>` : m.id === 'untyped' ? `<text x="${num(cx)}" y="${num(cy)}" class="nt-qual">assoc.</text>` : m.id === 'weak' ? `<path d="M${num(cx + 2)} ${num(cy - 4)}H${num(cx + 18)}" stroke="#3c4a44" stroke-width="1.3" opacity=".5"/>` : m.id === 'crossing' ? `<circle cx="${num(cx + 9)}" cy="${num(cy - 4)}" r="4.5" class="nt-cross"/>` : m.id === 'step' ? `<text x="${num(cx + 4)}" y="${num(cy)}" class="nt-elabel"><tspan class="nt-step">1</tspan></text>` : m.id === 'qualifier' ? `<text x="${num(cx)}" y="${num(cy)}" class="nt-qual">abc</text>` : m.id === 'cardinality' ? `<text x="${num(cx)}" y="${num(cy)}" class="nt-card">1 : n</text>` : m.id === 'added' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="#fff" stroke="#2f6b4f" stroke-width="2"/>` : m.id === 'removed' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="#fff" stroke="#8a8f8c" stroke-dasharray="3 3"/>` : m.id === 'changed' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="#fff" stroke="#bb8628" stroke-width="2"/>` : m.id === 'bundle' || m.id === 'tree' ? `<path d="M${num(cx)} ${num(cy - 8)}H${num(cx + 19)}M${num(cx + 9)} ${num(cy - 8)}V${num(cy + 1)}" fill="none" stroke="#3c4a44" stroke-width="1.3"/>${m.id === 'bundle' ? `<circle class="nt-join" cx="${num(cx + 9)}" cy="${num(cy - 8)}" r="2.4" fill="#3c4a44"/>` : ''}` : m.id === 'duplicate' ? `<path d="M${num(cx)} ${num(cy - 4)}H${num(cx + 19)}" fill="none" stroke="#3c4a44" stroke-width="1.3"/>` : '');
    // The round-10 marks (lines drawn together) are explained in a sentence or two: wrapped, so the Key keeps its columns.
    const lines = KEY_WRAP.has(m.id) ? wrapText(m.text, KEY_LINE, 10.5, 8) : [m.text];
    entries.push({h: ROW + (lines.length - 1) * 13, w: 34 + Math.max(...lines.map(l => charW(l, 10.5))), draw: (cx, cy) => `${sample(cx, cy)}<text x="${num(cx + 24)}" y="${num(cy)}" class="nt-key">${lines.length > 1 ? tspans(lines, cx + 24, cy, 13) : esc(m.text)}</text>`});
  }
  if (MK.length && !only) head('On the picture');
  for (const m of only ? [] : MK) {
    const text = (m.glyph ? m.text : m.text) + (m.count > 1 ? ' ×' + m.count : ''), fillOf = {fix: '#b0493a', confirm: '#94650f', pass: '#2f6b4f'};
    const sample = (cx, cy) => (m.glyph ? `<circle cx="${num(cx + 9)}" cy="${num(cy - 4)}" r="7" fill="${fillOf[m.state]}"/><text x="${num(cx + 9)}" y="${num(cy - 0.5)}" text-anchor="middle" class="nt-mk-glyph">${esc(m.glyph)}</text>` : m.state === 'ghost' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="url(#${prefix}-hatch)" stroke="#a8741f" stroke-dasharray="3 2"/>` : m.state === 'dimmed' ? `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="2" fill="#c7d3e6" opacity=".25" stroke="#5a6a63"/>` : `<rect x="${num(cx)}" y="${num(cy - 10)}" width="18" height="12" rx="3" fill="#fff" stroke="${m.state === 'traced' ? '#7a4fb0' : '#2c6f9c'}" stroke-width="2.4"/>`);
    entries.push({h: ROW, w: 34 + charW(text, 10.5), draw: (cx, cy) => `${sample(cx, cy)}<text x="${num(cx + 24)}" y="${num(cy)}" class="nt-key">${esc(text)}</text>`});
  }
  // (a key of lines alone, for a picture that draws none, is no key at all)
  if (!entries.length) return {markup: '', h: 0};
  // Columns: as many as fit at 330 px, filled top to bottom with about the same number of rows.
  const widest = Math.max(240, ...entries.map(e => e.w || 0));
  const cols = Math.max(1, Math.min(4, Math.floor((w - 24) / (widest + 24)))), total = entries.reduce((s, e) => s + e.h, 0), per = Math.max(ROW * 4, Math.ceil(total / cols));
  const colW = Math.floor((w - 24) / cols), out = []; let col = 0, cy = y + 24, tallest = 0;
  // A heading never ends a column: it moves with the entry under it; and a column that begins inside a section says the
  // section's heading again, so no entry stands without its heading.
  let heading = null;
  entries.forEach((e, i) => {
    const need = e.h + (e.head && entries[i + 1] ? entries[i + 1].h : 0);
    if (cy + need - (y + 24) > per + ROW && col < cols - 1 && cy > y + 24) { col++; cy = y + 24; if (heading && !e.head) { out.push(heading.draw(x + 12 + col * colW, cy)); cy += heading.h; } }
    if (e.head) heading = e;
    out.push(e.draw(x + 12 + col * colW, cy)); cy += e.h; tallest = Math.max(tallest, cy);
  });
  const h = tallest - y + 4;
  return {markup: `<g class="nt-keygroup"><rect x="${num(x)}" y="${num(y)}" width="${num(w)}" height="${num(h)}" rx="6" class="nt-keybox"/>${out.join('')}</g>`, h};
}

// A standalone SVG document of the picture: header strip, bands, containers, connectors with
// (the Layers overview's relation index, a part until rc39 W2 drew that view with this renderer, is no longer a part)
// their words, elements with icons and references, notes, callouts and the Key; titled and
// described for assistive technology.
// `print` (round 12, P): the figure as the SDD prints it: the print floor for its small words, and the notes and the
// footer wrapped to the figure's width instead of running past it.
export function notationSVG(D, L, {key = true, notes = true, title = '', desc = '', prefix = 'nx', callouts = [], vitals = null, footer = '', diff = false, marks = null, markWords = {}, print = false} = {}) {
  if (!D || !L) return '';
  const parts = svgParts(D, L, {prefix, callouts, vitals, diff: diff || !!D.diff, marks, print});
  const H = D.header, hx = L.header.x, hy = L.header.y, hw = L.header.w;
  const cells = [['Model', H.model], ['Template', H.template], ['Author', H.author], ['Created', H.created], ['Modified', H.modified], ['Version', H.version], ['Baseline', H.baseline]].filter(([, v]) => v);
  let cx = hx + 12 + Math.max(220, charW(D.scene.title, 15) + 32);
  const head = `<g class="nt-header"><rect x="${num(hx)}" y="${num(hy)}" width="${num(hw)}" height="${num(L.header.h)}" rx="6" class="nt-hd"/><text x="${num(hx + 12)}" y="${num(hy + 29)}" class="nt-ht">${esc(D.scene.title)}</text>${cells.map(([k, v]) => { const w = Math.max(70, Math.min(420, charW(v, print ? PRINT_FLOOR : 9.5) * (print ? 1.25 : 1.12) + 10)); if (cx + w > hx + hw - 10) return ''; const s = `<text x="${num(cx)}" y="${num(hy + 17)}" class="nt-hk">${esc(k.toUpperCase())}</text><text x="${num(cx)}" y="${num(hy + 33)}" class="nt-hv">${esc(v)}</text>`; cx += w + 14; return s; }).join('')}</g>`;
  let y = L.notesY ?? L.H - 20;
  const noteLines = !notes ? [] : print ? D.notes.flatMap(t => wrapText(t, L.W - 2 * NL.LEFT, 11, 6)) : D.notes;
  const noteText = noteLines.map((t, i) => `<text x="${num(NL.LEFT)}" y="${num(y + 12 + i * 16)}" class="nt-note">${esc(t)}</text>`).join('');
  if (noteLines.length) y += noteLines.length * 16 + 14;
  const calloutTable = callouts.length ? callouts.map((c, i) => `<text x="${num(NL.LEFT)}" y="${num(y + 12 + i * 15)}" class="nt-key"><tspan class="nt-step">${esc(String(c.n))}</tspan> ${esc(c.text)}${c.proposed ? ' (proposed)' : ''}</text>`).join('') : '';
  if (callouts.length) y += callouts.length * 15 + 14;
  const keyPart = key ? keySVG(D, NL.LEFT, y, L.W - 2 * NL.LEFT, prefix, marks, markWords, L) : {markup: '', h: 0};
  // (six lines at most: a footer records the budget a figure was drawn within, the names its groups print and the
  // qualifiers it could not place, and none of it is cut)
  const footLines = !footer ? [] : print ? wrapText(footer, L.W - 2 * NL.LEFT, PRINT_FLOOR, 6) : [footer];
  const totalH = Math.max(L.H, y + keyPart.h + (footer ? 36 + (footLines.length - 1) * 13 : 16));
  const foot = footLines.map((t, i) => `<text x="${num(NL.LEFT)}" y="${num(totalH - 10 - (footLines.length - 1 - i) * 13)}" class="nt-foot">${esc(t)}</text>`).join('');
  const t = title || `${D.scene.title} · ${H.model}`, d = desc || diagramText(D, L);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(L.W)}" height="${num(totalH)}" viewBox="0 0 ${num(L.W)} ${num(totalH)}" role="img" aria-labelledby="${prefix}-title ${prefix}-desc" font-family='${FONT}'><title id="${prefix}-title">${esc(t)}</title><desc id="${prefix}-desc">${esc(d)}</desc><style>${SVG_STYLE}${print ? PRINT_STYLE : ''}</style>${parts.defs}<rect width="100%" height="100%" fill="#fff"/>${head}${parts.bands}${parts.groups}${parts.edges}${parts.nodes}${parts.ghosts}${parts.callouts}${noteText}${calloutTable}${keyPart.markup}${foot}</svg>`;
}

// What an export is called and what it records: project, chapter, scene, arrangement, revision, baseline.
export function exportName(p, chapter, D, arrangement, ext, baselineId = null) {
  return `AIW-${safe(p?.name || 'design')}-ch${chapter}-${safe(D?.scene?.id || 'diagram')}-${safe(arrangement || D?.scene?.arrangement)}${p?.contentVersion != null ? '-v' + p.contentVersion : ''}${baselineId ? '-' + safe(baselineId) : ''}.${ext}`;
}
// The manifest of a set of figures: path, SHA-256, bytes, media type and the document fingerprint
// they were drawn from, so a recipient can verify the files.
export function figureManifest(figures, documentFingerprint = '') {
  const enc = new TextEncoder();
  return figures.map(f => ({path: f.path, sha256: sha256(f.text), bytes: enc.encode(f.text).length, mediaType: f.mediaType || 'image/svg+xml', documentFingerprint, scene: f.scene || null, arrangement: f.arrangement || null, chapter: f.chapter ?? null}));
}
