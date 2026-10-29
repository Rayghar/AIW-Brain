import {mountOutputWorkspace} from './output-workspace.js';
import {madrExport} from './madr.js';
import {zipFiles} from './model-exchange.js';
import {mountValidationWorkspace} from './validation-workspace.js';
// The Validate tab is the chapter's checks (round 3, C: Validate checks, Output documents).
// - A status header: what passes, what is to fix and what is to confirm, when the checks last ran, and Run checks
//   (the studio's own button, moved into the header so there is one).
// - The chapter's findings, grouped by the object they concern (or by kind), each group a table with one row per
//   finding: its status as the glyph and the word, what it says, and Open, Ask Sol and, where Chapter 11 can record a
//   treatment for it, Treat as compact buttons. Only the first group is open (round 5, Contract G).
// - What the chapter's own models show, as prompts.
// - "This chapter in the SDD": the passages the chapter fills in the solution design document, with their status
//   and what is missing (readiness-model.js).
// Validate has three readings of the saved project: SDD readiness (the chapter's governed checks, the default),
// Model integrity (structural issues, relationship typing and chapter prompts), and a selected focused case.
// Neither of the latter readings approves a diagram or the whole SDD. The design anatomy remains on Model
// ("Whole design") and the review desk remains Chapter 11's Model. All three readings write nothing.
// Round 6 (Contract F): the Output tab of Chapter 3 offers the decision records as MADR files (madr.js) in one zip,
// mounted by mountOutput; the files are derived from the saved records in the browser and say so.
import {sddContributionHTML, counted, scopedCauses} from './readiness-model.js';
// rc41 (W2): the readings' switch is the chapter strip (chapter-strip.js), the one component the four tabs share:
// SDD readiness carries the meter of the chapter's records, Model integrity its counts once read, Focused case its
// cases; the current reading carries the chapter's accent and aria-current; ← → Home End move along it.
import {chapterStripHTML, stripReading, setStripCount} from './chapter-strip.js';
import {chapterRecordsState} from './work-frame.js';
// Round 24 (D-24-08): the checks read for the shell's module scope (project-context.js), counted as the chapter counts them.
import {reviewSourceUrl} from './review-domain.js';
import {lensReport, lensById, LENSES, LENS_RULE, LENS_LIMITS} from './domain-lens.js';
import {openDialog, closeDialog, showDialogError, setDialogBusy} from './dialog.js';
import {projectPreferenceKey, projectURL, projectFileName, recordProjectLocation, currentProject as project, shellScopeId, shellLens} from './project-context.js';
import {esc, shortText} from './html-escape.js';
import {setFindingCause, findingCauseOf, syncDetailsToggle} from './studio-kit.js';
import {plural} from './util.js';
import {downloadOutput, recordRowsHTML, recordPagerHTML, outputRecords, RECORD_PAGE, MADR_DOWNLOAD_TEXT} from './output-documents.js';

// The Model integrity item's counts, each noun in its number (rc41 close): "0 structural · 1 relationship type · 1 prompt".
const nounCount = (n, one, many = one + 's') => (Number(n) || 0).toLocaleString('en-GB') + ' ' + (Number(n) === 1 ? one : many);
export const modelIntegrityCounts = (structural, typed, prompts) => `${(Number(structural) || 0).toLocaleString('en-GB')} structural · ${nounCount(typed, 'relationship type')} · ${nounCount(prompts, 'prompt')}`;
let head = null, obs = null, sdd = null, observed = new Map(), obsFor = null, sddFor = null;
let lensSwitch = null, modelPanel = null, casePanel = null, activeLens = 'sdd', lensProject = null, modelFor = null, modelToken = 0, caseToken = 0, caseReader = null, caseDomain = null, selectedCase = null, caseHistory = 'current', caseRoute = null, focusCaseWhenReady = false;
let modelIssueRows = [], modelIssueShown = 0, modelCounts = null;
const hostOf = () => document.querySelector('.studio > .stage.tab-content');
const chapterOf = selection => Number(selection?.chapter) || Number(new URLSearchParams(location.search).get('chapter')) || 1;
const revision = () => window.aiwProjectStore?.value?.revision ?? '';
const readingSignature = (p, chapter) => p.id + ':' + chapter + ':' + revision() + ':' + shellScopeId();
// The address, rather than a previous chapter's switch state, owns the reading on a new route. An explicit
// readiness reading also takes precedence over a case id retained while the architect looks at the whole SDD.
const routeLens = chapter => {
  const q = new URLSearchParams(location.search), requested = q.get('validate');
  if (requested === 'integrity') return 'model';
  if (requested === 'case') return 'case';
  if (requested === 'readiness') return 'sdd';
  return chapter === 11 && q.has('case') ? 'case' : 'sdd';
};
const lensRouteValue = {sdd: 'readiness', model: 'integrity', case: 'case'};
function writeLensRoute(lens) {
  const q = new URLSearchParams(location.search);
  q.set('validate', lensRouteValue[lens]);
  const url = projectURL(location.pathname + '?' + q + location.hash);
  history.pushState({aiw: 'validation'}, '', url);
  recordProjectLocation();
  window.dispatchEvent(new CustomEvent('aiw:validation-lens',{detail:{chapter:chapterOf(null),lens:lensRouteValue[lens]}}));
}

export function mountValidate(selection, callbacks = {}) {
  const host=hostOf(),p=project();if(!host||!p)return;
  const chapter=chapterOf(selection);
  if(lensProject!==p.id){lensProject=p.id;activeLens='sdd';modelFor=null;selectedCase=null;caseHistory='current';caseRoute=null;focusCaseWhenReady=false;modelToken++;caseToken++;}
  activeLens=routeLens(chapter);if(activeLens==='case'&&!(p.finalReview?.architectureCases||[]).length)activeLens='sdd';
  const surface=host.querySelector('[data-validation-workspace]');
  if(surface){
    mountValidationWorkspace(host,{askSol:askSolAbout,nextStep:validationNextStep});
    const support=surface.querySelector('[data-validation-support]'),sig=readingSignature(p,chapter);
    if(support){placeSDD(support,p,chapter,sig);placeObservations(support,p,chapter,sig);placeLens(support,p,chapter,sig);}
    if(callbacks.asked==='desk'||callbacks.asked==='model'){
      const note=document.createElement('p');note.className='validation-context';note.textContent=callbacks.asked==='desk'?'The review desk is in Chapter 11 Model.':'The whole design is a view on Model.';
      const link=document.createElement('a');link.href=projectURL('/?chapter='+(callbacks.asked==='desk'?11:chapter)+'&tab=model'+(callbacks.asked==='model'?'&model=whole':''));link.textContent=' Open Model';note.append(link);support?.prepend(note);
    }
  }
  placeValidationLens(host,p,chapter,readingSignature(p,chapter));
}
export function leaveValidate() {
  nextBox?.remove();
  head?.remove(); obs?.remove(); sdd?.remove(); lensBox?.remove(); causesBox?.remove(); lensSwitch?.remove(); modelPanel?.remove(); casePanel?.remove(); obsFor = null; sddFor = null; lensFor = null; causesFor = null; modelToken++; caseToken++; modelIssueRows=[]; modelIssueShown=0;
  if (modelPanel?.dataset.ready === 'loading') { modelFor = null; delete modelPanel.dataset.ready; }
  hostOf()?.classList.remove('vx-model-active', 'vx-case-active');
  document.querySelector('.studio.vx-case-reading')?.classList.remove('vx-case-reading');
  syncDetailsToggle();
  caseRoute = null; focusCaseWhenReady = false;
  if (findingCauseOf()) setFindingCause(null);
}

