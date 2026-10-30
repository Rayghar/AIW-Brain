// The trace kernel (rc.10.73.42, D7): the one reading of a requirement's chain through the design, and of any record's
// chain back to the requirements it serves, over the canonical design graph's typed relations (architecture-model.js
// recordGraph: the model's own records and relations, from its one emitter). A walk goes layer by layer — requirement,
// its Chapter 1 context, driver, decision, responsibility, component, need, capability, realisation, contract, data,
// operating plan, placement, zone, control, threat, party, path — and a record joins a layer only through a typed
// relation from a record already on an earlier layer (TRACE_HOPS). Each record keeps the hops that linked it: the
// relation's type, the record it came from, the relationship and the field that records it. What a record reaches
// depends on that record alone, so a record on a requirement's trail reaches only records on that trail. The trail, the
// review desk, the matrix annex, change impact, the narrative and Model trace, the Matrix, the component specification
// and SDD §4, the driver scope, the ARS and the SDD journey line all read this walk, and filter it where they show less.
// Pure and deterministic; nothing here changes the project.
import {recordGraph} from './record-graph.js';
import {remember} from './document-memo.js';
import {stepOfNode} from './model-scope.js';

export const TRACE_LAYERS = ['requirement', 'context', 'driver', 'decision', 'responsibility', 'component', 'need', 'capability', 'realization', 'contract', 'data', 'plan', 'placement', 'zone', 'control', 'threat', 'party', 'path'];
// The model's object types each layer holds; a Chapter 1 record that is not a requirement is context.
const LAYER_TYPES = {requirement: 'requirement', driver: 'quality', decision: 'decision', responsibility: 'responsibility', component: 'component', need: 'need', capability: 'capability', realization: 'technology', contract: 'contract', data: 'data', plan: 'runtime', placement: 'instance', zone: 'zone', control: 'control', threat: 'threat', party: 'party', path: 'path'};
const TYPE_LAYER = Object.fromEntries(Object.entries(LAYER_TYPES).map(([layer, type]) => [type, layer]));
const chapterOne = o => !!o?.source?.startsWith('artefacts[');
export const layerOf = o => !o ? null : chapterOne(o) && o.type !== 'requirement' ? 'context' : TYPE_LAYER[o.type] || null;
// What a hop may bring onto a layer: a record of the layer's type; onto the context, any Chapter 1 record (a requirement
// linked to the one traced is its context, not a second trail).
const fits = (layer, o) => layer === 'context' ? chapterOne(o) : LAYER_TYPES[layer] === o?.type;
const PROTECTED = ['component', 'capability', 'realization', 'contract', 'data'];
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
// the responsibilities and components that name it (the driver scope's reading, driver-scope.js).
const named = layer => ({layer, types: ['fulfils'], from: ['requirement'], dir: 'out', skip: 'artefacts.modelRef'});
export const TRACE_HOPS = [
  {layer: 'context', from: ['requirement'], dir: 'both', only: e => e.source === 'relationships'},
  named('driver'),
  named('decision'), {layer: 'decision', types: ['constrains'], from: ['driver'], dir: 'out'},
  named('responsibility'), {layer: 'responsibility', types: ['constrains'], from: ['driver'], dir: 'out'}, {layer: 'responsibility', types: ['justifies'], from: ['decision'], dir: 'out'},
  {layer: 'responsibility', from: ['context'], step: true},
  named('component'), {layer: 'component', types: ['realizedBy'], from: ['responsibility'], dir: 'out', only: e => e.source === 'logical.mappings'},
  {layer: 'component', types: ['constrains'], from: ['driver'], dir: 'out'}, {layer: 'component', types: ['justifies'], from: ['decision'], dir: 'out'},
  named('need'), {layer: 'need', types: ['hasNeed'], from: ['component'], dir: 'out'},
  named('capability'), {layer: 'capability', types: ['metBy'], from: ['need'], dir: 'out'},
  named('realization'), {layer: 'realization', types: ['implementedBy'], from: ['capability'], dir: 'out'},
  named('contract'), {layer: 'contract', types: ['provides', 'uses'], from: ['component', 'realization'], dir: 'out'},
  named('data'), {layer: 'data', types: ['exchanges'], from: ['contract'], dir: 'out'}, {layer: 'data', types: ['owns'], from: ['component'], dir: 'out'},
  named('plan'), {layer: 'plan', types: ['operatedAs'], from: ['component', 'realization'], dir: 'out'},
  {layer: 'placement', types: ['placedAs'], from: ['plan'], dir: 'out'},
  {layer: 'zone', types: ['locatedIn'], from: ['placement'], dir: 'out'},
  named('control'), {layer: 'control', types: ['protects'], from: PROTECTED, dir: 'in'}, {layer: 'control', types: ['enforces'], from: ['plan'], dir: 'out'},
  named('threat'), {layer: 'threat', types: ['threatens'], from: PROTECTED, dir: 'in'}, {layer: 'threat', types: ['mitigates'], from: ['control'], dir: 'out'},
  named('party'), named('path')
];
const RANK = new Map(TRACE_LAYERS.map((l, i) => [l, i]));
const HOPS_INTO = new Map(TRACE_LAYERS.map(l => [l, TRACE_HOPS.filter(h => h.layer === l)]));

