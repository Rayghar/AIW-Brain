// Requirements — the semantic model behind the Chapter 1 Model views.
//
// The journey is the backbone of the requirements: each journey step needs requirements, each
// requirement delivers business outcomes, people take part in the steps and stakeholders own the
// outcomes, and scope boundaries, constraints and assumptions limit what the design may do. One
// layer down, Chapter 4's responsibilities cover the requirements. Pure: storyModel reads plain
// records, and storySource adapts a project without ever writing to it.
import {findings as requirementFindings, proposals as requirementProposals} from './requirements-domain.js';
import {isBlankProject} from './model-scope.js';

export const STORY_SCHEMA = 'aiw.story/1';
export const PRIORITIES = ['Must', 'Should', 'Could'];
export const OFF = 'S:off', PROPOSED = 'PROPOSED';
const list = v => (Array.isArray(v) ? v : []);
const text = (v, n = 200) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const uniq = a => [...new Set(a)];
const pad = n => String(n).padStart(2, '0');
const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);

// ---------------------------------------------------------------- adapter

export function storySource(p) {
  let findings = [], proposals = [];
  try { findings = requirementFindings(p); } catch { findings = []; }
  try { proposals = requirementProposals(p, null, 'model'); } catch { proposals = []; }
  const responsibilities = list(p?.logical?.responsibilities).map(r => ({id: r.id, ref: r.ref || r.id, title: text(r.title, 120), requirementIds: list(r.requirementIds)}));
  const drivers = list(p?.quality?.drivers).map(d => ({id: d.id, title: text(d.title, 120), requirementIds: list(d.requirementIds)}));
  return storyModel({name: p?.name || '', brief: p?.brief || {}, blank: isBlankProject(p || {}), artefacts: list(p?.artefacts), relationships: list(p?.relationships), findings, proposals: proposals.map(q => ({id: q.id, label: q.label, reason: text(q.reason, 300), mode: q.mode, target: q.target || null, record: q.record || {}, links: list(q.links)})), responsibilities, drivers});
}

// ---------------------------------------------------------------- model

