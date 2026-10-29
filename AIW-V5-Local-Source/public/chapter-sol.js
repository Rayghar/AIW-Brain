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
// Below Sol's part of the companion, Sol's review of the whole chapter (round 5, Contract R; brain-reasoning-ui.js):
// "Review this chapter", what Sol will read, and the findings painted on the model, each to adopt or set aside.
//
// The views call four functions: solChapterMount (once per mount), solSection (in the companion),
// solMark (after drawing) and solChapterBind (once per view). The overlay calls solOverlay.
import {SOL, solLoad, solPrepare, solCancel, solSend, solRecord, solBadge, solChapterEntry, solOutcomes, solConnected, solStatusLine, updateSolPromptControls, pendingHTML, assessmentHTML, askHTML, reviewSectionHTML} from './brain-reasoning-ui.js';
import {verdictText, VERDICTS} from './brain-reasoning.js';
export {solOwner} from './chapter-reasoning.js';
import {solTarget, solOwner, parseTarget, chapterTitle, chapterCommands, chapterReread, describeReread, chapterRound, whatIfValues, findRecord} from './chapter-reasoning.js';
import {esc} from './html-escape.js';
import {list} from './util.js';
import {currentProject as project} from './project-context.js';
import {listen, companionOf} from './model-stage.js';
import {technologyComparison} from './sol-comparison.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {intelligenceActionHTML,intelligenceWhyHTML,refreshIntelligenceSlot} from './chapter-insight.js';

const NOTE = {chapter: null, text: '', stewards: false};
const note = (chapter, text, {stewards = false} = {}) => { NOTE.chapter = chapter; NOTE.text = text; NOTE.stewards = stewards; };
// A disagreement goes to the knowledge stewards; the note offers the way there.
export const openStewards = () => { if (window.aiwKnowledge?.openView) window.aiwKnowledge.openView('stewardship'); else document.querySelector('[data-brain-launch="mind"]')?.click(); };
// Every surface that shows Sol redraws when another one changes what Sol has prepared, said or recorded.
const changed = from => document.dispatchEvent(new CustomEvent('aiw:sol-changed', {detail: {from}}));
// The companion's footer: what else Sol can do for this selection, in Sol's own panel.
const moreHTML = () => `<p class="cs-more"><button type="button" class="cm-link" data-brain-launch="design">More with Sol</button> · <button type="button" class="cm-link" data-brain-launch="mind">Co-design</button><small>explain it in words · ask in your own words · learn the next step · develop the design</small></p>`;
// Sol's way in beside every chapter model, whatever is selected (round 2, I2-02). It lives in the companion, which
// every chapter model already gives Sol, so the canvas keeps its room.
const launchHTML = () => `<p class="cs-more cs-launch" data-sol-launch><button type="button" class="cm-link" data-brain-launch="design">Ask Sol</button> · <button type="button" class="cm-link" data-brain-launch="mind">Co-design</button><small>the chapter’s brief · your own question · learn and develop the design</small></p>`;

export function solChapterMount(p, chapter, refresh) { if (p?.id) solLoad(p.id, refresh); }
function guidanceHTML(p,chapter,id){
 const reading=architectureIntelligence(p,{chapter,id,tab:'model'}),i=reading.primary;
 return i?`<div data-intelligence-id="${esc(i.id)}"><p><b>${esc(i.question||i.title)}</b></p>${intelligenceActionHTML(reading,i,i.actions?.[0],{projectId:p.id,className:'cm-link'})}<details class="dk-solmore"><summary>Why this matters</summary>${intelligenceWhyHTML(reading,i,{projectId:p.id})}</details></div>`:'';
}
export function refreshModelIntelligence(p){
 if(!p||typeof document==='undefined')return;
 for(const slot of document.querySelectorAll('[data-sol-intelligence]'))if(slot.dataset.intelligenceProject===p.id)refreshIntelligenceSlot(slot,guidanceHTML(p,Number(slot.dataset.intelligenceChapter),slot.dataset.intelligenceSubject));
}

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
// Whose reading Sol reads: the record's own chapter, wherever the record is selected from.
const homeOf = (id, chapter) => id?.endsWith('|whatif') ? 2 : id?.startsWith('D:') ? 3 : parseTarget(id)?.chapter || chapter;
const reads = (chapter, id) => `Chapter ${homeOf(id, chapter)}’s recorded facts, open checks, connected model and relevant knowledge`;

