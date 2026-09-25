// Technology realisation — the semantic model behind the Chapter 7 Model views.
//
// The product layer beneath the platform: each realisation, the Chapter 6 capabilities it
// realises, the option chosen for it (or the choice not yet made), the components that depend on
// it and what they lose if it fails, the implementation obligations written for it, and how far
// its selection has gone — preferred, recorded, approved. For one realisation at a time, the
// options against the criteria that should decide between them. Pure: it reads the recorded
// Chapter 6 and Chapter 7 models and never writes.
import {platformSource, FAMILIES} from './platform-model.js';
import {technologyRealisationFindings, technologyRealisationProposal, realizationCriteria, selectionCurrent, approvalCurrent, realizationSourceChanged} from './technology-realisation-domain.js';

export const STACK_SCHEMA = 'aiw.stack/1';
export const PROPOSED = 'PROPOSED';
export const OBLIGATIONS = [
  {id: 'operations', field: 'operationsPlan', title: 'Operate', long: 'Operational ownership'},
  {id: 'access', field: 'accessPlan', title: 'Access', long: 'Identity and access'},
  {id: 'data', field: 'dataPlan', title: 'Data', long: 'Data handling'},
  {id: 'resilience', field: 'resiliencePlan', title: 'Recover', long: 'Recovery and isolation'},
  {id: 'interface', field: 'interfacePlan', title: 'Interfaces', long: 'Integration contracts'},
  {id: 'lifecycle', field: 'lifecyclePlan', title: 'Lifecycle', long: 'Lifecycle and exit'}
];
export const STATE_LABEL = {none: 'No choice yet', preferred: 'Draft preference', recorded: 'Selection recorded', stale: 'Recorded · inputs changed', approved: 'Approved'};
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uniq = a => [...new Set(a)];

export function stackSource(p, {order = {}} = {}) {
  const Pf = platformSource(p, {order});
  const t = p?.technologyRealisation || {};
  let findings = [];
  try { findings = technologyRealisationFindings(p); } catch { findings = []; }
  const extra = new Map();
  for (const r of list(t.records)) {
    let criteria = [], current = false, approved = false, changed = false;
    try { criteria = realizationCriteria(p, r.id); } catch { criteria = []; }
    try { current = selectionCurrent(p, r); approved = approvalCurrent(p, r); changed = realizationSourceChanged(p, r); } catch { /* optional */ }
    extra.set(r.id, {criteria, current, approved, changed});
  }
  const proposals = [];
  for (const key of ['operate', 'recover']) for (const r of list(t.records)) { try { const q = technologyRealisationProposal(p, key, r.id); if (q && Object.keys(q.record).some(k => /Plan$/.test(k) && q.record[k] !== r[k])) proposals.push({key, record: r.id}); } catch { /* optional */ } }
  try { const q = technologyRealisationProposal(p, 'missing'); if (q) proposals.push({key: 'missing', capability: q.objectId}); } catch { /* optional */ }
  return stackModel(Pf, {records: list(t.records), mappings: list(t.mappings), extra, findings, proposals});
}

