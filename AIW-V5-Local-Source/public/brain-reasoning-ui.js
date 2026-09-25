// Sol at the review desk and in every chapter model: the client side of the Brain's reasoning
// (brain-reasoning.js; chapter-sol.js places it in the chapter models' companions).
//
// Asking is two steps, as everywhere Sol works: the desk prepares what Sol will read — every reading,
// every source, with its receipt — and shows it; only then does "Send to Sol" send that exact
// packet. Assessments come back source-checked, are kept with the project's other Sol responses,
// and are shown beside the drafts they advise on. Using, applying or dismissing one is recorded.
// Nothing here changes the design: refinements become the draft's numbers and words, and the draft
// still goes through its chapter's change review.
import {projectURL} from './project-context.js';
import {VERDICTS, verdictText, currentStamp} from './brain-reasoning.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const list = v => Array.isArray(v) ? v : [];
// What the decisions in a request are called: moves explored in What if, chapter records, or decisions.
const nounOf = items => items.every(i => String(i.id).endsWith('|whatif')) ? 'move' : items.every(i => String(i.id).startsWith('M:')) ? 'record' : items.every(i => String(i.id).startsWith('K:')) ? 'queue item' : 'decision';
// Lower-case a label's first word unless it is an acronym ("SA Playbook tactic" stays as it is).
const lowerFirst = s => String(s).replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase());
export const SOL = {projectId: null, config: null, runs: [], byItem: new Map(), loading: false, pending: null, busy: false, error: '', note: '', stamps: new Map(), stampBase: null};

