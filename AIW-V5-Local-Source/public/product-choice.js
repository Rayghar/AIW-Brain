// Chapter 7's product options, weighed against the drivers the way Chapter 3 weighs alternatives.
//
// Each option is read against the realisation's own criteria (realizationCriteria: the drivers it
// carries, then operations, recovery, lifecycle and cost). A cell is the architect's recorded
// judgement where there is one; otherwise product-knowledge.js may suggest one from what the
// product is documented to do, with the mechanism and its source. The weighing is plain arithmetic
// — a driver weighs as its priority (High 3, Medium 2, Low 1; one with none stated weighs nothing), the other criteria as 1,
// supports +1, a trade-off −1 — shown twice: on recorded judgements alone, and with the suggestions
// filling the gaps. It is a lean, never a choice. A sensitivity point is a driver whose one-step
// priority change would tip the lean. When the review desk has an objective, a single-unit ceiling
// (one queue, one primary) says where each option stops keeping up. Pure.
import {realizationCriteria,realizationSources,optionAssessmentCurrent} from './technology-realisation-domain.js';
import {productOf, reasoningSource} from './design-reasoning.js';
// The arithmetic is the decision reading's (round 25, D-25-11): its weights and effect values, and its core for which
// option another dominates and what the unrecorded judgements could do.
import {WEIGHT, VALUE, weightOf, weighOptions} from './decision-reading.js';
import {capacityObjective, capacityPlan} from './desk-capacity.js';
import {playbookNames, operatingTrait, ceilingOf, spreadsOf} from './product-knowledge.js';
import {productMechanisms} from './product-applicability.js';
import {architectureKnowledgeSnapshot,architectureKnowledgeForChoice} from './architecture-knowledge.js';
import {productsAvailable, playbookAvailable} from './model-knowledge.js';
import {list} from './util.js';
import {driverPriority} from './quality-domain.js';
import {passValue, memoOff} from './document-memo.js';

// Low to High (round 12, D-02); a priority recorded before round 12 is read as the one it maps to (driverPriority).
const PRIORITIES = ['Low', 'Medium', 'High'];
const RECOVERY_ATTRS = ['availability', 'recoverability'];

