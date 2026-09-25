// Sol in the chapter models' companions (Chapters 2 to 10).
//
// Select a record in any chapter model and its companion carries Sol: ask, see exactly what Sol
// will read (the chapter's reading of the record, its checks, the desk's vitals for the parts it
// touches, and the governed knowledge behind them), send, and read the assessment beside the
// record. Refinements go through the chapter's own change review after the instruments have read
// the design again with them; proposed threats go through Chapter 9's; disagreement is recorded
// with its reason. With nothing selected, Sol's round of the chapter asks about the records with
// the most open checks. Verdicts are marked on the model's cards.
//
// One Sol. The companion's section is where Sol's assessment lives; the overlay panel ("Sol", from
// the assistance bar) shows the same assessment's status rather than a second answer, and offers
// what else Sol can do — explain in words, answer a question in your own words, write. Both draw
// on the same state and tell each other when it changes ('aiw:sol-changed').
//
// The views call four functions: solChapterMount (once per mount), solSection (in the companion),
// solMark (after drawing) and solChapterBind (once per view). The overlay calls solOverlay.
import {SOL, solLoad, solPrepare, solCancel, solSend, solRecord, solBadge, solChapterEntry, solOutcomes, pendingHTML, assessmentHTML, askHTML} from './brain-reasoning-ui.js';
import {verdictText, VERDICTS} from './brain-reasoning.js';
import {solTarget, parseTarget, chapterTitle, chapterCommands, chapterReread, describeReread, chapterRound, whatIfValues, findRecord} from './chapter-reasoning.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const list = v => Array.isArray(v) ? v : [];
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
const NOTE = {chapter: null, text: '', stewards: false};
const note = (chapter, text, {stewards = false} = {}) => { NOTE.chapter = chapter; NOTE.text = text; NOTE.stewards = stewards; };
// A disagreement goes to the knowledge stewards; the note offers the way there.
export const openStewards = () => { if (window.aiwKnowledge?.openView) window.aiwKnowledge.openView('stewardship'); else document.querySelector('[data-brain-launch="mind"]')?.click(); };
// Every surface that shows Sol redraws when another one changes what Sol has prepared, said or recorded.
const changed = from => document.dispatchEvent(new CustomEvent('aiw:sol-changed', {detail: {from}}));
// The companion's footer: what else Sol can do for this selection, in Sol's own panel.
const moreHTML = () => `<p class="cs-more"><button type="button" class="cm-link" data-brain-launch="design">More with Sol</button><small>explain it in words · ask in your own words · write about it</small></p>`;

export function solChapterMount(p, chapter, refresh) { if (p?.id) solLoad(p.id, refresh); }

// The move being explored in Chapter 2's What if, when there is one.
const moveOf = w => { const v = whatIfValues(w || {}); return Object.keys(v).length ? v : null; };
const objectOf = id => id.startsWith('M:') ? parseTarget(id)?.objectId : id.slice(2);
function opts(p, id, chapter, e) {
  const q = parseTarget(id), whatIf = q?.variant === 'whatif';
  const names = id.startsWith('D:') ? Object.fromEntries(list(findRecord(p, id.slice(2))?.record.alternatives).map(a => [a.id, a.title])) : e.item?.names || {};
  return {knobs: e.item?.knobs || [], id, names, choiceIn: id.startsWith('D:') ? 'Chapter 3' : 'Chapter 7',
    useLabel: 'Review Sol’s refinements…', useNote: 'The chapter reads the design again with them; then its change review shows every changed field before anything is saved.',
    staleText: whatIf ? 'The move has changed since Sol assessed it, or the design has. The advice is kept as history; ask Sol about the move as it is now.' : 'The record or what it touches has changed since Sol assessed it. The advice is kept as history; ask Sol again for the design as it is now.',
    outcomes: e ? solOutcomes(p, e.run.id, id) : null};
}
const reads = chapter => `Chapter ${chapter}’s reading of it and the knowledge behind it`;

