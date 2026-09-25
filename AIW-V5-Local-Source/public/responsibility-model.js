// Logical application — the semantic model behind the Chapter 4 Model views.
//
// Responsibilities are the organs of the design. Each owns a boundary, serves steps of the
// business journey, hands work to others through logical flows, carries the reasons it exists
// (requirements, quality drivers, decisions) and, one layer down, is realised by an application
// component (Chapter 5). The model lays the responsibilities over the journey — steps across,
// responsibility groups down — the way a service blueprint does. Pure: responsibilityModel reads
// plain records, and responsibilitySource adapts a project without ever writing to it.
import {logicalRecords, physicalObjects, driversForResponsibility, logicalSourceChanged, mappingCurrent, logicalGraph, logicalFindings, logicalProposal, scenarioCurrent} from './logical-domain.js';
import {projectNodes, projectScenarios, scenarioSteps, isBlankProject} from './model-scope.js';
import {chosen, decisionCurrent, governanceLabel} from './decisions-domain.js';

export const RESPONSIBILITY_SCHEMA = 'aiw.responsibility/1';
export const UNGROUPED = 'GRP:none', UNOWNED = 'GRP:unowned', ACROSS = 'S:across', PROPOSED = 'PROPOSED';
const SCENARIO_TITLE = {success: 'Successful payment', hold: 'Risk hold', timeout: 'Settlement timeout'};
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uniq = a => [...new Set(a)];
const pad = n => String(n).padStart(2, '0');
const bare = s => String(s || '').trim().replace(/[.!?]+$/, '');
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

// ---------------------------------------------------------------- adapter

export function responsibilitySource(p) {
  const blank = isBlankProject(p);
  let nodes = [];
  try { nodes = logicalGraph(p).nodes; } catch { nodes = []; }
  const nodeOf = new Map(nodes.map(n => [n.id, n]));
  const steps = projectNodes(p).filter(n => n.layer === 'process').map(n => ({id: n.id, ref: n.ref || '', title: text(n.title, 120), description: text(n.description, 300)}));
  const responsibilities = logicalRecords(p).map(r => {
    let changed = false, drivers = [];
    try { changed = logicalSourceChanged(p, r); } catch { changed = false; }
    try { drivers = driversForResponsibility(p, r).map(d => ({id: d.id, direct: list(d.responsibilityIds).includes(r.id)})); } catch { drivers = []; }
    return {id: r.id, ref: r.ref || r.id, title: text(r.title, 160), purpose: text(r.purpose, 300), boundary: text(r.boundary, 300), owner: text(r.owner, 100), source: text(r.source, 200), group: r.groupId || '', order: r.order, origin: r.origin || 'user', confirmed: !!r.confirmed, changed, requirementIds: list(r.requirementIds), decisionIds: list(r.decisionIds), drivers};
  });
  const components = new Map();
  try { for (const c of physicalObjects(p)) components.set(c.id, {id: c.id, ref: c.ref || c.id, title: text(c.title, 120), kind: c.componentKind || '', status: c.attrs?.['Design state'] || 'candidate'}); } catch { /* optional */ }
  for (const c of list(p?.realisation?.components)) components.set(c.id, {id: c.id, ref: c.ref || c.id, title: text(c.title, 120), kind: c.kind || '', status: c.status || 'candidate'});
  const mappings = list(p?.logical?.mappings).map(m => { let current = true; try { current = mappingCurrent(p, m); } catch { current = true; } return {id: m.id, logicalId: m.logicalId, physicalId: m.physicalId, scope: text(m.scope, 200), owner: text(m.owner, 80), status: m.status || 'candidate', current}; });
  const interactions = list(p?.realisation?.connections).filter(c => ['sync', 'event', 'data'].includes(c.interaction)).map(c => ({id: c.id, from: c.from, to: c.to, kind: c.interaction, label: text(c.label, 60)}));
  const connections = list(p?.logical?.connections).map(c => ({id: c.id, from: c.from, to: c.to, label: text(c.label, 80), kind: c.kind === 'flow' ? 'flow' : 'trace', condition: text(c.condition, 220), origin: c.origin || 'user'}));
  const objects = uniq(connections.flatMap(c => [c.from, c.to])).map(id => nodeOf.get(id)).filter(Boolean).map(n => ({id: n.id, ref: n.ref || '', title: text(n.title, 120), layer: n.layer || 'other'}));
  const requirements = list(p?.artefacts).filter(a => a.type === 'requirement').map(a => ({id: a.id, title: text(a.title, 160), description: text(a.description, 300), priority: a.priority || '', owner: text(a.owner, 80)}));
  const drivers = list(p?.quality?.drivers).map(d => ({id: d.id, title: text(d.title, 160), category: d.category || '', priority: d.priority || '', response: text(d.response, 220), target: text([d.metric, d.operator, d.targetValue, d.unit].filter(Boolean).join(' '), 140), rank: d.rank ?? 99}));
  const decisions = list(p?.decisions?.records).map(d => {
    let current = false, label = '';
    try { current = decisionCurrent(p, d); label = governanceLabel(d, p); } catch { /* optional */ }
    const ch = chosen(d);
    return {id: d.id, question: text(d.question, 200), status: d.status || 'draft', current, label, chosen: list(ch?.responsibilityIds), chosenTitle: text(ch?.title, 120), considered: uniq(list(d.alternatives).flatMap(a => list(a.responsibilityIds)))};
  });
  const scenarios = projectScenarios(p).map(id => { let reviewed = false; try { reviewed = scenarioCurrent(p, id); } catch { reviewed = false; } return {id, title: blank ? 'Recorded journey' : SCENARIO_TITLE[id] || id, steps: scenarioSteps(p, id), reviewed}; });
  let findings = [];
  try { findings = logicalFindings(p); } catch { findings = []; }
  const proposals = [];
  for (const key of blank ? [null] : ['review', 'dedup', 'recovery']) {
    try { const q = logicalProposal(p, key); if (q) proposals.push({key: q.key, source: q.source || null, title: text(q.title, 120), layer: q.layer || 'logical', groupId: q.groupId || '', relationship: text(q.relationship, 80), requirementIds: list(q.requirementIds), existingId: q.existingId || null, reason: text(q.reason, 300), effect: text(q.effect, 300)}); } catch { /* optional */ }
  }
  return responsibilityModel({blank, steps, groups: list(p?.logical?.groups).map(g => ({id: g.id, title: text(g.title, 120), purpose: text(g.purpose, 200)})), responsibilities, connections, objects, mappings, components: [...components.values()], interactions, requirements, drivers, decisions, scenarios, findings, proposals});
}

