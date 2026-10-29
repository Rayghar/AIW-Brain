// The roadmap (round 6, Contract S): a design says where it stands, what comes next and where it is going. A plateau is
// one of those states — the current state, a transition or the target — in an order of its own; an assignment says in
// which plateau a record of Chapters 4–10 is introduced and in which it is retired; a Chapter 11 delivery action may
// name the plateau it works towards. Everything else here is read from those records and from the chapters' own
// checks: what is present as of a plateau, the marks a picture paints for one, its readiness, the findings on the plan
// and the SDD's Transition section. The records change only through the review commands below — review.plateau,
// review.plateau-remove and review.plateau-assign, with review.action carrying plateauId — applied through
// review-domain.js's command path (applyFinalReviewCommand) like every other Chapter 11 change, so the worker's revision
// check guards each save. A project without plateaus reads exactly as before: no marks, no findings, no section.
// Readiness words and glyphs stay readiness-model.js's: it registers its per-record reading here when it loads
// (registerRecordReadiness), the way the SDD builder registers itself with review-domain.js, so no import runs upward.
import {logicalGraph} from './logical-domain.js';
import {memoPass} from './document-memo.js';
import {plural} from './util.js';
import {groupById, groupIndex} from './requirement-groups.js';
import {cleanOpen} from './open-fields.js';

export const PLATEAU_KINDS = ['current', 'transition', 'target'];
export const PLATEAU_WORDS = {current: 'Current state', transition: 'Transition', target: 'Target'};
export const ROADMAP_LIMITS = {plateaus: 50, title: 180, purpose: 2000, history: 500};
export const ROADMAP_COMMANDS = new Set(['review.plateau', 'review.plateau-remove', 'review.plateau-assign', 'review.plateau-group', 'review.migration', 'review.migration-remove']);
// Round 12 (DRF-14, GR-RUN-05): a requirement group placed on the plateau where it is delivered (its basis: the
// imported delivery status, or a person), and the migration, coexistence and cut-over records of the plan. A
// migration record names where the work moves from and to, its scope and volumes, how the move is reconciled, how the
// two run side by side, how it is rolled back and rehearsed (each stated, or open: open-fields.js), the plateaus it
// moves between and the delivery actions that carry it.
export const GROUP_BASES = ['delivery status', 'person'];
export const MIGRATION_FIELDS = [['source', 'Moves from'], ['target', 'Moves to'], ['scope', 'Scope'], ['volumes', 'Volumes'], ['reconciliation', 'Reconciliation'], ['parallelRun', 'Parallel run'], ['rollback', 'Rollback'], ['rehearsal', 'Rehearsal']];
export const MIGRATION_LIMITS = {migrations: 20, text: 2000, plateaus: 20, actions: 50};
export const NO_PLATEAUS = 'No plateaus yet: the design is one state.';
// The one vocabulary of the marks a plateau paints (model-marks.js draws them; these are the Key's words for them).
export const PLATEAU_MARK_WORDS = {changed: 'Introduced here', ghost: 'Not yet introduced', dimmed: 'Retired'};

const EMPTY = Object.freeze({plateaus: Object.freeze([]), assignments: Object.freeze({}), groups: Object.freeze({}), migrations: Object.freeze([]), history: Object.freeze([])});
const text = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = v => (Array.isArray(v) ? v : []);
const pad = n => String(n).padStart(3, '0');
const byOrder = (a, b) => a.order - b.order || a.id.localeCompare(b.id);

// The roadmap as recorded, or the empty one: readers never write the document.
export const roadmapOf = p => (p?.roadmap && typeof p.roadmap === 'object' && Array.isArray(p.roadmap.plateaus) ? p.roadmap : EMPTY);
// The default, written once: no plateaus, no assignments. Called where the other chapter defaults are (withFinalReview).
export function withRoadmap(input) {
  const p = input;
  if (!p.roadmap || typeof p.roadmap !== 'object' || !Array.isArray(p.roadmap.plateaus)) p.roadmap = {schemaVersion: 1, counters: {plateau: 0}, plateaus: [], assignments: {}, history: []};
  if (!p.roadmap.counters) p.roadmap.counters = {plateau: p.roadmap.plateaus.length};
  if (!p.roadmap.assignments || typeof p.roadmap.assignments !== 'object') p.roadmap.assignments = {};
  if (!Array.isArray(p.roadmap.history)) p.roadmap.history = [];
  return p;
}
export function plateausOf(p) { return [...roadmapOf(p).plateaus].sort(byOrder); }
export const plateauOf = (p, id) => roadmapOf(p).plateaus.find(x => x.id === id) || null;
const actionsOf = p => (Array.isArray(p?.finalReview?.actions) ? p.finalReview.actions : []);

