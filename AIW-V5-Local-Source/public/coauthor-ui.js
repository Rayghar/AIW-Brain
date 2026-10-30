// Proposals (round 5, R5-E; it folds the Co-author panel of round 2, I2-12, Mind Factory's rule proposals, the design
// task starts and the journey draft into one workspace). Design suggestions, guided tasks and questions are distinct
// actions. Each row names its actual scope and source, and states where an accepted suggestion would go:
//   Rule      the chapter's template proposals (its own patterns, previewed as an editable ghost) and the rule-based
//             field offers ("Stated" and "Inferred", field-suggestions.js: the spark's bands, listed here);
//   Knowledge the knowledge rules that fired for the selected record (a topic to examine, never a score);
//   Sol       Sol's saved field drafts and its saved answers about the selected record;
//   Review    Sol's review findings for the chapter (brain-reasoning-ui.js, Contract R), above them "Review this chapter";
//   Task      the guided design tasks to start or continue (design, architecture, exchange, protection);
//   Journey   the chapter's journey draft, when the chapter can be drafted.
// Every row is advice until a person accepts it, and accepting goes through exactly the path its own surface used: a
// field offer opens the record's editor with the field filled and the suggestion pending (field-spark.js
// openRecordEditor), saved only by the record's own command; a rule proposal opens the chapter's editable preview; a task
// opens the task; the journey row opens the draft surface; a review finding is adopted through intelligence.adopt.
// Nothing here writes the document. Declining a field offer records a coauthor.disposition with its one-line reason
// (a workspace record, no design change). A review finding can be adopted as a Chapter 11 action; hiding it here,
// like hiding native starts, questions and previews, lasts only for this session and says so.
//
// Sol's panel (brain-context-ui.js) passes the rows it reads from its own context (the chapter's patterns, the knowledge
// rules, the tasks); this module adds the rest. The spark and the rules live in the studios' chunk and are reached
// through window.aiwFieldSpark (set by field-spark.js); the spark borrows Sol's connection status, its wording and the
// progress reading through window.aiwSolBridge (set here; bundle budget, F2-19).
import {esc} from './html-escape.js';
import {projectURL, activeProjectId, reportFailure, onProjectSwitch} from './project-context.js';
import {solLoad, solStatus, solStatusLine, pinText, watchRun, reviewSectionHTML, reviewFindings, adoptHTML, asideHTML as reviewAsideHTML, elementName, findingWords, findingState} from './brain-reasoning-ui.js';
import {journeyDraftable, JOURNEY_DRAFT_TEXT, draftOffer} from './readiness-model.js';
import {plural} from './util.js';
import {provenanceWord} from './provenance-words.js';

if (typeof window !== 'undefined') window.aiwSolBridge = {load: () => solLoad(activeProjectId), status: solStatus, line: () => solStatusLine(), pinText, watch: watchRun};
const spark = () => (typeof window !== 'undefined' && window.aiwFieldSpark) || null;
const fieldOf = (command, name) => spark()?.rules.fieldOf(command, name) || null;

const PB = (act, label, cls = '', attrs = '') => `<button type="button" class="btn ${cls}" data-proposal-act="${act}" ${attrs}>${label}</button>`;
// The sources in the order the list shows them: Sol's findings and the larger moves first, the many field offers last
// (within a source, the chapter's own proposals before the field offers).
export const PROPOSAL_SOURCES = [['review', 'Review'], ['journey', 'Journey'], ['task', 'Task'], ['sol', 'Sol'], ['knowledge', 'Knowledge'], ['rule', 'Rule']];
const LABEL = Object.fromEntries(PROPOSAL_SOURCES), ORDER = Object.fromEntries(PROPOSAL_SOURCES.map(([k], i) => [k, i]));
const GROUPS = [['suggestion', 'Design suggestions'], ['task', 'Guided tasks'], ['question', 'Questions to investigate']];
const groupOf = r => r.source === 'task' ? 'task' : r.source === 'knowledge' ? 'question' : 'suggestion';
const ASK_MODES = new Set(['design', 'author', 'mind', 'challenge']);
const store = () => typeof window !== 'undefined' ? window.aiwProjectStore : null;
const projectOf = () => store()?.value?.document || null;
const revisionOf = () => store()?.value?.revision ?? 0;
const cssq = v => typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&');
const fieldRuns = {key: '', runs: null, loading: null, error: ''}, answers = new Map(), answerErrors = new Map(), aside = new Set();
let showing = null;
const defaultView = objectId => ({shown: 12, historyShown: 10, group: 'all', source: 'all', scope: objectId && objectId !== 'project' ? 'selected' : 'all', query: ''});