// ---------------------------------------------------------------- model

export function responsibilityModel(src = {}) {
  const steps = list(src.steps).map((s, i) => ({id: s.id, ref: s.ref || '', title: s.title || s.id, description: s.description || '', index: i, num: pad(i + 1), served: []}));
  const stepIx = new Map(steps.map(s => [s.id, s.index]));
  const groups = new Map(list(src.groups).map((g, i) => [g.id, {id: g.id, title: g.title || g.id, purpose: g.purpose || '', index: i, members: []}]));
  const ordered = list(src.responsibilities).slice().sort((a, b) => (a.order ?? 1e6) - (b.order ?? 1e6) || String(a.ref).localeCompare(String(b.ref)));
  const R = new Map();
  ordered.forEach((r, i) => R.set(r.id, {id: r.id, ref: r.ref || r.id, title: r.title || r.id, purpose: r.purpose || '', boundary: r.boundary || '', owner: r.owner || '', source: r.source || '', origin: r.origin || 'user', confirmed: !!r.confirmed, changed: !!r.changed, order: i,
    group: groups.has(r.group) ? r.group : UNGROUPED, requirementIds: list(r.requirementIds), decisionIds: list(r.decisionIds), drivers: list(r.drivers),
    steps: [], context: [], in: [], out: [], allocations: [], realisedBy: [], scenarios: []}));
  for (const r of R.values()) r.defined = !!(r.purpose && r.boundary && r.owner && r.source);
  const O = new Map(list(src.objects).map(o => [o.id, o]));
  // Recorded connections: between responsibilities they are logical flows; from a journey step
  // they say which responsibility serves it; anything else is what a responsibility owns,
  // exposes, uses, or is protected by.
  const flows = [];
  for (const c of list(src.connections)) {
    const a = R.has(c.from), b = R.has(c.to);
    if (a && b) { if (c.from !== c.to) flows.push({id: c.id, from: c.from, to: c.to, label: c.label || '', kind: c.kind === 'flow' ? 'flow' : 'trace', condition: c.condition || '', origin: c.origin || 'user'}); continue; }
    if (!a && !b) continue;
    const rid = a ? c.from : c.to, other = a ? c.to : c.from, r = R.get(rid);
    if (stepIx.has(other)) { if (!r.steps.includes(other)) r.steps.push(other); continue; }
    const o = O.get(other);
    r.context.push({id: c.id, object: other, label: c.label || '', outward: a, layer: o?.layer || 'other', title: o?.title || other, ref: o?.ref || ''});
  }
  const flowOf = new Map(flows.map(f => [f.id, f]));
  for (const f of flows) { R.get(f.from).out.push(f.id); R.get(f.to).in.push(f.id); }
  for (const r of R.values()) { r.steps.sort((x, y) => stepIx.get(x) - stepIx.get(y)); for (const s of r.steps) steps[stepIx.get(s)].served.push(r.id); }
  // Where each responsibility stands in the journey: the first step it serves; otherwise the step
  // of the responsibilities that hand it work (or that it hands work to, or the step between the
  // two); otherwise off the journey.
  for (const r of R.values()) r.stage = r.steps.length ? stepIx.get(r.steps[0]) : null;
  for (let pass = 0; pass <= R.size; pass++) {
    let changed = false;
    for (const r of R.values()) {
      if (r.stage !== null) continue;
      const up = r.in.map(id => R.get(flowOf.get(id).from).stage).filter(s => s !== null);
      const down = r.out.map(id => R.get(flowOf.get(id).to).stage).filter(s => s !== null);
      // Between what hands it work and what it hands work to, it stands at the step in between.
      if (up.length) { const a = Math.max(...up), b = down.length ? Math.min(...down) : a; r.stage = b - a >= 2 ? a + 1 : a; } else if (down.length) r.stage = Math.min(...down); else continue;
      r.derived = true; changed = true;
    }
    if (!changed) break;
  }
  for (const r of R.values()) { r.offJourney = r.stage === null; if (r.offJourney) r.stage = steps.length; }
  // One layer down: the components that realise each responsibility, and whether the
  // interactions between them carry each logical flow.
  const C = new Map(list(src.components).map(c => [c.id, c]));
  for (const m of list(src.mappings)) { const r = R.get(m.logicalId); if (r) r.allocations.push({id: m.id, component: m.physicalId, known: C.has(m.physicalId), scope: m.scope || '', status: m.status || 'candidate', current: m.current !== false}); }
  for (const r of R.values()) r.realisedBy = uniq(r.allocations.filter(a => a.known).map(a => a.component));
  const I = list(src.interactions);
  for (const f of flows) {
    const a = R.get(f.from).realisedBy, b = R.get(f.to).realisedBy;
    f.carriedBy = I.filter(i => a.includes(i.from) && b.includes(i.to)).map(i => i.id);
    f.inside = a.some(x => b.includes(x));
    f.realised = a.length > 0 && b.length > 0;
    f.carried = f.carriedBy.length > 0 || f.inside;
  }
  // The reasons: requirements (Chapter 1), quality drivers (Chapter 2) and decisions (Chapter 3).
  const Q = new Map(list(src.requirements).map(q => [q.id, {...q, covers: []}]));
  const D = new Map(list(src.drivers).map(d => [d.id, {...d, direct: [], via: []}]));
  const A = new Map(list(src.decisions).map(d => [d.id, {...d, linked: [], considered: list(d.considered), chosen: list(d.chosen)}]));
  for (const r of R.values()) {
    r.reqs = r.requirementIds.filter(id => Q.has(id)); r.broken = r.requirementIds.filter(id => !Q.has(id)).concat(r.decisionIds.filter(id => !A.has(id)));
    for (const id of r.reqs) Q.get(id).covers.push(r.id);
    r.qds = r.drivers.filter(d => D.has(d.id));
    for (const d of r.qds) (d.direct ? D.get(d.id).direct : D.get(d.id).via).push(r.id);
    r.adrs = r.decisionIds.filter(id => A.has(id));
    for (const id of r.adrs) A.get(id).linked.push(r.id);
  }
  const scenarios = list(src.scenarios).map(s => ({id: s.id, title: s.title || s.id, steps: list(s.steps).filter(i => Number.isInteger(i) && steps[i]), reviewed: !!s.reviewed}));
  for (const s of scenarios) for (const i of s.steps) for (const id of steps[i].served) { const r = R.get(id); if (!r.scenarios.includes(s.id)) r.scenarios.push(s.id); }
  for (const f of flows) f.scenarios = scenarios.filter(s => s.steps.some((i, n) => n > 0 && steps[s.steps[n - 1]].served.includes(f.from) && steps[i].served.includes(f.to))).map(s => s.id);
  for (const r of R.values()) if (groups.has(r.group)) groups.get(r.group).members.push(r.id);
  for (const s of steps) s.hole = !s.served.length;
  const bands = [...groups.keys()];
  if ([...R.values()].some(r => r.group === UNGROUPED)) bands.push(UNGROUPED);
  if (steps.some(s => s.hole)) bands.push(UNOWNED);
  return {blank: !!src.blank, steps, groups, R, flows, O, C, Q, D, A, interactions: I, scenarios, bands, findings: list(src.findings), proposals: list(src.proposals)};
}

