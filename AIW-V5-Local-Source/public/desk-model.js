// Review desk — the model behind Chapter 11's desk and Validate's third mode.
//
// deskModel reads the whole design once: the vitals of every running part (desk-vitals.js), what an
// objective asks of each part (desk-capacity.js), the thread from each requirement to where it runs
// (the Chapter 11 trace), the anti-patterns and their fixes, and where to start. Decisions carry
// their implications both ways (decision-impact.js), so a probe on a decision can ask earlier and
// later chapters to review. Pure; nothing here changes the project.
import {deskSource, VITALS, VSTATE, worstOf, RANK} from './desk-vitals.js';
import {decisionImplications} from './decision-impact.js';
import {reviewRequirements, reviewTrace, traceReviewFor, inheritedFindings, latestDisposition, findingTreatment} from './review-domain.js';
import {productOf, productLabel, patternKnowledge} from './design-reasoning.js';
import {readDecision, readingLines} from './decision-reading.js';
import {fmtN} from './desk-capacity.js';
import {choiceReading} from './product-choice.js';
import {list, str} from './util.js';
// Round 24 (D-24-08): under a module scope the model reads the scope's projection; its checks are the saved document's
// (module-lens.js), kept to the records the projection holds.
import {baseOf, scopeFindings} from './module-lens.js';


export const TRACE_COLS = [
  {id: 'drivers', ch: 2, label: 'Drivers', spine: false},
  {id: 'decisions', ch: 3, label: 'Decisions', spine: false},
  {id: 'logical', ch: 4, label: 'Responsibilities', spine: true},
  {id: 'applications', ch: 5, label: 'Components', spine: true},
  {id: 'capabilities', ch: 6, label: 'Capabilities', spine: true},
  {id: 'platform', ch: 7, label: 'Products', spine: true, q: 'The platform it stands on, as the products that realise it (Chapters 6 and 7)'},
  {id: 'contracts', ch: 8, label: 'Interfaces', spine: false},
  {id: 'controls', ch: 9, label: 'Controls', spine: false},
  {id: 'runtime', ch: 10, label: 'Runtime', spine: true},
  {id: 'vitals', ch: 11, label: 'Vitals', spine: false}
];

// Where a finding is fixed: the chapter that owns what it names, and the words for the fix.
export const ANTI_FIX = {
  spof: {chapter: 10, verb: 'Add a standby or a second replica in Chapter 10'},
  'sync-chain': {chapter: 3, verb: 'Decide in Chapter 3 whether a call can hand off asynchronously'},
  idempotency: {chapter: 8, verb: 'Record an idempotency key or duplicate policy in Chapter 8'},
  retry: {chapter: 8, verb: 'Bound the retries in Chapter 8'},
  'shared-data': {chapter: 5, verb: 'Give the data one owner in Chapter 5'},
  god: {chapter: 4, verb: 'Split the responsibilities in Chapter 4'},
  queue: {chapter: 7, verb: 'Record the queue\'s bound in Chapter 7'},
  observability: {chapter: 10, verb: 'Record monitoring in Chapter 10'}
};

const TREAT = {
  availability: {bad: n => `Add redundancy to ${n}: one failure takes ${n === 1 ? 'it' : 'them'} past the availability budget`, none: n => `Place and time the recovery of ${n}, so availability can be read`},
  recovery: {bad: n => `Shorten the recovery of ${n}`, none: n => `Record how fast ${n} recover${n === 1 ? 's' : ''}`},
  loss: {bad: n => `Protect the state of ${n}: ${n === 1 ? 'it' : 'they'} may lose more than allowed`, none: n => `Record how much ${n} may lose`},
  latency: {bad: n => `The timeouts on the path through ${n} exceed the response target`, none: n => `Record the timeouts on the synchronous path through ${n}`},
  capacity: {bad: n => `Size ${n} for the objective`, warn: n => `Revisit the product choice for ${n}: the objective passes a single-node limit`, none: n => `Record the capacity of ${n}`},
  integrity: {bad: n => `Make the requests of ${n} safe to repeat`},
  security: {bad: n => `Cover the open threats on ${n}`, none: n => `Examine the threats to ${n}`},
  observability: {bad: n => `Record how the failure of ${n} would be seen`, warn: n => `Record monitoring for ${n}`}
};
const partsText = n => `${n} part${n === 1 ? '' : 's'}`;

export function deskModel(p, opts = {}) {
  const D = deskSource(p, opts);
  D.trace = traceRows(D);
  D.plan = treatmentPlan(D);
  D.findings = antiFindings(D);
  // Each realisation's product choice, weighed against its drivers, with the objective's ceiling.
  D.choices = new Map();
  for (const r of p?.technologyRealisation?.records || []) if ((r.options || []).length > 1) { const row = D.cap.rows.find(x => x.id === r.id); try { D.choices.set(r.id, choiceReading(p, r.id, {ceiling: row?.ceiling || null, objective: {text: D.cap.objText, source: D.cap.objective.source}})); } catch { /* a choice that cannot be read is left out */ } }
  return D;
}

