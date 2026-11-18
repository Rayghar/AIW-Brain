// The trace kernel (rc.10.73.42, D7): the one reading of a requirement's chain through the design, and of any record's
// chain back to the requirements it serves, over the canonical design graph's typed relations (record-graph.js
// recordGraph: the model's own records and relations, from the one emitter the model draws). A walk goes layer by
// layer — requirement, its Chapter 1 context, driver, decision, responsibility, component, need, capability,
// realisation, contract, data, operating plan, placement, zone, control, threat, party, path — and a record joins a
// layer only through a typed relation from a record already on an earlier layer (TRACE_HOPS), and only a record the
// document holds (never the reference graph's illustrative nodes). Each record keeps the hops that linked it: the
// relation's type, the record it came from, the relationship and the field that records it. What a record reaches
// depends on that record alone, so a record on a requirement's trail reaches only records on that trail. The trail, the
// review desk, the matrix annex, change impact, the narrative and Model trace, the Matrix, the component specification
// and SDD §4, the driver scope, the ARS, the SDD journey line and the chapters' sources all read this walk, and filter it
// where they show less. Any record's trace and the chain between two records on it (recordTrace, tracePath) read it from
// trace-record.js, which only the views that start from any record load.
// Pure and deterministic; nothing here changes the project.
import {recordGraph} from './record-graph.js';
import {remember} from './document-memo.js';
import {stepOfNode} from './model-scope.js';
import {EXTENSIONS, extendTable} from './design-extensions.js';