export function laneOf(LM, r) { return r.stage < LM.steps.length ? 'S:' + r.stage : ACROSS; }
export function laneInfo(LM, id) {
  if (id === ACROSS) return {id, kind: 'across', title: 'Off the journey', sub: 'serves no journey step', num: '—'};
  const s = LM.steps[Number(String(id).slice(2))];
  return s ? {id, kind: 'step', step: s.id, title: s.title, num: s.num, sub: s.hole ? 'no responsibility serves it' : s.served.map(r => LM.R.get(r).ref).join(' · '), hole: s.hole} : {id, kind: 'step', title: id, num: '', sub: ''};
}
export function bandInfo(LM, id) {
  if (id === UNGROUPED) return {id, kind: 'ungrouped', title: 'Ungrouped', sub: 'place these in a responsibility group'};
  if (id === UNOWNED) return {id, kind: 'unowned', title: 'Nobody owns these steps', sub: 'journey steps no responsibility serves'};
  const g = LM.groups.get(id);
  return {id, kind: 'group', title: g?.title || id, sub: g?.purpose || '', index: g?.index ?? 99};
}
const bandIx = (LM, id) => { const i = LM.bands.indexOf(id); return i < 0 ? LM.bands.length : i; };

// ---------------------------------------------------------------- slicing