export function storyModel(src = {}) {
  const A = new Map(list(src.artefacts).map(a => [a.id, {id: a.id, type: a.type, title: text(a.title, 160) || a.id, description: text(a.description, 400), owner: text(a.owner, 100), source: text(a.source, 200), priority: PRIORITIES.includes(a.priority) ? a.priority : 'Must', acceptance: text(a.acceptance, 500), confirmed: !!a.confirmed, origin: a.origin || 'user', scopeMode: a.scopeMode === 'out' ? 'out' : 'in', order: Number(a.order) || 0, domain: a.domain || '', links: []}]));
  const rels = list(src.relationships).filter(r => A.has(r.from) && A.has(r.to) && r.from !== r.to);
  for (const r of rels) { A.get(r.from).links.push({id: r.id, kind: r.kind, other: r.to, out: true}); A.get(r.to).links.push({id: r.id, kind: r.kind, other: r.from, out: false}); }
  const of = t => [...A.values()].filter(a => a.type === t).sort((x, y) => (x.id < y.id ? -1 : 1));
  const near = (a, t) => uniq(a.links.map(l => l.other).filter(id => A.get(id).type === t));
  const codes = new Map();
  for (const f of list(src.findings)) { const id = f.artefactId; if (!codes.has(id)) codes.set(id, []); codes.get(id).push(f.code); }
  const steps = of('journey').sort((x, y) => x.order - y.order || (x.id < y.id ? -1 : 1)).map((s, i) => ({...s, index: i, num: pad(i + 1), actors: [], reqs: [], scope: near(s, 'scope')}));
  const stepIx = new Map(steps.map(s => [s.id, s.index]));
  steps.forEach((s, i) => { s.next = steps[i + 1]?.id || null; s.linkedNext = !!s.next && rels.some(r => r.kind === 'precedes' && r.from === s.id && r.to === s.next); });
  const cover = new Map(), drive = new Map();
  for (const r of list(src.responsibilities)) for (const q of r.requirementIds) { if (!cover.has(q)) cover.set(q, []); cover.get(q).push({id: r.id, ref: r.ref, title: r.title}); }
  for (const d of list(src.drivers)) for (const q of d.requirementIds) { if (!drive.has(q)) drive.set(q, []); drive.get(q).push(d.id); }
  const R = new Map(of('requirement').map(q => {
    const c = codes.get(q.id) || [];
    const st = near(q, 'journey').sort((x, y) => stepIx.get(x) - stepIx.get(y));
    return [q.id, {...q, steps: st, stage: st.length ? stepIx.get(st[0]) : steps.length, offJourney: !st.length, outcomes: near(q, 'outcome'), constraints: near(q, 'constraint'), assumptions: near(q, 'assumption'), scope: near(q, 'scope'), findings: c, testable: !c.includes('acceptance'), ambiguous: c.includes('ambiguity'), accountable: !c.includes('accountability'), covers: cover.get(q.id) || [], drivers: drive.get(q.id) || []}];
  }));
  for (const q of R.values()) for (const s of q.steps) steps[stepIx.get(s)].reqs.push(q.id);
  const actors = new Map(of('actor').map(a => [a.id, {...a, steps: near(a, 'journey').sort((x, y) => stepIx.get(x) - stepIx.get(y))}]));
  for (const a of actors.values()) for (const s of a.steps) steps[stepIx.get(s)].actors.push(a.id);
  const stakeholders = new Map(of('stakeholder').map(s => [s.id, {...s, outcomes: near(s, 'outcome')}]));
  const outcomes = new Map(of('outcome').map(o => [o.id, {...o, reqs: near(o, 'requirement'), owners: near(o, 'stakeholder')}]));
  const limits = new Map([...of('scope'), ...of('constraint'), ...of('assumption')].map(x => [x.id, {...x, reqs: near(x, 'requirement'), steps: near(x, 'journey'), others: uniq(x.links.map(l => l.other).filter(id => !['requirement', 'journey'].includes(A.get(id).type)))}]));
  for (const s of steps) s.hole = !s.reqs.length;
  const bands = PRIORITIES.filter(p => [...R.values()].some(q => q.priority === p) || (p === 'Must' && steps.some(s => s.hole)));
  return {name: src.name || '', brief: src.brief || {}, blank: !!src.blank, A, rels, steps, R, actors, stakeholders, outcomes, limits, bands, findings: list(src.findings), proposals: list(src.proposals)};
}

export const colOf = (SM, q) => (q.offJourney ? OFF : 'S:' + q.stage);
export function colInfo(SM, id) {
  if (id === OFF) return {id, kind: 'off', title: 'Not on the journey', sub: 'requirements no step needs', num: '—'};
  const s = SM.steps[Number(String(id).slice(2))];
  return s ? {id, kind: 'step', step: s.id, title: s.title, num: s.num, ref: s.id, sub: s.hole ? 'no requirement yet' : plural(s.reqs.length, 'requirement', 'requirements'), hole: s.hole, actors: s.actors, linkedNext: s.linkedNext, next: s.next} : {id, kind: 'step', title: id, num: '', sub: ''};
}

// ---------------------------------------------------------------- slicing

export function storyScope(SM, scope) {
  if (!scope || scope.kind === 'system' || !scope.id) return {kind: 'system'};
  if (SM.steps.some(s => s.id === scope.id)) return {kind: 'step', id: scope.id, ...(scope.focus && SM.R.has(scope.focus) ? {focus: scope.focus} : {})};
  if (SM.actors.has(scope.id)) return {kind: 'actor', id: scope.id};
  if (SM.outcomes.has(scope.id)) return {kind: 'outcome', id: scope.id};
  if (SM.R.has(scope.id)) { const q = SM.R.get(scope.id); return q.steps.length ? {kind: 'step', id: q.steps[0], focus: q.id} : {kind: 'system', focus: q.id}; }
  return {kind: 'system'};
}
export function defaultDepth(SM) { return SM.R.size > 60 ? 'steps' : 'requirements'; }
const inScope = (SM, sc) => q => sc.kind === 'system' || (sc.kind === 'step' ? q.steps.includes(sc.id) : sc.kind === 'actor' ? q.steps.some(s => SM.actors.get(sc.id).steps.includes(s)) : q.outcomes.includes(sc.id));