async function get(path) {
  const r = await fetch(projectURL('/api/intelligence/' + path), {credentials: 'same-origin'});
  let d; try { d = await r.json(); } catch { throw Error('Sol’s saved answers could not be read.'); }
  if (!r.ok) throw Error(d.error || 'Sol’s saved answers could not be read.');
  return d;
}
// Sol's saved field drafts, once per project revision (the panel is redrawn often).
function loadFieldRuns() {
  const key = activeProjectId + ':' + revisionOf();
  if (fieldRuns.key === key && (fieldRuns.runs || fieldRuns.loading)) return fieldRuns.loading || Promise.resolve(fieldRuns.runs);
  fieldRuns.key = key; fieldRuns.runs = null; fieldRuns.error = '';
  // A previous project's or revision's GET may settle after a new one. Only the request that still owns this cache
  // may write it or clear its loading flag; stale callers receive an empty result and their removed slots do not draw.
  const pending = get('field-runs').then(d => {
    if (fieldRuns.key !== key || fieldRuns.loading !== pending) return [];
    return fieldRuns.runs = Array.isArray(d.runs) ? d.runs : [];
  }).catch(() => {
    if (fieldRuns.key !== key || fieldRuns.loading !== pending) return [];
    fieldRuns.error = 'Saved Sol field drafts could not be read.';
    return fieldRuns.runs = [];
  }).finally(() => { if (fieldRuns.key === key && fieldRuns.loading === pending) fieldRuns.loading = null; });
  fieldRuns.loading = pending;
  return pending;
}
// Sol's saved answers about one record (Ask Sol's design, author, mind and challenge requests), newest three.
function loadAnswers(objectId) {
  const key = activeProjectId + ':' + objectId;
  if (answers.has(key)) return answers.get(key);
  const p = get('runs?object=' + encodeURIComponent(objectId)).then(async d => {
    const done = (d.runs || []).filter(r => r.status === 'completed' && ASK_MODES.has(r.mode)).slice(0, 3);
    // An answer whose sources have changed since (current: false) is kept for reference, not offered for a field. One its
    // source checks withheld shows AIW's own fallback text, not Sol's, and is never offered as a Sol draft (rc41; the
    // server refuses it too, worker.js checkSuggestions).
    return (await Promise.all(done.map(r => get('runs?id=' + encodeURIComponent(r.id)).catch(e => { answerErrors.set(key, 'Some saved answers could not be read.'); reportFailure('One of Sol’s saved answers could not be read.', e, {quiet: true}); return null; })))).filter(r => r?.result && (r.result.summary || r.result.passage) && r.current !== false && r.groundingReview?.accepted === true);
  }).catch(e => { answerErrors.set(key, 'Saved Sol answers for this record could not be read.'); reportFailure('Sol’s saved answers for this record could not be read.', e, {quiet: true}); return []; });
  answers.set(key, p);
  return p;
}
// When the project changes (a record saved from an editor this list opened, a dismissal, an adopted finding), what was
// read is forgotten and the list on show is drawn again, so it never offers what was just accepted. A change to Sol's
// review (a run answered, a finding set aside) redraws this list from what is already read; nothing else is redrawn.
function redraw(fresh) {
  const slot = showing;
  if (!slot?.isConnected) return;
  if (fresh) { answers.clear(); answerErrors.clear(); delete slot.dataset.mounted; mountProposals({querySelector: () => slot}, slot.__proposals).catch(e => reportFailure('The proposals could not be refreshed.', e)); return; }
  if (slot.__state) render(slot, slot.__state);
}
if (typeof document !== 'undefined') {
  document.addEventListener('aiw:project-command', () => redraw(true));
  document.addEventListener('aiw:sol-review', () => redraw(false));
  // Another project opened in place: its own proposals, nothing set aside.
  onProjectSwitch(() => { aside.clear(); answers.clear(); answerErrors.clear(); fieldRuns.key = ''; fieldRuns.runs = null; fieldRuns.loading = null; fieldRuns.error = ''; showing = null; });
}

// The slot Sol's panel draws in its Proposals band; mountProposals fills it.
export const proposalsSlot = c => `<div class="pp" data-proposals="${esc(c?.chapter ?? '')}" data-proposals-object="${esc(c?.selected?.id ?? '')}" data-proposals-ref="${esc(c?.selected?.ref || c?.selected?.id || '')}"><p class="brain-note">Reading this chapter’s suggestions and tasks…</p></div>`;