export function responsibilityScope(LM, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (LM.groups.has(scope.id) || (scope.id === UNGROUPED && LM.bands.includes(UNGROUPED))) return {kind: 'group', id: scope.id};
  if (LM.R.has(scope.id)) return {kind: 'part', id: scope.id};
  const f = LM.flows.find(x => x.id === scope.id);
  if (f) return {kind: 'part', id: f.from, focus: f.id};
  return {kind: 'system'};
}
export function defaultDepth(LM) { return LM.R.size > 30 ? 'groups' : 'responsibilities'; }

// The drawn map: one row per responsibility (or per group and step when folded), placed in the
// lane of its journey step and the band of its group; the logical flows between rows.
export function foldResponsibilities(LM, scope = {kind: 'system'}, depth = 'responsibilities', {proposal = null} = {}) {
  const sc = responsibilityScope(LM, scope);
  let core = null;
  const near = new Set();
  if (sc.kind === 'group') core = new Set([...LM.R.values()].filter(r => r.group === sc.id).map(r => r.id));
  if (sc.kind === 'part') core = new Set([sc.id]);
  if (core) { for (const f of LM.flows) { if (core.has(f.from)) near.add(f.to); if (core.has(f.to)) near.add(f.from); } for (const id of core) near.delete(id); }
  const folded = depth === 'groups' && !core;
  const lane = r => laneOf(LM, r);
  const rs = [...LM.R.values()].filter(r => !core || core.has(r.id) || near.has(r.id));
  // Folded, each group is one card at the first step it acts on, naming the steps it spans.
  const first = new Map();
  if (folded) for (const r of rs) first.set(r.group, Math.min(first.get(r.group) ?? Infinity, r.stage));
  const rows = [], index = new Map();
  for (const r of rs) {
    if (folded) {
      const id = 'G:' + r.group, st = first.get(r.group);
      if (index.has(id)) { index.get(id).members.push(r.id); continue; }
      const row = {id, kind: 'cell', region: st < LM.steps.length ? 'S:' + st : ACROSS, band: r.group, stage: st, members: [r.id], order: r.order};
      index.set(id, row); rows.push(row); continue;
    }
    rows.push({id: r.id, kind: 'resp', region: lane(r), band: r.group, stage: r.stage, members: [r.id], order: r.order, ctx: !!core && !core.has(r.id), subject: sc.kind === 'part' && sc.id === r.id});
  }
  if (!core) {
    for (const s of LM.steps) if (s.hole) rows.push({id: 'HOLE:' + s.id, kind: 'hole', region: 'S:' + s.index, band: UNOWNED, stage: s.index, members: [], order: 0, step: s.id});
    for (const g of LM.groups.values()) if (!g.members.length) rows.push({id: 'EMPTY:' + g.id, kind: 'empty', region: LM.steps.length ? 'S:0' : ACROSS, band: g.id, stage: 0, members: [], order: 0, group: g.id});
  }
  // An unsaved responsibility proposal stands in its group, at the step of what it works with.
  let ghost = null;
  if (proposal && proposal.title && !proposal.existingId && proposal.layer === 'logical') {
    const src = LM.R.get(proposal.source), step = LM.steps.find(s => s.id === proposal.source);
    if (!core || (src && (core.has(src.id) || near.has(src.id)))) {
      const stage = src ? src.stage : step ? step.index : (LM.steps.length ? 0 : LM.steps.length);
      const band = LM.groups.has(proposal.groupId) ? proposal.groupId : src ? src.group : UNGROUPED;
      ghost = {id: PROPOSED, kind: 'proposed', region: stage < LM.steps.length ? 'S:' + stage : ACROSS, band, stage, members: [], order: 1e6, title: text(proposal.title, 120), source: src ? src.id : null, step: step ? step.id : null, requirementIds: list(proposal.requirementIds), relationship: text(proposal.relationship, 60), proposed: true};
      rows.push(ghost);
    }
  }
  const bands = [...LM.bands];
  if (ghost && !bands.includes(ghost.band)) bands.splice(bands.includes(UNOWNED) ? bands.length - 1 : bands.length, 0, ghost.band);
  const bix = id => { const i = bands.indexOf(id); return i < 0 ? bands.length : i; };
  const kindRank = {resp: 0, cell: 0, empty: 0, hole: 0, proposed: 1};
  rows.sort((a, b) => bix(a.band) - bix(b.band) || a.stage - b.stage || kindRank[a.kind] - kindRank[b.kind] || a.order - b.order || (a.id < b.id ? -1 : 1));
  const rid = new Map(); for (const r of rows) for (const m of r.members) rid.set(m, r.id);
  const links = [], seen = new Map();
  for (const f of LM.flows) {
    const a = rid.get(f.from), b = rid.get(f.to);
    if (!a || !b || a === b) continue;
    const k = a + '>' + b;
    if (seen.has(k)) { seen.get(k).flows.push(f.id); continue; }
    const l = {id: 'L:' + k, from: a, to: b, flows: [f.id], dim: sc.kind === 'part' ? !(f.from === sc.id || f.to === sc.id) : false};
    seen.set(k, l); links.push(l);
  }
  for (const l of links) {
    const fs = l.flows.map(id => LM.flows.find(f => f.id === id));
    l.kind = fs.every(f => f.kind === 'trace') ? 'trace' : 'flow';
    l.label = fs.length === 1 ? fs[0].label : uniq(fs.map(f => f.label).filter(Boolean)).join(' · ') || fs.length + ' flows';
    l.ref = fs.length === 1 ? fs[0].id : '';
    l.refs = fs.map(f => f.id);
    l.conditional = fs.some(f => f.condition);
    l.carried = fs.every(f => f.carried);
    l.realised = fs.every(f => f.realised);
    l.carriedBy = uniq(fs.flatMap(f => f.carriedBy));
    l.scenarios = uniq(fs.flatMap(f => f.scenarios));
  }
  if (ghost && ghost.source && rid.has(ghost.source)) links.push({id: 'L:' + rid.get(ghost.source) + '>' + PROPOSED, from: rid.get(ghost.source), to: PROPOSED, flows: [], proposed: true, dim: false, label: ghost.relationship || 'hands work to', ref: '', refs: [], kind: 'flow', conditional: false, carried: false, realised: false, carriedBy: [], scenarios: []});
  const used = new Set(rows.map(r => r.region));
  // Sliced or folded, only the steps something stands at are drawn.
  const laneIds = [...LM.steps.map(s => 'S:' + s.index).filter(id => (!core && !folded) || used.has(id)), ...(used.has(ACROSS) ? [ACROSS] : [])];
  const lanes = laneIds.map(id => laneInfo(LM, id));
  return {scope: sc, depth: folded ? 'groups' : 'responsibilities', lanes, rows, links, bands: bands.filter(b => rows.some(r => r.band === b)), rowOf: id => rid.get(id) || null};
}