export const BUILT_IN_LAYERS = 'requirement context driver decision responsibility component need capability realization contract data plan placement zone control threat party path'.split(' ');
// The model's object type each layer holds; a Chapter 1 record that is not a requirement is context, which holds no
// type of its own (0). The layers the design packages state ({layer: type}) follow the built-in ones, in the packages'
// id order (rc44, slice S0: design-extensions.js); the tables below are rebuilt when a package registers.
export const TRACE_LAYER_TYPES = Object.fromEntries(BUILT_IN_LAYERS.map(l => [l, {context: 0, driver: 'quality', realization: 'technology', plan: 'runtime', placement: 'instance'}[l] ?? l]));
export let TRACE_LAYERS;
let TYPE_LAYER, RANK, HOPS_INTO, NAMING;
const chapterOne = o => !!o?.source?.startsWith('artefacts[');
export const layerOf = o => !o ? null : chapterOne(o) && o.type !== 'requirement' ? 'context' : TYPE_LAYER[o.type] || null;
// What a hop may bring onto a layer: a record of the layer's type; onto the context, any Chapter 1 record (a requirement
// linked to the one traced is its context, not a second trail).
const fits = (layer, o) => layer === 'context' ? chapterOne(o) : TYPE_LAYER[o?.type] === layer;
const PROTECTED = 'component capability realization contract data';
// A Chapter 4 connection between a responsibility and a journey step: kind serves or realises, whichever end it is drawn
// from, or a structural (trace) connection drawn from the step, which reads as serving it (logical-domain.js LAYER_KINDS;
// architecture-model.js connectionType). The step end is the Chapter 1 step it stands for (model-scope.js stepOfNode).
const STEP_KINDS = new Set(['serves', 'realises']);
const stepConnection = e => e.source === 'logical.connections' && (STEP_KINDS.has(e.attributes?.kind) || !e.attributes?.kind || e.attributes.kind === 'trace');
const stepEnds = e => STEP_KINDS.has(e.attributes?.kind) ? [[e.from, e.to], [e.to, e.from]] : [[e.from, e.to]];
// The typed hops: the layer a record joins, the relation types that bring it, the layers the record they come from sits
// on, and which end of the relation that record is ('out': the relation runs from it; 'in': to it). A requirement names
// a record of any later layer (fulfils; a requirement group it belongs to counts, as linkedRequirementIds reads it). A
// driver constrains the decisions that weigh it and the responsibilities and components it names; a decision justifies
// the responsibilities and components that name it (the driver scope's reading, driver-scope.js). Those hops, and a
// journey step's connection to a responsibility, are the trail's context (ctx): they keep what bears on the requirement
// on its trail, but its own chain — its spine (requirementSpine) — runs only from what it names (fulfils) and from
// there by the design's own relations (a responsibility realised by a component, the component's needs, and onwards),
// and the governance checks read the spine (desk-model.js firstBreak, architecture-case.js, review-domain.js coverage).
// A hop is written hop(layer, relation types, layers it comes from, more): the types and the layers space-separated,
// 'out' unless it says otherwise.
const hop = (layer, types, from, more) => ({layer, types: types && types.split(' '), from: from.split(' '), dir: 'out', ...more});
const named = layer => hop(layer, 'fulfils', 'requirement', {skip: 'artefacts.modelRef'}), CTX = {ctx: 1}, IN = {dir: 'in'};
// Each layer reads its hops in this order (HOPS_INTO): the requirement's naming first, then the design's own relations.
export const TRACE_HOPS = [
  hop('context', '', 'requirement', {dir: 'both', only: e => e.source === 'relationships'}),
  ...'driver decision responsibility component need capability realization contract data plan control threat party path'.split(' ').map(named),
  hop('decision', 'constrains', 'driver'),
  hop('responsibility', 'constrains', 'driver', CTX), hop('responsibility', 'justifies', 'decision', CTX),
  hop('responsibility', '', 'context', {step: true, ...CTX}),
  hop('component', 'realizedBy', 'responsibility', {only: e => e.source === 'logical.mappings'}),
  hop('component', 'constrains', 'driver', CTX), hop('component', 'justifies', 'decision', CTX),
  hop('need', 'hasNeed', 'component'),
  hop('capability', 'metBy', 'need'),
  hop('realization', 'implementedBy', 'capability'),
  hop('contract', 'provides uses', 'component realization'),
  hop('data', 'exchanges', 'contract'), hop('data', 'owns uses', 'component'),
  hop('plan', 'operatedAs', 'component realization'),
  hop('placement', 'placedAs', 'plan'),
  hop('zone', 'locatedIn', 'placement'),
  hop('control', 'protects', PROTECTED, IN), hop('control', 'enforces', 'plan'),
  hop('threat', 'threatens', PROTECTED, IN), hop('threat', 'mitigates', 'control')
];
// A type stands on the first layer that holds it, so a package's layer never takes a built-in layer's records. A
// built-in layer reads the built-in hops above and no other; a package's layer reads the hops the packages state
// ({layer, types: [...], from: [...], dir: 'out' | 'in', ctx: whether it is context and not the own chain}), in the
// packages' id order, so a package's hop never brings a record onto a built-in layer.
extendTable(TRACE_LAYER_TYPES, e => e.layers, () => {
  TRACE_LAYERS = Object.keys(TRACE_LAYER_TYPES);
  TYPE_LAYER = Object.fromEntries(Object.entries(TRACE_LAYER_TYPES).reverse().map(([layer, type]) => [type, layer]));
  RANK = new Map(TRACE_LAYERS.map((l, i) => [l, i]));
  // A built-in layer is told by its name, not by its place: a name that sorts before these as a key of the table
  // (a numeric one) would shift every place.
  HOPS_INTO = new Map(TRACE_LAYERS.map(l => [l, (BUILT_IN_LAYERS.includes(l) ? TRACE_HOPS : EXTENSIONS.flatMap(e => e.hops || [])).filter(h => h.layer === l)]));
  // The hop by which a requirement names a record of each layer (fulfils), for namedBy and namingRequirements.
  NAMING = new Map(TRACE_LAYERS.map(l => [l, HOPS_INTO.get(l).find(h => h.types?.includes('fulfils'))]).filter(([, h]) => h));
});

// A plan is in scope while its environment lists its asset and the asset is a component or a realisation; a plan left
// behind by a removed asset carries nothing (runtime-domain.js plans reads the same rule).
export const planInScope = (environment, plan, asset) => !!environment && Array.isArray(environment.assetIds) && environment.assetIds.includes(plan?.assetId) && !!asset;

