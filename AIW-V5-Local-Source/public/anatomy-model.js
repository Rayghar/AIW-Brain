// Design anatomy — the semantic model behind the Validate surface.
//
// One body (modules as columns), cut in layers (realization depth) and seen through lenses
// (systems that run through the whole body). This module is pure: it reads the existing
// architecture projection and rule-based findings and never writes project facts.
import {architectureModel} from './architecture-model.js';
import {inheritedFindings} from './review-domain.js';
import {list} from './util.js';
import {LENS_VOCABULARY} from './lens-vocabulary.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES} from './chapter-names.js';
// Round 24 (D-24-08): under a module scope the model reads the scope's projection; its checks are the saved document's
// (module-lens.js), kept to the records the projection holds.
import {baseOf, scopeFindings} from './module-lens.js';
import {memoOff} from './document-memo.js';

export const ANATOMY_SCHEMA = 'aiw.anatomy/1';

// Realization depth, top to bottom. `ch` is the chapter in which the layer is designed.
export const STRATA = [
  {id: 'intent', label: 'Intent', short: 'Intent', sub: 'Why it exists — requirements, qualities and decisions', ch: 1, color: '#8a6d3b'},
  {id: 'logical', label: 'Logical application', short: 'Logical', sub: 'What each part must do', ch: 4, color: '#286954'},
  {id: 'application', label: 'Application realization', short: 'Application', sub: 'The software that does it', ch: 5, color: '#2f6177'},
  {id: 'capability', label: 'Logical technology', short: 'Platform', sub: 'Platform support it stands on', ch: 6, color: '#66733a'},
  {id: 'technology', label: 'Technology realization', short: 'Product', sub: 'Products that provide that support', ch: 7, color: '#7a5f33'},
  {id: 'runtime', label: 'Deployment / runtime', short: 'Runtime', sub: 'Where it runs and what fails together', ch: 10, color: '#3f6d86'}
];

// Lenses overlay the same layout. Switching a lens never moves an object. The seven are the one lens vocabulary
// (lens-vocabulary.js, round 11); here each is tied to the chapter that first fills it.
const LENS_CHAPTER = {structure: 1, flow: 4, signals: 8, information: 8, protection: 9, operation: 10, reasoning: 1};
export const LENSES = LENS_VOCABULARY.map(l => ({...l, ch: LENS_CHAPTER[l.id]}));

export const CHAPTERS = [
  [1, CHAPTER_TITLES[1], 'It starts with needs. Requirements say what the solution must achieve — not yet how.'],
  [2, CHAPTER_TITLES[2], 'Qualities make “good” measurable. They will shape every layer below.'],
  [3, CHAPTER_TITLES[3], 'Decisions record the big choices and their trade-offs before structure is drawn.'],
  [4, CHAPTER_TITLES[4], 'The body takes shape: responsibilities grouped into modules, independent of technology.'],
  [5, CHAPTER_TITLES[5], 'Software components wrap the responsibilities they realize. The logical design is now embedded in deployable parts.'],
  [6, CHAPTER_TITLES[6], 'Beneath the components sits the platform they stand on. Shared capabilities form the skeleton across modules.'],
  [7, CHAPTER_TITLES[7], 'Each capability is given a product. Hatched plates are choices not yet made.'],
  [8, CHAPTER_TITLES[8], 'The nervous system appears: a contract on every interaction and an owner for every piece of data.'],
  [9, CHAPTER_TITLES[9], 'Protection wraps the body: trust boundaries, controls, and threats still uncovered.'],
  [10, CHAPTER_TITLES[10], 'The body is placed in the world: where each part runs, how many copies, and what fails together.'],
  [11, CHAPTER_TITLES[11], 'The whole design with its remaining holes. Every gap is a question for the next design conversation.']
];

