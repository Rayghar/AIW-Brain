import {mountJourneyContext,journeyNode} from './journey-context-ui.js';
import {mountChapterHeader} from './chapter-header.js';
import {reportLoadFailure} from './load-failures.js';
import {journeyObjectURL} from './journey-context.js';
import {mountEvidenceWorkspace} from './evidence-ui.js';
import {mountChangeReview} from './change-notice.js';
import {busyClock,updateSaveState} from './dialog.js';
import {scopeProjectLinks,recordProjectLocation,projectPreferenceKey,currentProject,onProjectSwitch,projectURL} from './project-context.js';
import {resolveRecordRef} from './chapter-records.js';
import {syncDetailsToggle,detailsOpensByItself,detailsColumnFits} from './studio-kit.js';
import {catalogueLoaded,loadCatalogue,whenCatalogue} from './catalogue-store.js';
import {refreshOutputIntelligence,mountOutputWorkspace} from './output-workspace.js';
import {refreshValidationIntelligence} from './validation-workspace.js';
import {modelImpactSource} from './model-impact.js';
export {cursorPreference,saveCursorPreference} from './cursor-preference.js';
// The shell reads these already-loaded projections through its workspace entry.
export {logicalGraph} from './logical-domain.js';
export {brainCursorText,designRecordContext,designRecordExplanation} from './knowledge-ui.js';
// Shared presentation only. Project records and chapter commands remain the source of truth.
let lastSimulation = '';
// Sol's panel is not on Chapters 1–3's critical path (round 2, I2-20): entry.js preloads it for Chapters 4–11, whose
// first render then mounts it at once; Chapters 1–3 paint first and mount it as soon as the module arrives. Until then
// the bar's Sol button opens the chapter's own dialog. The pattern catalogue itself still loads with every chapter
// (knowledge-governance.js imports it statically); see entry.js.
let brainModule=null,brainLoading=null,brainPending=null;
let knowledgeScheduled=false,guidanceContext=null;
function scheduleWorkspaceKnowledge(){
  if(knowledgeScheduled||catalogueLoaded())return;knowledgeScheduled=true;
  whenCatalogue(async()=>{
    try{
      const x=guidanceContext,p=currentProject();if(!x||p?.id!==x.projectId)return;
      mountChapterHeader(p,x.selection,x.tab);brainModule?.refreshArchitectureGuidance?.(p);
      // Only the small derived source/readiness slots refresh. The saved form,
      // finding selection and preview iframe stay mounted.
      if(x.tab==='validate'&&guidanceContext===x)refreshValidationIntelligence(currentProject());
      if(x.tab==='output'&&guidanceContext===x)refreshOutputIntelligence(currentProject());
    }catch(error){reportLoadFailure('the current architecture guidance',error);}
  });
  const load=()=>loadCatalogue().catch(error=>reportLoadFailure('architecture knowledge (open Co-design to retry)',error));
  if(typeof requestIdleCallback==='function')requestIdleCallback(load,{timeout:1500});else requestAnimationFrame(()=>setTimeout(load,0));
}
export function brainReady(){return brainLoading??=import('./brain-context-ui.js').then(m=>{brainModule=m;return m;}).catch(e=>{brainLoading=null;throw reportLoadFailure('Sol’s panel',e);});}
// Until the panel has arrived, a click on the bar's Sol or Proposals waits for it instead of opening the chapter's
// own dialog, and is replayed through the panel once it has mounted: the first click reaches the same Sol as any later.
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',e=>{
  const action=e.target?.closest?.('[data-intelligence-action]');
  if(action){
    if(action.disabled||!action.isConnected)return;
    e.preventDefault();e.stopImmediatePropagation();
    const request={projectId:action.dataset.intelligenceProject,subjectId:action.dataset.intelligenceSubject,chapter:action.dataset.intelligenceChapter,insightId:action.dataset.intelligenceInsight,actionId:action.dataset.intelligenceAction,basisStamp:action.dataset.intelligenceBasis,knowledgeStamp:action.dataset.intelligenceKnowledge};
    const dispatch=m=>{if(action.isConnected&&currentProject()?.id===request.projectId&&action.dataset.intelligenceBasis===request.basisStamp&&action.dataset.intelligenceKnowledge===request.knowledgeStamp)m.launchIntelligenceAction?.(request);};
    if(brainModule)dispatch(brainModule);else brainReady().then(dispatch).catch(err=>reportLoadFailure('the contextual design action',err));
    return;
  }
  if(brainModule)return;
  const b=e.target?.closest?.('[data-workspace-sol],.r-assistant-bar button,.l-assistance button');if(!b||b.disabled)return;
  const kind=b.hasAttribute('data-workspace-sol')?'sol':[...b.attributes].find(a=>a.name.startsWith('data-')&&(a.value==='sol'||a.value==='mind'))?.value;if(!kind)return;
  e.preventDefault();e.stopImmediatePropagation();
  brainReady().then(m=>m.launchAssistant?.(kind==='mind'?'mind':'design')).catch(err=>{console.warn('Sol could not load.',err?.message);});
},true);
// Sol's Develop, Continue and saved provenance actions share one lazy task
// workspace. The shell keeps only synchronous saved-record readings at startup.
// A late module must not open a task for another project or a departed context.
let shellHandles=null,designTaskLoading=null,lazyDesignTasks=null,designTaskEpoch=0;
export function registerShell(handles){shellHandles=handles;}
export function disposeDesignTasks(){
  designTaskEpoch++;designTaskLoading=null;
  const active=typeof window==='undefined'?null:window.aiwDesignTasks;
  active?.dispose?.();if(lazyDesignTasks&&lazyDesignTasks!==active)lazyDesignTasks.dispose?.();lazyDesignTasks=null;
}
export function designTasksReady(){
  if(typeof window!=='undefined'&&window.aiwDesignTasks)return Promise.resolve(window.aiwDesignTasks);
  if(designTaskLoading)return designTaskLoading;
  const store=typeof window==='undefined'?null:window.aiwProjectStore,handles=shellHandles,projectId=store?.value?.document?.id,epoch=designTaskEpoch;
  const selection=()=>JSON.stringify([handles?.bridge?.state?.chapter,handles?.bridge?.state?.tab,handles?.bridge?.state?.selected]),openedFrom=selection();
  if(!store||!projectId||!handles?.bridge)return Promise.reject(Error('Open the current project before opening a design task.'));
  const loading=import('./design-task-ui.js').catch(e=>{throw reportLoadFailure('the design tasks',e);}).then(m=>{
    if(epoch!==designTaskEpoch||window.aiwProjectStore!==store||store.value?.document?.id!==projectId||shellHandles!==handles||selection()!==openedFrom)throw Error('The design context changed while the task was loading. Open the task again from the current project.');
    if(window.aiwDesignTasks)return window.aiwDesignTasks;
    lazyDesignTasks=m.createDesignTaskWorkspace({store,bridge:()=>handles.bridge,openSol:()=>handles.openSol?.()});return lazyDesignTasks;
  }).finally(()=>{if(designTaskLoading===loading)designTaskLoading=null;});
  designTaskLoading=loading;return loading;
}
// Optional native editors keep their synchronous reading API at startup. Their
// first action loads the editor against the exact project, selection and form
// that requested it; a late arrival never closes or replaces a newer editor.
function deferredNativeWorkspace(options,{name,key,load,create,reads,actions}){
  const {store,bridge}=options,projectId=store.value.document.id;
  let instance=null,loading=null,disposed=false,waiting=0;const notes=new Set();
  const live=()=>!disposed&&store.value.document.id===projectId;
  const editor=()=>document.querySelector('dialog[open]');
  const values=el=>JSON.stringify([[...(el?.querySelectorAll('form,[data-l-panel],[data-a-panel],[data-t-panel],[data-tr-panel],[data-i-panel],.l-discard,.dc-leave')||[])].map(x=>x.hidden),[...(el?.querySelectorAll('input,textarea,select')||[])].map(x=>[x.value,x.checked,x.multiple?[...x.selectedOptions].map(o=>o.value):null])]);
  const capture=()=>{const b=bridge(),el=editor();return {bridge:b,selection:JSON.stringify([b?.state.chapter,b?.state.tab,b?.state.selected]),revision:store.value.revision,editor:el,form:el?.querySelector('form'),values:values(el)};};
  const current=(c,forms=true)=>live()&&bridge()===c.bridge&&store.value.revision===c.revision&&JSON.stringify([c.bridge?.state.chapter,c.bridge?.state.tab,c.bridge?.state.selected])===c.selection&&(!forms||editor()===c.editor&&c.editor?.querySelector('form')===c.form&&values(c.editor)===c.values);
  async function ready(c,forms=true){
    if(!c.bridge||!live())throw Error('Open the current project before opening '+name+'.');
    loading??=Promise.resolve().then(load).catch(error=>{loading=null;throw error;});
    const module=await loading;
    if(!current(c,forms))throw Error('The project, selection or editor changed while '+name+' loaded. Your input is retained; try again from the current context.');
    if(!instance){instance=module[create](options);window[key]=api;}return instance;
  }
  function invoke(method,args){
    if(!live())return 'This editor belongs to a closed project. Open the action again in the current workspace.';if(instance)return instance[method](...args);
    const c=capture();waiting++;c.bridge?.toast('Opening '+name+'…');
    return ready(c).then(workspace=>workspace[method](...args)).catch(error=>{if(live())c.bridge?.toast(error.message+' Try the action again.');return error.message;}).finally(()=>waiting--);
  }
  function decorateAssistant(el,type,settings){
    if(!live()||!el?.isConnected||!['sol','mind'].includes(type))return;
    if(instance)return instance.decorateAssistant(el,type,settings);
    if(key==='aiwInterfaceImpact'&&type==='sol'){const chapter=bridge()?.state.chapter;return (chapter===9?window.aiwSecurityTask:chapter===8?window.aiwExchangeTask:window.aiwDesignTasks)?.decorateAssistant(el,type,settings);}
    if([...notes].some(n=>n.parentElement===el||el.contains(n)))return;
    const c=capture(),note=document.createElement('p');note.className='l-note';note.setAttribute('role','status');note.textContent='Opening '+name+'…';notes.add(note);(el.querySelector('[role="alert"]')||el.querySelector('header'))?.after(note);
    ready(c,false).then(workspace=>{const here=el.isConnected&&note.isConnected&&current(c,false);note.remove();notes.delete(note);if(here)workspace.decorateAssistant(el,type,settings);}).catch(error=>{
      if(!el.isConnected||!note.isConnected||!current(c,false)){note.remove();notes.delete(note);return;}
      note.textContent=name+' could not load. Your input is retained. ';const retry=document.createElement('button');retry.type='button';retry.className='btn';retry.textContent='Try again';retry.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();note.remove();notes.delete(note);decorateAssistant(el,type,settings);});note.append(retry);note.title=error.message;
    });
  }
  const target={decorateAssistant,dispose(){if(disposed)return;disposed=true;for(const note of notes)note.remove();notes.clear();instance?.dispose();instance=null;if(window[key]===api)delete window[key];}};
  const api=new Proxy(target,{get(target,property){if(property in target)return target[property];if(property==='busy')return !disposed&&(waiting>0||!!instance?.busy);if(property==='opening')return !!instance?.opening;if(instance){const value=instance[property];return typeof value==='function'?value.bind(instance):value;}if(actions.includes(property))return (...args)=>invoke(property,args);return reads[property];}});
  window[key]=api;return api;
}
export function createDeferredExchangeTaskWorkspace(options,load=()=>import('./exchange-task-ui.js')){
  return deferredNativeWorkspace(options,{name:'the exchange task',key:'aiwExchangeTask',load,create:'createExchangeTaskWorkspace',actions:['openTask'],reads:{}});
}
export function createDeferredInterfaceImpactWorkspace(options,load=()=>import('./interface-impact-ui.js')){
  const api=deferredNativeWorkspace(options,{name:'the impact review',key:'aiwInterfaceImpact',load,create:'createInterfaceImpactWorkspace',actions:['stage','loadAlternative'],reads:{pending:false,document:null,sourceChapter:null,previewInChapter:()=>false,commandFor:()=>null,decorate:g=>g,objectContext:()=>'',explanation:()=>null,banner:()=>'',reminder:()=>'',open:()=>{},edit:()=>{},dismiss:()=>{}}});
  const stage=api.stage;
  api.stageModel=async(command,finish)=>{if(!modelImpactSource(options.store.value.document,command))return null;const result=await stage(command);if(result===true)finish();return result;};return api;
}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('click',event=>{
  const button=event.target?.closest?.('[data-dc-action="open-task"]');if(!button||button.disabled)return;
  event.preventDefault();const projectId=currentProject()?.id,taskId=button.dataset.task;
  designTasksReady().then(tasks=>{if(button.isConnected&&currentProject()?.id===projectId)tasks.openTask(taskId);}).catch(error=>reportLoadFailure('the saved design reasoning',error));
});
// Security's guided design is used only when an architect opens Sol or continues
// a protection task. Keep its workspace and listeners scoped to that interaction.
let securityTaskLoading=null;
export function securityTasksReady(){
  if(typeof window!=='undefined'&&window.aiwSecurityTask)return Promise.resolve(window.aiwSecurityTask);
  return securityTaskLoading??=import('./security-task-ui.js').catch(e=>{throw reportLoadFailure('the protection tasks',e);}).then(m=>{
    if(window.aiwSecurityTask)return window.aiwSecurityTask;
    return m.createSecurityTaskWorkspace({store:window.aiwProjectStore,bridge:()=>shellHandles?.bridge,openSol:()=>shellHandles?.openProtectionSol?.()});
  }).finally(()=>{securityTaskLoading=null;});
}
function mountBrainContext(p,selection,tab){
  if(brainModule){brainModule.mountBrainContext(p,selection,tab);return;}
  brainPending={selection,tab};
  brainReady().then(()=>{if(!brainPending)return;const x=brainPending;brainPending=null;brainModule.mountBrainContext(currentProject(),x.selection,x.tab);}).catch(e=>{console.warn('Sol could not load.',e?.message);});
}
const railEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rememberRailFocus(){
  const active=document.activeElement;
  const tab=active?.closest?.('.tabs [data-tab]'),chapter=active?.closest?.('.chapter-nav [data-chapter]'),resource=active?.closest?.('.rail-resources [data-resource-open]');
  const button=active?.closest?.('.journey-explorer button');
  const attribute=button&&[...button.attributes].find(a=>a.name.startsWith('data-'));
  // A module chosen in the rail keeps the keyboard on it; a crumb chosen in the scope bar hands it to the scope now held.
  const scoped=active?.closest?.('.rail-modules [data-scope-to]')?.dataset.scopeTo,crumb=!!active?.closest?.('.scope-bar');
  const headerFocus=active?.closest?.('[data-header-focus]')?.dataset.headerFocus;
  return ()=>{
    const target=tab?document.querySelector(`.tabs [data-tab="${tab.dataset.tab}"]`):chapter?document.querySelector(`.chapter-nav [data-chapter="${chapter.dataset.chapter}"]`):resource?document.querySelector(`.rail-resources [data-resource-open="${resource.dataset.resourceOpen}"]`):attribute?[...document.querySelectorAll('.journey-explorer button')].find(b=>b.getAttribute(attribute.name)===attribute.value):scoped!==undefined?[...document.querySelectorAll('.rail-modules [data-scope-to]')].find(b=>b.dataset.scopeTo===scoped):crumb?document.querySelector('.scope-bar [aria-current]'):headerFocus?[...document.querySelectorAll('[data-header-focus]')].find(b=>b.dataset.headerFocus===headerFocus):null;
    if(target?.getClientRects().length)target.focus({preventScroll:true});
  };
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
  if(!rail.querySelector('.rail-resources')){
    const resources=document.createElement('section');resources.className='rail-resources';resources.setAttribute('aria-label','Design resources');
    const glyph={components:'<path d="M3 4h7v7H3zM14 4h7v7h-7zM3 15h7v6H3zM14 15h7v6h-7z"/>',technology:'<path d="M4 5h16v5H4zM4 14h16v5H4zM8 7h1M8 16h1"/>',knowledge:'<path d="M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15"/>'};
    resources.innerHTML='<h2>Design resources</h2>'+[['components','Component library'],['technology','Technology products'],['knowledge','Knowledge repository']].map(([id,label])=>`<button type="button" data-resource-open="${id}" aria-haspopup="dialog"><span><svg viewBox="0 0 24 24" aria-hidden="true">${glyph[id]}</svg>${label}</span><span aria-hidden="true">›</span></button>`).join('');
    (rail.querySelector('.rail-modules')||rail.querySelector('.journey-route')||nav).after(resources);
  }
  // Keep the rail to three purposeful sections; readiness lives beside its indicator.
  rail.querySelectorAll('.sidebar-note,.r-side-note,.sidebar-bottom').forEach(el=>el.remove());
}
// The rail's Modules section and Chapter 1's structure screen (round 24, D-24-08): app.js and requirements.js draw their
// frames while the project has requirements to organise; the tree, its counts for the chapter on screen, the structure
// with its findings and its acceptance are module-ui.js's, loaded on first use and drawn in place on every render after.
let moduleUI=null,moduleUILoading=null;
const moduleUIReady=()=>(moduleUILoading??=import('./module-ui.js').then(m=>{moduleUI=m;return m;}).catch(e=>{moduleUILoading=null;throw reportLoadFailure('the modules rail',e);}));
function refineModules(selection){
  if(!document.querySelector('.sidebar [data-rail-modules],[data-r-modules]'))return;
  const draw=()=>{try{const p=currentProject(),rail=document.querySelector('.sidebar [data-rail-modules]');if(rail)moduleUI.fillRailModules(rail,p,Number(selection?.chapter)||1);moduleUI.fillScreens(document,p);}catch(e){console.warn('The modules could not be drawn.',e?.message);}};
  if(moduleUI)draw();else moduleUIReady().then(draw).catch(e=>console.warn('The modules could not load.',e?.message));
}
// One frame on every tab (round 3, B): the companion column stands beside the stage on Model as on Work, unless the reader chose otherwise.
function lensPosition(chapter){const fallback='side';try{return JSON.parse(localStorage.getItem('aiw-lens-position-v1')||'{}')[chapter]||fallback}catch{return fallback}}
function refineLensPosition(){
  const chapter=Number(new URLSearchParams(location.search).get('chapter')||1),position=lensPosition(chapter);
  const changed=!document.body.classList.contains('explorer-workspace')||document.body.dataset.lensPosition!==position;
  document.body.classList.add('explorer-workspace');document.body.dataset.lensPosition=position;
  if(changed&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('resize'));
  // The Model tab's column is the model companion (model-stage.js), not object details: it takes no lens options.
  const inspector=document.querySelector('#inspector:not(.model-companion)');if(!inspector)return;
  let controls=inspector.querySelector('.lens-options');
  if(!controls){controls=document.createElement('details');controls.className='lens-options';controls.innerHTML='<summary aria-label="Object lens layout" title="Object lens layout"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="12" rx="2"/><path d="M12 4v12"/></svg></summary><div role="group" aria-label="Object lens position"><span>Panel position</span><button type="button" data-lens-position="side">Beside workspace</button><button type="button" data-lens-position="bottom">Below workspace</button></div>';const summary=inspector.querySelector(':scope>summary');if(summary)summary.after(controls);else inspector.prepend(controls);}
  controls.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lensPosition===position)));
}
// The same selected object can remain in the side panel while the stage changes to a
// chapter-wide Validate or Output view. Name that boundary in the panel itself.
function refineInspectorSubject(tab,selection){
  const panel=document.querySelector('#inspector:not(.model-companion)'),project=currentProject();if(!panel)return;
  panel.querySelector(':scope>.inspector-context')?.remove();
  if(!project||!selection?.id)return;
  const node=journeyNode(project,selection.id);if(!node?.record)return;
  const chapter=Number(selection.chapter),source=Number(node.chapter),crossChapter=source!==chapter;if(!crossChapter&&!['validate','output'].includes(tab))return;
  const section=document.createElement('section');section.className='inspector-context';section.setAttribute('aria-label','Selected record context');
  const place=document.createElement('span');place.className='inspector-context-place';place.textContent='Selected record · Chapter '+String(source).padStart(2,'0');section.append(place);
  const name=document.createElement('strong');name.textContent=(node.ref&&node.ref!==node.title?node.ref+' · ':'')+(node.title||node.id);section.append(name);
  if(crossChapter||tab==='validate'||tab==='output'){
    const scope=document.createElement('small');scope.textContent=crossChapter?'This panel follows a record from another chapter.':tab==='validate'?'The checks in the main view cover this chapter.':'The main view compiles this chapter’s output.';section.append(scope);
  }
  if(crossChapter){const link=document.createElement('a');link.href=projectURL(journeyObjectURL(node,'work'));link.textContent='Open its Work view →';section.append(link)}
  panel.prepend(section);
}
// Details preferences are scoped to the project, chapter and tab. Explicit inspection
// opens a temporary reading without overwriting a preference to keep the panel closed.
// A deliberate toggle changes the preference; redraws and reloads retain that choice.
const panelChoices=new Map();let panelContext=null,detailsReturnTarget=null;
function rememberDetailsOrigin(){const origin=document.activeElement;if(origin&&origin!==document.body&&!origin.closest('#inspector'))detailsReturnTarget=origin;}
function focusDetailsOrigin(){const visible=el=>el?.isConnected&&!el.closest('#inspector')&&(el.checkVisibility?el.checkVisibility():el.getClientRects().length>0);const target=visible(detailsReturnTarget)?detailsReturnTarget:[...document.querySelectorAll('[data-panel-toggle]')].find(visible);target?.focus({preventScroll:true});}
function detailsPreferences(projectId){
  const key='aiw-details-v1:'+projectId;
  try{
    const raw=localStorage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;}
    const legacy=localStorage.getItem('aiw.panel.collapsed'),values={};
    if(legacy==='0'||legacy==='1'){
      // The legacy preference applied to Work/Model. New review drawers start closed.
      for(let chapter=1;chapter<=11;chapter++)for(const tab of ['work','model'])values[chapter+':'+tab]=legacy==='1';
      localStorage.setItem(key,JSON.stringify(values));
    }
    return values;
  }catch{return {};}
}
export function detailsPreference(projectId,chapter,tab){
  const value=detailsPreferences(projectId)[chapter+':'+tab];return typeof value==='boolean'?value:null;
}
function saveDetailsPreference(choice,collapsed){
  try{const values=detailsPreferences(choice.projectId);values[choice.chapter+':'+choice.tab]=collapsed;localStorage.setItem('aiw-details-v1:'+choice.projectId,JSON.stringify(values));}catch{/* The session still keeps the choice when storage is unavailable. */}
}
function applyPanelState(collapsed){
  const was=document.body.dataset.panel;document.body.dataset.panel=collapsed?'collapsed':'open';
  const inspector=document.querySelector('#inspector');if(inspector)inspector.setAttribute('aria-hidden',String(collapsed));
  syncDetailsToggle();
  if(was!==document.body.dataset.panel&&typeof window.dispatchEvent==='function')window.dispatchEvent(new Event('resize'));
}
function refinePanelToggle(tab,selection){
  const inspector=document.querySelector('#inspector');
  if(!inspector){panelContext=null;applyPanelState(true);return;}
  if(!inspector.querySelector(':scope > .panel-dismiss')){const close=document.createElement('button');close.type='button';close.className='panel-dismiss';close.dataset.panelToggle='';close.setAttribute('aria-controls','inspector');close.textContent='Close details ×';inspector.prepend(close);}
  const projectId=currentProject()?.id||'bank-payment',chapter=Number(selection?.chapter)||1,key=[projectId,chapter,tab].join(':');
  const id=selection?.id&&selection.id!=='project'?selection.id:'';
  let choice=panelChoices.get(key);
  // rc40 (W4), rc41 (W2, close): on every tab the column opens by default while it holds the design at a glance
  // (work-glance.js) or a held record and the viewport gives it a column of its own — studio-kit.js
  // detailsOpensByItself, the one rule a Model selection follows too; below 1180 px it would be a sheet over the task
  // (studio-system.css), so it waits for the person's toggle; it stays closed while it is empty (a chapter with nothing
  // recorded keeps the width for its arrival card); a viewer's own choice is remembered as before.
  if(!choice){const preferred=detailsPreference(projectId,chapter,tab);choice={projectId,chapter,tab,id,collapsed:preferred??!detailsOpensByItself({held:!!id,glance:!!inspector.querySelector('.work-glance')})};panelChoices.set(key,choice);}
  choice.id=id;panelContext=key;applyPanelState(choice.collapsed);
}
function toggleDetails(collapsed,{remember=true}={}){
  if(!panelContext)return;
  const choice=panelChoices.get(panelContext);if(choice){choice.collapsed=collapsed;if(remember)saveDetailsPreference(choice,collapsed);}
  applyPanelState(collapsed);
}
// A selection on a Model picture opens the column only by the one rule (rc41 close): where the viewer has not closed it
// for this chapter and tab, and where studio-kit.js detailsOpensByItself gives a held record a column of its own (below
// 1180 px it would be a sheet over the picture the reader has just touched). Both of a selection's paths ask it:
// notation-view.js revealReading (aiw:inspect-details, unlessClosed) and model-stage.js announceObject (app.js
// aiw:subject, byItself). An explicit inspection opens the column at any width.
export function selectionOpensDetails(){
  const params=new URLSearchParams(location.search),chapter=Number(params.get('chapter'))||1,tab=document.body.dataset.workspaceTab;
  return detailsPreference(currentProject()?.id||'bank-payment',chapter,tab)!==true&&detailsOpensByItself({held:true});
}
export function openWorkspaceDetails({byItself=false}={}){if(byItself&&!selectionOpensDetails())return;rememberDetailsOrigin();toggleDetails(false,{remember:false});}
if(typeof window!=='undefined')window.addEventListener('aiw:inspect-details',e=>{
  const params=new URLSearchParams(location.search),chapter=Number(params.get('chapter'))||1,tab=document.body.dataset.workspaceTab;
  // A selection on a Model picture (rc41 lead, notation-view.js revealReading) asks the one rule (selectionOpensDetails).
  if(e?.detail?.unlessClosed&&!selectionOpensDetails())return;
  refinePanelToggle(tab,{chapter,id:params.get('object')});
  openWorkspaceDetails();
});
// A chapter opening in place (round 12, G, GR-UX-07): before it is drawn and its counts computed, the shell marks it in
// the rail, writes its heading and says it is building it, with the time taken once that passes a second. The chapter
// being left stays on screen, dimmed and out of reach. Returns the stop.
export function showBuilding(chapter,{heading='',subtitle='',title=''}={}){
  for(const a of document.querySelectorAll('.chapter-nav .chapter-item')){const on=Number(a.dataset.chapter)===Number(chapter);a.classList.toggle('current',on);a.setAttribute('aria-current',on?'step':'false');}
  const h1=document.querySelector('.heading-row h1'),crumb=document.querySelector('.breadcrumb strong'),sub=document.querySelector('.heading-row .subtitle');
  if(h1&&heading)h1.textContent=heading;if(crumb)crumb.textContent='Chapter '+String(chapter).padStart(2,'0');if(sub&&subtitle)sub.textContent=subtitle;
  document.body.classList.add('shell-building');
  let note=document.querySelector('.shell-building-note');
  if(!note){note=document.createElement('p');note.className='shell-building-note';note.setAttribute('role','status');note.setAttribute('aria-live','polite');(document.querySelector('#studio-surface')||document.querySelector('#workspace'))?.before(note);}
  const stop=busyClock(note,`Building Chapter ${chapter}${title?' · '+title:''}…`);
  return ()=>{stop();document.body.classList.remove('shell-building');note.remove();};
}
// While a save is under way the header says so and how long it has taken (round 12, G, GR-UX-07), on whichever header the
// page has drawn since.
const saveLabel=()=>document.querySelector('.save-state');
function showSaveStatus(status){
  const label=saveLabel();
  if(!label)return;
  label.setAttribute('role','status'); label.setAttribute('aria-live','polite');
  if(status==='behind'){
    busyClock(saveLabel,'',false);
    updateSaveState('A newer version was saved in another tab.',label);
    const action=document.createElement('button');action.type='button';action.className='text-button';action.dataset.loadLatest='';action.textContent='Load latest';label.append(action);
    return;
  }
  busyClock(saveLabel,status==='saving'?'Saving…':status==='error'?'Changes not saved':'Saved to your private project',status==='saving');
}
if(typeof document!=='undefined'){
  document.addEventListener('aiw:save',event=>showSaveStatus(event.detail.status));
  // Loading the latest version replaces this tab's copy and redraws the page from it.
  document.addEventListener('click',async event=>{const button=event.target.closest?.('[data-load-latest]');if(!button)return;button.disabled=true;try{await window.aiwProjectStore?.load();document.dispatchEvent(new CustomEvent('aiw:external-project'));}catch{button.disabled=false;}});
}
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