// The graph a walk reads, once per settled document or pass: the record graph, each object's layer and register
// position, the journey steps' connections to responsibilities, and the plans in scope.
function kernelOf(p, upto = null) {
  return remember(p, 'trace-kernel', 'graph:' + (upto || ''), () => {
    const G = recordGraph(p, upto), layer = new Map(), order = new Map();
    // Only a record of the document stands on a layer: the reference graph's illustrative nodes and declared context
    // objects ('model.context.*', record-graph.js) stay in the graph to resolve relations, never as recorded design.
    let i = 0; for (const [id, o] of G.objects) { order.set(id, i++); const l = !o.source.startsWith('model.context.') && layerOf(o); if (l) layer.set(id, l); }
    const steps = new Map(), stepped = new Map();
    for (const e of G.relationships) if (stepConnection(e)) for (const [a, b] of stepEnds(e)) {
      if (layer.get(b) !== 'responsibility' || G.objects.get(a)?.type === 'responsibility') continue;
      const s = stepOfNode(p, a); if (layer.get(s) !== 'context') continue;
      let xs = steps.get(s); if (!xs) steps.set(s, xs = []); xs.push({e, other: b});
      let ys = stepped.get(b); if (!ys) stepped.set(b, ys = []); ys.push({e, other: s});
    }
    const inScope = id => { const plan = G.objects.get(id)?.record; return planInScope(G.objects.get(plan?.environmentId)?.record, plan, ['component', 'realization'].includes(layer.get(plan?.assetId))); };
    return {G, layer, order, steps, stepped, inScope, upto};
  });
}
const NONE = [];
const keep = (hop, e) => (!hop.types || hop.types.includes(e.type)) && (!hop.only || hop.only(e)) && e.source !== hop.skip;
// Each relation a hop reads from a record already on the walk, with the record at the other end: f(relation, other).
function eachEdge(K, id, hop, f) {
  if (hop.step) { for (const x of K.steps.get(id) || NONE) f(x.e, x.other); return; }
  if (hop.dir !== 'in') for (const e of K.G.outgoing.get(id) || NONE) if (keep(hop, e)) f(e, e.to);
  if (hop.dir !== 'out') for (const e of K.G.incoming.get(id) || NONE) if (keep(hop, e)) f(e, e.from);
}
// The same relations as a list.
const edgesFrom = (K, id, hop) => { const out = []; eachEdge(K, id, hop, (e, other) => out.push({e, other})); return out; };
// The relations that could have brought a record by a hop, each with the record it would have come from.
function edgesTo(K, id, hop) {
  if (hop.step) return K.stepped.get(id) || [];
  return edgesFrom(K, id, {...hop, dir: hop.dir === 'out' ? 'in' : hop.dir === 'in' ? 'out' : 'both'});
}
const hopOf = (e, from) => ({type: e.type, from, relation: e.id, source: e.source});
const admit = (K, layer, id) => K.layer.has(id) && fits(layer, K.G.objects.get(id)) && (layer !== 'plan' || K.inScope(id));

// The walk from seeds: every record reached, by layer, each with the hops that linked it; on the spine, without the
// context hops.
function walk(K, seeds, until = null, spine = false) {
  const at = new Map(), hops = new Map(), held = {};
  const put = (id, l) => { at.set(id, l); hops.set(id, []); (held[l] ||= []).push(id); };
  for (const id of seeds) { const l = K.layer.get(id); if (l && !at.has(id)) put(id, l); }
  const reach = (layer, e, other, id) => {
    if (other === id || !admit(K, layer, other)) return;
    const was = at.get(other);
    if (was === undefined) put(other, layer); else if (was !== layer) return;
    hops.get(other).push(hopOf(e, id));
  };
  // A hop runs from an earlier layer, so the records it reads are all on the walk before it runs (without a list of
  // them: the driver scope walks once for every driver).
  for (let r = 0, last = until ? RANK.get(until) : TRACE_LAYERS.length - 1; r <= last; r++) {
    const layer = TRACE_LAYERS[r];
    for (const hop of HOPS_INTO.get(layer)) if (!spine || !hop.ctx) for (const l of hop.from) for (const id of held[l] || NONE) eachEdge(K, id, hop, (e, other) => reach(layer, e, other, id));
  }
  return {at, hops};
}
// The walk back from a record: every record with a chain of hops to it, each on its own layer, and the hops between.
function walkBack(K, id) {
  const at = new Map([[id, K.layer.get(id)]]), hops = new Map([[id, []]]), queue = [id];
  while (queue.length) {
    const y = queue.shift(), ly = at.get(y);
    if (!admit(K, ly, y)) continue;
    for (const hop of HOPS_INTO.get(ly)) for (const {e, other} of edgesTo(K, y, hop)) {
      const lz = K.layer.get(other);
      if (!lz || !hop.from.includes(lz) || RANK.get(lz) >= RANK.get(ly)) continue;
      if (!at.has(other)) { at.set(other, lz); hops.set(other, []); queue.push(other); }
      hops.get(y).push(hopOf(e, other));
    }
  }
  return {at, hops};
}
function traceOf(K, start, at, hops) {
  // Every built-in layer, and a package's layer only when it holds a record (a trail without one reads as it did).
  const layers = Object.fromEntries(BUILT_IN_LAYERS.map(l => [l, []]));
  for (const [id, l] of at) (layers[l] ||= []).push(id);
  for (const l in layers) if (layers[l].length > 1) layers[l].sort((a, b) => K.order.get(a) - K.order.get(b));
  let ids = null;
  return {start, layers, hops, get ids() { return ids ??= new Set(at.keys()); }, layerOf: id => at.get(id) || null, has: id => at.has(id), record: id => K.G.objects.get(id) || null};
}