// A plan is in scope while its environment lists its asset and the asset is a component or a realisation; a plan left
// behind by a removed asset carries nothing (runtime-domain.js plans reads the same rule).
export const planInScope = (environment, plan, asset) => !!environment && Array.isArray(environment.assetIds) && environment.assetIds.includes(plan?.assetId) && !!asset;

// The graph a walk reads, once per settled document or pass: the record graph, each object's layer and register
// position, the journey steps' connections to responsibilities, and the plans in scope.
function kernelOf(p, upto = null) {
  return remember(p, 'trace-kernel', 'graph:' + (upto || ''), () => {
    const G = recordGraph(p, upto), layer = new Map(), order = new Map();
    let i = 0; for (const [id, o] of G.objects) { order.set(id, i++); const l = layerOf(o); if (l) layer.set(id, l); }
    const steps = new Map(), stepped = new Map();
    for (const e of G.relationships) if (stepConnection(e)) for (const [a, b] of stepEnds(e)) {
      if (G.objects.get(b)?.type !== 'responsibility' || G.objects.get(a)?.type === 'responsibility') continue;
      const s = stepOfNode(p, a); if (layer.get(s) !== 'context') continue;
      let xs = steps.get(s); if (!xs) steps.set(s, xs = []); xs.push({e, other: b});
      let ys = stepped.get(b); if (!ys) stepped.set(b, ys = []); ys.push({e, other: s});
    }
    const inScope = id => { const plan = G.objects.get(id)?.record, asset = G.objects.get(plan?.assetId); return planInScope(G.objects.get(plan?.environmentId)?.record, plan, asset && ['component', 'technology'].includes(asset.type) ? asset : null); };
    return {G, layer, order, steps, stepped, inScope};
  });
}
const keep = (K, hop, e) => (!hop.types || hop.types.includes(e.type)) && (!hop.only || hop.only(e)) && e.source !== hop.skip;
// The relations a hop reads from a record already on the walk, each with the record at the other end.
function edgesFrom(K, id, hop) {
  if (hop.step) return K.steps.get(id) || [];
  const out = [];
  if (hop.dir !== 'in') for (const e of K.G.outgoing.get(id) || []) if (keep(K, hop, e)) out.push({e, other: e.to});
  if (hop.dir !== 'out') for (const e of K.G.incoming.get(id) || []) if (keep(K, hop, e)) out.push({e, other: e.from});
  return out;
}
// The relations that could have brought a record by a hop, each with the record it would have come from.
function edgesTo(K, id, hop) {
  if (hop.step) return K.stepped.get(id) || [];
  return edgesFrom(K, id, {...hop, dir: hop.dir === 'out' ? 'in' : hop.dir === 'in' ? 'out' : 'both'});
}
const hopOf = (e, from) => ({type: e.type, from, relation: e.id, source: e.source});
const admit = (K, layer, id) => fits(layer, K.G.objects.get(id)) && (layer !== 'plan' || K.inScope(id));

