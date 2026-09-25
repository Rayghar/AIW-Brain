// The knowledge stewards' queue, in the knowledge workspace (Mind Factory → Architecture in context →
// Stewards). Each item is a disagreement with Sol, or advice acted on whose knowledge was withdrawn
// since. Sol advises on each; the stewards capture it as project knowledge, record that the
// knowledge and design stand, ask for a revisit, or withdraw what the advice rested on. A captured
// item stays on the queue, with its next governed step, until it is linked to its record — from then
// on Sol reads it with that record.
import {stewardQueue, captureDraft, TRAIL, STEWARD_DECISIONS} from './knowledge-stewardship.js';
import {knowledgeStamp, knowledgeImpactStamp} from './knowledge-governance.js';
import {verdictText} from './brain-reasoning.js';
import {SOL, solLoad, solPrepare, solCancel, solSend, solRecord, solChapterEntry, solOutcomes, pendingHTML, assessmentHTML, askHTML} from './brain-reasoning-ui.js';
import {projectURL} from './project-context.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const list = v => Array.isArray(v) ? v : [];
const project = () => window.aiwProjectStore?.value?.document || window.aiwCurrentProject;
const btn = (action, label, attrs = '', cls = '') => `<button type="button" class="btn${cls ? ' ' + cls : ''}" data-kst="${action}" ${attrs}>${label}</button>`;
const KIND = {'product-mechanism': 'Product mechanism', 'playbook-entry': 'SA Playbook tactic', 'brain-method': 'SA Playbook method', 'governed-claim': 'Governed claim', 'catalogue-description': 'Catalogue entry', 'chapter-reading': 'Chapter reading', 'instrument-reading': 'Desk reading', 'planning-assumptions': 'Objective & assumptions', model: 'Project record', 'stewardship-reading': 'Stewardship reading'};
const CHAPTER_LINK = {2: 'driver', 3: 'decision'};
let note = '';
const redraw = () => window.aiwKnowledge?.redraw?.();

export const stewardCount = p => { try { return stewardQueue(p).count; } catch { return 0; } };

