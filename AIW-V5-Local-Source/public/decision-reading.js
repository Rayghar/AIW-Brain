// The decision reading (round 25, D-25-01 to D-25-07): a decision's alternatives read against the drivers it names, as
// arithmetic on what the project records, with what that arithmetic can and cannot settle. One engine: the Chapter 3
// model and its checks, the review desk, the utility tree, the what-if, Chapter 7's weighing and the SDD read it.
//
// Its inputs are recorded facts only (D-25-02): the drivers a decision names, their priorities and kinds, each
// alternative's recorded effect on each, and the constraint records a constraint driver links. It imports no knowledge
// module: knowledge may suggest an effect for a person to record (decision-suggestions.js), never weigh one.
//
// What it reads:
// - ruled out (D-25-03): an alternative that breaks a hard constraint leaves the order. A constraint driver is hard
//   unless every constraint record it links is Should or Could (a Must binds, and so does one whose priority nobody
//   stated, or a driver that links none); breaking a soft constraint counts as tension;
// - dominated (D-25-04): at least as good on every driver the decision names and better on one, whatever the unstated
//   effects of either turn out to be; weights play no part. As the effects stand (an unstated one read as neutral) and
//   not whatever they turn out to be, it is provisional;
// - the order at the default weights (High 3, Medium 2, Low 1; supports +1, tension −1, neutral and unstated 0), ties
//   shared. A driver with no stated priority weighs nothing and is named; so is a link to a driver that no longer
//   exists;
// - how firmly the lead holds (D-25-05): level 1, for every weighting that keeps each High driver at least as heavy as
//   each Medium one and each Medium at least as heavy as each Low one; level 2, if drivers of the same priority count
//   equally (High ≥ Medium ≥ Low as classes); level 3, only at the default weights. Exact, not sampled: a lead holds
//   over a set of weightings bounded by those inequalities when it holds on the set's extreme weightings, which for
//   level 1 are the priority order's up-sets (every High driver and some Medium ones, say, weighing alike) and for
//   level 2 the three class steps. Below level 1 the reading names an extreme weighting under which another
//   alternative comes ahead;
// - what the unstated effects could do (D-25-06): each total bounded with them at their worst and best;
// - where the leader and the runner-up pull apart, and the one-step sensitivity points;
// - where the working choice stands.
// Pure and deterministic. Nothing it computes is saved, and it never chooses: the working choice is a person's
// (decision.choose).
import {list, str, uniq} from './util.js';
import {remember, findIn} from './document-memo.js';
import {driverKind, driverPriority} from './quality-domain.js';

export const WEIGHT = Object.freeze({High: 3, Medium: 2, Low: 1});
export const CLASSES = Object.freeze(['High', 'Medium', 'Low']);
// An effect's value in the arithmetic. An unstated effect has none (null): it counts 0 at the default weights, and
// anything from −1 to +1 where the reading asks what it could do.
export const VALUE = Object.freeze({supports: 1, neutral: 0, tension: -1, violates: -1});
export const STATED = Object.freeze(['supports', 'neutral', 'tension', 'violates']);
export const weightOf = priority => WEIGHT[priority] ?? 0;
export const effectOf = v => (STATED.includes(v?.effect) ? v.effect : 'unknown');
export const DEFAULT_WEIGHTS = 'High 3, Medium 2, Low 1';
export const READING_NOTE = 'Arithmetic on the recorded effects, not a measurement; it does not choose.';

// ---------------------------------------------------------------- the core: options against criteria

