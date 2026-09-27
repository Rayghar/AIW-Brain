import {mountBrainContext} from './brain-context-ui.js';
import {mountArchitectureExplorer,leaveArchitectureExplorer} from './architecture-explorer.js';
import {mountJourneyContext} from './journey-context-ui.js';
import {mountEvidenceWorkspace} from './evidence-ui.js';
import {mountChangeReview} from './changes-ui.js';
import {scopeProjectLinks,recordProjectLocation,projectURL,activeProjectId,projectPreferenceKey} from './project-context.js';
export {cursorPreference,saveCursorPreference} from './cursor-preference.js';
// Shared presentation only. Project records and chapter commands remain the source of truth.
let lastProposal = '';
let lastSimulation = '';
const railEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const chapterPerspectives={
  1:[['actor','Actors','#718c76'],['journey','Journey steps','#ae9562'],['requirement','Requirements','#426c56'],['outcome','Outcomes','#8c7ca0'],['context','Other context','#79909b']],
  2:[['outcome','Outcomes','#8c7ca0'],['requirement','Requirements','#426c56'],['driver','Quality scenarios','#ae9562'],['responsibility','Responsibilities','#718c76']],
  3:[['requirement','Requirements','#426c56'],['driver','Quality drivers','#ae9562'],['alternative','Alternatives','#8c7ca0'],['responsibility','Responsibilities','#718c76']]
};
export function readPerspectives(chapter,fallback){
  try{const value=JSON.parse(localStorage.getItem('aiw-perspectives-'+chapter)||'null');return Array.isArray(value)?[...new Set(value)].filter(id=>chapterPerspectives[chapter].some(l=>l[0]===id)):fallback}catch{return fallback}
}
export function savePerspectives(chapter,visible){try{localStorage.setItem('aiw-perspectives-'+chapter,JSON.stringify(visible))}catch{}}
export function rememberRailFocus(){
  const button=document.activeElement?.closest?.('.journey-explorer button');
  const attribute=button&&[...button.attributes].find(a=>a.name.startsWith('data-'));
  return ()=>{if(!attribute)return;const target=[...document.querySelectorAll('.journey-explorer button')].find(b=>b.getAttribute(attribute.name)===attribute.value);if(target?.getClientRects().length)target.focus({preventScroll:true})};
}
export function explorationRail(items,active,attribute,allAttribute,chapter){
  const title=chapter===3?'Decision impact':chapter<4?'Map perspectives':'Model layers';
  return `<section class="journey-explorer" aria-label="${title}"><header><h2>${title}</h2><button type="button" ${allAttribute} aria-label="${active.length===items.length?'Clear':'Show all'} ${title.toLowerCase()}">${active.length===items.length?'Clear':'Show all'}</button></header><p class="rail-view-hint">${active.length} of ${items.length} visible · ${chapter===3?'One design question':'One connected model'}</p><div class="rail-layer-list">${items.map(item=>{const [id,label,color,mark]=Array.isArray(item)?item:[item.id,item.name,item.color,item.mark];return `<button type="button" class="rail-layer" ${attribute}="${railEscape(id)}" aria-pressed="${active.includes(id)}" style="--layer:${color}">${mark||'<span class="rail-layer-icon" aria-hidden="true"></span>'}<span>${railEscape(label)}</span><span class="rail-layer-check" aria-hidden="true">${active.includes(id)?'✓':''}</span></button>`}).join('')}</div><p class="rail-view-help">${chapter===3?'Follow the inputs through an alternative to the responsibilities it affects.':'Choose a view to explore the same project.'}</p></section>`;
}
function refineRail(){
  const rail=document.querySelector('.sidebar,.r-sidebar');if(!rail)return;
  rail.classList.add('journey-rail');
  if(!rail.querySelector('.rail-close')){
    const menu=document.querySelector('[data-action="layers-menu"],[data-r-action="menu"],[data-q-action="menu"],[data-d-action="menu"]');
    if(menu){const close=menu.cloneNode(false);close.className='rail-close';close.innerHTML='Close navigation <span aria-hidden="true">×</span>';close.setAttribute('aria-label','Close chapter navigation');close.removeAttribute('aria-expanded');rail.prepend(close)}
  }
  const nav=rail.querySelector('.chapter-nav,nav');if(!nav)return;
  if(!nav.closest('.journey-route')){
    const heading=nav.previousElementSibling;
    const route=document.createElement('section');route.className='journey-route';route.setAttribute('aria-label','Architecture journey');
    nav.before(route);
    if(heading&&/Architecture journey/i.test(heading.textContent))route.append(heading);
    nav.classList.add('journey-chapters');nav.setAttribute('aria-label','Architecture chapters');
    route.append(nav);
    for(const item of nav.children){const description=item.querySelector('small');if(description)item.title=description.textContent;}
  }
  const card=rail.querySelector('.project-card,.r-project');
  if(card&&!card.closest('.rail-project')){
    const label=card.previousElementSibling;
    const project=document.createElement('section');project.className='rail-project';project.setAttribute('aria-label','Project');
    card.before(project);if(label?.matches('.eyebrow,.r-kicker'))label.remove();project.append(card);
  }
  // Keep the rail to three purposeful sections; readiness lives beside its indicator.
  rail.querySelectorAll('.sidebar-note,.r-side-note,.sidebar-bottom').forEach(el=>el.remove());
}
function lensPosition(chapter){const fallback=document.body.dataset.workspaceTab==='model'||chapter>=6?'bottom':'side';try{return JSON.parse(localStorage.getItem('aiw-lens-position-v1')||'{}')[chapter]||fallback}catch{return fallback}}
function refineLensPosition(){
  const chapter=Number(new URLSearchParams(location.search).get('chapter')||1),position=lensPosition(chapter);
  const changed=!document.body.classList.contains('explorer-workspace')||document.body.dataset.lensPosition!==position;
  document.body.classList.add('explorer-workspace');document.body.dataset.lensPosition=position;
  if(changed&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('resize'));
  const inspector=document.querySelector('.f-context-dock,#inspector');if(!inspector)return;
  let controls=inspector.querySelector('.lens-options');
  if(!controls){controls=document.createElement('details');controls.className='lens-options';controls.innerHTML='<summary aria-label="Object lens layout" title="Object lens layout"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M12 4v12"/></svg></summary><div role="group" aria-label="Object lens position"><span>Panel position</span><button type="button" data-lens-position="side">Beside workspace</button><button type="button" data-lens-position="bottom">Below workspace</button></div>';const summary=inspector.querySelector(':scope>summary');if(summary)summary.after(controls);else inspector.prepend(controls);}
  controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lensPosition===position)));
}
function showSaveStatus(status){
  const label=document.querySelector('.save-state');
  if(!label)return;
  label.setAttribute('role','status'); label.setAttribute('aria-live','polite');
  label.textContent=status==='saving'?'Saving…':status==='error'?'Changes not saved':'Saved to your private project';
}
if(typeof document!=='undefined')document.addEventListener('aiw:save',event=>showSaveStatus(event.detail.status));
// Update simulation text without replacing the transport buttons under the pointer or focus.
export function patchLiveSurface(root, html) {
  if (!root) return;
  const template = document.createElement('template'); template.innerHTML = html;
  function patch(parent, next) {
    const old = [...parent.childNodes], fresh = [...next.childNodes];
    fresh.forEach((node, i) => {
      const current = old[i];
      if (!current) { parent.append(node.cloneNode(true)); return; }
      if (current.nodeType !== node.nodeType || current.nodeName !== node.nodeName) { current.replaceWith(node.cloneNode(true)); return; }
      if (node.nodeType === Node.TEXT_NODE) { if (current.textContent !== node.textContent) current.textContent = node.textContent; return; }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      for (const a of [...current.attributes]) if (!node.hasAttribute(a.name)) current.removeAttribute(a.name);
      for (const a of [...node.attributes]) if (current.getAttribute(a.name) !== a.value) current.setAttribute(a.name, a.value);
      patch(current, node);
    });
    old.slice(fresh.length).forEach(node => node.remove());
  }
  patch(root, template.content);
}

