// Chapter 3 Model — pure model of the decisions: what each weighs, its alternatives and their
// patterns and anti-patterns (linked to the SA Playbook and the pattern catalogue), how each
// alternative affects each driver, and each decision's reading (round 25, decision-reading.js): which
// alternatives a hard constraint rules out, which are dominated, which leads on the drivers as weighted by
// their priority, how firmly, and where a priority change would change that (a sensitivity point).
// Architecture style is read as a decision too: recorded if the project has one, otherwise offered from
// the playbook. Deterministic; reads, never writes.
import {STYLES, attribute} from './playbook-knowledge.js';
import {reasoningSource, patternKnowledge, styleMarks, styleAlternative, STYLE_DECISION} from './design-reasoning.js';
import {readDecision, readingLines, signed} from './decision-reading.js';
// Suggested effects (round 25, D-25-08) are shown beside the reading, labelled, and never counted: the reading above
// weighs recorded effects only, and a person records a suggestion through the comparison editor (decision.alternative).
import {suggestEffects} from './decision-suggestions.js';
import {decisionFindings, chosen, statusLabel} from './decisions-domain.js';
import {DRIVER_PRIORITIES} from './quality-domain.js';
import {list, uniq, joinAnd, plural, fewNames, recordsOf} from './util.js';
// Round 24 (D-24-08): under a module scope the model reads the scope's projection; its checks are the saved document's
// (module-lens.js), kept to the records the projection holds.
import {baseOf, scopeFindings} from './module-lens.js';

export const STYLE_PROPOSAL = 'ADR:style';
export const PROPOSED_ALT = 'ALT:proposed';
// High, Medium, Low (round 12, D-02): the reasoning source reads every driver's priority so.
export const PRIORITIES = DRIVER_PRIORITIES;

export function tradeoffSource(p) {
  const R = reasoningSource(p);
  let findings = [];
  try { findings = scopeFindings(p, decisionFindings(baseOf(p))); } catch { findings = []; }
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
    // tally: the reading's rows, ties and lead, the arithmetic the map and the matrix print; lead: the alternative that
    // leads on the drivers (its round-24 name, favoured, is retired: the SDD reads the reading itself).
    const reading = readDecision(R.p, d);
    return {d, id: d.id, question: d.question, alts, drivers, reading, tally: reading, lead: reading.lead, selected: sel?.id || null, status: d.status || 'draft', statusLabel: statusLabel(d), style: d.topic === 'style'};
  });
  const D = new Map(decisions.map(x => [x.id, x]));
  const A = new Map(decisions.flatMap(x => x.alts.map(a => [a.id, a])));
  const order = d => (PRIORITIES.indexOf(d.priority) + 1 || 9) * 1000 + (Number(d.rank) || 999);
  const weighed = new Set(decisions.flatMap(x => x.drivers));
  const drivers = R.drivers.filter(d => weighed.has(d.id)).sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : 1));
  const allDrivers = [...R.drivers].sort((a, b) => order(a) - order(b) || (a.id < b.id ? -1 : 1));
  // Sensitivity: a one-step change of a driver's priority that changes which alternative leads, from each reading.
  const sens = new Map();
  for (const d of R.drivers) {
    const i = PRIORITIES.indexOf(d.priority), out = [];
    if (i < 0) continue;
    for (const to of [PRIORITIES[i - 1], PRIORITIES[i + 1]].filter(Boolean)) for (const x of decisions) for (const s of x.reading.sensitivity) if (s.driverId === d.id && s.to === to) out.push({decision: x.id, to, before: s.before, after: s.after});
    if (out.length) sens.set(d.id, out);
  }
  const styleDecision = decisions.find(x => x.style) || null;
  const styleRows = STYLES.map(s => ({style: s, marks: styleMarks(R, s, allDrivers.map(d => d.id))}));
  // A decision's suggested effects, worked out when a screen first asks for them (the matrix, the companion), once per
  // model: the model is rebuilt from each saved document, so they never outlive the facts they were read from.
  const sug = new Map(), suggestions = id => { if (!sug.has(id)) sug.set(id, D.has(id) ? suggestEffects(R.p, D.get(id).d) : null); return sug.get(id); };
  return {R, name, decisions, D, A, drivers, allDrivers, pr, sens, styleDecision, styleRows, findings, suggestions};
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

