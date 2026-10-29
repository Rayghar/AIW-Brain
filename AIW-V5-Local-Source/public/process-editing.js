// Process editing (round 5, R5-C). The process picture's own authoring, in the companion of whatever draws the process:
// the Process perspective (perspective-view.js) and Chapter 1's Model, which draws the journey as a process. Choose the
// scenario the picture traces, add a process object (task, gateway, event or account), connect two with the condition
// that selects the path, record a source claim, and edit or remove what the architect recorded. Every change is a
// process command (process-model.js; edits of a process object through architecture-commands.js) and is reviewed in its
// dialog before it applies (workbench-ui.js reviewChangeInDialog: the reviewed workspace change). A reference route is
// illustrative: it is traced and claimed against, never edited or removed. A frozen design state is read, not changed.
import {architectureModel} from './architecture-model.js';
import {architectureEditCommand} from './architecture-commands.js';
import {processScenarios, processConflicts, processSourceQuestions, describeWalkStep, EVENT_TYPES, EVENT_POSITIONS, GATEWAY_TYPES, TRANSITION_KINDS} from './process-model.js';
import {modal, reviewChangeInDialog} from './workbench-ui.js';
import {projectURL, onProjectSwitch} from './project-context.js';
import {list} from './util.js';
import {esc} from './html-escape.js';
import {kitFor} from './record-fields.js';
// The field kit, bound to this studio's record types (record-fields.js).
const fElement=kitFor('process.element');const fTransition=kitFor('process.transition');const fClaim=kitFor('process.claim');const fRetire=kitFor('record.retire');

const PROCESS = ['journey', 'task', 'gateway', 'event', 'account', 'subprocess', 'dataObject'];
const KIND_WORDS = {task: 'Task · work performed', gateway: 'Gateway · a decision', event: 'Event · something that happens', account: 'Account · owned business data', subprocess: 'Sub-process · a task that holds a process', data: 'Data object · a data definition the process reads or writes'};
// The plain words of the semantics (round 6, Contract T): the dialogs offer them, the companion reads them.
const EVENT_TYPE_WORDS = {none: 'Plain · nothing in particular', message: 'Message · a message arrives or is sent', timer: 'Timer · a time is reached', error: 'Error · something went wrong', signal: 'Signal · a broadcast'};
const POSITION_WORDS = {start: 'At the start · the process begins here', intermediate: 'In the middle · on the way', end: 'At the end · the process ends here', boundary: 'On the edge of a task · it interrupts the task'};
const GATEWAY_WORDS = {exclusive: 'Exclusive · one path is taken', parallel: 'Parallel · every path is taken', inclusive: 'Inclusive · one or more paths are taken', event: 'Event-based · the first event to happen decides'};
const FLOW_WORDS = {sequence: 'Sequence flow · the next step in the same pool', message: 'Message flow · a message across pools, carrying a contract'};
// The scenario the process pictures trace (one choice for the project on screen), and a trace another chapter asked for.
let scenario = 'confirmed', trace = null;
onProjectSwitch(() => { scenario = 'confirmed'; trace = null; });

// ---------------------------------------------------------------- what is traced and what is recorded