// ---------------------------------------------------------------- coverage

// The reasons × the responsibilities: which requirement, quality driver and decision each
// responsibility carries, and which reasons nothing carries.
export function coverage(LM, scope = {kind: 'system'}, {proposal = null} = {}) {
  const sc = responsibilityScope(LM, scope);
  const inCol = r => sc.kind === 'system' || (sc.kind === 'group' ? r.group === sc.id : r.id === sc.id);
  const rs = [...LM.R.values()].filter(inCol).sort((a, b) => bandIx(LM, a.group) - bandIx(LM, b.group) || a.stage - b.stage || a.order - b.order);
  const cols = rs.map(r => ({id: r.id, ref: r.ref, title: r.title, group: r.group, noReq: !r.reqs.length, noAdr: !r.adrs.length, counts: [r.reqs.length, r.qds.length, r.adrs.length]}));
  const ghost = proposal && proposal.title && !proposal.existingId && proposal.layer === 'logical' ? proposal : null;
  if (ghost) {
    const src = LM.R.get(ghost.source), group = LM.groups.has(ghost.groupId) ? ghost.groupId : src ? src.group : UNGROUPED;
    if (sc.kind === 'system' || (sc.kind === 'group' && sc.id === group) || (sc.kind === 'part' && src && sc.id === src.id)) {
      const at = cols.map(c => c.group).lastIndexOf(group);
      cols.splice(at < 0 ? cols.length : at + 1, 0, {id: PROPOSED, ref: 'Proposed', title: text(ghost.title, 120), group, proposed: true, reqs: list(ghost.requirementIds).filter(id => LM.Q.has(id)), counts: [0, 0, 0]});
    }
  }
  const ids = new Set(cols.map(c => c.id)), touches = xs => sc.kind === 'system' || xs.some(id => ids.has(id));
  const rows = [], cells = [];
  const reqs = [...LM.Q.values()].filter(q => touches(q.covers) || (ghost && cols.some(c => c.proposed && c.reqs.includes(q.id))));
  for (const q of reqs) {
    rows.push({id: q.id, kind: 'req', group: 'req', ref: q.id, title: q.title, sub: q.priority, covers: q.covers, state: q.covers.length ? 'covered' : 'open'});
    for (const c of cols) if (c.proposed ? c.reqs.includes(q.id) : q.covers.includes(c.id)) cells.push({row: q.id, col: c.id, mark: c.proposed ? 'proposed' : 'linked'});
  }
  for (const d of [...LM.D.values()].filter(d => touches([...d.direct, ...d.via])).sort((a, b) => a.rank - b.rank || String(a.id).localeCompare(String(b.id)))) {
    rows.push({id: d.id, kind: 'qd', group: 'qd', ref: d.id, title: d.title, sub: d.priority, covers: [...d.direct, ...d.via], state: d.direct.length ? 'covered' : d.via.length ? 'inherited' : 'open'});
    for (const c of cols) if (d.direct.includes(c.id)) cells.push({row: d.id, col: c.id, mark: 'direct'}); else if (d.via.includes(c.id)) cells.push({row: d.id, col: c.id, mark: 'inherited'});
  }
  for (const d of [...LM.A.values()].filter(d => touches([...d.linked, ...d.considered]))) {
    rows.push({id: d.id, kind: 'adr', group: 'adr', ref: d.id, title: d.question, sub: d.status, covers: d.linked, state: !d.linked.length ? 'open' : d.current ? 'covered' : 'draft'});
    for (const c of cols) { if (c.proposed) continue; if (d.linked.includes(c.id)) cells.push({row: d.id, col: c.id, mark: d.current ? 'accepted' : 'draft', chosen: d.chosen.includes(c.id)}); else if (d.considered.includes(c.id)) cells.push({row: d.id, col: c.id, mark: 'considered'}); }
  }
  const TITLES = {req: 'Requirements · Chapter 1', qd: 'Quality drivers · Chapter 2', adr: 'Decisions · Chapter 3'};
  const groups = ['req', 'qd', 'adr'].map(g => ({group: g, title: TITLES[g], count: rows.filter(r => r.group === g).length})).filter(g => g.count);
  return {scope: sc, rows, cols, cells, groups, uncovered: rows.filter(r => r.kind === 'req' && r.state === 'open').map(r => r.id)};
}