// Sol's part of the companion for the selection in a chapter model.
export function solSection(p, chapter, sel, {whatIf = null, inPanel = false} = {}) {
  if (!p) return '';
  const more = inPanel ? () => '' : moreHTML;
  const move = moveOf(whatIf), id = sel ? solTarget(p, chapter, sel, {whatIf: !!move}) : null;
  const flash = NOTE.chapter === chapter && NOTE.text ? `<p class="cs-note" role="status"><span>${esc(NOTE.text)}${NOTE.stewards ? ' <button type="button" class="cm-link" data-dk="sol-stewards">Open the stewards’ queue</button>' : ''}</span><button type="button" class="cm-link" data-dk="sol-note-off" aria-label="Dismiss">×</button></p>` : '';
  // A record Sol does not assess in this chapter still has Sol's panel: explain it, ask about it.
  if (!id) return sel ? flash + (findRecord(p, sel) ? `<section class="cs-ask lite"><p><b>Sol</b> can explain this record and answer questions about it.</p>${more()}</section>` : '') : roundSection(p, chapter, flash);
  if (SOL.pending && SOL.pending.request.ids.length === 1 && SOL.pending.request.ids[0] === id) return flash + pendingHTML();
  const values = id.endsWith('|whatif') ? move : null, e = solChapterEntry(p, id, values), title = chapterTitle(p, id, values || {});
  if (e) return flash + assessmentHTML(e, opts(p, id, chapter, e)) + `<section class="dk-solagain">${askHTML([id], {title, label: e.current ? 'Ask Sol again' : 'Ask Sol about it as it is now', reads: reads(chapter)})}${more()}</section>`;
  const what = id.endsWith('|whatif') ? 'this move' : id.startsWith('D:') ? 'this decision' : id.startsWith('M:9:') && !['threat', 'control'].includes(findRecord(p, objectOf(id))?.type) ? 'what could go wrong here' : 'this record';
  const reading = id.startsWith('D:') ? 'the decision as the desk reads it — its alternatives against the drivers, and what it reaches in earlier and later chapters —' : id.endsWith('|whatif') ? 'what the move would reach — the decisions, plans, platform and products that carry the driver —' : `Chapter ${chapter}’s reading of it — its checks, the vitals of the parts it touches —`;
  return flash + `<section class="cs-ask"><h4>Sol · the attending architect</h4><p>Sol reads ${reading} and the knowledge behind them, and advises on ${esc(what)}. You see everything it will read before anything is sent; you decide.</p>${SOL.error && !SOL.pending ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''}${askHTML([id], {title, label: 'Ask Sol to assess it', reads: reads(chapter)})}${more()}</section>`;
}
// Sol's own panel (the overlay). Beside an open chapter model it shows the status of the same
// assessment, never a second one; anywhere else — the Work tabs, Validate — it is the assessment.
export function solOverlay(p, chapter, sel) {
  if (!p || !sel || sel === 'project') return '';
  chapter = Number(chapter);
  if (chapter === 11) return `<section class="brain-sol compact"><p class="cs-status"><b>Sol</b> assesses the running parts and drafted fixes on the review desk (Chapter 11 → Model).</p></section>`;
  const id = solTarget(p, chapter, sel);
  if (!id) return '';
  const beside = document.body.classList.contains('cm-active');
  if (!beside) return `<section class="brain-sol">${solSection(p, chapter, sel, {inPanel: true})}</section>`;
  const e = solChapterEntry(p, id), V = e ? verdictText(e.item?.kind, e.a.verdict) : null, prepared = SOL.pending && SOL.pending.request.ids.includes(id);
  const status = e ? `<span class="dk-solv ${esc(e.a.withheld ? 'withheld' : e.a.verdict)}">${esc(e.a.withheld ? 'Withheld' : V.short)}</span> ${esc(e.a.headline)}${e.current ? '' : ' <em>(the record has changed since)</em>'}` : prepared ? 'What Sol will read is prepared beside the model.' : `Sol has not assessed ${esc(chapterTitle(p, id))} yet.`;
  return `<section class="brain-sol compact"><p class="cs-status"><b>Sol’s assessment</b> · ${status} <button type="button" class="cm-link" data-dk="sol-beside">${e || prepared ? 'Read it beside the model' : 'Ask beside the model'}</button></p></section>`;
}
// With nothing selected: the chapter's records with the most open checks, as one round of advice.
function roundSection(p, chapter, flash) {
  const ids = chapterRound(p, chapter);
  if (!ids.length) return flash;
  if (SOL.pending && SOL.pending.request.ids.join('|') === ids.join('|')) return flash + pendingHTML();
  const es = ids.map(id => [id, solChapterEntry(p, id)]).filter(([, e]) => e && e.current), counts = new Map();
  for (const k of Object.keys(VERDICTS)) for (const [, e] of es) if (!e.a.withheld && e.a.verdict === k) { const w = verdictText(e.item?.kind, k).short.toLowerCase(); counts.set(w, (counts.get(w) || 0) + 1); }
  const noun = chapter === 3 ? 'decisions' : 'records';
  const links = ids.map(id => { const x = findRecord(p, objectOf(id))?.record, e = es.find(([y]) => y === id)?.[1]; return `<button type="button" class="cm-link" data-sel="${esc(objectOf(id))}">${esc(x?.ref || x?.id || id)}${e ? ' ' + solBadge(e, 'inline') : ''}</button>`; }).join(' ');
  return flash + `<section class="cs-round"><h4>Sol’s round · Chapter ${chapter}<span>${ids.length}</span></h4><p>The ${ids.length} ${noun} with the most open checks: ${links}</p>${es.length ? `<p class="cm-muted">Sol has assessed ${es.length} of them as they stand: ${[...counts].map(([w, n]) => `${n} ${esc(w)}`).join(', ') || 'all withheld'}. Select one to read its advice.</p>` : ''}${askHTML(ids, {title: `Sol’s round of Chapter ${chapter}: the ${noun} with the most open checks`, label: es.length === ids.length ? 'Ask Sol again' : `Ask Sol about the ${ids.length}`, reads: `Chapter ${chapter}’s readings of them and the knowledge behind them`})}</section>`;
}
// Sol's section goes straight after the selection's own heading section.
export function solInto(spec, sol) {
  if (!sol) return spec;
  const i = spec.indexOf('</section>');
  return i < 0 ? sol + spec : spec.slice(0, i + 10) + sol + spec.slice(i + 10);
}