export function stackModel(Pf, {records = [], mappings = [], extra = new Map(), findings = [], proposals = []} = {}) {
  const famIx = f => { const i = FAMILIES.findIndex(x => x.id === f); return i < 0 ? 99 : i; };
  // Capabilities in Chapter 6's order: by family, the most-used first.
  const capOrder = [...Pf.capabilities.values()].sort((a, b) => famIx(a.family) - famIx(b.family) || b.users.length - a.users.length || String(a.ref).localeCompare(String(b.ref))).map(c => c.id);
  const R = new Map();
  for (const r of records) {
    const caps = mappings.filter(m => m.realizationId === r.id && Pf.capabilities.has(m.capabilityId)).map(m => m.capabilityId).sort((a, b) => capOrder.indexOf(a) - capOrder.indexOf(b));
    const cs = caps.map(id => Pf.capabilities.get(id));
    const x = extra.get(r.id) || {criteria: [], current: false, approved: false, changed: false};
    const options = list(r.options).map(o => ({id: o.id, title: text(o.title, 120), product: text(o.product, 80), version: text(o.version, 40), vendor: text(o.vendor, 80), operatingModel: text(o.operatingModel, 40), benefits: text(o.benefits, 300), drawbacks: text(o.drawbacks, 300), evidence: text(o.evidence, 300), sourceUrl: text(o.sourceUrl, 300), assessments: o.assessments || {}}));
    const chosen = options.some(o => o.id === r.selectedOptionId) ? r.selectedOptionId : null;
    const state = x.approved ? 'approved' : r.recorded ? (x.current ? 'recorded' : 'stale') : chosen ? 'preferred' : 'none';
    const plans = Object.fromEntries(OBLIGATIONS.map(o => [o.id, text(r[o.field], 300)]));
    R.set(r.id, {id: r.id, ref: r.ref || r.id, title: text(r.title, 120), purpose: text(r.purpose, 260), owner: text(r.owner, 80), caps, family: cs[0]?.family || 'other',
      serves: uniq(cs.flatMap(c => c.users)), stops: uniq(cs.flatMap(c => c.blast.stops)), single: cs.some(c => c.single),
      options, chosen, state, changed: !!x.changed, recorded: !!r.recorded, approved: !!x.approved, plans,
      sizing: {value: r.capacityValue ?? '', unit: text(r.capacityUnit, 40), basis: text(r.capacityBasis, 200)}, cost: {annual: r.annualCost ?? '', currency: text(r.currency, 10), basis: text(r.costBasis, 200)},
      rationale: text(r.rationale, 300), risks: text(r.risks, 300), criteria: list(x.criteria).map(c => ({id: c.id, title: text(c.title, 100), detail: text(c.detail, 240), kind: /^(operations|recovery|lifecycle|cost)$/.test(c.id) ? 'general' : 'driver'}))});
  }
  for (const r of R.values()) {
    r.planned = OBLIGATIONS.filter(o => r.plans[o.id]).length;
    r.sized = r.sizing.value !== '' && !!r.sizing.unit && !!r.sizing.basis;
    r.costed = r.cost.annual !== '' && !!r.cost.currency && !!r.cost.basis;
    const o = r.options.find(x => x.id === r.chosen);
    r.assessed = o ? r.criteria.filter(c => { const a = o.assessments[c.id]; return a && a.effect !== 'unknown' && a.reason && a.evidence; }).length : 0;
  }
  const realised = new Set([...R.values()].flatMap(r => r.caps));
  const holes = capOrder.filter(id => !realised.has(id));
  return {Pf, capOrder, R, holes, findings: list(findings), proposals: list(proposals)};
}

export const capTitle = (S, id) => S.Pf.capabilities.get(id)?.title || id;
export const optionOf = (r, id) => r?.options.find(o => o.id === id) || null;

// ---------------------------------------------------------------- slicing

export function stackScope(S, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (FAMILIES.some(f => f.id === scope.id)) return {kind: 'family', id: scope.id};
  if (S.R.has(scope.id)) return {kind: 'family', id: S.R.get(scope.id).family, focus: scope.id};
  if (S.Pf.capabilities.has(scope.id)) return {kind: 'family', id: S.Pf.capabilities.get(scope.id).family, focus: scope.id};
  return {kind: 'system'};
}

// Rows: realisations by family, in Chapter 6's capability order; at the Options depth, each
// realisation is followed by its options. A capability nothing realises stands as a hole.
export function foldStack(S, scope = {kind: 'system'}, depth = 'realisations', {proposal = null} = {}) {
  const sc = stackScope(S, scope), famIx = f => { const i = FAMILIES.findIndex(x => x.id === f); return i < 0 ? 99 : i; };
  const firstCap = r => (r.caps.length ? S.capOrder.indexOf(r.caps[0]) : 1e6);
  let rs = [...S.R.values()].sort((a, b) => famIx(a.family) - famIx(b.family) || firstCap(a) - firstCap(b) || String(a.ref).localeCompare(String(b.ref)));
  if (sc.kind === 'family') rs = rs.filter(r => r.family === sc.id);
  const rows = [];
  const ghost = proposal && proposal.record && !S.R.has(proposal.objectId) && proposal.key === 'missing' ? proposal : null;
  const edits = proposal && proposal.record && S.R.has(proposal.objectId) ? proposal : null;
  const preview = proposal && proposal.recordId && proposal.optionId ? proposal : null;
  for (const r of rs) {
    const proposedPlans = edits?.objectId === r.id ? OBLIGATIONS.filter(o => !r.plans[o.id] && text(edits.record[o.field])).map(o => o.id) : [];
    rows.push({id: r.id, kind: 'realisation', family: r.family, rec: r, proposedPlans, preview: preview?.recordId === r.id ? preview.optionId : null});
    if (depth === 'options') for (const o of r.options) rows.push({id: r.id + '/' + o.id, kind: 'option', family: r.family, rec: r, option: o, chosen: r.chosen === o.id, preview: preview?.recordId === r.id && preview.optionId === o.id});
  }
  for (const c of S.holes) { const cap = S.Pf.capabilities.get(c); if (sc.kind === 'family' && cap.family !== sc.id) continue; rows.push({id: 'HOLE:' + c, kind: ghost?.objectId === c ? 'proposed' : 'hole', family: cap.family, capability: c, title: ghost?.objectId === c ? text(ghost.record.title, 100) : cap.title}); }
  rows.sort((a, b) => famIx(a.family) - famIx(b.family));
  const groups = [];
  for (const r of rows) if (!groups.length || groups.at(-1).family !== r.family) groups.push({family: r.family, title: FAMILIES.find(f => f.id === r.family)?.title || 'Other', count: 1}); else groups.at(-1).count++;
  return {scope: sc, depth, rows, groups};
}