// ---------------------------------------------------------------- walking a journey

// Each step of a journey scenario: who serves it, which flow brought the work there, and — when
// the scenario stops before the journey's end — which onward flows are not taken.
export function journeyWalk(LM, scenarioId) {
  const sc = LM.scenarios.find(s => s.id === scenarioId) || LM.scenarios[0];
  if (!sc) return [];
  return sc.steps.map((k, n) => {
    const s = LM.steps[k], prev = n ? LM.steps[sc.steps[n - 1]] : null, last = n === sc.steps.length - 1, early = last && k < LM.steps.length - 1;
    const from = prev ? LM.flows.filter(f => prev.served.includes(f.from) && s.served.includes(f.to)).map(f => f.id) : [];
    const onward = early ? LM.flows.filter(f => s.served.includes(f.from) && !s.served.includes(f.to)).map(f => f.id) : [];
    return {scenario: sc.id, n, of: sc.steps.length, step: s.id, index: k, served: s.served.slice(), from, last, early, onward};
  });
}

const refTitle = (LM, id) => { const r = LM.R.get(id); if (r) return r.ref + ' ' + r.title; const c = LM.C.get(id); if (c) return (c.ref ? c.ref + ' ' : '') + c.title; return LM.O.get(id)?.title || LM.Q.get(id)?.title || id; };
const stepTitle = s => s.num + ' ' + s.title;
export function describeWalk(LM, w) {
  if (!w) return '';
  const s = LM.steps[w.index], sc = LM.scenarios.find(x => x.id === w.scenario);
  const flow = id => LM.flows.find(f => f.id === id);
  const who = w.served.length ? 'Served by ' + w.served.map(id => refTitle(LM, id) + ' (' + bandInfo(LM, LM.R.get(id).group).title + ')').join(' and ') + '.' : 'No responsibility serves this step — the journey has a hole here.';
  const from = w.from.length ? ' It takes over from ' + w.from.map(id => refTitle(LM, flow(id).from) + ' (' + flow(id).label + ')').join(' and ') + '.' : w.n > 0 && w.served.length ? ' No logical flow brings the work here from the step before.' : '';
  let end = '';
  if (w.early) {
    const on = w.onward.map(flow), rest = LM.steps.slice(w.index + 1);
    end = ` The ${sc.title} journey ends here${on.length && on.every(f => f.condition) ? ' — the onward flow carries a condition: “' + bare(on[0].condition) + '”' : ''}. Not reached: ${rest.map(stepTitle).join(', ')}.`;
  } else if (w.last) end = ` The ${sc.title} journey is complete.`;
  return `${stepTitle(s)}. ${who}${from}${end}`;
}

// ---------------------------------------------------------------- reading