// Validate is the chapter's checks (public/validate-view.js). It loads on first use so other surfaces do not pay
// for it. The whole design is a view on the Model tab and the review desk is Chapter 11's Model; neither mounts here.
let validateModule=null, validateLoading=null;
// An old link may still ask Validate for a view (?validate=desk|model); the page rewrites its address before
// Validate loads, so the request is kept here and handed over once, and Validate says where that view now is.
let validateAsked = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('validate') : null;
const takeValidate = () => { const v = validateAsked; validateAsked = null; return v; };
function syncValidate(tab, selection){
  if (typeof window === 'undefined' || window.document !== document) return;
  try {
    if (tab !== 'validate') validateModule?.leaveValidate();
    if (tab !== 'output') validateModule?.leaveOutput?.();
    if (tab !== 'validate' && tab !== 'output') return;
    // Output already renders these native controls. Bind them immediately so a
    // first handoff/document click does not disappear while export tools load.
    if (tab === 'output') mountOutputWorkspace(document);
    // Round 6 (Contract F): the same module mounts Chapter 3's decision records on the Output tab.
    const mount = () => (tab === 'validate' ? validateModule.mountValidate(selection, {asked: takeValidate()}) : validateModule.mountOutput?.(selection));
    if (validateModule) { mount(); return; }
    validateLoading ??= import('./validate-view.js').then(m => { validateModule = m; return m; }).catch(e => {
      validateLoading = null;
      reportLoadFailure(tab === 'validate' ? 'the Validate reading' : 'the Output documents', e);
      if (document.body?.dataset.workspaceTab !== tab) return null;
      const stage = document.querySelector('.studio > .stage.tab-content');
      if (stage && !stage.querySelector('.vx-load-error')) {
        const message = document.createElement('p'); message.className = 'vx-load-error'; message.setAttribute('role', 'alert');
        message.innerHTML = 'The ' + (tab === 'validate' ? 'validation' : 'document') + ' reading did not load. <button type="button" class="btn">Try again</button>';
        message.querySelector('button').addEventListener('click', () => { message.remove(); syncValidate(tab, selection); });
        stage.prepend(message);
      }
      return null;
    });
    validateLoading.then(m => { if (!m) return; try { if (document.body?.dataset.workspaceTab === tab) mount(); } catch (e) { console.warn('The chapter reading could not open.', e?.message); } });
  } catch (e) { console.warn('Validate could not open.', e?.message); }
}
// Chapter-specific Model views. Each chapter opens on its own models: Diagram, its own views, Layers, Table, Matrix and
// Whole design, then the project's perspectives (round 5, R5-C: one picture world). Each view module exports
// mountChapterModel(selection) and leaveChapterModel(); perspective-view.js draws a perspective the chapter shows.
const CHAPTER_MODELS = {1: () => import('./story-view.js'), 2: () => import('./utility-view.js'), 3: () => import('./tradeoff-view.js'), 4: () => import('./responsibility-view.js'), 5: () => import('./realise-view.js'), 6: () => import('./platform-view.js'), 7: () => import('./stack-view.js'), 8: () => import('./exchange-view.js'), 9: () => import('./threat-view.js'), 10: () => import('./deploy-view.js'), 11: () => import('./desk-view.js')};
const chapterModules = new Map(), chapterLoading = new Map();
let lastModelSelection = null;
// While a chapter model's modules load, the stage says so in the model's own frame, never a blank.
function showChapterLoading(chapter) { const host = document.querySelector('.studio > .stage.tab-content'); if (!host || host.querySelector(':scope > .cm-loading')) return; host.insertAdjacentHTML('afterbegin', `<section class="cm cm-loading" aria-busy="true" aria-label="Chapter ${chapter} model, loading"><p>Preparing the Chapter ${chapter} model…</p></section>`); }
function hideChapterLoading() { document.querySelectorAll('.studio > .stage.tab-content > .cm-loading').forEach(el => el.remove()); }
const liveDocument = () => typeof window !== 'undefined' && window.document === document;
// The perspective each chapter shows as its current view, if it shows one: a saved perspective's id (kept in the
// address as modelView= and, per project, in this browser, as a chapter remembers its other views) or 'new' while one
// is being composed (this visit only). The view module loads with the first chapter model.
let perspectiveModule = null, perspectiveLoading = null, perspectives = null;
const perspectivesReady = () => (perspectiveLoading ??= import('./perspective-view.js').then(m => { perspectiveModule = m; return m; }).catch(e => { perspectiveLoading = null; throw reportLoadFailure('the perspectives', e); }));
const perspectiveKey = () => projectPreferenceKey('aiw-chapter-perspective-v1');
function shownPerspectives() {
  if (perspectives?.key === perspectiveKey()) return perspectives;
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(perspectiveKey()) || '{}') || {}; } catch { saved = {}; }
  return (perspectives = {key: perspectiveKey(), saved: Object.fromEntries(Object.entries(saved).filter(([, id]) => typeof id === 'string')), composing: new Set()});
}
const perspectiveOf = chapter => { const p = shownPerspectives(), c = String(Number(chapter)); return p.composing.has(c) ? 'new' : p.saved[c] || null; };
function setPerspective(chapter, id) {
  const p = shownPerspectives(), c = String(Number(chapter));
  p.composing.delete(c); delete p.saved[c];
  if (id === 'new') p.composing.add(c); else if (id) p.saved[c] = id;
  try { localStorage.setItem(perspectiveKey(), JSON.stringify(p.saved)); } catch { /* a preference: the chapter opens on its own view without it */ }
}
// The address follows the chapter's current view: a saved perspective is kept as modelView=, any other view drops it.
function keepModelViewInAddress(chapter) {
  if (!window.history) return;
  const url = new URL(location.href); if (Number(url.searchParams.get('chapter')) !== Number(chapter) || url.searchParams.get('tab') !== 'model') return;
  const id = modelViewInAddress(chapter); if ((url.searchParams.get('modelView') || null) === id) return;
  if (id) url.searchParams.set('modelView', id); else url.searchParams.delete('modelView');
  window.history.replaceState(window.history.state, '', url.pathname + url.search);
}
// What the perspective view asks of the shell: show a perspective (or none) as the chapter's current view, hand over to
// one of the chapter's own views, and tell Sol what is selected.
const perspectiveHandles = {
  choose(chapter, id) { setPerspective(chapter, id); keepModelViewInAddress(chapter); showCurrentModel(); },
  chapterView(chapter, view) { setPerspective(chapter, null); pendingRoute = {chapter: Number(chapter), object: null, model: view}; keepModelViewInAddress(chapter); showCurrentModel(); }
};
function showCurrentModel() { if (lastModelSelection && document.body.dataset.workspaceTab === 'model') syncChapterModel('model', lastModelSelection); }
function wantsChapterModel(tab, selection) { return tab === 'model' && !!CHAPTER_MODELS[selection?.chapter] && liveDocument(); }
function leaveChapterModels(except = null) { hideChapterLoading(); perspectiveModule?.leavePerspective(except); for (const [chapter, m] of chapterModules) if (chapter !== except) { try { m.leaveChapterModel(); } catch { /* already gone */ } } }
// The chapter's current view: a perspective it shows, drawn in its frame with its switcher (which the chapter model
// gives the first time it is on the page), or the chapter model itself, whose switcher then lists the perspectives.
function showModel(chapter, selection) {
  const m = chapterModules.get(chapter), P = perspectiveModule;
  let id = perspectiveOf(chapter);
  if (id && !P.perspectiveKnown(id)) { setPerspective(chapter, null); keepModelViewInAddress(chapter); id = null; }
  if (id && P.hasSwitcher(chapter)) { m.leaveChapterModel(); P.mountPerspective(chapter, id, selection, perspectiveHandles); return; }
  P.leavePerspective();
  m.mountChapterModel(selection);
  P.attachPerspectives(chapter, perspectiveHandles);
  if (id) { m.leaveChapterModel(); P.mountPerspective(chapter, id, selection, perspectiveHandles); }
}
function syncChapterModel(tab, selection) {
  if (!liveDocument()) return false;
  if (!wantsChapterModel(tab, selection)) { leaveChapterModels(); return false; }
  const chapter = Number(selection.chapter);
  lastModelSelection = selection;
  leaveChapterModels(chapter);
  document.body.classList.add('cm-active');
  const mount = () => { try { if (document.body.dataset.workspaceTab === 'model' && wantsChapterModel('model', lastModelSelection) && Number(lastModelSelection.chapter) === chapter) showModel(chapter, lastModelSelection); } catch (e) { console.warn('The chapter model could not open.', e?.message); } };
  if (chapterModules.has(chapter) && perspectiveModule) { mount(); return true; }
  showChapterLoading(chapter);
  if (!chapterLoading.has(chapter)) chapterLoading.set(chapter, Promise.all([CHAPTER_MODELS[chapter](), perspectivesReady()]).then(([m]) => { chapterModules.set(chapter, m); }).catch(e => { chapterLoading.delete(chapter); hideChapterLoading(); reportLoadFailure(`the Chapter ${chapter} model`, e); }));
  chapterLoading.get(chapter).then(() => { hideChapterLoading(); if (chapterModules.has(chapter)) mount(); });
  return true;
}
// The Model tab's own parameters in an address: the object to open (for example the anatomy's "Open in Chapter N
// model"), the chapter model's view (model=) and a saved perspective (modelView=). The first address hands them over
// as the page opens, and a route the shell follows in place hands over its own (routeModel, round 4, A), so both open
// the same way: the object and the view are kept here and given once to the chapter model they were meant for
// (takeLink, takeView), since the page rewrites its address before a chapter model loads; a saved perspective becomes
// that chapter's current view. explore= (the retired "Explore all perspectives") opens the chapter's Diagram.
let pendingRoute = null;
export function routeModel({chapter, object = null, model = null, modelView = null, explore = false} = {}) {
  const view = model || (explore ? 'diagram' : null);
  pendingRoute = {chapter: Number(chapter), object, model: view};
  if (!liveDocument() || !CHAPTER_MODELS[chapter]) return;
  if (modelView) setPerspective(chapter, modelView); else if (view) setPerspective(chapter, null);
}
// The saved perspective the address keeps while it is the chapter's current view, so a reload lands on it.
export function modelViewInAddress(chapter) { if (!liveDocument()) return null; const id = perspectiveOf(chapter); return id && id !== 'new' ? id : null; }
if (liveDocument()) { const q = new URLSearchParams(location.search); routeModel({chapter: Number(q.get('chapter')), object: q.get('object') || q.get('focus') || q.get('artefact') || q.get('driver') || q.get('decision') || null, model: q.get('model') || null, modelView: q.get('modelView') || null, explore: !!q.get('explore')}); }
// Another project opened in place (round 4, A): the chapter models, a perspective and Validate are left, and what this
// module kept for the project on screen goes with it — the selection it last opened a model on, a Sol mount still waiting
// for its module, the trace it last brought into view, a design-task workspace it created, the object and view an
// address handed over and not yet taken (the shell hands over the new project's own), the perspectives the chapters
// showed (the new project's own are read from this browser), and the first address's Validate request, which named
// that project's records. Each chapter-model view module, the perspective view and each notation picture resets its
// own view state on this same event (onProjectSwitch, project-context.js).
onProjectSwitch(() => {
  if (liveDocument()) { leaveChapterModels(); validateModule?.leaveValidate(); document.body.classList.remove('cm-active', 'cm-expanded'); }
  lastModelSelection = null; brainPending = null; lastSimulation = ''; validateAsked = null;guidanceContext=null;
  disposeDesignTasks();
  pendingRoute = null; perspectives = null;
});
if (liveDocument()) window.aiwChapterModels = {has: chapter => !!CHAPTER_MODELS[chapter], takeView(chapter) { if (pendingRoute?.model && pendingRoute.chapter === Number(chapter)) { const v = pendingRoute.model; pendingRoute.model = null; return v; } return null; }, takeLink(chapter) { if (pendingRoute?.object && pendingRoute.chapter === Number(chapter)) { const id = pendingRoute.object; pendingRoute.object = null; return resolveRecordRef(currentProject(), id, {chapter}) || id; } return null; }}; // rc41 W3: the object may be a reference (LR-002); the chapter model gets the id
export function refineWorkspace(tab, selection) {
  if(selection){guidanceContext={projectId:currentProject()?.id,selection:{...selection},tab};scheduleWorkspaceKnowledge();}
  if (tab === 'model') lastModelSelection = selection || lastModelSelection;
  refineWorkspaceSurface(tab, selection);
  syncValidate(tab, selection);
}
function refineWorkspaceSurface(tab, selection) {
  document.body.dataset.workspaceTab = tab;
  if(tab!=='model'&&liveDocument())leaveChapterModels();
  refineRail();refineModules(selection);refineLensPosition();refinePanelToggle(tab,selection);refineProject();refineInspectorSubject(tab,selection);
  if(selection)mountChapterHeader(currentProject(),selection,tab);
  if(selection)mountBrainContext(currentProject(),selection,tab);
  if(selection)mountJourneyContext(currentProject(),selection);
  showSaveStatus(window.aiwProjectStore?.status||'saved');
  const tip = document.querySelector('#cursor-tip'); tip?.setAttribute('role', 'tooltip');
  const assistance = document.querySelector('.r-assistant-bar, .l-assistance');
  if (assistance) {
    for (const button of assistance.querySelectorAll('button')) {
      if (button.querySelector('.ux-assist-role')) continue;
      const label = button.textContent.trim();
      if (button.matches('[data-action="cursor"],[data-r-action="cursor"]')) {
        // Hover help is the deterministic annotation toggle, distinct from asking Sol to explain a record.
        const state = button.querySelector('.ux-toggle-state'), on = button.getAttribute('aria-pressed') === 'true';
        if (state && !button.querySelector('.ux-toggle-label')) { const svg = button.querySelector('svg'); button.textContent = ''; if (svg) button.append(svg); const label = document.createElement('span'); label.className = 'ux-toggle-label'; label.textContent = 'Hover help'; button.append(label, state); }
        button.title = 'Hover help: a short explanation of an object when you hover over it or focus it. Select the object to pin its details. No model is called. ' + (on ? 'On.' : 'Off.'); button.setAttribute('aria-label', 'Hover help, ' + (on ? 'on' : 'off'));
        continue;
      }
      const role = ['Sol','Ask Sol'].includes(label) ? 'Ask' : label === 'Co-design' ? 'Develop' : null;
      if (!role) continue;
      const note = document.createElement('small'); note.className = 'ux-assist-role'; note.textContent = role; note.setAttribute('aria-hidden', 'true'); button.append(note);
      button.title = role === 'Ask' ? 'Explain and challenge the current chapter, tab and selected record' : 'Understand this step, compare options and develop editable proposals';
    }
  }
  if (tab !== 'model') { lastSimulation = ''; return; }
  // The Model tab is the chapter's own models, mounted into the host app.js renders (audit F-02). A trace or failure
  // lab that has just opened below it is brought into view once.
  const simulation = document.querySelector('#flow-panel .i-probe-head, #flow-panel .sec-lab-head, #flow-panel .rt-lab-head');
  const simulationKey = simulation?.textContent || '';
  if (simulationKey && !lastSimulation) document.querySelector('#flow-panel').scrollIntoView({block:'start', behavior:'auto'});
  lastSimulation = simulationKey;
  if (!syncChapterModel(tab, selection)) document.body.classList.remove('cm-active');
}