// Verdicts on the model's cards: the first drawn element that stands for each assessed record.
export function solMark(root, p, chapter) {
  if (!root || !p) return;
  root.querySelectorAll('.cm-stage .dk-solb.cs').forEach(x => x.remove());
  if (!SOL.byItem.size) return;
  const done = new Set();
  // Cards and row labels first; then anything else drawn for the record.
  for (const el of [...root.querySelectorAll('.cm-stage [data-card], .cm-stage [data-row]'), ...root.querySelectorAll('.cm-stage [data-sel]')]) {
    if (el.matches('.cm-link, .cm-btn, .cm-ins, .cm-mini') || el.closest('.cm-zoom, .cm-key')) continue;
    const key = el.dataset.card || el.dataset.sel || el.dataset.row, id = key ? solTarget(p, chapter, key) : null;
    if (!id || done.has(id) || !SOL.byItem.has(id)) continue;
    const e = solChapterEntry(p, id);
    if (!e) continue;
    done.add(id);
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.insertAdjacentHTML('beforeend', solBadge(e, 'cs'));
  }
}

// ---------------------------------------------------------------- actions

async function recorded(fn, chapter, refresh) {
  try { await fn(); document.dispatchEvent(new CustomEvent('aiw:external-project')); SOL.chapterStamps = new Map(); refresh(); return true; }
  catch (e) { note(chapter, e?.message || 'Sol’s advice could not be recorded.'); refresh(); return false; }
}
// Refinements: the chapter's own change command, read again by the instruments, then its change review.
async function useRefinements(chapter, runId, itemId, refresh) {
  const e = SOL.byItem.get(itemId), store = window.aiwProjectStore, p = project();
  if (!e || e.run.id !== runId || !e.a.refinements.length || !store?.command || !p) return;
  let commands, re;
  try { commands = chapterCommands(p, itemId, Object.fromEntries(e.a.refinements.map(r => [r.key, r.value]))); re = describeReread(chapterReread(p, itemId, commands), {numeric: e.a.refinements.some(r => typeof r.value === 'number')}); }
  catch (err) { note(chapter, `Sol’s refinements could not be applied to the record: ${err.message}`); refresh(); return; }
  const title = chapterTitle(p, itemId);
  let cmd = null;
  try { const {reviewDesignChanges} = await import('./workbench-ui.js'); cmd = await reviewDesignChanges(p, commands, {title: 'Review Sol’s refinements', intro: `<div class="dk-rv"><p><b>Refined by Sol</b> (${esc(e.run.model)}): ${esc(e.a.headline)}</p><p>${esc(re)}</p><p class="cm-muted">Sol proposes; whether to apply it is your decision.</p></div>`, reason: `Sol’s refinements to ${title}: ${e.a.refinements.map(r => r.label).join(', ')}.`}); }
  catch (err) { note(chapter, err.message); refresh(); return; }
  if (!cmd) return;
  // Used while the reading is still the one Sol assessed; applied once the change review has saved it.
  if (!(await recorded(() => solRecord(runId, itemId, 'used'), chapter, refresh))) return;
  try { await store.command(cmd); } catch (err) { note(chapter, err.message); refresh(); return; }
  if (cmd.type === 'workspace.apply') await recorded(() => solRecord(runId, itemId, 'applied'), chapter, refresh);
  note(chapter, cmd.type === 'workspace.apply' ? `Applied through the change review with Sol’s refinements: ${e.a.refinements.map(r => r.label).join(', ')}. ${re}` : `Kept as a design alternative, “${cmd.payload.title}”: nothing changed in the working design.`);
  document.dispatchEvent(new CustomEvent('aiw:external-project')); refresh();
}
async function reviewThreats(chapter, runId, itemId, box, refresh) {
  const e = SOL.byItem.get(itemId), store = window.aiwProjectStore, p = project();
  if (!e || e.run.id !== runId || !store?.command || !p) return;
  const chosen = [...(box?.querySelectorAll('[data-sol-threat]:checked') || [])].map(i => e.a.proposals[Number(i.dataset.solThreat)]).filter(Boolean);
  if (!chosen.length) { note(chapter, 'Choose at least one proposed threat to review.'); refresh(); return; }
  const commands = chosen.map(x => ({type: 'security.threat', payload: {id: null, title: x.title, category: x.category, priority: x.priority, targetIds: x.targetIds, actor: '', scenario: x.scenario, consequence: x.consequence, owner: '',
    priorityBasis: `Proposed by Sol (${e.run.model}); confirm the priority with the security owner.`, assumptions: `Proposed by Sol from Chapter ${chapter}’s reading and the project’s records. Confirm the actor, scenario and priority before relying on it.`, assumptionsResolved: false, origin: 'suggestion'}}));
  let cmd = null;
  try { const {reviewDesignChanges} = await import('./workbench-ui.js'); cmd = await reviewDesignChanges(p, commands, {title: 'Review the threats Sol proposed', intro: `<div class="dk-rv"><p><b>Proposed by Sol</b> as Chapter 9’s own threat records. Sol proposes; you decide what is a threat here.</p></div>`, reason: `Threats Sol proposed for ${e.item?.title || itemId}: ${chosen.map(x => x.title).join('; ')}.`}); }
  catch (err) { note(chapter, err.message); refresh(); return; }
  if (!cmd) return;
  if (!(await recorded(() => solRecord(runId, itemId, 'used'), chapter, refresh))) return;
  try { await store.command(cmd); } catch (err) { note(chapter, err.message); refresh(); return; }
  if (cmd.type === 'workspace.apply') await recorded(() => solRecord(runId, itemId, 'applied'), chapter, refresh);
  note(chapter, cmd.type === 'workspace.apply' ? `Recorded in Chapter 9: ${chosen.length} threat${chosen.length === 1 ? '' : 's'} Sol proposed. Their coverage now reads on the desk and in Chapter 9.` : `Kept as a design alternative, “${cmd.payload.title}”.`);
  document.dispatchEvent(new CustomEvent('aiw:external-project')); refresh();
}

