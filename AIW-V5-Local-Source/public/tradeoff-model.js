// Chapter 3 Model — pure model of the decisions: what each weighs, its alternatives and their
// patterns and anti-patterns (linked to the SA Playbook and the pattern catalogue), how each
// alternative affects each driver, which alternative the drivers favour as weighted by their
// priority, and where a priority change would change that (a sensitivity point). Architecture style
// is read as a decision too: recorded if the project has one, otherwise offered from the playbook.
// Deterministic; reads, never writes.
import {STYLES, attribute} from './playbook-knowledge.js';
import {reasoningSource, decisionTally, patternKnowledge, styleMarks, styleAlternative, STYLE_DECISION, PRIORITY_WEIGHT, EFFECT_SCORE} from './design-reasoning.js';
import {decisionFindings, chosen, statusLabel} from './decisions-domain.js';

export const STYLE_PROPOSAL = 'ADR:style';
export const PROPOSED_ALT = 'ALT:proposed';
export const PRIORITIES = ['Critical', 'Important', 'Supporting'];
const list = v => Array.isArray(v) ? v : [];
const uniq = xs => [...new Set(xs)];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const joinAnd = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs.at(-1);

export function tradeoffSource(p) {
  const R = reasoningSource(p);
  let findings = [];
  try { findings = decisionFindings(p); } catch { findings = []; }
  return tradeoffModel(R, {findings, name: p?.name || ''});
}

export function tradeoffModel(R, {findings = [], name = ''} = {}) {
  const pr = Object.fromEntries(R.drivers.map(d => [d.id, d.priority]));
  const decisions = R.decisions.map(d => {
    const sel = chosen(d), drivers = list(d.driverIds).filter(id => R.driver(id));
    const alts = list(d.alternatives).map(a => ({
      a, id: a.id, decision: d.id, chosen: sel?.id === a.id,
      effects: Object.fromEntries(drivers.map(id => [id, a.assessments?.[id] || {effect: 'unknown', reason: '', evidence: ''}])),
      patterns: patternKnowledge([a.pattern]), anti: patternKnowledge([a.antiPattern], 'anti'),
      responsibilities: list(a.responsibilityIds).map(r => R.resp.get(r)).filter(Boolean),
      style: STYLES.find(s => a.strategy === 'style:' + s.id || a.pattern === s.name) || null
    }));
    const tally = decisionTally(d, pr);
    return {d, id: d.id, question: d.question, alts, drivers, tally, favoured: tally.favoured, selected: sel?.id || null, status: d.status || 'draft', statusLabel: statusLabel(d), style: d.topic === 'style'};
  });
  const D = new Map(decisions.map(x => [x.id, x]));
  const A = new Map(decisions.flatMap(x => x.alts.map(a => [a.id, a])));
  const order = d => (PRIORITIES.indexOf(d.priority) + 1 || 9) * 1000 + (Number(d.rank) || 999);
  const weighed = new Set(decisions.flatMap(x => x.drivers));
  const drivers = R.drivers.filter(d => weighed.has(d.id)).sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : 1));
  const allDrivers = [...R.drivers].sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : 1));
  // Sensitivity: a one-step change of a driver's priority that changes which alternative is favoured.
  const sens = new Map();
  for (const d of R.drivers) {
    const i = PRIORITIES.indexOf(d.priority), out = [];
    for (const to of [PRIORITIES[i - 1], PRIORITIES[i + 1]].filter(Boolean)) for (const x of decisions.filter(x => x.drivers.includes(d.id))) {
      const b = decisionTally(x.d, {...pr, [d.id]: to});
      if (b.favoured !== x.favoured) out.push({decision: x.id, to, before: x.favoured, after: b.favoured});
    }
    if (out.length) sens.set(d.id, out);
  }
  const styleDecision = decisions.find(x => x.style) || null;
  const styleRows = STYLES.map(s => ({style: s, marks: styleMarks(R, s, allDrivers.map(d => d.id))}));
  return {R, name, decisions, D, A, drivers, allDrivers, pr, sens, styleDecision, styleRows, findings};
}

// ---------------------------------------------------------------- slicing

export function tradeoffScope(TM, scope = {}) {
  const k = scope?.kind, id = scope?.id;
  if (k === 'decision' && TM.D.has(id)) return {kind: 'decision', id};
  if (k === 'driver' && TM.drivers.some(d => d.id === id)) return {kind: 'driver', id};
  if (k === 'x') {
    if (TM.D.has(id)) return {kind: 'decision', id};
    if (TM.A.has(id)) return {kind: 'decision', id: TM.A.get(id).decision, focus: id};
    if (TM.drivers.some(d => d.id === id)) return {kind: 'driver', id};
  }
  return {kind: 'system'};
}
export function defaultDepth(TM) { return TM.A.size > 36 ? 'decisions' : 'alternatives'; }