// The lens position menu, and Escape closing it or the phone's chapter drawer.
if(typeof document!=='undefined'){
  document.addEventListener('click',event=>{
    for(const menu of document.querySelectorAll('.chapter-tools[open]'))if(!menu.contains(event.target))menu.open=false;
    const resource=event.target.closest('[data-resource-open]');
    if(resource){event.preventDefault();event.stopImmediatePropagation();const view=resource.dataset.resourceOpen;const rail=resource.closest('.journey-rail');if(rail?.classList.contains('open'))rail.querySelector('.rail-close')?.click();import('./design-resources-ui.js').then(m=>m.openDesignResources(view)).catch(e=>reportLoadFailure('the design resources',e));return;}
    const panelToggle=event.target.closest('[data-panel-toggle]');
    // An unavailable toggle (the focused case holds the full width) stays focusable to say why, and does nothing.
    if(panelToggle?.getAttribute('aria-disabled')==='true'){event.preventDefault();return;}
    if(panelToggle){const collapsed=document.body.dataset.panel!=='collapsed';if(!collapsed)rememberDetailsOrigin();toggleDetails(collapsed);if(collapsed)focusDetailsOrigin();else panelToggle.focus({preventScroll:true});return;}
    const placement=event.target.closest('button[data-lens-position]');
    if(placement){
      const chapter=Number(new URLSearchParams(location.search).get('chapter')||1);
      try{const preferences=JSON.parse(localStorage.getItem('aiw-lens-position-v1')||'{}');preferences[chapter]=placement.dataset.lensPosition;localStorage.setItem('aiw-lens-position-v1',JSON.stringify(preferences))}catch{/* storage unavailable: the lens position is not kept */}
      document.body.dataset.lensPosition=placement.dataset.lensPosition;
      document.querySelectorAll('button[data-lens-position]').forEach(b=>b.setAttribute('aria-pressed',String(b===placement)));
      const menu=placement.closest('.lens-options');menu.open=false;menu.querySelector('summary').focus({preventScroll:true});
      window.dispatchEvent(new Event('resize'));return;
    }
    for(const menu of document.querySelectorAll('.lens-options[open]'))if(!menu.contains(event.target))menu.open=false;
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!document.querySelector('dialog[open],[role=dialog][aria-modal=true]')){
      const tools=document.querySelector('.chapter-tools[open]');if(tools){tools.open=false;tools.querySelector('summary')?.focus();return;}
      if(document.body.dataset.panel==='open'&&!detailsColumnFits()){toggleDetails(true);focusDetailsOrigin();return;}
      const layout=document.querySelector('.lens-options[open]');if(layout){layout.open=false;layout.querySelector('summary').focus();return;}
      document.querySelector('.journey-rail.open .rail-close')?.click();
    }
  });
}

