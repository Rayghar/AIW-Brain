// The journey draft review (round 4, Contract 3; audit/round4/DESIGN.md): one chapter's proposed records, in the shell's
// stage, with their sources in the companion — one frame, no document navigation.
//
// The draft comes from the server (POST /api/intelligence/journey-context: shared/journey-drafter.js over the stored
// brief; no key needed). Each record is a card listing the fields that will be saved, each value marked in the one
// provenance vocabulary (provenance-words.js, round 11): Stated (the words are in the brief passage, quoted in the
// companion, or copied from the named upstream record), Inferred (a rule derived it from the passages or a named
// upstream record), Sol draft (a checked Sol draft) or Edited (changed here); an open question has an input. The person can edit a value, answer a question, skip a record, ask Sol to draft the chapter (only when the
// server reports Sol configured), and Accept the chapter. Accept commits one record at a time through the governed
// chain — guide.start, guide.draft-answer for each creation question, guide.commit-draft with the basis, the preview
// stamp, reviewed: true and the record's provenance — through the project store's command path, so compileCreation
// stays the only path from answers to commands, for every Chapter 1 artefact type as for every other chapter. What the
// record is made with is in its own commit — a requirement's links, Chapter 8's key and status fields, Chapter 11's
// title — so accepting raises no change to review; only the links between Chapter 1 context records follow it, as one
// reviewed change of relationship commands. Nothing is confirmed: confirmation stays a person's act on each record. "Draft the whole journey" walks Chapters 1 → 11 and stops at each for Accept.
//
// A model in (round 6, Contract I): a project that keeps a model source (a Structurizr, ArchiMate, BPMN, draw.io,
// Mermaid, PlantUML or MADR file read on the Projects page) can be drafted from it (mode 'model', the same surface, the
// same commit). The server reads the kept model again and the drafter prefers what it states; each value is marked
// stated when the model's line holds its words, inferred when a rule read it from that line, with the lines quoted in
// the companion as "Model lines" beside the brief's passages (each list numbers its own P-nnn; a record names which it
// cites by its provenance). A record read from the model commits with provenance {mode: 'model', sourceId}; a record
// the brief rules drafted keeps its deterministic provenance. A BPMN model's events, gateways and flows follow the last
// step's commit as process.element and process.transition commands through workspace.apply, each element one reviewed
// change (so the id it is given is known to the flows that name it), the flows twenty at a time. Sol is not consulted
// for a model draft. The switch between the brief and the model is on the surface; ?journey=draft&mode=model opens it.
//
// The architecture draft (round 12, D-10): a project whose requirements were imported, or that keeps requirement groups
// (readiness-model.js draftsByGroup, the one predicate every surface asks), is not drafted chapter by chapter. The same
// frame starts Sol's draft of the whole architecture as a job on the server (/api/drafting, drafting-service.js) and
// keeps its receipt in this tab, so a reload finds the job again; it shows the progress per chapter, then the preview
// (the proposals per chapter with a sample, every cap with its headroom, the requirements traced through their groups),
// and applies it as one reviewed step, itself a job with its own receipt. What it saves are Sol's proposals, applied
// by the person and reviewed by no one; nothing is confirmed, approved or chosen.
import {esc, shortText} from './html-escape.js';
import {projectURL} from './project-context.js';
import {servicePost} from './project-store.js';
import {creationFields, compileCreation} from './guided-creation.js';
import {guideBasis} from './guidance-record.js';
import {previewWorkingChange} from './workbench-domain.js';
import {refExists} from './field-suggestions.js';
import {PROVENANCE_WORDS, OPEN_WORD} from './provenance-words.js';
import {draftsByGroup, groupedDraftReason} from './readiness-model.js';
// Round 12 (G, GR-UX-16): the chapters named from the one chapter-name table.
import {CHAPTER_TITLES as TITLES} from './chapter-names.js';

// A model's process elements made in the same batch are named by a reference the commit resolves (journey-drafter.js).
const REF = '@ref:model:';
const isRef = v => typeof v === 'string' && v.startsWith(REF);
const FORMAT_WORDS = {structurizr: 'Structurizr DSL', archimate: 'ArchiMate', bpmn: 'BPMN', drawio: 'draw.io', 'mermaid-c4': 'Mermaid', 'plantuml-c4': 'C4-PlantUML', madr: 'MADR'};
// The command that saves each chapter's main record, for "Open in its editor" once a record is saved.
const EDITOR = {1: 'artefact', 2: 'quality.driver', 3: 'decision.save', 4: 'logical.responsibility', 5: 'realisation.component', 6: 'technology.capability', 7: 'techrealisation.plan', 8: 'interfaces.contract', 9: 'security.threat', 10: 'runtime.plan', 11: 'review.narrative'};
// The basis a value carries (journey-drafter.js) is kept as recorded; the word shown is the one vocabulary's.
const BASIS = {stated: PROVENANCE_WORDS.stated, inferred: PROVENANCE_WORDS.inferred, upstream: PROVENANCE_WORDS.stated, gap: OPEN_WORD, sol: PROVENANCE_WORDS.sol, edited: PROVENANCE_WORDS.edited};
const blank = () => ({brief: null, open: false, whole: false, chapter: 1, tab: 'work', mode: 'brief', model: null, modelPassages: [], loading: false, busy: false, draft: null, packet: null, passages: [], configuration: null, aiEnabled: true, values: {}, editing: null, skipped: new Set(), saved: new Map(), blocked: new Map(), idMap: new Map(), message: '', error: '', sol: null, accepted: false, progress: ''});
let S = blank(), observer = null;
const store = () => (typeof window !== 'undefined' ? window.aiwProjectStore : null);
const here = () => { const q = new URLSearchParams(location.search); return {chapter: Number(q.get('chapter') || 1), tab: q.get('tab') || 'work'}; };
const uuid = () => { const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128; const h = [...b].map(x => x.toString(16).padStart(2, '0')).join(''); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
// What an id the draft named for a record that was skipped (or not saved) maps to: nothing the project can hold, so a
// record that names it is not committed and a link to it is dropped, never moved onto another record.
const SKIPPED = '#skipped';
const answerKey = () => 'aiw-journey-answers:' + (store()?.value?.document?.id || '') + ':' + S.chapter + ':' + S.mode;
const answerStamp = () => [store()?.value?.revision, S.packet?.stamp || '', S.model?.id || S.model?.name || '', ...(S.draft?.records || []).map(r => r.key + ':' + r.title)].join('|');
function keepAnswers() {
  if (S.grouped || !S.draft) return;
  try { sessionStorage.setItem(answerKey(), JSON.stringify({stamp: answerStamp(), values: S.values, skipped: [...S.skipped]})); } catch { /* this tab can still hold the edits in memory */ }
}
function restoreAnswers() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(answerKey()) || 'null');
    if (!saved || saved.stamp !== answerStamp()) return;
    const keys = new Set(records().map(r => r.key));
    S.values = Object.fromEntries(Object.entries(saved.values || {}).filter(([key]) => keys.has(key)));
    S.skipped = new Set((saved.skipped || []).filter(key => keys.has(key)));
    if (Object.keys(S.values).length || S.skipped.size) S.message = 'Your unfinished answers and skipped records were restored from this browser tab.';
  } catch { /* a malformed or unavailable tab store cannot affect the source draft */ }
}
function clearAnswers() { try { sessionStorage.removeItem(answerKey()); } catch { /* in-memory answer state still clears */ } S.values = {}; S.skipped = new Set(); }

// ---------------------------------------------------------------- opening and mounting in the shell

// Opens the surface for a chapter, moving the shell to that chapter's Work tab in place first (window.aiwRoute).
export async function openJourneyDraft({chapter = here().chapter, whole = false, mode = 'brief', grouped = false} = {}) {
  chapter = Math.min(11, Math.max(1, Number(chapter) || 1));
  if (S.busy) return;
  if (grouped || draftsByGroup(store()?.value?.document)) return openArchitectureDraft();
  install();
  const keepWhole = whole || (S.open && S.whole);
  mode = mode === 'model' ? 'model' : 'brief';
  S = {...blank(), open: true, whole: keepWhole, chapter, mode, loading: true};
  route(chapter);
  mount();
  try {
    const answer = await servicePost('/api/intelligence/journey-context', {chapter, ...(mode === 'model' ? {mode: 'model'} : {})}, {fallback: 'The chapter could not be drafted.'});
    if (!S.open || S.chapter !== chapter || S.mode !== mode) return;
    // A project with no brief and a kept model is drafted from the model whichever way it was asked (the server says so).
    if (answer.draft?.mode === 'model') S.mode = 'model';
    S.draft = answer.draft; S.packet = answer.packet; S.brief = answer.brief || null; S.passages = answer.passages || []; S.model = answer.model || null; S.modelPassages = answer.modelPassages || []; S.configuration = answer.configuration || null; S.aiEnabled = answer.aiEnabled !== false;
    restoreAnswers();
  } catch (e) { S.error = e.message || 'The chapter could not be drafted.'; }
  S.loading = false;
  mount();
  document.querySelector('.jd h2')?.focus({preventScroll: false});
}
export function closeJourneyDraft() { if (!S.open) return; stopPolling(); keepAnswers(); S = blank(); G = groupedBlank(); document.querySelectorAll('.jd').forEach(el => el.remove()); refreshShell(); requestAnimationFrame(() => document.querySelector('.heading-row h1')?.focus({preventScroll:true})); }
export const journeyDraftOpen = () => S.open;