// The journey map: the steps across, the priority slices down, each requirement under the first
// step (in view) that needs it; folded, each slice of each step is one card.
export function foldStory(SM, scope = {kind: 'system'}, depth = 'requirements', {ghost = null} = {}) {
  const sc = storyScope(SM, scope), keep = inScope(SM, sc);
  const qs = [...SM.R.values()].filter(keep);
  let stepIds;
  if (sc.kind === 'system') stepIds = SM.steps.map(s => s.id);
  else if (sc.kind === 'step') stepIds = [sc.id];
  else if (sc.kind === 'actor') stepIds = SM.actors.get(sc.id).steps.slice();
  else stepIds = uniq(qs.flatMap(q => q.steps)).sort((a, b) => SM.steps.findIndex(s => s.id === a) - SM.steps.findIndex(s => s.id === b));
  const shown = new Set(stepIds);
  const colFor = q => { const s = q.steps.find(x => shown.has(x)); return s ? 'S:' + SM.steps.find(x => x.id === s).index : OFF; };
  const cards = [], folded = depth === 'steps';
  const add = (c, band, q) => { const id = 'C:' + band + '|' + c; let k = cards.find(x => x.id === id); if (!k) { k = {id, kind: 'cell', col: c, band, members: []}; cards.push(k); } k.members.push(q.id); };
  for (const q of qs) { const c = colFor(q); if (folded) add(c, q.priority, q); else cards.push({id: q.id, kind: 'req', col: c, band: q.priority, members: [q.id], subject: sc.focus === q.id}); }
  if (sc.kind === 'system' || sc.kind === 'step') for (const id of stepIds) { const s = SM.steps.find(x => x.id === id); if (s.hole) cards.push({id: 'HOLE:' + s.id, kind: 'hole', col: 'S:' + s.index, band: 'Must', members: [], step: s.id}); }
  // An unsaved requirement proposal stands under the step it would be needed at, in its slice.
  let g = null;
  if (ghost && ghost.mode === 'new' && ghost.record?.type === 'requirement') {
    const link = list(ghost.links).find(([from, , to]) => (to === 'new' && SM.steps.some(s => s.id === from)) || (from === 'new' && SM.steps.some(s => s.id === to)));
    const sid = link ? (link[2] === 'new' ? link[0] : link[2]) : null, s = SM.steps.find(x => x.id === sid);
    const outcomes = list(ghost.links).filter(([from, , to]) => from === 'new' && SM.outcomes.has(to)).map(l => l[2]);
    const band = PRIORITIES.includes(ghost.record.priority) ? ghost.record.priority : 'Must';
    if (!s || shown.has(s.id) || sc.kind === 'system') { g = {id: PROPOSED, kind: 'proposed', col: s ? 'S:' + s.index : OFF, band, members: [], title: text(ghost.record.title, 160), step: s?.id || null, outcomes}; cards.push(g); }
  }
  const cols = [...stepIds.map(id => 'S:' + SM.steps.find(s => s.id === id).index), ...(cards.some(c => c.col === OFF) ? [OFF] : [])].map(id => colInfo(SM, id));
  const bands = PRIORITIES.filter(b => cards.some(c => c.band === b));
  const rank = {hole: 0, req: 1, cell: 1, proposed: 2};
  cards.sort((a, b) => bands.indexOf(a.band) - bands.indexOf(b.band) || cols.findIndex(c => c.id === a.col) - cols.findIndex(c => c.id === b.col) || rank[a.kind] - rank[b.kind] || (a.id < b.id ? -1 : 1));
  return {scope: sc, depth: folded ? 'steps' : 'requirements', cols, bands, cards, ghost: g};
}