function trailHTML(it) {
  const t = it.trail;
  if (!t) return '';
  const at = TRAIL.findIndex(([k]) => k === t.stage), steps = TRAIL.map(([k, label], i) => `<li class="${i <= at ? 'done' : ''}${i === at ? ' now' : ''}">${esc(label)}</li>`).join('');
  const c = t.claim;
  const next = t.stage === 'captured' ? `<button type="button" class="btn primary" data-k-action="review-claim" data-id="${esc(c.id)}">Review the interpretation…</button>`
    : t.stage === 'verified' ? btn('release', 'Release it…', `data-claim="${esc(c.id)}" data-ref="${esc(it.ref)}"`, 'primary')
    : t.stage === 'released' ? btn('activate', 'Activate it for this project…', `data-release="${esc(t.release.id)}"`, 'primary')
    : t.stage === 'active' ? btn('link', `Link it to ${esc(it.ref || it.objectId)}…`, `data-claim="${esc(c.id)}" data-release="${esc(t.release.id)}" data-object="${esc(t.objectId)}" data-title="${esc(it.subject)}"`, 'primary')
    : t.stage === 'linked' ? `<p class="kw-stew-done">Sol now reads it whenever it reasons about ${esc(it.subject)}.</p>`
    : t.stage === 'rejected' ? '<p class="kw-overlap">The review rejected the interpretation: nothing was learned. The disagreement stays on record.</p>'
    : t.stage === 'disputed' ? '<p class="kw-overlap">The review asked for more evidence. Capture it again once the owning team has confirmed it.</p>' : '';
  return `<div class="kw-trail"><p class="kw-discovery-count">${esc(c ? c.id : '')} · ${esc(c ? c.statement : '')}</p><ol>${steps}</ol>${next}</div>`;
}
function solHTML(p, it) {
  const id = it.solId;
  if (SOL.pending && SOL.pending.request.ids.length === 1 && SOL.pending.request.ids[0] === id) return pendingHTML();
  const e = solChapterEntry(p, id), title = `${it.sa.id} · ${it.subject}`, reads = 'the disagreement, the advice it answered and the record as it reads now, and the knowledge behind them';
  if (e) return assessmentHTML(e, {knobs: e.item?.knobs || [], id, useLabel: 'Capture it with Sol’s wording…', useNote: 'Opens the capture with Sol’s statement, where it applies and its limits; nothing is saved until you capture it.',
    staleText: 'The item or what it concerns has changed since Sol advised on it. The advice is kept as history; ask Sol again.', outcomes: solOutcomes(p, e.run.id, id)}) + `<div class="dk-solagain">${askHTML([id], {title, label: e.current ? 'Ask Sol again' : 'Ask Sol about it as it is now', reads})}</div>`;
  return askHTML([id], {title, label: 'Ask Sol what the project should learn', reads});
}
function itemHTML(p, it) {
  const sa = it.sa, dismissal = it.kind === 'dismissal', V = verdictText(sa.kind, sa.verdict);
  const gone = it.knowledge.filter(k => k.withdrawn), targets = [...new Map(it.knowledge.filter(k => k.target && !k.withdrawn).map(k => [k.target, k])).values()];
  const open = it.state === 'open', href = it.record && it.chapter ? projectURL(`/?chapter=${it.chapter}&tab=model&${CHAPTER_LINK[it.chapter] || 'object'}=${encodeURIComponent(it.objectId)}`) : '';
  const actions = !open ? '' : dismissal
    ? `<div class="brain-actions">${btn('capture', 'Capture as project knowledge…', `data-key="${esc(it.key)}"`, 'primary')}${btn('decide', 'The knowledge and design stand…', `data-key="${esc(it.key)}" data-decision="holds"`)}${btn('decide', 'Ask for a revisit…', `data-key="${esc(it.key)}" data-decision="revisit"`)}${targets.map(k => btn('withdraw', `Withdraw ${esc(k.target)}…`, `data-key="${esc(it.key)}" data-target="${esc(k.target)}"`)).join('')}</div>`
    : `<div class="brain-actions">${btn('decide', 'The change still holds…', `data-key="${esc(it.key)}" data-decision="holds"`, 'primary')}${btn('decide', `Revisit ${esc(it.ref || 'the record')}…`, `data-key="${esc(it.key)}" data-decision="revisit"`)}</div>`;
  const handled = it.disposition && it.state === 'handled' && it.disposition.decision !== 'captured' ? `<p class="kw-stew-done">${esc(STEWARD_DECISIONS[it.disposition.decision] || it.disposition.decision)}${it.disposition.reviewer ? ' · ' + esc(it.disposition.reviewer) : ''}${it.disposition.reason ? ': ' + esc(it.disposition.reason) : ''}</p>` : '';
  return `<article class="kw-stew ${esc(it.state)}" data-kst-item="${esc(it.key)}"><span class="brain-eyebrow">${esc(sa.id)} · Chapter ${esc(sa.chapter)} · ${dismissal ? 'Disagreement' : 'Knowledge withdrawn since'}</span>
   <h5>${href ? `<a href="${esc(href)}">${esc(it.subject)}</a>` : esc(it.subject)}</h5>
   <p class="kw-stew-sol"><small>Sol advised · ${esc(sa.withheld ? 'withheld' : V.short)}</small> ${esc(sa.headline)}</p>
   ${dismissal ? `<blockquote>${esc(sa.reason)}</blockquote>` : `<p class="kw-overlap">${esc(sa.outcome === 'applied' ? 'Applied through the change review' : 'Used')}, then withdrawn: ${esc(gone.map(k => k.title).join('; '))}.</p>`}
   <details><summary>What the advice rested on · ${list(sa.sources).length}</summary><ul>${list(sa.sources).map(x => `<li><b>${esc(x.ref)}</b> ${esc(KIND[x.kind] || x.kind)} · ${esc(x.title)}${gone.some(k => k.ref === x.ref) ? ' · <em>withdrawn</em>' : ''}</li>`).join('')}</ul></details>
   ${trailHTML(it)}${open ? `<div class="kw-stew-solbox">${solHTML(p, it)}</div>${actions}` : ''}${handled}</article>`;
}
export function renderStewardship(p) {
  if (p?.id) solLoad(p.id, redraw);
  let q;
  try { q = stewardQueue(p); } catch (e) { return `<p class="kw-empty">The stewards’ queue could not be read: ${esc(e.message)}</p>`; }
  return `<section class="kw-steward"><div class="kw-section-intro"><h4>What Sol’s advice taught the project.</h4><p>When an architect disagrees with Sol, or knowledge Sol’s advice rested on is withdrawn, it comes here. Stewards decide what the project learns: captured, reviewed, released and linked to its record, it is what Sol reads about that record from then on.</p></div>
   ${note ? `<p class="cs-note" role="status">${esc(note)}<button type="button" class="cm-link" data-kst="note-off" aria-label="Dismiss">×</button></p>` : ''}
   ${SOL.error && !SOL.pending ? `<p class="kw-warning" role="alert">${esc(SOL.error)}</p>` : ''}
   <h4 class="kw-stew-h">To decide · ${q.open.length}</h4>${q.open.map(it => itemHTML(p, it)).join('') || '<p class="kw-empty">Nothing to decide. Disagreements with Sol’s advice, and advice acted on whose knowledge is later withdrawn, will appear here.</p>'}
   ${q.inProgress.length ? `<h4 class="kw-stew-h">On the governed path · ${q.inProgress.length}</h4>${q.inProgress.map(it => itemHTML(p, it)).join('')}` : ''}
   ${q.handled.length ? `<details class="kw-stew-handled"><summary>Handled · ${q.handled.length}</summary>${q.handled.map(it => itemHTML(p, it)).join('')}</details>` : ''}</section>`;
}