// The rule-based field offers for the chapter's empty fields, then Sol's saved drafts not yet used or set aside.
function fieldItems(R, p, chapter, runs, selected = null, selectedId = null) {
  const candidates = R.openSuggestions(p, chapter, {limit: 201});
  const dismissed = R.dismissedIds(p), out = candidates.slice(0, 200).map(x => ({...x, id: x.offer.id}));
  out.capped = candidates.length > 200;
  // The chapter-wide limit must never suppress the record the person is looking at. Its own editor is authoritative;
  // include the same first open offer for each empty field even when that record falls after the first 200.
  if (selected && selectedId) {
    const offers = R.fieldOffers(p, selected.command, {recordId: selectedId});
    for (const d of R.sparkFields(selected.command)) {
      if (String(selected.record[d.name] ?? '').trim()) continue;
      const offer = (offers[d.name] || []).find(o => !dismissed.has(o.id));
      if (offer && !out.some(x => x.id === offer.id)) out.push({command: selected.command, recordId: selectedId, recordRef: selected.record.ref || selectedId, recordTitle: selected.record.title || selectedId, field: d.name, label: d.label, offer, id: offer.id});
    }
  }
  for (const run of runs || []) {
    const q = run.request || {}, r = run.result || {};
    if (R.chapterOf(q.command) !== Number(chapter) || !q.recordId || !r.value || r.withheld || !run.accepted || dismissed.has('sol-' + run.id)) continue;
    const rec = R.recordOf(p, q.command, q.recordId);
    if (!rec || String(rec[q.field] ?? '').trim() === r.value.trim() || (rec.provenance?.suggestions || []).some(s => s.runId === run.id)) continue;
    out.push({command: q.command, recordId: q.recordId, recordRef: rec.ref || q.recordId, recordTitle: rec.title || q.recordId, field: q.field, label: fieldOf(q.command, q.field)?.label || q.field, id: 'sol-' + run.id,
      offer: {band: 'sol', value: r.value, why: r.basis, runId: run.id, id: 'sol-' + run.id, receipt: `run ${run.id.slice(0, 8)} · packet ${String(run.packetStamp || '').slice(0, 12)} · ${pinText(run.instructions)}`}});
  }
  return out;
}
const fieldRow = x => {
  const o = x.offer, sol = o.band === 'sol';
  return {id: x.id, recordId: x.recordId, source: sol ? 'sol' : 'rule', what: `${x.recordRef} · ${x.label}`, cite: sol ? `Sol draft · ${o.receipt}` : `${provenanceWord(o.band)} · ${o.refLabel || o.ref}`, question: o.band === 'confirm' ? o.question : '', value: o.value, why: o.why || (sol ? 'Sol’s saved draft, checked against what it read.' : ''),
    where: `${x.recordRef}’s own editor, field “${x.label}”; saved only when you save the record there`, accept: PB('accept', 'Preview draft', 'primary', `data-id="${esc(x.id)}" title="Opens the record’s editor with the field filled; review before saving"`), editor: PB('edit', 'Open editor', '', `data-id="${esc(x.id)}" title="Opens the record’s editor with the field filled and the cursor in it"`), aside: 'record', field: x};
};
// The record the panel is about, when it is one this chapter's editors save.
function selectedRecord(R, p, chapter, id) {
  if (!id || id === 'project') return null;
  for (const command of Object.keys(R.RECORD_COLLECTIONS)) if (R.chapterOf(command) === Number(chapter) && R.recordOf(p, command, id) && command !== 'review.narrative') return {command, record: R.recordOf(p, command, id)};
  return null;
}
// Sol's saved answers about the selected record, each to put in one of its fields.
function answerRows(R, sel, runs) {
  if (!sel || !runs?.length) return [];
  const fields = R.sparkFields(sel.command).filter(d => R.draftable(sel.command, d.name));
  if (!fields.length) return [];
  const ref = sel.record.ref || sel.record.id;
  return runs.map(run => ({id: 'answer-' + run.id, source: 'sol', run, scope: 'selected', what: `Sol’s answer about ${ref}`, why: run.result.summary || '', cite: `run ${run.id.slice(0, 8)} · ${String(run.createdAt || '').slice(0, 16).replace('T', ' ')} · ${run.mode}${pinText(run.instructions || run.packet?.brainReceipt?.instructions) ? ' · ' + pinText(run.instructions || run.packet?.brainReceipt?.instructions) : ''} · proposal only`,
    extra: `<label class="brain-field pp-field"><span>Field of ${esc(ref)}</span><select data-proposal-field>${fields.map(d => `<option value="${esc(d.name)}">${esc(d.label)}</option>`).join('')}</select></label>`,
    where: `${ref}, in the chosen field of its own editor, marked as Sol’s; saved only when you save the record there`, accept: PB('put', `Open draft for <span data-proposal-field-label>${esc(fields[0].label)}</span>`, 'primary', `data-id="answer-${esc(run.id)}"`), aside: 'session'}));
}
// The chapter's journey draft, when the chapter can be drafted (readiness-model.js, as Validate offers it).
function journeyRows(p, chapter) {
  // Round 12 (DRF-17): a grouped project is offered its architecture draft, with the reason (readiness-model.js draftOffer).
  const offer = draftOffer(p, chapter);
  if (offer.kind === 'grouped') return [{id: 'architecture-draft', source: 'journey', what: offer.text, why: offer.reason, where: 'One draft of every chapter, previewed and applied as one reviewed step; every record stays a proposal of Sol\'s until a person keeps it', accept: `<span data-proposal-native><button type="button" class="btn primary" data-journey-draft="${esc(chapter)}" data-journey-grouped="true">Open the draft</button></span>`, aside: 'session'}];
  if (!journeyDraftable(p, chapter)) return [];
  const rows = [{id: 'journey-' + chapter, source: 'journey', what: JOURNEY_DRAFT_TEXT, why: `${Number(chapter) === 11 ? 'Chapter 11’s narrative is still empty' : `Chapter ${chapter} holds no records yet`}; the journey proposes ${Number(chapter) === 11 ? 'it' : 'them'} from the brief and the chapters before it, each value marked stated, inferred or an open question.`,
    where: `Chapter ${chapter} · a draft you review card by card; saved only when you accept the chapter, and every record stays unconfirmed`, accept: `<span data-proposal-native><button type="button" class="btn primary" data-journey-draft="${esc(chapter)}">Open the draft</button></span>`, aside: 'session'}];
  if ((p.coauthoring?.sources || []).some(s => s?.kind === 'model' && String(s.text || '').trim())) rows.push({id: 'journey-model-' + chapter, source: 'journey', what: 'Draft this chapter from the model', why: `This project keeps a model; the journey proposes Chapter ${chapter}'s records from what it states, each value marked stated or inferred with the model's lines beside it, and from the brief where the model says nothing.`, where: `Chapter ${chapter} · a draft you review card by card; saved only when you accept the chapter, and every record stays unconfirmed`, accept: `<span data-proposal-native><button type="button" class="btn" data-journey-draft="${esc(chapter)}" data-journey-mode="model">Open the model draft</button></span>`, aside: 'session'});
  return rows;
}
// Sol's review findings for the chapter (the latest saved review), each to adopt, select or set aside.
function reviewRows(p, chapter) {
  return reviewFindings(chapter).map(f => { const e = elementName(p, f.elementId); return {id: 'review-' + f.run.id + ':' + f.id, source: 'review', recordId: f.elementId, sev: findingWords(f), sevState: findingState(f), what: f.title, why: f.reason, cite: `Sol’s review · run ${f.run.id.slice(0, 8)} · cites ${f.sourceRefs.join(', ')}`,
    where: `${e.ref}${e.title ? ' · ' + e.title : ''} · adopting it records a Chapter 11 delivery action that names it`, accept: adoptHTML(p, f, 'btn'), editor: `<button type="button" class="btn" data-sol-review="select" data-id="${esc(f.elementId)}">Select it</button>`,
    asideHTML: reviewAsideHTML(f, 'btn')}; });
}

