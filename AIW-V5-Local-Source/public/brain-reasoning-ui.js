// Sol at the review desk and in every chapter model: the client side of the Brain's reasoning
// (brain-reasoning.js; chapter-sol.js places it in the chapter models' companions).
//
// Asking is two steps, as everywhere Sol works: the desk prepares what Sol will read — every reading,
// every source, with its receipt — and shows it; only then does "Send to Sol" send that exact
// packet. Assessments come back source-checked, are kept with the project's other Sol responses,
// and are shown beside the drafts they advise on. Using, applying or dismissing one is recorded.
// Nothing here changes the design: refinements become the draft's numbers and words, and the draft
// still goes through its chapter's change review.
import {projectURL, onProjectSwitch} from './project-context.js';
import {VERDICTS, verdictText, currentStamp, reasoningCurrency} from './brain-reasoning.js';
import {reviewFindingBasis} from './intelligence-context.js';
import {esc,safeUrl} from './html-escape.js';
import {list, plural} from './util.js';
import {journeyIndex} from './journey-context.js';
import {CHECK_WORDS, CHECK_GLYPHS} from './readiness-model.js';
import {contextDraftController} from './sol-context-drafts.js';
import {digest} from './brain-integrity.js';

// What the decisions in a request are called: moves explored in What if, chapter records, or decisions.
const nounOf = items => items.every(i => String(i.id).endsWith('|whatif')) ? 'move' : items.every(i => String(i.id).startsWith('M:')) ? 'record' : items.every(i => String(i.id).startsWith('K:')) ? 'queue item' : 'decision';
// Lower-case a label's first word unless it is an acronym ("SA Playbook tactic" stays as it is).
const lowerFirst = s => String(s).replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase());
export const SOL = {projectId: null, epoch: 0, sequence: 0, config: null, runs: [], byItem: new Map(), loading: false, pending: null, leads: null, busy: false, error: '', note: '', progress: '', stamps: new Map(), stampBase: null};
const reasoningDrafts = new Map();
function reasoningDraft(request, onChange) {
  const ids=list(request.ids), route=new URLSearchParams(typeof location==='undefined'?'':location.search), first=String(ids[0]||'project');
  const scope={chapter:Number(first.match(/^M:(\d+):/)?.[1]||route.get('chapter')||11),tab:route.get('tab')||'work',objectId:first.replace(/^M:\d+:/,'').replace(/^[DFJ]:/,''),field:'assessment-'+digest([...ids].sort()).slice(0,16),mode:'reason',taskId:request.architectureTaskId||''};
  const key=SOL.projectId+':'+JSON.stringify(scope);
  let entry=reasoningDrafts.get(key);
  if(!entry){
    entry={value:{prompt:'',priorRunId:null,semantic:false},onChange};
    entry.controller=contextDraftController({projectId:SOL.projectId,scope,read:()=>entry.value,write:value=>{entry.value=value;if(SOL.pending?.draft===entry){SOL.pending.prompt=value.prompt||'';SOL.pending.priorRunId=value.priorRunId||null;if(typeof document!=='undefined')for(const input of document.querySelectorAll('.dk-solpend [data-dk-in="sol-prompt"]'))input.value=SOL.pending.prompt;}},onChange:()=>{
      // Autosaving the question must not rebuild a model companion or steal its
      // textarea focus. Only the draft status and send label need to change.
      if(SOL.pending?.draft===entry&&typeof document!=='undefined'){
        for(const el of document.querySelectorAll('[data-sol-draft-status]'))el.outerHTML=reasoningDraftHTML(SOL.pending);
        for(const button of document.querySelectorAll('.dk-solpend [data-dk="sol-send"]'))if(!SOL.busy)button.textContent=solPromptChanged()?'Review updated question':SOL.pending.requestId?'Retry Sol assessment':'Send to Sol';
      }else entry.onChange?.();
    }});
    reasoningDrafts.set(key,entry);
  }
  entry.onChange=onChange;return entry;
}
export function solDraftChanged() {
  const p=SOL.pending;if(!p?.draft)return;
  p.draft.value={prompt:p.prompt||'',priorRunId:p.priorRunId||null,semantic:!!p.request.semantic};p.draft.controller.edit();
}
function reasoningDraftHTML(p) {
  const d=p.draft?.controller.state;if(!d)return '';
  return `<p class="cm-muted" data-sol-draft-status role="status">${esc(d.error||(d.loading?'Loading private question draft…':d.saving?'Saving private question draft…':d.savedAt?'Question saved privately for this object, tab and assessment scope.':'Question draft stays with this object, tab and assessment scope.'))}${d.error?'<button type="button" class="cm-link" data-sol-draft-action="retry">Retry saving</button> <button type="button" class="cm-link" data-sol-draft-action="reload">Load saved draft</button>':''}</p>`;
}
onProjectSwitch(()=>{for(const d of reasoningDrafts.values())d.controller.dispose();reasoningDrafts.clear();});
if(typeof document!=='undefined')document.addEventListener('click',e=>{const a=e.target.closest?.('[data-sol-draft-action]'),d=SOL.pending?.draft;if(!a||!d)return;e.preventDefault();d.controller[a.dataset.solDraftAction==='reload'?'reload':'retry']();});