// The walk from seeds: every record reached, by layer, each with the hops that linked it.
function walk(K, seeds, until = null) {
  const at = new Map(), hops = new Map(), held = new Map(TRACE_LAYERS.map(l => [l, []]));
  const put = (id, l) => { at.set(id, l); hops.set(id, []); held.get(l).push(id); };
  for (const id of seeds) if (K.layer.has(id) && !at.has(id)) put(id, K.layer.get(id));
  // A hop runs from an earlier layer, so the records it reads are all on the walk before it runs.
  for (const layer of TRACE_LAYERS.slice(0, until ? RANK.get(until) + 1 : undefined)) for (const hop of HOPS_INTO.get(layer)) for (const l of hop.from) for (const id of held.get(l)) {
    for (const {e, other} of edgesFrom(K, id, hop)) {
      if (other === id || !admit(K, layer, other) || (at.has(other) && at.get(other) !== layer)) continue;
      if (!at.has(other)) put(other, layer);
      hops.get(other).push(hopOf(e, id));
    }
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
  const layers = Object.fromEntries(TRACE_LAYERS.map(l => [l, []]));
  for (const [id, l] of at) layers[l].push(id);
  for (const l of TRACE_LAYERS) if (layers[l].length > 1) layers[l].sort((a, b) => K.order.get(a) - K.order.get(b));
  let ids = null;
  return {start, layers, hops, get ids() { return ids ??= new Set(at.keys()); }, layerOf: id => at.get(id) || null, has: id => at.has(id), record: id => K.G.objects.get(id) || null};
}
const joinHops = (into, from) => { for (const [k, hs] of from) { const xs = into.get(k) || []; for (const h of hs) if (!xs.some(x => x.relation === h.relation && x.from === h.from)) xs.push(h); into.set(k, xs); } };

// A requirement's trail: the records each later layer holds by the typed hops from it.
export function requirementTrace(p, id) {
  const K = kernelOf(p);
  if (K.layer.get(id) !== 'requirement') return null;
  return remember(p, 'trace-kernel:requirement', id, () => { const w = walk(K, [id]); return traceOf(K, id, w.at, w.hops); });
}
// The graph the walks read, for a reader that walks it many times over one document it does not change (the reasoning
// source keeps it as it keeps its chains, design-reasoning.js): handed back as `graph` to the walks below.
export const traceGraph = (p, upto = null) => kernelOf(p, upto);
// What one record reaches: the records of later layers its hops lead to (a component's needs, capabilities,
// realisations, contracts, data, plans, placements, zones, controls and threats).
export function forwardTrace(p, id, {graph = null} = {}) {
  const K = graph || kernelOf(p);
  if (!K.layer.has(id)) return null;
  return remember(p, 'trace-kernel:forward', id, () => { const w = walk(K, [id]); return traceOf(K, id, w.at, w.hops); });
}
// The walk from several records at once (a driver's scope: the driver and what the requirements it serves name).
export function seededTrace(p, ids, {until = null, graph = null} = {}) {
  const K = graph || kernelOf(p), seeds = [...new Set(ids)].filter(id => K.layer.has(id));
  const w = walk(K, seeds, until); return traceOf(K, seeds[0] ?? null, w.at, w.hops);
}
// Any record's trace: a requirement's trail; a Chapter 1 record's, the trails of the requirements it is linked to with
// what it reaches itself; any other record's, the records whose hops reach it (back to the requirements it serves) with
// what it reaches. Each hop keeps its direction: it lists the record it came from.
export function recordTrace(p, id) {
  const K = kernelOf(p), l = K.layer.get(id);
  if (!l) return null;
  if (l === 'requirement') return requirementTrace(p, id);
  return remember(p, 'trace-kernel:record', id, () => {
    const back = walkBack(K, id), fwd = walk(K, [id]), at = new Map(back.at), hops = new Map();
    for (const [k, v] of fwd.at) if (!at.has(k)) at.set(k, v);
    joinHops(hops, back.hops); joinHops(hops, fwd.hops);
    if (l === 'context') for (const [r, lr] of back.at) if (lr === 'requirement') { const t = requirementTrace(p, r); for (const k of t.ids) if (!at.has(k)) at.set(k, t.layerOf(k)); joinHops(hops, t.hops); }
    at.set(id, l);
    return traceOf(K, id, at, hops);
  });
}
// The records a requirement names on one layer (fulfils, its groups included), and the requirements that name a record.
export function namedBy(p, requirementId, layer, graph = null) {
  const K = graph || kernelOf(p), hop = HOPS_INTO.get(layer)?.find(h => h.types?.includes('fulfils'));
  return hop ? edgesFrom(K, requirementId, hop).map(x => x.other).filter(x => admit(K, layer, x)) : [];
}
export function namingRequirements(p, id, graph = null) {
  const K = graph || kernelOf(p), layer = K.layer.get(id), hop = HOPS_INTO.get(layer)?.find(h => h.types?.includes('fulfils'));
  return hop ? [...new Set(edgesTo(K, id, hop).map(x => x.other).filter(x => K.layer.get(x) === 'requirement'))] : [];
}
// The records at the other end of a record's relations of one type ('out': the relation runs from the record; 'in': to
// it), from one source when named: a single hop of the graph the walks read.
export function linkedVia(p, id, type, dir = 'out', source = null, graph = null) {
  const K = graph || kernelOf(p);
  return [...new Set(edgesFrom(K, id, {types: [type], dir, only: source ? e => e.source === source : null}).map(x => x.other))];
}
// Each relation's position in the graph (the order its records state it), to read hops in the order they are recorded.
export const relationOrder = (p, graph = null) => new Map((graph || kernelOf(p)).G.relationships.map((e, i) => [e.id, i]));
// The records of a trace on some layers, as the model registers them (record, ref, title, type), in register order.
export const traceObjects = (T, ...layers) => !T ? [] : layers.flatMap(l => T.layers[l] || []).map(id => T.record(id)).filter(Boolean);
export const traceRecords = (T, ...layers) => traceObjects(T, ...layers).map(o => o.record);
// The hops of a record on a trace that came from a given record or layer.
export const hopsFrom = (T, id, test = () => true) => (T?.hops.get(id) || []).filter(h => test(h, T.layerOf(h.from)));
// One chain of hops between the trace's start and a record on it, the shortest: each step {from, to, type, relation,
// source}, read in the direction the relation was walked (towards the record for what the start reaches, from it for
// what reaches the start).
export function tracePath(T, id) {
  if (!T || !T.has(id) || id === T.start) return [];
  const next = new Map();
  for (const [to, hs] of T.hops) for (const h of hs) { let xs = next.get(h.from); if (!xs) next.set(h.from, xs = []); xs.push({to, h}); }
  const prev = new Map([[T.start, null]]), queue = [T.start];
  while (queue.length && !prev.has(id)) {
    const x = queue.shift();
    for (const {to, h} of next.get(x) || []) if (!prev.has(to)) { prev.set(to, {at: x, step: {from: x, to, type: h.type, relation: h.relation, source: h.source}}); queue.push(to); }
    for (const h of T.hops.get(x) || []) if (!prev.has(h.from)) { prev.set(h.from, {at: x, step: {from: h.from, to: x, type: h.type, relation: h.relation, source: h.source}}); queue.push(h.from); }
  }
  if (!prev.has(id)) return [];
  const path = []; for (let at = id; prev.get(at); at = prev.get(at).at) path.unshift(prev.get(at).step);
  return path;
}