function asideHTML(r) {
  if (r.asideHTML) return r.asideHTML;
  if (r.aside === 'record') return PB('dismiss', 'Decline with reason…', '', `data-id="${esc(r.id)}" aria-expanded="false"`);
  if (r.aside === 'session') return PB('aside', 'Hide for this session', '', `data-id="${esc(r.id)}" title="Temporary visibility change; no decision is recorded"`);
  return '';
}
function rowHTML(r) {
  return `<li class="pp-row" data-proposal="${esc(r.id)}" data-proposal-source="${esc(r.source)}" data-proposal-scope="${esc(r.scope)}"><span class="pp-src pp-src-${esc(r.source)}">${esc(LABEL[r.source] || r.source)}</span><div class="pp-body">`
    + `<p class="pp-scope">${r.scope === 'selected' ? 'Selected object' : 'Chapter'}</p>${r.sev ? `<span class="sr-sev ${esc(r.sevState)}">${esc(r.sev)}</span>` : ''}<p class="pp-what"><b>${esc(r.what)}</b>${r.cite ? `<small>${esc(r.cite)}</small>` : ''}</p>`
    + `${r.question ? `<p class="pp-question">${esc(r.question)}</p>` : ''}${r.value ? `<p class="pp-value">${esc(r.value)}</p>` : ''}${r.why ? `<p class="pp-why">${esc(r.why)}</p>` : ''}${r.extra || ''}`
    + `<p class="pp-where"><span>Where it would go</span> ${esc(r.where)}</p><div class="pp-acts brain-actions">${r.accept || ''}${r.editor || ''}${asideHTML(r)}</div>`
    + (r.aside === 'record' ? `<div class="pp-dismiss" data-proposal-dismiss="${esc(r.id)}" hidden><label class="brain-field"><span>Why does this suggestion not fit? One line, recorded with this project.</span><input type="text" data-proposal-reason maxlength="300"></label><div class="brain-actions">${PB('record-dismissal', 'Record decline', 'primary', `data-id="${esc(r.id)}"`)}${PB('cancel-dismissal', 'Keep it', '', `data-id="${esc(r.id)}"`)}</div><p class="brain-error" role="alert" hidden></p></div>` : '')
    + '</div></li>';
}