// Style alternatives the playbook offers that the style decision does not hold yet.
export function styleSuggestions(TM) {
  const x = TM.styleDecision;
  if (!x) return [];
  return STYLES.filter(s => !x.alts.some(a => a.style?.id === s.id)).map(s => ({id: 'SUG:' + s.id, style: s, decision: x.id, record: styleAlternative(TM.R, s, x.drivers)}));
}
export function styleDecisionPreset(TM) { return {...STYLE_DECISION, driverIds: TM.allDrivers.map(d => d.id), requirementIds: []}; }

// What the map draws: drivers, decisions and their alternatives, with an unsaved alternative, the
// playbook's style suggestions and — when no style is recorded — the style decision as a proposal.
export function foldMap(TM, scope = {kind: 'system'}, depth = 'alternatives', {proposal = null, proposalFor = null} = {}) {
  const sc = tradeoffScope(TM, scope), folded = depth === 'decisions' && sc.kind !== 'decision';
  let ds = TM.decisions;
  if (sc.kind === 'decision') ds = ds.filter(x => x.id === sc.id);
  if (sc.kind === 'driver') ds = ds.filter(x => x.drivers.includes(sc.id));
  const blocks = ds.map(x => {
    const alts = folded ? [] : x.alts.map(a => ({id: a.id, kind: 'alt'}));
    if (!folded && proposal && proposalFor === x.id && !proposal.existingId) alts.push({id: PROPOSED_ALT, kind: 'proposed', title: proposal.record?.title || 'Proposed alternative'});
    if (!folded && x.style) for (const s of styleSuggestions(TM)) alts.push({id: s.id, kind: 'suggested', style: s.style.id});
    return {id: x.id, kind: 'decision', alts, folded, edited: proposal && proposalFor === x.id && proposal.existingId ? proposal.existingId : null};
  });
  if (sc.kind === 'system' && !TM.styleDecision) blocks.push({id: STYLE_PROPOSAL, kind: 'style-proposal', alts: [], folded: true});
  const driverIds = sc.kind === 'driver' ? [sc.id] : uniq(ds.flatMap(x => x.drivers));
  const drivers = TM.drivers.filter(d => driverIds.includes(d.id)).map(d => d.id);
  const links = [];
  for (const b of blocks) for (const id of TM.D.get(b.id)?.drivers || []) if (drivers.includes(id)) links.push({from: id, to: b.id});
  return {scope: sc, depth: folded ? 'decisions' : 'alternatives', drivers, blocks, links};
}

// The trade-off matrix: drivers down, alternatives across (grouped by decision), and the playbook's
// style table as a group of its own while no style decision is recorded.
export function foldMatrix(TM, scope = {kind: 'system'}) {
  const sc = tradeoffScope(TM, scope);
  let ds = TM.decisions;
  if (sc.kind === 'decision') ds = ds.filter(x => x.id === sc.id);
  if (sc.kind === 'driver') ds = ds.filter(x => x.drivers.includes(sc.id));
  const groups = ds.map(x => ({id: x.id, kind: 'decision', cols: x.alts.map(a => a.id)}));
  const withStyles = sc.kind === 'system' && !TM.styleDecision;
  if (withStyles) groups.push({id: STYLE_PROPOSAL, kind: 'styles', cols: STYLES.map(s => 'STY:' + s.id)});
  const rows = (sc.kind === 'driver' ? TM.drivers.filter(d => d.id === sc.id) : withStyles ? TM.allDrivers : TM.drivers.filter(d => ds.some(x => x.drivers.includes(d.id)))).map(d => d.id);
  return {scope: sc, groups, rows};
}

// ---------------------------------------------------------------- reading

const EFF = {supports: 'supports', tension: 'creates tension with', neutral: 'has little effect on', unknown: 'has no judged effect on'};
export function tallyText(TM, x, id) {
  const r = x.tally.rows.find(r => r.alt.id === id);
  if (!r) return '';
  return r.parts.map(p => `${p.driverId} ${p.effect === 'supports' ? '+' : p.effect === 'tension' ? '−' : '0'}${p.effect === 'supports' || p.effect === 'tension' ? '×' + p.weight : ''}`).join(' ') + ` = ${r.score > 0 ? '+' : ''}${r.score}`;
}
export function describeDecision(TM, id) {
  const x = TM.D.get(id);
  if (!x) return '';
  const fav = x.favoured ? TM.A.get(x.favoured).a.title : null;
  const sel = x.selected ? TM.A.get(x.selected).a.title : null;
  return `${x.id} ${x.question} ${plural(x.alts.length, 'alternative', 'alternatives')} weighed on ${joinAnd(x.drivers)}.${fav ? ` As the drivers weigh it, ${fav} is favoured.` : x.tally.tied.length ? ' The drivers weigh the alternatives equally.' : ''}${sel ? ` The working choice is ${sel}.` : ' No working choice yet.'}`;
}
export function describeAlternative(TM, id) {
  const a = TM.A.get(id);
  if (!a) return '';
  const x = TM.D.get(a.decision);
  const by = {};
  for (const d of x.drivers) (by[a.effects[d].effect] ??= []).push(d);
  const eff = ['supports', 'tension', 'neutral', 'unknown'].filter(k => by[k]).map(k => `${EFF[k]} ${joinAnd(by[k])}`).join('; it ');
  return `${a.a.title} (${a.id}, ${x.id})${a.a.pattern ? ' — ' + a.a.pattern : ''}. It ${eff}.${a.chosen ? ' The working choice.' : ''}${a.a.antiPattern ? ' Avoid: ' + a.a.antiPattern : ''}`;
}
export function mapWalk(TM) { return TM.decisions.map(x => x.id); }