export function describeResponsibility(LM, id) {
  const r = LM.R.get(id);
  if (!r) return '';
  const flow = fid => LM.flows.find(f => f.id === fid);
  const where = r.steps.length ? 'serves ' + r.steps.map(s => stepTitle(LM.steps.find(x => x.id === s))).join(' and ') : r.offJourney ? 'serves no journey step' : 'acts at step ' + LM.steps[r.stage].num + ' through its flows';
  const own = r.context.filter(c => c.layer === 'data').map(c => c.title);
  const ins = r.in.map(fid => refTitle(LM, flow(fid).from) + ' (' + flow(fid).label + ')');
  const outs = r.out.map(fid => refTitle(LM, flow(fid).to) + ' (' + flow(fid).label + (flow(fid).condition ? ', on condition “' + bare(flow(fid).condition) + '”' : '') + ')');
  return `${r.ref} ${r.title}, in ${bandInfo(LM, r.group).title}, ${where}.${own.length ? ' It owns ' + own.join(' and ') + '.' : ''}${ins.length ? ' It takes over from ' + ins.join(' and ') + '.' : ''}${outs.length ? ' It hands on to ' + outs.join(' and ') + '.' : ''} ${r.reqs.length ? 'It covers ' + r.reqs.join(', ') : 'No requirement is linked to it'}${r.realisedBy.length ? ' and is realised by ' + r.realisedBy.map(c => refTitle(LM, c)).join(' and ') + '.' : ', and no component realises it yet.'}`;
}
export function describeFlow(LM, id) {
  const f = LM.flows.find(x => x.id === id);
  if (!f) return '';
  const ix = iid => LM.interactions.find(i => i.id === iid);
  const carried = f.carriedBy.length ? ` In Chapter 5, ${f.carriedBy.map(i => `${i} (${LM.C.get(ix(i).from)?.title || ix(i).from} → ${LM.C.get(ix(i).to)?.title || ix(i).to})`).join(' and ')} ${f.carriedBy.length === 1 ? 'carries' : 'carry'} it.` : f.inside ? ' One component realises both ends, so the flow stays inside it.' : f.realised ? ` No interaction between ${LM.R.get(f.from).realisedBy.map(c => refTitle(LM, c)).join(' / ')} and ${LM.R.get(f.to).realisedBy.map(c => refTitle(LM, c)).join(' / ')} carries it yet.` : ' Its ends are not both realised by a component yet.';
  return `${refTitle(LM, f.from)} ${f.kind === 'flow' ? 'hands work to' : 'relates to'} ${refTitle(LM, f.to)} (${f.label}).${f.condition ? ' Its condition: “' + bare(f.condition) + '”.' : ''}${carried}`;
}

