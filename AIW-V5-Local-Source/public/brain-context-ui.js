import {caseGuidance} from './case-guidance.js';
import {chapterGuide} from './chapter-guide.js';
import {captureCompanionDrafts,restoreCompanionDrafts} from './companion-drafts.js';
import {capturePanelPlace,restorePanelPlace,mountPanelResize} from './brain-panel-state.js';
import {workbenchHTML,mountWorkbench} from './workbench-ui.js';
import {guideHTML,threadHTML,mountGuide} from './chapter-guide-ui.js';
import {assuranceHTML,mountAssurance,focusVerificationCheck} from './assurance-ui.js';
import {verificationContext} from './architecture-verification.js';
import {solOverlay,solChapterBind,solChapterMount,refreshModelIntelligence} from './chapter-sol.js';
import {isQualityDriver} from './quality-domain.js';
import {registerAssistantSurface} from './assistant-surface.js';
import {intelligenceSection,mountIntelligence,intelligenceBasis,intelligenceGenerationHTML,intelligenceSourceReviewHTML,exploreKnowledgeQuestion,applyCoDesignPrompt} from './intelligence-ui.js';
import {coDesignGuideHTML,mountCoDesignGuide} from './co-design-guide.js';
import {brainContext,brainNotes,brainNote,noteCurrent} from './aiw-brain.js';
import {chapterSubject,homeChapter,findRecord,refOf} from './chapter-reasoning.js';
import {chapterBrief,briefHTML} from './chapter-brief.js';
import {solStatusLine,solLoad,solStatus,solVerify,reviewSectionHTML} from './brain-reasoning-ui.js';
import {journeyChapters,journeyObjectURL} from './journey-context.js';
import {projectURL,projectPreferenceKey,currentProject as project,reportFailure,onProjectSwitch,shellScopeId} from './project-context.js';
import {designTasksReady,securityTasksReady} from './workspace-ux.js';
import {knowledgeHTML,contextSketch,mindRelevanceHTML,adoptionStatisticsHTML} from './knowledge-ui.js';
import {esc} from './html-escape.js';
import {proposalsSlot,mountProposals} from './coauthor-ui.js';
import {timeHTML} from './format.js';
import {catalogue,catalogueLoaded,loadCatalogue} from './catalogue-store.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {intelligenceActionHTML,intelligenceSourcesHTML,intelligenceAuthority,intelligenceFieldTarget} from './chapter-insight.js';
import {validationIntelligenceSubject} from './validation-workspace.js';
import {outputIntelligenceSubject} from './output-workspace.js';