// ---------------------------------------------------------------- actions

const K = () => window.aiwKnowledge;
async function recorded(fn) {
  try { await fn(); document.dispatchEvent(new CustomEvent('aiw:external-project')); SOL.chapterStamps = new Map(); return true; }
  catch (e) { note = e?.message || 'Sol’s advice could not be recorded.'; return false; }
  finally { redraw(); }
}
const itemOf = key => stewardQueue(project()).items.find(i => i.key === key);
function openCapture(it, extra = {}) {
  const d = captureDraft(project(), it.sa);
  K()?.start('capture', {...d, ...extra, reviewer: '', reason: ''});
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const b = e.target.closest('.kw-steward [data-kst], .kw-steward [data-dk]');
    if (!b || b.disabled) return;
    e.preventDefault(); e.stopPropagation();
    const p = project(), a = b.dataset.kst, k = b.dataset.dk;
    if (a === 'note-off') { note = ''; redraw(); return; }
    if (a === 'capture') { const it = itemOf(b.dataset.key); if (it) openCapture(it); return; }
    if (a === 'decide') { const it = itemOf(b.dataset.key); if (it) K()?.start('steward', {key: it.key, decision: b.dataset.decision, subject: it.subject, kind: it.kind}); return; }
    if (a === 'withdraw') { const id = b.dataset.target; K()?.start('withdraw', {id, stamp: knowledgeImpactStamp(p, id), stewardKey: b.dataset.key}); return; }
    if (a === 'release') { K()?.start('release', {title: `Learned from Sol’s advice · ${b.dataset.ref}`, ['claim:' + b.dataset.claim]: true}); return; }
    if (a === 'activate') { K()?.start('activate', {id: b.dataset.release, stamp: knowledgeStamp(p)}); return; }
    if (a === 'link') { K()?.start('link', {claimId: b.dataset.claim, releaseId: b.dataset.release, objectId: b.dataset.object, objectTitle: b.dataset.title, reason: 'Learned from an architect’s disagreement with Sol; it holds for this record within its conditions.'}); return; }
    // Sol, advising the stewards.
    if (k === 'sol-ask') { note = ''; const ids = b.dataset.ids.split(',').filter(Boolean); solPrepare({ids, scope: 'stewards:' + ids[0]}, {title: b.dataset.title || '', onChange: redraw}); return; }
    if (k === 'sol-send') { const prompt = document.querySelector('.kw-steward [data-dk-in="sol-prompt"]')?.value ?? null; solSend({prompt, onChange: redraw}).then(run => { if (run) { note = SOL.note; SOL.chapterStamps = new Map(); redraw(); } }); return; }
    if (k === 'sol-cancel') { solCancel(redraw); return; }
    if (k === 'sol-agree') { recorded(() => solRecord(b.dataset.run, b.dataset.item, 'used')).then(ok => { if (ok) { note = 'Recorded: the stewards took Sol’s advice.'; redraw(); } }); return; }
    if (k === 'sol-dismiss') { const f = b.closest('.dk-sol')?.querySelector('.dk-soldis'); if (f) { f.hidden = !f.hidden; f.querySelector('textarea')?.focus(); } return; }
    if (k === 'sol-use') {
      const x = SOL.byItem.get(b.dataset.item), key = 'dismissal:' + String(b.dataset.item).slice(2), it = itemOf(key);
      if (!x || !it) return;
      recorded(() => solRecord(b.dataset.run, b.dataset.item, 'used')).then(ok => { if (!ok) return; const r = Object.fromEntries(x.a.refinements.map(v => [v.key, String(v.value)])); openCapture(it, {...r, solRunId: b.dataset.run, solItemId: b.dataset.item}); });
    }
  }, true);
  document.addEventListener('submit', e => {
    const f = e.target.closest('.kw-steward .dk-soldis');
    if (!f) return;
    e.preventDefault();
    const itemId = f.dataset.solDismiss, x = SOL.byItem.get(itemId), reason = f.querySelector('textarea')?.value.trim();
    if (!x || !reason) return;
    recorded(() => solRecord(x.run.id, itemId, 'dismissed', reason)).then(ok => { if (ok) { note = 'Recorded: the stewards disagreed with Sol, and why.'; redraw(); } });
  }, true);
  document.addEventListener('input', e => { const el = e.target.closest?.('.kw-steward [data-dk-in="sol-prompt"]'); if (el && SOL.pending) SOL.pending.prompt = el.value; });
}