// The context: people, the system and its journey, the outcomes it exists for and who owns them.
export function foldContext(SM, scope = {kind: 'system'}, {ghost = null} = {}) {
  const sc = storyScope(SM, scope);
  let steps = SM.steps.map(s => s.id);
  if (sc.kind === 'step') steps = [sc.id];
  if (sc.kind === 'actor') steps = SM.actors.get(sc.id).steps.slice();
  if (sc.kind === 'outcome') steps = uniq(SM.outcomes.get(sc.id).reqs.flatMap(q => SM.R.get(q)?.steps || []));
  const shown = new Set(steps);
  const outcomesOf = sid => uniq((SM.steps.find(s => s.id === sid)?.reqs || []).flatMap(q => SM.R.get(q).outcomes));
  const actors = [...SM.actors.values()].filter(a => sc.kind === 'actor' ? a.id === sc.id : sc.kind === 'system' || a.steps.some(s => shown.has(s)));
  let outs = sc.kind === 'outcome' ? [sc.id] : uniq(steps.flatMap(outcomesOf));
  if (sc.kind === 'system') outs = uniq([...outs, ...SM.outcomes.keys()]);
  const owners = [...SM.stakeholders.values()].filter(s => sc.kind === 'system' || s.outcomes.some(o => outs.includes(o)));
  const rows = [
    ...SM.steps.filter(s => shown.has(s.id)).map(s => ({id: s.id, kind: 'step', region: 'system'})),
    ...actors.map(a => ({id: a.id, kind: 'actor', region: 'people'})),
    ...outs.map(o => ({id: o, kind: 'outcome', region: 'why'})),
    ...owners.map(s => ({id: s.id, kind: 'stakeholder', region: 'owners'}))
  ];
  const ids = new Set(rows.map(r => r.id)), links = [];
  for (const a of actors) for (const s of a.steps) if (ids.has(s)) links.push({id: 'P:' + a.id + '>' + s, from: a.id, to: s, kind: 'participates', label: 'takes part', refs: []});
  for (const sid of steps) for (const o of outcomesOf(sid)) if (ids.has(o)) { const refs = (SM.steps.find(s => s.id === sid).reqs).filter(q => SM.R.get(q).outcomes.includes(o)); links.push({id: 'D:' + sid + '>' + o, from: sid, to: o, kind: 'delivers', label: refs.join(' · '), ref: refs.length === 1 ? refs[0] : '', refs}); }
  for (const s of owners) for (const o of s.outcomes) if (ids.has(o)) links.push({id: 'O:' + s.id + '>' + o, from: s.id, to: o, kind: 'owns', label: 'owns', refs: []});
  const regions = ['people', 'system', 'why', 'owners'].filter(r => rows.some(x => x.region === r) || r === 'system');
  const lanes = regions.map(id => ({id, kind: id}));
  const notes = sc.kind === 'system' ? [...SM.limits.values()].map(x => ({id: x.id, kind: x.type === 'scope' ? (x.scopeMode === 'out' ? 'out' : 'in') : x.type})) : [];
  // An unsaved proposal for a new limit stands among the limits, with what it would touch.
  const r = ghost && ghost.mode === 'new' ? ghost.record : null;
  if (sc.kind === 'system' && r && ['scope', 'constraint', 'assumption'].includes(r.type)) {
    notes.push({id: PROPOSED, kind: r.type === 'scope' ? (r.scopeMode === 'out' ? 'out' : 'in') : r.type, proposed: true, title: text(r.title, 160) || 'Proposal', touches: uniq(list(ghost.links).flatMap(([f, , t]) => [f, t])).filter(id => id !== 'new' && SM.A.has(id))});
  }
  return {scope: sc, lanes, rows, links, notes};
}

// ---------------------------------------------------------------- walking the journey

