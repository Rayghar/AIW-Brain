// The standard diagrams: every chapter's design drawn in the notation the sponsor's solution
// architecture documents use — typed elements with a kicker (PHYSICAL APPLICATION COMPONENT,
// APPLICATION SERVICE, LOGICAL TECHNOLOGY COMPONENT …), labelled relationships (realizes,
// implements, uses, is served by, depends on …), titled groups, and a header strip.
//
// A diagram is a projection of the connected model (architecture-model.js): nothing is drawn that
// the project does not record, and a position is never a model fact. Each scene names the records
// it reads, the words it puts on each edge, and the layer each element belongs to, so the reader
// can strip a diagram to the layers wanted.
import {architectureModel} from './architecture-model.js';
import {FAMILIES, familyOf} from './platform-model.js';
import {processElements, processTransitions} from './process-model.js';

const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// The element types of the standard, with the family that colours them and the model layer that
// filters them. `level` orders the layered arrangement (business above application above data
// above technology above deployment).
export const KINDS = {
  physicalApp: {kicker: 'Physical application component', family: 'application', layer: 'physical', level: 2},
  logicalApp: {kicker: 'Logical application component', family: 'application-logical', layer: 'logical', level: 2},
  appService: {kicker: 'Application service', family: 'service', layer: 'interface', level: 3},
  logicalData: {kicker: 'Logical data component', family: 'data-logical', layer: 'data', level: 4},
  physicalData: {kicker: 'Physical data component', family: 'data', layer: 'data', level: 4},
  dataEntity: {kicker: 'Data entity', family: 'data-entity', layer: 'data', level: 4},
  logicalTech: {kicker: 'Logical technology component', family: 'technology', layer: 'technology', level: 5},
  physicalTech: {kicker: 'Physical technology component', family: 'technology-physical', layer: 'technology', level: 6},
  techService: {kicker: 'Technology service', family: 'technology-service', layer: 'technology', level: 5},
  businessService: {kicker: 'Business service', family: 'business', layer: 'process', level: 0},
  process: {kicker: 'Process', family: 'process', layer: 'process', level: 1},
  actor: {kicker: 'Actor', family: 'business', layer: 'process', level: 0},
  outcome: {kicker: 'Value stream', family: 'business-dark', layer: 'process', level: 0},
  requirement: {kicker: 'Requirement', family: 'intent', layer: 'process', level: 0},
  quality: {kicker: 'Quality scenario', family: 'intent', layer: 'process', level: 0},
  decision: {kicker: 'Decision', family: 'decision', layer: 'process', level: 1},
  alternative: {kicker: 'Alternative', family: 'decision', layer: 'process', level: 2},
  control: {kicker: 'Security control', family: 'security', layer: 'security', level: 3},
  threat: {kicker: 'Threat', family: 'threat', layer: 'security', level: 3},
  placement: {kicker: 'Placement', family: 'deployment', layer: 'deployment', level: 7},
  task: {kicker: '', family: 'bpmn-task', layer: 'process', level: 1},
  event: {kicker: '', family: 'bpmn-event', layer: 'process', level: 1},
  gateway: {kicker: '', family: 'bpmn-gateway', layer: 'process', level: 1}
};
// The groups of the standard: an application, a module, an external system, a trust zone, an
// environment, a site or cluster, a swimlane.
export const GROUP_KINDS = {
  system: {layer: 'physical'}, module: {layer: 'logical'}, external: {layer: 'interface'}, boundary: {layer: 'security'},
  environment: {layer: 'deployment'}, zone: {layer: 'deployment'}, lane: {layer: 'process'}, unplaced: {layer: 'deployment'}, family: {layer: 'technology'}
};
export const LAYERS = ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'];

