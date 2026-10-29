import {createProjectStore} from './project-store.js';
// Unexpected errors and lost connections are told to the person, once, instead of only to the console (audit F-12).
const notice=(message,ms=6000)=>{const t=document.querySelector('#toast');if(!t)return;t.textContent=message;t.classList.add('visible');clearTimeout(notice.timer);notice.timer=setTimeout(()=>t.classList.remove('visible'),ms);};
let problems=0;const problem=()=>{if(problems++<3)notice('Something on this page did not work as expected. Reload the page if it looks wrong; saved changes stay saved.');};
window.addEventListener('error',problem);window.addEventListener('unhandledrejection',problem);
window.addEventListener('offline',()=>notice('You are offline. Changes cannot be saved until the connection returns.',15000));
window.addEventListener('online',()=>notice('Back online.'));
// A module reports a failed background request or load through project-context.js reportFailure (audit F2-15).
window.addEventListener('aiw:notice',e=>{const m=e.detail?.message,ms=Number(e.detail?.ms);if(typeof m==='string'&&m)notice(m,ms>0?ms:/did not load/.test(m)?12000:6000);});
const params=new URLSearchParams(location.search),chapter=Number(params.get('chapter')||1);
if(params.get('view')==='projects')await import('./projects.js');
else{
  // One shell for the eleven chapters (round 3, A): every chapter opens app.js, so moving between chapters never
  // reloads the page. The Projects page is the one other route. Sol's panel (brain-context-ui.js and the modules only it
  // needs) is preloaded here, since the shell's first render mounts it. The 1.5 MB pattern catalogue is a lazily loaded
  // store (catalogue-store.js, round 2 I2-20): no page loads it to open; Sol's panel and the knowledge view fetch it when
  // they open, and receipts and passage suggestions read the small index (catalogue-index.js). The page says what it is
  // doing while the project opens, the studios load in parallel once it has, and a failure names its cause and offers a
  // retry (audit F-11). The Chapter 4–11 studios are created here; the Chapter 1–3 studios are created by the shell on
  // first use, from the factories handed over below.
  const app=document.querySelector('#app');
  app.innerHTML='<main class="r-loading" aria-busy="true"><p class="r-kicker">AIW V5 / Private project</p><h1>Opening your architecture workspace.</h1><p>Opening the saved project…</p></main>';
  const store=createProjectStore();
  let failure=null;
  try{const [,{logicalGraph,brainCursorText,designRecordContext,designRecordExplanation,disposeDesignTasks,createDeferredExchangeTaskWorkspace}]=await Promise.all([store.load(),import('./workspace-ux.js').then(async m=>{await m.brainReady();return m;})]);
    const [{createLogicalStudio},{createRealisationStudio},{createTechnologyStudio},{createTechnologyRealisationStudio},{createInterfacesStudio},{createSecurityStudio},{createRuntimeStudio},{createReviewStudio},{createRequirementsStudio},{createQualityStudio},{createDecisionsStudio}]=await Promise.all([import('./logical-ui.js'),import('./realisation-ui.js'),import('./technology-ui.js'),import('./technology-realisation-ui.js'),import('./interfaces-ui.js'),import('./security-ui.js'),import('./runtime-ui.js'),import('./review-ui.js'),import('./requirements.js'),import('./quality.js'),import('./decisions.js')]);
    // One project's studios (round 4, A: a project opened in place gets its own set): the Chapter 4–11 studios behind
    // one object with their design, exchange and protection tasks, and the Chapter 1–3 studio factories, all reading the
    // store. The shell (app.js) disposes a set — every listener, dialog and task it holds — before the store adopts
    // another project, and opens the next set through window.aiwOpenStudios.
    const openStudios=()=>{
    const logical=createLogicalStudio(store),realisation=createRealisationStudio(store),technology=createTechnologyStudio(store),technologyRealisation=createTechnologyRealisationStudio(store),interfaces=createInterfacesStudio(store),security=createSecurityStudio(store),runtime=createRuntimeStudio(store),review=createReviewStudio(store);let bridge,readingSaved=false;const exchanges=createDeferredExchangeTaskWorkspace({store,bridge:()=>bridge,openSol:()=>interfaces.assistant('sol')});
    const studios=[logical,realisation,technology,technologyRealisation,interfaces,security,runtime,review],tasks=[exchanges];
    window.aiwEditModelProposal=c=>({'logical.responsibility':logical,'realisation.component':realisation,'technology.capability':technology,'techrealisation.plan':technologyRealisation}[c.type])?.editImpact(c);
    const chapterStudios=new Proxy({bind(b){bridge=b;for(const x of studios)x.bind(b)},securitySol(){return security.assistant('sol')},designSol(){return logical.assistant('sol')},dispose(){disposeDesignTasks();window.aiwSecurityTask?.dispose();for(const x of [...tasks,...studios])x.dispose()}},{get(target,key){if(key==='bind'||key==='dispose'||key==='securitySol'||key==='designSol')return target[key];if(key==='busy')return !!window.aiwSecurityTask?.busy||exchanges.busy||!!window.aiwDesignTasks?.busy||!!window.aiwInterfaceImpact?.busy||studios.some(x=>x.busy);const active=(bridge?.state.chapter||chapter)===11?review:(bridge?.state.chapter||chapter)===10?runtime:(bridge?.state.chapter||chapter)===9?security:(bridge?.state.chapter||chapter)===8?interfaces:(bridge?.state.chapter||chapter)===7?technologyRealisation:(bridge?.state.chapter||chapter)===6?technology:(bridge?.state.chapter||chapter)===5?realisation:logical;const impact=window.aiwInterfaceImpact,here=bridge?.state.chapter||chapter,show=impact?.previewInChapter(here)&&here!==8;if(show&&key==='graph')return ()=>readingSaved?logicalGraph(store.value.document):impact.decorate(logicalGraph(impact.document));if(show&&key==='inspector')return (...args)=>{const context=impact.objectContext(bridge.getNode(bridge.state.selected));let saved;readingSaved=true;try{saved=active.inspector(...args)}finally{readingSaved=false}return context+'<details class="ip-saved-context"><summary>Saved definition & chapter tools</summary>'+saved+'</details>';};if(show&&key==='tip')return n=>impact.explanation(n)||active.tip(n);if(show&&key==='assistant')return kind=>kind==='sol'?impact.open():active.assistant(kind);if(key==='inspector')return (...args)=>active.inspector(...args)+designRecordContext(store.value.document,bridge.state.selected);if(key==='tip')return n=>active.tip(n)+designRecordExplanation(store.value.document,n.id)+brainCursorText(store.value.document,n.id);const value=active[key];return typeof value==='function'?value.bind(active):value}});
    // Chapters 1–3: the factories of their studios, which the shell calls the first time each chapter opens (app.js).
    return {chapter:chapterStudios,foundation:{1:()=>createRequirementsStudio(store),2:()=>createQualityStudio(store),3:()=>createDecisionsStudio(store)}};
    };
    const first=openStudios();window.aiwLogicalStudio=first.chapter;window.aiwFoundationStudios=first.foundation;window.aiwOpenStudios=openStudios;
  }catch(error){failure=error}
  if(failure){
    // A failed module load reads as a browser message; say what it means instead.
    const cause=/dynamically imported module|module script failed|error loading/i.test(failure?.message||'')?'Part of the workbench could not load. Check your connection and try again.':failure?.message||'Reconnect and try again to continue modelling.';
    app.innerHTML='<main class="r-loading"><h1>Your saved project could not be opened.</h1><p></p><button id="retry-project" class="r-btn primary">Try again</button></main>';
    app.querySelector('p').textContent=cause;app.querySelector('#retry-project').addEventListener('click',()=>location.reload());app.querySelector('#retry-project').focus();
  }else await import('./app.js');
}
