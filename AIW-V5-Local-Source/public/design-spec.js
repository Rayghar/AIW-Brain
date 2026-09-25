// Design specification and anti-patterns — read from the recorded design across chapters.
//
// specFor: one part's specification, whatever chapter it is selected in — the responsibility it
// answers for (Ch 4), the component (Ch 5), the platform capabilities it stands on (Ch 6), the
// products that realise them with version, vendor and operating model (Ch 7), and where and how it
// runs (Ch 10), with the drivers it carries, the decisions behind it and what is still missing.
// detectAntiPatterns: failure boundaries found in recorded facts, each named as the pattern
// catalogue and the SA Playbook name it, with the objects it concerns. Pure; nothing is changed.
import {reasoningSource, driverChain, planFacts, productOf, productLabel, catalogueRecord} from './design-reasoning.js';
import {ATTRIBUTES} from './playbook-knowledge.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const uniq = xs => [...new Set(xs)];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const joinAnd = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);
const cache = new WeakMap();
// The playbook's own advice on synchronous work, quoted from its scalability entry.
function asyncAdvice() {
  const g = ATTRIBUTES.find(a => a.id === 'scalability')?.guide, i = (g?.decisions || []).findIndex(d => /^Asynchronous Communication/i.test(d));
  return i < 0 ? null : {text: g.decisions[i], src: 'QR-Guidebook!G5 (Scalability · key decisions)'};
}
export function reasoningFor(p) { if (!p || typeof p !== 'object') return reasoningSource(p); if (!cache.has(p)) cache.set(p, reasoningSource(p)); return cache.get(p); }

// ---------------------------------------------------------------- relations

function componentsOfResponsibility(R, id) { return uniq(list(R.p?.logical?.mappings).filter(m => m.logicalId === id).map(m => m.physicalId)).map(x => R.comps.get(x)).filter(Boolean); }
function responsibilitiesOfComponent(R, id) { return uniq(list(R.p?.logical?.mappings).filter(m => m.physicalId === id).map(m => m.logicalId)).map(x => R.resp.get(x)).filter(Boolean); }
function capabilitiesOfComponent(R, id) {
  const needs = list(R.p?.technology?.needs).filter(n => n.applicationId === id);
  return needs.map(n => { const m = list(R.p.technology.mappings).find(m => m.needId === n.id); const c = m ? R.caps.get(m.capabilityId) : null; return c ? {cap: c, need: n} : null; }).filter(Boolean);
}
function componentsOfCapability(R, id) {
  const needIds = new Set(list(R.p?.technology?.mappings).filter(m => m.capabilityId === id).map(m => m.needId));
  return uniq(list(R.p?.technology?.needs).filter(n => needIds.has(n.id)).map(n => n.applicationId)).map(x => R.comps.get(x)).filter(Boolean);
}
function realisationsOfCapability(R, id) { return uniq(list(R.p?.technologyRealisation?.mappings).filter(m => m.capabilityId === id).map(m => m.realizationId)).map(x => R.reals.get(x)).filter(Boolean); }
function capabilitiesOfRealisation(R, id) { return uniq(list(R.p?.technologyRealisation?.mappings).filter(m => m.realizationId === id).map(m => m.capabilityId)).map(x => R.caps.get(x)).filter(Boolean); }
const plansOf = (R, assetId) => [...R.plans.values()].filter(r => r.assetId === assetId).map(r => planFacts(R, r));

// The product a part runs on: a realisation's own product, or a component's compute platform.
export function runsOn(R, assetId) {
  if (R.reals.has(assetId)) { const pr = productOf(R.reals.get(assetId)); return pr?.product ? {label: productLabel(pr), selected: pr.selected, via: null} : null; }
  if (R.comps.has(assetId)) {
    const compute = capabilitiesOfComponent(R, assetId).find(x => x.cap.category === 'compute');
    const r = compute ? realisationsOfCapability(R, compute.cap.id)[0] : null, pr = r ? productOf(r) : null;
    return pr?.product ? {label: productLabel(pr), selected: pr.selected, via: compute.cap.ref} : null;
  }
  return null;
}
// The products a component stands on, one per platform capability.
export function productsOfComponent(R, id) {
  return capabilitiesOfComponent(R, id).map(({cap}) => { const r = realisationsOfCapability(R, cap.id)[0], pr = r ? productOf(r) : null; return {cap, realisation: r, product: pr}; });
}
function driversOfComponents(R, comps) {
  const ids = new Set(comps.map(c => c.id));
  return R.drivers.filter(d => driverChain(R, d.id)?.components.some(c => ids.has(c.id)));
}