// ---------------------------------------------------------------- trace

export function traceRows(D) {
  const p = D.p, byPlan = new Map(D.rows.map(r => [r.id, r]));
  return reviewRequirements(p).map(req => {
    const t = reviewTrace(p, req.id);
    if (!t) return null;
    const cell = (xs, f) => xs.map(f);
    const runtimeHere = t.runtime.filter(r => !D.env || r.environmentId === D.env);
    const cells = {
      drivers: cell(t.drivers, d => ({id: d.id, ref: d.id, label: d.title, chapter: 2})),
      decisions: cell(t.decisions, d => ({id: d.id, ref: d.id, label: d.question, chapter: 3, chosen: !!d.selectedAlternativeId})),
      logical: cell(t.logical, r => ({id: r.id, ref: r.ref, label: r.title, chapter: 4})),
      applications: cell(t.applications, c => ({id: c.id, ref: c.ref, label: c.title, chapter: 5})),
      capabilities: cell(t.capabilities, c => ({id: c.id, ref: c.ref, label: c.title, chapter: 6})),
      // The platform a requirement stands on, read as the products that realise it (Ch 6 → Ch 7);
      // a capability with no product stands in for it, marked as the gap it is.
      platform: t.realizations.length ? cell(t.realizations, r => ({id: r.id, ref: r.ref, label: productLabel(productOf(r)) || r.title + ' · no product', chapter: 7, state: productOf(r)?.product ? '' : 'warn'})) : cell(t.capabilities, c => ({id: c.id, ref: c.ref, label: c.title + ' · no product', chapter: 6, state: 'warn'})),
      contracts: cell(t.contracts, c => ({id: c.id, ref: c.ref, label: c.title, chapter: 8})),
      controls: cell(t.controls, c => ({id: c.id, ref: c.ref, label: c.title, chapter: 9})),
      runtime: cell(runtimeHere, r => ({id: r.id, ref: r.ref, label: r.title, chapter: 10, state: byPlan.get(r.id)?.state || 'na'}))
    };
    const rows = runtimeHere.map(r => byPlan.get(r.id)).filter(Boolean);
    const states = rows.flatMap(r => r.vitals.map(v => v.state)).filter(s => s !== 'na');
    cells.vitals = rows.length ? [{id: 'V:' + req.id, ref: VSTATE[worstOf(states)].label, label: `${states.filter(s => s === 'bad').length} critical · ${states.filter(s => s === 'none').length} no signal across ${rows.length} running part${rows.length === 1 ? '' : 's'}`, chapter: 11, state: worstOf(states)}] : [];
    const breaks = TRACE_COLS.filter(c => c.spine && !cells[c.id].length).map(c => c.id);
    const firstBreak = TRACE_COLS.find(c => c.spine && !cells[c.id].length) || null;
    // The latest current review of its trail, its own or a group's (round 12, GR-GOV-05).
    const review = traceReviewFor(p, req.id);
    return {id: req.id, req, cells, breaks, firstBreak, reviewed: !!review, review, state: states.length ? worstOf(states) : 'na', environment: D.env, runtimeElsewhere: t.runtime.length > 0 && !runtimeHere.length};
  }).filter(Boolean);
}
export function describeTrace(T) {
  const n = TRACE_COLS.filter(c => c.id !== 'vitals').filter(c => T.cells[c.id].length).length;
  return `${T.id} ${T.req.title}: reaches ${n} of ${TRACE_COLS.length - 1} recorded places${T.firstBreak ? `; ${T.runtimeElsewhere && T.firstBreak.id === 'runtime' ? 'runtime is recorded only in another environment' : 'the thread breaks at ' + T.firstBreak.label.toLowerCase() + ' (Chapter ' + T.firstBreak.ch + ')'}` : '; recorded links reach its running part'}${T.reviewed ? '; its trail is reviewed' : ''}. Design links do not verify implementation.`;
}

// ---------------------------------------------------------------- where to start

export function treatmentPlan(D) {
  const groups = new Map();
  for (const row of D.rows) for (const v of row.vitals) {
    if (!['bad', 'none', 'warn'].includes(v.state) || !TREAT[v.vital]?.[v.state]) continue;
    const key = v.vital + '|' + v.state;
    if (!groups.has(key)) groups.set(key, {vital: v.vital, state: v.state, rows: [], fixes: []});
    const g = groups.get(key); g.rows.push(row); if (v.fix) g.fixes.push(v.fix);
  }
  return [...groups.values()].map(g => ({...g, chapter: g.fixes[0]?.chapter || VITALS.find(x => x.id === g.vital).chapter, text: TREAT[g.vital][g.state](partsText(g.rows.length)), first: g.fixes[0] || null}))
    .sort((a, b) => RANK.indexOf(a.state) - RANK.indexOf(b.state) || b.rows.length - a.rows.length);
}