// A suggested judgement for one option on one criterion, or null when nothing documented bears on it.
export function suggest(option, crit, ctx = {}) {
  // A withdrawn pack stops suggesting; the operating model is the project's own record.
  const product = ctx.products === false ? '' : option?.product || '';
  const mechanisms = ctx.mechanisms || productMechanisms(option, ctx), applicable = mechanisms.filter(t => t.applicability.state === 'context-match');
  const scoped = traits => {
    const result = combine(traits.filter(t => t.applicability.state === 'context-match'));
    if (result) {const used=traits.filter(t=>t.applicability.state==='context-match');return {...result, applicability: 'context-match', mechanismIds:used.map(t=>t.id),support:used.map(t=>t.receipt).filter(Boolean)};}
    return traits.length ? {effect: 'unknown', applicability: traits.some(t => t.applicability.state === 'needs-context') ? 'needs-context' : 'excluded',
      reasons: traits.flatMap(t => (t.applicability.reasons?.length ? t.applicability.reasons : ['Check the mechanism conditions before using it for this design.']).map(text => ({text, src: t.src}))), mechanismIds: traits.map(t => t.id)} : null;
  };
  if (crit.kind === 'other') {
    if (crit.id === 'operations') { const t = operatingTrait(option.operatingModel); return t ? {effect: t.effect, reasons: [{text: t.text, src: t.src}]} : null; }
    if (crit.id !== 'recovery') return null;
    return scoped(mechanisms.filter(t => t.attrs.some(a => RECOVERY_ATTRS.includes(a)) && t.effect !== 'ceiling'));
  }
  if (crit.kind === 'objective') {
    const c = ctx.ceiling && ctx.ceiling.optionId === option.id && applicable.some(t => t.effect === 'ceiling') ? ctx.ceiling : null, sp = applicable.find(t => t.spreads);
    if (c) return {effect: c.passed ? 'tension' : 'supports', reasons: [{text: `${c.mechanism} ${c.passed ? `Past it above about ${c.holdsText.replace('≈', '')}.` : `Holds to ${c.holdsText} on the planning assumption.`}`, src: c.src}]};
    if (sp) return {effect: 'supports', reasons: [{text: sp.text, src: sp.src}]};
    return scoped(mechanisms.filter(t => t.attrs.includes('scalability')).map(t => t.effect === 'ceiling' ? {...t,effect:'unknown'} : t));
  }
  const attr = crit.attr;
  const own = mechanisms.filter(t => t.attrs.includes(attr) && t.effect !== 'ceiling');
  const ceil = applicable.find(t => t.attrs.includes(attr) && t.effect === 'ceiling');
  const traits = [...own];
  if (ceil && ctx.ceiling && ctx.ceiling.optionId === option.id) traits.push({...ceil,effect: ctx.ceiling.passed ? 'tension' : 'supports', text: `${ceil.text} ${ctx.ceiling.passed ? 'The objective passes it.' : `It holds to ${ctx.ceiling.holdsText} on the planning assumption.`}`});
  const r = scoped(traits);
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
  const crits = realizationCriteria(p, r.id).map(c => { const d = drivers.get(c.id); return d ? {...c,kind:'driver',attr:c.driverKind==='quality'?d.category:null,priority:driverPriority(d),weight:weightOf(driverPriority(d))} : {...c,kind:c.kind==='architecture-obligation'?'obligation':'other',attr:c.id,priority:null,weight:c.kind==='architecture-obligation'?0:1}; });
  const sources=realizationSources(p,r.id),knowledge=architectureKnowledgeSnapshot(p);
  // The objective weighs only when the project records it: as its scalability driver, or as the saved review objective.
  // Round 12 (G, GR-RUN-04): with no load stated there is no objective to carry, and none is shown.
  if (objective && objective.source?.kind !== 'none' && !crits.some(c => c.kind === 'driver' && c.attr === 'scalability') && list(r.options).some(o => ceilingOf(o.product) || spreadsOf(o.product))) {
    const scal = [...drivers.values()].find(d => d.category === 'scalability');
    const weighed = !!scal || objective.source?.kind === 'driver' || objective.source?.kind === 'review';
    crits.push({id: 'OBJ', title: `Carry ${objective.text}`, detail: weighed ? (scal ? `Weighed as ${scal.id}, ${driverPriority(scal)}` : 'The saved review objective, weighed as Medium') : 'The SA Playbook\'s example objective, assumed (playbook example): shown, not weighed', kind: 'objective', attr: 'scalability', priority: (scal && driverPriority(scal)) || (weighed ? 'Medium' : null), weight: weighed ? (weightOf(scal && driverPriority(scal)) || 2) : 0});
  }
  const reading = productOf(r)?.option?.id || null;
  const options = list(r.options).map(o => {
    const claims=architectureKnowledgeForChoice(p,{...o,tier:o.serviceTier,capabilities:sources.capabilities},knowledge);
    const mechanisms=productMechanisms(o,{products:productsAvailable(p),claims:claims.matches});
    const cells = crits.map(c => {
      const a = c.kind === 'objective' ? null : o.assessments?.[c.id];
      const stale=!!a&&!optionAssessmentCurrent(p,r,o,a);
      const recorded = a && !stale && a.effect && a.effect !== 'unknown' ? {effect: a.effect, reason: a.reason || '', evidence: a.evidence || ''} : null;
      const suggested = recorded || stale || c.kind==='obligation' || c.hard ? null : suggest(o, c, {ceiling, mechanisms, products: productsAvailable(p), playbook: playbookAvailable(p)});
      return {crit: c.id, recorded, suggested, stale, previousAssessment:stale?a:null, effect: recorded?.effect || suggested?.effect || 'unknown', source: recorded ? 'recorded' : suggested && suggested.effect !== 'unknown' ? 'suggested' : 'none'};
    });
    const breaks=crits.filter((c,i)=>c.hard&&cells[i].recorded?.effect==='violates').map(c=>c.id),unshown=crits.filter((c,i)=>c.hard&&!cells[i].recorded).map(c=>c.id);
    return {option: o, reading: o.id === reading, preferred: o.id === r.selectedOptionId, cells, mechanisms, claims,
      applicability:{state:breaks.length?'excluded':unshown.length?'needs-context':'context-match',breaks,unknown:unshown,reasons:breaks.map(id=>'The recorded assessment violates hard constraint '+id+'.').concat(unshown.map(id=>'Hard constraint '+id+' still needs an assessment.'))}};
  });
  // A single unavailable mechanism is not a product rejection. Only a recorded
  // violation of an actual hard constraint leaves the preference calculation.
  const eligible=options.filter(o=>o.applicability.state!=='excluded');
  if(ceiling&&!options.find(o=>o.option.id===ceiling.optionId)?.mechanisms.some(m=>m.effect==='ceiling'&&m.applicability.state==='context-match'))ceiling=null;
  // A product the playbook merely names for an attribute is shown, not weighed: naming is not a mechanism.
  const score = (opt, pr = null, mode = 'all') => opt.cells.reduce((n, cell, i) => { const c = crits[i], e = mode === 'recorded' ? cell.recorded?.effect : cell.source === 'suggested' && cell.suggested.weak ? null : cell.effect, w = c.kind === 'driver' && pr ? weightOf(pr[c.id]) || c.weight : c.weight; return n + w * (VALUE[e] ?? 0); }, 0);
  const lean = (mode, pr = null) => { if (options.length < 2 || !eligible.length) return null; const s = eligible.map(o => ({id: o.option.id, v: score(o, pr, mode)})).sort((a, b) => b.v - a.v); return s.length===1||s[0].v > s[1].v ? s[0].id : null; };
  for (const o of options) { o.recordedScore = score(o, null, 'recorded'); o.score = score(o); }
  const leanRecorded = lean('recorded'), leanAll = lean('all');
  // Sensitivity: a one-step priority change that tips the lean with the suggestions.
  const base = Object.fromEntries(crits.filter(c => c.kind === 'driver').map(c => [c.id, c.priority]));
  // A changed priority changes only the terms of the criteria of that driver, so each option's score with it is the score
  // with the recorded priorities less the difference in those terms (round 5, R5-G: scoring every option on every
  // criterion again, twice per driver, was quadratic in the drivers a realisation carries). The scores are whole numbers,
  // so the difference is exact; the lean is the one option with the highest score, as lean() reads its sort. With every
  // cache off (document-memo.js unmemoised), every option is scored afresh, as before, for scale-validate.mjs to compare.
  const sens = [], atBase = options.map(o => score(o, base, 'all')), ofDriver = new Map();
  crits.forEach((c, i) => { if (c.kind === 'driver') { if (!ofDriver.has(c.id)) ofDriver.set(c.id, []); ofDriver.get(c.id).push(i); } });
  const term = (o, i, priority) => { const cell = o.cells[i], e = cell.source === 'suggested' && cell.suggested.weak ? null : cell.effect; return (WEIGHT[priority] ?? crits[i].weight) * (VALUE[e] ?? 0); };
  const leanOf = vs => { const indices=options.map((o,i)=>o.applicability.state==='excluded'?-1:i).filter(i=>i>=0);if(options.length<2||!indices.length)return null;let top=indices[0];for(const k of indices)if(vs[k]>vs[top])top=k;return indices.some(k=>k!==top&&vs[k]===vs[top])?null:options[top].option.id; };
  for (const c of crits.filter(c => c.kind === 'driver')) for (const step of [-1, 1]) {
    if (!c.priority) continue; const i = PRIORITIES.indexOf(c.priority) + step; if (i < 0 || i >= PRIORITIES.length) continue;
    const to = PRIORITIES[i], was = base[c.id], l = memoOff() ? lean('all', {...base, [c.id]: to}) : leanOf(options.map((o, k) => ofDriver.get(c.id).reduce((n, j) => n + term(o, j, to) - term(o, j, was), atBase[k])));
    if (l !== leanAll) sens.push({driver: c.id, to: PRIORITIES[i], lean: l});
  }
  // On the recorded judgements alone (round 25, D-25-11): which option another dominates whatever the unrecorded
  // judgements turn out to be, and each option's total with them at their worst and best. A suggestion is not counted.
  // The objective holds no recorded judgement (no command records one: its effect is the mechanism's suggestion), so it
  // takes no part, else it would leave every total open and no option ever dominated.
  const recordedCriteria=crits.filter(c=>c.kind!=='objective'&&c.kind!=='obligation').map(c=>({id:c.id,cls:c.kind==='driver'&&WEIGHT[c.priority]?c.priority:null,weight:c.weight}));
  const values=o=>({id:o.option.id,values:Object.fromEntries(o.cells.map(x=>[x.crit,x.recorded?VALUE[x.recorded.effect]??null:null]))});
  const recorded = weighOptions(recordedCriteria, eligible.map(values)), shown=weighOptions(recordedCriteria,options.map(values));
  for (const o of options) { const row = shown.rows.find(r => r.id === o.option.id), dom = recorded.dominated.get(o.option.id); o.bounds = {low: row.low, high: row.high}; o.dominatedBy = dom?.robust ? dom.by : null; }
  const counts = {recorded: options.reduce((n, o) => n + o.cells.filter(x => x.recorded).length, 0), suggested: options.reduce((n, o) => n + o.cells.filter(x => x.source === 'suggested').length, 0), stale:options.reduce((n,o)=>n+o.cells.filter(x=>x.stale).length,0), cells: options.length * crits.length};
  const revisit = !!(leanAll && reading && leanAll !== reading) || !!ceiling?.passed || options.some(o=>o.reading&&(o.applicability.state==='excluded'||o.cells.some(c=>c.stale)));
  return {record: r, criteria: crits, options, reading, leanRecorded, leanAll, sens, counts, ceiling, revisit,ruledOut:options.filter(o=>o.applicability.state==='excluded').map(o=>({id:o.option.id,breaks:o.applicability.breaks})),obligations:crits.filter(c=>c.kind==='obligation').map(c=>c.obligation)};
}