// The chapter in which each object type is designed.
export const TYPE_CHAPTER = {requirement: 1, quality: 2, decision: 3, module: 4, responsibility: 4, component: 5, party: 5, capability: 6, technology: 7, contract: 8, data: 8, boundary: 9, control: 9, threat: 9, runtime: 10, instance: 10, zone: 10};

export const TYPE_LABEL = {requirement: 'Requirement', quality: 'Quality scenario', decision: 'Decision', module: 'Module', responsibility: 'Responsibility', component: 'Application component', party: 'External participant', capability: 'Technology capability', technology: 'Technology realization', runtime: 'Operating plan', instance: 'Placement', zone: 'Zone', contract: 'Interface contract', data: 'Data definition', control: 'Security control', threat: 'Threat', boundary: 'Trust boundary', option: 'Technology option', system: 'System'};

const KEEP = new Set(['module', 'responsibility', 'component', 'capability', 'technology', 'runtime', 'instance', 'zone', 'environment', 'party', 'contract', 'data', 'control', 'threat', 'boundary', 'requirement', 'quality', 'decision', 'option']);
const RELS = new Set(['memberOf', 'realizedBy', 'requires', 'implementedBy', 'operatedAs', 'placedAs', 'locatedIn', 'interaction', 'owns', 'provides', 'uses', 'exchanges', 'protects', 'mitigates', 'threatens', 'withinBoundary', 'fulfils', 'constrains', 'justifies', 'considers', 'dependency']);
const text = (v, n = 240) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// Normalise the architecture projection into the objects and relationships the anatomy draws.
export function anatomySource(p) {
  const am = architectureModel(p);
  const objects = [];
  for (const o of am.objects.values()) {
    if (!KEEP.has(o.type)) continue;
    const a = o.attributes || {};
    const x = {id: o.id, ref: o.ref || o.id, type: o.type, title: text(o.title, 120), description: text(o.description), owner: o.owner || '', modules: list(o.moduleIds), shared: !!o.shared, status: o.status || ''};
    if (o.type === 'technology') {
      const chosen = list(a.options).find(opt => opt.id === a.selectedOptionId);
      x.product = chosen ? text(chosen.product || chosen.title, 60) : '';
    }
    if (o.type === 'option') x.product = text(a.product || o.title, 60);
    if (o.type === 'runtime') { x.minReady = a.minReady; x.maxReplicas = a.maxReplicas; x.asset = a.assetId; }
    if (o.type === 'instance') { x.replicas = Number(a.replicas) || 1; x.role = a.role || 'active'; x.zone = a.zoneId; }
    if (o.type === 'zone') x.failureDomain = text(a.failureDomain, 80);
    if (o.type === 'contract') {
      x.style = text(a.kind || a.style || 'request', 20);
      x.timeout = text(a.timeoutPolicy || (a.timeoutMs ? a.timeoutMs + ' ms' : ''), 80);
      x.retry = text(a.retryPolicy, 120);
      x.failure = text(a.failurePolicy, 160);
      x.idempotency = text(a.idempotencyKey || a.duplicatePolicy, 120);
    }
    if (o.type === 'data') { x.authority = a.authorityId || ''; x.classification = a.classification || ''; }
    if (o.type === 'quality') x.target = text(a.target || a.measure || a.response, 120);
    if (o.type === 'decision') x.state = a.status || '';
    objects.push(x);
  }
  const ids = new Set(objects.map(o => o.id));
  const rels = am.relationships.filter(r => RELS.has(r.type) && ids.has(r.from) && ids.has(r.to)).map(r => ({type: r.type, from: r.from, to: r.to, label: text(r.label, 60)}));
  // The model's signature is a digest of the whole model (the browser's is a portable SHA-256, half a second at the size
  // of a drafted design): read when a reader asks for it, as the model itself does (architecture-model.js), not on every build.
  return {id: p.id, title: p.name || am.title, get signature() { return am.signature; }, objects, rels, all: am};
}