// criteria: [{id, cls, weight}], cls High, Medium or Low, or null for a criterion with no priority class (it weighs as
// given, takes part in dominance, and none in how firmly a lead holds); options: [{id, values: {criterion: 1, 0, -1 or
// null}}] in their record order. Chapter 7's weighing reads the same core (D-25-11). lean: the totals, the order and the
// lead only (a what-if step, a sensitivity check, the shown totals), without dominance, firmness or the unknowns.
export function weighOptions(criteria, options, {lean = false} = {}) {
  const C = list(criteria).map(c => ({...c, weight: Number(c.weight) || 0})), O = list(options);
  const V = new Map(O.map(o => [o.id, o.values || {}]));
  const val = (o, c) => { const v = V.get(o)?.[c]; return v === 1 || v === 0 || v === -1 ? v : null; };
  const rows = O.map((o, i) => {
    let score = 0, low = 0, high = 0;
    const unknown = [], weighed = [];
    for (const c of C) {
      const v = val(o.id, c.id);
      if (v === null) { unknown.push(c.id); if (c.weight) weighed.push(c.id); low -= c.weight; high += c.weight; } else { score += c.weight * v; low += c.weight * v; high += c.weight * v; }
    }
    return {id: o.id, i, score, low, high, unknown, unknownWeighed: weighed};
  });
  const order = [...rows].sort((a, b) => b.score - a.score || a.i - b.i);
  order.forEach((r, k) => { r.rank = k && r.score === order[k - 1].score ? order[k - 1].rank : k + 1; });
  const top = order.filter(r => r.score === order[0]?.score);
  const lead = O.length > 1 && top.length === 1 ? top[0].id : null, tied = O.length > 1 && top.length > 1 ? top.map(r => r.id) : [];
  const R = new Map(rows.map(r => [r.id, r])), runnerUp = lead ? order[1].id : null;
  if (lean) return {rows, order: order.map(r => r.id), lead, tied, runnerUp, margin: lead ? R.get(lead).score - R.get(runnerUp).score : null};

  // Dominance (D-25-04): robust over the unstated effects (a's at its worst, b's at its best), else as the effects stand.
  const lo = v => v ?? -1, hi = v => v ?? 1, as = v => v ?? 0;
  const robust = (a, b) => { let strict = false; for (const c of C) { const x = lo(val(a, c.id)), y = hi(val(b, c.id)); if (x < y) return false; if (x > y) strict = true; } return strict; };
  const standing = (a, b) => { let strict = false; for (const c of C) { const x = as(val(a, c.id)), y = as(val(b, c.id)); if (x < y) return false; if (x > y) strict = true; } return strict; };
  const dominated = new Map();
  for (const b of order) {
    const pick = xs => xs.find(a => a.id === lead) || xs[0];
    const firm = order.filter(a => a.id !== b.id && robust(a.id, b.id));
    if (firm.length) { const a = pick(firm); dominated.set(b.id, {by: a.id, robust: true, better: C.filter(c => lo(val(a.id, c.id)) > hi(val(b.id, c.id))).map(c => c.id), unstated: []}); continue; }
    const soft = order.filter(a => a.id !== b.id && standing(a.id, b.id));
    // The unstated effects that could undo it: the dominating option's, where it could fall below the other's; the
    // dominated one's, where it could rise above.
    if (soft.length) { const a = pick(soft); dominated.set(b.id, {by: a.id, robust: false, better: C.filter(c => as(val(a.id, c.id)) > as(val(b.id, c.id))).map(c => c.id), unstated: C.flatMap(c => [val(a.id, c.id) === null && as(val(b.id, c.id)) > -1 ? {of: a.id, criterion: c.id} : null, val(b.id, c.id) === null && as(val(a.id, c.id)) < 1 ? {of: b.id, criterion: c.id} : null].filter(Boolean))}); }
  }

  // How firmly the lead holds (D-25-05), against each other option in order; the weakest level is the reading's.
  const present = CLASSES.filter(k => C.some(c => c.cls === k && c.weight));
  const ofClass = k => C.filter(c => c.cls === k && c.weight);
  function against(L, B) {
    const d = c => as(val(L, c.id)) - as(val(B, c.id));
    let above = 0, level1 = null, cum = 0, level2 = null;
    present.forEach((k, j) => {
      const xs = ofClass(k).map(c => ({c, d: d(c)})), neg = xs.filter(x => x.d < 0);
      const pickS = neg.length ? neg : [xs.reduce((m, x) => (x.d < m.d ? x : m))];
      // The up-sets of this class: every criterion of the classes above it and some of its own (pickS is the subset
      // that does the leader most harm).
      if (!level1 && above + pickS.reduce((n, x) => n + x.d, 0) < 0) level1 = {kind: 'within', cls: k, weighing: [...present.slice(0, j).flatMap(h => ofClass(h).map(c => c.id)), ...pickS.map(x => x.c.id)]};
      above += xs.reduce((n, x) => n + x.d, 0);
      cum += xs.reduce((n, x) => n + x.d, 0);
      if (!level2 && cum < 0) level2 = {kind: 'across', cls: k, weighing: present.slice(0, j + 1).flatMap(h => ofClass(h).map(c => c.id))};
    });
    return {against: B, level: !level1 ? 1 : !level2 ? 2 : 3, swing: level2 || level1 || null};
  }
  let firmness = null;
  if (lead && present.length) {
    for (const r of order.slice(1)) {
      const f = against(lead, r.id);
      if (!firmness || f.level > firmness.level) firmness = f;
    }
    firmness ??= {against: null, level: 1, swing: null};
    if (firmness.level === 1) firmness = {...firmness, against: null, swing: null};
  }

  // What the unstated effects could do (D-25-06), at the default weights.
  let unknowns = {count: rows.reduce((n, r) => n + r.unknownWeighed.length, 0), couldChange: false, cells: []};
  if (lead) {
    const Lr = R.get(lead), rivals = order.slice(1).filter(r => r.high >= Lr.low && (r.unknownWeighed.length || Lr.unknownWeighed.length));
    const cells = rivals.length ? [...Lr.unknownWeighed.map(c => ({of: lead, criterion: c})), ...rivals.flatMap(r => r.unknownWeighed.map(c => ({of: r.id, criterion: c})))] : [];
    unknowns = {...unknowns, couldChange: rivals.length > 0, rivals: rivals.map(r => r.id), cells};
  } else if (tied.length) {
    const cells = tied.flatMap(id => R.get(id).unknownWeighed.map(c => ({of: id, criterion: c})));
    unknowns = {...unknowns, couldSeparate: cells.length > 0, cells};
  }

  // Where the two at the top pull apart: the criteria each is better on, on what both state.
  const pair = lead ? [lead, runnerUp] : tied.slice(0, 2);
  const apart = pair.length === 2 ? {first: pair[0], second: pair[1], firstBetter: C.filter(c => c.weight && val(pair[0], c.id) !== null && val(pair[1], c.id) !== null && val(pair[0], c.id) > val(pair[1], c.id)).map(c => c.id), secondBetter: C.filter(c => c.weight && val(pair[0], c.id) !== null && val(pair[1], c.id) !== null && val(pair[1], c.id) > val(pair[0], c.id)).map(c => c.id)} : null;

  // The one-step sensitivity points: a criterion whose class, moved one step, changes which option leads.
  const leaderOf = cs => { const s = O.map(o => cs.reduce((n, c) => n + c.weight * as(val(o.id, c.id)), 0)), m = Math.max(...s), at = s.flatMap((v, k) => (v === m ? [k] : [])); return O.length > 1 && at.length === 1 ? O[at[0]].id : null; };
  const sensitivity = [];
  for (const c of C.filter(c => CLASSES.includes(c.cls))) {
    const k = CLASSES.indexOf(c.cls);
    for (const to of [CLASSES[k - 1], CLASSES[k + 1]].filter(Boolean)) {
      const after = leaderOf(C.map(x => (x.id === c.id ? {...x, cls: to, weight: WEIGHT[to]} : x)));
      if (after !== lead) sensitivity.push({criterion: c.id, to, before: lead, after});
    }
  }
  return {rows, order: order.map(r => r.id), lead, tied, runnerUp, margin: lead ? R.get(lead).score - R.get(runnerUp).score : null, dominated, firmness, unknowns, apart, sensitivity};
}