// Sol's part of the companion for the selection in a chapter model, with Sol's review of the chapter below it.
export function solSection(p, chapter, sel, opts = {}) {
  const part = selectionSection(p, chapter, sel, opts);
  return opts.inPanel || !p ? part : part + reviewSectionHTML(p, chapter);
}
function selectionSection(p, chapter, sel, {whatIf = null, inPanel = false} = {}) {
  if (!p) return '';
  const more = inPanel ? () => '' : moreHTML;
  const move = moveOf(whatIf), id = sel ? solTarget(p, chapter, sel, {whatIf: !!move}) : null;
  const guidance=!inPanel&&!move&&sel?`<div data-sol-intelligence data-intelligence-subject="${esc(sel)}" data-intelligence-chapter="${chapter}" data-intelligence-project="${esc(p.id)}">${guidanceHTML(p,chapter,sel)}</div>`:'';
  const flash = NOTE.chapter === chapter && NOTE.text ? `<p class="cs-note" role="status"><span>${esc(NOTE.text)}${NOTE.stewards ? ' <button type="button" class="cm-link" data-dk="sol-stewards">Open the stewards’ queue</button>' : ''}</span><button type="button" class="cm-link" data-dk="sol-note-off" aria-label="Dismiss">×</button></p>` : '';
  // A selection Sol does not assess still has Sol's panel for the saved record it stands for; what is only
  // drawn from the records says so, rather than leaving Sol on an earlier selection.
  // What is only drawn still leaves Sol a way in: the chapter's records with open checks, right below (round 2, I2-02).
  if (!id) {
    if (sel && solOwner(p, sel)) return flash + `<section class="cs-ask lite" data-sol-explain>${guidance}<p><b>Sol</b> can explain this and answer questions about it.</p>${more()}</section>`;
    const round = roundSection(p, chapter, '', {inPanel}), launch = inPanel || round ? '' : `<section class="cs-ask lite" data-sol-entry>${launchHTML()}</section>`;
    return flash + (sel ? `<section class="cs-ask lite" data-sol-drawn><p><b>Sol</b> answers about saved records. This is drawn from them: select one of its records to ask Sol about it.</p></section>` : '') + round + launch;
  }
  if (SOL.pending && SOL.pending.request.ids.length === 1 && SOL.pending.request.ids[0] === id) return flash + pendingHTML();
  const values = id.endsWith('|whatif') ? move : null, e = solChapterEntry(p, id, values), title = chapterTitle(p, id, values || {});
  const comparison = technologyComparison(p, id, sel);
  const compareAction = comparison ? `<div class="dk-solask" data-sol-product-comparison>${comparison.options.length ? `<button type="button" class="cm-btn" data-dk="sol-compare" data-id="${esc(id)}" data-selection="${esc(sel)}" ${SOL.busy ? 'disabled' : ''}>Compare product options</button>` : ''}<small>${esc(comparison.summary)}. ${comparison.options.length ? 'Sol advises on recorded quality scenarios; selection stays in Chapter 7 Work.' : ''}</small></div>` : '';
  if (e) return flash + assessmentHTML(e, opts(p, id, chapter, e)) + `<section class="dk-solagain">${guidance}${askHTML([id], {title, label: e.current ? 'Ask Sol again' : 'Ask Sol about it as it is now', reads: reads(chapter, id)})}${compareAction}${more()}</section>`;
  const what = id.endsWith('|whatif') ? 'this move' : id.startsWith('D:') ? 'this decision' : id.startsWith('M:9:') && !['threat', 'control'].includes(findRecord(p, objectOf(id))?.type) ? 'what could go wrong here' : id === 'M:11:SDD' ? 'the SDD narrative' : 'this record';
  const reading = id.startsWith('D:') ? 'the decision’s alternatives, architectural drivers and links across chapters' : id.endsWith('|whatif') ? 'the affected decisions, plans, platform and products' : id.startsWith('M:11:') ? 'the SDD’s readiness, gaps and drafted passages' : `Chapter ${homeOf(id, chapter)}’s recorded facts, open checks and estimated vitals of connected parts`;
  return flash + `<section class="cs-ask"><h4 aria-level="3">Sol · the attending architect</h4>${guidance}<p>Sol considers ${reading}, plus relevant knowledge, to advise on ${esc(what)}. You see the exact context packet before anything is sent; you decide.</p>${SOL.error && !SOL.pending ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''}${askHTML([id], {title, label: 'Ask Sol to assess it', reads: reads(chapter, id)})}${compareAction}${more()}</section>`;
}
// Sol's own panel reads the same saved assessment as the chapter companion. Keep the answer
// available here on Model too: opening assistance must not reduce it to a status or move it away.
export function solOverlay(p, chapter, sel) {
  if (!p) return '';
  chapter = Number(chapter);
  const beside = document.body.classList.contains('cm-active');
  const id = sel && sel !== 'project' ? solTarget(p, chapter, sel) : null;
  // Nothing assessable selected (the project, a drawn element): the chapter's records with open checks are Sol's
  // way in (round 2, I2-02); beside a chapter model the companion already offers them, and the desk is Chapter 11's.
  if (!id) {
    if (beside) return `<section class="brain-sol compact" data-sol-scope><p class="cs-status"><b>Sol’s assessment</b> · Nothing assessable is selected. ${chapter === 11 ? 'Sol assesses the running parts and drafted fixes on the review desk.' : 'The companion beside the model offers the chapter’s records with open checks.'} <button type="button" class="cm-link" data-dk="sol-beside">${chapter === 11 ? 'Open the desk' : 'Ask beside the model'}</button></p></section>`;
    const round = roundSection(p, chapter, '', {inPanel: true});
    if (round) return `<section class="brain-sol" data-sol-scope>${round}</section>`;
    return chapter === 11 ? `<section class="brain-sol" data-sol-scope>${solSection(p, 11, 'SDD', {inPanel: true})}<p class="cm-muted">The running parts and drafted fixes are assessed on the review desk (Chapter 11 → Model).</p></section>` : '';
  }
   const content=solSection(p, chapter, sel, {inPanel: true}),active=!!solChapterEntry(p,id)||SOL.pending?.request.ids.includes(id)||SOL.busy||SOL.error;
   const returnToModel=beside?'<p class="brain-note"><button type="button" class="cm-link" data-dk="sol-beside">Open this record’s model companion</button></p>':'';
   return active?`<section class="brain-sol" data-sol-scope data-sol-panel-assessment>${content}${returnToModel}</section>`:`<details class="brain-sol" data-sol-scope data-sol-unused-entry><summary>Assess the saved record</summary>${content}${returnToModel}</details>`;
}
// With nothing selected: the chapter's records with the most open checks, as one round of advice.
// The list is ranked by a rule (open checks, errors first) and says so; it is called Sol's round only once Sol
// has assessed something in it (round 2, I2-04). In Sol's own panel the links choose the panel's subject.
function roundSection(p, chapter, flash, {inPanel = false} = {}) {
  const ids = chapterRound(p, chapter);
  if (!ids.length) return flash;
  if (SOL.pending && SOL.pending.request.ids.join('|') === ids.join('|')) return flash + pendingHTML();
  const es = ids.map(id => [id, solChapterEntry(p, id)]).filter(([, e]) => e && e.current), counts = new Map();
  for (const k of Object.keys(VERDICTS)) for (const [, e] of es) if (!e.a.withheld && e.a.verdict === k) { const w = verdictText(e.item?.kind, k).short.toLowerCase(); counts.set(w, (counts.get(w) || 0) + 1); }
  const noun = chapter === 3 ? 'decisions' : 'records';
  const links = ids.map(id => { const x = findRecord(p, objectOf(id))?.record, e = es.find(([y]) => y === id)?.[1]; return `<button type="button" class="cm-link" ${inPanel ? `data-brain-action="subject" data-id="${esc(objectOf(id))}"` : `data-sel="${esc(objectOf(id))}"`}>${esc(x?.ref || x?.id || id)}${e ? ' ' + solBadge(e, 'inline') : ''}</button>`; }).join(' ');
  const heading = es.length ? `Sol’s round · Chapter ${esc(chapter)}` : `Records with open checks · Chapter ${esc(chapter)}`, band = es.length ? '' : '<small class="cs-band">From your project · rule-based ranking, errors first</small>';
  // Without a connected Sol the round cannot be asked: it steps back behind what the model shows,
  // as one line that says so, rather than taking the top of every companion.
  const launch = inPanel ? '' : launchHTML();
  if (!solConnected() && !es.length) return flash + `<section class="cs-round lite" data-sol-unconnected><h4 aria-level="3">${heading}<span>${ids.length}</span></h4>${band}<p class="cm-muted">${esc(solStatusLine({short: true}))}. The ${ids.length} ${noun} with the most open checks: ${links}</p>${launch}</section>`;
  return flash + `<section class="cs-round"><h4 aria-level="3">${heading}<span>${ids.length}</span></h4>${band}<p>The ${ids.length} ${noun} with the most open checks: ${links}</p>${es.length ? `<p class="cm-muted">Sol has assessed ${es.length} of them as they stand: ${[...counts].map(([w, n]) => `${n} ${esc(w)}`).join(', ') || 'all withheld'}. Select one to read its advice.</p>` : ''}${SOL.error && !SOL.pending ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''}${askHTML(ids, {title: `Sol’s round of Chapter ${chapter}: the ${noun} with the most open checks`, label: es.length === ids.length ? 'Ask Sol again' : `Ask Sol about the ${ids.length}`, reads: `Chapter ${chapter}’s recorded facts, open checks, connected model and relevant knowledge`})}${launch}</section>`;
}
export const chapterRoundHTML = (p, chapter) => roundSection(p, Number(chapter), '', {inPanel: true});
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
  // An element may name the record Sol reads for it (data-sol): a diagram's placement stands for its operating plan.
  for (const el of [...root.querySelectorAll('.cm-stage [data-sol], .cm-stage [data-card], .cm-stage [data-row]'), ...root.querySelectorAll('.cm-stage [data-sel]')]) {
    if (el.matches('.cm-link, .cm-btn, .cm-ins, .cm-mini') || el.closest('.cm-zoom, .cm-key')) continue;
    const key = el.dataset.sol || el.dataset.card || el.dataset.sel || el.dataset.row, id = key ? solTarget(p, chapter, key) : null;
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
export function revealSolCompanion() {
  document.querySelector('#brain-panel [data-brain-action="close"]')?.click();
  const dock = document.querySelector('#inspector.model-companion > .cm-companion'), model = document.querySelector('.studio .cm:not(.cm-docked)') || document.querySelector('.cm:not(.cm-docked)');
  if (dock) document.querySelector('#inspector > .panel-toggle[aria-expanded="false"]')?.click();
  else model?.querySelector('button[aria-pressed="false"][aria-label^="Show the companion panel"]')?.click();
  const host = dock || model?.querySelector('.cm-panel');
  const target = ['.dk-solpend', '.dk-sol', '.cs-ask', '.cs-round', '.sr'].map(s => host?.querySelector(s)).find(Boolean);
  if (!target) return false;
  for (let d = target.closest('details'); d && host.contains(d); d = d.parentElement?.closest('details')) d.open = true;
  const focus = target.querySelector('button:not([disabled]), textarea:not([disabled]), summary') || target;
  if (focus === target) focus.tabIndex = -1;
  focus.focus({preventScroll: true}); target.scrollIntoView({block: 'nearest'});
  return true;
}
export function solChapterBind(root, chapterOf, {refresh: redraw, whatIf = () => null, scope = ':is(.cm-panel,.cm-companion)'}) {
  if (!root || root.dataset.solBound) return;
  root.dataset.solBound = '1';
  const chapterNow = () => Number(typeof chapterOf === 'function' ? chapterOf() : chapterOf);
  // Redraw this surface, and tell the others.
  const refresh = () => { redraw(); changed(root); };
  // The companion may render beside the model, in the shell's column (round 3, B): look there as well.
  const find = sel => root.querySelector(sel) || companionOf(root)?.querySelector(sel.replace(scope + ' ', '')) || null;
  document.addEventListener('aiw:sol-changed', e => { if (e.detail?.from !== root && root.isConnected) redraw(); });
  listen(root, 'click', e => {
    const a = e.target.closest(`${scope} [data-dk]`);
    if (!a || a.disabled || !String(a.dataset.dk).startsWith('sol-')) return;
    e.preventDefault();
    const k = a.dataset.dk, chapter = chapterNow();
    if (k === 'sol-note-off') { note(null, ''); refresh(); return; }
    if (k === 'sol-stewards') { openStewards(); return; }
    if (k === 'sol-beside') { revealSolCompanion(); return; }
    if (k === 'sol-ask') {
      const ids = a.dataset.ids.split(',').filter(Boolean).slice(0, 8), move = moveOf(whatIf());
      const values = Object.fromEntries(ids.filter(id => id.endsWith('|whatif') && move).map(id => [id, move]));
      note(null, '');
      solPrepare({ids, scope: ids.length === 1 ? ids[0] : `chapter-${chapter}:round`, values,...(a.dataset.priorRun?{priorRunId:a.dataset.priorRun,prompt:'What should we refine or reconsider in this reasoning, given the current sources?'}:{})}, {title: a.dataset.title || '', onChange: refresh}).then(() => {const panel=find(`${scope} .dk-solpend`);panel?.scrollIntoView({block: 'nearest'});panel?.querySelector('textarea')?.focus({preventScroll:true});});
      return;
    }
    if (k === 'sol-compare') {
      const p = project(), comparison = technologyComparison(p, a.dataset.id, a.dataset.selection);
      if (!comparison?.options.length) return;
      note(null, '');
      solPrepare({ids:[a.dataset.id], scope:a.dataset.id, prompt:comparison.prompt},
        {title:`${comparison.record.ref || comparison.record.id} · ${comparison.options.map(o => o.product || o.title).join(' vs ')}`, onChange:refresh})
        .then(() => find(`${scope} .dk-solpend`)?.scrollIntoView({block:'nearest'}));
      return;
    }
    if (k === 'sol-send') { solSend({panel: a.closest('.dk-solpend'), onChange: refresh}).then(run => { if (run) { note(chapter, SOL.note); SOL.chapterStamps = new Map(); refresh(); find(`${scope} .cs-note`)?.scrollIntoView({block: 'nearest'}); } }); return; }
    if (k === 'sol-cancel') { solCancel(refresh); return; }
    if (k === 'sol-use') { useRefinements(chapter, a.dataset.run, a.dataset.item, refresh); return; }
    if (k === 'sol-threats') { reviewThreats(chapter, a.dataset.run, a.dataset.item, a.closest('.dk-sol'), refresh); return; }
    if (k === 'sol-agree') { recorded(() => solRecord(a.dataset.run, a.dataset.item, 'used'), chapter, refresh).then(ok => { if (ok) { note(chapter, 'Recorded: you took Sol’s advice. It stays with the sources it rested on.'); refresh(); } }); return; }
    if (k === 'sol-dismiss') { const f = a.closest('.dk-sol')?.querySelector('.dk-soldis'); if (f) { f.hidden = !f.hidden; f.querySelector('textarea')?.focus(); } }
  });
  listen(root, 'submit', e => {
    const f = e.target.closest(`${scope} .dk-soldis`);
    if (!f) return;
    e.preventDefault();
    const itemId = f.dataset.solDismiss, x = SOL.byItem.get(itemId), reason = f.querySelector('textarea')?.value.trim(), chapter = chapterNow();
    if (!x || !reason) return;
    recorded(() => solRecord(x.run.id, itemId, 'dismissed', reason), chapter, refresh).then(ok => { if (ok) { note(chapter, 'Recorded: you disagreed with Sol, and why. It goes to the knowledge stewards with the sources the advice rested on.', {stewards: true}); refresh(); } });
  });
  listen(root, 'input', e => {
    const el = e.target.closest(`${scope} [data-dk-in="sol-prompt"]`);
    if (!el || !SOL.pending) return;
    SOL.pending.prompt = el.value;
    updateSolPromptControls(el);
  });
}