// Build the indexed anatomy used by layout and rendering.
export function anatomyModel(source) {
  const byId = new Map(source.objects.map(o => [o.id, {...o}]));
  const rels = [], seen = new Set();
  for (const r of source.rels) {
    if (!byId.has(r.from) || !byId.has(r.to)) continue;
    const k = r.type + '|' + r.from + '|' + r.to;
    if (seen.has(k)) continue;
    seen.add(k); rels.push(r);
  }
  const out = new Map(), inn = new Map();
  const push = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const r of rels) { push(out, r.type + '|' + r.from, r); push(inn, r.type + '|' + r.to, r); }
  const O = (t, id) => (out.get(t + '|' + id) || []).map(r => r.to);
  const I = (t, id) => (inn.get(t + '|' + id) || []).map(r => r.from);
  const T = id => byId.get(id)?.type;
  const of = t => [...byId.values()].filter(o => o.type === t);
  const M = {source, byId, rels, O, I, T, title: source.title, get signature() { return source.signature; },
    modules: of('module'), parties: of('party'), resp: of('responsibility'), comp: of('component'), cap: of('capability'), tech: of('technology'), run: of('runtime'), inst: of('instance'), zones: of('zone'), contracts: of('contract'), data: of('data'), controls: of('control'), threats: of('threat'), bounds: of('boundary'), reqs: of('requirement'), qds: of('quality'), adrs: of('decision')};
  const modSet = new Set(M.modules.map(m => m.id));
  M.mod = new Map();
  for (const r of M.resp) { const m = r.modules.find(x => modSet.has(x)) || O('memberOf', r.id).find(x => modSet.has(x)); if (m) M.mod.set(r.id, m); }
  M.realizedBy = new Map(M.resp.map(r => [r.id, O('realizedBy', r.id).filter(x => T(x) === 'component')]));
  M.realizes = new Map(M.comp.map(c => [c.id, I('realizedBy', c.id).filter(x => T(x) === 'responsibility')]));
  for (const c of M.comp) { let m = c.modules.find(x => modSet.has(x)); if (!m) m = M.mod.get((M.realizes.get(c.id) || [])[0]); if (m) M.mod.set(c.id, m); }
  M.needs = new Map(M.comp.map(c => [c.id, O('requires', c.id).filter(x => T(x) === 'capability')]));
  M.capUsers = new Map(M.cap.map(c => [c.id, I('requires', c.id).filter(x => T(x) === 'component')]));
  M.techOf = new Map(M.cap.map(c => [c.id, O('implementedBy', c.id).find(x => T(x) === 'technology') || null]));
  M.capOf = new Map(); for (const [c, t] of M.techOf) if (t) M.capOf.set(t, c);
  M.runsOf = new Map();
  for (const r of M.run) { const a = I('operatedAs', r.id).find(x => byId.has(x)) || r.asset; r.asset = a; push(M.runsOf, a, r.id); }
  M.placements = new Map(M.run.map(r => [r.id, O('placedAs', r.id).map(id => byId.get(id)).filter(Boolean)]));
  for (const pl of M.inst) pl.zoneId = O('locatedIn', pl.id)[0] || pl.zone;
  const actor = id => ['component', 'party'].includes(T(id));
  M.flows = []; const fk = new Set();
  for (const r of rels.filter(r => r.type === 'interaction' && actor(r.from) && actor(r.to))) {
    const k = r.from + '>' + r.to; if (fk.has(k)) continue; fk.add(k);
    const c = M.contracts.find(c => I('uses', c.id).includes(r.from) && I('provides', c.id).includes(r.to));
    M.flows.push({id: 'F:' + k, from: r.from, to: r.to, label: c?.title || r.label, contract: c?.id || null, async: /event|async|publish/i.test(c?.style || '')});
  }
  M.lflows = [];
  for (const r of rels.filter(r => r.type === 'interaction' && T(r.from) === 'responsibility' && T(r.to) === 'responsibility')) {
    const k = r.from + '>' + r.to; if (fk.has('L' + k)) continue; fk.add('L' + k);
    M.lflows.push({id: 'L:' + k, from: r.from, to: r.to, label: r.label, logical: true});
  }
  M.owner = new Map(); M.owned = new Map();
  for (const d of M.data) { const a = I('owns', d.id).find(x => byId.has(x)) || d.authority; M.owner.set(d.id, a); if (a) push(M.owned, a, d.id); }
  M.exch = new Map(M.contracts.map(c => [c.id, O('exchanges', c.id).filter(x => T(x) === 'data')]));
  M.provides = new Map(); M.usesC = new Map();
  for (const c of M.contracts) { for (const p of I('provides', c.id)) push(M.provides, p, c.id); for (const u of I('uses', c.id)) push(M.usesC, u, c.id); }
  M.protects = new Map(); for (const c of M.controls) for (const t of O('protects', c.id)) push(M.protects, t, c.id);
  M.threatsOn = new Map(); for (const t of M.threats) for (const x of O('threatens', t.id)) push(M.threatsOn, x, t.id);
  M.mitig = new Map(M.threats.map(t => [t.id, I('mitigates', t.id)]));
  M.inBound = new Map(); for (const b of M.bounds) for (const x of I('withinBoundary', b.id)) push(M.inBound, x, b.id);
  M.why = id => ({reqs: I('fulfils', id).filter(x => T(x) === 'requirement'), qds: I('constrains', id).filter(x => T(x) === 'quality'), adrs: I('justifies', id).filter(x => T(x) === 'decision')});
  M.shapes = id => [...O('fulfils', id), ...O('constrains', id), ...O('justifies', id)].filter(x => ['responsibility', 'capability'].includes(T(x)));
  M.options = new Map(M.tech.map(t => [t.id, O('considers', t.id).map(id => byId.get(id)).filter(Boolean)]));
  M.zoneColor = new Map(M.zones.map((z, i) => [z.id, ['#3c7b8f', '#7a6aa6', '#b0843a', '#5f8a4e'][i % 4]]));
  M.boundColor = new Map(M.bounds.map((b, i) => [b.id, ['#3f7fa0', '#8f5a76', '#b07a2a', '#5d7f3e', '#7b6aa8'][i % 5]]));
  // Module interaction weights, used by the smart arrangement.
  M.moduleOf = id => (T(id) === 'module' ? id : M.mod.get(id) || null);
  return M;
}

