// Chapter 7's product options, weighed against the drivers the way Chapter 3 weighs alternatives.
//
// Each option is read against the realisation's own criteria (realizationCriteria: the drivers it
// carries, then operations, recovery, lifecycle and cost). A cell is the architect's recorded
// judgement where there is one; otherwise product-knowledge.js may suggest one from what the
// product is documented to do, with the mechanism and its source. The weighing is plain arithmetic
// — a driver weighs as its priority (Critical 3, Important 2, Supporting 1), the other criteria as 1,
// supports +1, a trade-off −1 — shown twice: on recorded judgements alone, and with the suggestions
// filling the gaps. It is a lean, never a choice. A sensitivity point is a driver whose one-step
// priority change would tip the lean. When the review desk has an objective, a single-unit ceiling
// (one queue, one primary) says where each option stops keeping up. Pure.
import {realizationCriteria} from './technology-realisation-domain.js';
import {PRIORITY_WEIGHT, EFFECT_SCORE, productOf, reasoningSource} from './design-reasoning.js';
import {capacityObjective, capacityPlan} from './desk-capacity.js';
import {traitsFor, playbookNames, operatingTrait, ceilingOf, spreadsOf} from './product-knowledge.js';
import {productsAvailable, playbookAvailable} from './model-knowledge.js';

const list = v => Array.isArray(v) ? v : [];
const PRIORITIES = ['Supporting', 'Important', 'Critical'];
const RECOVERY_ATTRS = ['availability', 'recoverability'];

// A suggested judgement for one option on one criterion, or null when nothing documented bears on it.
export function suggest(option, crit, ctx = {}) {
  // A withdrawn pack stops suggesting; the operating model is the project's own record.
  const product = ctx.products === false ? '' : option?.product || '';
  if (ctx.products === false && crit.id !== 'operations') return null;
  if (crit.kind === 'other') {
    if (crit.id === 'operations') { const t = operatingTrait(option.operatingModel); return t ? {effect: t.effect, reasons: [{text: t.text, src: t.src}]} : null; }
    if (crit.id !== 'recovery') return null;
    return combine(traitsFor(product).filter(t => t.attrs.some(a => RECOVERY_ATTRS.includes(a)) && t.effect !== 'ceiling'));
  }
  if (crit.kind === 'objective') {
    const c = ctx.ceiling && ctx.ceiling.optionId === option.id ? ctx.ceiling : null, sp = spreadsOf(product);
    if (c) return {effect: c.passed ? 'tension' : 'supports', reasons: [{text: `${c.mechanism} ${c.passed ? `Past it above about ${c.holdsText.replace('≈', '')}.` : `Holds to ${c.holdsText} on the planning assumption.`}`, src: c.src}]};
    if (sp) return {effect: 'supports', reasons: [{text: sp.text, src: sp.src}]};
    const cl = ceilingOf(product);
    return cl ? {effect: 'unknown', reasons: [{text: cl.trait.text, src: cl.trait.src}]} : null;
  }
  const attr = crit.attr;
  const own = traitsFor(product).filter(t => t.attrs.includes(attr) && t.effect !== 'ceiling');
  const ceil = traitsFor(product).find(t => t.attrs.includes(attr) && t.effect === 'ceiling');
  const traits = [...own];
  if (ceil && ctx.ceiling && ctx.ceiling.optionId === option.id) traits.push({effect: ctx.ceiling.passed ? 'tension' : 'supports', text: `${ceil.text} ${ctx.ceiling.passed ? 'The objective passes it.' : `It holds to ${ctx.ceiling.holdsText} on the planning assumption.`}`, src: ceil.src});
  const r = combine(traits);
  if (r) return r;
  const named = ctx.playbook === false ? [] : playbookNames(product).filter(n => n.attr === attr);
  return named.length ? {effect: 'supports', weak: true, reasons: named.slice(0, 1).map(n => ({text: `The SA Playbook names ${n.name} among the technologies for ${n.attrName.toLowerCase()} (${n.kind}).`, src: n.src}))} : null;
}
function combine(traits) {
  if (!traits.length) return null;
  const t = traits.filter(x => x.effect === 'tension'), s = traits.filter(x => x.effect === 'supports');
  const effect = t.length && !s.length ? 'tension' : s.length && !t.length ? 'supports' : t.length ? 'tension' : 'unknown';
  return {effect, reasons: traits.map(x => ({text: x.text, src: x.src}))};
}