// ---------------------------------------------------------------- a decision, read

// A constraint driver's force: hard unless every constraint record it links is Should or Could.
export function constraintForce(p, r) {
  const records = list(r?.constraintIds).map(id => findIn(p, 'reading:artefacts', () => list(p?.artefacts), id)).filter(a => a?.type === 'constraint');
  const soft = records.length > 0 && records.every(a => a.priority === 'Should' || a.priority === 'Could');
  const must = records.filter(a => a.priority === 'Must').map(a => a.id);
  return {hard: !soft, records: records.map(a => a.id), must, basis: soft ? 'soft' : must.length ? 'must' : records.length ? 'unstated' : 'unlinked'};
}

// priorities: {driverId: priority} read instead of the recorded ones (a what-if, a sensitivity step); the reading of the
// recorded priorities is remembered per settled document. lean: the screen, the totals and the lead only (what a
// sensitivity step or a driver's tuning compares), not dominance, firmness or the unknowns.
export function readDecision(p, d, {priorities = null, lean = false} = {}) {
  if (!d) return null;
  return priorities || lean ? readDecisionOf(p, d, priorities, lean) : remember(p, 'decision-reading', d, () => readDecisionOf(p, d, null, false));
}
export const decisionReadingOf = (p, id) => readDecision(p, list(p?.decisions?.records).find(d => d.id === id) || null);