// A requirement's trail: the records each later layer holds by the typed hops from it; its spine, the same walk without
// the context hops (its own chain).
const trailOf = (name, spine) => (p, id) => { const K = kernelOf(p); return K.layer.get(id) !== 'requirement' ? null : remember(p, name, id, () => { const w = walk(K, [id], null, spine); return traceOf(K, id, w.at, w.hops); }); };
export const requirementTrace = trailOf('trace-kernel:requirement', false), requirementSpine = trailOf('trace-kernel:spine', true);
// The requirements whose trail holds a record (the walk back from it, which reaches exactly them), as their records in
// register order: what the chapters' sources name (interfaces-domain.js, security-domain.js, runtime-domain.js), read
// only when asked for (withServing), so a reader of the rest of a record's sources does not walk the graph.
export const servingRequirements = (p, id) => remember(p, 'trace-kernel:serving', id, () => { const K = kernelOf(p), at = K.layer.has(id) ? walkBack(K, id).at : new Map(); return [...at.keys()].filter(r => at.get(r) === 'requirement').sort((a, b) => K.order.get(a) - K.order.get(b)).map(r => K.G.objects.get(r).record); });
export const withServing = (p, id, s) => { let v; return Object.defineProperty(s, 'requirements', {get: () => v ??= servingRequirements(p, id), enumerable: true}); };
// The graph the walks read, for a reader that walks it many times over one document it does not change (the reasoning
// source keeps it as it keeps its chains, design-reasoning.js): handed back as `graph` to the walks below. With `upto`
// 'component', the driver scope's graph (record-graph.js), for walks from drivers, responsibilities and components only.
export {kernelOf as traceGraph};
// The walks and the trace they make, for any record's trace (trace-record.js), which reads this kernel without a walk of its own.
export {walk, walkBack, traceOf};
// What one record reaches: the records of later layers its hops lead to (a component's needs, capabilities,
// realisations, contracts, data, plans, placements, zones, controls and threats).
export function forwardTrace(p, id, {graph = null} = {}) {
  const K = graph || kernelOf(p);
  if (!K.layer.has(id)) return null;
  return remember(p, 'trace-kernel:forward', K.upto ? id + '\u0000' + K.upto : id, () => { const w = walk(K, [id]); return traceOf(K, id, w.at, w.hops); });
}
// The walk from several records at once (a driver's scope: the driver and what the requirements it serves name).
export function seededTrace(p, ids, {until = null, graph = null} = {}) {
  const K = graph || kernelOf(p), seeds = [...new Set(ids)].filter(id => K.layer.has(id));
  const w = walk(K, seeds, until); return traceOf(K, seeds[0] ?? null, w.at, w.hops);
}
// The records a requirement names on one layer (fulfils, its groups included), and the requirements that name a record.
export function namedBy(p, requirementId, layer, graph = null) {
  const K = graph || kernelOf(p), hop = NAMING.get(layer);
  return hop ? edgesFrom(K, requirementId, hop).map(x => x.other).filter(x => admit(K, layer, x)) : [];
}
export function namingRequirements(p, id, graph = null) {
  const K = graph || kernelOf(p), layer = K.layer.get(id), hop = NAMING.get(layer);
  return hop ? [...new Set(edgesTo(K, id, hop).map(x => x.other).filter(x => K.layer.get(x) === 'requirement'))] : [];
}
// The records at the other end of a record's relations of one type ('out': the relation runs from the record; 'in': to
// it), from one source when named: a single hop of the graph the walks read.
export function linkedVia(p, id, type, dir = 'out', source = null, graph = null) {
  const K = graph || kernelOf(p);
  return [...new Set(edgesFrom(K, id, {types: [type], dir, only: source ? e => e.source === source : null}).map(x => x.other))];
}
// Each relation's position in the graph (the order its records state it), to read hops in the order they are recorded.
export const relationOrder = (p, graph = null) => { const K = graph || kernelOf(p); return K.relationIndex ??= new Map(K.G.relationships.map((e, i) => [e.id, i])); };
// The records of a trace on some layers, as the documents hold them, in register order.
export const traceRecords = (T, ...layers) => !T ? [] : layers.flatMap(l => T.layers[l] || []).map(id => T.record(id)?.record).filter(Boolean);
// The hops of a record on a trace that came from a given record or layer.
export const hopsFrom = (T, id, test = () => true) => (T?.hops.get(id) || []).filter(h => test(h, T.layerOf(h.from)));