export function describeChoice(C) {
  if (!C) return '';
  const o = id => C.options.find(x => x.option.id === id)?.option, name = id => o(id)?.product || o(id)?.title || id;
  const cur = C.reading ? name(C.reading) : 'no option';
  const parts = [];
  if(C.ruledOut?.length)parts.push(C.ruledOut.map(o=>name(o.id)+' is outside the comparison because it breaks '+o.breaks.join(', ')).join('; '));
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
    if (c.kind === 'objective' || c.kind==='obligation' || c.hard || o.applicability?.state==='excluded' || cell.recorded || !cell.suggested || cell.suggested.weak || cell.suggested.effect === 'unknown') return;
    const key = o.option.id + ':' + c.id;
    if (include && !include.includes(key)) return;
    out.push({key, option: o.option, crit: c, effect: cell.suggested.effect, weak: !!cell.suggested.weak, reason: cell.suggested.reasons.map(r => r.text).join(' '), evidence: [...new Set(cell.suggested.reasons.map(r => r.src))].join(' · '),
      command: {type: 'techrealisation.assessment', payload: {id: C.record.id, optionId: o.option.id, criterionId: c.id, effect: cell.suggested.effect, reason: cell.suggested.reasons.map(r => r.text).join(' '), evidence: [...new Set(cell.suggested.reasons.map(r => r.src))].join(' · '),...(cell.suggested.support?.length?{support:cell.suggested.support}:{})}}});
  });
  return out;
}

// The same reading, with the review's objective and its single-unit ceilings, for any surface.
export function choiceForDesign(p, realisationId) {
  try {
    // The objective and the capacity plan are the document's, the same for every realisation: worked out once in a pass
    // over the document (the SDD reads every realisation with a choice; round 5, R5-G), and afresh outside one.
    const {O, plan} = passValue(p, 'choice:capacity', () => { const R = reasoningSource(p), O = capacityObjective(R, p?.finalReview?.capacity || null); return {O, plan: capacityPlan(R, O)}; });
    const row = plan.rows.find(r => r.id === realisationId);
    return choiceReading(p, realisationId, {ceiling: row?.ceiling || null, objective: {text: plan.objText, source: O.source}});
  } catch { return choiceReading(p, realisationId, {}); }
}