function readDecisionOf(p, d, priorities, lean) {
  const drivers = [], missing = [];
  for (const id of uniq(list(d.driverIds))) {
    const r = findIn(p, 'reading:drivers', () => list(p?.quality?.drivers), id);
    if (!r) { missing.push(id); continue; }
    const priority = priorities && Object.hasOwn(priorities, id) ? str(priorities[id]) : driverPriority(r), cls = CLASSES.includes(priority) ? priority : null;
    const kind = driverKind(r), force = kind === 'constraint' ? constraintForce(p, r) : null;
    drivers.push({id, record: r, kind, priority: cls || '', cls, weight: cls ? WEIGHT[cls] : 0, hard: !!force?.hard, force});
  }
  const alternatives = list(d.alternatives).map((a, i) => {
    const effects = {}, values = {};
    for (const x of drivers) {
      const v = a.assessments?.[x.id], effect = effectOf(v);
      effects[x.id] = {effect, reason: str(v?.reason), evidence: str(v?.evidence), by: v?.by || null};
      values[x.id] = effect === 'unknown' ? null : VALUE[effect];
    }
    return {id: a.id, alt: a, i, effects, values, breaks: drivers.filter(x => x.hard && effects[x.id].effect === 'violates').map(x => x.id), unshown: drivers.filter(x => x.hard && effects[x.id].effect === 'unknown').map(x => x.id)};
  });
  const eligible = alternatives.filter(a => !a.breaks.length), criteria = drivers.map(x => ({id: x.id, cls: x.cls, weight: x.weight}));
  const shown = weighOptions(criteria, alternatives.map(a => ({id: a.id, values: a.values})), {lean: true}), W = weighOptions(criteria, eligible.map(a => ({id: a.id, values: a.values})), {lean});
  const only = alternatives.length > 1 && eligible.length === 1 ? eligible[0].id : null, lead = W.lead || only;
  if (lean) return {id: d.id, decision: d, lean: true, lead, tied: W.tied, only: !!only, rows: alternatives.map(a => { const s = shown.rows.find(r => r.id === a.id); return {alt: a.alt, id: a.id, score: s.score, out: a.breaks.length > 0}; })};
  const rows = alternatives.map(a => {
    const s = shown.rows.find(r => r.id === a.id), e = W.rows.find(r => r.id === a.id);
    return {alt: a.alt, id: a.id, parts: drivers.map(x => ({driverId: x.id, effect: a.effects[x.id].effect, weight: x.weight, score: x.weight * (a.values[x.id] ?? 0)})), score: s.score, low: s.low, high: s.high, open: s.unknown.length,
      rank: e ? e.rank : null, out: a.breaks.length > 0, breaks: a.breaks, unshown: a.unshown, dominated: W.dominated.get(a.id) || null};
  });
  const weighed = drivers.some(x => x.weight), judged = eligible.some(a => drivers.some(x => x.weight && a.values[x.id] !== null));
  const state = alternatives.length < 2 ? 'single' : !eligible.length ? 'out' : only ? 'only' : !weighed ? 'unweighed' : !judged ? 'unjudged' : 'read';
  const sel = alternatives.find(a => a.id === d.selectedAlternativeId) || null, row = sel && rows.find(r => r.id === sel.id);
  const choice = sel ? {id: sel.id, standing: row.out ? 'ruled-out' : row.dominated?.robust ? 'dominated' : lead === sel.id ? 'leads' : W.tied.includes(sel.id) ? 'tied' : 'below', rank: row.rank, of: eligible.length, breaks: row.breaks, unshown: row.unshown, dominatedBy: row.dominated?.robust ? row.dominated.by : null} : null;
  return {id: d.id, decision: d, state, drivers, missing, leftOut: drivers.filter(x => !x.cls).map(x => x.id), hard: drivers.filter(x => x.hard).map(x => x.id),
    rows, order: W.order, lead, only: !!only, tied: W.tied, runnerUp: W.runnerUp, margin: W.margin, dominated: W.dominated, firmness: only ? null : W.firmness, unknowns: W.unknowns, apart: W.apart,
    sensitivity: W.sensitivity.map(s => ({driverId: s.criterion, to: s.to, before: s.before, after: s.after})), ruledOut: alternatives.filter(a => a.breaks.length).map(a => ({id: a.id, breaks: a.breaks})), choice};
}