function organiseLens(inspector) {
  const body = inspector.querySelector('.r-inspector-body, .inspector-body');
  if (!body || body.querySelector('.ux-lens-grid')) return;
  const grid = document.createElement('div'); grid.className = 'ux-lens-grid';
  const context = document.createElement('section'), evidence = document.createElement('section'), guidance = document.createElement('section');
  context.setAttribute('aria-label', 'Object context'); evidence.setAttribute('aria-label', 'Attributes and traceability'); guidance.setAttribute('aria-label', 'Guidance and gaps');
  let target = context;
  for (const node of [...body.children]) {
    if(node.matches('.journey-context,.journey-next-link')){context.append(node);continue;}
    if (node.matches('.r-attention, .suggestion-card, .l-gap-note')) { guidance.append(node); continue; }
    if (node.matches('dl, h3, .attr-label, .l-upstream') || node.matches('.eyebrow') && /Attributes|Relationships/.test(node.textContent)) target = evidence;
    target.append(node);
  }
  grid.append(context);
  if (evidence.childElementCount) grid.append(evidence);
  if (guidance.childElementCount) grid.append(guidance);
  body.append(grid);
}

// Validate holds two ways to validate the same design, behind one switch (public/validate-view.js):
// SDD readiness — the chapter's own checks, read across the journey — and the model views, the
// design anatomy. Both load on first use so other surfaces do not pay for them.
let anatomyModule=null, anatomyLoading=null, validateModule=null, validateLoading=null;
// A link may ask for one view (?validate=readiness|model); the page rewrites its address before
// Validate loads, so the request is kept here and handed over once.
let validateAsked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('validate') : null;
const takeValidate = () => { const v = validateAsked; validateAsked = null; return v; };
const anatomy={
  mount(selection){
    if (anatomyModule) { anatomyModule.mountAnatomy(selection); return; }
    anatomyLoading ??= import('./anatomy-view.js').then(m => { anatomyModule = m; }).catch(e => { anatomyLoading = null; console.warn('The design anatomy could not load.', e?.message); });
    anatomyLoading.then(() => { try { if (document.body?.dataset.workspaceTab === 'validate' && document.body.classList.contains('vx-model')) anatomyModule?.mountAnatomy(selection); } catch (e) { console.warn('The design anatomy could not open.', e?.message); } });
  },
  leave(){ anatomyModule?.leaveAnatomy(); }
};
// Validate's third mode: the review desk (public/desk-view.js), the same desk as Chapter 11's Model.
let deskModule=null, deskLoading=null;
const desk={
  mount(selection){
    if (deskModule) { deskModule.mountDesk(selection); return; }
    deskLoading ??= import('./desk-view.js').then(m => { deskModule = m; }).catch(e => { deskLoading = null; console.warn('The review desk could not load.', e?.message); });
    deskLoading.then(() => { try { if (document.body?.dataset.workspaceTab === 'validate' && document.body.classList.contains('vx-desk')) deskModule?.mountDesk(selection); } catch (e) { console.warn('The review desk could not open.', e?.message); } });
  },
  leave(){ deskModule?.leaveDesk(); }
};
function syncValidate(tab, selection){
  if (typeof window === 'undefined' || window.document !== document) return;
  try {
    if (tab !== 'validate') { validateModule?.leaveValidate(); anatomy.leave(); desk.leave(); return; }
    if (validateModule) { validateModule.mountValidate(selection, {anatomy, desk, asked: takeValidate()}); return; }
    validateLoading ??= import('./validate-view.js').then(m => { validateModule = m; }).catch(e => { validateLoading = null; console.warn('Validate could not load.', e?.message); });
    validateLoading.then(() => { try { if (document.body?.dataset.workspaceTab === 'validate') validateModule?.mountValidate(selection, {anatomy, desk, asked: takeValidate()}); } catch (e) { console.warn('Validate could not open.', e?.message); } });
  } catch (e) { console.warn('Validate could not open.', e?.message); }
}
// Chapter-specific Model views. A chapter with its own architecture models opens on them; the
// connected explorer stays one click away ("Explore all perspectives") and remembers the choice.
// Each view module exports mountChapterModel(selection, {explore}) and leaveChapterModel().
const CHAPTER_MODELS = {1: () => import('./story-view.js'), 2: () => import('./utility-view.js'), 3: () => import('./tradeoff-view.js'), 4: () => import('./responsibility-view.js'), 5: () => import('./realise-view.js'), 6: () => import('./platform-view.js'), 7: () => import('./stack-view.js'), 8: () => import('./exchange-view.js'), 9: () => import('./threat-view.js'), 10: () => import('./deploy-view.js'), 11: () => import('./desk-view.js')};
const chapterModules = new Map(), chapterLoading = new Map();
let lastModelSelection = null;
// While a chapter model's modules load, the stage says so in the model's own frame, never a blank.
function showChapterLoading(chapter) { const host = document.querySelector('.studio > .stage.tab-content'); if (!host || host.querySelector(':scope > .cm-loading')) return; host.insertAdjacentHTML('afterbegin', `<section class="cm cm-loading" aria-busy="true" aria-label="Chapter ${chapter} model, loading"><p>Preparing the Chapter ${chapter} model…</p></section>`); }
function hideChapterLoading() { document.querySelectorAll('.studio > .stage.tab-content > .cm-loading').forEach(el => el.remove()); }
const liveDocument = () => typeof window !== 'undefined' && window.document === document;
const modelModeKey = () => projectPreferenceKey('aiw-chapter-model-mode');
function chapterModelMode(chapter) { try { return JSON.parse(localStorage.getItem(modelModeKey()) || '{}')[chapter] || 'chapter'; } catch { return 'chapter'; } }
function setChapterModelMode(chapter, mode) { try { const v = JSON.parse(localStorage.getItem(modelModeKey()) || '{}'); v[chapter] = mode; localStorage.setItem(modelModeKey(), JSON.stringify(v)); } catch { /* preference only */ } }
function wantsChapterModel(tab, selection) { return tab === 'model' && !!CHAPTER_MODELS[selection?.chapter] && liveDocument() && chapterModelMode(selection.chapter) === 'chapter'; }
function leaveChapterModels(except = null) { hideChapterLoading(); for (const [chapter, m] of chapterModules) if (chapter !== except) { try { m.leaveChapterModel(); } catch { /* already gone */ } } }
function openChapterModel(chapter) {
  setChapterModelMode(chapter, 'chapter'); leaveArchitectureExplorer();
  if (syncChapterModel('model', lastModelSelection || {chapter})) document.body.classList.add('am-active');
}
function exploreAllPerspectives(chapter) {
  setChapterModelMode(chapter, 'explore'); leaveChapterModels(); document.body.classList.remove('cm-active');
  // Chapters 1–3 keep their own maps as the way to explore every perspective.
  if (Number(chapter) <= 3) { document.body.classList.remove('am-active'); return; }
  mountArchitectureExplorer(lastModelSelection || {chapter}, mountBrainContext);
}
if (liveDocument()) document.addEventListener('click', e => { const b = e.target.closest?.('[data-cm-open]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openChapterModel(Number(b.dataset.cmOpen)); }, true);
function syncChapterModel(tab, selection) {
  if (!liveDocument()) return false;
  if (!wantsChapterModel(tab, selection)) { leaveChapterModels(); return false; }
  const chapter = Number(selection.chapter);
  lastModelSelection = selection;
  leaveChapterModels(chapter);
  document.body.classList.add('cm-active');
  const mount = () => { try { if (document.body.dataset.workspaceTab === 'model' && wantsChapterModel('model', lastModelSelection) && Number(lastModelSelection.chapter) === chapter) chapterModules.get(chapter)?.mountChapterModel(lastModelSelection, {explore: exploreAllPerspectives}); } catch (e) { console.warn('The chapter model could not open.', e?.message); } };
  if (chapterModules.has(chapter)) { mount(); return true; }
  showChapterLoading(chapter);
  if (!chapterLoading.has(chapter)) chapterLoading.set(chapter, CHAPTER_MODELS[chapter]().then(m => { chapterModules.set(chapter, m); }).catch(e => { chapterLoading.delete(chapter); hideChapterLoading(); document.body.classList.remove('cm-active'); setChapterModelMode(chapter, 'explore'); console.warn('The chapter model could not load.', e?.message); }));
  chapterLoading.get(chapter).then(() => { hideChapterLoading(); mount(); });
  return true;
}
// A deep link (for example the anatomy's "Open in Chapter N model") names an object in the URL.
// The page may rewrite the URL before a chapter model loads, so the first route is kept here and
// handed once to the chapter model it was meant for.
const initialRoute = liveDocument() ? (() => { const q = new URLSearchParams(location.search); return {chapter: Number(q.get('chapter')), object: q.get('object') || q.get('focus') || q.get('artefact') || q.get('driver') || q.get('decision') || null}; })() : null;
if (liveDocument()) window.aiwChapterModels = {has: chapter => !!CHAPTER_MODELS[chapter], open: openChapterModel, takeLink(chapter) { if (initialRoute?.object && initialRoute.chapter === Number(chapter)) { const id = initialRoute.object; initialRoute.object = null; return id; } return null; }};
export function refineWorkspace(tab, selection) {
  if (tab === 'model') lastModelSelection = selection || lastModelSelection;
  refineWorkspaceSurface(tab, selection);
  syncValidate(tab, selection);
}
function refineWorkspaceSurface(tab, selection) {
  document.body.dataset.workspaceTab = tab;
  if(tab!=='model'){leaveArchitectureExplorer();if(liveDocument())leaveChapterModels();}
  refineRail();refineLensPosition();refineProject();
  if(selection)mountBrainContext(window.aiwCurrentProject||window.aiwProjectStore?.value?.document,selection,tab);
  if(selection)mountJourneyContext(window.aiwCurrentProject||window.aiwProjectStore?.value?.document,selection);
  showSaveStatus(window.aiwProjectStore?.status||'saved');
  const tip = document.querySelector('#cursor-tip'); tip?.setAttribute('role', 'tooltip');
  const assistance = document.querySelector('.r-assistant-bar, .l-assistance');
  if (assistance) {
    for (const button of assistance.querySelectorAll('button')) {
      if (button.querySelector('.ux-assist-role')) continue;
      const label = button.textContent.trim();
      const role = label === 'Sol' ? 'Act' : label === 'Mind Factory' ? 'Explore' : label === 'Cursor' ? 'Explain' : null;
      if (!role) continue;
      const note = document.createElement('small'); note.className = 'ux-assist-role'; note.textContent = role; note.setAttribute('aria-hidden', 'true'); button.append(note);
      button.title = label === 'Sol' ? 'Actions for the current chapter, tab, and selection' : label === 'Mind Factory' ? 'Explore patterns, trade-offs, and editable proposals' : 'Explain an object on hover or keyboard focus. Select it to pin its context.';
    }
  }
  // Chapters 1–3 own different modelling tasks: the requirements map, quality
  // scenario map, and decision-impact map. Preserve their controls and layout.
  if(document.body.classList.contains('requirements-app')) {
    refineFoundation(tab);refineLensPosition();
    // Chapter 1's page has its own map; its chapter models open in its place, as elsewhere.
    if (tab === 'model' && syncChapterModel(tab, selection)) document.body.classList.add('am-active');
    else if (tab === 'model') document.body.classList.remove('cm-active', 'am-active');
    return;
  }
  if (tab !== 'model') { lastProposal = ''; lastSimulation = ''; return; }
  const canvasCard=document.querySelector('.canvas-card');
  if(canvasCard&&!canvasCard.querySelector('.canvas-command-drawer')){
    const tools=[...canvasCard.children].filter(el=>el.matches('.l-model-actions,.exploration-controls,.ux-layer-strip'));
    if(tools.length){
      const drawer=document.createElement('details');drawer.className='f-model-controls canvas-command-drawer';drawer.open=!matchMedia('(max-width:700px)').matches;
      const summary=document.createElement('summary');summary.textContent='Model tools';
      const hint=document.createElement('small');hint.textContent='Create, find and filter';summary.append(hint);
      tools[0].before(drawer);drawer.append(summary,...tools);
    }
  }
  const inspector = document.querySelector('#r-inspector, #q-inspector, #d-inspector, #inspector');
  const viewport = document.querySelector('#r-map-viewport, #q-map-viewport, #d-map-viewport, #canvas');
  if (!inspector || !viewport) return;
  inspector.classList.add('ux-bottom-lens');
  organiseLens(inspector);
  let ribbon = document.querySelector('#ux-selection');
  if (!ribbon) {
    ribbon = document.createElement('div'); ribbon.id = 'ux-selection'; ribbon.className = 'ux-selection';
    ribbon.innerHTML = '<div class="ux-selection-copy" role="status" aria-live="polite" aria-atomic="true"><small>Selected context</small><strong></strong><span></span></div><button type="button" class="r-btn ux-details">Open details ↓</button>';
    ribbon.querySelector('button').addEventListener('click', () => {
      inspector.scrollIntoView({block:'start', behavior:'auto'}); inspector.focus({preventScroll:true});
    });
    viewport.after(ribbon);
  }
  const title = inspector.querySelector('h2')?.textContent || 'Select an object to explore';
  const description = inspector.querySelector('.ux-lens-grid section > p:not(.r-kicker), .t-dock-body p')?.textContent || 'Its attributes, relationships, and next useful action appear in the details panel.';
  const titleEl = ribbon.querySelector('strong'), descEl = ribbon.querySelector('.ux-selection-copy > span');
  if (titleEl.textContent !== title) titleEl.textContent = title;
  if (descEl.textContent !== description) descEl.textContent = description;
  ribbon.querySelector('button').setAttribute('aria-controls', inspector.id);
  const state = inspector.querySelector('.t-dock-head .eyebrow, .ux-lens-grid .eyebrow, .ux-lens-grid .r-kicker')?.textContent || '';
  ribbon.querySelector('small').textContent = /unsaved|ghost/i.test(state) ? 'Unsaved preview' : 'Selected context';
  const proposal = document.querySelector('.l-ghost-banner, .r-ghost-bar');
  const signature = proposal?.textContent || '';
  if (signature && signature !== lastProposal) proposal.scrollIntoView({block:'start', behavior:'auto'});
  lastProposal = signature;
  const simulation = document.querySelector('#flow-panel .i-probe-head, #flow-panel .sec-lab-head, #flow-panel .rt-lab-head');
  const simulationKey = simulation?.textContent || '';
  if (simulationKey && !lastSimulation) document.querySelector('#flow-panel').scrollIntoView({block:'start', behavior:'auto'});
  lastSimulation = simulationKey;
  if (syncChapterModel(tab, selection)) { leaveArchitectureExplorer(); document.body.classList.add('am-active'); return; }
  document.body.classList.remove('cm-active');
  mountArchitectureExplorer(selection,mountBrainContext);
}

// Chapters 1–3 share a bounded task surface. Context is available without extending the page.
const foundationState={surface:'',open:false,panel:'overview',controlsOpen:null,pages:new Map()};
export function openContextPanel(){
  const dock=document.querySelector('.f-context-dock');
  if(!dock)return;
  foundationState.open=true;dock.open=true;
  dock.querySelector('.f-context-tabs button[aria-pressed="true"]')?.focus({preventScroll:true});
}
export function closeContextPanel(){
  foundationState.open=false;
  const dock=document.querySelector('.f-context-dock');
  if(dock){dock.open=false;dock.querySelector('summary')?.focus({preventScroll:true});}
}
function foundationPanels(inspector){
  const body=inspector.querySelector('.r-inspector-body');
  if(!body||body.querySelector('.f-context-panels'))return;
  const sections={};
  for(const [id,label] of [['overview','Overview'],['definition','Definition'],['connections','Connections'],['guidance','Guidance']]){
    const section=document.createElement('section');section.dataset.contextPanel=id;
    section.id='f-context-'+id;section.setAttribute('aria-label',label);sections[id]=section;
  }
  let target='overview';
  for(const node of [...body.children]){
    if(node.matches('.journey-context,.journey-next-link')){sections.connections.append(node);continue;}
    if(node.matches('.r-mobile-return')){node.remove();continue;}
    if(node.matches('.r-attention')){sections.guidance.append(node);continue;}
    if(node.matches('h3')){
      const text=node.textContent;
      target=/relationships|source requirements|affected responsibilities|connected quality|quality implications|upstream/i.test(text)?'connections':/tactic|trade-off/i.test(text)?'guidance':'definition';
    }
    if(node.matches('dl')){sections.definition.append(node);continue;}
    if(node.matches('.r-actions')){sections.overview.append(node);continue;}
    if(node.matches('.q-tradeoff,.q-conflict'))target='guidance';
    sections[target].append(node);
  }
  const nav=document.createElement('nav');nav.className='f-context-tabs';nav.setAttribute('aria-label','Selected object details');
  const panels=document.createElement('div');panels.className='f-context-panels';
  for(const [id,section] of Object.entries(sections)){
    if(!section.childElementCount)continue;
    const button=document.createElement('button');button.type='button';button.dataset.contextTab=id;
    button.textContent=section.getAttribute('aria-label');button.setAttribute('aria-controls',section.id);nav.append(button);panels.append(section);
  }
  body.append(nav,panels);activateContextPanel(foundationState.panel);
}
function activateContextPanel(id){
  const inspector=document.querySelector('.f-context-dock .r-inspector');if(!inspector)return;
  if(!inspector.querySelector('[data-context-tab="'+id+'"]'))id='overview';
  foundationState.panel=id;
  for(const button of inspector.querySelectorAll('[data-context-tab]'))button.setAttribute('aria-pressed',String(button.dataset.contextTab===id));
  for(const panel of inspector.querySelectorAll('[data-context-panel]'))panel.hidden=panel.dataset.contextPanel!==id;
}
function foundationPagination(){
  const surface=document.querySelector('.r-surface');if(!surface)return;
  const selectors=['.r-records','#q-driver-list','.r-findings','.f-findings','.r-output-list','.d-output-list','.q-source-list','.q-priority-list','.f-tradeoffs'];
  for(const selector of selectors){
    const root=surface.querySelector(selector);if(!root)continue;
    const rows=[...root.children].filter(el=>!el.matches('.f-pagination,.r-empty,.r-note'));
    const size=matchMedia('(max-width:700px)').matches?3:5;
    const key=foundationState.surface+':'+selector;
    const signature=rows.map(el=>el.textContent).join('|');
    let state=foundationState.pages.get(key);
    if(!state||state.signature!==signature)state={page:0,signature};
    state.page=Math.min(state.page,Math.max(0,Math.ceil(rows.length/size)-1));
    foundationState.pages.set(key,state);
    root.dataset.pageKey=key;root.classList.add('f-paged-list');
    const existing=root.nextElementSibling?.classList.contains('f-pagination')?root.nextElementSibling:null;
    existing?.remove();
    for(const [i,row] of rows.entries())row.hidden=i<state.page*size||i>=(state.page+1)*size;
    if(rows.length<=size)continue;
    const pager=document.createElement('nav');pager.className='f-pagination';pager.setAttribute('aria-label','Register pages');
    const text=document.createElement('span');text.setAttribute('role','status');text.textContent=(state.page*size+1)+'–'+Math.min((state.page+1)*size,rows.length)+' of '+rows.length;
    pager.append(text);
    for(const [direction,label,disabled] of [[-1,'Previous',state.page===0],[1,'Next',state.page>=Math.ceil(rows.length/size)-1]]){
      const button=document.createElement('button');button.type='button';button.className='r-btn';button.dataset.foundationPage=key;button.dataset.direction=direction;button.textContent=label;button.disabled=disabled;button.setAttribute('aria-label',label+' register page');pager.append(button);
    }
    root.after(pager);
  }
}
function refineFoundation(tab){
  const chapter=document.body.classList.contains('decisions-app')?3:document.body.classList.contains('quality-app')?2:1;
  const surface=chapter+':'+tab+':'+(document.querySelector('.r-section-tabs [aria-pressed="true"]')?.textContent||'')+':'+(document.querySelector('#d-question-select')?.value||'');
  if(foundationState.surface!==surface){foundationState.surface=surface;foundationState.open=tab!=='model'&&!matchMedia('(max-width:1100px)').matches;foundationState.panel='overview';foundationState.controlsOpen=!matchMedia('(max-width:700px)').matches;}
  const firstLayout=!document.body.classList.contains('foundation-workspace');
  document.body.classList.add('foundation-workspace');
  const main=document.querySelector('.r-main'),studio=document.querySelector('.r-studio');if(!main||!studio)return;
  // Move readiness out of the long navigation rail and put it beside the progress indicator.
  const progress=main.querySelector('.r-progress'),milestones=document.querySelector('.r-side-progress');
  if(progress&&milestones&&!progress.closest('.f-readiness')){
    const count=progress.querySelector('small');
    if(count){count.title=count.textContent;count.textContent=count.textContent.split(' · ')[0];}
    const details=document.createElement('details');details.className='f-readiness';
    const summary=document.createElement('summary');summary.setAttribute('aria-label','Chapter '+chapter+' readiness, '+progress.querySelector('b').textContent+'. Review milestones');
    progress.before(details);summary.append(progress);details.append(summary,milestones);
    const hint=document.createElement('span');hint.className='f-readiness-hint';hint.textContent='Review milestones';progress.append(hint);
  }
  const inspector=document.querySelector('#r-inspector,#q-inspector,#d-inspector');if(!inspector)return;
  let dock=studio.querySelector('.f-context-dock');
  if(!dock){
    dock=document.createElement('details');dock.className='f-context-dock';
    const summary=document.createElement('summary');
    summary.innerHTML='<span><small>Selected context</small><strong></strong></span><span class="f-context-toggle">Open details</span>';
    const close=document.createElement('button');close.type='button';close.className='f-context-close r-btn';close.dataset.closeContext='true';close.textContent='×';close.setAttribute('aria-label','Close details');close.title='Close details';
    dock.append(summary,close,inspector);studio.append(dock);
  }
  dock.open=foundationState.open;
  const title=inspector.querySelector('h2')?.textContent||'Project context';
  dock.querySelector('summary strong').textContent=title;
  const context=inspector.querySelector('.r-kicker')?.textContent||'Selected context';
  dock.querySelector('summary small').textContent=/ghost|unsaved/i.test(context)?'Unsaved proposal':'Selected context';
  foundationPanels(inspector);activateContextPanel(foundationState.panel);
  const wide=main.querySelector('.r-card-head button[data-r-action="wide"],.r-card-head button[data-q-action="wide"],.r-card-head button[data-d-action="wide"]');
  if(wide)wide.hidden=false;
  const mapTools=studio.querySelector('.r-map-tools,.q-map-tools,.d-map-tools');
  if(mapTools&&!mapTools.closest('.f-model-controls')){
    const controls=document.createElement('details');controls.className='f-model-controls';controls.open=foundationState.controlsOpen;
    const summary=document.createElement('summary');summary.textContent='Map controls ';
    const hint=document.createElement('small');hint.textContent='Layers and tracing';summary.append(hint);
    mapTools.before(controls);controls.append(summary,mapTools);
  }
  const preview=studio.querySelector('.d-preview-band');
  if(preview&&!preview.closest('.f-preview-controls')){
    const controls=document.createElement('details');controls.className='f-preview-controls';controls.open=!matchMedia('(max-width:700px)').matches;
    const summary=document.createElement('summary');summary.textContent=(preview.querySelector('small')?.textContent||'Alternative preview')+' · Review actions';
    preview.before(controls);controls.append(summary,preview);
  }
  for(const [selector,label] of [['.d-impact-register','Proposed relationships'],['.r-map-note','About this map']]){
    const content=studio.querySelector(selector);
    if(content&&!content.closest('.f-map-disclosure')){
      const details=document.createElement('details');details.className='f-map-disclosure';
      const summary=document.createElement('summary');summary.textContent=label;
      content.before(details);details.append(summary,content);
    }
  }
  // Primary output actions remain ahead of the expandable register.
  if(tab==='output'){
    const list=studio.querySelector('.r-output-list,.d-output-list'),handoff=studio.querySelector('.r-handoff');
    if(list&&handoff&&!list.closest('.f-output-register')){
      const details=document.createElement('details');details.className='f-output-register';
      const summary=document.createElement('summary');summary.textContent='Review the register · '+list.children.length+' records';
      list.before(details);details.append(summary,list);details.before(handoff);
    }
    if(handoff&&!handoff.classList.contains('f-handoff')){
      handoff.classList.add('f-handoff');
      const copy=document.createElement('div');copy.className='f-handoff-copy';
      const kicker=handoff.querySelector('.r-kicker'),title=handoff.querySelector('h3'),description=[...handoff.querySelectorAll('p')].find(el=>el!==kicker);
      if(kicker){kicker.textContent='Continue the architecture journey';copy.append(kicker);}
      if(title){title.textContent=chapter===1?'02 · Quality drivers':chapter===2?'03 · Decisions':'04 · Logical application';copy.append(title);}
      const details=document.createElement('details');details.className='f-handoff-details';
      const summary=document.createElement('summary');summary.textContent='What carries forward';details.append(summary);
      if(description){const wrapper=description.parentElement;details.append(description);if(wrapper!==handoff&&!wrapper.childElementCount)wrapper.remove();}
      const links=handoff.querySelector('.r-actions');if(links)details.append(links);
      copy.append(details);handoff.prepend(copy);
    }
  }
  foundationPagination();
  if(firstLayout)window.dispatchEvent(new Event('resize'));
}
if(typeof document!=='undefined'){
  window.addEventListener('resize',()=>{
    if(!matchMedia('(max-width:700px)').matches)for(const controls of document.querySelectorAll('.f-model-controls,.f-preview-controls'))if(!controls.open)controls.open=true;
  });
  document.addEventListener('click',event=>{
    const placement=event.target.closest('button[data-lens-position]');
    if(placement){
      const chapter=Number(new URLSearchParams(location.search).get('chapter')||1);
      try{const preferences=JSON.parse(localStorage.getItem('aiw-lens-position-v1')||'{}');preferences[chapter]=placement.dataset.lensPosition;localStorage.setItem('aiw-lens-position-v1',JSON.stringify(preferences))}catch{}
      document.body.dataset.lensPosition=placement.dataset.lensPosition;
      document.querySelectorAll('button[data-lens-position]').forEach(b=>b.setAttribute('aria-pressed',String(b===placement)));
      const menu=placement.closest('.lens-options');menu.open=false;menu.querySelector('summary').focus({preventScroll:true});
      window.dispatchEvent(new Event('resize'));return;
    }
    for(const menu of document.querySelectorAll('.lens-options[open]'))if(!menu.contains(event.target))menu.open=false;
    for(const readiness of document.querySelectorAll('.f-readiness[open]'))if(!readiness.contains(event.target))readiness.open=false;
    const tab=event.target.closest('[data-context-tab]');
    if(tab){activateContextPanel(tab.dataset.contextTab);return;}
    if(event.target.closest('[data-close-context]')){closeContextPanel();return;}
    const page=event.target.closest('[data-foundation-page]');
    if(page&&!page.disabled){
      const state=foundationState.pages.get(page.dataset.foundationPage);if(!state)return;
      state.page+=Number(page.dataset.direction);foundationPagination();
      const root=[...document.querySelectorAll('[data-page-key]')].find(el=>el.dataset.pageKey===page.dataset.foundationPage);
      const control=root?.nextElementSibling?.querySelector('[data-direction="'+page.dataset.direction+'"]');
      (control&&!control.disabled?control:root?.nextElementSibling?.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
      root?.closest('.r-surface')?.scrollTo({top:0,behavior:'auto'});
    }
  });
  document.addEventListener('toggle',event=>{
    if(event.target.matches?.('.f-preview-controls'))window.dispatchEvent(new Event('resize'));
    if(event.target.matches?.('.f-model-controls')){
      foundationState.controlsOpen=event.target.open;
      window.dispatchEvent(new Event('resize'));
    }
    if(event.target.matches?.('.f-context-dock')){
      foundationState.open=event.target.open;
      window.dispatchEvent(new Event('resize'));
    }
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!document.querySelector('dialog[open]')){
      const layout=document.querySelector('.lens-options[open]');if(layout){layout.open=false;layout.querySelector('summary').focus();return;}
      document.querySelector('.journey-rail.open .rail-close')?.click();
      document.querySelectorAll('.f-readiness[open]').forEach(el=>el.open=false);
      if(foundationState.open)closeContextPanel();
    }
  });
}

function refineProject(){
  const p=window.aiwCurrentProject||window.aiwProjectStore?.value?.document;if(!p)return;
  document.title=p.name+' · AIW V5';
  const card=document.querySelector('.project-card,.r-project');
  if(card&&!card.querySelector('.rail-project-tools')){
    const initials=p.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
    card.innerHTML=`<header class="rail-project-heading"><span>Project</span><a href="/?view=projects" aria-label="All projects" title="All projects">All projects <span aria-hidden="true">↗</span></a></header><a class="project-switch" href="/?view=projects" aria-label="Switch or create project"><span class="project-mark" aria-hidden="true">${railEscape(initials)}</span><span class="project-identity"><strong>${railEscape(p.name)}</strong><small>${p.workspace?.template==='blank'?'Working project':'Reference · Confirm before use'}</small></span><span class="project-chevron" aria-hidden="true">⌄</span></a><div class="rail-project-tools" role="group" aria-label="Project resources"></div>`;
  }
  const crumb=document.querySelector('.r-breadcrumb,.breadcrumb'),chapter=new URLSearchParams(location.search).get('chapter')||1;
  if(crumb)crumb.innerHTML=railEscape(p.name)+' <span>/</span> Chapter '+String(chapter).padStart(2,'0');
  if(p.workspace?.template&&p.workspace.template!=='bank-payment'){
    const title=document.querySelector('.model-title');if(title)title.textContent=p.name+' architecture';
    const footer=document.querySelector('.footer>span');if(footer)footer.textContent='AIW V5 · '+p.name+' · Working architecture, pending review';
  }
  scopeProjectLinks();recordProjectLocation();
  mountChangeReview(p);mountEvidenceWorkspace(p);
}