async function call(path, body) {
  const r = await fetch(projectURL('/api/intelligence/' + path), {credentials: 'same-origin', ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
  let d; try { d = await r.json(); } catch { throw Error('Sol’s response could not be read. Nothing was changed.'); }
  if (!r.ok) { const e = Error(d.error || 'Sol could not complete this request.'); e.data = d; e.status = r.status; throw e; }
  return d;
}
function index() {
  SOL.byItem = new Map();
  for (const run of SOL.runs) for (const a of list(run.result?.assessments)) if (!SOL.byItem.has(a.id)) SOL.byItem.set(a.id, {run, a, item: run.packet.items.find(i => i.id === a.id)});
}
// Once per project: the connection and the assessments already made.
export async function solLoad(projectId, onChange) {
  if (SOL.projectId === projectId && (SOL.loading || SOL.config)) return;
  Object.assign(SOL, {projectId, config: null, runs: [], byItem: new Map(), pending: null, error: '', loading: true});
  try {
    const [config, saved] = await Promise.all([call('status').catch(() => ({configured: false})), call('reasonings').catch(() => ({runs: []}))]);
    SOL.config = config; SOL.runs = list(saved.runs); index();
  } finally { SOL.loading = false; onChange?.(); }
}
export const solConnected = () => !!SOL.config?.configured;

// Whether the design still reads as it did when Sol assessed it.
export function solEntry(p, D, FX, id) {
  const e = SOL.byItem.get(id);
  if (!e) return null;
  if (SOL.stampBase !== D) { SOL.stampBase = D; SOL.stamps = new Map(); }
  if (!SOL.stamps.has(id)) SOL.stamps.set(id, currentStamp(p, D, FX, id));
  return {...e, current: SOL.stamps.get(id) === e.item?.stamp};
}
// The same for a chapter's record: its stamp is read from the document alone (and, for a What if,
// from the move being explored), once per document.
export function solChapterEntry(p, id, values = null) {
  const e = SOL.byItem.get(id);
  if (!e || !p) return null;
  if (SOL.stampDoc !== p || !SOL.chapterStamps) { SOL.stampDoc = p; SOL.chapterStamps = new Map(); }
  const key = id + (values ? '|' + JSON.stringify(values) : '');
  if (!SOL.chapterStamps.has(key)) SOL.chapterStamps.set(key, currentStamp(p, null, null, id, values));
  return {...e, current: SOL.chapterStamps.get(key) === e.item?.stamp};
}
// What the architect did with a piece of advice, as recorded in the project.
export const solOutcomes = (p, runId, itemId) => (p?.coauthoring?.assessments || []).filter(r => r.runId === runId && r.itemId === itemId);

export async function solPrepare(request, {title = '', onChange} = {}) {
  SOL.error = ''; SOL.busy = true; onChange?.();
  try { const d = await call('reasoning-context', {task: 'decisions', ...request}); SOL.pending = {request, title, packet: d.packet, prompt: request.prompt || ''}; if (d.configuration) SOL.config = d.configuration; }
  catch (e) { SOL.error = e.message; SOL.pending = null; }
  finally { SOL.busy = false; onChange?.(); }
}
export function solCancel(onChange) { SOL.pending = null; SOL.error = ''; onChange?.(); }
export async function solSend({prompt = null, onChange} = {}) {
  const P = SOL.pending;
  if (!P || SOL.busy) return null;
  // A changed question is a changed packet: prepare it again so what is sent is what was shown.
  if (prompt != null && prompt.trim() !== (P.request.prompt || '').trim()) { await solPrepare({...P.request, prompt: prompt.trim()}, {title: P.title, onChange}); return null; }
  SOL.busy = true; SOL.error = ''; onChange?.();
  try {
    P.requestId ||= crypto.randomUUID();
    const run = await call('reason', {task: 'decisions', ...P.request, packetStamp: P.packet.stamp, requestId: P.requestId});
    SOL.runs = [run, ...SOL.runs.filter(r => r.id !== run.id)]; index(); SOL.pending = null;
    const xs = run.result.assessments, kindOf = id => run.packet.items.find(i => i.id === id)?.kind, counts = new Map(), held = xs.filter(a => a.withheld).length;
    for (const k of Object.keys(VERDICTS)) for (const a of xs) if (!a.withheld && a.verdict === k) { const w = verdictText(kindOf(a.id), k).short.toLowerCase(); counts.set(w, (counts.get(w) || 0) + 1); }
    const noun = nounOf(run.packet.items);
    SOL.note = `Sol assessed ${xs.length} ${noun}${xs.length === 1 ? '' : 's'}: ${[...[...counts].map(([w, n]) => `${n} ${w}`), ...(held ? [`${held} withheld`] : [])].join(', ')}.`;
    return run;
  } catch (e) { SOL.error = e.message; if (e.data?.conflict) SOL.pending = null; return null; }
  finally { SOL.busy = false; onChange?.(); }
}
export async function solRecord(runId, itemId, outcome, reason = '') {
  const store = window.aiwProjectStore;
  if (!store?.command) throw Error('Open the project to record what you did with Sol’s advice.');
  return store.command({type: 'intelligence.adopt', payload: {runId, kind: 'assessment', itemId, outcome, reason}});
}

// ---------------------------------------------------------------- rendering

export const VERDICT_GLYPH = {apply: '✓', refine: '✎', reconsider: '↺', judge: '?', insufficient: '…'};
export function solBadge(e, cls = '') {
  if (!e) return '';
  const k = e.a.withheld ? 'withheld' : e.a.verdict;
  return `<i class="dk-solb ${esc(k)}${e.current ? '' : ' stale'}${cls ? ' ' + esc(cls) : ''}" title="${esc(`Sol: ${e.a.withheld ? 'withheld' : verdictText(e.item?.kind, e.a.verdict).label}${e.current ? '' : ' (the reading has changed since)'}`)}">${e.a.withheld ? '·' : VERDICT_GLYPH[e.a.verdict]}</i>`;
}
const sourceTitle = (run, ref) => run.packet.sources.find(s => s.ref === ref)?.title || ref;
const kindName = {'instrument-reading': 'Desk reading', 'chapter-reading': 'Chapter reading', 'stewardship-reading': 'Stewardship reading', 'planning-assumptions': 'Objective & assumptions', 'product-mechanism': 'Product mechanism', model: 'Project record', 'playbook-entry': 'SA Playbook tactic', 'governed-claim': 'Governed claim', 'brain-method': 'SA Playbook method', 'catalogue-description': 'Catalogue entry'};
const kindPlural = {'instrument-reading': 'desk readings', 'chapter-reading': 'chapter readings', 'stewardship-reading': 'stewardship readings', 'planning-assumptions': 'objective and assumptions', 'product-mechanism': 'product mechanisms', model: 'project records', 'playbook-entry': 'SA Playbook tactics', 'governed-claim': 'governed claims', 'brain-method': 'SA Playbook methods', 'catalogue-description': 'catalogue entries'};
export function sourcesHTML(sources, cited = null) {
  const xs = cited ? sources.filter(s => cited.includes(s.ref)) : sources;
  return `<ul class="dk-solsrc">${xs.map(s => `<li><details><summary><b>${esc(s.ref)}</b> <small>${esc(kindName[s.kind] || s.kind)}</small> ${esc(s.title)}</summary><p class="cm-muted">${esc(s.posture || '')}${s.receipt?.locator ? ` · <a href="${esc(s.receipt.locator)}" target="_blank" rel="noopener noreferrer">where it is documented</a>` : s.receipt?.packId ? ' · ' + esc(s.receipt.packId) : ''}</p><pre>${esc(String(s.excerpt || ''))}</pre></details></li>`).join('')}</ul>`;
}
// What Sol will read, before anything is sent.
export function pendingHTML() {
  const P = SOL.pending;
  if (!P) return '';
  const k = P.packet, counts = {};
  for (const s of k.sources) counts[s.kind] = (counts[s.kind] || 0) + 1;
  const connected = solConnected(), noun = nounOf(k.items);
  return `<section class="dk-solpend" aria-label="What Sol will read"><h4>Ask Sol<span>${k.items.length} ${noun}${k.items.length === 1 ? '' : 's'}</span></h4><p class="cm-spec-t"><b>${esc(P.title || k.items.map(i => i.title).join('; '))}</b></p>
   <p>Sol will read ${k.sources.length} sources: ${Object.entries(counts).map(([kind, n]) => `${n} ${esc(n === 1 ? lowerFirst(kindName[kind] || kind) : kindPlural[kind] || kind)}`).join(', ')}.${k.omissions.length ? ` ${k.omissions.length} more did not fit and ${k.omissions.length === 1 ? 'is' : 'are'} left out.` : ''} Every excerpt below is what will be sent, and nothing else.</p>
   <details class="dk-solsee"><summary>Inspect what will be sent</summary>${sourcesHTML(k.sources)}</details>
   <label class="dk-in col"><span>Your question for Sol (optional)</span><textarea rows="2" maxlength="1000" data-dk-in="sol-prompt" placeholder="For example: is the cost of 24 replicas justified, or is there a simpler way?">${esc(P.prompt || '')}</textarea></label>
   ${SOL.error ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''}
   <div class="cm-acts"><button type="button" class="cm-btn primary" data-dk="sol-send" ${connected && !SOL.busy ? '' : 'disabled'}>${SOL.busy ? 'Sol is reasoning…' : 'Send to Sol'}</button><button type="button" class="cm-btn" data-dk="sol-cancel">Cancel</button></div>
   <p class="cm-muted">${connected ? `Sent to ${esc(SOL.config.provider || 'the provider')} · ${esc(SOL.config.model || '')} over the server; the provider does not store it. Two passes: Sol assesses, then a second pass checks every assessment against these sources.` : 'Sol is not connected: set OPENAI_API_KEY and AIW_LLM_MODEL on the server to send it. The desk’s readings and drafts stand on their own meanwhile.'}</p></section>`;
}
// Sol's view of one decision, where the decision is shown.
// Options: the knobs as they stand; names for a preferred alternative; where a preference is decided;
// the label and note for using refinements; a stale message; and what was done with it (outcomes).
export function assessmentHTML(e, {knobs = [], id, names = {}, choiceIn = 'Chapter 3', useLabel = 'Use Sol’s refinements', useNote = 'They become the draft’s numbers and words; the desk reads the design again with them before you review anything.', staleText = 'The reading has changed since Sol assessed it. The advice is kept as history; ask Sol again for the design as it is now.', outcomes = null} = {}) {
  if (!e) return '';
  const {run, a} = e, when = String(run.createdAt || '').slice(0, 16).replace('T', ' '), V = verdictText(e.item?.kind, a.verdict);
  const head = `<h4>Sol’s assessment<span class="dk-solv ${esc(a.withheld ? 'withheld' : a.verdict)}" title="${esc(a.withheld ? 'Withheld: it did not pass the checks' : V.label)}">${esc(a.withheld ? 'Withheld' : V.short)}</span></h4>`;
  const stale = e.current ? '' : `<p class="dk-verdict warn">${esc(staleText)}</p>`;
  const did = list(outcomes), last = did.at(-1);
  const doneText = !last ? '' : last.outcome === 'dismissed' ? `You disagreed (${last.id}): ${last.reason}` : last.outcome === 'applied' ? `Applied through the change review (${last.id}).` : `You took this advice (${last.id}).`;
  const bare = !a.refinements.length && !a.proposals.length;
  if (a.withheld) return `<section class="dk-sol withheld" data-sol-item="${esc(id)}">${head}<p><b>${esc(a.headline)}</b></p><p>${esc(a.reasoning)}</p>${stale}<p class="cm-muted">Sol · ${esc(run.model)} · ${esc(when)} · an assessment that fails the checks is never shown as advice.</p></section>`;
  const label = k => knobs.find(x => x.key === k.key)?.label || k.label || k.key;
  const was = k => { const x = knobs.find(y => y.key === k.key); return x ? x.value : ''; };
  return `<section class="dk-sol ${esc(a.verdict)}" data-sol-item="${esc(id)}">${head}<p class="dk-sol-h"><b>${esc(a.headline)}</b></p><p>${esc(a.reasoning)}</p>${stale}
   ${a.refinements.length ? `<h5>Sol’s refinements · ${a.refinements.length}</h5><ul class="dk-solref">${a.refinements.map(r => `<li><b>${esc(label(r))}</b>${typeof r.value === 'number' ? `<span><del>${esc(was(r) === '' ? 'not recorded' : was(r))}</del> → <ins>${esc(r.value)}</ins></span>` : `<span class="w">${esc(String(r.value).slice(0, 400))}${String(r.value).length > 400 ? '…' : ''}</span>`}<small>${esc(r.why)}</small></li>`).join('')}</ul>${a.reread ? `<p class="dk-solre">${esc(a.reread)}</p>` : ''}${e.current ? `<div class="cm-acts"><button type="button" class="cm-btn gold" data-dk="sol-use" data-run="${esc(run.id)}" data-item="${esc(id)}">${esc(useLabel)}</button></div><p class="cm-muted">${esc(useNote)}</p>` : ''}` : ''}
   ${a.proposals.length ? `<h5>Sol proposes ${a.proposals.length} threat${a.proposals.length === 1 ? '' : 's'}</h5><div class="dk-solprop">${a.proposals.map((x, i) => `<label class="l-checkbox"><input type="checkbox" data-sol-threat="${i}" checked><span><b>${esc(x.title)}</b><small>${esc(x.category)} · ${esc(x.priority)} · on ${esc(x.targetIds.map(t => names[t] || t).join(', '))}</small><small>${esc(x.scenario)} ${esc(x.consequence)}</small></span></label>`).join('')}</div>${e.current ? `<div class="cm-acts"><button type="button" class="cm-btn gold" data-dk="sol-threats" data-run="${esc(run.id)}" data-item="${esc(id)}">Review the selected threats in Chapter 9…</button></div>` : ''}` : ''}
   ${a.preferred && a.preferred !== 'none' ? `<p class="dk-solpref">Sol would lean to <b>${esc(a.preferred)}${names[a.preferred] ? ' ' + esc(names[a.preferred]) : ''}</b> — advice with its reasons; the choice stays yours in ${esc(choiceIn)}.</p>` : ''}
   ${a.risks.length || a.questions.length ? `<details class="dk-solmore"><summary>Risks and questions · ${a.risks.length + a.questions.length}</summary>${a.risks.length ? `<ul>${a.risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}${a.questions.length ? `<ul class="q">${a.questions.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</details>` : ''}
   <details class="dk-solmore"><summary>What it rests on · ${a.sourceRefs.length}</summary>${sourcesHTML(run.packet.sources, a.sourceRefs)}</details>
   ${doneText ? `<p class="dk-soldone">${esc(doneText)}</p>` : ''}
   <div class="dk-solfoot"><small>Sol · ${esc(run.model)} · ${esc(when)} · source-checked</small><span>${bare && e.current && !last ? `<button type="button" class="cm-link" data-dk="sol-agree" data-run="${esc(run.id)}" data-item="${esc(id)}">Agree</button> · ` : ''}<button type="button" class="cm-link" data-dk="sol-dismiss" data-run="${esc(run.id)}" data-item="${esc(id)}">Disagree…</button></span></div>
   <form class="dk-soldis" data-sol-dismiss="${esc(id)}" hidden><label class="dk-in col"><span>Why doesn’t this advice hold?</span><textarea rows="2" maxlength="1000" name="reason" required></textarea></label><div class="cm-acts"><button type="submit" class="cm-btn">Record it</button></div></form></section>`;
}
// The ask, where a decision is shown: prepare, or the assessment and a way to ask again.
export function askHTML(ids, {title = '', label = 'Ask Sol', reads = 'the desk and the knowledge behind it'} = {}) {
  const on = SOL.pending && SOL.pending.request.ids.join('|') === ids.join('|');
  return `<div class="dk-solask"><button type="button" class="cm-btn${on ? ' on' : ''}" data-dk="sol-ask" data-ids="${esc(ids.join(','))}" data-title="${esc(title)}" ${SOL.busy ? 'disabled' : ''}>${esc(on ? 'Prepared: see above' : label)}</button><small>${solConnected() ? `Sol reads ${esc(reads)}, and advises; you decide.` : SOL.config ? 'Sol is not connected; you can still see what it would read.' : 'Checking Sol’s connection…'}</small></div>`;
}