// ---------------------------------------------------------------- the reading in words

const and = xs => (xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1));
const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n, one, many) => (NUM[n] || String(n)) + ' ' + (n === 1 ? one : many);
// A total as the reading writes it: +2, −1, 0 (the screens, the SDD and Chapter 7's table print it so).
export const signed = n => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
// The weighting a swing names, in words: whole classes as "the High drivers", part of one as its drivers' names.
function weighingWords(r, ids, driver) {
  const by = CLASSES.map(k => ({k, all: r.drivers.filter(x => x.cls === k && x.weight), xs: r.drivers.filter(x => x.cls === k && ids.includes(x.id))})).filter(g => g.xs.length);
  return and(by.map(g => (g.xs.length === g.all.length && g.all.length > 1 ? 'the ' + g.k + ' drivers' : and(g.xs.map(x => driver(x.id))) + ' (' + g.k + ')')));
}

// The reading as sentences, each with its kind (ruled-out, force, lead, firmness, dominated, unshown, unknowns, apart,
// left-out, missing, sensitivity, choice), for the screens and the SDD to pick from. alt and driver name the records.
export function readingLines(r, {alt = id => id, driver = id => id} = {}) {
  const out = [], add = (kind, text, extra = {}) => out.push({kind, text, ...extra});
  if (!r) return out;
  for (const x of r.ruledOut) add('ruled-out', `${alt(x.id)} is ruled out: it breaks ${and(x.breaks.map(driver))}, ${x.breaks.length === 1 ? 'a hard constraint' : 'hard constraints'}.`, {id: x.id});
  for (const x of r.drivers.filter(x => x.hard && x.force.basis !== 'must' && r.rows.some(row => row.breaks.includes(x.id) || row.unshown.includes(x.id)))) add('force', `${driver(x.id)} is read as a hard constraint: ${x.force.basis === 'unlinked' ? 'it links no constraint record' : 'no priority is stated for its constraint record'}.`, {id: x.id});
  const L = r.lead, row = id => r.rows.find(x => x.id === id);
  if (r.state === 'single') add('lead', 'With one alternative there is nothing to weigh.');
  else if (r.state === 'out') add('lead', 'Every alternative breaks a hard constraint: revisit the alternatives or the constraint.');
  else if (r.state === 'only') add('lead', row(L).unshown.length ? `${alt(L)} is the only alternative a hard constraint does not rule out.` : `${alt(L)} is the only alternative that meets the hard constraints.`, {id: L});
  else if (r.state === 'unweighed') add('lead', 'No driver this decision names has a stated priority, so nothing is weighed.');
  else if (r.state === 'unjudged') add('lead', 'No effect on a weighed driver is stated yet.');
  else if (L) add('lead', `${alt(L)} leads on the drivers: ${signed(row(L).score)} against ${signed(row(r.runnerUp).score)} for ${alt(r.runnerUp)} at the default weights (${DEFAULT_WEIGHTS}).`, {id: L});
  else if (r.tied.length) add('lead', `${and(r.tied.map(alt))} tie at the default weights (${signed(row(r.tied[0]).score)} each).`, {ids: r.tied});
  if (L && r.firmness && r.state === 'read') {
    const f = r.firmness, one = f.swing?.weighing.length === 1;
    const swing = f.swing ? ` If only ${weighingWords(r, f.swing.weighing, driver)} counted${one ? '' : ', alike'}, ${alt(f.against)} would come ahead of ${alt(L)}.` : '';
    add('firmness', f.level === 1 ? 'The lead holds for any weights that keep each High driver at least as heavy as each Medium one, and each Medium at least as heavy as each Low one.'
      : f.level === 2 ? 'The lead holds if drivers of the same priority count alike, not for every weighting the priorities allow.' + swing
      : `The lead holds only at the default weights.${swing}`, {level: f.level});
  }
  for (const [id, x] of r.dominated) add('dominated', x.robust ? `${alt(id)} is dominated by ${alt(x.by)}: ${alt(x.by)} is at least as good on every driver and better on ${and(x.better.map(driver))}.`
    : `${alt(id)} is dominated by ${alt(x.by)} as the effects stand; ${and(x.unstated.map(u => alt(u.of) + '’s effect on ' + driver(u.criterion)))} ${x.unstated.length === 1 ? 'is' : 'are'} not stated.`, {id, by: x.by, robust: x.robust});
  for (const x of r.rows.filter(x => !x.out && x.unshown.length)) add('unshown', `Whether ${alt(x.id)} meets ${and(x.unshown.map(driver))} is not stated.`, {id: x.id});
  const u = r.unknowns;
  // The effects that matter, the leader's first: all of the unstated ones ("stating them"), or those named.
  const cells = u?.cells?.length ? and(u.cells.slice(0, 6).map(c => alt(c.of) + '’s on ' + driver(c.criterion))) + (u.cells.length > 6 ? ' and ' + count(u.cells.length - 6, 'more', 'more') : '') : '';
  if (u?.count && L && r.state === 'read') add('unknowns', `${cap(count(u.count, 'weighed effect is', 'weighed effects are'))} not stated; ${!u.couldChange ? 'none could change the lead' : u.cells.length === u.count ? 'stating ' + (u.count === 1 ? 'it' : 'them') + ' could change the lead: ' + cells : 'stating ' + cells + ' could change the lead'}.`, {couldChange: !!u.couldChange});
  else if (u?.count && r.tied.length) add('unknowns', `${cap(count(u.count, 'weighed effect is', 'weighed effects are'))} not stated${u.couldSeparate ? '; stating those of the tied alternatives could separate them' : ''}.`);
  const ap = r.apart;
  if (ap && ap.firstBetter.length && ap.secondBetter.length) add('apart', `${alt(ap.first)} is better on ${and(ap.firstBetter.map(driver))}; ${alt(ap.second)} on ${and(ap.secondBetter.map(driver))}.`);
  if (r.leftOut.length) add('left-out', `${and(r.leftOut.map(driver))} ${r.leftOut.length === 1 ? 'weighs' : 'weigh'} nothing: no priority is stated.`, {ids: r.leftOut});
  if (r.missing.length) add('missing', `${and(r.missing)} no longer ${r.missing.length === 1 ? 'exists' : 'exist'} and ${r.missing.length === 1 ? 'weighs' : 'weigh'} nothing.`, {ids: r.missing});
  for (const s of r.sensitivity) add('sensitivity', `${driver(s.driverId)} is a sensitivity point: at ${s.to}, ${s.after ? alt(s.after) + ' would lead' : 'no alternative would lead'} instead of ${s.before ? alt(s.before) : 'a tie'}.`, {id: s.driverId});
  // An accepted decision's choice is the chosen alternative; before that, the working choice.
  const c = r.choice, who = r.decision?.status === 'accepted' ? 'The chosen alternative' : 'The working choice';
  if (c) add('choice', c.standing === 'ruled-out' ? `${who}, ${alt(c.id)}, breaks ${and(c.breaks.map(driver))}, ${c.breaks.length === 1 ? 'a hard constraint' : 'hard constraints'}.`
    : c.standing === 'dominated' ? `${who}, ${alt(c.id)}, is dominated by ${alt(c.dominatedBy)}.`
    : c.standing === 'leads' ? `${who}, ${alt(c.id)}, leads on the drivers.`
    : c.standing === 'tied' ? `${who}, ${alt(c.id)}, ties for the lead.`
    : `${who}, ${alt(c.id)}, ranks ${c.rank} of ${c.of} on the drivers.`, {id: c.id, standing: c.standing});
  return out;
}