// Fills the Proposals slot of Sol's panel. `extra.rows` are the rows the panel read from its own context (the chapter's
// patterns, the knowledge rules, the tasks). Safe to call on every redraw.
export async function mountProposals(panel, extra = {}) {
  const slot = panel?.querySelector?.('[data-proposals]');
  if (!slot || slot.dataset.mounted) return;
  slot.dataset.mounted = '1'; showing = slot; slot.__proposals = extra;
  const chapter = Number(slot.dataset.proposals), objectId = slot.dataset.proposalsObject, R = spark()?.rules || null;
  const p = projectOf();
  if (!p || !slot.isConnected) return;
  // Every chapter's editors carry the field offers (Chapters 1–3 in their page apps, 4–11 in the studios); until the
  // page's editors have loaded the list has the other sources only.
  const sel = R ? selectedRecord(R, p, chapter, objectId) : null;
  const [runs, asked] = R ? await Promise.all([loadFieldRuns(), sel ? loadAnswers(objectId) : Promise.resolve([])]) : [[], []];
  if (!slot.isConnected) return;
  render(slot, {R, chapter, objectId, ref: slot.dataset.proposalsRef, runs, asked, rows: Array.isArray(extra.rows) ? extra.rows : []});
}
function rowsOf(slot, s) {
  const p = projectOf(), sel = s.R ? selectedRecord(s.R, p, s.chapter, s.objectId) : null;
  const fields = s.R ? fieldItems(s.R, p, s.chapter, s.runs, sel, s.objectId) : [];
  s.fields = new Map(fields.map(x => [x.id, x])); s.sel = sel; s.fieldSuggestionsCapped = !!fields.capped;
  const rows = [...reviewRows(p, s.chapter), ...journeyRows(p, s.chapter), ...s.rows, ...answerRows(s.R, sel, s.asked), ...fields.map(fieldRow)];
  const chapterKey = `${activeProjectId}:${s.chapter}:`;
  s.hiddenCount = rows.filter(r => aside.has(chapterKey + r.id)).length;
  return rows.map((r, i) => ({r: {...r, group: groupOf(r), scope: r.scope || (r.recordId && r.recordId === s.objectId || r.source === 'knowledge' && s.objectId !== 'project' ? 'selected' : 'chapter')}, i}))
    .sort((a, b) => GROUPS.findIndex(([k]) => k === a.r.group) - GROUPS.findIndex(([k]) => k === b.r.group) || Number(b.r.scope === 'selected') - Number(a.r.scope === 'selected') || (ORDER[a.r.source] ?? 9) - (ORDER[b.r.source] ?? 9) || a.i - b.i)
    .map(x => x.r).filter(r => !aside.has(chapterKey + r.id));
}
function recordedDeclines(p, s) {
  if (!s.R) return [];
  return (p?.workspace?.coauthor?.dispositions || []).filter(d => d?.outcome === 'dismissed' && s.R.chapterOf(d.command) === s.chapter).slice().reverse();
}
function historyHTML(p, s, view) {
  const entries = recordedDeclines(p, s);
  if (!entries.length) return '';
  const display = entries.slice(0, view.historyShown);
  return `<details class="pp-history"><summary>${plural(entries.length, 'recorded decline')} in this chapter</summary><ol>${display.map(d => {
    const rec = s.R.recordOf(p, d.command, d.recordId), target = rec?.ref || d.recordId || 'Project record', field = fieldOf(d.command, d.field)?.label || d.field;
    return `<li><strong>${esc(target)} · ${esc(field)}</strong><span>${esc(d.reason || '')}</span><small>${esc([d.actor, String(d.at || '').slice(0, 16).replace('T', ' ')].filter(Boolean).join(' · '))}</small></li>`;
  }).join('')}</ol>${entries.length > display.length ? PB('more-history', `Show next ${Math.min(20, entries.length - display.length)} recorded declines`) : ''}</details>`;
}
function render(slot, s) {
  slot.__state = s;
  const p = projectOf();
  if (!p) return;
  const view = slot.__view ||= defaultView(s.objectId);
  const rows = rowsOf(slot, s), by = new Map(rows.map(r => [r.id, r]));
  if (view.source !== 'all' && !rows.some(r => r.source === view.source)) view.source = 'all';
  const query = view.query.trim().toLocaleLowerCase();
  const matched = rows.filter(r => (view.group === 'all' || r.group === view.group) && (view.source === 'all' || r.source === view.source) && (view.scope === 'all' || r.scope === view.scope) && (!query || [r.what, r.why, r.where, r.cite, r.question, r.value].some(v => String(v || '').toLocaleLowerCase().includes(query))));
  const list = matched.slice(0, view.shown), counts = PROPOSAL_SOURCES.map(([k, label]) => [k, label, rows.filter(r => r.source === k).length]).filter(([, , n]) => n);
  const selected = s.objectId && s.objectId !== 'project' && s.ref ? s.ref : null;
  const selectedCount = selected ? rows.filter(r => r.scope === 'selected').length : 0;
  const kindCount = Object.fromEntries(GROUPS.map(([k]) => [k, rows.filter(r => r.group === k).length]));
  const scopeCount = rows.length - selectedCount;
  const loadErrors = [fieldRuns.error, answerErrors.get(activeProjectId + ':' + s.objectId)].filter(Boolean);
  // Focus inside the slot survives a redraw: on the same control when it is drawn again, else on the summary line.
  const had = typeof document !== 'undefined' && slot.contains(document.activeElement) ? document.activeElement : null, hadFocus = !!had;
  const sourceOpen = slot.querySelector('.pp-source-filter')?.open || view.source !== 'all', historyOpen = slot.querySelector('.pp-history')?.open;
  const filtersOpen = slot.querySelector('.pp-advanced')?.open || view.source !== 'all' || view.group !== 'all' || !!view.query;
  const reviewOpen = slot.querySelector('.pp-review-tools')?.open;
  const searchFocus = had?.matches?.('[data-proposal-search]') ? [had.selectionStart, had.selectionEnd] : null;
  const again = had && !searchFocus ? ['solReview', 'proposalAct'].filter(k => had.dataset?.[k]).map(k => `[data-${k === 'solReview' ? 'sol-review' : 'proposal-act'}="${cssq(had.dataset[k])}"]`).concat(['finding', 'id', 'source', 'group', 'scope'].filter(k => had.dataset?.[k]).map(k => `[data-${k}="${cssq(had.dataset[k])}"]`)).join('') : '';
  const groups = GROUPS.filter(([key]) => list.some(r => r.group === key)).map(([key, label]) => `<section class="pp-group"><h4>${esc(label)} <span>${list.filter(r => r.group === key).length}${matched.length > view.shown && matched.some(r => r.group === key && !list.includes(r)) ? '+' : ''}</span></h4><ol class="pp-list">${list.filter(r => r.group === key).map(rowHTML).join('')}</ol></section>`).join('');
  slot.innerHTML = `<p class="pp-summary" data-proposals-summary>${rows.length ? `${plural(rows.length, 'item')} in Chapter ${esc(s.chapter)}: ${plural(kindCount.suggestion, 'design suggestion')} · ${plural(kindCount.task, 'guided task')} · ${plural(kindCount.question, 'question')}.` : loadErrors.length ? `Chapter ${esc(s.chapter)} suggestions could not be fully loaded.` : `No suggestions, tasks or questions available for Chapter ${esc(s.chapter)} right now.`}${selected ? ` ${selectedCount} directly tied to selected ${esc(selected)}; ${scopeCount} chapter-wide or about other records.` : ''}</p>`
    + (s.fieldSuggestionsCapped ? `<p class="brain-note pp-limit">This list includes the first 200 chapter field suggestions plus any for the selected record. Open another record’s editor to see its own suggestions.</p>` : '')
    + (s.hiddenCount ? `<p class="brain-note pp-hidden">${plural(s.hiddenCount, 'item')} temporarily hidden. ${PB('restore', 'Show hidden items')}</p>` : '')
    + (loadErrors.length ? `<div class="pp-load-error brain-source-warning" role="status"><p>${esc(loadErrors.join(' '))} The available list is incomplete, not an empty result.</p>${PB('retry', 'Retry saved suggestions')}</div>` : '')
    + `<div class="pp-controls">`
    + (selected ? `<div class="pp-filter" role="group" aria-label="Item scope">${[['selected', esc(selected), selectedCount], ['all', 'Whole chapter', rows.length], ['chapter', 'Other chapter items', scopeCount]].map(([k, label, n]) => PB('scope', `${label} <span>${n}</span>`, '', `data-scope="${k}" aria-pressed="${view.scope === k}"`)).join('')}</div>` : '')
    + `<details class="pp-advanced"><summary>Search and filter suggestions</summary><label class="brain-field"><span>Find an item in this chapter</span><input type="search" data-proposal-search value="${esc(view.query)}" placeholder="Search title, record, reason or source"></label>`
    + `<div class="pp-filter" role="group" aria-label="Type of item">${[['all', 'All', rows.length], ...GROUPS.map(([k, label]) => [k, label, kindCount[k]])].map(([k, label, n]) => PB('group', `${esc(label)} <span>${n}</span>`, '', `data-group="${esc(k)}" aria-pressed="${view.group === k}"`)).join('')}</div>`
    + (counts.length > 1 ? `<details class="pp-source-filter"><summary>Filter by source${view.source !== 'all' ? ' · ' + esc(LABEL[view.source] || view.source) : ''}</summary><div class="pp-filter" role="group" aria-label="Source of item">${[['all', 'All sources', rows.length], ...counts].map(([k, label, n]) => PB('filter', `${esc(label)} <span>${n}</span>`, '', `data-source="${esc(k)}" aria-pressed="${view.source === k}"`)).join('')}</div></details>` : '')
    + `</details></div>`
    + `<p class="brain-note pp-results" role="status">${matched.length ? `Showing ${list.length} of ${plural(matched.length, 'matching item')}${view.scope === 'selected' ? ' for ' + esc(selected) : '; selected-object items first within each type'}.` : loadErrors.length ? 'Suggestions from Sol are not fully known until loading succeeds.' : view.scope === 'selected' ? `No suggestions directly tied to ${esc(selected)}. Whole chapter shows ${scopeCount} other items.` : `No items match these filters.`}</p>`
    + groups + (matched.length > list.length ? PB('more', `Show next ${Math.min(25, matched.length - list.length)} of ${matched.length}`, '', 'aria-label="Show more matching items"') : '')
    + historyHTML(p, s, view)
    + `<details class="pp-review-tools brain-basis"><summary>Review the whole chapter with Sol</summary>${reviewSectionHTML(p, s.chapter, {findings: false, base: 'btn'})}</details>`;
  slot.onclick = e => act(e, slot, s, by);
  slot.onchange = e => { const f = e.target.closest?.('[data-proposal-field]'); if (f) f.closest('.pp-row').querySelector('[data-proposal-field-label]').textContent = f.selectedOptions[0]?.textContent || f.value; };
  slot.oninput = e => { if (e.target.matches?.('[data-proposal-search]')) { view.query = e.target.value; view.shown = 12; render(slot, s); } };
  slot.onkeydown = e => { if (e.key === 'Enter' && e.target.matches?.('[data-proposal-reason]')) { e.preventDefault(); e.target.closest('.pp-dismiss').querySelector('[data-proposal-act="record-dismissal"]')?.click(); } };
  if (slot.querySelector('.pp-source-filter')) slot.querySelector('.pp-source-filter').open = !!sourceOpen;
  if (slot.querySelector('.pp-history')) slot.querySelector('.pp-history').open = !!historyOpen;
  slot.querySelector('.pp-advanced').open = !!filtersOpen;
  slot.querySelector('.pp-review-tools').open = !!reviewOpen;
  if (searchFocus) { const input = slot.querySelector('[data-proposal-search]'); input.focus({preventScroll: true}); input.setSelectionRange(...searchFocus); }
  else if (hadFocus && !slot.contains(document.activeElement)) { const back = again && slot.querySelector(again); if (back) back.focus({preventScroll: true}); else { const x = slot.querySelector('[data-proposals-summary]'); x?.setAttribute('tabindex', '-1'); x?.focus({preventScroll: true}); } }
}
async function act(e, slot, s, by) {
  const b = e.target.closest?.('[data-proposal-act]');
  if (!b || b.disabled) return;
  e.preventDefault(); e.stopPropagation();
  const action = b.dataset.proposalAct, r = by.get(b.dataset.id), x = r?.field, R = s.R, box = r ? slot.querySelector(`[data-proposal-dismiss="${cssq(r.id)}"]`) : null;
  const view = slot.__view ||= defaultView(s.objectId);
  if (action === 'retry') { fieldRuns.key = ''; fieldRuns.runs = null; fieldRuns.error = ''; return redraw(true); }
  if (action === 'more') { view.shown += 25; return render(slot, s); }
  if (action === 'more-history') { view.historyShown += 20; return render(slot, s); }
  if (action === 'restore') { const prefix = `${activeProjectId}:${s.chapter}:`; for (const id of aside) if (id.startsWith(prefix)) aside.delete(id); return render(slot, s); }
  if (['filter', 'group', 'scope'].includes(action)) { const key = action === 'filter' ? 'source' : action; view[key] = b.dataset[key] || 'all'; view.shown = 12; render(slot, s); slot.querySelector(`[data-proposal-act="${action}"][data-${key}="${cssq(view[key])}"]`)?.focus(); return; }
  if (action === 'aside' && r) { aside.add(`${activeProjectId}:${s.chapter}:${r.id}`); return render(slot, s); }
  if ((action === 'accept' || action === 'edit') && x && R) {
    const o = x.offer, opened = await spark().openRecordEditor(x.command, x.recordId, {field: x.field, value: o.value, focus: action === 'edit', suggestion: o.band === 'sol' ? {source: 'sol', runId: o.runId, suggestionId: o.id} : {source: o.band, ref: o.ref, refLabel: o.refLabel, suggestionId: o.id}});
    if (!opened) note(b, spark().canEdit(x.command) ? 'Close the open dialog first, then try again.' : `Open Chapter ${R.chapterOf(x.command)} to edit ${x.recordRef}.`);
    return;
  }
  if (action === 'dismiss' && box) { box.hidden = false; b.setAttribute('aria-expanded', 'true'); box.querySelector('[data-proposal-reason]').focus(); return; }
  if (action === 'cancel-dismissal' && box) { box.hidden = true; const d = slot.querySelector(`[data-proposal-act="dismiss"][data-id="${cssq(r.id)}"]`); d?.setAttribute('aria-expanded', 'false'); d?.focus(); return; }
  if (action === 'record-dismissal' && box && x) {
    const reason = box.querySelector('[data-proposal-reason]').value.trim(), alert = box.querySelector('[role=alert]');
    if (reason.length < 8 || /[\r\n]/.test(reason)) { alert.hidden = false; alert.textContent = 'Say in one line (at least 8 characters) why this proposal does not fit.'; box.querySelector('[data-proposal-reason]').focus(); return; }
    const o = x.offer;
    b.disabled = true;
    try {
      await store().command({type: 'coauthor.disposition', payload: {suggestionId: x.id, command: x.command, recordId: x.recordId, field: x.field, source: o.band, ...(o.band === 'sol' ? {runId: o.runId} : {ref: o.ref}), reason}});
      render(slot, s);
    } catch (err) { alert.hidden = false; alert.textContent = err.message; b.disabled = false; }
    return;
  }
  if (action === 'put' && r?.run && s.sel && R) {
    const run = r.run, field = b.closest('.pp-row')?.querySelector('[data-proposal-field]')?.value, sel = s.sel;
    if (!field) return;
    const d = fieldOf(sel.command, field), text = String((d?.kind === 'text' ? run.result.summary || run.result.passage : run.result.passage || run.result.summary) || '').trim(), max = R.maxLengthOf(sel.command, field), value = sentencesWithin(text, max);
    if (!value) return note(b, `Sol’s answer is ${text.length} characters and its first sentence alone is longer than “${d?.label || field}” allows (${max}), so nothing was put in the field. Choose a longer field, or write it yourself.`);
    const opened = await spark().openRecordEditor(sel.command, sel.record.id, {field, value, focus: true, suggestion: {source: 'sol', runId: run.id, suggestionId: 'sol-' + run.id}, shortened: value.length < text.length ? `Shortened from ${text.length} to ${value.length} characters, after the last whole sentence that fits the field; saved, it is recorded as edited, since it is not the whole answer.` : ''});
    if (!opened) note(b, spark().canEdit(sel.command) ? 'Close the open dialog first, then try again.' : `Open Chapter ${s.chapter} to edit ${sel.record.ref || sel.record.id}.`);
  }
}
// An answer longer than the field is cut after its last whole sentence that fits, never mid-sentence (rc41); '' when not
// even its first sentence fits. A sentence ends at . ! or ? (and any closing quote or bracket) at the end of the text,
// or before a space and then a capital, a digit or an opening quote or bracket, so "e.g. the" does not end one.
export function sentencesWithin(text, max) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  let end = 0;
  for (const m of t.matchAll(/[.!?][”’"')\]]*(?=\s+[A-Z0-9“‘"'(]|$)/g)) { const at = m.index + m[0].length; if (at > max) break; end = at; }
  return t.slice(0, end).trim();
}
function note(near, text) {
  let n = near.parentElement.querySelector(':scope > .pp-note');
  if (!n) { n = document.createElement('p'); n.className = 'brain-note pp-note'; n.setAttribute('role', 'status'); near.parentElement.append(n); }
  n.textContent = text;
}