// A drawn object that stands for any recorded object: needs sit with their component,
// options with their technology, fields and exchanges with their data or contract.
export function hostOf(M, id) {
  if (!id) return null;
  if (M.byId.has(id) && M.T(id) !== 'option') return id;
  const all = M.source.all, o = all?.objects.get(id);
  if (!o) return null;
  const via = (type, dir) => all.relationships.find(r => r.type === type && (dir === 'in' ? r.to === id : r.from === id));
  if (o.type === 'option' || o.type === 'alternative') { const r = via('considers', 'in'); return r && M.byId.has(r.from) ? r.from : null; }
  if (o.type === 'need') { const r = via('hasNeed', 'in'); return r && M.byId.has(r.from) ? r.from : null; }
  if (o.type === 'field') { const r = via('partOf', 'out'); return r && M.byId.has(r.to) ? r.to : null; }
  if (o.type === 'exchange') { const c = String(id).split('/exchange/')[0]; return M.byId.has(c) ? c : null; }
  if (o.type === 'path') { const r = via('realizesContract', 'out'); return r && M.byId.has(r.to) ? r.to : null; }
  return null;
}

// The card that carries an object on the canvas: a contract sits with the component that
// provides it, data with its owner, controls and threats with what they concern.
const CARD_TYPES = new Set(['requirement', 'quality', 'decision', 'responsibility', 'component', 'party', 'capability', 'technology', 'runtime']);
export function cardHost(M, id, depth = 0) {
  const h = hostOf(M, id);
  if (!h || depth > 3) return null;
  const t = M.T(h);
  if (CARD_TYPES.has(t)) return h;
  if (t === 'contract') return M.I('provides', h).find(x => CARD_TYPES.has(M.T(x))) || M.I('uses', h).find(x => CARD_TYPES.has(M.T(x))) || null;
  if (t === 'data') { const o = M.owner.get(h); return o && CARD_TYPES.has(M.T(o)) ? o : null; }
  if (t === 'instance') { const plan = M.I('placedAs', h)[0]; return plan || null; }
  if (t === 'control') { const target = M.O('protects', h)[0]; return target ? cardHost(M, target, depth + 1) : null; }
  if (t === 'threat') { const target = M.O('threatens', h)[0]; return target ? cardHost(M, target, depth + 1) : null; }
  return null;
}