// Once per view: Sol's controls in the companion. `refresh` redraws the view with the current
// document; `whatIf` returns the move being explored, if any.
export function solChapterBind(root, chapterOf, {refresh: redraw, whatIf = () => null, scope = '.cm-panel'}) {
  if (!root || root.dataset.solBound) return;
  root.dataset.solBound = '1';
  const chapterNow = () => Number(typeof chapterOf === 'function' ? chapterOf() : chapterOf);
  // Redraw this surface, and tell the others.
  const refresh = () => { redraw(); changed(root); };
  document.addEventListener('aiw:sol-changed', e => { if (e.detail?.from !== root && root.isConnected) redraw(); });
  root.addEventListener('click', e => {
    const a = e.target.closest(`${scope} [data-dk]`);
    if (!a || a.disabled || !String(a.dataset.dk).startsWith('sol-')) return;
    e.preventDefault();
    const k = a.dataset.dk, chapter = chapterNow();
    if (k === 'sol-note-off') { note(null, ''); refresh(); return; }
    if (k === 'sol-stewards') { openStewards(); return; }
    if (k === 'sol-beside') { document.querySelector('#brain-panel [data-brain-action="close"]')?.click(); document.querySelector('.cm-panel .dk-sol, .cm-panel .dk-solpend, .cm-panel .cs-ask')?.scrollIntoView({block: 'start'}); return; }
    if (k === 'sol-ask') {
      const ids = a.dataset.ids.split(',').filter(Boolean).slice(0, 8), move = moveOf(whatIf());
      const values = Object.fromEntries(ids.filter(id => id.endsWith('|whatif') && move).map(id => [id, move]));
      note(null, '');
      solPrepare({ids, scope: ids.length === 1 ? ids[0] : `chapter-${chapter}:round`, values}, {title: a.dataset.title || '', onChange: refresh}).then(() => root.querySelector(`${scope} .dk-solpend`)?.scrollIntoView({block: 'nearest'}));
      return;
    }
    if (k === 'sol-send') { const prompt = root.querySelector(`${scope} [data-dk-in="sol-prompt"]`)?.value ?? null; solSend({prompt, onChange: refresh}).then(run => { if (run) { note(chapter, SOL.note); SOL.chapterStamps = new Map(); refresh(); root.querySelector(`${scope} .cs-note`)?.scrollIntoView({block: 'nearest'}); } }); return; }
    if (k === 'sol-cancel') { solCancel(refresh); return; }
    if (k === 'sol-use') { useRefinements(chapter, a.dataset.run, a.dataset.item, refresh); return; }
    if (k === 'sol-threats') { reviewThreats(chapter, a.dataset.run, a.dataset.item, a.closest('.dk-sol'), refresh); return; }
    if (k === 'sol-agree') { recorded(() => solRecord(a.dataset.run, a.dataset.item, 'used'), chapter, refresh).then(ok => { if (ok) { note(chapter, 'Recorded: you took Sol’s advice. It stays with the sources it rested on.'); refresh(); } }); return; }
    if (k === 'sol-dismiss') { const f = a.closest('.dk-sol')?.querySelector('.dk-soldis'); if (f) { f.hidden = !f.hidden; f.querySelector('textarea')?.focus(); } }
  });
  root.addEventListener('submit', e => {
    const f = e.target.closest(`${scope} .dk-soldis`);
    if (!f) return;
    e.preventDefault();
    const itemId = f.dataset.solDismiss, x = SOL.byItem.get(itemId), reason = f.querySelector('textarea')?.value.trim(), chapter = chapterNow();
    if (!x || !reason) return;
    recorded(() => solRecord(x.run.id, itemId, 'dismissed', reason), chapter, refresh).then(ok => { if (ok) { note(chapter, 'Recorded: you disagreed with Sol, and why. It goes to the knowledge stewards with the sources the advice rested on.', {stewards: true}); refresh(); } });
  });
  root.addEventListener('input', e => { const el = e.target.closest(`${scope} [data-dk-in="sol-prompt"]`); if (el && SOL.pending) SOL.pending.prompt = el.value; });
}