export const processScenario = p => { const paths = p ? processScenarios(p) : []; return paths.find(x => x.id === scenario) || paths[0] || null; };
export function chooseScenario(id) { scenario = String(id || 'confirmed'); }
// Another chapter's "trace this outcome": the scenario to trace and the element to select when the process is next drawn.
export function traceProcess({scenario: id = 'uncertain', selectedId = null} = {}) { chooseScenario(id); trace = {selectedId}; }
export function takeTrace() { const t = trace; trace = null; return t; }
// The chosen scenario in a drawn picture (notation-model.js): its elements, and the drawn flows between consecutive ones.
export function scenarioIn(D, p) {
  const s = processScenario(p); if (!s || !D) return null;
  const drawn = new Set(D.nodes.map(n => n.id));
  const edges = s.ids.slice(1).map((to, i) => D.edges.find(e => e.from === s.ids[i] && e.to === to)?.id).filter(Boolean);
  return {id: s.id, title: s.title, nodes: new Set(s.ids.filter(id => drawn.has(id))), edges: new Set(edges)};
}
// Marks the traced path on the picture on screen (presentation only: the picture is the notation kit's).
// Round 10: a process picture draws no lines together (notation-layout.js NO_BUNDLE_SCENES, BPMN lanes and flows), so
// every flow keeps its own g[data-nt-edge] whole and marking it marks its whole route; there is no shared trunk to paint.
export function paintScenario(svg, D, p) {
  if (!svg) return;
  const on = scenarioIn(D, p);
  svg.classList.toggle('pe-tracing', !!on);
  for (const g of svg.querySelectorAll('g[data-nt-node], g[data-nt-edge]')) {
    const node = g.dataset.ntNode;
    g.classList.toggle('pe-on', !!on && (node != null ? on.nodes.has(node) : on.edges.has(g.dataset.ntEdge)));
  }
}
// ---------------------------------------------------------------- the token walk (round 6, Contract T)
// "Walk this scenario": a token moves along the chosen scenario's path. The element it stands on is painted `traced` and
// every other element of the process `dimmed`, through the marks channel (source `walk`), so every picture of the process
// paints it the same way; the step's words read in the companion; Escape clears. Presentation only: nothing is written.
let walk = null, walkTimer = null, walkKeys = false;
const WALK_MS = 1600;
export const processWalk = () => (walk ? {...walk} : null);
const marksChannel = () => (typeof window !== 'undefined' ? window.aiwModelMarks : null);
function paintWalk(p) {
  const ch = marksChannel(); if (!ch) return;
  if (!walk) { ch.clear('walk'); return; }
  const here = walk.ids[walk.i], M = architectureModel(p), marks = [];
  for (const o of M.objects.values()) if (PROCESS.includes(o.type) && o.id !== here) marks.push({id: o.id, state: 'dimmed', note: 'Not where the token is'});
  marks.push({id: here, state: 'traced', note: describeWalkStep(p, walk.ids, walk.i)});
  ch.set('walk', marks, {words: {traced: 'The token is here', dimmed: 'Where the token is not'}, scenario: walk.scenario, step: walk.i + 1, of: walk.ids.length});
}
function keyWalk(e) { if (e.key === 'Escape' && walk) { clearWalk(); e.preventDefault(); } }
export function clearWalk() {
  const refresh = walk?.refresh;
  if (walkTimer) clearInterval(walkTimer); walkTimer = null; walk = null;
  marksChannel()?.clear('walk');
  if (walkKeys && typeof document !== 'undefined') { document.removeEventListener('keydown', keyWalk); walkKeys = false; }
  refresh?.();
}
export function startWalk(p, {refresh = null} = {}) {
  const s = processScenario(p); if (!s || !s.ids.length) return null;
  if (walkTimer) clearInterval(walkTimer); walkTimer = null;
  walk = {scenario: s.id, title: s.title, ids: s.ids, i: 0, playing: false, refresh};
  if (!walkKeys && typeof document !== 'undefined') { document.addEventListener('keydown', keyWalk); walkKeys = true; }
  paintWalk(p); refresh?.(); return processWalk();
}
export function stepWalk(p, by = 1) {
  if (!walk) return startWalk(p);
  walk.i = Math.max(0, Math.min(walk.ids.length - 1, walk.i + by));
  if (walk.i >= walk.ids.length - 1 && walkTimer) { clearInterval(walkTimer); walkTimer = null; walk.playing = false; }
  paintWalk(p); walk.refresh?.(); return processWalk();
}
export function playWalk(p, {refresh = null} = {}) {
  if (!walk) startWalk(p, {refresh}); if (!walk) return null;
  if (walkTimer) { clearInterval(walkTimer); walkTimer = null; walk.playing = false; walk.refresh?.(); return processWalk(); }
  if (walk.i >= walk.ids.length - 1) walk.i = 0;
  walk.playing = true; paintWalk(p); walk.refresh?.();
  walkTimer = setInterval(() => { if (!walk) { clearInterval(walkTimer); walkTimer = null; return; } stepWalk(p, 1); }, WALK_MS);
  return processWalk();
}
onProjectSwitch(() => clearWalk());
// The walk's controls and its words: Walk this scenario, then Back, Next, Play or Pause and Stop, with the step read out.
function walkHTML(p) {
  const s = processScenario(p); if (!s) return '';
  if (!walk || walk.scenario !== s.id) return `<p class="cm-acts">${B('walk', 'Walk this scenario', `aria-label="Walk ${esc(s.title)} one element at a time"`)}</p>`;
  const words = describeWalkStep(p, walk.ids, walk.i);
  return `<div class="pe-walk" role="group" aria-label="Walking ${esc(s.title)}"><p class="cm-acts">${B('walk-back', 'Back', `aria-label="Previous element"${walk.i <= 0 ? ' disabled' : ''}`)}${B('walk-next', 'Next', `aria-label="Next element"${walk.i >= walk.ids.length - 1 ? ' disabled' : ''}`)}${B('walk-play', walk.playing ? 'Pause' : 'Play', `aria-pressed="${walk.playing}"`)}${B('walk-stop', 'Stop', 'aria-label="Stop the walk (Escape)"')}</p><p class="pe-walk-text" role="status" aria-live="polite">${esc(words)}</p></div>`;
}