// Observations drawn only from recorded facts and the playbook, as prompts for review.
export function tradeoffInsights(TM, scope = {kind: 'system'}) {
  const out = [], sc = tradeoffScope(TM, scope), sys = sc.kind === 'system';
  const ds = TM.decisions.filter(x => sys || (sc.kind === 'decision' ? x.id === sc.id : x.drivers.includes(sc.id)));
  const crit = new Set(TM.R.drivers.filter(d => d.priority === 'Critical').map(d => d.id));
  const mismatch = ds.filter(x => x.selected && x.favoured && x.selected !== x.favoured);
  for (const x of mismatch) out.push({kind: 'risk', id: x.id, text: `${x.id}: the drivers, as weighted, favour ${TM.A.get(x.favoured).a.title}, but the working choice is ${TM.A.get(x.selected).a.title}.`, ask: 'What does the working choice give that the drivers do not show?'});
  for (const x of ds.filter(x => x.selected)) { const a = TM.A.get(x.selected), hurt = x.drivers.filter(d => crit.has(d) && a.effects[d].effect === 'tension'); if (hurt.length) out.push({kind: 'risk', id: a.id, text: `${x.id}'s working choice, ${a.a.title}, is in tension with Critical ${joinAnd(hurt)}.`, ask: 'Which tactic keeps the Critical driver whole?'}); }
  for (const x of ds.filter(x => x.selected)) { const a = TM.A.get(x.selected); if (a.anti.records.length) out.push({kind: 'risk', id: a.id, text: `${a.a.title} is chosen; its own failure boundary is ${joinAnd(a.anti.records.map(r => r.name))} in the pattern catalogue. The design must show how it is avoided.`, ask: 'Where is that boundary enforced?'}); }
  const open = ds.filter(x => !x.selected);
  if (open.length) out.push({kind: 'gap', id: open[0].id, text: `${plural(open.length, 'decision has', 'decisions have')} no working choice: ${open.map(x => x.id).join(', ')}.${open.some(x => x.favoured) ? ' The drivers already favour ' + open.filter(x => x.favoured).map(x => `${TM.A.get(x.favoured).a.title} (${x.id})`).join(', ') + '.' : ''}`, ask: 'Do you agree with what the drivers favour?'});
  const blind = [];
  for (const x of ds) for (const a of x.alts) { const u = x.drivers.filter(d => crit.has(d) && a.effects[d].effect === 'unknown'); if (u.length) blind.push(`${a.id} on ${joinAnd(u)}`); }
  if (blind.length) out.push({kind: 'gap', id: null, text: `${plural(blind.length, 'alternative has', 'alternatives have')} no judged effect on a Critical driver: ${blind.slice(0, 4).join('; ')}${blind.length > 4 ? '…' : ''}.`, ask: 'What evidence would settle it?'});
  for (const [id, xs] of TM.sens) for (const s of xs) if (ds.some(x => x.id === s.decision)) {
    out.push({kind: 'info', id: s.decision, text: `${s.decision} turns on ${id}'s priority: at ${s.to}, ${s.after ? TM.A.get(s.after).a.title + ' would be favoured' : 'no alternative would be favoured'} instead of ${s.before ? TM.A.get(s.before).a.title : 'a tie'}. ${id} is a sensitivity point.`, ask: `Is ${TM.R.driver(id).priority} the right priority for ${id}?`});
  }
  if (sys && !TM.styleDecision) {
    const covered = TM.styleRows.filter(r => r.marks.some(m => m.mark)).map(r => r.style.name + ' (' + r.marks.filter(m => m.mark).map(m => attribute(m.attr).name.toLowerCase() + (m.mark === '(x)' ? ', conditional' : '')).join('; ') + ')');
    out.push({kind: 'gap', id: STYLE_PROPOSAL, text: `No decision records the architecture style. The SA Playbook compares ${STYLES.length} styles; on this design's own drivers its table speaks only for ${covered.length ? covered.join(', ') : 'none of them'}.`, ask: 'Which style structures this design, and which qualities does that choice rest on?', proposal: 'style'});
  }
  const drafts = ds.filter(x => x.status === 'draft');
  if (drafts.length && drafts.length === ds.length) out.push({kind: 'info', id: null, text: `All ${plural(ds.length, 'decision is', 'decisions are')} working drafts; none is recorded or accepted.`});
  return out;
}

export {PRIORITY_WEIGHT, EFFECT_SCORE, styleAlternative};
