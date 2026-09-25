// Chapter 2 Model — pure model of the quality drivers as a utility tree.
//
// Utility → quality family → attribute → driver (a measurable scenario). The attributes are the
// SA Playbook's: an attribute the playbook treats as core but no driver covers stands in the tree
// as a hole, with the playbook's measures for it. Each driver carries what the recorded design
// does for it: the playbook tactics it already names (with evidence), the decisions weighing it,
// and the parts, products and runtime plans that carry it. Deterministic; reads, never writes.
import {FAMILIES, attribute, family} from './playbook-knowledge.js';
import {reasoningSource, driverChain, driverTactics, tuneDriver, decisionTally, driverTradeoffs, PRIORITY_WEIGHT} from './design-reasoning.js';
import {qualityFindings, qualityProposals, QUALITY_TYPES, targetText} from './quality-domain.js';

export const ROOT = 'U:root';
export const PROPOSED = 'QD:proposed';
const list = v => Array.isArray(v) ? v : [];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const uniq = xs => [...new Set(xs)];
export const PRIORITIES = ['Critical', 'Important', 'Supporting'];

export function utilitySource(p) {
  const R = reasoningSource(p);
  let findings = [], proposals = [];
  try { findings = qualityFindings(p); } catch { findings = []; }
  try { proposals = qualityProposals(p, null, 'model'); } catch { proposals = []; }
  return utilityModel(R, {findings, proposals, name: p?.name || ''});
}

export function utilityModel(R, {findings = [], proposals = [], name = ''} = {}) {
  const rank = d => (PRIORITIES.indexOf(d.priority) + 1 || 9) * 1000 + (Number(d.rank) || 999);
  const drivers = [...R.drivers].sort((a, b) => rank(a) - rank(b) || (a.id < b.id ? -1 : 1));
  const D = new Map(drivers.map(d => [d.id, d]));
  const attrs = new Map();
  for (const t of QUALITY_TYPES) {
    const k = attribute(t.id);
    if (!k) continue;
    const ds = drivers.filter(d => d.category === t.id).map(d => d.id);
    attrs.set(t.id, {id: t.id, name: t.name, color: t.color, family: k.family, knowledge: k, drivers: ds, core: !!k.guide, hole: !ds.length && !!k.guide});
  }
  // Drivers recorded under a category the playbook does not know stay visible under "Other".
  const other = drivers.filter(d => !attrs.has(d.category));
  const families = FAMILIES.map(f => ({...f, attributes: [...attrs.values()].filter(a => a.family === f.id && (a.drivers.length || a.hole)).map(a => a.id)})).filter(f => f.attributes.length);
  const tactics = new Map(drivers.map(d => [d.id, driverTactics(R, d.id)]));
  const chains = new Map(drivers.map(d => [d.id, driverChain(R, d.id)]));
  return {R, name, drivers, D, attrs, families, other, tactics, chains, findings, proposals};
}

// ---------------------------------------------------------------- slicing

export function utilityScope(UM, scope = {}) {
  const k = scope?.kind, id = scope?.id;
  if (k === 'family' && UM.families.some(f => f.id === id)) return {kind: 'family', id};
  if (k === 'attribute' && UM.attrs.has(id) && (UM.attrs.get(id).drivers.length || UM.attrs.get(id).hole)) return {kind: 'attribute', id};
  if (k === 'driver' && UM.D.has(id)) return {kind: 'driver', id};
  if (k === 'x') {
    if (UM.D.has(id)) return {kind: 'driver', id};
    if (UM.attrs.has(id)) return utilityScope(UM, {kind: 'attribute', id});
    if (UM.families.some(f => f.id === id)) return {kind: 'family', id};
  }
  return {kind: 'system'};
}
export function defaultDepth(UM) { return UM.drivers.length > 40 ? 'attributes' : 'drivers'; }