const B=(action,label,cls='',attrs='')=>`<button type="button" class="btn ${cls}" data-brain-action="${action}" ${attrs}>${label}</button>`;
const icon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 6.4L21 12l-6.4 2.6L12 21l-2.6-6.4L3 12l6.4-2.6Z"/></svg>';
const listIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>';
let selection=null,current=null,panel=null,mode='design',open=false,noteId='',title='',body='',reviewer='',reason='',dirty=false,busy=false,error='',review=false,conflict=false,loadedRevision=0,nativeClick=false,returnFocus=null,pending=null,restored=false,refreshing=false;
// Sol's subject against the studio's selection (round 2, I2-01): the studio carries one selection across chapters;
// Sol speaks about this chapter's own record unless the architect pinned another, by selecting it here.
let studioSelection=null,pinnedId=null,carried=null,lastChapter=null,lastStudioSelection=null;
// Comparison editors load at their existing entry point. The shared reasoning,
// validation and receipts remain available to every chapter before an editor opens.
let architectureModule=null,architectureLoading=null,architectureFailure='',architectureContext=null;
const architectureActive=()=>architectureModule?.architectureActive()||false;
const architectureEditing=()=>architectureModule?.architectureEditing()||false;
const guardArchitecture=fn=>architectureModule?.guardArchitecture(fn)||false;
function architectureWorkspace(p,c){
 if(architectureModule)return architectureModule.architectureWorkspace(p,c);
 return `<div data-architecture-loading><p class="brain-note" role="status">${esc(architectureFailure||'Open this section to explore architecture choices in the selected context.')}</p>${architectureFailure?'<button type="button" class="btn" data-architecture-load>Retry loading comparison tools</button>':''}</div>`;
}
function mountArchitecture(p,c,hooks){
 architectureContext={projectId:p.id,c,hooks};
 if(architectureModule){architectureModule.mountArchitecture(p,c,hooks);return;}
 window.aiwArchitectureTask={openConcern:(topic,focusDriverId)=>change(()=>loadArchitecture('openConcern',[topic,focusDriverId])),openTask:id=>change(()=>loadArchitecture('openTask',[id])),openChoices:after=>change(()=>after?.()),currentId:null,busy:false};
}
function loadArchitecture(method,args=[]){
 const requested=architectureContext;if(!requested)return Promise.resolve();
 if(!architectureModule&&!architectureLoading){
  architectureFailure='';const slot=panel?.querySelector('[data-architecture-loading]');if(slot)slot.innerHTML='<p class="brain-note" role="status">Loading comparison tools…</p>';
  architectureLoading=import('./architecture-task-ui.js').then(m=>{architectureModule=m;return m;}).catch(error=>{architectureFailure='The comparison tools could not load. Your saved design is still available.';const slot=panel?.querySelector('[data-architecture-loading]');if(slot&&project()?.id===requested.projectId)slot.outerHTML=architectureWorkspace(project(),current);reportFailure(architectureFailure,error);throw error;}).finally(()=>{architectureLoading=null;});
 }
 return (architectureModule?Promise.resolve(architectureModule):architectureLoading).then(m=>{
  const latest=architectureContext;if(!latest||project()?.id!==requested.projectId||latest.projectId!==requested.projectId)return;
  m.mountArchitecture(project(),latest.c,latest.hooks);
  const slot=panel?.querySelector('[data-architecture-loading]');if(slot)slot.outerHTML=m.architectureWorkspace(project(),latest.c);
  if(method&&latest.c.selected.id===requested.c.selected.id&&latest.c.chapter===requested.c.chapter&&latest.c.tab===requested.c.tab)window.aiwArchitectureTask?.[method]?.(...args);
 }).catch(()=>{});
}
function mountArchitectureReading(){const el=panel?.querySelector('.brain-choices');if(!el||el.dataset.architectureMounted)return;el.dataset.architectureMounted='1';const load=()=>{if(el.open&&!architectureModule)loadArchitecture();};el.addEventListener('toggle',load);load();}
// The complete repository editor is opened inside the existing knowledge
// disclosure. Contextual questions use the lightweight shared reading above.
let knowledgeModule=null,knowledgeLoading=null,knowledgeFailure='',knowledgeContext=null;
const knowledgeEditing=()=>knowledgeModule?.knowledgeEditing()||false;
const guardKnowledge=fn=>knowledgeModule?.guardKnowledge(fn)||false;
function knowledgeWorkspace(p,c,options={}){
 if(knowledgeModule)return knowledgeModule.knowledgeWorkspace(p,c,options);
 return `<div data-knowledge-loading${options.compact?' data-knowledge-compact="true"':''}><p class="brain-note" role="status">${esc(knowledgeFailure||'Source records, releases and review tools load when you open this section.')}</p>${knowledgeFailure||options.compact?B('load-knowledge',knowledgeFailure?'Retry loading the repository':'Explore related architecture'):''}</div>`;
}
function mountKnowledge(p,c,hooks){
 knowledgeContext={projectId:p.id,c,hooks};
 if(knowledgeModule){knowledgeModule.mountKnowledge(p,c,hooks);return;}
 window.aiwKnowledge=Object.fromEntries(['open','openView','openReference','start','compareProducts','redraw'].map(method=>[method,(...args)=>change(()=>{knowledgeContext.hooks.open();loadKnowledge(method,args);})]));
}
function loadKnowledge(method,args=[]){
 const requested=knowledgeContext;if(!requested)return Promise.resolve();
 if(!knowledgeLoading&&!knowledgeModule){
  knowledgeFailure='';const slot=panel?.querySelector('[data-knowledge-loading]');if(slot)slot.innerHTML='<p class="brain-note" role="status">Loading source records and review tools…</p>';
  knowledgeLoading=import('./knowledge-workspace-ui.js').then(m=>{knowledgeModule=m;return m;}).catch(error=>{knowledgeFailure='The repository tools could not load. Your saved design and contextual guidance remain available.';const slot=panel?.querySelector('[data-knowledge-loading]');if(slot)slot.outerHTML=knowledgeWorkspace(project(),current);reportFailure(knowledgeFailure,error);throw error;}).finally(()=>{knowledgeLoading=null;});
 }
 return (knowledgeModule?Promise.resolve(knowledgeModule):knowledgeLoading).then(m=>{
  const latest=knowledgeContext;if(project()?.id!==requested.projectId||latest?.projectId!==requested.projectId)return;
  m.mountKnowledge(project(),latest.c,latest.hooks);
  const slot=panel?.querySelector('[data-knowledge-loading]');if(slot)slot.outerHTML=m.knowledgeWorkspace(project(),latest.c,{compact:slot.dataset.knowledgeCompact==='true'});
  if(method&&current?.selected.id===requested.c.selected.id){
   if(method==='openReference'&&typeof args[1]==='function'&&!args[1]()){reportFailure('This source guidance changed while its reader loaded. Review its current basis before continuing.');return;}
   window.aiwKnowledge?.[method]?.(...args);
  }
 }).catch(()=>{});
}
function mountKnowledgeReading(){const el=panel?.querySelector('.brain-exploration');if(!el||el.dataset.knowledgeMounted)return;el.dataset.knowledgeMounted='1';const load=()=>{if(el.open&&!knowledgeModule)loadKnowledge();};el.addEventListener('toggle',load);load();}
// A route's task or alternative (?task=, ?designRequirement=, ?alternative=) is opened once per page load.
let routeHandled=false;
// One label per band (round 2, I2-04): what came from a rule, what Sol said, what the chapter offers.
const band=(key,label,note,body)=>String(body||'').trim()?`<section class="brain-band brain-band-${key}" aria-label="${esc(label)}"><p class="brain-band-label"><b>${esc(label)}</b><small>${esc(note)}</small></p>${body}</section>`:'';
const refText=(p,id)=>{const r=findRecord(p,id)?.record;return r?refOf(r):id;};
function subjectLine(c){
 const p=project(),chapter=Number(c.chapter);
 if(carried&&carried.id!==c.selected.id)return `<small class="brain-carried" data-brain-carried="${esc(carried.id)}">Selected in the studio: ${esc(refText(p,carried.id))}${carried.chapter?` (Chapter ${esc(carried.chapter)})`:''}. Sol speaks about Chapter ${esc(chapter)}’s own record here. <button type="button" class="text-button" data-brain-action="pin" data-id="${esc(carried.id)}">Ask about ${esc(findRecord(p,carried.id)?.record?.ref||carried.id)} instead</button></small>`;
 const home=pinnedId?homeChapter(p,pinnedId):null;
 if(pinnedId&&home&&home!==chapter)return `<small class="brain-carried" data-brain-pinned="${esc(pinnedId)}">Pinned: a Chapter ${esc(home)} record, read as Chapter ${esc(home)} reads it, on a Chapter ${esc(chapter)} page. <button type="button" class="text-button" data-brain-action="unpin">Back to Chapter ${esc(chapter)}’s own record</button></small>`;
 return '';
}
const nativeViews=new Map();
const contextKey=c=>[c.chapter,c.tab,c.selected.id,c.stamp].join(':');
const note=()=>brainNote(project(),noteId);
const pref=()=>projectPreferenceKey('brain-assistance');
function remember(){try{localStorage.setItem(pref(),JSON.stringify({open,mode,noteId}));}catch{/* storage unavailable: the panel state is not kept */}}
function syncLaunchState(){document.querySelectorAll('[data-workspace-sol],.brain-assistance [data-brain-launch],.brain-model-bar [data-brain-launch],.brain-assistance [data-brain-action="author"]').forEach(b=>{b.setAttribute('aria-controls','brain-panel');b.setAttribute('aria-expanded',String(open&&(b.dataset.brainLaunch||b.dataset.brainAction)===(mode==='author'?'design':mode)));});}
const objectLink=n=>`<a href="${projectURL(journeyObjectURL(n))}"><span>${esc(n.ref||n.id)}</span>${esc(n.title)}</a>`;
function relatedContext(c){return `<details class="brain-basis"><summary>What AIW is using <span>${c.requirements.length+c.drivers.length+c.decisions.length} linked records</span></summary>${[['Requirements',c.requirements],['Architectural drivers',c.drivers],['Decisions',c.decisions]].map(([label,items])=>`<h4>${label}</h4><div class="brain-record-links">${items.map(objectLink).join('')||'<p>None linked to this object.</p>'}</div>`).join('')}${c.sources.length?`<h4>Project sources</h4>${c.sources.map(s=>`<p><b>${esc(s.id+' · '+s.title)}</b><br>Revision ${s.revision} · ${esc(s.location||'Location not recorded')}</p>`).join('')}`:''}${c.intelligence?.sources?.length?`<h4>Architecture knowledge in this reading</h4>${intelligenceSourcesHTML(c.intelligence,null,{projectId:project().id})}`:''}<p class="brain-note">${esc(c.status)}. Recorded relationships express design intent; verification evidence remains separate.</p></details>`;}
function nativeView(c,kind){if(document.body.classList.contains('cm-active'))return ''; const saved=nativeViews.get(kind);return saved?.key===contextKey(c)?`<section class="brain-native" data-native-kind="${esc(kind)}">${saved.body}<span role="alert" hidden></span></section>`:'';}
// Sol's own action on a record: its explanation for the SDD. Design tasks to start or continue are rows in Proposals.
function designActions(c){
 return `${c.selected.id!=='project'?`<section class="brain-collaborate"><h3>${c.tab==='output'?'Explain the design':'Explain this record'}</h3><div class="brain-actions">${B('author',c.tab==='output'?'Write this explanation':'Explain this in the SDD')}</div></section>`:''}<p class="brain-note" data-brain-proposals-pointer>Develop the next design step, compare possibilities and work through open questions in ${B('mind','Co-design','text-button')}.</p>`;
}
function caseGuidanceHTML(c,compact=false){
 const g=caseGuidance(project(),c);if(!g)return '';
 const html=`<section class="brain-case-guide" aria-label="Active architecture case"><p class="brain-eyebrow">Architecture case · ${esc(g.requirementId)}</p>${g.cases.map(scope=>`<h3>${esc(scope.title)}</h3><p>${esc(scope.purpose)}</p>`).join('')}<div class="brain-case-path" aria-label="Connected chapters">${g.stages.map(s=>`<a href="${projectURL(s.objects[0]?.url||'/?chapter='+s.chapter+'&tab=work')}" class="${s.objects.length?'has-objects':''}" title="Chapter ${esc(s.chapter)}: ${s.objects.length} connected objects">${String(s.chapter).padStart(2,'0')}</a>`).join('')}<a href="${projectURL('/?chapter=11&tab=work')}">11</a></div><small>Connected objects, including drafts · each link needs review</small><div class="brain-case-next"><strong>${esc(g.next.title)}</strong><p>${esc(g.next.detail)}</p>${g.next.taskId?B('task','Continue the task','',`data-task-id="${esc(g.next.taskId)}"`):`<a class="btn" href="${projectURL(g.next.url)}">Continue in chapter ${esc(g.next.chapter)} →</a>`}</div></section>`;
 return compact?`<details class="brain-basis"><summary>Case · ${esc(g.cases.map(s=>s.title).join(', '))}</summary>${html}</details>`:html;
}
function designView(c){
 const p=project(),g=chapterGuide(p,c.chapter,c.selected.id==='project'?null:c.selected.id),focused=!!g.creation||!!g.question||!!g.session?.pending;
 const tools=`${nativeView(c,'sol')}${designActions(c)}${workbenchHTML(p,c,'design')}${assuranceHTML(p,c)}`;
 let brief='';try{brief=briefHTML(p,chapterBrief(p,c.chapter,c.tab,c.selected.id==='project'?null:c.selected.id));}catch(e){brief='';console.warn('The chapter brief could not be read.',e?.message);}
 return band('sol','Your question & Sol’s response',solStatusLine({short:true}),`<div data-brain-intelligence></div>${solOverlay(p,c.chapter,c.selected.id)}`)
  +`<section class="brain-band-project brain-chapter-reading" data-brain-chapter-reading aria-label="From your project"><p class="brain-band-label"><b>From your project</b><small>Chapter ${esc(c.chapter)} · recorded project reading · rule-based · each item names its rule · no model consulted</small></p>${brief}<details class="brain-basis brain-project-guidance" data-brain-guidance><summary>Guidance, connected records and the design path</summary>${caseGuidanceHTML(c)}${guideHTML(p,c)}${contextSketch(c)}</details></section>`
  +`<section class="brain-chapter-review" aria-label="Chapter review">${reviewSectionHTML(p,c.chapter,{findings:false,base:'btn'})}</section>`
  +band('tools','Chapter tools','continue working · the chapter’s own actions, source material and earlier work',`${focused?`<details class="brain-basis"><summary>Chapter tools and earlier work</summary>${tools}</details>`:tools}${knowledgeWorkspace(p,c,{compact:true})}${threadHTML(p,c)}${relatedContext(c)}`);
}