function route(chapter) {
  const at = here();
  if (at.chapter === chapter && at.tab === S.tab) return;
  if (typeof window.aiwRoute === 'function') window.aiwRoute(projectURL('/?chapter=' + chapter + '&tab=' + S.tab));
}
// The shell draws the page again (and the observer below puts the surface back while it is open).
function refreshShell() { if (typeof window.aiwRoute === 'function') window.aiwRoute(projectURL(location.pathname + location.search)); }
function install() {
  if (observer || typeof MutationObserver !== 'function') return;
  const app = document.querySelector('#app');
  if (!app) return;
  // The shell redraws #app on every render; while the surface is open it is mounted again on the same chapter and tab,
  // and it closes when the person has moved elsewhere.
  observer = new MutationObserver(() => {
    if (!S.open) return;
    const at = here();
    if (at.chapter !== S.chapter || at.tab !== S.tab) { if (!S.busy) { S = blank(); document.querySelectorAll('.jd').forEach(el => el.remove()); } return; }
    if (!document.querySelector('.studio > .stage.tab-content > .jd')) mount();
  });
  observer.observe(app, {childList: true});
}
function mount() {
  if (!S.open) return;
  const stage = document.querySelector('.studio > .stage.tab-content'), side = document.querySelector('#inspector');
  if (!stage) return;
  let host = stage.querySelector(':scope > .jd');
  if (!host) {
    host = document.createElement('section');
    host.className = 'jd'; host.setAttribute('aria-labelledby', 'jd-title');
    host.addEventListener('click', onClick); host.addEventListener('input', onInput); host.addEventListener('change', onInput);
    stage.prepend(host);
  }
  const active = host.contains(document.activeElement) ? document.activeElement : null;
  const focus = active && [active.dataset.jdAct, active.dataset.jdRecord, active.dataset.jdField, active.dataset.jdChapter, active.dataset.jdOffset];
  stage.classList.add('jd-on');
  host.innerHTML = surfaceHTML();
  if (side) { side.classList.add('jd-side'); side.innerHTML = companionHTML(); }
  if (focus?.[0]) {
    const control = [...host.querySelectorAll('[data-jd-act]')].find(el => [el.dataset.jdAct, el.dataset.jdRecord, el.dataset.jdField, el.dataset.jdChapter, el.dataset.jdOffset].every((v, i) => v === focus[i]) && !el.disabled);
    (control || host.querySelector('#jd-title'))?.focus({preventScroll:true});
  } else if (active?.id === 'jd-title') host.querySelector('#jd-title')?.focus({preventScroll:true});
}

// ---------------------------------------------------------------- the surface