// The tree to draw: root, families, attributes and drivers, with holes and an unsaved proposal.
export function foldUtility(UM, scope = {kind: 'system'}, depth = 'drivers', {ghost = null} = {}) {
  const sc = utilityScope(UM, scope);
  const nodes = [], edges = [], add = (n, parent) => { nodes.push(n); if (parent) edges.push({from: parent, to: n.id}); };
  const g = ghost && ghost.mode === 'new' && ghost.record && UM.attrs.has(ghost.record.category) ? ghost.record : null;
  const famOf = a => UM.attrs.get(a)?.family;
  let fams = UM.families.map(f => ({...f}));
  if (g && !fams.some(f => f.attributes.includes(g.category))) {
    const fid = famOf(g.category), f = fams.find(x => x.id === fid);
    if (f) f.attributes = [...f.attributes, g.category]; else fams.push({...family(fid), attributes: [g.category]});
    fams.sort((a, b) => FAMILIES.findIndex(x => x.id === a.id) - FAMILIES.findIndex(x => x.id === b.id));
  }
  if (sc.kind === 'family') fams = fams.filter(f => f.id === sc.id);
  if (sc.kind === 'attribute') fams = fams.filter(f => f.attributes.includes(sc.id)).map(f => ({...f, attributes: [sc.id]}));
  if (sc.kind === 'driver') { const d = UM.D.get(sc.id), fid = famOf(d.category); fams = fams.filter(f => f.id === fid).map(f => ({...f, attributes: [d.category]})); }
  const folded = depth === 'attributes' && sc.kind !== 'driver';
  add({id: ROOT, kind: 'root', level: 0});
  for (const f of fams) {
    add({id: 'F:' + f.id, kind: 'family', level: 1, family: f.id}, ROOT);
    for (const aid of f.attributes) {
      const a = UM.attrs.get(aid), proposedHere = g && g.category === aid;
      let ds = a.drivers;
      if (sc.kind === 'driver') ds = ds.filter(x => x === sc.id);
      const hole = a.hole && !proposedHere;
      add({id: 'A:' + aid, kind: hole ? 'hole' : 'attribute', level: 2, attr: aid, count: a.drivers.length, folded: folded && !hole}, 'F:' + f.id);
      if (folded || hole) continue;
      for (const id of ds) add({id, kind: 'driver', level: 3, attr: aid, subject: sc.kind === 'driver' && sc.id === id}, 'A:' + aid);
      if (proposedHere) add({id: PROPOSED, kind: 'proposed', level: 3, attr: aid, title: String(g.title || 'Proposed driver')}, 'A:' + aid);
    }
  }
  if (sc.kind === 'system' && UM.other.length) {
    add({id: 'F:other', kind: 'family', level: 1, family: 'other'}, ROOT);
    add({id: 'A:other', kind: 'attribute', level: 2, attr: 'other', count: UM.other.length, folded}, 'F:other');
    if (!folded) for (const d of UM.other) add({id: d.id, kind: 'driver', level: 3, attr: 'other'}, 'A:other');
  }
  return {scope: sc, depth: folded ? 'attributes' : 'drivers', nodes, edges, ghost: g};
}

// ---------------------------------------------------------------- reading

export function tacticCounts(UM, id) {
  const ts = UM.tactics.get(id) || [];
  return {total: ts.length, named: ts.filter(t => t.state === 'named').length, considered: ts.filter(t => t.state === 'considered').length, open: ts.filter(t => t.state === 'open').length};
}

export function describeDriver(UM, id) {
  const d = UM.D.get(id);
  if (!d) return '';
  const a = UM.attrs.get(d.category), c = tacticCounts(UM, id), ch = UM.chains.get(id);
  const tactic = c.total ? ` The design names ${c.named} of the playbook's ${c.total} ${a?.name.toLowerCase() || ''} tactics${c.considered ? `, and ${c.considered} more only as a considered alternative` : ''}.` : ` The playbook has no tactics for ${a?.name.toLowerCase() || 'it'}.`;
  const carried = ch?.components.length ? ` Carried by ${ch.components.map(x => x.ref + ' ' + x.title).join(', ')}.` : ' No component carries it yet.';
  return `${d.id} ${d.title} — ${d.priority}, ${targetText(d)}.${tactic}${carried}`;
}

export function utilityWalk(UM) { return UM.drivers.map(d => d.id); }

// Does a one-step change of a driver's priority change which alternative a decision favours?
export function sensitivity(UM, id) {
  const d = UM.D.get(id), out = [];
  if (!d) return out;
  const pr = Object.fromEntries(UM.drivers.map(x => [x.id, x.priority]));
  const i = PRIORITIES.indexOf(d.priority);
  for (const to of [PRIORITIES[i - 1], PRIORITIES[i + 1]].filter(Boolean)) {
    for (const x of UM.R.decisions.filter(x => list(x.driverIds).includes(id))) {
      const a = decisionTally(x, pr), b = decisionTally(x, {...pr, [id]: to});
      if (a.favoured !== b.favoured) out.push({decision: x, to, before: a, after: b});
    }
  }
  return out;
}