// Three readings of the same saved project: chapter SDD checks, model structure,
// and the selected Chapter 11 case projection. None writes a review or approval.
function placeValidationLens(host, p, chapter, sig) {
  if (!host || !p) return;
  if (!lensSwitch) {
    lensSwitch = document.createElement('nav'); lensSwitch.className = 'chapter-strip vx-switch'; lensSwitch.setAttribute('aria-label', 'Validation lens');
    lensSwitch.addEventListener('click', e => {
      const button = e.target.closest('[data-vx-lens-view]'); if (!button) return;
      if (button.dataset.vxLensView === activeLens) return;
      activeLens = button.dataset.vxLensView;
      writeLensRoute(activeLens);
      // A keyboard switch keeps focus on its button; a link or Back into a case focuses the case heading.
      caseRoute = activeLens === 'case' ? location.search : null;
      focusCaseWhenReady = false;
      if(activeLens==='sdd')mountValidate({chapter:chapterOf(null)});
      else placeValidationLens(hostOf(), project(), chapterOf(null), readingSignature(project(), chapterOf(null)));
      lensSwitch.querySelector(`[data-vx-lens-view="${activeLens}"]`)?.focus({preventScroll: true});
    });
  }
  if (!modelPanel) {
    modelPanel = document.createElement('section'); modelPanel.className = 'vx-model-panel'; modelPanel.setAttribute('aria-labelledby', 'vx-model-title');
    modelPanel.addEventListener('click',e=>{
      const button=e.target.closest('[data-vx-model-more]');if(!button)return;
      const list=modelPanel.querySelector('[data-vx-model-issues]'),next=modelIssueRows.slice(modelIssueShown,modelIssueShown+25);
      list?.insertAdjacentHTML('beforeend',next.join(''));modelIssueShown+=next.length;
      const rest=modelIssueRows.length-modelIssueShown;
      if(rest)button.textContent=`Show next ${Math.min(25,rest)} of ${rest.toLocaleString('en-GB')} structural findings`;
      else button.remove();
      list?.lastElementChild?.scrollIntoView({block:'nearest'});
    });
  }
  const hasCases = !!(p.finalReview?.architectureCases || []).length;
  drawReadings(p, chapter, sig, hasCases);
  if (!casePanel) {
    casePanel = document.createElement('section'); casePanel.className = 'vx-case-panel'; casePanel.setAttribute('aria-labelledby', 'vx-case-title');
    casePanel.addEventListener('change', e => {
      if (!e.target.matches('[data-vx-case-select]')) return;
      selectedCase = e.target.value; caseHistory = 'current';
      try { const key=projectPreferenceKey('aiw-architecture-case'),saved=JSON.parse(localStorage.getItem(key)||'{}'); localStorage.setItem(key,JSON.stringify({...saved,id:selectedCase})); } catch { /* Project preference is optional. */ }
      const q=new URLSearchParams(location.search);q.set('case',selectedCase);history.replaceState(history.state,'',projectURL(location.pathname+'?'+q));
      recordProjectLocation();
      caseRoute = location.search; focusCaseWhenReady = false;
      document.dispatchEvent(new CustomEvent('aiw:case-selection',{detail:{id:selectedCase}}));
      renderCasePanel(project(),'[data-vx-case-select]');
    });
    casePanel.addEventListener('click', e => {
      const button=e.target.closest('[data-vx-case-history]');if(!button)return;
      caseHistory=button.dataset.vxCaseHistory;renderCasePanel(project(),`[data-vx-case-history="${caseHistory}"]`);
    });
  }
  if (host.firstElementChild !== lensSwitch) host.prepend(lensSwitch);
  if (lensSwitch.nextElementSibling !== modelPanel) lensSwitch.after(modelPanel);
  if (modelPanel.nextElementSibling !== casePanel) modelPanel.after(casePanel);
  lensSwitch.querySelectorAll('[data-vx-lens-view]').forEach(button => { const on = button.dataset.vxLensView === activeLens; button.setAttribute('aria-pressed', String(on)); if (on) button.setAttribute('aria-current', 'true'); else button.removeAttribute('aria-current'); const item = button.closest('.chapter-strip-item'); if (item) { if (on) item.setAttribute('data-chapter-strip-current', 'true'); else item.removeAttribute('data-chapter-strip-current'); } });
  lensSwitch.querySelector('.vx-lens-help').textContent = {
    sdd: 'Start here: resolve missing content, review assumptions, then record a fresh check.',
    model: 'Inspect identities, links and relationship types. Chapter model prompts identify questions to investigate.',
    case: 'Review the evidence, reasoning and recorded gates for one architecture case across chapters.'
  }[activeLens];
  host.classList.toggle('vx-model-active', activeLens === 'model');
  host.classList.toggle('vx-case-active', activeLens === 'case');
  host.parentElement?.classList.toggle('vx-case-reading', activeLens === 'case');
  syncDetailsToggle();
  const workspace=host.querySelector('[data-validation-workspace]');if(workspace)workspace.hidden=activeLens!=='sdd';
  modelPanel.hidden = activeLens !== 'model';
  casePanel.hidden = activeLens !== 'case';
  if (activeLens === 'model' && (modelFor !== sig || !modelPanel.dataset.ready)) readModelIntegrity(p, chapter, sig);
  if (activeLens === 'case') {
    if (caseRoute !== location.search) { caseRoute = location.search; focusCaseWhenReady = true; }
    renderCasePanel(p);
  } else { caseRoute = null; focusCaseWhenReady = false; }
}
// The readings as the chapter strip's items. The SDD reading carries the meter of the chapter's records (the same
// reading as the state line); Model integrity its counts once the model has been read; Focused case its cases. The
// nav keeps its class (.vx-switch), its buttons their attribute (data-vx-lens-view) and the help and "Create focused
// case" stand after the items, as before.
function drawReadings(p, chapter, sig, hasCases) {
  let st = null; try { st = chapterRecordsState(p, chapter); } catch { st = null; }
  const cases = (p.finalReview?.architectureCases || []).length;
  const items = [
    {id: 'sdd', title: 'SDD readiness', purpose: 'The chapter’s governed checks', ...stripReading(st, 'nothing recorded yet'), current: activeLens === 'sdd', attrs: 'data-vx-lens-view="sdd" title="Resolve content gaps and record chapter checks"'},
    {id: 'model', title: 'Model integrity', purpose: 'Identities, links and relationship types', counts: modelCounts?.sig === sig ? modelCounts.text : '', current: activeLens === 'model', attrs: 'data-vx-lens-view="model" title="Inspect model identities, links and relationship types"'},
    {id: 'case', title: 'Focused case', purpose: 'One architecture case across chapters', counts: cases ? cases + (cases === 1 ? ' case' : ' cases') : '', current: activeLens === 'case', hidden: !hasCases, attrs: 'data-vx-lens-view="case" title="Review evidence and recorded gates for one architecture case"'}
  ];
  const after = '<details class="vx-reading-help"><summary>About these readings</summary><p id="vx-lens-help" class="vx-lens-help"></p></details><a data-vx-case-create href="' + esc(projectURL('/?chapter=11&tab=work')) + '"' + (hasCases ? ' hidden' : '') + '>Create focused case →</a>';
  const t = document.createElement('template'); t.innerHTML = chapterStripHTML({tab: 'validate', chapter, label: 'Validation lens', items, cls: 'vx-switch', after});
  const nav = t.content.firstElementChild, help = lensSwitch.querySelector('.vx-reading-help');
  for (const name of nav.getAttributeNames()) lensSwitch.setAttribute(name, nav.getAttribute(name));
  lensSwitch.innerHTML = nav.innerHTML;
  if (help?.open) lensSwitch.querySelector('.vx-reading-help').open = true;
}
async function renderCasePanel(p,focusSelector=null){
  if(!p||!casePanel)return;
  const token=++caseToken;
  try{
    if(!caseReader){
      casePanel.innerHTML='<header><h2 id="vx-case-title">Focused case</h2></header><p role="status">Reading the selected case…</p>';
      caseReader=caseDomain=await import('./architecture-case-ui.js');
    }
  }catch(e){if(token===caseToken&&casePanel?.isConnected)casePanel.innerHTML=`<header><h2 id="vx-case-title">Focused case</h2></header><p role="alert">The case could not be read: ${esc(e.message||'Unknown error')}.</p>`;return;}
  if(token!==caseToken||activeLens!=='case'||lensProject!==p.id||!casePanel.isConnected)return;
  const cases=caseDomain.architectureCases(p);
  const fromRoute=new URLSearchParams(location.search).get('case');
  if(cases.some(x=>x.id===fromRoute))selectedCase=fromRoute;
  if(!cases.some(x=>x.id===selectedCase)){
    let remembered='';try{remembered=JSON.parse(localStorage.getItem(projectPreferenceKey('aiw-architecture-case'))||'{}').id||''}catch{/* Optional preference. */}
    selectedCase=cases.find(x=>x.id===remembered)?.id||cases.at(-1)?.id||null;
  }
  casePanel.innerHTML=caseReader.renderFocusedCaseValidation(p,selectedCase,{history:caseHistory});
  if(focusSelector)casePanel.querySelector(focusSelector)?.focus({preventScroll:true});
  else if(focusCaseWhenReady){
    // The shell focuses its chapter heading after mounting Validate. Focus the case once that
    // navigation has settled; a subsequent redraw or lens change must not steal the keyboard.
    const title=casePanel.querySelector('#vx-case-title'),route=caseRoute;
    requestAnimationFrame(()=>{
      if(activeLens!=='case'||caseRoute!==route||!title?.isConnected)return;
      title.tabIndex=-1;title.focus({preventScroll:true});title.scrollIntoView({block:'nearest'});
      focusCaseWhenReady=false;
    });
  }
}
async function readModelIntegrity(p, chapter, sig) {
  const token = ++modelToken;
  modelFor = sig; modelPanel.dataset.ready = 'loading';
  modelPanel.innerHTML = `<header><small>Connected architecture · Chapter ${esc(chapter)}</small><h2 id="vx-model-title">Model integrity</h2></header><p role="status">Reading the current model…</p>`;
  try {
    const {validationModel} = await import('./validation-models.js');
    const result = validationModel(p, chapter), {model} = result, lens = shellLens();
    if (token !== modelToken || !modelPanel?.isConnected || activeLens !== 'model' || sig !== readingSignature(p, chapter)) return;
    const inScope = id => !lens || lens.shows.has(id);
    const typed = result.typed.filter(f => inScope(f.objectId)), prompts = result.prompts.filter(x => !x.id || inScope(x.id));
    const issues = model.issues || [], members = [...model.objects.values()].filter(o => o.chapter === chapter && inScope(o.id)), local = new Set(members.map(o => o.id));
    const links = model.relationships.filter(r => local.has(r.from) || local.has(r.to)).length;
    const sourceLink = issue => { const obj = model.objects.get(issue.id) || model.objects.get(issue.from) || model.objects.get(issue.to); return obj ? `<a href="${esc(projectURL('/?chapter=' + obj.chapter + '&tab=model&object=' + encodeURIComponent(obj.id)))}">Inspect ${esc(obj.ref || obj.id)} in Model</a>` : ''; };
    const isLocal=issue=>[issue.id,issue.from,issue.to].some(id=>local.has(id));
    const localIssues=issues.filter(isLocal),otherIssues=issues.filter(issue=>!isLocal(issue));
    modelIssueRows=[...localIssues,...otherIssues].map(issue => `<li><b>${esc(issue.kind === 'identity' ? 'Duplicate identity' : 'Unresolved relationship')}${isLocal(issue)?' · this chapter':' · elsewhere in project'}</b><span>${esc(issue.detail)} ${esc(issue.id || '')}</span>${sourceLink(issue)}</li>`);
    modelIssueShown=Math.min(12,modelIssueRows.length);
    const issueRows=modelIssueRows.slice(0,modelIssueShown).join('');
    const typedRows = typed.slice(0, 12).map(f => `<li><b>${esc(f.title)}</b><span>${esc(f.detail)}</span><a href="${esc(projectURL(reviewSourceUrl(chapter, f.objectId, 'work')))}">Open source in Work</a></li>`).join('');
    const promptRows = prompts.slice(0, 12).map(x => `<li><span>${esc(x.text)}</span><a href="${esc(projectURL('/?chapter=' + chapter + '&tab=model' + (x.id ? '&object=' + encodeURIComponent(x.id) : '')))}">Inspect in Model</a></li>`).join('');
    modelPanel.dataset.ready = '1';
    modelCounts = {sig, text: modelIntegrityCounts(issues.length, typed.length, prompts.length)};
    setStripCount(lensSwitch, 'model', modelCounts.text);
    modelPanel.innerHTML = `<header><small>Connected architecture · Chapter ${esc(chapter)}</small><h2 id="vx-model-title">Model integrity</h2><p>${members.length.toLocaleString('en-GB')} chapter objects · ${links.toLocaleString('en-GB')} connected relationships · ${model.objects.size.toLocaleString('en-GB')} objects across the project</p></header>
      <div class="vx-model-summaries"><section><b>${issues.length.toLocaleString('en-GB')}</b><span>projection issues across the project</span></section><section><b>${typed.length.toLocaleString('en-GB')}</b><span>invalid recorded relationship types in Chapter ${esc(chapter)}</span></section><section><b>${prompts.length.toLocaleString('en-GB')}</b><span>chapter model prompts to investigate</span></section></div>
      ${lens ? `<p class="vx-model-scope"><b>Module scope: ${esc(lens.title)}.</b> Chapter objects, relationship types and record prompts follow this scope. Structural findings elsewhere remain visible for project context.</p>` : ''}<p class="vx-model-limit">These checks read duplicate identities, missing relationship endpoints, and invalid recorded relationship types. Prompts are observations from the chapter model. A clear result does not verify architectural decisions, SDD readiness, or visual diagram layout.</p>
      <section class="vx-model-group"><h3>Structural findings</h3><p>${localIssues.length.toLocaleString('en-GB')} touch this chapter · ${otherIssues.length.toLocaleString('en-GB')} elsewhere in the project. Chapter findings are listed first.</p>${issueRows ? `<ul data-vx-model-issues>${issueRows}</ul>` : '<p>No duplicate identities or unresolved relationship endpoints were found in the connected model.</p>'}${issues.length > modelIssueShown ? `<button type="button" class="btn vx-model-more" data-vx-model-more>Show next ${Math.min(25,issues.length-modelIssueShown)} of ${(issues.length-modelIssueShown).toLocaleString('en-GB')} structural findings</button>` : ''}${typedRows ? `<h4>Relationship types · Chapter ${esc(chapter)}</h4><ul>${typedRows}</ul>` : '<p>No invalid recorded relationship types were found in this chapter.</p>'}${typed.length > 12 ? `<p>${(typed.length - 12).toLocaleString('en-GB')} more relationship findings are listed in SDD readiness.</p>` : ''}</section>
      <section class="vx-model-group"><h3>What the chapter model shows</h3>${promptRows ? `<ul>${promptRows}</ul>${prompts.length > 12 ? `<p>${(prompts.length - 12).toLocaleString('en-GB')} more prompts are available on the Model tab.</p>` : ''}` : '<p>No additional model prompts for this chapter. This does not establish that the design is complete.</p>'}</section>
      <div class="vx-model-actions"><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=model'))}">Open Chapter ${esc(chapter)} Model</a><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=model&model=whole'))}">See the whole design</a></div>`;
  } catch (e) {
    if (token !== modelToken || !modelPanel?.isConnected) return;
    modelFor = null;
    modelPanel.innerHTML = `<header><h2 id="vx-model-title">Model integrity</h2></header><p role="alert">The current model could not be read: ${esc(e.message || 'Unknown error')}.</p>`;
  }
}