// A record the architect added to the process: a process object, a conditional path or a source claim.
export function processRecord(p, id) {
  const m = p?.processModel; if (!m || !id) return null;
  for (const [kind, rows] of [['element', m.elements], ['transition', m.transitions], ['claim', m.claims]]) { const record = list(rows).find(x => x.id === id); if (record) return {kind, record}; }
  return null;
}
export const processRemoveCommand = id => ({type: 'process.remove', payload: {id}});
// Round 12 (GR-GOV-24): a process object or a claim is a record of Chapter 1 and leaves the design through the one retire
// path, with why (restorable); a path is a link, and removing it stays an edit (process.remove).
export const processRetireCommand = (id, reason) => ({type: 'record.retire', payload: {ids: [id], chapter: 1, reason}});
export function processElementCommand(raw) { const {requirementId = '', ...rest} = raw; for (const k of ['eventType', 'position', 'attachedTo', 'gatewayType', 'parentId', 'partyId', 'dataId']) if (rest[k] === '') delete rest[k]; return {type: 'process.element', payload: {...rest, requirementIds: requirementId ? [requirementId] : list(rest.requirementIds)}}; }
export const processTransitionCommand = (raw, old = null) => ({type: 'process.transition', payload: {...raw, id: old?.id}});
export const processClaimCommand = (raw, subjectId, old = null) => ({type: 'process.claim', payload: {...raw, id: old?.id, subjectId: old?.subjectId || subjectId}});

// ---------------------------------------------------------------- the companion

const B = (k, label, attrs = '') => `<button type="button" class="cm-btn" data-pe="${k}" ${attrs}>${label}</button>`;
const offWhen = frozen => (frozen ? ' disabled title="A frozen design state is read, not changed"' : '');
const claimHTML = (c, frozen) => `<div class="pe-claim"><p><b>${esc(c.topic)}</b>: ${esc(c.statement)}<br><small>${esc(c.source)} · ${esc(c.sourceLocator)} · Needs review</small></p><p class="cm-acts">${B('claim', 'Revise', `data-id="${esc(c.id)}" aria-label="Revise the claim ${esc(c.topic)}"` + offWhen(frozen))}${B('remove', 'Remove', `data-id="${esc(c.id)}" aria-label="Remove the claim ${esc(c.topic)}"` + offWhen(frozen))}</p></div>`;