// One scene per chapter; two where the standard has two. `arrangement` is the arrangement the
// scene opens with; the reader can choose another.
export const SCENES = [
  {id: 'process', chapter: 1, title: 'Process', standard: 'BPMN swimlanes', arrangement: 'lanes'},
  {id: 'drivers', chapter: 2, title: 'Quality drivers', standard: 'Architecture requirements', arrangement: 'tree'},
  {id: 'decisions', chapter: 3, title: 'Decisions', standard: 'Decision record', arrangement: 'tree'},
  {id: 'logical', chapter: 4, title: 'Logical application', standard: 'Application architecture (logical)', arrangement: 'grouped'},
  {id: 'application', chapter: 5, title: 'Application architecture', standard: 'Application architecture', arrangement: 'tree'},
  {id: 'solution', chapter: 6, title: 'Solution architecture', standard: 'Solution architecture', arrangement: 'layered'},
  {id: 'stack', chapter: 7, title: 'Technology realization', standard: 'Solution architecture (technology)', arrangement: 'tree'},
  {id: 'integration', chapter: 8, title: 'Integration', standard: 'Channel & vendor integration', arrangement: 'orthogonal'},
  {id: 'data', chapter: 8, title: 'Data & authority', standard: 'Database architecture', arrangement: 'radial'},
  {id: 'security', chapter: 9, title: 'Security & trust', standard: 'Security architecture', arrangement: 'grouped'},
  {id: 'deployment', chapter: 10, title: 'Deployment', standard: 'Channel integration (deployment)', arrangement: 'grouped'},
  {id: 'rationale', chapter: 11, title: 'Design rationale', standard: 'Architecture decision record', arrangement: 'tree'}
];
export const notationScenes = chapter => SCENES.filter(s => s.chapter === Number(chapter));
export const ARRANGEMENTS = [
  {id: 'tree', title: 'Tree', sub: 'from the roots down, right-angled connectors'},
  {id: 'radial', title: 'Radial', sub: 'rings around the hub'},
  {id: 'orthogonal', title: 'Orthogonal', sub: 'left to right, right-angled routes'},
  {id: 'layered', title: 'Layered', sub: 'business, application, data, technology, deployment'},
  {id: 'grouped', title: 'Grouped', sub: 'inside their containers'},
  {id: 'lanes', title: 'Swimlanes', sub: 'one lane per actor'}
];