const EFF = {supports: 'supports', tension: 'creates tension with', violates: 'breaks', neutral: 'has little effect on', unknown: 'has no judged effect on'};
// "Breaks it" counts as tension in the arithmetic (against a hard constraint it also rules the alternative out).
const SIGN = {supports: '+', tension: '−', violates: '−'};
export function tallyText(TM, x, id) {
  const r = x.tally.rows.find(r => r.alt.id === id);
  if (!r) return '';
  return r.parts.map(p => `${p.driverId} ${SIGN[p.effect] || '0'}${SIGN[p.effect] ? '×' + p.weight : ''}`).join(' ') + ` = ${r.score > 0 ? '+' : ''}${r.score}`;
}
// ---------------------------------------------------------------- the decision reading on the screens (round 25)

const FIRM = {1: 'holds for any weights the priorities allow', 2: 'holds if same-priority drivers count alike', 3: 'holds only at the default weights'};
// Where an alternative stands in its decision's reading, in short words for the map, the matrix and the review desk:
// ruled out by a hard constraint, dominated, the lead and how firmly it holds, tied, or its rank among the alternatives
// the hard constraints leave in. Labels of the reading's own facts, never a proposal: the working choice is a person's.
// alt and driver name the records (as readingLines' do). label is the standing, detail what qualifies it, line both;
// foot is the matrix's short word; bounds the range the unstated effects could move the total to.
export function readingStanding(r, id, {alt = x => x, driver = x => x} = {}) {
  const row = r?.rows.find(x => x.id === id);
  if (!row) return null;
  const of = r.rows.filter(x => !x.out).length, dom = row.dominated;
  const kind = row.out ? 'out' : dom ? 'dominated' : r.lead === id ? 'lead' : r.tied.includes(id) ? 'tied' : r.state === 'single' ? 'single' : 'below';
  const label = {out: 'Ruled out', dominated: dom && `Dominated by ${alt(dom.by)}${dom.robust ? '' : ' as the effects stand'}`, lead: r.only ? '★ The only one that meets the hard constraints' : '★ Leads on the drivers', tied: kind === 'tied' && `Tied on the drivers with ${joinAnd(r.tied.filter(x => x !== id).map(alt))}`, below: `Ranks ${row.rank} of ${of} on the drivers`}[kind] || '';
  const detail = [kind === 'out' ? 'breaks ' + joinAnd(row.breaks.map(driver)) : '', kind === 'lead' && r.firmness ? FIRM[r.firmness.level] : '', kind === 'lead' && r.unknowns?.couldChange ? 'unstated effects could change it' : '',
    row.unshown.length && !row.out ? 'not shown to meet ' + joinAnd(row.unshown.map(driver)) : ''].filter(Boolean).join(' · ');
  return {kind, row, label, detail, line: [label, detail].filter(Boolean).join(' · '), foot: {out: 'ruled out', dominated: 'dominated', lead: '★ leads', tied: 'tied', below: `ranks ${row.rank} of ${of}`}[kind] || '',
    total: signed(row.score), bounds: row.low === row.high ? '' : `between ${signed(row.low)} and ${signed(row.high)}`};
}
// The reading's sentences for a decision (decision-reading.js readingLines), its alternatives named by title.
export function readingWords(TM, id) {
  const x = TM.D.get(id);
  return x ? readingLines(x.reading, {alt: a => TM.A.get(a)?.a.title || a}) : [];
}
// The weighed total intentionally keeps unknown effects neutral. Report how much
// judgment and evidence sits behind that arithmetic so a lean cannot imply certainty.
export function alternativeCoverage(x, id) {
  const a = x.alts.find(row => row.id === id);
  const effects = a ? x.drivers.map(d => a.effects[d] || {effect: 'unknown'}) : [];
  return {total: effects.length, judged: effects.filter(e => e.effect !== 'unknown').length, reasoned: effects.filter(e => !!String(e.reason || '').trim()).length, evidenced: effects.filter(e => !!String(e.evidence || '').trim()).length};
}
export function describeDecision(TM, id) {
  const x = TM.D.get(id);
  if (!x) return '';
  const fav = x.lead ? TM.A.get(x.lead).a.title : null, r = x.reading, out = r.ruledOut.length;
  const sel = x.selected ? TM.A.get(x.selected).a.title : null;
  return `${x.id} ${x.question} ${plural(x.alts.length, 'alternative', 'alternatives')} weighed on ${joinAnd(x.drivers)}.${r.only ? ` ${fav} is the only one that meets the hard constraints.` : fav ? ` ${fav} leads on the drivers.` : x.tally.tied.length ? ' The alternatives tie on the drivers.' : r.state === 'out' ? ' Every alternative breaks a hard constraint.' : ''}${out && !r.only && r.state !== 'out' ? ` ${plural(out, 'alternative is', 'alternatives are')} ruled out by a hard constraint.` : ''}${sel ? ` The working choice is ${sel}.` : ' No working choice yet.'}`;
}
export function describeAlternative(TM, id) {
  const a = TM.A.get(id);
  if (!a) return '';
  const x = TM.D.get(a.decision);
  const by = {};
  for (const d of x.drivers) (by[a.effects[d].effect] ??= []).push(d);
  const eff = ['supports', 'tension', 'violates', 'neutral', 'unknown'].filter(k => by[k]).map(k => `${EFF[k]} ${joinAnd(by[k])}`).join('; it ');
  return `${a.a.title} (${a.id}, ${x.id})${a.a.pattern ? ' — ' + a.a.pattern : ''}. It ${eff}.${a.chosen ? ' The working choice.' : ''}${a.a.antiPattern ? ' Avoid: ' + a.a.antiPattern : ''}`;
}
export function mapWalk(TM) { return TM.decisions.map(x => x.id); }