// The process guide: the scenario the picture traces and its steps in order, and what can be added.
export function processGuideHTML(p, {selectedId = null, frozen = false} = {}) {
  if (!p) return '';
  const paths = processScenarios(p), active = processScenario(p), claims = list(p.processModel?.claims), conflicts = processConflicts(p), M = architectureModel(p), bank = paths.some(x => x.id === 'confirmed');
  const steps = active ? `<ol class="pe-steps" aria-label="${esc(active.title)}: its steps">${active.ids.map((id, i) => { const o = M.objects.get(id); return `<li><button type="button" class="pe-step" data-pe="step" data-id="${esc(id)}" aria-current="${id === selectedId ? 'step' : 'false'}"><span aria-hidden="true">${i + 1}</span><b>${esc(o?.title || id)}</b><small>${esc(o?.type === 'gateway' ? 'Decision' : o?.type === 'event' ? 'Outcome' : o?.record?.owner || 'Journey step')}</small></button></li>`; }).join('')}</ol>` : '';
  return `<section class="pe-guide" aria-label="Process"><h4 aria-level="3">Process${bank ? ' · how the payment reaches its outcome' : paths.length ? ' · its paths from start to end' : ''}</h4>
   <p>${bank ? 'Choose a scenario to trace its path on the picture; select a step for its conditions and evidence. The reference routes are illustrative.' : paths.length ? 'Choose a path to trace it on the picture, or walk it one element at a time; select an element for its conditions and evidence.' : 'The recorded journey and its conditional paths. Add a process object or a flow where the journey branches; a start and an end event give a token somewhere to go.'}</p>
   ${paths.length ? `<div class="pe-scenarios" role="group" aria-label="Scenario">${paths.map(x => B('scenario', esc(x.title), `data-id="${esc(x.id)}" aria-pressed="${x.id === active?.id}"`)).join('')}</div>${steps}${walkHTML(p)}` : ''}
   <p class="cm-acts">${B('new', 'Add process object', offWhen(frozen))}${B('connect', 'Connect with a flow', (selectedId ? `data-from="${esc(selectedId)}"` : '') + offWhen(frozen))}</p>
   <p class="cm-muted">${claims.length} source claim${claims.length === 1 ? '' : 's'} recorded · ${conflicts.length} topic${conflicts.length === 1 ? '' : 's'} to reconcile. A change is reviewed before it applies, and recording a claim never approves it.</p></section>`;
}
// The selected process object or path: its question, linked requirements, source questions and claims, and what may be
// changed. Empty for anything that is not part of the process.
export function processDetailsHTML(p, {id = null, edgeId = null, frozen = false} = {}) {
  if (!p) return '';
  const M = architectureModel(p), claims = list(p.processModel?.claims), off = offWhen(frozen);
  if (edgeId) {
    const t = M.relationships.find(e => e.id === edgeId && (e.type === 'sequence' || e.type === 'message')); if (!t) return '';
    const mine = processRecord(p, edgeId)?.kind === 'transition', on = claims.filter(c => c.subjectId === edgeId), contract = t.attributes?.contractId ? M.objects.get(t.attributes.contractId) : null;
    return `<section class="pe-details" aria-label="This path"><h4 aria-level="3">${t.type === 'message' ? 'Message flow' : 'Path'} · ${esc(t.label || 'condition')}</h4><p>${esc(M.objects.get(t.from)?.title || t.from)} → ${esc(M.objects.get(t.to)?.title || t.to)}${t.attributes?.condition ? `<br><small>Condition: ${esc(t.attributes.condition)}</small>` : ''}${contract ? `<br><small>Carries ${esc(contract.ref || contract.id)} · ${esc(contract.title)}</small>` : ''}</p>${mine ? '' : '<p class="cm-muted">An illustrative route: record a source claim for it, or add a reviewed path of your own.</p>'}
     <h5 aria-level="4">Evidence for this condition · ${on.length}</h5>${on.map(c => claimHTML(c, frozen)).join('') || '<p class="cm-muted">No source claim is recorded for this path yet.</p>'}
     <p class="cm-acts">${B('claim', 'Record a source claim', `data-subject="${esc(edgeId)}"` + off)}${mine ? B('edit-path', 'Edit the condition', `data-id="${esc(edgeId)}"` + off) + B('remove', 'Remove the path', `data-id="${esc(edgeId)}"` + off) : ''}</p></section>`;
  }
  const o = id && M.objects.get(id); if (!o || !PROCESS.includes(o.type)) return '';
  const questions = processSourceQuestions(p, id), on = claims.filter(c => c.subjectId === id), mine = processRecord(p, id)?.kind === 'element';
  const conflicting = processConflicts(p).some(g => g.some(c => c.subjectId === id));
  const reqIds = o.type === 'journey' ? list(p.relationships).filter(e => e.from === id && e.kind === 'requires').map(e => e.to) : list(o.attributes?.requirementIds);
  const ask = o.type === 'gateway' ? 'Which condition selects each path, and who decides?' : o.type === 'event' ? 'What evidence establishes this outcome?' : o.type === 'dataObject' ? 'Which steps read or write it, and who is its authority?' : 'Which requirement authorises this step, and what is its next permitted outcome?';
  const r = o.record || {}, name = x => M.objects.get(x)?.title || list(p.interfaces?.parties).find(y => y.id === x)?.title || list(p.interfaces?.data).find(y => y.id === x)?.title || x;
  const semantics = [o.type === 'event' ? `${(POSITION_WORDS[r.position] || POSITION_WORDS.intermediate).split(' · ')[0]}${r.eventType && r.eventType !== 'none' ? ' · ' + EVENT_TYPE_WORDS[r.eventType].split(' · ')[0].toLowerCase() + ' event' : ' event'}` : '', o.type === 'gateway' ? (GATEWAY_WORDS[r.gatewayType] || GATEWAY_WORDS.exclusive).split(' · ')[0] + ' gateway' : '', r.attachedTo ? 'Attached to ' + name(r.attachedTo) : '', r.parentId ? 'Inside ' + name(r.parentId) : '', r.partyId ? 'In the pool of ' + name(r.partyId) : '', r.dataId ? 'Stands for ' + name(r.dataId) : ''].filter(Boolean);
  return `<section class="pe-details" aria-label="Its place in the process"><h4 aria-level="3">In the process</h4><p>${esc(ask)}</p>${semantics.length ? `<p class="pe-semantics">${semantics.map(esc).join(' · ')}</p>` : ''}${o.record?.origin === 'reference' ? '<p class="cm-muted">An illustrative route: record a source claim for it, or add a reviewed process object of your own.</p>' : ''}
   ${reqIds.length ? `<h5 aria-level="4">Linked requirements</h5>${reqIds.map(r => { const a = list(p.artefacts).find(x => x.id === r); return `<p><a href="${esc(projectURL('/?chapter=1&tab=work&artefact=' + encodeURIComponent(r)))}">${esc(r + ' · ' + (a?.title || 'Requirement'))}</a></p>`; }).join('')}` : ''}
   ${questions.map(q => `<div class="pe-question"><b>${esc(q.topic)} · ${esc(q.status)}</b><p>${esc(q.question)}</p><small>${q.sources.map(esc).join(' · ')}</small></div>`).join('')}
   <h5 aria-level="4">Source claims · ${on.length}</h5>${on.map(c => claimHTML(c, frozen)).join('') || '<p class="cm-muted">No claim is recorded for it yet.</p>'}${conflicting ? '<p class="pe-conflict">Statements differ. Inspect the sources and their level of abstraction before choosing a route.</p>' : ''}
   <p class="cm-acts">${B('claim', 'Record a source claim', `data-subject="${esc(id)}"` + off)}${o.type === 'dataObject' ? '' : B('connect', 'Connect with a flow', `data-from="${esc(id)}"` + off)}${mine ? B('edit', 'Edit', `data-id="${esc(id)}"` + off) + B('remove', 'Remove', `data-id="${esc(id)}"` + off) : ''}</p></section>`;
}

