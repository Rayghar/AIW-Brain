// Chapter 11 · Work · Plateaus (round 6, Contract S): the editor for the roadmap, mounted by review-ui.js as one of the
// Work stages. The plateaus in order (kind, title, due, readiness in words and glyphs, actions) with Add, Edit and
// Remove through the shell's dialog host and the reviewed commands review.plateau and review.plateau-remove; the Gap
// reading per plateau (what it introduces, what it retires, its actions and their states); the assignments of
// Chapters 4–10's records with an Assign dialog (review.plateau-assign); the plan's checks in the one vocabulary; and
// the Plateau select of the delivery action's editor (actionPlateauField). Buttons carry data-rv-action="plateau-…"
// and the forms rv-plateau-… ids, so review-ui.js's own listeners route them to roadmapAction and roadmapSubmit, and
// every change goes out through the studio's send as every other Chapter 11 edit does. Presentation only.
import {esc} from './html-escape.js';
import {recordField,kitFor} from './record-fields.js';
// The field kit, bound to this studio's record types (record-fields.js).
const fPlateau=kitFor('review.plateau');
import {plateausOf, plateauOf, roadmapOf, roadmapObjects, plateauMarks, plateauReadiness, roadmapFindings, plateauSteps, PLATEAU_KINDS, PLATEAU_WORDS, ROADMAP_LIMITS, NO_PLATEAUS} from './roadmap-domain.js';
import {CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';
import {plural} from './util.js';

const kindOptions = (p, x) => { const other = plateausOf(p).some(y => y.kind === 'current' && y.id !== x?.id); return PLATEAU_KINDS.map(k => [k, PLATEAU_WORDS[k] + (k === 'current' && other ? ' (already recorded)' : '')]); };
const plateauOptions = (p, none = 'Not set') => [['', none], ...plateausOf(p).map(x => [x.id, x.order + ' · ' + x.title + ' (' + PLATEAU_WORDS[x.kind] + ')'])];
const nameOf = (objects, id) => { const o = objects.find(o => o.id === id); return o ? o.ref + ' · ' + o.title : id; };
const word = (k, n) => '<span class="rv-word ' + k + '"><i aria-hidden="true">' + CHECK_GLYPHS[k] + '</i> ' + (n == null ? '' : n + ' ') + esc(CHECK_WORDS[k]) + '</span>';

// The Plateau select of the delivery action's editor: nothing until the roadmap holds a plateau.
export function actionPlateauField(p, a = {}) { return plateausOf(p).length ? recordField('review.action', 'plateauId', a?.plateauId || '', {options: plateauOptions(p, 'No plateau')}) : ''; }

export function plateauForm(p, x, {end}) {
  const P = plateausOf(p), next = P.length ? Math.max(...P.map(y => y.order)) + 1 : 1, hasCurrent = P.some(y => y.kind === 'current' && y.id !== x?.id);
  return '<form id="rv-plateau-form"><p>A plateau is one state of the design: the current state, a transition or the target, in an order of its own.</p>' + fPlateau('title',x?.title || '') + '<div class="l-form-grid">' + fPlateau('kind',x?.kind || (hasCurrent ? 'transition' : 'current'),{options:kindOptions(p, x)}) + fPlateau('order',String(x?.order || next)) + '</div>' + fPlateau('due',x?.due || '') + fPlateau('purpose',x?.purpose || '') + '<p class="l-note">One current state at most; orders are unique; a roadmap holds up to ' + ROADMAP_LIMITS.plateaus + ' plateaus. A due date is a plan, not a promise.</p>' + end(x ? 'Save plateau' : 'Add plateau') + '</form>';
}
export function removeForm(p, x) {
  const A = roadmapOf(p).assignments, objects = roadmapObjects(p), named = Object.keys(A).filter(id => A[id]?.introducedIn === x.id || A[id]?.retiredIn === x.id), acts = (p.finalReview?.actions || []).filter(a => a.plateauId === x.id), blocked = named.length || acts.length;
  return '<form id="rv-plateau-remove-form"><p><b>' + esc(x.title) + '</b> · ' + esc(PLATEAU_WORDS[x.kind]) + (x.due ? ' · due ' + esc(x.due) : '') + '</p>' + (blocked ? '<div class="l-gap-note">Clear what names it first: ' + (named.length ? plural(named.length, 'assignment') + ' (' + esc(named.slice(0, 6).map(id => nameOf(objects, id)).join(', ')) + ')' : '') + (named.length && acts.length ? ' and ' : '') + (acts.length ? plural(acts.length, 'action') + ' (' + esc(acts.map(a => a.id).join(', ')) + ')' : '') + '.</div>' : '<p>Nothing names this plateau. Removing it keeps its history entry.</p>') + '<div class="l-dialog-actions"><button type="button" class="btn" data-rv-action="close">Cancel</button><button type="submit" class="btn primary"' + (blocked ? ' disabled' : '') + '>Remove plateau</button></div></form>';
}
export function assignForm(p, {objectId = null, introducedIn = '', retiredIn = ''} = {}, {end}) {
  const objects = roadmapObjects(p), chosen = objects.find(o => o.id === objectId) || objects[0], a = chosen ? roadmapOf(p).assignments[chosen.id] : null;
  return '<form id="rv-plateau-assign-form"><p>Say where a record of Chapters 4–10 enters the design and where it leaves it. A record assigned to no plateau is present in every state.</p>' + recordField('review.plateau-assign','objectId',chosen?.id || '',{options:objects.map(o => [o.id, o.ref + ' · ' + o.title])}) + '<div class="l-form-grid">' + recordField('review.plateau-assign','introducedIn',a?.introducedIn || introducedIn || '',{options:plateauOptions(p)}) + recordField('review.plateau-assign','retiredIn',a?.retiredIn || retiredIn || '',{options:plateauOptions(p)}) + '</div><p class="l-note">Leave both unset to clear the assignment. A record is introduced before it is retired.</p>' + end('Save assignment') + '</form>';
}
// When the record changes in the Assign dialog, the two selects show that record's assignment (scoped to the form).
function wireAssign(p) {
  const f = document.querySelector('#rv-plateau-assign-form'); if (!f) return;
  f.addEventListener('change', e => { if (e.target.name !== 'objectId') return; const a = roadmapOf(p).assignments[e.target.value] || {}; f.elements.introducedIn.value = a.introducedIn || ''; f.elements.retiredIn.value = a.retiredIn || ''; });
}

// A Gap a person opened stays open when the stage is drawn again after a save (the desk keeps its folds the same way).
const openGaps = new Set();
if (typeof document !== 'undefined') document.addEventListener('toggle', e => { const d = e.target; if (!d?.matches?.('details.rv-pl-gap[data-gap]')) return; if (d.open) openGaps.add(d.dataset.gap); else openGaps.delete(d.dataset.gap); }, true);

// The Work stage: the table, the Gap per plateau, the assignments and the plan's checks.
export function roadmapStage(p, {B}) {
  const P = plateausOf(p), objects = roadmapObjects(p);
  const head = '<div class="rv-plateaus-head"><span class="eyebrow">Plateaus</span><h3>Current state, transitions and the target</h3><p>A plateau is one state of the design, in order. A record of Chapters 4–10 is introduced in one plateau and retired in another; a delivery action names the plateau it works towards. Readiness counts the records each plateau introduces, read from the chapters’ own checks; it approves nothing.</p></div>';
  const actions = '<div class="rv-actions">' + B('plateau-add', 'Add a plateau', 'primary') + (P.length && objects.length ? B('plateau-assign', 'Assign a record') : '') + '</div>';
  if (!P.length) return head + actions + '<div class="rv-empty rv-plateaus-empty"><h3>' + esc(NO_PLATEAUS) + '</h3><p>Add the current state first, then each transition and the target. The readings, the marks on the pictures and the SDD’s Transition section follow from what is recorded.</p></div>';
  const R = plateauReadiness(p), F = roadmapFindings(p), A = roadmapOf(p).assignments, acts = p.finalReview?.actions || [];
  const readiness = r => (r.state === 'none' ? '<span class="rv-pl-none">' + esc(r.words) + '</span>' : ['pass', 'fix', 'confirm'].filter(k => r.records[k]).map(k => word(k, r.records[k])).join('') + (r.records.unknown ? '<span class="rv-pl-none">' + r.records.unknown + ' not checked</span>' : ''));
  const row = (x, i) => { const r = R[i], M = plateauMarks(p, x.id); return '<tr data-plateau="' + esc(x.id) + '"><td class="rv-pl-order">' + x.order + '</td><th scope="row"><b>' + esc(x.title) + '</b><small>' + esc(x.id) + ' · ' + esc(PLATEAU_WORDS[x.kind]) + '</small></th><td>' + esc(x.due || '—') + '</td><td class="rv-pl-ready">' + readiness(r) + '<small>' + (r.introduced ? plural(r.introduced, 'record') + ' introduced here' : 'Nothing introduced here') + (r.retired ? ' · ' + plural(r.retired, 'record') + ' retired here' : '') + '</small></td><td>' + M.info.actions.length + '</td><td class="rv-pl-actions">' + B('plateau-edit', 'Edit', '', {'data-rv-id': x.id}) + B('plateau-assign', 'Assign', '', {'data-rv-plateau': x.id}) + B('plateau-remove', 'Remove', '', {'data-rv-id': x.id}) + '</td></tr>'; };
  const gap = (x, i) => {
    const M = plateauMarks(p, x.id), prev = i ? P[i - 1] : null, mine = acts.filter(a => a.plateauId === x.id);
    const list = ids => (ids.length ? '<ul>' + ids.map(id => '<li>' + esc(nameOf(objects, id)) + ' ' + B('plateau-assign', 'Change', 'text-button', {'data-rv-id': id}) + '</li>').join('') + '</ul>' : '<p>Nothing.</p>');
    return '<details class="rv-pl-gap" data-gap="' + esc(x.id) + '"' + (openGaps.has(x.id) ? ' open' : '') + '><summary><b>Gap</b> · ' + esc(prev ? prev.title + ' → ' + x.title : x.title + ' (' + PLATEAU_WORDS[x.kind] + ')') + '<small>' + plural(M.info.introduced.length, 'record') + ' introduced here · ' + plural(M.info.retired.length, 'record') + ' retired here · ' + plural(mine.length, 'action') + '</small></summary><div class="rv-pl-gap-body"><section><h4>Introduced here</h4>' + list(M.info.introduced) + '</section><section><h4>Retired here</h4>' + list(M.info.retired) + '</section><section><h4>Actions</h4>' + (mine.length ? '<ul>' + mine.map(a => '<li>' + esc(a.id + ' · ' + a.title) + '<small>' + esc(a.status) + (a.owner ? ' · ' + esc(a.owner) : '') + (a.due ? ' · due ' + esc(a.due) : '') + '</small> ' + B('action', 'Edit', 'text-button', {'data-rv-id': a.id}) + '</li>').join('') + '</ul>' : '<p>No action names this plateau yet. ' + B('action', 'New delivery action', 'text-button') + '</p>') + '</section></div></details>';
  };
  const rows = Object.entries(A).filter(([id, a]) => a && objects.some(o => o.id === id)).sort(([a], [b]) => a.localeCompare(b));
  const assignments = rows.length
    ? '<details class="rv-pl-assignments" open><summary><b>Assignments</b> · ' + plural(rows.length, 'record') + '</summary><div class="rv-plateaus"><table class="rv-pl-table"><thead><tr><th scope="col">Record</th><th scope="col">Introduced in</th><th scope="col">Retired in</th><th scope="col">Change</th></tr></thead><tbody>' + rows.map(([id, a]) => '<tr data-assignment="' + esc(id) + '"><th scope="row">' + esc(nameOf(objects, id)) + '</th><td>' + esc(plateauOf(p, a.introducedIn)?.title || '—') + '</td><td>' + esc(plateauOf(p, a.retiredIn)?.title || '—') + '</td><td>' + B('plateau-assign', 'Change', '', {'data-rv-id': id}) + '</td></tr>').join('') + '</tbody></table></div></details>'
    : '<p class="l-note">No record is assigned yet, so every record is present in every state. Assign a record to say where it is introduced and where it is retired.</p>';
  const findings = F.length
    ? '<div class="rv-pl-findings"><h4>The plan’s checks · ' + plural(F.length, 'item') + ' to confirm</h4><ul>' + F.map(f => '<li data-roadmap-finding="' + esc(f.id) + '">' + word('confirm') + ' <b>' + esc(f.title) + '</b><small>' + esc(f.detail) + '</small></li>').join('') + '</ul></div>'
    : '<p class="rv-pl-clear">' + word('pass') + ' Every transition and target has an action, every introduced record is planned, and the orders hold.</p>';
  return head + actions + '<div class="rv-plateaus"><table class="rv-pl-table"><caption>Plateaus in order</caption><thead><tr><th scope="col">Order</th><th scope="col">Plateau</th><th scope="col">Due</th><th scope="col">Readiness</th><th scope="col">Actions</th><th scope="col">Edit</th></tr></thead><tbody>' + P.map(row).join('') + '</tbody></table></div>' + P.map(gap).join('') + assignments + findings;
}

// The stage's buttons (review-ui.js routes every data-rv-action="plateau-…" here) and its forms.
export function roadmapAction(a, b, {project, dialog, end}) {
  const p = project();
  switch (a) {
    case 'plateau-add': dialog('Add a plateau', plateauForm(p, null, {end}), 'plateau', {id: null}); return true;
    case 'plateau-edit': { const x = plateauOf(p, b.dataset.rvId); if (x) dialog('Edit ' + x.id + ' · ' + x.title, plateauForm(p, x, {end}), 'plateau', {id: x.id}); return true; }
    case 'plateau-remove': { const x = plateauOf(p, b.dataset.rvId); if (x) dialog('Remove ' + x.id + ' · ' + x.title, removeForm(p, x), 'plateau-remove', {id: x.id}); return true; }
    case 'plateau-assign': dialog('Assign a record to plateaus', assignForm(p, {objectId: b.dataset.rvId || null, introducedIn: b.dataset.rvPlateau || ''}, {end}), 'plateau-assign', {}); wireAssign(p); return true;
  }
  return false;
}
export async function roadmapSubmit(f, raw, {send, context}) {
  if (f.id === 'rv-plateau-form') { await send('plateau', {id: context.id || null, title: raw.title, kind: raw.kind, order: Number(raw.order), purpose: raw.purpose, due: raw.due}, context.id ? 'Plateau saved.' : 'Plateau added.'); return true; }
  if (f.id === 'rv-plateau-remove-form') { await send('plateau-remove', {id: context.id}, 'Plateau removed.'); return true; }
  if (f.id === 'rv-plateau-assign-form') { await send('plateau-assign', {objectId: raw.objectId, introducedIn: raw.introducedIn || null, retiredIn: raw.retiredIn || null}, 'Assignment saved.'); return true; }
  return false;
}
// The build-up mode "By plateau" (Contract F's registry, when the notation provides it): one step per plateau, in
// order, each with the marks plateauMarks gives.
if (typeof window !== 'undefined') window.aiwNotationSteps?.register('plateau', {title: 'By plateau', steps: plateauSteps});