const records = () => S.draft?.records || [];
const live = r => !S.skipped.has(r.key) && !S.saved.has(r.key) && !r.blocked && !S.blocked.has(r.key);
const valueOf = (r, f) => S.values[r.key]?.[f.key];
const fromModel = r => r.provenance?.mode === 'model';
function tag(r, f) {
  const edited = valueOf(r, f) !== undefined && valueOf(r, f) !== f.value, basis = edited ? 'edited' : f.basis, m = fromModel(r);
  const refs = [...(f.passages || []).map(id => `<a href="#jd-${m ? 'm-' : ''}${esc(id)}" data-jd-passage="${esc(id)}" title="${m ? 'Model line' : 'Brief passage'} ${esc(id)}">${esc(id)}</a>`), ...(f.upstream || []).map(id => `<b>${esc(id)}</b>`)];
  return `<span class="jd-tag ${esc(basis)}" title="${esc(f.note || '')}">${esc(BASIS[basis] || basis)}${refs.length && basis !== 'edited' ? ' · ' + refs.join(', ') : ''}</span>`;
}
function fieldHTML(r, f) {
  const own = valueOf(r, f), shown = own !== undefined ? own : f.display !== undefined ? f.display : f.value, id = `jd-${r.key}-${f.key}`, open = S.editing === r.key + ':' + f.key;
  // The choices that name what a record hangs from (and a Chapter 1 record's type) are the rules'; they carry no options
  // to choose from unless the draft left them open.
  const editable = !S.busy && live(r) && f.key !== 'type' && !(f.display !== undefined && !f.options?.length);
  let control = '';
  if (editable && (f.basis === 'gap' || open)) {
    const options = f.options || [];
    control = options.length
      ? `<select id="${esc(id)}" data-jd-field="${esc(f.key)}" data-jd-record="${esc(r.key)}">${options.map(o => `<option value="${esc(o.id)}" ${(own ?? f.value) === o.id ? 'selected' : ''}>${esc(o.title)}</option>`).join('')}</select>`
      : `<textarea id="${esc(id)}" rows="2" maxlength="2000" data-jd-field="${esc(f.key)}" data-jd-record="${esc(r.key)}" placeholder="${esc(f.basis === 'gap' ? 'Leave blank to keep the open question' : '')}">${esc(own ?? (f.basis === 'gap' ? '' : f.value))}</textarea>`;
  }
  const label = control ? `<label for="${esc(id)}">${esc(f.label)}</label>` : esc(f.label);
  return `<div class="jd-field ${esc(f.basis)}"><dt>${label}</dt><dd>${control || `<span class="jd-value">${esc(shown) || '<i>Blank</i>'}</span>`}${f.basis === 'gap' && editable ? `<small class="jd-q">${esc(f.note || 'No source answers this; the record keeps the open answer above until you answer it.')}</small>` : ''}<span class="jd-meta">${tag(r, f)}${editable && f.basis !== 'gap' && !open ? `<button type="button" class="jd-link" data-jd-act="edit" data-jd-record="${esc(r.key)}" data-jd-field="${esc(f.key)}">Edit</button>` : ''}</span></dd></div>`;
}
function cardHTML(r) {
  const saved = S.saved.get(r.key), skipped = S.skipped.has(r.key), blocked = r.blocked || S.blocked.get(r.key), kind = r.type ? r.type[0].toUpperCase() + r.type.slice(1) : 'Record';
  const pv = r.provenance || {}, sources = `${pv.mode === 'model' ? 'Model draft · ' + (S.model?.name || 'the model') : pv.mode === 'sol' ? 'Sol draft' : 'Deterministic draft'} · ${plural((pv.passages || []).length, pv.mode === 'model' ? 'model line' : 'passage')} · ${plural((pv.upstream || []).length, 'upstream record')}`;
  const links = r.links?.length ? `<p class="jd-extra"><b>Links</b> ${r.links.map(l => `${esc(l.from)} ${esc(l.kind)} ${esc(l.to)}`).join('; ')} <span class="jd-tag inferred" title="Linked where the records share words, or where there is only one candidate.">Inferred</span> — added after the commit.</p>` : '';
  const state = saved ? `<p class="jd-saved" role="status">Saved as <b>${esc(saved.join(', '))}</b>, unconfirmed.${editorButton(r, saved[0])}</p>` : skipped ? '<p class="jd-skipped">Skipped: it will not be saved.</p>' : blocked ? `<p class="jd-blocked">Not saved: ${esc(blocked)}</p>` : '';
  return `<li class="jd-card ${saved ? 'saved' : skipped ? 'skipped' : blocked ? 'blocked' : ''}" data-jd-card="${esc(r.key)}"><header><small>${esc(kind)} · ${esc(sources)}</small><h3>${esc(r.title)}</h3>${live(r) || skipped ? `<button type="button" class="btn jd-skip" data-jd-act="${skipped ? 'unskip' : 'skip'}" data-jd-record="${esc(r.key)}" ${S.busy ? 'disabled' : ''}>${skipped ? 'Keep this record' : 'Skip'}</button>` : ''}</header>${state}<dl class="jd-fields">${r.fields.map(f => fieldHTML(r, f)).join('')}</dl>${links}</li>`;
}
function editorButton(r, id) {
  const command = EDITOR[S.chapter], spark = window.aiwFieldSpark;
  return spark?.canEdit?.(command) ? ` <button type="button" class="jd-link" data-jd-act="editor" data-jd-record="${esc(r.key)}" data-jd-id="${esc(id)}">Open in its editor</button>` : '';
}
function solHTML() {
  const c = S.configuration;
  if (S.mode === 'model') return '<p class="jd-sol">Sol is not consulted for a model draft: each value comes from the model’s own lines, quoted beside it, or from the brief rules where the model says nothing.</p>';
  // While Sol drafts, the run's step (drafting, then checking) and the seconds it has taken (round 5).
  if (S.sol?.running) return `<p class="jd-sol jd-sol-progress" role="status"><span data-jd-progress>${esc(S.sol.progress || 'Sol · drafting the chapter · sending…')}</span> <small data-jd-progress-secs aria-hidden="true"></small></p>`;
  if (S.sol?.line) return `<p class="jd-sol ${S.sol.accepted ? 'accepted' : 'withheld'}" role="status">${esc(S.sol.line)}</p>`;
  if (!c?.configured || !S.aiEnabled) return `<p class="jd-sol">Sol was not consulted${!S.aiEnabled ? ' (the project disallows external AI processing)' : ''}: the deterministic draft stands.</p>`;
  return `<p class="jd-sol"><button type="button" class="btn" data-jd-act="sol" ${S.busy || !records().some(r => r.kind === 'guided' && live(r)) ? 'disabled' : ''}>Ask Sol to draft</button><span>One request for this chapter, checked against the passages and records it cites; the deterministic draft stands if it fails.</span></p>`;
}
// The source the chapter is drafted from, and the switch to the other one when the project keeps both.
function switchHTML() {
  const m = S.model, modelName = m?.name ? `${esc(m.name)}${m.format ? ' · ' + esc(FORMAT_WORDS[m.format] || m.format) : ''}` : 'the model';
  if (S.mode === 'model') return `<p class="jd-switch"><span>Drafted from the model <b>${modelName}</b>${m?.elements != null ? ` · ${plural(m.elements, 'element')}, ${plural(m.stated || 0, 'stated name')}` : ''}; the brief rules fill in where the model says nothing.</span>${S.brief?.kept ? `<button type="button" class="btn jd-mode" data-jd-act="mode" data-jd-mode="brief" ${S.busy ? 'disabled' : ''}>Draft from the brief instead</button>` : ''}</p>`;
  if (m?.kept) return `<p class="jd-switch"><span>Drafted from the brief. This project also keeps a model, <b>${modelName}</b>.</span><button type="button" class="btn jd-mode" data-jd-act="mode" data-jd-mode="model" ${S.busy ? 'disabled' : ''}>Draft from the model</button></p>`;
  return '';
}
function surfaceHTML() {
  if (S.grouped) return groupedHTML();
  const ch = S.chapter, d = S.draft, model = S.mode === 'model', head = `<small class="jd-kicker">Journey draft · Chapter ${ch} of 11${model ? ' · from the model' : ''}${S.whole ? ' · drafting the whole journey' : ''}</small><h2 id="jd-title" tabindex="-1">Draft Chapter ${ch} · ${esc(TITLES[ch])}</h2>`;
  if (S.loading) return `<header class="jd-head">${head}<p role="status">Drafting Chapter ${ch} from the ${model ? 'model' : 'brief'} and the chapters before it…</p></header>`;
  if (S.error && !d) return `<header class="jd-head">${head}<p class="jd-error" role="alert">${esc(S.error)}</p><div class="jd-actions"><button type="button" class="btn" data-jd-act="close">Close</button></div></header>`;
  const rs = records(), pending = rs.filter(live), gaps = (d.gaps || []).filter(g => !g.record), stated = rs.filter(fromModel).length;
  const next = (S.whole || S.accepted) && ch < 11 ? `<button type="button" class="btn ${S.accepted || !pending.length ? 'primary' : ''}" data-jd-act="next">Draft Chapter ${ch + 1}</button>` : '';
  const accept = pending.length ? `<button type="button" class="btn primary" data-jd-act="accept" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Accepting the chapter…' : 'Accept chapter · ' + plural(pending.length, 'record')}</button>` : '';
  const intro = model ? `${plural(rs.length, 'proposed record')}: ${stated} read from the model${rs.length - stated ? `, ${rs.length - stated} from the brief rules where the model says nothing` : ''}, with the chapters before this one. A value is stated when the model’s line holds its words, inferred when a rule read it from that line; open questions keep an explicit open answer until you answer them. Nothing is saved until you accept the chapter, and every saved record stays unconfirmed.` : `${plural(rs.length, 'proposed record')} from the brief and the chapters before this one. Each value says where it comes from; open questions keep an explicit open answer until you answer them. Nothing is saved until you accept the chapter, and every saved record stays unconfirmed.`;
  return `<header class="jd-head">${head}<p>${rs.length ? intro : esc(d.empty || 'Nothing to draft in this chapter.')}</p>${switchHTML()}${S.brief?.note ? `<p class="jd-source-note">${esc(S.brief.note)}</p>` : ''}${solHTML()}<div class="jd-actions">${accept}${next}<button type="button" class="btn" data-jd-act="close" ${S.busy ? 'disabled' : ''}>Close</button>${(Object.keys(S.values).length || S.skipped.size) && !S.busy ? '<button type="button" class="btn" data-jd-act="clear-answers">Clear saved answers</button>' : ''}</div><p class="jd-progress" role="status" aria-live="polite">${esc(S.progress)}</p>${S.error ? `<p class="jd-error" role="alert">${esc(S.error)}${S.openDraft ? ` <button type="button" class="btn" data-jd-act="discard">Set aside the open guided draft</button>` : ''}</p>` : ''}${S.message ? `<p class="jd-message" role="status">${esc(S.message)}</p>` : ''}</header>`
    + (rs.length ? `<ol class="jd-records">${rs.map(cardHTML).join('')}</ol>` : '')
    + (gaps.length ? `<section class="jd-gaps" aria-labelledby="jd-gaps-title"><h3 id="jd-gaps-title">What the ${model ? 'model and the brief do' : 'brief does'} not say</h3><ul>${gaps.map(g => `<li>${esc(g.question)}</li>`).join('')}</ul><p>Answer these in the chapter's records as you confirm them.</p></section>` : '');
}
function companionHTML() {
  if (S.grouped) return groupedCompanionHTML();
  const d = S.draft, procedure = d?.basis?.procedure, cites = d?.citations || [], model = S.mode === 'model';
  const passages = S.passages.length ? `<ol class="jd-passages">${S.passages.map(x => `<li id="jd-${esc(x.id)}"><b>${esc(x.id)}</b> ${esc(x.text)}</li>`).join('')}</ol>` : `<p>No brief passage is cited in this chapter: its values come from ${model ? 'the model and ' : ''}the records before it.</p>`;
  const lines = model ? `<h3>Model lines · ${esc(S.model?.name || 'the model')}</h3>${S.modelPassages.length ? `<ol class="jd-passages jd-model-lines">${S.modelPassages.map(x => `<li id="jd-m-${esc(x.id)}"><b>${esc(x.id)}</b> <code>${esc(x.text)}</code></li>`).join('')}</ol>` : '<p>No model line is cited in this chapter: the model names nothing for it, so the brief rules drafted it.</p>'}` : '';
  const citations = cites.length ? `<ul class="jd-cites">${cites.map(c => `<li><small>${c.kind === 'governed-claim' ? 'Released claim' : 'Playbook passage'} · ${esc(c.objectId)}</small><b>${esc(c.title)}</b><span>${esc(c.excerpt)}</span>${c.reasoningExcerpt&&c.reasoningExcerpt!==c.excerpt?`<details><summary>Conditions and source context</summary><pre class="brain-prose">${esc(c.reasoningExcerpt)}</pre><p class="jd-note">Source changes require rechecking the draft against the current conditions.</p></details>`:''}</li>`).join('')}</ul>` : '<p>No released claim or Playbook passage matched this chapter.</p>';
  return `<section class="jd-companion" aria-label="Where the draft comes from"><header class="r-inspector-head"><span>Sources</span><small>Chapter ${S.chapter}</small></header><div class="jd-companion-body">${lines}<h3>Brief passages</h3>${passages}<h3>Method and knowledge</h3>${procedure ? `<p><b>${esc(procedure.title)}</b></p><ul>${(procedure.questions || []).map(q => `<li>${esc(q)}</li>`).join('')}</ul>` : ''}${citations}<p class="jd-note">Only released, reviewed claims and Playbook passages are cited; candidate and discovery knowledge never are. A citation informs the draft; it does not make a value true.</p></div></section>`;
}

// ---------------------------------------------------------------- actions