// ---------------------------------------------------------------- the Output tab's downloads (round 6, Contract F)
// Chapter 3's Output offers its decisions as MADR files: one Markdown Any Decision Record per decision, in a zip written
// here from the saved records (madr.js, model-exchange.js zipFiles). The shell mounts this on the Output tab the way it
// mounts the checks on Validate; another chapter's Output takes nothing from here.
// Every chapter's Output leads with its documents (round 26, D-26-13: output-documents.js documentListHTML, the list
// the registry gives, with Preview in a dialog, the downloads through the one mechanic and the MADR zip built here).
// Chapters 1–10 mount it ahead of the studio's output; Chapter 11 draws the same list under its cover, board and export
// form (review-ui.js), so the frame mounts nothing there. The chapter's full passage table follows in a disclosure.
let stageBox = null;
export {MADR_DOWNLOAD_TEXT};
export function mountOutput() {
  const host=hostOf();if(!host||!project())return;
  installOutputActions();mountOutputWorkspace(host);
}
export function leaveOutput() { stageBox?.remove(); }
// The zip of the records as they stand now; the files sit at the zip's root (the zip is the decisions folder).
export async function madrZip(p) {
  const ex = madrExport(p);
  return {blob: zipFiles(ex.files.map(f => ({name: f.path.split('/').pop(), text: f.text}))), count: ex.count, files: ex.files.map(f => f.path)};
}
// The list's actions, once per page, for the list wherever it is drawn (the frame's box, Chapter 11's card, the preview
// dialog): Preview opens the HTML view in a dialog with "Open in a new tab" and the row's downloads; a download goes
// through the one mechanic and the list's status line says what was saved; the MADR zip is built from the saved records.
// A modified click (a new tab, save as) keeps the browser's own link behaviour.
let outputActions = null;
function installOutputActions() {
  if (outputActions) return;
  outputActions = new AbortController();
  document.addEventListener('click', onOutputClick, {signal: outputActions.signal});
}
const bytesWord = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' bytes';
async function onOutputClick(e) {
  const b = e.target.closest('[data-vx-madr], [data-out-preview], a[data-out-download], [data-out-more]');
  if (!b || b.disabled || b.getAttribute('aria-busy') === 'true') return;
  const box = b.closest('.out-stage, .out-dialog, .output-passages, .out-records'); if (!box) return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button && e.button !== 0)) return;
  e.preventDefault();
  if (b.dataset.outPreview != null) { openPreview(b, box); return; }
  if (b.dataset.outMore != null) { showMoreRecords(b, box); return; }
  const status = box.querySelector('.out-status'), chapter = Number(box.dataset.chapter) || chapterOf(null);
  const say = text => { if (status) { status.hidden = !text; status.textContent = text || ''; } };
  b.setAttribute('aria-busy', 'true');
  try {
    if (b.dataset.vxMadr) {
      say('Writing the decision records…');
      const z = await madrZip(project()), url = URL.createObjectURL(z.blob), a = document.createElement('a'), name = projectFileName('AIW_Bank_Payment_Decision_Records_MADR.zip');
      a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      say('Downloaded ' + name + ' · ' + plural(z.count, 'decision record') + ' · ' + bytesWord(z.blob.size) + '.');
    } else {
      say('Preparing ' + (b.dataset.outDownload || 'the file') + '…');
      const r = await downloadOutput(b.getAttribute('href'), {chapter, fallback: (b.dataset.outDownload || 'AIW_Project').replace(/[^\w.-]+/g, '_')});
      say('Downloaded ' + r.filename + ' · ' + bytesWord(r.bytes) + '.');
    }
  } catch (err) { say(err?.message || 'The file could not be prepared. Your saved project is unchanged.'); console.warn('The document could not be downloaded.', err?.message); }
  finally { b.removeAttribute('aria-busy'); }
}
// "Show 50 more" on the chapter's records (D-26-13): the next page of rows is appended, the pager moved on or removed.
function showMoreRecords(b, box) {
  const p = project(), chapter = Number(box.dataset.chapter) || chapterOf(null), from = Number(b.dataset.outMore) || 0, list = box.querySelector('.out-record-list');
  if (!p || !list) return;
  const total = outputRecords(p, chapter).length, to = Math.min(total, from + RECORD_PAGE);
  list.insertAdjacentHTML('beforeend', recordRowsHTML(p, chapter, from, to, {documents:box.dataset.outDocuments!=='false'}));
  const pager = b.closest('.out-more'), next = recordPagerHTML(chapter, to, total);
  if (next) pager.outerHTML = next; else pager.remove();
  list.querySelectorAll('.out-record')[from]?.querySelector('a')?.focus();
}
// The preview dialog: the document's HTML view in a frame, "Open in a new tab", the row's downloads, one status line.
function openPreview(b, box) {
  const title = b.dataset.outTitle || 'Preview', url = b.dataset.outPreview, row = b.closest('.out-doc, .out-record');
  const downloads = [...(row?.querySelectorAll('a[data-out-download]') || [])].map(a => `<a class="btn" href="${esc(a.getAttribute('href'))}" download data-out-download="${esc(a.dataset.outDownload || '')}">${esc(a.textContent)}</a>`).join('');
  const chapter = box.dataset.chapter || String(chapterOf(null));
  const dialog = openDialog({className: 'dialog l-dialog out-dialog', labelledBy: 'out-dialog-title', opener: b, closeSelector: '[data-dialog-close]', initialFocus: '[data-dialog-close]',
    html: `<header><div><span class="eyebrow">Preview · Chapter ${esc(chapter)} · working snapshot</span><h2 id="out-dialog-title">${esc(title)}</h2></div><div class="out-dialog-acts">${downloads}<a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Open in a new tab</a><button type="button" class="btn" data-dialog-close aria-label="Close dialog">Close</button></div></header><iframe class="out-preview" src="${esc(url)}" title="${esc(title)} · preview" loading="eager"></iframe><p class="out-status" role="status" aria-live="polite" hidden></p><p class="out-dialog-note">Drawn by rule from the saved records as they stand now; nothing here approves anything.</p>`});
  dialog.dataset.chapter = chapter;
  // A preview asked to open at a heading (the review registers annex at this chapter) scrolls its frame there once loaded.
  const find = b.dataset.outFind, frame = dialog.querySelector('iframe.out-preview');
  if (find && frame) frame.addEventListener('load', () => { try { const h = [...frame.contentDocument.querySelectorAll('h1, h2')].find(x => x.textContent.trim().startsWith(find)); h?.scrollIntoView({block: 'start'}); } catch { /* not readable: the document opens at its top */ } });
}