// What is wanted of a diagram: the environment (Chapter 10) and the hub (radial) are choices.
export function notationDiagram(p, sceneId, {environmentId = null} = {}) {
  const scene = SCENES.find(s => s.id === sceneId);
  if (!p || !scene) return null;
  const M = architectureModel(p), objs = [...M.objects.values()], rels = M.relationships;
  const O = id => M.objects.get(id);
  const ofType = t => objs.filter(o => o.type === t);
  const relsOf = (t, pred = () => true) => rels.filter(e => e.type === t && pred(e));
  const D = {scene, nodes: [], groups: [], edges: [], notes: [], header: header(p), environmentId: null};
  const seenN = new Set(), seenG = new Set(), seenE = new Set();
  const node = (id, kind, title, {sub = '', group = null, hatched = false, ref = '', record = null, muted = false, sol = null} = {}) => {
    if (!id || seenN.has(id)) return D.nodes.find(n => n.id === id) || null;
    seenN.add(id);
    const k = KINDS[kind];
    const n = {id, kind, kicker: k.kicker, family: k.family, layer: k.layer, level: k.level, title: text(title, 80) || id, sub: text(sub, 80), ref: text(ref, 24), group, hatched, muted, record, sol};
    D.nodes.push(n); return n;
  };
  const group = (id, kind, title, {sub = '', parent = null} = {}) => {
    if (!id || seenG.has(id)) return D.groups.find(g => g.id === id) || null;
    seenG.add(id);
    const g = {id, kind, layer: GROUP_KINDS[kind]?.layer || 'physical', title: text(title, 60) || id, sub: text(sub, 80), parent};
    D.groups.push(g); return g;
  };
  const edge = (from, to, label, {kind = 'relation', step = null, dashed = false, id = null} = {}) => {
    if (!from || !to || from === to || !seenN.has(from) || !seenN.has(to)) return null;
    const key = id || `${from}>${to}>${label}`;
    if (seenE.has(key)) return null;
    seenE.add(key);
    const e = {id: key, from, to, label: text(label, 40), kind, step, dashed};
    D.edges.push(e); return e;
  };
  const moduleOf = new Map(list(p.logical?.responsibilities).map(r => [r.id, r.groupId || null]));
  const realises = new Map(); // component → responsibilities
  for (const e of relsOf('realizedBy')) { if (!realises.has(e.to)) realises.set(e.to, []); realises.get(e.to).push(e.from); }
  const componentModule = id => { const ms = (realises.get(id) || []).map(r => moduleOf.get(r)).filter(Boolean); return ms[0] || null; };
  const capKind = c => (['connect', 'trust'].includes(familyOf(c.attributes?.category)) ? 'techService' : 'logicalTech');
  const product = t => { const r = t.record || {}, o = list(r.options).find(x => x.id === r.selectedOptionId); return o ? {title: o.product || o.title, sub: [o.version, o.vendor, o.operatingModel].filter(Boolean).join(' · ')} : null; };
  const system = () => node(M.root, 'physicalApp', O(M.root)?.title || p.name, {sub: 'The application as a whole', ref: ''});
  const contractNode = c => {
    const provider = O(c.record?.to), party = provider?.type === 'party';
    if (party) group(provider.id, 'external', provider.title, {sub: 'External system'});
    return node(c.id, 'appService', c.title, {sub: [c.record?.operation, c.record?.protocol].filter(Boolean).join(' · '), ref: c.ref, group: party ? provider.id : null, record: c.record});
  };

  if (scene.id === 'process') {
    const steps = list(p.artefacts).filter(a => a.type === 'journey'), elements = processElements(p);
    const laneOf = s => text(s.owner || s.actor || 'Journey', 40);
    for (const s of steps) { group('lane:' + laneOf(s), 'lane', laneOf(s)); node(s.id, 'task', s.title, {sub: text(s.description, 60), ref: s.id, group: 'lane:' + laneOf(s), record: s}); }
    // An event or gateway stands in the lane of the step it follows or precedes, so one actor is one lane.
    const transitions = processTransitions(p), stepLane = new Map(steps.map(s => [s.id, 'lane:' + laneOf(s)]));
    const near = (id, seen = new Set()) => { if (stepLane.has(id)) return stepLane.get(id); if (seen.has(id)) return null; seen.add(id); for (const t of transitions) { const o = t.from === id ? t.to : t.to === id ? t.from : null; if (o) { const l = near(o, seen); if (l) return l; } } return null; };
    for (const e of elements) { const lane = near(e.id) || 'lane:' + text(e.lane || 'Process', 40); group(lane, 'lane', lane.slice(5)); node(e.id, e.kind === 'gateway' ? 'gateway' : e.kind === 'event' ? 'event' : 'task', e.title, {ref: e.id, group: lane, record: e}); }
    for (const t of transitions) edge(t.from, t.to, t.label || t.condition || '', {kind: 'sequence', id: t.id});
    for (const r of list(p.relationships).filter(r => r.kind === 'precedes')) edge(r.from, r.to, '', {kind: 'sequence', id: r.id});
    if (!steps.length) D.notes.push('No journey step is recorded yet; the process has nothing to draw.');
  }

  if (scene.id === 'drivers') {
    for (const q of ofType('quality')) node(q.id, 'quality', q.title, {sub: [q.record?.category, q.record?.priority].filter(Boolean).join(' · '), ref: q.id, record: q.record});
    for (const e of relsOf('constrains')) { const t = O(e.to); if (!t) continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); edge(e.from, e.to, 'constrains'); }
    for (const e of relsOf('fulfils')) { const q = O(e.from), t = O(e.to); if (q?.type === 'requirement' && t?.type === 'quality') { node(q.id, 'requirement', q.title, {sub: q.record?.priority, ref: q.id, record: q.record}); edge(q.id, t.id, 'fulfilled by'); } }
  }

  if (scene.id === 'decisions') {
    for (const d of ofType('decision')) node(d.id, 'decision', d.title, {sub: d.record?.status, ref: d.id, record: d.record});
    for (const e of relsOf('considers', e => O(e.from)?.type === 'decision')) { const a = O(e.to); if (!a) continue; node(a.id, 'alternative', a.title, {sub: e.attributes?.selected ? 'Selected' : 'Not selected', hatched: !e.attributes?.selected, record: a.record}); edge(e.from, a.id, e.attributes?.selected ? 'selects' : 'considers', {dashed: !e.attributes?.selected}); }
    for (const e of relsOf('justifies')) { const t = O(e.to); if (!t) continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); else continue; edge(e.from, t.id, 'justifies'); }
  }

  if (scene.id === 'logical') {
    for (const g of ofType('module')) group(g.id, 'module', g.title, {sub: text(g.description, 60)});
    for (const r of ofType('responsibility')) node(r.id, 'logicalApp', r.title, {sub: text(r.record?.boundary, 60), ref: r.ref, group: moduleOf.get(r.id) || null, record: r.record});
    for (const e of relsOf('interaction', e => e.source === 'logical.connections')) edge(e.from, e.to, e.label || 'flows to', {kind: 'flow', id: e.id});
    if (!D.nodes.length) D.notes.push('No responsibility is recorded yet.');
  }

  if (scene.id === 'application') {
    const comps = ofType('component');
    if (comps.length) system();
    for (const g of ofType('module')) group(g.id, 'module', g.title);
    for (const c of comps) node(c.id, 'physicalApp', c.title, {sub: text(c.record?.kind, 20), ref: c.ref, group: componentModule(c.id), record: c.record});
    for (const r of ofType('responsibility')) node(r.id, 'logicalApp', r.title, {ref: r.ref, group: moduleOf.get(r.id) || null, record: r.record});
    for (const c of comps) edge(M.root, c.id, 'realizes', {kind: 'realizes'});
    for (const e of relsOf('realizedBy')) edge(e.to, e.from, 'realizes', {kind: 'realizes'});
    for (const c of ofType('contract')) { const provider = O(c.record?.to), consumer = O(c.record?.from); if (provider?.type === 'component' || consumer?.type === 'component') contractNode(c); }
    for (const e of relsOf('provides')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'implements', {kind: 'implements'});
    for (const e of relsOf('uses')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'uses', {kind: 'uses'});
    // An external participant that calls in is an application outside ours, in its own box.
    for (const pt of ofType('party')) {
      const calls = relsOf('uses', e => e.from === pt.id);
      if (!calls.length && seenG.has(pt.id)) continue;
      group(pt.id, 'external', pt.title, {sub: 'External system'});
      node('party:' + pt.id, 'physicalApp', pt.title, {sub: calls.length ? 'External caller' : 'No contract recorded', group: pt.id, hatched: !calls.length, record: pt.record});
      for (const e of calls) if (seenN.has(e.to)) edge('party:' + pt.id, e.to, 'uses', {kind: 'uses'});
    }
    for (const e of relsOf('interaction', e => e.source === 'realisation.connections')) if (O(e.from)?.type === 'component' && O(e.to)?.type === 'component') edge(e.from, e.to, e.label || 'interacts with', {kind: 'flow', id: e.id, dashed: true});
    if (!comps.length) D.notes.push('No application component is recorded yet.');
  }

  if (scene.id === 'solution' || scene.id === 'stack') {
    const caps = ofType('capability'), comps = ofType('component');
    for (const f of FAMILIES) if (caps.some(c => familyOf(c.attributes?.category) === f.id)) group('family:' + f.id, 'family', f.title, {sub: f.sub});
    for (const c of comps) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    for (const c of caps) node(c.id, capKind(c), c.title, {sub: text(c.record?.category, 20), ref: c.ref, group: 'family:' + familyOf(c.attributes?.category), record: c.record});
    for (const e of relsOf('requires')) if (O(e.from)?.type === 'component' && O(e.to)?.type === 'capability') edge(e.from, e.to, 'is served by', {kind: 'servedBy', dashed: e.attributes?.criticality && e.attributes.criticality !== 'essential'});
    for (const e of rels.filter(e => e.source === 'technology.dependencies' && seenN.has(e.from) && seenN.has(e.to))) edge(e.from, e.to, 'depends on', {kind: 'dependsOn', id: e.id, dashed: e.attributes?.critical === false});
    if (scene.id === 'stack') {
      for (const t of ofType('technology')) { const pr = product(t); node(t.id, 'physicalTech', pr ? pr.title : t.title, {sub: pr ? pr.sub : `No choice yet · ${list(t.record?.options).length} option${list(t.record?.options).length === 1 ? '' : 's'}`, ref: t.ref, hatched: !pr, record: t.record}); }
      for (const e of relsOf('implementedBy')) if (O(e.from)?.type === 'capability') edge(e.from, e.to, 'implemented by', {kind: 'implementedBy', id: e.id});
      for (const e of rels.filter(e => e.source === 'technologyRealisation.connections')) edge(e.from, e.to, e.label || 'depends on', {kind: 'dependsOn', id: e.id});
    } else {
      for (const b of ofType('boundary')) group(b.id, 'boundary', b.title, {sub: 'Trust boundary'});
      for (const e of relsOf('withinBoundary')) { const n = D.nodes.find(n => n.id === e.from); if (n && seenG.has(e.to) && !n.group?.startsWith?.('family:')) n.group = e.to; }
    }
    if (!caps.length) D.notes.push('No platform capability is recorded yet.');
  }

  if (scene.id === 'integration') {
    const comps = ofType('component');
    for (const c of comps) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    for (const c of ofType('contract')) contractNode(c);
    for (const e of relsOf('provides')) if (O(e.from)?.type === 'component') edge(e.from, e.to, 'implements', {kind: 'implements'});
    for (const e of relsOf('uses')) { const from = O(e.from); if (from?.type === 'component') edge(e.from, e.to, 'uses', {kind: 'uses'}); else if (from?.type === 'party') { group(from.id, 'external', from.title, {sub: 'External system'}); node('party:' + from.id, 'physicalApp', from.title, {sub: 'External caller', group: from.id, record: from.record}); edge('party:' + from.id, e.to, 'uses', {kind: 'uses'}); } }
    if (!D.nodes.some(n => n.kind === 'appService')) D.notes.push('No interface contract is recorded yet.');
  }

  if (scene.id === 'data') {
    const comps = ofType('component'), stores = ofType('technology').filter(t => ['state'].includes(familyOf(O(relsOf('implementedBy', e => e.to === t.id)[0]?.from)?.attributes?.category)));
    for (const t of stores) { const pr = product(t); node(t.id, 'physicalData', pr ? pr.title : t.title, {sub: pr ? pr.sub : 'No choice yet', ref: t.ref, hatched: !pr, record: t.record}); }
    for (const d of ofType('data')) node(d.id, 'logicalData', d.title, {sub: text(d.record?.classification, 30), ref: d.ref, record: d.record});
    for (const c of comps) if (relsOf('owns', e => e.from === c.id).length || relsOf('requires', e => e.from === c.id).length) node(c.id, 'physicalApp', c.title, {ref: c.ref, record: c.record});
    // An authority outside ours (a party) owns its data as an external system.
    for (const e of relsOf('owns')) { const a = O(e.from); if (!seenN.has(e.to)) continue; if (a?.type === 'component') edge(e.from, e.to, 'owns', {kind: 'owns'}); else if (a?.type === 'party') { group(a.id, 'external', a.title, {sub: 'External system'}); node('party:' + a.id, 'physicalApp', a.title, {sub: 'External authority', group: a.id, record: a.record}); edge('party:' + a.id, e.to, 'owns', {kind: 'owns'}); } }
    for (const e of relsOf('requires')) { const cap = O(e.to); if (cap?.type !== 'capability' || familyOf(cap.attributes?.category) !== 'state') continue; for (const i of relsOf('implementedBy', x => x.from === cap.id)) edge(e.from, i.to, 'uses', {kind: 'uses'}); }
    for (const e of relsOf('exchanges')) { const c = O(e.from); if (c?.type === 'contract') { node(c.id, 'appService', c.title, {ref: c.ref, record: c.record}); edge(c.id, e.to, 'exchanges', {kind: 'exchanges', dashed: true}); } }
    if (!D.nodes.some(n => n.layer === 'data')) D.notes.push('No data definition is recorded yet.');
  }

  if (scene.id === 'security') {
    for (const b of ofType('boundary')) group(b.id, 'boundary', b.title, {sub: text(b.record?.policy, 60)});
    const inB = new Map(relsOf('withinBoundary').map(e => [e.from, e.to]));
    for (const c of ofType('component')) node(c.id, 'physicalApp', c.title, {ref: c.ref, group: inB.get(c.id) || null, record: c.record});
    for (const c of ofType('capability')) if (inB.has(c.id)) node(c.id, capKind(c), c.title, {ref: c.ref, group: inB.get(c.id), record: c.record});
    for (const k of ofType('control')) node(k.id, 'control', k.title, {sub: text(k.record?.category, 30), ref: k.ref, record: k.record});
    for (const t of ofType('threat')) node(t.id, 'threat', t.title, {sub: text(t.record?.priority ? t.record.priority + ' priority' : '', 30), ref: t.ref, record: t.record});
    const target = id => { const o = O(id); if (!o) return null; if (o.type === 'contract') return contractNode(o); if (o.type === 'data') return node(o.id, 'logicalData', o.title, {ref: o.ref, record: o.record}); if (o.type === 'component') return D.nodes.find(n => n.id === id); return null; };
    for (const e of relsOf('protects')) if (target(e.to)) edge(e.from, e.to, 'protects', {kind: 'protects'});
    for (const e of relsOf('threatens')) if (target(e.to)) edge(e.from, e.to, 'threatens', {kind: 'threatens', dashed: true});
    for (const e of relsOf('mitigates')) edge(e.from, e.to, 'mitigates', {kind: 'mitigates'});
    if (!ofType('control').length && !ofType('threat').length) D.notes.push('No control or threat is recorded yet.');
  }

  if (scene.id === 'deployment') {
    const envs = ofType('environment'), env = envs.find(e => e.id === environmentId) || envs[0];
    D.environmentId = env?.id || null;
    if (env) {
      group(env.id, 'environment', env.title, {sub: text(env.record?.stage, 40)});
      const zones = ofType('zone').filter(z => z.record?.environmentId === env.id);
      for (const z of zones) group(z.id, 'zone', z.title, {sub: text(z.record?.failureDomain, 50), parent: env.id});
      const plans = ofType('runtime').filter(r => r.record?.environmentId === env.id), placed = new Set();
      for (const pl of ofType('instance')) {
        const plan = plans.find(r => r.id === pl.record?.planId); if (!plan || !seenG.has(pl.record?.zoneId)) continue;
        const asset = O(plan.record?.assetId), tech = asset?.type === 'technology', pr = tech ? product(asset) : null;
        node(pl.id, tech ? 'physicalTech' : 'physicalApp', tech ? (pr ? pr.title : asset.title) : (asset?.title || plan.title), {sub: `${pl.record?.replicas ?? 1} ${pl.record?.role || 'copy'}${pr?.sub ? ' · ' + pr.sub : ''}`, ref: asset?.ref || plan.ref, group: pl.record.zoneId, hatched: pl.record?.role === 'standby', record: pl.record, sol: plan.id});
        placed.add(plan.record?.assetId);
      }
      const unplaced = list(env.record?.assetIds).filter(id => !placed.has(id) && O(id));
      if (unplaced.length) { group('unplaced:' + env.id, 'unplaced', 'Not placed', {sub: 'parts without a place to run', parent: env.id}); for (const id of unplaced) { const a = O(id), tech = a.type === 'technology', pr = tech ? product(a) : null; node('unplaced:' + id, tech ? 'physicalTech' : 'physicalApp', tech ? (pr ? pr.title : a.title) : a.title, {sub: 'Not placed', ref: a.ref, group: 'unplaced:' + env.id, hatched: true, record: a.record, sol: plans.find(r => r.record?.assetId === id)?.id || id}); } }
      // A runtime path realises a contract between two parts: it runs between their placements.
      const placementOf = assetId => D.nodes.find(n => n.record?.planId && plans.find(r => r.id === n.record.planId)?.record?.assetId === assetId)?.id || (seenN.has('unplaced:' + assetId) ? 'unplaced:' + assetId : null);
      let step = 0;
      for (const path of ofType('path').filter(r => r.record?.environmentId === env.id)) {
        const c = O(path.record?.contractId); if (!c) continue;
        const from = placementOf(c.record?.from), to = placementOf(c.record?.to);
        if (from && to) edge(from, to, c.ref || c.title, {kind: 'path', step: ++step, id: path.id});
        else D.notes.push(`${path.ref || path.id} realises ${c.ref || c.title}, whose ${from ? 'provider' : 'caller'} has no placement in this environment.`);
      }
      // A part placed on a platform service stands on it: the copy of the technology it needs.
      for (const n of D.nodes.filter(n => n.kind === 'physicalApp' && n.record?.planId)) {
        const assetId = plans.find(r => r.id === n.record.planId)?.record?.assetId;
        for (const e of relsOf('requires', x => x.from === assetId)) for (const i of relsOf('implementedBy', x => x.from === e.to)) { const t = placementOf(i.to); if (t && !t.startsWith('unplaced:')) edge(n.id, t, 'stands on', {kind: 'servedBy', dashed: true}); }
      }
    } else D.notes.push('No environment is recorded yet.');
  }

  if (scene.id === 'rationale') {
    for (const r of ofType('requirement')) node(r.id, 'requirement', r.title, {sub: r.record?.priority, ref: r.id, record: r.record});
    for (const e of relsOf('fulfils')) { const t = O(e.to); if (!t) continue; if (t.type === 'responsibility') node(t.id, 'logicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'component') node(t.id, 'physicalApp', t.title, {ref: t.ref, record: t.record}); else if (t.type === 'capability') node(t.id, capKind(t), t.title, {ref: t.ref, record: t.record}); else if (t.type === 'quality') node(t.id, 'quality', t.title, {ref: t.id, record: t.record}); else continue; edge(e.from, t.id, 'fulfilled by'); }
    for (const d of ofType('decision')) node(d.id, 'decision', d.title, {sub: d.record?.status, ref: d.id, record: d.record});
    for (const e of relsOf('justifies')) if (seenN.has(e.to)) edge(e.from, e.to, 'justifies');
    for (const e of relsOf('evidences')) { const ev = O(e.from); if (ev && seenN.has(e.to)) { node(ev.id, 'requirement', ev.title, {sub: 'Evidence', ref: ev.ref, record: ev.record}); edge(ev.id, e.to, 'evidences', {dashed: true}); } }
  }

  // A module, family, external system or trust zone nobody stands in is not drawn; a recorded
  // environment, zone or lane is, even empty — an empty recovery site is a finding.
  const used = new Set(D.nodes.map(n => n.group).filter(Boolean));
  for (const g of D.groups) if (g.parent) used.add(g.parent);
  D.groups = D.groups.filter(g => ['environment', 'zone', 'lane'].includes(g.kind) || used.has(g.id) || D.groups.some(x => x.parent === g.id && used.has(x.id)));
  for (const n of D.nodes) if (n.group && !D.groups.some(g => g.id === n.group)) n.group = null;
  D.counts = {nodes: D.nodes.length, groups: D.groups.length, edges: D.edges.length};
  return D;
}

// The header strip of the standard: what the project records about itself, and nothing more.
function header(p) {
  const w = p.workspace || {};
  return {model: text(p.name, 80), template: 'AIW notation · TOGAF element types', author: text(p.owner || w.owner || p.brief?.owner || '', 60), created: text(p.createdAt || w.createdAt || '', 30), modified: text(p.updatedAt || w.updatedAt || '', 30), version: p.contentVersion != null ? 'v' + p.contentVersion : ''};
}

// A diagram stripped to the layers wanted: nodes of other layers go, with their edges; groups of
// other layers open up (their nodes stay, ungrouped).
export function stripToLayers(D, layers) {
  const keep = new Set(layers && layers.length ? layers : LAYERS);
  const nodes = D.nodes.filter(n => keep.has(n.layer)), ids = new Set(nodes.map(n => n.id));
  const groups = D.groups.filter(g => keep.has(g.layer));
  const gids = new Set(groups.map(g => g.id));
  const out = {...D, nodes: nodes.map(n => (n.group && !gids.has(n.group) ? {...n, group: groups.find(g => g.id === D.groups.find(x => x.id === n.group)?.parent)?.id || null} : n)), groups: groups.map(g => (g.parent && !gids.has(g.parent) ? {...g, parent: null} : g)), edges: D.edges.filter(e => ids.has(e.from) && ids.has(e.to))};
  out.counts = {nodes: out.nodes.length, groups: out.groups.length, edges: out.edges.length, hidden: D.nodes.length - out.nodes.length};
  return out;
}

// A plain reading of an element for the companion and the hover tip.
export function describeNode(D, id) {
  const n = D.nodes.find(x => x.id === id); if (!n) return '';
  const say = (e, to) => (e.kind === 'path' ? `reaches ${to} over ${e.label}` : e.kind === 'flow' ? `hands ${to} “${e.label}”` : `${e.label} ${to}`);
  const out = D.edges.filter(e => e.from === id).map(e => say(e, D.nodes.find(x => x.id === e.to)?.title || e.to));
  const inn = D.edges.filter(e => e.to === id).map(e => { const from = D.nodes.find(x => x.id === e.from)?.title || e.from; return e.kind === 'path' ? `${from} reaches it over ${e.label}` : e.kind === 'flow' ? `${from} hands it “${e.label}”` : `${from} ${e.label} it`; });
  const g = D.groups.find(g => g.id === n.group);
  return [`${n.kicker || 'Element'}${n.ref ? ' ' + n.ref : ''}: ${n.title}${n.sub ? ' (' + n.sub + ')' : ''}.`, g ? `In ${g.title}.` : '', out.length ? 'It ' + out.join('; ') + '.' : '', inn.length ? inn.join('; ') + '.' : '', n.hatched ? 'Not chosen or not placed yet.' : ''].filter(Boolean).join(' ');
}