// Observations drawn only from recorded facts and the playbook, as prompts for review.
export function utilityInsights(UM, scope = {kind: 'system'}) {
  const out = [], sc = utilityScope(UM, scope), sys = sc.kind === 'system';
  const inScope = d => sys || (sc.kind === 'driver' ? d.id === sc.id : sc.kind === 'attribute' ? d.category === sc.id : UM.attrs.get(d.category)?.family === sc.id);
  const ds = UM.drivers.filter(inScope), names = xs => xs.map(d => d.id + ' ' + d.title).join(', ');
  const holes = [...UM.attrs.values()].filter(a => a.hole && (sys || (sc.kind === 'family' && a.family === sc.id) || (sc.kind === 'attribute' && a.id === sc.id)));
  if (holes.length) out.push({kind: 'gap', id: 'A:' + holes[0].id, attr: holes[0].id, text: `${joinAnd(holes.map((a, i) => i ? a.name.toLowerCase() : a.name))} ${holes.length === 1 ? 'has' : 'have'} no driver, though the SA Playbook treats ${holes.length === 1 ? 'it as a core quality' : 'each as a core quality'} with its own measures.`, ask: `Does ${holes[0].name.toLowerCase()} matter for this design, and how would you measure it?`, proposal: 'missing'});
  // Runtime plans that cannot be shown to meet their driver at its current target.
  for (const d of ds.filter(d => ['availability', 'recoverability'].includes(d.category))) {
    const T = tuneDriver(UM.R, d.id, {});
    const bad = T.effects.filter(e => e.kind === 'plan' && e.state === 'breaks'), unknown = T.effects.filter(e => e.kind === 'plan' && e.state === 'unknown' && e.facts?.placements.length);
    if (bad.length) out.push({kind: 'risk', id: d.id, text: `${d.id} cannot be met as recorded: ${bad[0].title} — ${bad[0].why}${bad.length > 1 ? ` And ${bad.length - 1} more.` : ''}`, ask: 'Which recovery tactic closes the gap: redundancy, faster failover or degradation?'});
    else if (unknown.length) out.push({kind: 'gap', id: d.id, text: `${d.id} ${T.budget.text ? '— ' + T.budget.text.replace(/\.$/, '') + '. But' : ':'} ${plural(unknown.length, 'part that carries it runs', 'parts that carry it run')} as one replica with no recovery time recorded (${unknown.slice(0, 3).map(e => e.ref).join(', ')}${unknown.length > 3 ? '…' : ''}), so whether it holds cannot be told.`, ask: 'How long does each of these take to recover, and is one replica enough?'});
  }
  const critical = ds.filter(d => d.priority === 'Critical' && !d.targetConfirmed);
  if (critical.length) out.push({kind: 'risk', id: critical[0].id, text: `${plural(critical.length, 'Critical driver has', 'Critical drivers have')} a target nobody has confirmed: ${names(critical)}.`, ask: 'Who agrees these targets, and on what evidence?'});
  const bare = ds.filter(d => { const c = tacticCounts(UM, d.id); return c.total && !c.named; });
  if (bare.length) out.push({kind: 'gap', id: bare[0].id, text: `${plural(bare.length, 'driver names', 'drivers name')} none of the playbook's tactics for ${bare.length === 1 ? 'its' : 'their'} attribute: ${names(bare)}.`, ask: `Which ${UM.attrs.get(bare[0].category)?.name.toLowerCase() || ''} tactic does the design rely on?`});
  const uncarried = ds.filter(d => !UM.chains.get(d.id)?.components.length);
  if (uncarried.length) out.push({kind: 'gap', id: uncarried[0].id, text: `${plural(uncarried.length, 'driver is', 'drivers are')} carried by no component: ${names(uncarried)}.`, ask: 'Which responsibility answers for it?'});
  for (const d of ds) for (const s of sensitivity(UM, d.id)) {
    out.push({kind: 'info', id: d.id, text: `${s.decision.id} turns on ${d.id}'s priority: at ${s.to}, ${s.after.favoured ? `${altTitle(s.decision, s.after.favoured)} would be favoured` : 'no alternative would be favoured'} instead of ${s.before.favoured ? altTitle(s.decision, s.before.favoured) : 'a tie'}. ${d.id} is a sensitivity point.`, ask: `Is ${d.priority} the right priority for ${d.id}?`});
    break;
  }
  // The playbook's trade-offs between attributes the project holds drivers for.
  const seen = new Set();
  for (const d of ds) for (const t of driverTradeoffs(UM.R, d)) for (const o of t.drivers) {
    const k = [d.id, o.id].sort().join('|');
    if (seen.has(k)) continue; seen.add(k);
    out.push({kind: 'info', id: d.id, text: `${d.id} and ${o.id} pull against each other — the playbook: "${t.text}"`, ask: 'Where is the balance between them, and who decides it?'});
  }
  const undecided = UM.R.decisions.filter(x => !x.selectedAlternativeId && ds.some(d => list(x.driverIds).includes(d.id)));
  if (undecided.length) out.push({kind: 'info', id: ds.find(d => list(undecided[0].driverIds).includes(d.id))?.id, text: `${plural(undecided.length, 'decision weighing these drivers has', 'decisions weighing these drivers have')} no chosen alternative yet: ${undecided.map(x => x.id).join(', ')}.`, ask: 'Which alternative do the drivers favour, and is that the choice?'});
  const unconfirmed = ds.filter(d => !d.confirmed);
  if (unconfirmed.length && unconfirmed.length === ds.length && ds.length) out.push({kind: 'info', id: null, text: `All ${plural(ds.length, 'driver is', 'drivers are')} unconfirmed reference content.`});
  return out;
}
const joinAnd = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);
const altTitle = (dec, id) => list(dec.alternatives).find(a => a.id === id)?.title || id;

export {PRIORITY_WEIGHT, uniq};