// ---------------------------------------------------------------- the status header

// One actionable reading of the existing checks, with the rule's own explanation.
// This never changes a finding, marks a review complete or drafts an approval.
export function validationNextStep(C, chapter) {
  if (!C || C.next?.kind === 'draft') return null;
  if (!C.toFix && !C.toConfirm && !C.run?.current) return {kind: 'run', text: 'Record current checks', reason: 'No open item is shown here. Record the checks against the current chapter before reviewing its handoff.'};
  if (C.scope && !C.toFix && !C.toConfirm) return {kind: 'output', text: 'Review this chapter’s output', url: projectURL('/?chapter=' + chapter + '&tab=output'), reason: 'This module has no open chapter findings. Output includes the whole chapter; other modules and final review remain separate.'};
  const n = C.next;
  if (!n) return null;
  const items = (C.passages || []).flatMap(p => [...(p.fix || []), ...(p.confirm || [])]);
  const finding = items.find(f => n.text === f.title || n.text.startsWith(f.title + ' · '));
  return {...n, text: n.kind === 'done' ? 'Review this chapter’s output' : n.text, reason: finding?.detail || ({fix: 'Open the source record, resolve this content gap, then run the checks again.', confirm: 'Review the evidence and assumptions behind this item, then record your assessment.', milestone: 'Continue the chapter’s next uncompleted milestone. Open findings stay visible.', done: 'The recorded rules show no open item. Review the output and its handoff before continuing.'}[n.kind] || 'Review the source and the recorded evidence for this next step.')};
}
// "to fix" and "to confirm" open the studio's own category of findings.
function showCategory(kind, {scroll = true} = {}) {
  const host = hostOf(); if (!host) return;
  const reviewFilter=host.querySelector('select[name="rvFilter"]');
  if(reviewFilter){
    // Chapter 11 uses a select instead of the chapter filter buttons. Its headline totals
    // cover final checks as well as source findings; the filter names the source subset.
    const value=kind==='fix'?'gaps':'review';
    if(reviewFilter.value!==value){reviewFilter.value=value;reviewFilter.dispatchEvent(new Event('change',{bubbles:true}));}
    if(scroll)setTimeout(()=>(hostOf()?.querySelector('.rv-review-gaps')||hostOf()?.querySelector('.rv-filter-row'))?.scrollIntoView({block:'start'}),60);
    return;
  }
  const filters = [...host.querySelectorAll('nav.findings-filter button[data-filter]')];
  const target = filters.find(b => b.dataset.filter === (kind === 'fix' ? 'gaps' : 'review'));
  if (target && target.getAttribute('aria-pressed') !== 'true') target.click();
  if (scroll) setTimeout(() => (document.querySelector('.vx-index') || document.querySelector('.vx-group'))?.scrollIntoView({block: 'start'}), 60);
}