export function storyWalk(SM) { return SM.steps.map(s => s.id); }
const refTitle = (SM, id) => { const a = SM.A.get(id); return a ? id + ' ' + a.title : id; };
export function describeStep(SM, id) {
  const s = SM.steps.find(x => x.id === id); if (!s) return '';
  const who = s.actors.length ? s.actors.map(a => SM.A.get(a).title).join(' and ') + (s.actors.length === 1 ? ' takes' : ' take') + ' part.' : 'No person takes part — the system acts alone.';
  const needs = s.reqs.length ? ' It needs ' + s.reqs.map(q => `${refTitle(SM, q)} (${SM.R.get(q).priority})`).join(', ') + '.' : ' No requirement says what it needs yet.';
  const outs = uniq(s.reqs.flatMap(q => SM.R.get(q).outcomes));
  const why = outs.length ? (s.reqs.length === 1 ? ' That delivers ' : ' Together they deliver ') + outs.map(o => refTitle(SM, o)).join(' and ') + '.' : s.reqs.length ? (s.reqs.length === 1 ? ' It delivers no recorded outcome.' : ' None of them delivers a recorded outcome.') : '';
  const next = s.next ? ` Next: ${SM.steps[s.index + 1].num} ${SM.steps[s.index + 1].title}${s.linkedNext ? '.' : ' — but no “precedes” relationship records that order.'}` : ' This is the last step of the journey.';
  return `${s.num} ${s.title}. ${who}${needs}${why}${next}`;
}
export function describeRequirement(SM, id) {
  const q = SM.R.get(id); if (!q) return '';
  const where = q.steps.length ? 'is needed at ' + q.steps.map(s => { const x = SM.steps.find(y => y.id === s); return x.num + ' ' + x.title; }).join(' and ') : 'is needed at no journey step';
  const why = q.outcomes.length ? ' and delivers ' + q.outcomes.map(o => refTitle(SM, o)).join(' and ') : ' and delivers no recorded outcome';
  const rests = q.assumptions.length ? ` It rests on ${q.assumptions.map(a => refTitle(SM, a)).join(' and ')}.` : '';
  const limits = q.constraints.length ? ` It is constrained by ${q.constraints.map(c => refTitle(SM, c)).join(' and ')}.` : '';
  const down = q.covers.length ? ` In Chapter 4, ${q.covers.map(r => r.ref + ' ' + r.title).join(' and ')} ${q.covers.length === 1 ? 'covers' : 'cover'} it.` : ' No Chapter 4 responsibility covers it yet.';
  return `${q.id} ${q.title} (${q.priority}) ${where}${why}.${rests}${limits}${q.testable ? '' : ' Its acceptance cannot be tested yet.'}${down}`;
}