// Rule-based findings from every chapter up to `chapter`, attached to the card that
// represents them on the canvas. Findings about the project as a whole stay system-level.
export function anatomyFindings(p, M, chapter = 11) {
  const byHost = new Map(), system = [], all = [];
  for (const f of scopeFindings(p, inheritedFindings(baseOf(p)))) {
    if ((Number(f.chapter) || 11) > chapter) continue;
    const host = cardHost(M, f.objectId), subject = hostOf(M, f.objectId);
    const item = {id: f.id, chapter: Number(f.chapter) || null, level: f.level === 'error' ? 'error' : 'warning', title: f.title, detail: f.detail, objectId: f.objectId, subject, host, rule: String(f.sourceId || f.id).split(':')[0]};
    all.push(item);
    if (host) { if (!byHost.has(host)) byHost.set(host, []); byHost.get(host).push(item); }
    else system.push(item);
  }
  return {all, byHost, system};
}

// Everything above (why/what) and below (how/where) an object — its core sample.
export function lineage(M, id, {lens = 'structure'} = {}) {
  const set = new Set(); if (!id) return set; set.add(id);
  const T = M.T;
  const up = x => {
    const t = T(x); let parents = [];
    if (t === 'component') parents = M.realizes.get(x) || [];
    else if (t === 'capability') parents = M.capUsers.get(x) || [];
    else if (t === 'technology') parents = [M.capOf.get(x)].filter(Boolean);
    else if (t === 'runtime') parents = [M.byId.get(x)?.asset].filter(Boolean);
    else if (t === 'instance') parents = M.I('placedAs', x);
    else if (t === 'responsibility') { const w = M.why(x); parents = [...w.reqs, ...w.qds, ...w.adrs]; }
    for (const q of parents) if (!set.has(q)) { set.add(q); up(q); }
  };
  const down = x => {
    const t = T(x); let kids = [];
    if (['requirement', 'quality', 'decision'].includes(t)) kids = M.shapes(x);
    else if (t === 'responsibility') kids = M.realizedBy.get(x) || [];
    else if (t === 'component') kids = [...(M.needs.get(x) || []), ...(M.runsOf.get(x) || [])];
    else if (t === 'capability') kids = [M.techOf.get(x)].filter(Boolean);
    else if (t === 'technology') kids = M.runsOf.get(x) || [];
    else if (t === 'runtime') kids = (M.placements.get(x) || []).map(pl => pl.id);
    else if (t === 'module') kids = M.resp.filter(r => M.mod.get(r.id) === x).map(r => r.id);
    for (const q of kids) if (!set.has(q)) { set.add(q); down(q); }
  };
  up(id); down(id);
  if (T(id) === 'module') for (const c of M.comp.filter(c => M.mod.get(c.id) === id)) { set.add(c.id); down(c.id); }
  if (['flow', 'signals', 'information', 'protection'].includes(lens)) for (const f of M.flows) if (f.from === id || f.to === id) { set.add(f.from); set.add(f.to); set.add(f.id); }
  if (T(id) === 'data') { const o = M.owner.get(id); if (o) set.add(o); for (const f of M.flows) if (f.contract && (M.exch.get(f.contract) || []).includes(id)) { set.add(f.from); set.add(f.to); set.add(f.id); } }
  if (T(id) === 'contract') for (const f of M.flows) if (f.contract === id) { set.add(f.from); set.add(f.to); set.add(f.id); }
  return set;
}