function onInput(e) {
  if (e.target?.matches?.('[data-jd-act="g-reviewed"]')) { G.reviewed = e.target.checked; const b = document.querySelector('.jd [data-jd-act="g-apply"]'); if (b) b.disabled = !G.reviewed || G.busy || G.stale || G.review?.done !== G.review?.total; return; }
  const el = e.target.closest('[data-jd-field][data-jd-record]');
  if (!el) return;
  (S.values[el.dataset.jdRecord] ||= {})[el.dataset.jdField] = el.value;
  keepAnswers();
}
async function onClick(e) {
  const b = e.target.closest('[data-jd-act]');
  // A checkbox keeps its own click; its change is read by onInput (the reviewed preview).
  if (!b || b.disabled || b.type === 'checkbox') return;
  e.preventDefault();
  const act = b.dataset.jdAct, key = b.dataset.jdRecord;
  if (act === 'close') return closeJourneyDraft();
  if (act === 'g-start') return requestReplacement('draft', b.dataset.jdMode || 'model');
  if (act === 'g-records') return showDraftRecords(b.dataset.jdChapter, Number(b.dataset.jdOffset || 0));
  if (act === 'g-mark-page') return markDraftPage();
  if (act === 'g-summary') { document.querySelector('#jd-final-review')?.focus({preventScroll:false}); return; }
  if (act === 'g-keep-preview') { G.pendingReplace = null; mount(); document.querySelector('#jd-preview-title')?.focus({preventScroll:false}); return; }
  if (act === 'g-confirm-replace') { const pending = G.pendingReplace; G.pendingReplace = null; return pending?.kind === 'word' ? wordChapter(pending.chapter) : startArchitectureDraft(pending?.mode || 'model'); }
  if (act === 'g-cancel') return cancelJob(b.dataset.jdJob);
  if (act === 'g-apply') return applyArchitectureDraft();
  if (act === 'g-word') return requestReplacement('word', document.querySelector('.jd [data-jd-word-chapter]')?.value);
  if (act === 'skip') { if (S.busy) return; S.skipped.add(key); keepAnswers(); return mount(); }
  if (act === 'unskip') { if (S.busy) return; S.skipped.delete(key); keepAnswers(); return mount(); }
  if (act === 'clear-answers') { clearAnswers(); S.message = 'Saved answers and skips cleared for this chapter.'; return mount(); }
  if (act === 'edit') { S.editing = key + ':' + b.dataset.jdField; mount(); document.getElementById(`jd-${key}-${b.dataset.jdField}`)?.focus(); return; }
  if (act === 'editor') return openEditor(key, b.dataset.jdId);
  if (act === 'sol') return askSol();
  if (act === 'accept') return accept();
  if (act === 'next') return openJourneyDraft({chapter: S.chapter + 1, whole: S.whole, mode: S.mode});
  if (act === 'mode') return openJourneyDraft({chapter: S.chapter, whole: S.whole, mode: b.dataset.jdMode});
  if (act === 'discard') return setAside();
}
function openEditor(key, id) {
  const r = records().find(x => x.key === key), spark = window.aiwFieldSpark;
  if (!r || !spark) return;
  const text = x => x.display === undefined && !x.numeric, f = r.fields.find(x => text(x) && x.basis !== 'gap') || r.fields.find(text) || r.fields[0], ref = (f.upstream || [])[0] || 'brief';
  const command = EDITOR[S.chapter];
  spark.openRecordEditor(command, command === 'review.narrative' ? null : id, {field: f.key, value: valueOf(r, f) ?? f.value, suggestion: {source: 'project', ref, refLabel: ref === 'brief' ? 'Brief' : ref}, focus: true}).then(opened => { if (!opened) { S.message = 'Close the open dialog first, then open the editor again.'; mount(); } });
}

// A guided draft left open in this chapter (the person's own, or an accept that was interrupted) is set aside only when
// the person asks: guide.discard-draft keeps its answers in the session's history.
async function setAside() {
  try { await store().command({type: 'guide.discard-draft', payload: {chapter: S.chapter}}); S.openDraft = false; S.error = ''; S.message = 'The open guided draft was set aside; its answers stay in the chapter guide\'s history. Accept the chapter again.'; }
  catch (e) { S.error = e.message; }
  mount();
}
// Sol drafts the chapter (mode 'journey'): one request; an accepted draft replaces the values it answers, each marked
// Sol and cited; a withheld or failed one leaves the deterministic draft, and the line says why.
async function askSol() {
  if (!S.packet || S.busy) return;
  const requestId = uuid(), running = S.sol = {running: true, progress: ''}; mount();
  // The step the server records for the pending run, read through Sol's panel (coauthor-ui.js window.aiwSolBridge).
  const stop = window.aiwSolBridge?.watch?.(requestId, 'journey', (line, step, secs) => {
    if (S.sol !== running) return;
    running.progress = line;
    const el = document.querySelector('.jd [data-jd-progress]'), t = document.querySelector('.jd [data-jd-progress-secs]');
    if (el && el.textContent !== line) el.textContent = line;
    if (t) t.textContent = secs + ' s';
  }) || (() => {});
  try {
    const run = await servicePost('/api/intelligence/journey', {chapter: S.chapter, requestId, packetStamp: S.packet.stamp}, {fallback: 'Sol could not draft this chapter.'});
    const answers = run.result?.answers || [];
    if (run.result?.withheld || !answers.length) { S.sol = {line: `Sol was consulted (run ${String(run.id).slice(0, 8)}); ${run.result?.reason || 'it proposed nothing the checks accept.'}${run.result?.issues?.length ? ' ' + run.result.issues.slice(0, 2).join(' ') : ''} The deterministic draft stands.`, accepted: false}; return; }
    for (const a of answers) {
      const r = records().find(x => x.key === a.record), f = r?.fields.find(x => x.key === a.field);
      if (!r || !f || !live(r) || f.key === 'type') continue;
      const upstream=a.sourceRefs.filter(ref=>(S.packet.upstream||[]).some(s=>s.ref===ref)),knowledge=(S.packet.sources||[]).filter(s=>a.sourceRefs.includes(s.ref));
      Object.assign(f, {value: a.value, display: f.options?.find(o => o.id === a.value)?.title ?? (f.display !== undefined ? a.value : undefined), basis: 'sol', passages: a.passages, upstream, knowledgeRefs:knowledge.map(s=>s.id), note: 'Sol draft, run ' + run.id});
      r.answers[a.field] = a.value;
      const pv = r.provenance;
      r.provenance = {...pv, mode: 'sol', runId: run.id, passages: [...new Set([...pv.passages, ...a.passages])].slice(0, 40), upstream: [...new Set([...pv.upstream, ...upstream])].slice(0, 40),claimIds:[...new Set([...(pv.claimIds||[]),...knowledge.filter(s=>s.kind==='governed-claim').map(s=>s.objectId)])].slice(0,20),playbook:[...new Set([...(pv.playbook||[]),...knowledge.filter(s=>s.kind==='brain-method').map(s=>s.objectId)])].slice(0,20)};
      if (S.values[r.key]) delete S.values[r.key][a.field];
    }
    S.sol = {line: `Sol drafted ${plural(answers.length, 'value')} (run ${String(run.id).slice(0, 8)}, checked against the passages and records it cites). They are marked Sol; review them before accepting.`, accepted: true};
  } catch (e) {
    S.sol = {line: `Sol was not consulted: ${e.message} The deterministic draft stands.`, accepted: false};
  } finally { stop(); if (S.sol?.running) S.sol = null; mount(); }
}