// One realisation's options against its criteria.
export function optionsFor(S, id, {proposal = null} = {}) {
  const r = S.R.get(id); if (!r) return null;
  const preview = proposal && proposal.recordId === id ? proposal.optionId : null;
  const cols = r.options.map(o => ({id: o.id, option: o, chosen: r.chosen === o.id, preview: preview === o.id}));
  const rows = r.criteria.map(c => ({id: c.id, criterion: c, group: c.kind}));
  const cells = [];
  for (const row of rows) for (const col of cols) { const a = col.option.assessments[row.id]; cells.push({row: row.id, col: col.id, effect: a?.effect || 'unknown', reason: text(a?.reason, 240), evidence: text(a?.evidence, 240), complete: !!(a && a.effect !== 'unknown' && a.reason && a.evidence)}); }
  const groups = [];
  for (const row of rows) if (!groups.length || groups.at(-1).group !== row.group) groups.push({group: row.group, title: row.group === 'driver' ? 'Quality drivers it carries' : 'Operation, recovery, exit and cost', count: 1}); else groups.at(-1).count++;
  return {record: r, cols, rows, cells, groups};
}

// ---------------------------------------------------------------- reading

export function describeRealisation(S, id) {
  const r = S.R.get(id); if (!r) return '';
  const o = optionOf(r, r.chosen), all = S.Pf.components.size;
  return `${r.ref} ${r.title} realises ${r.caps.map(c => S.Pf.capabilities.get(c).ref + ' ' + capTitle(S, c)).join(' and ') || 'no capability yet'}, which ${r.serves.length} component${r.serves.length === 1 ? '' : 's'} depend on${r.stops.length ? `; if it fails, ${r.stops.length} of ${all} stop` : ''}. ${o ? `The preferred option is ${o.title}${o.product ? ' (' + o.product + (o.version ? ' ' + o.version : '') + ')' : ''}, ${o.operatingModel.toLowerCase() || 'with no operating model'}.` : `No option is preferred yet among ${r.options.length}.`} ${r.planned} of ${OBLIGATIONS.length} implementation obligations are written.`;
}