// Structural gaps and load-bearing parts, derived only from recorded model facts.
export function anatomyInsights(M, chapter, scopeIds = null) {
  const inS = id => !scopeIds || scopeIds.has(id), out = [];
  if (chapter >= 5) for (const r of M.resp.filter(r => inS(r.id) && !(M.realizedBy.get(r.id) || []).length)) out.push({kind: 'gap', text: r.title + ' has no implementing component.', id: r.id, chapter: 5});
  if (chapter >= 6) {
    const hot = M.cap.map(c => ({c, mods: new Set((M.capUsers.get(c.id) || []).map(u => M.mod.get(u))).size, users: (M.capUsers.get(c.id) || []).filter(inS).length})).filter(x => x.mods >= 3 && x.users).sort((a, b) => b.users - a.users).slice(0, 2);
    for (const h of hot) out.push({kind: 'info', text: h.c.title + ' carries ' + (M.capUsers.get(h.c.id) || []).length + ' components in ' + h.mods + ' modules — a load-bearing part of the skeleton. Check its recovery and isolation.', id: h.c.id});
    for (const c of M.cap.filter(c => !(M.capUsers.get(c.id) || []).length && !scopeIds)) out.push({kind: 'info', text: c.title + ' is not used by any component. Keep it, or remove it?', id: c.id, chapter: 6});
  }
  if (chapter >= 7) {
    for (const c of M.cap.filter(c => !M.techOf.get(c.id) && (!scopeIds || (M.capUsers.get(c.id) || []).some(inS)))) out.push({kind: 'gap', text: c.title + ' has no technology realization.', id: c.id, chapter: 7});
    const open = M.tech.filter(t => !t.product && (!scopeIds || (M.capUsers.get(M.capOf.get(t.id)) || []).some(inS)));
    if (open.length) out.push({kind: 'gap', text: open.length + ' technology realization' + (open.length === 1 ? ' has' : 's have') + ' no chosen product yet.', id: open[0].id, chapter: 7});
  }
  if (chapter >= 8) {
    const weak = M.flows.filter(f => f.contract && (inS(f.from) || inS(f.to))).map(f => M.byId.get(f.contract)).filter(c => contractGaps(c).length);
    if (weak.length) out.push({kind: 'gap', text: weak.length + ' contract' + (weak.length === 1 ? ' does' : 's do') + ' not yet say how timeouts, failures or duplicates are handled (e.g. ' + weak[0].ref + ' ' + weak[0].title + ').', id: weak[0].id, chapter: 8});
    const noContract = M.flows.filter(f => !f.contract && (inS(f.from) || inS(f.to)));
    if (noContract.length) out.push({kind: 'gap', text: noContract.length + ' interaction' + (noContract.length === 1 ? ' has' : 's have') + ' no interface contract.', id: noContract[0].from, chapter: 8});
  }
  if (chapter >= 9) for (const t of M.threats.filter(t => !(M.mitig.get(t.id) || []).length)) out.push({kind: 'risk', text: 'Threat “' + t.title + '” has no mitigating control.', id: M.O('threatens', t.id).find(x => M.byId.has(x)) || t.id, chapter: 9});
  if (chapter >= 10) {
    const unplaced = M.run.filter(r => !(M.placements.get(r.id) || []).length && (!scopeIds || inS(r.asset)));
    if (unplaced.length) out.push({kind: 'gap', text: unplaced.length + ' operating plan' + (unplaced.length === 1 ? ' is' : 's are') + ' not placed in any zone.', id: unplaced[0].id, chapter: 10});
    const zones = new Set(M.inst.map(p => p.zoneId));
    if (zones.size === 1 && M.inst.length) out.push({kind: 'risk', text: 'Every placement shares one zone — a single failure domain.', id: M.inst[0].id, chapter: 10});
    const single = M.run.filter(r => { const pl = M.placements.get(r.id) || []; return pl.length && new Set(pl.map(x => x.zoneId)).size === 1 && M.T(r.asset) === 'component' && inS(r.asset); });
    if (single.length && zones.size > 1) out.push({kind: 'info', text: single.length + ' component plan' + (single.length === 1 ? ' runs' : 's run') + ' in one zone only, without a standby.', id: single[0].id, chapter: 10});
  }
  return out;
}