// Observations drawn only from recorded facts, as prompts for review.
export function responsibilityInsights(LM, scope = {kind: 'system'}) {
  const out = [], sc = responsibilityScope(LM, scope), sys = sc.kind === 'system';
  const inS = r => sys || (sc.kind === 'group' ? r.group === sc.id : r.id === sc.id);
  const rs = [...LM.R.values()].filter(inS), names = xs => xs.map(r => r.ref + ' ' + r.title).join(', ');
  const fl = LM.flows.filter(f => sys || rs.some(r => r.id === f.from || r.id === f.to));
  const holes = sys ? LM.steps.filter(s => s.hole) : [];
  if (holes.length) out.push({kind: 'gap', id: holes[0].id, text: `${plural(holes.length, 'journey step has', 'journey steps have')} no responsibility: ${holes.map(stepTitle).join(', ')}.`, ask: `Which responsibility owns “${holes[0].title}”?`});
  const unc = sys ? [...LM.Q.values()].filter(q => !q.covers.length) : [];
  if (unc.length) out.push({kind: 'gap', id: unc[0].id, text: `${plural(unc.length, 'requirement is', 'requirements are')} not covered by any responsibility: ${unc.map(q => q.id + ' ' + q.title).join(', ')}.`, ask: `Which responsibility should fulfil ${unc[0].id}?`});
  const noReq = rs.filter(r => !r.reqs.length);
  if (noReq.length) out.push({kind: 'gap', id: noReq[0].id, text: `${plural(noReq.length, 'responsibility has', 'responsibilities have')} no requirement behind ${noReq.length === 1 ? 'it' : 'them'}: ${names(noReq)}. Each needs the need that justifies it.`});
  const off = rs.filter(r => r.offJourney);
  if (off.length) out.push({kind: 'gap', id: off[0].id, text: `${plural(off.length, 'responsibility serves', 'responsibilities serve')} no journey step and ${off.length === 1 ? 'connects' : 'connect'} to none that does: ${names(off)}.`, ask: `Where in the journey does ${off[0].title} act?`});
  const unreal = rs.filter(r => !r.realisedBy.length);
  if (unreal.length) out.push({kind: 'gap', id: unreal[0].id, text: `${plural(unreal.length, 'responsibility is', 'responsibilities are')} not realised by any component yet: ${names(unreal)}. Chapter 5 will show ${unreal.length === 1 ? 'it' : 'them'} as a hole.`});
  const uncarried = fl.filter(f => f.realised && !f.carried);
  if (uncarried.length) out.push({kind: 'gap', id: uncarried[0].id, text: `${plural(uncarried.length, 'logical flow has', 'logical flows have')} no interaction between the components that realise ${uncarried.length === 1 ? 'its' : 'their'} ends: ${uncarried.map(f => `${LM.R.get(f.from).ref} → ${LM.R.get(f.to).ref} (${f.label})`).join('; ')}.`});
  const changed = rs.filter(r => r.changed);
  if (changed.length) out.push({kind: 'gap', id: changed[0].id, text: `A linked requirement, quality driver or decision changed after ${names(changed)} ${changed.length === 1 ? 'was' : 'were'} saved. Review ${changed.length === 1 ? 'it' : 'them'} against the current inputs.`});
  // Journeys that stop before the end of the journey, and what they leave unowned.
  for (const s of LM.scenarios) {
    const last = journeyWalk(LM, s.id).at(-1);
    if (!last?.early || (!sys && !last.served.some(id => rs.some(r => r.id === id)))) continue;
    const on = last.onward.map(id => LM.flows.find(f => f.id === id)), rest = LM.steps.slice(last.index + 1);
    const at = last.served.length ? last.served.map(id => refTitle(LM, id)).join(' and ') : stepTitle(LM.steps[last.index]);
    const proposal = LM.proposals.find(q => !q.existingId && last.served.includes(q.source))?.key || null;
    if (on.length && on.every(f => f.condition)) out.push({kind: 'risk', id: last.served[0] || last.step, scenario: s.id, proposal, text: `The ${s.title} journey ends at ${at}. Its onward flow carries a condition — “${bare(on[0].condition)}” — and no responsibility owns what happens otherwise.`, ask: `Who resolves a ${s.title.toLowerCase()}, and with what authority?`});
    else out.push({kind: 'risk', id: last.served[0] || last.step, scenario: s.id, proposal, text: `The ${s.title} journey ends at ${at}; ${rest.map(stepTitle).join(', ')} ${rest.length === 1 ? 'is' : 'are'} not reached.`, ask: 'What happens next, and which responsibility owns it?'});
  }
  const owners = new Map();
  for (const r of rs) for (const c of r.context) if (c.layer === 'data' && /own/i.test(c.label)) { if (!owners.has(c.object)) owners.set(c.object, []); owners.get(c.object).push(r); }
  const twice = [...owners].filter(([, xs]) => xs.length > 1);
  if (twice.length) out.push({kind: 'risk', id: twice[0][1][0].id, text: `${twice.map(([d, xs]) => `${LM.O.get(d)?.title || d} is owned by ${xs.map(r => r.ref).join(' and ')}`).join('; ')}. Choose one authority.`});
  if (sys && fl.length && !holes.length && !unc.length && !unreal.length && fl.every(f => f.carried)) out.push({kind: 'info', id: fl[0].id, text: 'Every journey step is owned, every requirement is covered, and every logical flow is carried by an interaction in Chapter 5.'});
  const adrs = uniq(rs.flatMap(r => r.adrs)).map(id => LM.A.get(id)), drafts = adrs.filter(d => !d.current);
  if (drafts.length) out.push({kind: 'info', id: drafts[0].id, text: drafts.length === adrs.length ? `${adrs.length === 1 ? 'The decision' : 'All ' + adrs.length + ' decisions'} behind ${sys ? 'the responsibilities' : 'this part'} ${adrs.length === 1 ? 'is' : 'are'} still ${adrs.length === 1 ? 'a draft' : 'drafts'} (${drafts.map(d => d.id).join(', ')}). The shape is proposed, not decided.` : `${drafts.length} of ${adrs.length} decisions behind ${sys ? 'the responsibilities' : 'this part'} are drafts: ${drafts.map(d => d.id).join(', ')}.`});
  const noAdr = rs.filter(r => !r.adrs.length);
  if (noAdr.length) out.push({kind: 'info', id: noAdr[0].id, text: `${plural(noAdr.length, 'responsibility has', 'responsibilities have')} no decision behind ${noAdr.length === 1 ? 'it' : 'them'}: ${names(noAdr)}.`, ask: `Why is ${noAdr[0].title} a responsibility of its own?`});
  if (sys) {
    const none = [...LM.D.values()].filter(d => !d.direct.length && !d.via.length), only = [...LM.D.values()].filter(d => !d.direct.length && d.via.length);
    if (none.length) out.push({kind: 'gap', id: none[0].id, text: `${plural(none.length, 'quality driver is', 'quality drivers are')} carried by no responsibility: ${none.map(d => d.id + ' ' + d.title).join(', ')}.`});
    if (only.length) out.push({kind: 'info', id: only[0].id, text: `${plural(only.length, 'quality driver reaches', 'quality drivers reach')} the responsibilities only through requirements or decisions, never by name: ${only.map(d => d.id).join(', ')}.`});
  }
  const hubs = rs.filter(r => r.in.length + r.out.length >= 4 && r.in.length + r.out.length >= LM.flows.length * 0.4);
  if (hubs.length) out.push({kind: 'info', id: hubs[0].id, text: `${names(hubs)} ${hubs.length === 1 ? 'takes part' : 'take part'} in ${hubs.map(r => r.in.length + r.out.length).join(' and ')} of ${LM.flows.length} logical flows. A change there reaches most of the design.`});
  const unconfirmed = rs.filter(r => !r.confirmed);
  if (unconfirmed.length) out.push({kind: 'info', id: unconfirmed[0].id, text: `${unconfirmed.length} of ${rs.length} responsibilit${rs.length === 1 ? 'y is' : 'ies are'} ${unconfirmed.every(r => r.origin === 'reference') ? 'reference content' : 'working content'}, not yet confirmed against your project.`});
  if (sys && LM.steps.length && LM.scenarios.some(s => s.steps.length && !s.reviewed)) out.push({kind: 'info', id: LM.steps[0]?.id || null, walk: LM.scenarios.find(s => !s.reviewed).id, text: `${LM.scenarios.filter(s => s.reviewed).length} of ${plural(LM.scenarios.length, 'journey has', 'journeys have')} been walked and recorded for this model.`});
  return out;
}