export function stackInsights(S, scope = {kind: 'system'}) {
  const out = [], sc = stackScope(S, scope), all = S.Pf.components.size;
  const rs = [...S.R.values()].filter(r => sc.kind === 'system' || r.family === sc.id);
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  if (S.holes.length && sc.kind === 'system') out.push({kind: 'gap', id: S.holes[0], text: `${plural(S.holes.length, 'capability has', 'capabilities have')} no realisation: ${S.holes.map(c => capTitle(S, c)).join(', ')}.`, ask: `What will provide ${capTitle(S, S.holes[0])}?`});
  const open = rs.filter(r => r.state === 'none');
  if (open.length) {
    const critical = open.filter(r => r.stops.length === all).sort((a, b) => b.serves.length - a.serves.length);
    out.push({kind: 'gap', id: (critical[0] || open[0]).id, text: `${open.length} of ${rs.length} realisations have no choice yet.${critical.length ? ` Decide ${critical.map(r => r.caps.map(c => capTitle(S, c)).join(', ')).join('; ')} first: if any of ${critical.length === 1 ? 'it' : 'them'} fails, all ${all} components stop.` : ''}`, ask: critical[0] ? `Which option should realise ${capTitle(S, critical[0].caps[0])}, and why?` : null});
  }
  const pref = rs.filter(r => r.state === 'preferred');
  if (pref.length) out.push({kind: 'info', id: pref[0].id, text: `${plural(pref.length, 'choice is', 'choices are')} a draft preference, not yet recorded with its rationale: ${pref.map(r => r.ref).join(', ')}.`});
  const stale = rs.filter(r => r.state === 'stale');
  if (stale.length) out.push({kind: 'risk', id: stale[0].id, text: `${plural(stale.length, 'recorded selection rests', 'recorded selections rest')} on inputs that have changed since: ${stale.map(r => r.ref).join(', ')}. Review before relying on ${stale.length === 1 ? 'it' : 'them'}.`});
  const noPlan = OBLIGATIONS.map(o => ({o, n: rs.filter(r => !r.plans[o.id]).length})).filter(x => x.n);
  if (noPlan.length) { const none = noPlan.filter(x => x.n === rs.length); out.push({kind: 'gap', id: rs.find(r => r.planned < OBLIGATIONS.length)?.id, text: none.length === OBLIGATIONS.length ? `No implementation obligation is written for any realisation yet — operation, access, data, recovery, interfaces and lifecycle are all open. A product name does not establish a service boundary.` : `Open obligations: ${noPlan.map(x => `${x.o.long.toLowerCase()} (${x.n})`).join(', ')}.`}); }
  const recoveryFirst = rs.filter(r => !r.plans.resilience && r.caps.some(c => ['transactional', 'messaging', 'backup', 'recovery'].includes(S.Pf.capabilities.get(c).category)));
  if (recoveryFirst.length) out.push({kind: 'risk', id: recoveryFirst[0].id, text: `${recoveryFirst.map(r => r.caps.map(c => capTitle(S, c)).join(', ')).join('; ')} ${recoveryFirst.length === 1 ? 'carries' : 'carry'} durable state or recovery, but no recovery obligation is written for ${recoveryFirst.length === 1 ? 'its realisation' : 'their realisations'}.`, ask: 'How is a chosen product restored, and who authorises resuming work?'});
  const chosen = rs.filter(r => r.chosen);
  const unassessed = chosen.filter(r => r.assessed < r.criteria.length);
  if (unassessed.length) out.push({kind: 'gap', id: unassessed[0].id, text: `${unassessed.map(r => `${r.ref} (${r.criteria.length - r.assessed} of ${r.criteria.length} criteria)`).join(', ')}: the preferred option is not yet assessed against every criterion with a reason and evidence.`});
  else if (!chosen.length && rs.length && rs.every(r => r.options.every(o => !Object.keys(o.assessments).length))) out.push({kind: 'info', id: rs[0].id, text: `No option has been assessed against any criterion yet. Each realisation carries the quality drivers of the components that depend on it — ${Math.max(...rs.map(r => r.criteria.filter(c => c.kind === 'driver').length))} at most — as its first criteria.`});
  const vague = chosen.filter(r => { const o = optionOf(r, r.chosen); return !o.product || !o.version || !o.vendor; });
  if (vague.length) out.push({kind: 'gap', id: vague[0].id, text: `${vague.map(r => r.ref).join(', ')}: the preferred option does not yet name a product, version and accountable vendor.`});
  const models = new Map(); for (const r of chosen) { const m = optionOf(r, r.chosen).operatingModel || 'Unspecified'; models.set(m, (models.get(m) || 0) + 1); }
  if (models.size === 1 && chosen.length > 2) out.push({kind: 'info', id: chosen[0].id, text: `Every preferred option is ${[...models.keys()][0].toLowerCase()}. That concentrates operational load in one place.`});
  const one = rs.filter(r => r.options.length < 2);
  if (one.length) out.push({kind: 'gap', id: one[0].id, text: `${one.map(r => r.ref).join(', ')} ${one.length === 1 ? 'has' : 'have'} only one option. A choice needs an alternative, or the limited comparison carried as a finding.`});
  const unsized = rs.filter(r => !r.sized || (r.cost.annual !== '' && !r.costed));
  if (unsized.length && sc.kind === 'system') out.push({kind: 'info', id: unsized[0].id, text: `${unsized.length} of ${rs.length} realisations have no sizing basis${rs.some(r => r.cost.annual === '') ? ', and no cost estimate is recorded' : ''}.`});
  const approved = rs.filter(r => r.state === 'approved').length;
  if (sc.kind === 'system' && rs.length) out.push({kind: 'info', id: rs[0].id, text: `Selection progress: ${rs.filter(r => r.chosen).length} preferred, ${rs.filter(r => ['recorded', 'approved'].includes(r.state)).length} recorded, ${approved} approved, of ${rs.length}.`});
  return out;
}