export function contractGaps(c) {
  if (!c) return [];
  const async = /event|async|publish/i.test(c.style || '');
  return [!async && !c.timeout && 'timeout', !(c.retry || c.failure) && 'failure handling', !c.idempotency && 'duplicate handling'].filter(Boolean);
}

// Shared semantic ordering is also used by the exchange model; reading that
// model does not require the anatomy geometry renderer.
// ---------------------------------------------------------------- smart ordering

// Minimum-linear-arrangement heuristic: keep strongly connected parts next to each other and
// let work read left to right. Deterministic; ties keep the recorded order.
export function smartOrder(ids, weight, direction, {fixed = null, iterations = 10, anchors = null} = {}) {
  const n = ids.length;
  if (n < 3 && !fixed) return orient(ids.slice(), direction);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const pairs = [];
  for (const [k, w] of weight) { const [a, b] = k.split('|'); if (idx.has(a) && idx.has(b) && a !== b) pairs.push([a, b, w]); }
  const dirs = [];
  for (const [k, w] of direction) { const [a, b] = k.split('|'); if (idx.has(a) && idx.has(b) && a !== b) dirs.push([a, b, w]); }
  const cost = order => {
    const pos = new Map(order.map((id, i) => [id, i]));
    let c = 0;
    for (const [a, b, w] of pairs) c += w * Math.abs(pos.get(a) - pos.get(b));
    for (const [a, b, w] of dirs) if (pos.get(a) > pos.get(b)) c += w * 0.8;
    // Where work enters from outside, read it from the left; where it leaves, to the right.
    if (anchors) for (const [id, a] of anchors) if (pos.has(id)) c += (a.left || 0) * (pos.get(id) + 1) + (a.right || 0) * (order.length - pos.get(id));
    return c;
  };
  if (fixed) {
    // Keep the architect's arrangement; place new parts where they fit best.
    let order = fixed.filter(id => idx.has(id));
    for (const id of ids) if (!order.includes(id)) {
      let best = null, bestC = Infinity;
      for (let i = 0; i <= order.length; i++) { const t = [...order.slice(0, i), id, ...order.slice(i)], c = cost(t); if (c < bestC - 1e-9) { bestC = c; best = t; } }
      order = best || [...order, id];
    }
    return order;
  }
  // A move's cost is read from the positions it would give (round 5, R5-G): the order is built only for the move that is
  // taken, not for each place tried, which made a module of 500 components a second's work. The sums run in the same order
  // over the same positions, so each cost is the one the built order gives. Repeated ids keep the original search, as
  // does a run with every cache off (document-memo.js unmemoised), which scale-validate.mjs compares with this one.
  const unique = idx.size === n && !memoOff();
  const costAt = (at, id, j) => {
    const p = x => (x === id ? j : at.get(x) < j ? at.get(x) : at.get(x) + 1);
    let c = 0;
    for (const [a, b, w] of pairs) c += w * Math.abs(p(a) - p(b));
    for (const [a, b, w] of dirs) if (p(a) > p(b)) c += w * 0.8;
    if (anchors) for (const [aid, a] of anchors) if (idx.has(aid)) c += (a.left || 0) * (p(aid) + 1) + (a.right || 0) * (n - p(aid));
    return c;
  };
  let order = ids.slice(), best = cost(order);
  for (let it = 0; it < iterations; it++) {
    let improved = false;
    for (let i = 0; i < n; i++) {
      const id = order[i], rest = order.filter(x => x !== id), at = unique ? new Map(rest.map((x, r) => [x, r])) : null;
      for (let j = 0; j <= rest.length; j++) {
        if (j === i) continue;
        if (unique) { const c = costAt(at, id, j); if (c < best - 1e-9) { best = c; order = [...rest.slice(0, j), id, ...rest.slice(j)]; improved = true; break; } continue; }
        const t = [...rest.slice(0, j), id, ...rest.slice(j)], c = cost(t);
        if (c < best - 1e-9) { best = c; order = t; improved = true; break; }
      }
    }
    if (!improved) break;
  }
  return order;
}
function orient(order, direction) {
  if (order.length !== 2) return order;
  const [a, b] = order, ab = direction.get(a + '|' + b) || 0, ba = direction.get(b + '|' + a) || 0;
  return ba > ab ? [b, a] : order;
}
const addW = (m, a, b, w) => { if (!a || !b || a === b) return; const k = a < b ? a + '|' + b : b + '|' + a; m.set(k, (m.get(k) || 0) + w); };
const addD = (m, a, b, w) => { if (!a || !b || a === b) return; const k = a + '|' + b; m.set(k, (m.get(k) || 0) + w); };