// Normalize the studios' existing controls without replacing their command handlers.
let nextBox=null;

// ---------------------------------------------------------------- the findings by cause (round 12, G, GR-UX-03)
// Chapters 2 to 10 read their findings by cause across the whole chapter, as Chapter 1 does (requirements-scale.js):
// one row per rule that raised them (readiness-model.js openCauses, the reader the SDD's counts use), what it says, how
// many it raised, the records it reaches (five and a count) and "Show the N", which narrows the chapter's findings below
// to that cause (studio-kit.js setFindingCause) and opens their category; pressed again, or "All causes", it shows them
// all again. The first CAUSES_SHOWN causes, then the rest on request; a row names three records and a count, and its
// detail stands in its title, so the checks stay a page. Chapter 11's source findings read by cause on its
// own surface (review-ui.js).
const CAUSES_SHOWN = 6;
let causesBox = null, causesFor = null, causesAll = false, causeChapter = null, causeFocus = null;
const causeCode = c => c.rule.replace(/^C\d+:/, '');
function placeCauses(host, p, chapter, sig) {
  if (chapter < 1 || chapter > 11) return;
  if (causeChapter !== chapter) { causeChapter = chapter; causesAll = false; if (findingCauseOf()) setFindingCause(null); }
  let causes = []; try { causes = scopedCauses(p, chapter, shellLens()); } catch (e) { console.warn('The findings could not be read by cause.', e?.message); }
  if (!causesBox) { causesBox = document.createElement('details'); causesBox.open = true; causesBox.className = 'vx-causes'; causesBox.setAttribute('aria-labelledby', 'vx-causes-title'); causesBox.addEventListener('click', onCauseClick); }
  if (head.nextElementSibling !== causesBox) head.after(causesBox);
  const on = findingCauseOf(), key = sig + ':' + causesAll + ':' + (on ? on.code + '|' + on.level : '');
  if (causesFor !== key) { causesFor = key; causesBox.innerHTML = causesHTML(causes, chapter, on); }
  for (const slot of host.querySelectorAll('template[data-cause-actions]')) {
    const target = [...causesBox.querySelectorAll('[data-cause-slot]')].find(x => x.dataset.causeSlot === slot.dataset.causeActions);
    if (target && !target.childNodes.length) target.append(slot.content.cloneNode(true));
  }
  if (causeFocus) { const k = causeFocus; causeFocus = null; (causesBox.querySelector(`[data-vx-cause="${CSS.escape(k)}"]`) || causesBox.querySelector('[data-vx-cause]'))?.focus({preventScroll: true}); }
}
function causesHTML(causes, chapter, on) {
  const head = `<summary id="vx-causes-title" class="vx-causes-title">Findings by cause${causes.length ? ' · ' + causes.length : ''}</summary>`;
  if (!causes.length) return head + `<p class="vx-causes-sum">Nothing is open in Chapter ${chapter}'s part of the SDD.</p>`;
  const sorted = causes.slice().sort((a, b) => (a.level === 'fix' ? 0 : 1) - (b.level === 'fix' ? 0 : 1) || b.count - a.count || a.rule.localeCompare(b.rule));
  const shown = causesAll ? sorted : sorted.slice(0, CAUSES_SHOWN), toFix = causes.filter(c => c.level === 'fix').reduce((n, c) => n + c.count, 0), toConfirm = causes.filter(c => c.level === 'confirm').reduce((n, c) => n + c.count, 0);
  const active = on && sorted.find(c => causeCode(c) === on.code && (c.level === 'fix') === (on.level === 'error'));
  const row = c => { const lvl = c.level === 'fix' ? 'error' : 'warning', code = causeCode(c), isOn = active === c, filterable = /^C\d+:/.test(c.rule);
    return `<tr class="${c.level}${isOn ? ' on' : ''}"><td class="vx-st"><span class="vx-word ${c.level}"><i aria-hidden="true">${GLYPH[c.level]}</i> ${WORD[c.level]}</span></td>`
      + `<th scope="row" class="vx-what"><b>${esc(c.label || c.title)}</b><details class="vx-cause-rule"><summary aria-label="Rule: ${esc(c.label || c.title)}">?</summary><p>${esc(c.sentence || c.detail || 'Review each affected record against this check.')}</p></details></th>`
      + `<td class="num">${esc(counted(c.count, c.level === 'fix' ? 'fix' : 'confirm'))}</td><td class="vx-recs">${c.refs.length ? c.refs.slice(0,6).map(ref => `<span class="vx-record-chip">${esc(ref)}</span>`).join(' ') + (c.refs.length > 6 ? `<small>+${c.refs.length - 6} more</small>` : '') : 'The chapter as a whole'}</td>`
      + `<td class="vx-acts">${filterable || chapter === 1 || chapter === 11 ? `<button type="button" class="btn" data-vx-cause="${esc(code + '|' + lvl)}" aria-pressed="${isOn}" title="${isOn ? 'Show the findings of every cause again' : 'Show only the findings of this cause, below'}">${isOn ? 'Showing them' : 'Show the ' + esc(c.count.toLocaleString('en-GB'))}</button>` : ''}<span data-cause-slot="${esc(code)}"></span></td></tr>`; };
  return head + `<p class="vx-causes-sum">${esc(counted(toFix, 'fix'))} and ${esc(counted(toConfirm, 'confirm'))} from ${causes.length.toLocaleString('en-GB')} ${causes.length === 1 ? 'cause' : 'causes'}, across the whole chapter.${active ? ` Below: the ${esc(counted(active.count, active.level === 'fix' ? 'fix' : 'confirm'))} of “${esc(shortText(active.label || active.title, 80))}”. <button type="button" class="text-button" data-vx-cause="">All causes</button>` : ''}</p>`
    + `<div class="vx-tscroll"><table class="vx-ct"><thead><tr><th scope="col">Status</th><th scope="col">Cause</th><th scope="col">How many</th><th scope="col">Records</th><th scope="col">Show</th></tr></thead><tbody>${shown.map(row).join('')}</tbody></table></div>`
    + (sorted.length > CAUSES_SHOWN ? `<p class="vx-causes-more"><button type="button" class="btn" data-vx-causes="all" aria-expanded="${causesAll}">${causesAll ? `Show the first ${CAUSES_SHOWN} causes` : `Show all ${sorted.length.toLocaleString('en-GB')} causes`}</button></p>` : '');
}
function onCauseClick(e) {
  const all = e.target.closest('[data-vx-causes]');
  if (all) { e.preventDefault(); causesAll = !causesAll; causesFor = null; causeFocus = null; const host = hostOf(), p = project(); if (host && p) placeCauses(host, p, chapterOf(null), p.id + ':' + chapterOf(null) + ':' + revision()); causesBox.querySelector('[data-vx-causes]')?.focus(); return; }
  const b = e.target.closest('[data-vx-cause]'); if (!b) return;
  e.preventDefault();
  const [code, level] = String(b.dataset.vxCause || '').split('|'), on = findingCauseOf(), same = on && code && on.code === code && on.level === level;
  if (chapterOf(null) === 1) {
    const native = document.createElement('button');
    if (!code || same) native.dataset.rAction = 'back-causes'; else native.dataset.rCauseFindings = code;
    native.hidden = true; b.after(native); native.click(); native.remove();
  }
  if (!code || same) { setFindingCause(null); causeFocus = same ? b.dataset.vxCause : null; }
  else { setFindingCause({code, level}); causeFocus = b.dataset.vxCause; showCategory(level === 'error' ? 'fix' : 'confirm', {scroll: false}); }
  causesFor = null;
  document.dispatchEvent(new CustomEvent('aiw:redraw'));
}