// ---------------------------------------------------------------- specification

export function specFor(R, id) {
  if (!R || !id) return null;
  let kind = null, subject = null, comps = [], caps = [], reals = [], plans = [], resps = [];
  if (R.resp.has(id)) { kind = 'responsibility'; subject = R.resp.get(id); resps = [subject]; comps = componentsOfResponsibility(R, id); }
  else if (R.comps.has(id)) { kind = 'component'; subject = R.comps.get(id); comps = [subject]; resps = responsibilitiesOfComponent(R, id); }
  else if (R.caps.has(id)) { kind = 'capability'; subject = R.caps.get(id); caps = [subject]; comps = componentsOfCapability(R, id); reals = realisationsOfCapability(R, id); }
  else if (R.reals.has(id)) { kind = 'realisation'; subject = R.reals.get(id); reals = [subject]; caps = capabilitiesOfRealisation(R, id); comps = uniq(caps.flatMap(c => componentsOfCapability(R, c.id))); }
  else if (R.plans.has(id)) { const pl = R.plans.get(id); const inner = specFor(R, pl.assetId); if (!inner) return null; return {...inner, kind: 'plan', id, ref: pl.ref, title: pl.title, plans: [planFacts(R, pl)], asset: {kind: inner.kind, id: inner.id, ref: inner.ref, title: inner.title}}; }
  else return null;
  if (kind === 'responsibility' || kind === 'component') {
    const rows = comps.flatMap(c => capabilitiesOfComponent(R, c.id));
    caps = uniq(rows.map(r => r.cap));
    reals = uniq(caps.flatMap(c => realisationsOfCapability(R, c.id)));
    plans = comps.flatMap(c => plansOf(R, c.id));
  } else plans = reals.flatMap(r => plansOf(R, r.id));
  if (!resps.length) resps = uniq(comps.flatMap(c => responsibilitiesOfComponent(R, c.id)));
  const products = reals.map(r => ({realisation: r, product: productOf(r), capabilities: capabilitiesOfRealisation(R, r.id).filter(c => caps.includes(c))}));
  const drivers = kind === 'capability' || kind === 'realisation' ? driversOfComponents(R, comps) : R.drivers.filter(d => list(d.responsibilityIds).some(x => resps.some(r => r.id === x)));
  const decisions = R.decisions.filter(d => list(d.driverIds).some(x => drivers.some(dr => dr.id === x)) || comps.some(c => list(c.decisionIds).includes(d.id)) || resps.some(r => list(r.decisionIds).includes(d.id)));
  const gaps = [];
  for (const x of products) {
    if (!x.product?.product) gaps.push(`${x.realisation.ref} names no product`);
    else if (!x.product.version || !x.product.vendor) gaps.push(`${x.product.product} (${x.realisation.ref}) has no ${!x.product.version && !x.product.vendor ? 'version or vendor' : !x.product.version ? 'version' : 'vendor'}`);
    if (x.product?.product && !x.product.selected) gaps.push(`${x.product.product} is a candidate, not yet the chosen option`);
    if (str(x.realisation.capacityValue) === '') gaps.push(`${x.realisation.ref} records no capacity`);
  }
  for (const f of plans) {
    if (!f.placements.length) gaps.push(`${f.plan.ref} is not placed`);
    else if (f.active < 2 && !f.standby) gaps.push(`${f.plan.ref} runs one replica with no standby`);
    if (f.recoveryMinutes == null && f.placements.length) gaps.push(`${f.plan.ref} records no recovery time`);
    if (f.stateMode === 'Unspecified') gaps.push(`${f.plan.ref} does not say whether it holds state`);
  }
  if (kind !== 'capability' && kind !== 'realisation' && !comps.length) gaps.push('No component realises it yet');
  return {kind, id, ref: subject.ref || subject.id, title: subject.title, responsibilities: resps, components: comps, capabilities: caps, products, plans, drivers, decisions, gaps: uniq(gaps)};
}

// ---------------------------------------------------------------- anti-patterns

const CRIT = new Set(['Critical', 'Important']);
const AP = (catalogueId, extra) => ({catalogueId, name: catalogueRecord(catalogueId)?.name || catalogueId, ...extra});