// The guided comparison of architecture choices opens on its generic composition sketch, the same for every record;
// until a comparison is under way it waits behind one line, below what Proposals → Explore found for this record (I2-06).
// How thin the retrieval for this subject was, in one line (round 2, I2-07): word overlap, not meaning, and never a score.
function retrievalLine(c){const t=c?.governed?.trace,I=c?.intelligence;if(!t||c.selected.id==='project')return '';return `<p class="brain-note" data-brain-retrieval>Retrieved for ${esc(c.selected.ref||c.selected.id)}: ${esc(t.kept)} descriptive catalogue records and ${esc(t.claimsKept)} eligible released claims. ${I?esc(I.insights.length)+' contextual questions and considerations; recorded conditions and source authority remain visible in each reading.':esc((c.knowledge||[]).length)+' retrieved considerations.'}${I&&!I.coverage.catalogueLoaded?' Architecture knowledge has not loaded; open Co-design to retry.':''}${t.claimsConsidered?'':' No reviewed claims in scope; inspect Sources and Releases.'}</p>`;}
function choicesHTML(c){const html=architectureWorkspace(project(),c);return html?`<details class="brain-basis brain-choices"><summary>Compare architecture choices · a guided comparison</summary>${html}</details>`:'';}
// Proposals (round 5, R5-E): the panel that was Mind Factory. One list of what could go into the design for this chapter
// and selection, every row with its source and where it would go (coauthor-ui.js draws it); below it, what to explore —
// the retrieved concepts, the chapter's own explorations, the knowledge workspace, the comparisons — as before. The rows
// this panel reads from its own context are the chapter's rule proposals, the knowledge rules that fired and the design
// tasks; each row's Accept is the very control its own surface used (the chapter's preview, the task's start).
let proposalRows=[];
const OPEN_TASK=t=>!['applied','dismissed'].includes(t.status);
// The chapter's own rule proposals (its patterns, each with the chapter's preview button) become rows; the rest of what
// the chapter shows stays under Explore.
function nativeParts(c){
 if(document.body.classList.contains('cm-active'))return {rows:[],html:''};
 const saved=nativeViews.get('mind');if(saved?.key!==contextKey(c))return {rows:[],html:''};
 const t=document.createElement('template');t.innerHTML=saved.body;const rows=[];
 for(const a of t.content.querySelectorAll('.r-pattern,.d-pattern,.l-pattern')){
  const b=a.querySelector('button.gold');if(!b)continue;
  const why=[...a.querySelectorAll(':scope>p')].map(x=>x.textContent.trim()).filter(Boolean).join(' '),key=[...b.attributes].filter(x=>x.name.startsWith('data-')).map(x=>x.name.slice(5)+'-'+x.value).join('-');
  b.title=b.textContent.trim()+': the chapter’s own editable preview; nothing is saved until you apply it there';b.className='btn primary';b.textContent='Preview draft';
  rows.push({id:'rule-'+key,source:'rule',what:a.querySelector('h3')?.textContent.trim()||'A rule-based proposal',cite:'Chapter '+c.chapter+' template · rule-based',why,where:`Chapter ${c.chapter} · previewed on the chapter’s model as an editable draft; nothing is saved until you review and apply it there`,accept:`<span data-proposal-native>${b.outerHTML}</span>`,aside:'session'});
  a.remove();
 }
 return {rows,html:`<section class="brain-native" data-native-kind="mind">${t.innerHTML}<span role="alert" hidden></span></section>`};
}
// The knowledge rules that fired for the selected record: a topic to examine with Sol, never a score.
function knowledgeRows(c){
 if(c.selected.id==='project')return [];
 if(c.intelligence)return c.intelligence.insights.filter(i=>i.sourceRefs?.length&&i.actions?.length).map(i=>({id:'knowledge-'+i.id,source:'knowledge',scope:'selected',recordId:c.selected.id,what:i.question||i.title,cite:intelligenceAuthority(i.authority),why:i.detail,where:`${c.selected.ref||c.selected.id} · ${i.actions[0].label||i.actions[0].title}; existing review is required before a model change`,accept:intelligenceActionHTML(c.intelligence,i,i.actions[0],{projectId:project().id,className:'btn primary'}),extra:`<details><summary>Knowledge and conditions</summary>${intelligenceSourcesHTML(c.intelligence,i,{projectId:project().id})}</details>`,aside:'session'}));
 return (c.knowledge||[]).filter(k=>k.record).map(k=>({id:'knowledge-'+k.id,source:'knowledge',what:k.record.name||k.id,cite:k.id+' · knowledge rule',why:k.why,where:`${c.selected.ref||c.selected.id} · a question for Sol about this record, in this panel; nothing is recorded until you act on the answer`,accept:B('knowledge-ask','Ask Sol about it','primary',`data-id="${esc(k.id)}"`),aside:'session'}));
}
// The guided design tasks: saved ones to continue, and the starts the chapter offers.
function taskRows(c){
 const p=project(),rows=[],all=p.coauthoring?.designTasks||[],seen=new Set();
 const resume=(t,accept)=>{if(seen.has(t.id))return;seen.add(t.id);rows.push({id:'task-'+t.id,source:'task',recordId:t.requirementId||t.elementId||t.exchangeId||t.driverId,scope:c.tasks.some(x=>x.id===t.id)&&c.selected.id!=='project'?'selected':'chapter',what:`Continue ${t.id} · ${t.title}`,cite:t.status,why:'A saved design task: its answers and reasoning are kept with the project.',where:'The task’s own guided steps; what it proposes is reviewed before anything is saved',accept,aside:'session'});};
 if(c.chapter===8||c.chapter===9){const kind=c.chapter===8?'exchange':'security',action=c.chapter===8?'exchange':'protection',o=all.filter(t=>t.kind===kind&&OPEN_TASK(t)).at(-1);
  if(o)resume(o,B(action+'-continue','Continue','primary',`data-task-id="${esc(o.id)}"`));
  rows.push({id:'task-'+action,source:'task',recordId:c.selected.id,what:o?(c.chapter===8?'Start another exchange design':'Start another protection design'):(c.chapter===8?'Develop contract & payload':'Develop protection'),why:c.chapter===8?'A guided design of a contract and its payload for the selected exchange.':'A guided design of the protection for the selected element.',where:`Chapter ${c.chapter} · a guided task; its proposals are reviewed before anything is saved`,accept:B(action,'Start','primary'),aside:'session'});}
 for(const t of c.tasks.filter(OPEN_TASK))resume(t,B('task','Continue','primary',`data-task-id="${esc(t.id)}"`));
 if(c.chapter<=7)for(const r of c.requirements.slice(0,3))if(!all.some(t=>!t.kind&&OPEN_TASK(t)&&t.requirementId===r.id))rows.push({id:'task-design-'+r.id,source:'task',recordId:r.id,scope:c.selected.id!=='project'?'selected':'chapter',what:'Develop the connected design from '+r.id,why:`${r.title}: carry it into responsibilities, components, technology and operation, inspecting alternatives and their consequences.`,where:'Chapters 4–7 · a guided design task; its records are reviewed in the model before anything is saved',accept:B('develop','Start','primary',`data-requirement-id="${esc(r.id)}"`),aside:'session'});
 if(c.requirements.length&&c.drivers.length&&!architectureActive())rows.push({id:'task-architecture',source:'task',recordId:c.selected.id,what:'Compare an architectural choice',why:'Compare design approaches, model changes and quality effects in the selected context.',where:'A guided comparison in this panel; nothing changes the model until you apply it',accept:'<button type="button" class="btn primary" data-arc-action="launch">Start</button>',aside:'session'});
 return rows;
}
function designGuide(c){
 return coDesignGuideHTML(c);
}
function mindView(c){
 proposalRows=[];
 if(architectureActive())return `${architectureWorkspace(project(),c)}<details class="brain-basis brain-comparison-assistance" data-arc-assistance><summary>Ask Sol about this comparison</summary><div data-brain-intelligence></div></details>${caseGuidanceHTML(c,true)}`;
 const native=nativeParts(c);proposalRows=[...native.rows,...knowledgeRows(c),...taskRows(c)];
 return `${designGuide(c)}<div data-brain-intelligence></div><details class="brain-basis brain-suggestions" data-brain-suggestions><summary><span>Drafts and suggestions</span><small>Review existing proposals, guided tasks and saved answers for this context</small></summary>${band('proposals','Ready to explore','Every item names its source and destination. Preview a change before saving it in the model.',proposalsSlot(c))}</details>`
  +`<details class="brain-basis brain-exploration"><summary>Knowledge and chapter tools</summary>${band('explore','Explore the design basis','patterns, comparisons and project sources · guidance remains distinct from evidence',`${caseGuidanceHTML(c,true)}${mindRelevanceHTML(project(),c)}${c.chapter<8?choicesHTML(c):contextSketch(c)}${native.html?`<details class="brain-basis" ${c.chapter>=8?'open':''}><summary>${c.chapter>=8?esc(journeyChapters[c.chapter])+' alternatives and tactics':'Chapter explorations'}</summary>${native.html}</details>`:''}${knowledgeWorkspace(project(),c)}${workbenchHTML(project(),c,'mind')}${libraryReadingHTML()}${c.selected.id!=='project'?B('author','Capture this reasoning'):''}${relatedContext(c)}`)}</details>`;
}
// The component library's reading (round 11, workstream F): the catalogue's component archetypes and the organisation's
// component entries, each with "Propose into this project". Read by component-library-ui.js when the section is opened,
// so the panel loads nothing for it until then; proposing takes Chapter 5's reviewed path.
const libraryReadingHTML=()=>`<details class="brain-basis" data-library-reading><summary>The component library</summary><p class="brain-note">Opening the library reading…</p></details>`;
function mountLibraryReading(panel,c){const el=panel.querySelector('[data-library-reading]');if(!el||el.dataset.mounted)return;el.dataset.mounted='1';const load=()=>{if(!el.open||el.dataset.loaded)return;el.dataset.loaded='1';import('./component-library-ui.js').then(m=>m.mountCatalogueReading(el,{chapter:c.chapter})).catch(e=>reportFailure('The component library could not be read. Close and reopen the panel to try again.',e));};el.addEventListener('toggle',load);load();}