// The records a plateau can hold: the connected model's objects of Chapters 4–10 — the nodes of the one graph
// (logical-domain.js logicalGraph) that are not Chapter 1's journey steps. Chapters 1–3 are motivation: they hold at
// every plateau and are not assigned. Worked out once per document object, as review-domain.js keeps its objects.
const universe = new WeakMap();
export function roadmapObjects(p) {
  if (!p || typeof p !== 'object') return [];
  if (universe.has(p)) return universe.get(p);
  let nodes = [];
  try { nodes = logicalGraph(p).nodes; } catch { nodes = []; }
  const out = nodes.filter(n => n.layer !== 'process').map(n => ({id: n.id, ref: n.ref || n.id, title: n.title || n.id, layer: n.layer, kind: n.runtimeKind || n.layer}));
  universe.set(p, out);
  return out;
}
const indexOf = p => {
  const objects = new Map(roadmapObjects(p).map(o => [o.id, o])), plateaus = new Map(roadmapOf(p).plateaus.map(x => [x.id, x]));
  return {objects, plateaus, at: id => (id ? plateaus.get(id) || null : null)};
};
// The assignments that name a record the model still holds, in record order.
const assigned = (p, I) => Object.entries(roadmapOf(p).assignments).filter(([id, a]) => I.objects.has(id) && a && typeof a === 'object').sort(([a], [b]) => a.localeCompare(b));