// ---------------------------------------------------------------- the dialogs

// Handles a [data-pe] control. `ctx`: {project() — the working design, frozen, select(id), refresh()}. True when handled.
export function processAction(b, ctx) {
  const k = b?.dataset?.pe; if (!k) return false;
  if (k === 'scenario') { chooseScenario(b.dataset.id); if (walk) clearWalk(); ctx.refresh?.(); return true; }
  if (k === 'step') { ctx.select?.(b.dataset.id); return true; }
  // The walk reads the saved design; a frozen state can be walked too.
  if (k.startsWith('walk')) {
    const p = ctx.project?.(); if (!p) return true;
    const refresh = () => ctx.refresh?.();
    if (k === 'walk') startWalk(p, {refresh}); else if (k === 'walk-next') stepWalk(p, 1); else if (k === 'walk-back') stepWalk(p, -1); else if (k === 'walk-play') playWalk(p, {refresh}); else if (k === 'walk-stop') clearWalk();
    return true;
  }
  const p = ctx.project?.(); if (!p || ctx.frozen) return true;
  if (k === 'new') addElement(p, ctx);
  else if (k === 'connect') connect(p, ctx, {from: b.dataset.from || null});
  else if (k === 'edit-path') connect(p, ctx, {old: processRecord(p, b.dataset.id)?.record || null});
  else if (k === 'claim') claim(p, ctx, b.dataset.id ? processRecord(p, b.dataset.id)?.record : null, b.dataset.subject);
  else if (k === 'edit') edit(p, ctx, b.dataset.id);
  else if (k === 'remove') remove(p, ctx, b.dataset.id);
  else return false;
  return true;
}
// The form gives way to the review of exactly what changes; applying it sends the reviewed workspace change.
// `select`: 'added' selects the new process object; an id (or '' for none) is selected; left out, the selection stays.
async function send(d, ctx, command, {title, intro = '', select}) {
  const store = window.aiwProjectStore; if (!store?.command) { d.error('Open the project to change it.'); return; }
  const before = ctx.project(); let cmd;
  try { cmd = await reviewChangeInDialog(d, before, command, {title, always: true, intro}); } catch (err) { d.error(err); return; }
  if (!cmd || cmd === command) return;
  const submit = d.querySelector('form [type=submit]'); if (submit) submit.disabled = true;
  try {
    const had = new Set(['elements', 'transitions', 'claims'].flatMap(n => list(before.processModel?.[n]).map(x => x.id)));
    await store.command(cmd);
    d.closeView();
    document.dispatchEvent(new CustomEvent('aiw:external-project'));
    const after = store.value?.document, added = ['elements', 'transitions', 'claims'].flatMap(n => list(after?.processModel?.[n])).find(x => !had.has(x.id));
    if (select === 'added') { if (added && !added.subjectId && !added.from) ctx.select?.(added.id); else ctx.refresh?.(); }
    else if (select !== undefined) ctx.select?.(select || null); else ctx.refresh?.();
  } catch (err) { if (submit) submit.disabled = false; d.error(err); }
}
function onSubmit(d, fn) { const f = d.querySelector('form'); f.addEventListener('submit', e => { e.preventDefault(); try { fn(Object.fromEntries(new FormData(f))); } catch (err) { d.error(err); } }); }
// The semantics each meaning asks for (round 6): an event's type and place (and the task it hangs on), a gateway's type,
// a sub-process to sit inside, an external participant's pool, the data definition a data object stands for.
function semanticsHTML(p, M, r = {}) {
  const tasks = [...M.objects.values()].filter(o => ['journey', 'task', 'subprocess'].includes(o.type) && !String(o.source).startsWith('model.context.') && o.id !== r.id).map(o => [o.id, o.title + ' · ' + o.id]);
  const subs = [...M.objects.values()].filter(o => o.type === 'subprocess' && o.id !== r.id).map(o => [o.id, o.title + ' · ' + o.id]);
  const parties = list(p.interfaces?.parties).map(x => [x.id, (x.ref ? x.ref + ' · ' : '') + x.title]), data = list(p.interfaces?.data).map(x => [x.id, (x.ref ? x.ref + ' · ' : '') + x.title]);
  return `<fieldset class="pe-sem" data-pe-for="event"><legend>For an event</legend>${fElement('eventType', r.eventType || 'none', {options: EVENT_TYPES.map(k => [k, EVENT_TYPE_WORDS[k]])})}${fElement('position', r.position || 'intermediate', {options: EVENT_POSITIONS.map(k => [k, POSITION_WORDS[k]])})}${fElement('attachedTo', r.attachedTo || '', {options: [['', 'Not attached'], ...tasks]})}</fieldset>
   <fieldset class="pe-sem" data-pe-for="gateway"><legend>For a gateway</legend>${fElement('gatewayType', r.gatewayType || 'exclusive', {options: GATEWAY_TYPES.map(k => [k, GATEWAY_WORDS[k]])})}</fieldset>
   <fieldset class="pe-sem" data-pe-for="task gateway event subprocess"><legend>Where it stands</legend>${fElement('parentId', r.parentId || '', {options: [['', 'Not inside a sub-process'], ...subs]})}${fElement('partyId', r.partyId || '', {options: [['', 'Our process'], ...parties]})}</fieldset>
   <fieldset class="pe-sem" data-pe-for="data"><legend>For a data object</legend>${fElement('dataId', r.dataId || '', {options: [['', 'Choose one'], ...data]})}</fieldset>`;
}
// The fieldsets that do not apply to the chosen meaning are hidden (their values are dropped by the command).
function watchKind(d) {
  const sel = d.querySelector('select[name="kind"]'); if (!sel) return;
  const show = () => { for (const fs of d.querySelectorAll('[data-pe-for]')) fs.hidden = !fs.dataset.peFor.split(' ').includes(sel.value); };
  sel.addEventListener('change', show); show();
}
function addElement(p, ctx) {
  const reqs = list(p.artefacts).filter(a => a.type === 'requirement'), comps = list(p.realisation?.components), M = architectureModel(p);
  const d = modal('Add to this process', `<form id="pe-element-form">
   ${fElement('kind', 'task', {options: Object.entries(KIND_WORDS)})}${fElement('title','')}${fElement('purpose','')}${fElement('lane','')}${fElement('owner','')}${fElement('source','')}${fElement('sourceLocator','')}
   ${semanticsHTML(p, M)}
   ${fElement('requirementId', '', {options: [['', 'Choose later'], ...reqs.map(a => [a.id, a.id + ' · ' + a.title])]})}
   <fieldset class="pe-sem" data-pe-for="account"><legend>For an account</legend>${fElement('authorityId', '', {options: [['', 'Not assigned'], ...comps.map(c => [c.id, c.title])]})}</fieldset>
   <p class="cm-muted">A working definition: link a requirement and record the source condition before relying on it. An account also appears in Data.</p><button class="btn primary" type="submit">Review the process object</button></form>`);
  watchKind(d);
  onSubmit(d, raw => send(d, ctx, processElementCommand(raw), {title: 'Review the new process object', select: 'added'}));
}
function connect(p, ctx, {from = null, old = null} = {}) {
  const M = architectureModel(p), objects = [...M.objects.values()].filter(o => ['journey', 'task', 'event', 'gateway', 'subprocess'].includes(o.type) && !(o.type === 'journey' && String(o.source).startsWith('model.context.')));
  const rows = objects.map(o => [o.id, o.title + ' · ' + o.id]), start = old?.from || (objects.some(o => o.id === from) ? from : objects[0]?.id);
  const contracts = list(p.interfaces?.contracts).map(c => [c.id, (c.ref ? c.ref + ' · ' : '') + c.title]);
  const d = modal(old ? 'Revise the flow' : 'Connect two process objects', `<form id="pe-transition-form">
   ${fTransition('kind', old?.kind || 'sequence', {options: TRANSITION_KINDS.map(k => [k, FLOW_WORDS[k]])})}
   ${fTransition('from', start, {options: rows})}${fTransition('to', old?.to || objects.find(o => o.id !== start)?.id, {options: rows})}
   ${fTransition('label',old?.label)}${fTransition('condition',old?.condition)}${fTransition('contractId', old?.contractId || '', {options: [['', 'None'], ...contracts]})}${fTransition('owner',old?.owner)}${fTransition('source',old?.source)}${fTransition('sourceLocator',old?.sourceLocator)}
   <p class="cm-muted">A sequence flow is the next step inside one pool; a message flow crosses into an external participant's pool and names the contract it carries. Out of a gateway, write the condition that selects the path; an uncertain result needs an explicit recovery or enquiry responsibility.</p><button class="btn primary" type="submit">Review the flow</button></form>`);
  onSubmit(d, raw => send(d, ctx, processTransitionCommand(raw, old), {title: 'Review the flow', intro: `<p>${esc(old ? 'Revises' : 'Adds')} the ${raw.kind === 'message' ? 'message flow' : 'path'} ${esc(M.objects.get(raw.from)?.title || raw.from)} → ${esc(M.objects.get(raw.to)?.title || raw.to)}: ${esc(raw.label)}${raw.condition ? ', when ' + esc(raw.condition) : ''}${raw.contractId ? ', carrying ' + esc(M.objects.get(raw.contractId)?.ref || raw.contractId) : ''}.</p>`}));
}
function claim(p, ctx, old, subjectId) {
  const M = architectureModel(p), subject = old?.subjectId || subjectId, known = M.objects.has(subject) || M.relationships.some(e => e.id === subject);
  if (!known) return;
  const d = modal((old ? 'Revise' : 'Record') + ' a source claim', `<form id="pe-claim-form">${fClaim('topic',old?.topic)}${fClaim('statement',old?.statement)}${fClaim('source',old?.source)}${fClaim('sourceLocator',old?.sourceLocator)}${fClaim('owner',old?.owner)}
   <p class="cm-muted">A recorded claim stays unreviewed. Claims that differ on the same topic stay visible together. Recording one does not approve the source or certify an implementation.</p><button class="btn primary" type="submit">Review the source claim</button></form>`);
  onSubmit(d, raw => send(d, ctx, processClaimCommand(raw, subject, old), {title: 'Review the source claim', intro: `<p>${esc(old ? 'Revises' : 'Records')} a claim on ${esc(M.objects.get(subject)?.title || M.relationships.find(e => e.id === subject)?.label || subject)}: ${esc(raw.topic)}.</p>`}));
}
// An edit of a process object: its words through the shared quick edit (architecture-commands.js), or — when a field of
// its semantics changed (round 6) — the whole record through its own process command, so the meaning is reviewed too.
function edit(p, ctx, id) {
  const r = processRecord(p, id); if (r?.kind !== 'element') return;
  const o = r.record, M = architectureModel(p), semantic = !['account'].includes(o.kind);
  const d = modal('Edit ' + o.title, `<form id="pe-element-form"><input type="hidden" name="kind" value="${esc(o.kind)}">${fElement('title',o.title)}${fElement('purpose',o.purpose)}${fElement('owner',o.owner)}
   ${semantic ? semanticsHTML(p, M, o) : ''}
   <p class="cm-muted">Stable identity: ${esc(o.id)}. Its source, lane, links and paths are kept. A changed meaning can make an earlier review historical.</p><button class="btn primary" type="submit">Review the change</button></form>`);
  watchKind(d);
  onSubmit(d, raw => {
    const {kind, ...rest} = raw, keys = ['eventType', 'position', 'attachedTo', 'gatewayType', 'parentId', 'partyId', 'dataId'];
    const changed = keys.some(k => k in rest && String(rest[k] ?? '') !== String(o[k] ?? ''));
    const words = {title: rest.title, purpose: rest.purpose, owner: rest.owner};
    const cmd = changed ? processElementCommand({...o, ...words, ...Object.fromEntries(keys.filter(k => k in rest).map(k => [k, rest[k]])), kind: o.kind}) : architectureEditCommand(p, id, words);
    send(d, ctx, cmd, {title: 'Review the process object', select: id});
  });
}
function remove(p, ctx, id) {
  const r = processRecord(p, id); if (!r) return;
  const what = r.kind === 'element' ? r.record.title : r.kind === 'transition' ? 'the path ' + (r.record.label || r.record.id) : 'the claim ' + r.record.topic;
  if (r.kind === 'transition') {
    const d = modal('Remove ' + what, `<form><p>Removes ${esc(what)} from the process. The process objects it joins stay.</p><p class="cm-muted">The review shows exactly what goes before anything is removed.</p><button class="btn primary" type="submit">Review the removal</button></form>`);
    onSubmit(d, () => send(d, ctx, processRemoveCommand(id), {title: 'Review the removal', intro: `<p>Removes ${esc(what)} (${esc(id)}).</p>`, select: ''}));
    return;
  }
  // A process object or a claim retires with why: it is kept with who and when, and can be restored from Chapter 1.
  const d = modal('Retire ' + what, `<form><p>Retires ${esc(what)} from the process. ${r.kind === 'claim' ? 'Other claims on the same subject stay.' : 'The paths and claims that name it must be removed first; the journey and its requirements stay.'} It is kept with your reason, who and when, and can be restored.</p>${fRetire('reason', '')}<p class="cm-muted">The review shows exactly what goes before anything is retired.</p><button class="btn primary" type="submit">Review the retirement</button></form>`);
  onSubmit(d, raw => send(d, ctx, processRetireCommand(id, String(raw.reason || '').trim()), {title: 'Review the retirement', intro: `<p>Retires ${esc(what)} (${esc(id)}).</p>`, select: r.kind === 'claim' ? undefined : ''}));
}