async function call(path, body) {
  const r = await fetch(projectURL('/api/intelligence/' + path), {credentials: 'same-origin', ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)} : {})});
  let d; try { d = await r.json(); } catch { throw Error('Sol’s response could not be read. Nothing was changed.'); }
  if (!r.ok) { const e = Error((d.error || 'Sol could not complete this request.') + (d.detail ? ' ' + d.detail : '')); e.data = d; e.status = r.status; throw e; }
  return d;
}
function index() {
  SOL.byItem = new Map();
  for (const run of SOL.runs) for (const a of list(run.result?.assessments)) if (!SOL.byItem.has(a.id)) SOL.byItem.set(a.id, {run, a, item: run.packet.items.find(i => i.id === a.id)});
}
// Once per project: the connection and the assessments already made. An answer for a project the tab has since left
// (round 4, A: another project opened in place) is dropped.
export async function solLoad(projectId, onChange) {
  if (SOL.projectId === projectId && (SOL.loading || SOL.config)) return;
  const epoch=++SOL.epoch; ++SOL.sequence;
  Object.assign(SOL, {projectId, config: null, runs: [], byItem: new Map(), pending: null, leads: null, error: '', progress: '', busy: false, loading: true});
  try {
    const [config, saved] = await Promise.all([call('status?mode=reasoning').catch(() => ({configured: false})), call('reasonings').catch(() => ({runs: []}))]);
    if (SOL.epoch !== epoch || SOL.projectId !== projectId) return;
    SOL.config = config; SOL.runs = list(saved.runs); index();
  } finally { if (SOL.epoch === epoch && SOL.projectId === projectId) { SOL.loading = false; onChange?.(); } }
}
export const solConnected = () => !!SOL.config?.configured;
// One status for every surface that shows Sol (round 2, I2-05): the same words for the same state, read from
// /api/intelligence/status once per project. The server never claims a verified connection it has not made.
export function solStatus() { const c = SOL.config, v = c?.connectionVerified && typeof c.connectionVerified === 'object' ? c.connectionVerified : null; return {checked: !!c, connected: !!c?.configured, provider: c?.provider || 'the provider', providerId: c?.providerId || '', model: c?.model || '', modelDefaulted: !!c?.modelDefaulted, retention: typeof c?.retention === 'string' ? c.retention : '', verified: v?.ok === true, probed: !!v, probe: v, missing: list(c?.missing)}; }
// The key variable of the selected provider (the server names it in `missing`; this is the fallback when it does not).
export const solKeyVariable = () => (solStatus().providerId === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY');
// What is still to set, in one phrase: exactly the variables the server reports missing for the selected provider.
export const solMissingText = () => { const s = solStatus(); return s.missing.length ? s.missing.join(' and ') : solKeyVariable(); };
// What an administrator needs to connect Sol: the provider selected and the variable to set, in one line.
export function solAdminDetail() {
  const s = solStatus();
  if (!s.checked) return 'Checking Sol’s connection…';
  if (s.connected) return `${s.provider} · ${s.model}`;
  return `${s.provider === 'Not set' ? 'No provider is selected' : s.provider + ' is the selected provider'}; set ${solMissingText()} on the server.`;
}
export function solStatusLine({short = false} = {}) {
  const s = solStatus();
  if (!s.checked) return 'Checking Sol’s connection…';
  // Round 26 (R26-W-29): the sentence a person reads has no variable names; solAdminDetail() carries them for the
  // administrator, shown apart (Sol’s connection details, the setup card).
  if (!s.connected) return short ? 'Sol is not connected in this workspace' : 'Sol is not connected in this workspace. Ask your workspace administrator to connect a provider; rule-based guidance stands on its own meanwhile.';
  // Round 41: a passing probe cannot see a spend limit or an exhausted credit; a probe the provider refused for one says so.
  const probe = s.verified ? `verified at ${String(s.probe.at).slice(0, 16).replace('T', ' ')}${s.probe.limitsChecked === false ? ' (a spend limit or exhausted credit shows only when a request is refused)' : ''}` : s.probed ? s.probe.code === 'provider_quota' ? 'last probe was refused: the provider account’s spend limit or credit is exhausted' : s.probe.transportFailure?.phase === 'fetch' && s.probe.unauthenticatedTransportFailure?.phase === 'fetch' ? 'last probe failed before an HTTP response, including a keyless reachability check' : `last probe failed (${s.probe.code || 'provider unavailable'}${Number.isInteger(s.probe.upstreamStatus) ? `; upstream HTTP ${s.probe.upstreamStatus}` : ''})` : 'not yet verified by a probe or a request';
  return short ? `Sol · ${s.provider} · ${s.model}${s.verified ? ' · verified' : ''}` : `Sol reasons with ${s.provider} · ${s.model}. ${s.retention || 'Sent over the server; the provider’s retention terms apply.'} The connection is configured, ${probe}. Each request shows its actual result.`;
}
// Ask the server to probe the configured connection once (GET status?verify=1) and keep the answer as the status.
export async function solVerify(onChange) {
  SOL.busy = true; onChange?.();
  try { SOL.config = await call('status?verify=1&mode=reasoning'); } catch (e) { SOL.error = e.message; }
  finally { SOL.busy = false; onChange?.(); }
}
// The prompt a run answered, when the run carries its pin (round 2, I2-16).
export const instructionsOf = run => run?.packet?.brainReceipt?.instructions || run?.instructions || null;
export const pinText = pin => pin ? `prompt ${pin.promptVersion} · ${String(pin.sha256 || '').slice(0, 12)}` : '';

// Whether the design still reads as it did when Sol assessed it.
export function solEntry(p, D, FX, id) {
  const e = SOL.byItem.get(id);
  if (!e) return null;
  if (SOL.stampBase !== D) { SOL.stampBase = D; SOL.stamps = new Map(); }
  if (!SOL.stamps.has(id)) SOL.stamps.set(id, currentStamp(p, D, FX, id));
  return {...e, current: SOL.stamps.get(id) === e.item?.stamp && reasoningCurrency(p, e.run, {D, FX}).get(id) === true};
}
// The same for a chapter's record: its stamp is read from the document alone (and, for a What if,
// from the move being explored), once per document.
export function solChapterEntry(p, id, values = null) {
  const e = SOL.byItem.get(id);
  if (!e || !p) return null;
  if (SOL.stampDoc !== p || !SOL.chapterStamps) { SOL.stampDoc = p; SOL.chapterStamps = new Map(); }
  const key = id + (values ? '|' + JSON.stringify(values) : '');
  if (!SOL.chapterStamps.has(key)) SOL.chapterStamps.set(key, currentStamp(p, null, null, id, values));
  return {...e, current: SOL.chapterStamps.get(key) === e.item?.stamp && reasoningCurrency(p, e.run).get(id) === true};
}
// What the architect did with a piece of advice, as recorded in the project.
export const solOutcomes = (p, runId, itemId) => (p?.coauthoring?.assessments || []).filter(r => r.runId === runId && r.itemId === itemId);

// Leads: passages in the knowledge repository that mention what these decisions touch. They are shown
// beside what Sol will read and are never sent: Sol cannot read or cite them. To rely on one, the
// architect retrieves its exact original and takes it through interpretation, review and release.
const STOP = new Set('about above after again against also because been being below between both could does doing down during each from have into more most must need needs only other over same should some such than that their them then there these they this those through under very were what when which while will with would your chapter draft drafts reading readings record records decision decisions design part parts step steps vital vitals round desk judgement sol'.split(' '));
export function leadQuery(packet) {
  const words = [], add = t => { for (const w of String(t || '').toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []) if (!STOP.has(w) && !words.includes(w)) words.push(w); };
  for (const i of list(packet?.items)) add(i.title);
  for (const x of list(packet?.sources)) if (['product-mechanism', 'catalogue-description', 'playbook-entry', 'governed-claim'].includes(x.kind)) add(x.title);
  return words.slice(0, 12).join(' ');
}
async function loadLeads(onChange) {
  const L = SOL.leads; if (!L?.query) { if (L) L.loading = false; return; }
  try { const r = await fetch(projectURL('/api/knowledge/corpus?view=search&mode=any&q=' + encodeURIComponent(L.query)), {credentials: 'same-origin'}), d = await r.json().catch(() => ({}));
    if (SOL.leads !== L) return; L.unavailable = !r.ok; L.results = r.ok ? list(d.results).slice(0, 5) : []; }
  catch { if (SOL.leads === L) L.unavailable = true; }
  finally { if (SOL.leads === L) { L.loading = false; onChange?.(); } }
}
export async function solPrepare(request, {title = '', onChange} = {}) {
  const epoch=SOL.epoch, projectId=SOL.projectId, sequence=++SOL.sequence;
  SOL.error = ''; SOL.busy = true; onChange?.();
  const current=()=>SOL.epoch===epoch&&SOL.projectId===projectId&&SOL.sequence===sequence;
  try {
    const draft=reasoningDraft(request,onChange);if(!draft.controller.state.loaded)await draft.controller.load();if(!current())return;
    // Restoring a question never restores a source packet or silently enables embeddings.
    const restore=typeof request.prompt!=='string';
    request={...request,prompt:restore?draft.value.prompt||'':request.prompt,priorRunId:request.priorRunId||(restore&&!Object.hasOwn(request,'priorRunId')?draft.value.priorRunId:undefined)||undefined};
    draft.value={prompt:request.prompt,priorRunId:request.priorRunId||null,semantic:!!request.semantic};draft.controller.edit();
    const d = await call('reasoning-context', {task: 'decisions', ...request}); if (!current()) return;
    SOL.pending = {request, title, packet: d.packet, prompt: request.prompt || '',priorRunId:request.priorRunId||null,draft}; if (d.configuration) SOL.config = d.configuration; SOL.leads = {query: leadQuery(d.packet), loading: true, results: []}; loadLeads(onChange);
  }
  catch (e) { if (current()) {SOL.error = e.message; SOL.pending = null; SOL.leads = null;} }
  finally { if (current()) {SOL.busy = false; onChange?.();} }
}
export function solCancel(onChange) { ++SOL.sequence; SOL.pending = null; SOL.leads = null; SOL.error = ''; SOL.progress = ''; SOL.busy = false; onChange?.(); }
export const solPromptChanged = () => !!SOL.pending && ((SOL.pending.prompt || '').trim() !== (SOL.pending.request.prompt || '').trim() || (SOL.pending.priorRunId||null)!==(SOL.pending.request.priorRunId||null));
export function updateSolPromptControls(input) {
  if (!SOL.pending) return;
  solDraftChanged();
  const panel=input?.closest?.('.dk-solpend');
  const button=panel?.querySelector('[data-dk="sol-send"]'), hint=panel?.querySelector('[data-sol-prompt-hint]');
  if (button && !SOL.busy) button.textContent=solPromptChanged()?'Review updated question':SOL.pending.requestId?'Retry Sol assessment':'Send to Sol';
  if (hint) hint.textContent=solPromptChanged()?'Question changed. Review the updated packet before sending.':'If you edit the question, the first click prepares the updated packet for review; the next sends it.';
}
function acceptReasoningRun(run) {
  if (run.status !== 'completed' || !Array.isArray(run.result?.assessments)) throw Error(run.error || 'Sol did not complete this assessment. Your design was not changed.');
  SOL.runs = [run, ...SOL.runs.filter(r => r.id !== run.id)]; index(); SOL.pending = null; SOL.leads = null;
  const xs = run.result.assessments, kindOf = id => run.packet.items.find(i => i.id === id)?.kind, counts = new Map(), held = xs.filter(a => a.withheld).length;
  for (const k of Object.keys(VERDICTS)) for (const a of xs) if (!a.withheld && a.verdict === k) { const w = verdictText(kindOf(a.id), k).short.toLowerCase(); counts.set(w, (counts.get(w) || 0) + 1); }
  const noun = nounOf(run.packet.items);
  SOL.note = `Sol assessed ${xs.length} ${noun}${xs.length === 1 ? '' : 's'}: ${[...[...counts].map(([w, n]) => `${n} ${w}`), ...(held ? [`${held} withheld`] : [])].join(', ')}.`;
  return run;
}
export async function solSend({prompt = null, semantic = null, panel = null, onChange} = {}) {
  const P = SOL.pending;
  if (!P || SOL.busy) return null;
  prompt ??= panel?.querySelector('[data-dk-in="sol-prompt"]')?.value ?? null;
  semantic = typeof semantic === 'boolean' ? semantic : panel?.querySelector('[data-sol-semantic]')?.checked ?? !!P.request.semantic;
  if(semantic!==!!P.request.semantic){await solPrepare({...P.request,priorRunId:P.priorRunId||undefined,prompt:prompt==null?P.prompt:prompt.trim(),semantic},{title:P.title,onChange});return null;}
  // A changed question is a changed packet: prepare it again so what is sent is what was shown.
  if (prompt != null && (prompt.trim() !== (P.request.prompt || '').trim() || (P.priorRunId||null)!==(P.request.priorRunId||null))) { await solPrepare({...P.request,priorRunId:P.priorRunId||undefined, prompt: prompt.trim()}, {title: P.title, onChange}); return null; }
  const epoch=SOL.epoch, projectId=SOL.projectId, sequence=++SOL.sequence;
  const sessionCurrent=()=>SOL.epoch===epoch&&SOL.projectId===projectId&&SOL.sequence===sequence;
  const current=()=>sessionCurrent()&&SOL.pending===P;
  SOL.busy = true; SOL.error = ''; SOL.progress = ''; onChange?.();
  let stop = () => {};
  try {
    // After a lost HTTP response the provider may have completed. Read that same request before
    // deciding whether another one is warranted, so a retry cannot silently duplicate a completed run.
    if (P.checkFirst && P.requestId) {
      let saved;
      try { saved = await call('runs?id=' + encodeURIComponent(P.requestId)); }
      catch (e) { if (!current()) return null; if (e.status !== 404) throw Error('Could not confirm the previous request. Retry to check its status before sending again.'); P.requestId = null; P.checkFirst = false; }
      if (!current()) return null;
      if (saved?.status === 'completed') return acceptReasoningRun(saved);
      if (saved?.status === 'pending') throw Error('Sol is still processing the previous request. Try again shortly; no new request was sent.');
      if (saved && saved.status !== 'pending') { P.requestId = null; P.checkFirst = false; }
    }
    P.requestId ||= crypto.randomUUID();
    stop = watchRun(P.requestId, 'reason', (line, step, seconds) => {
      if (!current()) return;
      SOL.progress = line;
      if (typeof document !== 'undefined') showProgress(document, 'data-sol-reason-progress', line, seconds);
    });
    const run = await call('reason', {task: 'decisions', ...P.request, packetStamp: P.packet.stamp,basePacketStamp:P.packet.advisoryHistory?.basePacketStamp||P.packet.stamp, requestId: P.requestId});
    if (!current()) return null;
    if (run.status !== 'completed') { P.requestId = null; throw Error(run.error || 'Sol did not complete this assessment. Retry from this preview.'); }
    return acceptReasoningRun(run);
  } catch (e) {
    if (!current()) return null;
    SOL.error = e.data?.transportFailure?.phase === 'fetch' ? 'The provider returned no HTTP response. Your saved model is unchanged. Check Sources & connection.' : e.message;
    if (e.data?.conflict) SOL.pending = null;
    else if (e.status) { P.requestId = null; P.checkFirst = false; }
    else if (P.requestId) P.checkFirst = true;
    return null;
  }
  finally { stop(); if (sessionCurrent()) {SOL.busy = false; SOL.progress = ''; onChange?.();} }
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
export const kindName = {'chapter-checks': 'Chapter checks', record: 'Chapter record', 'connected-model': 'Connected model', 'instrument-reading': 'Desk reading', 'chapter-reading': 'Chapter reading', 'stewardship-reading': 'Stewardship reading', 'planning-assumptions': 'Objective & assumptions', 'product-mechanism': 'Product mechanism', model: 'Project record', 'playbook-entry': 'SA Playbook tactic', 'governed-claim': 'Governed claim', 'brain-method': 'SA Playbook method', 'catalogue-description': 'Catalogue entry', 'project-note': 'Project note (architect’s testimony)'};
const kindPlural = {'instrument-reading': 'desk readings', 'chapter-reading': 'chapter readings', 'stewardship-reading': 'stewardship readings', 'planning-assumptions': 'objective and assumptions', 'product-mechanism': 'product mechanisms', model: 'project records', 'playbook-entry': 'SA Playbook tactics', 'governed-claim': 'governed claims', 'brain-method': 'SA Playbook methods', 'catalogue-description': 'catalogue entries', 'project-note': 'project notes (architect’s testimony)'};
export function sourcesHTML(sources, cited = null) {
  const xs = cited ? sources.filter(s => cited.includes(s.ref)) : sources;
  return `<ul class="dk-solsrc">${xs.map(s => `<li><details><summary><b>${esc(s.ref)}</b> <small>${esc(kindName[s.kind] || s.kind)}</small> ${esc(s.title)}</summary><p class="cm-muted">${esc(s.posture || '')}${s.receipt?.locator ? ` · <a href="${esc(safeUrl(s.receipt.locator))}" target="_blank" rel="noopener noreferrer">where it is documented</a>` : s.receipt?.packId ? ' · ' + esc(s.receipt.packId) : ''}</p><pre>${esc(String(s.excerpt || ''))}</pre></details></li>`).join('')}</ul>`;
}
function leadsHTML(noun) {
  const L = SOL.leads;
  if (!L || L.unavailable) return '';
  if (L.loading) return '<p class="cm-muted dk-sollead-wait">Looking for leads in the knowledge repository…</p>';
  if (!L.results.length) return `<p class="cm-muted">The knowledge repository has no passage that mentions what these ${esc(noun)}s touch.</p>`;
  return `<details class="dk-sollead"><summary>Leads from the knowledge repository · ${L.results.length} · not sent to Sol</summary><p class="cm-muted">Unreviewed repository passages that mention what these ${esc(noun)}s touch. Sol does not read them and cannot cite them. To rely on one, open it in the knowledge sources, retrieve the exact original, then interpret and review it.</p><ul class="dk-solsrc">${L.results.map(x => `<li><b>${esc(x.heading || x.revision?.title)}</b> <small>${esc(x.revision?.repository)} · ${esc(x.revision?.path)} · lines ${esc(x.lineStart)}–${esc(x.lineEnd)}</small><p class="cm-muted">${esc(x.snippet)}</p><button type="button" class="cm-link" data-k-action="corpus-lead" data-q="${esc(L.query)}" data-id="${esc(x.passageId)}">Open it in the knowledge sources</button></li>`).join('')}</ul></details>`;
}
// What Sol will read, before anything is sent.
export function pendingHTML() {
  const P = SOL.pending;
  if (!P) return '';
  const k = P.packet, counts = {};
  for (const s of k.sources) counts[s.kind] = (counts[s.kind] || 0) + 1;
  const connected = solConnected(), noun = nounOf(k.items);
  return `<section class="dk-solpend" aria-label="What Sol will read"><h4>Ask Sol<span>${k.items.length} ${noun}${k.items.length === 1 ? '' : 's'}</span></h4><p class="cm-spec-t"><b>${esc(P.title || k.items.map(i => i.title).join('; '))}</b></p>
   <p>Sol will read your question, ${k.items.length} selected ${noun}${k.items.length === 1 ? '' : 's'}, their recorded values and options, the objective and policy context, and ${k.sources.length} sources: ${Object.entries(counts).map(([kind, n]) => `${n} ${esc(n === 1 ? lowerFirst(kindName[kind] || kind) : kindPlural[kind] || kind)}`).join(', ')}.${k.omissions.length ? ` ${k.omissions.length} more did not fit and ${k.omissions.length === 1 ? 'is' : 'are'} left out.` : ''}</p>
   <details class="dk-solsee"><summary>Read sources and receipts · ${k.sources.length}</summary>${sourcesHTML(k.sources)}</details>
   ${k.advisoryHistory?`<details class="dk-solsee" data-sol-advisory-history><summary>Previous question and reasoning · advisory history</summary><p>${esc(k.advisoryHistory.question)}</p><p>${esc(k.advisoryHistory.authority)}</p><p>${esc(k.advisoryHistory.contentOmitted?k.advisoryHistory.omissionReason:k.advisoryHistory.sourceStatus==='previous-context-still-current'?'The saved context is still current; the new packet supplies the sources for this answer.':'The saved context changed or its currency is unverified. Reassess its advice against the current sources.')}</p><pre>${esc(JSON.stringify(k.advisoryHistory,null,2))}</pre></details>`:''}
   <details class="dk-solsee"><summary>Inspect the complete context packet sent to the provider</summary><p class="cm-muted">This JSON is the redacted project context supplied to Sol. Provider instructions and response schema are separate; the source check also receives Sol’s draft. Packet stamp: ${esc(k.stamp)}.</p><pre data-sol-complete-packet>${esc(JSON.stringify(k, null, 2))}</pre></details>
   ${leadsHTML(noun)}
   <label class="l-checkbox"><input type="checkbox" data-sol-semantic ${P.request.semantic?'checked':''} ${SOL.busy?'disabled':''}><span>Search knowledge by meaning<small>This explicitly sends the redacted question, selected readings, eligible released claims and shipped editorial Pattern DNA to OpenAI embeddings. Excluded objects and incompatible claims are withheld. Changing this setting prepares a new source preview before Sol answers; it does not activate repository material.</small></span></label>
   ${k.retrieval?`<p class="cm-muted" data-sol-retrieval>${esc(k.retrieval.mode)}${k.retrieval.reason?' · '+esc(k.retrieval.reason):''}. ${(k.retrieval.retainedSourceIds||[]).length} semantic sources retained. Editorial guidance remains unreviewed; relevance does not establish suitability.</p>`:''}
   <label class="dk-in col"><span>Your question for Sol (optional)</span><textarea rows="2" maxlength="2000" data-dk-in="sol-prompt" placeholder="For example: is the cost of 24 replicas justified, or is there a simpler way?">${esc(P.prompt || '')}</textarea></label>
   ${reasoningDraftHTML(P)}
   ${SOL.error ? `<p class="dk-verdict bad" role="alert">${esc(SOL.error)}</p>` : ''}
   <p class="cm-muted" data-sol-prompt-hint>${solPromptChanged() ? 'Question changed. Review the updated packet before sending.' : 'If you edit the question, the first click prepares the updated packet for review; the next sends it.'}</p>
   ${SOL.progress ? progressHTML('data-sol-reason-progress', SOL.progress, 'sr-progress') : ''}
   <div class="cm-acts"><button type="button" class="cm-btn primary" data-dk="sol-send" ${connected && !SOL.busy ? '' : 'disabled'}>${SOL.busy ? 'Sol is reasoning…' : solPromptChanged() ? 'Review updated question' : P.requestId ? 'Retry Sol assessment' : 'Send to Sol'}</button><button type="button" class="cm-btn" data-dk="sol-cancel">Cancel</button></div>
   <p class="cm-muted">${connected ? `${esc(SOL.config.provider || 'The provider')} · ${esc(SOL.config.model || '')}. ${esc(solStatus().retention || 'Sent over the server.')} Two passes: Sol assesses, then a second pass checks every assessment against these sources.` : esc(solStatusLine())}${instructionsOf({packet: k}) ? ` <span data-sol-pin>Instructions pinned: ${esc(pinText(instructionsOf({packet: k})))}.</span>` : ''}</p></section>`;
}
// Sol's view of one decision, where the decision is shown.
// Options: the knobs as they stand; names for a preferred alternative; where a preference is decided;
// the label and note for using refinements; a stale message; and what was done with it (outcomes).
const ALTERNATIVE_STATUS = {viable_as_stated: ['Viable as stated · Sol assessment', ''], violates_constraint: ['Conflicts with a stated constraint', 'bad'], not_established: ['Compatibility not established', 'warn']};
function alternativeChecksHTML(e, names) {
  const checks = list(e.a.alternativeChecks);
  if (!checks.length) return list(e.item?.allowed?.preferred).length ? '<p class="dk-verdict warn" data-sol-legacy-alternatives>This saved response predates per-alternative constraint checks. Reassess the current alternatives before relying on its preference.</p>' : '';
  const alternatives = list(e.item?.reading?.alternatives);
  return `<section class="dk-solalternatives" aria-label="Alternatives against the stated constraints"><h5>Alternatives against the stated constraints</h5><p class="cm-muted">Sol’s assessment of the supplied options. These statuses do not select an option or record architectural approval.</p><ul class="dk-solchecks">${checks.map(c => {
    const status = ALTERNATIVE_STATUS[c.admissibility] || ALTERNATIVE_STATUS.not_established, name = names[c.alternativeId] || alternatives.find(x => x.id === c.alternativeId)?.title || '';
    return `<li data-sol-alternative="${esc(c.alternativeId)}" data-admissibility="${esc(c.admissibility)}"><p><b>${esc(c.alternativeId)}${name ? ' · ' + esc(name) : ''}</b></p><p class="dk-verdict ${status[1]}" data-sol-alternative-status>${status[0]}</p><p><b>Constraint:</b> ${esc(c.constraint || 'No constraint identified in this assessment.')}</p><p>${esc(c.reason || '')}</p>${c.admissibility === 'not_established' ? '<p class="cm-muted">Evidence or assumptions remain open; this is not a viable option established by the assessment.</p>' : ''}<details class="dk-solmore"><summary>Source receipts · ${list(c.sourceRefs).length}</summary>${sourcesHTML(e.run.packet.sources, list(c.sourceRefs))}</details></li>`;
  }).join('')}</ul></section>`;
}
export function verificationHTML(assessment) {
  const tests=list(assessment?.verification);if(!tests.length)return '';
  return `<section class="dk-sol-verification" aria-label="Proposed verification"><h5>Proposed verification · not measured evidence</h5>${tests.map(v=>`<article><h6>${esc(v.title)}</h6><ol>${list(v.steps).map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p><b>Failure to test:</b> ${esc(v.failure)}</p><p><b>Pass criterion:</b> ${esc(v.passCriterion)}</p><p class="cm-muted">Sources: ${esc(list(v.sourceRefs).join(', ')||'none specified')}</p></article>`).join('')}</section>`;
}
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
  const checks = list(a.alternativeChecks), preferred = a.preferred && a.preferred !== 'none', preferenceBlocked = preferred && checks.length && !checks.some(c => c.alternativeId === a.preferred && c.admissibility === 'viable_as_stated');
  return `<section class="dk-sol ${esc(a.verdict)}" data-sol-item="${esc(id)}">${head}<p class="dk-sol-h"><b>${esc(a.headline)}</b></p><p>${esc(a.reasoning)}</p>${stale}
   ${alternativeChecksHTML(e, names)}
   ${verificationHTML(a)}
   <div class="cm-acts"><button type="button" class="cm-btn" data-dk="sol-ask" data-ids="${esc(id)}" data-title="${esc(e.item?.title||id)}" data-prior-run="${esc(run.id)}" ${SOL.busy?'disabled':''}>Follow up on this reasoning</button></div>
   ${a.refinements.length ? `<h5>Sol’s refinements · ${a.refinements.length}</h5><ul class="dk-solref">${a.refinements.map(r => `<li><b>${esc(label(r))}</b>${typeof r.value === 'number' ? `<span><del>${esc(was(r) === '' ? 'not recorded' : was(r))}</del> → <ins>${esc(r.value)}</ins></span>` : `<span class="w">${esc(String(r.value).slice(0, 400))}${String(r.value).length > 400 ? '…' : ''}</span>`}<small>${esc(r.why)}</small></li>`).join('')}</ul>${a.reread ? `<p class="dk-solre">${esc(a.reread)}</p>` : ''}${e.current ? `<div class="cm-acts"><button type="button" class="cm-btn gold" data-dk="sol-use" data-run="${esc(run.id)}" data-item="${esc(id)}">${esc(useLabel)}</button></div><p class="cm-muted">${esc(useNote)}</p>` : ''}` : ''}
   ${list(a.setAside).length ? `<h5>Set aside · ${a.setAside.length}</h5><ul class="dk-solref aside">${a.setAside.map(r => `<li><b>${esc(label(r))}</b><span class="w">${esc(String(r.value).slice(0, 400))}${String(r.value).length > 400 ? '…' : ''}</span><small>${esc(r.reason)}</small></li>`).join('')}</ul>` : ''}
   ${a.proposals.length ? `<h5>Sol proposes ${a.proposals.length} threat${a.proposals.length === 1 ? '' : 's'}</h5><div class="dk-solprop">${a.proposals.map((x, i) => `<label class="l-checkbox"><input type="checkbox" data-sol-threat="${i}" checked><span><b>${esc(x.title)}</b><small>${esc(x.category)} · ${esc(x.priority)} · on ${esc(x.targetIds.map(t => names[t] || t).join(', '))}</small><small>${esc(x.scenario)} ${esc(x.consequence)}</small></span></label>`).join('')}</div>${e.current ? `<div class="cm-acts"><button type="button" class="cm-btn gold" data-dk="sol-threats" data-run="${esc(run.id)}" data-item="${esc(id)}">Review the selected threats in Chapter 9…</button></div>` : ''}` : ''}
   ${preferenceBlocked ? '<p class="dk-verdict warn" data-sol-preference-blocked>The stated preference is withheld because its compatibility with the constraints is not established. Reassess the alternatives before choosing.</p>' : preferred ? `<p class="dk-solpref">Sol would lean to <b>${esc(a.preferred)}${names[a.preferred] ? ' ' + esc(names[a.preferred]) : ''}</b> — advice with its reasons; the choice stays yours in ${esc(choiceIn)}.</p>` : ''}
   ${a.risks.length || a.questions.length ? `<details class="dk-solmore"><summary>Risks and questions · ${a.risks.length + a.questions.length}</summary>${a.risks.length ? `<ul>${a.risks.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}${a.questions.length ? `<ul class="q">${a.questions.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}</details>` : ''}
   <details class="dk-solmore"><summary>What it rests on · ${a.sourceRefs.length}</summary>${sourcesHTML(run.packet.sources, a.sourceRefs)}</details>
   ${list(a.trimmed).length ? `<p class="cm-muted">Shortened to fit: ${esc(a.trimmed.join(', '))}. Sol wrote more than the desk keeps.</p>` : ''}
   ${doneText ? `<p class="dk-soldone">${esc(doneText)}</p>` : ''}
   ${a.checkNote ? `<p class="cm-muted" data-sol-check-note>${esc(a.checkNote)}</p>` : ''}
   <div class="dk-solfoot"><small>Sol · ${esc(run.model)} · ${esc(when)} · source-checked${instructionsOf(run) ? ' · ' + esc(pinText(instructionsOf(run))) : ''}</small><span>${bare && e.current && !last ? `<button type="button" class="cm-link" data-dk="sol-agree" data-run="${esc(run.id)}" data-item="${esc(id)}">Agree</button> · ` : ''}<button type="button" class="cm-link" data-dk="sol-dismiss" data-run="${esc(run.id)}" data-item="${esc(id)}">Disagree…</button></span></div>
   <form class="dk-soldis" data-sol-dismiss="${esc(id)}" hidden><label class="dk-in col"><span>Why doesn’t this advice hold?</span><textarea rows="2" maxlength="1000" name="reason" required></textarea></label><div class="cm-acts"><button type="submit" class="cm-btn">Record it</button></div></form></section>`;
}
// The ask, where a decision is shown: prepare, or the assessment and a way to ask again.
export function askHTML(ids, {title = '', label = 'Ask Sol', reads = 'the desk and the knowledge behind it'} = {}) {
  const on = SOL.pending && SOL.pending.request.ids.join('|') === ids.join('|');
  return `<div class="dk-solask"><button type="button" class="cm-btn${on ? ' on' : ''}" data-dk="sol-ask" data-ids="${esc(ids.join(','))}" data-title="${esc(title)}" ${SOL.busy ? 'disabled' : ''}>${esc(on ? 'Prepared: see above' : label)}</button><small>${solConnected() ? `Sol considers ${esc(reads)} before advising; you decide.` : SOL.config ? esc(solStatusLine({short: true})) + '; you can still see what it would read.' : esc(solStatusLine())}</small></div>`;
}

// ---------------------------------------------------------------- a slow call is not a frozen screen (round 5)
// While Sol drafts a field, drafts a chapter of the journey or reviews a chapter, the surface that asked reads the run's
// saved status every second (runs?id=, with the request id the surface chose) and says the mode and the step the server
// records for it: drafting, then checking against the packet. `onLine(line, step, seconds)` is called on every reading
// (the line changes only with the step, so a status region announces steps, not seconds); the returned function stops
// the reading when the call has answered.
const MODE_NAMES = {reason: 'assessing the selected design', field: 'drafting a field', journey: 'drafting the chapter', review: 'reviewing the chapter'};
export function watchRun(requestId, mode, onLine) {
  const t0 = Date.now();
  let stopped = false, step = '', timer = 0;
  const line = () => `Sol · ${MODE_NAMES[mode] || mode} · ${step === 'checking' ? 'checking…' : step === 'drafting' ? mode === 'reason' ? 'assessing…' : 'drafting…' : 'sending…'}`, secs = () => Math.round((Date.now() - t0) / 1000);
  const tick = async () => {
    if (stopped) return;
    try { const r = await fetch(projectURL('/api/intelligence/runs?id=' + encodeURIComponent(requestId)), {credentials: 'same-origin'}); if (r.ok) { const d = await r.json(); if (d.step === 'drafting' || d.step === 'checking') step = d.step; } }
    catch { /* the next reading may answer; the line keeps the last step */ }
    if (stopped) return;
    onLine(line(), step, secs()); timer = setTimeout(tick, 1000);
  };
  onLine(line(), step, secs()); timer = setTimeout(tick, 500);
  return () => { stopped = true; clearTimeout(timer); };
}

// One live line for a pending call: the step in a status region, the seconds beside it, not announced.
export const progressHTML = (attr, text, cls = '') => `<p class="${cls}" role="status"><span ${attr}>${esc(text)}</span> <small ${attr}-secs aria-hidden="true"></small></p>`;
export function showProgress(root, attr, text, secs) {
  for (const el of root?.querySelectorAll?.(`[${attr}]`) || []) { if (el.textContent !== text) el.textContent = text; const s = el.parentElement?.querySelector(`[${attr}-secs]`); if (s) s.textContent = secs + ' s'; }
}

// ---------------------------------------------------------------- Sol reviews a chapter's model (round 5, Contract R)
// "Review this chapter", in Proposals and in the Model tab's Sol section. What Sol will read is prepared and shown first
// (review-context: the chapter's records with their checks, the chapter's checks as a whole and its connected model; no
// key is needed and nothing is sent). Only when the server reports a provider is the review sent, as the packet shown;
// the run is saved and receipted. Its findings are listed in the checks' own words (✕ to fix, ○ to confirm; a note is
// something to confirm you have weighed) with the element each concerns, and painted on the picture through the marks
// channel (window.aiwModelMarks, source `sol-review`). They are advice: a finding becomes a record only when a person
// adopts it — intelligence.adopt, kind review-finding, which records a Chapter 11 delivery action through review.action.
// Sol never writes a check. The saved runs (review-runs) bring the latest findings back when the chapter is opened again.
// One state per project and chapter, so two surfaces showing different chapters (a chapter's model beside a perspective,
// Sol's panel on another chapter) never reset each other. A change updates the review's own sections in place and tells
// Proposals (aiw:sol-review); it never redraws or remounts a chapter model, and a section already drawn at the state's
// version is left alone.
const reviews = new Map(), asideFindings = new Set();
const reviewBasisPacket = packet => packet ? {stamp:packet.stamp,brainReceipt:{instructions:packet.brainReceipt?.instructions||null},sources:list(packet.sources).map(s=>({kind:s.kind,objectId:s.objectId,receipt:s.receipt||null}))} : null;
const reviewCurrency = new WeakMap();
export function reviewFindingHistorical(p,run) {
  if (!p || !run) return true;
  const prior=reviewCurrency.get(run);
  if (prior?.project===p) return !prior.current;
  const current=reviewFindingBasis(p,{...run,packet:run.packetBasis}).current;
  reviewCurrency.set(run,{project:p,current});
  return !current;
}
const reviewStore = () => (typeof window !== 'undefined' ? window.aiwProjectStore : null);
const reviewDoc = () => reviewStore()?.value?.document || null;
const chapterOf = c => { const n = Number(c); return n >= 1 && n <= 11 ? n : null; };
function stateOf(chapter, projectId = reviewDoc()?.id) {
  const key = (projectId || '') + ':' + chapter;
  let st = reviews.get(key);
  if (!st) reviews.set(key, st = {projectId, chapter, runs: [], loaded: false, loading: false, context: null, contextKey: '', open: false, busy: false, progress: '', error: '', note: '', confirm: '', adopting: '', historical: new Set(), version: 0});
  return st;
}
const STATE_OF = {fix: 'fix', confirm: 'confirm', note: 'confirm'};
export const findingState = f => STATE_OF[f?.severity] || 'confirm';
export const findingWords = f => `${CHECK_GLYPHS[findingState(f)]} ${CHECK_WORDS[findingState(f)]}${f?.severity === 'note' ? ' · a note' : ''}`;
const findingKey = (run, f) => run.id + ':' + f.id;
export const reviewRun = chapter => (chapterOf(chapter) ? stateOf(chapterOf(chapter)).runs[0] : null) || null;
// The latest review's findings that are not set aside, each with its run and chapter.
export function reviewFindings(chapter) { const c = chapterOf(chapter), run = c ? reviewRun(c) : null; return run ? list(run.result?.findings).filter(f => !asideFindings.has(findingKey(run, f))).map(f => ({...f, run, chapter: c})) : []; }
// The Chapter 11 action a finding was adopted as, when it was.
export const adoptedAction = (p, runId, findingId) => list(p?.finalReview?.actions).find(a => a.provenance?.solReview?.runId === runId && a.provenance.solReview.findingId === findingId) || null;
export function elementName(p, id) { try { const n = journeyIndex(p).nodes.get(id); if (n) return {ref: n.ref || n.id, title: n.title || '', chapter: n.chapter || null}; } catch { /* named by its id */ } return {ref: id, title: '', chapter: null}; }
// The findings of the chapter on screen, on the picture (Contract M, source sol-review); withdrawn when there is none.
// Coalesced and outside any drawing: a surface that draws a review section never paints during its own draw.
let paintQueued = false;
function paintReview() {
  if (paintQueued) return;
  paintQueued = true;
  queueMicrotask(() => {
    paintQueued = false;
    const M = typeof window !== 'undefined' ? window.aiwModelMarks : null;
    if (!M?.set) return;
    const here = typeof location !== 'undefined' ? chapterOf(new URLSearchParams(location.search).get('chapter')) : null;
    const fs = here && reviews.get((reviewDoc()?.id || '') + ':' + here)?.loaded ? reviewFindings(here) : [];
    if (!fs.length) { M.clear?.('sol-review'); return; }
    M.set('sol-review', fs.map(f => ({id: f.elementId, state: findingState(f), note: `Sol’s review · ${CHECK_WORDS[findingState(f)]}: ${f.title}`})));
  });
}
// A change to one chapter's review: its sections redrawn in place (once per version), Proposals told, the marks repainted.
function reviewChanged(st) {
  st.version++;
  paintReview();
  if (typeof document === 'undefined') return;
  const p = reviewDoc();
  if (p && p.id === st.projectId) for (const el of document.querySelectorAll(`[data-sol-review-section="${st.chapter}"]`)) {
    // Proposals redraws its own list on aiw:sol-review, this section with it.
    if (Number(el.dataset.solReviewVersion) === st.version || el.closest('[data-proposals]')) continue;
    const focus = el.contains(document.activeElement) ? document.activeElement : null, again = focus?.dataset?.solReview ? `[data-sol-review="${focus.dataset.solReview}"]${focus.dataset.finding ? `[data-finding="${focus.dataset.finding}"]` : ''}` : null;
    const t = document.createElement('template'); t.innerHTML = reviewSectionHTML(p, st.chapter, {findings: el.dataset.solReviewFindings === '1', base: el.dataset.solReviewBase || 'cm-btn'});
    const next = t.content.firstElementChild; if (!next) continue;
    el.replaceWith(next);
    if (focus) (again && next.querySelector(again) || next.querySelector('[data-sol-review]'))?.focus({preventScroll: true});
  }
  document.dispatchEvent(new CustomEvent('aiw:sol-review', {detail: {chapter: st.chapter, version: st.version}}));
}
// Sol's saved reviews of a chapter, read once per project and chapter; the latest one's findings are painted.
export function reviewLoad(chapter) {
  const c = chapterOf(chapter), p = reviewDoc();
  if (!c || !p?.id) return;
  const st = stateOf(c, p.id);
  if (st.loaded || st.loading) return;
  st.loading = true;
  // The sections are updated only when a saved review came back: with none, what they drew is what they would draw again.
  call('review-runs?chapter=' + c).then(d => { st.runs = list(d.runs); }).catch(() => { /* no saved review to show */ })
    .finally(() => { st.loading = false; st.loaded = true; if (st.runs.length) reviewChanged(st); else paintReview(); });
}
// What Sol would read for the chapter as it is now (for the preview, and to say whether the latest review is current).
const contextKeyOf = chapter => (reviewDoc()?.id || '') + ':' + chapter + ':' + (reviewStore()?.value?.revision ?? 0);
// Read once per saved revision; a failed reading is not repeated by redraws; "Review this chapter" asks again (force).
function reviewContext(st, force = false) {
  const key = contextKeyOf(st.chapter);
  if (st.contextKey === key && !force) return Promise.resolve(st.context);
  st.contextKey = key;
  return call('review-context', {chapter: st.chapter}).then(d => { if (st.contextKey === key) st.context = d; return d; }, e => { if (st.contextKey === key) st.context = null; throw e; });
}
export async function reviewPrepare(chapter) {
  const c = chapterOf(chapter); if (!c) return;
  reviewLoad(c);
  const st = stateOf(c);
  Object.assign(st, {open: true, busy: true, error: '', note: ''}); reviewChanged(st);
  try { await reviewContext(st, true); } catch (e) { st.error = e.message; st.open = false; }
  finally { st.busy = false; reviewChanged(st); }
}
export async function reviewSend(chapter) {
  const c = chapterOf(chapter); if (!c) return;
  const st = stateOf(c), C = st.context;
  if (!C?.packet || st.busy) return;
  if (!C.configuration?.configured || C.aiEnabled === false) { st.error = C.aiEnabled === false ? 'The project owner has disabled external AI processing. Nothing was sent.' : 'Sol is not connected in this workspace. Nothing was sent.'; reviewChanged(st); return; }
  const requestId = crypto.randomUUID();
  Object.assign(st, {busy: true, error: '', note: '', progress: ''}); reviewChanged(st);
  const stop = watchRun(requestId, 'review', (line, step, secs) => { st.progress = line; if (typeof document !== 'undefined') showProgress(document, 'data-sol-review-progress', line, secs); });
  try {
    const run = await call('review', {chapter: c, requestId, packetStamp: C.packet.stamp});
    if (run.status !== 'completed') throw Error(run.error || 'Sol’s review was not completed. Nothing was changed.');
    st.runs = [{id: run.id, createdAt: run.createdAt, provider: run.provider, model: run.model, request: run.request, result: run.result, instructions: run.instructions, packetStamp: run.packet?.stamp, packetBasis:reviewBasisPacket(run.packet), accepted: !!run.groundingReview?.accepted}, ...st.runs.filter(r => r.id !== run.id)];
    const fs = list(run.result?.findings), held = list(run.result?.withheld).length, n = s => fs.filter(f => findingState(f) === s).length;
    st.open = false;
    st.note = run.result?.declined ? `Sol declined to review Chapter ${c}: ${run.result.declined} Nothing was changed.` : `Sol reviewed Chapter ${c}: ${plural(fs.length, 'finding')}${fs.length ? ` (${n('fix')} to fix, ${n('confirm')} to confirm)` : ''}${held ? `; ${held} withheld by the source check` : ''}. Advice only: nothing changes unless you adopt a finding.`;
  } catch (e) { st.error = e.message; if (e.data?.conflict) { st.contextKey = ''; st.context = null; st.open = false; } }
  finally { stop(); st.busy = false; st.progress = ''; reviewChanged(st); }
}
// A person adopts one finding: one Chapter 11 action through intelligence.adopt (kind review-finding).
export async function reviewAdopt(chapter, runId, findingId, historicalReason = '') {
  const c = chapterOf(chapter); if (!c) return null;
  const st = stateOf(c), store = reviewStore();
  if (!store?.command) { st.error = 'Open the project to adopt a finding.'; reviewChanged(st); return null; }
  try {
    const selectedRun = st.runs.find(run => run.id === runId);
    if (!selectedRun) throw Error('This finding is no longer in the current chapter review. Open its saved review again.');
    const current = await reviewContext(st, true);
    if (reviewDoc()?.id !== st.projectId) return null;
    if (!current?.packet) throw Error('The current chapter basis could not be checked. Try again after the chapter reloads.');
    const historical = st.historical.has(runId) || reviewFindingHistorical(reviewDoc(),selectedRun) || selectedRun.packetStamp !== current.packet.stamp;
    const reason = historicalReason.trim();
    if (historical && (reason.length < 20 || reason.length > 2000)) throw Error('This chapter has changed since Sol reviewed it. To record the finding as historical advice, explain what still makes it relevant (20–2,000 characters).');
    st.adopting = runId + ':' + findingId; st.error = ''; reviewChanged(st);
    const r = await store.command({type: 'intelligence.adopt', payload: {runId, kind: 'review-finding', findingId, reviewed: true, ...(historical ? {historicalAcknowledged: true, historicalReason: reason} : {})}});
    st.note = `Recorded as Chapter 11 action ${r?.selected || ''}: Planned, with no owner yet. Open Chapter 11 to give it an owner and a due date.`;
    st.confirm = '';
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('aiw:external-project'));
    return r;
  } catch (e) { st.error = e.message; if (/historical finding|source receipts changed/i.test(e.message)) st.historical.add(runId); return null; }
  finally { st.adopting = ''; reviewChanged(st); }
}
export function reviewSetAside(chapter, runId, findingId) { const c = chapterOf(chapter); if (!c) return; asideFindings.add(runId + ':' + findingId); reviewChanged(stateOf(c)); }
// Selects the element a finding concerns through the shell's own selection.
export function reviewSelect(id) { try { window.aiwShellSelect?.(id); } catch { /* the shell selects what it knows */ } }
// Buttons in the chapter companions are cm-btn; in Sol's panel (Proposals) they are btn. Every one names its chapter.
const RB = (act, label, cls = '', attrs = '', base = 'cm-btn', chapter = '') => `<button type="button" class="${base} ${cls}" data-sol-review="${act}" data-chapter="${esc(chapter)}" ${attrs}>${label}</button>`;
function packetHTML(C) {
  const k = C.packet, records = k.sources.filter(x => x.kind === 'record').length, om = k.omissions || {};
  let els = 0, rels = 0; try { const x = JSON.parse(k.sources.find(z => z.kind === 'connected-model')?.excerpt || '{}'); els = list(x.elements).length; rels = list(x.relationships).length; } catch { /* counted as none */ }
  const left = [om.records ? plural(om.records, 'record') : '', om.withheld ? `${om.withheld} excluded by the project’s policy` : '', om.elements ? plural(om.elements, 'element') : '', om.relationships ? plural(om.relationships, 'relationship') : ''].filter(Boolean);
  return `<div class="sr-packet" data-sol-review-packet><p>Sol will read Chapter ${esc(k.chapter.id)} · ${esc(k.chapter.title)}: ${plural(records, 'record')} with their checks, the chapter’s checks as a whole, and its connected model (${plural(els, 'element')}, ${plural(rels, 'relationship')}), and nothing else.${left.length ? ` Left out to fit: ${esc(left.join(', '))}.` : ''}</p><details class="dk-solsee"><summary>Inspect what will be sent · ${plural(k.sources.length, 'source')}</summary>${sourcesHTML(k.sources)}</details><p class="cm-muted">Packet ${esc(String(k.stamp).slice(0, 12))}${pinText(k.brainReceipt?.instructions) ? ' · ' + esc(pinText(k.brainReceipt.instructions)) : ''} · secrets are redacted before sending.</p></div>`;
}
// The adopt control of one finding (from reviewFindings): Adopt…, its confirmation, or the action it became.
export function adoptHTML(p, f, base = 'cm-btn') {
  const done = adoptedAction(p, f.run.id, f.id), key = findingKey(f.run, f), st = stateOf(f.chapter), ids = `data-run="${esc(f.run.id)}" data-finding="${esc(f.id)}"`;
  if (done) return `<span class="sr-adopted" data-sol-review-adopted="${esc(done.id)}">Adopted as ${esc(done.id)}</span>`;
  if (st.confirm === key) { const e = elementName(p, f.elementId), historical = st.historical.has(f.run.id) || reviewFindingHistorical(p,f.run) || !st.context?.packet || st.context.packet.stamp !== f.run.packetStamp;
    return `<span class="sr-confirm" role="group" aria-label="Adopt this finding"><span>${historical ? 'This is historical advice: the chapter has changed since Sol reviewed it. You can record it only with a reason it remains relevant. It is not a current finding.' : 'Record it as a Chapter 11 delivery action'} on ${esc(e.ref)}, with its severity, reason and Sol’s run. It starts Planned, with no owner.</span>${historical ? '<label class="dk-in col"><span>Why retain this historical finding?</span><textarea data-sol-historical-reason rows="3" minlength="20" maxlength="2000" required></textarea></label>' : ''}${RB('adopt-confirm', st.adopting === key ? 'Recording…' : historical ? 'Record historical action' : 'Record the action', 'primary', `${ids} ${st.adopting ? 'disabled' : ''}`, base, f.chapter)}${RB('adopt-cancel', 'Cancel', '', ids, base, f.chapter)}</span>`; }
  return RB('adopt', 'Adopt…', 'primary', ids, base, f.chapter);
}
export const asideHTML = (f, base = 'cm-btn') => RB('aside', 'Hide for this session', '', `data-run="${esc(f.run.id)}" data-finding="${esc(f.id)}" title="Hides it here and on the picture for this session; nothing is recorded"`, base, f.chapter);
// The review's own part of a surface: the entry, the preview, the progress, the latest run, and in the Model tab's Sol
// section the findings themselves (Proposals lists them as rows of its own). Drawing it reads what is not yet read
// (the saved runs once, the packet once per saved revision) and never redraws anything else.
export function reviewSectionHTML(p, chapter, {findings = true, base = 'cm-btn'} = {}) {
  const c = chapterOf(chapter);
  if (!p?.id || !c) return '';
  reviewLoad(c);
  const st = stateOf(c, p.id), run = st.runs[0] || null, C = st.context, configured = !!C?.configuration?.configured && C.aiEnabled !== false;
  if (st.loaded) paintReview();
  // Whether the latest review read the chapter as it is now: the packet is read again once per saved revision.
  if ((run || st.open) && !st.busy && st.contextKey !== contextKeyOf(c)) reviewContext(st).then(() => reviewChanged(st), () => { /* currency stays unknown */ });
  const stale = run && (reviewFindingHistorical(p,run) || (C?.packet && run.packetStamp && run.packetStamp !== C.packet.stamp));
  const fs = reviewFindings(c);
  // Round 7 (Contract D): the heading names Sol and the chapter once and carries the state in one chip; the
  // findings of the latest run are classified — to consider, adopted, set aside — each group with its count.
  const all = run ? list(run.result?.findings).map(f => ({...f, run, chapter: c})) : [];
  const adopted = all.filter(f => adoptedAction(p, run.id, f.id)), aside = all.filter(f => asideFindings.has(findingKey(run, f)) && !adoptedAction(p, run.id, f.id));
  const consider = fs.filter(f => !adoptedAction(p, run.id, f.id));
  const state = st.busy ? ['busy', 'reviewing…'] : run && stale ? ['stale', 'the chapter changed since'] : run ? consider.length ? ['found', `${consider.length} to consider`] : ['clear', adopted.length || aside.length ? 'nothing left to consider' : 'no findings'] : ['idle', 'not run'];
  const head = `<h4 aria-level="3">Sol · review of Chapter ${esc(c)}<span class="sr-state ${esc(state[0])}">${esc(state[1])}</span></h4>`;
  const status = st.busy ? progressHTML('data-sol-review-progress', st.progress || (st.open && !C ? 'Preparing what Sol would read…' : 'Sol · reviewing the chapter · sending…'), 'sr-progress') : '';
  const note = st.note ? `<p class="sr-note" role="status">${esc(st.note)}</p>` : '', error = st.error ? `<p class="dk-verdict bad" role="alert">${esc(st.error)}</p>` : '';
  let body;
  if (st.open && C) body = packetHTML(C) + (configured ? `<div class="cm-acts">${RB('send', st.busy ? 'Sol is reviewing…' : 'Send to Sol', 'primary', st.busy ? 'disabled' : '', base, c)}${RB('cancel', 'Not now', '', st.busy ? 'disabled' : '', base, c)}</div><p class="cm-muted">${esc(C.configuration.provider)} · ${esc(C.configuration.model || '')}. ${esc(C.configuration.retention || 'Sent over the server.')} Two passes: Sol reviews, then a second pass checks every finding against this packet.</p>` : `<p class="sr-off" data-sol-review-off>${C.aiEnabled === false ? 'The project owner has disabled external AI processing: here is what Sol would read; nothing is sent.' : 'Sol is not connected in this workspace: here is what it would read. Nothing is sent, and the chapter’s own checks stand.'}</p><div class="cm-acts">${RB('cancel', 'Close', '', '', base, c)}</div>`);
  else body = st.busy ? '' : `${run ? '' : '<p class="cm-muted sr-why">Sol reads the chapter’s records, their checks and the connected model; you see the packet first and decide.</p>'}<div class="cm-acts">${RB('prepare', run ? 'Review this chapter again' : 'Review this chapter', run ? '' : 'primary', '', base, c)}</div>`;
  const when = run ? `<p class="cm-muted sr-run" data-sol-review-run="${esc(run.id)}">Latest review · run ${esc(run.id.slice(0, 8))} · ${esc(String(run.createdAt || '').slice(0, 16).replace('T', ' '))} · ${esc(run.model || '')}${pinText(run.instructions) ? ' · ' + esc(pinText(run.instructions)) : ''} · ${run.accepted ? 'source-checked' : 'the source check withheld some findings'}${stale ? ' · <b>the chapter has changed since; its findings may no longer hold</b>' : ''}</p>` : '';
  const item = (f, acts = true) => { const e = elementName(p, f.elementId); return `<li class="sr-f ${esc(findingState(f))}" data-sol-finding="${esc(f.id)}"><p class="sr-f-head"><span class="sr-sev ${esc(findingState(f))}">${esc(findingWords(f))}</span><button type="button" class="cm-link" data-sel="${esc(f.elementId)}" title="Select it in the model">${esc(e.ref)}${e.title ? ' · ' + esc(e.title) : ''}</button></p><p><b>${esc(f.title)}</b></p>${acts ? `<p>${esc(f.reason)}</p><p class="sr-f-acts">${adoptHTML(p, f)}${asideHTML(f)}</p>` : ''}</li>`; };
  const group = (key, title, items, note) => items.length ? `<section class="sr-group ${key}" aria-label="${esc(title)}"><p class="sr-group-head"><b>${esc(title)}</b><span>${items.length}</span></p><ol class="sr-findings">${items.join('')}</ol></section>` : note ? `<p class="cm-muted sr-group-empty">${esc(note)}</p>` : '';
  const items = findings && run ? group('consider', 'To consider', consider.map(f => item(f)), all.length ? 'Nothing left to consider from the latest review.' : 'No finding from the latest review.')
    + group('adopted', 'Adopted', adopted.map(f => `<li class="sr-f adopted" data-sol-finding="${esc(f.id)}"><p class="sr-f-head"><span class="sr-sev adopted">adopted</span><b>${esc(f.title)}</b></p><p class="sr-f-acts">${adoptHTML(p, f)}</p></li>`))
    + group('aside', 'Hidden for this session', aside.map(f => `<li class="sr-f aside" data-sol-finding="${esc(f.id)}"><p class="sr-f-head"><span class="sr-sev aside">hidden for this session</span><b>${esc(f.title)}</b></p></li>`)) : '';
  return `<section class="sr" data-sol-review-section="${esc(c)}" data-sol-review-version="${st.version}" data-sol-review-findings="${findings ? 1 : 0}" data-sol-review-base="${esc(base)}">${head}${note}${error}${status}${body}${when}${items}</section>`;
}
// One listener for the review's controls wherever they are drawn (Proposals, the Model tab's Sol section).
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', e => {
    const b = e.target?.closest?.('[data-sol-review]');
    if (!b || b.disabled) return;
    e.preventDefault(); e.stopPropagation();
    const a = b.dataset.solReview, run = b.dataset.run, finding = b.dataset.finding, c = chapterOf(b.dataset.chapter), st = c ? stateOf(c) : null;
    if (a === 'select') { reviewSelect(b.dataset.id); return; }
    if (!st) return;
    if (a === 'prepare') reviewPrepare(c);
    else if (a === 'send') reviewSend(c);
    else if (a === 'cancel') { st.open = false; st.error = ''; reviewChanged(st); }
    else if (a === 'adopt') { st.confirm = run + ':' + finding; reviewChanged(st); }
    else if (a === 'adopt-cancel') { st.confirm = ''; reviewChanged(st); }
    else if (a === 'adopt-confirm') reviewAdopt(c, run, finding, b.closest('.sr-confirm')?.querySelector('[data-sol-historical-reason]')?.value || '');
    else if (a === 'aside') reviewSetAside(c, run, finding);
  });
  // Another project opened in place: its reviews are read again, and this one's marks withdrawn.
  onProjectSwitch(() => { ++SOL.epoch; ++SOL.sequence; Object.assign(SOL,{projectId:null,config:null,runs:[],byItem:new Map(),pending:null,leads:null,busy:false,loading:false,error:'',note:'',progress:'',stamps:new Map(),stampBase:null,stampDoc:null,chapterStamps:new Map()}); reviews.clear(); asideFindings.clear(); paintReview(); });
}