// ---------------------------------------------------------------- the findings, as tables (round 5, Contract G)

const GLYPH = {fix: '✕', confirm: '○', pass: '✓'}, WORD = {fix: 'To fix', confirm: 'To confirm', pass: 'Treated'};
// Sol's launch: the Brain's own button, or the chapter bar's Sol button before the Brain has tagged it.
const solLaunch = () => document.querySelector('[data-brain-launch="design"]') || [...document.querySelectorAll('.r-assistant-bar button, .l-assistance button')].find(b => [...b.attributes].some(a => a.name.startsWith('data-') && a.value === 'sol'));
function askSolAbout(objectId, question) {
  if (objectId && objectId !== 'project' && typeof window.aiwShellSelect === 'function') { try { window.aiwShellSelect(objectId); } catch { /* the panel still opens */ } }
  const launch = solLaunch(); if (!launch) return;
  launch.click();
  let tries = 0;
  const fill = () => {
    const box = document.querySelector('#brain-panel:not([hidden]) [data-intel-prompt]');
    if (!box) { if (++tries < 30) setTimeout(fill, 100); return; }
    box.closest('details')?.setAttribute('open', '');
    box.value = question; box.dispatchEvent(new Event('input', {bubbles: true})); box.focus();
  };
  setTimeout(fill, 50);
}

// ---------------------------------------------------------------- this chapter in the SDD