function refineProject(){
  const p=currentProject();if(!p)return;
  const place=new URLSearchParams(location.search).get('chapter'),surface={work:'Work',model:'Model',validate:'Validate',output:'Output'}[document.body.dataset.workspaceTab];
  document.title=(place?'Ch '+place+(surface?' '+surface:'')+' · ':'')+p.name+' · AIW V5';
  const card=document.querySelector('.project-card,.r-project');
  if(card&&!card.querySelector('.rail-project-tools')){
    const initials=p.name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
    card.innerHTML=`<header class="rail-project-heading"><span>Project</span><a href="/?view=projects" aria-label="All projects" title="All projects">All projects <span aria-hidden="true">↗</span></a></header><a class="project-switch" href="/?view=projects" aria-label="${railEscape(p.name)} · switch or create a project"><span class="project-mark" aria-hidden="true">${railEscape(initials)}</span><span class="project-identity"><strong>${railEscape(p.name)}</strong><small>${p.workspace?.template==='blank'?'Working project':p.workspace?.reference?.drafted?'Reference · drafted from its brief · confirm before use':'Reference · Confirm before use'}</small></span></a><div class="rail-project-tools" role="group" aria-label="Project resources"></div>`;
  }
  const crumb=document.querySelector('.r-breadcrumb,.breadcrumb'),chapter=new URLSearchParams(location.search).get('chapter')||1;
  if(crumb?.querySelector('#yah-text')){const project=crumb.querySelector('.breadcrumb-project');if(project)project.textContent=p.name;}else if(crumb)crumb.innerHTML=railEscape(p.name)+' <span>/</span> Chapter '+String(chapter).padStart(2,'0');
  if(p.workspace?.template&&p.workspace.template!=='bank-payment'){
    const title=document.querySelector('.model-title');if(title)title.textContent=p.name+' architecture';
    const footer=document.querySelector('.footer>span');if(footer)footer.textContent='AIW V5 · '+p.name+' · Working architecture, pending review';
  }
  scopeProjectLinks();recordProjectLocation();
  mountChangeReview(p);mountEvidenceWorkspace(p);
}