export function moduleOrder(M, fixed = null) {
  const w = new Map(), d = new Map(), mod = id => M.mod.get(id);
  for (const f of M.flows) { addW(w, mod(f.from), mod(f.to), 3); addD(d, mod(f.from), mod(f.to), 1); }
  for (const f of M.lflows) { addW(w, mod(f.from), mod(f.to), 2); addD(d, mod(f.from), mod(f.to), 0.5); }
  for (const [r, cs] of M.realizedBy) for (const c of cs) addW(w, mod(r), mod(c), 2);
  for (const [, users] of M.capUsers) { const ms = [...new Set(users.map(mod).filter(Boolean))]; if (ms.length > 4) continue; for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) addW(w, ms[i], ms[j], 0.25); }
  // Parties pull the modules they talk to towards the edge they will sit on: parties that only
  // start work pull left, parties that only receive it pull right.
  const anchors = new Map(), anchor = (id, k, v) => { if (!id) return; const a = anchors.get(id) || {}; a[k] = (a[k] || 0) + v; anchors.set(id, a); };
  for (const p of M.parties) {
    const out = M.flows.filter(f => f.from === p.id), inn = M.flows.filter(f => f.to === p.id);
    if (out.length && !inn.length) for (const f of out) anchor(mod(f.to), 'left', 3);
    if (inn.length && !out.length) for (const f of inn) anchor(mod(f.from), 'right', 1);
  }
  return smartOrder(M.modules.map(m => m.id), w, d, {fixed, anchors});
}

// Components inside one module: partners on the left pull a component left.
export function componentOrder(M, comps, colPos, fixed = null) {
  const w = new Map(), d = new Map(), set = new Set(comps);
  for (const f of M.flows) if (set.has(f.from) && set.has(f.to)) { addW(w, f.from, f.to, 3); addD(d, f.from, f.to, 1); }
  let order = smartOrder(comps, w, d, {fixed});
  if (!fixed && colPos) {
    const bary = id => { const ps = M.flows.filter(f => f.from === id || f.to === id).map(f => colPos(f.from === id ? f.to : f.from)).filter(v => v !== null && v !== undefined); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null; };
    const inner = M.flows.filter(f => set.has(f.from) && set.has(f.to)).length;
    if (!inner) order = order.map((id, i) => ({id, i, b: bary(id)})).sort((a, b) => (a.b ?? a.i) - (b.b ?? b.i) || a.i - b.i).map(x => x.id);
  }
  return order;
}