// ---------------------------------------------------------------- the commands
function date(raw) {
  const d = text(raw, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !Number.isFinite(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d) throw Error('Give the due date as YYYY-MM-DD, or leave it empty.');
  return d;
}
// Applies one roadmap command to the document it is given (a working copy; review-domain.js hands it one), with the
// eligible records (`objects`: the connected model's Chapters 4–10, as review-domain.js lists them) and the review's
// actions (`actions`) for the checks that need them. Returns {document, selected}.
export function applyRoadmapCommand(p, command, at = new Date().toISOString(), {objects = roadmapObjects(p), actions = actionsOf(p), actor = null} = {}) {
  const R = withRoadmap(p).roadmap, raw = command?.payload || {};
  let selected = null;
  switch (command?.type) {
    case 'review.plateau': {
      const old = raw.id ? R.plateaus.find(x => x.id === raw.id) : null;
      if (raw.id && !old) throw Error('Choose an existing plateau.');
      const title = text(raw.title, ROADMAP_LIMITS.title);
      if (!title) throw Error('Name the plateau.');
      if (!PLATEAU_KINDS.includes(raw.kind)) throw Error('Say whether the plateau is the current state, a transition or the target.');
      const order = Number(raw.order);
      if (!Number.isInteger(order) || order < 1 || order > 9999) throw Error('Give the plateau a whole-number order from 1.');
      if (R.plateaus.some(x => x !== old && x.order === order)) throw Error('Another plateau already has order ' + order + '. Orders are unique.');
      if (raw.kind === 'current' && R.plateaus.some(x => x !== old && x.kind === 'current')) throw Error('A design has one current state. Change the other plateau first.');
      if (!old && R.plateaus.length >= ROADMAP_LIMITS.plateaus) throw Error('A roadmap holds up to ' + ROADMAP_LIMITS.plateaus + ' plateaus.');
      // A save is the person's (a proposal it was becomes theirs); where the plateau came from stays (round 12).
      const x = {id: old?.id || 'PLT-' + pad(++R.counters.plateau), revision: (old?.revision || 0) + 1, title, kind: raw.kind, order, purpose: text(raw.purpose, ROADMAP_LIMITS.purpose), due: raw.due ? date(raw.due) : '', ...(old?.origin ? {origin: old.origin} : {}), ...(old?.provenance ? {provenance: old.provenance} : {})};
      if (old) R.plateaus[R.plateaus.indexOf(old)] = x; else R.plateaus.push(x);
      R.history.push({at, actor, action: old ? 'changed' : 'added', plateauId: x.id, title: x.title, kind: x.kind, order: x.order});
      selected = x.id;
      break;
    }
    case 'review.plateau-remove': {
      const x = R.plateaus.find(x => x.id === raw.id);
      if (!x) throw Error('Choose an existing plateau.');
      // What names it: the records and requirement groups assigned to it, the migration records and the actions.
      const named = [...Object.entries(R.assignments).filter(([, a]) => a?.introducedIn === x.id || a?.retiredIn === x.id).map(([id]) => id), ...Object.entries(R.groups || {}).filter(([, g]) => g?.plateauId === x.id).map(([id]) => id)], moves = list(R.migrations).filter(m => list(m.plateauIds).includes(x.id)).map(m => m.id), acts = actions.filter(a => a?.plateauId === x.id).map(a => a.id);
      const all = [...named, ...moves, ...acts], words = [named.length ? plural(named.length, 'assignment') : '', moves.length ? plural(moves.length, 'migration record') : '', acts.length ? plural(acts.length, 'action') : ''].filter(Boolean);
      if (all.length) throw Error('Clear what names ' + x.id + ' first: ' + (words.length > 1 ? words.slice(0, -1).join(', ') + ' and ' + words.at(-1) : words[0]) + ' (' + all.slice(0, 6).join(', ') + (all.length > 6 ? ', …' : '') + ').');
      R.plateaus.splice(R.plateaus.indexOf(x), 1);
      R.history.push({at, actor, action: 'removed', plateauId: x.id, title: x.title});
      break;
    }
    case 'review.plateau-assign': {
      const o = objects.find(o => o.id === raw.objectId);
      if (!o) throw Error('Choose a record of Chapters 4–10 on the connected model.');
      const pick = (v, what) => { if (v == null || v === '') return null; const x = R.plateaus.find(x => x.id === v); if (!x) throw Error('Choose an existing plateau for "' + what + '".'); return x; };
      const i = pick(raw.introducedIn, 'introduced in'), r = pick(raw.retiredIn, 'retired in');
      if (i && r && i.order >= r.order) throw Error('A record is introduced before it is retired: ' + i.title + ' (order ' + i.order + ') does not come before ' + r.title + ' (order ' + r.order + ').');
      if (!i && !r) { delete R.assignments[o.id]; R.history.push({at, actor, action: 'cleared', objectId: o.id}); }
      else { R.assignments[o.id] = {introducedIn: i?.id || null, retiredIn: r?.id || null}; R.history.push({at, actor, action: 'assigned', objectId: o.id, introducedIn: i?.id || null, retiredIn: r?.id || null}); }
      selected = o.id;
      break;
    }
    case 'review.plateau-group': {
      const g = groupById(p, text(raw.groupId, 40));
      if (!g || !/^RG-\d+$/.test(g.id)) throw Error('Choose an existing requirement group.');
      const id = text(raw.plateauId, 40), x = id ? R.plateaus.find(y => y.id === id) : null;
      if (id && !x) throw Error('Choose an existing plateau for the group.');
      const basis = GROUP_BASES.includes(raw.basis) ? raw.basis : 'person';
      R.groups ??= {};
      if (!x) { delete R.groups[g.id]; R.history.push({at, actor, action: 'group cleared', groupId: g.id}); }
      else { R.groups[g.id] = {plateauId: x.id, basis, at, actor}; R.history.push({at, actor, action: 'group placed', groupId: g.id, plateauId: x.id, basis}); }
      selected = g.id;
      break;
    }
    case 'review.migration': {
      R.migrations ??= []; R.counters.migration ??= R.migrations.length;
      const old = raw.id ? R.migrations.find(m => m.id === raw.id) : null;
      if (raw.id && !old) throw Error('Choose an existing migration record.');
      const title = text(raw.title, ROADMAP_LIMITS.title);
      if (!title) throw Error('Name the migration.');
      if (!old && R.migrations.length >= MIGRATION_LIMITS.migrations) throw Error('A plan holds up to ' + MIGRATION_LIMITS.migrations + ' migration records.');
      const ids = (v, have, what, max) => { if (v === undefined) return have; const xs = [...new Set((Array.isArray(v) ? v : []).filter(x => typeof x === 'string' && x))]; if (xs.length > max) throw Error('A migration names at most ' + max + ' ' + what + '.'); return xs; };
      const plateauIds = ids(raw.plateauIds, old?.plateauIds || [], 'plateaus', MIGRATION_LIMITS.plateaus), actionIds = ids(raw.actionIds, old?.actionIds || [], 'actions', MIGRATION_LIMITS.actions);
      const lost = plateauIds.filter(id => !R.plateaus.some(x => x.id === id)), missing = actionIds.filter(id => !actions.some(a => a.id === id));
      if (lost.length) throw Error('Choose existing plateaus: ' + lost.slice(0, 3).join(', ') + ' ' + (lost.length === 1 ? 'is' : 'are') + ' not in the plan.');
      if (missing.length) throw Error('Choose existing delivery actions: ' + missing.slice(0, 3).join(', ') + ' ' + (missing.length === 1 ? 'is' : 'are') + ' not in the plan.');
      const fields = Object.fromEntries(MIGRATION_FIELDS.map(([k]) => { const v = raw[k] === undefined ? old?.[k] ?? '' : raw[k]; if (typeof v !== 'string' && v != null) throw Error('Describe the ' + k + ' in words.'); const t = String(v ?? '').trim(); if (t.length > MIGRATION_LIMITS.text) throw Error('The ' + k + ' holds at most ' + MIGRATION_LIMITS.text + ' characters.'); return [k, t]; }));
      const open = raw.open === undefined ? old?.open : cleanOpen(raw.open, MIGRATION_FIELDS.map(([k]) => k));
      const m = {id: old?.id || 'MIG-' + pad(++R.counters.migration), revision: (old?.revision || 0) + 1, title, ...fields, plateauIds, actionIds, ...(open && Object.keys(open).length ? {open} : {}), ...(old?.provenance ? {provenance: old.provenance} : {}), ...(old?.origin ? {origin: old.origin} : {})};
      if (old) R.migrations[R.migrations.indexOf(old)] = m; else R.migrations.push(m);
      R.history.push({at, actor, action: old ? 'migration changed' : 'migration added', migrationId: m.id, title: m.title});
      selected = m.id;
      break;
    }
    case 'review.migration-remove': {
      const m = list(R.migrations).find(x => x.id === raw.id);
      if (!m) throw Error('Choose an existing migration record.');
      R.migrations.splice(R.migrations.indexOf(m), 1);
      R.history.push({at, actor, action: 'migration removed', migrationId: m.id, title: m.title});
      break;
    }
    default: throw Error('Unknown roadmap action.');
  }
  if (R.history.length > ROADMAP_LIMITS.history) R.history.splice(0, R.history.length - ROADMAP_LIMITS.history);
  return {document: p, selected};
}
// A delivery action's plateau, checked: '' for none, else an existing plateau's id (review-domain.js saveAction).
export function actionPlateau(p, raw) {
  const id = text(raw, 40);
  if (!id) return '';
  if (!plateauOf(p, id)) throw Error('Choose an existing plateau for this action.');
  return id;
}

// ---------------------------------------------------------------- the readings
// The records present as of a plateau: introduced at or before it and not retired at or before it; a record assigned
// to no plateau is present at every one. Null for a plateau the roadmap does not hold.
export function asOf(p, plateauId) {
  const x = plateauOf(p, plateauId);
  if (!x) return null;
  return memoPass(p, () => {
    const I = indexOf(p), A = roadmapOf(p).assignments, out = new Set();
    for (const o of roadmapObjects(p)) {
      const a = A[o.id], i = a ? I.at(a.introducedIn) : null, r = a ? I.at(a.retiredIn) : null;
      if ((!i || i.order <= x.order) && (!r || r.order > x.order)) out.add(o.id);
    }
    return out;
  });
}
// The marks a picture paints as of a plateau (source `plateau` on the marks channel, model-marks.js): what the plateau
// introduces is changed, what arrives only later is a ghost, what is retired at or before it is dimmed. Records assigned
// to no plateau carry no mark. The info is the plateau's own reading: what it introduces and retires, and its actions.
export function plateauMarks(p, plateauId) {
  const x = plateauOf(p, plateauId);
  if (!x) return {marks: [], info: null};
  return memoPass(p, () => {
    const I = indexOf(p), marks = [], introduced = [], retired = [];
    for (const [id, a] of assigned(p, I)) {
      const i = I.at(a.introducedIn), r = I.at(a.retiredIn);
      if (i?.id === x.id) introduced.push(id);
      if (r?.id === x.id) retired.push(id);
      if (r && r.order <= x.order) marks.push({id, state: 'dimmed', note: r.id === x.id ? 'Retired here' : 'Retired in ' + r.title});
      else if (i && i.id === x.id) marks.push({id, state: 'changed', note: 'Introduced here'});
      else if (i && i.order > x.order) marks.push({id, state: 'ghost', note: 'Introduced in ' + i.title});
    }
    const actions = actionsOf(p).filter(a => a.plateauId === x.id).map(a => a.id);
    return {marks, info: {plateau: {id: x.id, title: x.title, kind: x.kind, order: x.order, due: x.due}, introduced, retired, actions, words: {...PLATEAU_MARK_WORDS}}};
  });
}
// One build-up step per plateau, in order (Contract F's registry: `plateau` mode, "By plateau").
export function plateauSteps(D, p) {
  return plateausOf(p).map(x => { const M = plateauMarks(p, x.id); return {id: x.id, title: PLATEAU_WORDS[x.kind] + ' · ' + x.title, marks: M.marks, info: M.info}; });
}

// Readiness per plateau: the readiness of the records it introduces (pass, fix, confirm, as readiness-model.js reads
// each record's passage) and the states of its actions. readiness-model.js registers the reading when it loads; until
// it has, the counts are unknown and the words say so, rather than counting what was not read.
let reader = null;
export function registerRecordReadiness(r) { const was = reader; reader = r && typeof r.status === 'function' ? r : null; return was; }
export const recordReadinessRegistered = () => !!reader;
export function plateauReadiness(p) {
  const P = plateausOf(p);
  if (!P.length) return [];
  return memoPass(p, () => {
    const I = indexOf(p), acts = actionsOf(p), rows = assigned(p, I);
    let status = null;
    if (reader) { try { status = reader.status(p); } catch { status = null; } }
    const words = reader?.words || {}, glyphs = reader?.glyphs || {};
    return P.map(x => {
      const ids = rows.filter(([, a]) => a.introducedIn === x.id).map(([id]) => id), counts = {pass: 0, fix: 0, confirm: 0, unknown: 0};
      for (const id of ids) { const s = status?.get(id); if (s === 'pass' || s === 'fix' || s === 'confirm') counts[s]++; else counts.unknown++; }
      const mine = acts.filter(a => a.plateauId === x.id), states = {};
      for (const a of mine) states[a.status || 'Planned'] = (states[a.status || 'Planned'] || 0) + 1;
      // A record the chapters' checks do not read as a passage (a party, a zone, a placement) is counted, not judged.
      const parts = ['pass', 'fix', 'confirm'].filter(k => counts[k]), rest = counts.unknown ? [counts.unknown + ' not checked'] : [];
      const line = !status ? 'Readiness not read' : !ids.length ? 'Nothing introduced here' : parts.map(k => counts[k] + ' ' + (words[k] || k)).concat(rest).join(' · ');
      const marked = !status ? line : !ids.length ? line : parts.map(k => (glyphs[k] ? glyphs[k] + ' ' : '') + counts[k] + ' ' + (words[k] || k)).concat(rest).join(' · ');
      const retired = rows.filter(([, a]) => a.retiredIn === x.id).length;
      return {id: x.id, title: x.title, kind: x.kind, order: x.order, due: x.due, introduced: ids.length, retired, records: counts, known: !!status, state: !status ? 'none' : counts.fix ? 'fix' : counts.confirm ? 'confirm' : counts.pass ? 'pass' : 'none', actions: {total: mine.length, ...states}, words: line, marked};
    });
  });
}

// Round 12 (DRF-14): the requirement groups placed on each plateau, and where each requirement is delivered: a group's
// requirement delivered today is on the current plateau, one with a gap on the plateau its group is placed on.
export const groupPlacements = p => roadmapOf(p).groups || {};
export function plateauGroups(p) {
  const P = plateausOf(p), G = groupPlacements(p), index = groupIndex(p), byId = new Map(list(p?.artefacts).map(a => [a.id, a])), done = a => String(a?.assessment?.delivery || '').trim().toLowerCase() === 'delivered';
  return P.map(x => {
    const groups = Object.entries(G).filter(([, g]) => g?.plateauId === x.id).map(([id, g]) => { const rows = list(index.members.get(id)).map(r => byId.get(r)).filter(Boolean); return {id, basis: g.basis, members: rows.length, delivered: rows.filter(done).length, gaps: rows.filter(a => a?.assessment?.delivery && !done(a)).length}; });
    return {id: x.id, title: x.title, kind: x.kind, order: x.order, groups, members: groups.reduce((n, g) => n + g.members, 0), gaps: groups.reduce((n, g) => n + g.gaps, 0)};
  });
}

// The findings on the plan: Chapter 11's final checks carry them (review-domain.js finalFindings), each to confirm.
// Round 12 (GR-RUN-05): a design that names an existing system to move from (a legacy or retiring party, or a contract
// that migrates, converts or cuts over) and plans no transition (no plateau, or no migration record tying the move to
// plateaus) raises one finding; a migration record with no plateau or no action raises one of its own.
const LEGACY_WORDS = /\b(?:migrat\w*|conver(?:t|sion)\w*|cut[- ]?over|coexist\w*|legacy|decommission\w*)\b/i;
export function migrationNeeds(p) {
  const parties = list(p?.interfaces?.parties).filter(x => x?.kind === 'legacy system' || x?.status === 'retiring');
  const contracts = list(p?.interfaces?.contracts).filter(c => LEGACY_WORDS.test([c?.title, c?.purpose, c?.operation].join(' ')));
  return {parties, contracts, any: parties.length + contracts.length > 0};
}
export const migrationsOf = p => list(roadmapOf(p).migrations);
function migrationFindings(p, P, add) {
  const need = migrationNeeds(p), ms = migrationsOf(p), planned = P.length && ms.some(m => list(m.plateauIds).some(id => P.some(x => x.id === id)));
  if (need.any && !planned) { const named = [...need.parties.map(x => x.ref || x.id), ...need.contracts.map(c => c.ref || c.id)]; add('ROADMAP-MIGRATION', 'project', 'Plan the move from the existing system', 'The design names ' + named.slice(0, 4).join(', ') + (named.length > 4 ? ' and ' + (named.length - 4) + ' more' : '') + ', which ' + (named.length === 1 ? 'moves' : 'move') + ' from an existing system, and ' + (P.length ? 'no migration record ties the move to the plateaus' : 'no plateau plans the transition') + '. Record the current state and the target as plateaus, and a migration record with its reconciliation, parallel run, rollback and rehearsal.'); }
  for (const m of ms) if (!list(m.plateauIds).length || !list(m.actionIds).length) add('ROADMAP-MIGRATION-LINKS', m.id, 'Tie ' + m.id + ' to the plan', m.title + (list(m.plateauIds).length ? '' : ' names no plateau') + (!list(m.plateauIds).length && !list(m.actionIds).length ? ' and' : '') + (list(m.actionIds).length ? '' : ' names no delivery action') + '. Name the plateaus it moves between and the actions that carry it.');
}
export function roadmapFindings(p) {
  const P = plateausOf(p);
  if (!P.length) { const out = []; migrationFindings(p, P, (code, id, title, detail) => out.push({id: code + ':' + id, objectId: id, code, title, detail, level: 'warning'})); return out; }
  return memoPass(p, () => {
    const I = indexOf(p), acts = actionsOf(p), out = [], add = (code, id, title, detail) => out.push({id: code + ':' + id, objectId: id, code, title, detail, level: 'warning'});
    migrationFindings(p, P, add);
    for (const x of P) {
      if (x.kind !== 'current' && !acts.some(a => a.plateauId === x.id)) add('ROADMAP-NO-ACTION', x.id, 'Plan the work towards ' + x.title, 'No delivery action names this ' + (x.kind === 'target' ? 'target' : 'transition') + '. Add an action with this plateau, or remove the plateau.');
      if (x.kind === 'target' && !P.some(y => y.order < x.order)) add('ROADMAP-NO-PATH', x.id, 'Give ' + x.title + ' a path', 'The target has no plateau before it. Record the current state, and any transition, with a lower order.');
    }
    for (const [id, a] of assigned(p, I)) {
      const o = I.objects.get(id), i = I.at(a.introducedIn), r = I.at(a.retiredIn);
      if (i && r && i.order >= r.order) add('ROADMAP-ORDER', id, 'Put ' + o.ref + ' in order', 'It is introduced in ' + i.title + ' (order ' + i.order + ') and retired in ' + r.title + ' (order ' + r.order + '); a record is introduced before it is retired.');
      if (i && i.kind !== 'current' && !acts.some(x => Array.isArray(x.objectIds) && x.objectIds.includes(id))) add('ROADMAP-UNPLANNED', id, 'Plan how ' + o.ref + ' arrives', 'It is introduced in ' + i.title + ' and no delivery action names it. Add an action that names it, or assign it to the current state.');
    }
    return out;
  });
}

// The SDD's Transition section: the plateaus table (kind, due, what each introduces and retires, readiness, actions),
// then per transition the gap: what is introduced, what is retired, the actions and their states. The executive
// edition gets the table and one line per gap. Empty without plateaus. Markdown, as the rest of the SDD.
// An action's owner and due date are named where they are recorded; what is open about them is marked once, in
// the delivery obligations register, so Appendix A lists each gap once.
export function transitionSection(p, edition = 'full') {
  const P = plateausOf(p);
  if (!P.length) return '';
  return memoPass(p, () => {
    const I = indexOf(p), R = plateauReadiness(p), rows = assigned(p, I), acts = actionsOf(p);
    const cell = v => String(v ?? '').replace(/\|/g, '/').replace(/\r?\n/g, ' ');
    const name = id => { const o = I.objects.get(id); return o ? o.ref + ' · ' + o.title : id; };
    const refs = ids => (ids.length ? ids.map(id => I.objects.get(id)?.ref || id).join(', ') : 'none');
    const current = P.find(x => x.kind === 'current'), target = P.find(x => x.kind === 'target'), transitions = P.filter(x => x.kind === 'transition').length;
    const lead = plural(P.length, 'plateau') + ': ' + [current ? current.title + ' as the current state' : 'no current state recorded', plural(transitions, 'transition'), target ? target.title + ' as the target' : 'no target recorded'].join(', ') + '. Readiness counts the records a plateau introduces, read from the chapters’ own checks; an action carries its delivery status. Nothing here establishes that a transition has happened.';
    const table = ['| Plateau | Kind | Due | Introduces | Retires | Readiness | Actions |', '| --- | --- | --- | --- | --- | --- | --- |', ...P.map((x, i) => '| ' + cell(x.id + ' · ' + x.title) + ' | ' + PLATEAU_WORDS[x.kind] + ' | ' + (x.due || '—') + ' | ' + R[i].introduced + ' | ' + R[i].retired + ' | ' + cell(R[i].words) + ' | ' + R[i].actions.total + ' |')].join('\n');
    let out = '## Transition\n\n' + lead + '\n\n' + table + '\n\n';
    for (let i = 1; i < P.length; i++) {
      const prev = P[i - 1], x = P[i], intro = rows.filter(([, a]) => a.introducedIn === x.id).map(([id]) => id), ret = rows.filter(([, a]) => a.retiredIn === x.id).map(([id]) => id), mine = acts.filter(a => a.plateauId === x.id);
      const states = Object.entries(mine.reduce((m, a) => { const s = String(a.status || 'Planned').toLowerCase(); m[s] = (m[s] || 0) + 1; return m; }, {})).map(([s, n]) => n + ' ' + s).join(', ');
      if (edition === 'executive') { out += '- Gap · ' + prev.title + ' → ' + x.title + ': introduces ' + (intro.length ? intro.length + ' (' + refs(intro) + ')' : 'nothing') + '; retires ' + (ret.length ? ret.length + ' (' + refs(ret) + ')' : 'nothing') + '; ' + (mine.length ? plural(mine.length, 'action') + ' (' + states + ')' : 'no action yet') + (x.due ? '; due ' + x.due : '') + '.\n'; continue; }
      out += '### Gap · ' + prev.title + ' → ' + x.title + '\n\n' + (x.purpose ? x.purpose + '\n\n' : '') + 'Introduced here: ' + (intro.length ? intro.map(name).join('; ') : 'nothing') + '.\n\nRetired here: ' + (ret.length ? ret.map(name).join('; ') : 'nothing') + '.\n\nActions: ' + (mine.length ? mine.map(a => a.id + ' · ' + a.title + ' — ' + String(a.status || 'Planned').toLowerCase() + (a.owner ? ', owner ' + a.owner : '') + (a.due ? ', due ' + a.due : '')).join('; ') : 'none yet') + '.\n\n';
    }
    if (edition === 'executive' && P.length > 1) out += '\n';
    return out;
  });
}