// Ids the draft named for records the same chapter creates are mapped to the ids the commits gave them.
function remap(value) {
  if (typeof value === 'string') return S.idMap.get(value) || value;
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, remap(v)]));
  return value;
}
function answersOf(r) {
  const out = {...r.answers};
  for (const f of r.fields) { const v = valueOf(r, f); if (v === undefined) continue; const t = String(v).trim(); if (t || f.optional) out[f.key] = t; }
  const mapped = remap(out);
  // An optional choice that names a skipped record (a requirement's journey step, say) is left open, not refused.
  for (const f of r.fields) if (f.optional && mapped[f.key] === SKIPPED) mapped[f.key] = '';
  return mapped;
}
function provenanceOf(r, p) {
  const pv = r.provenance || {mode: 'deterministic'}, model = pv.mode === 'model' && typeof pv.sourceId === 'string', sol = pv.mode === 'sol' && pv.runId;
  return {mode: model ? 'model' : sol ? 'sol' : 'deterministic', passages: (pv.passages || []).slice(0, 40), upstream: [...new Set(remap(pv.upstream || []))].filter(id => refExists(p, id)).slice(0, 40), claimIds: (pv.claimIds || []).slice(0, 20), playbook: (pv.playbook || []).slice(0, 20), ...(sol ? {runId: pv.runId} : {}), ...(model ? {sourceId: pv.sourceId} : {})};
}
const session = (p, ch) => p?.guidance?.sessions?.find(s => s.chapter === ch && s.objectId === 'project');
// One guided record: start, answer each creation question in the guide's order, commit with the preview stamp.
async function commitGuided(r, ch) {
  const st = store();
  let p = st.value.document;
  if (session(p, ch)?.creation) throw Object.assign(Error(`Chapter ${ch} has an open guided draft. Finish it in the chapter guide, or set it aside here, then accept again.`), {openDraft: true});
  const answers = answersOf(r);
  // A record that names a record the person skipped (or that was not saved) cannot be committed as drafted.
  const plan = {};
  for (let i = 0; i < 40; i++) { const f = creationFields(p, ch, plan).find(x => !Object.hasOwn(plan, x.key)); if (!f) break; const v = answers[f.key] ?? ''; if (f.options && v && !f.options.some(o => o.id === v)) throw Object.assign(Error('It names a record that was skipped or not saved.'), {skip: true}); plan[f.key] = v; }
  await st.command({type: 'guide.start', payload: {chapter: ch}});
  // An answer the guide starts with (a Chapter 1 record's type is a requirement until said otherwise) is answered first
  // when the draft says otherwise, so the questions that follow are that type's.
  for (const [key, value] of Object.entries(session(st.value.document, ch)?.creation?.answers || {})) if (answers[key] !== undefined && String(answers[key]) !== String(value)) { p = st.value.document; await st.command({type: 'guide.draft-answer', payload: {chapter: ch, field: key, answer: String(answers[key]), basis: guideBasis(p, ch, null)}}); }
  for (let i = 0; i < 40; i++) {
    p = st.value.document;
    const draft = session(p, ch)?.creation?.answers || {}, f = creationFields(p, ch, draft).find(x => !Object.hasOwn(draft, x.key));
    if (!f) break;
    await st.command({type: 'guide.draft-answer', payload: {chapter: ch, field: f.key, answer: String(answers[f.key] ?? ''), basis: guideBasis(p, ch, null)}});
  }
  p = st.value.document;
  const final = session(p, ch).creation.answers, stamp = compileCreation(p, ch, final).stamp;
  const result = await st.command({type: 'guide.commit-draft', payload: {chapter: ch, stamp, reviewed: true, provenance: provenanceOf(r, p)}});
  return session(result.document, ch)?.lastCreated || [];
}
// What follows a guided commit: the links between Chapter 1 context records (an actor's journey steps, a stakeholder's
// outcomes, a scope boundary's steps), as one reviewed change of relationship commands — accepting the card is the
// review. They touch no requirement, so no change to review is raised; everything else a record is made with is in its
// own commit. A link to a record that was skipped is dropped. A model's process elements (a BPMN model's events and
// gateways) follow the same way, one reviewed change each so the id each is given is known to the flows that name it,
// then the flows, twenty at a time; a flow whose end was skipped, or names an element that was not made, is dropped.
const resolveRefs = (value, refs) => typeof value === 'string' ? (isRef(value) && refs.has(value) ? refs.get(value) : value) : Array.isArray(value) ? value.map(v => resolveRefs(v, refs)) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, refs)])) : value;
async function commitExtras(r) {
  const st = store(), all = remap(r.extras || []);
  const apply = (part, reason) => { const q = previewWorkingChange(st.value.document, part); return st.command({type: 'workspace.apply', payload: {commands: part, stamp: q.stamp, reviewed: true, reason}}); };
  const links = all.filter(c => c.type === 'relationship' && c.payload.from !== SKIPPED && c.payload.to !== SKIPPED);
  for (let i = 0; i < links.length; i += 20) await apply(links.slice(i, i + 20), `Journey draft accepted: the links proposed for ${r.title}.`);
  const refs = new Map(), gone = v => v === SKIPPED || isRef(v) ? '' : v;
  for (const c of all.filter(c => c.type === 'process.element')) {
    const payload = resolveRefs(c.payload, refs), made = await apply([{type: c.type, payload: {...payload, attachedTo: gone(payload.attachedTo), parentId: gone(payload.parentId)}}], `Journey draft accepted: ${payload.kind} “${payload.title}” from the model, for ${r.title}.`);
    if (c.ref && made?.selected) refs.set(c.ref, made.selected);
  }
  const flows = all.filter(c => c.type === 'process.transition').map(c => ({type: c.type, payload: resolveRefs(c.payload, refs)})).filter(c => ![c.payload.from, c.payload.to].some(v => v === SKIPPED || isRef(v)));
  for (let i = 0; i < flows.length; i += 20) await apply(flows.slice(i, i + 20), `Journey draft accepted: the process flows proposed for ${r.title}.`);
}
async function accept() {
  const st = store(), ch = S.chapter;
  if (!st || S.busy) return;
  const queue = records().filter(live);
  if (!queue.length) return;
  const dead = r => (r.creates || []).forEach(id => { if (!S.idMap.has(id)) S.idMap.set(id, SKIPPED); });
  records().filter(r => S.skipped.has(r.key) || r.blocked).forEach(dead);
  S.busy = true; S.error = ''; S.message = ''; S.openDraft = false; mount();
  let done = 0;
  try {
    for (const r of queue) {
      S.progress = `Saving record ${done + 1} of ${queue.length} through the chapter guide…`; mount();
      let created;
      try { created = await commitGuided(r, ch); }
      catch (e) { if (e.skip) { S.blocked.set(r.key, e.message); dead(r); continue; } throw e; }
      (r.creates || []).forEach((id, i) => { if (created[i]) S.idMap.set(id, created[i]); });
      await commitExtras(r);
      S.saved.set(r.key, created.length ? created : ['the narrative']);
      done++;
    }
    S.accepted = true;
    clearAnswers();
    S.progress = '';
    S.message = `Chapter ${ch} accepted: ${plural(done, 'record')} saved, all unconfirmed.${S.whole && ch < 11 ? ` Drafting Chapter ${ch + 1} next.` : ' Confirm each record in the chapter when you have checked it.'}`;
  } catch (e) {
    S.progress = '';
    S.openDraft = !!e.openDraft;
    S.error = `${e.message || 'The chapter could not be saved.'} ${plural(done, 'record')} saved before this; nothing else changed.`;
  } finally {
    S.busy = false;
    refreshShell();
    mount();
  }
  if (S.accepted && S.whole && ch < 11 && !S.error) await openJourneyDraft({chapter: ch + 1, whole: true});
}

// An address that asks for a chapter's draft (?journey=draft, a readiness link opened in a new tab or a bookmark) opens
// it once the shell has drawn that chapter.
export function openFromAddress() {
  const q = new URLSearchParams(location.search), chapter = Number(q.get('chapter') || 1), mode = q.get('mode') === 'model' ? 'model' : 'brief', grouped = q.get('draft') === 'architecture';
  if (q.get('journey') !== 'draft' || !(chapter >= 1 && chapter <= 11)) return;
  let tries = 0;
  const attempt = () => { if (typeof window.aiwRoute === 'function' && document.querySelector('.studio > .stage.tab-content') && store()?.value?.document) openJourneyDraft({chapter, mode, grouped}); else if (++tries < 100) setTimeout(attempt, 100); };
  attempt();
}

// ---------------------------------------------------------------- the architecture draft of a grouped project (round 12)