// The reading of one realisation's options.
export function choiceReading(p, realisationId, {ceiling = null, objective = null} = {}) {
  const r = list(p?.technologyRealisation?.records).find(x => x.id === realisationId);
  if (!r) return null;
  const drivers = new Map(list(p?.quality?.drivers).map(d => [d.id, d]));
  const crits = realizationCriteria(p, r.id).map(c => { const d = drivers.get(c.id); return d ? {id: c.id, title: c.title, detail: c.detail, kind: 'driver', attr: d.category, priority: d.priority, weight: PRIORITY_WEIGHT[d.priority] || 1} : {id: c.id, title: c.title, detail: c.detail, kind: 'other', attr: c.id, priority: null, weight: 1}; });
  // The objective weighs only when the project records it: as its scalability driver, or as the saved review objective.
  if (objective && !crits.some(c => c.kind === 'driver' && c.attr === 'scalability') && list(r.options).some(o => ceilingOf(o.product) || spreadsOf(o.product))) {
    const scal = [...drivers.values()].find(d => d.category === 'scalability');
    const weighed = !!scal || objective.source?.kind === 'driver' || objective.source?.kind === 'review';
    crits.push({id: 'OBJ', title: `Carry ${objective.text}`, detail: weighed ? (scal ? `Weighed as ${scal.id}, ${scal.priority}` : 'The saved review objective, weighed as Important') : 'The SA Playbook\'s example objective: shown, not weighed', kind: 'objective', attr: 'scalability', priority: scal?.priority || (weighed ? 'Important' : null), weight: weighed ? (PRIORITY_WEIGHT[scal?.priority] || 2) : 0});
  }
  const reading = productOf(r)?.option?.id || null;
  const options = list(r.options).map(o => {
    const cells = crits.map(c => {
      const a = c.kind === 'objective' ? null : o.assessments?.[c.id];
      const recorded = a && a.effect && a.effect !== 'unknown' ? {effect: a.effect, reason: a.reason || '', evidence: a.evidence || ''} : null;
      const suggested = recorded ? null : suggest(o, c, {ceiling, products: productsAvailable(p), playbook: playbookAvailable(p)});
      return {crit: c.id, recorded, suggested, effect: recorded?.effect || suggested?.effect || 'unknown', source: recorded ? 'recorded' : suggested && suggested.effect !== 'unknown' ? 'suggested' : 'none'};
    });
    return {option: o, reading: o.id === reading, preferred: o.id === r.selectedOptionId, cells};
  });
  // A product the playbook merely names for an attribute is shown, not weighed: naming is not a mechanism.
  const score = (opt, pr = null, mode = 'all') => opt.cells.reduce((n, cell, i) => { const c = crits[i], e = mode === 'recorded' ? cell.recorded?.effect : cell.source === 'suggested' && cell.suggested.weak ? null : cell.effect, w = c.kind === 'driver' && pr ? PRIORITY_WEIGHT[pr[c.id]] || c.weight : c.weight; return n + w * (EFFECT_SCORE[e] || 0); }, 0);
  const lean = (mode, pr = null) => { if (options.length < 2) return null; const s = options.map(o => ({id: o.option.id, v: score(o, pr, mode)})).sort((a, b) => b.v - a.v); return s[0].v > s[1].v ? s[0].id : null; };
  for (const o of options) { o.recordedScore = score(o, null, 'recorded'); o.score = score(o); }
  const leanRecorded = lean('recorded'), leanAll = lean('all');
  // Sensitivity: a one-step priority change that tips the lean with the suggestions.
  const base = Object.fromEntries(crits.filter(c => c.kind === 'driver').map(c => [c.id, c.priority]));
  const sens = [];
  for (const c of crits.filter(c => c.kind === 'driver')) for (const step of [-1, 1]) {
    const i = PRIORITIES.indexOf(c.priority) + step; if (i < 0 || i >= PRIORITIES.length) continue;
    const l = lean('all', {...base, [c.id]: PRIORITIES[i]});
    if (l !== leanAll) sens.push({driver: c.id, to: PRIORITIES[i], lean: l});
  }
  const counts = {recorded: options.reduce((n, o) => n + o.cells.filter(x => x.recorded).length, 0), suggested: options.reduce((n, o) => n + o.cells.filter(x => x.source === 'suggested').length, 0), cells: options.length * crits.length};
  const revisit = !!(leanAll && reading && leanAll !== reading) || !!ceiling?.passed;
  return {record: r, criteria: crits, options, reading, leanRecorded, leanAll, sens, counts, ceiling, revisit};
}

export function describeChoice(C) {
  if (!C) return '';
  const o = id => C.options.find(x => x.option.id === id)?.option, name = id => o(id)?.product || o(id)?.title || id;
  const cur = C.reading ? name(C.reading) : 'no option';
  const parts = [];
  if (C.ceiling) parts.push(C.ceiling.passed ? `${cur} needs more than ${C.ceiling.label} above ${C.ceiling.holdsText}` : `${cur} holds to ${C.ceiling.holdsText} on ${C.ceiling.label}`);
  if (C.leanRecorded) parts.push(`recorded judgements lean to ${name(C.leanRecorded)}`);
  else if (C.leanAll) parts.push(`with the suggestions, the drivers lean to ${name(C.leanAll)}`);
  else parts.push('the drivers do not lean either way');
  return parts.join('; ') + '.';
}

// Suggestions an architect can record in Chapter 7, as that chapter's own assessment commands.
export function suggestionCommands(C, {include = null} = {}) {
  const out = [];
  for (const o of C.options) C.criteria.forEach((c, i) => {
    const cell = o.cells[i];
    if (c.kind === 'objective' || cell.recorded || !cell.suggested || cell.suggested.effect === 'unknown') return;
    const key = o.option.id + ':' + c.id;
    if (include && !include.includes(key)) return;
    out.push({key, option: o.option, crit: c, effect: cell.suggested.effect, weak: !!cell.suggested.weak, reason: cell.suggested.reasons.map(r => r.text).join(' '), evidence: [...new Set(cell.suggested.reasons.map(r => r.src))].join(' · '),
      command: {type: 'techrealisation.assessment', payload: {id: C.record.id, optionId: o.option.id, criterionId: c.id, effect: cell.suggested.effect, reason: cell.suggested.reasons.map(r => r.text).join(' '), evidence: [...new Set(cell.suggested.reasons.map(r => r.src))].join(' · ')}}});
  });
  return out;
}

// The same reading, with the review's objective and its single-unit ceilings, for any surface.
export function choiceForDesign(p, realisationId) {
  try {
    const R = reasoningSource(p), O = capacityObjective(R, p?.finalReview?.capacity || null), plan = capacityPlan(R, O);
    const row = plan.rows.find(r => r.id === realisationId);
    return choiceReading(p, realisationId, {ceiling: row?.ceiling || null, objective: {text: plan.objText, source: O.source}});
  } catch { return choiceReading(p, realisationId, {}); }
}