// Observations drawn only from recorded facts, as prompts for review.
export function storyInsights(SM, scope = {kind: 'system'}) {
  const out = [], sc = storyScope(SM, scope), sys = sc.kind === 'system', keep = inScope(SM, sc);
  const qs = [...SM.R.values()].filter(keep), names = xs => xs.map(q => q.id + ' ' + q.title).join(', ');
  const prop = id => SM.proposals.find(q => q.id === id) ? id : null;
  const holes = sys ? SM.steps.filter(s => s.hole) : [];
  if (holes.length) out.push({kind: 'gap', id: holes[0].id, text: `${plural(holes.length, 'journey step has', 'journey steps have')} no requirement: ${holes.map(s => s.num + ' ' + s.title).join(', ')}.`, ask: `What must the design do at “${holes[0].title}”?`});
  const off = qs.filter(q => q.offJourney);
  if (off.length) out.push({kind: 'gap', id: off[0].id, text: `${plural(off.length, 'requirement is', 'requirements are')} needed at no journey step: ${names(off)}.`, ask: `Where in the journey is ${off[0].id} needed?`});
  const why = qs.filter(q => !q.outcomes.length);
  if (why.length) out.push({kind: 'gap', id: why[0].id, text: `${plural(why.length, 'requirement delivers', 'requirements deliver')} no business outcome: ${names(why)}.`, ask: `Why does ${why[0].id} matter?`});
  const untestable = qs.filter(q => !q.testable);
  if (untestable.length) out.push({kind: 'gap', id: untestable[0].id, proposal: untestable.some(q => SM.proposals.some(p => p.id === 'acceptance' && p.target === q.id)) ? 'acceptance' : null, text: `${plural(untestable.length, 'requirement has', 'requirements have')} acceptance that cannot be tested yet: ${names(untestable)}.`, ask: 'What starting condition, action and observable result would show it is met?'});
  const unowned = qs.filter(q => !q.accountable);
  if (unowned.length) out.push({kind: 'gap', id: unowned[0].id, text: `${plural(unowned.length, 'requirement has', 'requirements have')} no accountable owner or source: ${names(unowned)}.`});
  if (sys) {
    const orphan = [...SM.outcomes.values()].filter(o => !o.reqs.length);
    if (orphan.length) out.push({kind: 'gap', id: orphan[0].id, text: `${plural(orphan.length, 'outcome is', 'outcomes are')} delivered by no requirement: ${orphan.map(o => o.id + ' ' + o.title).join(', ')}.`});
    const ownerless = [...SM.outcomes.values()].filter(o => !o.owners.length);
    if (ownerless.length) out.push({kind: 'gap', id: ownerless[0].id, text: `${plural(ownerless.length, 'outcome has', 'outcomes have')} no stakeholder who owns ${ownerless.length === 1 ? 'it' : 'them'}: ${ownerless.map(o => o.id).join(', ')}.`});
    const breaks = SM.steps.filter(s => s.next && !s.linkedNext);
    if (breaks.length) out.push({kind: 'gap', id: breaks[0].id, text: `The journey order is not recorded after ${breaks.map(s => s.num + ' ' + s.title).join(', ')}: no “precedes” relationship leads to the next step.`});
  }
  const resting = qs.filter(q => q.assumptions.some(a => !SM.A.get(a).confirmed));
  if (resting.length) out.push({kind: 'risk', id: resting[0].id, proposal: prop('assumption'), text: resting.map(q => `${q.id} ${q.title} rests on ${q.assumptions.filter(a => !SM.A.get(a).confirmed).map(a => refTitle(SM, a)).join(' and ')}, not yet confirmed`).join('; ') + '.', ask: 'What evidence would make the assumption dependable?'});
  const outside = qs.filter(q => q.scope.some(s => SM.A.get(s).scopeMode === 'out'));
  if (outside.length) out.push({kind: 'risk', id: outside[0].id, text: `${plural(outside.length, 'requirement is', 'requirements are')} tied to a boundary marked out of scope: ${names(outside)}.`});
  if (sys && SM.steps.length && !holes.length && !off.length && !why.length && qs.length && qs.every(q => q.covers.length)) out.push({kind: 'info', id: SM.steps[0].id, text: 'Every step has a requirement, every requirement is on the journey and delivers an outcome, and every requirement is covered by a Chapter 4 responsibility.'});
  else { const unc = qs.filter(q => !q.covers.length); if (unc.length) out.push({kind: 'info', id: unc[0].id, text: `${plural(unc.length, 'requirement is', 'requirements are')} not yet covered by a Chapter 4 responsibility: ${names(unc)}.`}); }
  if (qs.length > 1 && qs.every(q => q.priority === 'Must')) out.push({kind: 'info', id: qs[0].id, text: `All ${qs.length} requirements are Must: nothing has been traded off yet, so the map has one slice.`, ask: 'Which of these could wait for a later release?'});
  const ambiguous = qs.filter(q => q.ambiguous);
  if (ambiguous.length) out.push({kind: 'info', id: ambiguous[0].id, text: `${plural(ambiguous.length, 'requirement uses', 'requirements use')} wording that cannot be observed: ${names(ambiguous)}.`});
  if (sys) {
    const alone = SM.steps.filter(s => !s.actors.length);
    if (alone.length && alone.length < SM.steps.length) out.push({kind: 'info', id: alone[0].id, text: `${alone.map(s => s.num + ' ' + s.title).join(', ')} ${alone.length === 1 ? 'has' : 'have'} no person taking part — the system acts alone there.`});
    const os = [...SM.outcomes.values()].filter(o => o.reqs.length);
    if (os.length > 1) { const top = os.slice().sort((a, b) => b.reqs.length - a.reqs.length)[0], thin = os.filter(o => o.reqs.length === 1); if (top.reqs.length >= Math.max(2, SM.R.size * 0.6)) out.push({kind: 'info', id: top.id, text: `${top.reqs.length} of ${SM.R.size} requirements deliver ${top.id} ${top.title}${thin.length ? `; ${thin.map(o => o.id).join(', ')} rest${thin.length === 1 ? 's' : ''} on a single requirement` : ''}.`}); }
    const all = [...SM.A.values()], unconfirmed = all.filter(a => !a.confirmed);
    if (unconfirmed.length) out.push({kind: 'info', id: null, text: `${unconfirmed.length} of ${all.length} records are ${unconfirmed.every(a => a.origin === 'reference') ? 'reference examples' : 'drafts'}, not yet confirmed against your project.`});
  }
  return out;
}