const groupedBlank = () => ({loading: false, busy: false, draft: null, apply: null, preview: null, revision: null, stale: false, reason: '', error: '', message: '', reviewed: false, review: null, records: null, recordsLoading: false, continuation: '', pendingReplace: null, plan: null, requirements: new Map()});
let G = groupedBlank(), poller = null;
const running = j => !!j && ['queued', 'running'].includes(j.status);
const stopPolling = () => { if (poller) clearTimeout(poller); poller = null; };
// The receipts this tab started, kept for the length of the tab (a reload finds the job by its receipt).
const receiptKey = () => 'aiw-architecture-draft:' + (store()?.value?.document?.id || '');
const receipts = () => { try { return JSON.parse(sessionStorage.getItem(receiptKey()) || '{}') || {}; } catch { return {}; } };
const keepReceipt = (kind, id) => { try { sessionStorage.setItem(receiptKey(), JSON.stringify({...receipts(), [kind]: id})); } catch { /* the server's latest job is the fallback */ } };
async function getJSON(path) {
  const r = await fetch(projectURL(path), {credentials: 'same-origin'});
  let d = {};
  try { d = await r.json(); } catch { d = {}; }
  if (!r.ok) throw Object.assign(Error(d.error || 'The workbench could not answer.'), {status: r.status});
  return d;
}
export async function openArchitectureDraft() {
  install();
  stopPolling();
  S = {...blank(), open: true, chapter: 1, grouped: true};
  G = {...groupedBlank(), loading: true, reason: groupedDraftReason(store()?.value?.document)};
  G.requirements = new Map((store()?.value?.document?.artefacts || []).map(r => [r.id, r]));
  route(1);
  mount();
  try {
    const latest = await getJSON('/api/drafting?action=latest'), kept = receipts();
    G.draft = latest.draft; G.apply = latest.apply;
    // A receipt this tab kept names the job it started; the server's newest job is the same one unless another started since.
    if (kept.draft && kept.draft !== G.draft?.id) { try { G.draft = (await getJSON('/api/drafting?action=status&id=' + encodeURIComponent(kept.draft))).job; } catch { /* the newest stands */ } }
    if (kept.apply && kept.apply !== G.apply?.id) { try { G.apply = (await getJSON('/api/drafting?action=status&id=' + encodeURIComponent(kept.apply))).job; } catch { /* the newest stands */ } }
    if (running(G.draft) || running(G.apply)) poll();
    else if (G.draft?.status === 'completed' && !G.draft.applied) await loadPreview();
  } catch (e) { G.error = e.message; }
  G.loading = false;
  mount();
  document.querySelector('.jd h2')?.focus({preventScroll: false});
  if (!running(G.draft) && !running(G.apply)) loadPlan();
}
// Sol's plan for a model draft, read before it starts (round 23, BR-06): themes, runs, estimated tokens and cost, and
// the project's drafting budget with what it used in 24 hours. A plan that cannot be read never blocks the panel.
async function loadPlan() {
  try { G.plan = await getJSON('/api/drafting?action=plan'); } catch (e) { G.plan = {error: e.message}; }
  if (S.open && S.grouped) mount();
}
// Sol drafts only with an architecture model configured and the owner's policy allowing it (BR-09): once the plan says
// otherwise, Draft with Sol is not offered as an action (planHTML says why); while the plan is read, or when it cannot
// be read, the server's refusal still answers a start.
const solCanDraft = P => !P || !!P.error || (P.configured !== false && P.enabled !== false);
function planHTML(P) {
  if (!P) return '<p class="jd-note" role="status">Working out Sol’s plan for this draft…</p>';
  if (P.error) return `<p class="jd-note" data-jd-plan>Sol’s plan could not be read: ${esc(P.error)}</p>`;
  const p = P.plan, b = P.budget, cost = P.cost ? `, about ${esc(P.cost.amount.toFixed(2))} ${esc(P.cost.currency || '')} at the configured prices` : ', no cost estimated as the routes have no prices configured';
  const said = [`Draft with Sol sends ${plural(p.themes.length, 'theme')} and one cross-cutting pass: ${plural(p.runs, 'model run')}, each a draft call and a check call, using about ${n(p.tokens)} tokens${cost} (an estimate: the provider bills what it reads and writes). ${esc(p.retry)}`];
  if (p.excludedThemes) said.push(`${plural(p.excludedThemes, 'theme')} the disclosure policy excludes keep the rules skeleton.`);
  if (p.notSent) said.push(`${plural(p.notSent, 'theme')} past the job’s theme limit keep the rules skeleton.`);
  said.push(`The project’s drafting budget is ${n(b.requests)} runs and ${n(b.tokens)} tokens in any 24 hours, of which ${n(b.used.runs)} runs and ${n(b.used.tokens)} tokens are used.`);
  said.push(P.fits ? 'This draft fits the budget.' : 'This draft would pass the budget, and the themes past it would keep the rules skeleton; the project owner sets the budget under Operations, AI disclosure and budget.');
  if (!P.configured) said.push('The architecture model is not configured, so Sol cannot draft.');
  else if (!P.enabled) said.push('The project owner disabled external AI processing, so Sol cannot draft.');
  return `<p class="jd-note" data-jd-plan data-jd-fits="${P.fits ? 'yes' : 'no'}">${said.join(' ')}</p>`;
}
async function loadPreview() {
  const r = await getJSON('/api/drafting?action=preview&id=' + encodeURIComponent(G.draft.id));
  G.preview = r.preview; G.revision = r.revision; G.stale = !!r.stale; G.message = r.reason || ''; G.sol = r.sol || null; G.review = r.review || null; G.records = null; G.reviewed = false;
}
async function showDraftRecords(chapter, offset = 0) {
  if (!G.draft || G.recordsLoading) return;
  G.recordsLoading = true; G.error = ''; mount();
  try { G.records = await getJSON('/api/drafting?action=records&id=' + encodeURIComponent(G.draft.id) + '&chapter=' + encodeURIComponent(chapter) + '&offset=' + offset); }
  catch (e) { G.error = e.message; }
  G.recordsLoading = false; mount();
  document.querySelector('#jd-records-title')?.focus({preventScroll: false});
}
async function markDraftPage() {
  if (!G.records || !G.preview || G.busy || G.stale || G.records.reviewed) return;
  G.busy = true; G.error = ''; mount();
  try {
    const r = await servicePost('/api/drafting?action=review-page', {id: G.draft.id, chapter: G.records.chapter, offset: G.records.offset, stamp: G.preview.stamp}, {fallback: 'The page review could not be recorded.'});
    G.review = r.review; G.records.reviewed = true;
    if (G.review?.done === G.review?.total) G.message = 'Every proposal page has been acknowledged. Read the summary and confirm before applying.';
  } catch (e) { G.error = e.message; }
  G.busy = false; mount();
  if (G.review?.done === G.review?.total) document.querySelector('#jd-final-review')?.focus({preventScroll:false});
  else document.querySelector('.jd-record-detail [data-jd-act="g-records"]:not([disabled])[data-jd-offset="' + (G.records?.next ?? '') + '"]')?.focus({preventScroll:true});
}
function requestReplacement(kind, mode) {
  if (G.busy) return;
  if (G.preview && G.review?.done > 0) {
    G.pendingReplace = kind === 'word' ? {kind, chapter: mode} : {kind, mode};
    mount();
    document.querySelector('#jd-replace-title')?.focus({preventScroll:false});
    return;
  }
  return kind === 'word' ? wordChapter(mode) : startArchitectureDraft(mode);
}
function poll() {
  stopPolling();
  poller = setTimeout(async () => {
    if (!S.open || !S.grouped) return;
    try {
      if (running(G.draft)) G.draft = (await getJSON('/api/drafting?action=status&id=' + encodeURIComponent(G.draft.id))).job;
      if (G.draft?.mode === 'model' && G.draft.status === 'queued' && G.draft.progress?.phase === 'awaiting-next') {
        const slice = `${G.draft.id}:${G.draft.progress.done}`;
        if (G.continuation !== slice) {
          G.continuation = slice;
          try { await servicePost('/api/drafting?action=start', {requestId: G.draft.id, mode: 'model'}, {fallback: 'The next theme could not start.'}); }
          catch (e) { G.continuation = ''; throw e; }
        }
      }
      if (running(G.apply)) G.apply = (await getJSON('/api/drafting?action=status&id=' + encodeURIComponent(G.apply.id))).job;
      if (G.draft?.status === 'completed' && !G.preview && !G.draft.applied && !running(G.apply)) await loadPreview();
      if (G.apply?.status === 'completed' && G.apply.id === receipts().apply && !G.applied) { G.applied = true; G.preview = null; try { await store()?.load?.(); } catch { /* the shell reloads on its next read */ } refreshShell(); }
    } catch (e) { G.error = e.message; }
    mount();
    if (running(G.draft) || running(G.apply)) poll();
  }, 700);
}
async function startArchitectureDraft(mode = 'model') {
  if (G.busy) return;
  G.busy = true; G.error = ''; G.message = ''; mount();
  try {
    const requestId = G.draft?.status === 'interrupted' && G.draft?.mode === mode ? G.draft.id : uuid(), r = await servicePost('/api/drafting?action=start', {requestId, mode}, {fallback: 'The draft could not start.'});
    keepReceipt('draft', r.id);
    G.preview = null; G.review = null; G.reviewed = false; G.applied = false; G.continuation = '';
    G.draft = {id: r.id, receipt: r.receipt, status: r.status === 'interrupted' ? 'queued' : r.status, kind: 'draft', mode, progress: {phase: 'queued', chapters: [], themes: []}};
    poll();
  } catch (e) {
    G.error = e.message;
    if (e.status === 409) { try { const latest = await getJSON('/api/drafting?action=latest'); G.draft = latest.draft; if (running(G.draft)) { keepReceipt('draft', G.draft.id); poll(); } } catch { /* the error stands */ } }
  }
  G.busy = false; mount();
}
async function cancelJob(id) {
  if (!id) return;
  try { await servicePost('/api/drafting?action=cancel', {id}, {fallback: 'The job could not be stopped.'}); G.message = 'Stopped. Nothing was saved.'; }
  catch (e) { G.error = e.message; }
  try { const latest = await getJSON('/api/drafting?action=latest'); G.draft = latest.draft; G.apply = latest.apply; } catch { /* keep what is shown */ }
  stopPolling(); mount();
}
async function applyArchitectureDraft() {
  if (G.busy || !G.preview || !G.reviewed || G.stale || G.review?.done !== G.review?.total) return;
  G.busy = true; G.error = ''; mount();
  try {
    const requestId = uuid(), r = await servicePost('/api/drafting?action=apply', {id: G.draft.id, requestId, stamp: G.preview.stamp, revision: G.revision, reviewed: true}, {fallback: 'The draft could not be applied.'});
    keepReceipt('apply', r.id);
    G.apply = {id: r.id, receipt: r.receipt, status: r.status, kind: 'draft-apply', progress: {phase: 'queued', done: 0, total: G.preview.counts.commands}};
    poll();
  } catch (e) { G.error = e.message; }
  G.busy = false; mount();
}
const n = x => Number(x || 0).toLocaleString('en-GB');
const chapterName = c => c === 'delivery' ? 'Delivery plan' : 'Chapter ' + c;
// Sol words one chapter of the draft with the model, group by group (DRF-18): a new draft comes back to preview.
async function wordChapter(chapter = document.querySelector('.jd [data-jd-word-chapter]')?.value) {
  if (G.busy || !G.draft || !chapter) return;
  G.busy = true; G.error = ''; G.message = ''; mount();
  try {
    const requestId = uuid(), r = await servicePost('/api/drafting?action=assist', {id: G.draft.id, chapter, requestId}, {fallback: 'Sol could not be asked to word the draft.'});
    keepReceipt('draft', r.id);
    G.draft = {id: r.id, receipt: r.receipt, status: r.status, kind: 'draft', assist: {from: G.draft.id, chapter}, progress: {phase: 'queued', groups: []}};
    G.preview = null; G.review = null; G.reviewed = false;
    poll();
  } catch (e) { G.error = e.message; }
  G.busy = false; mount();
}
function groupedProgressHTML(job) {
  if (!job) return '';
  const pr = job.progress || {}, isApply = job.kind === 'draft-apply', wording = !!job.assist, model = job.mode === 'model';
  const lines = isApply ? (pr.chapters || []).map(c => `<li>${esc(chapterName(c.chapter))} · ${esc(c.title)}: ${n(c.commands)} commands applied</li>`) : wording ? (pr.groups || []).map(g => `<li>${esc(g.groupId)}: ${esc(g.status === 'accepted' ? plural(g.answers, 'value') + ' worded' : g.status === 'withheld' ? 'withheld by the checks; its wording stands' : g.error || g.status)}</li>`) : model ? (pr.themes || []).map(t => `<li>${esc(t.title)} · ${esc(t.status)} · ${n(t.proposals)} proposals${t.withheld ? ` · ${n(t.withheld)} withheld` : ''}${t.reason || t.error ? ' · ' + esc(t.reason || t.error) : ''}</li>`) : (pr.chapters || []).map(c => `<li>${esc(chapterName(c.chapter))} · ${esc(c.title)}: ${plural(c.records, 'proposal')}</li>`);
  const paused = pr.phase === 'paused-budget' ? `AI budget paused this draft. ${n(pr.done)} of ${n(pr.total)} themes saved. Next check ${esc(new Date(pr.retryAt).toLocaleString())}. ${esc(pr.message || '')}` : '';
  const line = paused || (isApply ? `Applying: ${n(pr.done)} of ${n(pr.total)} commands${pr.chapter != null ? ` · now ${esc(chapterName(pr.chapter))}` : ''}${pr.phase === 'saving' ? ' · saving' : ''}` : wording ? `Sol is wording ${esc(chapterName(job.assist.chapter))}: ${n((pr.groups || []).length)} of ${n(pr.total)} requirement groups, one checked request each` : model ? `${pr.phase === 'awaiting-next' ? 'Continuing' : 'Sol is drafting and checking'} ${n(pr.done)} of ${n(pr.total)} themes; each completed theme is saved` : `Rules draft: ${plural((pr.chapters || []).length, 'chapter')} of ${n(pr.total || 12)} drafted, ${plural(pr.records || 0, 'proposal')} so far`);
  return `<div class="jd-job" data-jd-receipt="${esc(job.id)}" data-jd-status="${esc(job.status)}"><p class="jd-progress" role="status" aria-live="polite">${running(job) ? line : esc(job.status === 'interrupted' ? 'The job stopped with the server. Start it again.' : '')}</p>${lines.length ? `<ol class="jd-chapters">${lines.join('')}</ol>` : ''}<p class="jd-receipt">Receipt ${esc(job.id)} · ${esc(job.status)}</p>${running(job) ? `<div class="jd-actions"><button type="button" class="btn" data-jd-act="g-cancel" data-jd-job="${esc(job.id)}">Stop</button></div>` : ''}</div>`;
}
function draftRecordHTML(r) {
  const valueOf = v => Array.isArray(v) ? v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(', ') : typeof v === 'boolean' ? v ? 'Yes' : 'No' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  const fields = r.commands.flatMap(c => Object.entries(c.payload || {}).filter(([k, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length) && !['id', 'open', 'confirmed', 'targetConfirmed'].includes(k)).map(([k, v]) => `<div class="jd-review-field"><dt>${esc(k.replace(/([A-Z])/g, ' $1').replace(/\bIds\b/, 'IDs'))}</dt><dd>${esc(valueOf(v))}</dd></div>`));
  const source = r.cites?.length ? `<details class="jd-review-sources"><summary>Source requirements · ${r.cites.length}</summary><ul>${r.cites.map(id => { const req = G.requirements.get(id),url = projectURL('/?chapter=1&tab=work&artefact=' + encodeURIComponent(id)); return `<li><a href="${esc(url)}" target="_blank" rel="noopener" aria-label="Open requirement ${esc(id)} in a new tab">${esc(id)}</a>${req ? ` · <b>${esc(req.title)}</b>${req.description ? `<p>${esc(shortText(req.description, 260))}</p>` : ''}` : ''}</li>`; }).join('')}</ul><small>Source opens in a new tab so your review page remains here.</small></details>` : '<p class="jd-receipt">Requirements linked through the group.</p>';
  return `<article class="jd-review-card"><header><small>${esc(r.kind)} · ${esc(r.sol?.engine === 'model' ? 'Sol model · ' + (r.sol.theme || '') : 'Rules skeleton')}${r.wording?.length ? ' · Sol wording' : ''}</small><h4>${esc(r.title)}</h4></header>${r.note ? `<p>${esc(r.note)}</p>` : ''}<p class="jd-receipt">Requirements: ${esc(r.cites.join(', ') || 'linked through group')} · Groups: ${esc(r.groups.join(', ') || 'none')}</p>${source}${r.reasoning ? `<div class="jd-reasoning"><p><b>Source basis</b> ${esc(r.reasoning.basis)}</p><p><b>Sol’s interpretation</b> ${esc(r.reasoning.interpretation)}</p>${r.reasoning.passages?.length ? `<p><b>Passages</b> ${esc(r.reasoning.passages.join(', '))}</p>` : ''}</div>` : ''}${r.wording?.length ? `<p class="jd-note">Sol reworded ${esc(r.wording.map(w => w.field).join(', '))}; source references: ${esc([...new Set(r.wording.flatMap(w => w.sourceRefs || []))].join(', ') || 'none recorded')}.</p>` : ''}<dl class="jd-review-fields">${fields.join('')}</dl>${r.commands.some(c => c.payload?.open && Object.keys(c.payload.open).length) ? `<p class="jd-note">Open fields: ${esc([...new Set(r.commands.flatMap(c => Object.keys(c.payload?.open || {})))].join(', '))}</p>` : ''}</article>`;
}
function draftRecordsHTML() {
  const page = G.records;
  if (G.recordsLoading) return '<p role="status">Loading the proposal details…</p>';
  if (!page) return '';
  const chapters = G.preview?.chapters?.filter(c => c.records) || [], nextChapter = chapters.slice(chapters.findIndex(c => String(c.chapter) === String(page.chapter)) + 1)[0];
  return `<section class="jd-record-detail" aria-labelledby="jd-records-title"><header><h3 id="jd-records-title" tabindex="-1">${esc(chapterName(page.chapter))} · ${esc(page.title)}</h3><p>${n(page.total)} proposals · showing ${page.total ? n(page.offset + 1) : 0}–${n(Math.min(page.total, page.offset + page.records.length))}. Read the proposed fields, alternatives, citations, and open values before applying.</p></header>${page.records.map(draftRecordHTML).join('') || '<p>No proposals in this chapter.</p>'}<div class="jd-actions jd-page-review"><button type="button" class="btn" data-jd-act="g-mark-page" ${page.reviewed || G.busy || G.stale ? 'disabled' : ''}>${page.reviewed ? 'Page reviewed ✓' : 'Mark this page reviewed'}</button><small>Mark each page after reading it. Your progress is saved with this draft.</small></div><nav class="jd-actions" aria-label="Proposal pages"><button type="button" class="btn" data-jd-act="g-records" data-jd-chapter="${esc(page.chapter)}" data-jd-offset="${Math.max(0, page.offset - 20)}" ${page.offset === 0 ? 'disabled' : ''}>Previous 20</button><button type="button" class="btn" data-jd-act="g-records" data-jd-chapter="${esc(page.chapter)}" data-jd-offset="${page.next ?? 0}" ${page.next == null ? 'disabled' : ''}>Next 20</button>${page.next == null && nextChapter ? `<button type="button" class="btn" data-jd-act="g-records" data-jd-chapter="${esc(nextChapter.chapter)}" data-jd-offset="0">Next · ${esc(chapterName(nextChapter.chapter))}</button>` : ''}</nav></section>`;
}
function previewHTML(pv) {
  if (!pv) return '';
  const seen = new Set(G.review?.pages || []);
  const rows = pv.chapters.map(c => { const pages = Math.ceil(c.records / 20), done = [...seen].filter(key => key.startsWith(c.chapter + ':')).length, offset = Array.from({length:pages},(_,i)=>i*20).find(i=>!seen.has(c.chapter + ':' + i)) ?? 0; return `<tr data-jd-chapter="${esc(c.chapter)}"><th scope="row">${esc(chapterName(c.chapter))} · ${esc(c.title)}</th><td>${n(c.records)}</td><td>${pages ? `<button type="button" class="btn" data-jd-act="g-records" data-jd-chapter="${esc(c.chapter)}" data-jd-offset="${offset}" ${G.recordsLoading || G.busy ? 'disabled' : ''}>${done === pages ? 'Revisit proposals' : done ? 'Continue review' : 'Review proposals'} · ${done}/${pages} pages</button>` : 'No proposals'}</td></tr>`; }).join('');
  const t = pv.trace;
  const caps = pv.caps.filter(c => c.drafted).map(c => `<tr class="${c.headroom < 0 ? 'over' : ''}"><th scope="row">${esc(c.label)}</th><td>${n(c.have)}</td><td>${n(c.drafted)}</td><td>${n(c.limit)}</td><td>${n(c.headroom)}</td></tr>`).join('');
  const asks = [...(pv.asks || []).map(a => a.question), ...(pv.notes || [])];
  return `<section class="jd-preview" aria-labelledby="jd-preview-title" data-jd-receipt="${esc(G.draft?.id || '')}"><h3 id="jd-preview-title">The draft · ${plural(pv.counts.records, 'proposal')} in ${plural(pv.chapters.length, 'chapter')}</h3>
<p class="jd-receipt">Receipt ${esc(G.draft?.id || '')} · kept in this tab, so a reload finds this draft again.</p>
<p>${n(t.traced)} of ${n(t.requirements)} requirements traced through their groups; ${n(t.placed)} placed on a journey step or a supporting or administrative process.</p>
<p class="jd-note">${G.draft?.mode === 'model' ? `Sol drafted ${n(G.draft?.modelReview?.accepted)} of ${n(G.draft?.modelReview?.themes)} themes with the model. ${n(G.draft?.modelReview?.withheld)} withheld, ${n(G.draft?.modelReview?.failed)} failed, ${n(G.draft?.modelReview?.notSent)} not sent; those themes keep the rules skeleton. Cross-cutting pass: ${esc(G.draft?.modelReview?.cross || 'not sent')}.` : 'This draft uses the rules skeleton. Choose Sol model drafting to ask the configured architecture model to propose the design.'}</p>
<p class="jd-review-progress" role="status">Proposal pages reviewed: <b>${n(G.review?.done)} of ${n(G.review?.total)}</b>. Open each chapter and mark each page after reading it. You can resume after a reload.</p>
${G.draft?.mode === 'model' && G.draft?.progress?.themes?.length ? `<details class="jd-theme-review"><summary>Theme checks · ${n(G.draft.progress.themes.length)} themes and passes</summary><ul>${G.draft.progress.themes.map(t => `<li><b>${esc(t.title)}</b> · ${esc(t.status)} · ${n(t.proposals)} proposals${t.withheld ? ` · ${n(t.withheld)} withheld` : ''}${t.reason || t.error ? `<small>${esc(t.reason || t.error)}</small>` : ''}</li>`).join('')}</ul></details>` : ''}
<table class="jd-table" data-jd-counts><caption>Proposals per chapter · open every chapter for the full fields</caption><thead><tr><th scope="col">Chapter</th><th scope="col">Proposals</th><th scope="col">Details</th></tr></thead><tbody>${rows}</tbody></table>
${draftRecordsHTML()}
<table class="jd-table" data-jd-caps><caption>Every cap the draft meets, with its headroom</caption><thead><tr><th scope="col">Records</th><th scope="col">Held</th><th scope="col">Drafted</th><th scope="col">Bound</th><th scope="col">Headroom</th></tr></thead><tbody>${caps}</tbody></table>
${asks.length ? `<ul class="jd-asks">${asks.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<p class="jd-note">${esc(pv.doctrine)}</p>
<section id="jd-final-review" class="jd-apply-review" tabindex="-1" aria-labelledby="jd-final-title"><h3 id="jd-final-title">Final review and apply</h3><p>${G.review?.done === G.review?.total ? 'Every page has been acknowledged. Confirm the summary before applying.' : 'Open every chapter and acknowledge each proposal page before applying.'}</p>
<label class="jd-review"><input type="checkbox" data-jd-act="g-reviewed" ${G.reviewed ? 'checked' : ''} ${G.stale || G.review?.done !== G.review?.total ? 'disabled' : ''}> I have reviewed the preview and all proposal pages.</label>
<div class="jd-actions"><button type="button" class="btn primary" data-jd-act="g-apply" ${!G.reviewed || G.busy || G.stale || G.review?.done !== G.review?.total ? 'disabled' : ''}>Apply proposals</button><button type="button" class="btn" data-jd-act="g-start" data-jd-mode="model" ${G.busy ? 'disabled' : ''}>Draft with Sol again</button><button type="button" class="btn" data-jd-act="g-start" data-jd-mode="rules" ${G.busy ? 'disabled' : ''}>Draft with rules</button></div>
<p class="jd-note">The records are saved as Sol's proposals, not reviewed by a person: you are recorded as the person who applied them, not as their author. Each stays a proposal until a person keeps, completes or retires it.</p></section>${G.sol?.configured && G.sol.enabled && !G.stale ? `
<div class="jd-actions jd-wording"><label>Sol may word <select data-jd-word-chapter>${pv.chapters.filter(c => c.records).map(c => `<option value="${esc(c.chapter)}">${esc(chapterName(c.chapter))} · ${esc(c.title)}</option>`).join('')}</select> with the model</label><button type="button" class="btn" data-jd-act="g-word" ${G.busy ? 'disabled' : ''}>Ask Sol to word it, group by group</button></div>
<p class="jd-note">One checked request per requirement group of that chapter, its context the group's own requirements; Sol rewords titles and descriptions only, and the wording comes back as a new draft to preview. Nothing else changes.</p>` : ''}</section>`;
}
function groupedHTML() {
  const head = `<small class="jd-kicker">Architecture draft · from the requirement groups</small><h2 id="jd-title" tabindex="-1">Draft the architecture</h2><p>${esc(G.reason)}</p>`;
  if (G.loading) return `<header class="jd-head">${head}<p role="status">Reading the drafts of this project…</p></header>`;
  const d = G.draft, a = G.apply, applied = a?.status === 'completed' && (G.applied || d?.applied?.id === a.id);
  const start = !running(d) && !running(a) && !(d?.status === 'completed' && !d.applied && G.preview) && !applied;
  const intro = '<p>Ask Sol to reason through the requirement themes and cross-cutting design using the configured architecture model. Every theme is checked against its source packet; withheld or failed themes keep the rules skeleton. You can also build the rules skeleton directly. Review the proposed fields chapter by chapter before applying; no decision is chosen or approved for you. Keep this browser tab open while themes run; if you leave, reopen Draft architecture to continue from the saved checkpoint.</p>';
  const done = applied ? `<p class="jd-message" role="status" data-jd-applied>Applied: ${plural(a.result?.records || 0, 'proposal')} saved as revision ${n(a.result?.savedRevision)}, drafted by Sol and not reviewed by a person. Each chapter lists them as proposals to keep, complete or retire.</p>` : '';
  const failed = [d, a].filter(j => j && ['failed', 'cancelled', 'interrupted'].includes(j.status) && !running(a)).map(j => `<p class="jd-error" role="alert">${esc(j.kind === 'draft-apply' ? 'Applying' : 'Drafting')} ${esc(j.status)}${j.error ? ': ' + esc(j.error) : '.'}</p>`).join('');
  return `<header class="jd-head">${head}${start ? intro : ''}${G.error ? `<p class="jd-error" role="alert">${esc(G.error)}</p>` : ''}${G.message ? `<p class="jd-message" role="status">${esc(G.message)}</p>` : ''}${done}${failed}
${start ? planHTML(G.plan) : ''}<div class="jd-actions">${start ? `<button type="button" class="btn primary" data-jd-act="g-start" data-jd-mode="model" ${G.busy || !solCanDraft(G.plan) ? 'disabled' : ''}>${d?.status === 'interrupted' && d.mode === 'model' ? 'Resume Sol draft' : 'Draft with Sol'}</button><button type="button" class="btn" data-jd-act="g-start" data-jd-mode="rules" ${G.busy ? 'disabled' : ''}>${d?.status === 'interrupted' && d.mode === 'rules' ? 'Resume rules draft' : 'Build rules skeleton'}</button>` : ''}<button type="button" class="btn" data-jd-act="close">Close</button></div></header>`
    + (G.pendingReplace ? `<section class="jd-replace" aria-labelledby="jd-replace-title"><h3 id="jd-replace-title" tabindex="-1">Replace the reviewed draft?</h3><p>${n(G.review?.done)} page acknowledgements belong to this draft and will not carry into the new one. The current proposal remains available until the next draft starts.</p><div class="jd-actions"><button type="button" class="btn" data-jd-act="g-keep-preview">Keep current draft</button><button type="button" class="btn primary" data-jd-act="g-confirm-replace">Start new draft</button></div></section>` : '')
    + (running(d) || (d?.progress?.chapters?.length || d?.progress?.themes?.length) && !G.preview && !applied ? groupedProgressHTML(d) : '')
    + (a && (running(a) || a.status !== 'completed') ? groupedProgressHTML(a) : '')
    + (!running(a) && !applied ? previewHTML(G.preview) : '');
}
function groupedCompanionHTML() {
  const pv = G.preview;
  return `<section class="jd-companion" aria-label="What the draft rests on"><header class="r-inspector-head"><span>Sources</span><small>Architecture draft</small></header><div class="jd-companion-body"><h3>What it reads</h3><p>The requirements and their groups, what the import kept on each (domain, theme, user group, delivery status, priority band), the brief when there is one, the domain lens you chose, and the SA Playbook for the alternatives a decision compares.</p><h3>What it never reads</h3><p>Candidate and discovery knowledge: nothing a candidate set holds informs a record, a score, a constraint or a conformance result.</p>${pv ? `<h3>Basis</h3><p>${n(pv.basis.requirements)} requirements · ${n(pv.basis.groups)} groups${pv.basis.lens ? ' · lens ' + esc(pv.basis.lens) : ''}${pv.basis.brief ? ' · the brief' : ' · no brief'}</p>` : ''}</div></section>`;
}