// Longest chain of synchronous calls between components, as recorded in Chapter 5.
function syncChains(R) {
  const sync = R.connections.filter(c => c.interaction === 'sync' && R.comps.has(c.from) && R.comps.has(c.to));
  const out = new Map(); for (const c of sync) { if (!out.has(c.from)) out.set(c.from, []); out.get(c.from).push(c.to); }
  const starts = [...R.comps.keys()].filter(id => out.has(id) && !sync.some(c => c.to === id));
  let best = [];
  const walk = (path) => { const nx = (out.get(path.at(-1)) || []).filter(n => !path.includes(n)); if (!nx.length) { if (path.length > best.length) best = path; return; } for (const n of nx) walk([...path, n]); };
  for (const s of (starts.length ? starts : [...out.keys()])) walk([s]);
  return best;
}

export function detectAntiPatterns(R) {
  const found = [];
  const carried = f => R.drivers.filter(d => driverChain(R, d.id)?.plans.some(x => x.plan.id === f.plan.id));
  // Single point of failure: a placed part carrying a Critical or Important driver, one replica, no standby.
  const spof = [...R.plans.values()].map(r => planFacts(R, r)).filter(f => f.placements.length && f.active < 2 && !f.standby).map(f => ({f, ds: carried(f).filter(d => CRIT.has(d.priority))})).filter(x => x.ds.length);
  if (spof.length) found.push(AP('ANTI-SINGLE-POINT-OF-FAILURE', {id: 'spof', chapter: 10, severity: 'risk', objects: spof.map(x => ({id: x.f.plan.id, ref: x.f.plan.ref, title: x.f.plan.title, chapter: 10})),
    text: `${joinAnd(spof.map(x => x.f.plan.ref + ' ' + x.f.plan.title))} ${spof.length === 1 ? 'runs' : 'each run'} as one replica with no standby, yet carr${spof.length === 1 ? 'ies' : 'y'} ${joinAnd(uniq(spof.flatMap(x => x.ds.map(d => d.id))).sort())}.`,
    ask: 'Which of them can stop without stopping the service, and which need redundancy?', playbook: {text: 'Risk of single points of failure, unexpected failures, human error, and challenges in maintaining availability during updates.', src: 'QR-Guidebook!J7'}}));
  // Synchronous chain: three or more synchronous calls in a row.
  const chain = syncChains(R);
  if (chain.length >= 4) {
    const comps = chain.map(id => R.comps.get(id)), perf = R.drivers.filter(d => d.category === 'performance' || d.category === 'availability');
    found.push(AP('ANTI-SYNCHRONOUS-CHAIN', {id: 'sync-chain', chapter: 5, severity: 'risk', objects: comps.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5})),
      text: `${comps.map(c => c.ref + ' ' + c.title).join(' → ')}: ${chain.length - 1} synchronous calls in a row. Each waits on the next, so one slow or failed part holds up the whole request${perf.length ? ` — ${joinAnd(perf.map(d => d.id))} ${perf.length === 1 ? 'depends' : 'depend'} on it` : ''}.`,
      ask: 'Which of these calls could hand work on asynchronously instead?', playbook: asyncAdvice()}));
  }
  // Missing idempotency: requests that carry a financial-integrity driver with no idempotency key or duplicate policy.
  const integ = R.drivers.filter(d => d.category === 'integrity');
  const integComps = new Set(integ.flatMap(d => driverChain(R, d.id)?.components.map(c => c.id) || []));
  const exposed = R.contracts.filter(c => (c.kind === 'request' || !c.kind) && (integComps.has(c.from) || integComps.has(c.to)) && !str(c.idempotencyKey) && !str(c.duplicatePolicy));
  if (exposed.length && integ.length) found.push(AP('ANTI-MISSING-IDEMPOTENCY', {id: 'idempotency', chapter: 8, severity: 'risk', objects: exposed.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 8})),
    text: `${plural(exposed.length, 'request', 'requests')} that touch${exposed.length === 1 ? 'es' : ''} what carries ${joinAnd(integ.map(d => d.id + ' ' + d.title))} record${exposed.length === 1 ? 's' : ''} no idempotency key or duplicate policy: ${exposed.map(c => c.ref).join(', ')}. A repeated request could repeat its effect.`,
    ask: 'Which of these can be repeated safely, and how is a repeat recognised?'}));
  // Retry storm: a retry policy with no backoff or limit.
  const storm = R.contracts.filter(c => str(c.retryPolicy) && !/backoff|jitter|limit|max|at most|budget/i.test(c.retryPolicy));
  if (storm.length) found.push(AP('ANTI-RETRY-STORM', {id: 'retry', chapter: 8, severity: 'risk', objects: storm.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 8})), text: `${plural(storm.length, 'retry policy names', 'retry policies name')} no backoff or limit: ${storm.map(c => c.ref).join(', ')}.`, ask: 'What bounds the retries when the callee is already struggling?'}));
  // Shared data: one data record held by more than one component.
  const holders = new Map();
  for (const c of R.comps.values()) for (const d of list(c.dataIds)) { if (!holders.has(d)) holders.set(d, []); holders.get(d).push(c); }
  const shared = [...holders].filter(([, cs]) => cs.length > 1);
  if (shared.length) found.push(AP('ANTI-SHARED-DATABASE-COUPLING', {id: 'shared-data', chapter: 5, severity: 'risk', objects: shared.flatMap(([, cs]) => cs.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5}))), text: shared.map(([d, cs]) => `${d} is held by ${joinAnd(cs.map(c => c.ref + ' ' + c.title))}`).join('; ') + '.', ask: 'Who is the single owner, and how do the others reach it?', playbook: {text: 'Tight coupling between services can make it difficult to modify or update individual services without affecting others.', src: 'anti patterns!B41'}}));
  // God service: one component realising most responsibilities.
  const n = R.resp.size;
  const gods = [...R.comps.values()].filter(c => { const k = responsibilitiesOfComponent(R, c.id).length; return n >= 4 && (k > 3 || k / n > 0.5); });
  if (gods.length) found.push(AP('ANTI-GOD-SERVICE', {id: 'god', chapter: 5, severity: 'risk', objects: gods.map(c => ({id: c.id, ref: c.ref, title: c.title, chapter: 5})), text: `${joinAnd(gods.map(c => c.ref + ' ' + c.title))} realise${gods.length === 1 ? 's' : ''} most of the logical responsibilities.`, ask: 'Which responsibilities belong elsewhere?', playbook: {text: 'Services that have too many responsibilities or handle unrelated functionalities can become complex and difficult to maintain.', src: 'anti patterns!B42'}}));
  // Unbounded queue: a messaging realisation with no capacity bound recorded.
  const msg = [...R.reals.values()].filter(r => capabilitiesOfRealisation(R, r.id).some(c => c.category === 'messaging') && str(r.capacityValue) === '');
  if (msg.length) found.push(AP('ANTI-UNBOUNDED-QUEUE', {id: 'queue', chapter: 7, severity: 'gap', objects: msg.map(r => ({id: r.id, ref: r.ref, title: r.title, chapter: 7})), text: `${joinAnd(msg.map(r => `${r.ref} ${r.title}${productOf(r)?.product ? ' (' + productOf(r).product + ')' : ''}`))} record${msg.length === 1 ? 's' : ''} no capacity: nothing says how much work may wait, or what happens when it is full.`, ask: 'What is the bound, and what does the sender do when it is reached?'}));
  // Observability as an afterthought: parts carrying Critical drivers with no monitoring recorded.
  const blind = [...R.plans.values()].map(r => planFacts(R, r)).filter(f => f.placements.length && !str(f.plan.monitoring) && carried(f).some(d => d.priority === 'Critical'));
  if (blind.length) found.push(AP('ANTI-OBSERVABILITY-AS-AFTERTHOUGHT', {id: 'observability', chapter: 10, severity: 'gap', objects: blind.map(f => ({id: f.plan.id, ref: f.plan.ref, title: f.plan.title, chapter: 10})), text: `${plural(blind.length, 'running part carries', 'running parts carry')} a Critical driver with no monitoring recorded: ${blind.map(f => f.plan.ref).join(', ')}.`, ask: 'How would you know it is failing before the customer does?', playbook: {text: 'Heartbeat: Components periodically send "heartbeat" messages to indicate that they are alive and functioning.', src: 'Architectural Tactics!B88:B91'}}));
  return found;
}
export function antiPatternsFor(found, id) { return found.filter(a => a.objects.some(o => o.id === id)); }
export {ATTRIBUTES};