// Anti-patterns as Chapter 11 findings, with their treatment and where each is fixed.
export function antiFindings(D) {
  const p = D.p;
  let fs = [];
  try { fs = scopeFindings(p, inheritedFindings(baseOf(p))).filter(f => String(f.id).startsWith('ANTI:')); } catch { fs = []; }
  return D.anti.map(a => {
    const f = fs.find(x => x.sourceId === a.id) || null;
    return {anti: a, finding: f, treatment: f ? findingTreatment(p, f) : 'Needs assessment', disposition: f ? latestDisposition(p, f) || null : null, fix: ANTI_FIX[a.id] || null};
  });
}

// ---------------------------------------------------------------- probes

// A decision under a probe: its alternatives against its drivers (the decision reading, round 25), the patterns they
// follow, and what it reaches both ways. leads marks the alternative that leads on the drivers; lines are the reading's
// own sentences (ruled out, dominated, how firmly the lead holds...), alternatives named by title. The probe follows the
// working choice, else the lead; it never chooses.
export function decisionProbe(D, id, alternativeId = null) {
  const p = D.p, d = list(p.decisions?.records).find(x => x.id === id);
  if (!d) return null;
  const reading = readDecision(p, d), tally = reading;
  const alts = list(d.alternatives).map(a => ({alt: a, chosen: a.id === d.selectedAlternativeId, leads: reading.lead === a.id,
    effects: list(d.driverIds).map(did => ({id: did, effect: a.assessments?.[did]?.effect || 'unknown', reason: str(a.assessments?.[did]?.reason)})),
    patterns: patternKnowledge([a.pattern], 'pattern'), anti: patternKnowledge([a.antiPattern], 'anti')}));
  const alt = alternativeId || d.selectedAlternativeId || reading.lead || null;
  const imp = decisionImplications(p, id, {alternativeId: alt});
  const lines = readingLines(reading, {alt: x => list(d.alternatives).find(a => a.id === x)?.title || x});
  return {decision: d, alts, tally, reading, lines, lean: alt, implications: imp};
}

// What a probe on a running part asks to review: where each critical or silent vital is fixed,
// and the drivers it carries.
export function partReviewItems(D, row) {
  const items = [], add = (chapter, id, why) => { if (id && !items.some(x => x.chapter === chapter && x.id === id)) items.push({chapter, id, why}); };
  const name = v => VITALS.find(x => x.id === v.vital).label.toLowerCase(), bad = row.vitals.filter(v => v.state === 'bad'), none = row.vitals.filter(v => v.state === 'none');
  add(10, row.id, `On the review desk ${row.ref} reads ${bad.length ? 'critical on ' + bad.map(name).join(', ') : 'nothing critical'}${none.length ? '; no signal on ' + none.map(name).join(', ') : ''}.`);
  for (const v of row.vitals.filter(v => v.state === 'bad' || v.state === 'none')) if (v.fix) add(v.fix.chapter, v.fix.id, `${VITALS.find(x => x.id === v.vital).label} on ${row.ref}: ${v.why}`);
  for (const d of row.drivers.filter(d => row.vitals.some(v => v.state === 'bad' && list(v.drivers).includes(d.id)))) add(2, d.id, `${row.ref} does not yet hold it: review the target, or the design that carries it.`);
  return items;
}
export function capacityReviewItems(D) {
  const items = [];
  for (const r of D.cap.rows.filter(r => r.verdict.state === 'bad')) {
    const target = r.plan ? {chapter: 10, id: r.plan.plan.id} : r.fix ? {chapter: r.fix.chapter, id: r.fix.id} : null;
    if (target && !items.some(x => x.chapter === target.chapter && x.id === target.id)) items.push({...target, why: `${D.cap.workload ? D.cap.objBasis : D.cap.objText} needs ${r.spec[0]?.v || ''} ${r.spec[0]?.k?.toLowerCase() || ''} of ${r.ref}: ${r.verdict.why}`});
  }
  const scal = D.R.drivers.find(d => d.category === 'scalability');
  if (scal) items.push({chapter: 2, id: scal.id, why: `The review desk plans for ${D.cap.workload ? D.cap.objBasis : D.cap.objText}; review whether ${scal.id}'s target says the same.`});
  return items;
}

export {VITALS, VSTATE, worstOf, fmtN};