// Observations drawn only from recorded facts and the playbook, as prompts for review.
export function tradeoffInsights(TM, scope = {kind: 'system'}) {
  const out = [], sc = tradeoffScope(TM, scope), sys = sc.kind === 'system';
  // Five names and a count (round 12, G, GR-UX-04, Chapter 1's rule); the whole list rides with the observation as
  // `records`, which the companion's "Show all" lists.
  const and = xs => fewNames(xs, {and: true});
  const ds = TM.decisions.filter(x => sys || (sc.kind === 'decision' ? x.id === sc.id : x.drivers.includes(sc.id)));
  const crit = new Set(TM.R.drivers.filter(d => d.priority === 'High').map(d => d.id));
  const mismatch = ds.filter(x => x.selected && x.lead && x.selected !== x.lead);
  for (const x of mismatch) out.push({kind: 'risk', id: x.id, text: `${x.id}: ${TM.A.get(x.lead).a.title} leads on the drivers as weighted, but the working choice is ${TM.A.get(x.selected).a.title}.`, ask: 'What does the working choice give that the drivers do not show?'});
  // Round 25 (D-25-03, D-25-04): a working choice a hard constraint rules out, or that another alternative dominates.
  for (const x of ds.filter(x => x.reading.choice?.standing === 'ruled-out')) out.push({kind: 'risk', id: x.id, text: `${x.id}'s working choice, ${TM.A.get(x.selected).a.title}, breaks ${and(x.reading.choice.breaks.map(id => TM.R.driver(id)?.code || id))}, a hard constraint.`, ask: 'Which alternative meets it, or should the constraint change?'});
  for (const x of ds.filter(x => x.reading.choice?.standing === 'dominated')) out.push({kind: 'risk', id: x.id, text: `${x.id}'s working choice, ${TM.A.get(x.selected).a.title}, is dominated by ${TM.A.get(x.reading.choice.dominatedBy).a.title}, which is at least as good on every driver it names and better on one.`, ask: 'What does it give that the drivers do not show?'});
  // A lead that holds only for some of the weightings the priorities allow (D-25-05).
  for (const x of ds.filter(x => x.reading.firmness && x.reading.firmness.level > 1 && x.reading.state === 'read')) { const f = x.reading.firmness; out.push({kind: 'info', id: x.id, text: `${x.id}: ${TM.A.get(x.lead).a.title} leads ${f.level === 2 ? 'if drivers of the same priority count alike' : 'only at the default weights'}; ${TM.A.get(f.against).a.title} would come ahead if only ${and(f.swing.weighing.map(id => TM.R.driver(id)?.code || id))} counted.`, ask: 'How do those drivers weigh against each other?'}); }
  // Breaking a soft constraint counts as tension (a hard one is the ruled-out risk above).
  for (const x of ds.filter(x => x.selected)) { const a = TM.A.get(x.selected), hurt = x.drivers.filter(d => crit.has(d) && (a.effects[d].effect === 'tension' || (a.effects[d].effect === 'violates' && !x.reading.hard.includes(d)))); if (hurt.length) out.push({kind: 'risk', id: a.id, text: `${x.id}'s working choice, ${a.a.title}, is in tension with high-priority ${and(hurt)}.`, ask: 'Which tactic keeps the high-priority driver whole?'}); }
  for (const x of ds.filter(x => x.selected)) { const a = TM.A.get(x.selected); if (a.anti.records.length) out.push({kind: 'risk', id: a.id, text: `${a.a.title} is chosen; its own failure boundary is ${joinAnd(a.anti.records.map(r => r.name))} in the pattern catalogue. The design must show how it is avoided.`, ask: 'Where is that boundary enforced?'}); }
  const open = ds.filter(x => !x.selected);
  if (open.length) out.push({kind: 'gap', id: open[0].id, text: `${plural(open.length, 'decision has', 'decisions have')} no working choice: ${fewNames(open, {name: x => x.id})}.${open.some(x => x.lead) ? ' The drivers lean to ' + fewNames(open.filter(x => x.lead), {max: 2, name: x => `${TM.A.get(x.lead).a.title} (${x.id})`}) + '.' : ''}`, records: recordsOf(open, x => x.id, x => x.id + ' ' + (x.question || '')), ask: 'Do you agree with where the drivers lean? The choice is yours.'});
  const blind = [];
  for (const x of ds) for (const a of x.alts) { const u = x.drivers.filter(d => crit.has(d) && a.effects[d].effect === 'unknown'); if (u.length) blind.push(`${a.id} on ${fewNames(u, {max: 2, and: true})}`); }
  if (blind.length) out.push({kind: 'gap', id: null, text: `${plural(blind.length, 'alternative has', 'alternatives have')} no judged effect on a high-priority driver: ${fewNames(blind, {max: 4, sep: '; '})}.`, ask: 'What evidence would settle it?'});
  // A driver nobody gave a priority weighs nothing (round 12, DM-07): the reading says which ones are left out.
  const unweighed = uniq(ds.flatMap(x => x.drivers)).filter(id => TM.R.driver(id) && !TM.R.driver(id).priority);
  if (unweighed.length) out.push({kind: 'gap', id: unweighed[0], text: `${and(unweighed.map(id => TM.R.driver(id).code || id))} ${unweighed.length === 1 ? 'has' : 'have'} no stated priority, so the weights leave ${unweighed.length === 1 ? 'it' : 'them'} out.`, ask: 'Which priority does the business give it?'});
  for (const [id, xs] of TM.sens) for (const s of xs) if (ds.some(x => x.id === s.decision)) {
    out.push({kind: 'info', id: s.decision, text: `${s.decision} turns on ${id}'s priority: at ${s.to}, ${s.after ? TM.A.get(s.after).a.title + ' would lead' : 'no alternative would lead'} instead of ${s.before ? TM.A.get(s.before).a.title : 'a tie'}. ${id} is a sensitivity point.`, ask: `Is ${TM.R.driver(id).priority} the right priority for ${id}?`});
  }
  if (sys && !TM.styleDecision) {
    // Each style by its one quality, or by how many it speaks for (round 12, G, GR-UX-04): the style table names them all.
    const covered = TM.styleRows.filter(r => r.marks.some(m => m.mark)).map(r => { const ms = r.marks.filter(m => m.mark); return r.style.name + ' (' + (ms.length === 1 ? attribute(ms[0].attr).name.toLowerCase() + (ms[0].mark === '(x)' ? ', conditional' : '') : ms.length + ' qualities') + ')'; });
    out.push({kind: 'gap', id: STYLE_PROPOSAL, text: `No decision records the architecture style. The SA Playbook compares ${STYLES.length} styles; on this design's own drivers its table speaks only for ${covered.length ? covered.join(', ') : 'none of them'}.`, ask: 'Which style structures this design, and which qualities does that choice rest on?', proposal: 'style'});
  }
  const drafts = ds.filter(x => x.status === 'draft');
  if (drafts.length && drafts.length === ds.length) out.push({kind: 'info', id: null, text: `All ${plural(ds.length, 'decision is', 'decisions are')} working drafts; none is recorded or accepted.`});
  return out;
}