function placeSDD(host, p, chapter, sig) {
  // "Show more" redraws the passages in place (shell-ux.js); the new page is compacted like the first.
  if (!sdd) { sdd = document.createElement('details'); sdd.className = 'vx-sdd'; sdd.id = 'vx-sdd'; sdd.setAttribute('aria-label', 'This chapter in the SDD'); sdd.addEventListener('aiw:sdd-part', () => compactSDD(sdd)); }
  const strip = host.querySelector(':scope > .next-strip');
  if (strip) { if (strip.previousElementSibling !== sdd) strip.before(sdd); }
  else if (host.lastElementChild !== sdd) host.append(sdd);
  if (sddFor === sig && sdd.innerHTML) return;
  sddFor = sig;
  sdd.innerHTML = '<summary>This chapter in the SDD</summary>' + sddContributionHTML(p, chapter, {where: 'validate'});
  compactSDD(sdd);
}
// On Validate the passages read as a compact table (round 5, Contract G): each passage, its status as the glyph and the
// word, the first thing it is missing or has to confirm with how many more (the findings above say each in full), and
// the Work record that fills it. Output keeps the full table. Presentation only.
function compactSDD(box) {
  const note = box.querySelector('.sdd-note'); if (note) note.textContent = "Read from the chapter's rule-based checks; it approves nothing.";
  for (const ul of box.querySelectorAll('.sdd-miss')) {
    const items = [...ul.querySelectorAll(':scope > li:not(.more)')], more = ul.querySelector(':scope > li.more');
    const extra = Number(more?.textContent.match(/\d+/)?.[0] || 0) + Math.max(0, items.length - 1);
    items.slice(1).forEach(li => li.remove());
    items[0]?.querySelector('small')?.remove();
    if (!extra) { more?.remove(); continue; }
    const li = more || ul.appendChild(document.createElement('li'));
    // The domain lens's items stand in the lens above, not among the findings (round 12).
    li.className = 'more'; li.textContent = '+' + extra + ' more in the ' + (ul.closest('[data-sdd-passage="lens"]') ? 'lens' : 'findings') + ' above';
  }
}

// ---------------------------------------------------------------- what the chapter's own models show

function placeObservations(host, p, chapter, sig) {
  if (!obs) { obs = document.createElement('details'); obs.className = 'vx-obs'; obs.hidden = true; obs.setAttribute('aria-label', 'What the chapter models show'); }
  if (sdd?.isConnected) { if (sdd.previousElementSibling !== obs) sdd.before(obs); }
  else if (!obs.isConnected) host.append(obs);
  if (obsFor === sig) return;
  obsFor = sig; obs.hidden = true; obs.innerHTML = '';
  observe(p, chapter, sig);
}
const PROMPT_PAGE = 50;
async function observe(p, chapter, sig) {
  const box = obs;
  if (!box) return;
  let list = observed.get(sig);
  if (!list) {
    try { const {chapterModelPrompts} = await import('./validation-models.js'); list = chapterModelPrompts(p, chapter); } catch (e) { console.warn('The chapter model could not be read.', e?.message); list = []; }
    observed.clear(); observed.set(sig, list);
  }
  if (!obs?.isConnected || obsFor !== sig || !list.length) return;
  const link = x => projectURL('/?chapter=' + chapter + '&tab=model' + (x.id ? '&object=' + encodeURIComponent(x.id) : ''));
  const item = x => `<li class="${esc(x.kind)}"><a href="${esc(link(x))}">${esc(x.text)}</a></li>`;
  box.innerHTML = `<summary>Model observations · ${list.length}</summary><div class="vx-obs-in"><small>The Chapter ${esc(chapter)} models also show · ${Math.min(8,list.length)} of ${list.length}</small><ul>${list.slice(0, 8).map(item).join('')}</ul>${list.length > 8 ? `<details class="vx-prompts-more"><summary>Show all ${list.length} prompts</summary><ul data-vx-prompts-rest></ul></details>` : ''}<p>Prompts from the chapter's own models, for review: not checks, and nothing is counted from them.</p></div><div class="vx-obs-acts"><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=model'))}">${chapter === 11 ? 'Open the review desk' : 'Open the Chapter ' + esc(chapter) + ' models'}</a><a class="btn" href="${esc(projectURL('/?chapter=' + chapter + '&tab=model&model=whole'))}">See the whole design</a></div>`;
  // rc41 close: the rest are drawn when the fold opens, a page at a time (a closed fold draws no rows; 157 prompts on a
  // chapter at size were all drawn inside it), as the rest of Validate pages its lists.
  const more = box.querySelector('.vx-prompts-more'), rest = list.slice(8);
  if (more) {
    const draw = () => {
      const ul = more.querySelector('[data-vx-prompts-rest]'), from = ul.children.length, next = rest.slice(from, from + PROMPT_PAGE);
      ul.insertAdjacentHTML('beforeend', next.map(item).join(''));
      more.querySelector('[data-vx-prompts-page]')?.remove();
      const left = rest.length - ul.children.length;
      if (left > 0) ul.insertAdjacentHTML('afterend', `<button type="button" class="btn vx-prompts-page" data-vx-prompts-page>Show ${Math.min(PROMPT_PAGE, left)} more · ${(8 + ul.children.length).toLocaleString('en-GB')} of ${list.length.toLocaleString('en-GB')}</button>`);
    };
    more.addEventListener('toggle', () => { if (more.open && !more.querySelector('[data-vx-prompts-rest]').children.length) draw(); });
    more.addEventListener('click', e => { const b = e.target.closest('[data-vx-prompts-page]'); if (!b) return; e.preventDefault(); const at = more.querySelector('[data-vx-prompts-rest]').children.length; draw(); more.querySelector('[data-vx-prompts-rest]').children[at]?.querySelector('a')?.focus(); });
  }
  box.hidden = false;
}

