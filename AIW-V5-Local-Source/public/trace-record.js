// Any record's trace, and the shortest chain between two records on a trace (rc.10.73.42, D7): the trace kernel's
// walks (trace-kernel.js) read from any record, for the views that start from one — the narrative and Model trace and
// the Matrix (model-matrix.js) and the SDD journey line (sdd-architecture.js). Kept apart from the kernel so that a
// route reading only requirement trails and the chapters' sources does not load it. Pure; nothing here changes the
// project.
import {traceGraph, requirementTrace, walk, walkBack, traceOf, BUILT_IN_LAYERS} from './trace-kernel.js';
import {remember} from './document-memo.js';

const joinHops = (into, from) => { for (const [k, hs] of from) { const xs = into.get(k) || []; for (const h of hs) if (!xs.some(x => x.relation === h.relation && x.from === h.from)) xs.push(h); into.set(k, xs); } };
// Any record's trace: a requirement's trail; a Chapter 1 record's, the trails of the requirements it is linked to with
// what it reaches itself; any other record's, the records whose hops reach it (back to the requirements it serves) with
// what it reaches. Each hop keeps its direction: it lists the record it came from.
export function recordTrace(p, id) {
  const K = traceGraph(p), l = K.layer.get(id);
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
// For each record on a trace, the hops that run from it (tracePath reads them, once per trace).
const onward = new WeakMap();
const nextOf = T => { let m = onward.get(T); if (!m) { onward.set(T, m = new Map()); for (const [to, hs] of T.hops) for (const h of hs) { let xs = m.get(h.from); if (!xs) m.set(h.from, xs = []); xs.push({to, h}); } } return m; };
// One chain of hops between the trace's start and a record on it, the shortest: each step {from, to, type, relation,
// source}, read in the direction the relation was walked (towards the record for what the start reaches, from it for
// what reaches the start).
export function tracePath(T, id) {
  if (!T || !T.has(id) || id === T.start) return [];
  // A chain runs through the built-in layers when one exists (rc44; the lead's ruling K8): a record a design package
  // puts on a layer of its own is a way between two records only when there is no other, so a document reads the pairs
  // of its built-in records as it did before it held such a record.
  return chain(T, id, x => x === id || BUILT_IN_LAYERS.includes(T.layerOf(x))) || chain(T, id) || [];
}
function chain(T, id, open) {
  const next = nextOf(T), prev = new Map([[T.start, null]]), queue = [T.start], reach = (to, at, step) => { if (!prev.has(to) && (!open || open(to))) { prev.set(to, {at, step}); queue.push(to); } };
  while (queue.length && !prev.has(id)) {
    const x = queue.shift();
    for (const {to, h} of next.get(x) || []) reach(to, x, {from: x, to, type: h.type, relation: h.relation, source: h.source});
    for (const h of T.hops.get(x) || []) reach(h.from, x, {from: h.from, to: x, type: h.type, relation: h.relation, source: h.source});
  }
  if (!prev.has(id)) return null;
  const path = []; for (let at = id; prev.get(at); at = prev.get(at).at) path.unshift(prev.get(at).step);
  return path;
}