function noteSource(n){return `<details class="brain-basis"><summary>Captured source & knowledge</summary><p>${esc(n.context.id)} · Chapter ${esc(n.context.chapter)} · ${noteCurrent(project(),n)?'Current source basis':'Source changed; review required'}</p><p>${esc(n.basis.selected.record.purpose||n.basis.selected.record.description||'')}</p>${n.knowledge.map(knowledgeHTML).join('')}</details>`;}
function authorView(c){
 const n=note(),notes=brainNotes(project()).filter(n=>n.context.id===c.selected.id),all=brainNotes(project());
 if(!n)return `<section class="brain-intent"><p class="brain-eyebrow">Writing with Sol · ${esc(c.selected.ref||c.selected.id)}</p><h3>Give the design its explanation.</h3><p>Prepare an editable passage from the object, its linked requirements, quality targets and decisions. Missing information stays visible.</p>${c.selected.id==='project'?'<p>Select a saved object to draft its explanation. For a new project, capture the first requirement in Work.</p>'+B('native','Open chapter actions'):B('draft','Draft from this object','primary')}</section>${notes.length?`<section class="brain-saved"><h3>Passages for this object</h3>${notes.map(n=>B('load-note',n.id+' · '+n.title,'',`data-note-id="${esc(n.id)}"`)).join('')}</section>`:''}${all.length?`<details class="brain-basis"><summary>All saved passages <span>${all.length}</span></summary>${all.map(n=>B('load-note',n.id+' · '+n.title,'',`data-note-id="${esc(n.id)}"`)).join('')}</details>`:''}${relatedContext(c)}`;
 const current=noteCurrent(project(),n),updated=n.accepted&&(n.accepted.body!==body||n.accepted.title!==title);
 return `<div class="brain-writing-context"><span>${esc(n.id)} · Writing for ${esc(n.context.id)}</span>${B('notes','Other passages')}</div>${current?'':`<section class="brain-source-warning"><h3>The source has changed.</h3><p>Your text is retained. Review the latest object context and revise the passage before including it in the SDD.</p>${B('source-review','Review current sources')}</section>`}${review?`<section class="brain-review"><h3>${updated?'Review the revised passage':'Review before using in the SDD'}</h3>${n.accepted?`<details><summary>Currently included passage</summary><p class="brain-prose">${esc(n.accepted.body)}</p></details>`:''}<h4>${esc(title)}</h4><p class="brain-prose">${esc(body)}</p><label class="brain-field"><span>Author / reviewer</span><input data-brain-field="reviewer" value="${esc(reviewer)}" maxlength="180"></label><label class="brain-field"><span>Why this passage is ready to use</span><textarea data-brain-field="reason" rows="2" maxlength="2000">${esc(reason)}</textarea></label><label class="brain-check"><input type="checkbox" data-brain-confirm> I reviewed the text, source context and open assumptions.</label><div class="brain-actions">${B('edit','Return to editing')}${B('accept','Use in working SDD','primary',!current?'disabled':'')}</div></section>`:`<label class="brain-field"><span>Passage title</span><input data-brain-field="title" value="${esc(title)}" maxlength="180"></label><label class="brain-field"><span>Design explanation</span><textarea class="brain-manuscript" data-brain-field="body" maxlength="16000">${esc(body)}</textarea></label><div class="brain-actions">${B('save','Save draft')}${B('review','Review & use','primary',!current?'disabled':'')}</div><p class="brain-note">${n.accepted?'The accepted passage remains in the SDD while you edit this draft.':'Saved drafts stay private until you choose to include the passage in the working SDD.'}</p>`}${noteSource(n)}${n.accepted?`<details class="brain-basis"><summary>Accepted passage & history</summary><p>${esc(n.accepted.reviewer)} · ${timeHTML(n.accepted.at,{time:false})}</p><p>${esc(n.accepted.reason)}</p><a href="${projectURL('/?chapter=11&tab=output')}">Open the working SDD →</a><details><summary>Remove from working SDD</summary><label class="brain-field"><span>Reason for removal</span><textarea data-brain-withdraw rows="2" maxlength="2000"></textarea></label><label class="brain-check"><input type="checkbox" data-brain-withdraw-confirm> Remove the passage and retain its history.</label>${B('withdraw','Remove accepted passage')}</details></details>`:''}`;
}
// Redrawing the panel replaces what had focus; when the focus was in the panel (or the panel just took it),
// it lands on the panel's title again rather than falling back to the page (audit UX-10).
// Sol's panel shows catalogue concepts: the 1.5 MB catalogue is fetched the first time the panel is open (round 2,
// I2-20), then the context is read again with it and the panel drawn.
let catalogueAsked=false;
function ensureCatalogue(){if(catalogueLoaded()||catalogueAsked)return;catalogueAsked=true;loadCatalogue().then(()=>{if(!panel?.isConnected)return;if(selection)current=brainContext(project(),selection);if(open&&!busy)render();}).catch(e=>{catalogueAsked=false;reportFailure('The pattern catalogue could not load; Sol works without its concepts for now.',e);});}
function panelHeading(c){
 const activeMode=mode==='author'?'design':mode,qualityDrivers=c.drivers.map(d=>d.record||d).filter(isQualityDriver),quality=!qualityDrivers.length?'No linked measurable quality scenario.':qualityDrivers.some(d=>!d.targetConfirmed||d.targetValue===null||d.targetValue===undefined||d.targetValue==='')?'Quality targets missing or unconfirmed.':'Quality targets recorded; measured evidence is separate.';
 return `<header class="brain-header"><div class="brain-identity">${icon}<div><strong id="brain-title" tabindex="-1">Sol</strong><small>Your architecture companion</small></div></div>${B('close','×','icon-only','aria-label="Close assistance"')}</header><nav class="brain-modes" aria-label="Assistance mode">${[['design','Ask Sol','Explain & challenge'],['mind','Co-design','Learn & develop']].map(([key,label,description])=>B(key,`<b>${label}</b><small>${description}</small>`,activeMode===key?'active':'',`aria-pressed="${activeMode===key}"`)).join('')}</nav><div class="brain-location"><span>Chapter ${String(c.chapter).padStart(2,'0')} · ${esc(journeyChapters[c.chapter])} / ${esc(c.tab)}</span><div class="brain-selected-context" data-brain-selected-context><b>${esc(c.selected.ref||c.selected.id)}</b><strong>${esc(c.selected.title)}</strong></div><small class="brain-scope" data-brain-scope>Scope: ${c.selected.id==='project'?'Chapter overview':'Selected record + recorded connections'} · ${esc(quality)}</small><details class="brain-context-detail"><summary>Context details</summary><small>${esc(c.status)}</small>${window.aiwExplorationContext?'<small>Exploring '+esc(window.aiwExplorationContext.scope)+' · '+esc(window.aiwExplorationContext.concern)+(window.aiwExplorationContext.gaps.length?' · '+window.aiwExplorationContext.gaps.length+' realization questions':'')+'</small>':''}</details>${mode==='author'?'':subjectLine(c)}</div>${mode==='author'?`<nav class="brain-writing-return" aria-label="Writing task">${B('design','← Back to Ask Sol')}<span>Design explanation</span></nav>`:''}`;
}
function render(){
 if(open)ensureCatalogue();
 const inPanel=!!panel&&panel.contains(document.activeElement);
 draw();
 if(inPanel&&panel&&!panel.contains(document.activeElement)&&(document.activeElement===document.body||!document.activeElement))panel.querySelector('#brain-title')?.focus({preventScroll:true});
}
function draw(){
 if(!open||!current)return;
 if(!panel){panel=document.createElement('aside');panel.id='brain-panel';panel.className='brain-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','brain-title');document.body.append(panel);solChapterBind(panel,()=>current?.chapter,{refresh:()=>{if(open&&!busy&&mode==='design')render();},scope:'[data-sol-scope]'});}
 solChapterMount(project(),current.chapter,()=>{if(open&&!busy&&mode==='design')render();});
 captureCompanionDrafts(panel);
 const c=mode==='author'&&note()?brainContext(project(),{...note().context,tab:current.tab}):current;
 const placeKey=[project().id,c.chapter,c.tab,c.selected.id,mode].join(':');
 const place=capturePanelPlace(panel,placeKey);
 const connectionOpen=!!panel.querySelector('footer > details')?.open;
 panel.hidden=false;panel.dataset.role=mode==='mind'?'mind':'sol';document.body.classList.add('brain-open');const modal=matchMedia('(max-width:700px)').matches;panel.setAttribute('aria-modal',String(modal));const app=document.querySelector('#app');if(app)app.inert=modal;
 panel.innerHTML=`<div class="brain-resize" data-brain-resize role="separator" aria-label="Resize assistance pane; left arrow widens, right arrow narrows" aria-orientation="vertical" aria-valuemin="360" tabindex="0"></div>${panelHeading(c)}<div class="brain-error" role="alert" tabindex="-1" ${error?'':'hidden'}>${esc(error)}${conflict?B('reload','Load latest; retain my text'):''}</div><div class="brain-content">${mode==='author'?authorView(c):mode==='mind'?mindView(c):designView(c)}</div><footer><span role="status">${busy?'Saving…':dirty?'Unsaved text':mode==='author'&&noteId?'Saved with project':'Using this project’s context'}</span><details ${connectionOpen?'open':''}><summary>Sources & connection</summary><p>${esc(solStatusLine())} ${intelligenceBasis()}</p>${solStatus().connected&&!solStatus().verified?B('verify','Test the connection'):''}${retrievalLine(c)}<p class="brain-note">Each source has its own label: <b>From your project</b> is rule-based and names its rule; <b>Sol</b> is model output with its run, model and prompt pin; <b>Chapter tools</b> are the chapter’s own actions. Co-design keeps existing drafts, guided tasks and questions alongside contextual guidance. Knowledge supports exploration and reviewed proposals; scoring is off.</p>${adoptionStatisticsHTML(project(),{compact:true})}</details></footer>${pending?`<div class="brain-leave" role="alertdialog" aria-label="Unsaved co-author text"><h3>Keep your draft text?</h3><p>Save it before changing this task, or discard only the unsaved edits.</p>${B('stay','Keep editing','primary')}${B('save-leave','Save & continue')}${B('discard','Discard unsaved edits')}</div>`:''}`;
 const content=panel.querySelector('.brain-content'),slot=panel.querySelector('[data-brain-intelligence]');
 const architecturalTask=mode==='mind'&&(project().coauthoring?.designTasks||[]).find(t=>t.id===window.aiwArchitectureTask?.currentId);
 const intelligenceContext=architecturalTask?brainContext(project(),{chapter:2,id:architecturalTask.driverId}):c;
 const intelligence=intelligenceSection(project(),intelligenceContext,mode,{editing:mode==='author'&&!!note(),compact:mode!=='author'});
 if(slot)slot.outerHTML=intelligence;else content.insertAdjacentHTML(mode==='author'&&note()?'beforeend':'afterbegin',intelligence);
 if(mode==='author'&&note()?.generation)content.insertAdjacentHTML('beforeend',intelligenceGenerationHTML(note().generation));
 const native=panel.querySelector('.brain-native');if(native){
  const intro=native.querySelector(':scope>p');if(intro&&/Chapter| · | \/ /.test(intro.textContent))intro.remove();
  // A template proposal is a rule's, not Sol's (round 2, I2-04): it says so where the chapter called it a suggestion.
  for(const h of native.querySelectorAll('h3'))if(/suggested improvement/i.test(h.textContent))h.textContent='A template proposal · rule-based, from the reference project';
  const source=native.querySelector('.ev-assistant-link');if(source){const details=document.createElement('details');details.className='brain-basis';details.innerHTML='<summary>Work from project sources</summary>';source.replaceWith(details);details.append(source);native.append(details);}
  const patterns=[...native.querySelectorAll('.r-pattern,.d-pattern,.l-pattern')];if(patterns.length){const deck=document.createElement('div');deck.className='brain-pattern-deck';patterns[0].before(deck);patterns.forEach((card,i)=>{card.classList.add('brain-native-pattern');const heading=card.querySelector('h3');if(heading){const tag=document.createElement('span');tag.className='brain-pattern-number';tag.textContent=String(i+1).padStart(2,'0');heading.before(tag);}deck.append(card);});}
  if(mode==='mind')window.aiwInterfaceImpact?.decorateAssistant(native,'mind',{tasks:false});
 }
 panel.setAttribute('aria-busy',String(busy));panel.querySelectorAll('button,input,textarea,select').forEach(b=>{if(busy)b.disabled=true;});
 restoreCompanionDrafts(panel,[project().id,c.chapter,c.selected.id,mode].join(':'));remember();syncLaunchState();mountGuide(render);mountAssurance(render);mountWorkbench(render);
 mountIntelligence(project(),intelligenceContext,mode,{contextCurrent:()=>open&&[project().id,current.chapter,current.tab,current.selected.id,mode].join(':')===placeKey,render:()=>{if(open&&!busy)render();},guard:change,author:id=>{mode='author';loadNote(id);},design:resumeTask,architecture:resumeTask});
 mountKnowledgeReading();mountArchitectureReading();
 if(mode==='mind')mountCoDesignGuide(panel,c);
 restorePanelPlace(panel,placeKey,place);mountPanelResize(panel,projectPreferenceKey('brain-panel-width'));
 if(mode==='mind'){
  // The list arrives asynchronously: its loading placeholder may be too short to retain the old scroll offset.
  // Restore once it has height, only if the person has not moved or focused something else in the meantime.
  const proposalSlot=panel.querySelector('[data-proposals]'),waitingScroll=content.scrollTop,waitingFocus=document.activeElement;
  mountProposals(panel,{rows:proposalRows}).then(()=>{if(place&&panel.dataset.placeKey===placeKey&&panel.querySelector('[data-proposals]')===proposalSlot&&content.scrollTop===waitingScroll&&(document.activeElement===waitingFocus||document.activeElement===panel.querySelector('#brain-title')))restorePanelPlace(panel,placeKey,place);}).catch(e=>reportFailure('The proposals could not load. Close and reopen the panel to try again.',e));mountLibraryReading(panel,c);
 }
}
function change(fn){if(busy||guardKnowledge(fn)||guardArchitecture(fn))return;if(dirty){pending=fn;render();panel.querySelector('[data-brain-action="stay"]')?.focus();}else fn();}
function close(focus=true){open=false;pending=null;if(panel)panel.hidden=true;document.body.classList.remove('brain-open');const app=document.querySelector('#app');if(app)app.inert=false;remember();syncLaunchState();if(focus)(returnFocus?.isConnected&&returnFocus.getClientRects().length?returnFocus:[...document.querySelectorAll('[data-brain-launch]')].find(b=>b.getClientRects().length))?.focus({preventScroll:true});}
// Opens Sol or Proposals as the bar's buttons do; workspace-ux.js replays a click made before the panel arrived.
export function launchAssistant(kind='design'){if(!current)return false;show(kind==='mind'?'mind':'design');return true;}
// Delivery actions open the same evidence form through the companion's existing
// unsaved-edit guard. No separate verification workspace or draft store.
export function openVerificationCheck(actionId){
 const p=project(),action=p?.finalReview?.actions?.find(a=>a.id===actionId),check=verificationContext(p,action);if(!check.ready||!current)return false;
 change(()=>{if(project()?.id!==p.id||!verificationContext(project(),project().finalReview.actions.find(a=>a.id===actionId)).ready)return;const id=check.receipt.requirementIds[0];pinnedId=id;selection={...selection,id};current=brainContext(project(),selection);mountContextTools(project(),current);mode='design';open=true;native('sol');focusVerificationCheck(actionId);});return true;
}
// The action is re-resolved from the saved model before and after any unsaved-edit
// guard. A stale DOM payload cannot choose a command, concern or repository source.
export function launchIntelligenceAction(request){
 const resolve=()=>{
  const p=project();if(!p||p.id!==request?.projectId||!current)return null;
  const native=[validationIntelligenceSubject(p),outputIntelligenceSubject(p)].filter(Boolean);
  if(![current.selected.id,studioSelection,...native.map(x=>x.id)].includes(request.subjectId))return null;
  const reading=architectureIntelligence(p,{chapter:Number(request.chapter),id:request.subjectId}),insight=reading.insights.find(i=>i.id===request.insightId),action=insight?.actions?.find(a=>a.id===request.actionId);
  return reading.subject.id===request.subjectId&&reading.receipt?.basisStamp===request.basisStamp&&reading.receipt?.knowledgeStamp===request.knowledgeStamp&&action&&(['open-knowledge','resume-task','compare'].includes(action.kind)||intelligenceFieldTarget(action,{projectId:p.id}))?{p,reading,insight,action}:null;
 };
 if(!resolve()){reportFailure('This guidance changed with the design or its sources. Review the current question before continuing.');return false;}
 change(()=>{
  const next=resolve();if(!next){reportFailure('This guidance changed while another edit was open. Review its current basis before continuing.');return;}
  if(next.action.kind==='open-record'){
   const target=intelligenceFieldTarget(next.action,{projectId:next.p.id,scopeId:shellScopeId()}),record=next.p.interfaces?.[target?.editor==='data'?'data':'contracts']?.find(r=>r.id===target?.objectId);
   if(!record||document.querySelector('dialog[open]')){reportFailure('Finish the open editor before reviewing this field.');return;}
   close(false);
   if(window.aiwRoute?.(target.url))document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:next.p.id,objectId:record.id,ref:record.ref,editor:target.editor,field:target.field}}));
   else reportFailure('The editor could not open. Review this record in Chapter 8.');
   return;
  }
  if(current.selected.id!==request.subjectId){pinnedId=request.subjectId;selection={...selection,id:request.subjectId};current=brainContext(next.p,selection);}
  mountContextTools(next.p,current);
  const a=next.action;if(a.kind==='open-knowledge')window.aiwKnowledge?.openReference(a.sourceId,()=>!!resolve());else if(a.kind==='resume-task')resumeTask(a.taskId);else window.aiwArchitectureTask?.openConcern(a.concernId);
 });
 return true;
}
function show(next){if(document.querySelector('dialog[open]'))return;if(open&&mode===next&&next!=='author')return;returnFocus=document.activeElement;change(()=>{if(next!=='author'){native(next==='mind'?'mind':'sol');return;}mode='author';open=true;if(note()?.context.id!==current.selected.id)noteId='';if(!noteId){const n=brainNotes(project()).filter(n=>n.context.id===current.selected.id).at(-1);if(n)loadNote(n.id,false);}render();panel.querySelector('[data-brain-action="close"]')?.focus({preventScroll:true});});}
registerAssistantSurface(view=>{
 if(!current)return false;
 nativeViews.set(view.kind,{...view,key:contextKey(current)});mode=view.kind==='mind'?'mind':'design';open=true;error='';render();
 if(!refreshing)panel.querySelector('[data-brain-action="close"]')?.focus({preventScroll:true});
 return true;
});
function loadNote(id,draw=true){const n=brainNote(project(),id);if(!n)return;noteId=id;loadedRevision=n.revision;title=n.title;body=n.body;dirty=false;review=false;error='';conflict=false;if(draw)render();}
function notify(){document.dispatchEvent(new CustomEvent('aiw:external-project'));}
async function save(type,payload,after){if(busy)return;busy=true;error='';render();try{const r=await window.aiwProjectStore.command({type,payload});dirty=false;conflict=false;await after?.(r);notify();}catch(e){error=e.message;conflict=!!e.conflict;}finally{busy=false;render();if(error)panel.querySelector('.brain-error')?.focus();}}
async function saveText(after){if(!note())return;return save('brain.update',{id:noteId,revision:loadedRevision,title,body},async()=>{loadNote(noteId,false);await after?.();});}
function native(kind='sol'){
 if(document.body.classList.contains('cm-active')){mode=kind==='mind'?'mind':'design';open=true;error='';render();syncLaunchState();remember();panel.querySelector('#brain-title')?.focus({preventScroll:true});return;}
 // Chapters 4 to 11 expose the active studio's assistant: it is called directly, rather than re-dispatching a synthetic
 // click on the bar's button (round 2, I2-25). Chapters 1 to 3 keep the bar's button as the way in.
 const studio=window.aiwLogicalStudio;
 if(studio&&typeof studio.assistant==='function'){if(studio.busy)return;close(false);nativeClick=true;try{studio.assistant(kind);}finally{nativeClick=false;}if(!open&&!document.querySelector('dialog[open]')){mode=kind==='mind'?'mind':'design';open=true;error='';render();syncLaunchState();remember();}return;}
 const target=[...document.querySelectorAll('.r-assistant-bar button,.l-assistance button')].find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value===kind));
 if(!target){error='Choose an object to open its chapter actions.';render();return;}close(false);nativeClick=true;
 // On Chapters 1 to 3 the bar's Sol button is also the chapter's own. When the first click was a programmatic click()
 // it is still in progress here, and the DOM ignores a nested click() on an element whose click is in progress, so
 // the chapter never heard it (round 2, I2-25, cause isolated). A fresh event reaches the chapter's own handler
 // however the first click came.
 try{target.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true,view:window}));}finally{nativeClick=false;}
}
// The design-task workspace, then fn: at once when the studios created it, otherwise once workspace-ux.js has loaded
// design-task-ui.js on demand (round 4, A: Develop and Continue never fall back to a document load).
function withDesignTasks(fn){const projectId=project()?.id,subjectId=current?.selected.id,chapter=current?.chapter,deliver=tasks=>{if(project()?.id===projectId&&current?.selected.id===subjectId&&current?.chapter===chapter)fn(tasks);};const tasks=window.aiwDesignTasks;if(tasks){deliver(tasks);return;}designTasksReady().then(deliver).catch(e=>reportFailure('The design task could not open. Check your connection and try again.',e));}
function develop(requirementId){
 const id=requirementId||current.requirements[0]?.id;if(!id){native();return;}
 const related=current.tasks.find(t=>t.requirementId===id&&!t.kind&&!['applied','dismissed'].includes(t.status));
 close(false);
 withDesignTasks(tasks=>{if(related)tasks.openTask(related.id);else tasks.startFrom(id);});
}
// An unfinished exchange or protection design is continued from Proposals (taskRows), as it was from the chapter's own
// Sol dialog before this panel replaced it; another can still be started.
const designTasksForArchitecture=id=>(project().coauthoring?.designTasks||[]).some(t=>t.id===id&&t.kind==='architecture');
function resumeTask(id){if(designTasksForArchitecture(id)){window.aiwArchitectureTask?.openTask(id);return;}close(false);withDesignTasks(tasks=>tasks.openTask(id));}
function act(b){
 if(b.dataset.brainAction==='load-knowledge')return window.aiwKnowledge?.openView('sources');
 const a=b.dataset.brainAction;
 if(['design','author','mind'].includes(a)){show(a);return;}
 if(a==='verify'){solVerify(()=>{if(open)render();});return;}
 if(a==='close')return change(()=>close());
 if(a==='stay'){pending=null;render();return;}
 if(a==='discard'){const fn=pending;dirty=false;pending=null;fn?.();return;}
 if(a==='save-leave'){const fn=pending;return saveText(()=>{pending=null;fn?.();});}
 if(a==='native'||a==='native-mind')return change(()=>native(a==='native'?'sol':'mind'));
 if(a==='subject'||a==='pin'||a==='unpin')return change(()=>{pinnedId=a==='unpin'?null:b.dataset.id||null;remount();});
 if(a==='develop')return change(()=>develop(b.dataset.requirementId));
 // A knowledge rule's row puts its question in Sol's composer in this panel, as the knowledge workspace's own ask does.
 if(a==='knowledge-ask'){const k=(current.knowledge||[]).find(x=>x.id===b.dataset.id);if(!k)return;try{exploreKnowledgeQuestion(project(),current,k);error='';}catch(e){error=e.message;}render();panel.querySelector('[data-intel-prompt]')?.focus();return;}
 if(a==='task')return change(()=>resumeTask(b.dataset.taskId));
 if(a==='alternative')return change(()=>{close(false);if(window.aiwInterfaceImpact)window.aiwInterfaceImpact.loadAlternative(b.dataset.alternativeId);else location.href=projectURL('/?chapter=4&tab=model&modelAlternative='+encodeURIComponent(b.dataset.alternativeId));});
 if(a==='exchange-continue'||a==='protection-continue')return change(()=>{close(false);if(a==='protection-continue'){if(window.aiwSecurityTask)window.aiwSecurityTask.openTask(b.dataset.taskId);else securityTasksReady().then(task=>task.openTask(b.dataset.taskId)).catch(e=>reportFailure('The protection task could not open. Check your connection and try again.',e));}else window.aiwExchangeTask?.openTask(b.dataset.taskId);});
 if(a==='exchange'||a==='protection')return change(()=>{close(false);if(a==='protection'){if(window.aiwSecurityTask)window.aiwSecurityTask.openTask();else securityTasksReady().then(task=>task.openTask()).catch(e=>reportFailure('The protection task could not open. Check your connection and try again.',e));}else window.aiwExchangeTask?.openTask();});
 if(a==='source-draft')return change(()=>{close(false);const button=document.createElement('button');button.dataset.evAction='new-draft';button.hidden=true;document.body.append(button);button.click();button.remove();});
 if(a==='draft')return save('brain.draft',{chapter:current.chapter,objectId:current.selected.id,basisStamp:current.stamp},r=>loadNote(r.selected,false));
 if(a==='notes')return change(()=>{noteId='';review=false;render();});
 if(a==='load-note')return change(()=>loadNote(b.dataset.noteId));
 if(a==='save')return saveText();
 if(a==='review'){if(dirty)return saveText(()=>{review=true;});review=true;render();return;}
 if(a==='edit'){review=false;render();return;}
 if(a==='accept')return save('brain.accept',{id:noteId,revision:loadedRevision,reviewer,reason,reviewed:panel.querySelector('[data-brain-confirm]').checked},()=>{loadNote(noteId,false);reason='';review=false;});
 if(a==='withdraw')return save('brain.withdraw',{id:noteId,revision:loadedRevision,reason:panel.querySelector('[data-brain-withdraw]').value,reviewed:panel.querySelector('[data-brain-withdraw-confirm]').checked},()=>loadNote(noteId,false));
 if(a==='source-review')return change(()=>{const n=note(),c=brainContext(project(),n.context);panel.querySelector('.brain-source-warning').innerHTML=`<h3>Review the current source context</h3>${relatedContext(c)}${intelligenceSourceReviewHTML(project(),n.generation)}<p class="brain-prose">${esc(c.selected.record?.purpose||c.selected.record?.description||'Source object removed.')}</p><label class="brain-field"><span>Source-review conclusion</span><textarea data-brain-source-reason rows="3"></textarea></label><label class="brain-check"><input type="checkbox" data-brain-source-confirm> I reviewed this context against the retained text.</label>${B('confirm-source','Record source review','primary',`data-stamp="${c.stamp}"`)}`;});
 if(a==='confirm-source')return save('brain.refresh',{id:noteId,revision:loadedRevision,basisStamp:b.dataset.stamp,reason:panel.querySelector('[data-brain-source-reason]').value,reviewed:panel.querySelector('[data-brain-source-confirm]').checked},()=>loadNote(noteId,false));
 if(a==='reload'){busy=true;window.aiwProjectStore.load().then(()=>{notify();conflict=false;error='Latest project loaded. Your text is retained. '+(note()?.revision!==loadedRevision?'This passage also changed; open its saved version from Other passages before saving again.':'Review your text before saving.');}).catch(e=>{error=e.message;}).finally(()=>{busy=false;render();});}
}
let handoffSelection,handoffOpened=false;
// Sol's subject for the studio's selection: a selection made on this chapter is the architect's (pinned); one carried
// from another chapter gives way to this chapter's own record on Work, Validate and Output (round 2, I2-01).
function subjectFor(p,selected,tab){
 const chapter=Number(selected.chapter),id=selected.id||'project';
 if(lastChapter!==chapter)pinnedId=null;
 else if(id!==lastStudioSelection&&id!=='project')pinnedId=id;
 lastChapter=chapter;lastStudioSelection=id;studioSelection=id;
 if(pinnedId){const home=homeChapter(p,pinnedId);if(home==null&&!findRecord(p,pinnedId))pinnedId=null;}
 const subject=pinnedId?{id:pinnedId,own:homeChapter(p,pinnedId)===chapter}:chapterSubject(p,chapter,id,{tab});
 // The studio's selection is named whenever it comes from another chapter and is not what Sol speaks about.
 const home=id!=='project'?homeChapter(p,id):null;
 carried=id!=='project'&&home!==chapter&&subject.id!==id?{id,chapter:home}:null;
 return subject.id;
}
function remount(){const p=project();if(p&&current)mountBrainContext(p,{chapter:current.chapter,id:studioSelection},current.tab);}
// The brief, volunteered (round 2, I2-03): on Work, Validate and Output one line in the assistance bar names the first
// thing the rules found — the record with the most open checks, the finding that matters most, what the SDD still
// lacks — labelled "From your project · rule-based", before anyone asks; the whole brief is in Sol's panel, behind
// the bar's own Ask Sol. It is text, not a fourth control. It is read when the page is idle, once per saved revision
// of the project, and never consults a model.
const briefs=new WeakMap();let chipTimer=0,chipToken=0;
function briefKey(chapter,tab,id){return [chapter,tab,id||'',catalogueLoaded()?catalogue().releaseId:'pending'].join(':');}
function cachedBrief(p,chapter,tab,id){let m=briefs.get(p);if(!m)briefs.set(p,m=new Map());const k=briefKey(chapter,tab,id);if(!m.has(k)){let b=null;try{b=chapterBrief(p,chapter,tab,id);}catch{b=null;}m.set(k,b);}return m.get(k);}
const clipText=(t,n)=>{t=String(t??'').trim();return t.length>n?t.slice(0,n-1)+'…':t;};
export function briefChipHTML(b){
 const it=b?.items.find(x=>x.kind!=='next');if(!it)return '';
 const what=it.kind==='record'?`${it.ref} · ${it.check?it.check.title:it.notRecorded.length?'not recorded: '+it.notRecorded.join(', '):'no open check'}`:it.kind==='finding'?`${it.objectId&&it.objectId!=='project'?(it.ref||it.objectId)+' · ':''}${it.title}`:it.title;
 const label={work:'Look first',validate:'Matters most',output:'For the SDD'}[b.tab]||'Look first',more=b.items.filter(x=>x.kind!=='next').length-1;
 return `<p class="brain-brief-chip" data-brain-brief-chip="${esc(b.tab)}" title="${esc(`${it.kind==='intelligence'?'Saved project and architecture knowledge':'From your project · rule-based'} (${it.rule}). No model was consulted. Ask Sol shows the whole brief.`)}"><small>${it.kind==='intelligence'?'Project and architecture knowledge':'From your project · rule-based'}</small><span><b>${esc(label)}</b> ${esc(clipText(what,78))}</span>${more>0?`<i>+${more} in Sol’s brief</i>`:''}</p>`;
}
function mountBriefChip(assistance,p,chapter,tab){
 const token=++chipToken;clearTimeout(chipTimer);
 if(!['work','validate','output'].includes(tab)){assistance?.querySelector('.brain-brief-chip')?.remove();return;}
 const place=html=>{const bar=document.querySelector('.r-assistant-bar,.l-assistance');if(!bar)return;const old=bar.querySelector(':scope>.brain-brief-chip');if(!html){old?.remove();return;}if(old&&old.outerHTML===html)return;const t=document.createElement('template');t.innerHTML=html;const chip=t.content.firstElementChild;if(old)old.replaceWith(chip);else bar.firstElementChild?.after(chip);};
 const id=current?.selected.id==='project'?null:current?.selected.id,known=briefs.get(p)?.get(briefKey(chapter,tab,id));
 if(known!==undefined){place(briefChipHTML(known));return;}
 assistance?.querySelector(':scope>.brain-brief-chip')?.remove();
 const run=()=>{if(token!==chipToken)return;place(briefChipHTML(cachedBrief(p,chapter,tab,id)));};
 chipTimer=setTimeout(()=>{if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:3000});else run();},400);
}
function mountContextTools(p,c){
 mountKnowledge(p,c,{open:()=>{const reveal=()=>{mode='mind';open=true;render();};if(architectureActive())window.aiwArchitectureTask?.openChoices(reveal);else reveal();},changed:()=>{current=brainContext(project(),selection);render();},ask:k=>{exploreKnowledgeQuestion(project(),current,k);render();panel.querySelector('[data-intel-prompt]')?.focus();}});
 mountArchitecture(p,c,{selectedId:c.selected.id,render,reveal:()=>native('mind'),preview:id=>{close(false);if(window.aiwInterfaceImpact)window.aiwInterfaceImpact.loadAlternative(id);else location.href=projectURL('/?chapter=4&tab=model&modelAlternative='+encodeURIComponent(id));}});
}
export function refreshArchitectureGuidance(p){
 refreshModelIntelligence(p);
 if(!selection||!current||project()?.id!==p?.id)return;
 current=brainContext(p,selection);mountBriefChip(document.querySelector('.r-assistant-bar,.l-assistance'),p,current.chapter,current.tab);
 if(open&&!busy&&!dirty&&!knowledgeEditing()&&!architectureEditing())render();
}
export function mountBrainContext(p,selected,tab){
 if(!p||!selected)return;selection={...selected,id:subjectFor(p,selected,tab),tab};const from=new URLSearchParams(location.search).get('guideSource');if(from){handoffSelection??=selected.id;if(handoffSelection===selected.id){selection.id=from;carried=null;}}current=brainContext(p,selection);
 if(p.id)solLoad(p.id,()=>{if(open&&!busy)render();});
 mountContextTools(p,current);
 const assistance=document.querySelector('.r-assistant-bar,.l-assistance');
 if(assistance){
  const buttons=[...assistance.querySelectorAll('button')],sol=buttons.find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value==='sol'));
  if(sol){sol.dataset.brainLaunch='design';sol.innerHTML=icon+'<span>Ask Sol</span>';sol.title='Ask Sol · Help with the current task';sol.setAttribute('aria-label','Ask Sol');sol.setAttribute('aria-controls','brain-panel');sol.setAttribute('aria-expanded',String(open));
  }
  // The chapter bar's mind button opens Proposals (round 5): one name in the bar, the panel and the glossary.
  const mind=buttons.find(b=>[...b.attributes].some(a=>a.name.startsWith('data-')&&a.value==='mind'));if(mind){mind.dataset.brainLaunch='mind';if(mind.textContent.trim()!=='Co-design')mind.innerHTML=listIcon+'<span>Co-design</span>';mind.title='Co-design · understand this step, compare options and develop the design';mind.setAttribute('aria-label','Co-design');mind.setAttribute('aria-controls','brain-panel');}
  assistance.classList.add('brain-assistance');
 }
 mountBriefChip(assistance,p,Number(selected.chapter),tab);
 if(!restored){restored=true;try{const saved=JSON.parse(localStorage.getItem(pref())||'null');if(saved){mode=['design','author','mind'].includes(saved.mode)?saved.mode:'design';open=saved.open===true;if(saved.noteId)loadNote(saved.noteId,false);}}catch{/* storage unavailable or unreadable: the panel opens in its default state */}}
 if(from&&!handoffOpened){handoffOpened=true;mode='design';open=true;}
 if(open&&!dirty&&!busy&&!knowledgeEditing()&&!architectureEditing()){if(mode!=='author'&&nativeViews.get(mode==='mind'?'mind':'sol')?.key!==contextKey(current)){refreshing=true;try{native(mode==='mind'?'mind':'sol');}finally{refreshing=false;}}else render();}
 const params=new URLSearchParams(location.search),task=params.get('designTask'),req=params.get('coDesign'),alt=params.get('modelAlternative');
 if((task||req||alt)&&!routeHandled){routeHandled=true;const subjectId=current.selected.id,chapter=current.chapter,url=location.search,stillCurrent=()=>project()?.id===p.id&&current?.selected.id===subjectId&&current?.chapter===chapter&&location.search===url;setTimeout(()=>{if(!stillCurrent())return;if(task||req)withDesignTasks(tasks=>{if(!stillCurrent())return;close(false);if(task)tasks.openTask(task);else tasks.startFrom(req);});else{close(false);window.aiwInterfaceImpact?.loadAlternative(alt);}},0);}
 syncLaunchState();
}
// Another project opened in place (round 4, A): the panel closes and forgets the project it spoke about — its subject,
// the pinned and carried records, the passage open in it with its fields (the shell opens another project only when
// nothing here is unsaved or saving), the chapter views drawn for its records, a brief still waiting to be placed and a
// guide hand-over — and reads the new project's own panel preferences on its next mount. The panel's preferences are not
// written here: the key is already the new project's.
onProjectSwitch(()=>{
 open=false;pending=null;if(panel)panel.hidden=true;document.body.classList.remove('brain-open');const app=document.querySelector('#app');if(app)app.inert=false;
 selection=null;current=null;mode='design';noteId='';title='';body='';reviewer='';reason='';dirty=false;error='';review=false;conflict=false;loadedRevision=0;returnFocus=null;restored=false;
 studioSelection=null;pinnedId=null;carried=null;lastChapter=null;lastStudioSelection=null;nativeViews.clear();handoffSelection=undefined;knowledgeContext=null;architectureContext=null;routeHandled=false;
 clearTimeout(chipTimer);chipToken++;syncLaunchState();
});
// Decide (rc39, PLAN §4.3.2): a record card's "Decide → Co-design" on a design question opens the Companion's Co-design
// comparison (Conditions → Compare → Place → Verify) for that record and the question's method topic: the record becomes
// the shell's selection (aiw:inspect-record, as Validate's Open does), Sol's subject follows it, and the comparison
// opens on its scope step with the topic chosen and the question's first opener as the focus driver, scrolled into view. Nothing is recorded until the person works
// through the conditions and starts the comparison there.
function decideQuestion(recordId,topic,focusDriverId){
 const p=project();if(!p||!recordId||!topic)return;
 const settle=(tries=0)=>{
  if(project()?.id!==p.id)return;
  if(current?.selected.id!==recordId){if(tries<20)setTimeout(()=>settle(tries+1),50);else reportFailure('The record could not be selected for this comparison. Select it and open Co-design.');return;}
  window.aiwArchitectureTask?.openConcern(topic,focusDriverId);
  setTimeout(()=>{if(project()?.id===p.id&&open)panel?.querySelector('.architecture-workspace,.arc-entry')?.scrollIntoView({block:'start',behavior:'smooth'});},250);
 };
 change(()=>{if(current?.selected.id!==recordId)document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id:recordId}}));settle();});
}
if(typeof document!=='undefined'){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action="design-decide"]');if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();decideQuestion(b.dataset.record,b.dataset.topic,b.dataset.driver);},true);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-architecture-load],[data-arc-action="launch"]');if(!b||b.disabled||architectureModule)return;e.preventDefault();e.stopImmediatePropagation();change(()=>loadArchitecture(b.dataset.arcAction==='launch'?'openConcern':null,['interaction']));},true);
 // A knowledge action drawn outside the knowledge workspace (the desk's "Compare in Co-design", its repository leads) is
 // the workspace's own (knowledge-workspace-ui.js answers every data-k-action), and that code loads on first use: until it
 // has, the click loads it and is then replayed on the same control, so the first click does what any later one does.
 // Opening the comparison sends nothing to Sol (rc41 close).
 document.addEventListener('click',e=>{const b=e.target.closest('[data-k-action]');if(!b||b.disabled||knowledgeModule||!knowledgeContext)return;e.preventDefault();e.stopImmediatePropagation();
  const action=b.dataset.kAction,id=b.dataset.id,again=()=>b.isConnected?b:document.querySelector(`[data-k-action="${CSS.escape(action)}"]${id===undefined?'':`[data-id="${CSS.escape(id)}"]`}`);
  change(()=>loadKnowledge().then(()=>{const el=knowledgeModule&&again();if(el&&!el.disabled)el.click();}));},true);
 document.addEventListener('aiw:co-design-prompt',e=>{
  const d=e.detail,p=project(),c=current;
  if(!d||d.source!=='co-design-guide'||!p||!c||d.projectId!==p.id||Number(d.chapter)!==Number(c.chapter)||d.objectId!==c.selected.id||!['design','mind','author'].includes(d.mode))return;
  e.preventDefault();
  if(architectureActive()){error='This open comparison has its own question and source scope. Continue it below.';render();return;}
  change(()=>{void (async()=>{
   const result=await applyCoDesignPrompt(p,c,d.mode,d.prompt);
   if(project()?.id!==p.id||current?.selected.id!==c.selected.id||Number(current?.chapter)!==Number(c.chapter)||current?.tab!==c.tab||architectureActive())return;
   mode=d.mode;open=true;error=result.ok?'':result.error||'The question could not be added. Your existing draft is retained.';render();
   const field=panel?.querySelector('[data-intel-prompt]');field?.focus({preventScroll:true});field?.scrollIntoView({block:'nearest'});
  })().catch(cause=>{if(project()?.id===p.id&&current?.selected.id===c.selected.id){error=cause.message||'The question could not be prepared. Your draft is retained.';render();}});});
 });
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||nativeClick||b.disabled)return;const action=b.dataset.brainAction,launch=b.dataset.brainLaunch||null;if(!action&&!launch){if(b.closest('.brain-native,[data-proposal-native]')&&[...b.attributes].some(a=>a.name.startsWith('data-')))close(false);return;}e.preventDefault();e.stopImmediatePropagation();if(launch)show(launch);else act(b);},true);
 document.addEventListener('input',e=>{const key=e.target.dataset.brainField;if(!key)return;if(key==='title')title=e.target.value;if(key==='body')body=e.target.value;if(key==='reviewer')reviewer=e.target.value;if(key==='reason')reason=e.target.value;if(['title','body'].includes(key)){dirty=true;review=false;}const status=panel.querySelector('footer [role="status"]');if(status)status.textContent=dirty?'Unsaved text':'Saved with project';});
 document.addEventListener('keydown',e=>{if(e.key==='Tab'&&open&&matchMedia('(max-width:700px)').matches&&!document.querySelector('dialog[open]')){const focusable=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary')].filter(el=>!el.closest('[hidden]')&&(!el.closest('details:not([open])')||el.parentElement.matches('details:not([open])')&&el.tagName==='SUMMARY'));const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}if(e.key==='Escape'&&open&&!document.querySelector('dialog[open]')){e.preventDefault();change(()=>close());}});
 window.addEventListener('resize',()=>{if(!open)return;const modal=matchMedia('(max-width:700px)').matches;panel?.setAttribute('aria-modal',String(modal));const app=document.querySelector('#app');if(app)app.inert=modal;});
 window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
}