// ---------------------------------------------------------------- the domain lens (round 12, workstream C)
// Chapter 11 carries the project's domain lens (domain-lens.js): the concerns a solution in its domain must address
// and whether the design does, each with the records that address it and the questions to ask next. Without a lens it
// says what a lens is and, when the brief and the requirements use a lens's words, suggests it. Choosing a lens,
// marking a concern not applicable (or applicable again) and stopping are the person's governed commands (lens.*),
// each with a reason; nothing here is chosen or written for them. It stands above the chapter's passages in the SDD.
let lensBox = null, lensFor = null;
const LENS_LOOK = {addressed: ['pass', '✓', 'Addressed'], partly: ['confirm', '◐', 'Partly'], 'not-addressed': ['confirm', '○', 'Not addressed'], 'not-applicable': ['na', '◌', 'Not applicable']};
const lensAdjective = lens => lens.title.toLowerCase().replace(/\s+/g, '-');
function placeLens(host, p, chapter, sig) {
  if (chapter !== 11) { lensBox?.remove(); lensFor = null; return; }
  if (!lensBox) { lensBox = document.createElement('details'); lensBox.className = 'sdd-part vx-lens'; lensBox.id = 'domain-lens'; lensBox.setAttribute('aria-labelledby', 'vx-lens-title'); lensBox.addEventListener('click', onLensClick); }
  // Before the models' prompts, which stand just before the passages: each box keeps its place when the page mounts again.
  if (obs?.isConnected) { if (obs.previousElementSibling !== lensBox) obs.before(lensBox); }
  else if (!lensBox.isConnected) host.append(lensBox);
  if (lensFor === sig && lensBox.innerHTML) return;
  lensFor = sig;
  let R = null; try { R = lensReport(p); } catch (e) { console.warn('The domain lens could not be read.', e?.message); }
  lensBox.innerHTML = '<summary>Domain coverage and review questions</summary>'+lensHTML(R);
}
const lensRefs = (xs, n = 6) => xs.length ? xs.slice(0, n).map(r => `<a href="${esc(projectURL(reviewSourceUrl(r.chapter, r.id, 'work')))}" title="${esc(r.title)}">${esc(r.ref)}</a>`).join(', ') + (xs.length > n ? ` <small>and ${xs.length - n} more</small>` : '') : '<span class="sdd-none">None yet</span>';
function lensHTML(R) {
  if (!R) return '<p class="sdd-note">The domain lens could not be read for this project.</p>';
  const head = (title, sum = '') => `<header><div><small>Domain lens</small><h3 id="vx-lens-title">${esc(title)}</h3></div>${sum}</header>`;
  if (!R.chosen) {
    const s = R.suggestion;
    const lead = s ? `This project reads like ${s.noun}: its brief and requirements use words such as ${s.words.map(w => '“' + w + '”').join(', ')}.` : 'A lens lists what a solution in a domain must address, and reads whether the design does.';
    return head('No lens chosen') + `<p class="vx-lens-lead">${esc(lead)}</p><div class="vx-lens-acts">${LENSES.map(l => `<button type="button" class="btn${s?.lensId === l.id ? ' primary' : ''}" data-vx-lens="choose" data-lens="${esc(l.id)}">Use the ${esc(lensAdjective(l))} lens…</button>`).join('')}</div><p class="sdd-note">Choosing a lens is a project setting. It changes no record and blocks nothing.</p>`;
  }
  const n = R.counts, row = c => { const [cls, glyph, word] = LENS_LOOK[c.state];
    return `<tr class="sdd-row ${cls}" data-lens-concern="${esc(c.id)}"><th scope="row"><b>${esc(c.title)}</b><small>${esc(c.why)}</small></th>`
      + `<td><span class="sdd-st ${cls}"><i aria-hidden="true">${glyph}</i> ${word}</span><small>${esc(c.reason)}</small>`
      + `<button type="button" class="btn vx-lens-btn" data-vx-lens="${c.state === 'not-applicable' ? 'applies' : 'na'}" data-concern="${esc(c.id)}" aria-label="${esc((c.state === 'not-applicable' ? 'It applies again: ' : 'Not applicable: ') + c.title)}">${c.state === 'not-applicable' ? 'Applies again…' : 'Not applicable…'}</button></td>`
      + `<td class="vx-lens-recs">${c.state === 'not-applicable' ? '<span class="sdd-none">Not read</span>' : c.records.length ? lensRefs(c.records) : c.open.length ? `<small>Left open in</small> ${lensRefs(c.open)}` : lensRefs([])}</td>`
      + `<td>${c.questions.length ? `<ul class="sdd-miss">${c.questions.slice(0, 2).map(q => `<li class="confirm">${esc(q)}</li>`).join('')}</ul>` : '<span class="sdd-none">Nothing to ask</span>'}</td></tr>`; };
  const sum = `<p class="sdd-sum"><span class="pass"><b>${n.addressed}</b> addressed</span><span class="confirm"><b>${n.partly}</b> partly</span><span class="confirm"><b>${n['not-addressed']}</b> not addressed</span><small>${n['not-applicable'] ? n['not-applicable'] + ' not applicable · ' : ''}of ${n.total} concerns</small></p>`;
  const chosen = R.setting ? `Chosen${R.setting.chosenBy ? ' by ' + R.setting.chosenBy : ''}${R.setting.chosenAt ? ' on ' + String(R.setting.chosenAt).slice(0, 10) : ''}: ${R.setting.reason}` : '';
  return head(R.lens.title, sum) + `<p class="sdd-note">${esc(R.lens.summary)} ${esc(LENS_RULE)}</p>`
    + `<div class="sdd-scroll"><table class="sdd-table vx-lens-table"><thead><tr><th scope="col">Concern</th><th scope="col">State</th><th scope="col">Records that address it</th><th scope="col">Ask next</th></tr></thead><tbody>${R.concerns.map(row).join('')}</tbody></table></div>`
    + `<div class="vx-lens-acts"><small>${esc(chosen)}</small><button type="button" class="btn" data-vx-lens="clear">Stop using this lens…</button></div>`;
}
// The reason a lens command keeps, asked in the shared dialog; the command goes to the project store, and the page is
// drawn again from what the server saved.
function lensDialog({title, lead, label, action}, send) {
  const d = openDialog({className: 'dialog vx-lens-dialog', labelledBy: 'vx-lens-dialog-title', html: `<form class="vx-lens-form"><header><h2 id="vx-lens-dialog-title">${esc(title)}</h2><button type="button" class="btn icon-only" data-dialog-close aria-label="Close dialog">×</button></header><p role="alert" hidden></p><p>${esc(lead)}</p><label><span>${esc(label)}</span><textarea name="reason" rows="3" required maxlength="${LENS_LIMITS.reason}"></textarea></label><div class="vx-lens-dacts"><button type="button" class="btn" data-dialog-close>Cancel</button><button type="submit" class="btn primary">${esc(action)}</button></div></form>`});
  const form = d.querySelector('form');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const reason = form.elements.reason.value.trim(); if (!reason) return;
    setDialogBusy(d, 'saving');
    try { await send(reason); closeDialog(d); document.dispatchEvent(new CustomEvent('aiw:external-project')); }
    catch (err) { setDialogBusy(d, false); showDialogError(d, err?.message || 'The choice could not be saved. Your reason is still here.'); }
  });
  return d;
}
function onLensClick(e) {
  const b = e.target.closest('[data-vx-lens]'); if (!b || b.disabled) return;
  e.preventDefault();
  const store = window.aiwProjectStore; if (!store) return;
  const kind = b.dataset.vxLens, send = command => store.command(command);
  if (kind === 'choose') {
    const lens = lensById(b.dataset.lens); if (!lens) return;
    lensDialog({title: `Use the ${lensAdjective(lens)} lens`, lead: `${lens.summary} Choosing it is a project setting: it changes no record and blocks nothing.`, label: 'Why this lens fits the project', action: 'Use the lens'},
      reason => send({type: 'lens.choose', payload: {lensId: lens.id, reason}}));
    return;
  }
  if (kind === 'clear') {
    lensDialog({title: 'Stop using the lens', lead: 'The lens and its reading leave Chapter 11. The choices made so far stay in the project\'s history.', label: 'Why the lens no longer fits', action: 'Stop using it'},
      reason => send({type: 'lens.clear', payload: {reason}}));
    return;
  }
  const c = lensReport(project()).concerns.find(x => x.id === b.dataset.concern); if (!c) return;
  const applies = kind === 'applies';
  lensDialog(applies
    ? {title: `${c.title} applies again`, lead: 'The lens reads this concern again and asks its questions.', label: 'Why it applies', action: 'It applies'}
    : {title: `${c.title} does not apply`, lead: 'The lens stops reading this concern and asks nothing about it. The choice and its reason are kept.', label: 'Why it does not apply to this project', action: 'Not applicable'},
  reason => send({type: 'lens.concern', payload: {concernId: c.id, applicable: applies, reason}}));
}
